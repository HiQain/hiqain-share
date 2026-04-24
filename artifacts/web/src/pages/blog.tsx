import { useEffect, useState } from "react";
import { getStoredBlogs, type BlogPost } from "@/lib/blog-store";

export function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    setPosts(getStoredBlogs());
  }, []);

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Blog</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Mock blog content for layout and navigation preview. Replace these entries with your real
            articles whenever you're ready.
          </p>
        </div>

        <div className="grid gap-6">
          {posts.map((post) => (
            <article
              key={post.id}
              className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm"
            >
              {post.imageDataUrl && (
                <img
                  src={post.imageDataUrl}
                  alt={post.title}
                  className="mb-5 h-56 w-full rounded-xl object-cover"
                />
              )}
              <p className="mb-3 text-sm text-muted-foreground">{post.date}</p>
              <h2 className="mb-3 text-2xl font-semibold">{post.title}</h2>
              <p className="text-muted-foreground">{post.excerpt}</p>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{post.content}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
