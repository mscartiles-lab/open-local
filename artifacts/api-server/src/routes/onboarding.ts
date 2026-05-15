import { Router, type IRouter, type Request } from "express";
import { requireAdmin } from "../lib/requireAdmin";
import { runOnboardingSweep } from "../lib/onboarding";
import { runTrialReminderSweep } from "../lib/trialReminders";

const router: IRouter = Router();

function reactivationUrlFor(req: Request): string {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  const baseUrl = domain ? `https://${domain}` : `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}/billing?reactivate=1`;
}

// Manual + scheduled trigger. Idempotent — both sweeps use atomic UPDATE
// duplicate guards, so running them multiple times in a day still sends at
// most one of each email per vendor. Scheduled Deployments hit this with an
// admin bearer token.
router.post("/admin/onboarding/run-daily", requireAdmin, async (req, res): Promise<void> => {
  const onboarding = await runOnboardingSweep();
  const trial = await runTrialReminderSweep({ reactivationUrl: reactivationUrlFor(req) });
  res.json({
    // Backwards-compatible top-level shape (onboarding fields preserved)…
    scanned: onboarding.scanned,
    sent: { ...onboarding.sent, ...trial.sent },
    flagged: onboarding.flagged,
    paused: trial.paused,
    // …plus a per-sweep breakdown for newer callers.
    onboarding,
    trial,
  });
});

export default router;
