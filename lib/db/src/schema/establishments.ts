import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  doublePrecision,
} from "drizzle-orm/pg-core";

export const establishmentsTable = pgTable("establishments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull().default("FL"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  phone: text("phone"),
  website: text("website"),
  instagramHandle: text("instagram_handle"),
  contactEmail: text("contact_email").notNull(),
  status: text("status").notNull().default("pending"),
  isTrial: boolean("is_trial").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Establishment = typeof establishmentsTable.$inferSelect;
export type InsertEstablishment = typeof establishmentsTable.$inferInsert;
