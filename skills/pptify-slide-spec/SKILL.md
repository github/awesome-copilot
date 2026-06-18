---
name: pptify-slide-spec
description: "Author or repair coordinate-explicit pptify JSON deck specs. Use when writing layout_tree groups, objects, bboxes, tables, images, lines, shapes, type scale, or collision-safe content."
---

# PPTify Slide Spec

Use this skill when writing or repairing a coordinate-explicit JSON deck spec.

Author final coordinates directly in `layout_tree`; current plugin scripts will not choose layouts, measure browser boxes, or shrink text to fit. Split dense material across slides rather than relying on tiny fonts.

## Workflow

1. Define slide messages, design context, and slide size before writing objects.
2. Create each slide with `id`, `title`, and a complete `layout_tree`.
3. Place groups and objects with final inch-based bboxes, z-order, and style values.
4. Add at least one style-derived `layout_design` element on every normal content slide.
5. Audit collisions, text density, font sizes, and default-theme failures before shipping.

## Deck Shape

- Return a JSON object with a top-level `slides` array for generated decks.
- Keep slide IDs stable and readable, such as `s01_overview`.
- Use top-level `summary` for deck metadata that belongs in the audit but not on slides.
- Record selected design profile IDs, source URLs, and license IDs in `summary.design_context` when using design references.
- For newly generated decks, `summary.design_context` is required unless a user-provided brand guide or reference PPTX is documented as the primary style source.
- Use `render_mode: "layout"` or omit it for generated decks; OOXML mode is for extracted specs with `ooxml_elements`.
- Every generated slide must include `layout_tree`; do not rely on shorthand layout specs.

## Slide Fields

- Each generated slide must include `id`, `title`, and `layout_tree`.
- Use `hidden: true` only for appendix/reference slides that should remain in the PPTX package but not appear during normal presentation.
- Do not use `pattern`, `layout_pattern`, `composition.pattern`, `layout`, `sections`, `bullets`, `objects`, or `theme` as render-time shorthand.
- Do not overfill a slide: prefer three to five major content groups.
- Decide all positions, sizes, z-order, colors, font sizes, and object relationships in the JSON before rendering.
- Do not ship default `python-pptx`-looking slides: plain white background, Calibri-only text, default theme colors, and bullet-only layouts are design failures unless explicitly requested.

## Layout Tree

- Include `slide_size` with explicit `width` and `height` in inches.
- Include `root_group_id`.
- Include `groups`, keyed by group ID.
- Include `objects`, keyed by object ID.
- Add `notes` only when notes are useful for audit or speaker context.

Example skeleton:

```json
{
  "id": "s01_overview",
  "title": "Overview",
  "layout_tree": {
    "id": "s01_overview",
    "title": "Overview",
    "slide_size": { "width": 13.333, "height": 7.5 },
    "root_group_id": "root",
    "groups": {
      "root": {
        "id": "root",
        "role": "slide",
        "layout_mode": "absolute",
        "object_ids": ["title"],
        "group_ids": [],
        "bbox": { "x": 0, "y": 0, "width": 13.333, "height": 7.5 }
      }
    },
    "objects": {
      "title": {
        "id": "title",
        "kind": "text",
        "role": "title",
        "classification": "content",
        "content": { "text": "Overview" },
        "style": { "font_size": 30, "bold": true, "color": "#111827" },
        "bbox": { "x": 0.75, "y": 0.55, "width": 8.5, "height": 0.65 },
        "z_index": 2
      }
    },
    "notes": []
  }
}
```

## Layout Grid & Safe Margins

- Reserve a content-safe margin on every edge; default 0.5 in for 13.333×7.5 in slides. Only `layout_design` full-bleed bands may touch or cross an edge.
- Author on a consistent column grid (for example 12 columns with a 0.2–0.25 in gutter). Snap card and panel left/right edges to column lines so multi-panel layouts align.
- Keep a vertical rhythm: a title band, then a content band that starts below the title rule (for example content top y ≈ 1.3 in). Align sibling cards to a shared top y and a shared height.
- No `content` object may extend past the slide bounds (0,0)–(width,height) or into the safe margin.

## Groups

- Each group must include `id`, `role`, `layout_mode`, `object_ids`, `group_ids`, and `bbox`.
- Use `layout_mode: "absolute"` for generated slides to make the coordinate contract explicit.
- Keep group IDs unique and stable so audit repairs can target them.
- Keep every child object and child group inside its parent group `bbox`; siblings at the same level must not overlap unless one is `layout_design` behind the other.
- Use groups for semantic organization and audit readability; coordinates are still final object coordinates.

## Objects

