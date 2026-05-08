import { Router, type IRouter } from "express";
import { and, eq, gte, sql, desc, count, ilike } from "drizzle-orm";
import {
  db,
  vendorsTable,
  vendorVisitsTable,
  productsTable,
  searchLogsTable,
  establishmentsTable,
  usersTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/requireAuth";
import { isAdminEmail } from "../lib/requireAdmin";

const router: IRouter = Router();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "for", "in", "on", "at", "to",
  "with", "by", "from", "near", "me", "my", "your", "shop", "local",
]);

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w)),
  );
}

function queryMatchesTokens(query: string, ownTokens: Set<string>): boolean {
  const q = tokenize(query);
  for (const w of q) if (ownTokens.has(w)) return true;
  return false;
}

interface DailyPoint {
  day: string;
  count: number;
}

// Build a 30-day continuous series from a sparse list of (day, count).
function fillDailySeries(rows: DailyPoint[]): DailyPoint[] {
  const map = new Map(rows.map((r) => [r.day, r.count]));
  const out: DailyPoint[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, count: map.get(key) ?? 0 });
  }
  return out;
}

async function getViewerEmail(userId: number): Promise<string | null> {
  const [u] = await db
    .select({ email: usersTable.email, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return u?.email ?? null;
}

async function isAdminUser(userId: number): Promise<boolean> {
  const [u] = await db
    .select({ email: usersTable.email, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!u) return false;
  return u.role === "admin" || isAdminEmail(u.email);
}

router.get("/analytics/vendor/:vendorId", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthRequest).userId;
  const vendorId = Number(req.params.vendorId);
  if (!Number.isFinite(vendorId)) {
    res.status(400).json({ error: "Invalid vendorId" });
    return;
  }

  const [vendor] = await db
    .select()
    .from(vendorsTable)
    .where(eq(vendorsTable.id, vendorId));
  if (!vendor) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }

  const viewerEmail = await getViewerEmail(userId);
  const admin = await isAdminUser(userId);
  const owns =
    viewerEmail !== null &&
    viewerEmail.toLowerCase() === vendor.contactEmail.toLowerCase();
  if (!owns && !admin) {
    res.status(403).json({ error: "You don't manage this shop." });
    return;
  }

  const since = new Date(Date.now() - THIRTY_DAYS_MS);

  // Visit status totals (lifetime).
  const visitGroups = await db
    .select({
      status: vendorVisitsTable.status,
      total: count(),
    })
    .from(vendorVisitsTable)
    .where(eq(vendorVisitsTable.vendorId, vendorId))
    .groupBy(vendorVisitsTable.status);

  const visitsByStatus: Record<string, number> = {
    pending: 0,
    approved: 0,
    rejected: 0,
  };
  for (const r of visitGroups) visitsByStatus[r.status] = r.total;

  // Approved visits in the last 30 days, bucketed by day.
  const dailyRows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${vendorVisitsTable.requestedAt}), 'YYYY-MM-DD')`,
      total: count(),
    })
    .from(vendorVisitsTable)
    .where(
      and(
        eq(vendorVisitsTable.vendorId, vendorId),
        eq(vendorVisitsTable.status, "approved"),
        gte(vendorVisitsTable.requestedAt, since),
      ),
    )
    .groupBy(sql`date_trunc('day', ${vendorVisitsTable.requestedAt})`);

  const daily = fillDailySeries(
    dailyRows.map((r) => ({ day: r.day, count: r.total })),
  );
  const visitsLast30 = daily.reduce((s, d) => s + d.count, 0);

  // Product breakdown.
  const productRows = await db
    .select({
      listingType: productsTable.listingType,
      inStock: productsTable.inStock,
      featured: productsTable.featured,
    })
    .from(productsTable)
    .where(eq(productsTable.vendorId, vendorId));

  const productStats = {
    total: productRows.length,
    inStock: productRows.filter((p) => p.inStock).length,
    featured: productRows.filter((p) => p.featured).length,
    batchDrops: productRows.filter((p) => p.listingType === "batch_drop").length,
    surplus: productRows.filter((p) => p.listingType === "surplus").length,
    preOrders: productRows.filter((p) => p.listingType === "pre_order").length,
  };

  // Search appearances: searches whose query is a substring of the vendor's
  // name, tagline, category, or location (last 30 days).
  const ownTokens = tokenize(
    [vendor.name, vendor.category, vendor.location, vendor.tagline ?? ""].join(" "),
  );

  const recentSearches = await db
    .select({
      query: searchLogsTable.query,
      total: count(),
    })
    .from(searchLogsTable)
    .where(gte(searchLogsTable.createdAt, since))
    .groupBy(searchLogsTable.query)
    .orderBy(desc(count()))
    .limit(50);

  const matchedSearches = recentSearches.filter((row) =>
    queryMatchesTokens(row.query, ownTokens),
  );
  const searchAppearances30 = matchedSearches.reduce((s, r) => s + r.total, 0);

  // Top 5 most-popular searches across the whole marketplace (last 30d).
  const topMarketplaceQueries = recentSearches.slice(0, 5).map((r) => ({
    query: r.query,
    count: r.total,
  }));

  res.json({
    vendor: { id: vendor.id, name: vendor.name, slug: vendor.slug },
    visits: {
      pending: visitsByStatus.pending ?? 0,
      approved: visitsByStatus.approved ?? 0,
      rejected: visitsByStatus.rejected ?? 0,
      last30: visitsLast30,
      daily,
    },
    products: productStats,
    search: {
      appearancesLast30: searchAppearances30,
      topMarketplaceQueries,
    },
  });
});

router.get("/analytics/establishment/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthRequest).userId;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [est] = await db
    .select()
    .from(establishmentsTable)
    .where(eq(establishmentsTable.id, id));
  if (!est) {
    res.status(404).json({ error: "Establishment not found" });
    return;
  }

  const viewerEmail = await getViewerEmail(userId);
  const admin = await isAdminUser(userId);
  const owns =
    viewerEmail !== null &&
    viewerEmail.toLowerCase() === est.contactEmail.toLowerCase();
  if (!owns && !admin) {
    res.status(403).json({ error: "You don't manage this business." });
    return;
  }

  const since = new Date(Date.now() - THIRTY_DAYS_MS);

  // Searches that mention the business name or city.
  const recentSearches = await db
    .select({
      query: searchLogsTable.query,
      total: count(),
    })
    .from(searchLogsTable)
    .where(gte(searchLogsTable.createdAt, since))
    .groupBy(searchLogsTable.query)
    .orderBy(desc(count()))
    .limit(50);

  const ownTokens = tokenize([est.name, est.city, est.type].join(" "));
  const matched = recentSearches.filter((row) => queryMatchesTokens(row.query, ownTokens));

  // Compare against peers in the same city to give a sense of standing.
  const [peerRow] = await db
    .select({ total: count() })
    .from(establishmentsTable)
    .where(
      and(
        eq(establishmentsTable.city, est.city),
        eq(establishmentsTable.status, "active"),
      ),
    );

  // Daily search appearances across the last 30 days (using log createdAt
  // for queries that match this business).
  const matchedQueries = matched.map((m) => m.query);
  let daily: DailyPoint[];
  if (matchedQueries.length === 0) {
    daily = fillDailySeries([]);
  } else {
    const dailyRows = await db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${searchLogsTable.createdAt}), 'YYYY-MM-DD')`,
        total: count(),
      })
      .from(searchLogsTable)
      .where(
        and(
          gte(searchLogsTable.createdAt, since),
          sql`${searchLogsTable.query} = ANY(${matchedQueries})`,
        ),
      )
      .groupBy(sql`date_trunc('day', ${searchLogsTable.createdAt})`);
    daily = fillDailySeries(dailyRows.map((r) => ({ day: r.day, count: r.total })));
  }

  const appearancesLast30 = daily.reduce((s, d) => s + d.count, 0);

  // Top 5 marketplace queries overall.
  const topMarketplaceQueries = recentSearches.slice(0, 5).map((r) => ({
    query: r.query,
    count: r.total,
  }));

  // Recent vendor visits to vendors in the same city as a "neighborhood
  // activity" signal.
  const [neighborhoodRow] = await db
    .select({ total: count() })
    .from(vendorVisitsTable)
    .innerJoin(vendorsTable, eq(vendorsTable.id, vendorVisitsTable.vendorId))
    .where(
      and(
        eq(vendorVisitsTable.status, "approved"),
        ilike(vendorsTable.location, `%${est.city}%`),
        gte(vendorVisitsTable.requestedAt, since),
      ),
    );

  res.json({
    establishment: {
      id: est.id,
      name: est.name,
      type: est.type,
      city: est.city,
      state: est.state,
      status: est.status,
      tier: est.tier,
    },
    search: {
      appearancesLast30,
      daily,
      topMarketplaceQueries,
    },
    neighborhood: {
      peersInCity: peerRow?.total ?? 0,
      visitsToVendorsInCityLast30: neighborhoodRow?.total ?? 0,
    },
  });
});

export default router;
