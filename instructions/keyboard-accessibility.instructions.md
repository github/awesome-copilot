---
applyTo: "**"
description: "Keyboard accessibility instructions for GitHub Copilot — WCAG 2.2 AA patterns for focus management, dialog traps, roving tabindex, skip links, and focus visibility. Complements the broad a11y.instructions.md with deep, code-level keyboard guidance."
---

# Keyboard Accessibility

All interactive functionality must be fully usable with a keyboard alone — no mouse or touch required. These instructions complement the broad `a11y.instructions.md` with deep, code-level patterns for the most common keyboard accessibility failures.

## Severity levels

- **CRITICAL** — Blocks keyboard users entirely. Fix before merge.
- **SERIOUS** — Significantly impairs keyboard access; workaround unreasonable. Fix in same sprint.
- **MODERATE** — Creates friction; workaround exists. Schedule for near-term fix.

---

## CRITICAL: Keyboard trap

Users must never become stranded in a component. The only permitted trap is an intentional modal dialog where `Escape` closes the dialog and returns focus to the trigger.

```html
<!-- BAD: no way to Tab out of this widget -->
<div class="date-picker" tabindex="0" onkeydown="absorbAllKeys(event)">…</div>

<!-- GOOD: Escape always exits; Tab moves through and out -->
<div role="dialog" aria-modal="true" aria-labelledby="dlg-title">…</div>
```

**WCAG**: 2.1.2 No Keyboard Trap (A)

---

## CRITICAL: All interactive elements must be keyboard-reachable

Every mouse-clickable element must be reachable and activatable by keyboard. Always prefer native elements — they include keyboard support, ARIA semantics, and focus management at zero extra cost.

```html
<!-- GOOD: native keyboard support built in -->
<button type="button">Save</button>
<a href="/about">About</a>

<!-- BAD: requires manual role + tabindex + two key handlers to match native button -->
<div role="button" tabindex="0" onclick="…" onkeydown="…">Save</div>
```

If a non-interactive element must receive a click handler, always add:
- `role` (e.g. `role="button"`)
- `tabindex="0"`
- `keydown` handlers for **both** `Enter` and `Space`

**WCAG**: 2.1.1 Keyboard (A), 4.1.2 Name, Role, Value (A)

---

## CRITICAL: Expected key behaviour per widget type

Follow [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/) key patterns. Deviating breaks the mental model AT users depend on.

| Control | Required keys |
|---------|---------------|
| Button | `Enter`, `Space` |
| Link | `Enter` |
| Checkbox | `Space` to toggle |
| Radio group | Arrow keys to move; `Space` to select |
| Select / listbox | Arrow keys to navigate; `Enter` to confirm |
| Menu / menubar | Arrow keys; `Enter` to activate; `Escape` to close |
| Tab widget | Arrow keys between tabs; `Enter`/`Space` to activate |
| Dialog | `Escape` to close; focus trapped inside while open |
| Combobox | Arrow keys in list; `Enter` to select; `Escape` to collapse |
| Tree view | Arrow keys to expand/collapse/navigate |
| Slider | Arrow keys to change value; `Home`/`End` for min/max |

**WCAG**: 2.1.1 Keyboard (A)

---

## CRITICAL: Dialog focus management

Incorrect focus management means keyboard and screen reader users lose their place or cannot reach dialog controls.

### Preferred: `inert` attribute (baseline 2023, broadly supported)

```js
function openDialog(dialog, trigger) {
  // Prevent interaction with everything outside the dialog
  document.querySelectorAll('body > *:not(#dialog-container)')
    .forEach(el => el.setAttribute('inert', ''));

  dialog.removeAttribute('hidden');

  // Move focus to first focusable element
  const first = dialog.querySelector(
    'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  first?.focus();
}

function closeDialog(dialog, trigger) {
  document.querySelectorAll('[inert]')
    .forEach(el => el.removeAttribute('inert'));

  dialog.setAttribute('hidden', '');
  trigger.focus(); // Return focus to the opener
}

dialog.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeDialog(dialog, trigger);
});
```

### Fallback: `focus-trap` library

