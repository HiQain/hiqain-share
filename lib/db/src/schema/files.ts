import { mysqlTable, text, int, timestamp, varchar } from "drizzle-orm/mysql-core";
import { roomsTable } from "./rooms";

export const filesTable = mysqlTable("files", {
  id: varchar("id", { length: 191 }).primaryKey(),
  roomId: varchar("room_id", { length: 191 }).notNull().references(() => roomsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: int("size_bytes").notNull(),
  dataBase64: text("data_base64").notNull(),
  deviceLabel: text("device_label").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
});

export type FileRow = typeof filesTable.$inferSelect;
