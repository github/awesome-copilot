# Accessibility Guidelines Reference (WCAG)

## Quick Compliance Checklist

### Level AA Requirements (Minimum Standard)

- [ ] Color contrast 4.5:1 for normal text
- [ ] Color contrast 3:1 for large text (18px+ or 14px bold)
- [ ] Touch targets minimum 44×44px
- [ ] All functionality available via keyboard
- [ ] Visible focus indicators
- [ ] No content flashes more than 3 times/second
- [ ] Page has descriptive title
- [ ] Link purpose clear from text
- [ ] Form inputs have labels
- [ ] Error messages are descriptive

---

## Color and Contrast

### Contrast Ratios

| Element | Minimum Ratio | Enhanced (AAA) |
| ------- | ------------- | -------------- |
| Body text | 4.5:1 | 7:1 |
| Large text (18px+) | 3:1 | 4.5:1 |
| UI components | 3:1 | - |
| Graphical objects | 3:1 | - |

### Color Independence

Never use color as the only means of conveying information:

```text
✗ Error fields shown only in red
✓ Error fields with red border + error icon + text message

✗ Required fields marked only with red asterisk
✓ Required fields labeled "(required)" or with icon + tooltip

✗ Status shown only by color dots
✓ Status with color + icon + label text

```

### Accessible Color Combinations

**Safe text colors on backgrounds:**

