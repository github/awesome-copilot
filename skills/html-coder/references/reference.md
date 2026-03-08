# HTML Element Reference

Comprehensive reference of all HTML elements organized by category.

## Main Root

**`<html>`**  
Top-level container for an HTML document. All other elements must be nested within it. Also called the root element.

## Document Metadata

Metadata provides information about the page for browsers, search engines, and other software.

| Element | Purpose |
|---------|---------|
| `<base>` | Sets the base URL for all relative URLs in the document (only one per document) |
| `<head>` | Container for document metadata like title, scripts, and stylesheets |
| `<link>` | Links to external resources (commonly CSS files, favicons, mobile icons) |
| `<meta>` | Defines metadata not representable by other meta elements |
| `<style>` | Contains CSS styling information for the document |
| `<title>` | Specifies the document title shown in browser tabs (text only, no HTML) |

## Sectioning Root

**`<body>`**  
Contains the main content of the HTML document. Only one per document.

## Content Sectioning

Organize document content into logical sections with clear structure and hierarchy.

| Element | Purpose |
|---------|---------|
| `<address>` | Marks contact information for a person, people, or organization |
| `<article>` | Self-contained content suitable for independent distribution (blog post, forum post, news article) |
| `<aside>` | Content indirectly related to main content (sidebars, call-out boxes) |
| `<footer>` | Footer section containing authorship, copyright, or related document links |
| `<header>` | Introductory content, navigation aids, logos, search forms |
| `<h1>` to `<h6>` | Six levels of section headings (h1 highest, h6 lowest) |
| `<hgroup>` | Groups heading with secondary content like subheadings or taglines |
| `<main>` | Dominant content of the document body (central topic or functionality) |
| `<nav>` | Navigation links section (menus, tables of contents, indexes) |
| `<section>` | Standalone thematic section (should typically have a heading) |
| `<search>` | Container for search or filtering controls |

## Text Content

Structure blocks or sections of text content within the body.

| Element | Purpose |
|---------|---------|
| `<blockquote>` | Extended quotation from another source (use `cite` attribute for URL) |
| `<dd>` | Description or value for preceding term in a description list |
| `<div>` | Generic container with no semantic meaning (style with CSS or layout parent) |
| `<dl>` | Description list wrapper for term-definition pairs |
| `<dt>` | Term being described in a description list |
| `<figcaption>` | Caption or legend for parent `<figure>` |
| `<figure>` | Self-contained content with optional caption |
| `<hr>` | Thematic break between content (scene change, topic shift) |
| `<li>` | List item within `<ol>`, `<ul>`, or `<menu>` |
| `<menu>` | Semantic alternative to `<ul>` (treated identically by browsers) |
| `<ol>` | Ordered (numbered) list |
| `<p>` | Paragraph of text or related content grouping |
| `<pre>` | Preformatted text preserving whitespace exactly as written |
| `<ul>` | Unordered (bulleted) list |

## Inline Text Semantics

Define meaning, structure, or styling for words, lines, or text portions.

| Element | Purpose |
|---------|---------|
| `<a>` | Hyperlink to URLs, files, email addresses, page locations (requires `href`) |
| `<abbr>` | Abbreviation or acronym (expand inline, not via `title`) |
| `<b>` | Draws attention without special importance (typically bold) |
| `<bdi>` | Isolates text from surrounding bidirectional algorithm |
| `<bdo>` | Overrides text directionality |
| `<br>` | Line break (for addresses, poems where line division matters) |
| `<cite>` | Title of a creative work |
| `<code>` | Inline code fragment (monospace by default) |
| `<data>` | Links content with machine-readable translation |
| `<dfn>` | Term being defined in current context |
| `<em>` | Stress emphasis (can nest for stronger emphasis) |
| `<i>` | Text set off for technical terms, idiomatic phrases, thoughts |
| `<kbd>` | User input from keyboard or other input device |
| `<mark>` | Highlighted text for reference or notation |
| `<q>` | Short inline quotation (browsers add quotation marks) |
| `<rp>` | Fallback parentheses for browsers not supporting ruby annotations |
| `<rt>` | Ruby text component (pronunciation, translation for East Asian typography) |
| `<ruby>` | Small annotations rendered near base text (usually pronunciation) |
| `<s>` | Strikethrough for no-longer-relevant or inaccurate content |
| `<samp>` | Sample or quoted output from computer program |
| `<small>` | Side comments, fine print, copyright, legal text |
| `<span>` | Generic inline container with no semantic meaning |
| `<strong>` | Strong importance, seriousness, or urgency (typically bold) |
| `<sub>` | Subscript text |
| `<sup>` | Superscript text |
| `<time>` | Specific time period (use `datetime` for machine-readable format) |
| `<u>` | Non-textual annotation indicated by underline |
| `<var>` | Variable name in mathematical or programming context |
| `<wbr>` | Optional line break opportunity |

