import { and, eq, sql, count } from "drizzle-orm";
import { db, vendorsTable, productsTable, type Vendor } from "@workspace/db";
import { emitEvent, type WebhookEvent } from "./webhooks";
import { sendDirectEmail } from "./email";
import { logger } from "./logger";

// Email-type keys recorded in `vendors.onboardingEmailsSent`. These are the
// stable identifiers — webhook event names are derived from them.
export const ONBOARDING_EMAIL_TYPES = [
  "welcome",
  "day2_profile_incomplete",
  "day3_no_products",
  "day5_no_products_howto",
  "day7_inactive",
  // Profile-completeness nudges (parallel track to the no-products chain).
  // Each fires at-most-once per vendor — see runOnboardingSweep().
  "no_photo_day3",
  "no_bio_day3",
  "products_no_storefront",
] as const;

export type OnboardingEmailType = (typeof ONBOARDING_EMAIL_TYPES)[number];

const EVENT_BY_TYPE: Record<OnboardingEmailType, WebhookEvent> = {
  welcome: "vendor.onboarding.welcome",
  day2_profile_incomplete: "vendor.onboarding.day2_profile_incomplete",
  day3_no_products: "vendor.onboarding.day3_no_products",
  day5_no_products_howto: "vendor.onboarding.day5_no_products_howto",
  day7_inactive: "vendor.onboarding.day7_inactive",
  no_photo_day3: "vendor.onboarding.no_photo_day3",
  no_bio_day3: "vendor.onboarding.no_bio_day3",
  products_no_storefront: "vendor.onboarding.products_no_storefront",
};

// Granular field checks used by the new profile-completeness nudges.
// `hasRealPhoto` mirrors the imageUrl logic in isProfileComplete() — the
// wizard fills a category-themed Unsplash default cover when the vendor
// uploads nothing, so we treat that marker as "no real photo yet".
export function hasRealPhoto(v: Vendor): boolean {
  return !!v.imageUrl && v.imageUrl.length > 0 && !v.imageUrl.includes(DEFAULT_COVER_MARKER);
}

export function hasBio(v: Vendor): boolean {
  return (v.description ?? "").trim().length > 0;
}

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

// ─── Direct email composers ───────────────────────────────────────────────────
// Each function returns { subject, message } for its email type.

const APP_URL = (() => {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  return domain ? `https://${domain}` : "https://openlocalapp.com";
})();