| Background | Text Color | Contrast |
| ---------- | ---------- | -------- |
| White (#FFFFFF) | Dark gray (#1F2937) | 15.5:1 ✓ |
| Light gray (#F3F4F6) | Dark gray (#374151) | 10.9:1 ✓ |
| Primary blue (#2563EB) | White (#FFFFFF) | 4.6:1 ✓ |
| Dark (#111827) | White (#FFFFFF) | 18.1:1 ✓ |

**Colors to avoid for text:**

- Yellow on white (insufficient contrast)
- Light gray on white
- Orange on white (marginal at best)

---

## Keyboard Navigation

### Requirements

1. **All interactive elements** must be reachable via Tab key
2. **Logical tab order** following visual layout
3. **No keyboard traps** (user can always Tab away)
4. **Focus visible** at all times during keyboard navigation
5. **Skip links** to bypass repetitive navigation

### Focus Indicators

```css
/* Example focus styles */
:focus {
  outline: 2px solid #2563EB;
  outline-offset: 2px;
}

:focus:not(:focus-visible) {
  outline: none; /* Hide for mouse users */
}

:focus-visible {
  outline: 2px solid #2563EB;
  outline-offset: 2px;
}

```

### Keyboard Shortcuts

| Key | Expected Behavior |
| --- | ----------------- |
| Tab | Move to next interactive element |
| Shift+Tab | Move to previous element |
| Enter | Activate button/link |
| Space | Activate button, toggle checkbox |
| Escape | Close modal/dropdown |
| Arrow keys | Navigate within components |

---

## Screen Reader Support

### Semantic HTML Elements

Use appropriate elements for their purpose:

| Purpose | Element | Not This |
| ------- | ------- | -------- |
| Navigation | `<nav>` | `<div class="nav">` |
| Main content | `<main>` | `<div id="main">` |
| Header | `<header>` | `<div class="header">` |
| Footer | `<footer>` | `<div class="footer">` |
| Button | `<button>` | `<div onclick>` |
| Link | `<a href>` | `<span onclick>` |

### Heading Hierarchy

```text
h1 - Page Title (one per page)
  h2 - Major Section
    h3 - Subsection
      h4 - Sub-subsection
    h3 - Another Subsection
  h2 - Another Major Section

```

**Never skip levels** (h1 → h3 without h2)

### Image Alt Text

```text
Decorative: alt="" (empty, not omitted)
Informative: alt="Description of what image shows"
Functional: alt="Action the image performs"
Complex: alt="Brief description" + detailed description nearby

```

**Alt text examples:**

```text
✓ alt="Bar chart showing sales growth from $10M to $15M in Q4"
✓ alt="Company logo"
✓ alt="" (for decorative background pattern)

✗ alt="image" or alt="photo"
✗ alt="img_12345.jpg"
✗ Missing alt attribute entirely

```

---

## Touch and Pointer

### Touch Target Sizes

| Platform | Minimum | Recommended |
| -------- | ------- | ----------- |
| WCAG 2.1 | 44×44px | 48×48px |
| iOS (Apple) | 44×44pt | - |
| Android | 48×48dp | - |

### Touch Target Spacing

- Minimum 8px between adjacent targets
- Prefer 16px+ for comfort
- Larger targets for primary actions

### Pointer Gestures

- Complex gestures must have single-pointer alternatives
- Drag operations need equivalent click actions
- Avoid hover-only functionality on touch devices

---

## Forms Accessibility

### Labels

Every input must have an associated label:

```text
<label for="email">Email Address</label>
<input type="email" id="email" name="email">

```

### Required Fields

```text
<!-- Announce to screen readers -->
<label for="name">
  Name <span aria-label="required">*</span>
</label>
<input type="text" id="name" required aria-required="true">

```

### Error Handling

```text
<label for="email">Email</label>
<input type="email" id="email" aria-invalid="true" aria-describedby="email-error">
<span id="email-error" role="alert">
  Please enter a valid email address
</span>

```

### Form Instructions

- Provide format hints before input
- Show password requirements before errors
- Group related fields with fieldset/legend

---

## Dynamic Content

### Live Regions

For content that updates dynamically:

```text
aria-live="polite" - Announce when convenient
aria-live="assertive" - Announce immediately (interrupts)
role="alert" - Urgent messages (like assertive)
role="status" - Status updates (like polite)

```

### Loading States

```text
<button aria-busy="true" aria-live="polite">
  <span class="spinner"></span>
  Loading...
</button>

```

### Modal Dialogs

- Focus moves into modal when opened
- Focus trapped within modal
- Escape key closes modal
- Focus returns to trigger element when closed

---

## Testing Accessibility

### Manual Testing Checklist

1. **Keyboard only:** Navigate entire page with Tab/Enter
2. **Screen reader:** Test with VoiceOver (Mac) or NVDA (Windows)
3. **Zoom 200%:** Content remains readable and usable
4. **High contrast:** Test with system high contrast mode
5. **No mouse:** Complete all tasks without pointing device

### Automated Tools

- axe DevTools (browser extension)
- WAVE (WebAIM browser extension)
- Lighthouse (Chrome DevTools)
- Color contrast checkers (WebAIM, Contrast Ratio)

### Common Issues to Check

- [ ] Missing or empty alt text
- [ ] Empty links or buttons
- [ ] Missing form labels
- [ ] Insufficient color contrast
- [ ] Missing language attribute
- [ ] Incorrect heading structure
- [ ] Missing skip navigation link
- [ ] Inaccessible custom widgets

---

## ARIA Quick Reference

### Roles

| Role | Purpose |
| ---- | ------- |
| `button` | Clickable button |
| `link` | Navigation link |
| `dialog` | Modal dialog |
| `alert` | Important message |
| `navigation` | Navigation region |
| `main` | Main content |
| `search` | Search functionality |
| `tab/tablist/tabpanel` | Tab interface |

### Properties

| Property | Purpose |
| -------- | ------- |
| `aria-label` | Accessible name |
| `aria-labelledby` | Reference to labeling element |
| `aria-describedby` | Reference to description |
| `aria-hidden` | Hide from assistive tech |
| `aria-expanded` | Expandable state |
| `aria-selected` | Selection state |
| `aria-disabled` | Disabled state |
| `aria-required` | Required field |
| `aria-invalid` | Invalid input |

### Golden Rule

**First rule of ARIA:** Don't use ARIA if native HTML works.

```text
✗ <div role="button" tabindex="0">Click</div>
✓ <button>Click</button>

```
