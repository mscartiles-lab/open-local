import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const searchLogsTable = pgTable("search_logs", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  context: text("context").notNull(), // "products" | "vendors" | "listings" | "events" | "surplus"
  resultsCount: integer("results_count"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SearchLog = typeof searchLogsTable.$inferSelect;
export type InsertSearchLog = typeof searchLogsTable.$inferInsert;
