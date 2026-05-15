import { randomBytes } from "node:crypto";
import { db, webhookSubscriptionsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

interface SubSeed {
  label: string;
  url: string;
  events: string[];
}

const N8N_BASE = process.env.N8N_WEBHOOK_BASE ?? "https://openlocal.app.n8n.cloud/webhook";

const SEEDS: SubSeed[] = [
  { label: "User signed up", url: `${N8N_BASE}/user-signed-up`, events: ["user.signed_up"] },
  { label: "Vendor created", url: `${N8N_BASE}/vendor-created`, events: ["vendor.created"] },
  { label: "Vendor onboarding — welcome", url: `${N8N_BASE}/vendor-onboarding-welcome`, events: ["vendor.onboarding.welcome"] },
  { label: "Vendor onboarding — day 2 (profile incomplete)", url: `${N8N_BASE}/vendor-onboarding-day2`, events: ["vendor.onboarding.day2_profile_incomplete"] },
  { label: "Vendor onboarding — day 3 (no products)", url: `${N8N_BASE}/vendor-onboarding-day3`, events: ["vendor.onboarding.day3_no_products"] },
  { label: "Vendor onboarding — day 5 (how-to tip)", url: `${N8N_BASE}/vendor-onboarding-day5`, events: ["vendor.onboarding.day5_no_products_howto"] },
  { label: "Vendor onboarding — day 7 (inactive)", url: `${N8N_BASE}/vendor-onboarding-day7`, events: ["vendor.onboarding.day7_inactive"] },
  { label: "Vendor visit requested", url: `${N8N_BASE}/vendor-visit-requested`, events: ["vendor.visit_requested"] },
  { label: "Vendor visit approved", url: `${N8N_BASE}/vendor-visit-approved`, events: ["vendor.visit_approved"] },
  { label: "Vendor visit rejected", url: `${N8N_BASE}/vendor-visit-rejected`, events: ["vendor.visit_rejected"] },
  { label: "Business submitted", url: `${N8N_BASE}/business-submitted`, events: ["business.submitted"] },
  { label: "Business status changed", url: `${N8N_BASE}/business-status-changed`, events: ["business.status_changed"] },
  { label: "Product created", url: `${N8N_BASE}/product-created`, events: ["product.created"] },
  { label: "Offer created", url: `${N8N_BASE}/offer-created`, events: ["offer.created"] },
  // Vendor trial-reminder lifecycle (Task #5).
  { label: "Vendor trial — payment prompt (T-8d)", url: `${N8N_BASE}/vendor-trial-payment-prompt`, events: ["vendor.trial.payment_prompt"] },
  { label: "Vendor trial — final warning (T-1d)", url: `${N8N_BASE}/vendor-trial-final-warning`, events: ["vendor.trial.final_warning"] },
  { label: "Vendor trial — expired + paused (T+1d)", url: `${N8N_BASE}/vendor-trial-expired-paused`, events: ["vendor.trial.expired_paused"] },
];

async function main(): Promise<void> {
  const existing = await db
    .select({ url: webhookSubscriptionsTable.url })
    .from(webhookSubscriptionsTable);
  const have = new Set(existing.map((r) => r.url));

  let inserted = 0;
  for (const seed of SEEDS) {
    if (have.has(seed.url)) continue;
    const secret = `whsec_${randomBytes(32).toString("hex")}`;
    await db.insert(webhookSubscriptionsTable).values({
      label: seed.label,
      url: seed.url,
      secret,
      events: seed.events,
      active: true,
    });
    inserted++;
    // eslint-disable-next-line no-console
    console.log(`+ ${seed.label} (${seed.events.join(",")})`);
  }
  // eslint-disable-next-line no-console
  console.log(`Done. Inserted ${inserted} new subscription(s). Total now: ${have.size + inserted}.`);
  await db.execute(sql`SELECT 1`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
