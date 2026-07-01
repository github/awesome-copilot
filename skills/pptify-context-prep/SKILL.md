---
name: pptify-context-prep
description: "Prepare narrative framework, source material, and design context before authoring a pptify deck spec. Use when selecting a business/storytelling framework, converting documents, summarizing long sources, analyzing reference PPTX decks, or selecting and loading bundled design profiles."
---

# PPTify Context Prep

Use this skill before writing a deck spec. It covers three parallel preparation tracks: **narrative framework** (the business story spine), **source context** (documents, research, reference PPTX), and **design context** (predefined style profiles in [`references/design-profiles.md`](references/design-profiles.md)).

## Business Framework & Narrative

The business framework is defined by the user, not by the assistant. If the user has already specified a framework, use it directly. If the user names a framework that does not match any entry in the table, treat it as a `custom` framework request, confirm the interpretation with the user, and proceed with the custom elicitation questions before planning. If no framework has been specified, present the available options and ask which one to use before planning the deck. Include `custom` when the user wants to provide their own structure, naming convention, or slide sequence. Do not auto-select a framework on the user's behalf.

| Framework | Best for |
|---|---|
| `mckinsey` | Executive proposals, consulting deliverables, strategic recommendations |
| `scqa` | Problem-solving presentations, situation analysis, incident reports |
| `pyramid` | Complex arguments requiring strong logical structure |
| `mece` | Issue decomposition, audits, multi-workstream analysis |
| `action-title` | Executive communications where every slide must drive action |
| `assertion-evidence` | Technical or academic presentations, research findings |
| `exec-summary-first` | C-suite briefings, board decks, press releases |
| `custom` | User-defined structures, organization-specific playbooks, hybrid narrative patterns |

Use the selected framework as the starting narrative spine, then adapt slide count and evidence density to the user's source material.

| Framework | Default slide spine |
|---|---|
| `mckinsey` | Title → executive summary → situation → complication → key question → recommendation → 2-3 evidence slides → options → roadmap → appendix |
| `scqa` | Title → situation → complication → question → answer → evidence → implementation plan → summary |
| `pyramid` | Title → main answer → argument 1 → argument 2 → argument 3 → evidence → summary |
| `mece` | Title → issue tree → workstream slides → synthesis |
| `action-title` | Title → action summary → action-titled content slides → next steps |
| `assertion-evidence` | Title → overview assertion → assertion/evidence slides → conclusion |
| `exec-summary-first` | Title → full answer on slide 2 → supporting detail → appendix |
| `custom` | Ask for framework name, objective, slide sequence, title rules, layout preferences, and evidence expectations before planning. If the user provides only partial answers, apply Pyramid Principle defaults for any unspecified field, such as assertion-style title rules, and document each assumption in `summary.business_framework` |

Record the resolved framework in `summary.business_framework`, including source, slide sequence, title rules, and approved assumptions.

### Storytelling Principles

- Use the selected framework's slide order as the deck spine. Apply the Pyramid Principle as title discipline and synthesis guidance: make each slide title state the slide's conclusion or assertion when the framework stage supports it, avoid vague labels, and treat SCQA `question` or McKinsey `key question` steps as narrative roles rather than mandatory question-form slide titles unless the user explicitly requests literal question titles.
- Make every key message answer "So what?" for the audience.
- Keep topics MECE: mutually exclusive and collectively exhaustive.
- Write specific slide titles, such as "Azure AI cuts development costs by 40%" or "3 implementation patterns enable rapid onboarding," instead of generic labels like "About Azure AI" or "Implementation Patterns Overview."
- Include concrete data, numbers, dates, owners, sources, or quantified directional signals in bullets when the source material supports them.
- Keep speaker notes useful: two to three sentences, never empty and never just a dash.
- Avoid generic statements; every bullet should be specific, defensible, and tied to the selected framework's role in the story.

## Source Documents

- For long source documents, ask the user to convert to markdown or paste key sections directly.
- If the source exceeds approximately 1,500 words or covers more than three distinct topics, ask the user to pre-summarize it using their preferred tool, such as an LLM API or summarization pipeline, and paste the result here before proceeding. Do not attempt to call external APIs directly.
- Record the corpus path, summary path, source count, and source URLs in `summary.source_enrichment` so enrichment evidence survives review.
- Use summaries to identify audience, thesis, slide sequence, evidence, risks, and decision points.
- Do not paste entire long documents into the deck spec; summarize into concise slide messages and cite sources in footers when needed.

