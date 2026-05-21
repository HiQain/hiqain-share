import { type FormEvent, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { isAdminAuthenticated, setAdminAuthenticated } from "@/lib/blog-store";

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL?.trim() ?? "";
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD?.trim() ?? "";

export function Admin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isAuthenticatedState, setIsAuthenticated] = useState(isAdminAuthenticated());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      setAdminAuthenticated(true);
      setIsAuthenticated(true);
      toast({
        title: "Authenticated",
        description: "Admin panel unlocked successfully.",
      });
      navigate("/admin/blogs");
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

  if (isAuthenticatedState) {
    navigate("/admin/blogs");
    return null;
  }

  return (
    <div className="py-10 sm:py-14 md:py-20">
      <div className="container mx-auto max-w-md px-4 sm:px-6">
        <Card className="overflow-hidden">
          <CardHeader className="space-y-2 border-b border-border/60 bg-muted/20 px-6 py-5 sm:px-7">
            <CardTitle className="text-2xl">Admin Login</CardTitle>
            <CardDescription>Authentication required to access the admin blog panel.</CardDescription>
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
              <div className="flex gap-3">
                <Button type="submit" className="flex-1">
                  Sign In
                </Button>
                <Button type="button" variant="outline" onClick={handleLogout}>
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