function vendorEmailContent(
  type: OnboardingEmailType,
  vendor: Vendor,
): { subject: string; message: string } | null {
  const name = vendor.name;
  const dashboardUrl = `${APP_URL}/dashboard/${vendor.slug}`;
  const billingUrl = `${APP_URL}/billing`;

  switch (type) {
    case "welcome":
      return {
        subject: `Welcome to Open Local, ${name}!`,
        message: `Hi ${name},\n\nYour business is now live on Open Local — Florida's marketplace for local producers, makers, and artisans.\n\nHere's your private dashboard where you can manage listings, drop fresh batches, and mark surplus:\n${dashboardUrl}\n\nBookmark it — anyone with the link can manage your account.\n\nA few tips to get started:\n• Add a great cover photo so shoppers know who you are\n• Write a short bio that tells your story\n• Post your first listing — even a single product makes a difference\n\nWelcome to the community!\n\nThe Open Local team`,
      };

    case "day2_profile_incomplete":
      return {
        subject: `Complete your Open Local profile, ${name}`,
        message: `Hi ${name},\n\nYou're on Open Local — but your profile isn't finished yet, which means shoppers might scroll past you.\n\nTake 2 minutes to:\n• Add a cover photo (a real photo of your products or workspace)\n• Write a short bio — even just a sentence or two\n• Confirm your location\n\nA complete profile gets up to 3× more views.\n\nEdit your profile here:\n${dashboardUrl}\n\nThe Open Local team`,
      };

    case "day3_no_products":
      return {
        subject: `Ready to add your first listing, ${name}?`,
        message: `Hi ${name},\n\nYou joined Open Local 3 days ago — time to get your first listing up so local shoppers can find you!\n\nFrom your dashboard you can:\n• Drop a fresh batch (something just out of the oven/studio)\n• Mark surplus (end-of-market leftovers at a discount)\n• Add a regular product to your storefront\n\nIt takes under a minute:\n${dashboardUrl}\n\nThe Open Local team`,
      };

    case "day5_no_products_howto":
      return {
        subject: `How to add your first listing on Open Local`,
        message: `Hi ${name},\n\nIt looks like you haven't listed anything yet. Here's exactly how to do it:\n\n1. Go to your dashboard: ${dashboardUrl}\n2. Click "Drop a batch", "Mark surplus", or "Add a product"\n3. Fill in a name, description, price, and unit\n4. Hit save — your listing goes live immediately\n\nThat's it. No approval needed, no waiting.\n\nIf you're running into any trouble, reply to this email and we'll help you out personally.\n\nThe Open Local team`,
      };

    case "day7_inactive":
      return {
        subject: `We'd love to help you get started on Open Local`,
        message: `Hi ${name},\n\nIt's been a week since you joined Open Local and we haven't seen your first listing yet.\n\nWe know starting can feel daunting — but your neighbors are already looking for producers like you.\n\nIf there's anything getting in the way — technical issues, questions about pricing, or just not sure what to list — reply to this email and we'll personally help you get your first product up.\n\nYour dashboard is always here:\n${dashboardUrl}\n\nThe Open Local team`,
      };

    case "no_photo_day3":
      return {
        subject: `Add a cover photo to stand out on Open Local`,
        message: `Hi ${name},\n\nListings with photos get significantly more clicks. Your profile currently shows a placeholder image.\n\nAdd a real photo of your products, your workspace, or your market stall — anything that shows shoppers who you are.\n\nUpdate your profile:\n${dashboardUrl}\n\nThe Open Local team`,
      };

    case "no_bio_day3":
      return {
        subject: `Tell your story on Open Local, ${name}`,
        message: `Hi ${name},\n\nShoppers on Open Local love buying from people they feel connected to — but your bio is still empty.\n\nYou don't need much. Even two sentences work:\n• What do you make or grow?\n• What makes your products special?\n\nAdd your story here:\n${dashboardUrl}\n\nThe Open Local team`,
      };

    case "products_no_storefront":
      return {
        subject: `Your products are live — now add a cover photo`,
        message: `Hi ${name},\n\nGreat news — you have products listed! But your profile photo is still the default placeholder, which makes it harder for shoppers to trust and click through.\n\nSwap in a real photo and your storefront will look the part.\n\nUpdate here:\n${dashboardUrl}\n\nThe Open Local team`,
      };

    default:
      return null;
  }
}

// ─── Atomic mark-and-emit ─────────────────────────────────────────────────────
// Returns true only if we won the race to record this email type — that's our
// duplicate-send guard. Concurrent cron + manual triggers can both call this
// safely; only one will emit AND send.
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

  // Also send directly via EmailJS — fires even without an external platform
  // (n8n/Zapier) configured. Fire-and-forget; a failed send never rolls back
  // the duplicate guard above.
  const emailContent = vendorEmailContent(emailType, vendor);
  if (emailContent) {
    void sendDirectEmail({
      to: vendor.contactEmail,
      toName: vendor.name,
      subject: emailContent.subject,
      message: emailContent.message,
    }).catch((err) =>
      logger.error({ err, vendorId: vendor.id, emailType }, "direct email send failed"),
    );
  }

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
    no_photo_day3: 0,
    no_bio_day3: 0,
    products_no_storefront: 0,
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

    // Profile-completeness track — runs INDEPENDENTLY of the no-products
    // chain above. Each event below fires at-most-once per vendor (atomic
    // marker in onboardingEmailsSent) and multiple can fire in the same
    // sweep — e.g. a day-3 vendor with no photo AND no bio AND a product
    // listed gets all three nudges queued.
    if (days >= 3 && !hasRealPhoto(v) && !sent.has("no_photo_day3")) {
      const ok = await recordAndEmit(v, "no_photo_day3", productCount);
      if (ok) counts.no_photo_day3++;
    }
    if (days >= 3 && !hasBio(v) && !sent.has("no_bio_day3")) {
      const ok = await recordAndEmit(v, "no_bio_day3", productCount);
      if (ok) counts.no_bio_day3++;
    }
    if (
      productCount > 0 &&
      !hasRealPhoto(v) &&
      !sent.has("products_no_storefront")
    ) {
      const ok = await recordAndEmit(v, "products_no_storefront", productCount);
      if (ok) counts.products_no_storefront++;
    }
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
