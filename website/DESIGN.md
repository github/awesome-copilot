---
version: alpha
name: Copilot SDK Retro-Futuristic UI Design System
description: "A retro-futuristic, terminal-inspired, 8-bit/cyberpunk design system extracted from the supplied visual reference. Built for dark-mode developer tools, dashboards, SDK docs, agent interfaces, and data-heavy product UIs."
colors:
  primary: "#A970FF"
  secondary: "#2D8CFF"
  success: "#90FFB1"
  warning: "#FFC057"
  error: "#FF507C"
  surface: "#121416"
  background: "#0A0D0D"
  text: "#F5F7F7"
  text-muted: "#A7ADB2"
  text-subtle: "#6E767D"
  border: "#2A2F31"
  border-strong: "#4A5155"
  surface-hover: "#171B1D"
  surface-active: "#1D2326"
  black: "#000000"
  white: "#FFFFFF"
typography:
  display-xl:
    fontFamily: "Space Grotesk"
    fontSize: "48px"
    fontWeight: 800
    lineHeight: "56px"
    letterSpacing: "-0.02em"
  heading-lg:
    fontFamily: "Space Grotesk"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: "40px"
    letterSpacing: "-0.01em"
  heading-md:
    fontFamily: "Space Grotesk"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "28px"
    letterSpacing: "0em"
  body:
    fontFamily: "JetBrains Mono"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
    letterSpacing: "0em"
  body-sm:
    fontFamily: "JetBrains Mono"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: "0em"
  label:
    fontFamily: "JetBrains Mono"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "0.04em"
  code:
    fontFamily: "JetBrains Mono"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: "0em"
spacing:
  base: "4px"
  "0": "0px"
  "1": "4px"
  "2": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
  "12": "48px"
  "16": "64px"
  "24": "96px"
  container-max: "1280px"
  container-margin: "48px"
  mobile-padding: "16px"
  tablet-padding: "24px"
  desktop-padding: "32px"
  button-padding-x: "16px"
  button-padding-y: "12px"
  input-padding-x: "12px"
  input-padding-y: "16px"
  card-padding-x: "16px"
  card-padding-y: "20px"
  list-item-padding-x: "16px"
  list-item-padding-y: "16px"
