import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendorsTable } from "./vendors";
import { usersTable } from "./users";

export const vendorCertificationsTable = pgTable("vendor_certifications", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id")
    .notNull()
    .references(() => vendorsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  documentUrl: text("document_url"),
  status: text("status").notNull().default("pending"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  decidedBy: integer("decided_by").references(() => usersTable.id),
  rejectionReason: text("rejection_reason"),
});

export const insertVendorCertificationSchema = createInsertSchema(vendorCertificationsTable).omit({
  id: true,
  status: true,
  requestedAt: true,
  decidedAt: true,
  decidedBy: true,
  rejectionReason: true,
});
export type InsertVendorCertification = z.infer<typeof insertVendorCertificationSchema>;
export type VendorCertification = typeof vendorCertificationsTable.$inferSelect;
