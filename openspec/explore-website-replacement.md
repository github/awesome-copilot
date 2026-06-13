# Exploration: Upstream `website/` Replacement with Custom Astro UI

> Generated: 2026-06-08
> Scope: Full inventory of `website/` directory for Astro + Starlight → custom Astro replacement

---

## 1. File Inventory Summary

### Configuration Files (4 files)

| File | Role |
|------|------|
| `astro.config.mjs` | Main Astro config — Starlight integration with sidebar, custom CSS, redirects, sitemap, pagefind integration, OG meta |
| `src/content.config.ts` | Content collection config — uses `docsLoader()` and `docsSchema()` from Starlight for MD docs |
| `package.json` | Dependencies: `@astrojs/starlight ^0.37.6`, `@astrojs/sitemap ^3.7.0`, `astro ^5.16.15`, `choices.js`, `front-matter`, `gray-matter`, `jszip`, `marked`, `shiki` |
| `tsconfig.json` | Extends `astro/tsconfigs/base` |
| `src/env.d.ts` | Standard Astro client types reference |

### Pages (10 files)

| File | Route | Data Source | Key Features |
|------|-------|-------------|--------------|
| `src/pages/index.astro` | `/` | `manifest.json` (counts), `search-index.json` (global search) | Hero, search bar, card grid with live counts, recent searches |
| `src/pages/agents.astro` | `/agents/` | `agents.json` | Search, multi-select filters (model, tool, handoffs), sort, modal |
| `src/pages/instructions.astro` | `/instructions/` | `instructions.json` | Search, filter by extension, sort |
| `src/pages/skills.astro` | `/skills/` | `skills.json` | Search, filter by category + hasAssets, sort |
| `src/pages/hooks.astro` | `/hooks/` | `hooks.json` | Search, filter by hook event + tags, sort |
| `src/pages/workflows.astro` | `/workflows/` | `workflows.json` | Search, filter by trigger, sort |
| `src/pages/plugins.astro` | `/plugins/` | `plugins.json` | Search, filter by tags, local + external plugins |
| `src/pages/tools.astro` | `/tools/` | `tools.json` | Search, filter by category (single-select), install buttons |
| `src/pages/contributors.astro` | `/contributors/` | Static HTML table | All-contributors table (hardcoded) |
| `src/pages/learning-hub/cookbook/index.astro` | `/learning-hub/cookbook/` | `samples.json` | Search, filter by language + tags, recipe cards |
| `src/pages/llms.txt.ts` | `/llms.txt` | JSON data + `getCollection("docs")` | LLM-readable index endpoint |

**All 9 resource pages + cookbook wrap content in `<StarlightPage>` with `template: "splash"`.**

### Components (8 files)

| File | Role | Starlight Deps |
|------|------|----------------|
| `src/components/Head.astro` | Custom head/meta override | Imports `@astrojs/starlight/components/Head.astro`, reads `Astro.locals.starlightRoute` |
| `src/components/Footer.astro` | Custom footer with theme toggle | Imports `EditLink`, `LastUpdated`, `Pagination`, `Icon` from Starlight; reads `virtual:starlight/user-config` |
| `src/components/Modal.astro` | File viewer modal (raw/render, copy, download, share, install) | None — pure custom |
| `src/components/PageHeader.astro` | Page title + description + contribute link | None — pure custom |
| `src/components/EmbeddedPageData.astro` | Embeds JSON data as `<script type="application/json">` | None — pure custom |
| `src/components/ContributeCTA.astro` | "Contribute yours" CTA at bottom of list pages | None — pure custom |
| `src/components/BackToTop.astro` | Scroll-to-top floating button | None — pure custom |
| `src/components/Icon.astro` | SVG icon renderer (18 icon types) | None — pure custom |
| `src/components/ThemeToggle.astro` | 3-state theme slider (dark/auto/light) | None — pure custom |

### Client Scripts (16 files)

