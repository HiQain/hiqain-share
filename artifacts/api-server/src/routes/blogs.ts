import { Router, type IRouter } from "express";
import { db, blogsTable } from "@workspace/db";
import { CreateBlogBody, ListBlogsResponse, DeleteBlogParams } from "@workspace/api-zod";
import { desc, eq } from "drizzle-orm";
import { newId } from "../lib/room";
import { defaultBlogPosts } from "../lib/blog-defaults";

const router: IRouter = Router();

async function ensureSeedBlogs(): Promise<void> {
  const existing = await db.select({ id: blogsTable.id }).from(blogsTable).limit(1);
  if (existing.length > 0) {
    return;
  }

  await db.insert(blogsTable).values(
    defaultBlogPosts.map((post) => ({
      id: post.id,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      imageDataUrl: post.imageDataUrl,
      publishedAt: post.publishedAt,
      createdAt: post.publishedAt,
    })),
  );
}

router.get("/blogs", async (_req, res) => {
  await ensureSeedBlogs();
  const rows = await db.select().from(blogsTable).orderBy(desc(blogsTable.publishedAt));
  const data = ListBlogsResponse.parse(
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      excerpt: row.excerpt,
      content: row.content,
      imageDataUrl: row.imageDataUrl,
      publishedAt: row.publishedAt.toISOString(),
    })),
  );
  res.json(data);
});

router.post("/blogs", async (req, res) => {
  const body = CreateBlogBody.parse(req.body);
  const createdAt = new Date();
  const id = newId();

  await db.insert(blogsTable).values({
    id,
    title: body.title.trim(),
    excerpt: body.excerpt.trim(),
    content: body.content.trim(),
    imageDataUrl: body.imageDataUrl,
    publishedAt: createdAt,
    createdAt,
  });

  res.status(201).json({
    id,
    title: body.title.trim(),
    excerpt: body.excerpt.trim(),
    content: body.content.trim(),
    imageDataUrl: body.imageDataUrl,
    publishedAt: createdAt.toISOString(),
  });
});

router.delete("/blogs/:blogId", async (req, res) => {
  const { blogId } = DeleteBlogParams.parse(req.params);
  const deleted = await db.delete(blogsTable).where(eq(blogsTable.id, blogId)).returning({ id: blogsTable.id });
  if (deleted.length === 0) {
    res.status(404).json({ error: "Blog post not found" });
    return;
  }

  res.status(204).send();
});

export default router;