## Image and Multimedia

Embed images, audio, video, and other multimedia resources.

| Element | Purpose |
|---------|---------|
| `<area>` | Clickable area within image map |
| `<audio>` | Embeds sound content (supports multiple sources via `<source>`) |
| `<img>` | Embeds an image |
| `<map>` | Defines image map with clickable regions |
| `<track>` | Text tracks for media elements (subtitles, captions in WebVTT format) |
| `<video>` | Embeds video content (supports multiple sources) |

## Embedded Content

Embed external content beyond standard multimedia.

| Element | Purpose |
|---------|---------|
| `<embed>` | Embeds external content from plugins or applications |
| `<fencedframe>` | Nested browsing context with enhanced privacy (like `<iframe>` with more features) |
| `<iframe>` | Embeds another HTML page within current page |
| `<object>` | External resource treated as image, nested context, or plugin content |
| `<picture>` | Container for multiple image sources for responsive images |
| `<source>` | Multiple media resources for `<picture>`, `<audio>`, or `<video>` |

## SVG and MathML

**`<svg>`**  
Container for SVG graphics (vector images, charts, diagrams).

**`<math>`**  
Top-level element for MathML mathematical notation.

## Scripting

Enable dynamic content and web applications.

| Element | Purpose |
|---------|---------|
| `<canvas>` | Container for drawing graphics via JavaScript or WebGL |
| `<noscript>` | Content displayed when scripts are disabled or unsupported |
| `<script>` | Embeds or references executable code (typically JavaScript) |

## Demarcating Edits

Indicate document changes or revisions.

| Element | Purpose |
|---------|---------|
| `<del>` | Text deleted from document (track changes, diffs) |
| `<ins>` | Text added to document |

## Table Content

Create and structure tabular data.

| Element | Purpose |
|---------|---------|
| `<caption>` | Table title or caption |
| `<col>` | Column definition within `<colgroup>` (must have no `span` on parent) |
| `<colgroup>` | Group of columns in a table |
| `<table>` | Container for tabular data displayed in rows and columns |
| `<tbody>` | Main body rows of a table |
| `<td>` | Data cell within a table row |
| `<tfoot>` | Footer rows with summary information |
| `<th>` | Header cell for group of table cells (use `scope` and `headers` for relationships) |
| `<thead>` | Header rows with column information |
| `<tr>` | Row of cells in a table |

## Forms

Interactive controls for user input and data submission.

| Element | Purpose |
|---------|---------|
| `<button>` | Interactive button activated by user action |
| `<datalist>` | Set of `<option>` elements providing suggestions for other controls |
| `<fieldset>` | Groups related form controls and labels |
| `<form>` | Document section containing interactive submission controls |
| `<input>` | Interactive control with many types for different data (text, checkbox, file, etc.) |
| `<label>` | Caption for form control |
| `<legend>` | Caption for parent `<fieldset>` |
| `<meter>` | Scalar value within known range or fractional value |
| `<optgroup>` | Groups options within `<select>` |
| `<option>` | Item within `<select>`, `<optgroup>`, or `<datalist>` |
| `<output>` | Container for calculation results or user action outcomes |
| `<progress>` | Task completion indicator (progress bar) |
| `<select>` | Dropdown menu of options |
| `<selectedcontent>` | Displays currently selected option in closed `<select>` |
| `<textarea>` | Multi-line plain text editing control |

## Interactive Elements

Create interactive user interface components.

| Element | Purpose |
|---------|---------|
| `<details>` | Disclosure widget revealing content when toggled open |
| `<dialog>` | Dialog box, modal, or interactive component |
| `<geolocation>` | Interactive control for sharing user's geolocation (experimental) |
| `<summary>` | Summary or label for `<details>` disclosure box |

## Web Components

Create and use custom elements as standard HTML.

| Element | Purpose |
|---------|---------|
| `<slot>` | Placeholder in web component filled with custom markup |
| `<template>` | HTML held for later instantiation via JavaScript |

