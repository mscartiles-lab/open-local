import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq, and, ilike, sql, desc } from "drizzle-orm";
import { db, wholesaleListingsTable, vendorsTable, usersTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/requireAuth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const ListWholesaleQuery = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  vendorId: z.coerce.number().int().positive().optional(),
});

const CreateWholesaleBody = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  category: z.string().optional(),
  pricePerUnit: z.number().positive().optional(),
  unit: z.string().optional(),
  minOrderQty: z.number().int().min(1).default(1),
  availableQty: z.number().int().min(1).optional(),
  imageUrl: z.string().url().optional(),
  expiresAt: z.string().datetime().optional(),
});

const UpdateWholesaleBody = CreateWholesaleBody.partial();

// ─── Helper: find vendor for the authenticated user ──────────────────────────

async function getVendorForUserId(userId: number) {
  const [user] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user) return null;

  const [vendor] = await db
    .select({ id: vendorsTable.id, contactEmail: vendorsTable.contactEmail })
    .from(vendorsTable)
    .where(sql`lower(${vendorsTable.contactEmail}) = lower(${user.email})`);

  return vendor ?? null;
}

// ─── GET /api/wholesale ──────────────────────────────────────────────────────

router.get("/wholesale", async (req, res): Promise<void> => {
  const parsed = ListWholesaleQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, category, vendorId } = parsed.data;

  const rows = await db
    .select({
      id: wholesaleListingsTable.id,
      vendorId: wholesaleListingsTable.vendorId,
      vendorName: vendorsTable.name,
      vendorSlug: vendorsTable.slug,
      vendorImageUrl: vendorsTable.imageUrl,
      title: wholesaleListingsTable.title,
      description: wholesaleListingsTable.description,
      category: wholesaleListingsTable.category,
      pricePerUnit: wholesaleListingsTable.pricePerUnit,
      unit: wholesaleListingsTable.unit,
      minOrderQty: wholesaleListingsTable.minOrderQty,
      availableQty: wholesaleListingsTable.availableQty,
      imageUrl: wholesaleListingsTable.imageUrl,
      expiresAt: wholesaleListingsTable.expiresAt,
      active: wholesaleListingsTable.active,
      createdAt: wholesaleListingsTable.createdAt,
    })
    .from(wholesaleListingsTable)
    .innerJoin(vendorsTable, eq(wholesaleListingsTable.vendorId, vendorsTable.id))
    .where(
      and(
        eq(wholesaleListingsTable.active, true),
        ...(search
          ? [
              sql`(${ilike(wholesaleListingsTable.title, `%${search}%`)} OR ${ilike(vendorsTable.name, `%${search}%`)} OR ${ilike(wholesaleListingsTable.description, `%${search}%`)})`,
            ]
          : []),
        ...(category ? [eq(wholesaleListingsTable.category, category)] : []),
        ...(vendorId ? [eq(wholesaleListingsTable.vendorId, vendorId)] : []),
      ),
    )
    .orderBy(desc(wholesaleListingsTable.createdAt));

  res.json(
    rows.map((r) => ({
      ...r,
      pricePerUnit: r.pricePerUnit ? parseFloat(r.pricePerUnit) : null,
      expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

// ─── POST /api/wholesale ─────────────────────────────────────────────────────

router.post("/wholesale", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthRequest;

  const parsed = CreateWholesaleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const vendor = await getVendorForUserId(userId);
  if (!vendor) {
    res.status(403).json({ error: "No vendor account found for this user." });
    return;
  }

  const [row] = await db
    .insert(wholesaleListingsTable)
    .values({
      vendorId: vendor.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      category: parsed.data.category ?? null,
      pricePerUnit: parsed.data.pricePerUnit ? String(parsed.data.pricePerUnit) : null,
      unit: parsed.data.unit ?? null,
      minOrderQty: parsed.data.minOrderQty,
      availableQty: parsed.data.availableQty ?? null,
      imageUrl: parsed.data.imageUrl ?? null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    })
    .returning();

  logger.info({ vendorId: vendor.id, listingId: row!.id }, "[wholesale] listing created");

  res.status(201).json({
    ...row,
    pricePerUnit: row!.pricePerUnit ? parseFloat(row!.pricePerUnit) : null,
    expiresAt: row!.expiresAt ? row!.expiresAt.toISOString() : null,
    createdAt: row!.createdAt.toISOString(),
  });
});

// ─── PATCH /api/wholesale/:id ────────────────────────────────────────────────

router.patch("/wholesale/:id", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthRequest;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0]! : (req.params.id ?? ""), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid listing id" }); return; }

  const parsed = UpdateWholesaleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const vendor = await getVendorForUserId(userId);
  if (!vendor) { res.status(403).json({ error: "No vendor account found." }); return; }

  const [existing] = await db
    .select({ id: wholesaleListingsTable.id, vendorId: wholesaleListingsTable.vendorId })
    .from(wholesaleListingsTable)
    .where(eq(wholesaleListingsTable.id, id));

  if (!existing) { res.status(404).json({ error: "Listing not found." }); return; }
  if (existing.vendorId !== vendor.id) { res.status(403).json({ error: "Not your listing." }); return; }

  const updates: Partial<typeof wholesaleListingsTable.$inferInsert> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.category !== undefined) updates.category = parsed.data.category;
  if (parsed.data.pricePerUnit !== undefined) updates.pricePerUnit = String(parsed.data.pricePerUnit);
  if (parsed.data.unit !== undefined) updates.unit = parsed.data.unit;
  if (parsed.data.minOrderQty !== undefined) updates.minOrderQty = parsed.data.minOrderQty;
  if (parsed.data.availableQty !== undefined) updates.availableQty = parsed.data.availableQty;
  if (parsed.data.imageUrl !== undefined) updates.imageUrl = parsed.data.imageUrl;
  if (parsed.data.expiresAt !== undefined) updates.expiresAt = new Date(parsed.data.expiresAt);

  const [updated] = await db
    .update(wholesaleListingsTable)
    .set(updates)
    .where(eq(wholesaleListingsTable.id, id))
    .returning();

  res.json({
    ...updated,
    pricePerUnit: updated!.pricePerUnit ? parseFloat(updated!.pricePerUnit) : null,
    expiresAt: updated!.expiresAt ? updated!.expiresAt.toISOString() : null,
    createdAt: updated!.createdAt.toISOString(),
  });
});

// ─── DELETE /api/wholesale/:id ───────────────────────────────────────────────

router.delete("/wholesale/:id", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthRequest;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0]! : (req.params.id ?? ""), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid listing id" }); return; }

  const vendor = await getVendorForUserId(userId);
  if (!vendor) { res.status(403).json({ error: "No vendor account found." }); return; }

  const [existing] = await db
    .select({ id: wholesaleListingsTable.id, vendorId: wholesaleListingsTable.vendorId })
    .from(wholesaleListingsTable)
    .where(eq(wholesaleListingsTable.id, id));

  if (!existing) { res.status(404).json({ error: "Listing not found." }); return; }
  if (existing.vendorId !== vendor.id) { res.status(403).json({ error: "Not your listing." }); return; }

  await db
    .update(wholesaleListingsTable)
    .set({ active: false })
    .where(eq(wholesaleListingsTable.id, id));

  logger.info({ vendorId: vendor.id, listingId: id }, "[wholesale] listing soft-deleted");
  res.status(204).end();
});

export default router;
