#!/usr/bin/env node
/**
 * Generates artifacts/web/public/sitemap.xml.
 *
 * Static routes are always emitted. Blog detail URLs are pulled from the API
 * when it is reachable (SITEMAP_API_BASE_URL, falling back to SITE_URL/api);
 * if the fetch fails the sitemap is still written with the static routes only,
 * so a build never breaks because the API happens to be down.
 *
 * Routes intentionally excluded: /admin*, /files/:id (private, per-upload
 * links) and the 404 route.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SITE_URL = (process.env.SITE_URL || "https://air4share.com").replace(/\/+$/, "");
const API_BASE_URL = (process.env.SITEMAP_API_BASE_URL || `${SITE_URL}/api`).replace(/\/+$/, "");
const OUT_FILE = resolve(__dirname, "../public/sitemap.xml");

const STATIC_ROUTES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/how-it-works", changefreq: "monthly", priority: "0.8" },
  { path: "/blog", changefreq: "weekly", priority: "0.8" },
  { path: "/contact", changefreq: "yearly", priority: "0.5" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms-of-service", changefreq: "yearly", priority: "0.3" },
  { path: "/disclaimer", changefreq: "yearly", priority: "0.3" },
];

function escapeXml(value) {
  return value.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c],
  );
}

async function fetchBlogRoutes() {
  try {
    const res = await fetch(`${API_BASE_URL}/blogs`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const posts = await res.json();
    if (!Array.isArray(posts)) throw new Error("unexpected response shape");
    return posts
      .filter((post) => typeof post?.id === "string" && post.id.length > 0)
      .map((post) => ({
        path: `/blog/${post.id}`,
        lastmod: post.publishedAt ? new Date(post.publishedAt).toISOString().slice(0, 10) : undefined,
        changefreq: "monthly",
        priority: "0.6",
      }));
  } catch (error) {
    console.warn(`[sitemap] skipping blog URLs - could not read ${API_BASE_URL}/blogs: ${error.message}`);
    return [];
  }
}

function renderUrl({ path, lastmod, changefreq, priority }) {
  const lines = [`    <loc>${escapeXml(SITE_URL + path)}</loc>`];
  if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
  if (changefreq) lines.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) lines.push(`    <priority>${priority}</priority>`);
  return `  <url>\n${lines.join("\n")}\n  </url>`;
}

const today = new Date().toISOString().slice(0, 10);
const routes = [
  ...STATIC_ROUTES.map((route) => ({ lastmod: today, ...route })),
  ...(await fetchBlogRoutes()),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map(renderUrl).join("\n")}
</urlset>
`;

await mkdir(dirname(OUT_FILE), { recursive: true });
await writeFile(OUT_FILE, xml, "utf8");
console.log(`[sitemap] wrote ${routes.length} URLs to ${OUT_FILE}`);
