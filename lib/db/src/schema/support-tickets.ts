import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// Vendor support tickets. Replit owns the lifecycle (creation, unique
// reference generation, 48h staleness sweep, resolution); n8n delivers the
// actual emails via the support.ticket.* webhook events.
//
// `webhooksSent` is the per-event dedupe log — identical pattern to
// `vendors.onboardingEmailsSent` and `users.trialRemindersSent`. The atomic
// UPDATE that flips a marker is the same statement that emits the webhook,
// so concurrent sweeps can't double-fire.
//   status: 'open' | 'in_progress' | 'resolved'
//   webhooksSent values: 'submitted' | 'unresolved_48h' | 'resolved'
export const supportTicketsTable = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("open"),
  webhooksSent: jsonb("webhooks_sent").$type<string[]>().notNull().default([]),
  flaggedStale: boolean("flagged_stale").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export type SupportTicket = typeof supportTicketsTable.$inferSelect;
export type InsertSupportTicket = typeof supportTicketsTable.$inferInsert;