## Obsolete and Deprecated Elements

**Do not use these elements.** They are deprecated and should be replaced in existing projects.

| Element | Deprecated Purpose | Modern Alternative |
|---------|-------------------|-------------------|
| `<acronym>` | Indicated acronyms | Use `<abbr>` |
| `<big>` | Larger font size | Use CSS `font-size` |
| `<center>` | Centered content | Use CSS `text-align: center` |
| `<content>` | Shadow DOM insertion point | Use `<slot>` |
| `<dir>` | Directory list | Use `<ul>` |
| `<font>` | Font styling | Use CSS `font` properties |
| `<frame>`, `<frameset>` | Frame-based layout | Use modern layout techniques |
| `<image>` | Image embed | Use `<img>` |
| `<marquee>` | Scrolling text | Use CSS animations |
| `<menuitem>` | Context menu command | Use modern menu patterns |
| `<nobr>` | Prevent line breaks | Use CSS `white-space: nowrap` |
| `<noembed>` | Fallback for embed | Use content between `<object>` tags |
| `<noframes>` | Frame fallback | Don't use frames |
| `<param>` | Object parameters | Use data attributes |
| `<plaintext>` | Raw text rendering | Use `<pre>` with proper escaping |
| `<rb>`, `<rtc>` | Ruby annotation parts | Use `<ruby>`, `<rt>`, `<rp>` |
| `<shadow>` | Shadow DOM insertion | Use `<slot>` |
| `<strike>` | Strikethrough | Use `<s>` or `<del>` |
| `<tt>` | Teletype (monospace) | Use CSS `font-family: monospace` |
| `<xmp>` | Example markup | Use `<pre>` with proper escaping |

## Element Categories Overview

**Metadata elements**: `<base>`, `<head>`, `<link>`, `<meta>`, `<style>`, `<title>`

**Sectioning elements**: `<article>`, `<aside>`, `<nav>`, `<section>`

**Heading elements**: `<h1>`, `<h2>`, `<h3>`, `<h4>`, `<h5>`, `<h6>`, `<hgroup>`

**Phrasing elements**: `<a>`, `<abbr>`, `<b>`, `<br>`, `<cite>`, `<code>`, `<data>`, `<em>`, `<i>`, `<kbd>`, `<mark>`, `<q>`, `<s>`, `<samp>`, `<small>`, `<span>`, `<strong>`, `<sub>`, `<sup>`, `<time>`, `<u>`, `<var>`, and others

**Flow elements**: Most elements that appear in document body

**Interactive elements**: `<a>`, `<button>`, `<details>`, `<embed>`, `<iframe>`, `<input>`, `<label>`, `<select>`, `<textarea>`, and others with user interaction

**Void elements** (no closing tag): `<area>`, `<base>`, `<br>`, `<col>`, `<embed>`, `<hr>`, `<img>`, `<input>`, `<link>`, `<meta>`, `<source>`, `<track>`, `<wbr>`

## Usage Guidelines

1. **Choose semantic elements**: Use elements that convey meaning (e.g., `<nav>` for navigation, not `<div class="nav">`)
2. **Avoid deprecated elements**: Never use elements from the obsolete list
3. **Use void elements correctly**: Don't add closing tags to self-closing elements
4. **Nest properly**: Ensure elements are closed in correct order
5. **Provide accessibility**: Use semantic HTML and proper attributes (alt, aria-*, etc.)
6. **Validate markup**: Use HTML validators to catch errors
7. **Consider content categories**: Understand which elements can contain which others

## Quick Selection Guide

**For text**: Use `<p>` for paragraphs, heading elements for structure, inline elements for emphasis

**For layout**: Use `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`, `<section>`, `<article>`

**For lists**: Use `<ul>` (unordered), `<ol>` (ordered), `<dl>` (definitions)

**For data tables**: Use `<table>` with proper structure (`<thead>`, `<tbody>`, `<tfoot>`)

**For forms**: Use `<form>` with `<input>`, `<label>`, `<select>`, `<textarea>`, `<button>`

**For media**: Use `<img>`, `<video>`, `<audio>`, `<picture>` for responsive images

**For interactive widgets**: Use `<details>`, `<dialog>`, form elements

**For grouping**: Use `<div>` (block) or `<span>` (inline) when no semantic element fits

## Resources

- [MDN HTML Elements Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element)
- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [W3C HTML Specification](https://www.w3.org/TR/html/)
