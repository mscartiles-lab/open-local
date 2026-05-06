import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  usersTable,
  establishmentsTable,
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

export default router;
