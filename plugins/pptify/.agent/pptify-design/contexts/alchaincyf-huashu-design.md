# alchaincyf/huashu-design — Design Context

**Source repo:** alchaincyf/huashu-design  
**Style reference:** HTML-native design pipeline with brand-asset protocol  
**Retrieved:** 2026-05-19

---

## What this repo teaches

`alchaincyf/huashu-design` builds presentation decks HTML-first and treats PPTX as a constrained export target. The key contribution is a structured brand-asset protocol that governs how visual directions are defined, how multiple directions are run in parallel, and how HTML output is verified with Playwright before being exported to editable PPTX.

---

## Key patterns

### Brand asset protocol (`brand-asset-protocol`, `brand-assets`)
Before any layout work, codify the brand in a structured block:

```json
{
  "brand_name": "Contoso",
  "primary_palette": ["#0F6CBD", "#009C9C", "#6B5DD3"],
  "neutral_palette": ["#F7FAFC", "#FFFFFF", "#17233A"],
  "typeface_display": "Segoe UI",
  "typeface_body": "Segoe UI",
  "logo_description": "wordmark, dark navy on white",
  "tone": "confident, technical, concise"
}
```

This block is passed into every slide generation prompt as a locked context. No colors, fonts, or geometric treatments are allowed to deviate from it.

### Parallel visual directions (`visual-directions`, `five-schools`)
Generate 3–5 distinct visual direction options from the same content outline. Each direction varies:
- Background lightness (light, mid, dark)
- Accent geometry (circles, bars, diagonals, sharp rectangles)
- Typography weight (light/thin vs. bold/heavy)
- Information density (spacious vs. dense)

Directions are rendered as HTML thumbnail cards. The selected direction becomes the locked style for the full deck.

### HTML-to-PPTX export (`html-native`, `html-to-editable-pptx`, `editable-html-export`)
HTML is the design source. PPTX is the delivery format. The export pipeline:
1. Render full slide HTML
2. Run Playwright visual QA (check for overflow, font rendering, color contrast)
3. Map HTML layout to PPTX native shapes — every text frame must be individually editable
4. Verify no raster screenshots survive in the PPTX (all shapes must be vector/native)

### Playwright checking (`playwright-check`)
After HTML render:
- Screenshot each slide at 1280×720
- Check bounding box of every text container for overflow
- Check color contrast ratio (WCAG AA: ≥ 4.5:1 for body text)
- Check that no element is clipped by slide boundaries
- Fail the build if any check fails

---

## Agent-level lessons for pptify

1. **HTML layout ≠ editable PPTX.** HTML absolute positioning does not map 1:1 to PPTX native shapes. Constrain layout to pptify's coordinate system (13.333" × 7.5", absolute inches) rather than pixel-based CSS.
2. **Brand lock is non-negotiable.** Once `style_lock` is set from the brand asset protocol, every subsequent prompt must pass it through unchanged.
3. **Parallel directions reduce iteration.** Show 3 style options before the deck plan, not after. Post-hoc redesign is expensive.
4. **Every text frame must be individually editable.** Raster screenshots of styled text are never acceptable in pptify output.

---

## Design guidance for pptify themes

| Signal from huashu-design | pptify equivalent |
|---|---|
| `brand_asset_protocol` block | `theme` / `style_lock` dict in slide spec |
| HTML `background-color` | `theme.background` |
| Accent `border-color` | `theme.secondary` on shape border |
| `font-family` | `theme.font` |
| Playwright overflow check | pptify audit collision/overflow gate |

---

## Best for

- Brand-constrained enterprise decks requiring exact color/type fidelity
- Workflows where an agent uses a design mockup as evidence, then authors final PPTX coordinates explicitly
- Multi-direction style exploration before committing to a palette
- Decks requiring strong Playwright/visual verification discipline
