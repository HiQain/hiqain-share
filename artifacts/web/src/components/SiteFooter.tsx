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
            <p className="text-base font-semibold text-foreground">Hiqain Share</p>
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

        <div className="mt-6">
          <div className="rounded-2xl border border-border/60 bg-gray-200 px-4 py-3 text-center text-sm leading-6 text-slate-800 shadow-sm">
            <span className="font-semibold text-amber-700">Disclaimer:</span>{" "}
            Hiqain is an independent platform. We are{" "}
            <span className="font-semibold text-black">not affiliated</span> with any government
            body or official examination authority.
          </div>
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
              className="inline-flex text-base font-medium text-foreground transition-colors hover:text-primary hover:underline"
            >
              Powered by Hiqain
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
