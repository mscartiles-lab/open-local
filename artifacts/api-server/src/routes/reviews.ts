import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { db, reviewsTable, vendorsTable, usersTable, vendorVisitsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/requireAuth";
import { emitEvent } from "../lib/webhooks";

const router: IRouter = Router();

// Public: vendor's reviews + rating summary.
router.get("/vendors/:vendorId/reviews", async (req, res): Promise<void> => {
  const vendorId = Number(req.params.vendorId);
  if (!Number.isFinite(vendorId)) {
    res.status(400).json({ error: "Invalid vendorId" });
    return;
  }

  const rows = await db
    .select({
      id: reviewsTable.id,
      rating: reviewsTable.rating,
      comment: reviewsTable.comment,
      verified: reviewsTable.verified,
      createdAt: reviewsTable.createdAt,
      username: usersTable.username,
      avatarSeed: usersTable.avatarSeed,
      avatarStyle: usersTable.avatarStyle,
    })
    .from(reviewsTable)
    .innerJoin(usersTable, eq(usersTable.id, reviewsTable.userId))
    .where(eq(reviewsTable.vendorId, vendorId))
    .orderBy(desc(reviewsTable.createdAt));

  const [summary] = await db
    .select({
      count: sql<number>`count(*)::int`,
      average: sql<number>`coalesce(avg(${reviewsTable.rating}), 0)::float`,
    })
    .from(reviewsTable)
    .where(eq(reviewsTable.vendorId, vendorId));

  res.json({
    reviews: rows,
    reviewCount: summary?.count ?? 0,
    averageRating: summary?.average ?? 0,
  });
});

const createReviewBody = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});

// Any logged-in shopper can review, anytime. Reviews from shoppers with an
// approved vendor_visit for this vendor are flagged verified=true.
router.post("/vendors/:vendorId/reviews", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthRequest).userId;
  const vendorId = Number(req.params.vendorId);
  if (!Number.isFinite(vendorId)) {
    res.status(400).json({ error: "Invalid vendorId" });
    return;
  }
  const parsed = createReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [vendor] = await db
    .select({ id: vendorsTable.id, name: vendorsTable.name })
    .from(vendorsTable)
    .where(eq(vendorsTable.id, vendorId));
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }

  const existing = await db
    .select({ id: reviewsTable.id })
    .from(reviewsTable)
    .where(and(eq(reviewsTable.vendorId, vendorId), eq(reviewsTable.userId, userId)));
  if (existing.length > 0) {
    res.status(409).json({ error: "You've already reviewed this vendor. Edit or delete your existing review instead." });
    return;
  }

  const [approvedVisit] = await db
    .select({ id: vendorVisitsTable.id })
    .from(vendorVisitsTable)
    .where(
      and(
        eq(vendorVisitsTable.userId, userId),
        eq(vendorVisitsTable.vendorId, vendorId),
        eq(vendorVisitsTable.status, "approved"),
      ),
    );

  const [row] = await db
    .insert(reviewsTable)
    .values({
      vendorId,
      userId,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
      verified: Boolean(approvedVisit),
    })
    .returning();

  emitEvent("vendor.review_submitted", {
    reviewId: row!.id,
    vendorId,
    userId,
    rating: row!.rating,
    verified: row!.verified,
  });

  res.status(201).json(row);
});

router.delete("/reviews/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthRequest).userId;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .select({ id: reviewsTable.id, userId: reviewsTable.userId })
    .from(reviewsTable)
    .where(eq(reviewsTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Review not found" });
    return;
  }
  const [caller] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
  if (row.userId !== userId && caller?.role !== "admin") {
    res.status(403).json({ error: "You can't delete this review" });
    return;
  }
  await db.delete(reviewsTable).where(eq(reviewsTable.id, id));
  res.sendStatus(204);
});

export default router;