rounded:
  none: "0px"
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
components:
  border-default:
    width: "1px"
    color: "rgba(255, 255, 255, 0.06)"
    style: "solid"
  border-strong:
    width: "1px"
    color: "rgba(255, 255, 255, 0.12)"
    style: "solid"
  shadow-sm:
    boxShadow: "0 2px 0 rgba(0, 0, 0, 0.40)"
  shadow-md:
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.60)"
  shadow-lg:
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.70)"
  focus-ring:
    borderColor: "{colors.primary}"
    boxShadow: "0 0 0 1px {colors.primary}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "#B886FF"
    textColor: "{colors.white}"
    boxShadow: "0 0 0 1px rgba(169, 112, 255, 0.40)"
  button-primary-active:
    backgroundColor: "#7F45E8"
    textColor: "{colors.white}"
  button-primary-disabled:
    backgroundColor: "#2B203F"
    textColor: "#6D5B85"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.secondary}"
    border: "1px solid {colors.secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  button-secondary-hover:
    backgroundColor: "rgba(45, 140, 255, 0.10)"
    textColor: "#6DB2FF"
  button-secondary-active:
    backgroundColor: "rgba(45, 140, 255, 0.18)"
    textColor: "{colors.secondary}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.success}"
    border: "1px solid rgba(144, 255, 177, 0.28)"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
  button-danger:
    backgroundColor: "rgba(255, 80, 124, 0.65)"
    textColor: "{colors.white}"
    border: "1px solid rgba(255, 80, 124, 0.80)"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
  input-default:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
    border: "1px solid rgba(255, 255, 255, 0.18)"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
    height: "36px"
    typography: "{typography.body-sm}"
  input-focused:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
    border: "1px solid {colors.primary}"
    boxShadow: "0 0 0 1px rgba(169, 112, 255, 0.24)"
  input-disabled:
    backgroundColor: "#0C0E0F"
    textColor: "{colors.text-subtle}"
    border: "1px solid rgba(255, 255, 255, 0.10)"
  select-default:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
    border: "1px solid rgba(255, 255, 255, 0.18)"
    iconColor: "{colors.success}"
    rounded: "{rounded.sm}"
    height: "36px"
  select-open:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text}"
    border: "1px solid {colors.success}"
    rounded: "{rounded.sm}"
  toggle-on:
    backgroundColor: "{colors.success}"
    thumbColor: "{colors.white}"
    width: "36px"
    height: "20px"
    rounded: "{rounded.full}"
  toggle-off:
    backgroundColor: "{colors.surface}"
    thumbColor: "{colors.text-muted}"
    border: "1px solid rgba(255, 255, 255, 0.20)"
    width: "36px"
    height: "20px"
    rounded: "{rounded.full}"
  checkbox-selected:
    backgroundColor: "{colors.success}"
    checkColor: "{colors.background}"
    border: "1px solid {colors.success}"
    size: "16px"
    rounded: "{rounded.sm}"
  checkbox-unselected:
    backgroundColor: "transparent"
    border: "1px solid rgba(255, 255, 255, 0.22)"
    size: "16px"
    rounded: "{rounded.sm}"
  badge-default:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  badge-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.background}"
    typography: "{typography.label}"
  badge-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.background}"
    typography: "{typography.label}"
  badge-error:
    backgroundColor: "{colors.error}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
  badge-outline:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    border: "1px solid {colors.primary}"
    typography: "{typography.label}"
  card-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    border: "1px solid rgba(255, 255, 255, 0.12)"
    rounded: "{rounded.md}"
    padding: "16px"
    boxShadow: "0 2px 0 rgba(0, 0, 0, 0.40)"
  card-hover:
    backgroundColor: "{colors.surface-hover}"
    border: "1px solid rgba(144, 255, 177, 0.45)"
    boxShadow: "0 0 16px rgba(144, 255, 177, 0.12)"
  list-item-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    border: "1px solid rgba(255, 255, 255, 0.08)"
    rounded: "{rounded.sm}"
    padding: "16px"
  list-item-hover:
    backgroundColor: "{colors.surface-hover}"
    border: "1px solid rgba(255, 255, 255, 0.14)"
  list-item-selected:
    backgroundColor: "rgba(169, 112, 255, 0.10)"
    border: "1px solid {colors.primary}"
  tab-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    border: "1px solid {colors.primary}"
    rounded: "{rounded.sm} {rounded.sm} 0 0"
  tab-inactive:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text-muted}"
    border: "1px solid rgba(255, 255, 255, 0.14)"
  pagination-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.sm}"
    size: "32px"
  pagination-inactive:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text-muted}"
    border: "1px solid rgba(255, 255, 255, 0.12)"
    rounded: "{rounded.sm}"
    size: "32px"
  alert-success:
    backgroundColor: "rgba(144, 255, 177, 0.06)"
    textColor: "{colors.text}"
    border: "1px solid {colors.success}"
    iconColor: "{colors.success}"
  alert-info:
    backgroundColor: "rgba(45, 140, 255, 0.06)"
    textColor: "{colors.text}"
    border: "1px solid {colors.secondary}"
    iconColor: "{colors.secondary}"
  alert-warning:
    backgroundColor: "rgba(255, 192, 87, 0.06)"
    textColor: "{colors.text}"
    border: "1px solid {colors.warning}"
    iconColor: "{colors.warning}"
  alert-error:
    backgroundColor: "rgba(255, 80, 124, 0.06)"
    textColor: "{colors.text}"
    border: "1px solid {colors.error}"
    iconColor: "{colors.error}"
  skeleton:
    backgroundColor: "#2A2F31"
    highlightColor: "#3A4246"
    rounded: "{rounded.sm}"
  empty-state-cta:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.sm}"
    height: "40px"
