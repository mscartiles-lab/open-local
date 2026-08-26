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
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// Allow null on optional fields so managers can clear them via PATCH
const UpdateMarketBodySchema = z.object({
  name: z.string().min(2).optional(),
  city: z.string().min(1).optional(),
  region: z.string().optional(),
  address: z.string().nullable().optional(),
  day: z.string().nullable().optional(),
  time: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  contactEmail: z.string().email().optional(),
  websiteUrl: z.string().url().nullable().optional().or(z.literal("").transform((): null => null)),
  instagramHandle: z.string().nullable().optional(),
  facebookUrl: z.string().url().nullable().optional().or(z.literal("").transform((): null => null)),
  twitterHandle: z.string().nullable().optional(),
  logoUrl: z.string().url().nullable().optional().or(z.literal("").transform((): null => null)),
  featuredImageUrl: z.string().url().nullable().optional().or(z.literal("").transform((): null => null)),
  tags: z.array(z.string()).optional(),
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
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
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

// ─── GET /api/markets/mine ────────────────────────────────────────────────────
// Registered BEFORE /markets/:slug so Express does not interpret "mine" as a slug.

router.get("/markets/mine", requireAuth, async (req, res): Promise<void> => {
  const { userId } = req as AuthRequest;

  const [market] = await db
    .select()
    .from(marketsTable)
    .where(eq(marketsTable.managerId, userId))
    .limit(1);

  if (!market) {
    res.status(404).json({ error: "No managed market found" });
    return;
  }

  res.json(serializeMarket(market));
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

  // Build the update patch. We use `"key" in d` for nullable fields so that an
  // explicitly sent null (i.e. the manager cleared the field) is preserved.
  const updates: Record<string, unknown> = {};
  if (d.name !== undefined) updates.name = d.name;
  if (d.city !== undefined) updates.city = d.city;
  if (d.region !== undefined) updates.region = d.region;
  if ("address" in d) updates.address = d.address ?? null;
  if ("day" in d) updates.day = d.day ?? null;
  if ("time" in d) updates.time = d.time ?? null;
  if ("description" in d) updates.description = d.description ?? null;
  if (d.contactEmail !== undefined) updates.contactEmail = d.contactEmail;
  if ("websiteUrl" in d) updates.websiteUrl = d.websiteUrl ?? null;
  if ("instagramHandle" in d) updates.instagramHandle = d.instagramHandle ?? null;
  if ("facebookUrl" in d) updates.facebookUrl = d.facebookUrl ?? null;
  if ("twitterHandle" in d) updates.twitterHandle = d.twitterHandle ?? null;
  if ("logoUrl" in d) updates.logoUrl = d.logoUrl ?? null;
  if ("featuredImageUrl" in d) updates.featuredImageUrl = d.featuredImageUrl ?? null;
  if (d.tags !== undefined) updates.tags = d.tags;

  const [updated] = await db
    .update(marketsTable)
    .set(updates as Partial<typeof marketsTable.$inferInsert>)
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
