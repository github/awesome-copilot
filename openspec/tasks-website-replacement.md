# Tasks: Upstream Website UI Replacement

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~2410 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 T001-T002, PR2 T003-T004, PR3 T005-T006, PR4 T007, PR5 T008-T009, PR6 T010-T011, PR7 T012 |
| Delivery strategy | ask-always |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

_Lines format: new/mod/del._

## Phase 1 — Foundation

| id | title | files | lines | depends_on | verification | phase |
|---|---|---|---|---|---|---|
| T001 ✅ | Add shared config/types skeleton | `website/src/lib/{types,upstream-types}.ts`, `config/{site,nav}.ts` | 90/20/0 | — | `npm run --prefix website build` still passes | PR1 |
| T002 ✅ | Port tokens, globals, base shell primitives | `website/src/styles/{tokens,global}.css`, `layouts/BaseLayout.astro`, `components/{layout,ui}/**` | 160/30/0 | T001 | New shell renders in a throwaway import; build stays green | PR1 |
| T003 ✅ | Add JSON adapters for manifest/resources/tools/samples | `website/src/lib/adapters/**` | 150/30/0 | T001 | Adapter smoke checks cover null/empty fields from generated JSON | PR2 |
| T004 ✅ | Add client runtime for fuzzy search, filters, URL state, modal state | `website/src/lib/search/fuzzy.ts`, `src/scripts/{search-client,filters,modal-client,url-state}.ts` | 120/40/10 | T001,T003 | Local smoke: URL hydration + hash open/close works without Starlight APIs | PR2 |

## Phase 2 — Shell + Pilot Routes

| id | title | files | lines | depends_on | verification | phase |
|---|---|---|---|---|---|---|
| T005 ✅ | Replace homepage with BaseLayout + hero/cards/search | `website/src/pages/index.astro`, `components/sections/**` | 110/50/20 | T002,T003,T004 | `/` shows counts, 2+ char search, keyboard result nav | PR3 |
| T006 ✅ | Build reusable catalog shell and migrate `/agents/` first | `components/resource/**`, `pages/agents.astro` | 150/50/20 | T002,T003,T004 | `/agents/` filters sync to URL; `#file=` opens modal | PR3 |

## Phase 3 — Remaining Catalog Pages

| id | title | files | lines | depends_on | verification | phase |
|---|---|---|---|---|---|---|
| T007 | Migrate instructions + skills pages | `pages/{instructions,skills}.astro` | 130/80/30 | T006 | Skills modal defaults to `SKILL.md` and switches bundled files | PR4 |
| T008 | Migrate hooks + workflows pages | `pages/{hooks,workflows}.astro` | 110/70/20 | T006 | Hook/workflow filters, sorting, modal actions all work | PR5 |
| T009 | Migrate plugins, tools, contributors pages | `pages/{plugins,tools,contributors}.astro` | 120/60/20 | T006 | Tools stay inline-only; contributors render statically | PR5 |

## Phase 4 — Learning Hub

| id | title | files | lines | depends_on | verification | phase |
|---|---|---|---|---|---|---|
| T010 | Replace Starlight docs loader and docs chrome | `src/content.config.ts`, `layouts/DocsLayout.astro`, `components/layout/{DocsSidebar,Breadcrumbs,Toc}.astro` | 130/40/20 | T001,T002,T003 | Existing markdown builds with sidebar, breadcrumbs, TOC, edit link | PR6 |
| T011 | Add Learning Hub routes, cookbook, and `llms.txt` | `pages/learning-hub/**`, `pages/llms.txt.ts` | 140/50/20 | T010,T004 | `/learning-hub/`, article routes, cookbook filters, `/llms.txt` all build | PR6 |

## Phase 5 — Cleanup + Integration

| id | title | files | lines | depends_on | verification | phase |
|---|---|---|---|---|---|---|
| T012 | Remove Starlight and dead code; verify CI/artifacts | `website/{astro.config.mjs,package.json}`, delete `src/{components,scripts,integrations}/legacy*`, `styles/starlight-overrides.css`, check `.github/workflows/{build-website,deploy-website}.yml` | 30/70/160 | T005-T011 | `npm run website:data && npm run website:build`; output stays `website/dist/` | PR7 |

## Suggested PR Slices

- PR1 Foundation: T001-T002
- PR2 Runtime/Data: T003-T004
- PR3 Home + Agents pilot: T005-T006
- PR4 Skills/Instructions: T007
- PR5 Hooks/Workflows/Plugins/Tools/Contributors: T008-T009
- PR6 Learning Hub + llms: T010-T011
- PR7 Cleanup/CI: T012

If maintainers accept mixed old/new UI landing incrementally, use **stacked-to-main**. If they want the redesign hidden until the chain is complete, use **feature-branch-chain**.
