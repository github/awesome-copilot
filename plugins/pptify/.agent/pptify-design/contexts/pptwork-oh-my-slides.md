# PPTWork / oh-my-slides — Design Context

**Source repo:** PPTWork / oh-my-slides  
**Style reference:** HTML-as-source, PPTX-as-build-artifact pipeline  
**Retrieved:** 2026-05-19

---

## What this repo teaches

`oh-my-slides` treats HTML as the canonical design source and PPTX as a downstream build artifact. The central insight is that HTML rendering gives you pixel-accurate layout control and visual fidelity checking before committing to the constraints of the PPTX format. The raster export (PNG/PDF) is the fidelity reference; the editable PPTX export is produced only under strict constraints that guarantee editability.

---

## Core model

```
Source (markdown / JSON / data)
  ↓
HTML render  ←── design source of truth
  ↓                   ↓
Raster export    Constrained editable PPTX
(PNG / PDF)      (pptify explicit primitives)
(for fidelity)   (for PowerPoint editability)
```

The two exports serve different needs:
- **Raster export:** pixel-perfect fidelity, safe for sharing as PDF, but not editable
- **Editable PPTX:** every text frame independently editable, every shape native, no raster embeds

**Agent rule:** Never promise both pixel fidelity and full editability from the same export path. Choose one or declare a constrained hybrid.

---

## Key patterns

### HTML source with preset picker (`html-source`, `preset-picker`)
The HTML template is chosen from a catalogue of pre-approved presets. Each preset defines:
- Slide dimensions (always 1280 × 720px for 16:9)
- Background color and surface card color
- Typography scale (h1, h2, h3, body, caption)
- Accent geometry (border style, icon style, card corner radius)

Agents select a preset, not a freeform CSS specification. This mirrors the pptify `style_lock` concept.

### Mini preview (`mini-preview`)
Before full render, generate a single-slide HTML preview:
- Use the real preset
- Populate with real content (no lorem ipsum)
- Check bounding boxes: no text overflow, no element outside slide bounds
- Confirm color contrast passes WCAG AA

Only after preview passes does the full deck render proceed.

### Raster export for fidelity (`raster-export`, `pptx-build-artifact`)
The HTML slides are rendered to PNG at 2× resolution for fidelity:
- Each PNG is 2560 × 1440px
- Verified against the preset's expected layout grid
- Used as the reference for visual QA

### Constrained editable PPTX (`constrained-editable`, `editable-export`)
When an editable PPTX is required:
- Map the HTML layout to pptify's coordinate system
- Replace any CSS-positioned elements with absolute-coordinate native shapes
- Replace styled HTML text with PPTX text frames
- Verify with pptify audit checks; zero collisions, overflows, and unexpected warnings required
- Raster screenshots of HTML are never inserted as images in the PPTX

---

## Constraints for editable PPTX export

When converting HTML → editable PPTX:

| HTML construct | PPTX equivalent |
|---|---|
| `<div>` with background-color | `_shape()` with fill color |
| `<p>`, `<h1>`–`<h6>` | `_text()` with matching font size |
| `<table>` | `_table()` |
| `<hr>` or border-bottom | `_line()` or thin `_shape()` |
| Background image | Not permitted in editable export |
| SVG icon | `_shape()` geometric approximation |
| CSS `transform: rotate()` | Not permitted — use supported shape types only |

---

## Agent-level lessons for pptify

1. **HTML is a design tool, not a delivery format.** Use it for visual exploration and QA, then re-express as native PPTX shapes.
2. **Preset picker mirrors style_lock.** The HTML preset and the pptify `style_lock` should be derived from the same brand token source.
3. **Mini preview before full deck.** Generate a 1–2 slide preview render before committing to the full spec.
4. **Raster embeds are forbidden in editable output.** Any PPTX delivered with image embeds of slide content is a quality failure.
5. **Both export paths need their own quality gate.** Raster export: visual diff check. Editable PPTX: pptify audit and package checks with zero issues.

---

## Best for

- Workflows that need a visual HTML prototype before PPTX delivery
- Decks where design fidelity (raster) and PowerPoint editability are separate deliverables
- Agents that use Playwright or browser preview as part of the generation loop
- Teaching the constraint model of HTML → PPTX conversion
