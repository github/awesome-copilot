# HTML Tags Glossary

Quick reference for all HTML elements organized by category.

## Document Structure

| Tag | Description | Usage |
|-----|-------------|-------|
| `<!DOCTYPE>` | Document type declaration | `<!DOCTYPE html>` |
| `<html>` | Root element | Contains entire HTML document |
| `<head>` | Document metadata container | Information about the document |
| `<title>` | Document title | Shown in browser tab/title bar |
| `<body>` | Document body | Visible page content |
| `<base>` | Base URL for relative URLs | `<base href="https://example.com/">` |
| `<link>` | External resource link | CSS files, favicons, etc. |
| `<meta>` | Metadata | Charset, viewport, description, etc. |
| `<style>` | Internal CSS | Embedded stylesheets |

## Metadata Elements

| Tag | Description | Common Use |
|-----|-------------|------------|
| `<meta charset>` | Character encoding | `<meta charset="UTF-8">` |
| `<meta name>` | Named metadata | Description, keywords, author |
| `<meta property>` | Property metadata | Open Graph, Twitter Cards |
| `<meta http-equiv>` | HTTP header equivalent | Content-Type, refresh, CSP |
| `<meta viewport>` | Viewport settings | Mobile responsive design |

## Content Sectioning

| Tag | Description | Purpose |
|-----|-------------|---------|
| `<header>` | Header section | Site/page/article header |
| `<nav>` | Navigation section | Navigation links |
| `<main>` | Main content | Primary page content (unique) |
| `<section>` | Generic section | Thematic grouping of content |
| `<article>` | Self-contained content | Blog post, news article, forum post |
| `<aside>` | Tangential content | Sidebars, pull quotes, ads |
| `<footer>` | Footer section | Site/page/article footer |
| `<h1>` to `<h6>` | Headings | Content hierarchy (H1 most important) |
| `<address>` | Contact information | Author/owner contact details |

## Text Content

| Tag | Description | Usage |
|-----|-------------|-------|
| `<div>` | Generic container | Block-level grouping (no semantic meaning) |
| `<p>` | Paragraph | Text paragraphs |
| `<hr>` | Thematic break | Horizontal rule/separator |
| `<pre>` | Preformatted text | Code blocks, ASCII art |
| `<blockquote>` | Block quotation | Long quotes with optional `cite` |
| `<ol>` | Ordered list | Numbered list |
| `<ul>` | Unordered list | Bulleted list |
| `<li>` | List item | Item in `<ol>`, `<ul>`, or `<menu>` |
| `<dl>` | Description list | Term-definition pairs |
| `<dt>` | Description term | Term in description list |
| `<dd>` | Description details | Definition in description list |
| `<figure>` | Self-contained content | Images, diagrams, code with caption |
| `<figcaption>` | Figure caption | Caption for `<figure>` |

## Inline Text Semantics

| Tag | Description | Purpose |
|-----|-------------|---------|
| `<a>` | Anchor/hyperlink | Links to other pages/resources |
| `<span>` | Generic inline container | Inline grouping (no semantic meaning) |
| `<strong>` | Strong importance | Bold text (semantic) |
| `<em>` | Emphasis | Italic text (semantic) |
| `<b>` | Bold text | Bold (presentational, use CSS instead) |
| `<i>` | Italic text | Italic (presentational, use CSS instead) |
| `<u>` | Underlined text | Underline (avoid, looks like link) |
| `<s>` | Strikethrough | Incorrect/irrelevant text |
| `<mark>` | Highlighted text | Marked/highlighted for reference |
| `<small>` | Fine print | Side comments, legal text |
| `<abbr>` | Abbreviation | Abbreviations with `title` |
| `<cite>` | Citation | Title of creative work |
| `<code>` | Inline code | Code snippets |
| `<kbd>` | Keyboard input | Keyboard keys to press |
| `<samp>` | Sample output | Computer program output |
| `<var>` | Variable | Mathematical/programming variable |
| `<time>` | Date/time | Machine-readable date/time |
| `<data>` | Machine-readable content | Data with value attribute |
| `<q>` | Inline quotation | Short inline quotes |
| `<dfn>` | Definition term | Term being defined |
| `<sub>` | Subscript | H₂O |
| `<sup>` | Superscript | x² |
| `<del>` | Deleted text | Removed content (with `<ins>`) |
| `<ins>` | Inserted text | Added content (with `<del>`) |
| `<br>` | Line break | Force line break |
| `<wbr>` | Word break opportunity | Suggest line break point |
| `<bdi>` | Bidirectional isolate | Text with different direction |
| `<bdo>` | Bidirectional override | Override text direction |
| `<ruby>` | Ruby annotation | East Asian typography |
| `<rt>` | Ruby text | Pronunciation guide in `<ruby>` |
| `<rp>` | Ruby parenthesis | Fallback for browsers without ruby |

