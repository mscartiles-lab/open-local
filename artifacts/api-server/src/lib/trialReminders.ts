import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db, usersTable, type User } from "@workspace/db";
import { stripeStorage } from "../stripeStorage";
import { emitEvent, type WebhookEvent } from "./webhooks";
import { logger } from "./logger";

// Stable identifiers recorded in `users.trial_reminders_sent`. Webhook event
// names are derived from these so callers don't get them out of sync.
export const TRIAL_REMINDER_TYPES = [
  "payment_prompt",
  "final_warning",
  "expired_paused",
] as const;

export type TrialReminderType = (typeof TRIAL_REMINDER_TYPES)[number];

const EVENT_BY_TYPE: Record<TrialReminderType, WebhookEvent> = {
  payment_prompt: "vendor.trial.payment_prompt",
  final_warning: "vendor.trial.final_warning",
  expired_paused: "vendor.trial.expired_paused",
};

const DAY_MS = 24 * 60 * 60 * 1000;

interface PayloadArgs {
  user: User;
  emailType: TrialReminderType;
  now?: Date;
  reactivationUrl?: string;
}

export function buildTrialReminderPayload(args: PayloadArgs): Record<string, unknown> {
  const { user, emailType, now = new Date(), reactivationUrl } = args;
  const trialEnd = user.trialEndsAt ? user.trialEndsAt.getTime() : null;
  const msRemaining = trialEnd ? trialEnd - now.getTime() : 0;
  const daysRemaining = trialEnd ? Math.round(msRemaining / DAY_MS) : 0;

  const base: Record<string, unknown> = {
    user_id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    trial_started_at: user.trialStartedAt?.toISOString() ?? null,
    trial_ends_at: user.trialEndsAt?.toISOString() ?? null,
    days_remaining: daysRemaining,
    email_type: emailType,
    has_payment_method: !!user.stripeSubscriptionId,
    stripe_customer_id: user.stripeCustomerId ?? null,
    stripe_subscription_id: user.stripeSubscriptionId ?? null,
  };
  if (emailType === "expired_paused" && reactivationUrl) {
    base.reactivation_url = reactivationUrl;
  }
  return base;
}

// Atomic mark-and-emit. Same pattern as onboarding.recordAndEmit — the row
// only updates when the type isn't already in trial_reminders_sent, so
// concurrent sweeps can't double-fire. The expired_paused branch also flips
// `paused = true` in the same UPDATE so pausing and webhook stay linked.
export async function recordAndEmit(
  user: User,
  emailType: TrialReminderType,
  reactivationUrl?: string,
): Promise<boolean> {
  const sentArrayJson = sql`COALESCE(${usersTable.trialRemindersSent}, '[]'::jsonb)`;
  const updated = await db
    .update(usersTable)
    .set({
      trialRemindersSent: sql`${sentArrayJson} || ${JSON.stringify([emailType])}::jsonb`,
      ...(emailType === "expired_paused" ? { paused: true } : {}),
    })
    .where(
      and(
        eq(usersTable.id, user.id),
        sql`NOT (${sentArrayJson} ? ${emailType})`,
      ),
    )
    .returning();

  if (updated.length === 0) return false;

  const event = EVENT_BY_TYPE[emailType];
  const payload = buildTrialReminderPayload({
    user: updated[0]!,
    emailType,
    reactivationUrl,
  });
  emitEvent(event, payload);
  return true;
}

export interface TrialSweepResult {
  scanned: number;
  sent: Record<TrialReminderType, number>;
  paused: number;
}

function emptyCounts(): Record<TrialReminderType, number> {
  return { payment_prompt: 0, final_warning: 0, expired_paused: 0 };
}

