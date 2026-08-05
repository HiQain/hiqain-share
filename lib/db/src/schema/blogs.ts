import { mysqlTable, text, longtext, timestamp, varchar } from "drizzle-orm/mysql-core";

export const blogsTable = mysqlTable("blogs", {
  id: varchar("id", { length: 191 }).primaryKey(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  content: longtext("content").notNull(),
  imageDataUrl: longtext("image_data_url"),
  publishedAt: timestamp("published_at", { mode: "date" }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export type BlogRow = typeof blogsTable.$inferSelect;
