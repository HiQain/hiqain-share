import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import {
  useListBlogs,
  useUpdateBlog,
  getListBlogsQueryKey,
} from "@workspace/api-client-react";
import { useLocation, useRoute } from "wouter";
import { AdminShell } from "@/components/admin-shell";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { slugify, toDateInputValue, type BlogPost } from "@/lib/blog-store";

type BlogFormState = {
  title: string;
  slug: string;
  publishedAt: string;
  excerpt: string;
  content: string;
  imageDataUrl: string | null;
};

export function AdminBlogEditPage() {
  const queryClient = useQueryClient();
  const [, params] = useRoute<{ id: string }>("/admin/blogs/:id/edit");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const updateBlog = useUpdateBlog();

  // Admins see scheduled posts too, so this edit page can open a future-dated one.
  const { data: posts = [] } = useListBlogs(
    { includeScheduled: true },
    { query: { queryKey: getListBlogsQueryKey({ includeScheduled: true }) } },
  );

  const post = (posts as BlogPost[]).find((entry) => entry.id === params?.id) ?? null;

  const [form, setForm] = useState<BlogFormState | null>(null);

  useEffect(() => {
    if (post && form === null) {
      setForm({
        title: post.title,
        slug: post.id,
        publishedAt: toDateInputValue(post.publishedAt),
        excerpt: post.excerpt,
        content: post.content,
        imageDataUrl: post.imageDataUrl,
      });
    }
  }, [post, form]);

  if (post === null && (posts as BlogPost[]).length > 0) {
    return (
      <AdminShell title="Edit Blog" description="Update an existing blog entry.">
        <Card className="overflow-hidden">
          <CardContent className="px-5 py-10 text-center sm:px-6">
            <p className="font-medium">That post no longer exists.</p>
            <Button className="mt-4" onClick={() => navigate("/admin/blogs")}>
              Back to Blog Listing
            </Button>
          </CardContent>
        </Card>
      </AdminShell>
    );
  }

  if (form === null) {
    return (
      <AdminShell title="Edit Blog" description="Update an existing blog entry.">
        <Card className="overflow-hidden">
          <CardContent className="px-5 py-10 text-center text-muted-foreground sm:px-6">
            Loading…
          </CardContent>
        </Card>
      </AdminShell>
    );
  }

  const currentForm = form;

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) =>
        current ? { ...current, imageDataUrl: typeof reader.result === "string" ? reader.result : null } : current,
      );
    };
    reader.readAsDataURL(file);
  };

  const previewSlug = slugify(currentForm.slug || currentForm.title) || "post";

  const handleSave = (e: FormEvent) => {
    e.preventDefault();

    if (!currentForm.title.trim() || !currentForm.content.trim()) {
      toast({
        title: "Missing fields",
        description: "Title and content are required.",
        variant: "destructive",
      });
      return;
    }

    updateBlog.mutate(
      {
        blogId: post!.id,
        data: {
          title: currentForm.title.trim(),
          slug: currentForm.slug.trim() || undefined,
          excerpt: currentForm.excerpt.trim() || undefined,
          content: currentForm.content.trim(),
          publishedAt: currentForm.publishedAt
            ? new Date(currentForm.publishedAt).toISOString()
            : undefined,
          imageDataUrl: currentForm.imageDataUrl,
        },
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: getListBlogsQueryKey() });
          void queryClient.invalidateQueries({ queryKey: getListBlogsQueryKey({ includeScheduled: true }) });
          toast({
            title: "Blog updated",
            description: "The blog entry has been saved.",
          });
          navigate("/admin/blogs");
        },
      },
    );
  };

  return (
    <AdminShell title="Edit Blog" description="Update an existing blog entry and its publish date.">
      <Card className="overflow-hidden">
        <CardHeader className="space-y-2 border-b border-border/60 bg-muted/20 px-5 py-5 sm:px-6">
          <CardTitle className="text-2xl">Edit Blog Post</CardTitle>
          <CardDescription>
            Changing the slug updates the post&apos;s public URL. Leave the excerpt blank to regenerate it from the content.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
          <form onSubmit={handleSave} className="space-y-5 sm:space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={currentForm.title}
                  onChange={(e) => setForm((current) => (current ? { ...current, title: e.target.value } : current))}
                  placeholder="Enter blog title"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Publish date</label>
                <Input
                  type="date"
                  value={currentForm.publishedAt}
                  onChange={(e) => setForm((current) => (current ? { ...current, publishedAt: e.target.value } : current))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                URL slug <span className="font-normal text-muted-foreground">(edit to change the public URL)</span>
              </label>
              <Input
                value={currentForm.slug}
                onChange={(e) => setForm((current) => (current ? { ...current, slug: e.target.value } : current))}
                placeholder="post-url-slug"
              />
              <p className="text-xs text-muted-foreground">
                Public URL: <span className="font-mono">/blog/{previewSlug}</span>
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Excerpt <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                value={currentForm.excerpt}
                onChange={(e) => setForm((current) => (current ? { ...current, excerpt: e.target.value } : current))}
                className="min-h-[110px]"
                placeholder="Short summary for the blog card"
              />
            </div>
            <RichTextEditor
              label="Content"
              value={currentForm.content}
              onChange={(nextValue) => setForm((current) => (current ? { ...current, content: nextValue } : current))}
              placeholder="Write the full blog content here..."
            />
            <div className="space-y-3">
              <label className="text-sm font-medium">Image</label>
              <label className="flex min-h-32 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/50">
                <ImagePlus className="h-4 w-4" />
                Replace blog image
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
              {currentForm.imageDataUrl && (
                <img
                  src={currentForm.imageDataUrl}
                  alt="Blog preview"
                  className="h-44 w-full rounded-xl border border-border object-cover"
                />
              )}
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={updateBlog.isPending}>
                {updateBlog.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/admin/blogs")}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