## Images and Multimedia

| Tag | Description | Usage |
|-----|-------------|-------|
| `<img>` | Image | Embed raster images |
| `<picture>` | Responsive image container | Art direction, multiple formats |
| `<source>` | Media source | Source for `<picture>`, `<audio>`, `<video>` |
| `<audio>` | Audio content | Embed audio files |
| `<video>` | Video content | Embed video files |
| `<track>` | Text track | Subtitles, captions for video/audio |
| `<map>` | Image map | Define clickable areas in image |
| `<area>` | Image map area | Clickable region in `<map>` |
| `<svg>` | Scalable Vector Graphics | Inline vector graphics |
| `<canvas>` | Graphics canvas | Drawing surface for JavaScript |

## Embedded Content

| Tag | Description | Purpose |
|-----|-------------|---------|
| `<iframe>` | Inline frame | Embed external content |
| `<embed>` | External content | Embed plugins (legacy) |
| `<object>` | External object | Embed multimedia, PDFs |
| `<param>` | Object parameters | Parameters for `<object>` |
| `<portal>` | Portal element | Preview/navigate to other pages |

## Scripting

| Tag | Description | Usage |
|-----|-------------|-------|
| `<script>` | JavaScript | Embed or link JavaScript |
| `<noscript>` | No script fallback | Content when JavaScript disabled |
| `<template>` | Content template | HTML template for cloning |
| `<slot>` | Web component slot | Placeholder in web components |

## Tables

| Tag | Description | Purpose |
|-----|-------------|---------|
| `<table>` | Table | Tabular data |
| `<caption>` | Table caption | Table title/description |
| `<thead>` | Table header | Header rows |
| `<tbody>` | Table body | Main table content |
| `<tfoot>` | Table footer | Footer rows |
| `<tr>` | Table row | Row of cells |
| `<th>` | Header cell | Column/row header |
| `<td>` | Data cell | Table data |
| `<col>` | Column | Column properties |
| `<colgroup>` | Column group | Group of columns |

## Forms

| Tag | Description | Purpose |
|-----|-------------|---------|
| `<form>` | Form | User input form |
| `<input>` | Input field | Various input types |
| `<label>` | Input label | Label for form control |
| `<button>` | Button | Clickable button |
| `<select>` | Dropdown | Selection list |
| `<option>` | Select option | Option in `<select>` |
| `<optgroup>` | Option group | Group options in `<select>` |
| `<textarea>` | Multi-line text | Large text input |
| `<fieldset>` | Field grouping | Group related form fields |
| `<legend>` | Fieldset caption | Title for `<fieldset>` |
| `<datalist>` | Input suggestions | Predefined options for input |
| `<output>` | Calculation result | Result of calculation |
| `<progress>` | Progress bar | Task progress indicator |
| `<meter>` | Measurement gauge | Scalar measurement |

## Interactive Elements

| Tag | Description | Usage |
|-----|-------------|-------|
| `<details>` | Disclosure widget | Expandable content |
| `<summary>` | Details summary | Title for `<details>` |
| `<dialog>` | Dialog box | Modal or non-modal dialog |
| `<menu>` | Menu | List of commands (experimental) |

## Web Components

| Tag | Description | Purpose |
|-----|-------------|---------|
| `<template>` | Content template | Reusable HTML template |
| `<slot>` | Content slot | Placeholder in shadow DOM |
| Custom elements | User-defined elements | `<my-component>` |

## Deprecated/Obsolete Elements

❌ **Do not use these elements** (use CSS or semantic alternatives instead):

| Tag | Reason | Alternative |
|-----|--------|-------------|
| `<acronym>` | Obsolete | Use `<abbr>` |
| `<applet>` | Obsolete | Use `<object>` or `<embed>` |
| `<basefont>` | Obsolete | Use CSS `font` properties |
| `<big>` | Obsolete | Use CSS `font-size` |
| `<blink>` | Obsolete | Use CSS `animation` |
| `<center>` | Obsolete | Use CSS `text-align: center` |
| `<dir>` | Obsolete | Use `<ul>` |
| `<font>` | Obsolete | Use CSS `color`, `font-family`, `font-size` |
| `<frame>` | Obsolete | Use `<iframe>` or CSS layout |
| `<frameset>` | Obsolete | Use CSS layout |
| `<marquee>` | Obsolete | Use CSS `animation` |
| `<nobr>` | Obsolete | Use CSS `white-space: nowrap` |
| `<noframes>` | Obsolete | N/A (frames obsolete) |
| `<plaintext>` | Obsolete | Use `<pre>` or `<code>` |
| `<spacer>` | Obsolete | Use CSS `margin`, `padding` |
| `<strike>` | Obsolete | Use `<del>` or `<s>` |
| `<tt>` | Obsolete | Use `<code>` or `<kbd>` |
| `<xmp>` | Obsolete | Use `<pre>` or `<code>` |

