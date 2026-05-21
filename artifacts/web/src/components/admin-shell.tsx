import { type ReactNode, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LogOut, PlusCircle, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isAdminAuthenticated, setAdminAuthenticated } from "@/lib/blog-store";

type AdminShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

const navItems = [
  { href: "/admin/blogs", label: "Blog Listing", icon: ScrollText },
  { href: "/admin/blogs/new", label: "Add Blog", icon: PlusCircle },
];

export function AdminShell({ title, description, children }: AdminShellProps) {
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate("/admin");
    }
  }, [navigate]);

  if (!isAdminAuthenticated()) {
    return null;
  }

  const handleLogout = () => {
    setAdminAuthenticated(false);
    navigate("/admin");
  };

  return (
    <div className="py-10 sm:py-14 md:py-20">
      <div className="container mx-auto max-w-6xl space-y-6 px-4 sm:space-y-8 sm:px-6">
        <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card px-5 py-5 shadow-sm sm:px-6 sm:py-6 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
          <Button
            variant="outline"
            className="h-12 min-w-[124px] self-start rounded-xl px-5 md:ml-auto md:self-auto"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {children}
      </div>
    </div>
  );
}
