# Proposal: Replace upstream `website/` with custom Astro UI

This change swaps the current Starlight site for the user's Astro UI from `awesome-copilot-jh`, while keeping upstream data generation, learning content, and CI paths intact. The goal is visual and architectural replacement without breaking the upstream content/data contract.

## Intent

Use the user's complete UI system for browsing resources and docs, but populate it from upstream JSON and markdown so `website/dist/` and the `staged` deployment flow stay unchanged.

## Scope

### In Scope
- Replace Starlight layout, pages, nav, sidebar, footer, and search UI.
- Preserve `eng/generate-website-data.mjs`, `public/data/*.json`, docs markdown, assets, and `llms.txt`.
- Add adapters so user UI components consume upstream data safely.

### Out of Scope
- Changing JSON generator schemas.
- Rewriting repository content outside `website/`.
- Net-new resource types.

## Capabilities

### New Capabilities
- `website-ui-shell`: Custom layout, header, footer, route shell, SEO, and theme.
- `resource-browser`: User UI pages fed by upstream agents/instructions/skills/hooks/workflows/plugins/tools/search data.
- `learning-hub-rendering`: Custom docs chrome for upstream markdown, sidebar, breadcrumbs, TOC, edit links.

### Modified Capabilities
- None.

## Architecture

```text
website/
├─ public/data/            # unchanged upstream generator output
├─ src/layouts/            # new BaseLayout + docs/resource shells
├─ src/components/ui/      # user UI primitives
├─ src/components/sections/# user section/page modules
├─ src/lib/
│  ├─ upstream-types.ts    # raw JSON contracts
│  ├─ adapters.ts          # normalize raw data -> UI view models
│  └─ nav/docs-config.ts   # sidebar + route metadata
├─ src/content/docs/       # unchanged upstream learning hub markdown
├─ src/pages/              # rewritten routes using custom UI
└─ src/content.config.ts   # Astro glob() loader, not docsLoader()
```

## Data Bridge

Adopt a **hybrid** bridge: keep upstream schemas as source of truth, add a thin normalization layer for UI view models.

| Upstream source | UI target | Bridge |
|---|---|---|
| `agents.json` | `ResultItem` + detail props | map `model/tools/handoffs/path/lastUpdated` |
| `instructions.json` | `ResultItem` | derive label/tags from `extensions/applyToPatterns` |
| `skills.json` | `ResultItem` + file viewer | map `files/assets/category/skillFile` |
| `hooks/workflows/plugins.json` | `ResultItem` | normalize event/tag/itemCount fields |
| `tools.json` | `ToolCard` | direct map with config/links/features |
| `search-index.json` | global search items | keep unified index; adapt labels/routes |
| markdown docs | learning article model | use Astro collection entries + frontmatter |

## Component Map

| User UI | Upstream data |
|---|---|
| `BaseLayout`, `Header`, `Footer` | manifest + static nav/docs config |
| `HeroSection` | `manifest.json` + `search-index.json` |
| `*Section.astro` resource pages | matching `*.json` datasets |
| `[slug].astro` detail pages / file viewer | repo file paths from JSON |
| `LearningSection` pattern | `src/content/docs/**` |

## Approach

Copy the user's UI primitives, sections, and styles into upstream `website/`, then rewrite pages around adapters instead of demo constants. Replace Starlight with custom Astro layouts, native content collections via `glob()`, and standalone docs navigation. Keep client-side search/filter behavior; Pagefind becomes optional and can be dropped for MVP.

## Migration Plan

1. Add adapters/types/config beside current site.
2. Port UI shell and resource pages behind custom layouts.
3. Switch content collections and docs routes off Starlight.
4. Preserve `/llms.txt`, cookbook, and `website/dist/` build.
5. Remove Starlight deps/config after parity verification.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `website/astro.config.mjs` | Modified | remove Starlight, keep sitemap/build paths |
| `website/src/content.config.ts` | Modified | `glob()` docs loader |
| `website/src/pages/**` | Modified | rewrite routes with custom UI |
| `website/src/layouts/**`, `src/lib/adapters.ts` | New | shell + normalization layer |
| `website/src/components/**`, `src/styles/**` | New/Modified | imported user UI, remove Starlight overrides |
| `website/package.json` | Modified | drop `@astrojs/starlight`; review Pagefind need |

## Files Changed (estimate)

~18 new files / 700-900 LOC, ~12 rewritten files / 500-700 LOC, ~3 deleted files / 250 LOC.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| UI types drift from generator output | Med | raw contract types + adapter tests/smoke fixtures |
| Learning hub parity gaps | Med | port sidebar/breadcrumb/TOC/edit-link before cutover |
| Search regression after Starlight removal | Med | keep `search-index.json` FuzzySearch as baseline |
| Build/deploy breakage | Low | keep `website/` root and validate `astro build` => `website/dist/` |

## Rollback Plan

Revert the `website/` replacement commit set, restore Starlight config/pages/dependency, and rerun existing build on `staged`.

## Dependencies

- Existing upstream data generator and docs markdown
- User UI source from `/home/jhonh/Code/awesome-copilot-jh`

## Decision Points

- Keep standalone Pagefind, or ship MVP with existing JSON/FuzzySearch only.
- Prefer modal-based file preview parity, or keep detail pages as the primary UX.
- Decide whether contributors/cookbook use imported custom sections or lighter wrappers.

## Success Criteria

- [ ] `website/` uses the user's UI while consuming upstream JSON/markdown unchanged.
- [ ] Learning Hub articles render in custom docs chrome without Starlight.
- [ ] `astro build` still outputs `website/dist/` and PRs remain targetable to `staged`.
