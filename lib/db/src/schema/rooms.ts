import { mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

export const roomsTable = mysqlTable("rooms", {
  id: varchar("id", { length: 191 }).primaryKey(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export type Room = typeof roomsTable.$inferSelect;
