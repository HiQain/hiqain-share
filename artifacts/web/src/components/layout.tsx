import { Link, useLocation } from "wouter";
import { Zap, Menu, X, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { LanguageSelector } from "@/components/LanguageBar";
import { SiteFooter } from "@/components/SiteFooter";
import { Switch } from "@/components/ui/switch";

const THEME_STORAGE_KEY = "hiqain-share-theme";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const navLinks = [
    { href: "/how-it-works", label: "How it works" },
  ];

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDarkMode = storedTheme ? storedTheme === "dark" : prefersDark;

    setIsDarkMode(shouldUseDarkMode);
    document.documentElement.classList.toggle("dark", shouldUseDarkMode);
  }, []);

  const toggleDarkMode = (checked: boolean) => {
    setIsDarkMode(checked);
    document.documentElement.classList.toggle("dark", checked);
    window.localStorage.setItem(THEME_STORAGE_KEY, checked ? "dark" : "light");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="text-primary-foreground rounded-md group-hover:scale-105 transition-transform">
              <img src="/share_logo.png" alt="Hiqain Share Logo" width={64} height={64} />
            </div>
            <span className="font-bold text-xl tracking-tight text-foreground">Hiqain Share</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <Switch
                checked={isDarkMode}
                onCheckedChange={toggleDarkMode}
                aria-label="Toggle dark mode"
              />
              <Moon className="h-4 w-4 text-muted-foreground" />
            </div>
            <LanguageSelector className="h-9 w-[92px] bg-background" />
            <Link
              href={navLinks[0].href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location === navLinks[0].href ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {navLinks[0].label}
            </Link>
          </nav>

          {/* Mobile Nav Toggle */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background animate-in slide-in-from-top-4">
            <nav className="flex flex-col p-4 gap-4">
              <div className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
                <span className="text-sm font-medium text-foreground">Dark mode</span>
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-muted-foreground" />
                  <Switch
                    checked={isDarkMode}
                    onCheckedChange={toggleDarkMode}
                    aria-label="Toggle dark mode"
                  />
                  <Moon className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="px-2">
                <LanguageSelector className="h-10 w-full bg-background" />
              </div>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-sm font-medium p-2 rounded-md ${
                    location === link.href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}
