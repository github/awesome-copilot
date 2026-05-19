---
name: graphic-designer
description: 'Expert visual design guidance for UI and UX of GUI apps and websites. Use when asked to design, critique, or improve interface visuals, color palettes, typography, layout grids, design tokens, component states, micro-interactions, or accessibility of screens. Covers visual hierarchy, Gestalt principles, Laws of UX (Fitts, Hick, aesthetic-usability), the 60-30-10 color rule, bento grids, glassmorphism, dopamine palettes, WCAG contrast, motion easing, and 2026 trends like tactile maximalism and adaptive UI.'
---

# Graphic Designer

Apply professional UI/UX visual design judgment to mockups, components, screens, and full interfaces. Translate vague aesthetic requests ("make it pop", "looks dated", "feels cluttered") into concrete, defensible design decisions grounded in perception research and current platform conventions.

## When to Use This Skill

- Designing or reviewing screens, components, landing pages, dashboards, or mobile app UI
- Picking color palettes, type scales, spacing, or grid systems
- Defining design tokens or component variants for a design system
- Improving visual hierarchy, scannability, or conversion on an existing layout
- Adding or auditing micro-interactions, state transitions, and motion
- Making a UI accessible (WCAG contrast, neurodivergent-friendly patterns, dynamic type)
- Modernizing a "flat 2018" interface against current 2026 expectations

## Core Decision Framework

Every visual decision should answer three questions in order:

1. **Where does the eye land first?** — primary action must win the contrast/size/position battle. Run a 5-second squint test; if the CTA disappears at 30% opacity, hierarchy is broken.
2. **What does the user need to perceive as related?** — apply Gestalt proximity and similarity *before* adding borders, dividers, or boxes. Whitespace groups more cleanly than lines.
3. **What can be hidden until needed?** — progressive disclosure beats density. Every visible element pays rent in cognitive load.

## Visual System Defaults

Use these as starting points, then deviate with reason:

| System | Default | Notes |
|---|---|---|
| Color ratio | **60-30-10** (dominant / secondary / accent) | Accent is reserved for primary CTAs and critical state |
| Type scale | 1.250 (major third) or 1.333 (perfect fourth) | Tighter scales feel editorial; wider scales feel marketing |
| Base unit | 4px or 8px spacing grid | Every padding/margin is a multiple — no `padding: 13px` |
| Body text | 16px minimum on web, 17pt on iOS, 14sp on Android | Below 16px on web fails most accessibility audits |
| Line length | 45–75 characters | Long-form prose; UI labels can be shorter |
| Line height | 1.4–1.6 for body, 1.1–1.25 for display | Tight headings, generous body |
| Corner radius | One scale (e.g., 4 / 8 / 16 / full) | Mixing arbitrary radii ages a UI fast |
| Elevation | 3–5 shadow tiers max | Use them semantically (resting / raised / overlay / modal) |

## Color & Contrast

- **WCAG minimums**: 4.5:1 for body text, 3:1 for large text (≥18pt or 14pt bold) and UI components. AAA is 7:1 / 4.5:1. Glass/blur backgrounds usually fail — test against worst-case content behind them.
- **Dopamine palettes** (saturated neons, Y2K) need a desaturated 60% dominant to remain usable; pure saturation everywhere reads as a children's toy.
- **Dark mode is not "invert"** — pure white text on pure black causes halation. Use `#E6E6E6` on `#121212` style off-blacks.
- **Never encode information by hue alone.** Pair color with icon, label, or shape (red error + ⚠ + "Error:").
- State colors live on a separate axis from brand: success/warning/error/info should survive a brand refresh.

## Typography

- **Two families maximum.** One display, one text. A third for monospace if the product shows code or numerics that need alignment.
- **Optical sizing matters at scale.** Display weights at body size look bloated; text weights at hero size look weak. Use variable fonts with optical-size axes (`opsz`) when available.
- **Numerals**: tabular figures (`font-variant-numeric: tabular-nums`) for tables, dashboards, and any column of numbers. Proportional figures everywhere else.
- **Kinetic / oversized type** is the dominant 2026 hero pattern, but it eats accessibility if it animates without a `prefers-reduced-motion` fallback.

## Layout Patterns Worth Knowing

- **Bento grid** — modular tiles of varying sizes; ideal for feature showcases, dashboards, and portfolios. Each tile must be self-contained (one idea, one CTA).
- **F-pattern** for text-heavy pages; **Z-pattern** for sparse landing pages. Place primary CTA at the terminus of the expected scan path.
- **Asymmetric / broken-grid** is back in 2026 marketing UI, but production app UI still rewards strict grids.
- **Scroll-driven storytelling** is the default long-form pattern; budget for IntersectionObserver-based reveals, not scroll-jacking.

## Motion & Micro-interactions

