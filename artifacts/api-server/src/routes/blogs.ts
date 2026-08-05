import { Router, type IRouter } from "express";
import { db, blogsTable } from "@workspace/db";
import { CreateBlogBody, ListBlogsResponse, DeleteBlogParams } from "@workspace/api-zod";
import { desc, eq } from "drizzle-orm";

const router: IRouter = Router();

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || "post";
}

async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const existing = await db.select({ id: blogsTable.id }).from(blogsTable).where(eq(blogsTable.id, candidate)).limit(1);
    if (existing.length === 0) {
      return candidate;
    }
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

router.get("/blogs", async (_req, res) => {
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
  const id = await generateUniqueSlug(body.title.trim());

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
  const existing = await db
    .select({ id: blogsTable.id })
    .from(blogsTable)
    .where(eq(blogsTable.id, blogId))
    .limit(1);

  if (existing.length === 0) {
    res.status(404).json({ error: "Blog post not found" });
    return;
  }

  await db.delete(blogsTable).where(eq(blogsTable.id, blogId));
  res.status(204).send();
});

export default router;
