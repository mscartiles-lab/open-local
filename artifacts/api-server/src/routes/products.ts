import { Router, type IRouter } from "express";
import { eq, and, ilike, or, gt, isNull, sql, count } from "drizzle-orm";
import { db, productsTable, vendorsTable, usersTable } from "@workspace/db";
import { emitEvent } from "../lib/webhooks";
import { notPausedVendorCondition } from "./vendors";
import { requireAuth, type AuthRequest } from "../lib/requireAuth";
import { isAdminEmail } from "../lib/requireAdmin";
import { tierAllowsPreOrder, tierIncludedFeaturedCount, type TierId } from "../lib/tiers";
import {
  ListProductsQueryParams,
  CreateProductBody,
  GetProductParams,
  UpdateProductParams,
  UpdateProductBody,
  DeleteProductParams,
  ListProductsResponse,
  GetProductResponse,
  UpdateProductResponse,
  ListFeaturedProductsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Computed featured flag: true if admin-set OR a paid boost / tier-included
// feature is still active. Used in SELECT lists and WHERE clauses below.
const featuredExpr = sql<boolean>`(${productsTable.featured} OR (${productsTable.featuredUntil} IS NOT NULL AND ${productsTable.featuredUntil} > NOW()))`;

const productWithVendorSelect = {
  id: productsTable.id,
  vendorId: productsTable.vendorId,
  name: productsTable.name,
  description: productsTable.description,
  priceCents: productsTable.priceCents,
  unit: productsTable.unit,
  category: productsTable.category,
  imageUrl: productsTable.imageUrl,
  inStock: productsTable.inStock,
  featured: featuredExpr.as("featured"),
  listingType: productsTable.listingType,
  originalPriceCents: productsTable.originalPriceCents,
  availableUntil: productsTable.availableUntil,
  pickupNote: productsTable.pickupNote,
  createdAt: productsTable.createdAt,
  vendorName: vendorsTable.name,
  vendorSlug: vendorsTable.slug,
  vendorLocation: vendorsTable.location,
  vendorCategory: vendorsTable.category,
};

// Lookup the owner user row for a vendor by matching contactEmail. Returns
// null if the vendor isn't linked to a User account yet.
async function getVendorOwner(vendorId: number): Promise<{
  vendorId: number;
  vendorContactEmail: string;
  ownerUserId: number | null;
  ownerEmail: string | null;
  ownerTier: TierId | null;
} | null> {
  const [row] = await db
    .select({
      vendorId: vendorsTable.id,
      vendorContactEmail: vendorsTable.contactEmail,
      ownerUserId: usersTable.id,
      ownerEmail: usersTable.email,
      ownerTier: usersTable.tier,
    })
    .from(vendorsTable)
    .leftJoin(
      usersTable,
      sql`lower(${usersTable.email}) = lower(${vendorsTable.contactEmail})`,
    )
    .where(eq(vendorsTable.id, vendorId));
  if (!row) return null;
  return {
    vendorId: row.vendorId,
    vendorContactEmail: row.vendorContactEmail,
    ownerUserId: row.ownerUserId,
    ownerEmail: row.ownerEmail,
    ownerTier: (row.ownerTier as TierId | null) ?? null,
  };
}

router.get("/products", async (req, res): Promise<void> => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { search, category, vendorId, featured, inStock } = parsed.data;
  const listingType = typeof req.query.listingType === "string" ? req.query.listingType : undefined;
  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(productsTable.name, `%${search}%`),
        ilike(productsTable.description, `%${search}%`),
      ),
    );
  }
  if (category) conditions.push(eq(productsTable.category, category));
  if (vendorId !== undefined) conditions.push(eq(productsTable.vendorId, vendorId));
  if (featured !== undefined) conditions.push(featured ? featuredExpr : sql`NOT ${featuredExpr}`);
  if (inStock !== undefined) conditions.push(eq(productsTable.inStock, inStock));
  if (listingType) conditions.push(eq(productsTable.listingType, listingType));
  conditions.push(notPausedVendorCondition());

  const rows = await db
    .select(productWithVendorSelect)
    .from(productsTable)
    .innerJoin(vendorsTable, eq(productsTable.vendorId, vendorsTable.id))
    .where(and(...conditions))
    .orderBy(productsTable.name);

  res.json(ListProductsResponse.parse(rows));
});

