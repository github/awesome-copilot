# Getting Started with HTML

This guide introduces HTML fundamentals and helps you create your first web pages.

## What is HTML?

HTML (HyperText Markup Language) is a markup language that uses elements to structure and define content on web pages. Elements consist of tags that wrap content to control how it displays and behaves.

**Basic concept**: Unstructured text appears on one line. Adding HTML elements like `<p>` for paragraphs and `<ul>`/`<li>` for lists structures content appropriately.

## Document Structure

Every HTML document follows this basic structure:

```html
<!DOCTYPE html>
<html lang="en-US">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>My Page Title</title>
  </head>
  <body>
    <!-- Your content here -->
  </body>
</html>
```

### Key Components

- **`<!DOCTYPE html>`** - Required declaration that ensures browsers display the page correctly
- **`<html>`** - Root element that wraps all content; includes `lang` attribute for language
- **`<head>`** - Container for metadata (not visible on page): keywords, descriptions, CSS links, character sets
- **`<meta charset="utf-8">`** - Sets character encoding to UTF-8 for international text support
- **`<meta name="viewport">`** - Ensures responsive display on mobile devices
- **`<title>`** - Page title shown in browser tab and bookmarks
- **`<body>`** - Contains all visible content displayed to users

## Essential HTML Elements

### Headings

Six heading levels organize content hierarchy:

```html
<h1>Main Title</h1>
<h2>Section Heading</h2>
<h3>Subsection</h3>
<h4>Sub-subsection</h4>
```

Use `<h1>` for main titles, `<h2>`-`<h6>` for nested subsections. Don't skip levels.

### Paragraphs

Wrap text in paragraph tags:

```html
<p>This is a paragraph of text.</p>
<p>This is another paragraph.</p>
```

### Lists

**Unordered lists** (bullets) for items where order doesn't matter:

```html
<ul>
  <li>First item</li>
  <li>Second item</li>
  <li>Third item</li>
</ul>
```

**Ordered lists** (numbered) for sequential items:

```html
<ol>
  <li>Step one</li>
  <li>Step two</li>
  <li>Step three</li>
</ol>
```

### Links

Create hyperlinks with the anchor element:

```html
<a href="https://example.com">Link Text</a>
```

- `href` attribute specifies the destination URL
- Always include the protocol (`https://` or `http://`)
- Link text should be descriptive

### Images

Embed images with proper attributes:

```html
<img src="images/photo.jpg" alt="Description of image" />
```

- `src` - Path to image file
- `alt` - Alternative text for accessibility and when images don't load
- Images are "empty elements" (no closing tag)
- Alt text should meaningfully describe the image content

### Nesting Elements

Elements can contain other elements:

```html
<html>
  <body>
    <h1>My Heading</h1>
    <p>My paragraph with <strong>bold text</strong>.</p>
  </body>
</html>
```

All elements must be properly nested - if you open element A, then B, you must close B before closing A.

## HTML Syntax Rules

1. **Tags**: Most elements have opening `<tag>` and closing `</tag>` tags
2. **Empty elements**: Some elements like `<img>`, `<br>`, `<meta>` have no closing tag
3. **Case insensitivity**: `<P>` and `<p>` are equivalent, but lowercase is standard practice
4. **Attributes**: Provide additional information about elements (e.g., `href`, `src`, `alt`)
5. **Comments**: Add notes with `<!-- comment text -->` - not displayed in browser

## Creating Your First Page

1. Create a new file named `index.html`
2. Add the basic document structure
3. Add a title in the `<head>`
4. Add content in the `<body>`: headings, paragraphs, images, lists, links
5. Open the file in a web browser to view

## Best Practices

- Always include `<!DOCTYPE html>` at the top
- Use semantic elements that describe content meaning
- Always close tags (except empty elements)
- Use lowercase for tag names and attributes
- Quote attribute values
- Include `alt` text for all images
- Use proper heading hierarchy
- Validate your HTML regularly

## Resources

- [MDN: Creating Your First Website](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Your_first_website/Creating_the_content)
- [MDN: Structuring Content with HTML](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content)
- [W3Schools: HTML Basics](https://www.w3schools.com/html/html_basic.asp)
- [W3Schools: HTML Elements](https://www.w3schools.com/html/html_elements.asp)
