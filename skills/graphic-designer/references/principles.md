# Visual Principles Reference

Foundational principles applied in UI/UX graphic design. Use as a checklist when reviewing or producing a screen.

## Visual Hierarchy

The order in which the eye discovers elements. Controlled by, in roughly descending power:

1. **Position** — top-left in LTR cultures wins by default; optical center (slightly above true center) for hero focal points.
2. **Size** — larger elements dominate, but only if surrounded by enough whitespace to register as singular.
3. **Contrast** — luminance contrast against background outranks hue contrast.
4. **Color saturation** — one saturated element among desaturated peers will win every time.
5. **Weight** — bold type, thick strokes.
6. **Whitespace isolation** — an element with breathing room beats a larger element in a crowd.

**Test**: blur or squint at the design. The intended primary element should still dominate.

## Gestalt Principles (Applied)

- **Proximity** — items close together are read as a group. Prefer spacing over borders to group form fields, list items, or related metadata.
- **Similarity** — items sharing color, shape, size, or type are read as the same kind. Use to reinforce category without labels.
- **Continuity** — the eye follows lines and curves. Align elements along implicit lines to create scan paths.
- **Closure** — the mind completes shapes. You can imply a card with three corners or a divider with whitespace alone.
- **Figure/ground** — the foreground/background relationship must be unambiguous. Glassmorphism violates this when contrast is too low.
- **Common region** — a shared container (card, panel) overrides proximity. Use sparingly; cards-within-cards becomes Russian-doll UI.

## Laws of UX (Applied)

- **Fitts's Law** — target acquisition time scales with distance and inversely with target size. Make primary actions large and place them near where attention already is (corners on desktop, thumb zones on mobile).
- **Hick's Law** — decision time scales with number/complexity of choices. Use progressive disclosure, sensible defaults, and grouping to reduce visible options.
- **Miller's Law** — humans hold ~7 (±2) items in working memory; chunk longer lists into groups of 3–5.
- **Aesthetic-Usability Effect** — attractive interfaces are *perceived* as more usable. Useful for first impressions; do not let it substitute for real usability testing.
- **Jakob's Law** — users spend most of their time on other products and expect yours to work the same. Deviate from platform conventions only with clear payoff.
- **Doherty Threshold** — productivity climbs when system response is under ~400ms. Optimistic UI, skeletons, and immediate feedback hide latency.
- **Peak-End Rule** — users remember the peak emotional moment and the ending. Invest disproportionately in onboarding peaks, success states, and clean exit/empty states.
- **Serial Position Effect** — first and last items in a list are remembered best. Put important nav items at the ends.
- **Zeigarnik Effect** — incomplete tasks linger in memory. Progress indicators and partial states motivate completion.

## The Whitespace Discipline

Whitespace is not empty — it is structural. Categories:

- **Macro whitespace** — between major sections; controls page rhythm.
- **Micro whitespace** — between related elements (label and input, icon and text); controls scanability.
- **Active whitespace** — deliberately placed to direct attention.
- **Passive whitespace** — natural margins and padding.

Reducing whitespace to fit more content almost always loses comprehension faster than it gains density.

## Composition Rules of Thumb

- **Rule of thirds** for hero imagery and key focal placement.
- **Golden ratio (≈1.618)** is useful as a sanity check on proportions but rarely worth chasing precisely.
- **Optical alignment** beats mathematical alignment — circles, triangles, and asymmetric glyphs often need to be nudged 1–2px off true center to *look* centered.
- **Optical sizing** — a circle of the same height as a square reads as smaller; bump it ~5–10% larger to match visual weight.
