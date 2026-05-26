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
- When source-backed design context from `pptify-design` is used, record selected profile IDs, source URLs, and license IDs in `summary.design_context`.
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

## Groups

- Each group must include `id`, `role`, `layout_mode`, `object_ids`, `group_ids`, and `bbox`.
- Use `layout_mode: "absolute"` for generated slides to make the coordinate contract explicit.
- Keep group IDs unique and stable so audit repairs can target them.
- Use groups for semantic organization and audit readability; coordinates are still final object coordinates.

## Objects

- Every object must include `id`, `kind`, `role`, `classification`, `content`, `style`, `bbox`, and `z_index`.
- Supported `kind` values: `text`, `shape`, `image`, `line`, `table`.
- Supported shape names (`content.shape`): `rect`, `round_rect`, `oval`, `triangle`, `diamond`, `hexagon`, `parallelogram`, `chevron`, `pentagon`, `trapezoid`, and arrow variants.
- Use `classification: "layout_design"` for decorative or background objects.
- Use `classification: "content"` for meaningful text, tables, lines, and media.
- Shape content must include `content.shape`; text on a shape uses `content.text`.
- Image content uses `content.path`, `content.blob_base64`, and `content.alt`.
- Table content uses `content.rows` as a list of row arrays.
- Line content must include `content.x1`, `content.y1`, `content.x2`, and `content.y2`.
- Do not use `chart` objects; render charts as explicit shapes, labels, lines, tables, or file-backed images.

## Styling

- Every text-bearing object and table must include `style.font_size` and `style.color`.
- Every line object must include `style.line` and `style.line_width`.
- Every shape object must include `content.shape`, `style.fill`, and `style.line`.
- Specify text color with `style.color`; do not rely on a later tool to infer contrast or default text color.
- Use `z_index` intentionally: low values for backgrounds and decorations, higher for text and foreground content.
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

Decorative text (`classification: "layout_design"`) such as monogram numerals, rule labels, or background watermarks is exempt from the minimum floor.

## Repair Rules

- If content collides, edit bboxes, z-order, grouping, slide density, or split the slide.
- If text overflows, shorten copy, enlarge the bbox, or split content across slides. **Lower `font_size` only as a last resort, and never below the type scale minimum.**
- If an object is misplaced, repair the final coordinates directly; do not add layout hints expecting a later tool to resolve them.
