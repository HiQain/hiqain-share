import { Router, type IRouter } from "express";
import { db, blogsTable } from "@workspace/db";
import { CreateBlogBody, UpdateBlogBody, ListBlogsResponse, DeleteBlogParams } from "@workspace/api-zod";
import { and, desc, eq, lte, ne } from "drizzle-orm";

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

// Build an excerpt from the post content when the author leaves it blank. The
// content may be rich HTML, so strip tags and collapse whitespace first, then
// keep the first 220 characters.
function deriveExcerpt(content: string): string {
  const plain = content
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const clipped = plain.slice(0, 220).trimEnd();
  return plain.length > 220 ? `${clipped}…` : clipped;
}

// Return a unique slug derived from `source`. When editing, pass `excludeId` so
// the post can keep (or reuse part of) its own slug without colliding with
// itself.
async function generateUniqueSlug(source: string, excludeId?: string): Promise<string> {
  const base = slugify(source);
  let candidate = base;
  let suffix = 2;

  while (true) {
    const condition =
      excludeId === undefined
        ? eq(blogsTable.id, candidate)
        : and(eq(blogsTable.id, candidate), ne(blogsTable.id, excludeId));
    const existing = await db.select({ id: blogsTable.id }).from(blogsTable).where(condition).limit(1);
    if (existing.length === 0) {
      return candidate;
    }
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

router.get("/blogs", async (req, res) => {
  // Public views omit scheduled (future-dated) posts so they stay hidden until
  // their publish date; admin views pass ?includeScheduled=true to see them.
  const includeScheduled = req.query.includeScheduled === "true";

  const rows = includeScheduled
    ? await db.select().from(blogsTable).orderBy(desc(blogsTable.publishedAt))
    : await db
        .select()
        .from(blogsTable)
        .where(lte(blogsTable.publishedAt, new Date()))
        .orderBy(desc(blogsTable.publishedAt));

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

  const title = body.title.trim();
  const content = body.content.trim();
  const excerpt = (body.excerpt ?? "").trim() || deriveExcerpt(content);
  const publishedAt = body.publishedAt ?? new Date();
  const createdAt = new Date();
  const id = await generateUniqueSlug((body.slug ?? "").trim() || title);

  await db.insert(blogsTable).values({
    id,
    title,
    excerpt,
    content,
    imageDataUrl: body.imageDataUrl,
    publishedAt,
    createdAt,
  });

  res.status(201).json({
    id,
    title,
    excerpt,
    content,
    imageDataUrl: body.imageDataUrl,
    publishedAt: publishedAt.toISOString(),
  });
});

router.put("/blogs/:blogId", async (req, res) => {
  const { blogId } = DeleteBlogParams.parse(req.params);
  const body = UpdateBlogBody.parse(req.body);

  const existing = await db.select().from(blogsTable).where(eq(blogsTable.id, blogId)).limit(1);
  if (existing.length === 0) {
    res.status(404).json({ error: "Blog post not found" });
    return;
  }
  const current = existing[0];

  const title = body.title.trim();
  const content = body.content.trim();
  const excerpt = (body.excerpt ?? "").trim() || deriveExcerpt(content);
  const publishedAt = body.publishedAt ?? current.publishedAt;

  // A blank slug falls back to the title. Only recompute the id when the
  // desired slug differs from the current one, so an unchanged post keeps its id.
  const desired = slugify((body.slug ?? "").trim() || title);
  const id = desired === current.id ? current.id : await generateUniqueSlug(desired, current.id);

  await db
    .update(blogsTable)
    .set({ id, title, excerpt, content, imageDataUrl: body.imageDataUrl, publishedAt })
    .where(eq(blogsTable.id, blogId));

  res.status(200).json({
    id,
    title,
    excerpt,
    content,
    imageDataUrl: body.imageDataUrl,
    publishedAt: publishedAt.toISOString(),
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
