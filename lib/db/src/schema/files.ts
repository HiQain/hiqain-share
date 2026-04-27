import { mysqlTable, text, int, timestamp } from "drizzle-orm/mysql-core";
import { roomsTable } from "./rooms";

export const filesTable = mysqlTable("files", {
  id: text("id").primaryKey(),
  roomId: text("room_id").notNull().references(() => roomsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: int("size_bytes").notNull(),
  dataBase64: text("data_base64").notNull(),
  deviceLabel: text("device_label").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
});

export type FileRow = typeof filesTable.$inferSelect;
