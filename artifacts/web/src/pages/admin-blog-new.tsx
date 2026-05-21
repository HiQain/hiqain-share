import { type ChangeEvent, type FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus } from "lucide-react";
import { useCreateBlog, getListBlogsQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { AdminShell } from "@/components/admin-shell";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type BlogFormState = {
  title: string;
  excerpt: string;
  content: string;
  imageDataUrl: string | null;
};

const initialFormState: BlogFormState = {
  title: "",
  excerpt: "",
  content: "",
  imageDataUrl: null,
};

export function AdminBlogNewPage() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState<BlogFormState>(initialFormState);
  const createBlog = useCreateBlog();

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({
        ...current,
        imageDataUrl: typeof reader.result === "string" ? reader.result : null,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddPost = (e: FormEvent) => {
    e.preventDefault();

    if (!form.title.trim() || !form.excerpt.trim() || !form.content.trim()) {
      toast({
        title: "Missing fields",
        description: "Title, excerpt, and content are required.",
        variant: "destructive",
      });
      return;
    }

    createBlog.mutate(
      {
        data: {
          title: form.title.trim(),
          excerpt: form.excerpt.trim(),
          content: form.content.trim(),
          imageDataUrl: form.imageDataUrl,
        },
      },
      {
        onSuccess: () => {
          setForm(initialFormState);
          void queryClient.invalidateQueries({ queryKey: getListBlogsQueryKey() });
          toast({
            title: "Blog added",
            description: "The new blog entry has been saved to the database.",
          });
          navigate("/admin/blogs");
        },
      },
    );
  };

  return (
    <AdminShell
      title="Add Blog"
      description="Create a new blog entry with a richer content editor and cover image."
    >
      <Card className="overflow-hidden">
        <CardHeader className="space-y-2 border-b border-border/60 bg-muted/20 px-5 py-5 sm:px-6">
          <CardTitle className="text-2xl">New Blog Post</CardTitle>
          <CardDescription>Use the editor below to format content before publishing.</CardDescription>
        </CardHeader>
        <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
          <form onSubmit={handleAddPost} className="space-y-5 sm:space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={form.title}
                onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                placeholder="Enter blog title"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Excerpt</label>
              <Textarea
                value={form.excerpt}
                onChange={(e) => setForm((current) => ({ ...current, excerpt: e.target.value }))}
                className="min-h-[110px]"
                placeholder="Short summary for the blog card"
              />
            </div>
            <RichTextEditor
              label="Content"
              value={form.content}
              onChange={(nextValue) => setForm((current) => ({ ...current, content: nextValue }))}
              placeholder="Write the full blog content here..."
            />
            <div className="space-y-3">
              <label className="text-sm font-medium">Image</label>
              <label className="flex min-h-32 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/50">
                <ImagePlus className="h-4 w-4" />
                Upload blog image
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
              {form.imageDataUrl && (
                <img
                  src={form.imageDataUrl}
                  alt="Blog preview"
                  className="h-44 w-full rounded-xl border border-border object-cover"
                />
              )}
            </div>
            <div className="pt-1">
              <Button type="submit" disabled={createBlog.isPending}>
                {createBlog.isPending ? "Saving..." : "Publish Blog"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
