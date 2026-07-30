import { mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import { roomsTable } from "./rooms";

export const textsTable = mysqlTable("texts", {
  id: varchar("id", { length: 191 }).primaryKey(),
  roomId: varchar("room_id", { length: 191 }).notNull().references(() => roomsTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  deviceLabel: text("device_label").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
});

export type TextRow = typeof textsTable.$inferSelect;