| File | Role |
|------|------|
| `src/scripts/search.ts` | FuzzySearch class + global search index loader |
| `src/scripts/utils.ts` | 20+ utilities: fetch, download, clipboard, URLs, HTML generation, date formatting, dropdowns, toasts, debounce |
| `src/scripts/embedded-data.ts` | Reads embedded JSON from `<script>` tags, caches |
| `src/scripts/modal.ts` | Full modal logic: file fetching, Shiki highlighting, Markdown rendering, plugin views, deep linking, focus trap |
| `src/scripts/choices.ts` | Choices.js wrapper for multi-select filters |
| `src/scripts/jszip.ts` | Lazy JSZip loader for ZIP downloads |
| `src/scripts/pages/index.ts` | Homepage: search, recent searches, card counts |
| `src/scripts/pages/agents.ts` | Agents page: filters, search, Choices.js, URL state sync |
| `src/scripts/pages/agents-render.ts` | Server-side HTML rendering for agent list items |
| `src/scripts/pages/hooks.ts` | Hooks page logic (same pattern as agents) |
| `src/scripts/pages/hooks-render.ts` | Hooks HTML rendering |
| `src/scripts/pages/instructions.ts` | Instructions page logic |
| `src/scripts/pages/instructions-render.ts` | Instructions HTML rendering |
| `src/scripts/pages/plugins.ts` | Plugins page logic |
| `src/scripts/pages/plugins-render.ts` | Plugins HTML rendering |
| `src/scripts/pages/skills.ts` | Skills page logic |
| `src/scripts/pages/skills-render.ts` | Skills HTML rendering |
| `src/scripts/pages/samples.ts` | Cookbook page logic |
| `src/scripts/pages/samples-render.ts` | Cookbook HTML rendering |
| `src/scripts/pages/tools.ts` | Tools page logic |
| `src/scripts/pages/tools-render.ts` | Tools HTML rendering |
| `src/scripts/pages/workflows.ts` | Workflows page logic |
| `src/scripts/pages/workflows-render.ts` | Workflows HTML rendering |

### Styles (2 files)

| File | Role |
|------|------|
| `src/styles/global.css` | ~2000 lines — CSS variables (dark/light/auto), hero, cards, modals, filters, buttons, responsive, animations |
| `src/styles/starlight-overrides.css` | ~240 lines — Starlight color palette overrides, header styling, theme toggle positioning, Pagefind filter pill restyling |

### Integrations (1 file)

| File | Role |
|------|------|
| `src/integrations/pagefind-resources.ts` | Custom Astro integration — builds Pagefind index from HTML + resource records from `search-index.json`. Runs after Starlight's built-in pagefind. |

### Content (18 MD files)

| Directory | Files | Purpose |
|-----------|-------|---------|
| `src/content/docs/learning-hub/` | 12 articles | Fundamentals docs (agents, skills, instructions, MCP, hooks, workflows, etc.) |
| `src/content/docs/learning-hub/cli-for-beginners/` | 9 articles + index | Copilot CLI tutorial series |

These are Starlight-managed docs with YAML frontmatter. They use the `docs` collection defined in `content.config.ts`.

### Static Assets (`public/`)

| Path | Contents |
|------|----------|
| `public/_CNAME` | GitHub Pages CNAME file |
| `public/data/*.json` | 9 generated JSON files (agents, hooks, workflows, instructions, skills, plugins, tools, samples, search-index, manifest) |
| `public/fonts/` | MonaspaceArgonNF-Regular.woff2 |
| `public/images/` | Favicons, social image, copilot icons, ~60+ learning-hub tutorial images |

---

## 2. Data Contracts

All generated by `eng/generate-website-data.mjs` → `website/public/data/*.json`.

### `agents.json`
```
{
  items: [{
    id: string,              // filename without .agent.md
    title: string,
    description: string,
    model: string | null,
    tools: string[],
    hasHandoffs: boolean,
    handoffs: [{ label: string, agent: string }],
    mcpServers: string[],
    path: string,            // relative repo path
    filename: string,
    lastUpdated: ISO8601 | null
  }],
  filters: {
    models: string[],        // includes "(none)"
    tools: string[]
  }
}
```

### `skills.json`
```
{
  items: [{
    id: string,              // folder name
    name: string,
    title: string,           // humanized name
    description: string,
    assets: string[],
    hasAssets: boolean,
    assetCount: number,
    category: string,        // auto-categorized (Azure, Git & GitHub, Testing, etc.)
    path: string,
    skillFile: string,       // path to SKILL.md
    files: [{ path: string, name: string, size: number }],
    lastUpdated: ISO8601 | null
  }],
  filters: {
    categories: string[],
    hasAssets: ["Yes", "No"]
  }
}
```

