---
name: pptify-context-prep
description: "Prepare source material and design context before authoring a pptify deck spec. Use when converting documents, building RAPTOR summaries, analyzing reference PPTX decks, or selecting and loading pptify-design profiles."
---

# PPTify Context Prep

Use this skill before writing a deck spec. It covers two parallel preparation tracks: **source context** (documents, research, reference PPTX) and **design context** (predefined style profiles from `pptify-design`).

## Source Documents

- Convert long source documents to markdown before planning slides: `uv run python pptify-plugin/documents/document_to_markdown.py --source source.pdf --output-path source.md`.
- Build a structured summary tree when a source is long or multi-topic: `uv run python pptify-plugin/documents/document_to_raptor_tree.py --markdown-path source.md --output-path source-summary.json --title "Source" --pretty`.
- For URL-based, topic-plus-research, source-backed, or multi-source decks, combine converted/downloaded source markdown into a corpus and run the RAPTOR summary before slide planning, even when individual sources are short.
- Record the corpus path, summary path, source count, and source URLs in `summary.source_enrichment` so enrichment evidence survives review.
- Use the summary tree to identify audience, thesis, slide sequence, evidence, risks, and decision points.
- Do not paste entire long documents into the deck spec; summarize into concise slide messages and cite sources in footers when needed.

## Reference PPTX

- Use the importable helpers in `pptify-plugin/extraction` or package inspection to inspect production complexity, slide text, style, brand, template, and layout-rhythm facts. The `python -m pptify --analyze-pptx` command is unavailable unless the core renderer package is restored.
- Use the extracted facts as agent context when the new deck should follow a source deck's language, slide count, topic sequence, executive tone, colors, fonts, template conventions, and layout rhythm.
- When authoring the new spec, translate `brands.primary_color`, `brands.accent_colors`, `brands.fonts`, `template.slide_size`, `template.layout_usage`, and `layout.slides[*].dominant_flow` into explicit `layout_tree` primitives, colors, typography, spacing, and coordinates.
- Use extraction helpers when the goal is reconstructing or preserving an existing production deck rather than authoring a new editable deck.
- For new editable decks, treat reference layout rhythm as prompt context; generated coordinates must be authored directly by the agent in `layout_tree`.
- Never copy or mutate a referenced PPTX as the generation strategy. Use analysis as context and build a new PPTX artifact.

## Design Profile Selection

Use profiles from `pptify-design/sources.json`; do not invent a new design template when the user asks for predefined templates.

- Use `fluent-ui-design-tokens` as the default for new decks, including Microsoft, M365, Teams, Power Platform, enterprise-aligned, general modern, stylish, product, app, pitch, or unspecified visual style requests.
- Use `primer-primitives` for GitHub-style product, developer, or token-driven engineering decks.
- Use `corazzon-pptx-design-styles` when a broader modern style catalog or multiple visual direction options are explicitly useful. Pick one style from the catalog and lock its palette, typography, spacing, and signature element before layout planning.
- Use `likaku-mck-ppt-design-skill` for consulting, strategy, governance, or operations decks that need action-title discipline and structured native PPTX layouts.
- Use `awesome-copilot-design-agents` when the agent prompt itself needs design review, UX discovery, visual hierarchy, or accessibility framing.
- Keep source attribution and license metadata attached to the context used.
- If no catalog profile fits, use reference PPTX analysis, search for another public source, or ask the user for a source template.
- Record selected profile IDs, source URLs, and style lock details in `summary.design_context` before building the PPTX.

Load profiles:

```powershell
uv run python pptify-plugin/design/design_context_catalog.py --list --pretty
uv run python pptify-plugin/design/design_context_catalog.py --profile fluent-ui-design-tokens --include-context --pretty
uv run python pptify-plugin/design/design_context_catalog.py --profile primer-primitives --include-context --pretty
uv run python pptify-plugin/design/design_context_catalog.py --profile corazzon-pptx-design-styles --include-context --pretty
```

## Applying Context to Spec Authoring

1. Put the selected profile payload into the agent context before writing `deck-spec.json`.
2. Translate source signals into explicit `layout_tree` objects, colors, fills, lines, typography, spacing, bboxes, and z-order.
3. Keep meaningful slide content as `classification: "content"` objects and decorative/background elements as `classification: "layout_design"` objects.
4. Use source CSS or reference deck rhythm only as design evidence; final coordinates must be authored directly in inches.
5. Add at least one style-derived visible design element to every normal content slide: accent band, rule, card shell, grid cell, diagram primitive, shape motif, image treatment, or pattern. A plain title-plus-bullets slide fails the design gate.
6. Do not treat `pptify-design` profiles as content source material; they are design context only.

## Source-to-Deck Planning

- Convert source material into one message per slide before authoring visual structure.
- Treat charts and dashboard-style slides as source-evidence-driven exhibits; do not create generic metric or dashboard slides when the source corpus does not provide relevant data.
- Preserve important terminology, product names, metrics, dates, and user-provided wording.
- Reduce dense narrative into executive slide titles plus short sections.
- Track open assumptions in speaker notes or audit-facing summary fields instead of overcrowding slides.

## Restrictions

- Do not copy external fonts, icon packs, photos, or binary assets unless their license and source are explicitly added.
- Do not claim the output is a Primer, Fluent UI, or Awesome Copilot artifact; these are context sources for a new `pptify` deck.
- Do not let source CSS override pptify quality gates: built decks still need zero content collisions and zero text overflows.
- Do not accept default PowerPoint theme colors, Calibri-only text boxes, plain white backgrounds, or placeholder-style bullet layouts as a finished design.
