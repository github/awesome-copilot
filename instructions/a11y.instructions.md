---
applyTo: '**'
description: 'Comprehensive web accessibility standards based on WCAG 2.2 AA, with 38+ anti-patterns, legal enforcement context (EAA, ADA Title II), WAI-ARIA patterns, and framework-specific fixes for modern web frameworks and libraries.'
---

# Accessibility Standards

Comprehensive accessibility rules for web application development. Every anti-pattern includes a severity classification, detection method, WCAG 2.2 reference, and corrective code examples.

**Severity levels:**

- **CRITICAL** — Users cannot access content at all. Must be fixed before merge.
- **IMPORTANT** — Significant barrier for assistive technology users. Fix in same sprint.
- **SUGGESTION** — Improves usability for assistive technology. Plan for a future iteration.

---

## WCAG 2.2 Quick Reference (AA Level)

### Perceivable

| Criterion | Level | Summary |
|-----------|-------|---------|
| 1.1.1 Non-text Content | A | All non-text content has a text alternative. Decorative images use `alt=""`. |
| 1.2.1 Audio/Video-only | A | Provide transcript (audio) or text alternative (video). |
| 1.2.2 Captions (Prerecorded) | A | All prerecorded video has synchronized captions. |
| 1.3.1 Info and Relationships | A | Structure (headings, lists, tables, labels, landmarks) programmatically conveyed. |
| 1.3.2 Meaningful Sequence | A | When the sequence that content is presented affects its meaning, the visual and programmatic ordering of content should align. |
| 1.3.3 Sensory Characteristics | A | Instructions don't rely solely on shape, size, position, or sound. |
| 1.3.4 Orientation | AA | Content is not restricted to single orientation unless essential. |
| 1.3.5 Identify Input Purpose | AA | Input fields have `autocomplete` attributes when collecting information about the user. |
| 1.4.1 Use of Color | A | Color is not the only means of conveying info. |
| 1.4.3 Contrast (Minimum) | AA | Text: 4.5:1 normal, 3:1 large (18pt / 14pt bold). |
| 1.4.4 Resize Text | AA | Text resizable to 200% without loss of content or functionality. |
| 1.4.10 Reflow | AA | Sections of content can fit within 320px CSS width viewports without needing to scroll in two dimensions to read. |
| 1.4.11 Non-text Contrast | AA | UI components and graphics: 3:1 against adjacent colors. |
| 1.4.12 Text Spacing | AA | No loss of content or functionality with user-overridden line-height (1.5x), or specified paragraph spacing, letter spacing, and word spacing adjustments. |
| 1.4.13 Content on Hover/Focus | AA | Popup content that appears on hover or focus is: dismissible, hoverable, persistent. |

### Operable

| Criterion | Level | Summary |
|-----------|-------|---------|
| 2.1.1 Keyboard | A | All functionality operable via keyboard. |
| 2.1.2 No Keyboard Trap | A | User can navigate away from any component using keyboard. |
| 2.2.1 Timing Adjustable | A | Time limits can be extended or disabled. |
| 2.2.2 Pause, Stop, Hide | A | Auto-updating content can be paused. |
| 2.3.1 Three Flashes | A | No content flashes more than 3 times per second. |
| 2.4.1 Bypass Blocks | A | Skip link to bypass repeated navigation. |
| 2.4.2 Page Titled | A | Pages have descriptive `<title>`. |
| 2.4.3 Focus Order | A | Focus order preserves meaning and operability. |
| 2.4.4 Link Purpose | A | Link purpose determinable from text or context. |
| 2.4.6 Headings and Labels | AA | Headings and labels describe topic or purpose. |
| 2.4.7 Focus Visible | AA | Keyboard focus indicator is visible. |
| 2.4.11 Focus Not Obscured | AA | Focused element not entirely hidden by other overlaying elements (such as sticky headers or footers). *(New in 2.2)* |
| 2.5.1 Pointer Gestures | A | Multi-point gestures have single-pointer alternative. |
| 2.5.2 Pointer Cancellation | A | Activation on up-event, unless activation can be aborted, reversed, or down-event activation is essential. |
| 2.5.3 Label in Name | A | Accessible name contains the label text as it is visually presented. |
| 2.5.4 Motion Actuation | A | Device motion has UI alternative and can be disabled. |
| 2.5.7 Dragging Movements | AA | Drag-and-drop has click/tap alternative. *(New in 2.2)* |
| 2.5.8 Target Size (Minimum) | AA | Interactive controls have a target size, or spacing of at least 24x24 CSS px. *(New in 2.2)* |

