import { mysqlTable, text, timestamp } from "drizzle-orm/mysql-core";

export const roomsTable = mysqlTable("rooms", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export type Room = typeof roomsTable.$inferSelect;
