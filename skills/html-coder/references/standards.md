# HTML Standards and Best Practices

Guidelines for writing valid, standards-compliant HTML based on the WHATWG HTML Living Standard and W3C specifications.

## HTML Standard Bodies

### WHATWG (Web Hypertext Application Technology Working Group)

**HTML Living Standard**: The primary, continuously-updated HTML specification.
- URL: https://html.spec.whatwg.org/
- Single, evolving document
- Adopted by all major browsers
- Authoritative source for HTML

### W3C (World Wide Web Consortium)

**W3C HTML**: Previously maintained HTML5, now defers to WHATWG
- Historical specifications (HTML 4.01, XHTML 1.0)
- Accessibility guidelines (WCAG)
- Related standards (CSS, SVG)

## Document Structure Requirements

### Minimal Valid HTML Document

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Page Title</title>
</head>
<body>
  <!-- Content -->
</body>
</html>
```

### Required Elements

1. **`<!DOCTYPE html>`**: Document type declaration (must be first)
2. **`<html>`**: Root element
3. **`<head>`**: Document metadata container
4. **`<title>`**: Document title (required in `<head>`)
5. **`<body>`**: Document content container

### Recommended Elements

1. **`<meta charset="UTF-8">`**: Character encoding (must be in first 1024 bytes)
2. **`lang` attribute on `<html>`**: Primary language (e.g., `lang="en"`)
3. **`<meta name="viewport">`**: Responsive design viewport settings

## Syntax Rules

### Element Syntax

**Start and end tags**:
```html
<p>Paragraph content</p>
```

**Void elements** (no closing tag):
```html
<img src="image.jpg" alt="Description">
<br>
<hr>
<input type="text">
<link rel="stylesheet" href="style.css">
<meta charset="UTF-8">
```

**Optional closing tags** (HTML allows omission in certain contexts, but not recommended):
- `</li>`, `</p>`, `</td>`, etc.

### Attribute Syntax

**With values**:
```html
<input type="text" name="username">
```

**Boolean attributes** (presence means true):
```html
<input type="checkbox" checked>
<input type="text" disabled>
<script src="script.js" defer></script>
```

**Quotes**: Optional for simple values, required for values with spaces or special characters
```html
<!-- Both valid, but quotes preferred -->
<div class="container"></div>
<div class=container></div>
```

### Case Sensitivity

HTML is **case-insensitive** for:
- Element names: `<DIV>` = `<div>`
- Attribute names: `CLASS` = `class`

But **case-sensitive** for:
- Attribute values (most): `class="MyClass"` ≠ `class="myclass"`
- IDs and classes in CSS/JavaScript

**Best practice**: Use lowercase for elements and attributes.

## Content Models

### Content Categories

Elements belong to one or more categories that determine where they can be used:

1. **Metadata content**: `<link>`, `<meta>`, `<style>`, `<title>`, `<script>`
2. **Flow content**: Most body elements (`<div>`, `<p>`, `<ul>`, etc.)
3. **Sectioning content**: `<article>`, `<aside>`, `<nav>`, `<section>`
4. **Heading content**: `<h1>` to `<h6>`, `<hgroup>`
5. **Phrasing content**: Text-level elements (`<span>`, `<a>`, `<strong>`, etc.)
6. **Embedded content**: `<img>`, `<video>`, `<audio>`, `<iframe>`, `<svg>`
7. **Interactive content**: `<a>`, `<button>`, `<input>`, `<select>`, `<textarea>`

### Nesting Rules

**Valid nesting**:
```html
<div><p>Text</p></div>
<ul><li>Item</li></ul>
<p><strong>Bold text</strong></p>
```

**Invalid nesting**:
```html
<!-- Inline element containing block element -->
<span><div>Invalid</div></span>

<!-- Paragraphs cannot contain other paragraphs -->
<p><p>Invalid</p></p>

<!-- Links cannot contain interactive content -->
<a href="#"><button>Invalid</button></a>

<!-- List items must be direct children -->
<ul><div><li>Invalid</li></div></ul>
```

## Semantic HTML

### Principle: Use Elements for Meaning, Not Appearance

**Bad** (presentational):
```html
<div class="heading">Section Title</div>
<div onclick="doSomething()">Click me</div>
<div class="bold">Important text</div>
```

**Good** (semantic):
```html
<h2>Section Title</h2>
<button onclick="doSomething()">Click me</button>
<strong>Important text</strong>
```

### Semantic Element Usage

| Purpose | Use | Don't Use |
|---------|-----|-----------|
| Page header | `<header>` | `<div class="header">` |
| Navigation | `<nav>` | `<div id="nav">` |
| Main content | `<main>` | `<div id="main">` |
| Article/post | `<article>` | `<div class="post">` |
| Sidebar | `<aside>` | `<div class="sidebar">` |
| Page footer | `<footer>` | `<div class="footer">` |
| Buttons | `<button>` | `<div class="button">` |

### Document Outline

Create logical document structure with headings:

```html
<h1>Site Title</h1>
  <h2>Section 1</h2>
    <h3>Subsection 1.1</h3>
    <h3>Subsection 1.2</h3>
  <h2>Section 2</h2>
    <h3>Subsection 2.1</h3>