---

# Copilot SDK Retro-Futuristic UI Design System

## Overview

This design system is a dark-mode, retro-futuristic interface language for developer-facing web products. It combines terminal UI structure, pixel-art details, cyberpunk neon accents, and dense technical documentation patterns. The visual personality should feel engineered, playful, precise, and slightly arcade-like without losing usability.

The reference product identity is **GitHub Copilot SDK**: a developer platform that should feel fast, intelligent, hackable, and UI-native. The interface should look like a living technical control panel: black background, thin grid borders, monospace microcopy, purple primary actions, green success states, blue links, and pixel-inspired iconography.

Use this system for landing pages, SDK documentation, dashboards, AI agent consoles, code tooling, internal developer portals, data visualization screens, and component-heavy web apps.

Design principles:

- **Terminal-first structure:** layouts are divided by thin 1px borders, panel grids, and compact information density.
- **Neon accents, controlled usage:** purple is the brand/action color, green is success/terminal signal, blue is secondary action/info, yellow is warning, and red is destructive/error.
- **8-bit personality:** pixel icons, blocky forms, low-radius corners, and subtle grid patterns create a retro-cyberpunk identity.
- **Functional density:** components may be compact, but labels, focus states, hit targets, and contrast must remain accessible.

## Colors

The system is built for **dark mode only**. The background is near-black, surfaces are slightly lifted dark panels, and all meaning is carried by high-contrast neon semantic colors.

| Token | Value | Role |
|---|---:|---|
| `primary` | `#A970FF` | Main brand color, primary buttons, active tabs, selected states, progress indicators, hero highlights. |
| `secondary` | `#2D8CFF` | Secondary buttons, links, informational alerts, secondary chart series. |
| `success` | `#90FFB1` | Success states, positive feedback, terminal accents, selected checkboxes, on toggles. |
| `warning` | `#FFC057` | Warning states, caution badges, warning alerts, chart caution series. |
| `error` | `#FF507C` | Error states, destructive buttons, validation errors, destructive alerts. |
| `surface` | `#121416` | Cards, panels, inputs, elevated sections, component interiors. |
| `background` | `#0A0D0D` | Page background, modal backdrops, empty state background, terminal canvas. |
| `text` | `#F5F7F7` | Primary foreground text. |
| `text-muted` | `#A7ADB2` | Supporting text, descriptions, inactive labels. |
| `text-subtle` | `#6E767D` | Disabled text, placeholders, metadata. |
| `border` | `#2A2F31` | Default visible border approximation. Use alpha borders in CSS when supported. |
| `border-strong` | `#4A5155` | Stronger separators, active outlines, dense table borders. |

Color usage rules:

- Use `background` for the full page shell and large empty areas.
- Use `surface` for cards, tables, forms, alerts, panels, dropdowns, and list items.
- Use `primary` only for the most important action or currently selected navigation state.
- Use `success` sparingly for positive state, validation success, terminal signal, icons, and micro accents.
- Use `secondary` for links and informational feedback, never as the main call-to-action when a primary action exists.
- Use `warning` and `error` only when the UI is communicating risk, caution, validation failure, or destructive action.
- Prefer translucent backgrounds for semantic alerts: `rgba(token, 0.06)` to `rgba(token, 0.12)` with a 1px token-colored border.

Chart colors should follow this sequence:

1. `primary` / `#A970FF`
2. `secondary` / `#2D8CFF`
3. `success` / `#90FFB1`
4. `warning` / `#FFC057`
5. `error` / `#FF507C`
6. Deeper purple variant / `#6B35D9`

## Typography

The typography intentionally mixes a geometric display family with a technical monospace body family.

- **Headings and UI display:** `Space Grotesk`, used for hero text, section titles, brand lockups, component headings, large labels, active navigation, and high-emphasis UI text.
- **Body and code:** `JetBrains Mono`, used for body copy, tables, labels, form text, captions, tokens, code snippets, metadata, and all dense technical content.

