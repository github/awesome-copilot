# Specification: Upstream Website UI Replacement

This specification defines the required behavior for replacing the upstream Astro + Starlight `website/` UI with the custom Astro UI from `awesome-copilot-jh`, while preserving the upstream data generator and generated JSON data contract.

## Scope and Contract

### Requirement: Preserve upstream data pipeline

The replacement UI MUST consume the generated files in `website/public/data/` as the source of truth. The implementation MUST NOT require schema changes in `eng/generate-website-data.mjs`.

#### Scenario: Data generation remains compatible
- GIVEN the upstream generator runs successfully
- WHEN `astro build` is executed from `website/`
- THEN the UI loads catalog data from `public/data/*.json`
- AND no route requires data that is absent from the generated contract

#### Scenario: Missing optional fields
- GIVEN a generated item has `null`, an empty array, or a missing optional field
- WHEN adapters create UI view models
- THEN the UI renders safe fallbacks without throwing client or build errors

## Route and Page Requirements

### Requirement: Homepage `/`

The homepage MUST render a hero, global search, GitHub link, and navigation cards for Agents, Instructions, Skills, Hooks, Workflows, Plugins, Tools, and Learning Hub.

| Aspect | Specification |
|---|---|
| Data | `search-index.json`, `manifest.json` |
| Features | Global fuzzy search after 2+ chars, keyboard navigation, result selection, live card counts |
| State | Search input is local state; selected result navigates to section route with modal hash when applicable |
| UI | Hero, search box, result popover, resource cards, GitHub CTA |

#### Scenario: Global search opens a resource
- GIVEN a user types a matching query in the global search
- WHEN the user presses Down Arrow and Enter on a result
- THEN the browser navigates to the result type page
- AND file-backed results include `#file=<encoded path>`

### Requirement: Catalog listing pages

Each catalog page MUST load its matching JSON file, render searchable/filterable cards, synchronize supported filters to the URL, and use the shared file viewer modal when the resource has a file path.

| Route | Data source | Search | Filters | Sort | Detail behavior |
|---|---|---|---|---|---|
| `/agents/` | `agents.json` | `title`, `description`, `searchText/tools` | `model` multi, `tool` multi, `handoffs` flag | name, recently updated | Open `.agent.md` modal |
| `/instructions/` | `instructions.json` | `title`, `description`, `applyTo` | `extension` multi | name, recently updated | Open `.instructions.md` modal |
| `/skills/` | `skills.json` | `title`, `description`, `category` | `category` multi, `hasAssets` flag | name, recently updated | Open `SKILL.md` modal with file switcher |
| `/hooks/` | `hooks.json` | `title`, `description`, `hooks`, `tags` | `hook` multi, `tag` multi | name, recently updated | Open `README.md` modal |
| `/workflows/` | `workflows.json` | `title`, `description`, `triggers` | `trigger` multi | name, recently updated | Open workflow markdown modal |
| `/plugins/` | `plugins.json` | `name`, `description`, `tags`, `searchText` | `tag` multi | name | Open plugin modal |
| `/tools/` | `tools.json` | `name`, `description`, `tags`, `features` | `category` single | featured first, then name | Inline card only; no file modal |

#### Scenario: URL filter hydration
- GIVEN `/agents/?q=review&model=gpt-4o&tool=github&handoffs=1&sort=lastUpdated`
- WHEN the page initializes
- THEN matching filters, search text, and sort are applied before first interactive render
- AND the visible count reflects the filtered result set

#### Scenario: URL filter synchronization
- GIVEN a user changes filters on any catalog page
- WHEN results are recalculated
- THEN the page updates the URL using `history.replaceState`
- AND repeated query params are used for multi-select values

#### Scenario: Empty filtered state
- GIVEN active filters match no resources
- WHEN the result list renders
- THEN an accessible empty state appears
- AND a clear-filters action resets search, filters, sort, and URL params

### Requirement: Contributors `/contributors/`

The contributors page MUST render the upstream all-contributors content as a static responsive grid or table without requiring a generated JSON data file.

#### Scenario: Contributor content displays statically
- GIVEN contributor markup exists in the page source
- WHEN `/contributors/` is visited
- THEN avatars, names, and profile links render without client-side data fetches

### Requirement: Learning Hub `/learning-hub/` and article routes

The Learning Hub MUST render upstream markdown articles from `src/content/docs/learning-hub/` in custom documentation chrome without Starlight.

| Aspect | Specification |
|---|---|
| Data | Astro `docs` content collection loaded from markdown files |
| Routes | `/learning-hub/`, nested article routes, `/learning-hub/cookbook/` |
| UI | Docs sidebar, breadcrumbs, article body, generated TOC, edit link, prev/next links |
| Search | Standalone Pagefind when enabled; otherwise global/resource fuzzy search remains functional |
| Cookbook | `/learning-hub/cookbook/` uses `samples.json` with language/tag filters |

