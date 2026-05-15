import { and, eq, sql, count } from "drizzle-orm";
import { db, vendorsTable, productsTable, type Vendor } from "@workspace/db";
import { emitEvent, type WebhookEvent } from "./webhooks";
import { logger } from "./logger";

// Email-type keys recorded in `vendors.onboardingEmailsSent`. These are the
// stable identifiers — webhook event names are derived from them.
export const ONBOARDING_EMAIL_TYPES = [
  "welcome",
  "day2_profile_incomplete",
  "day3_no_products",
  "day5_no_products_howto",
  "day7_inactive",
] as const;

export type OnboardingEmailType = (typeof ONBOARDING_EMAIL_TYPES)[number];

const EVENT_BY_TYPE: Record<OnboardingEmailType, WebhookEvent> = {
  welcome: "vendor.onboarding.welcome",
  day2_profile_incomplete: "vendor.onboarding.day2_profile_incomplete",
  day3_no_products: "vendor.onboarding.day3_no_products",
  day5_no_products_howto: "vendor.onboarding.day5_no_products_howto",
  day7_inactive: "vendor.onboarding.day7_inactive",
};

// `imageUrl` is required on insert, so it's never empty — but the wizard fills
// a category-themed default cover when the vendor doesn't upload one. We treat
// that default as "no real photo yet" for the profile-complete check.
const DEFAULT_COVER_MARKER = "unsplash.com";

export function isProfileComplete(v: Vendor): boolean {
  const hasBio = (v.description ?? "").trim().length > 0;
  const hasPhoto =
    !!v.imageUrl && v.imageUrl.length > 0 && !v.imageUrl.includes(DEFAULT_COVER_MARKER);
  const hasLocation = (v.location ?? "").trim().length > 0;
  return hasBio && hasPhoto && hasLocation;
}

export function daysSince(date: Date, now: Date = new Date()): number {
  const ms = now.getTime() - date.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

async function getProductCount(vendorId: number): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(productsTable)
    .where(eq(productsTable.vendorId, vendorId));
  return Number(row?.n ?? 0);
}

interface BuildPayloadArgs {
  vendor: Vendor;
  emailType: OnboardingEmailType;
  productCount: number;
  now?: Date;
}

export function buildOnboardingPayload(args: BuildPayloadArgs): Record<string, unknown> {
  const { vendor, emailType, productCount, now = new Date() } = args;
  const profileComplete = isProfileComplete(vendor);
  const base: Record<string, unknown> = {
    vendor_id: vendor.id,
    email: vendor.contactEmail,
    name: vendor.name,
    days_since_signup: daysSince(vendor.createdAt, now),
    email_type: emailType,
    product_count: productCount,
    profile_complete: profileComplete,
  };
  if (emailType === "day5_no_products_howto") base.include_howto_tip = true;
  if (emailType === "day7_inactive") base.flag_for_followup = true;
  return base;
}

// Atomic mark-and-emit. Returns true only if we won the race to record this
// email type — that's our duplicate-send guard. Concurrent cron + manual
// triggers can both call this safely; only one will emit.
export async function recordAndEmit(
  vendor: Vendor,
  emailType: OnboardingEmailType,
  productCount: number,
  extraFields: Partial<Pick<Vendor, "flaggedForFollowup">> = {},
): Promise<boolean> {
  const sentArrayJson = sql`COALESCE(${vendorsTable.onboardingEmailsSent}, '[]'::jsonb)`;
  const updated = await db
    .update(vendorsTable)
    .set({
      onboardingEmailsSent: sql`${sentArrayJson} || ${JSON.stringify([emailType])}::jsonb`,
      ...(extraFields.flaggedForFollowup !== undefined
        ? { flaggedForFollowup: extraFields.flaggedForFollowup }
        : {}),
    })
    .where(
      and(
        eq(vendorsTable.id, vendor.id),
        sql`NOT (${sentArrayJson} ? ${emailType})`,
      ),
    )
    .returning();

  if (updated.length === 0) return false;

  const event = EVENT_BY_TYPE[emailType];
  const payload = buildOnboardingPayload({
    vendor: updated[0]!,
    emailType,
    productCount,
  });
  emitEvent(event, payload);
  return true;
}

export interface SweepResult {
  scanned: number;
  sent: Record<OnboardingEmailType, number>;
  flagged: number;
}