## Reference PPTX

- Implement the on-demand extraction contract in `pptify-reference-deck-analysis` with `python-pptx`, or unzip the `.pptx` file and parse its XML contents directly, to inspect production complexity, slide text, style, brand, template, and layout-rhythm facts.
- If reference PPTX inspection fails or returns no usable data, notify the user, skip reference-derived context, and proceed using the selected design profile as the sole design source. Document this in `summary.design_context`.
- Use the extracted facts as agent context when the new deck should follow a source deck's language, slide count, topic sequence, executive tone, colors, fonts, template conventions, and layout rhythm.
- When authoring the new spec, translate `brands.primary_color`, `brands.accent_colors`, `brands.fonts`, `template.slide_size`, `template.layout_usage`, and `layout.slides[*].dominant_flow` into explicit `layout_tree` primitives, colors, typography, spacing, and coordinates.
- Use extraction helpers when the goal is reconstructing or preserving an existing production deck rather than authoring a new editable deck.
- For new editable decks, treat reference layout rhythm as prompt context; generated coordinates must be authored directly by the agent in `layout_tree`.
- Never copy or mutate a referenced PPTX as the generation strategy. Use analysis as context and build a new PPTX artifact.

## Design Profile Selection

Load [`references/design-profiles.md`](references/design-profiles.md) for the full profile catalog with IDs, `best_for` guidance, key style signals, and license information. If `references/design-profiles.md` cannot be loaded, notify the user that design profile selection is unavailable, fall back to `fluent-ui-design-tokens` defaults using only the inline descriptions in this prompt, and flag the limitation in `summary.design_context`.

Use bundled design profiles; do not invent a new design template when the user asks for predefined templates.

Apply profile rules in this priority order: (1) explicit user request for a named profile, (2) `getdesign-md-design-systems` if the deck should visually match a specific real-world brand or product, (3) `fluent-ui-design-tokens` as the default for all other decks, (4) `primer-primitives` only when the deck is explicitly developer or GitHub-focused, and (5) `corazzon-pptx-design-styles` only if the user explicitly requests multiple style options.

- Use `getdesign-md-design-systems` when the deck should visually echo a specific real-world brand or product (for example Apple, Stripe, Linear, Notion); fetch the matching DESIGN.md entry, lock its tokens in `summary.design_context`, and translate signals into `layout_tree` primitives without embedding scraped or proprietary assets.
- Use `fluent-ui-design-tokens` as the default for all remaining new decks, including Microsoft, M365, Teams, Power Platform, enterprise-aligned, general modern, stylish, product, app, pitch, or unspecified visual style requests.
- Use `primer-primitives` for GitHub-style product, developer, or token-driven engineering decks.
- Use `corazzon-pptx-design-styles` when a broader modern style catalog or multiple visual direction options are explicitly useful. Pick one style from the catalog and lock its palette, typography, spacing, and signature element before layout planning.
- Keep source attribution and license metadata attached to the context used.
- If no catalog profile fits, use reference PPTX analysis, search for another public source, or ask the user for a source template.
- Record selected profile IDs, source URLs, and style lock details in `summary.design_context` before building the PPTX.

Profile descriptions are in [`references/design-profiles.md`](references/design-profiles.md) — load that file for the full catalog.

## Applying Context to Spec Authoring

1. Put the selected profile payload into the agent context before writing `deck-spec.json`.

### Layout Authoring Rules

1. Translate source signals into explicit `layout_tree` objects, colors, fills, lines, typography, spacing, bboxes, and z-order.
2. Use source CSS or reference deck rhythm only as design evidence; final coordinates must be authored directly in inches.

### Design Quality Gates

1. Keep meaningful slide content as `classification: "content"` objects and decorative/background elements as `classification: "layout_design"` objects.
2. Add at least one style-derived visible design element to every slide except the title slide, section dividers, and appendix slides: accent band, rule, card shell, grid cell, diagram primitive, shape motif, image treatment, or pattern. A plain title-plus-bullets slide fails the design gate.
3. Do not treat design profiles as content source material; they are design context only.

## Source-to-Deck Planning

- Map the selected business framework to the deck outline before authoring visuals, and document the resolved framework in `summary.business_framework`.
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
