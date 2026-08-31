import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  ordersTable,
  productsTable,
  vendorsTable,
  usersTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/requireAuth";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/** 8% platform fee on every product sale. */
export const PLATFORM_FEE_PERCENT = 8;

function getBaseUrl(req: Request): string {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (domain) return `https://${domain}`;
  return `${req.protocol}://${req.get("host")}`;
}

// ── POST /api/orders/checkout ────────────────────────────────────────────────
// Creates a Stripe Checkout Session for a single product purchase.
// Uses a destination charge: platform collects, transfers (amount - fee) to
// the vendor's Connect account.
const checkoutBody = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(10).default(1),
});

router.post("/orders/checkout", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;

  const parsed = checkoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { productId, quantity } = parsed.data;

  try {
    // Load product + vendor in one join
    const [row] = await db
      .select({
        productId: productsTable.id,
        productName: productsTable.name,
        productDescription: productsTable.description,
        priceCents: productsTable.priceCents,
        inStock: productsTable.inStock,
        listingType: productsTable.listingType,
        pickupNote: productsTable.pickupNote,
        imageUrl: productsTable.imageUrl,
        vendorId: vendorsTable.id,
        vendorName: vendorsTable.name,
        vendorSlug: vendorsTable.slug,
        stripeConnectId: vendorsTable.stripeConnectId,
        stripeConnectStatus: vendorsTable.stripeConnectStatus,
      })
      .from(productsTable)
      .innerJoin(vendorsTable, eq(productsTable.vendorId, vendorsTable.id))
      .where(eq(productsTable.id, productId));

    if (!row) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    if (!row.inStock) {
      res.status(409).json({ error: "This item is currently out of stock." });
      return;
    }
    if (!row.stripeConnectId || row.stripeConnectStatus !== "active") {
      res.status(422).json({
        error: "This vendor hasn't set up payouts yet and can't accept payments online.",
        code: "vendor_connect_inactive",
      });
      return;
    }

    const buyer = await db
      .select({ email: usersTable.email, username: usersTable.username, stripeCustomerId: usersTable.stripeCustomerId })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    const buyerRow = buyer[0];
    if (!buyerRow) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const stripe = await getUncachableStripeClient();

    // Ensure Stripe customer exists for the buyer
    let customerId = buyerRow.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: buyerRow.email,
        name: buyerRow.username,
        metadata: { userId: String(userId) },
      });
      customerId = customer.id;
      await db.update(usersTable).set({ stripeCustomerId: customerId }).where(eq(usersTable.id, userId));
    }

    const unitAmountCents = row.priceCents * quantity;
    const platformFeeCents = Math.round(unitAmountCents * PLATFORM_FEE_PERCENT / 100);

    // Create pending order row first so we have an id for metadata
    const [order] = await db
      .insert(ordersTable)
      .values({
        buyerUserId: userId,
        vendorId: row.vendorId,
        productId: row.productId,
        quantity,
        amountCents: unitAmountCents,
        platformFeeCents,
        status: "pending",
        pickupNote: row.pickupNote ?? null,
      })
      .returning();

    const baseUrl = getBaseUrl(req);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: row.priceCents,
            product_data: {
              name: row.productName,
              description: row.productDescription || undefined,
              images: row.imageUrl ? [row.imageUrl] : [],
            },
          },
          quantity,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        application_fee_amount: platformFeeCents,
        transfer_data: {
          destination: row.stripeConnectId,
        },
      },
      success_url: `${baseUrl}/orders?order=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard/${row.vendorSlug}?order=cancel&product=${productId}`,
      metadata: {
        kind: "product_purchase",
        orderId: String(order.id),
        productId: String(productId),
        vendorId: String(row.vendorId),
        userId: String(userId),
        quantity: String(quantity),
      },
    });

    // Store session id for webhook lookup
    await db
      .update(ordersTable)
      .set({ stripeSessionId: session.id })
      .where(eq(ordersTable.id, order.id));

    logger.info({ orderId: order.id, sessionId: session.id, vendorId: row.vendorId }, "[orders] checkout session created");
    res.json({ url: session.url, orderId: order.id });
  } catch (err) {
    logger.error({ err }, "[orders] checkout error");
    res.status(500).json({ error: "Failed to create checkout" });
  }
});

// ── GET /api/orders/me ────────────────────────────────────────────────────────
router.get("/orders/me", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;

  try {
    const rows = await db
      .select({
        id: ordersTable.id,
        status: ordersTable.status,
        amountCents: ordersTable.amountCents,
        platformFeeCents: ordersTable.platformFeeCents,
        quantity: ordersTable.quantity,
        pickupNote: ordersTable.pickupNote,
        createdAt: ordersTable.createdAt,
        productId: productsTable.id,
        productName: productsTable.name,
        productImageUrl: productsTable.imageUrl,
        listingType: productsTable.listingType,
        availableUntil: productsTable.availableUntil,
        vendorId: vendorsTable.id,
        vendorName: vendorsTable.name,
        vendorSlug: vendorsTable.slug,
      })
      .from(ordersTable)
      .innerJoin(productsTable, eq(productsTable.id, ordersTable.productId))
      .innerJoin(vendorsTable, eq(vendorsTable.id, ordersTable.vendorId))
      .where(eq(ordersTable.buyerUserId, userId))
      .orderBy(desc(ordersTable.createdAt));

    res.json({ orders: rows });
  } catch (err) {
    logger.error({ err }, "[orders] list buyer orders error");
    res.status(500).json({ error: "Failed to load orders" });
  }
});

// ── GET /api/vendors/:vendorId/orders (vendor sees received orders) ───────────
router.get("/vendors/:vendorId/orders", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { userId } = req as AuthRequest;
  const vendorId = Number(req.params.vendorId);
  if (!Number.isFinite(vendorId)) {
    res.status(400).json({ error: "Invalid vendorId" });
    return;
  }

  try {
    // Auth: caller must own the vendor or be admin
    const [caller] = await db
      .select({ email: usersTable.email, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    if (!caller) { res.status(401).json({ error: "Not authenticated" }); return; }

    const [vendor] = await db
      .select({ contactEmail: vendorsTable.contactEmail })
      .from(vendorsTable)
      .where(eq(vendorsTable.id, vendorId));
    if (!vendor) { res.status(404).json({ error: "Vendor not found" }); return; }

    const isOwner = vendor.contactEmail.toLowerCase() === caller.email.toLowerCase();
    if (!isOwner && caller.role !== "admin") {
      res.status(403).json({ error: "You don't manage this shop." });
      return;
    }

    const rows = await db
      .select({
        id: ordersTable.id,
        status: ordersTable.status,
        amountCents: ordersTable.amountCents,
        platformFeeCents: ordersTable.platformFeeCents,
        quantity: ordersTable.quantity,
        pickupNote: ordersTable.pickupNote,
        createdAt: ordersTable.createdAt,
        productId: productsTable.id,
        productName: productsTable.name,
        listingType: productsTable.listingType,
        availableUntil: productsTable.availableUntil,
        buyerUsername: usersTable.username,
        buyerEmail: usersTable.email,
      })
      .from(ordersTable)
      .innerJoin(productsTable, eq(productsTable.id, ordersTable.productId))
      .innerJoin(usersTable, eq(usersTable.id, ordersTable.buyerUserId))
      .where(eq(ordersTable.vendorId, vendorId))
      .orderBy(desc(ordersTable.createdAt));

    res.json({ orders: rows });
  } catch (err) {
    logger.error({ err }, "[orders] list vendor orders error");
    res.status(500).json({ error: "Failed to load orders" });
  }
});

export default router;
