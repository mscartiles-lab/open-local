import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const ipLogsTable = pgTable("ip_logs", {
  id: serial("id").primaryKey(),
  ip: text("ip").notNull(),
  method: text("method").notNull(),
  path: text("path").notNull(),
  eventType: text("event_type").notNull(), // 'visit' | 'login_attempt' | 'login_success' | 'login_failure' | 'signup_attempt' | 'signup_success'
  userId: integer("user_id"),
  userAgent: text("user_agent"),
  statusCode: integer("status_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type IpLog = typeof ipLogsTable.$inferSelect;
export type InsertIpLog = typeof ipLogsTable.$inferInsert;
