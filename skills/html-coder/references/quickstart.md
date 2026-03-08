# HTML Quickstart Cheatsheet

A quick reference guide for HTML syntax and common element patterns. Use semantic HTML tags for their meaning, not their appearance - styling should be handled with CSS.

## Inline Elements

Inline elements appear side-by-side horizontally and only take up as much width as needed. They fit together like words in a sentence.

| Purpose | Element | Example |
|---------|---------|---------|
| **Link** | `<a>` | `<a href="https://example.com">Link text</a>` |
| **Image** | `<img>` | `<img src="photo.jpg" alt="Description" width="250" />` |
| **Inline container** | `<span>` | `<span class="highlight">grouped text</span>` |
| **Emphasized text** | `<em>` | `<em>Emphasized text</em>` (semantic emphasis) |
| **Italic text** | `<i>` | `<i>Italic styling</i>` (visual only) |
| **Strong importance** | `<strong>` | `<strong>Important text</strong>` (semantic) |
| **Bold text** | `<b>` | `<b>Bold styling</b>` (visual only) |
| **Highlighted text** | `<mark>` | `<mark>Highlighted content</mark>` |
| **Strikethrough** | `<s>` | `<s>Struck through text</s>` |
| **Subscript** | `<sub>` | `H<sub>2</sub>O` |
| **Superscript** | `<sup>` | `x<sup>2</sup>` |
| **Small text** | `<small>` | `<small>Fine print</small>` |
| **Code** | `<code>` | `<code>console.log()</code>` |
| **Inline quote** | `<q>` | `<q>Short quote</q>` (adds quotes automatically) |
| **Citation** | `<cite>` | `<cite>Book Title</cite>` |
| **Address** | `<address>` | `<address>123 Main St</address>` |
| **Time/Date** | `<time>` | `<time datetime="2026-03-08">March 8, 2026</time>` |
| **Line break** | `<br>` | `Line 1<br>Line 2` |
| **Word break opportunity** | `<wbr>` | `Long<wbr>word<wbr>here` |
| **Audio** | `<audio>` | `<audio controls><source src="file.mp3"></audio>` |
| **Video** | `<video>` | `<video controls src="file.mp4"></video>` |

### Semantic vs Visual Elements

**Use semantic elements when the meaning matters:**
- `<em>` for emphasis (screen readers will stress it)
- `<strong>` for importance
- `<code>` for code snippets
- `<cite>` for titles of works

**Use visual elements for pure styling:**
- `<i>` for italic styling without semantic meaning
- `<b>` for bold styling without semantic importance

## Block Elements

Block elements take up the full width of their container and stack vertically like paragraphs or building blocks.

| Purpose | Element | Example |
|---------|---------|---------|
| **Paragraph** | `<p>` | `<p>Paragraph text</p>` |
| **Headings** | `<h1>`-`<h6>` | `<h1>Main Title</h1>` through `<h6>` |
| **Horizontal rule** | `<hr>` | `<hr>` (creates dividing line) |
| **Block quote** | `<blockquote>` | `<blockquote>Long quoted text</blockquote>` |
| **Unordered list** | `<ul>` + `<li>` | `<ul><li>Item</li><li>Item</li></ul>` |
| **Ordered list** | `<ol>` + `<li>` | `<ol><li>First</li><li>Second</li></ol>` |
| **Definition list** | `<dl>`, `<dt>`, `<dd>` | `<dl><dt>Term</dt><dd>Definition</dd></dl>` |
| **Collapsible details** | `<details>` + `<summary>` | `<details><summary>Title</summary>Content</details>` |

### Heading Hierarchy

Always maintain proper heading structure:

```html
<h1>Page Title</h1>
  <h2>Section</h2>
    <h3>Subsection</h3>
    <h3>Another Subsection</h3>
  <h2>Another Section</h2>
```

**Rules:**
- Use only one `<h1>` per page
- Don't skip levels (h1 → h3)
- Headings represent document structure, not font size

### List Types

**Unordered (bulleted)** - Order doesn't matter:
```html
<ul>
  <li>Apples</li>
  <li>Oranges</li>
  <li>Bananas</li>
</ul>
```

**Ordered (numbered)** - Order is significant:
```html
<ol>
  <li>Mix ingredients</li>
  <li>Bake at 350°F</li>
  <li>Cool before serving</li>
</ol>
```