### Understandable

| Criterion | Level | Summary |
|-----------|-------|---------|
| 3.1.1 Language of Page | A | `<html lang="...">` set correctly. |
| 3.1.2 Language of Parts | AA | Content in different language marked with `lang` attribute. |
| 3.2.1 On Focus | A | Focus doesn't trigger unexpected context change. |
| 3.2.2 On Input | A | Changing input doesn't auto-trigger unexpected context change. |
| 3.2.6 Consistent Help | A | Help mechanisms in same relative order across pages. *(New in 2.2)* |
| 3.3.1 Error Identification | A | Errors described to user in text. |
| 3.3.2 Labels or Instructions | A | Labels or instructions provided for user input. |
| 3.3.3 Error Suggestion | AA | Suggest corrections for detected errors. |
| 3.3.4 Error Prevention | AA | Submissions are reversible, checked, or confirmed. |
| 3.3.7 Redundant Entry | A | Don't re-ask for info already provided in same process. *(New in 2.2)* |
| 3.3.8 Accessible Authentication (Minimum) | AA | No cognitive function test (puzzle CAPTCHA). Allow paste and autofill. *(New in 2.2)* |

### Robust

| Criterion | Level | Summary |
|-----------|-------|---------|
| 4.1.2 Name, Role, Value | A | All UI components have accessible name, role, and state. |
| 4.1.3 Status Messages | AA | Status messages announced by screen readers without receiving focus. |

> **Note:** 4.1.1 Parsing is obsolete in WCAG 2.2 (always satisfied). Issues it covered are now addressed by 1.3.1 and 4.1.2.

> **New AAA criteria in 2.2** (not required for AA, but recommended): 2.4.12 Focus Not Obscured (Enhanced), 2.4.13 Focus Appearance, 3.3.9 Accessible Authentication (Enhanced).

> **Looking ahead:** WCAG 3.0 (W3C Accessibility Guidelines) is in Working Draft (March 2026). It replaces pass/fail with Bronze/Silver/Gold conformance and "Outcomes" instead of "Success Criteria." It is NOT yet a standard — continue targeting WCAG 2.2 AA.

## Legal Enforcement Context (2026)

- **European Accessibility Act (EAA)**: Enforced since June 2025 across all 27 EU member states. Applies to digital products and services. Fines up to EUR 3 million. References EN 301 549 (maps to WCAG 2.1 AA).
- **ADA Title II (US)**: Digital accessibility rule effective April 2026 for state/local governments serving 50,000+ people (April 2027 for smaller entities). Requires WCAG 2.1 AA.
- **Section 508 (US Federal)**: References WCAG 2.0 AA (refresh to 2.1/2.2 expected).

**Target**: WCAG 2.2 AA covers all current legal requirements (superset of 2.1 AA and 2.0 AA).

---

## Five Rules of ARIA

1. **Prefer native HTML** — Use `<button>` not `<div role="button">`. Native elements have built-in keyboard, focus, and semantics.
2. **Don't change native semantics where prohibited** — Don't add `role="heading"` to a `<button>`. Use the correct element.
3. **All ARIA controls must be keyboard operable** — If `role="button"`, handle Enter and Space key events.
4. **Don't use `aria-hidden="true"` on focusable elements** — Hidden from assistive tech but still focusable creates a "ghost" element.
5. **All interactive elements need an accessible name** — Via label, `aria-label`, `aria-labelledby`, or visible text content.

---

## Semantic HTML Anti-Patterns (S1-S8)

### S1: Missing `lang` Attribute on `<html>`

- **Severity**: CRITICAL
- **Detection**: `<html` without `lang=`
- **WCAG**: 3.1.1 (A)

```html
<!-- BAD -->
<html>

<!-- GOOD -->
<html lang="en">
```

Next.js: Set in `app/layout.tsx`. Angular: Set in `src/index.html`. Vue/Nuxt: Set in `app.vue` or `nuxt.config`.

### S2: Multiple `<h1>` Per Page

- **Severity**: SUGGESTION
- **Detection**: Multiple `<h1>` elements that make the page heading structure unclear
- **WCAG**: Best practice (supports 1.3.1)

Prefer one `<h1>` per page representing the main topic. Use `<h2>` for sections. Multiple `<h1>` elements are not a strict WCAG violation but can confuse screen reader navigation.

