import { Router, type IRouter } from "express";
import { eq, and, ilike, or } from "drizzle-orm";
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
  // Ensure vendor exists
  const [vendor] = await db
    .select({ id: vendorsTable.id })
    .from(vendorsTable)
    .where(eq(vendorsTable.id, parsed.data.vendorId));
  if (!vendor) {
    res.status(400).json({ error: "Vendor not found" });
    return;
  }
  const [row] = await db.insert(productsTable).values(parsed.data).returning();
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
  const [row] = await db
    .update(productsTable)
    .set(body.data)
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

export default router;
