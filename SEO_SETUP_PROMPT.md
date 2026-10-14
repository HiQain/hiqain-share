# SEO Setup — Reusable Prompt

This file contains a ready-to-paste prompt you can give to Claude **inside any other project**
to set up the *same* SEO configuration we built for the `ez-subcontractor` (reference) and
`validator` projects.

The prompt is **stack-agnostic** — it tells Claude to detect the framework (Next.js, Flask,
plain HTML, etc.) and implement the same SEO *features*, adapted to that stack. It does **not**
copy any site-specific IDs (Google Analytics, Search Console) — those belong to the original
site and must never be reused.

---

## How to use

1. Open the target project in Claude Code (or any Claude chat with access to that repo).
2. Copy **everything inside the prompt block below** and paste it as your message.
3. Replace the two placeholders at the top of the prompt:
   - `<PRODUCTION_URL>` → the new site's domain (e.g. `https://example.com`)
   - `<SITE_NAME>` → the new site's name (e.g. `Example App`)
4. Answer Claude's follow-up questions (analytics, share image, etc.).

---

## The prompt

> Copy from here ⬇️

```text
I want you to set up SEO for this project. First read the project and detect its stack
(Next.js, Flask/Jinja, plain HTML, etc.), then implement ALL of the SEO features below,
adapted idiomatically to that stack. Do not redesign anything — keep the existing theme,
colors, and layout. This is about <head> metadata, crawl files, and config only.

Use these values:
- Production/base URL: <PRODUCTION_URL>
- Site name: <SITE_NAME>

IMPORTANT — do not copy site-specific IDs from any other project:
- Do NOT hardcode a Google Analytics measurement ID or a Google Search Console
  verification token from another site. For each of these, either (a) wire it up but read
  the value from an environment variable / config and render it only when set (off by
  default), or (b) ask me for this project's own IDs, or (c) skip it. Ask me which I prefer.

Implement the following:

1. Centralized per-page metadata (a single helper/partial that every page uses):
   - <title>: page-specific. Use the pattern "{Page Title} | {Site Name}" for inner pages,
     and a standalone full title for the home page (no suffix).
   - <meta name="description">: per-page description, with a sensible site-wide default.
   - Canonical URL: absolute, built from the base URL + the current path.
   - <meta name="robots" content="index, follow"> for public pages.
   - Open Graph tags: og:type (website, or "article" for blog posts), og:site_name,
     og:title, og:description, og:url, og:image.
   - Twitter Card tags: summary_large_image, twitter:title, twitter:description,
     twitter:image.
   - A default Open Graph / share image (ask me which asset to use).
   - An absolute-URL base (e.g. Next.js metadataBase, or absolute URLs in Flask).

2. A per-page title + description map/config so each route has its own title and
   description. Keep a default for anything not listed.

3. Blog/article pages (if the project has them) override the defaults per post:
   - og:type = "article"
   - description = the post's excerpt/summary
   - og:image / twitter:image = the post's featured image (absolute URL) when present
   - canonical = that post's URL

4. Private/admin pages: set <meta name="robots" content="noindex, nofollow">.

5. Site-wide head assets:
   - Favicons: <link rel="icon"> and <link rel="apple-touch-icon"> (use an existing logo
     if no dedicated favicon exists).
   - A web manifest (site.webmanifest) with name, short_name, icons, theme_color,
     background_color, and display: "standalone". Link it with <link rel="manifest">.
   - <meta name="theme-color">.
   - <html lang="en">.

6. robots.txt:
   - User-agent: *
   - Allow: /
   - Disallow private areas (e.g. /admin, /api/)
   - A Sitemap: <base URL>/sitemap.xml line.

7. sitemap.xml (generated, not hand-maintained):
   - Include each public page as a <url> with <loc>, <lastmod>, <changefreq>weekly</changefreq>,
     and <priority>.
   - Priority: home = 1.0, main public pages = 0.8, blog/article pages = 0.6.
   - For blog/article pages, set <lastmod> from the post's publish/updated date.
   - Exclude private/admin/auth/api routes.

8. Base URL config: read the production base URL from an environment variable
   (e.g. SITE_URL, or NEXT_PUBLIC_APP_URL for Next.js) with the production URL above as the
   default, so it's overridable per environment. Canonical, Open Graph URLs, and the sitemap
   must all use this base URL.

After implementing, verify it works (render the pages / hit the routes) and show me:
- The rendered <head> of the home page and one inner page,
- The generated sitemap.xml and robots.txt,
- A blog/article page's tags if the project has a blog.

Tell me clearly which parts you skipped or left as env-configurable (e.g. analytics).
```

> ⬆️ Copy to here

---

## Reference: what this produced in our projects

For context (you don't need to paste this part), here is the concrete setup the prompt
mirrors, from the `ez-subcontractor` (Next.js) reference and the `validator` (Flask) port.

### Per-page metadata helper
A single function/partial builds the `<head>` tags for every page:

- **Next.js** (`ez-subcontractor`): `buildRouteMetadata()` returns a Next `Metadata` object
  (title, description, `alternates.canonical`, `robots`, `openGraph`, `twitter`). The root
  `layout.tsx` sets `metadataBase`. Each route's `layout.tsx` calls `buildRouteMetadata({...})`.
- **Flask** (`validator`): an `inject_seo()` context processor exposes a `seo` object to every
  template; a shared `_seo_head.html` partial renders the tags. A `PAGE_META` dict holds each
  route's title + description. Blog posts override via `g.seo_title` / `g.seo_description` /
  `g.seo_image` / `g.seo_type = "article"`.

### Tag set rendered per page
`title`, `meta description`, `link canonical`, `meta robots`, Open Graph (`og:type`,
`og:site_name`, `og:title`, `og:description`, `og:url`, `og:image`), Twitter
(`summary_large_image`, title, description, image), favicons, apple-touch-icon,
`link manifest`, `meta theme-color`.

### Crawl files
- `robots.txt`: allow all, disallow `/admin` and `/api/`, link the sitemap.
- `sitemap.xml`: `<loc>` + `<lastmod>` + `<changefreq>weekly</changefreq>` + `<priority>`
  (home `1.0`, main pages `0.8`, blog posts `0.6`; blog `lastmod` from the post date).

### Config / base URL
- Next.js: `NEXT_PUBLIC_APP_URL` (default `https://ezsubcontractor.com`).
- Flask: `SITE_URL` env var (default was set to `https://usphonevalidator.com`).

### Deliberately NOT ported
- Google Analytics measurement ID and Google Search Console verification token were **not**
  copied to the `validator`, because they are specific to the source site and would report to
  the wrong property. They were left out / env-configurable. Do the same in any new project —
  use that project's own IDs.

### Design rule
SEO changes touch only `<head>`, crawl files, and config. The existing theme, colors, and
layout were never changed.
