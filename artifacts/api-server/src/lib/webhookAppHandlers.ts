import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, usersTable, establishmentsTable } from "@workspace/db";
import { logger } from "./logger";
import { fireTrialStart } from "./trialReminders";

/**
 * App-level Stripe webhook handler.
 *
 * Runs AFTER stripe-replit-sync has already verified the signature and synced
 * its own `stripe.*` mirror tables. We use the verified event to wire the
 * Stripe subscription back onto the originating user/establishment row so the
 * rest of the app can answer "is this customer paid up?" without re-querying
 * Stripe on every request.
 */
export async function handleAppWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await onCheckoutCompleted(session);
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      // Fallback path for trial-start capture: the checkout.session.completed
      // handler can miss trial_end if the stripe.subscriptions mirror isn't
      // synced yet. The subscription event itself carries trial_end directly,
      // so we use it to retroactively record the trial. fireTrialStart() is
      // idempotent (only writes if trial_started_at is null).
      const sub = event.data.object as Stripe.Subscription;
      await onSubscriptionCreatedOrUpdated(sub);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await onSubscriptionDeleted(sub);
      break;
    }
    default:
      // Other event types are fully handled by stripe-replit-sync's mirror
      // tables; no app-side write needed.
      break;
  }
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== "subscription") return;

  const subscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription?.id;
  if (!subscriptionId) {
    logger.warn({ sessionId: session.id }, "[webhook] checkout.session.completed without subscription");
    return;
  }

  const customerId = typeof session.customer === "string"
    ? session.customer
    : session.customer?.id ?? null;

  const meta = session.metadata ?? {};
  const userId = meta.userId ? Number(meta.userId) : null;
  const establishmentId = meta.establishmentId ? Number(meta.establishmentId) : null;
  const tier = meta.tier;

  if (userId && Number.isFinite(userId)) {
    await db
      .update(usersTable)
      .set({
        stripeSubscriptionId: subscriptionId,
        ...(customerId ? { stripeCustomerId: customerId } : {}),
        ...(tier ? { tier } : {}),
        // Reactivation: any successful checkout for a user-mode subscription
        // clears the auto-pause flag so a previously expired-trial vendor's
        // storefront comes back online immediately.
        paused: false,
      })
      .where(eq(usersTable.id, userId));

    // Record trial start so the daily trial-reminder sweep can pick the user
    // up. We read trial_end off the Stripe subscription that was just
    // linked. No-op when there's no trial period.
    const trialEnd = await readTrialEnd(subscriptionId);
    if (trialEnd) await fireTrialStart(userId, trialEnd);

    logger.info({ userId, subscriptionId, tier, trialEnd }, "[webhook] linked subscription to user");
    return;
  }

  if (establishmentId && Number.isFinite(establishmentId)) {
    await db
      .update(establishmentsTable)
      .set({
        stripeSubscriptionId: subscriptionId,
        ...(customerId ? { stripeCustomerId: customerId } : {}),
        ...(tier ? { tier } : {}),
        isTrial: true,
      })
      .where(eq(establishmentsTable.id, establishmentId));
    logger.info({ establishmentId, subscriptionId, tier }, "[webhook] linked subscription to establishment");
    return;
  }

  logger.warn({ sessionId: session.id, meta }, "[webhook] checkout completed without recognised metadata");
}

// Stripe sometimes hasn't synced the subscription mirror by the time
// checkout.session.completed fires. The session itself doesn't always carry
// trial_end on its `subscription` expansion, so we read the mirror table
// (populated by stripe-replit-sync) directly. Returns Unix seconds or null.
async function readTrialEnd(subscriptionId: string): Promise<number | null> {
  try {
    const { sql } = await import("drizzle-orm");
    const result = await db.execute(
      sql`SELECT trial_end FROM stripe.subscriptions WHERE id = ${subscriptionId}`,
    );
    const row = result.rows[0] as { trial_end?: number | null } | undefined;
    return row?.trial_end ?? null;
  } catch (err) {
    logger.warn({ err, subscriptionId }, "[webhook] readTrialEnd failed");
    return null;
  }
}

async function onSubscriptionCreatedOrUpdated(sub: Stripe.Subscription): Promise<void> {
  if (!sub.trial_end) return;
  // Find the user already linked to this subscription. Linking happens on
  // checkout.session.completed, which usually fires before this event, so we
  // can find them by stripeSubscriptionId.
  const [user] = await db
    .select({ id: usersTable.id, trialStartedAt: usersTable.trialStartedAt })
    .from(usersTable)
    .where(eq(usersTable.stripeSubscriptionId, sub.id));
  if (!user) return;
  if (user.trialStartedAt) return; // already captured
  await fireTrialStart(user.id, sub.trial_end);
  logger.info({ userId: user.id, subscriptionId: sub.id, trialEnd: sub.trial_end }, "[webhook] trial start captured from subscription event");
}

async function onSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  // Clear the link so subscription-gated UI (e.g. tier-based map sort) reverts
  // to the unpaid baseline.
  const result = await db
    .update(usersTable)
    .set({ stripeSubscriptionId: null })
    .where(eq(usersTable.stripeSubscriptionId, sub.id))
    .returning({ id: usersTable.id });

  const result2 = await db
    .update(establishmentsTable)
    .set({ stripeSubscriptionId: null })
    .where(eq(establishmentsTable.stripeSubscriptionId, sub.id))
    .returning({ id: establishmentsTable.id });

  logger.info(
    { subscriptionId: sub.id, usersCleared: result.length, establishmentsCleared: result2.length },
    "[webhook] cleared subscription links",
  );
}