#### Scenario: Article render without Starlight
- GIVEN a markdown article with frontmatter and headings
- WHEN the article route builds
- THEN the custom docs layout renders title, description, content, breadcrumbs, TOC, and edit link

### Requirement: LLM endpoint `/llms.txt`

The `/llms.txt` route MUST return `text/plain; charset=utf-8` and include overview, Learning Hub articles, Agents, Instructions, Skills, Documentation, and Repository sections.

#### Scenario: LLM endpoint includes generated resources
- GIVEN agents, instructions, skills, and docs exist
- WHEN `/llms.txt` is requested
- THEN the response lists each item as markdown links with normalized descriptions
- AND raw repository links are used for file-backed resources

## Data Adapter Requirements

### Requirement: Normalize upstream JSON to UI view models

Adapters MUST keep raw upstream types separate from UI target types and map them into `ResultItem`, `ToolCard`, `ResourceFile`, and `SkillSection` view models.

| Source | Upstream fields | Target type | Transformation rules | Edge cases |
|---|---|---|---|---|
| `agents.json` | `id,title,description,model,tools,hasHandoffs,handoffs,mcpServers,path,filename,lastUpdated` | `ResultItem` | `slug=id`, `label="Agent"`, `tags=[model?, tools up to display policy, handoffs?]`, `detail=path`, `model`, `tools`, `handoffs` labels | `model=null` maps to `(none)` filter and no model tag; empty handoffs hides handoff tag |
| `instructions.json` | `applyTo,applyToPatterns,extensions,path,filename,lastUpdated` | `ResultItem` | `label="Instruction"`, `applyTo` from raw value or joined patterns, `tags=extensions or ["(none)"]`, `detail=path` | string or array `applyTo` supported; empty extensions use `(none)` |
| `skills.json` | `name,title,assets,hasAssets,assetCount,category,path,skillFile,files,lastUpdated` | `ResultItem` | `label="Skill"`, `detail=skillFile`, `category`, `items=files.length`, `resourceFiles=files` normalized to `ResourceFile[]` | missing files becomes empty list; `SKILL.md` selected by default |
| `hooks.json` | `hooks,tags,assets,path,readmeFile,lastUpdated` | `ResultItem` | `label="Hook"`, `event=hooks.join(", ")`, `tags=[hooks,tags]`, `detail=readmeFile` | missing `readmeFile` disables modal and shows GitHub-only action |
| `workflows.json` | `triggers,path,lastUpdated` | `ResultItem` | `label="Workflow"`, `trigger=triggers.join(", ")`, `tags=triggers`, `detail=path` | no triggers renders `No trigger specified` only where needed |
| `plugins.json` | `name,tags,itemCount,items,external,repository,homepage,author,license,source,path` | `ResultItem` | `label="Plugin"`, `title=name`, `items=itemCount`, `contains=items.kind`, external metadata retained for modal | external plugins have no file actions; duplicate local names remain generator responsibility |
| `tools.json` | `name,category,featured,requirements,features,links,configuration,tags` | `ToolCard` | `title=name`, `badge=category`, `config=configuration.content or empty`, tags include category/featured | null configuration hides copy button; unsafe URLs are not rendered as links |
| `samples.json` | `cookbooks,recipes,languages,variants,filters` | cookbook article/card model | flatten recipes by cookbook for search/filter, preserve language variants | external recipes use `url`; missing example file hides example link |
| `search-index.json` | `type,id,title,description,path,tags,searchText,lastUpdated` | global search result | map `type` to route and label; `path` becomes modal hash for file-backed types | unknown type is ignored, not rendered |
| `manifest.json` | `generated,counts` | nav/count model | counts populate homepage cards and summary badges | missing counts show `-` or omit count |

#### Scenario: Adapter safety
- GIVEN malformed optional data such as `null` configuration or empty arrays
- WHEN adapters run at build or client initialization time
- THEN every target item has a title, description string, tags array, and safe action set

## Component Requirements

### Requirement: Layout shell

The layout shell MUST replace `StarlightPage` and provide document head metadata, skip link, responsive header, main slot, optional docs/sidebar region, footer, theme support, and global assets.

| State | Behavior |
|---|---|
| Populated | Renders page title, description, canonical URL, social metadata, nav, content, footer |
| Error | Build-time missing required metadata fails visibly or uses documented fallback |
| Mobile | Header collapses into accessible menu; sidebar becomes drawer or in-page navigation |

#### Accessibility
- MUST include a skip-to-content link, semantic landmarks, one `h1`, visible focus states, and keyboard-operable navigation.

### Requirement: Navigation

Navigation MUST replace Starlight sidebar/header with a custom route map covering resource pages, contributors, Learning Hub groups, and docs articles.

