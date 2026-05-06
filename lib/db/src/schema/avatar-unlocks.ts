import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const avatarUnlocksTable = pgTable(
  "avatar_unlocks",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    unlockKey: text("unlock_key").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userKeyUnique: uniqueIndex("avatar_unlocks_user_key_uq").on(
      t.userId,
      t.unlockKey,
    ),
  }),
);

export type AvatarUnlock = typeof avatarUnlocksTable.$inferSelect;
export type InsertAvatarUnlock = typeof avatarUnlocksTable.$inferInsert;
