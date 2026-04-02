---
name: accessible-web-components
description: 'Build web UIs with self-contained accessible web components that encapsulate semantic HTML, ARIA, keyboard operability, and WCAG compliance — closing the gaps that HTML5 leaves open. Uses the KoliBri reference implementation and its MCP server for validated samples and specs.'
---

# Accessible Web Components

HTML5 provides semantic elements, but leaves critical accessibility gaps: buttons without enforced labels, inputs without associated error handling, navigation without keyboard conventions, modals without focus management. These gaps produce the same accessibility failures across every project.

Accessible web components close these gaps by encapsulating correct semantics, ARIA, keyboard behavior, and assistive technology support inside reusable custom elements. Developers get accessible UI by default — without needing to be accessibility experts.

**KoliBri** (Public UI) is the reference implementation of this concept: a library of self-contained accessible HTML web components, built on Web Component standards, framework-agnostic, and designed as what an "accessible HTML standard" should look like.

## Why This Matters: A Sustainable Contribution to the Web

Accessible web components are not a workaround — they are the natural evolution of the HTML standard. Four properties make this approach sustainable:

**1. Standards-based longevity**
Web Components are part of the web platform itself. They require no additional framework, no build-time transpilation, and no runtime abstraction. Standards change slowly; components built on them outlast framework generations.

**2. Framework independence**
The same accessible component works in React, Angular, Vue, Svelte, Solid, and plain HTML. A form input that enforces labels and associates errors does so regardless of the host framework. Accessibility is not re-implemented per stack — it is packaged once and reused everywhere.

**3. Shadow DOM encapsulation**
The Shadow DOM isolates component markup and styles from the host page. External CSS cannot accidentally override focus indicators or contrast. The accessibility contract the component makes is structurally protected.

**4. Accessibility as architecture, not afterthought**
The component API enforces accessibility at design time: `_label` is required, `_error` is built in, keyboard behavior follows WAI patterns by default. Developers cannot accidentally ship an unlabelled input or a modal without focus management — the component prevents it.

This is how HTML5 gaps become a solved problem across an entire ecosystem: not by documentation or guidelines, but by making the accessible path the only path.

## When to Use This Skill

- Building web UIs where accessibility is a requirement (public sector, enterprise, inclusive design)
- Replacing hand-written HTML/ARIA patterns with self-contained accessible components
- Integrating accessible components into any framework (React, Angular, Vue, Vanilla JS)
- Reviewing code for accessibility gaps that accessible components could close
- Understanding what "accessibility by default" means at the component level

## The Core Idea: Accessibility as Component Contract

Traditional HTML leaves accessibility as the developer's responsibility. Accessible web components invert this:

| Traditional HTML | Accessible Web Component |
|-----------------|-------------------------|
| `<button>` — label is optional | `<kol-button _label="...">` — label is required |
| `<input>` — error must be wired manually via `aria-describedby` | `<kol-input-text _label="..." _error="...">` — error is built in |
| `<div class="modal">` — focus trap is DIY | `<kol-modal>` — focus trap, ESC close, focus return are built in |
| `<nav>` — keyboard model is undefined | `<kol-nav>` — Tab/Arrow/Enter behavior follows WAI patterns |
| No skip links by default | `<kol-skip-nav>` — skip navigation built in |

The component enforces the contract. The developer provides content. Accessibility is not optional.

## MCP-First Workflow

Use the KoliBri MCP server to retrieve validated component APIs, samples, and integration scenarios. Never guess component properties — look them up.

### Search

Use `#tool:mcp_kolibri-mcp_search` to find entries:
- `kind: spec` — component API (properties, events, slots) — **check first**
- `kind: sample` — verified usage examples
- `kind: scenario` — complex integration patterns (e.g. form validation with error summary)
- `kind: doc` — supplementary documentation

### Fetch

Use `#tool:mcp_kolibri-mcp_fetch` with the `id` from search results (e.g. `spec/button`, `sample/form/basic`, `scenario/scenarios/sample-form-with-validation`).

### Transparency

- Cite MCP IDs for every verified fact
- Mark inferences as your own recommendation
- If no MCP entry exists, state the gap and fall back to HTML5/WCAG standards

## Accessible Component Patterns

### Registration

Accessible web components must be registered before use. The bootstrap configures which theme (visual design) is applied:

```ts
import { register } from '@public-ui/components';
import { defineCustomElements } from '@public-ui/components/dist/loader';
import { DEFAULT } from '@public-ui/themes';

register(DEFAULT, defineCustomElements);
```

### Accessible Forms

Forms are where most accessibility failures occur. Accessible form components enforce:
- Every input has a programmatically associated label (required `_label` prop)
- Error messages are linked to their input automatically
- Error summaries are keyboard-navigable with links that focus the offending field

