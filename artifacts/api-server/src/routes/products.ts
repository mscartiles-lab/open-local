import { Router, type IRouter } from "express";
import { eq, and, ilike, or, gt, isNull } from "drizzle-orm";
import { db, productsTable, vendorsTable } from "@workspace/db";
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
  featured: productsTable.featured,
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
  if (featured !== undefined) conditions.push(eq(productsTable.featured, featured));
  if (inStock !== undefined) conditions.push(eq(productsTable.inStock, inStock));
  if (listingType) conditions.push(eq(productsTable.listingType, listingType));

  const rows = await db
    .select(productWithVendorSelect)
    .from(productsTable)
    .innerJoin(vendorsTable, eq(productsTable.vendorId, vendorsTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(productsTable.name);

  res.json(ListProductsResponse.parse(rows));
});

router.get("/products/featured", async (_req, res): Promise<void> => {
  const rows = await db
    .select(productWithVendorSelect)
    .from(productsTable)
    .innerJoin(vendorsTable, eq(productsTable.vendorId, vendorsTable.id))
    .where(eq(productsTable.featured, true))
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
  const insertValues = {
    ...parsed.data,
    availableUntil: parsed.data.availableUntil
      ? new Date(parsed.data.availableUntil)
      : null,
  };
  const [row] = await db.insert(productsTable).values(insertValues).returning();
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
    .where(eq(productsTable.id, params.data.id));
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
      .where(and(eq(productsTable.listingType, type), eq(productsTable.inStock, true), stillAvailable))
      .orderBy(productsTable.createdAt);

  const [batchDrops, surplus, preOrders] = await Promise.all([
    fetchByType("batch_drop"),
    fetchByType("surplus"),
    fetchByType("pre_order"),
  ]);

  res.json({ batchDrops, surplus, preOrders });
});

export default router;
