import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { db, vendorCertificationsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/requireAuth";
import { requireAdmin } from "../lib/requireAdmin";
import { userOwnsVendor } from "../lib/vendorOwnership";
import { emitEvent } from "../lib/webhooks";

const router: IRouter = Router();

// Public: only approved certifications show on the storefront.
router.get("/vendors/:vendorId/certifications", async (req, res): Promise<void> => {
  const vendorId = Number(req.params.vendorId);
  if (!Number.isFinite(vendorId)) {
    res.status(400).json({ error: "Invalid vendorId" });
    return;
  }
  const rows = await db
    .select()
    .from(vendorCertificationsTable)
    .where(and(eq(vendorCertificationsTable.vendorId, vendorId), eq(vendorCertificationsTable.status, "approved")))
    .orderBy(desc(vendorCertificationsTable.decidedAt));
  res.json({ certifications: rows });
});

// Vendor: full list of their own certification requests (any status).
router.get("/vendors/:vendorId/certifications/mine", requireAuth, async (req, res): Promise<void> => {
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
  const rows = await db
    .select()
    .from(vendorCertificationsTable)
    .where(eq(vendorCertificationsTable.vendorId, vendorId))
    .orderBy(desc(vendorCertificationsTable.requestedAt));
  res.json({ certifications: rows });
});

const requestBody = z.object({
  name: z.string().trim().min(2).max(120),
  documentUrl: z.string().trim().max(2000).optional(),
});

router.post("/vendors/:vendorId/certifications", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthRequest).userId;
  const vendorId = Number(req.params.vendorId);
  if (!Number.isFinite(vendorId)) {
    res.status(400).json({ error: "Invalid vendorId" });
    return;
  }
  const parsed = requestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!(await userOwnsVendor(userId, vendorId))) {
    res.status(403).json({ error: "You don't manage this shop." });
    return;
  }

  const [row] = await db
    .insert(vendorCertificationsTable)
    .values({
      vendorId,
      name: parsed.data.name,
      documentUrl: parsed.data.documentUrl ?? null,
      status: "pending",
    })
    .returning();

  emitEvent("vendor.certification_requested", {
    certificationId: row!.id,
    vendorId,
    name: row!.name,
  });

  res.status(201).json(row);
});

router.delete("/certifications/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthRequest).userId;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db.select().from(vendorCertificationsTable).where(eq(vendorCertificationsTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Certification not found" });
    return;
  }
  if (!(await userOwnsVendor(userId, row.vendorId))) {
    res.status(403).json({ error: "You don't manage this shop." });
    return;
  }
  await db.delete(vendorCertificationsTable).where(eq(vendorCertificationsTable.id, id));
  res.sendStatus(204);
});

// Admin moderation.
router.get("/admin/certifications", requireAdmin, async (req, res): Promise<void> => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const rows = await db
    .select()
    .from(vendorCertificationsTable)
    .where(status ? eq(vendorCertificationsTable.status, status) : undefined)
    .orderBy(desc(vendorCertificationsTable.requestedAt));
  res.json({ certifications: rows });
});

const decideBody = z.object({
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().trim().max(500).optional(),
});

router.patch("/admin/certifications/:id/decide", requireAdmin, async (req, res): Promise<void> => {
  const adminUserId = (req as AuthRequest).userId;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = decideBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db.select().from(vendorCertificationsTable).where(eq(vendorCertificationsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Certification not found" });
    return;
  }
  if (existing.status !== "pending") {
    res.status(409).json({ error: `This request was already ${existing.status}.` });
    return;
  }

  const newStatus = parsed.data.action === "approve" ? "approved" : "rejected";
  const [row] = await db
    .update(vendorCertificationsTable)
    .set({
      status: newStatus,
      decidedAt: new Date(),
      decidedBy: adminUserId,
      rejectionReason: parsed.data.action === "reject" ? (parsed.data.rejectionReason ?? null) : null,
    })
    .where(eq(vendorCertificationsTable.id, id))
    .returning();

  emitEvent(newStatus === "approved" ? "vendor.certification_approved" : "vendor.certification_rejected", {
    certificationId: id,
    vendorId: existing.vendorId,
    name: existing.name,
  });

  res.json(row);
});

export default router;
