import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { db, productVariationsTable, productsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/requireAuth";
import { userOwnsVendor } from "../lib/vendorOwnership";

const router: IRouter = Router();

async function getProductVendorId(productId: number): Promise<number | null> {
  const [p] = await db
    .select({ vendorId: productsTable.vendorId })
    .from(productsTable)
    .where(eq(productsTable.id, productId));
  return p?.vendorId ?? null;
}

router.get("/products/:id/variations", async (req, res): Promise<void> => {
  const productId = Number(req.params.id);
  if (!Number.isFinite(productId)) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }
  const rows = await db
    .select()
    .from(productVariationsTable)
    .where(eq(productVariationsTable.productId, productId))
    .orderBy(asc(productVariationsTable.sortOrder), asc(productVariationsTable.id));
  res.json({ variations: rows });
});

const variationBody = z.object({
  name: z.string().trim().min(1).max(120),
  priceCents: z.number().int().min(0),
  sku: z.string().trim().max(80).optional(),
  inStock: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

router.post("/products/:id/variations", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthRequest).userId;
  const productId = Number(req.params.id);
  if (!Number.isFinite(productId)) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }
  const vendorId = await getProductVendorId(productId);
  if (vendorId === null) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  if (!(await userOwnsVendor(userId, vendorId))) {
    res.status(403).json({ error: "You don't manage this listing" });
    return;
  }
  const parsed = variationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .insert(productVariationsTable)
    .values({
      productId,
      name: parsed.data.name,
      priceCents: parsed.data.priceCents,
      sku: parsed.data.sku ?? null,
      inStock: parsed.data.inStock ?? true,
      sortOrder: parsed.data.sortOrder ?? 0,
    })
    .returning();
  res.status(201).json(row);
});

router.patch("/products/variations/:variationId", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthRequest).userId;
  const variationId = Number(req.params.variationId);
  if (!Number.isFinite(variationId)) {
    res.status(400).json({ error: "Invalid variation id" });
    return;
  }
  const [existing] = await db
    .select()
    .from(productVariationsTable)
    .where(eq(productVariationsTable.id, variationId));
  if (!existing) {
    res.status(404).json({ error: "Variation not found" });
    return;
  }
  const vendorId = await getProductVendorId(existing.productId);
  if (vendorId === null || !(await userOwnsVendor(userId, vendorId))) {
    res.status(403).json({ error: "You don't manage this listing" });
    return;
  }
  const parsed = variationBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(productVariationsTable)
    .set(parsed.data)
    .where(eq(productVariationsTable.id, variationId))
    .returning();
  res.json(row);
});

router.delete("/products/variations/:variationId", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthRequest).userId;
  const variationId = Number(req.params.variationId);
  if (!Number.isFinite(variationId)) {
    res.status(400).json({ error: "Invalid variation id" });
    return;
  }
  const [existing] = await db
    .select()
    .from(productVariationsTable)
    .where(eq(productVariationsTable.id, variationId));
  if (!existing) {
    res.status(404).json({ error: "Variation not found" });
    return;
  }
  const vendorId = await getProductVendorId(existing.productId);
  if (vendorId === null || !(await userOwnsVendor(userId, vendorId))) {
    res.status(403).json({ error: "You don't manage this listing" });
    return;
  }
  await db.delete(productVariationsTable).where(eq(productVariationsTable.id, variationId));
  res.sendStatus(204);
});

export default router;
