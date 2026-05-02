import { Router, type IRouter, type Request, type Response } from "express";
import { getUncachableStripeClient } from "../stripeClient";
import { stripeStorage } from "../stripeStorage";
import { logger } from "../lib/logger";
import { requireAuth, type AuthRequest } from "../lib/requireAuth";
import { verifyBusinessBillingToken } from "../lib/billingToken";

const router: IRouter = Router();

const VENDOR_PLAN_NAME = "Open Local Vendor Plan";
const BUSINESS_PLAN_NAME = "Open Local Business Listing";
const MONTHLY_PRICE_CENTS = 1098;

const VENDOR_EARLY_COHORT_SIZE = 150;
const VENDOR_EARLY_TRIAL_DAYS = 60;
const VENDOR_STANDARD_TRIAL_DAYS = 30;

const BUSINESS_EARLY_COHORT_SIZE = 100;
const BUSINESS_EARLY_TRIAL_DAYS = 90;
const BUSINESS_STANDARD_TRIAL_DAYS = 0;

async function getOrCreatePriceId(planName: string): Promise<string> {
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

  if (prices.data.length > 0) {
    return prices.data[0].id;
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: MONTHLY_PRICE_CENTS,
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

router.post("/billing/vendor/checkout", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;

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

    const priceId = await getOrCreatePriceId(VENDOR_PLAN_NAME);
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
      subscription_data: trialDays > 0 ? { trial_period_days: trialDays } : undefined,
      success_url: `${baseUrl}/?billing=success`,
      cancel_url: `${baseUrl}/?billing=cancel`,
    });

    res.json({ url: session.url, trialDays });
  } catch (err) {
    logger.error({ err }, "[billing] vendor checkout error");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

router.post("/billing/business/checkout", async (req: Request, res: Response): Promise<void> => {
  const { billingToken } = req.body as { billingToken?: string };

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

    const priceId = await getOrCreatePriceId(BUSINESS_PLAN_NAME);
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
      subscription_data: trialDays > 0 ? { trial_period_days: trialDays } : undefined,
      success_url: `${baseUrl}/?billing=success`,
      cancel_url: `${baseUrl}/?billing=cancel`,
    });

    res.json({ url: session.url, trialDays });
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
      res.json({ status: "none", trialDays, priceMonthly: MONTHLY_PRICE_CENTS / 100 });
      return;
    }

    const sub = await stripeStorage.getSubscription(user.stripeSubscriptionId);
    res.json({
      status: sub?.status ?? "unknown",
      trialEnd: sub?.trial_end ?? null,
      priceMonthly: MONTHLY_PRICE_CENTS / 100,
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

    res.json({
      priceMonthly: MONTHLY_PRICE_CENTS / 100,
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