- **Durations**: 100–200ms for state changes (hover, press), 200–400ms for transitions (open/close), 400–800ms only for narrative reveals. Anything over 800ms feels broken.
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` (Material "standard") is a safe default. Linear easing should only appear on indeterminate spinners.
- **Always respect `prefers-reduced-motion`** — replace transforms with opacity fades, never remove feedback entirely.
- Every interactive element needs four visual states minimum: rest, hover, active/pressed, focus-visible. Disabled is a fifth when applicable.
- **Tactile maximalism** ("squishy UI") — buttons that compress 2–4% on press with a brief overshoot on release. Reads as premium on touch devices, gimmicky if every element does it.

## Design Tokens & Systems

- Tokens are tiered: **primitive** (`color-blue-500`) → **semantic** (`color-action-primary`) → **component** (`button-primary-bg`). Components reference semantic, never primitive.
- Spacing, radius, elevation, motion duration, and z-index all deserve token sets — not just color and type.
- **One source of truth** between design tool and code. Hand-off without sync drift means using Style Dictionary, Tokens Studio, or platform-native variables — not screenshots.

## Accessibility (Non-Negotiable Floor)

- Contrast ratios per WCAG 2.2 AA (above).
- Hit targets ≥44×44 pt (iOS) / 48×48 dp (Android) / 24×24 CSS px minimum on web with adequate spacing.
- Focus indicators must be visible against every background they cross — a 2px ring in brand color often fails on brand-colored sections; use a contrasting outline + offset.
- Support OS-level dynamic type up to 200%. Test that no text clips, truncates without affordance, or breaks layout.
- **Neurodivergent-friendly defaults**: avoid auto-playing motion, allow disabling parallax, keep cognitive load chunked, never rely on time-limited interactions without a pause control.

## 2026 Trend Cheat Sheet

Apply selectively — trendy ≠ correct for every product.

- **Tactile maximalism** — glossy, clay, jelly textures with realistic depth. Strong for consumer/creative tools, wrong for finance/enterprise.
- **Dopamine + Y2K palettes** — saturated neons, chrome, gradients. Balance with desaturated dominant per 60-30-10.
- **Glassmorphism (refined)** — translucent surfaces with backdrop-blur. Always verify text contrast against the *worst-case* content behind the glass.
- **Bento grids** — feature showcases, settings screens, dashboards.
- **Adaptive / "vibe" UI** — theme shifts by mood, time, or focus state. Requires a deterministic fallback theme.
- **Controlled imperfection** — hand-drawn marks, collage textures, scribbles. Reads human; do not mix with hyper-precise grids unless deliberately contrasted.
- **Multimodal affordances** — even click/tap apps should expose voice and keyboard paths; design icons that work across input methods.

## Gotchas

- **Never** ship a glass/blur surface without testing text contrast against the darkest *and* brightest content that can scroll behind it. Designers reliably forget the bright case.
- **Never** apply Y2K saturation across an entire palette — keep one accent saturated and desaturate the rest, or the UI becomes illegible.
- **Never** specify pixel values without a token. `margin-top: 13px` is the canary for a design system in collapse.
- **Never** rely on hover for critical information or actions — touch users have no hover, and keyboard users need focus parity.
- **Never** animate `width`/`height`/`top`/`left` for transitions — animate `transform` and `opacity` to stay on the compositor thread.
- **Never** use placeholder text as the only label. It vanishes on focus and fails screen readers.
- The **aesthetic-usability effect** is real but cuts both ways: a beautiful UI hides usability flaws *during testing*, then surfaces them as churn. Test with real tasks, not first impressions.
- Trendy ≠ timeless. Default the long-lived parts of a system (type scale, spacing, accessibility) to conservative choices, and confine trends to surface treatments that can be swapped.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| "Feels cluttered" | Weak hierarchy, no whitespace, equal-weight elements competing | Demote secondary elements, increase spacing, raise contrast on the one primary action |
| "Looks dated" | Tight radii + flat fills + 2018 sans-serif + heavy borders | Soften radii to one scale, replace borders with spacing or subtle elevation, refresh type |
| "Feels cheap" | Inconsistent spacing, mixed corner radii, low-quality imagery, default OS shadows | Enforce spacing scale, unify radii, audit photography/iconography, design custom shadows |
| "CTA gets lost" | Accent color used everywhere; CTA blends in | Reserve accent for CTA only; demote other accent uses to secondary palette |
| "Brand doesn't pop" | Brand color used as background everywhere, not as accent | Move brand to accent role; pick a neutral dominant |
| "Inaccessible per audit" | Insufficient contrast, missing focus rings, hover-only affordances | Run automated audit (axe), then manual keyboard + screen reader pass |
| "Animations feel janky" | Animating layout properties or running on main thread | Switch to `transform`/`opacity`; throttle non-essential motion; respect `prefers-reduced-motion` |

## References

- [Principles deep-dive](./references/principles.md) — visual hierarchy, Gestalt, Laws of UX
- [Design systems & tokens](./references/design-systems.md) — tiered tokens, variants, hand-off
- [Accessibility checklist](./references/accessibility.md) — WCAG 2.2 AA practical pass
- [2026 trends with caveats](./references/trends-2026.md) — when to adopt, when to skip