Typography scale:

| Token | Family | Size / Line height | Weight | Usage |
|---|---|---:|---:|---|
| `display-xl` | Space Grotesk | `48px / 56px` | `800` | Pixel-inspired hero titles, brand wordmarks, extra-large page titles. |
| `heading-lg` | Space Grotesk | `32px / 40px` | `700` | Large titles and major page sections. |
| `heading-md` | Space Grotesk | `20px / 28px` | `600` | Section headers, card titles, module headings. |
| `body` | JetBrains Mono | `16px / 24px` | `400` | Main body copy, readable paragraphs, documentation content. |
| `body-sm` | JetBrains Mono | `14px / 20px` | `400` | Supporting copy, table cells, form values, compact panels. |
| `label` | JetBrains Mono | `12px / 16px` | `600` | Labels, badges, button text, metadata, table headers. |
| `code` | JetBrains Mono | `14px / 20px` | `400` | Inline code, code blocks, terminal snippets. |

Typography behavior:

- Use uppercase labels for panel titles, metadata, and token names when the UI needs a technical, system-like rhythm.
- Keep headings tight but readable; avoid overly soft editorial typography.
- Use monospace for most interface copy to preserve the terminal/product-engineering feeling.
- Use `primary` or `success` for highlighted words, but never color entire paragraphs with neon colors.

## Layout

The layout follows a **panel-grid terminal system**. Large screens should feel like a design console: clearly divided sections, compact cards, data tables, chart panels, and component groups separated by thin borders.

Spacing system:

| Token | Value | Usage |
|---|---:|---|
| `spacing.0` | `0px` | Reset, flush edges. |
| `spacing.1` | `4px` | Micro gaps, icon nudges, dense inline alignment. |
| `spacing.2` | `12px` | Compact internal spacing, small button gaps. |
| `spacing.4` | `16px` | Default component padding, card interior, list item padding. |
| `spacing.6` | `24px` | Panel grouping, tablet container padding. |
| `spacing.8` | `32px` | Desktop container padding, section spacing. |
| `spacing.12` | `48px` | Outer margin, major section rhythm. |
| `spacing.16` | `64px` | Large visual separation. |
| `spacing.24` | `96px` | Hero spacing and large layout breaks. |

Container strategy:

- Max content width: `1280px`.
- Desktop side margin: `48px`.
- Desktop inner container padding: `32px`.
- Tablet inner container padding: `24px`.
- Mobile inner container padding: `16px`.
- Maintain a strict 4px base rhythm. Prefer values from the spacing scale instead of arbitrary spacing.

Component padding recommendations:

| Component | Padding |
|---|---:|
| Buttons | `12px 16px` |
| Inputs | `12px 16px` |
| Cards | `16px 20px` |
| List items | `16px 16px` |
| Alerts | `12px 16px` |
| Badges | `4px 8px` |

Layout behavior:

- Use bordered panels instead of floating glassmorphism.
- Prefer grid layouts over large empty whitespace.
- Keep data-heavy screens compact but organized.
- Use visible section numbers or terminal-like labels when useful.
- Avoid rounded, soft SaaS layouts that dilute the retro-console aesthetic.

## Elevation & Depth

Depth is subtle and should feel like dark terminal layers, not material design elevation. Use low-spread shadows, thin borders, and slight surface shifts to separate content.

Shadow tokens:

| Token | Value | Usage |
|---|---|---|
| `shadow-sm` | `0 2px 0 rgba(0, 0, 0, 0.40)` | Small controls, default cards, buttons. |
| `shadow-md` | `0 4px 12px rgba(0, 0, 0, 0.60)` | Dropdowns, popovers, hover cards. |
| `shadow-lg` | `0 8px 24px rgba(0, 0, 0, 0.70)` | Modals, command palettes, overlays. |

Border system:

