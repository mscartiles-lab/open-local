import { randomInt } from "node:crypto";
import { and, eq, sql, lte, ne } from "drizzle-orm";
import {
  db,
  supportTicketsTable,
  usersTable,
  type SupportTicket,
  type User,
} from "@workspace/db";
import { emitEvent, type WebhookEvent } from "./webhooks";
import { logger } from "./logger";

// Stable identifiers recorded in `support_tickets.webhooks_sent`. Webhook
// event names are derived from these so callers can't get them out of sync.
export const SUPPORT_TICKET_EVENT_TYPES = [
  "submitted",
  "unresolved_48h",
  "resolved",
] as const;

export type SupportTicketEventType = (typeof SUPPORT_TICKET_EVENT_TYPES)[number];

const EVENT_BY_TYPE: Record<SupportTicketEventType, WebhookEvent> = {
  submitted: "support.ticket.submitted",
  unresolved_48h: "support.ticket.unresolved_48h",
  resolved: "support.ticket.resolved",
};

const HOUR_MS = 60 * 60 * 1000;
const STALE_AFTER_MS = 48 * HOUR_MS;

// Crockford-base32 alphabet minus the easily-confused glyphs (I, L, O, U).
// Six characters → 30^6 ≈ 729M references before pigeonhole pressure, and we
// retry on the unique-index violation anyway, so collisions are negligible.
const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const REF_LENGTH = 6;

export function generateTicketReference(): string {
  let out = "";
  for (let i = 0; i < REF_LENGTH; i++) {
    out += REF_ALPHABET[randomInt(0, REF_ALPHABET.length)];
  }
  return `SUP-${out}`;
}

interface PayloadArgs {
  ticket: SupportTicket;
  user: Pick<User, "email" | "username" | "role">;
  eventType: SupportTicketEventType;
  now?: Date;
  feedbackUrl?: string;
}

export function buildSupportTicketPayload(args: PayloadArgs): Record<string, unknown> {
  const { ticket, user, eventType, now = new Date(), feedbackUrl } = args;
  const hoursOpen = Math.max(
    0,
    Math.round((now.getTime() - ticket.createdAt.getTime()) / HOUR_MS),
  );
  const base: Record<string, unknown> = {
    ticket_id: ticket.id,
    reference: ticket.reference,
    status: ticket.status,
    user_id: ticket.userId,
    email: user.email,
    username: user.username,
    role: user.role,
    subject: ticket.subject,
    body: ticket.body,
    created_at: ticket.createdAt.toISOString(),
    resolved_at: ticket.resolvedAt?.toISOString() ?? null,
    hours_open: hoursOpen,
    event_type: eventType,
  };
  if (eventType === "submitted") {
    base.response_time_hours = 24;
  }
  if (eventType === "resolved" && feedbackUrl) {
    base.feedback_url = feedbackUrl;
  }
  return base;
}

async function loadOwner(userId: number): Promise<User | undefined> {
  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  return u;
}

// Creates the ticket AND records the `submitted` dedupe marker in the same
// INSERT. The DB unique index on `reference` makes the reference uniqueness
// guarantee real; we retry on the rare collision. Emit happens after a
// successful insert so the webhook can never fire without a persisted row.
export interface CreateTicketArgs {
  userId: number;
  subject: string;
  body: string;
}

export async function createSupportTicket(args: CreateTicketArgs): Promise<SupportTicket> {
  const { userId, subject, body } = args;
  let ticket: SupportTicket | undefined;
  for (let attempt = 0; attempt < 5 && !ticket; attempt++) {
    const reference = generateTicketReference();
    try {
      const [row] = await db
        .insert(supportTicketsTable)
        .values({
          reference,
          userId,
          subject,
          body,
          status: "open",
          webhooksSent: ["submitted"],
        })
        .returning();
      ticket = row;
    } catch (err) {
      const msg = (err as Error).message ?? "";
      if (msg.includes("support_tickets_reference_unique") || msg.toLowerCase().includes("duplicate")) {
        logger.warn({ attempt, reference }, "support ticket reference collision; retrying");
        continue;
      }
      throw err;
    }
  }
  if (!ticket) {
    throw new Error("Could not allocate a unique support ticket reference");
  }

  const user = await loadOwner(userId);
  if (!user) {
    logger.error({ ticketId: ticket.id }, "support ticket created but owner missing");
    return ticket;
  }
  // Automation is vendor-only. Shoppers can still file tickets (admins see
  // them in the dashboard), but n8n's email workflows are scoped to vendor
  // support today, so non-vendor roles don't trigger the webhook lifecycle.
  if (user.role !== "vendor") {
    return ticket;
  }
  emitEvent(
    EVENT_BY_TYPE.submitted,
    buildSupportTicketPayload({ ticket, user, eventType: "submitted" }),
  );
  return ticket;
}

