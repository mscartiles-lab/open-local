import { Router, type IRouter, type Request } from "express";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, supportTicketsTable, usersTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/requireAuth";
import { requireAdmin } from "../lib/requireAdmin";
import {
  createSupportTicket,
  markSupportTicketResolved,
} from "../lib/supportTickets";

const router: IRouter = Router();

const createBody = z.object({
  subject: z.string().trim().min(3, "Subject is required").max(200),
  body: z.string().trim().min(10, "Please describe your issue").max(5000),
});

function feedbackUrlFor(req: Request, reference: string): string {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  const baseUrl = domain
    ? `https://${domain}`
    : `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}/support/${reference}/feedback`;
}

// Authed vendor (or shopper) submits a new ticket. Returns the ticket with
// its generated reference number so the client can show the user something
// like "We've got your request — your reference is SUP-XXXXXX".
router.post("/support/tickets", requireAuth, async (req, res): Promise<void> => {
  const parsed = createBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = (req as AuthRequest).userId;
  const ticket = await createSupportTicket({
    userId,
    subject: parsed.data.subject,
    body: parsed.data.body,
  });
  res.status(201).json(ticket);
});

// Public lookup by reference — used by the "your reference is …" follow-up
// link in the acknowledgement email. Only returns non-sensitive fields.
router.get("/support/tickets/:reference", async (req, res): Promise<void> => {
  const ref = String(req.params.reference ?? "").trim();
  if (!ref) {
    res.status(400).json({ error: "Missing reference" });
    return;
  }
  const [row] = await db
    .select({
      reference: supportTicketsTable.reference,
      subject: supportTicketsTable.subject,
      status: supportTicketsTable.status,
      createdAt: supportTicketsTable.createdAt,
      resolvedAt: supportTicketsTable.resolvedAt,
    })
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.reference, ref));
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

router.get("/admin/support/tickets", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: supportTicketsTable.id,
      reference: supportTicketsTable.reference,
      userId: supportTicketsTable.userId,
      email: usersTable.email,
      username: usersTable.username,
      role: usersTable.role,
      subject: supportTicketsTable.subject,
      body: supportTicketsTable.body,
      status: supportTicketsTable.status,
      flaggedStale: supportTicketsTable.flaggedStale,
      createdAt: supportTicketsTable.createdAt,
      resolvedAt: supportTicketsTable.resolvedAt,
    })
    .from(supportTicketsTable)
    .leftJoin(usersTable, eq(usersTable.id, supportTicketsTable.userId))
    .orderBy(desc(supportTicketsTable.createdAt));
  res.json(rows);
});

const patchBody = z.object({
  status: z.enum(["open", "in_progress", "resolved"]),
});

router.patch("/admin/support/tickets/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = patchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [current] = await db
    .select()
    .from(supportTicketsTable)
    .where(eq(supportTicketsTable.id, id));
  if (!current) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  if (parsed.data.status === "resolved") {
    // Atomic: flips status + records the `resolved` dedupe marker + emits
    // the webhook in a single UPDATE. Flipping back to open then resolved
    // again won't re-fire because the marker survives.
    const fired = await markSupportTicketResolved(
      id,
      feedbackUrlFor(req, current.reference),
    );
    const [row] = await db
      .select()
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.id, id));
    res.json({ ticket: row, webhookFired: fired });
    return;
  }

  const [row] = await db
    .update(supportTicketsTable)
    .set({ status: parsed.data.status })
    .where(eq(supportTicketsTable.id, id))
    .returning();
  res.json({ ticket: row, webhookFired: false });
});

export default router;