### `plugins.json`
```
{
  items: [{
    id: string,
    name: string,
    description: string,
    path: string,
    tags: string[],
    itemCount: number,
    items: [{ kind: "agent"|"prompt"|"skill", path: string }],
    external: boolean,       // only for external plugins
    repository: string | null,
    homepage: string | null,
    author: { name, url } | null,
    license: string | null,
    source: { source, repo, path } | null,
    searchText: string,
    lastUpdated: ISO8601 | null
  }],
  filters: { tags: string[] }
}
```

### `hooks.json`
```
{
  items: [{
    id: string,              // folder name
    title: string,
    description: string,
    hooks: string[],         // event types (sessionStart, etc.)
    tags: string[],
    assets: string[],
    path: string,
    readmeFile: string,
    lastUpdated: ISO8601 | null
  }],
  filters: {
    hooks: string[],
    tags: string[]
  }
}
```

### `workflows.json`
```
{
  items: [{
    id: string,              // filename without .md
    title: string,
    description: string,
    triggers: string[],
    path: string,
    lastUpdated: ISO8601 | null
  }],
  filters: { triggers: string[] }
}
```

### `instructions.json`
```
{
  items: [{
    id: string,              // filename without .instructions.md
    title: string,
    description: string,
    applyTo: string | string[],  // raw frontmatter value
    applyToPatterns: string[],
    extensions: string[],
    path: string,
    filename: string,
    lastUpdated: ISO8601 | null
  }],
  filters: {
    patterns: string[],
    extensions: string[]     // includes "(none)"
  }
}
```

### `tools.json`
```
{
  items: [{
    id: string,
    name: string,
    description: string,
    category: string,
    featured: boolean,
    requirements: string[],
    features: string[],
    links: object,
    configuration: string | null,
    tags: string[]
  }],
  filters: {
    categories: string[],
    tags: string[]
  }
}
```

### `samples.json`
```
{
  cookbooks: [{
    id: string,
    name: string,
    description: string,
    path: string,
    featured: boolean,
    languages: [{ id, name, extension }],
    recipes: [{
      id: string,
      name: string,
      description: string,
      tags: string[],
      languages: string[],
      external: boolean,
      url: string | null,
      author: string | null,
      variants: { [langId]: { doc: string, example: string | null } }
    }]
  }],
  totalRecipes: number,
  totalCookbooks: number,
  filters: {
    languages: string[],
    tags: string[]
  }
}
```

### `search-index.json`
Array of unified search records:
```
[{
  type: "agent"|"instruction"|"hook"|"workflow"|"skill"|"plugin",
  id: string,
  title: string,
  description: string,
  path: string,
  tags?: string[],
  lastUpdated: ISO8601 | null,
  searchText: string         // pre-combined searchable text
}]
```

### `manifest.json`
```
{
  generated: ISO8601,
  counts: {
    agents, instructions, skills, hooks, workflows,
    plugins, tools, contributors, samples, total
  }
}
```

---

## 3. Starlight Dependency Map

### Direct Imports (14 files)

| File | Starlight Imports |
|------|------------------|
| `astro.config.mjs` | `starlight()` integration |
| `src/content.config.ts` | `docsLoader`, `docsSchema` |
| `src/pages/index.astro` | `StarlightPage` |
| `src/pages/agents.astro` | `StarlightPage` |
| `src/pages/instructions.astro` | `StarlightPage` |
| `src/pages/skills.astro` | `StarlightPage` |
| `src/pages/hooks.astro` | `StarlightPage` |
| `src/pages/workflows.astro` | `StarlightPage` |
| `src/pages/plugins.astro` | `StarlightPage` |
| `src/pages/tools.astro` | `StarlightPage` |
| `src/pages/contributors.astro` | `StarlightPage` |
| `src/pages/learning-hub/cookbook/index.astro` | `StarlightPage` |
| `src/components/Head.astro` | `Head.astro`, `Astro.locals.starlightRoute` |
| `src/components/Footer.astro` | `EditLink`, `LastUpdated`, `Pagination`, `Icon`, `virtual:starlight/user-config`, `Astro.locals.t()` |

