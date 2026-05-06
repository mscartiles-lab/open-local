import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { vendorsTable } from "./vendors";

// Visit credit requests. Shopper requests credit for visiting a vendor;
// the vendor approves or rejects from their dashboard.
//   status: 'pending' | 'approved' | 'rejected'
export const vendorVisitsTable = pgTable("vendor_visits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  vendorId: integer("vendor_id")
    .notNull()
    .references(() => vendorsTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  requestedAt: timestamp("requested_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
});

export type VendorVisit = typeof vendorVisitsTable.$inferSelect;
export type InsertVendorVisit = typeof vendorVisitsTable.$inferInsert;
