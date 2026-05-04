import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  doublePrecision,
  jsonb,
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
  facebookUrl: text("facebook_url"),
  tiktokUrl: text("tiktok_url"),
  imageUrl: text("image_url"),
  photoUrls: jsonb("photo_urls").$type<string[]>(),
  videoUrl: text("video_url"),
  contactEmail: text("contact_email").notNull(),
  status: text("status").notNull().default("pending"),
  tier: text("tier").notNull().default("middle"),
  isTrial: boolean("is_trial").notNull().default(true),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Establishment = typeof establishmentsTable.$inferSelect;
export type InsertEstablishment = typeof establishmentsTable.$inferInsert;
