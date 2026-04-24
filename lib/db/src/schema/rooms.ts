import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const roomsTable = pgTable("rooms", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Room = typeof roomsTable.$inferSelect;
