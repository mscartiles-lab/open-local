import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  doublePrecision,
  integer,
} from "drizzle-orm/pg-core";

export const marketsTable = pgTable("markets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique(),                        // URL-friendly id, null for legacy rows
  city: text("city").notNull(),
  region: text("region").notNull().default("FL"),
  address: text("address"),
  day: text("day"),                                   // e.g. "Saturday"
  time: text("time"),                                 // e.g. "8am – 1pm"
  description: text("description"),
  imageUrl: text("image_url"),                        // legacy / cover photo kept for compat
  logoUrl: text("logo_url"),
  featuredImageUrl: text("featured_image_url"),
  websiteUrl: text("website_url"),
  contactEmail: text("contact_email"),
  instagramHandle: text("instagram_handle"),
  facebookUrl: text("facebook_url"),
  twitterHandle: text("twitter_handle"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  managerId: integer("manager_id"),                   // FK → users.id, nullable
  verified: boolean("verified").notNull().default(false),
  vendorCount: integer("vendor_count").notNull().default(0),
  tags: text("tags").array(),                         // e.g. ["organic","year-round"]
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