| Token | Value | Usage |
|---|---|---|
| `border-default` | `1px solid rgba(255, 255, 255, 0.06)` | Large panel boundaries and subtle section divisions. |
| `border-strong` | `1px solid rgba(255, 255, 255, 0.12)` | Cards, inputs, tables, active panels. |
| `focus-ring` | `1px solid #A970FF` + soft purple glow | Keyboard focus and focused form controls. |

Elevation rules:

- Do not use bright outer glows on every card. Reserve glow for hover, focus, selected, or live/active states.
- Use `surface-hover` only when the component is interactive.
- Dropdowns and overlays may use `shadow-md` or `shadow-lg`, but must keep a visible border.
- Prefer border contrast over heavy shadows.

## Shapes

The shape language is squared, engineered, and pixel-aware. Corners should be low-radius, never pill-shaped except for toggles and circular progress indicators.

Radius tokens:

| Token | Value | Usage |
|---|---:|---|
| `none` | `0px` | Sharp dividers, grid cells, terminal containers. |
| `sm` | `4px` | Buttons, inputs, badges, tabs, pagination. |
| `md` | `8px` | Cards, dropdowns, list items, alert containers. |
| `lg` | `12px` | Larger panels and grouped modules. |
| `xl` | `16px` | Rare: large containers or empty states. |
| `full` | `9999px` | Toggles, circular indicators, avatars only. |

Shape rules:

- Default interactive radius: `4px`.
- Default card radius: `8px`.
- Do not mix pill buttons with pixel icons unless the component is a toggle.
- Icons may use square/pixel silhouettes even when placed inside a `4px` or `8px` container.

## Components

### Buttons

Buttons are compact, high-contrast, and stateful. Use a right chevron or small icon only when the action moves the user forward.

**Primary button**

- Background: `primary` / `#A970FF`.
- Text: `white`.
- Radius: `sm` / `4px`.
- Padding: `12px 16px`.
- Font: `label`.
- Hover: slightly brighter purple `#B886FF` with a subtle purple outline/glow.
- Active: deeper purple `#7F45E8`.
- Disabled: muted dark purple background with low-contrast text.
- Use for the single main action on a screen, such as **Create project**.

**Secondary button**

- Background: transparent.
- Text and border: `secondary` / `#2D8CFF`.
- Hover: translucent blue fill.
- Use for secondary workflows, links, alternate actions, and utility actions.

**Ghost button**

- Background: transparent.
- Text: `success` / `#90FFB1`.
- Border: faint success border.
- Use for low-emphasis terminal-like actions such as **Learn more**.

**Danger button**

- Background: translucent `error`.
- Border: `error`.
- Text: `white`.
- Use only for destructive actions such as **Delete**.

### Inputs

Inputs should look like terminal command fields.

- Default background: `background`.
- Border: `border-strong`.
- Radius: `sm`.
- Height: about `36px`.
- Padding: `12px 16px`.
- Placeholder: `text-subtle`.
- Focus state: purple border with a soft purple focus ring.
- Disabled state: darker background, muted placeholder, reduced border contrast.
- With icon: place icon left at `16px`, use muted text color unless active.

Validation:

- Success validation uses a `success` border or inline icon.
- Error validation uses an `error` border and a short helper message in `error` color.
- Never rely on color alone; include text or icon feedback.

### Select

Select components match inputs but add a green terminal-like chevron.

- Default background: `background`.
- Border: `border-strong`.
- Text: `text`.
- Chevron: `success`.
- Focus: `primary` border.
- Open state: dropdown uses `surface`, visible border, and `shadow-md`.
- Options should be compact with `body-sm` typography and a `surface-hover` hover state.

### Toggles and Checkboxes

**Toggle**

- On: track uses `success`, thumb uses `white`.
- Off: track uses `surface`, thumb uses `text-muted`, border uses `border-strong`.
- Shape: `full` radius.
- Keep the text label close to the control and indicate `ON` / `OFF` where helpful.

**Checkbox**

