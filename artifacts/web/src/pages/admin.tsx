import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Trash2, LogOut, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  getStoredBlogs,
  isAdminAuthenticated,
  saveBlogs,
  setAdminAuthenticated,
  type BlogPost,
} from "@/lib/blog-store";

const ADMIN_EMAIL = "admin@hiqain.com";
const ADMIN_PASSWORD = "password";

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

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function Admin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [form, setForm] = useState<BlogFormState>(initialFormState);

  useEffect(() => {
    setIsAuthenticated(isAdminAuthenticated());
    setPosts(getStoredBlogs());
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      setAdminAuthenticated(true);
      setIsAuthenticated(true);
      setPosts(getStoredBlogs());
      toast({
        title: "Authenticated",
        description: "Admin panel unlocked successfully.",
      });
      return;
    }

    toast({
      title: "Login failed",
      description: "Please check the admin email and password.",
      variant: "destructive",
    });
  };

  const handleLogout = () => {
    setAdminAuthenticated(false);
    setIsAuthenticated(false);
    setEmail("");
    setPassword("");
    navigate("/admin");
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleAddPost = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim() || !form.excerpt.trim() || !form.content.trim()) {
      toast({
        title: "Missing fields",
        description: "Title, excerpt, and content are required.",
        variant: "destructive",
      });
      return;
    }

    const nextPosts: BlogPost[] = [
      {
        id: crypto.randomUUID(),
        title: form.title.trim(),
        excerpt: form.excerpt.trim(),
        content: form.content.trim(),
        date: formatDate(new Date()),
        imageDataUrl: form.imageDataUrl,
      },
      ...posts,
    ];

    setPosts(nextPosts);
    saveBlogs(nextPosts);
    setForm(initialFormState);
    toast({
      title: "Blog added",
      description: "The new blog entry has been saved.",
    });
  };

  const handleDeletePost = (id: string) => {
    const nextPosts = posts.filter((post) => post.id !== id);
    setPosts(nextPosts);
    saveBlogs(nextPosts);
    toast({
      title: "Blog deleted",
      description: "The blog entry has been removed.",
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="py-10 sm:py-14 md:py-20">
        <div className="container mx-auto max-w-md px-4 sm:px-6">
          <Card className="overflow-hidden">
            <CardHeader className="space-y-2 border-b border-border/60 bg-muted/20 px-6 py-5 sm:px-7">
              <CardTitle className="text-2xl">Admin Login</CardTitle>
              <CardDescription>
                Authentication required to access the admin panel.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-6 sm:px-7">
              <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@hiqain.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="password"
                  />
                </div>
                <Button type="submit" className="w-full mt-4">
                  Sign In
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 sm:py-14 md:py-20">
      <div className="container mx-auto max-w-6xl space-y-6 px-4 sm:space-y-8 sm:px-6">
        <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card px-5 py-5 shadow-sm sm:px-6 sm:py-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Admin Panel</h1>
            <p className="text-muted-foreground">
              Manage blog listings, upload cover images, and remove posts.
            </p>
          </div>
          <Button variant="outline" className="self-start md:self-auto" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] xl:gap-8">
          <Card className="overflow-hidden">
            <CardHeader className="space-y-2 border-b border-border/60 bg-muted/20 px-5 py-5 sm:px-6">
              <CardTitle className="text-2xl">Add Blog</CardTitle>
              <CardDescription>Create a new blog entry for the public blog page.</CardDescription>
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">Content</label>
                  <Textarea
                    value={form.content}
                    onChange={(e) => setForm((current) => ({ ...current, content: e.target.value }))}
                    className="min-h-[220px]"
                    placeholder="Full blog content"
                  />
                </div>
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
                  <Button type="submit">Add Blog</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="space-y-2 border-b border-border/60 bg-muted/20 px-5 py-5 sm:px-6">
              <CardTitle className="text-2xl">Blog Listing</CardTitle>
              <CardDescription>All current blogs visible on the public site.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
              {posts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center">
                  <p className="font-medium">No blogs yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add your first blog from the form on the left.
                  </p>
                </div>
              ) : (
                posts.map((post) => (
                <div key={post.id} className="rounded-xl border border-border bg-background/60 p-4 sm:p-5">
                  {post.imageDataUrl && (
                    <img
                      src={post.imageDataUrl}
                      alt={post.title}
                      className="mb-4 h-36 w-full rounded-lg object-cover"
                    />
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <p className="mb-1 text-xs text-muted-foreground">{post.date}</p>
                      <h2 className="text-lg font-semibold leading-snug">{post.title}</h2>
                      <p className="text-sm leading-6 text-muted-foreground">{post.excerpt}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mt-0.5 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDeletePost(post.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
