---
name: pptify-slide-spec
description: "Author or repair coordinate-explicit pptify JSON deck specs. Use when writing layout_tree groups, objects, bboxes, tables, images, lines, shapes, type scale, or collision-safe content."
---

# PPTify Slide Spec

Use this skill when writing or repairing a coordinate-explicit JSON deck spec.

Author final coordinates directly in `layout_tree`; plugin scripts will not choose layouts, measure browser boxes, or shrink text to fit. Split dense material across slides rather than relying on tiny fonts.

## Workflow

1. Define slide messages, design context, and slide size.
2. Create each slide with `id`, `title`, and complete `layout_tree`.
3. Place groups and objects with final inch bboxes, z-order, and styles.
4. Add at least one style-derived `layout_design` element on normal content slides.
5. Audit collisions, density, font sizes, and default-theme failures.

## Deck Shape

- Return a JSON object with top-level `slides`; use stable readable IDs such as `s01_overview`.
- Use top-level `summary` for audit metadata. Newly generated decks require `summary.design_context` unless a user-provided brand guide or reference PPTX is documented as the primary style source.
- Record design profile IDs, source URLs, and license IDs in `summary.design_context` when using design references.
- Use `render_mode: "layout"` or omit it for generated decks. OOXML mode is only for extracted specs with `ooxml_elements`.
- Every generated slide must include `layout_tree`; do not rely on shorthand layout specs.

## Slide Fields

- Each generated slide must include `id`, `title`, and `layout_tree`.
- Use `hidden: true` only for appendix/reference slides that should remain in the PPTX package but not appear during normal presentation.
- Do not use `pattern`, `layout_pattern`, `composition.pattern`, `layout`, `sections`, `bullets`, `objects`, or `theme` as render-time shorthand. Decide all positions, sizes, z-order, colors, font sizes, and relationships in the JSON before rendering.
- Do not overfill a slide: prefer three to five major content groups.
- Do not ship default `python-pptx`-looking slides: plain white background, Calibri-only text, default theme colors, and bullet-only layouts are design failures unless explicitly requested.

## Layout Tree

- Required keys: `slide_size` (`width`, `height` in inches), `root_group_id`, `groups` keyed by ID, and `objects` keyed by ID.
- `groups` and `objects` are id-keyed maps; `object_ids`/`group_ids` are arrays. Add `notes` only when useful for audit or speaker context.

```json
{
  "id": "s01_overview",
  "title": "Overview",
  "layout_tree": {
    "slide_size": { "width": 13.333, "height": 7.5 },
    "root_group_id": "root",
    "groups": { "root": { "id": "root", "role": "slide", "layout_mode": "absolute", "object_ids": ["title"], "group_ids": [], "bbox": { "x": 0, "y": 0, "width": 13.333, "height": 7.5 } } },
    "objects": { "title": { "id": "title", "kind": "text", "role": "title", "classification": "content", "content": { "text": "Overview" }, "style": { "font_size": 30, "color": "#111827" }, "bbox": { "x": 0.75, "y": 0.55, "width": 8.5, "height": 0.65 }, "z_index": 2 } }
  }
}
```

## Layout Grid & Safe Margins

- Reserve a content-safe margin on every edge; default 0.5 in for 13.333×7.5 in slides. Only `layout_design` full-bleed bands may cross an edge.
- Use a consistent column grid, e.g. 12 columns with 0.2–0.25 in gutters; align sibling cards to shared tops, widths, and heights.
- Keep a vertical rhythm: title band first, then content below the title rule, e.g. y ≈ 1.3 in.
- No `content` object may extend past the slide bounds (0,0)–(width,height) or into the safe margin.

## Groups

- Each group must include `id`, `role`, `layout_mode`, `object_ids`, `group_ids`, and `bbox`.
- Use `layout_mode: "absolute"` for generated slides to make the coordinate contract explicit.
- Keep group IDs unique and stable for audit repairs.
- Keep every child inside its parent `bbox`; siblings at the same level must not overlap unless one is `layout_design` behind the other.
- Use groups for semantic organization and audit readability; coordinates remain final object coordinates.