- Selected: fill `success`, checkmark `background`.
- Unselected: transparent fill, `border-strong` border.
- Size: `16px`.
- Radius: `sm`.
- Focus: purple focus ring.

### Badges

Badges are compact status indicators with monospace labels.

| Variant | Background | Text | Usage |
|---|---|---|---|
| Default | `primary` | `white` | Generic status, selected metadata. |
| Success | `success` | `background` | Generated, active, completed, healthy. |
| Warning | `warning` | `background` | Warning, pending, needs review. |
| Error | `error` | `white` | Error, failed, destructive status. |
| Outline | transparent | `primary` | Neutral/secondary categorization. |

Badge rules:

- Use `label` typography.
- Use `4px 8px` padding.
- Keep text short: one or two words.
- Avoid placing more than three badges in a single card header.

### Cards

Cards are dark, bordered, compact containers. They may include pixel-art icons, short descriptions, and a ghost CTA.

Default card:

- Background: `surface`.
- Border: `1px solid rgba(255, 255, 255, 0.12)`.
- Radius: `md`.
- Padding: `16px`.
- Shadow: `shadow-sm`.

Hover card:

- Background: `surface-hover`.
- Border: faint `success` border.
- Shadow: subtle green glow.
- CTA: success text such as **Learn more →**.

Card content hierarchy:

1. Pixel icon or compact visual mark.
2. Title using `heading-md` or `label` depending on density.
3. Supporting copy using `body-sm`.
4. Optional ghost link in `success`.

### List Items

List items are compact, clickable rows with optional icon tile and trailing chevron.

- Default background: `surface`.
- Hover: `surface-hover`.
- Selected: translucent `primary` background with `primary` border.
- Leading icon tile: small purple square with pixel-style icon.
- Title: `label` or `body-sm` with strong weight.
- Supporting text: `body-sm` or smaller muted text.
- Trailing indicator: chevron in `text-muted` or `text` on hover.

### Tabs

Tabs are rectangular and grid-aligned.

- Active tab: `primary` background, `white` text.
- Inactive tab: `background` or `surface`, muted text, subtle border.
- Radius: `sm` on top corners.
- Tab panels: bordered `surface` panel with `16px` internal padding.
- Avoid animated pill tabs; this system should feel like a terminal panel switcher.

### Pagination

Pagination buttons use the same compact square geometry as controls.

- Size: `32px` square.
- Active page: `primary` background, `white` text.
- Inactive page: `background` with `border-default`.
- Disabled arrows: muted text and reduced opacity.
- Use ellipsis for skipped ranges.

### Progress

Progress should communicate technical status, not decoration.

Linear progress:

- Track: dark `surface-active`.
- Fill: `primary`.
- Label: percentage in `body-sm`.
- Height: about `4px` to `6px`.

Circular progress:

- Track: dark surface ring.
- Fill: `primary`.
- Center label: percentage using `body` or `heading-md`.
- Use for compact status cards or dashboard widgets.

### Data Visualization

Charts should look like terminal analytics panels.

General rules:

- Background: `background` or `surface`.
- Grid lines: very subtle `rgba(255, 255, 255, 0.06)`.
- Axis labels: `text-muted`, `label` or `body-sm` typography.
- Chart labels and legends must be readable and not rely only on color.
- Use the chart color sequence from the Colors section.

Bar charts:

- Use `primary` bars by default.
- Bars may have a pixel/block feel rather than rounded pill bars.
- Keep value labels compact.

Donut charts:

- Use `primary`, `success`, `warning`, and `error` for semantic slices.
- Center label may show total value, e.g. `Total 128`.
- Legend should include percentages.

Data tables:

- Header row uses `label` typography, uppercase labels, muted text.
- Rows use `body-sm`.
- Borders are thin and low-contrast.
- Status values use semantic colors: Active = `success`, Warning = `warning`, Error = `error`.
- Pagination appears below the table with compact square buttons.

### Alerts and Feedback

Alerts are bordered, compact, and semantic. Use an icon at the left, title on top, and one short supporting line.

