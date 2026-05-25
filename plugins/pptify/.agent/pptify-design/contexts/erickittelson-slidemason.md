# erickittelson/slidemason — Design Context

**Source repo:** erickittelson/slidemason  
**Style reference:** JSX primitive composition for bespoke slide layouts  
**Retrieved:** 2026-05-19

---

## What this repo teaches

`slidemason` demonstrates JSX-based slide composition using a primitive component library (shapes, text, images, connectors). The approach allows fully bespoke layouts by combining primitives programmatically. The key cautionary lesson is that JSX flexibility breaks down at the PPTX editability boundary: layouts that are easy to express in JSX are often impossible to round-trip as fully editable native PPTX.

---

## Core approach

```jsx
<Slide background="#F7FAFC">
  <Card x={0.76} y={1.42} width={4.2} height={2.0} fill="#FFFFFF" border="#C9DAEF" radius={8}>
    <Tag x={0.18} y={0.18} width={0.78} height={0.24} fill="#0F6CBD" />
    <Text x={0.22} y={0.58} width={3.76} size={13.6} bold>Insight title</Text>
    <Text x={0.22} y={1.02} width={3.76} size={9.4} color="#4D5E75">Detail text here.</Text>
  </Card>
</Slide>
```

Coordinates are in inches, absolute-positioned, matching the pptify coordinate system. Primitives map directly to pptify builder functions.

---

## JSX primitives → pptify equivalents

| Slidemason JSX | pptify function |
|---|---|
| `<Slide background>` | `_background(fill)` + `_tree(...)` |
| `<Card fill border radius>` | `_shape(..., shape="round_rect")` |
| `<Text size bold color>` | `_text(...)` |
| `<Line x1 y1 x2 y2 color>` | `_line(...)` |
| `<Image path alt>` | `_image(...)` |
| `<Oval fill>` | `_shape(..., shape="oval")` |
| `<Hexagon fill>` | `_shape(..., shape="hexagon")` |

---

## Key patterns

### JSX bento (`jsx-bento`, `slidemason-bento`)
A bento-grid card layout composed from `<Card>` primitives arranged in a CSS-like grid. Each card carries a tag, title, and detail text. In current pptify, agents translate this idea into explicit `layout_tree` card shapes and text boxes.

**Caution:** Slidemason bento uses flexbox-inspired auto-sizing that does not survive PPTX export. In pptify, all bento card positions must be hardcoded to absolute inch coordinates.

### Bespoke slide (`bespoke-slide`, `custom-jsx-slide`)
For one-off layouts not covered by the standard catalogue, compose primitives directly. Useful for complex infographic or diagram slides.

**Caution:** Bespoke JSX slides are the hardest to keep editable. Every text frame must be individually positioned and sized; do not rely on auto-layout.

### Primitive composition (`jsx-primitives`, `primitive-composition`)
The primitive library provides the building blocks. The composition layer arranges them. Separating these concerns means the same primitives can be recombined into new patterns without rebuilding the rendering infrastructure.

---

## Editability failure modes

Slidemason layouts commonly fail PPTX editability when:

| Failure mode | Why it happens |
|---|---|
| Nested flex containers | PPTX has no flex layout; nested containers collapse |
| Auto-sized text frames | PPTX text frames need explicit height in inches |
| SVG filter effects | Drop shadows, blurs, and filters cannot be exported as native shapes |
| Rotated text boxes | Rotated text frames lose editability in most PPTX viewers |
| Z-index stacking of text | Text below z-index 10 is not selectable in PowerPoint |
| Image fills on shapes | Image-filled shape backgrounds cannot be reflowed as editable text |

---

## Agent-level lessons for pptify

1. **JSX flexibility is a design-time tool only.** At export time, every element must resolve to an absolute-positioned, explicitly-sized native PPTX object.
2. **Auto-layout is the enemy of editability.** In pptify specs, never use relative sizing (percentages, `auto`, `fr` units). All coordinates are in inches.
3. **The primitive catalogue should be closed at generation time.** The agent should choose from known editable primitives and validate every object before rendering.
4. **Bespoke is expected but must be explicit.** A bespoke layout requires manual quality-gate verification and coordinate-explicit objects.
5. **Text z_index ≥ 20.** In pptify, all text objects use `z_index=20` by default to ensure they render above decorative shapes.

---

## Best for

- Understanding the limits of programmatic slide composition
- Designing new pptify slide forms by sketching primitives before formalising geometry
- Cautionary reference for why auto-layout and PPTX editability are incompatible
- Component-level thinking about slide layout and primitive composition