### S3: Heading Level Gaps

- **Severity**: IMPORTANT
- **Detection**: `<h1>` followed by `<h3>` (skipping `<h2>`)
- **WCAG**: 1.3.1 (A)

Maintain logical nesting: `h1 > h2 > h3 > h4`. Style headings with CSS, not by choosing a different heading level.

### S4: Div Soup — No Landmark Elements

- **Severity**: IMPORTANT
- **Detection**: Pages using only `<div>` without `<nav>`, `<main>`, `<header>`, `<footer>`
- **WCAG**: Best practice (supports 1.3.1, 2.4.1)

```html
<!-- GOOD -->
<header>...</header>
<nav aria-label="Main">...</nav>
<main>...</main>
<footer>...</footer>
```

### S5: Layout Tables Without `role="presentation"`

- **Severity**: IMPORTANT
- **Detection**: `<table>` without `<th>`, `<caption>`, or `role="presentation"`
- **WCAG**: 1.3.1 (A)

Use CSS Grid/Flexbox for layout. If table must be used for layout, add `role="presentation"`.

### S6: Data Tables Without Headers

- **Severity**: CRITICAL
- **Detection**: `<table>` with data rows but no `<th>` elements
- **WCAG**: 1.3.1 (A)

```html
<!-- GOOD -->
<table>
  <caption>User list</caption>
  <thead>
    <tr><th scope="col">Name</th><th scope="col">Email</th></tr>
  </thead>
  <tbody>
    <tr><td>Alice</td><td>alice@example.com</td></tr>
  </tbody>
</table>
```

### S7: Non-Descriptive Link Text

- **Severity**: IMPORTANT
- **Detection**: `>click here<|>read more<|>learn more<|>here<|>more<|>link<`
- **WCAG**: 2.4.4 (A)

```html
<!-- BAD -->
<a href="/pricing">Click here</a>

<!-- GOOD -->
<a href="/pricing">View pricing plans</a>
```

### S8: Interactive Elements Without Semantic HTML

- **Severity**: CRITICAL
- **Detection**: `<div.*(?:onClick|@click|\(click\))`
- **WCAG**: 4.1.2 (A)

```tsx
// BAD — not focusable, no role, no keyboard support
<div onClick={handleClick}>Submit</div>

// GOOD
<button onClick={handleClick}>Submit</button>
```

---

## ARIA Anti-Patterns (A1-A8)

### A1: Redundant ARIA on Native Elements

- **Severity**: SUGGESTION
- **Detection**: `<button.*role="button"|<nav.*role="navigation"|<a.*role="link"`
- **WCAG**: ARIA Rule 2

Remove redundant ARIA. `<button>` already has `role="button"`.

### A2: `aria-hidden="true"` on Focusable Element

- **Severity**: CRITICAL
- **Detection**: `aria-hidden="true"` on focusable elements (button, input, a, [tabindex])
- **WCAG**: ARIA Rule 4

Do not leave focusable elements inside `aria-hidden="true"` content or use `aria-hidden="true"` on focusable elements. Rather, for native controls that support it, such as `<button>` or `<input>`, use `disabled` if disabling the control is the intended behavior. For `<a>` elements or arbitrary elements made focusable with `[tabindex]`, remove focusability instead (for example, remove `href` or `tabindex`). If the content should be completely non-interactive and hidden from assistive technology, use `inert`, `hidden`, or remove it from the DOM.

### A3: Missing Required ARIA Properties

- **Severity**: CRITICAL
- **Detection**: `role="tab"` without `aria-selected`, `role="checkbox"` without `aria-checked`
- **WCAG**: 4.1.2 (A)

Required per role: `tab` needs `aria-selected`; `combobox` needs `aria-expanded`/`aria-controls`; `slider` needs `aria-valuemin`/`aria-valuemax`/`aria-valuenow`; `checkbox` needs `aria-checked`.

### A4: Invalid ARIA Role Values

- **Severity**: CRITICAL
- **Detection**: `role="[^"]*"` with non-existent values
- **WCAG**: 4.1.2 (A)

Invalid roles are ignored by assistive technology. Common mistakes: `role="input"`, `role="text"`, misspellings.

### A5: ARIA Where Native HTML Works

- **Severity**: IMPORTANT
- **Detection**: `role="button"` on `<div>`, `role="checkbox"` on `<div>`
- **WCAG**: ARIA Rule 1

