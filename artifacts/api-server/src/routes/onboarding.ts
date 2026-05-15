import { Router, type IRouter } from "express";
import { requireAdmin } from "../lib/requireAdmin";
import { runOnboardingSweep } from "../lib/onboarding";

const router: IRouter = Router();

// Manual + scheduled trigger. Idempotent — the sweep's duplicate guard means
// running it multiple times in a day still sends at most one of each email
// per vendor. Scheduled Deployments hit this with an admin bearer token.
router.post("/admin/onboarding/run-daily", requireAdmin, async (_req, res): Promise<void> => {
  const result = await runOnboardingSweep();
  res.json(result);
});

export default router;
