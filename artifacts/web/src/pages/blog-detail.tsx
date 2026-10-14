import { useMemo } from "react";
import { Link, useRoute } from "wouter";
import { useListBlogs } from "@workspace/api-client-react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { BlogContent } from "@/components/blog-content";
import { Button } from "@/components/ui/button";
import { useSeoOverride } from "@/components/seo";
import { SITE_NAME } from "@/lib/seo-config";
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

  // The public list is newest-first, so the post above is newer and the one
  // below is older. These drive the Previous / Next navigation.
  const { newerPost, olderPost } = useMemo(() => {
    const list = posts as BlogPost[];
    const index = list.findIndex((entry) => entry.id === params?.id);
    if (index === -1) {
      return { newerPost: null as BlogPost | null, olderPost: null as BlogPost | null };
    }
    return {
      newerPost: index > 0 ? list[index - 1] : null,
      olderPost: index < list.length - 1 ? list[index + 1] : null,
    };
  }, [params?.id, posts]);

  useSeoOverride(
    post
      ? {
          title: `${post.title} | ${SITE_NAME}`,
          description: post.excerpt,
          type: "article",
          // Only use the post image for sharing when it's a real URL (data URLs
          // aren't usable by social scrapers); otherwise fall back to the default.
          image: post.imageDataUrl && /^https?:\/\//i.test(post.imageDataUrl) ? post.imageDataUrl : undefined,
        }
      : null,
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

        {(newerPost || olderPost) && (
          <nav className="mt-8 grid gap-4 sm:grid-cols-2">
            {newerPost ? (
              <Link
                href={`/blog/${newerPost.id}`}
                className="group flex flex-col gap-1 rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-colors hover:border-primary/30"
              >
                <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Previous
                </span>
                <span className="line-clamp-2 font-semibold leading-snug text-foreground">{newerPost.title}</span>
              </Link>
            ) : (
              <span className="hidden sm:block" />
            )}
            {olderPost && (
              <Link
                href={`/blog/${olderPost.id}`}
                className="group flex flex-col gap-1 rounded-2xl border border-border/60 bg-card p-5 text-right shadow-sm transition-colors hover:border-primary/30 sm:items-end"
              >
                <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Next
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
                <span className="line-clamp-2 font-semibold leading-snug text-foreground">{olderPost.title}</span>
              </Link>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
