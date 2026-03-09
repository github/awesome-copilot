---
name: html-coder
description: 'Expert HTML development skill for building web pages, forms, and interactive content. Use when creating HTML documents, structuring web content, implementing semantic markup, adding forms and media, working with HTML5 APIs, or needing HTML templates, best practices, and accessibility guidance. Supports modern HTML5 standards and responsive design patterns.'
collaborators:
  - make-skill-template
  - finalize-agent-prompt
---

# HTML Coder Skill

Expert skill for professional HTML development with focus on semantic markup, accessibility, HTML5 features, and standards-compliant web content.

## When to Use This Skill

- Creating HTML documents with semantic structure
- Building accessible forms with HTML5 validation
- Implementing responsive markup and multimedia
- Using HTML5 APIs (Canvas, SVG, Storage, Geolocation)
- Troubleshooting validation or accessibility issues

## Core Capabilities

- **Semantic HTML**: Document structure, content sections, accessibility-first markup
- **Forms**: All input types, validation attributes, fieldsets, labels
- **Media**: Responsive images, audio/video, Canvas, SVG
- **HTML5 APIs**: Web Storage, Geolocation, Drag & Drop, Web Workers
- **Accessibility**: ARIA, screen reader support, WCAG compliance

## Essential References

Core documentation for HTML experts:

- [`references/add-css-style.md`](references/add-css-style.md) - Add CSS via `link` tag, inline, or embedded in html
- [`references/add-javascript.md`](references/add-javascript.md) - Add JavaScript via `script src="link.js"` tag, inline `script`, or embedded in html
- [`references/attributes.md`](references/attributes.md) - HTML attribute essentials
- [`references/essentials.md`](references/essentials.md) - Semantic markup, validation, responsive techniques
- [`references/global-attributes.md`](references/global-attributes.md) - Complete global attribute information
- [`references/glossary.md`](references/glossary.md) - Complete HTML element and attribute reference
- [`references/standards.md`](references/standards.md) - HTML5 specifications and standards

## Best Practices

**Semantic HTML** - Use elements that convey meaning: `<article>`, `<nav>`, `<header>`, `<section>`, `<footer>`, not div soup.

**Accessibility First** - Proper heading hierarchy, alt text, labels with inputs, keyboard navigation, ARIA when needed.

**HTML5 Validation** - Leverage built-in validation (`required`, `pattern`, `type="email"`) before JavaScript.

**Responsive Images** - Use `<picture>`, srcset, and `loading="lazy"` for performance.

**Performance** - Minimize DOM depth, optimize images, defer non-critical scripts, use semantic elements.

## Quick Patterns

### Semantic Page Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title</title>
</head>
<body>
  <header><nav><!-- Navigation --></nav></header>
  <main><article><!-- Content --></article></main>
  <aside><!-- Sidebar --></aside>
  <footer><!-- Footer --></footer>
</body>
</html>
```

### Accessible Form
```html
<form method="post" action="/submit">
  <fieldset>
    <legend>Contact</legend>
    <label for="email">Email:</label>
    <input type="email" id="email" name="email" required
           pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$">
    <button type="submit">Send</button>
  </fieldset>
</form>
```

### Responsive Image
```html
<picture>
  <source media="(min-width: 1200px)" srcset="large.webp">
  <source media="(min-width: 768px)" srcset="medium.webp">
  <img src="small.jpg" alt="Description" loading="lazy">
</picture>
```

## Troubleshooting

- **Validation**: W3C Validator (validator.w3.org), check unclosed tags, verify nesting
- **Accessibility**: Lighthouse audit, screen reader testing, keyboard nav, color contrast
- **Compatibility**: Can I Use (caniuse.com), feature detection, provide fallbacks

## Key Standards

- **WHATWG HTML Living Standard**: https://html.spec.whatwg.org/
- **WCAG Accessibility**: https://www.w3.org/WAI/WCAG21/quickref/
- **MDN Web Docs**: https://developer.mozilla.org/en-US/docs/Web/HTML

---
