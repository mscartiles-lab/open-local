import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

// Outbound webhook subscriptions registered by an admin. Each subscription
// receives signed POSTs whenever one of its `events` fires.
export const webhookSubscriptionsTable = pgTable("webhook_subscriptions", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  events: jsonb("events").$type<string[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type WebhookSubscription =
  typeof webhookSubscriptionsTable.$inferSelect;
export type InsertWebhookSubscription =
  typeof webhookSubscriptionsTable.$inferInsert;

// Audit trail of webhook delivery attempts. Useful when debugging "why
// didn't my Zap fire?".
export const webhookDeliveriesTable = pgTable("webhook_deliveries", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id")
    .notNull()
    .references(() => webhookSubscriptionsTable.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  payload: jsonb("payload").$type<unknown>().notNull(),
  statusCode: integer("status_code"),
  ok: boolean("ok").notNull().default(false),
  attempt: integer("attempt").notNull().default(1),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type WebhookDelivery = typeof webhookDeliveriesTable.$inferSelect;
