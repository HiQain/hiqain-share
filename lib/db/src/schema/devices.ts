import { mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
import { roomsTable } from "./rooms";

export const devicesTable = mysqlTable("devices", {
  id: varchar("id", { length: 191 }).primaryKey(),
  roomId: varchar("room_id", { length: 191 }).notNull().references(() => roomsTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  userAgent: text("user_agent").notNull(),
  lastSeen: timestamp("last_seen", { mode: "date" }).defaultNow().notNull(),
});

export type DeviceRow = typeof devicesTable.$inferSelect;
