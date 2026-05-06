import {
  pgTable,
  serial,
  integer,
  doublePrecision,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { vendorsTable } from "./vendors";

export const vendorVisitsTable = pgTable(
  "vendor_visits",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    vendorId: integer("vendor_id")
      .notNull()
      .references(() => vendorsTable.id, { onDelete: "cascade" }),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    distanceMiles: doublePrecision("distance_miles").notNull(),
    visitDate: timestamp("visit_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userVendorDayUnique: uniqueIndex("vendor_visits_user_vendor_day_uq").on(
      t.userId,
      t.vendorId,
      t.visitDate,
    ),
  }),
);

export type VendorVisit = typeof vendorVisitsTable.$inferSelect;
export type InsertVendorVisit = typeof vendorVisitsTable.$inferInsert;
