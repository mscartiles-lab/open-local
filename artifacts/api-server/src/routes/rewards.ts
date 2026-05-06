import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
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

const MILES_PER_RADIAN = 3958.8;
const MAX_CHECK_IN_DISTANCE_MILES = 0.25;

function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * MILES_PER_RADIAN * Math.asin(Math.sqrt(a));
}

const checkInBody = z.object({
  vendorId: z.number().int().positive(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

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
    .select({ count: sql<number>`count(distinct ${vendorVisitsTable.vendorId})::int` })
    .from(vendorVisitsTable)
    .where(eq(vendorVisitsTable.userId, userId));

  const [user] = await db
    .select({ equippedUnlocks: usersTable.equippedUnlocks })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  res.json({
    uniqueVendorCount: count ?? 0,
    unlocks: unlocks.map((u) => u.unlockKey),
    equipped: user?.equippedUnlocks ?? [],
  });
});

router.post("/rewards/check-in", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthRequest).userId;
  const parsed = checkInBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { vendorId, latitude, longitude } = parsed.data;

  const [vendor] = await db
    .select({
      id: vendorsTable.id,
      name: vendorsTable.name,
      latitude: vendorsTable.latitude,
      longitude: vendorsTable.longitude,
    })
    .from(vendorsTable)
    .where(eq(vendorsTable.id, vendorId));

  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  if (vendor.latitude == null || vendor.longitude == null) {
    res.status(400).json({ error: "This shop hasn't pinned its location yet, so check-in isn't available." });
    return;
  }

  const distance = haversineMiles(latitude, longitude, vendor.latitude, vendor.longitude);
  if (distance > MAX_CHECK_IN_DISTANCE_MILES) {
    res.status(400).json({
      error: `You're ${distance.toFixed(2)} miles from ${vendor.name}. Get within ${MAX_CHECK_IN_DISTANCE_MILES} miles to check in.`,
      distanceMiles: distance,
    });
    return;
  }

  // Insert visit; ignore if already checked in today (unique constraint)
  let alreadyToday = false;
  try {
    await db.insert(vendorVisitsTable).values({
      userId,
      vendorId,
      latitude,
      longitude,
      distanceMiles: distance,
    });
  } catch (e) {
    if (e && typeof e === "object" && (e as { code?: string }).code === "23505") {
      alreadyToday = true;
    } else {
      throw e;
    }
  }

  // Recompute unique vendor count and award any newly-earned unlocks.
  const [{ count }] = await db
    .select({ count: sql<number>`count(distinct ${vendorVisitsTable.vendorId})::int` })
    .from(vendorVisitsTable)
    .where(eq(vendorVisitsTable.userId, userId));

  const earnedKeys = unlocksEarnedFor(count ?? 0);
  const existing = await db
    .select({ key: avatarUnlocksTable.unlockKey })
    .from(avatarUnlocksTable)
    .where(eq(avatarUnlocksTable.userId, userId));
  const existingSet = new Set(existing.map((r) => r.key));
  const newlyEarned = earnedKeys.filter((k) => !existingSet.has(k));

  if (newlyEarned.length > 0) {
    await db
      .insert(avatarUnlocksTable)
      .values(newlyEarned.map((k) => ({ userId, unlockKey: k })))
      .onConflictDoNothing();
  }

  res.json({
    ok: true,
    alreadyCheckedInToday: alreadyToday,
    distanceMiles: distance,
    uniqueVendorCount: count ?? 0,
    newlyUnlocked: newlyEarned,
  });
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

  // Only allow equipping items the user has actually unlocked
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
// `and` import kept for future filters
void and;
