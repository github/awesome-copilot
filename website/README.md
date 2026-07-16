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
