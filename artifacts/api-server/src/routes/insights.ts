import { Router, type IRouter } from "express";
import { sql, count, sum, desc } from "drizzle-orm";
import { db, searchLogsTable } from "@workspace/db";
import { LogSearchBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/search-logs", async (req, res): Promise<void> => {
  const parsed = LogSearchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { query, context, resultsCount } = parsed.data;
  const trimmed = query.trim().toLowerCase();

  if (trimmed.length < 2) {
    res.status(204).end();
    return;
  }

  await db.insert(searchLogsTable).values({
    query: trimmed,
    context,
    resultsCount: resultsCount ?? null,
  });

  res.status(204).end();
});

router.get("/search-insights", async (_req, res): Promise<void> => {
  // Fetch all raw rows — efficient since search_logs stays small in early stage
  const allRows = await db
    .select({
      query: searchLogsTable.query,
      context: searchLogsTable.context,
      resultsCount: searchLogsTable.resultsCount,
      createdAt: searchLogsTable.createdAt,
    })
    .from(searchLogsTable)
    .orderBy(desc(searchLogsTable.createdAt));

  const totalSearches = allRows.length;

  // Aggregate by query in JS
  const queryMap = new Map<
    string,
    { count: number; zeroResultCount: number; contexts: Set<string> }
  >();
  const contextCountMap = new Map<string, number>();

  for (const row of allRows) {
    const q = row.query;
    const c = row.context;
    const isZero = row.resultsCount === 0;

    if (!queryMap.has(q)) {
      queryMap.set(q, { count: 0, zeroResultCount: 0, contexts: new Set() });
    }
    const entry = queryMap.get(q)!;
    entry.count++;
    if (isZero) entry.zeroResultCount++;
    entry.contexts.add(c);

    contextCountMap.set(c, (contextCountMap.get(c) ?? 0) + 1);
  }

  const uniqueTerms = queryMap.size;
  const zeroResultCount = allRows.filter((r) => r.resultsCount === 0).length;

  const topQueries = [...queryMap.entries()]
    .map(([query, v]) => ({
      query,
      count: v.count,
      zeroResultCount: v.zeroResultCount,
      contexts: [...v.contexts],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  const topOpportunities = [...queryMap.entries()]
    .map(([query, v]) => ({
      query,
      count: v.count,
      zeroResultCount: v.zeroResultCount,
      contexts: [...v.contexts],
    }))
    .filter((q) => q.zeroResultCount > 0)
    .sort((a, b) => b.zeroResultCount - a.zeroResultCount)
    .slice(0, 25);

  const byContext = [...contextCountMap.entries()]
    .map(([context, cnt]) => ({ context, count: cnt }))
    .sort((a, b) => b.count - a.count);

  const recentQueries = allRows.slice(0, 30).map((r) => ({
    query: r.query,
    context: r.context,
    resultsCount: r.resultsCount,
    createdAt: r.createdAt.toISOString(),
  }));

  res.json({
    totalSearches,
    uniqueTerms,
    zeroResultCount,
    topQueries,
    topOpportunities,
    byContext,
    recentQueries,
  });
});

export default router;
