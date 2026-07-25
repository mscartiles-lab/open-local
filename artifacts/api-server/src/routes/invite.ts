import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { db, waitlistTable } from "@workspace/db";
import { requireAdmin } from "../lib/requireAdmin";
import { sendInvitationEmail } from "../lib/email";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const requestBody = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  name: z.string().trim().max(120).optional(),
});

function signupUrl(req: Request): string {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  const base = domain
    ? `https://${domain}`
    : `${req.protocol}://${req.get("host")}`;
  return `${base}/submit`;
}

// ─── Public: submit email for an invitation ──────────────────────────────────

router.post("/invite/request", async (req: Request, res: Response): Promise<void> => {
  const parsed = requestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid request" });
    return;
  }

  const { email, name } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  // Check for existing entry
  const [existing] = await db
    .select()
    .from(waitlistTable)
    .where(eq(waitlistTable.email, normalizedEmail));

  if (existing) {
    // Already on the list — resend the invite if they were previously invited
    if (existing.status === "invited") {
      void sendInvitationEmail({
        to: normalizedEmail,
        name: existing.name,
        signupUrl: signupUrl(req),
      });
      res.json({ status: "already_invited", message: "We've resent your invitation — check your inbox!" });
    } else {
      res.json({ status: "already_registered", message: "You're already on the list! We'll be in touch soon." });
    }
    return;
  }

  // Insert new entry
  const [row] = await db
    .insert(waitlistTable)
    .values({ email: normalizedEmail, name: name ?? null, status: "pending" })
    .returning();

  logger.info({ email: normalizedEmail, id: row!.id }, "[invite] new waitlist entry");

  // Send invitation immediately
  const result = await sendInvitationEmail({
    to: normalizedEmail,
    name: name ?? null,
    signupUrl: signupUrl(req),
  });

  // Mark as invited
  await db
    .update(waitlistTable)
    .set({ status: "invited", invitedAt: new Date() })
    .where(eq(waitlistTable.id, row!.id));

  res.status(201).json({
    status: "invited",
    emailSent: result.sent,
    message: result.sent
      ? "Check your inbox — your invitation is on its way!"
      : "You're on the list! We'll send your invitation shortly.",
  });
});

// ─── Admin: list all waitlist entries ────────────────────────────────────────

router.get("/admin/invite/entries", requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  const rows = await db
    .select()
    .from(waitlistTable)
    .orderBy(desc(waitlistTable.createdAt));
  res.json(rows);
});

// ─── Admin: resend invitation to a specific entry ─────────────────────────────

router.post("/admin/invite/:id/resend", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [row] = await db
    .select()
    .from(waitlistTable)
    .where(eq(waitlistTable.id, id));

  if (!row) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  if (row.unsubscribed) {
    res.status(400).json({ error: "This person has unsubscribed" });
    return;
  }

  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  const base = domain ? `https://${domain}` : "https://open.local";
  const url = `${base}/submit`;

  const result = await sendInvitationEmail({
    to: row.email,
    name: row.name,
    signupUrl: url,
  });

  await db
    .update(waitlistTable)
    .set({ status: "invited", invitedAt: new Date() })
    .where(eq(waitlistTable.id, id));

  res.json({ sent: result.sent });
});

// ─── Admin: delete an entry ───────────────────────────────────────────────────

router.delete("/admin/invite/:id", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(waitlistTable).where(eq(waitlistTable.id, id));
  res.json({ ok: true });
});

export default router;