## Objects

- Every object must include `id`, `kind`, `role`, `classification`, `content`, `style`, `bbox`, and `z_index`.
- Supported `kind` values: `text`, `shape`, `image`, `line`, `table`.
- `classification` is `layout_design` for decorative/background objects, `content` for meaningful text, tables, lines, and media.
- Shape names: `rect`, `round_rect`, `oval`, `triangle`, `diamond`, `hexagon`, `parallelogram`, `chevron`, `pentagon`, `trapezoid`, and arrow variants.
- Shape content must include `content.shape`; text on a shape uses `content.text`. Image content uses `content.path`, `content.blob_base64`, and `content.alt`.
- Table content uses `content.rows`; make column widths sum to `bbox.width`, size rows for wrapped text, and split long tables with repeated headers.
- Line content must include `content.x1`, `content.y1`, `content.x2`, and `content.y2`.
- Connectors anchor to edge midpoints, leave a small node-border gap, and route around other nodes.
- Do not use `chart` objects; render charts as primitives or embed a pre-rendered chart image via `content.path`.

## Styling

- Every text-bearing object and table must include `style.font_size` and `style.color`.
- Every line object must include `style.line` and `style.line_width`.
- Every shape object must include `content.shape`, `style.fill`, and `style.line`.
- Specify text color with `style.color`; do not rely on inferred contrast or default text color.
- Use a consistent `z_index` stack: background band (0) < card/panel (1) < rule (2) < image/diagram (3) < body text (4) < label/badge (5) < callout/number (6). Decorative overlaps are allowed only when the lower object is `layout_design`.
- When text sits on a shape or card, inset the text bbox by ≈0.1 in on each side from the shape bbox and size the text to that inner area, so on-card text never overflows the card.
- Every normal content slide must include at least one `layout_design` object or style-derived visual structure such as an accent band, card shell, divider, signature shape, or image treatment.
- If a vector-traced SVG is provided only for editability, keep the readable raster image in the visible slide and put the SVG on a separate hidden final slide.

### Type Scale

Recommended/minimum pt: title 24–32/20; H2 16–20/14; claim 13–15/12; body 11–12/10; evidence 10–11/10; label 9–10/9; footer/meta 8–9/8. Decorative `layout_design` text may go below the content floor; any `content` text must stay at 9 pt or above.

## Build Contract (spec → PPTX)

No renderer is bundled. Author the JSON spec **and** a small `python-pptx` build script. To keep rendered output matching audited coordinates:

- Start each slide from blank layout `slide_layouts[6]` so placeholders, theme text, and bullet styles do not leak in.
- Place every object from its `bbox` with `Inches(...)` geometry; never rely on placeholder auto-position.
- For every text frame set `word_wrap = True` and `auto_size = MSO_AUTO_SIZE.NONE`; disable shape autofit/auto-grow.
- Zero or shrink default text insets (`margin_left/right/top/bottom`), or subtract them from capacity estimates.
- Set vertical anchor (`MSO_ANCHOR`) and horizontal alignment (`PP_ALIGN`) explicitly.
- Map `style.font_size`→`Pt`, colors→`RGBColor`, `style.line_width`→`Pt`/`Emu`, dash→`MSO_LINE_DASH_STYLE`.
- Preserve image aspect ratio (see pptify-visual-assets); do not stretch to a mismatched bbox.
- Mark hidden slides with `show="0"` and keep them last.

A JSON-audit pass can still overflow if the build script skips these text-frame controls.

## Repair Rules

- If content collides, edit bboxes, z-order, grouping, slide density, or split the slide.
- If text overflows, shorten copy, enlarge the bbox, or split content across slides. Lower `font_size` only as a last resort, and never below the type scale minimum.
- For CJK or other full-width text, halve the Latin character-capacity estimate so dense Japanese/Chinese/Korean copy does not silently overflow.
- If an object sits outside the slide bounds or inside the safe margin, move or resize it back inside; only `layout_design` full-bleed bands may cross an edge.
- If an object is misplaced, repair the final coordinates directly; do not add layout hints expecting a later tool to resolve them.