### Starlight Features in Use

| Feature | Used By | Notes |
|---------|---------|-------|
| **StarlightPage** | All 9 resource pages + cookbook | Used with `template: "splash"`, `hasSidebar={false}` for custom pages |
| **Sidebar navigation** | `astro.config.mjs` | 5 groups: Browse Resources, Fundamentals, Reference, CLI for Beginners, Hands-on |
| **Docs collection** | `content.config.ts` | `docsLoader()` + `docsSchema()` with custom fields (authors, readingTime, tags, relatedArticles, prerequisites) |
| **Pagefind search** | `astro.config.mjs` + `pagefind-resources.ts` | Starlight's `pagefind: true` enables search UI; custom integration overwrites index |
| **Table of Contents** | `astro.config.mjs` | `minHeadingLevel: 2, maxHeadingLevel: 3` |
| **EditLink** | `Footer.astro` | Links to GitHub edit URL |
| **LastUpdated** | `Footer.astro` | Git-based dates |
| **Pagination** | `Footer.astro` | Prev/next page links (unused on splash pages) |
| **Head component** | `Head.astro` | Wraps Starlight's default Head |
| **i18n (`Astro.locals.t`)** | `Footer.astro` | Starlight translation system |
| **Custom CSS injection** | `astro.config.mjs` | `customCss: ["starlight-overrides.css", "global.css"]` |
| **OG meta tags** | `astro.config.mjs` | Head section with social image |
| **Redirects** | `astro.config.mjs` | `/samples/` → `/learning-hub/cookbook/` |
| **Sitemap** | `astro.config.mjs` | `@astrojs/sitemap` |

### What Breaks if Starlight is Removed

1. **All 9 pages** — `<StarlightPage>` wrapper provides layout, header, nav, footer
2. **Docs pages** — Starlight auto-renders MD files in `src/content/docs/` as routed pages (learning-hub articles, CLI tutorial)
3. **Sidebar** — Starlight generates sidebar from config; no manual nav component exists
4. **Header/navbar** — Starlight provides the site header; `Head.astro` and `Footer.astro` both depend on Starlight internals
5. **Pagefind search** — Custom integration assumes Starlight's pagefind is enabled and extends it
6. **i18n** — `Astro.locals.t()` is Starlight's translation system
7. **Content collections** — `docsLoader()` is Starlight-specific; need to switch to Astro's built-in `glob()` loader

---

## 4. Reuse Opportunities

### CAN be carried forward as-is (no Starlight deps)

| File | Why |
|------|-----|
| `src/components/Modal.astro` | Pure custom — file viewer, copy, download, ZIP, deep linking |
| `src/components/PageHeader.astro` | Pure custom — title + description + icon |
| `src/components/EmbeddedPageData.astro` | Pure custom — JSON embedding pattern |
| `src/components/ContributeCTA.astro` | Pure custom — CTA component |
| `src/components/BackToTop.astro` | Pure custom — scroll button |
| `src/components/Icon.astro` | Pure custom — SVG icon library |
| `src/components/ThemeToggle.astro` | Pure custom — 3-state theme switcher |
| `src/styles/global.css` | Pure custom — full design system, CSS variables, responsive |
| `src/scripts/search.ts` | Pure custom — FuzzySearch class |
| `src/scripts/utils.ts` | Pure custom — 20+ utilities |
| `src/scripts/embedded-data.ts` | Pure custom — embedded data reader |
| `src/scripts/modal.ts` | Pure custom — modal logic |
| `src/scripts/choices.ts` | Pure custom — Choices.js wrapper |
| `src/scripts/jszip.ts` | Pure custom — lazy JSZip |
| `src/scripts/pages/*.ts` (all 14 files) | Pure custom — page logic + render functions |
| `public/data/*.json` | Generated data — unchanged |
| `public/fonts/`, `public/images/` | Static assets — unchanged |
| `public/_CNAME` | GitHub Pages config |

### MUST be rewritten