function emptyCounts(): Record<OnboardingEmailType, number> {
  return {
    welcome: 0,
    day2_profile_incomplete: 0,
    day3_no_products: 0,
    day5_no_products_howto: 0,
    day7_inactive: 0,
  };
}

// The daily sweep. Idempotent: running multiple times in a day still sends at
// most one email per vendor per type because recordAndEmit() races on the DB.
export async function runOnboardingSweep(now: Date = new Date()): Promise<SweepResult> {
  const vendors = await db.select().from(vendorsTable);
  const counts = emptyCounts();
  let flagged = 0;

  for (const v of vendors) {
    const sent = new Set<string>(v.onboardingEmailsSent ?? []);
    // Rollout gate: only vendors that received the welcome event are part of
    // this onboarding sequence. Vendors created before this feature shipped
    // (or any vendor whose welcome never fired) are skipped — we don't want
    // to backfill legacy producers with day3/5/7 nudges.
    if (!sent.has("welcome")) {
      logger.debug({ vendorId: v.id, reason: "no_welcome_marker" }, "sweep skip");
      continue;
    }
    const days = daysSince(v.createdAt, now);
    if (days < 2) {
      logger.debug({ vendorId: v.id, days, reason: "too_new" }, "sweep skip");
      continue;
    }
    const productCount = await getProductCount(v.id);
    const profileComplete = isProfileComplete(v);
    const decisionCtx = {
      vendorId: v.id,
      days,
      productCount,
      profileComplete,
      alreadySent: Array.from(sent),
    };

    // Day 7 supersedes earlier no-products nudges. Once a vendor is past day
    // 7 with zero products, we don't backfill day3/day5 even on later sweeps
    // — day7 is the final nudge for that path. Day2 (profile-incomplete) is
    // an independent track and can still fire.
    // Strict priority selector: at most one onboarding email per vendor per
    // sweep. Order is day7 > day5 > day3 > day2. Monotonic lifecycle — if a
    // later nudge in the no-products track has already been sent, earlier
    // ones in that track are skipped to avoid out-of-order comms.
    let action: string = "none";
    const noProductsAlreadyLater =
      sent.has("day7_inactive") || sent.has("day5_no_products_howto");

    if (days >= 7 && productCount === 0 && !sent.has("day7_inactive")) {
      const ok = await recordAndEmit(v, "day7_inactive", productCount, {
        flaggedForFollowup: true,
      });
      if (ok) {
        counts.day7_inactive++;
        flagged++;
        action = "day7_inactive";
      }
    } else if (
      days >= 5 &&
      productCount === 0 &&
      !sent.has("day5_no_products_howto") &&
      !sent.has("day7_inactive")
    ) {
      const ok = await recordAndEmit(v, "day5_no_products_howto", productCount);
      if (ok) {
        counts.day5_no_products_howto++;
        action = "day5_no_products_howto";
      }
    } else if (
      days >= 3 &&
      productCount === 0 &&
      !sent.has("day3_no_products") &&
      !noProductsAlreadyLater
    ) {
      const ok = await recordAndEmit(v, "day3_no_products", productCount);
      if (ok) {
        counts.day3_no_products++;
        action = "day3_no_products";
      }
    } else if (
      days >= 2 &&
      !profileComplete &&
      !sent.has("day2_profile_incomplete")
    ) {
      const ok = await recordAndEmit(v, "day2_profile_incomplete", productCount);
      if (ok) {
        counts.day2_profile_incomplete++;
        action = "day2_profile_incomplete";
      }
    }
    logger.info({ ...decisionCtx, action }, "sweep decision");
  }

  const result: SweepResult = { scanned: vendors.length, sent: counts, flagged };
  logger.info(result, "onboarding sweep complete");
  return result;
}

// Fires the welcome event right after vendor creation. Records "welcome" in
// the sent-list atomically so repeated calls (e.g. retried route handler)
// won't double-send. Caller uses `void` — we swallow + log errors here so a
// webhook problem can never break the user-facing signup response.
export async function fireWelcome(vendor: Vendor): Promise<void> {
  try {
    const productCount = await getProductCount(vendor.id);
    await recordAndEmit(vendor, "welcome", productCount);
  } catch (err) {
    logger.error({ err, vendorId: vendor.id }, "fireWelcome failed");
  }
}
