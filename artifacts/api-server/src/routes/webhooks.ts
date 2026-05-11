import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  webhookSubscriptionsTable,
  webhookDeliveriesTable,
} from "@workspace/db";
import { requireAdmin } from "../lib/requireAdmin";
import {
  WEBHOOK_EVENTS,
  newWebhookSecret,
  isWebhookUrlAllowed,
  type WebhookEvent,
} from "../lib/webhooks";

// Strip the signing secret from list/read responses so it's only ever shown
// once (at create or rotate time).
function publicSubscription<T extends { secret: string }>(s: T): Omit<T, "secret"> {
  const { secret: _omit, ...rest } = s;
  return rest;
}

const router: IRouter = Router();

const eventEnum = z.enum(WEBHOOK_EVENTS as unknown as [string, ...string[]]);

const CreateBody = z.object({
  label: z.string().min(1).max(120),
  url: z.string().url(),
  events: z.array(eventEnum).min(1),
  active: z.boolean().optional(),
});

const UpdateBody = z.object({
  label: z.string().min(1).max(120).optional(),
  url: z.string().url().optional(),
  events: z.array(eventEnum).min(1).optional(),
  active: z.boolean().optional(),
});

router.get("/admin/webhooks/events", requireAdmin, async (_req, res): Promise<void> => {
  res.json({ events: WEBHOOK_EVENTS });
});

router.get("/admin/webhooks", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(webhookSubscriptionsTable)
    .orderBy(desc(webhookSubscriptionsTable.createdAt));
  res.json({ subscriptions: rows.map(publicSubscription) });
});

router.post("/admin/webhooks", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const urlCheck = isWebhookUrlAllowed(parsed.data.url);
  if (!urlCheck.ok) {
    res.status(400).json({ error: urlCheck.reason });
    return;
  }
  const [row] = await db
    .insert(webhookSubscriptionsTable)
    .values({
      label: parsed.data.label,
      url: parsed.data.url,
      events: parsed.data.events as WebhookEvent[],
      secret: newWebhookSecret(),
      active: parsed.data.active ?? true,
    })
    .returning();
  // Secret is returned exactly once, at creation time.
  res.status(201).json(row);
});

router.patch("/admin/webhooks/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.url) {
    const urlCheck = isWebhookUrlAllowed(parsed.data.url);
    if (!urlCheck.ok) {
      res.status(400).json({ error: urlCheck.reason });
      return;
    }
  }
  const [row] = await db
    .update(webhookSubscriptionsTable)
    .set(parsed.data as Partial<typeof webhookSubscriptionsTable.$inferInsert>)
    .where(eq(webhookSubscriptionsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(publicSubscription(row));
});

router.post("/admin/webhooks/:id/rotate-secret", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .update(webhookSubscriptionsTable)
    .set({ secret: newWebhookSecret() })
    .where(eq(webhookSubscriptionsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

router.delete("/admin/webhooks/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db
    .delete(webhookSubscriptionsTable)
    .where(eq(webhookSubscriptionsTable.id, id));
  res.json({ ok: true });
});

router.get("/admin/webhooks/:id/deliveries", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const rows = await db
    .select()
    .from(webhookDeliveriesTable)
    .where(eq(webhookDeliveriesTable.subscriptionId, id))
    .orderBy(desc(webhookDeliveriesTable.createdAt))
    .limit(50);
  res.json({ deliveries: rows });
});

export default router;
