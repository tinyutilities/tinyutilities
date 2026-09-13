# TinyUtility SEO Audit

Production domain: `https://tinyutility.space` · Separate property: `https://hub.tinyutility.space` (external, not part of this sitemap)

This document is the internal record of the SEO/search-visibility pass performed on this
codebase: what was found, what was changed, and why. It is not published on the site.

**Update (Phase 2 — content/search-intent pass):** the technical work below (§1–§7) was a
prior pass and is unchanged. A second pass then focused specifically on tool-page *content* —
adding a short intent-driven intro with contextual internal links and a real-scenario "Use
cases" section to all 9 tool pages, rendering `toolCategories[].description` on `/tools` (it
existed in code but was never actually displayed), and removing `FAQPage` structured data
site-wide (kept the visible FAQs — see the chat report for that session for the full rationale
and verification).

---

## 1. Findings at the start of this pass

The good news first: the site's *foundations* were already largely correct. `siteUrl` in
`src/lib/seo.ts` was already `https://tinyutility.space` (not a placeholder/staging domain),
`robots.ts` already allowed `/` and pointed at the sitemap, and `sitemap.ts` already listed only
real, canonical production URLs with no hash fragments, no `localhost`, and no invented routes.
Several tool pages already had genuinely good, honest content (accurate limitations stated,
no fabricated stats). That meant this pass was about closing real, specific gaps rather than
rebuilding technical SEO from zero.

Concrete problems found:

