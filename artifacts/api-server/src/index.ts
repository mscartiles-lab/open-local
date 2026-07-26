import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";
import app from "./app";
import { logger } from "./lib/logger";
import { runOnboardingSweep } from "./lib/onboarding";
import { runTrialReminderSweep } from "./lib/trialReminders";
import { runSupportTicketSweep } from "./lib/supportTickets";
import { runWaitlistReminderSweep } from "./lib/waitlistReminders";
import { getAppUrl } from "./lib/appUrl";

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  try {
    logger.info("Initializing Stripe schema...");
    await runMigrations({ databaseUrl });
    logger.info("Stripe schema ready");

    const stripeSync = await getStripeSync();

    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    if (domain) {
      const webhookUrl = `https://${domain}/api/stripe/webhook`;
      logger.info({ webhookUrl }, "Setting up managed webhook...");
      await stripeSync.findOrCreateManagedWebhook(webhookUrl);
      logger.info("Webhook configured");
    }

    stripeSync.syncBackfill()
      .then(() => logger.info("Stripe backfill complete"))
      .catch((err: unknown) => logger.error({ err }, "Stripe backfill error"));
  } catch (err: unknown) {
    logger.warn({ err }, "Stripe init skipped — integration not connected yet");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

await initStripe();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});

// ─── Daily sweep scheduler ────────────────────────────────────────────────────
// Runs onboarding + trial-reminder + support-ticket sweeps once every 24 hours,
// anchored to 9 AM UTC.  Fire-and-forget — a sweep failure never crashes the
// server.  The same sweeps are also reachable via POST /api/admin/onboarding/run-daily
// for manual or Scheduled-Deployment triggers.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

async function runDailySweep(): Promise<void> {
  logger.info("daily sweep starting");
  try {
    const reactivationUrl = `${getAppUrl()}/billing?reactivate=1`;

    const [onboarding, trial, support, waitlist] = await Promise.all([
      runOnboardingSweep(),
      runTrialReminderSweep({ reactivationUrl }),
      runSupportTicketSweep(),
      runWaitlistReminderSweep(),
    ]);
    logger.info({ onboarding, trial, support, waitlist }, "daily sweep complete");
  } catch (err) {
    logger.error({ err }, "daily sweep failed");
  }
}

function scheduleDailySweep(): void {
  const now = new Date();
  const nextRun = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 9, 0, 0),
  );
  if (nextRun.getTime() <= now.getTime()) {
    nextRun.setUTCDate(nextRun.getUTCDate() + 1);
  }
  const msUntilFirst = nextRun.getTime() - now.getTime();
  logger.info(
    { nextRunAt: nextRun.toISOString(), msUntilFirst },
    "daily sweep scheduled",
  );
  setTimeout(() => {
    void runDailySweep();
    setInterval(() => void runDailySweep(), MS_PER_DAY);
  }, msUntilFirst);
}

scheduleDailySweep();
