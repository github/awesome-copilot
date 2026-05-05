# Accessibility Reference

Web accessibility ensures content is usable by everyone, including people with disabilities.

## WCAG (Web Content Accessibility Guidelines)

### Levels
- **A**: Minimum level
- **AA**: Standard target (legal requirement in many jurisdictions)
- **AAA**: Enhanced accessibility

### Four Principles (POUR)

1. **Perceivable**: Information presented in ways users can perceive
2. **Operable**: UI components and navigation are operable
3. **Understandable**: Information and UI operation is understandable
4. **Robust**: Content works with current and future technologies

## ARIA (Accessible Rich Internet Applications)

### ARIA Roles

```html
<!-- Landmark roles -->
<nav role="navigation">
<main role="main">
<aside role="complementary">
<footer role="contentinfo">

<!-- Widget roles -->
<div role="button" tabindex="0">Click me</div>
<div role="tab" aria-selected="true">Tab 1</div>
<div role="dialog" aria-labelledby="dialogTitle">

<!-- Document structure -->
<div role="list">
  <div role="listitem">Item 1</div>
</div>
```

### ARIA Attributes

```html
<!-- States -->
<button aria-pressed="true">Toggle</button>
<input aria-invalid="true" aria-errormessage="error1">
<div aria-expanded="false" aria-controls="menu">Menu</div>

<!-- Properties -->
<img alt="" aria-hidden="true">
<input aria-label="Search" type="search">
<dialog aria-labelledby="title" aria-describedby="desc">
  <h2 id="title">Dialog Title</h2>
  <p id="desc">Description</p>
</dialog>

<!-- Relationships -->
<label id="label1" for="input1">Name:</label>
<input id="input1" aria-labelledby="label1">

<!-- Live regions -->
<div aria-live="polite" aria-atomic="true">
  Status updated
</div>
```

## Keyboard Navigation

### Tab Order

```html
<!-- Natural tab order -->
<button>First</button>
<button>Second</button>

<!-- Custom tab order (avoid if possible) -->
<button tabindex="1">First</button>
<button tabindex="2">Second</button>

<!-- Programmatically focusable  (not in tab order) -->
<div tabindex="-1">Not in tab order</div>

<!-- In tab order -->
<div tabindex="0" role="button">Custom button</div>
```

### Keyboard Events

```javascript
element.addEventListener('keydown', (e) => {
  switch(e.key) {
    case 'Enter':
    case ' ': // Space
      // Activate
      break;
    case 'Escape':
      // Close/cancel
      break;
    case 'ArrowUp':
    case 'ArrowDown':
    case 'ArrowLeft':
    case 'ArrowRight':
      // Navigate
      break;
  }
});
```

## Semantic HTML

```html
<!-- ✅ Good: semantic elements -->
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/">Home</a></li>
  </ul>
</nav>

<!-- ❌ Bad: non-semantic -->
<div class="nav">
  <div><a href="/">Home</a></div>
</div>

<!-- ✅ Good: proper headings hierarchy -->
<h1>Page Title</h1>
  <h2>Section</h2>
    <h3>Subsection</h3>

<!-- ❌ Bad: skipping levels -->
<h1>Page Title</h1>
  <h3>Skipped h2</h3>
```

## Forms Accessibility

```html
<form>
  <!-- Labels -->
  <label for="name">Name:</label>
  <input type="text" id="name" name="name" required aria-required="true">
  
  <!-- Error messages -->
  <input
    type="email"
    id="email"
    aria-invalid="true"
    aria-describedby="email-error">
  <span id="email-error" role="alert">
    Please enter a valid email
  </span>
  
  <!-- Fieldset for groups -->
  <fieldset>
    <legend>Choose an option</legend>
    <label>
      <input type="radio" name="option" value="a">
      Option A
    </label>
    <label>
      <input type="radio" name="option" value="b">
      Option B
    </label>
  </fieldset>
  
  <!-- Help text -->
  <label for="password">Password:</label>
  <input
    type="password"
    id="password"
    aria-describedby="password-help">
  <span id="password-help">
    Must be at least 8 characters
  </span>
</form>
```

## Images and Media

```html
<!-- Informative image -->
<img src="chart.png" alt="Sales increased 50% in Q1">

<!-- Decorative image -->
<img src="decorative.png" alt="" role="presentation">

<!-- Complex image -->
<figure>
  <img src="data-viz.png" alt="Sales data visualization">
  <figcaption>
    Detailed description of the data...
  </figcaption>
</figure>

<!-- Video with captions -->
<video controls>
  <source src="video.mp4" type="video/mp4">
  <track kind="captions" src="captions.vtt" srclang="en" label="English">
</video>
```

## Color and Contrast

### WCAG Requirements

- **Level AA**: 4.5:1 for normal text, 3:1 for large text
- **Level AAA**: 7:1 for normal text, 4.5:1 for large text

```css
/* ✅ Good contrast */
.text {
  color: #000; /* Black */
  background: #fff; /* White */
  /* Contrast: 21:1 */
}

/* Don't rely on color alone */
.error {
  color: red;
  /* ✅ Also use icon or text */
  &::before {
    content: '⚠ ';
  }
}
```

## Screen Readers

### Best Practices

```html
<!-- Skip links for navigation -->
<a href="#main-content" class="skip-link">
  Skip to main content
</a>

<!-- Accessible headings -->
<h1>Main heading (only one)</h1>

<!-- Descriptive links -->
<!-- ❌ Bad -->
<a href="/article">Read more</a>

<!-- ✅ Good -->
<a href="/article">Read more about accessibility</a>

<!-- Hidden content (screen reader only) -->
<span class="sr-only">
  Additional context for screen readers
</span>
```

```css
/* Screen reader only class */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

## Focus Management

```css
/* Visible focus indicator */
:focus {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}

/* Don't remove focus entirely */
/* ❌ Bad */
:focus {
  outline: none;
}

/* ✅ Good: custom focus style */
:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(0, 95, 204, 0.5);
}
```

```javascript
// Focus management in modal
function openModal() {
  modal.showModal();
  modal.querySelector('button').focus();
  
  // Trap focus
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      trapFocus(e, modal);
    }
  });
}
```

## Testing Tools

- **axe DevTools**: Browser extension
- **WAVE**: Web accessibility evaluation tool
- **NVDA**: Screen reader (Windows)
- **JAWS**: Screen reader (Windows)
- **VoiceOver**: Screen reader (macOS/iOS)
- **Lighthouse**: Automated audits

## Checklist

- [ ] Semantic HTML used
- [ ] All images have alt text
- [ ] Color contrast meets WCAG AA
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Forms have labels
- [ ] Heading hierarchy correct
- [ ] ARIA used appropriately
- [ ] Screen reader tested
- [ ] No keyboard traps

## Glossary Terms

**Key Terms Covered**:
- Accessibility
- Accessibility tree
- Accessible description
- Accessible name
- ARIA
- ATAG
- Boolean attribute (ARIA)
- Screen reader
- UAAG
- WAI
- WCAG

## Additional Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM](https://webaim.org/)
- [A11y Project](https://www.a11yproject.com/)