| File | Why |
|------|-----|
| `astro.config.mjs` | Remove Starlight integration, add custom layout/nav |
| `src/content.config.ts` | Replace `docsLoader`/`docsSchema` with Astro `glob()` |
| `src/pages/*.astro` (all 10) | Replace `<StarlightPage>` wrapper with custom layout |
| `src/components/Head.astro` | Remove Starlight Head import, write custom meta |
| `src/components/Footer.astro` | Remove Starlight EditLink/Pagination/Icon imports |
| `src/integrations/pagefind-resources.ts` | Rewrite to build Pagefind index without Starlight |
| `src/styles/starlight-overrides.css` | Delete — no Starlight to override |

### MUST be preserved (content)

| Path | Why |
|------|-----|
| `src/content/docs/learning-hub/*.md` | 12 educational articles — must be rendered by new UI |
| `src/content/docs/learning-hub/cli-for-beginners/*.md` | 9 tutorial chapters — must be rendered by new UI |

---

## 5. Replacement Scope

### DELETE (12 files)
- `astro.config.mjs` (rewrite)
- `src/content.config.ts` (rewrite)
- `src/pages/index.astro` (rewrite)
- `src/pages/agents.astro` (rewrite)
- `src/pages/instructions.astro` (rewrite)
- `src/pages/skills.astro` (rewrite)
- `src/pages/hooks.astro` (rewrite)
- `src/pages/workflows.astro` (rewrite)
- `src/pages/plugins.astro` (rewrite)
- `src/pages/tools.astro` (rewrite)
- `src/pages/contributors.astro` (rewrite)
- `src/pages/learning-hub/cookbook/index.astro` (rewrite)
- `src/components/Head.astro` (rewrite)
- `src/components/Footer.astro` (rewrite)
- `src/integrations/pagefind-resources.ts` (rewrite)
- `src/styles/starlight-overrides.css` (delete)

### KEEP AS-IS (24 files)
- All 8 custom components (Modal, PageHeader, EmbeddedPageData, ContributeCTA, BackToTop, Icon, ThemeToggle)
- All 16 client scripts (search, utils, modal, choices, jszip, embedded-data, all page scripts)
- `src/styles/global.css`
- `tsconfig.json`, `src/env.d.ts`

### KEEP CONTENT (18 files)
- All 18 MD files in `src/content/docs/learning-hub/`

### KEEP DATA (10 files)
- All 9 JSON files in `public/data/` + `_CNAME`

### KEEP ASSETS (~70 files)
- Fonts, images, social images, tutorial screenshots

### KEY INSIGHT: The page architecture is uniform

Every resource page follows the same pattern:
1. Import `StarlightPage` + data JSON + components
2. Wrap content in `<StarlightPage>` with frontmatter
3. Render `<PageHeader>` + toolbar (search + filters) + results count + list + CTA
4. Import page-specific client script

This means a **single custom `<Layout>` component** can replace `<StarlightPage>` across all pages.

---

## 6. Risk Assessment

### Confirmed Risks from sdd-init-quality

| Risk | Assessment | Mitigation |
|------|-----------|------------|
| **Starlight removal** | CONFIRMED — 14 files directly import Starlight | Replace with custom `<Layout>` + `<Head>` + `<Nav>` + `<Footer>` |
| **Content collections** | CONFIRMED — `docsLoader` is Starlight-only | Switch to Astro's `glob()` content loader |
| **Data pipeline must stay** | CONFIRMED — `eng/generate-website-data.mjs` is untouched | No changes needed to generator |
| **Build output path** | CONFIRMED — CI expects `website/dist/` | Keep Astro's default output dir |
| **CI workflows** | CONFIRMED — both reference `./website` paths | No changes needed if directory preserved |
| **Pagefind integration** | CONFIRMED — custom integration extends Starlight's | Rewrite to build index from scratch without Starlight |
| **Learning hub content** | CONFIRMED — 18 MD files managed by Starlight | Render with Astro's built-in Markdown support |
| **No tests** | CONFIRMED — zero test files | Consider adding `astro build` smoke test |

### Additional Risks Discovered

1. **`Head.astro` reads `Astro.locals.starlightRoute`** — This is a Starlight internal. A custom Head component must compute meta tags from page frontmatter directly.