For environments without `inert` support, use the [`focus-trap`](https://github.com/focus-trap/focus-trap) library rather than hand-rolling a trap:

```js
import { createFocusTrap } from 'focus-trap';

let trap;

function openDialog(dialog, trigger) {
  dialog.removeAttribute('hidden');
  trap = createFocusTrap(dialog, {
    escapeDeactivates: true,
    onDeactivate: () => closeDialog(dialog, trigger)
  });
  trap.activate();
}

function closeDialog(dialog, trigger) {
  trap?.deactivate();
  dialog.setAttribute('hidden', '');
  trigger.focus();
}
```

**WCAG**: 2.1.2 No Keyboard Trap (A), 2.4.3 Focus Order (A)

---

## SERIOUS: Focus visibility

Every focusable element must have a clear, persistent visible focus indicator. Never remove outlines without an equally visible replacement.

```css
/* GOOD */
:focus-visible {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}

/* BAD — removes the only focus indicator */
:focus { outline: none; }
```

WCAG 2.4.11 Focus Appearance (Minimum) requirements (WCAG 2.2):
- At least **2 px** thick
- Minimum **3:1** contrast ratio against adjacent colours
- Visible in both light and dark modes

**WCAG**: 2.4.7 Focus Visible (AA), 2.4.11 Focus Appearance (Minimum) (AA, WCAG 2.2)

---

## SERIOUS: Focus not obscured by sticky headers/footers

Sticky headers, cookie banners, and floating toolbars can cover the focused element. Use `scroll-margin` to ensure focused elements scroll clear of fixed overlays.

```css
:focus {
  scroll-margin-top: var(--sticky-header-height, 4rem);
  scroll-margin-bottom: var(--sticky-footer-height, 0);
}
```

**WCAG**: 2.4.12 Focus Not Obscured (Minimum) (AA, WCAG 2.2)

---

## SERIOUS: Focus order follows DOM order

Tab order must follow a logical reading and interaction sequence.

- Use semantic DOM order as the primary mechanism.
- **Never** use positive `tabindex` values (`tabindex="2"`, etc.) — they override DOM order globally and create unpredictable sequences.
- `tabindex="0"` — use only to make custom widgets focusable.
- `tabindex="-1"` — use only for programmatic focus targets (skip link anchors, modal focus management).
- If visual order differs from DOM order (e.g. CSS grid/flex reordering), fix the DOM — do not use `tabindex` to compensate.

**WCAG**: 2.4.3 Focus Order (A)

---

## SERIOUS: Roving tabindex for composite widgets

Toolbars, radio groups, tree views, tab lists, and menubars must keep only **one** tab stop in the group at a time. Arrow keys navigate within the group.

```html
<div role="toolbar" aria-label="Text formatting">
  <button tabindex="0"  aria-pressed="false">Bold</button>
  <button tabindex="-1" aria-pressed="false">Italic</button>
  <button tabindex="-1" aria-pressed="false">Underline</button>
</div>
```

```js
const toolbar = document.querySelector('[role="toolbar"]');
const items   = Array.from(toolbar.querySelectorAll('button'));

toolbar.addEventListener('keydown', e => {
  const index = items.indexOf(document.activeElement);
  let next = -1;

  if (e.key === 'ArrowRight' || e.key === 'ArrowDown')  next = (index + 1) % items.length;
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + items.length) % items.length;
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End')  next = items.length - 1;

  if (next !== -1) {
    e.preventDefault();
    items.forEach(btn => btn.setAttribute('tabindex', '-1'));
    items[next].setAttribute('tabindex', '0');
    items[next].focus();
  }
});
```

**WCAG**: 2.1.1 Keyboard (A)

---

## MODERATE: Skip link and landmarks

Provide a visible-on-focus skip link as the **first** element in `<body>`. Use landmark elements for page regions.

```html
<!-- First element in <body> — must be visible on focus -->
<a class="skip-link" href="#main">Skip to main content</a>

<header>…</header>
<nav aria-label="Main">…</nav>
<main id="main" tabindex="-1">…</main>
<footer>…</footer>
```

```css
.skip-link {
  position: absolute;
  top: -100%;
  left: 1rem;
  padding: 0.5rem 1rem;
  background: #000;
  color: #fff;
  font-weight: bold;
  text-decoration: none;
  z-index: 9999;
}
.skip-link:focus { top: 1rem; }
```

A skip link hidden permanently (e.g. `display: none`) is a **SERIOUS** issue — it breaks WCAG 2.4.1.

**WCAG**: 2.4.1 Bypass Blocks (A)

---

## MODERATE: Hidden and offscreen content

- Elements with `display:none` or `visibility:hidden` are excluded from tab order automatically — no extra work needed.
- Use `aria-hidden="true"` on offscreen content that must stay in the DOM but is not currently available.
- When an overlay (modal, drawer) opens, apply `inert` (or `aria-hidden`) to background content; remove it when the overlay closes.

---

## Definition of done — keyboard checklist

Before marking any interactive UI change as complete, verify:

- [ ] Tab through entire page: logical order, no unexpected skips
- [ ] Visible focus indicator on every focusable element (light and dark modes)
- [ ] All interactive elements activatable with correct keys per widget type table
- [ ] No keyboard trap (except intentional modal trap with working Escape)
- [ ] Dialog open: background made `inert`; first focusable element receives focus
- [ ] Dialog close: `inert` removed; focus returns to trigger
- [ ] Skip link present, first in DOM, visible on focus, target has `tabindex="-1"`
- [ ] Sticky headers/footers: `scroll-margin` prevents focused elements being hidden
- [ ] Hidden/offscreen content not in tab order
- [ ] Composite widgets use roving tabindex; arrow keys navigate within group

---

## Key WCAG 2.2 criteria

| Criterion | Level | Notes |
|-----------|-------|-------|
| 2.1.1 Keyboard | A | All functionality keyboard-operable |
| 2.1.2 No Keyboard Trap | A | Users can always navigate away |
| 2.4.1 Bypass Blocks | A | Skip link bypasses repeated navigation |
| 2.4.3 Focus Order | A | Logical tab sequence |
| 2.4.7 Focus Visible | AA | Focus indicator always visible |
| 2.4.11 Focus Appearance (Minimum) | AA | _New in WCAG 2.2_ — 2 px thick, 3:1 contrast |
| 2.4.12 Focus Not Obscured (Minimum) | AA | _New in WCAG 2.2_ — not hidden by sticky UI |
| 2.5.8 Target Size (Minimum) | AA | _New in WCAG 2.2_ — 24×24 CSS px minimum |

---

## References

- [WAI-ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/)
- [APG: Roving tabindex](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/#kbd_roving_tabindex)
- [WCAG 2.2 Understanding 2.4.11 Focus Appearance (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)
- [WCAG 2.2 Understanding 2.4.12 Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum)
- [MDN: The `inert` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert)
- [`focus-trap` library](https://github.com/focus-trap/focus-trap)
