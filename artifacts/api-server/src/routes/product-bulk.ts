import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, productsTable, vendorsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/requireAuth";
import { userOwnsVendor } from "../lib/vendorOwnership";
import { emitEvent } from "../lib/webhooks";

const router: IRouter = Router();

const LISTING_TYPES = ["regular", "batch_drop", "surplus", "pre_order"] as const;

const bulkRowSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().default(""),
  priceCents: z.number().int().min(0),
  unit: z.string().trim().min(1),
  category: z.string().trim().min(1),
  imageUrl: z.string().trim().url().optional(),
  inStock: z.boolean().optional(),
  listingType: z.enum(LISTING_TYPES).optional(),
});

const bulkImportBody = z.object({
  rows: z.array(bulkRowSchema).min(1).max(500),
});

// Bulk-create products for a vendor from a pre-parsed inventory list (client
// parses the CSV with papaparse and posts JSON rows here — keeps the server
// free of multipart handling for this flow).
router.post("/vendors/:vendorId/products/bulk-import", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthRequest).userId;
  const vendorId = Number(req.params.vendorId);
  if (!Number.isFinite(vendorId)) {
    res.status(400).json({ error: "Invalid vendorId" });
    return;
  }
  if (!(await userOwnsVendor(userId, vendorId))) {
    res.status(403).json({ error: "You don't manage this shop." });
    return;
  }
  const [vendor] = await db.select({ id: vendorsTable.id }).from(vendorsTable).where(eq(vendorsTable.id, vendorId));
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }

  const parsed = bulkImportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const fallbackImage = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800";
  const values = parsed.data.rows.map((row) => ({
    vendorId,
    name: row.name,
    description: row.description,
    priceCents: row.priceCents,
    unit: row.unit,
    category: row.category,
    imageUrl: row.imageUrl ?? fallbackImage,
    inStock: row.inStock ?? true,
    listingType: row.listingType ?? "regular",
  }));

  const inserted = await db.insert(productsTable).values(values).returning();

  emitEvent("product.created", {
    vendorId,
    bulkImport: true,
    count: inserted.length,
  });

  res.status(201).json({ imported: inserted.length, products: inserted });
});

// CSV export of a vendor's current inventory — doubles as the import template.
router.get("/vendors/:vendorId/products/export", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthRequest).userId;
  const vendorId = Number(req.params.vendorId);
  if (!Number.isFinite(vendorId)) {
    res.status(400).json({ error: "Invalid vendorId" });
    return;
  }
  if (!(await userOwnsVendor(userId, vendorId))) {
    res.status(403).json({ error: "You don't manage this shop." });
    return;
  }

  const rows = await db.select().from(productsTable).where(eq(productsTable.vendorId, vendorId));

  const header = ["name", "description", "priceCents", "unit", "category", "imageUrl", "inStock", "listingType"];
  const csvEscape = (value: unknown): string => {
    const s = String(value ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [r.name, r.description, r.priceCents, r.unit, r.category, r.imageUrl, r.inStock, r.listingType]
        .map(csvEscape)
        .join(","),
    );
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="inventory-vendor-${vendorId}.csv"`);
  res.send(lines.join("\n"));
});

export default router;