router.get("/products/featured", async (_req, res): Promise<void> => {
  const rows = await db
    .select(productWithVendorSelect)
    .from(productsTable)
    .innerJoin(vendorsTable, eq(productsTable.vendorId, vendorsTable.id))
    .where(and(featuredExpr, notPausedVendorCondition()))
    .orderBy(productsTable.name);
  res.json(ListFeaturedProductsResponse.parse(rows));
});

router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [vendor] = await db
    .select({ id: vendorsTable.id })
    .from(vendorsTable)
    .where(eq(vendorsTable.id, parsed.data.vendorId));
  if (!vendor) {
    res.status(400).json({ error: "Vendor not found" });
    return;
  }
  // Tier-gate pre-order listings: Standard tier or above only.
  if (parsed.data.listingType === "pre_order") {
    const owner = await getVendorOwner(parsed.data.vendorId);
    if (!tierAllowsPreOrder(owner?.ownerTier ?? null)) {
      res.status(403).json({
        error: "Pre-order listings require the Standard or Premium plan. Upgrade your subscription to enable pre-orders.",
        code: "tier_required",
        requiredTier: "middle",
      });
      return;
    }
  }
  const insertValues = {
    ...parsed.data,
    availableUntil: parsed.data.availableUntil
      ? new Date(parsed.data.availableUntil)
      : null,
  };
  const [row] = await db.insert(productsTable).values(insertValues).returning();
  const productPayload = {
    productId: row!.id,
    vendorId: row!.vendorId,
    name: row!.name,
    priceCents: row!.priceCents,
    listingType: row!.listingType,
    inStock: row!.inStock,
  };
  emitEvent("product.created", productPayload);
  if (row!.listingType !== "regular") {
    emitEvent("offer.created", {
      ...productPayload,
      offerType: row!.listingType,
      originalPriceCents: row!.originalPriceCents ?? null,
      availableUntil: row!.availableUntil ?? null,
    });
  }
  res.status(201).json({
    id: row!.id,
    vendorId: row!.vendorId,
    name: row!.name,
    description: row!.description,
    priceCents: row!.priceCents,
    unit: row!.unit,
    category: row!.category,
    imageUrl: row!.imageUrl,
    inStock: row!.inStock,
    featured: row!.featured,
    listingType: row!.listingType,
    originalPriceCents: row!.originalPriceCents,
    availableUntil: row!.availableUntil ? row!.availableUntil.toISOString() : null,
    pickupNote: row!.pickupNote,
    createdAt: row!.createdAt.toISOString(),
  });
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select(productWithVendorSelect)
    .from(productsTable)
    .innerJoin(vendorsTable, eq(productsTable.vendorId, vendorsTable.id))
    .where(and(eq(productsTable.id, params.data.id), notPausedVendorCondition()));
  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(GetProductResponse.parse(row));
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateProductBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const updateValues: Record<string, unknown> = { ...body.data };
  if ("availableUntil" in body.data) {
    updateValues.availableUntil = body.data.availableUntil
      ? new Date(body.data.availableUntil)
      : null;
  }
  const [row] = await db
    .update(productsTable)
    .set(updateValues)
    .where(eq(productsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(UpdateProductResponse.parse(row));
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .delete(productsTable)
    .where(eq(productsTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.sendStatus(204);
});

// Premium-tier self-feature: vendor toggles up to N of their own products to
// "featured" without buying a boost. N = tierIncludedFeaturedCount(tier).
// Requires session auth; caller must own the vendor (contactEmail match) or
// be admin. Sets featuredUntil = far-future (year 9999) so the row shows up
// in the featured query alongside time-bounded boosts.
const TIER_FEATURE_SENTINEL = new Date("9999-12-31T00:00:00Z");

router.post("/products/:id/feature", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthRequest;
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [product] = await db
    .select({ id: productsTable.id, vendorId: productsTable.vendorId, featuredUntil: productsTable.featuredUntil })
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const [caller] = await db
    .select({ id: usersTable.id, email: usersTable.email, role: usersTable.role, tier: usersTable.tier })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!caller) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const owner = await getVendorOwner(product.vendorId);
  const isAdmin = caller.role === "admin" || isAdminEmail(caller.email);
  const isOwner = owner?.ownerUserId === caller.id;
  if (!isOwner && !isAdmin) {
    res.status(403).json({ error: "You don't own this listing" });
    return;
  }

  const effectiveTier = (owner?.ownerTier as TierId | null) ?? null;
  const allowance = tierIncludedFeaturedCount(effectiveTier);
  if (!isAdmin && allowance === 0) {
    res.status(403).json({
      error: "Self-featuring listings requires the Premium plan. Boost this listing for $5 / 2 weeks instead, or upgrade.",
      code: "tier_required",
      requiredTier: "premium",
    });
    return;
  }

  // Atomic gate: lock the vendor's currently-tier-featured rows, recount, and
  // only update if still under allowance. Prevents two concurrent requests
  // from both squeezing past a count-then-update gap and exceeding the limit.
  const result = await db.transaction(async (tx) => {
    const locked = await tx
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.vendorId, product.vendorId),
          sql`${productsTable.featuredUntil} = ${TIER_FEATURE_SENTINEL}`,
        ),
      )
      .for("update");
    const otherActive = locked.filter((r) => r.id !== product.id).length;
    const alreadyFeatured = locked.some((r) => r.id === product.id);
    if (!isAdmin && !alreadyFeatured && otherActive >= allowance) {
      return { ok: false as const, currentlyActive: otherActive };
    }
    await tx
      .update(productsTable)
      .set({ featuredUntil: TIER_FEATURE_SENTINEL })
      .where(eq(productsTable.id, product.id));
    return {
      ok: true as const,
      currentlyActive: alreadyFeatured ? otherActive + 0 : otherActive + 1,
    };
  });

  if (!result.ok) {
    res.status(409).json({
      error: `You've already used your ${allowance} included featured slot${allowance === 1 ? "" : "s"}. Un-feature another listing first or buy a boost.`,
      code: "feature_limit_reached",
      allowance,
      currentlyActive: result.currentlyActive,
    });
    return;
  }

  res.json({
    id: product.id,
    featuredUntil: TIER_FEATURE_SENTINEL.toISOString(),
    allowance,
    currentlyActive: result.currentlyActive,
    source: "tier_included",
  });
});

