import {
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const listingsTable = pgTable("listings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // "wanted" | "offering"
  category: text("category").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull().default("FL"),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  status: text("status").notNull().default("active"), // "active" | "expired" | "removed"
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Listing = typeof listingsTable.$inferSelect;
export type InsertListing = typeof listingsTable.$inferInsert;
