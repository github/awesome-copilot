# Awesome GitHub Copilot website

Astro + Starlight site published to <https://awesome-copilot.github.com/>.

## Local development

Run these from the **repository root** (they generate the data the site needs first):

```bash
npm run website:data    # generate public/data/*.json from repo content
npm run website:dev     # generate data + start the dev server
npm run website:build   # full production build
```

## Accessibility

The website has an automated axe-core + Playwright audit. Run it locally with `npm run website:a11y` from the repository root, or run `npm run a11y` from `website/` after building `dist` first.

CI blocks on critical and serious violations. Minor and moderate best-practice issues are reported as non-blocking.

Authoring conventions: resource cards use `div[role="listitem"]` wrappers, not `<article>`; only add `role="list"` to containers whose direct children are list items; do not nest interactive controls inside another focusable element; `.btn-primary` and ToC links must meet WCAG AA (4.5:1) contrast in both light and dark themes.

## Discovery and visual conventions

The landing page prioritizes the Learning Hub, with the repository as its
secondary destination. Resource cards and navigation reuse their catalog pages'
branded icons, with visible text labels. Resources without branded artwork keep
their Octicons. Repeated SVGs use instance-specific clipping IDs.
Resource-card CTAs reveal their border, expand with the arrow moving right, then
fade the label into the padded space. Labels fade out before collapse rather
than sliding through the border. Touch and narrow layouts keep labels visible;
reduced-motion preferences skip the transitions.
Expanded card buttons inset their labels past the rounded ends; the hero
button keeps Primer's default padding.
The secondary hero CTA uses Primer's theme-aware background tokens for its
rest, hover, and pressed states instead of fixed gray fills.
The resource grid stays single-column below 768px, uses two columns up to
1280px, then three columns. Nested card padding decreases on narrower layouts
so full CTA labels remain on one line without shrinking their text.
All pages share a centered maximum content width of 1280px. Responsive gutters
remain on smaller viewports; intermediate desktop widths cannot grow beyond
the same cap. Catalogs no longer break out 8px past each side of the frame.
The landing hero concentrates a green-tinted square grid and soft glow around
the lower center, fading toward the headline and side edges rather than covering
the panel uniformly. Its grid starts at the bottom edge and repeats upward, avoiding
a partial final row. Other heading panels use a static theme-token texture. Both treatments
are disabled in forced-colors mode.
The bottom learning panel links to YouTube and the GitHub Copilot docs; the
primary hero remains the entry point to the Learning Hub. Its outer frame shares
the banner's background token so the color reaches both side edges.
The shared footer pairs the GitHub wordmark with the official GitHub mark,
bundled locally as a theme-colored mask while retaining Primer's footer link.

The catalog's user-facing label is **Extensions**, including navigation,
breadcrumbs, and search result types. A canvas is the interactive panel an
extension can supply, and a plugin can package it with other resources.
Existing `/extensions/` and `/extension/<id>/` URLs, schema fields, and install
identifiers remain unchanged. Menu links and search group headings use the
same artwork as the cards, at a compact 16px size. Individual search results
omit redundant type labels and icons. The desktop Learning Hub
link stays text-only; its icon appears on the primary hero CTA instead.
Search groups use stronger headings and solid dividers between groups. Hover
and keyboard selection fill the entire result-row width while text remains inset.
Arrow, Home, and End navigation keep the selected result visible inside scrollable
panels without moving focus away from the search field.
Asynchronous result updates clear the active selection so reordered results cannot
silently change the destination selected by Enter.
Dropdown links that leave the site have a trailing external-link arrow, including
Hooks, Workflows, and Tools (local redirects to GitHub), and the mobile Contribute button.

Run the landing/navigation and reported image regressions against a built site:

```bash
node website/scripts/site-refinement-regression.mjs
node website/scripts/resource-card-layout-regression.mjs
node website/scripts/page-width-regression.mjs
node website/scripts/mobile-nav-regression.mjs
```

These browser regressions default to Astro's `http://127.0.0.1:4321`.
Set `SITE_BASE_URL` to target another development or production-preview server.
On PowerShell, use `$env:SITE_BASE_URL = 'http://127.0.0.1:4331'`.

The page-width regression measures shared content frames across homepage, catalogs,
contributors, resource details, and learning pages in both themes, including
intermediate desktop widths and reserved scrollbar space.

The mobile menu spans the actual header width (excluding scrollbars), with
content aligned to the wordmark and a scrollable panel on short screens.
The mobile navigation regression checks menu bounds, padding, icon consistency,
and keyboard behavior.

## Reading headers and catalog pagination