## Elements by Display Type

### Block-Level Elements (Default)

Display as block (full width, new line):

```
<address>, <article>, <aside>, <blockquote>, <canvas>, <dd>, <div>, 
<dl>, <dt>, <fieldset>, <figcaption>, <figure>, <footer>, <form>, 
<h1>-<h6>, <header>, <hr>, <li>, <main>, <nav>, <ol>, <p>, <pre>, 
<section>, <table>, <ul>, <video>
```

### Inline Elements (Default)

Display inline (no line break):

```
<a>, <abbr>, <b>, <bdi>, <bdo>, <br>, <button>, <cite>, <code>, 
<data>, <dfn>, <em>, <i>, <img>, <input>, <kbd>, <label>, <mark>, 
<q>, <s>, <samp>, <select>, <small>, <span>, <strong>, <sub>, 
<sup>, <textarea>, <time>, <u>, <var>, <wbr>
```

### Void Elements (Self-Closing)

Cannot have content:

```
<area>, <base>, <br>, <col>, <embed>, <hr>, <img>, <input>, <link>, 
<meta>, <param>, <source>, <track>, <wbr>
```

## Elements by Purpose

### Navigation
```
<nav>, <a>, <menu>
```

### Grouping Content
```
<div>, <section>, <article>, <aside>, <header>, <footer>, <main>
```

### Text Formatting
```
<p>, <h1>-<h6>, <strong>, <em>, <mark>, <del>, <ins>
```

### Lists
```
<ul>, <ol>, <li>, <dl>, <dt>, <dd>
```

### Forms
```
<form>, <input>, <textarea>, <select>, <button>, <label>, <fieldset>, <legend>
```

### Media
```
<img>, <audio>, <video>, <picture>, <source>, <track>
```

### Tables
```
<table>, <tr>, <td>, <th>, <thead>, <tbody>, <tfoot>, <caption>
```

### Code/Programming
```
<code>, <pre>, <kbd>, <samp>, <var>
```

## Quick Reference by Use Case

### Basic Page Structure
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Page Title</title>
  </head>
  <body>
    <header>Header</header>
    <nav>Navigation</nav>
    <main>Main Content</main>
    <footer>Footer</footer>
  </body>
</html>
```

### Content Organization
```html
<article>
  <header>
    <h1>Article Title</h1>
    <time>Date</time>
  </header>
  <section>
    <h2>Section</h2>
    <p>Content</p>
  </section>
  <footer>Article footer</footer>
</article>
```

### Text Semantics
```html
<p>Normal text with <strong>important</strong> and <em>emphasized</em> parts.</p>
<p>Use <code>code</code> for inline code and <pre> for blocks.</p>
<p><abbr title="HyperText Markup Language">HTML</abbr> example.</p>
```

### Forms
```html
<form>
  <label for="name">Name:</label>
  <input type="text" id="name" name="name">
  <button type="submit">Submit</button>
</form>
```

### Media
```html
<img src="image.jpg" alt="Description">
<video controls>
  <source src="video.mp4" type="video/mp4">
</video>
<audio controls>
  <source src="audio.mp3" type="audio/mpeg">
</audio>
```

### Lists
```html
<!-- Unordered -->
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>

<!-- Ordered -->
<ol>
  <li>First</li>
  <li>Second</li>
</ol>

<!-- Description -->
<dl>
  <dt>Term</dt>
  <dd>Definition</dd>
</dl>
```

### Tables
```html
<table>
  <caption>Table Title</caption>
  <thead>
    <tr><th>Header</th></tr>
  </thead>
  <tbody>
    <tr><td>Data</td></tr>
  </tbody>
</table>
```

## Notes

- **Semantic HTML**: Prefer semantic elements (`<article>`, `<nav>`, etc.) over generic `<div>` and `<span>`
- **Accessibility**: Use proper structure and attributes (alt, labels, ARIA)
- **Void elements**: Self-closing tags like `<img>`, `<br>`, `<input>` don't need closing tags
- **Block vs Inline**: Can be changed with CSS `display` property
- **Nesting rules**: Some elements cannot contain others (e.g., `<p>` cannot contain `<div>`)
