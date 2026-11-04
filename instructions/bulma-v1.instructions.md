---
description: 'Bulma v1 conventions: Dart Sass modules, CSS variables, themes and dark mode, the smart grid and skeletons'
applyTo: '**/*.html, **/*.css, **/*.scss, **/*.sass, **/*.jsx, **/*.tsx, **/*.vue'
---

# Bulma v1

Bulma v1 is a rewrite of the Bulma CSS framework on Dart Sass and CSS variables. Most tutorials and older code show Bulma 0.9, so follow these rules when you write or review Bulma code.

## Key changes in Bulma v1

- **Same HTML, except tiles.** Class names did not change, so most 0.9 markup still renders. Tiles were removed.
- **Dart Sass only.** Build with the `sass` package. `node-sass` and LibSass can't compile it.
- **Sass modules.** Customize with `@use "bulma/sass" with (...)`. Setting variables and then calling `@import "bulma"` is the 0.9 pattern.
- **CSS variables.** Every component reads variables prefixed `--bulma-`, so you can theme with plain CSS and no build step.
- **Themes and dark mode.** A light theme and a dark theme ship by default. The dark theme follows the user's system setting.
- **Color palettes.** Each of the 7 main colors gets soft, bold, light, dark, invert and 21 numbered shades.
- **Grid.** The smart grid and fixed grid replace tiles.
- **Skeletons.** Loading placeholders, as standalone blocks and as an `is-skeleton` modifier.
- **Prefixed builds.** A prebuilt version prefixes every class with `bulma-`.

## Installation

```bash
npm install bulma
```

Import the compiled CSS once:

```js
import 'bulma/css/bulma.min.css';
```

Or load it from a CDN:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bulma@1.0.4/css/bulma.min.css" />
```

Other builds live in `bulma/css/versions/`:

| File                            | Use it when                                          |
| ------------------------------- | ---------------------------------------------------- |
| `bulma-prefixed.css`            | Bulma has to share a page with another CSS framework |
| `bulma-no-helpers.css`          | You only want components, not the `has-*` helpers    |
| `bulma-no-helpers-prefixed.css` | Both of the above                                    |
| `bulma-no-dark-mode.css`        | The site should always render in the light theme     |

## Customizing with Sass

Pass variables through `@use ... with`:

```scss
@use "bulma/sass" with (
  $primary: #8a4d76,
  $link: #fa7c91,
  $family-primary: '"Nunito", sans-serif'
);
```

- Don't generate `$primary: ...;` followed by `@import "bulma";`. That is the 0.9 setup, and Sass has deprecated `@import`.
- Import only what you need by loading the utilities first and then single modules, for example `@use "bulma/sass/utilities" with (...)` and `@use "bulma/sass/form"`.
- Several component variables are now split into hue, saturation and lightness (`$input-h`, `$input-s`, `$input-background-l`). A variable name from a 0.9 tutorial may no longer exist. Check Bulma's list of Sass variables before using one.

## Customizing with CSS variables

You can change colors at runtime without Sass. Main colors are built from hue, saturation and lightness variables, so overriding those updates every shade derived from them:

```css
/* Load after Bulma */
:root {
  --bulma-primary-h: 280deg;
  --bulma-primary-s: 60%;
  --bulma-primary-l: 45%;
}
```

- Scope variables to a component to change one part only, for example `.button { --bulma-button-border-width: 2px; }`.
- In your own CSS, read Bulma's values with `var(--bulma-...)` instead of copying hex codes, so custom styles follow the theme.

## Dark mode

- The page is light by default and turns dark when the user's system prefers dark.
- Force a theme with `data-theme="dark"` or the `theme-dark` class, on `<html>` or on any element. `data-theme="light"` and `theme-light` force light.
- Use `bulma-no-dark-mode.css` if the site should never switch.
- Pair **soft** backgrounds with **bold** text, for example `has-background-primary-soft has-text-primary-bold`. Soft and bold swap in dark mode, so the contrast holds.
- Avoid fixed colors such as `has-background-white` or hard-coded hex values for page surfaces. In custom CSS use `var(--bulma-scheme-main)` for the page background so it follows the theme.

## Layout

Tiles (`tile is-ancestor`, `is-parent`, `is-child`) are gone from Bulma v1, so that markup gets no styles. Use the smart grid, which fits as many cells per row as their minimum width allows:

```html
<div class="grid">
  <div class="cell">One</div>
  <div class="cell">Two</div>
  <div class="cell is-col-span-2">Three, two columns wide</div>
</div>
```

For a set number of columns, wrap the grid in `fixed-grid`:

```html
<div class="fixed-grid has-3-cols">
  <div class="grid">
    <div class="cell">One</div>
    <div class="cell">Two</div>
    <div class="cell">Three</div>
  </div>
</div>
```

- Cells take `is-col-span-*`, `is-row-span-*`, `is-col-start-*` and `is-row-start-*`.
- `columns` and `column` (with sizes like `is-half` or `is-one-third`) still work for a single flex row.

## Skeletons

- Add `is-skeleton` to a component to show its loading state, for example `button is-skeleton`, `input is-skeleton` or `image is-64x64 is-skeleton`.
- Use `skeleton-block` for a plain placeholder box and `skeleton-lines` with empty child `div`s for text lines.

## Bulma has no JavaScript

- Bulma is CSS only. The navbar burger, dropdowns, modals and tabs need your own code to toggle `is-active`.
- In React or Vue, a Bulma component library such as [Bestax](https://bestax.io) or [Buefy](https://buefy.org) handles that state for you. Keep using the one the project already has.
- Don't add Bootstrap attributes such as `data-bs-toggle`. They do nothing in Bulma.
- Don't mix in Bootstrap or Tailwind classes. Use Bulma's own names: `button` not `btn`, `column is-half` not `col-md-6`, `is-flex` not `d-flex`, `mt-4` and `px-2` for spacing, `has-text-centered` for alignment.
