# pptify-design

Source-backed design context packs for `pptify` agents live here. The profiles in this folder are curated from public GitHub projects and web-accessible source files; the actual design templates are not invented by this repository.

Agents use these files as LLM context before authoring a coordinate-explicit deck spec or generation script. The current plugin toolkit does not load these files automatically.

## Catalog

The catalog is [sources.json](sources.json). Each profile includes source URLs, license metadata, local context, and extracted source signals that can be translated into explicit `pptify` layout-tree objects, colors, typography, spacing, and slide composition choices.

Current workflow-aligned profiles:

| Profile | Source | Use when |
| --- | --- | --- |
| `primer-primitives` | GitHub Primer Primitives | Product, engineering, and developer-facing decks that need token discipline. |
| `fluent-ui-design-tokens` | Microsoft Fluent UI token guidance | Microsoft, enterprise, M365, Teams, or Power Platform-aligned decks. |
| `awesome-copilot-design-agents` | GitHub Awesome Copilot design agents/skills | Agent prompt context for design review, UX discovery, and visual hierarchy. |
| `corazzon-pptx-design-styles` | corazzon/pptx-design-styles | A 30-style modern PPTX template catalog for selecting and translating a visual direction into explicit pptify primitives. |

Additional profiles in [sources.json](sources.json) cover staged deck-generation pipelines, consulting-style layout taxonomies, HTML-to-PPTX export constraints, and artifact critique workflows.

## Agent Usage

List available profiles:

```powershell
uv run python pptify-plugin/design/design_context_catalog.py --list --pretty
```

Load one profile with local context text:

```powershell
uv run python pptify-plugin/design/design_context_catalog.py --profile primer-primitives --include-context --pretty
```

Load multiple profiles when a deck needs both a presentation theme and a design-system prompt:

```powershell
uv run python pptify-plugin/design/design_context_catalog.py --profile fluent-ui-design-tokens --profile awesome-copilot-design-agents --include-context --pretty
```

Load the modern PPTX style catalog:

```powershell
uv run python pptify-plugin/design/design_context_catalog.py --profile corazzon-pptx-design-styles --include-context --pretty
```

## Rules

- Treat these as LLM context, not executable renderer config.
- Keep source attribution and license metadata with any copied or adapted context.
- Do not invent a new design template when a user asks for predefined templates; choose a catalog profile, analyze a reference PPTX, or ask the user for a source.
- Translate source signals into explicit `layout_tree` primitives, bboxes, z-order, colors, and typography. Do not rely on a runtime theme or layout-pattern engine in this workspace snapshot.
- Do not copy external fonts, icons, images, or binary assets unless their license and source are explicitly added.

See [third-party-notices.md](third-party-notices.md) for source notices.