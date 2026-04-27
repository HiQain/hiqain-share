import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const blogsTable = pgTable("blogs", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  imageDataUrl: text("image_data_url"),
  publishedAt: timestamp("published_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type BlogRow = typeof blogsTable.$inferSelect;