**Definition list** - Term and definition pairs:
```html
<dl>
  <dt>HTML</dt>
  <dd>HyperText Markup Language</dd>
  <dt>CSS</dt>
  <dd>Cascading Style Sheets</dd>
</dl>
```

## Common Patterns

### Link Patterns

```html
<!-- External link -->
<a href="https://example.com">External Site</a>

<!-- Internal link -->
<a href="/about.html">About Page</a>

<!-- Email link -->
<a href="mailto:email@example.com">Email Us</a>

<!-- Phone link -->
<a href="tel:+1234567890">Call Us</a>

<!-- Download link -->
<a href="document.pdf" download>Download PDF</a>

<!-- Open in new tab -->
<a href="https://example.com" target="_blank" rel="noopener">New Tab</a>
```

### Image Patterns

```html
<!-- Basic image -->
<img src="photo.jpg" alt="Description">

<!-- Image with dimensions -->
<img src="photo.jpg" alt="Description" width="300" height="200">

<!-- Lazy loading -->
<img src="photo.jpg" alt="Description" loading="lazy">

<!-- Responsive image -->
<picture>
  <source media="(min-width: 800px)" srcset="large.jpg">
  <source media="(min-width: 400px)" srcset="medium.jpg">
  <img src="small.jpg" alt="Description">
</picture>
```

### Multimedia

```html
<!-- Audio player -->
<audio controls>
  <source src="audio.mp3" type="audio/mpeg">
  <source src="audio.ogg" type="audio/ogg">
  Your browser doesn't support audio.
</audio>

<!-- Video player -->
<video controls width="640" height="360">
  <source src="video.mp4" type="video/mp4">
  <source src="video.webm" type="video/webm">
  Your browser doesn't support video.
</video>
```

## Document Structure Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Page description">
  <title>Page Title</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>
    <h1>Site Title</h1>
    <nav>
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/about">About</a></li>
      </ul>
    </nav>
  </header>
  
  <main>
    <article>
      <h2>Article Title</h2>
      <p>Content here...</p>
    </article>
  </main>
  
  <aside>
    <h3>Sidebar</h3>
  </aside>
  
  <footer>
    <p>&copy; 2026 Company Name</p>
  </footer>
  
  <script src="script.js"></script>
</body>
</html>
```

## Accessibility Quick Tips

1. **Always include `alt` text** for images
2. **Use semantic elements** (`<nav>`, `<article>`, `<aside>`)
3. **Maintain heading hierarchy** (h1 → h2 → h3)
4. **Label form inputs** with `<label for="id">`
5. **Use `<button>` for buttons**, not `<div>` or `<a>`
6. **Provide text alternatives** for non-text content
7. **Ensure sufficient color contrast**
8. **Make interactive elements keyboard accessible**

## Common Attributes

### Global Attributes (work on all elements)

- `id="unique-id"` - Unique identifier
- `class="class-name"` - CSS class name(s)
- `style="color: red;"` - Inline styles (avoid when possible)
- `title="Tooltip text"` - Tooltip on hover
- `lang="en"` - Language of content
- `hidden` - Hide element
- `data-*="value"` - Custom data attributes
- `aria-*="value"` - Accessibility attributes

### Common Element-Specific Attributes

**Links (`<a>`)**:
- `href` - Destination URL
- `target` - Where to open link (_blank, _self)
- `rel` - Relationship (noopener, nofollow, etc.)

**Images (`<img>`)**:
- `src` - Image source path
- `alt` - Alternative text (required!)
- `width`, `height` - Dimensions
- `loading` - lazy, eager

**Forms**:
- `action` - Form submission URL
- `method` - HTTP method (get, post)
- `name` - Field name
- `value` - Field value
- `required` - Field is required
- `placeholder` - Hint text

## Quick Reference

**Empty/void elements** (no closing tag needed):
`<img>`, `<br>`, `<hr>`, `<input>`, `<meta>`, `<link>`

**Always lowercase** tag names and attributes (best practice)

**Quote attribute values**: `<a href="link">` not `<a href=link>`

**Nest properly**: If you open A then B, close B before A

**Comments**: `<!-- This is a comment -->`

## Resources

- [MDN HTML Cheatsheet](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Cheatsheet)
- [MDN HTML Elements Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements)