#### Scenario: Active route
- GIVEN a user is on a nested Learning Hub article
- WHEN navigation renders
- THEN the matching section is expanded
- AND the current page is exposed with `aria-current="page"`

### Requirement: Search components

Search MUST support fuzzy matching, highlighted terms, keyboard navigation, screen-reader status updates, and result limits.

| State | Behavior |
|---|---|
| Empty | No popover before minimum query length |
| Loading | Shows pending state only when async data/index loading is required |
| Populated | Shows type label, title, description, and keyboard index |
| Error | Shows non-blocking search unavailable message |

### Requirement: Resource cards and filters

Cards MUST expose title, description, tags, metadata, relative dates, and actions. Filter controls MUST be labeled, URL-addressable, clearable, and keyboard accessible.

#### Scenario: Card actions
- GIVEN a file-backed result card
- WHEN actions render
- THEN Install, Download, Share, and GitHub actions appear only when supported by that resource type

### Requirement: Modal detail views

The file viewer modal MUST support loading, raw, rendered markdown, error, copy, download, share, install, and skill file-switching states.

#### Accessibility
- MUST use `role="dialog"`, `aria-modal="true"`, focus trap, Escape close, labelled title, and focus restoration.

#### Scenario: Deep link opens modal
- GIVEN a page loads with `#file=skills/example/SKILL.md`
- WHEN the matching resource exists
- THEN the modal opens automatically with that file selected
- AND closing the modal removes the hash without a full page reload

### Requirement: Learning Hub article renderer

The article renderer MUST convert markdown collection entries to HTML, generate a level 2-3 TOC, render frontmatter metadata, support relative images, and provide edit and prev/next links.

### Requirement: Footer

The footer MUST provide repository links, resource navigation, theme controls when present, and static copyright/license information without Starlight virtual modules or i18n APIs.

## Content Collection Requirements

### Requirement: Replace Starlight docs loader

The `docs` collection MUST use Astro-native markdown loading for `src/content/docs/**/*.md`. The schema MUST accept existing frontmatter fields including `title`, `description`, `authors`, `estimatedReadingTime`, `tags`, `relatedArticles`, and `prerequisites`, while tolerating Starlight-specific fields that are no longer behavior drivers.

#### Scenario: Existing markdown builds unchanged
- GIVEN upstream markdown files remain in their current paths
- WHEN content collections are loaded
- THEN every Learning Hub article builds without requiring markdown file edits

## Build and Output Requirements

### Requirement: Static build output

`astro build` from `website/` MUST produce a static site in `website/dist/` with HTML routes, `/llms.txt`, copied static assets, generated data files, sitemap output when configured, and search assets when Pagefind is enabled.

#### Scenario: Build artifact compatibility
- GIVEN CI deploys `website/dist/`
- WHEN the replacement UI builds
- THEN deployment paths and public URLs remain compatible with the existing upstream GitHub Pages flow

### Requirement: Search index generation

If Pagefind remains enabled, it MUST run standalone after build and index generated HTML plus resource records from `search-index.json`. If Pagefind is intentionally disabled, the UI MUST still provide homepage/catalog fuzzy search and document the Learning Hub search limitation.

## Non-Functional Requirements

### Requirement: Performance

The site SHOULD meet Lighthouse targets on a representative desktop and mobile build: Performance 90+, Accessibility 95+, Best Practices 95+, SEO 95+. JavaScript for JSZip and heavy markdown/syntax rendering SHOULD be lazy-loaded when possible.

### Requirement: Accessibility

The UI MUST target WCAG 2.2 AA. It MUST support keyboard-only operation, visible focus, reduced-motion preferences, sufficient contrast, labelled controls, live regions for result counts, and focus restoration after modal close.

### Requirement: Responsive behavior

The UI MUST support mobile, tablet, and desktop layouts. Catalog cards, filters, navigation, modal content, and documentation sidebar MUST remain usable at 320px width without horizontal scrolling except for intentionally scrollable code blocks.

### Requirement: Browser support

The static site MUST support current stable Chromium, Firefox, Safari, and Edge. Clipboard, share, and install-protocol actions MUST degrade gracefully when browser APIs or protocol handlers are unavailable.

## Acceptance Checklist

- [ ] All required routes build: `/`, `/agents/`, `/instructions/`, `/skills/`, `/hooks/`, `/workflows/`, `/plugins/`, `/tools/`, `/learning-hub/`, `/contributors/`, `/llms.txt`.
- [ ] `eng/generate-website-data.mjs` remains behaviorally unchanged.
- [ ] Adapters cover every generated JSON source and documented optional/null cases.
- [ ] Starlight UI, content loader, virtual modules, and sidebar dependencies are removed or replaced.
- [ ] Learning Hub markdown renders with custom docs chrome.
- [ ] Search, filters, sorting, modals, and deep links match the documented behavior.
- [ ] `astro build` outputs `website/dist/` successfully.
