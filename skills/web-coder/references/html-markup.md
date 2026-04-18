# HTML & Markup Reference

Comprehensive reference for HTML5, markup languages, and document structure.

## Core Concepts

### HTML (HyperText Markup Language)
The standard markup language for creating web pages and web applications.

**Related Terms**: HTML5, XHTML, Markup, Semantic HTML

### Elements
Building blocks of HTML documents. Each element has opening/closing tags (except void elements).

**Common Elements**:
- `<div>` - Generic container
- `<span>` - Inline container
- `<article>` - Self-contained content
- `<section>` - Thematic grouping
- `<nav>` - Navigation links
- `<header>` - Introductory content
- `<footer>` - Footer content
- `<main>` - Main content
- `<aside>` - Complementary content

### Attributes
Properties that provide additional information about HTML elements.

**Common Attributes**:
- `id` - Unique identifier
- `class` - CSS class name(s)
- `src` - Source URL for images/scripts
- `href` - Hyperlink reference
- `alt` - Alternative text
- `title` - Advisory title
- `data-*` - Custom data attributes
- `aria-*` - Accessibility attributes

### Void Elements
Elements that cannot have content and don't have closing tags.

**Examples**: `<img>`, `<br>`, `<hr>`, `<input>`, `<meta>`, `<link>`

## Semantic HTML

### What is Semantic HTML?
HTML that clearly describes its meaning to both the browser and the developer.

**Benefits**:
- Improved accessibility
- Better SEO
- Easier maintenance
- Built-in meaning and structure

### Semantic Elements

| Element | Purpose | When to Use |
|---------|---------|-------------|
| `<article>` | Self-contained composition | Blog posts, news articles |
| `<section>` | Thematic grouping of content | Chapters, tabbed content |
| `<nav>` | Navigation links | Main menu, breadcrumbs |
| `<aside>` | Tangential content | Sidebars, related links |
| `<header>` | Introductory content | Page/section headers |
| `<footer>` | Footer content | Copyright, contact info |
| `<main>` | Main content | Primary page content |
| `<figure>` | Self-contained content | Images with captions |
| `<figcaption>` | Caption for figure | Image descriptions |
| `<time>` | Date/time | Publishing dates |
| `<mark>` | Highlighted text | Search results |
| `<details>` | Expandable details | Accordions, FAQs |
| `<summary>` | Summary for details | Accordion headers |

### Example: Semantic Document Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Semantic Page Example</title>
</head>
<body>
  <header>
    <h1>Site Title</h1>
    <nav aria-label="Main navigation">
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/about">About</a></li>
      </ul>
    </nav>
  </header>
  
  <main>
    <article>
      <header>
        <h2>Article Title</h2>
        <time datetime="2026-03-04">March 4, 2026</time>
      </header>
      <p>Article content goes here...</p>
      <footer>
        <p>Author: John Doe</p>
      </footer>
    </article>
  </main>
  
  <aside>
    <h3>Related Content</h3>
    <ul>
      <li><a href="/related">Related Article</a></li>
    </ul>
  </aside>
  
  <footer>
    <p>&copy; 2026 Company Name</p>
  </footer>
</body>
</html>
```

## Document Structure

### Doctype
Declares the document type and HTML version.

```html
<!DOCTYPE html>
```

### Head Section
Contains metadata about the document.

**Common Elements**:
- `<meta>` - Metadata (charset, viewport, description)
- `<title>` - Page title (shown in browser tab)
- `<link>` - External resources (stylesheets, icons)
- `<script>` - JavaScript files
- `<style>` - Inline CSS

### Metadata Examples

```html
<head>
  <!-- Character encoding -->
  <meta charset="UTF-8">
  
  <!-- Responsive viewport -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- SEO metadata -->
  <meta name="description" content="Page description for search engines">
  <meta name="keywords" content="html, web, development">
  <meta name="author" content="Author Name">
  
  <!-- Open Graph (social media) -->
  <meta property="og:title" content="Page Title">
  <meta property="og:description" content="Page description">
  <meta property="og:image" content="https://example.com/image.jpg">
  
  <!-- Favicon -->
  <link rel="icon" type="image/png" href="/favicon.png">
  
  <!-- Stylesheet -->
  <link rel="stylesheet" href="styles.css">
  
  <!-- Preload critical resources -->
  <link rel="preload" href="critical.css" as="style">
  <link rel="preconnect" href="https://api.example.com">
</head>
```

## Forms and Input

### Form Elements

```html
<form action="/submit" method="POST">
  <!-- Text input -->
  <label for="name">Name:</label>
  <input type="text" id="name" name="name" required>
  
  <!-- Email input -->
  <label for="email">Email:</label>
  <input type="email" id="email" name="email" required>
  
  <!-- Password input -->
  <label for="password">Password:</label>
  <input type="password" id="password" name="password" minlength="8" required>
  
  <!-- Select dropdown -->
  <label for="country">Country:</label>
  <select id="country" name="country">
    <option value="">Select...</option>
    <option value="us">United States</option>
    <option value="uk">United Kingdom</option>
  </select>
  
  <!-- Textarea -->
  <label for="message">Message:</label>
  <textarea id="message" name="message" rows="4"></textarea>
  
  <!-- Checkbox -->
  <label>
    <input type="checkbox" name="terms" required>
    I agree to the terms
  </label>
  
  <!-- Radio buttons -->
  <fieldset>
    <legend>Choose an option:</legend>
    <label>
      <input type="radio" name="option" value="a">
      Option A
    </label>
    <label>
      <input type="radio" name="option" value="b">
      Option B
    </label>
  </fieldset>
  
  <!-- Submit button -->
  <button type="submit">Submit</button>
