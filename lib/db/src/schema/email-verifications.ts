import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const emailVerificationsTable = pgTable("email_verifications", {
  id: serial("id").primaryKey(),
  ownerUserId: integer("owner_user_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  email: text("email").notNull(),
  code: text("code").notNull(),
  vendorPayload: jsonb("vendor_payload").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  attempts: integer("attempts").notNull().default(0),
  consumed: boolean("consumed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type EmailVerification = typeof emailVerificationsTable.$inferSelect;
export type InsertEmailVerification =
  typeof emailVerificationsTable.$inferInsert;