```html
<!-- BAD — requires manual keyboard, focus, and state management -->
<div role="checkbox" aria-checked="false" tabindex="0">Accept terms</div>

<!-- GOOD — all behavior built-in -->
<label><input type="checkbox" /> Accept terms</label>
```

### A6: Missing `aria-label` on Icon-Only Buttons

- **Severity**: CRITICAL
- **Detection**: `<button` with SVG/icon child and no text or `aria-label`
- **WCAG**: 4.1.2 (A)

```html
<!-- GOOD -->
<button aria-label="Close dialog"><svg aria-hidden="true">...</svg></button>
```

### A7: `role="presentation"` on Focusable Elements

- **Severity**: IMPORTANT
- **Detection**: `role="presentation"` on interactive elements
- **WCAG**: ARIA Rule 4

Browsers will ignore the presentation role on focusable elements.

### A8: Missing Live Region for Dynamic Content

- **Severity**: IMPORTANT
- **Detection**: Toast/notification components without `role="alert"`, `role="status"`, or `aria-live`
- **WCAG**: 4.1.3 (AA)

```html
<!-- GOOD — content announced when content is injected into a preexisting live region element in the DOM -->
<div role="status" aria-live="polite">Item saved successfully</div>
<!-- Use role="alert" (assertive) for errors -->
<div role="alert">Failed to save. Please try again.</div>
```

---

## Keyboard and Focus Anti-Patterns (K1-K7)

### K1: `onClick` Without `onKeyDown` on Non-Native Elements

- **Severity**: CRITICAL
- **Detection**: `(?:onClick|@click|\(click\))` on `<div>` or `<span>` without keyboard handler
- **WCAG**: 2.1.1 (A)

Use `<button>` instead. If a div is required: add `role="button"`, `tabIndex={0}`, handle Enter and Space key activation.

### K2: Positive `tabindex` Values

- **Severity**: CRITICAL
- **Detection**: `(?:tabindex="[1-9]\d*"|tabIndex=\{[1-9]\d*\})`
- **WCAG**: 2.4.3 (A)

Only use `tabindex="0"` (add to tab order) and `tabindex="-1"` (programmatic focus only).

### K3: Focus Trap Without Escape

- **Severity**: CRITICAL
- **Detection**: Modal/overlay without Escape key handler or focus trapping
- **WCAG**: 2.1.2 (A)

Use native `<dialog>` with `showModal()` — it prevents keyboard focus from moving to the inert non-dialog content. Additionally, it has built in Escape key to dismiss, and focus will automatically return to the invoking element (if available). If a custom modal dialog implementation is needed: trap Tab within the dialog or use the `inert` attribute for non-dialog content (do not use `inert` on an element that contains the dialog), dismiss on Escape (unless user confirmation of an action is essential), return focus to the trigger element on close, or to best logical location if triggering element is no longer present upon dismissal.

### K4: Missing Skip Link

- **Severity**: IMPORTANT
- **Detection**: No skip link as first focusable element
- **WCAG**: 2.4.1 (A)

```html
<a href="#main-content" class="skip-link">Skip to main content</a>
<nav>...</nav>
<main id="main-content" tabindex="-1">...</main>
```

```css
.skip-link { position: absolute; top: -40px; left: 0; padding: 8px 16px; background: #000; color: #fff; z-index: 100; }
.skip-link:focus { top: 0; }
```

### K5: `outline: none` Without Replacement

- **Severity**: CRITICAL
- **Detection**: `outline:\s*none|outline:\s*0\b` without `:focus-visible` replacement
- **WCAG**: 2.4.7 (AA)

```css
/* GOOD */
button:focus-visible { outline: 2px solid #005fcc; outline-offset: 2px; }
```

### K6: Mouse-Only Interactions

- **Severity**: IMPORTANT
- **Detection**: `onMouseOver|onMouseEnter|@mouseenter` without keyboard equivalent
- **WCAG**: 2.1.1 (A)

Pair hover with focus events. Use `onFocus`/`onBlur` alongside `onMouseEnter`/`onMouseLeave`.

### K7: Focus Not Returned After Custom Modal Close

- **Severity**: IMPORTANT
- **Detection**: Custom modal dialog close without restoring focus to trigger
- **WCAG**: 2.4.3 (A)

Store reference to trigger element or to best logical location if triggering element is no longer present upon close. On modal close, call `triggerElement.focus()`.

