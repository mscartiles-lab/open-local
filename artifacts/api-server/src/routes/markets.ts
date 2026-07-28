import { Router, type IRouter } from "express";
import { ilike, eq, and, or } from "drizzle-orm";
import { db, marketsTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

const ListMarketsQuerySchema = z.object({
  search: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  day: z.string().optional(),
});

router.get("/markets", async (req, res): Promise<void> => {
  const query = ListMarketsQuerySchema.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { search, city, region, day } = query.data;

  const conditions = [eq(marketsTable.active, true)];

  if (search) {
    conditions.push(
      or(
        ilike(marketsTable.name, `%${search}%`),
        ilike(marketsTable.city, `%${search}%`),
        ilike(marketsTable.description, `%${search}%`),
      )!,
    );
  }
  if (city) conditions.push(ilike(marketsTable.city, `%${city}%`));
  if (region) conditions.push(eq(marketsTable.region, region));
  if (day) conditions.push(ilike(marketsTable.day, `%${day}%`));

  const rows = await db
    .select()
    .from(marketsTable)
    .where(and(...conditions))
    .orderBy(marketsTable.name);

  res.json(rows.map((r) => ({
    id: r.id,
    name: r.name,
    city: r.city,
    region: r.region,
    address: r.address,
    day: r.day,
    time: r.time,
    description: r.description,
    imageUrl: r.imageUrl,
    websiteUrl: r.websiteUrl,
    contactEmail: r.contactEmail,
    instagramHandle: r.instagramHandle,
    latitude: r.latitude,
    longitude: r.longitude,
    active: r.active,
    createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
  })));
});

export default router;
