import { Router, type IRouter } from "express";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  usersTable,
  establishmentsTable,
  ipLogsTable,
} from "@workspace/db";
import { requireAdmin } from "../lib/requireAdmin";

const router: IRouter = Router();

router.get("/admin/users", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      username: usersTable.username,
      role: usersTable.role,
      state: usersTable.state,
      zip: usersTable.zip,
      tier: usersTable.tier,
      stripeSubscriptionId: usersTable.stripeSubscriptionId,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));
  res.json(rows);
});

const updateUserBody = z.object({
  role: z.enum(["admin", "vendor", "shopper"]).optional(),
});

router.patch("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = updateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(usersTable)
    .set(parsed.data)
    .where(eq(usersTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(row);
});

router.delete("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .delete(usersTable)
    .where(eq(usersTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ ok: true });
});

router.get("/admin/establishments", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(establishmentsTable)
    .orderBy(desc(establishmentsTable.createdAt));
  res.json(rows);
});

router.delete("/admin/establishments/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .delete(establishmentsTable)
    .where(eq(establishmentsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Establishment not found" });
    return;
  }
  res.json({ ok: true });
});

// ─── IP Logs ──────────────────────────────────────────────────────────────────

router.get("/admin/ip-logs", requireAdmin, async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit ?? 200), 500);
  const ip = typeof req.query.ip === "string" ? req.query.ip.trim() : undefined;
  const eventType = typeof req.query.eventType === "string" ? req.query.eventType.trim() : undefined;
  const since = typeof req.query.since === "string" ? new Date(req.query.since) : undefined;

  const conditions = [];
  if (ip) conditions.push(sql`${ipLogsTable.ip} = ${ip}`);
  if (eventType) conditions.push(eq(ipLogsTable.eventType, eventType));
  if (since && !isNaN(since.getTime())) conditions.push(gte(ipLogsTable.createdAt, since));

  const rows = await db
    .select()
    .from(ipLogsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(ipLogsTable.createdAt))
    .limit(limit);

  res.json(rows);
});

router.get("/admin/ip-logs/summary", requireAdmin, async (_req, res): Promise<void> => {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      ip: ipLogsTable.ip,
      count: sql<number>`count(*)::int`,
      lastSeen: sql<string>`max(${ipLogsTable.createdAt})`,
      authEvents: sql<number>`sum(case when ${ipLogsTable.eventType} like 'login%' or ${ipLogsTable.eventType} like 'signup%' then 1 else 0 end)::int`,
    })
    .from(ipLogsTable)
    .where(gte(ipLogsTable.createdAt, since24h))
    .groupBy(ipLogsTable.ip)
    .orderBy(sql`count(*) desc`)
    .limit(100);

  res.json(rows);
});

export default router;