</form>
```

### Input Types

| Type | Purpose | Example |
|------|---------|---------|
| `text` | Single-line text | `<input type="text">` |
| `email` | Email address | `<input type="email">` |
| `password` | Password field | `<input type="password">` |
| `number` | Numeric input | `<input type="number" min="0" max="100">` |
| `tel` | Telephone number | `<input type="tel">` |
| `url` | URL | `<input type="url">` |
| `date` | Date picker | `<input type="date">` |
| `time` | Time picker | `<input type="time">` |
| `file` | File upload | `<input type="file" accept="image/*">` |
| `checkbox` | Checkbox | `<input type="checkbox">` |
| `radio` | Radio button | `<input type="radio">` |
| `range` | Slider | `<input type="range" min="0" max="100">` |
| `color` | Color picker | `<input type="color">` |
| `search` | Search field | `<input type="search">` |

## Related Markup Languages

### XML (Extensible Markup Language)
A markup language for encoding documents in a format that is both human-readable and machine-readable.

**Key Differences from HTML**:
- All tags must be properly closed
- Tags are case-sensitive
- Attributes must be quoted
- Custom tag names allowed

### XHTML (Extensible HyperText Markup Language)
HTML reformulated as XML. Stricter syntax rules than HTML.

### MathML (Mathematical Markup Language)
Markup language for displaying mathematical notation on the web.

```html
<math>
  <mrow>
    <msup>
      <mi>x</mi>
      <mn>2</mn>
    </msup>
    <mo>+</mo>
    <mn>1</mn>
  </mrow>
</math>
```

### SVG (Scalable Vector Graphics)
XML-based markup language for describing two-dimensional vector graphics.

```html
<svg width="100" height="100">
  <circle cx="50" cy="50" r="40" fill="blue" />
</svg>
```

## Character Encoding and References

### Character Encoding
Defines how characters are represented as bytes.

**UTF-8**: Universal character encoding standard (recommended)

```html
<meta charset="UTF-8">
```

### Character References
Ways to represent special characters in HTML.

**Named Entities**:
- `&lt;` - Less than (<)
- `&gt;` - Greater than (>)
- `&amp;` - Ampersand (&)
- `&quot;` - Quote (")
- `&apos;` - Apostrophe (')
- `&nbsp;` - Non-breaking space
- `&copy;` - Copyright (©)

**Numeric Entities**:
- `&#60;` - Less than (<)
- `&#169;` - Copyright (©)
- `&#8364;` - Euro (€)

## Block vs Inline Content

### Block-Level Content
Elements that create a "block" in the layout, starting on a new line.

**Examples**: `<div>`, `<p>`, `<h1>`-`<h6>`, `<article>`, `<section>`, `<header>`, `<footer>`, `<nav>`, `<aside>`, `<ul>`, `<ol>`, `<li>`

### Inline-Level Content
Elements that don't start on a new line and only take up as much width as necessary.

**Examples**: `<span>`, `<a>`, `<strong>`, `<em>`, `<img>`, `<code>`, `<abbr>`, `<cite>`

## Best Practices

### Do's
- ✅ Use semantic HTML elements
- ✅ Include proper document structure (DOCTYPE, html, head, body)
- ✅ Set character encoding to UTF-8
- ✅ Use descriptive `alt` attributes for images
- ✅ Associate labels with form inputs
- ✅ Use heading hierarchy properly (h1 → h2 → h3)
- ✅ Validate HTML with W3C validator
- ✅ Use proper ARIA roles when needed
- ✅ Include meta viewport for responsive design

### Don'ts
- ❌ Use `<div>` when a semantic element exists
- ❌ Skip heading levels (h1 → h3)
- ❌ Use tables for layout
- ❌ Forget to close tags (except void elements)
- ❌ Use inline styles extensively
- ❌ Omit `alt` attribute on images
- ❌ Create forms without labels
- ❌ Use deprecated elements (`<font>`, `<center>`, `<blink>`)

## Glossary Terms from MDN

**Key Terms Covered**:
- Abstraction
- Accessibility tree
- Accessible description
- Accessible name
- Attribute
- Block-level content
- Breadcrumb
- Browsing context
- Character
- Character encoding
- Character reference
- Character set
- Doctype
- Document environment
- Element
- Entity
- Head
- HTML
- HTML5
- Hyperlink
- Hypertext
- Inline-level content
- Markup
- MathML
- Metadata
- Semantics
- SVG
- Tag
- Void element
- XHTML
- XML

## Additional Resources

- [MDN HTML Reference](https://developer.mozilla.org/en-US/docs/Web/HTML)
- [W3C HTML Specification](https://html.spec.whatwg.org/)
- [HTML5 Doctor](http://html5doctor.com/)
- [W3C Markup Validation Service](https://validator.w3.org/)
