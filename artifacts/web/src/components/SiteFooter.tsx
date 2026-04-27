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
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr_1fr]">
          <div className="space-y-3 text-center md:text-left">
            <p className="text-base font-semibold text-foreground">Phone Number Formatter</p>
            <p className="max-w-md leading-6">
              Simple tools for formatting and validating phone numbers with quick access to the
              site information you may need.
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
                  className="transition-colors hover:text-primary hover:underline"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          <div className="space-y-3 text-center md:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/80">
              Partner
            </p>
            <a
              href="https://hiqain.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-base font-medium text-foreground transition-colors hover:text-primary hover:underline"
            >
              Powered by Hiqain
            </a>
            <p className="leading-6">
              Product, engineering, and growth support for practical web tools.
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-border/70 pt-4 text-center text-xs leading-6">
          <p>Copyright © 2026 Phone Number Formatter. All rights reserved.</p>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="mx-auto max-w-6xl rounded-2xl border border-border/60 bg-gray-200 px-4 py-3 text-center text-sm leading-6 text-slate-800 shadow-sm">
          <span className="font-semibold text-amber-700">Disclaimer:</span>{" "}
          Hiqain is an independent platform. We are{" "}
          <span className="font-semibold text-black">not affiliated</span> with any government
          body or official examination authority.
        </div>
      </div>

      <LanguageBar />
    </footer>
  );
}
