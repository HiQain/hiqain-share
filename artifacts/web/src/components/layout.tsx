import { Link, useLocation } from "wouter";
import { Zap, Menu, X } from "lucide-react";
import { useState } from "react";
import { LanguageSelector } from "@/components/LanguageBar";
import { SiteFooter } from "@/components/SiteFooter";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/how-it-works", label: "How it works" },
    { href: "/feedback", label: "Feedback" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-md group-hover:scale-105 transition-transform">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            <span className="font-bold text-xl tracking-tight text-foreground">Hiqain Share</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <LanguageSelector className="h-9 w-[164px] bg-background" />
            <Link
              href={navLinks[0].href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location === navLinks[0].href ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {navLinks[0].label}
            </Link>
            <Link
              href={navLinks[1].href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location === navLinks[1].href ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {navLinks[1].label}
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
