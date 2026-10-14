/**
 * Runtime <head> manager for this SPA.
 *
 * <Seo /> is rendered once inside the Layout. It resolves the current route's
 * metadata from seo-config and writes the title, description, canonical, robots,
 * Open Graph, and Twitter Card tags into <head>. Dynamic pages (e.g. a blog
 * post) push per-page overrides via useSeoOverride(); the override is merged on
 * top of the route defaults.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  absoluteUrl,
  resolveRouteMeta,
  type RouteMeta,
} from "@/lib/seo-config";

export type SeoOverride = {
  title?: string;
  description?: string;
  type?: "website" | "article";
  /** Path or absolute URL of the share image. */
  image?: string;
  noindex?: boolean;
};

type SeoContextValue = {
  override: SeoOverride | null;
  setOverride: (value: SeoOverride | null) => void;
};

const SeoContext = createContext<SeoContextValue>({
  override: null,
  setOverride: () => {},
});

export function SeoProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<SeoOverride | null>(null);
  const value = useMemo(() => ({ override, setOverride }), [override]);
  return <SeoContext.Provider value={value}>{children}</SeoContext.Provider>;
}

/**
 * Register per-page SEO overrides for a dynamic route. The override is applied
 * while the component is mounted and cleared on unmount, so the route defaults
 * take over again on navigation.
 */
export function useSeoOverride(override: SeoOverride | null) {
  const { setOverride } = useContext(SeoContext);
  // Serialize so the effect only re-runs when the actual values change.
  const key = JSON.stringify(override ?? null);

  useEffect(() => {
    setOverride(override ?? null);
    return () => setOverride(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setOverride]);
}

function upsertMeta(selectorAttr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${selectorAttr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(selectorAttr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function applyHead(meta: RouteMeta, override: SeoOverride | null, path: string) {
  const title = override?.title || meta.title;
  const description = override?.description || meta.description;
  const type = override?.type || meta.type;
  const noindex = override?.noindex ?? meta.noindex ?? false;
  const canonical = absoluteUrl(path === "/" ? "/" : path);
  const image = absoluteUrl(override?.image || DEFAULT_OG_IMAGE);

  document.title = title;

  upsertMeta("name", "description", description);
  upsertMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");
  upsertLink("canonical", canonical);

  // Open Graph
  upsertMeta("property", "og:type", type);
  upsertMeta("property", "og:site_name", SITE_NAME);
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:url", canonical);
  upsertMeta("property", "og:image", image);

  // Twitter
  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);
  upsertMeta("name", "twitter:image", image);
}

export function Seo() {
  const [location] = useLocation();
  const { override } = useContext(SeoContext);
  const routeMeta = resolveRouteMeta(location);

  useEffect(() => {
    applyHead(routeMeta, override, location);
  }, [routeMeta, override, location]);

  return null;
}
