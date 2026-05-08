---
name: enel-design-system
description: 'Enel Design System theme for Zensical documentation sites. Use when modifying colors, typography, layout, dark mode, or Zensical theme overrides. Covers CSS custom properties, light/dark palette configuration, tab bar styling, card components, button styles, and MkDocs Material theme integration. Triggers on requests like "change theme colors", "update dark mode", "fix styling", "adjust typography", or "modify Zensical theme".'
---

# ENEL Design System — Zensical Theme

## When to Use This Skill

- User asks to modify theme colors, typography, or layout in the documentation site
- User asks to adjust dark mode or light mode appearance
- User asks to update Zensical/MkDocs theme configuration
- User mentions "Enel design system", "theme", "CSS tokens", "dark mode", or "Zensical styling"

## Prerequisites

- This repository opened as the active workspace
- `zensical.toml` at repository root with `[project.theme]` section
- `docs/stylesheets/extra.css` for CSS overrides

## Reference

- Design System Storybook: `https://eneldesignsystem-dev.enelint.global`
- Tokens extracted from: `https://www.enel.com` corporate CSS bundle

## Scope

- Theme config: `zensical.toml` — `[project.theme]` section
- CSS overrides: `docs/stylesheets/extra.css`
- Logo image: `docs/assets/images/enel-logo.png`
- Template overrides: `overrides/` directory

## Color Tokens

| Token               | Hex       | Usage                          |
| -------------------- | --------- | ------------------------------ |
| `--enel-primary`     | `#d3135a` | Magenta — primary brand color  |
| `--enel-secondary`   | `#0047cc` | Ocean blue — accent / links    |
| `--enel-ocean`       | `#0047cc` | Alias for secondary            |
| `--enel-dark-ocean`  | `#003eb3` | Darker ocean shade             |
| `--enel-dark-green`  | `#008c5a` | Dark green                     |
| `--enel-green`       | `#55be5a` | Green                          |
| `--enel-light-blue`  | `#41b9e6` | Light blue                     |
| `--enel-light-ocean` | `#0152e8` | Light ocean                    |
| `--enel-black`       | `#0e141a` | Near-black — tabs bar, footer  |
| `--enel-smoke`       | `#667790` | Muted text                     |
| `--enel-dark-snow`   | `#c2cddd` | Borders, dividers              |
| `--enel-snow`        | `#eff2f7` | Light backgrounds              |
| `--enel-white`       | `#fff`    | Page background                |
| `--enel-magenta`     | `#d3135a` | Alias for primary              |
| `--enel-orange`      | `#ff5a0f` | Warning accent                 |
| `--enel-yellow`      | `#ffc82c` | Highlight, chart "not yet"     |
| `--enel-cyan`        | `#12caea` | Info accent                    |
| `--enel-red`         | `#eb0a00` | Error                          |
| `--enel-success`     | `#13ce66` | Success                        |

## Chart Color Conventions

Adoption charts use these specific colors:

| Bucket       | Color     |
| ------------ | --------- |
| lastWeek     | `#028C59` |
| last2Weeks   | `#55BD5A` |
| lastMonth    | `#0655FA` |
| more         | `#40B9E6` |
| notyet       | `#FFC000` |

## Theme Architecture

### Zensical config (`zensical.toml`)

- Light scheme named `"enel"`, dark scheme `"slate"`
- `primary = "custom"` and `accent = "custom"` — colors defined in CSS, not in config
- Logo set via `logo = "assets/images/enel-logo.png"`
- Font: `Inter` for text, `Roboto Mono` for code
- Custom overrides directory: `overrides/`

### CSS structure (`docs/stylesheets/extra.css`)

1. **Design tokens** — `:root` block with all `--enel-*` variables
2. **Logo sizing** — `.md-header__button.md-logo img` at `2rem`
3. **Light scheme** — `[data-md-color-scheme="enel"]` maps tokens to `--md-*` variables
4. **Dark scheme** — `[data-md-color-scheme="slate"]` overrides for dark mode
5. **Header / Tabs** — Dark tabs bar (`--enel-black`), white text, `!important` on active/hover
6. **Navigation** — Active link color uses `--enel-primary`
7. **Typography** — Bold h1, bordered h2, dark-mode color overrides
8. **Cards** — Rounded borders, magenta hover glow
9. **Buttons** — Primary uses magenta
10. **Layout** — Max-width 1440px, chart canvas 100%, flex wrapper for chart articles
11. **Footer** — Magenta top border

## Rules

- Always use `--enel-*` CSS custom properties, never hardcode hex values except in the `:root` token block.
- Light scheme selectors use `[data-md-color-scheme="enel"]`, dark uses `[data-md-color-scheme="slate"]`.
- The tabs bar must keep `background-color: var(--enel-black)` with white text — the built-in CSS uses `color: inherit` and `opacity`, so set `color` on `.md-tabs` and use `!important` on hover/active states.
- Card hover effect: magenta border + shadow `rgba(211, 19, 90, 0.12)`.
- The logo is a PNG file (768×560) displayed at `height: 2rem`. Use the built-in Zensical `logo` config — do not use a custom partial override.
- Font "Roobert" is the official ENEL typeface but is proprietary. Use "Inter" as the web substitute.
