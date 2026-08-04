import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ImageOff, Trash2 } from "lucide-react";
import { useDeleteBlog, useListBlogs, getListBlogsQueryKey } from "@workspace/api-client-react";
import { AdminShell } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { BlogPost } from "@/lib/blog-store";

function formatDate(date: string): string {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";

  return value.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function AdminBlogListPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteBlog = useDeleteBlog();
  const { data: posts = [] } = useListBlogs({
    query: {
      queryKey: getListBlogsQueryKey(),
    },
  });

  const handleDeletePost = (id: string) => {
    deleteBlog.mutate(
      { blogId: id },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: getListBlogsQueryKey() });
          toast({
            title: "Blog deleted",
            description: "The blog entry has been removed.",
          });
        },
      },
    );
  };

  return (
    <AdminShell
      title="Blog Listing"
      description="Review all current blogs, open their public detail pages, or remove posts."
    >
      <Card className="overflow-hidden">
        <CardHeader className="space-y-2 border-b border-border/60 bg-muted/20 px-5 py-5 sm:px-6">
          <CardTitle className="text-2xl">All Blogs</CardTitle>
          <CardDescription>These entries are visible on the public blog page.</CardDescription>
        </CardHeader>
        <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
          {(posts as BlogPost[]).length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
              <p className="font-medium">No blogs yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Add your first blog from the dedicated add-blog page.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {(posts as BlogPost[]).map((post) => (
                <article
                  key={post.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                >
                  <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
                    {post.imageDataUrl ? (
                      <img src={post.imageDataUrl} alt={post.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageOff className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {formatDate(post.publishedAt)}
                    </p>
                    <h2 className="line-clamp-2 text-base font-semibold leading-snug">{post.title}</h2>
                    <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">{post.excerpt}</p>
                    <div className="flex gap-2 pt-2">
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link href={`/blog/${post.id}`}>View</Link>
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={deleteBlog.isPending}
                        onClick={() => handleDeletePost(post.id)}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
