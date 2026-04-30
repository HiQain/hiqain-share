import { Link } from "wouter";
import { LanguageBar } from "@/components/LanguageBar";

const FOOTER_LINKS = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact Us" },
  { href: "/disclaimer", label: "Disclaimer" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-service", label: "Terms of Service" },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-start">
          <div className="space-y-3 text-center md:text-left">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="text-primary-foreground rounded-md group-hover:scale-105 transition-transform">
                <img src="/share_logo.png" alt="Hiqain Share Logo" width={180} height={180} />
              </div>
            </Link>
            <p className="max-w-80 leading-6">
              Simple tool for sharing files and text.
            </p>
          </div>

          <nav aria-label="Footer" className="space-y-3 text-center md:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/80">
              Quick Links
            </p>
            <div className="flex flex-col gap-2">
              {FOOTER_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex w-fit transition-all duration-200 hover:translate-x-1 hover:text-primary hover:underline"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </div>

      <LanguageBar />

      <div className="container mx-auto max-w-6xl px-4 pb-4 text-sm text-muted-foreground">
        <div className="flex flex-col items-center justify-between gap-3 border-t border-border/70 pt-4 text-center text-xs leading-6 md:flex-row">
          <p>Copyright © 2026 Hiqain Share. All rights reserved.</p>
          <div className="md:text-right">
            <a
              href="https://hiqain.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex font-medium text-foreground transition-colors hover:text-primary hover:underline"
            >
              Powered by Hiqain
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
