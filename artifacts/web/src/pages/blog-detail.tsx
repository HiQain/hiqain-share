import { useMemo } from "react";
import { Link, useRoute } from "wouter";
import { useListBlogs } from "@workspace/api-client-react";
import { ArrowLeft } from "lucide-react";
import { BlogContent } from "@/components/blog-content";
import { Button } from "@/components/ui/button";
import type { BlogPost } from "@/lib/blog-store";

function formatBlogDate(publishedAt: string): string {
  return new Date(publishedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function BlogDetailPage() {
  const [match, params] = useRoute<{ id: string }>("/blog/:id");
  const { data: posts = [] } = useListBlogs();

  const post = useMemo(
    () => (posts as BlogPost[]).find((entry) => entry.id === params?.id) ?? null,
    [params?.id, posts],
  );

  if (!match) {
    return null;
  }

  if (!post) {
    return (
      <div className="py-16 md:py-24">
        <div className="container mx-auto max-w-3xl px-4 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Blog not found</h1>
          <p className="mt-3 text-muted-foreground">The article you are looking for is not available.</p>
          <Button asChild className="mt-6">
            <Link href="/blog">Back to Blog</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto max-w-4xl px-4">
        <Link
          href="/blog"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>

        <article className="rounded-[28px] border border-border bg-card p-6 shadow-sm md:p-10">
          {post.imageDataUrl && (
            <img src={post.imageDataUrl} alt={post.title} className="mb-8 h-72 w-full rounded-2xl object-cover" />
          )}
          <p className="mb-4 text-sm text-muted-foreground">{formatBlogDate(post.publishedAt)}</p>
          <h1 className="mb-4 text-4xl font-bold tracking-tight">{post.title}</h1>
          <p className="mb-8 text-lg text-muted-foreground">{post.excerpt}</p>
          <BlogContent content={post.content} />
        </article>
      </div>
    </div>
  );
}
