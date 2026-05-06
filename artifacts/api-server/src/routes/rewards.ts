import { Router, type IRouter } from "express";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  usersTable,
  vendorsTable,
  vendorVisitsTable,
  avatarUnlocksTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/requireAuth";
import { UNLOCK_CATALOG, unlocksEarnedFor } from "../lib/avatarCatalog";

const router: IRouter = Router();

router.get("/rewards/catalog", (_req, res): void => {
  res.json({ catalog: UNLOCK_CATALOG });
});

router.get("/rewards/me", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthRequest).userId;

  const unlocks = await db
    .select()
    .from(avatarUnlocksTable)
    .where(eq(avatarUnlocksTable.userId, userId));

  const [{ count }] = await db
    .select({
      count: sql<number>`count(distinct ${vendorVisitsTable.vendorId})::int`,
    })
    .from(vendorVisitsTable)
    .where(
      and(
        eq(vendorVisitsTable.userId, userId),
        eq(vendorVisitsTable.status, "approved"),
      ),
    );

  const [user] = await db
    .select({ equippedUnlocks: usersTable.equippedUnlocks })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  const pending = await db
    .select({
      id: vendorVisitsTable.id,
      vendorId: vendorVisitsTable.vendorId,
      vendorName: vendorsTable.name,
      requestedAt: vendorVisitsTable.requestedAt,
    })
    .from(vendorVisitsTable)
    .innerJoin(vendorsTable, eq(vendorsTable.id, vendorVisitsTable.vendorId))
    .where(
      and(
        eq(vendorVisitsTable.userId, userId),
        eq(vendorVisitsTable.status, "pending"),
      ),
    )
    .orderBy(desc(vendorVisitsTable.requestedAt));

  res.json({
    uniqueVendorCount: count ?? 0,
    unlocks: unlocks.map((u) => u.unlockKey),
    equipped: user?.equippedUnlocks ?? [],
    pending,
  });
});

const requestBody = z.object({
  vendorId: z.number().int().positive(),
});

// Shopper requests credit for visiting a vendor. Vendor must approve.
router.post("/rewards/request-visit", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthRequest).userId;
  const parsed = requestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { vendorId } = parsed.data;

  const [vendor] = await db
    .select({ id: vendorsTable.id, name: vendorsTable.name })
    .from(vendorsTable)
    .where(eq(vendorsTable.id, vendorId));
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }

  // Don't allow a duplicate pending or approved request from the same shopper for the same vendor.
  const existing = await db
    .select({ id: vendorVisitsTable.id, status: vendorVisitsTable.status })
    .from(vendorVisitsTable)
    .where(
      and(
        eq(vendorVisitsTable.userId, userId),
        eq(vendorVisitsTable.vendorId, vendorId),
        inArray(vendorVisitsTable.status, ["pending", "approved"]),
      ),
    );
  if (existing.some((v) => v.status === "pending")) {
    res.status(409).json({ error: "You already have a pending request for this shop. The vendor will see it in their dashboard." });
    return;
  }
  if (existing.some((v) => v.status === "approved")) {
    res.status(409).json({ error: "This visit has already been credited — every shop only counts once toward your unlocks." });
    return;
  }

  const [visit] = await db
    .insert(vendorVisitsTable)
    .values({ userId, vendorId, status: "pending" })
    .returning();

  res.json({ ok: true, visit, vendorName: vendor.name });
});

