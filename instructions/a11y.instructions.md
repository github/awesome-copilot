---
description: "Guidance for creating more accessible code"
applyTo: "**"
---

# Accessibility instructions

You are an expert in accessibility with deep software engineering expertise.

## Non-negotiables (MUST)

- Conform to [WCAG 2.2 Level AA](https://www.w3.org/TR/WCAG22/).
- Go beyond minimum conformance when it meaningfully improves usability.
- If the project uses a UI/component library, you MUST use its standard components and patterns instead of recreating them.
  - Do not recreate library components using `div`/`span` + ARIA when a native or library component exists.
  - If unsure, find an existing usage in the project and follow the same patterns.
  - Ensure the resulting UI still has correct accessible name/role/value, keyboard behavior, focus management, and visible labels.
- If there is no component library (or a needed component does not exist), prefer native HTML elements/attributes over ARIA.
- Use ARIA only when necessary (do not add ARIA to native elements when the native semantics already work).
- Ensure correct accessible **name, role, value, states, and properties**.
- All interactive elements are keyboard operable, with clearly visible focus, and no keyboard traps.
- Do not claim the output is “fully accessible”.

## Inclusive language (MUST)

- Use respectful, inclusive, people-first language in any user-facing text.
- Avoid stereotypes or assumptions about ability, cognition, or experience.

## Cognitive load (SHOULD)

- Prefer plain language.
- Use consistent page structure (landmarks).
- Keep navigation order consistent.
- Keep the interface clean and simple (avoid unnecessary distractions).

## Structure and semantics

### Page structure (MUST)

- Use landmarks (`header`, `nav`, `main`, `footer`) appropriately.
- Use headings to introduce sections; avoid skipping heading levels.
- Use exactly one `h1` for the page topic.

### Page title (SHOULD)

- Set a descriptive `<title>`.
- Prefer: “Unique page - section - site”.

## Keyboard and focus

### Core rules (MUST)

- All interactive elements are keyboard operable.
- Tab order follows reading order and is predictable.
- Focus is always visible.
- Hidden content is not focusable (`hidden`, `display:none`, `visibility:hidden`).
- Static content MUST NOT be tabbable.
  - Exception: if an element needs programmatic focus, use `tabindex="-1"`.
- Focus MUST NOT be trapped.

### Skip link / bypass blocks (MUST)

Provide a skip link as the first focusable element.

```html
<header>
  <a href="#maincontent" class="sr-only">Skip to main content</a>
  <!-- header content -->
</header>
<nav>
  <!-- navigation -->
</nav>
<main id="maincontent" tabindex="-1">
  <h1><!-- page title --></h1>
  <!-- content -->
</main>
```

```css
.sr-only:not(:focus):not(:active) {
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}
```

### Composite widgets (SHOULD)

If a component uses arrow-key navigation within itself (tabs, listbox, menu-like UI, grid/date picker):

- Provide one tab stop for the composite container or one child.
- Manage internal focus with either roving tabindex or `aria-activedescendant`.

Roving tabindex (SHOULD):

- Exactly one focusable item has `tabindex="0"`; all others are `-1`.
- Arrow keys move focus by swapping tabindex and calling `.focus()`.

`aria-activedescendant` (SHOULD):

- Container has `tabindex="0"` and `aria-activedescendant="IDREF"`.
- Arrow keys update `aria-activedescendant`.

## Low vision and contrast (MUST)

### Contrast requirements (MUST)

- Text contrast: at least 4.5:1 (large text: 3:1).
  - Large text is at least 24px regular or 18.66px bold.
- Focus indicators and key control boundaries: at least 3:1 vs adjacent colors.
- Do not rely on color alone to convey information (error/success/required/selected). Provide text and/or icons with accessible names.

### Color generation rules (MUST)

- Do not invent arbitrary colors.
  - Use project-approved design tokens (CSS variables).
  - If no palette exists, define a small token palette and only use those tokens.
- Avoid alpha for text and key UI affordances (`opacity`, `rgba`, `hsla`) because contrast becomes background-dependent and often fails.
- Ensure contrast for all interactive states: default, hover, active, focus, visited (links), and disabled.

### Safe defaults when unsure (SHOULD)

- Prefer very dark text on very light backgrounds, or the reverse.
- Avoid mid-gray text on white; muted text should still meet 4.5:1.

### Tokenized palette contract (SHOULD)

- Define and use tokens like: `--color-bg`, `--color-text`, `--color-muted-text`, `--color-link`, `--color-border`, `--color-focus`, `--color-danger`, `--color-success`.
- Only assign UI colors via these tokens (avoid scattered inline hex values).

### Verification (MUST)

Contrast verification is covered by the Final verification checklist.

## High contrast / forced colors mode (MUST)

### Support OS-level accessibility features (MUST)

- Never override or disrupt OS accessibility settings.
- The UI MUST adapt to High Contrast / Forced Colors mode automatically.
- Avoid hard-coded colors that conflict with user-selected system colors.

### Use the `forced-colors` media query when needed (SHOULD)

Use `@media (forced-colors: active)` only when system defaults are not sufficient.

```css
@media (forced-colors: active) {
  /* Example: Replace box-shadow (suppressed in forced-colors) with a border */
  .button {
    border: 2px solid ButtonBorder;
  }
}
```

In Forced Colors mode, avoid relying on:

- Box shadows
- Background images
- Decorative gradients

### Respect user color schemes in forced colors (MUST)

- Use system color keywords (e.g., `ButtonText`, `ButtonBorder`, `CanvasText`, `Canvas`).
- Do not use fixed hex/RGB colors inside `@media (forced-colors: active)`.

### Do not disable forced colors (MUST)

- Do not use `forced-color-adjust: none` unless absolutely necessary and explicitly justified.
- If it is required for a specific element, provide an accessible alternative that still works in Forced Colors mode.

### Icons (MUST)

- Icons MUST adapt to text color.
- Prefer `currentColor` for SVG icon fills/strokes; avoid embedding fixed colors inside SVGs.

```css
svg {
  fill: currentColor;
  stroke: currentColor;
}
```

## Reflow (WCAG 2.2 SC 1.4.10) (MUST)

### Goal (MUST)

At a width equivalent to 320 CSS px, all content and functionality MUST remain available without requiring two-directional scrolling.

### Core principles (MUST)

- Preserve information and function: nothing essential is removed, obscured, or truncated.
- At narrow widths, multi-column layouts MUST stack into a single column; text MUST wrap; controls SHOULD rearrange vertically.
- Users SHOULD NOT need to scroll left/right to read multi-line text.
- If content is collapsed in the narrow layout, the full content/function MUST be available within 1 click (e.g., overflow menu, dialog, tooltip).

### Engineering requirements (MUST)

- Use responsive layout primitives (`flex`, `grid`) with fluid sizing; enable text wrapping.
- Avoid fixed widths that force horizontal scrolling at 320px.
- Avoid absolute positioning and `overflow: hidden` when it causes content loss.
- Media and containers MUST not overflow the viewport at 320px (for example, prefer `max-width: 100%` for images/video/canvas/iframes).
- In flex/grid layouts, ensure children can shrink/wrap (common fix: `min-width: 0` on flex/grid children).
- Handle long strings (URLs, tokens) without forcing overflow (common fix: `overflow-wrap: anywhere` or equivalent).
- Ensure all interactive elements remain visible, reachable, and operable at 320px.

### Exceptions (SHOULD)

If a component truly requires a two-dimensional layout for meaning/usage (e.g., large data tables, maps, diagrams, charts, games, presentations), allow horizontal scrolling only at the component level.

- The page as a whole MUST still reflow.
- The component MUST remain fully usable (all content reachable; controls operable).

## Controls and labels

### Visible labels (MUST)

- Every interactive element has a visible label.
- The label cannot disappear while entering text or after the field has a value.

### Voice access (MUST)

- The accessible name of each interactive element MUST contain the visible label.
  - If using `aria-label`, include the visual label text.
- If multiple controls share the same visible label (e.g., many “Remove” buttons), use an `aria-label` that keeps the visible label text and adds context (e.g., “Remove item: Socks”).

## Forms

### Labels and help text (MUST)

- Every form control has a programmatic label.
  - Prefer `<label for="...">`.
- Labels describe the input purpose.
- If help text exists, associate it with `aria-describedby`.

### Required fields (MUST)

- Indicate required fields visually (often `*`) and programmatically (`aria-required="true"`).

### Errors and validation (MUST)

- Provide error messages that explain how to fix the issue.
- Use `aria-invalid="true"` for invalid fields; remove it when valid.
- Associate inline errors with the field via `aria-describedby`.
- Submit buttons SHOULD NOT be disabled solely to prevent submission.
- On submit with invalid input, focus the first invalid control.

## Graphics and images

All graphics include `img`, `svg`, icon fonts, and emojis.

- Informative graphics MUST have meaningful alternatives.
  - `img`: use `alt`.
  - `svg`: prefer `role="img"` and `aria-label`/`aria-labelledby`.
- Decorative graphics MUST be hidden.
  - `img`: `alt=""`.
  - Other: `aria-hidden="true"`.

## Navigation and menus

- Use semantic navigation: `<nav>` with lists and links.
- Do not use `role="menu"` / `role="menubar"` for site navigation.
- For expandable navigation:
  - Toggle `aria-expanded`.
  - `Escape` MAY close open menus.

## Tables and grids

### Tables for static data (MUST)

- Use `<table>` for static tabular data.
- Use `<th>` to associate headers.
  - Column headers are in the first row.
  - Row headers (when present) use `<th>` in each row.

### Grids for dynamic UIs (SHOULD)

- Use grid roles only for truly interactive/dynamic experiences.
- If using `role="grid"`, grid cells MUST be nested in rows so header/cell relationships are determinable.
- Use arrow navigation to navigate within the grid.

## Final verification checklist (MUST)

Before finalizing output, explicitly verify:

- Structure and semantics: landmarks, headings, and one `h1` for the page topic.
- Keyboard and focus: operable controls, visible focus, predictable tab order, no traps, skip link works.
- Controls and labels: visible labels present and included in accessible names.
- Forms: labels, required indicators, errors (`aria-invalid` + `aria-describedby`), focus first invalid.
- Contrast: meets 4.5:1 / 3:1 thresholds, focus/boundaries meet 3:1, color not the only cue.
- Forced colors: does not break OS High Contrast / Forced Colors; uses system colors in `forced-colors: active`.
- Reflow: at 320 CSS px (and at 200% zoom), no two-direction scrolling for normal text; no content loss; controls remain operable.
- Graphics: informative alternatives; decorative graphics hidden.
- Tables/grids: tables use `<th>`; grids (when needed) are structured with rows and cells.

## Final note

Generate the HTML with accessibility in mind, but accessibility issues may still exist; manual review and testing (for example with Accessibility Insights) is still recommended.
