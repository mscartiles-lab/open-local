import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  doublePrecision,
  jsonb,
} from "drizzle-orm/pg-core";

export const vendorsTable = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  location: text("location").notNull(),
  zipCode: text("zip_code"),
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
  pickupAddress: text("pickup_address"),
  openDays: jsonb("open_days").$type<string[]>().default([]),
  openHours: text("open_hours"),
  howToOrder: text("how_to_order"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  additionalLocations: jsonb("additional_locations")
    .$type<Array<{ lat: number; lng: number; label?: string | null }>>()
    .default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  onboardingEmailsSent: jsonb("onboarding_emails_sent")
    .$type<string[]>()
    .notNull()
    .default([]),
  flaggedForFollowup: boolean("flagged_for_followup").notNull().default(false),
  stripeConnectId: text("stripe_connect_id"),
  stripeConnectStatus: text("stripe_connect_status")
    .$type<"pending" | "active" | "restricted">()
    .default("pending"),
  // Tier 3 storefront customization
  storeTheme: text("store_theme").$type<"rustic" | "modern" | "bold" | "minimal">(),
  storePrimaryColor: text("store_primary_color"),
  storeFont: text("store_font").$type<"serif" | "sans" | "handwritten">(),
  storeLayout: text("store_layout").$type<"grid" | "list" | "hero">(),
  storeBannerUrl: text("store_banner_url"),
  storeCustomizationEnabled: boolean("store_customization_enabled").notNull().default(true),
});

export type Vendor = typeof vendorsTable.$inferSelect;
export type InsertVendor = typeof vendorsTable.$inferInsert;
