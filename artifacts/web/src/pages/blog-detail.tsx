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
      <div className="container mx-auto max-w-3xl px-4">
        <Link
          href="/blog"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>

        <article className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-md">
          {post.imageDataUrl && (
            <img src={post.imageDataUrl} alt={post.title} className="h-64 w-full object-cover sm:h-80 md:h-96" />
          )}
          <div className="p-6 md:p-10">
            <p className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {formatBlogDate(post.publishedAt)}
            </p>
            <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1>
            <p className="mb-8 border-l-2 border-primary/40 pl-4 text-lg text-muted-foreground">{post.excerpt}</p>
            <BlogContent content={post.content} />
          </div>
        </article>
      </div>
    </div>
  );
}
