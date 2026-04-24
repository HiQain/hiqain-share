import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { roomsTable } from "./rooms";

export const devicesTable = pgTable("devices", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => roomsTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  userAgent: text("user_agent").notNull(),
  lastSeen: timestamp("last_seen", { withTimezone: true }).defaultNow().notNull(),
});

export type DeviceRow = typeof devicesTable.$inferSelect;