---

## Form Anti-Patterns (F1-F6)

### F1: Input Without Associated Label

- **Severity**: CRITICAL
- **Detection**: `<input|<select|<textarea` without `<label>`, `aria-label`, or `aria-labelledby`
- **WCAG**: 1.3.1 (A), 3.3.2 (A)

```html
<!-- GOOD -->
<label for="email">Email address</label>
<input id="email" type="email" placeholder="you@example.com" />
```

### F2: Error Messages Not Linked to Input

- **Severity**: CRITICAL
- **Detection**: Error elements near inputs without `aria-describedby`
- **WCAG**: 3.3.1 (A)

```html
<input id="email" type="email" aria-describedby="email-error" aria-invalid="true" />
<span id="email-error" class="error">Invalid email format</span>
```

### F3: Required Field Indicated Only by Color or `*`

- **Severity**: IMPORTANT
- **Detection**: `required` or `*` without `aria-required="true"` or HTML `required`
- **WCAG**: 3.3.2 (A), 1.4.1 (A)

```html
<label for="name">Name <span aria-hidden="true">*</span></label>
<input id="name" type="text" required />
<p class="form-note">Fields marked * are required</p>
```

### F4: No Error Summary or Focus on First Error

- **Severity**: IMPORTANT
- **Detection**: Form submit handler without focus management on validation failure
- **WCAG**: 3.3.1 (A)

On submit failure, focus the first invalid field or show and focus an error summary.

### F5: CAPTCHA Without Accessible Alternative

- **Severity**: IMPORTANT
- **Detection**: Puzzle/image CAPTCHAs without fallback; password fields with `autocomplete='off'` or paste-blocking JavaScript
- **WCAG**: 3.3.8 (AA)

Use reCAPTCHA v3 (invisible), hCaptcha accessibility mode, or alternative authentication. Never block paste or autofill on password fields — this violates WCAG 3.3.8.

### F6: Placeholder as Label

- **Severity**: IMPORTANT
- **Detection**: `placeholder=` without accompanying `<label>`, `aria-label`, or `aria-labelledby`
- **WCAG**: 3.3.2 (A)

Always pair placeholder with a visible `<label>`. Placeholder is a hint, not a label.

---

## Visual and Color Anti-Patterns (V1-V5)

### V1: Insufficient Text Contrast

- **Severity**: CRITICAL
- **Detection**: Text color combinations below 4.5:1 (normal) or 3:1 (large)
- **WCAG**: 1.4.3 (AA)

```css
/* BAD — #999 on #fff is ~2.5:1 */
.text { color: #999; background: #fff; }

/* GOOD — #595959 on #fff is 7.0:1 */
.text { color: #595959; background: #fff; }
```

### V2: Information Conveyed by Color Alone

- **Severity**: CRITICAL
- **Detection**: Error/success states distinguished only by color
- **WCAG**: 1.4.1 (A)

Add a secondary indicator: icon, text, pattern, underline, or border.

### V3: Fixed Font Sizes Preventing Resize

- **Severity**: IMPORTANT
- **Detection**: `font-size:\s*[0-9]*px` (excluding root/base)
- **WCAG**: 1.4.4 (AA)

Use `rem` or `em` for font sizes. Base font can be `px`, but content fonts should be relative.

### V4: Content Not Reflowing at 320px

- **Severity**: IMPORTANT
- **Detection**: Fixed-width containers, horizontal scroll at narrow widths
- **WCAG**: 1.4.10 (AA)

Use responsive layouts (Grid, Flexbox). Test at 320px CSS width. Avoid fixed-width containers.

### V5: Animation Without `prefers-reduced-motion`

- **Severity**: SUGGESTION
- **Detection**: `animation:|transition:` without `prefers-reduced-motion` media query
- **WCAG**: 2.3.3 (AAA)

Best practice and AAA enhancement. Gate non-essential animations behind `prefers-reduced-motion` so users who request less motion are not forced to experience interaction-triggered effects.

```css
@media (prefers-reduced-motion: no-preference) {
  .card { transition: transform 0.3s ease; }
  .card:hover { transform: scale(1.05); }
}
```

---

## Media Anti-Patterns (D1-D4)

### D1: Informational Image Without Alt Text

- **Severity**: CRITICAL
- **Detection**: `<img|<Image` without `alt=` attribute
- **WCAG**: 1.1.1 (A)

