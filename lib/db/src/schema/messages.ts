import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { vendorsTable } from "./vendors";

export const conversationsTable = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    shopperUserId: integer("shopper_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    vendorId: integer("vendor_id")
      .notNull()
      .references(() => vendorsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("conv_shopper_vendor_idx").on(t.shopperUserId, t.vendorId)],
);

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversationsTable.id, { onDelete: "cascade" }),
  senderUserId: integer("sender_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  readAt: timestamp("read_at", { withTimezone: true }),
});

export type Conversation = typeof conversationsTable.$inferSelect;
export type InsertConversation = typeof conversationsTable.$inferInsert;
export type Message = typeof messagesTable.$inferSelect;
export type InsertMessage = typeof messagesTable.$inferInsert;
