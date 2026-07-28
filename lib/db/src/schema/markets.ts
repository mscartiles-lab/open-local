import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  doublePrecision,
} from "drizzle-orm/pg-core";

export const marketsTable = pgTable("markets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  region: text("region").notNull().default("FL"),
  address: text("address"),
  day: text("day"),           // e.g. "Saturday"
  time: text("time"),          // e.g. "8am – 1pm"
  description: text("description"),
  imageUrl: text("image_url"),
  websiteUrl: text("website_url"),
  contactEmail: text("contact_email"),
  instagramHandle: text("instagram_handle"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
