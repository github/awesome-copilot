# Design: Upstream Website Replacement with Custom Astro UI

Replace Starlight with a static-first Astro UI ported from `awesome-copilot-jh`, while keeping `eng/generate-website-data.mjs`, `website/public/data/*.json`, markdown docs, CI paths, and `website/dist/` unchanged.

## Technical Approach

Use Astro pages/layouts/components only: no framework islands. Generated JSON is imported at build time for first render, embedded for client filters/search, and normalized through adapters before reaching UI components. Learning Hub markdown moves from Starlight routing to a native Astro `docs` collection with custom docs chrome.

## New `website/` Structure

```text
website/
├─ astro.config.mjs                 # Astro static config: sitemap, redirects, no Starlight
├─ package.json                     # remove Starlight/Pagefind unless re-added directly
├─ public/data/*.json               # unchanged generator output
├─ src/content/docs/**              # unchanged Learning Hub markdown
├─ src/content.config.ts            # Astro glob() docs loader + schema
├─ src/layouts/BaseLayout.astro     # head, header, footer, global CSS
├─ src/layouts/DocsLayout.astro     # sidebar, breadcrumbs, TOC, article shell
├─ src/components/layout/           # Header, Footer, DocsSidebar, Breadcrumbs, Toc
├─ src/components/ui/               # Button, Badge, Card, Icon, Container, 8BitButton
├─ src/components/resource/         # ResourceShell, FilterBar, ResultGrid, ResourceCard, FileModal
├─ src/components/sections/         # Hero, resource landing sections, CTA/Learning sections
├─ src/lib/
│  ├─ types.ts                      # user UI view models
│  ├─ upstream-types.ts             # raw generated JSON contracts
│  ├─ adapters/                     # raw JSON/docs → UI models
│  ├─ config/site.ts                # title, description, social image, edit URL
│  ├─ config/nav.ts                 # primary nav + docs sidebar map
│  └─ search/fuzzy.ts               # client fuzzy search helpers
└─ src/pages/                       # rewritten routes + llms.txt.ts
```

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Layout | Replace every `StarlightPage` with `BaseLayout`/`DocsLayout` | Removes Starlight while preserving semantic head, skip link, nav, footer, and slots. |
| Data | Direct JSON imports + embedded client payloads | Existing pages already import `public/data/*.json`; keeps static render and avoids build-time fetch. |
| Adapters | `src/lib/adapters/*` | Keeps upstream generator schemas untouched and isolates UI drift. |
| Docs | Astro `glob()` collection | Current Astro docs require explicit loaders; this replaces `docsLoader()`/`docsSchema()` cleanly. |
| Search | Client fuzzy search over generated resources + docs metadata | Removes Starlight/Pagefind coupling; Pagefind can be reintroduced later as a direct dependency if needed. |
| Styling | Port `awesome-copilot-jh` tokens/global CSS; delete `starlight-overrides.css` | Custom design becomes the source of truth; no Starlight variables remain. |

## Component Architecture

```text
BaseLayout
├─ Header(navItems)
├─ <slot /> page content
└─ Footer

ResourcePage
├─ ResourceShell(stats, title)
├─ FilterBar(client URL state)
├─ ResultGrid(ResourceCard[])
└─ FileModal(client, hash deep links)

DocsLayout
├─ DocsSidebar(nav tree)
├─ ArticleContent(rendered collection entry)
└─ Toc(headings 2-3)
```

User components map directly: `BaseLayout`, `Header`, `Footer`, `HeroSection`, `*Section`, and `ui/*` move from `awesome-copilot-jh`; demo constants are replaced by adapter outputs. Existing upstream pure components/scripts (`Modal`, `EmbeddedPageData`, page filter scripts, `marked`, `shiki`, `jszip`, `choices.js`) can be reused or wrapped by the new resource components.

## Data Flow

```text
eng/generate-website-data.mjs ──→ public/data/*.json ──→ upstream-types
                                                     └─→ adapters ──→ UI models
src/content/docs/**/*.md ──→ Astro docs collection ──→ docs adapter ──→ DocsLayout
UI models ──→ Astro HTML render ──→ embedded JSON ──→ client filters/search/modal
```

Catalog routes load their matching JSON (`agents.json`, `skills.json`, etc.) via direct imports. Adapters produce `ResultItem`, `ToolCard`, `ResourceFile`, cookbook models, and search records with safe fallbacks for `null`, empty arrays, missing configuration, and external plugins. Client hydration is limited to search/filter controls, URL sync, copy/share/download actions, and the file modal.

## Starlight Replacement Map

| Starlight feature | Replacement |
|---|---|
| `StarlightPage` | `BaseLayout` or `DocsLayout` |
| `docsLoader()` / `docsSchema()` | `glob({ base: './src/content/docs', pattern: '**/*.md' })` + Zod schema accepting existing frontmatter (`title`, `description`, `authors`, `lastUpdated`, `prev`, `next`, etc.) |
| Sidebar config | `src/lib/config/nav.ts` + `DocsSidebar.astro` |
| Pagefind integration | Remove for MVP; use fuzzy JSON/docs search. Delete `pagefind-resources.ts` unless standalone Pagefind is later chosen. |
| `virtual:starlight/user-config` | `src/lib/config/site.ts` |
| `Astro.locals.starlightRoute` | Layout props + content entry frontmatter + computed route metadata |

## Configuration and Dependencies

`astro.config.mjs` keeps `site`, `base: '/'`, `output: 'static'`, `trailingSlash: 'always'`, `build.assets`, sitemap, and `/samples/` redirect. Remove `starlight()` and Starlight chunk-warning comments. Keep `astro`, `@astrojs/sitemap`, `choices.js`, `front-matter`, `gray-matter`, `jszip`, `marked`, `shiki`. Remove `@astrojs/starlight`; remove `pagefind` unless added as a direct standalone search dependency later.

## File Changes

| File | Action | Description |
|---|---|---|
| `website/src/layouts/*` | Create | Custom site/docs shells. |
| `website/src/components/layout,ui,resource,sections/*` | Create/Modify | Port user UI and wrap upstream modal/filter behavior. |
| `website/src/lib/**` | Create | Types, adapters, nav/site/search config. |
| `website/src/pages/**` | Modify/Create | Rewrite home, catalog, docs, cookbook, contributors, `llms.txt`. |
| `website/src/content.config.ts`, `astro.config.mjs`, `package.json` | Modify | Remove Starlight and configure native Astro. |
| `starlight-overrides.css`, Starlight Head/Footer, `pagefind-resources.ts` | Delete/replace | Remove Starlight-only code. |

## Migration / Rollout

1. Add adapters/types/config and port UI primitives/styles.
2. Add `BaseLayout`; rewrite homepage and one catalog page as proof.
3. Convert remaining catalog pages and modal/search hydration.
4. Add `DocsLayout`, `glob()` collection, dynamic Learning Hub routes, cookbook parity.
5. Remove Starlight imports/dependency and stale CSS/integration.
6. Verify `npm run website:data`, `npm run website:build`, and `website/dist/` artifact upload paths.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | Adapters and null/empty fallback mapping | Add lightweight TS assertions or fixture smoke checks. |
| Build | Routes, docs collection, `llms.txt`, sitemap, assets | `npm run website:data` then `npm run website:build`. |
| Manual | Search, filters, modal, keyboard nav, responsive docs | Browser pass at 320px, tablet, desktop; validate focus and hash deep links. |

## Open Questions

- None blocking. Standalone Pagefind is intentionally deferred unless maintainers require full-text docs search parity.