| Variant | Border / Icon | Background | Usage |
|---|---|---|---|
| Success | `success` | `rgba(144, 255, 177, 0.06)` | Completion, saved state, healthy operation. |
| Info | `secondary` | `rgba(45, 140, 255, 0.06)` | Neutral information or guidance. |
| Warning | `warning` | `rgba(255, 192, 87, 0.06)` | Needs review, caution, non-blocking risk. |
| Error | `error` | `rgba(255, 80, 124, 0.06)` | Failed action, validation block, destructive consequence. |

Alert copy:

- Title should be one word or short phrase: `SUCCESS`, `INFO`, `WARNING`, `ERROR`.
- Description should be one sentence.
- Do not stack more than three alerts unless they are in a log/feed interface.

### Loading and Empty States

Loading states use dark skeleton blocks with a subtle highlight.

Skeleton loading:

- Background: `#2A2F31`.
- Highlight: `#3A4246`.
- Radius: `sm`.
- Use blocky rectangles, not soft shimmer-heavy placeholders.
- Match the structure of the final content: avatar block, title line, metadata lines, table rows.

Empty states:

- Use a pixel mascot or pixel icon when possible.
- Title: concise and direct, e.g. **No projects found**.
- Body: one sentence explaining how to start.
- CTA: primary button, e.g. **Create project →**.
- Empty state should sit inside a bordered panel, not on a pure blank page.

### Iconography

Iconography is pixel-inspired and should feel like a compact terminal icon set.

Rules:

- Style: pixel / 1.5px stroke.
- Default sizes: `16px`, `20px`, `24px`, `32px`.
- Use hard edges, simple silhouettes, and minimal detail.
- Default icon color: `primary` for brand/action icons and `success` for terminal/status icons.
- Warning/error icons must use their semantic token.
- Avoid realistic, filled, soft, or skeuomorphic icons.
- Icons should remain legible at `16px`.

Recommended icon categories:

- Terminal / command window.
- Rocket / launch.
- Lightning / automation.
- Cube / package.
- Database / storage.
- Code brackets.
- User / team.
- Gear / settings.
- Check / success.
- Plus / create.
- Bell / notification.
- Info / warning / error.
- Trash / delete.
- Search / inspect.
- Menu / list.

## Do's and Don'ts

Do:

- Do use a near-black background with dark panels and visible 1px borders.
- Do keep primary actions purple and reserve `primary` for high-emphasis interactions.
- Do use green for terminal-like success, selected checkboxes, on toggles, and positive feedback.
- Do use monospace typography for dense UI, labels, tables, and code-oriented content.
- Do keep corners compact: `4px` for controls and `8px` for cards.
- Do use pixel-style icons and small mascot illustrations to reinforce the retro SDK identity.
- Do preserve keyboard focus states with visible purple outlines.
- Do use chart legends and labels so color is not the only source of meaning.

Don't:

- Don't use light mode unless a full separate palette is intentionally designed.
- Don't use large soft shadows, glassmorphism, glossy gradients, or rounded SaaS pill components.
- Don't overuse neon colors on large surfaces; use them as accents and state signals.
- Don't place multiple competing primary buttons in the same panel.
- Don't use decorative icons that become illegible at `16px`.
- Don't rely on color alone for errors, warnings, selected states, or chart meaning.
- Don't mix serif/editorial typography with this system.
- Don't use arbitrary spacing values outside the 4px-based scale.

Accessibility guardrails:

- Maintain WCAG AA contrast for normal text and interactive controls.
- Every interactive element must have a visible focus state.
- All flows must be keyboard navigable.
- Semantic alerts must include text plus icon, not color alone.
- Inputs must have associated labels or accessible names.
- Touch targets should be at least `44px × 44px` on mobile, even when the visual control is smaller.
- Use `aria-current` for active pagination/tabs and `aria-selected` where appropriate.
- Use `aria-live` politely for async feedback such as generated/saved/completed messages.