Resource details and learning articles let their expanded title, description,
and actions scroll away. On roomy desktop viewports, an observer reveals a
compact title with a small, right-aligned primary install action where available.
Its right edge aligns with the top bar's trailing actions.
The compact title is a visual duplicate hidden from assistive technology; the
original heading remains accessible, as does the compact install action.
The full install menu stays in the expanded hero. The strip fades in as the
remaining hero reaches the strip's height, without changing document height or
briefly exposing a bare progress line. Hidden install actions are inert.
The title releases on mobile, short viewports, and enlarged
text; anchor and sidebar offsets share its measured height. Back to top restores
heading focus and respects reduced motion. The green progress line celebrates
when the article's bottom is visible, consistently across resource details and
learning articles, rather than waiting for the footer or stopping at a heading.

All six catalogs share the pagination control alignment correction, preserving
Primer's current-page styling and the keyboard scroll/focus handoff to `#catalog`.
Only pagination activation triggers that handoff. Filter, sort, and search resets
do not move focus or scroll away from the control being used.
With the website running locally, run the focused browser regressions:

```bash
node website/scripts/reading-catalog-regression.mjs
node website/scripts/reading-header-regression.mjs
```

These use the same `SITE_BASE_URL` setting and default as the landing-page regressions.

## Security hardening notes

- The site ships with a baseline meta CSP and `referrer` policy in `src/components/Head.astro`.
- Because the site is hosted on GitHub Pages, response headers are not controllable in-repo. For stricter enforcement (for example, header-based CSP with nonce/hashes), place the site behind infrastructure that can set HTTP security headers.
- Markdown rendered for detail/file-browser experiences is sanitized with the shared `sanitizeHtml()` helper before insertion.

## Search locale

Both catalog and Pagefind results are scoped to the rendered page's `<html lang>`,
before grouping and result limits. English fallback pages search English even
when their URL has another locale prefix. Real translated pages do not mix in
English catalog records; without Pagefind, they show no results rather than
silently searching another language.
Each query inspects at most 48 Pagefind records, including locale misses and
duplicates; the returned-result limit still applies after filtering and merging.

Run `node --test website/scripts/search.test.mjs` for adapter coverage and
`node --test website/scripts/search-browser.test.mjs` after a production build
for desktop/mobile locale and search interaction coverage.

## Embedded markdown images

Standalone documentation images receive 24px of vertical margin through a
shared reading-content rule. The markdown sanitizer marks image-only blocks,
including linked images and themed pictures; inline icons and badge rows retain
their existing layout. Component-owned hero and gallery images are unaffected.

Resource details and skill/cookbook file previews resolve embedded `src` and
picture/image `srcset` URLs from the originating repository document directory
and revision, not the website route or locale. Canvas READMEs use the same
generated commit ref as their preview image; other curated documents use their
existing `main` source. Site-root `/images/...` assets and HTTP(S) images remain
valid, and ordinary image hyperlinks remain links.

External catalog entries do not currently fetch README bodies. Any future
cached external README must supply its actual raw repository base, revision,
and document path to `readResourceMarkdown`; its local cache filename is not
source provenance. Missing or invalid provenance for relative images is
reported and the image URL is removed rather than guessed. Sanitization still
runs on the resolved attributes.

Run focused media regressions from the repository root with Node 24 or later:

```bash
node --test website/scripts/markdown-images.test.mjs
```

## Social preview cards (LinkedIn, etc.)

Shared links render as large preview cards driven by Open Graph / Twitter meta tags.
LinkedIn (and most platforms) read **Open Graph** — primarily `og:image` — while Twitter/X
also uses `twitter:card=summary_large_image`. Most tags are produced automatically:

- **Starlight defaults** emit `og:title`, `og:description`, `og:url`, `og:type`,
  `og:site_name`, and `twitter:card=summary_large_image`.
- **`astro.config.mjs`** (global `head`) emits the shared image tags: `og:image`,
  `og:image:width`, `og:image:height`, `og:image:alt`, and `twitter:image`.
- **`src/components/Head.astro`** adds `twitter:title`/`description`, `og:image:secure_url`,
  `og:image:type`, and `twitter:image:alt`.

Each page's `title` and `description` (StarlightPage frontmatter) flow into the card text,
so keep them clear and benefit-focused.

### The image-dimension invariant

`og:image:width` / `og:image:height` in `astro.config.mjs` describe `public/images/social-image.png`
(currently **2400×1260**, ~1.91:1). Crawlers use these dimensions to understand the image and
may use them when selecting/rendering the preview. If you swap the image or add a per-page image
override, update the **full** image set so every tag stays consistent: `og:image`,
`og:image:width`, `og:image:height`, `og:image:alt`, and `twitter:image` (the last one matters
because `Head.astro` derives `og:image:secure_url` from `twitter:image` first).

### After deploying

LinkedIn caches scrapes aggressively. To force a refresh and confirm the card renders, run the
changed URL through the [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/).
HTML output alone doesn't prove the live card — verify the deployed image returns HTTP 200 over
HTTPS with `Content-Type: image/png` and no auth.