Alt text decision tree: decorative = `alt=""`; contains text = include that text; functional = describe action; informational = describe content.

### D2: Decorative Image with Non-Empty Alt

- **Severity**: SUGGESTION
- **Detection**: Decorative images with meaningful alt text
- **WCAG**: 1.1.1 (A)

Use `alt=""` for decorative images. Add `aria-hidden="true"` for decorative SVGs.

### D3: Video Without Captions

- **Severity**: CRITICAL
- **Detection**: `<video` without `<track kind="captions">`
- **WCAG**: 1.2.2 (A)

```html
<video src="/tutorial.mp4" controls>
  <track kind="captions" src="/tutorial-en.vtt" srclang="en" label="English" default />
</video>
```

### D4: Audio/Video Autoplay

- **Severity**: IMPORTANT
- **Detection**: `autoplay` attribute without `muted`
- **WCAG**: 1.4.2 (A)

Never autoplay audio. If video autoplays, start muted with controls.

---

## Framework-Specific: React / Next.js (RX1-RX4)

### RX1: Missing `htmlFor` on `<label>`

- **Severity**: IMPORTANT
- **Detection**: `<label.*for="` in JSX (should be `htmlFor`)
- **WCAG**: 1.3.1 (A), 3.3.2 (A)

### RX2: SPA Route Change Without Focus Management

- **Severity**: IMPORTANT
- **Detection**: Navigation without focus management or live region
- **WCAG**: 4.1.3 (AA)

After route change, focus the main heading or announce the new page title via a live region. Next.js includes a built-in route announcer (since v13) that reads `document.title`, then `<h1>`, then pathname. Ensure every page has a unique `<title>`.

### RX3: Fragment Root Causing Focus Loss on Re-render

- **Severity**: SUGGESTION
- **Detection**: `<>...</>` root with conditional rendering causing DOM restructuring
- **WCAG**: 2.4.3 (A)

Use `key` prop to preserve DOM identity, or manually restore focus with `useRef` + `useEffect`.

### RX4: Injected HTML Without ARIA Consideration

- **Severity**: IMPORTANT
- **Detection**: Rich text rendering without accessibility validation
- **WCAG**: 1.3.1 (A)

Sanitize and validate injected HTML for heading hierarchy, alt text, and ARIA structure.

---

## Framework-Specific: Angular (NG1-NG4)

### NG1: `(click)` on `<div>` Without Role and Keyboard Support

- **Severity**: CRITICAL
- **Detection**: `(click)` on `<div>` or `<span>` without `role=`, `tabindex`, `(keydown)`
- **WCAG**: 2.1.1 (A), 4.1.2 (A)

Use `<button>`. If div required: add `role="button"`, `tabindex="0"`, `(keydown.enter)`, `(keydown.space)`.

### NG2: Missing `cdkTrapFocus` in Modal Components

- **Severity**: IMPORTANT
- **Detection**: Modal components without `cdkTrapFocus`
- **WCAG**: 2.1.2 (A)

```html
<div class="modal" cdkTrapFocus [cdkTrapFocusAutoCapture]="true">...</div>
```

Angular CDK's `Dialog` service handles focus trapping and restoration automatically.

### NG3: Route Change Without LiveAnnouncer

- **Severity**: IMPORTANT
- **Detection**: Angular Router navigation without `LiveAnnouncer`
- **WCAG**: 4.1.3 (AA)

```typescript
router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
  liveAnnouncer.announce(titleService.getTitle(), 'polite');
});
```

### NG4: Template-Driven Forms Without Accessible Validation

- **Severity**: IMPORTANT
- **Detection**: Forms showing errors without `[attr.aria-invalid]` or `[attr.aria-describedby]`
- **WCAG**: 3.3.1 (A), 3.3.3 (AA)

Bind `[attr.aria-invalid]` and `[attr.aria-describedby]` to form control state.

---

## Framework-Specific: Vue (VU1-VU3)

### VU1: `@click` on Non-Interactive Element Without Role and Keyboard

- **Severity**: CRITICAL
- **Detection**: `@click` on `<div>` or `<span>` without `role=`, `tabindex`, `@keydown`
- **WCAG**: 2.1.1 (A), 4.1.2 (A)

Use `<button>`. Or add `role="button"`, `tabindex="0"`, `@keydown.enter`, `@keydown.space.prevent`.

### VU2: `v-if` Toggle Without Focus Management