| # | Finding | Severity |
|---|---|---|
| 1 | 2 of 9 tool pages (Image to PDF, Password Generator) had no dedicated `<title>`/description — they fell through to a generic template reusing the on-page description verbatim as the meta description. | P1 |
| 2 | Structured data (`WebApplication` + `FAQPage`) existed for exactly **1 of 9** tools (PDF Compressor). The other 8 had none. | P1 |
| 3 | No `BreadcrumbList` anywhere, and no visible breadcrumb trail — only a single "Back to tools" link on tool pages. | P1 |
| 4 | No Open Graph image existed anywhere in the project — `openGraph.images` was never set. Every shared link would render with no preview image. | P1 |
| 5 | Root `layout.tsx` metadata was a generic placeholder (`title: "TinyUtility"`, `description: "A modern utility platform."`) with no `metadataBase`. | P1 |
| 6 | `keywords: [...]` arrays were passed into `Metadata` on 7 tool pages, rendering an actual `<meta name="keywords">` tag. Google has not used this tag for ranking in over a decade, and current guidance treats a stuffed keyword list as a spam signal, not a benefit. | P1 |
| 7 | Homepage `<h1>` was literally just the brand name ("TinyUtility"); the actually-descriptive sentence ("Free online utilities for images, PDFs, text...") was a plain paragraph below it. | P1 |
| 8 | `sitemap.ts` stamped every URL with `new Date()` computed at build time — every page's `lastmod` reads as "built today," regardless of whether that page's content actually changed. | P1 |
| 9 | No custom `not-found.tsx` — Next's generic default was the only 404 experience. | P2 |
| 10 | `hub.tinyutility.space` was not linked anywhere on the site. | P2 |
| 11 | `pdf-merger-tool.tsx` statically `import`ed `pdf-lib` at module scope (unlike `pdf-compressor-tool.tsx`, which correctly lazy-loads it) — a genuinely large dependency loaded eagerly instead of only when a user actually merges a PDF. | P2 (performance) |
| 12 | `twitter.card` was `"summary"` (small square preview) everywhere, and there was no image to attach to it anyway (see #4). | P2 |
| 13 | Footer's Privacy/Terms links (`href="#privacy"`, `href="#terms"`) have no matching page or in-page anchor anywhere — they resolve to nothing. **Not fixed** (see §11 — no Privacy/Terms pages exist, and inventing legal text was explicitly out of scope). | P2 (pre-existing, documented) |
| 14 | `src/features/blog/blog-data.ts` correctly holds zero posts and the blog page's empty state is honest — no fabricated articles. No change needed; confirmed as correct. | — (verified fine) |
| 15 | `src/components/tools/tool-page-layout.tsx` is dead code (imported nowhere). Left alone — unrelated to SEO, deleting it wasn't requested. | Note only |
| 16 | `landing-data.ts`'s exported `popularTools` array is dead code (nothing imports it); the real "Popular Tools" section on the homepage correctly uses live tool data instead. Left alone. | Note only |

Nothing rose to true **P0** (no accidental `noindex`, no blocked crawling, no wrong domain, no
broken sitemap/robots, no nonexistent URLs in the sitemap). The most serious real issues were
P1: thin/duplicate metadata coverage, missing structured data, and no social preview image.

---

## 2. What changed

See the final chat report for the full file-by-file list. In summary: metadata architecture
(`src/lib/seo.ts`, root layout), a real Open Graph image (`src/app/opengraph-image.tsx`),
per-tool structured data generalized to all 9 tools, breadcrumbs (visible + matching JSON-LD),
homepage `Organization`/`WebSite` JSON-LD, the two missing tool `<title>`/description pairs,
removal of the meta-keywords tag site-wide, the homepage H1 fix, git-derived sitemap
`lastmod`, a custom `not-found.tsx`, the Hub footer link, and the `pdf-lib` lazy-load fix in
PDF Merger.

**Deliberately not done:** true per-tool JS code-splitting via `next/dynamic`. This was
attempted and then reverted after build inspection proved it doesn't actually split the
bundle — see §11 (Performance) for why, and why the fix would require a larger architectural
change than this pass's scope allows.

---

## 3. Search-intent table

All copy already existed and was judged accurate before this pass; this pass did not rewrite
tool descriptions, only added/fixed the *metadata* wrapping them (title/description/structured
data) and, for 2 tools, added metadata that didn't exist. "Recommended" is blank where the
existing value was already good.

| URL | Type | Primary intent | Title (final) | H1 | Canonical | Structured data | Priority |
|---|---|---|---|---|---|---|---|
| `/` | Home | Brand / discovery ("browser tools", "free online tools") | TinyUtility \| Free Online Tools | *"Free online utilities for images, PDFs, text, developers and everyday productivity."* | `/` | Organization, WebSite | P1 |
| `/tools` | Directory hub | Browse/compare all tools | Tools \| TinyUtility | "Find the right utility fast." | `/tools` | — (see §7) | P1 |
| `/tools/image-compressor` | Tool | "compress image online", "reduce image file size" | Free Image Compressor \| TinyUtility | Image Compressor | `/tools/image-compressor` | WebApplication, FAQPage, BreadcrumbList | P0 (flagship) |
| `/tools/image-converter` | Tool | "jpg to png", "convert image format" | Free Image Converter \| TinyUtility | Image Converter | `/tools/image-converter` | same | P1 |
| `/tools/image-to-pdf` | Tool | "image to pdf", "jpg to pdf" | Free Image to PDF Converter \| TinyUtility *(new)* | Image to PDF | `/tools/image-to-pdf` | same *(new)* | P1 |
| `/tools/pdf-merger` | Tool | "merge pdf", "combine pdf files" | Free PDF Merger \| TinyUtility | PDF Merger | `/tools/pdf-merger` | same | P0 (flagship) |
| `/tools/pdf-compressor` | Tool | "compress pdf", "reduce pdf size" | Free PDF Compressor \| TinyUtility | PDF Compressor | `/tools/pdf-compressor` | same | P0 (flagship) |
| `/tools/password-generator` | Tool | "password generator", "generate strong password" | Free Password Generator \| TinyUtility *(new)* | Password Generator | `/tools/password-generator` | same *(new)* | P1 |
| `/tools/qr-code-generator` | Tool | "qr code generator" | Free QR Code Generator \| TinyUtility | QR Code Generator | `/tools/qr-code-generator` | same | P1 |
| `/tools/word-counter` | Tool | "word counter", "character counter" | Free Word Counter \| TinyUtility | Word Counter | `/tools/word-counter` | same | P1 |
| `/tools/json-formatter` | Tool | "json formatter", "json validator" | Free JSON Formatter \| TinyUtility | JSON Formatter | `/tools/json-formatter` | same | P1 |
| `/about` | Info | Brand trust / "what is TinyUtility" | About TinyUtility | About TinyUtility | `/about` | — | P2 |
| `/pricing` | Info | "is TinyUtility free" | Pricing \| TinyUtility | Simple tools. No subscription required. | `/pricing` | — | P2 |
| `/blog` | Hub (empty) | Future: "how does X work" explainers | Blog \| TinyUtility | Notes on tools, privacy, and building calmly. | `/blog` | — | P3 |
| `/contact` | Info | "contact TinyUtility" | Contact \| TinyUtility | Have something to say? | `/contact` | — | P3 |

Secondary phrases and common questions per tool are already reflected naturally in each tool's
existing FAQ (`src/app/tools/[slug]/page.tsx`) — e.g. Image Compressor's FAQ already covers format
support, batch compression, EXIF stripping, and transparency, which is exactly the kind of
secondary-intent coverage a keyword list would have tried to force artificially. No page needed
new keyword-driven copy; the fix here was metadata plumbing, not content rewriting.

---

## 4. Structured data — what's included and why

Every tool page now emits one `@graph` with:

- **`WebApplication`** — `name`, `url`, `applicationCategory: "UtilitiesApplication"`,
  `operatingSystem: "Any (runs in the browser)"`, `offers: {price: "0"}` (true — nothing on
  this site costs money), and `description` (the same one shown on the page). No
  `aggregateRating`, no `review`, no download counts — none of that exists for this product.
- **`BreadcrumbList`** — generated from the exact same array that renders the visible
  breadcrumb trail (`src/components/tools/breadcrumbs.tsx`), so it can never drift out of sync
  with what a user actually sees.
- **`FAQPage`** — only emitted when the tool has real, visible FAQ content (all 9 currently do).

The homepage adds `Organization` (name, url, logo — the real brand icon, `sameAs` — the real
X profile) and a minimal `WebSite` entry. No `SearchAction` — the site has a client-side filter
box on `/tools`, not a URL-parameterized search endpoint, so claiming one would be false.

**Known limitation, stated plainly:** Google restricted FAQ rich-result eligibility in August
2023 to a small set of sites it considers authoritative (mostly government/health). Including
truthful `FAQPage` markup here is still correct practice — it's valid, matches visible content,
and may help LLM-based answer engines and other consumers of structured data — but it should
**not** be expected to produce a visible FAQ rich snippet in classic Google search results.

---

## 5. What was NOT done, and why

- **No Privacy Policy / Terms pages created.** They don't exist in the repo. The footer's
  `#privacy`/`#terms` links are dead (no target). Inventing legal text was explicitly out of
  scope for this task — flagged here as a real, user-facing broken link that needs a decision:
  either write real pages, or remove the links until they exist.
- **No per-tool Open Graph images.** One strong, accurate, on-brand global image
  (`src/app/opengraph-image.tsx`) covers every page. Nine near-identical bespoke images would
  be maintenance overhead for negligible benefit, per the task's own guidance.
- **No blog articles.** The blog stays an honest, empty, but clearly-purposed page. Writing
  filler articles to "have content" would be exactly the kind of low-value content Google's
  guidance warns against.
- **No true per-tool JS bundle splitting.** See §11.
- **`/tools/[slug]` has no page-level structured data of its own beyond what each tool
  contributes** — there's no separate `CollectionPage` schema on the directory, since the
  existing `ItemList`-shaped content (category groups of tool cards) is already fully
  crawlable as plain HTML links and doesn't need a schema wrapper to be understood.

---

## 6. Performance (Phase 17)

- **Confirmed via inspection of the actual `.next/static/chunks` output**, not assumption:
  `pdf-lib` (≈440 KB) is correctly isolated into its own separately-loaded chunk, downloaded
  only when a user actually adds/merges/compresses a PDF — for both PDF tools, now. Before
  this pass, PDF Merger's top-level `import { PDFDocument } from "pdf-lib"` would have forced
  that same 440 KB into that page's synchronous bundle; it's now behind the same lazy
  `loadPdfLib()` pattern PDF Compressor already used correctly.
- **Attempted and reverted:** wrapping each of the 9 tool components in `next/dynamic()` to
  give each generated tool page its own JS chunk. After rebuilding and grepping the actual
  output files, this did **not** work — all 9 tools' component code still landed in the single
  shared `[slug]/page-*.js` chunk (verified: text unique to `WordCounterTool`, e.g. "Reading
  Time," is present in that one shared chunk regardless of which tool a visitor opens). This
  appears to be a structural consequence of one dynamic route file
  (`src/app/tools/[slug]/page.tsx`) serving all 9 static pages via `generateStaticParams` —
  they all hydrate from the same compiled client module, so `next/dynamic` has no separate
  per-page bundle to split into. A real fix would mean giving each tool its own static route
  file (`/tools/image-compressor/page.tsx`, etc.) instead of one dynamic `[slug]` route — a
  genuine architecture change, out of scope for "make targeted, maintainable changes." Reverted
  to plain imports rather than ship complexity with no measured benefit.
- Everything else (dynamic `import("qrcode")`, `pdf-lib` in PDF Compressor, `images.unoptimized:
  true` for the static export, no third-party scripts, no client-side analytics) was already in
  good shape and was left alone.

---

## 7. Remaining recommendations (not implemented this pass)

1. **Privacy/Terms decision** (see §5) — highest-priority remaining item, since it's a live
   broken link a user can click today.
2. If tool-page bundle size becomes a real, measured problem (check real-user Core Web Vitals
   in Search Console once traffic exists), consider splitting `/tools/[slug]` into 9 static
   route files to get genuine per-tool code-splitting. Don't do this speculatively.
3. Consider a `CollectionPage`/`ItemList` schema for `/tools` if/when the catalog grows large
   enough that Google might benefit from an explicit listing structure — not needed at 9 tools.
4. When the first real blog post is written, re-add `src/app/blog/[slug]/page.tsx` (removed
   earlier because `output: "export"` requires `generateStaticParams` to return at least one
   path) and evaluate `Article` structured data for it then, truthfully (real author, real date).
