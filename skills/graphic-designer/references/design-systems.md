# Design Systems & Tokens

How to structure a scalable visual system that survives growth, theming, and hand-off.

## Token Tiers

Tokens are referenced in three layers. Each layer references the one below it; no layer skips.

| Tier | Example | Who consumes it |
|---|---|---|
| **Primitive** (raw values) | `color-blue-500: #2563EB`, `space-4: 16px` | Only semantic tokens — never components directly |
| **Semantic** (intent) | `color-action-primary`, `color-text-default`, `space-stack-md` | Component tokens; sometimes app code |
| **Component** (scoped) | `button-primary-bg`, `input-border-focus` | The component implementation |

**Why**: rebranding swaps primitives; restyling swaps semantic mappings; component-specific tweaks never leak into the global palette.

## Token Categories Worth Defining

Beyond color and type, every mature system tokenizes:

- **Spacing scale** — usually 4px or 8px base, exponential or linear (e.g., 4, 8, 12, 16, 24, 32, 48, 64).
- **Radius scale** — `none / sm / md / lg / full`. Four to five steps is plenty.
- **Elevation / shadow** — semantic tiers: `resting / raised / overlay / modal / popover`. Define both shadow and z-index per tier.
- **Motion** — duration (`fast / base / slow`), easing (`standard / decelerate / accelerate / emphasized`).
- **Type** — family, weight, size, line-height, letter-spacing, optical-size axis if variable.
- **Border width** — `hairline / thin / thick`. Three values.
- **Opacity** — `disabled`, `subtle`, `overlay-scrim`.

## Component Variants

Use design-tool variants (Figma component properties, Storybook args) to express the matrix:

- **Hierarchy**: primary / secondary / tertiary / ghost / destructive
- **Size**: sm / md / lg (sometimes xs / xl)
- **State**: rest / hover / pressed / focus-visible / disabled / loading
- **Optional decorations**: leading icon, trailing icon, caret, badge
- **Width**: hugging / filling

A button component without focus-visible and loading variants is incomplete.

## Cross-Platform Drift

Same design token, different rendering rules:

- **iOS**: respects Dynamic Type by default — type sizes must be relative, not fixed.
- **Android**: Material's elevation system maps shadow + tonal overlay; pure shadow tokens may need a tonal companion.
- **Web**: rem-based type scaling for user font-size preferences; px is acceptable for spacing and borders.
- **Email**: most tokens are inert. Inline styles, table layouts, web-safe stacks.

## Hand-off Without Drift

- Single source of truth. Either design tool exports → code (Tokens Studio, Style Dictionary, Figma Variables → JSON) or code is the source and the design tool subscribes.
- Never copy hex values from design into code by hand for production work — that is how drift starts.
- Diff token changes in PRs; a token rename is a breaking change.
- Visual regression testing (Chromatic, Percy, Playwright snapshot) catches token-level regressions that unit tests miss.

## When to Build a Design System

- **One product, small team**: don't build a system. Use tokens informally; converge as patterns repeat.
- **One product, growing team**: formalize tokens and primitive components; skip a full system.
- **Multiple products / platforms**: build the system. The cost is real but the alternative is N copies drifting.

A premature design system rots faster than ad-hoc components, because it carries the weight of "official" without the patterns to back it up.