- **Severity**: IMPORTANT
- **Detection**: `v-if` toggling without managing focus via `nextTick`
- **WCAG**: 2.4.3 (A)

```vue
<script setup>
import { ref, watch, nextTick } from 'vue';
const showPanel = ref(false);
const panel = ref(null);
watch(showPanel, async (val) => {
  if (val) { await nextTick(); panel.value?.focus(); }
});
</script>
```

### VU3: `v-html` Injecting Content Without Accessible Structure

- **Severity**: IMPORTANT
- **Detection**: `v-html` rendering user or CMS content
- **WCAG**: 1.3.1 (A)

Sanitize and validate HTML for heading hierarchy, alt text, and ARIA structure before injection.

---

## Keyboard Interaction Reference

| Key | Expected Behavior |
|-----|-------------------|
| `Tab` | Move focus to next focusable element in DOM order |
| `Shift+Tab` | Move focus to previous focusable element |
| `Enter` | Activate buttons and links |
| `Space` | Activate buttons, toggle checkboxes, select radio buttons |
| `Escape` | Close modals, dialogs, popovers, dropdowns |
| `Arrow Up/Down` | Navigate within menus, listboxes, radio groups, tabs |
| `Arrow Left/Right` | Navigate within tab bars, sliders, radio groups |
| `Home` | Move to first item in list, menu, or tab bar |
| `End` | Move to last item in list, menu, or tab bar |

### Widget-Specific Patterns

| Widget | Tab enters | Internal nav | Activate | Exit |
|--------|-----------|-------------|----------|------|
| Tab bar | Focus active tab | Arrow Left/Right | automatic or Enter | Tab out |
| Menu | Focus first item | Arrow Up/Down | Enter | Escape |
| Dialog | Focus first element | Tab cycles within | Enter on buttons | Escape |
| Combobox | Focus input | Arrow Up/Down | Enter selects | Escape closes |
| Tree view | Focus first node | Arrow keys | Enter/Space | Tab out |

---

## Color Contrast Quick Reference

### Text Contrast (WCAG 1.4.3 AA)

| Text Type | Minimum Ratio |
|-----------|--------------|
| Normal text (< 18pt / < 14pt bold) | 4.5:1 |
| Large text (>= 18pt / >= 14pt bold) | 3:1 |
| Incidental (disabled, decorative) | No requirement |

### Non-Text Contrast (WCAG 1.4.11 AA)

| Element | Minimum Ratio |
|---------|--------------|
| UI components (borders, icons) | 3:1 against adjacent |
| Graphical objects | 3:1 against adjacent |
| Focus indicators | 3:1 against background |

---

## Accessibility Checklist (POUR)

### Perceivable
- [ ] All images have appropriate alt text (descriptive or empty for decorative)
- [ ] Videos have synchronized captions
- [ ] Page uses semantic landmarks: `<header>`, `<nav>`, `<main>`, `<footer>`
- [ ] Headings follow logical hierarchy (h1 > h2 > h3, no gaps)
- [ ] Text contrast meets 4.5:1 (normal) / 3:1 (large)
- [ ] UI component contrast meets 3:1
- [ ] Information not conveyed by color alone
- [ ] Content reflows at 320px without horizontal scroll
- [ ] `<html lang="...">` is set correctly
- [ ] Text resizable to 200% without loss of content

### Operable
- [ ] All functionality accessible via keyboard
- [ ] No keyboard traps (Escape closes overlays)
- [ ] Skip link provided as first focusable element
- [ ] Focus indicator visible on all interactive elements
- [ ] Focus order matches visual order
- [ ] Focus not obscured by sticky headers/footers
- [ ] Focus returned to trigger after modal close
- [ ] Touch targets at least 24x24 CSS px
- [ ] Animations respect `prefers-reduced-motion`
- [ ] No content flashes more than 3 times per second

### Understandable
- [ ] All form inputs have associated `<label>` or `aria-label`
- [ ] Error messages linked to inputs via `aria-describedby`
- [ ] Required fields indicated with `required` or `aria-required`
- [ ] Error summary or focus-on-first-error on submit failure
- [ ] No unexpected context changes on focus or input

### Robust
- [ ] All interactive elements have accessible name, role, and state
- [ ] ARIA roles have required properties
- [ ] No `aria-hidden="true"` on focusable elements
- [ ] Dynamic content announced via live regions
- [ ] SPA route changes announced to screen readers
- [ ] No redundant ARIA on native HTML elements