router.delete("/products/:id/feature", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthRequest;
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [product] = await db
    .select({ id: productsTable.id, vendorId: productsTable.vendorId, featuredUntil: productsTable.featuredUntil })
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const [caller] = await db
    .select({ id: usersTable.id, email: usersTable.email, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!caller) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  const owner = await getVendorOwner(product.vendorId);
  const isAdmin = caller.role === "admin" || isAdminEmail(caller.email);
  const isOwner = owner?.ownerUserId === caller.id;
  if (!isOwner && !isAdmin) {
    res.status(403).json({ error: "You don't own this listing" });
    return;
  }

  // Only clears the tier-included sentinel — won't refund or shorten a paid
  // boost that's still running.
  const isPaidBoostActive =
    product.featuredUntil &&
    product.featuredUntil.getTime() !== TIER_FEATURE_SENTINEL.getTime() &&
    product.featuredUntil.getTime() > Date.now();
  if (isPaidBoostActive) {
    res.status(409).json({
      error: "This listing is on a paid boost that expires on its own. Wait for it to expire.",
      code: "paid_boost_active",
      featuredUntil: product.featuredUntil!.toISOString(),
    });
    return;
  }

  await db
    .update(productsTable)
    .set({ featuredUntil: null })
    .where(eq(productsTable.id, product.id));
  res.sendStatus(204);
});

router.get("/feed/local-now", async (_req, res): Promise<void> => {
  const now = new Date();
  const stillAvailable = or(
    isNull(productsTable.availableUntil),
    gt(productsTable.availableUntil, now),
  );

  const fetchByType = async (type: string) =>
    db
      .select(productWithVendorSelect)
      .from(productsTable)
      .innerJoin(vendorsTable, eq(productsTable.vendorId, vendorsTable.id))
      .where(
        and(
          eq(productsTable.listingType, type),
          eq(productsTable.inStock, true),
          stillAvailable,
          notPausedVendorCondition(),
        ),
      )
      .orderBy(productsTable.createdAt);

  const [batchDrops, surplus, preOrders] = await Promise.all([
    fetchByType("batch_drop"),
    fetchByType("surplus"),
    fetchByType("pre_order"),
  ]);

  res.json({ batchDrops, surplus, preOrders });
});

export default router;
