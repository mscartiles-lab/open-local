import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  doublePrecision,
} from "drizzle-orm/pg-core";

export const vendorsTable = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  location: text("location").notNull(),
  region: text("region").notNull(),
  contactEmail: text("contact_email").notNull(),
  websiteUrl: text("website_url"),
  imageUrl: text("image_url").notNull(),
  established: integer("established").notNull(),
  featured: boolean("featured").notNull().default(false),
  phone: text("phone"),
  instagramHandle: text("instagram_handle"),
  facebookUrl: text("facebook_url"),
  marketsText: text("markets_text"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Vendor = typeof vendorsTable.$inferSelect;
export type InsertVendor = typeof vendorsTable.$inferInsert;
