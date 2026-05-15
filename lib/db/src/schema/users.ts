import {
  pgTable,
  serial,
  text,
  timestamp,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  avatarSeed: text("avatar_seed").notNull(),
  avatarStyle: text("avatar_style").notNull().default("thumbs"),
  role: text("role").notNull(),
  zip: text("zip"),
  state: text("state").notNull().default("FL"),
  tier: text("tier").notNull().default("middle"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  equippedUnlocks: jsonb("equipped_unlocks").$type<string[]>().notNull().default([]),
  // Trial-reminder lifecycle. trialStartedAt / trialEndsAt are written when a
  // Stripe Checkout session completes with a trial; the reminder sweep
  // anchors on trialEndsAt so 30-day and 60-day cohorts both work without
  // special-casing. trialRemindersSent is the per-user dedupe log (same
  // shape as vendors.onboardingEmailsSent). paused = true hides the vendor's
  // storefront after the trial expires with no live paid subscription.
  trialStartedAt: timestamp("trial_started_at", { withTimezone: true }),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  trialRemindersSent: jsonb("trial_reminders_sent").$type<string[]>().notNull().default([]),
  paused: boolean("paused").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