```

**Rules**:
- One `<h1>` per page (usually)
- Don't skip heading levels
- Use headings for structure, not styling

## Validation Standards

### Character Encoding

**Always specify UTF-8**:
```html
<meta charset="UTF-8">
```

Must appear:
- Within first 1024 bytes of document
- Before any content that uses non-ASCII characters

### Required Attributes

Certain attributes are required for validity:

| Element | Required Attributes |
|---------|-------------------|
| `<img>` | `src`, `alt` |
| `<a>` (if href present) | `href` |
| `<input>` (for forms) | `name` (except submit/button) |
| `<label>` | `for` or contains input |
| `<optgroup>` | `label` |
| `<map>` | `name` |
| `<area>` | `alt` (for image maps) |

### Attribute Values

**Valid attribute characters**: Letters, digits, hyphens, periods, underscores, colons
**ID restrictions**: 
- Must be unique within document
- Cannot contain spaces
- For CSS selector convenience, prefer starting with a letter; IDs starting with digits may require escaping in some selectors

**Class names**:
- Can have multiple (space-separated)
- Case-sensitive in CSS
- Should be descriptive, not presentational

## Accessibility Requirements

### ARIA (Accessible Rich Internet Applications)

Override or enhance semantic meaning when needed:

```html
<div role="button" tabindex="0" aria-pressed="false">
  Toggle Button
</div>
```

**Rules**:
- Use semantic HTML first (button is better than div with role="button")
- All interactive elements must be keyboard accessible
- Provide text alternatives for non-text content
- Ensure sufficient color contrast

### Alt Text

**Required for images**:
```html
<!-- Informative image -->
<img src="chart.png" alt="Sales increased 40% in Q4 2024">

<!-- Decorative image -->
<img src="decorative.png" alt="">

<!-- Functional image (link/button) -->
<a href="home.html"><img src="logo.png" alt="Home"></a>
```

### Form Accessibility

**Always label inputs**:
```html
<label for="email">Email:</label>
<input type="email" id="email" name="email">
```

**Group related inputs**:
```html
<fieldset>
  <legend>Shipping Address</legend>
  <!-- Address fields -->
</fieldset>
```

## Performance Standards

### Critical Rendering Path

Optimize document loading:

1. **Place CSS in `<head>`**:
```html
<link rel="stylesheet" href="style.css">
```

2. **Place scripts at end of `<body>` or use `defer`**:
```html
<script src="script.js" defer></script>
```

3. **Inline critical CSS** (optional, for above-the-fold content)

### Resource Hints

Improve loading performance:

```html
<!-- Preconnect to external domains -->
<link rel="preconnect" href="https://cdn.example.com">

<!-- Prefetch likely next page -->
<link rel="prefetch" href="next-page.html">

<!-- Preload critical resources -->
<link rel="preload" href="font.woff2" as="font" crossorigin>
```

### Image Optimization

**Responsive images**:
```html
<img src="image-800w.jpg"
     srcset="image-400w.jpg 400w,
             image-800w.jpg 800w,
             image-1200w.jpg 1200w"
     sizes="(max-width: 600px) 400px,
            (max-width: 1000px) 800px,
            1200px"
     alt="Description">
```

**Modern image formats**:
```html
<picture>
  <source srcset="image.webp" type="image/webp">
  <source srcset="image.jpg" type="image/jpeg">
  <img src="image.jpg" alt="Description">
</picture>
```

## Security Standards

### Content Security Policy

Prevent XSS attacks:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' https://trusted.cdn.com">
```

### Subresource Integrity (SRI)

Verify external resources:

```html
<script src="https://cdn.example.com/lib.js"
        integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
        crossorigin="anonymous"></script>
```

### Referrer Policy

Control referrer information:

```html
<meta name="referrer" content="strict-origin-when-cross-origin">
```

## HTML5 Features

### New Semantic Elements

HTML5 introduced elements for better document structure:
- `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`
- `<article>`, `<section>`
- `<figure>`, `<figcaption>`
- `<mark>`, `<time>`, `<progress>`, `<meter>`

