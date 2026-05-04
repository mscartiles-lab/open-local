import { Router, type IRouter, type Request, type Response } from "express";
import { getUncachableStripeClient } from "../stripeClient";
import { stripeStorage } from "../stripeStorage";
import { logger } from "../lib/logger";
import { requireAuth, type AuthRequest } from "../lib/requireAuth";
import { verifyBusinessBillingToken } from "../lib/billingToken";
import {
  TIERS,
  TIER_IDS,
  isValidTier,
  vendorPlanName,
  businessPlanName,
  type TierId,
} from "../lib/tiers";

const router: IRouter = Router();

const VENDOR_EARLY_COHORT_SIZE = 150;
const VENDOR_EARLY_TRIAL_DAYS = 60;
const VENDOR_STANDARD_TRIAL_DAYS = 30;

const BUSINESS_EARLY_COHORT_SIZE = 100;
const BUSINESS_EARLY_TRIAL_DAYS = 90;
const BUSINESS_STANDARD_TRIAL_DAYS = 0;

async function getOrCreatePriceId(planName: string, priceCents: number): Promise<string> {
  const stripe = await getUncachableStripeClient();

  const products = await stripe.products.search({
    query: `name:'${planName}' AND active:'true'`,
  });

  let productId: string;
  if (products.data.length > 0) {
    productId = products.data[0].id;
  } else {
    const product = await stripe.products.create({ name: planName });
    productId = product.id;
  }

  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    recurring: { interval: "month" } as any,
  });

  const match = prices.data.find((p) => p.unit_amount === priceCents);
  if (match) return match.id;

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: priceCents,
    currency: "usd",
    recurring: { interval: "month" },
  });
  return price.id;
}

function getBaseUrl(req: Request): string {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (domain) return `https://${domain}`;
  return `${req.protocol}://${req.get("host")}`;
}

function parseTier(value: unknown, fallback: TierId = "middle"): TierId {
  return isValidTier(value) ? value : fallback;
}

router.post("/billing/vendor/checkout", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;
  const tier = parseTier((req.body as { tier?: string } | undefined)?.tier);

  try {
    const user = await stripeStorage.getUserById(userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (user.role !== "vendor") {
      res.status(400).json({ error: "Only vendor accounts can subscribe to the vendor plan" });
      return;
    }

    const vendorCount = await stripeStorage.countVendorUsers();
    const trialDays = vendorCount < VENDOR_EARLY_COHORT_SIZE
      ? VENDOR_EARLY_TRIAL_DAYS
      : VENDOR_STANDARD_TRIAL_DAYS;

    const priceId = await getOrCreatePriceId(vendorPlanName(tier), TIERS[tier].priceCents);
    const stripe = await getUncachableStripeClient();

    let customerId = user.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.username,
        metadata: { userId: String(user.id) },
      });
      customerId = customer.id;
      await stripeStorage.updateUserStripe(user.id, customerId);
    }

    const baseUrl = getBaseUrl(req);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      subscription_data: {
        ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
        metadata: { tier, userId: String(user.id) },
      },
      success_url: `${baseUrl}/?billing=success`,
      cancel_url: `${baseUrl}/?billing=cancel`,
      metadata: { tier, userId: String(user.id) },
    });

    res.json({ url: session.url, trialDays, tier });
  } catch (err) {
    logger.error({ err }, "[billing] vendor checkout error");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

router.post("/billing/business/checkout", async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { billingToken?: string; tier?: string };
  const { billingToken } = body;
  const tier = parseTier(body.tier);

  if (!billingToken || typeof billingToken !== "string") {
    res.status(400).json({ error: "billingToken is required" });
    return;
  }

  const establishmentId = verifyBusinessBillingToken(billingToken);
  if (!establishmentId) {
    res.status(401).json({ error: "Invalid or expired billing token. Please resubmit your business." });
    return;
  }

  try {
    const est = await stripeStorage.getEstablishmentById(establishmentId);
    if (!est) {
      res.status(404).json({ error: "Establishment not found" });
      return;
    }

    const businessCount = await stripeStorage.countEstablishments();
    const trialDays = businessCount < BUSINESS_EARLY_COHORT_SIZE
      ? BUSINESS_EARLY_TRIAL_DAYS
      : BUSINESS_STANDARD_TRIAL_DAYS;

    const priceId = await getOrCreatePriceId(businessPlanName(tier), TIERS[tier].priceCents);
    const stripe = await getUncachableStripeClient();

    let customerId = est.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: est.contactEmail,
        name: est.name,
        metadata: { establishmentId: String(est.id) },
      });
      customerId = customer.id;
      await stripeStorage.updateEstablishmentStripe(est.id, customerId);
    }

    const baseUrl = getBaseUrl(req);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      subscription_data: {
        ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
        metadata: { tier, establishmentId: String(est.id) },
      },
      success_url: `${baseUrl}/?billing=success`,
      cancel_url: `${baseUrl}/?billing=cancel`,
      metadata: { tier, establishmentId: String(est.id) },
    });

    res.json({ url: session.url, trialDays, tier });
  } catch (err) {
    logger.error({ err }, "[billing] business checkout error");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

router.get("/billing/vendor/status", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;

  try {
    const user = await stripeStorage.getUserById(userId);
    if (!user?.stripeSubscriptionId) {
      const vendorCount = await stripeStorage.countVendorUsers();
      const trialDays = vendorCount < VENDOR_EARLY_COHORT_SIZE
        ? VENDOR_EARLY_TRIAL_DAYS
        : VENDOR_STANDARD_TRIAL_DAYS;
      res.json({ status: "none", trialDays, tier: null });
      return;
    }

    // Derive tier from the synced Stripe subscription's metadata (source of truth).
    // Falls back to null if Stripe hasn't synced yet or metadata is missing.
    const sub = await stripeStorage.getSubscription(user.stripeSubscriptionId) as
      | { status?: string; trial_end?: number; metadata?: Record<string, string> }
      | null;
    const subTier = sub?.metadata?.tier;
    const effectiveTier: TierId | null = isValidTier(subTier) ? subTier : null;

    res.json({
      status: sub?.status ?? "unknown",
      trialEnd: sub?.trial_end ?? null,
      tier: effectiveTier,
      priceMonthly: effectiveTier ? TIERS[effectiveTier].priceCents / 100 : null,
    });
  } catch (err) {
    logger.error({ err }, "[billing] vendor status error");
    res.status(500).json({ error: "Failed to fetch subscription status" });
  }
});

