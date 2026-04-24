import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { roomsTable } from "./rooms";

export const activityTable = pgTable("activity", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => roomsTable.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  summary: text("summary").notNull(),
  deviceLabel: text("device_label").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ActivityRow = typeof activityTable.$inferSelect;
