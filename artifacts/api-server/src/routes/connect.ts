import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, vendorsTable, usersTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/requireAuth";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function getBaseUrl(req: Request): string {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (domain) return `https://${domain}`;
  return `${req.protocol}://${req.get("host")}`;
}

/** Find the vendor owned by the calling user (matches by contact_email). */
async function getCallerVendor(userId: number) {
  const [user] = await db
    .select({ email: usersTable.email, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user) return null;

  if (user.role === "admin") return null; // admins don't have a personal vendor

  const [vendor] = await db
    .select()
    .from(vendorsTable)
    .where(eq(vendorsTable.contactEmail, user.email));
  return vendor ?? null;
}

// ── POST /api/billing/connect/onboard ────────────────────────────────────────
// Creates (or retrieves) the vendor's Stripe Connect Express account and
// returns a one-time Account Link URL for them to complete onboarding.
router.post("/billing/connect/onboard", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;

  try {
    const vendor = await getCallerVendor(userId);
    if (!vendor) {
      res.status(404).json({ error: "No vendor account found for this user." });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const baseUrl = getBaseUrl(req);

    let connectId = vendor.stripeConnectId;

    if (!connectId) {
      // Create a new Express connected account
      const account = await stripe.accounts.create({
        type: "express",
        email: vendor.contactEmail,
        business_type: "individual",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { vendorId: String(vendor.id) },
      });
      connectId = account.id;
      await db
        .update(vendorsTable)
        .set({ stripeConnectId: connectId, stripeConnectStatus: "pending" })
        .where(eq(vendorsTable.id, vendor.id));
      logger.info({ vendorId: vendor.id, connectId }, "[connect] created Express account");
    }

    // Generate a fresh account link (they expire after a few minutes)
    const accountLink = await stripe.accountLinks.create({
      account: connectId,
      refresh_url: `${baseUrl}/dashboard/${vendor.slug}?connect=refresh`,
      return_url: `${baseUrl}/dashboard/${vendor.slug}?connect=success`,
      type: "account_onboarding",
    });

    res.json({ url: accountLink.url, connectId });
  } catch (err) {
    logger.error({ err }, "[connect] onboard error");
    res.status(500).json({ error: "Failed to start payout onboarding." });
  }
});

// ── GET /api/billing/connect/status ──────────────────────────────────────────
// Returns the vendor's Connect account status so the dashboard can show the
// right CTA (set up / pending / active).
router.get("/billing/connect/status", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;

  try {
    const vendor = await getCallerVendor(userId);
    if (!vendor) {
      res.json({ status: "none" });
      return;
    }

    if (!vendor.stripeConnectId) {
      res.json({ status: "none" });
      return;
    }

    const stripe = await getUncachableStripeClient();
    let account;
    try {
      account = await stripe.accounts.retrieve(vendor.stripeConnectId);
    } catch (_e) {
      res.json({ status: "none" });
      return;
    }

    // charges_enabled = they can accept payments; payouts_enabled = funds will flow
    const active = account.charges_enabled && account.payouts_enabled;
    const newStatus: "active" | "pending" | "restricted" = active
      ? "active"
      : account.requirements?.disabled_reason
        ? "restricted"
        : "pending";

    if (newStatus !== vendor.stripeConnectStatus) {
      await db
        .update(vendorsTable)
        .set({ stripeConnectStatus: newStatus })
        .where(eq(vendorsTable.id, vendor.id));
    }

    res.json({
      status: newStatus,
      connectId: vendor.stripeConnectId,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      disabledReason: account.requirements?.disabled_reason ?? null,
    });
  } catch (err) {
    logger.error({ err }, "[connect] status error");
    res.status(500).json({ error: "Failed to fetch connect status." });
  }
});

export default router;