router.post("/billing/portal", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;

  try {
    const user = await stripeStorage.getUserById(userId);
    if (!user?.stripeCustomerId) {
      res.status(400).json({ error: "No billing account found" });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const baseUrl = getBaseUrl(req);
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: baseUrl,
    });

    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "[billing] portal error");
    res.status(500).json({ error: "Failed to open billing portal" });
  }
});

router.get("/billing/pricing", async (_req: Request, res: Response): Promise<void> => {
  try {
    const vendorCount = await stripeStorage.countVendorUsers();
    const businessCount = await stripeStorage.countEstablishments();

    const vendorTrialDays = vendorCount < VENDOR_EARLY_COHORT_SIZE
      ? VENDOR_EARLY_TRIAL_DAYS
      : VENDOR_STANDARD_TRIAL_DAYS;
    const businessTrialDays = businessCount < BUSINESS_EARLY_COHORT_SIZE
      ? BUSINESS_EARLY_TRIAL_DAYS
      : BUSINESS_STANDARD_TRIAL_DAYS;

    const tiers = TIER_IDS.map((id) => ({
      id,
      name: TIERS[id].name,
      priceMonthly: TIERS[id].priceCents / 100,
    }));

    res.json({
      tiers,
      vendor: {
        trialDays: vendorTrialDays,
        earlyBirdRemaining: Math.max(0, VENDOR_EARLY_COHORT_SIZE - vendorCount),
        earlyBirdTotal: VENDOR_EARLY_COHORT_SIZE,
        earlyBirdTrialDays: VENDOR_EARLY_TRIAL_DAYS,
        standardTrialDays: VENDOR_STANDARD_TRIAL_DAYS,
      },
      business: {
        trialDays: businessTrialDays,
        earlyBirdRemaining: Math.max(0, BUSINESS_EARLY_COHORT_SIZE - businessCount),
        earlyBirdTotal: BUSINESS_EARLY_COHORT_SIZE,
        earlyBirdTrialDays: BUSINESS_EARLY_TRIAL_DAYS,
        standardTrialDays: BUSINESS_STANDARD_TRIAL_DAYS,
      },
    });
  } catch (err) {
    logger.error({ err }, "[billing] pricing error");
    res.status(500).json({ error: "Failed to fetch pricing" });
  }
});

export default router;
