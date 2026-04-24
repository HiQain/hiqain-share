import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { roomsTable } from "./rooms";

export const textsTable = pgTable("texts", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => roomsTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  deviceLabel: text("device_label").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export type TextRow = typeof textsTable.$inferSelect;
