import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  integer,
  numeric,
} from "drizzle-orm/pg-core";

export const wholesaleListingsTable = pgTable("wholesale_listings", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  pricePerUnit: numeric("price_per_unit", { precision: 10, scale: 2 }),
  unit: text("unit"),               // e.g. "lb", "case", "flat", "dozen"
  minOrderQty: integer("min_order_qty").notNull().default(1),
  availableQty: integer("available_qty"),
  imageUrl: text("image_url"),
  expiresAt: timestamp("expires_at"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
