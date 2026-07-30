import { mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import { roomsTable } from "./rooms";

export const activityTable = mysqlTable("activity", {
  id: varchar("id", { length: 191 }).primaryKey(),
  roomId: varchar("room_id", { length: 191 }).notNull().references(() => roomsTable.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  summary: text("summary").notNull(),
  deviceLabel: text("device_label").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export type ActivityRow = typeof activityTable.$inferSelect;
