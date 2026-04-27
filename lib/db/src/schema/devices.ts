import { mysqlTable, text, timestamp } from "drizzle-orm/mysql-core";
import { roomsTable } from "./rooms";

export const devicesTable = mysqlTable("devices", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => roomsTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  userAgent: text("user_agent").notNull(),
  lastSeen: timestamp("last_seen", { mode: "date" }).defaultNow().notNull(),
});

export type DeviceRow = typeof devicesTable.$inferSelect;