// Atomic state-transition + dedupe-marker + webhook emit. Mirrors the
// onboarding and trial-reminder sweeps: every state change is a *single*
// UPDATE guarded by `NOT (webhooks_sent ? type)`, so concurrent callers
// can't double-fire the same event for the same ticket. The UPDATE's
// RETURNING is the source of truth — only the caller whose UPDATE wrote
// rows emits the webhook.
async function recordAndEmit(
  ticketId: number,
  eventType: SupportTicketEventType,
  feedbackUrl?: string,
): Promise<boolean> {
  const sentJson = sql`COALESCE(${supportTicketsTable.webhooksSent}, '[]'::jsonb)`;
  const setClause: Record<string, unknown> = {
    webhooksSent: sql`${sentJson} || ${JSON.stringify([eventType])}::jsonb`,
  };
  // Status + side-effect columns flip in the SAME atomic UPDATE as the
  // dedupe marker, so the lifecycle transition and the emit decision can
  // never disagree.
  if (eventType === "unresolved_48h") {
    setClause.flaggedStale = true;
  }
  if (eventType === "resolved") {
    setClause.status = "resolved";
    setClause.resolvedAt = sql`NOW()`;
  }

  const whereParts = [
    eq(supportTicketsTable.id, ticketId),
    sql`NOT (${sentJson} ? ${eventType})`,
  ];
  if (eventType === "unresolved_48h") {
    // Re-check inside the UPDATE so a ticket that got resolved between the
    // candidate scan and this statement can't be flagged stale.
    whereParts.push(ne(supportTicketsTable.status, "resolved"));
    whereParts.push(
      lte(supportTicketsTable.createdAt, sql`NOW() - INTERVAL '48 hours'`),
    );
  }

  const updated = await db
    .update(supportTicketsTable)
    .set(setClause)
    .where(and(...whereParts))
    .returning();

  if (updated.length === 0) return false;
  const ticket = updated[0]!;
  const user = await loadOwner(ticket.userId);
  if (!user) {
    logger.error({ ticketId }, "support ticket emit: owner missing");
    return true;
  }
  emitEvent(
    EVENT_BY_TYPE[eventType],
    buildSupportTicketPayload({ ticket, user, eventType, feedbackUrl }),
  );
  return true;
}

// Resolution is a one-way transition driven by the same atomic mark-and-emit
// UPDATE used by the onboarding/trial sweeps. Once the `resolved` marker is
// recorded, subsequent calls return false (status already resolved, webhook
// already fired) — exactly-once per ticket.
export async function markSupportTicketResolved(
  ticketId: number,
  feedbackUrl?: string,
): Promise<boolean> {
  return recordAndEmit(ticketId, "resolved", feedbackUrl);
}

export interface SupportSweepResult {
  scanned: number;
  flagged: number;
}

// Daily 48-hour stale sweep. Picks all tickets that are still open ≥48h and
// haven't had their `unresolved_48h` marker flipped yet, then runs the
// atomic recordAndEmit on each. Re-runs in the same day produce zero
// additional webhooks because the marker survives.
export async function runSupportTicketSweep(): Promise<SupportSweepResult> {
  const candidates = await db
    .select({
      id: supportTicketsTable.id,
      webhooksSent: supportTicketsTable.webhooksSent,
    })
    .from(supportTicketsTable)
    .where(
      and(
        ne(supportTicketsTable.status, "resolved"),
        lte(
          supportTicketsTable.createdAt,
          sql`NOW() - INTERVAL '${sql.raw(`${STALE_AFTER_MS / 1000} seconds`)}'`,
        ),
      ),
    );

  let flagged = 0;
  for (const c of candidates) {
    const sent = new Set<string>(c.webhooksSent ?? []);
    if (sent.has("unresolved_48h")) continue;
    const ok = await recordAndEmit(c.id, "unresolved_48h");
    if (ok) flagged++;
  }

  const result: SupportSweepResult = { scanned: candidates.length, flagged };
  logger.info(result, "support ticket sweep complete");
  return result;
}