- Every object must include `id`, `kind`, `role`, `classification`, `content`, `style`, `bbox`, and `z_index`.
- Supported `kind` values: `text`, `shape`, `image`, `line`, `table`.
- Supported shape names (`content.shape`): `rect`, `round_rect`, `oval`, `triangle`, `diamond`, `hexagon`, `parallelogram`, `chevron`, `pentagon`, `trapezoid`, and arrow variants.
- Use `classification: "layout_design"` for decorative or background objects.
- Use `classification: "content"` for meaningful text, tables, lines, and media.
- Shape content must include `content.shape`; text on a shape uses `content.text`.
- Image content uses `content.path`, `content.blob_base64`, and `content.alt`.
- Table content uses `content.rows` as a list of row arrays. Budget column widths to sum to the table `bbox.width`, size row height for the wrapped cell text, cap rows per slide (≈8–10 body rows at 10–11 pt on a 7.5 in slide), and split long tables across slides — repeating the header row — instead of shrinking text.
- Line content must include `content.x1`, `content.y1`, `content.x2`, and `content.y2`.
- Connectors: anchor each diagram line or arrow to the edge midpoint of its source and target shapes (not the shape center), leave a small gap from the node border, and route around — never through — other nodes.
- Do not use `chart` objects; render charts as explicit primitives. Minimal recipe: a plot-area rectangle, an axis baseline (`line`), evenly spaced gridlines, one bar or point per category with equal gutters, and value plus category labels placed outside the plotted marks so nothing overlaps. Or embed a pre-rendered chart image via `content.path`.

## Styling

- Every text-bearing object and table must include `style.font_size` and `style.color`.
- Every line object must include `style.line` and `style.line_width`.
- Every shape object must include `content.shape`, `style.fill`, and `style.line`.
- Specify text color with `style.color`; do not rely on a later tool to infer contrast or default text color.
- Use a consistent `z_index` stack: background fill or band (0) < card shell or panel (1) < divider or rule (2) < image or diagram (3) < body text (4) < label or badge (5) < callout or number (6). Decorative overlaps are allowed only when the lower object is `classification: "layout_design"`.
- When text sits on a shape or card, inset the text bbox by ≈0.1 in on each side from the shape bbox and size the text to that inner area, so on-card text never overflows the card.
- Every normal content slide must include at least one `layout_design` object or style-derived visual structure such as an accent band, card shell, grid, divider rule, signature shape, or image treatment.
- If a vector-traced SVG is provided only for editability, keep the readable raster image in the visible slide and put the SVG on a separate hidden final slide.

### Type Scale

| Role | Recommended (pt) | Minimum (pt) |
|---|---|---|
| Slide title | 24–32 | 20 |
| Section heading / H2 | 16–20 | 14 |
| Claim / callout | 13–15 | 12 |
| Body / narrative | 11–12 | 10 |
| Evidence / bullet | 10–11 | 10 |
| Label / caption | 9–10 | 9 |
| Footer / meta (Courier) | 8–9 | 8 |

Decorative text (`classification: "layout_design"`) such as monogram numerals, rule labels, or background watermarks is exempt from the minimum floor. Footer or meta text rendered below 9 pt must use `classification: "layout_design"` to claim this exemption; any `classification: "content"` text must stay at 9 pt or above so the audit content font floor passes.

## Build Contract (spec → PPTX)

No general renderer is bundled. You author the JSON spec **and** a small `python-pptx` build script that maps the spec to a `.pptx`. To keep the rendered deck matching the audited coordinates:

- Start each slide from a blank layout (`slide_layouts[6]`) so no inherited placeholders, theme text, or bullet styles leak in.
- Place every object from its `bbox` with `Inches(...)` geometry; never rely on placeholder auto-position.
- For every text frame set `word_wrap = True` and `auto_size = MSO_AUTO_SIZE.NONE` so PowerPoint never resizes the text or the shape after you measured it.
- Zero or shrink the default text insets (`margin_left/right/top/bottom`); python-pptx defaults (0.1 in / 0.05 in) silently shrink usable width. If you keep them, subtract them from the capacity estimate.
- Set vertical anchor (`MSO_ANCHOR`) and horizontal alignment (`PP_ALIGN`) explicitly.
- Map `style.font_size`→`Pt`, colors→`RGBColor`, `style.line_width`→`Pt`/`Emu`, dash→`MSO_LINE_DASH_STYLE`.
- Disable shape autofit/auto-grow; the shape size is the `bbox`, not the text.
- Preserve image aspect ratio (see pptify-visual-assets); do not stretch to a mismatched bbox.
- Mark hidden slides with `show="0"` and keep them last.

A spec that passes the JSON audit can still overflow on screen if these are skipped, because real overflow depends on python-pptx text-frame behavior, not just the coordinate math.

## Repair Rules

- If content collides, edit bboxes, z-order, grouping, slide density, or split the slide.
- If text overflows, shorten copy, enlarge the bbox, or split content across slides. **Lower `font_size` only as a last resort, and never below the type scale minimum.**
- For CJK or other full-width text, halve the Latin character-capacity estimate (full-width glyphs are ≈2× the advance width of Latin characters) so dense Japanese/Chinese/Korean copy does not silently overflow.
- If an object sits outside the slide bounds or inside the safe margin, move or resize it back inside; only `layout_design` full-bleed bands may cross an edge.
- If an object is misplaced, repair the final coordinates directly; do not add layout hints expecting a later tool to resolve them.
