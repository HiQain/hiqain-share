import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Trash2 } from "lucide-react";
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
            <div className="grid gap-5">
              {(posts as BlogPost[]).map((post) => (
                <article key={post.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">{formatDate(post.publishedAt)}</p>
                      <h2 className="text-2xl font-semibold">{post.title}</h2>
                      <p className="max-w-3xl text-muted-foreground">{post.excerpt}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline">
                        <Link href={`/blog/${post.id}`}>View Detail</Link>
                      </Button>
                      <Button
                        variant="secondary"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={deleteBlog.isPending}
                        onClick={() => handleDeletePost(post.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
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
