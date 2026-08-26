import {
  pgTable,
  serial,
  text,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Prospective user waitlist — collected from the /invite QR code landing page.
// status: 'pending' (submitted, not yet invited) | 'invited' (invitation email sent)
export const waitlistTable = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  status: text("status").notNull().default("pending"),
  invitedAt: timestamp("invited_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  source: text("source").default("qr_invite"),
  notes: text("notes"),
  unsubscribed: boolean("unsubscribed").notNull().default(false),
  // Tracks which reminder emails have been sent (e.g. ["day3","day7"]).
  // Uses the same atomic-update dedup pattern as vendors.onboardingEmailsSent.
  emailsSent: jsonb("emails_sent").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
});

export type Waitlist = typeof waitlistTable.$inferSelect;
export type InsertWaitlist = typeof waitlistTable.$inferInsert;
