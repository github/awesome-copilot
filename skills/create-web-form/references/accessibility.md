# Web Accessibility Reference

A consolidated reference guide drawn from MDN Web Docs covering core accessibility
concepts, authoring guidelines, safe browsing practices, ARIA-based widgets, and
mobile accessibility requirements.

---

## 1. Accessibility Overview

> **Source:** https://developer.mozilla.org/en-US/docs/Web/Accessibility

### What Is Accessibility?

**Accessibility** (abbreviated as **A11y** -- "a" + 11 characters + "y") in web
development means enabling as many people as possible to use websites, even when
those people's abilities are limited in some way.

> "The Web is fundamentally designed to work for all people, whatever their
> hardware, software, language, location, or ability. When the Web meets this
> goal, it is accessible to people with a diverse range of hearing, movement,
> sight, and cognitive ability." -- W3C

Key points:

- Technology makes things **easier** for many people.
- Technology makes things **possible** for people with disabilities.
- Accessibility spans physical, cognitive, hearing, movement, and sight abilities.

### Core Principles

1. **Semantic HTML** -- Use correct elements for their intended purpose.
2. **Keyboard Navigation** -- Ensure full functionality without a mouse.
3. **Assistive Technology Support** -- Maintain compatibility with screen readers
   and other tools.
4. **Perceivability** -- Content must be perceivable through multiple senses.
5. **Operability** -- All functionality must be keyboard accessible.
6. **Understandability** -- Clear language and predictable behavior.
7. **Robustness** -- Works across diverse assistive technologies.

### Beginner Tutorial Modules (MDN Learn Web Development)

| Module | Description |
|--------|-------------|
| What is Accessibility? | Groups to consider, tools users rely on, workflow integration |
| Accessibility Tooling and Assistive Technology | Tools for solving accessibility issues |
| HTML: A Good Basis for Accessibility | Semantic markup and correct element usage |
| CSS and JavaScript Best Practices | Accessible implementation of CSS and JS |
| WAI-ARIA Basics | Adding semantics for complex UI controls and dynamic content |
| Accessible Multimedia | Text alternatives for video, audio, and images |
| Mobile Accessibility | iOS/Android tools and mobile-specific considerations |

### Key Standards and Frameworks

- **WCAG (Web Content Accessibility Guidelines)** -- organized into Perceivable,
  Operable, Understandable, and Robust categories.
- **ARIA (Accessible Rich Internet Applications)** -- 53+ attributes and 87+
  roles for adding semantic meaning to custom widgets.

---

## 2. Information for Web Authors

> **Source:** https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Information_for_Web_authors

### Guidelines and Regulations

#### ARIA Authoring Practices Guide (APG)

- **Provider:** W3C
- **URL:** https://www.w3.org/WAI/ARIA/apg/
- Design patterns and functional examples for accessible web experiences.
- Covers how to apply accessibility semantics to common design patterns and
  widgets.

#### Web Content Accessibility Guidelines (WCAG)

- **Provider:** W3C Web Accessibility Initiative (WAI)
- **URL:** https://www.w3.org/WAI/standards-guidelines/wcag/
- Important baseline guidelines being adopted by EU accessibility regulations.

#### ARIA on MDN

- Complete guides to ARIA roles, properties, and attributes.
- Best practices and code examples for each role.

### How-to Guides

| Guide | Provider | URL |
|-------|----------|-----|
| Accessibility for Teams | U.S. General Services Administration | https://digital.gov/guides/accessibility-for-teams/ |
| Accessible Web Page Authoring | IBM | https://www.ibm.com/able/requirements/requirements/ |

### Automated Checking and Repair Tools

#### Browser Extensions

| Tool | URL |
|------|-----|
| HTML CodeSniffer | https://squizlabs.github.io/HTML_CodeSniffer/ |
| aXe DevTools | Built into browser DevTools |
| Lighthouse Accessibility Audit | Chrome DevTools integrated |
| Accessibility Insights | https://accessibilityinsights.io/ |
| WAVE | https://wave.webaim.org/extension/ |

#### Build-Process / Programmatic Testing

