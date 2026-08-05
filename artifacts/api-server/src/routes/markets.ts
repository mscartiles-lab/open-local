import { Router, type IRouter } from "express";
import { ilike, eq, and, or, isNull } from "drizzle-orm";
import { db, marketsTable } from "@workspace/db";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../lib/requireAuth";
import { sendDirectEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ─── Slug generation ──────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function uniqueSlug(base: string, excludeId?: number): Promise<string> {
  let slug = base;
  let attempt = 0;
  while (true) {
    const existing = await db
      .select({ id: marketsTable.id })
      .from(marketsTable)
      .where(eq(marketsTable.slug, slug))
      .limit(1);
    if (
      existing.length === 0 ||
      (excludeId !== undefined && existing[0]?.id === excludeId)
    ) {
      return slug;
    }
    attempt++;
    slug = `${base}-${attempt}`;
  }
}

// ─── Serialiser ───────────────────────────────────────────────────────────────

function serializeMarket(r: typeof marketsTable.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    city: r.city,
    region: r.region,
    address: r.address,
    day: r.day,
    time: r.time,
    description: r.description,
    imageUrl: r.imageUrl,
    logoUrl: r.logoUrl,
    featuredImageUrl: r.featuredImageUrl,
    websiteUrl: r.websiteUrl,
    contactEmail: r.contactEmail,
    instagramHandle: r.instagramHandle,
    facebookUrl: r.facebookUrl,
    twitterHandle: r.twitterHandle,
    latitude: r.latitude,
    longitude: r.longitude,
    managerId: r.managerId,
    verified: r.verified,
    vendorCount: r.vendorCount,
    tags: r.tags ?? [],
    active: r.active,
    createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const ListMarketsQuerySchema = z.object({
  search: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  day: z.string().optional(),
});

const RegisterMarketBodySchema = z.object({
  name: z.string().min(2),
  city: z.string().min(1),
  region: z.string().default("FL"),
  address: z.string().optional(),
  day: z.string().optional(),
  time: z.string().optional(),
  description: z.string().optional(),
  contactEmail: z.string().email(),
  phone: z.string().optional(),
  websiteUrl: z.string().url().optional(),
  instagramHandle: z.string().optional(),
  facebookUrl: z.string().url().optional(),
  twitterHandle: z.string().optional(),
  logoUrl: z.string().url().optional(),
  featuredImageUrl: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
});

const UpdateMarketBodySchema = RegisterMarketBodySchema.partial().omit({
  name: true,
  contactEmail: true,
}).extend({
  name: z.string().min(2).optional(),
  contactEmail: z.string().email().optional(),
});

// ─── GET /api/markets ─────────────────────────────────────────────────────────

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

  res.json(rows.map(serializeMarket));
});

// ─── POST /api/markets/register ───────────────────────────────────────────────

router.post("/markets/register", async (req, res): Promise<void> => {
  const parsed = RegisterMarketBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const data = parsed.data;
  const baseSlug = toSlug(data.name);
  const slug = await uniqueSlug(baseSlug);

  const [market] = await db
    .insert(marketsTable)
    .values({
      name: data.name,
      slug,
      city: data.city,
      region: data.region,
      address: data.address ?? null,
      day: data.day ?? null,
      time: data.time ?? null,
      description: data.description ?? null,
      contactEmail: data.contactEmail,
      websiteUrl: data.websiteUrl ?? null,
      instagramHandle: data.instagramHandle ?? null,
      facebookUrl: data.facebookUrl ?? null,
      twitterHandle: data.twitterHandle ?? null,
      logoUrl: data.logoUrl ?? null,
      featuredImageUrl: data.featuredImageUrl ?? null,
      tags: data.tags ?? [],
      verified: false,
      active: true,
    })
    .returning();

  logger.info({ slug, name: data.name }, "[markets] market registered");

  // Fire-and-forget confirmation email
  sendDirectEmail({
    to: data.contactEmail,
    toName: data.name,
    subject: `${data.name} — your Open Local listing received`,
    message: `Thanks for registering ${data.name} on Open Local!\n\nWe'll review your listing within 1–2 business days and reach out with next steps.\n\nYour market page will be live at: https://openlocalapp.com/markets/${slug}`,
  }).catch(() => {}); // non-blocking

  res.status(201).json(serializeMarket(market!));
});

// ─── GET /api/markets/:slug ───────────────────────────────────────────────────

router.get("/markets/:slug", async (req, res): Promise<void> => {
  const slug = req.params.slug as string;

  const [market] = await db
    .select()
    .from(marketsTable)
    .where(and(eq(marketsTable.slug, slug), eq(marketsTable.active, true)))
    .limit(1);

  if (!market) {
    res.status(404).json({ error: "Market not found" });
    return;
  }

  res.json(serializeMarket(market));
});

// ─── PATCH /api/markets/:slug ─────────────────────────────────────────────────

router.patch("/markets/:slug", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthRequest;
  const slug = req.params.slug as string;

  const [market] = await db
    .select()
    .from(marketsTable)
    .where(eq(marketsTable.slug, slug))
    .limit(1);

  if (!market) { res.status(404).json({ error: "Market not found" }); return; }
  if (market.managerId !== userId) { res.status(403).json({ error: "Not the market manager" }); return; }

  const parsed = UpdateMarketBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const d = parsed.data;
  const updates: Partial<typeof marketsTable.$inferInsert> = {};
  if (d.name !== undefined) updates.name = d.name;
  if (d.city !== undefined) updates.city = d.city;
  if (d.region !== undefined) updates.region = d.region;
  if (d.address !== undefined) updates.address = d.address;
  if (d.day !== undefined) updates.day = d.day;
  if (d.time !== undefined) updates.time = d.time;
  if (d.description !== undefined) updates.description = d.description;
  if (d.contactEmail !== undefined) updates.contactEmail = d.contactEmail;
  if (d.websiteUrl !== undefined) updates.websiteUrl = d.websiteUrl;
  if (d.instagramHandle !== undefined) updates.instagramHandle = d.instagramHandle;
  if (d.facebookUrl !== undefined) updates.facebookUrl = d.facebookUrl;
  if (d.twitterHandle !== undefined) updates.twitterHandle = d.twitterHandle;
  if (d.logoUrl !== undefined) updates.logoUrl = d.logoUrl;
  if (d.featuredImageUrl !== undefined) updates.featuredImageUrl = d.featuredImageUrl;
  if (d.tags !== undefined) updates.tags = d.tags;

  const [updated] = await db
    .update(marketsTable)
    .set(updates)
    .where(eq(marketsTable.id, market.id))
    .returning();

  res.json(serializeMarket(updated!));
});

// ─── POST /api/markets/:slug/claim ────────────────────────────────────────────

router.post("/markets/:slug/claim", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthRequest;
  const slug = req.params.slug as string;

  const [market] = await db
    .select()
    .from(marketsTable)
    .where(eq(marketsTable.slug, slug))
    .limit(1);

  if (!market) { res.status(404).json({ error: "Market not found" }); return; }
  if (market.managerId !== null) { res.status(409).json({ error: "Market already claimed" }); return; }

  const [updated] = await db
    .update(marketsTable)
    .set({ managerId: userId })
    .where(and(eq(marketsTable.id, market.id), isNull(marketsTable.managerId)))
    .returning();

  if (!updated) { res.status(409).json({ error: "Market already claimed" }); return; }

  logger.info({ slug, userId }, "[markets] market claimed");
  res.json(serializeMarket(updated));
});

export default router;