Pattern: Wrap inputs in `<KolForm>`, collect errors, show them in `<KolAlert _type="error">` with `<KolLink>` elements that focus fields on click. Reference `scenario/scenarios/sample-form-with-validation` for the complete pattern.

### Keyboard Conventions

Accessible components follow established WAI keyboard patterns:
- **Buttons**: Space/Enter to activate
- **Tabs**: Arrow keys to switch, Tab to enter content
- **Modals**: Focus trapped, ESC to close, focus returns to trigger
- **Navigation**: Arrow keys for items, Enter to activate, expandable sub-menus
- **Skip Navigation**: Visible on Tab, jumps to landmarks

### The Expert Slot Escape Hatch

When the component API cannot express required semantics, the Expert Slot allows injecting custom HTML. This explicitly transfers accessibility responsibility back to the developer. Only recommend this when:
1. Standard properties cannot express the intent
2. You document the accessibility risk and required manual verification

## Anti-patterns

Avoid these common KoliBri mistakes:

- ❌ Add `aria-label` or `aria-labelledby` manually to a KoliBri component — labels are enforced by `_label`; redundant ARIA creates conflicts
- ❌ Use native `<button>`, `<input>`, `<select>` when a `Kol*` component exists — bypasses the accessibility contract entirely
- ❌ Use the Expert Slot without documenting the accessibility risk and required manual verification
- ❌ Invent or guess component properties — always verify via MCP `spec/` entries
- ❌ Render `KolIcon` without confirming icon font assets are bundled — missing assets fail silently
- ❌ Use `!important` in theme overrides — it silently breaks the base accessibility layer
- ❌ Call `register()` after rendering `<kol-*>` elements — registration must complete before any component renders

## Accessibility Baseline

General WCAG 2.2 AA rules (semantics, keyboard, contrast, reflow, labels, forms, forced colors) are defined in `instructions/a11y.instructions.md` and apply automatically. Do not duplicate those rules here — they are the baseline for every recommendation.

This skill adds KoliBri-specific accessibility knowledge on top of that baseline:

- Accessible components handle ARIA internally — do not add redundant ARIA attributes
- KoliBri provides `color-contrast-analysis=true` meta tag for built-in contrast checking
- KoliBri base layer sets `hyphens: auto` and `word-break: break-word` for reflow by default

## Theming: Separating Accessibility from Design

Accessible components separate structure (accessibility contract) from design (visual appearance). This is a core architectural principle:

- **Structure layer**: semantic HTML, ARIA, keyboard behavior — owned by the component
- **Design layer**: colors, spacing, typography — owned by the theme
- Themes are interchangeable NPM packages
- Custom themes must be independently tested for contrast and focus visibility
- Use well-prefixed CSS custom properties (`--kolibri-*`) for external tokens
- Never use `!important` — it overrides the base accessibility layer

## Component Reference

| Component | Accessibility Gap It Closes | Key Props |
|-----------|-----------------------------|-----------|
| `KolButton` | Enforces label on buttons | `_label`, `_variant`, `_type`, `_on` |
| `KolLink` / `KolLinkButton` | Semantic link vs. button distinction | `_label`, `_href`, `_on` |
| `KolInputText` | Label + error association | `_label`, `_required`, `_error` |
| `KolInputEmail` | Type-specific validation + label | `_label`, `_required` |
| `KolInputPassword` | Accessible password field | `_label`, `_required` |
| `KolInputCheckbox` | Label association for checkboxes | `_label`, `_checked` |
| `KolInputRadio` | Grouped radio with keyboard model | `_label`, `_options` |
| `KolSelect` | Accessible select with label | `_label`, `_options` |
| `KolSingleSelect` | Single value selection | `_label`, `_options` |
| `KolTextarea` | Multi-line with label | `_label`, `_rows` |
| `KolForm` | Form wrapper with error summary support | `_on`, `_errorList` |
| `KolAlert` | Accessible notifications | `_type`, `_label`, `_variant`, `_alert` |
| `KolModal` | Focus trap, ESC close, focus return | `_label`, `_activeElement` |
| `KolNav` | Keyboard-operable navigation | `_label`, `_links` |
| `KolTabs` | WAI tab pattern (arrow keys) | `_label`, `_tabs`, `_selected` |
| `KolSkipNav` | Bypass repeated content | `_label`, `_links` |
| `KolTable` | Accessible data table with headers | `_label`, `_headers`, `_data` |
| `KolHeading` | Enforced heading level | `_label`, `_level` |
| `KolIcon` | Icon with required font assets | `_icons` |

> **Icon assets**: `KolIcon` requires bundled icon fonts (e.g. KolIcons). Missing assets silently break rendering.

> **Combobox**: `KolCombobox` may be in preview — check maturity. Use `KolSelect` or `KolSingleSelect` as stable alternatives.

> **Tooltip**: `KolTooltip` is for internal library use. For help text, use inline hints or `aria-describedby`.