// Returns true when the user has an active non-trialing Stripe subscription
// (i.e. they're paying us). Used to skip the expired_paused branch — paying
// vendors should never be auto-paused even if their original trial row is
// still hanging around.
async function hasActivePaidSubscription(user: User): Promise<boolean> {
  if (!user.stripeSubscriptionId) return false;
  try {
    const sub = (await stripeStorage.getSubscription(user.stripeSubscriptionId)) as
      | { status?: string }
      | null;
    if (!sub) return false;
    return sub.status === "active" || sub.status === "past_due";
  } catch (err) {
    // If Stripe is unreachable, be conservative and treat as paid so we
    // don't pause a paying vendor on a transient outage.
    logger.warn({ err, userId: user.id }, "trial sweep: stripe lookup failed; treating as paid");
    return true;
  }
}

interface SweepArgs {
  now?: Date;
  reactivationUrl?: string;
}

// Daily sweep. Idempotent: every record-and-emit is a single atomic UPDATE,
// so two concurrent runners still produce at most one webhook per user per
// type. Priority: expired_paused > final_warning > payment_prompt — at most
// one reminder per user per sweep.
export async function runTrialReminderSweep(args: SweepArgs = {}): Promise<TrialSweepResult> {
  const now = args.now ?? new Date();
  const candidates = await db
    .select()
    .from(usersTable)
    .where(
      and(
        eq(usersTable.role, "vendor"),
        isNotNull(usersTable.trialStartedAt),
        isNotNull(usersTable.trialEndsAt),
      ),
    );

  const counts = emptyCounts();
  let pausedCount = 0;

  for (const user of candidates) {
    if (!user.trialEndsAt) continue;
    const sent = new Set<string>(user.trialRemindersSent ?? []);
    const msUntilEnd = user.trialEndsAt.getTime() - now.getTime();
    const decisionCtx = {
      userId: user.id,
      msUntilEnd,
      alreadySent: Array.from(sent),
      paused: user.paused,
    };

    if (msUntilEnd <= -DAY_MS && !sent.has("expired_paused")) {
      // Trial ended 24h+ ago.
      if (await hasActivePaidSubscription(user)) {
        logger.debug({ ...decisionCtx, action: "skip_paid" }, "trial sweep");
        continue;
      }
      const reactivationUrl = args.reactivationUrl;
      const ok = await recordAndEmit(user, "expired_paused", reactivationUrl);
      if (ok) {
        counts.expired_paused++;
        pausedCount++;
        logger.info({ ...decisionCtx, action: "expired_paused" }, "trial sweep");
      }
      continue;
    }

    if (msUntilEnd > 0 && msUntilEnd <= DAY_MS && !sent.has("final_warning")) {
      const ok = await recordAndEmit(user, "final_warning");
      if (ok) {
        counts.final_warning++;
        logger.info({ ...decisionCtx, action: "final_warning" }, "trial sweep");
      }
      continue;
    }

    if (
      msUntilEnd > 7 * DAY_MS &&
      msUntilEnd <= 8 * DAY_MS &&
      !sent.has("payment_prompt")
    ) {
      const ok = await recordAndEmit(user, "payment_prompt");
      if (ok) {
        counts.payment_prompt++;
        logger.info({ ...decisionCtx, action: "payment_prompt" }, "trial sweep");
      }
      continue;
    }

    logger.debug({ ...decisionCtx, action: "none" }, "trial sweep");
  }

  const result: TrialSweepResult = {
    scanned: candidates.length,
    sent: counts,
    paused: pausedCount,
  };
  logger.info(result, "trial reminder sweep complete");
  return result;
}

// Called from the Stripe subscription-linking webhook handler when a vendor
// checkout completes with a trial. trialEnd is Stripe's `trial_end` (Unix
// seconds). If absent, we record nothing — the reminder sweep's rollout
// gate (trial_started_at IS NOT NULL) keeps non-trial users out of the flow.
export async function fireTrialStart(userId: number, trialEnd: number | null): Promise<void> {
  if (!trialEnd) return;
  try {
    await db
      .update(usersTable)
      .set({
        trialStartedAt: sql`COALESCE(${usersTable.trialStartedAt}, NOW())`,
        trialEndsAt: new Date(trialEnd * 1000),
      })
      .where(eq(usersTable.id, userId));
  } catch (err) {
    logger.error({ err, userId }, "fireTrialStart failed");
  }
}