### New Form Types

Enhanced form inputs:
- `email`, `url`, `tel`, `number`, `range`, `date`, `color`
- Form validation attributes: `required`, `pattern`, `min`, `max`

### Multimedia Elements

Native audio and video:
```html
<video controls width="640" height="360">
  <source src="video.mp4" type="video/mp4">
  <source src="video.webm" type="video/webm">
  Your browser doesn't support video.
</video>
```

### APIs

HTML5 includes JavaScript APIs:
- Canvas, SVG
- Geolocation
- Web Storage (localStorage, sessionStorage)
- Web Workers
- WebSockets

## Deprecated Elements and Attributes

### Don't Use These Elements

| Element | Why Deprecated | Use Instead |
|---------|---------------|-------------|
| `<font>` | Presentational | CSS `font-family`, `color` |
| `<center>` | Presentational | CSS `text-align: center` |
| `<big>`, `<small>` (for styling) | Presentational | CSS `font-size` |
| `<frame>`, `<frameset>` | Accessibility, usability | Modern layout techniques |
| `<marquee>` | Poor UX | CSS animations |
| `<blink>` | Poor UX | CSS animations |

### Don't Use These Attributes

| Attribute | Use Instead |
|-----------|-------------|
| `align`, `valign` | CSS `text-align`, `vertical-align` |
| `bgcolor` | CSS `background-color` |
| `border` (except on tables) | CSS `border` |
| `width`, `height` (except media) | CSS dimensions |

## Validation Tools

### Online Validators

1. **W3C Markup Validation Service**: https://validator.w3.org/
2. **Nu Html Checker**: https://validator.w3.org/nu/
3. **HTML5 Outliner**: View document structure

### Browser DevTools

All major browsers include HTML inspection and validation:
- Chrome/Edge DevTools
- Firefox Developer Tools
- Safari Web Inspector

### Automated Testing

**Linters and checkers**:
- HTMLHint
- HTML-validate
- Lighthouse (Chrome DevTools)

## Best Practices Summary

1. ✅ **Use semantic HTML**: Choose elements by meaning, not appearance
2. ✅ **Validate your HTML**: Use W3C validator regularly
3. ✅ **Ensure accessibility**: WCAG 2.1 AA minimum compliance
4. ✅ **Specify language**: Add `lang` attribute to `<html>`
5. ✅ **Use UTF-8 encoding**: Always include `<meta charset="UTF-8">`
6. ✅ **Include viewport meta**: For responsive design
7. ✅ **Provide alt text**: For all images (empty string if decorative)
8. ✅ **Label form inputs**: Every input needs associated label
9. ✅ **Use lowercase**: For elements and attributes
10. ✅ **Close all elements**: Even though some closings are optional
11. ✅ **Indent properly**: For readability and maintainability
12. ✅ **Separate concerns**: HTML for structure, CSS for presentation, JS for behavior
13. ✅ **Optimize performance**: Proper resource loading order
14. ✅ **Test cross-browser**: Check major browsers and devices
15. ✅ **Avoid inline styles**: Use external CSS files

## Common Mistakes to Avoid

1. ❌ Missing `<!DOCTYPE html>`
2. ❌ Missing `<title>` element
3. ❌ Missing character encoding declaration
4. ❌ Using divs for everything (non-semantic HTML)
5. ❌ Missing alt attributes on images
6. ❌ Using deprecated elements (font, center, etc.)
7. ❌ Incorrect nesting (inline containing block elements)
8. ❌ Missing or incorrect form labels
9. ❌ Not closing elements properly
10. ❌ Mixing HTML and CSS (inline styles everywhere)
11. ❌ Using tables for layout (use CSS Grid/Flexbox)
12. ❌ Missing heading hierarchy (skipping levels)
13. ❌ Too many or too few headings
14. ❌ Not validating HTML
15. ❌ Ignoring accessibility

## HTML Conformance Checkers

**Document conformance** means:
- Follows HTML syntax rules
- Elements used correctly per content model
- Required attributes present
- No deprecated features
- Accessibility requirements met

**Check with**:
```bash
# Command-line validator
npm install -g html-validate
html-validate index.html
```

## Resources

- **WHATWG HTML Living Standard**: https://html.spec.whatwg.org/
- **MDN Web Docs HTML**: https://developer.mozilla.org/en-US/docs/Web/HTML
- **W3C HTML Validator**: https://validator.w3.org/
- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **Can I Use**: https://caniuse.com/ (browser support)
- **HTML5 Doctor**: http://html5doctor.com/ (element usage guide)
