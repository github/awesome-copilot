# likaku/Mck-ppt-design-skill - Design Context

**Source repo:** likaku/Mck-ppt-design-skill  
**Style reference:** McKinsey-style consulting deck layout taxonomy  
**Retrieved:** 2026-05-19

---

## What this repo teaches

`likaku/Mck-ppt-design-skill` is a public example of disciplined consulting-slide taxonomy: action titles, strict grids, repeated exhibit forms, and predictable evidence structures. Current pptify does not import those fixed layouts. Agents use this source as design inspiration, then author the exact `layout_tree` coordinates, sizes, objects, and z-order directly.

---

## Core design principle for current pptify

> The agent owns both the slide form and the coordinates.

This means:

- Layout geometry must be explicit before render time.
- Visual consistency comes from agent-authored coordinate discipline, not a runtime pattern engine.
- Each slide should still follow a recognizable consulting form so the deck feels deliberate.

---

## Slide Form Families

### Structure and navigation

Use these ideas for covers, section dividers, agendas, appendices, and closings. Author them as explicit title text boxes, divider rules, section labels, and footer objects.

### Data and metrics

Use metric strips, KPI cards, data tables, RAG status rows, bar/line/donut-style exhibits, or dashboard-style overviews only when the source evidence contains quantitative data. Render them as explicit editable tables, labels, shapes, lines, and image-backed exhibits when exact chart fidelity is required.

### Frameworks and matrices

Use decision matrices, maturity ladders, process rails, timelines, cycles, funnels, and architecture maps as coordinate-explicit compositions. Every lane, node, connector, axis label, and callout needs its own bbox or line endpoints.

### Content and narrative

Use comparison, executive summary, quote, image exhibit, decision tree, icon grid, and team-style forms when they support the slide's single message. Keep the exhibit count low and make the action title carry the conclusion.

---

## Action Title Discipline

McKinsey decks use action titles: slide titles that state the conclusion, not the topic.

| Descriptive | Action title |
|---|---|
| "Revenue by Region" | "APAC revenue grew 34% driven by cloud workloads" |
| "Risk Matrix" | "Three critical risks require board attention in Q3" |
| "Team" | "Engineering capacity is insufficient for H2 commitments" |

**Agent rule:** Every content slide title must be an action title. Only cover, divider, agenda, and closing slides may use descriptive titles.

---

## Consulting Layout Geometry Norms

Use these as starting coordinates when authoring `layout_tree` objects for a 13.333 by 7.5 inch slide:

| Element | Position |
|---|---|
| Kicker or eyebrow | y = 0.48, font 8.5pt |
| Slide title | y = 0.72, h = 0.36, font 22pt bold |
| Title rule | y = 1.12, h = 0.04 |
| Content area top | y >= 1.30 |
| Takeaway band top | y >= 5.50 |
| Page number | top-right, font 9pt muted |

---

## Agent-level Lessons for pptify

1. **Action titles on every content slide.** This is the highest-leverage improvement over generic deck generation.
2. **Choose a slide form, then write coordinates.** The taxonomy guides composition; the final output is still explicit `layout_tree` JSON.
3. **RAG status and checklist slides are tables.** For status dashboards, use editable table cells with explicit fill colors.
4. **Harvey balls and progress indicators are primitives.** Use donut-like arcs only as explicit shapes or image assets; simple filled circles often communicate more reliably.
5. **One data exhibit per slide.** Never combine two data charts on one slide unless the slide is intentionally a dashboard-style overview.

---

## Best for

- Consulting-style decks for strategy, governance, or operations reviews
- Decks requiring strict action-title discipline
- Workflows where reusable slide-form ideas are translated into explicit coordinates
- Teaching agents the taxonomy of PPTX slide forms
