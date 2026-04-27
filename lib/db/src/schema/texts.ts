import { mysqlTable, text, timestamp } from "drizzle-orm/mysql-core";
import { roomsTable } from "./rooms";

export const textsTable = mysqlTable("texts", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => roomsTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  deviceLabel: text("device_label").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
});

export type TextRow = typeof textsTable.$inferSelect;