// Helper: load the requesting user's email for vendor-ownership checks.
async function loadUserEmail(userId: number): Promise<string | null> {
  const [u] = await db
    .select({ email: usersTable.email, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return u?.email ?? null;
}

async function userOwnsVendor(userId: number, vendorId: number): Promise<boolean> {
  const [u] = await db
    .select({ email: usersTable.email, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!u) return false;
  if (u.role === "admin") return true;
  const [v] = await db
    .select({ contactEmail: vendorsTable.contactEmail })
    .from(vendorsTable)
    .where(eq(vendorsTable.id, vendorId));
  if (!v) return false;
  return v.contactEmail.toLowerCase() === u.email.toLowerCase();
}

// Vendor lists the pending visit requests for one of their shops.
router.get("/rewards/vendor/:vendorId/pending", requireAuth, async (req, res): Promise<void> => {
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
    .select({
      id: vendorVisitsTable.id,
      requestedAt: vendorVisitsTable.requestedAt,
      shopperUserId: vendorVisitsTable.userId,
      username: usersTable.username,
      avatarSeed: usersTable.avatarSeed,
      avatarStyle: usersTable.avatarStyle,
    })
    .from(vendorVisitsTable)
    .innerJoin(usersTable, eq(usersTable.id, vendorVisitsTable.userId))
    .where(
      and(
        eq(vendorVisitsTable.vendorId, vendorId),
        eq(vendorVisitsTable.status, "pending"),
      ),
    )
    .orderBy(desc(vendorVisitsTable.requestedAt));

  res.json({ pending: rows });
});

const decideBody = z.object({
  action: z.enum(["approve", "reject"]),
});

router.post("/rewards/visits/:id/decide", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthRequest).userId;
  const visitId = Number(req.params.id);
  if (!Number.isFinite(visitId)) {
    res.status(400).json({ error: "Invalid visit id" });
    return;
  }
  const parsed = decideBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [visit] = await db
    .select()
    .from(vendorVisitsTable)
    .where(eq(vendorVisitsTable.id, visitId));
  if (!visit) {
    res.status(404).json({ error: "Request not found" });
    return;
  }
  if (visit.status !== "pending") {
    res.status(409).json({ error: `This request was already ${visit.status}.` });
    return;
  }
  if (!(await userOwnsVendor(userId, visit.vendorId))) {
    res.status(403).json({ error: "You don't manage this shop." });
    return;
  }

  const newStatus = parsed.data.action === "approve" ? "approved" : "rejected";
  await db
    .update(vendorVisitsTable)
    .set({ status: newStatus, decidedAt: new Date() })
    .where(eq(vendorVisitsTable.id, visitId));

  let newlyEarned: string[] = [];
  if (newStatus === "approved") {
    const [{ count }] = await db
      .select({
        count: sql<number>`count(distinct ${vendorVisitsTable.vendorId})::int`,
      })
      .from(vendorVisitsTable)
      .where(
        and(
          eq(vendorVisitsTable.userId, visit.userId),
          eq(vendorVisitsTable.status, "approved"),
        ),
      );

    const earnedKeys = unlocksEarnedFor(count ?? 0);
    const existing = await db
      .select({ key: avatarUnlocksTable.unlockKey })
      .from(avatarUnlocksTable)
      .where(eq(avatarUnlocksTable.userId, visit.userId));
    const existingSet = new Set(existing.map((r) => r.key));
    newlyEarned = earnedKeys.filter((k) => !existingSet.has(k));

    if (newlyEarned.length > 0) {
      await db
        .insert(avatarUnlocksTable)
        .values(newlyEarned.map((k) => ({ userId: visit.userId, unlockKey: k })))
        .onConflictDoNothing();
    }
  }

  res.json({ ok: true, status: newStatus, newlyUnlockedForShopper: newlyEarned });
});

const equipBody = z.object({
  equipped: z.array(z.string()).max(20),
});

router.patch("/rewards/equipped", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthRequest).userId;
  const parsed = equipBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const owned = await db
    .select({ key: avatarUnlocksTable.unlockKey })
    .from(avatarUnlocksTable)
    .where(eq(avatarUnlocksTable.userId, userId));
  const ownedSet = new Set(owned.map((r) => r.key));
  const allowed = parsed.data.equipped.filter((k) => ownedSet.has(k));

  const [updated] = await db
    .update(usersTable)
    .set({ equippedUnlocks: allowed })
    .where(eq(usersTable.id, userId))
    .returning({ equippedUnlocks: usersTable.equippedUnlocks });

  res.json({ equipped: updated?.equippedUnlocks ?? [] });
});

export default router;
void loadUserEmail;
