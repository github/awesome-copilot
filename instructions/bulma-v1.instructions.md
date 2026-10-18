---
description: 'Bulma v1 conventions: Dart Sass modules, CSS variables, themes and dark mode, the smart grid and skeletons, plus Bulma component libraries and agent tooling for React (Bestax) and Vue (Buefy)'
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
- Don't add Bootstrap attributes such as `data-bs-toggle`. They do nothing in Bulma.
- Don't mix in Bootstrap or Tailwind classes. Use Bulma's own names: `button` not `btn`, `column is-half` not `col-md-6`, `is-flex` not `d-flex`, `mt-4` and `px-2` for spacing, `has-text-centered` for alignment.

## Component libraries

In React or Vue, a Bulma component library handles the toggling and state for you. Check `package.json` first and keep using the library the project already has. Both libraries below ship an MCP server, Agent Skills and docs written for LLMs.

### React: Bestax

[Bestax](https://bestax.io) has typed React components for Bulma v1 in `@allxsmith/bestax-bulma`, for React 18 and 19.

```tsx
import '@allxsmith/bestax-bulma/bestax.css';
import { Block, Button } from '@allxsmith/bestax-bulma';

const save = (
  <Block textColor="primary" mb="4">
    <Button color="primary">Save</Button>
  </Block>
);
```

- Pass Bulma modifiers as props, as in `color="primary"`, instead of class strings.
- Bulma helpers are props too. `mb="4"` renders `mb-4` and `textColor="primary"` renders `has-text-primary`. A value the library doesn't know renders nothing, so check it.
- Build forms from `Field` and `Control`. Bestax holds no form state, so validation lives in your code.

**MCP server.** `bestax-mcp` answers offline from an index pinned to a bestax-bulma release. Its tools include `search_bestax`, `get_props`, `get_examples`, `get_css_variables`, `get_helper_props` and `lookup_bulma_classes`, which turns a Bulma class string into the matching component and props. Add it to `.vscode/mcp.json`:

```json
{
  "servers": {
    "bestax": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "bestax-mcp@1"]
    }
  }
}
```

**Agent Skills.** Seven skills cover page layouts, forms, theming, icons, custom components, CSS size and migration. Install one with `npx skills add https://github.com/allxsmith/bestax --skill bestax-layout-scaffold`.

**LLM docs.** [bestax.io/llms.txt](https://bestax.io/llms.txt) indexes the docs and [bestax.io/llms-full.txt](https://bestax.io/llms-full.txt) has all of them in one file.

**Project tools.** `npm create bestax@latest my-app` scaffolds a Vite app. `bestax-migrate` moves raw Bulma classes or older React Bulma libraries onto Bestax. `@allxsmith/eslint-plugin-bestax` flags deprecated props and helper-prop values that render nothing.

### Vue: Buefy

[Buefy](https://buefy.org) has Vue 3 components for Bulma v1 in `buefy` 3.x.

```ts
import { createApp } from 'vue';
import Buefy from 'buefy';
import 'buefy/dist/buefy.css';
import App from './App.vue';

createApp(App).use(Buefy).mount('#app');
```

- Pass Bulma modifiers through the `type` prop, as in `<b-button type="is-primary">`, and sizes as `size="is-small"`, `"is-medium"` or `"is-large"`.
- Wrap form inputs in `<b-field>`, which supplies the label and the validation message.
- Most components bind `v-model`. `b-table` also has named models such as `v-model:selected` and `v-model:current-page`.
- Name icons without the pack prefix, as in `icon="home"`, not `icon="mdi-home"`.
- Open toasts and other notices from code with the composables, for example `useToast()`.

**MCP server.** `buefy-mcp` serves Buefy's component docs through four tools: `buefy_list_components`, `buefy_get_component` for props, events, slots and methods, `buefy_search` and `buefy_get_installation`. Add it to `.vscode/mcp.json`:

```json
{
  "servers": {
    "buefy": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "buefy-mcp"]
    }
  }
}
```

**Agent Skill.** One skill covers installation, the usage rules above, the key props and slots of every component, and common patterns such as a login form, a server-paginated table and a confirm dialog. Install it with `npx skills add buefy/buefy`.

**LLM docs.** Buefy keeps its full component docs in one file, [`mcp.txt`](https://raw.githubusercontent.com/buefy/buefy/main/mcp.txt), in its repository. It's the same file `buefy-mcp` serves.

With either library, ask its MCP server or read its LLM docs for a component's props instead of guessing them.
