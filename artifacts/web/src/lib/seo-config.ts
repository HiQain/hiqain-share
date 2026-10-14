/**
 * Centralized SEO configuration.
 *
 * This is the single source of truth for per-route <head> metadata. The base
 * URL is read from VITE_SITE_URL so it can be overridden per environment, and
 * falls back to the production domain. Canonical URLs, Open Graph URLs, and the
 * share image are all built from this base.
 *
 * Note: this app is a client-rendered SPA, so these tags are applied at runtime
 * (see components/seo.tsx). Google renders JS and will read them; the static
 * defaults in index.html cover non-JS social scrapers.
 */

export const SITE_NAME = "Air4Share";

export const SITE_URL = (
  (import.meta.env.VITE_SITE_URL as string | undefined)?.trim() || "https://air4share.com"
).replace(/\/+$/, "");

export const DEFAULT_DESCRIPTION =
  "Share any file or text instantly with Air4Share. 100% free, no registration required — quick and secure sharing from anywhere.";

/** Default Open Graph / Twitter share image (relative to the site root). */
export const DEFAULT_OG_IMAGE = "/opengraph.jpg";

export const THEME_COLOR = "#4F63FC";

export type RouteMeta = {
  /** Full <title>. Home has no brand suffix; inner pages use "{Page} | Air4Share". */
  title: string;
  description: string;
  type: "website" | "article";
  /** When true, emits robots "noindex, nofollow". */
  noindex?: boolean;
};

/** Per-route title + description. Anything not listed falls back to DEFAULT_META. */
export const PAGE_META: Record<string, RouteMeta> = {
  "/": {
    title: "Air4Share — Fast & Secure File Sharing Without Signing Up",
    description: DEFAULT_DESCRIPTION,
    type: "website",
  },
  "/how-it-works": {
    title: "How It Works | Air4Share",
    description:
      "See how Air4Share lets you share files and text in seconds — no account, no app, no hassle. Here's exactly how it works.",
    type: "website",
  },
  "/blog": {
    title: "Blog | Air4Share",
    description:
      "Tips, guides, and updates on fast, secure, no-signup file and text sharing from the Air4Share team.",
    type: "website",
  },
  "/contact": {
    title: "Contact | Air4Share",
    description: "Get in touch with the Air4Share team — questions, feedback, and support.",
    type: "website",
  },
  "/disclaimer": {
    title: "Disclaimer | Air4Share",
    description: "Read the Air4Share disclaimer covering the use of our file and text sharing service.",
    type: "website",
  },
  "/privacy-policy": {
    title: "Privacy Policy | Air4Share",
    description: "How Air4Share handles your data and protects your privacy when you share files and text.",
    type: "website",
  },
  "/terms-of-service": {
    title: "Terms of Service | Air4Share",
    description: "The terms that govern your use of the Air4Share file and text sharing service.",
    type: "website",
  },
  // Private / admin area — never index.
  "/admin": {
    title: "Admin | Air4Share",
    description: DEFAULT_DESCRIPTION,
    type: "website",
    noindex: true,
  },
  "/admin/blogs": {
    title: "Manage Blog | Air4Share",
    description: DEFAULT_DESCRIPTION,
    type: "website",
    noindex: true,
  },
  "/admin/blogs/new": {
    title: "New Blog Post | Air4Share",
    description: DEFAULT_DESCRIPTION,
    type: "website",
    noindex: true,
  },
};

export const DEFAULT_META: RouteMeta = {
  title: PAGE_META["/"]!.title,
  description: DEFAULT_DESCRIPTION,
  type: "website",
};

function stripTrailingSlash(path: string): string {
  if (path.length > 1 && path.endsWith("/")) return path.replace(/\/+$/, "");
  return path;
}

/** Resolve the base metadata for a given route path (before any per-page override). */
export function resolveRouteMeta(rawPath: string): RouteMeta {
  const path = stripTrailingSlash(rawPath || "/");

  const exact = PAGE_META[path];
  if (exact) return exact;

  // Private per-upload file links and any other admin sub-route: never index.
  if (path.startsWith("/admin")) {
    return { title: "Admin | Air4Share", description: DEFAULT_DESCRIPTION, type: "website", noindex: true };
  }
  if (path.startsWith("/files")) {
    return { title: `Shared File | ${SITE_NAME}`, description: DEFAULT_DESCRIPTION, type: "website", noindex: true };
  }
  // Blog detail: sensible default; the page overrides with the post's own data.
  if (path.startsWith("/blog/")) {
    return { title: `Blog | ${SITE_NAME}`, description: DEFAULT_DESCRIPTION, type: "article" };
  }

  return DEFAULT_META;
}

/** Build an absolute URL from the site base + a path or relative asset. */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}
