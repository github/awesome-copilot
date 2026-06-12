# WCAG 2.2 Checklist & Remediation Reference

Load this when you need the full success-criterion list, the practical meaning of each, common failures, or framework-specific fixes. The main `SKILL.md` covers the workflow; this file is the depth.

## Contents
- [How to read this](#how-to-read-this)
- [Perceivable (1.x)](#perceivable)
- [Operable (2.x)](#operable)
- [Understandable (3.x)](#understandable)
- [Robust (4.x)](#robust)
- [New in WCAG 2.2](#new-in-wcag-22)
- [Common false fixes](#common-false-fixes)
- [Framework remediation](#framework-remediation)

## How to read this

Each criterion is listed as `number Name — Level`. Level **A** is the minimum; **AA** is the standard legal/compliance target (ADA, Section 508, EN 301 549). AAA is included only where commonly requested. For each, the "Check" is what to verify and "Common failure" is what usually breaks.

---

## Perceivable

| Criterion | Check | Common failure |
|-----------|-------|----------------|
| 1.1.1 Non-text Content — A | All images/icons/controls have a text alternative; decorative images use `alt=""` | Icon-only buttons with no `aria-label`; `alt` repeating adjacent text |
| 1.2.x Time-based Media — A/AA | Video has captions; audio has transcripts | Auto-playing video, no captions |
| 1.3.1 Info and Relationships — A | Structure (headings, lists, tables, labels) is in the markup, not just visual | Bold `<p>` used as a heading; layout tables; placeholder used as label |
| 1.3.2 Meaningful Sequence — A | DOM order matches reading order | CSS reordering that desyncs from tab/reading order |
| 1.3.4 Orientation — AA | Works in both portrait and landscape | Locked orientation |
| 1.3.5 Identify Input Purpose — AA | Common fields use `autocomplete` tokens | Missing `autocomplete` on name/email/address |
| 1.4.1 Use of Color — A | Meaning never conveyed by color alone | Required fields shown only in red; links distinguished only by color |
| 1.4.3 Contrast (Minimum) — AA | Text ≥ 4.5:1 (large text ≥ 3:1) | Gray-on-white body text; placeholder text; text on images |
| 1.4.4 Resize Text — AA | Text scales to 200% without loss | Fixed `px` containers that clip scaled text |
| 1.4.10 Reflow — AA | No horizontal scroll at 320px width | Fixed-width layouts; wide tables without responsive handling |
| 1.4.11 Non-text Contrast — AA | UI components & graphics ≥ 3:1 | Low-contrast input borders, focus rings, icons |
| 1.4.12 Text Spacing — AA | No clipping when users override spacing | `overflow: hidden` on fixed-height text |
| 1.4.13 Content on Hover/Focus — AA | Hover/focus popups are dismissible, hoverable, persistent | Tooltips that vanish on mouse-move; can't dismiss with Esc |

## Operable

| Criterion | Check | Common failure |
|-----------|-------|----------------|
| 2.1.1 Keyboard — A | Everything operable by keyboard | `onClick` on `<div>` with no key handler |
| 2.1.2 No Keyboard Trap — A | Focus can always move away | Modal/embed that traps Tab |
| 2.1.4 Character Key Shortcuts — A | Single-key shortcuts can be turned off/remapped | Global single-letter shortcuts that fire while typing |
| 2.4.1 Bypass Blocks — A | "Skip to content" link or landmarks | No skip link; no `<main>` |
| 2.4.2 Page Titled — A | Each page/route has a descriptive `<title>` | SPA routes that never update `<title>` |
| 2.4.3 Focus Order — A | Tab order is logical | Focus jumps around due to `tabindex > 0` |
| 2.4.4 Link Purpose — A | Link text makes sense out of context | "Click here", "Read more" with no context |
| 2.4.6 Headings and Labels — AA | Headings/labels are descriptive | Generic "Section 1"; empty labels |
| 2.4.7 Focus Visible — AA | Focused element is clearly indicated | `outline: none` with no replacement |
| 2.4.11 Focus Not Obscured (Min) — AA *(new)* | Focused element not fully hidden by sticky UI | Sticky header covering the focused field |
| 2.5.3 Label in Name — A | Accessible name contains the visible label text | Visible "Search" but `aria-label="Find"` (breaks voice control) |
| 2.5.7 Dragging Movements — AA *(new)* | Drag actions have a single-pointer alternative | Reorder/slider only via drag |
| 2.5.8 Target Size (Min) — AA *(new)* | Targets ≥ 24×24px (with exceptions) | Tiny icon buttons, dense link lists |
| 2.3.1 / 2.3.3 Flashes & Motion — A/AAA | No >3 flashes/sec; respect `prefers-reduced-motion` | Parallax/auto-animations ignoring the media query |

## Understandable

| Criterion | Check | Common failure |
|-----------|-------|----------------|
| 3.1.1 Language of Page — A | `<html lang>` is set and correct | Missing `lang`; wrong language |
| 3.2.1 / 3.2.2 On Focus / On Input — A | Focus or input change doesn't cause surprise context change | Auto-submit on select change; focus opens a new window |
| 3.2.6 Consistent Help — A *(new)* | Help mechanisms appear in a consistent location | Help link moves between pages |
| 3.3.1 Error Identification — A | Errors identified in text | Errors shown only by red border |
| 3.3.2 Labels or Instructions — A | Inputs have labels/instructions | Placeholder-only "labels" |
| 3.3.3 Error Suggestion — AA | Suggest how to fix when known | "Invalid input" with no guidance |
| 3.3.7 Redundant Entry — A *(new)* | Don't ask for the same info twice in a process | Re-typing address already entered |
| 3.3.8 Accessible Authentication (Min) — AA *(new)* | No cognitive function test without alternative | CAPTCHA/puzzle with no accessible path; blocking paste in password fields |

## Robust

| Criterion | Check | Common failure |
|-----------|-------|----------------|
| 4.1.2 Name, Role, Value — A | Custom controls expose name/role/state to AT | `<div>` toggle with no `role`/`aria-pressed` |
| 4.1.3 Status Messages — AA | Status updates announced without focus change | Toast/validation that screen readers never hear (no `aria-live`/`role="status"`) |

> Note: WCAG 2.2 removed **4.1.1 Parsing** — modern parsers handle the duplicate-ID/nesting cases it covered, so don't flag it.

## New in WCAG 2.2

These are the criteria added since 2.1 — pay extra attention because older audits and many tools miss them:
2.4.11 Focus Not Obscured (Min), 2.4.12 Focus Not Obscured (Enhanced, AAA), 2.4.13 Focus Appearance (AAA), 2.5.7 Dragging Movements, 2.5.8 Target Size (Min), 3.2.6 Consistent Help, 3.3.7 Redundant Entry, 3.3.8 Accessible Authentication (Min), 3.3.9 Accessible Authentication (Enhanced, AAA).

## Common false fixes

Things that look like accessibility work but make it worse — call these out when you see them:

- **ARIA on native elements** — `<button role="button">` is redundant; `role="heading"` on an `<h2>` can override the real level. Native semantics win.
- **`aria-label` that hides the visible text** — breaks 2.5.3 Label in Name and voice control. Keep the accessible name aligned with the visible label.
- **`tabindex="0"` everywhere** — making non-interactive text focusable adds noise for keyboard/AT users. Only interactive elements should be in the tab order.
- **`tabindex` > 0** — forces an unnatural tab order and is almost always a bug.
- **Removing focus outlines** — `outline: none` without a visible replacement fails 2.4.7.
- **`alt` on decorative images** — decorative images should use `alt=""`, not a description, so AT skips them.
- **`aria-hidden="true"` on focusable content** — creates "phantom" controls a sighted keyboard user can reach but a screen reader cannot describe.

## Framework remediation

### React / Next.js
- Manage focus on route change and modal open/close with refs + `useEffect`; move focus to the dialog (or its heading) and restore it on close. SPA navigation does not move focus automatically.
- Use `eslint-plugin-jsx-a11y` to catch many issues at author time.
- For live updates, render an `aria-live` region (or `role="status"`) that is in the DOM before the update.
- Update `document.title` per route (Next.js: the Metadata API / `<title>`).

### Vue / Nuxt
- Bind labels with `<label :for>` / matching `id`; avoid label-less `v-model` inputs.
- Use a focus-trap composable for dialogs; restore focus on close.
- Announce route changes via an `aria-live` region or a router-level focus reset to `<main>`.

### Angular
- Use Angular CDK `a11y` (`FocusTrap`, `LiveAnnouncer`, `cdkTrapFocus`) rather than hand-rolling focus management.
- Set page titles via the `Title` service / route `title` resolver.

### Svelte / SvelteKit
- Svelte emits a11y warnings at compile time — do not silence them without a real fix.
- SvelteKit: after navigation, move focus and update `<svelte:head><title>`.

### Tailwind / utility CSS
- Don't rely on `focus:outline-none` without a `focus-visible:` ring replacement.
- Bake contrast-passing colors into the theme/tokens so failures are fixed once, not per-component.

### Forms (any framework)
- Every input: associated `<label>` (or `aria-labelledby`). Placeholder is not a label.
- On error: set `aria-invalid`, link the message with `aria-describedby`, and ensure the message text describes the fix.
