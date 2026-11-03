# Polish Review

Use this for final quality passes, pre-ship review, or when an interface is functional but still feels generic.

## Review Modes

- **Audit:** Find measurable issues: contrast, focus, responsiveness, missing states, performance, broken imports.
- **Critique:** Evaluate hierarchy, clarity, emotional tone, cognitive load, and whether the interface fits the product.
- **Normalize:** Align with the existing design system: tokens, spacing, type, radii, icon style, component variants.
- **Distill:** Remove anything that does not improve comprehension, trust, or task completion.
- **Polish:** Fix small alignment, spacing, state, copy, and motion details before shipping.

## AI-Slop Tells

Look for:

- Purple-blue gradients, neon accents, and dark glass UI with no product reason.
- Inter/system default typography where brand personality matters.
- Card grids with identical icon/title/text structure.
- Cards inside cards.
- Gradient text on headings or metrics.
- Generic hero metric layouts.
- Large icons above every heading.
- Redundant eyebrow labels and section labels.
- Overused startup words and fake-perfect numbers.
- Modal usage where inline editing, expansion, or a side panel would be better.
- Thick colored top borders on rounded cards.
- Border, shadow, background, hover, badge, and icon all competing on the same element.

## Polish Checklist

- One focal point is obvious.
- The first three seconds communicate what matters.
- Spacing groups related things and separates unrelated things.
- Typography alone reveals hierarchy.
- Colors that pop are the elements that matter.
- Active, focus, hover, pressed, disabled, loading, empty, and error states have been considered.
- Mobile order and touch targets are intentional.
- Repeated components use a consistent internal structure.
- Icons come from one visual family and have consistent weight.
- Copy is specific, short, and placed near the relevant control.
- Motion is purposeful, quick, and not doing layout work.

## Distillation Pass

Try removing:

- Decorative badges.
- Secondary icons.
- Extra borders.
- Competing shadows.
- Repeated headings.
- Weak helper text.
- Default containers.
- Redundant CTAs.
- Background decoration that does not support content.

If the design still works without it, keep it out.

## Product Fit

Do not apply the same polish everywhere:

- Operational tools need scanability, predictable navigation, compact density, and quiet motion.
- Marketing pages can use more art direction, image-led composition, and section-level motion.
- Luxury/editorial pages can lean on typography, whitespace, and tone.
- Dashboards should privilege comparison, anomaly detection, and repeat action over spectacle.
- Mobile apps need thumb-friendly controls and clear state more than dense desktop composition.