| Tool | Description |
|------|-------------|
| axe-core | Accessibility engine for automated testing (dequelabs/axe-core) |
| eslint-plugin-jsx-a11y | ESLint plugin for JSX accessibility rules |
| Lighthouse Audits | Programmable audit runner (GoogleChrome/lighthouse) |
| AccessLint.js | Automated a11y linting library |

#### Continuous Integration

- **AccessLint** (https://accesslint.com/) -- integrates with GitHub pull
  requests for automated accessibility review.

### Testing Recommendations

Simulation and testing methods to employ:

- Color blindness simulation
- Low vision simulation
- Low contrast testing
- Zoom testing
- Keyboard-only navigation (disable the mouse)
- Touch-only testing
- Voice command testing
- Testing with a **Web Disability Simulator** browser extension

Best practice: **Test with real users whenever possible.**

---

## 3. Browsing Safely

> **Source:** https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Browsing_safely

### Conditions Addressed

| Condition | Common Triggers |
|-----------|-----------------|
| Vestibular Disorders | Motion, animations, parallax effects |
| Seizure Disorders | Flashing (3+ per second), flickering, high-contrast color changes |
| Photosensitivity | Color intensity, flashing, high contrast |
| Traumatic Brain Injury (TBI) | High cognitive load from color processing |

### CSS Media Feature: `prefers-reduced-motion`

Detects the user's OS-level preference for reduced motion.

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

CSS transition events that developers can listen to:

- `transitionrun`
- `transitionstart`
- `transitionend`
- `transitioncancel`

### Platform-Level Browser Controls

| Platform | Setting | Notes |
|----------|---------|-------|
| Safari Desktop (10.1+) | Disable Auto-Play | Does not affect animated GIFs |
| iOS Safari (10.3+) | Reduce Motion (OS Accessibility settings) | GIFs unaffected |
| Firefox | `image.animation_mode` set to `"none"` | Disables all animated GIFs |
| Reader Mode (various) | Content Blockers, text-to-speech, font/zoom | Reduces distractions |

### Useful Browser Extensions

| Extension | Purpose | Browser |
|-----------|---------|---------|
| Gif Blocker | Blocks all GIFs | Chrome |
| Gif Scrubber | Pause/play/scrub GIFs like a video | Chrome |
| Beeline Reader | Grayscale mode, dyslexia-friendly fonts, contrast | Chrome, Edge, Firefox |

### Operating System Accessibility Features

**Windows 10:**

- Settings > Ease of Access > Display -- Turn off animations.
- Settings > Ease of Access > Display > Color Filters -- Toggle grayscale.
- Grayscale reduces cognitive load for TBI, photosensitive epilepsy, and other
  conditions.

**macOS:**

- System Preferences > Accessibility > Display -- "Reduce motion" option.

### WCAG Compliance: Success Criterion 2.3.1

**Three Flashes or Below Threshold** -- content must not flash more than three
times per second unless the flash is below the general flash and red flash
thresholds.

### Best Practices for Developers

**Do:**

- Support the `prefers-reduced-motion` media query.
- Keep flashing below 3 times per second.
- Provide play/pause controls for all animations.
- Test with OS accessibility features enabled.

**Do not:**

- Auto-play videos or animations without user controls.
- Use high-frequency flashing or strobing effects.
- Assume all users can tolerate motion.

### Implementation Checklist

- [ ] Add `@media (prefers-reduced-motion: reduce)` rules to CSS.
- [ ] Disable auto-play animations when the user preference is set.
- [ ] Ensure GIFs have pause controls.
- [ ] Test in Windows and macOS accessibility modes.
- [ ] Validate against WCAG 2.3.1 (Three Flashes criterion).

---

## 4. Accessible Web Applications and Widgets

> **Source:** https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Accessible_web_applications_and_widgets

### The Problem

Custom JavaScript widgets (sliders, menu bars, tabs, dialogs) built with generic
HTML elements like `<div>` and `<span>` lack semantic meaning for assistive
technologies. Dynamic content changes may not be detected by screen readers.

### ARIA (Accessible Rich Internet Applications)

ARIA fills the gap between standard HTML and desktop-style UI controls with three
types of attributes:

1. **Roles** -- Describe widgets not natively available in HTML (sliders, menu
   bars, tabs, dialogs).
2. **Properties** -- Describe characteristics (draggable, required, has popup).
3. **States** -- Describe current interaction state (busy, disabled, selected,
   hidden).

**Important:** Prefer semantic HTML elements over ARIA when available. ARIA is a
progressive enhancement for dynamic components.

### Example: Tabs Widget

**Without ARIA (non-accessible):**

```html
<ol>
  <li id="ch1Tab">
    <a href="#ch1Panel">Chapter 1</a>
  </li>
  <li id="ch2Tab">
    <a href="#ch2Panel">Chapter 2</a>
  </li>
</ol>

<div>
  <div id="ch1Panel">Chapter 1 content goes here</div>
  <div id="ch2Panel">Chapter 2 content goes here</div>
</div>
```

**With ARIA (accessible):**

```html
<ol role="tablist">
  <li id="ch1Tab" role="tab">
    <a href="#ch1Panel">Chapter 1</a>
  </li>
  <li id="ch2Tab" role="tab">
    <a href="#ch2Panel">Chapter 2</a>
  </li>
</ol>

<div>
  <div id="ch1Panel" role="tabpanel" aria-labelledby="ch1Tab">
    Chapter 1 content goes here
  </div>
  <div id="ch2Panel" role="tabpanel" aria-labelledby="ch2Tab">
    Chapter 2 content goes here
  </div>
</div>
```

### Common ARIA State Attributes

| Attribute | Purpose |
|-----------|---------|
| `aria-checked` | State of checkbox or radio button |
| `aria-disabled` | Visible but not editable/operable |
| `aria-grabbed` | "Grabbed" state in drag-and-drop |
| `aria-selected` | Selected state of an element |
| `aria-expanded` | Whether expandable content is open |
| `aria-pressed` | Pressed state of a toggle button |

Use ARIA states to indicate UI state and CSS attribute selectors to style
accordingly.

### Visibility Management with `aria-hidden`

```html
<div id="tp1" class="tooltip" role="tooltip" aria-hidden="true">
  Your first name is optional
</div>
```

```css
div.tooltip[aria-hidden="true"] {
  display: none;
}
```

```javascript
function showTip(el) {
  el.setAttribute("aria-hidden", "false");
}
```

### Role Changes

Never change an element's ARIA role dynamically. Instead, replace the element
entirely:

```javascript
// Correct: swap elements
// View mode
<div role="button">Edit this text</div>

// Edit mode: replace with an input
<input type="text" />
```

### Keyboard Navigation Best Practices

| Key | Expected Behavior |
|-----|-------------------|
| Tab / Shift+Tab | Move focus into and out of the widget |
| Arrow Keys | Navigate between items within the widget |
| Enter / Spacebar | Activate the focused control |
| Escape | Close menus or dialogs |
| Home / End | Jump to first or last item |

Focus management considerations:

- Maintain focus order that matches visual layout.
- Use `tabindex="0"` to make custom elements keyboard accessible.
- Avoid `tabindex > 0` (breaks natural tab order).
- Update the visual focus indicator for keyboard users.
- Move focus programmatically when opening dialogs or modals.

### Key ARIA Attributes for Interactive Widgets

**Labeling and Description:**

| Attribute | Usage |
|-----------|-------|
| `aria-label` | Direct text label |
| `aria-labelledby` | References the element that labels this one |
| `aria-describedby` | References additional descriptive text |
| `aria-description` | Inline description text |

**Relationships:**

| Attribute | Usage |
|-----------|-------|
| `aria-controls` | This element controls another element |
| `aria-owns` | Establishes parent-child relationships |
| `aria-flowto` | Defines logical reading order |

**Widget Behavior:**

| Attribute | Usage |
|-----------|-------|
| `aria-haspopup` | Has a popup (menu, listbox, dialog, grid, tree) |
| `aria-expanded` | Expandable content state (true/false) |
| `aria-modal` | Modal dialog (true) |
| `aria-live` | Live region announcements (polite, assertive, off) |
| `aria-busy` | Loading or processing state (true/false) |

### Live Regions for Dynamic Content

```html
<div aria-live="polite" aria-atomic="true">
  Updates will be announced to screen readers
</div>
```

- `aria-live="polite"` -- announce when convenient.
- `aria-live="assertive"` -- announce immediately.
- `aria-atomic="true"` -- announce the entire region, not just the changed part.

---

## 5. Mobile Accessibility Checklist

> **Source:** https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Mobile_accessibility_checklist

A checklist of accessibility requirements for mobile app developers targeting
WCAG 2.2 AA compliance.

### Color

- **Normal text:** minimum 4.5:1 contrast ratio (less than 18pt or 14pt bold).
- **Large text:** minimum 3:1 contrast ratio (at least 18pt or 14pt bold).
- Information conveyed via color must also be available through other means (e.g.,
  underlines for links).

### Visibility

- Do NOT hide content exclusively with zero opacity, z-index ordering, or
  off-screen placement.
- Use the `hidden` HTML attribute, `visibility`, or `display` CSS properties to
  truly hide content.
- Avoid `aria-hidden` unless absolutely necessary.
- Critical for single-page apps where multiple views/cards may overlap.

### Focus

- Standard controls (links, buttons, form fields) are focusable by default.
- Custom controls must have an appropriate ARIA Role (e.g., `button`, `link`,
  `checkbox`).
- Focus order must be logical and consistent.

### Text Equivalents

- Provide text alternatives for all non-text elements using `alt`, `title`,
  `aria-label`, `aria-labelledby`, or `aria-describedby`.
- Avoid images of text.
- Visible UI component text must match the programmatic name (WCAG 2.1: Label in
  Name).
- All form controls must have associated `<label>` elements.

### Handling State

- Standard controls: the operating system handles radio buttons and checkboxes.
- Custom controls must communicate state changes via ARIA States:
  - `aria-checked`
  - `aria-disabled`
  - `aria-selected`
  - `aria-expanded`
  - `aria-pressed`

### Orientation

- Content must not be restricted to portrait or landscape unless essential (e.g.,
  a piano app or bank-check scanner).
- Reference: WCAG 2.1 Orientation (https://www.w3.org/WAI/WCAG21/Understanding/orientation.html).

### General Guidelines

**App Structure:**

- Always provide an app title.
- Use a proper heading hierarchy without skipping levels:

```html
<h1>Top level heading</h1>
  <h2>Secondary heading</h2>
  <h2>Another secondary heading</h2>
    <h3>Low level heading</h3>
```

**ARIA Landmark Roles:**

Use landmarks to describe app or document structure:

- `banner`
- `complementary`
- `contentinfo`
- `main`
- `navigation`
- `search`

**Touch Events (WCAG 2.1: Pointer Cancellation):**

1. Avoid executing functions on the down-event.
2. If unavoidable, complete the function on the up-event with an abort mechanism.
3. If unavoidable, ensure the up-event can undo the down-event action.
4. Exceptions: game controls, virtual keyboards, real-time feedback.

**Touch Target Size:**

- Targets must be large enough for reliable user interaction.
- Reference: BBC Mobile Accessibility Guidelines for specific sizing
  recommendations (https://www.bbc.co.uk/accessibility/forproducts/guides/mobile/target-touch-size).

---

## Additional Resources

| Resource | URL |
|----------|-----|
| W3C Accessibility Standards | https://www.w3.org/standards/webdesign/accessibility |
| WAI Interest Group | https://www.w3.org/WAI/about/groups/waiig/ |
| ARIA Specification | https://w3c.github.io/aria/ |
| WAI-ARIA Authoring Practices | https://www.w3.org/WAI/ARIA/apg/ |
| WCAG 2.1 Understanding Docs | https://www.w3.org/WAI/WCAG21/Understanding/ |
| IBM Accessibility Requirements | https://www.ibm.com/able/requirements/requirements/ |
| Accessibility Insights | https://accessibilityinsights.io/ |
| WAVE Evaluation Tool | https://wave.webaim.org/extension/ |
