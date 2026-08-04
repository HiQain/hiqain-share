import { useListBlogs } from "@workspace/api-client-react";
import { Link } from "wouter";
import { ArrowRight, ImageOff } from "lucide-react";
import type { BlogPost } from "@/lib/blog-store";

function formatBlogDate(publishedAt: string): string {
  return new Date(publishedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function Blog() {
  const { data: posts = [] } = useListBlogs();

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Blog</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Mock blog content for layout and navigation preview. Replace these entries with your real
            articles whenever you're ready.
          </p>
        </div>

        {(posts as BlogPost[]).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
            <p className="font-medium">No blog posts yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(posts as BlogPost[]).map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md"
              >
                <div className="aspect-[16/10] w-full overflow-hidden bg-muted">
                  {post.imageDataUrl ? (
                    <img
                      src={post.imageDataUrl}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageOff className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {formatBlogDate(post.publishedAt)}
                  </p>
                  <h2 className="mb-2 line-clamp-2 text-lg font-semibold leading-snug text-foreground">
                    {post.title}
                  </h2>
                  <p className="mb-4 line-clamp-3 flex-1 text-sm text-muted-foreground">{post.excerpt}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Read article
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