2. **`Footer.astro` reads `virtual:starlight/user-config`** — Starlight virtual module for config access. Need to replace with props or context.

3. **`Footer.astro` uses `Astro.locals.t()`** — Starlight's i18n system. If i18n isn't needed, replace with static strings. If needed, implement custom i18n.

4. **Pagefind integration depends on Starlight's search UI** — The custom `pagefind-resources.ts` runs after Starlight indexes HTML. Without Starlight, need to either:
   - Use Astro's built-in `@astrojs/partytown` or a standalone Pagefind setup
   - Use the existing client-side `FuzzySearch` (already works without Pagefind for the homepage)

5. **Learning Hub docs have Starlight-specific frontmatter** — Fields like `tableOfContents`, `editUrl` are Starlight-specific. Need to handle or strip them.

6. **`llms.txt.ts` uses `getCollection("docs")`** — This works with any Astro content collection, but the loader must change from `docsLoader()` to `glob()`.

---

## 7. Recommended Approach

### Phase 1: Create Custom Layout (highest leverage)

Create `src/layouts/BaseLayout.astro` that provides:
- `<head>` with meta tags (replaces `Head.astro` + Starlight's head)
- Site header/nav with sidebar (replaces Starlight's header + sidebar)
- `<slot />` for page content
- Footer with theme toggle (replaces `Footer.astro`)
- CSS: import `global.css` only (delete `starlight-overrides.css`)

This single component replaces `<StarlightPage>` across all 10 pages.

### Phase 2: Rewrite Pages

For each page:
1. Replace `import StarlightPage` with `import BaseLayout from "../layouts/BaseLayout.astro"`
2. Replace `<StarlightPage frontmatter={{...}}>` with `<BaseLayout title="..." description="...">`
3. Keep all existing content, components, scripts, and data imports unchanged

### Phase 3: Content Collections

Replace `src/content.config.ts`:
```ts
// Before (Starlight)
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

// After (Astro native)
import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const docs = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/docs" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    authors: z.array(z.string()).optional(),
    estimatedReadingTime: z.string().optional(),
    tags: z.array(z.string()).optional(),
    relatedArticles: z.array(z.string()).optional(),
    prerequisites: z.array(z.string()).optional(),
  }),
});
```

### Phase 4: Navigation & Sidebar

Build a custom `<Sidebar>` component from the sidebar config currently in `astro.config.mjs`. This is a static config — no runtime generation needed.

### Phase 5: Search

The site already has a working client-side `FuzzySearch` that uses `search-index.json`. The Pagefind integration is only needed for Starlight's search overlay. Options:
- **Option A**: Keep client-side FuzzySearch (already works for homepage), drop Pagefind entirely
- **Option B**: Set up standalone Pagefind without Starlight (more work, better search quality)

Recommendation: **Option A** for MVP. The FuzzySearch is already functional and used across all pages.

### Phase 6: Cleanup

- Delete `starlight-overrides.css`
- Remove `@astrojs/starlight` from `package.json`
- Remove `pagefind` dependency if going with Option A
- Keep: `@astrojs/sitemap`, `choices.js`, `front-matter`, `gray-matter`, `jszip`, `marked`, `shiki`

### Estimated Effort

| Phase | Effort | Risk |
|-------|--------|------|
| 1. Custom Layout | Medium | Low — straightforward Astro layout |
| 2. Rewrite Pages | Low | Low — mechanical replacement |
| 3. Content Collections | Low | Low — Astro native API |
| 4. Navigation | Low | Low — static config to component |
| 5. Search | Low | Low — already working |
| 6. Cleanup | Low | Low |

**Total: ~400-600 lines of new code, ~200 lines deleted, ~100 lines modified.**

---

## Summary

The upstream website is **heavily Starlight-dependent** (14 files import Starlight) but has a **clean separation** between Starlight-provided layout and custom business logic. All components, scripts, styles, and data handling are pure custom code with zero Starlight coupling.

The replacement is **straightforward**: create a custom layout, swap `<StarlightPage>` for `<BaseLayout>`, switch content collections to Astro's native `glob()` loader, and build a sidebar component from the existing config. The data pipeline (`eng/generate-website-data.mjs`) requires zero changes.
