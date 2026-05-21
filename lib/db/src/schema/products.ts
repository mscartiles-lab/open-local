import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { vendorsTable } from "./vendors";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id")
    .notNull()
    .references(() => vendorsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  priceCents: integer("price_cents").notNull(),
  unit: text("unit").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url").notNull(),
  inStock: boolean("in_stock").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
  listingType: text("listing_type").notNull().default("regular"),
  originalPriceCents: integer("original_price_cents"),
  availableUntil: timestamp("available_until", { withTimezone: true }),
  pickupNote: text("pickup_note"),
  featuredUntil: timestamp("featured_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Product = typeof productsTable.$inferSelect;
export type InsertProduct = typeof productsTable.$inferInsert;
