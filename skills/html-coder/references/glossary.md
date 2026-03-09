# HTML Glossary

Quick reference for all HTML elements organized by category.

## HTML Tag Glossary

### Document Structure

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

### Metadata Elements

| Tag | Description | Common Use |
|-----|-------------|------------|
| `<meta charset>` | Character encoding | `<meta charset="UTF-8">` |
| `<meta name>` | Named metadata | Description, keywords, author |
| `<meta property>` | Property metadata | Open Graph, Twitter Cards |
| `<meta http-equiv>` | HTTP header equivalent | Content-Type, refresh, CSP |
| `<meta viewport>` | Viewport settings | Mobile responsive design |

### Content Sectioning

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

### Text Content

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

### Inline Text Semantics

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

### Images and Multimedia

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

### Embedded Content

| Tag | Description | Purpose |
|-----|-------------|---------|
| `<iframe>` | Inline frame | Embed external content |
| `<embed>` | External content | Embed plugins (legacy) |
| `<object>` | External object | Embed multimedia, PDFs |
| `<param>` | Object parameters | Parameters for `<object>` |
| `<portal>` | Portal element | Preview/navigate to other pages |

### Scripting

| Tag | Description | Usage |
|-----|-------------|-------|
| `<script>` | JavaScript | Embed or link JavaScript |
| `<noscript>` | No script fallback | Content when JavaScript disabled |
| `<template>` | Content template | HTML template for cloning |
| `<slot>` | Web component slot | Placeholder in web components |

### Tables

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

### Forms

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

### Interactive Elements

| Tag | Description | Usage |
|-----|-------------|-------|
| `<details>` | Disclosure widget | Expandable content |
| `<summary>` | Details summary | Title for `<details>` |
| `<dialog>` | Dialog box | Modal or non-modal dialog |
| `<menu>` | Menu | List of commands (experimental) |

### Web Components

| Tag | Description | Purpose |
|-----|-------------|---------|
| `<template>` | Content template | Reusable HTML template |
| `<slot>` | Content slot | Placeholder in shadow DOM |
| Custom elements | User-defined elements | `<my-component>` |

### Deprecated/Obsolete Elements

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

### Elements by Display Type

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

### Elements by Purpose

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

### Quick Reference by Use Case

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

### Notes

- **Semantic HTML**: Prefer semantic elements (`<article>`, `<nav>`, etc.) over generic `<div>` and `<span>`
- **Accessibility**: Use proper structure and attributes (alt, labels, ARIA)
- **Void elements**: Self-closing tags like `<img>`, `<br>`, `<input>` don't need closing tags
- **Block vs Inline**: Can be changed with CSS `display` property
- **Nesting rules**: Some elements cannot contain others (e.g., `<p>` cannot contain `<div>`)

## HTML Attributes Glossary

Complete reference of HTML attributes organized by category and element.

### Global Attributes

Attributes that can be used on **any** HTML element:

| Attribute | Description | Values | Example |
|-----------|-------------|--------|---------|
| `accesskey` | Keyboard shortcut | Character | `accesskey="s"` |
| `class` | CSS class(es) | Space-separated classes | `class="btn primary"` |
| `contenteditable` | Editable content | `true`, `false` | `contenteditable="true"` |
| `data-*` | Custom data | Any value | `data-user-id="123"` |
| `dir` | Text direction | `ltr`, `rtl`, `auto` | `dir="rtl"` |
| `draggable` | Draggable element | `true`, `false` | `draggable="true"` |
| `hidden` | Hide element | Boolean | `hidden` |
| `id` | Unique identifier | Unique string | `id="header"` |
| `inert` | Inert subtree | Boolean | `inert` |
| `inputmode` | Virtual keyboard type | See table below | `inputmode="numeric"` |
| `is` | Custom element | Element name | `is="my-element"` |
| `itemid` | Microdata item ID | URL | `itemid="urn:isbn:123"` |
| `itemprop` | Microdata property | Property name | `itemprop="name"` |
| `itemref` | Microdata reference | ID references | `itemref="ref1 ref2"` |
| `itemscope` | Microdata scope | Boolean | `itemscope` |
| `itemtype` | Microdata type | URL | `itemtype="https://schema.org/Person"` |
| `lang` | Language | Language code | `lang="en"`, `lang="es"` |
| `nonce` | CSP nonce | Random string | `nonce="r@nd0m"` |
| `part` | Shadow part name | Part name | `part="button"` |
| `slot` | Slot name | Slot identifier | `slot="header"` |
| `spellcheck` | Spell checking | `true`, `false` | `spellcheck="false"` |
| `style` | Inline CSS | CSS declarations | `style="color: red;"` |
| `tabindex` | Tab order | Integer | `tabindex="0"`, `tabindex="-1"` |
| `title` | Advisory information | Text | `title="Click for more info"` |
| `translate` | Translation support | `yes`, `no` | `translate="no"` |

#### Inputmode Values

| Value | Description | Keyboard Type |
|-------|-------------|---------------|
| `none` | No virtual keyboard | N/A |
| `text` | Standard text | Full keyboard |
| `decimal` | Decimal numbers | Numeric with decimal |
| `numeric` | Numeric only | Number pad |
| `tel` | Telephone | Phone number pad |
| `search` | Search | Search-optimized |
| `email` | Email address | Email keyboard |
| `url` | URL | URL keyboard |

### ARIA Attributes

Accessibility attributes (prefix `aria-`):

#### ARIA Roles
| Attribute | Description | Example |
|-----------|-------------|---------|
| `role` | Element role | `role="button"`, `role="navigation"` |

#### ARIA States and Properties

| Attribute | Description | Values |
|-----------|-------------|--------|
| `aria-activedescendant` | Active child element | ID |
| `aria-atomic` | Entire region announced | `true`, `false` |
| `aria-autocomplete` | Autocomplete type | `none`, `inline`, `list`, `both` |
| `aria-busy` | Loading state | `true`, `false` |
| `aria-checked` | Checkbox/radio state | `true`, `false`, `mixed` |
| `aria-colcount` | Total columns | Integer |
| `aria-colindex` | Column index | Integer |
| `aria-colspan` | Column span | Integer |
| `aria-controls` | Controlled elements | ID references |
| `aria-current` | Current item | `page`, `step`, `location`, `date`, `time`, `true`, `false` |
| `aria-describedby` | Description reference | ID references |
| `aria-details` | Details reference | ID reference |
| `aria-disabled` | Disabled state | `true`, `false` |
| `aria-dropeffect` | Drag-drop operation | `copy`, `move`, `link`, `execute`, `popup`, `none` |
| `aria-errormessage` | Error message reference | ID reference |
| `aria-expanded` | Expanded state | `true`, `false` |
| `aria-flowto` | Reading order | ID references |
| `aria-grabbed` | Grabbed state | `true`, `false` |
| `aria-haspopup` | Popup type | `true`, `false`, `menu`, `listbox`, `tree`, `grid`, `dialog` |
| `aria-hidden` | Hidden from screen readers | `true`, `false` |
| `aria-invalid` | Validation state | `true`, `false`, `grammar`, `spelling` |
| `aria-keyshortcuts` | Keyboard shortcuts | Text |
| `aria-label` | Accessible label | Text |
| `aria-labelledby` | Label reference | ID references |
| `aria-level` | Hierarchical level | Integer |
| `aria-live` | Live region | `off`, `polite`, `assertive` |
| `aria-modal` | Modal dialog | `true`, `false` |
| `aria-multiline` | Multi-line input | `true`, `false` |
| `aria-multiselectable` | Multi-selection | `true`, `false` |
| `aria-orientation` | Orientation | `horizontal`, `vertical` |
| `aria-owns` | Owned elements | ID references |
| `aria-placeholder` | Placeholder text | Text |
| `aria-posinset` | Position in set | Integer |
| `aria-pressed` | Pressed state | `true`, `false`, `mixed` |
| `aria-readonly` | Read-only state | `true`, `false` |
| `aria-relevant` | Relevant changes | `additions`, `removals`, `text`, `all` |
| `aria-required` | Required field | `true`, `false` |
| `aria-roledescription` | Role description | Text |
| `aria-rowcount` | Total rows | Integer |
| `aria-rowindex` | Row index | Integer |
| `aria-rowspan` | Row span | Integer |
| `aria-selected` | Selected state | `true`, `false` |
| `aria-setsize` | Set size | Integer |
| `aria-sort` | Sort order | `ascending`, `descending`, `none`, `other` |
| `aria-valuemax` | Maximum value | Number |
| `aria-valuemin` | Minimum value | Number |
| `aria-valuenow` | Current value | Number |
| `aria-valuetext` | Value as text | Text |

### Link Attributes (`<a>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `href` | Target URL | URL |
| `target` | Where to open | `_self`, `_blank`, `_parent`, `_top`, frame name |
| `download` | Download filename | Filename (optional) |
| `rel` | Relationship | See Link Relationships below |
| `hreflang` | Target language | Language code |
| `type` | MIME type | MIME type |
| `ping` | Ping URLs | Space-separated URLs |
| `referrerpolicy` | Referrer policy | See Referrer Policy below |

#### Link Relationships (`rel`)

| Value | Description | Usage |
|-------|-------------|-------|
| `alternate` | Alternate version | RSS feed, translations |
| `author` | Author page | `<link rel="author">` |
| `bookmark` | Permalink | Bookmark for section |
| `canonical` | Canonical URL | Preferred version |
| `dns-prefetch` | DNS prefetch | `<link rel="dns-prefetch">` |
| `external` | External site | Links to other domains |
| `help` | Help document | Help/support page |
| `icon` | Favicon | `<link rel="icon">` |
| `license` | License | Copyright/license page |
| `manifest` | Web manifest | PWA manifest file |
| `modulepreload` | Module preload | ES6 module preload |
| `next` | Next page | Pagination |
| `nofollow` | Don't follow | SEO: don't follow link |
| `noopener` | No opener reference | Security for `_blank` |
| `noreferrer` | No referrer | Don't send referrer |
| `opener` | Has opener | Opposite of noopener |
| `pingback` | Pingback URL | Blog pingbacks |
| `preconnect` | Preconnect | Early connection |
| `prefetch` | Prefetch resource | Future navigation |
| `preload` | Preload resource | Current page resource |
| `prerender` | Prerender page | Next page prerender |
| `prev` | Previous page | Pagination |
| `search` | Search tool | Search functionality |
| `stylesheet` | CSS stylesheet | `<link rel="stylesheet">` |
| `tag` | Tag/keyword | Tag for content |

#### Referrer Policy

| Value | Description |
|-------|-------------|
| `no-referrer` | Never send referrer |
| `no-referrer-when-downgrade` | Don't send on HTTPS→HTTP (default) |
| `origin` | Send origin only |
| `origin-when-cross-origin` | Full URL same-origin, origin only cross-origin |
| `same-origin` | Send only same-origin |
| `strict-origin` | Origin only, not on downgrade |
| `strict-origin-when-cross-origin` | Full same-origin, origin cross-origin, none downgrade |
| `unsafe-url` | Always send full URL |

### Image Attributes (`<img>`)

| Attribute | Description | Required | Example |
|-----------|-------------|----------|---------|
| `src` | Image URL | Yes | `src="image.jpg"` |
| `alt` | Alternative text | Yes | `alt="Description"` |
| `width` | Image width | No | `width="800"` |
| `height` | Image height | No | `height="600"` |
| `srcset` | Responsive sources | No | `srcset="img-400.jpg 400w, img-800.jpg 800w"` |
| `sizes` | Image sizes | No | `sizes="(max-width: 600px) 400px, 800px"` |
| `loading` | Loading strategy | No | `loading="lazy"`, `loading="eager"` |
| `decoding` | Decode strategy | No | `decoding="async"`, `decoding="sync"`, `decoding="auto"` |
| `crossorigin` | CORS mode | No | `crossorigin="anonymous"` |
| `ismap` | Server-side map | No | `ismap` (boolean) |
| `usemap` | Client-side map | No | `usemap="#mapname"` |
| `referrerpolicy` | Referrer policy | No | See Referrer Policy above |

### Form Attributes (`<form>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `action` | Submit URL | URL |
| `method` | HTTP method | `GET`, `POST` |
| `enctype` | Encoding type | `application/x-www-form-urlencoded` (default), `multipart/form-data`, `text/plain` |
| `accept-charset` | Character encodings | Space-separated encodings |
| `autocomplete` | Autocomplete | `on`, `off` |
| `name` | Form name | String |
| `novalidate` | Skip validation | Boolean |
| `target` | Response target | `_self`, `_blank`, `_parent`, `_top` |
| `rel` | Link relationship | See Link Relationships |

### Input Attributes (`<input>`)

#### Universal Input Attributes

| Attribute | Description | Values |
|-----------|-------------|--------|
| `type` | Input type | See Input Types below |
| `name` | Field name | String |
| `value` | Initial value | String |
| `id` | Unique ID | String |
| `required` | Required field | Boolean |
| `disabled` | Disabled field | Boolean |
| `readonly` | Read-only | Boolean |
| `autofocus` | Auto focus | Boolean |
| `autocomplete` | Autocomplete | See Autocomplete Values below |
| `placeholder` | Placeholder text | String |
| `form` | Associated form | Form ID |

#### Input Types

| Type | Description | Additional Attributes |
|------|-------------|----------------------|
| `text` | Single-line text | `maxlength`, `minlength`, `pattern`, `size` |
| `password` | Password field | `maxlength`, `minlength`, `pattern`, `size` |
| `email` | Email address | `maxlength`, `minlength`, `multiple`, `pattern`, `size` |
| `tel` | Telephone | `maxlength`, `minlength`, `pattern`, `size` |
| `url` | URL | `maxlength`, `minlength`, `pattern`, `size` |
| `search` | Search field | `maxlength`, `minlength`, `pattern`, `size` |
| `number` | Numeric input | `min`, `max`, `step` |
| `range` | Slider | `min`, `max`, `step` |
| `date` | Date picker | `min`, `max`, `step` |
| `time` | Time picker | `min`, `max`, `step` |
| `datetime-local` | Date and time | `min`, `max`, `step` |
| `month` | Month picker | `min`, `max`, `step` |
| `week` | Week picker | `min`, `max`, `step` |
| `color` | Color picker | N/A |
| `checkbox` | Checkbox | `checked` |
| `radio` | Radio button | `checked` |
| `file` | File upload | `accept`, `multiple`, `capture` |
| `submit` | Submit button | `formaction`, `formenctype`, `formmethod`, `formnovalidate`, `formtarget` |
| `reset` | Reset button | N/A |
| `button` | Generic button | N/A |
| `image` | Image button | `src`, `alt`, `width`, `height`, `formaction`, etc. |
| `hidden` | Hidden field | N/A |

#### Type-Specific Attributes

| Attribute | Applies To | Description |
|-----------|------------|-------------|
| `accept` | `file` | File types accepted | 
| `capture` | `file` | Camera capture |
| `checked` | `checkbox`, `radio` | Pre-checked state |
| `max` | `number`, `range`, date/time | Maximum value |
| `maxlength` | `text`, `password`, `email`, etc. | Maximum length |
| `min` | `number`, `range`, date/time | Minimum value |
| `minlength` | `text`, `password`, `email`, etc. | Minimum length |
| `multiple` | `email`, `file` | Accept multiple values |
| `pattern` | `text`, `password`, `email`, etc. | Regex validation |
| `size` | `text`, `password`, `email`, etc. | Visible width |
| `step` | `number`, `range`, date/time | Step increment |
| `list` | Most types | Datalist reference |

#### Autocomplete Values

Common values for `autocomplete` attribute:

| Value | Description |
|-------|-------------|
| `off` | Disable autocomplete |
| `on` | Enable autocomplete |
| `name` | Full name |
| `given-name` | First name |
| `additional-name` | Middle name |
| `family-name` | Last name |
| `nickname` | Nickname |
| `email` | Email address |
| `username` | Username |
| `new-password` | New password |
| `current-password` | Current password |
| `tel` | Phone number |
| `tel-country-code` | Country code |
| `tel-national` | National number |
| `street-address` | Street address |
| `address-line1` | Address line 1 |
| `address-line2` | Address line 2 |
| `address-level1` | State/province |
| `address-level2` | City |
| `postal-code` | Postal/ZIP code |
| `country` | Country code |
| `country-name` | Country name |
| `cc-name` | Cardholder name |
| `cc-number` | Credit card number |
| `cc-exp` | Expiration date |
| `cc-exp-month` | Expiration month |
| `cc-exp-year` | Expiration year |
| `cc-csc` | Security code |
| `cc-type` | Card type |
| `bday` | Birthday |
| `bday-day` | Birth day |
| `bday-month` | Birth month |
| `bday-year` | Birth year |
| `sex` | Gender |
| `url` | Website URL |
| `photo` | Photo URL |

### Button Attributes (`<button>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `type` | Button type | `submit`, `reset`, `button` |
| `name` | Button name | String |
| `value` | Button value | String |
| `disabled` | Disabled state | Boolean |
| `form` | Associated form | Form ID |
| `formaction` | Submit URL override | URL |
| `formenctype` | Encoding override | See Form `enctype` |
| `formmethod` | Method override | `GET`, `POST` |
| `formnovalidate` | Skip validation | Boolean |
| `formtarget` | Target override | See Form `target` |

### Select Attributes (`<select>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `name` | Field name | String |
| `size` | Visible options | Integer |
| `multiple` | Multiple selection | Boolean |
| `required` | Required field | Boolean |
| `disabled` | Disabled state | Boolean |
| `autofocus` | Auto focus | Boolean |
| `form` | Associated form | Form ID |

### Option Attributes (`<option>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `value` | Option value | String |
| `label` | Option label | String |
| `selected` | Pre-selected | Boolean |
| `disabled` | Disabled option | Boolean |

### Textarea Attributes (`<textarea>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `name` | Field name | String |
| `rows` | Visible rows | Integer |
| `cols` | Visible columns | Integer |
| `maxlength` | Maximum length | Integer |
| `minlength` | Minimum length | Integer |
| `placeholder` | Placeholder text | String |
| `required` | Required field | Boolean |
| `disabled` | Disabled state | Boolean |
| `readonly` | Read-only | Boolean |
| `autofocus` | Auto focus | Boolean |
| `autocomplete` | Autocomplete | `on`, `off` |
| `spellcheck` | Spell check | `true`, `false` |
| `wrap` | Text wrapping | `soft`, `hard` |
| `form` | Associated form | Form ID |

### Media Attributes (`<audio>`, `<video>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `src` | Media source | URL |
| `controls` | Show controls | Boolean |
| `autoplay` | Auto play | Boolean |
| `loop` | Loop playback | Boolean |
| `muted` | Muted audio | Boolean |
| `preload` | Preload strategy | `none`, `metadata`, `auto` |
| `poster` | Poster image (video only) | URL |
| `width` | Width (video only) | Integer |
| `height` | Height (video only) | Integer |
| `crossorigin` | CORS mode | `anonymous`, `use-credentials` |
| `playsinline` | Inline playback (mobile) | Boolean |

### Script Attributes (`<script>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `src` | Script URL | URL |
| `type` | MIME type | `text/javascript` (default), `module` |
| `async` | Async loading | Boolean |
| `defer` | Deferred loading | Boolean |
| `crossorigin` | CORS mode | `anonymous`, `use-credentials` |
| `integrity` | SRI hash | Hash string |
| `nomodule` | Fallback for old browsers | Boolean |
| `nonce` | CSP nonce | Random string |
| `referrerpolicy` | Referrer policy | See Referrer Policy |

### Table Attributes

#### Table (`<table>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `border` | Border (deprecated) | Integer (use CSS) |
| `cellspacing` | Cell spacing (deprecated) | Integer (use CSS) |
| `cellpadding` | Cell padding (deprecated) | Integer (use CSS) |

#### Table Cell (`<td>`, `<th>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `colspan` | Column span | Integer |
| `rowspan` | Row span | Integer |
| `headers` | Header references | Space-separated IDs |
| `scope` | Header scope (`<th>` only) | `row`, `col`, `rowgroup`, `colgroup` |

### Iframe Attributes (`<iframe>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `src` | Frame URL | URL |
| `srcdoc` | Inline HTML | HTML string |
| `name` | Frame name | String |
| `width` | Frame width | Integer or percentage |
| `height` | Frame height | Integer or percentage |
| `sandbox` | Security restrictions | See Sandbox below |
| `allow` | Feature policy | Semicolon-separated policies |
| `allowfullscreen` | Allow fullscreen | Boolean |
| `allowpaymentrequest` | Allow payment | Boolean |
| `loading` | Loading strategy | `lazy`, `eager` |
| `referrerpolicy` | Referrer policy | See Referrer Policy |

#### Sandbox Values

| Value | Description |
|-------|-------------|
| (empty) | All restrictions |
| `allow-forms` | Allow form submission |
| `allow-modals` | Allow modals |
| `allow-orientation-lock` | Allow screen orientation |
| `allow-pointer-lock` | Allow pointer lock |
| `allow-popups` | Allow popups |
| `allow-popups-to-escape-sandbox` | Popups inherit sandbox |
| `allow-presentation` | Allow presentation API |
| `allow-same-origin` | Treat as same origin |
| `allow-scripts` | Allow scripts |
| `allow-top-navigation` | Allow top navigation |
| `allow-top-navigation-by-user-activation` | Allow with user action |

### Meta Attributes (`<meta>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `charset` | Character encoding | `UTF-8` (most common) |
| `name` | Metadata name | `description`, `keywords`, `author`, `viewport`, etc. |
| `content` | Metadata content | String |
| `http-equiv` | HTTP header | `content-type`, `refresh`, `content-security-policy`, etc. |
| `property` | Property name (Open Graph) | `og:title`, `og:image`, etc. |

### Progress/Meter Attributes

#### Progress (`<progress>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `value` | Current value | Number |
| `max` | Maximum value | Number |

#### Meter (`<meter>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `value` | Current value | Number |
| `min` | Minimum value | Number |
| `max` | Maximum value | Number |
| `low` | Low threshold | Number |
| `high` | High threshold | Number |
| `optimum` | Optimum value | Number |

### Details Attributes (`<details>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `open` | Initially open | Boolean |

### Dialog Attributes (`<dialog>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `open` | Visible dialog | Boolean |

### Canvas Attributes (`<canvas>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `width` | Canvas width | Integer (pixels) |
| `height` | Canvas height | Integer (pixels) |

### Quick Reference

#### Most Common Attributes

```html
<!-- Links -->
<a href="url" target="_blank" rel="noopener">Link</a>

<!-- Images -->
<img src="image.jpg" alt="Description" width="800" height="600" loading="lazy">

<!-- Forms -->
<form action="/submit" method="POST">
  <input type="text" name="username" required>
  <button type="submit">Submit</button>
</form>

<!-- Containers -->
<div id="container" class="wrapper" data-role="main"></div>

<!-- Media -->
<video src="video.mp4" controls poster="poster.jpg" preload="metadata"></video>

<!-- Scripts -->
<script src="app.js" defer></script>

<!-- Metadata -->
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

### Notes

- **Boolean attributes**: Presence = true, absence = false (e.g., `disabled`, `required`)
- **Global attributes**: Can be used on any element
- **Deprecated attributes**: Many presentational attributes deprecated (use CSS instead)
- **Validation**: Use W3C Validator to check attribute usage
- **Accessibility**: ARIA attributes enhance accessibility for screen readers

## HTML Event Attributes Glossary

Complete reference for HTML event handler attributes (inline event handlers).

### What Are Event Attributes?

Event attributes (also called inline event handlers) are HTML attributes that execute JavaScript code when specific events occur. They all start with `on` followed by the event name (e.g., `onclick`, `onload`, `onsubmit`).

### ⚠️ Important Note

**Modern best practice**: Use JavaScript `.addEventListener()` instead of inline event attributes for better:
- **Separation of concerns** (HTML structure vs behavior)
- **Multiple handlers** per event
- **Easier maintenance**
- **Content Security Policy (CSP) compatibility**

```html
<!-- ❌ Avoid: Inline handler -->
<button onclick="alert('Clicked')">Click</button>

<!-- ✅ Prefer: Event listener -->
<button id="myBtn">Click</button>
<script>
  document.getElementById('myBtn').addEventListener('click', function() {
    alert('Clicked');
  });
</script>
```

### Window Events

Events that occur on the window object:

| Event Attribute | When It Fires | Example |
|-----------------|---------------|---------|
| `onafterprint` | After print dialog closes | `<body onafterprint="handleAfterPrint()">` |
| `onbeforeprint` | Before print dialog opens | `<body onbeforeprint="handleBeforePrint()">` |
| `onbeforeunload` | Before page unload | `<body onbeforeunload="return 'Leave page?'">` |
| `onerror` | When error occurs | `<body onerror="handleError()">` |
| `onhashchange` | When URL hash changes | `<body onhashchange="handleHashChange()">` |
| `onload` | When page/element loads | `<body onload="init()">` |
| `onmessage` | When message received (postMessage) | `<body onmessage="handleMessage()">` |
| `onoffline` | When browser goes offline | `<body onoffline="handleOffline()">` |
| `ononline` | When browser goes online | `<body ononline="handleOnline()">` |
| `onpagehide` | When navigating away | `<body onpagehide="handlePageHide()">` |
| `onpageshow` | When navigating to page | `<body onpageshow="handlePageShow()">` |
| `onpopstate` | When history state changes | `<body onpopstate="handlePopState()">` |
| `onresize` | When window is resized | `<body onresize="handleResize()">` |
| `onstorage` | When storage changes | `<body onstorage="handleStorage()">` |
| `onunload` | When page is unloaded | `<body onunload="cleanup()">` |

**Example**:
```html
<body onload="console.log('Page loaded')" onresize="console.log('Window resized')">
  <h1>Welcome</h1>
</body>
```

### Mouse Events

Events triggered by mouse actions:

| Event Attribute | When It Fires | Example |
|-----------------|---------------|---------|
| `onclick` | Element is clicked | `<button onclick="handleClick()">Click</button>` |
| `oncontextmenu` | Right-click (context menu) | `<div oncontextmenu="return false">No right-click</div>` |
| `ondblclick` | Element is double-clicked | `<div ondblclick="handleDoubleClick()">Double-click</div>` |
| `onmousedown` | Mouse button pressed down | `<button onmousedown="handleMouseDown()">Press</button>` |
| `onmouseenter` | Mouse enters element | `<div onmouseenter="highlight()">Hover</div>` |
| `onmouseleave` | Mouse leaves element | `<div onmouseleave="unhighlight()">Hover</div>` |
| `onmousemove` | Mouse moves over element | `<div onmousemove="trackMouse()">Move mouse</div>` |
| `onmouseout` | Mouse moves out (bubbles) | `<div onmouseout="handleOut()">Hover out</div>` |
| `onmouseover` | Mouse moves over (bubbles) | `<div onmouseover="handleOver()">Hover over</div>` |
| `onmouseup` | Mouse button released | `<button onmouseup="handleMouseUp()">Release</button>` |

**Mouse Event Differences**:
- **`onmouseenter` vs `onmouseover`**: `enter` doesn't bubble, `over` does
- **`onmouseleave` vs `onmouseout`**: `leave` doesn't bubble, `out` does
- **`onclick`**: Fires on mousedown + mouseup

**Example**:
```html
<button 
  onmouseenter="this.style.backgroundColor='blue'"
  onmouseleave="this.style.backgroundColor=''">
  Hover me
</button>
```

### Keyboard Events

Events triggered by keyboard actions:

| Event Attribute | When It Fires | Example |
|-----------------|---------------|---------|
| `onkeydown` | Key is pressed down | `<input onkeydown="handleKeyDown(event)">` |
| `onkeypress` | Key is pressed (deprecated) | `<input onkeypress="handleKeyPress(event)">` |
| `onkeyup` | Key is released | `<input onkeyup="handleKeyUp(event)">` |

**Note**: `onkeypress` is deprecated. Use `onkeydown` instead.

**Example**:
```html
<input 
  type="text" 
  onkeydown="if(event.key === 'Enter') submitForm()"
  placeholder="Press Enter to submit">
```

### Form Events

Events related to forms and form controls:

| Event Attribute | When It Fires | Applies To |
|-----------------|---------------|------------|
| `onblur` | Element loses focus | Input, textarea, select |
| `onchange` | Value changes and loses focus | Input, textarea, select |
| `onfocus` | Element gains focus | Input, textarea, select |
| `onfocusin` | Element about to gain focus (bubbles) | Input, textarea, select |
| `onfocusout` | Element about to lose focus (bubbles) | Input, textarea, select |
| `oninput` | Value changes (immediately) | Input, textarea |
| `oninvalid` | Input validation fails | Input, textarea, select |
| `onreset` | Form is reset | Form |
| `onsearch` | User initiates search | Input type="search" |
| `onselect` | Text is selected | Input, textarea |
| `onsubmit` | Form is submitted | Form |

**Event Differences**:
- **`oninput`**: Fires immediately on every change
- **`onchange`**: Fires when value changes AND element loses focus
- **`onblur` vs `onfocusout`**: `blur` doesn't bubble, `focusout` does
- **`onfocus` vs `onfocusin`**: `focus` doesn't bubble, `focusin` does

**Example**:
```html
<form onsubmit="return validateForm()">
  <input 
    type="text" 
    name="username"
    oninput="checkAvailability(this.value)"
    onblur="validateUsername(this.value)"
    onfocus="showHint()"
    required>
  <button type="submit">Submit</button>
</form>

<input 
  type="search" 
  onsearch="performSearch(this.value)"
  placeholder="Search...">
```

### Clipboard Events

Events triggered by clipboard operations:

| Event Attribute | When It Fires | Example |
|-----------------|---------------|---------|
| `oncopy` | Content is copied | `<p oncopy="alert('Copied!')">Copy this</p>` |
| `oncut` | Content is cut | `<input oncut="handleCut()">` |
| `onpaste` | Content is pasted | `<input onpaste="handlePaste(event)">` |

**Example**:
```html
<input 
  type="text" 
  onpaste="event.preventDefault(); alert('Paste disabled')"
  placeholder="Cannot paste here">
```

### Drag Events

Events for drag-and-drop operations:

| Event Attribute | When It Fires | Target |
|-----------------|---------------|--------|
| `ondrag` | Element is being dragged | Draggable element |
| `ondragend` | Drag operation ends | Draggable element |
| `ondragenter` | Dragged element enters drop target | Drop target |
| `ondragleave` | Dragged element leaves drop target | Drop target |
| `ondragover` | Dragged element is over drop target | Drop target |
| `ondragstart` | Drag operation starts | Draggable element |
| `ondrop` | Element is dropped | Drop target |

**Example**:
```html
<div 
  draggable="true" 
  ondragstart="event.dataTransfer.setData('text', this.id)">
  Drag me
</div>

<div 
  ondragover="event.preventDefault()"
  ondrop="handleDrop(event)">
  Drop here
</div>
```

### Media Events

Events for audio and video elements:

| Event Attribute | When It Fires |
|-----------------|---------------|
| `onabort` | Media loading aborted |
| `oncanplay` | Media can start playing |
| `oncanplaythrough` | Media can play without buffering |
| `ondurationchange` | Duration changes |
| `onemptied` | Media becomes empty |
| `onended` | Media playback ends |
| `onerror` | Error loading media |
| `onloadeddata` | Media data loaded |
| `onloadedmetadata` | Metadata loaded |
| `onloadstart` | Browser starts loading |
| `onpause` | Media is paused |
| `onplay` | Media starts playing |
| `onplaying` | Media is playing after pause/buffer |
| `onprogress` | Browser is downloading media |
| `onratechange` | Playback speed changes |
| `onseeked` | Seeking completes |
| `onseeking` | Seeking starts |
| `onstalled` | Browser trying to get media data |
| `onsuspend` | Browser stops getting media data |
| `ontimeupdate` | Current playback time changes |
| `onvolumechange` | Volume changes |
| `onwaiting` | Media paused waiting for data |

**Example**:
```html
<video 
  src="video.mp4" 
  controls
  onplay="console.log('Playing')"
  onpause="console.log('Paused')"
  onended="console.log('Finished')">
</video>

<audio 
  src="audio.mp3"
  onloadedmetadata="showDuration()"
  ontimeupdate="updateProgress()">
</audio>
```

### Miscellaneous Events

Other useful event attributes:

| Event Attribute | When It Fires | Applies To |
|-----------------|---------------|------------|
| `onscroll` | Element is scrolled | Scrollable elements |
| `ontoggle` | Details element toggled | `<details>` |
| `onwheel` | Mouse wheel scrolled | Any element |

**Example**:
```html
<div onscroll="handleScroll()" style="height: 200px; overflow: auto;">
  <p>Scrollable content...</p>
</div>

<details ontoggle="console.log('Toggled')">
  <summary>Click to toggle</summary>
  <p>Hidden content</p>
</details>
```

### Animation and Transition Events

CSS animation and transition events:

| Event Attribute | When It Fires |
|-----------------|---------------|
| `onanimationend` | CSS animation completes |
| `onanimationiteration` | CSS animation repeats |
| `onanimationstart` | CSS animation starts |
| `ontransitionend` | CSS transition completes |
| `ontransitioncancel` | CSS transition cancelled |
| `ontransitionrun` | CSS transition starts |

**Example**:
```html
<div 
  class="animated"
  onanimationend="console.log('Animation finished')"
  onanimationstart="console.log('Animation started')">
  Animated element
</div>
```

### Touch Events (Mobile)

Touch events for mobile devices:

| Event Attribute | When It Fires |
|-----------------|---------------|
| `ontouchcancel` | Touch interrupted |
| `ontouchend` | Touch ends |
| `ontouchmove` | Touch moves |
| `ontouchstart` | Touch starts |

**Example**:
```html
<div 
  ontouchstart="handleTouchStart(event)"
  ontouchmove="handleTouchMove(event)"
  ontouchend="handleTouchEnd(event)">
  Touch me (mobile)
</div>
```

### Event Object

All event handlers receive an event object with useful properties:

```html
<button onclick="handleClick(event)">Click</button>

<script>
function handleClick(event) {
  console.log('Event type:', event.type);           // 'click'
  console.log('Target element:', event.target);     // <button>
  console.log('Mouse X:', event.clientX);           // X coordinate
  console.log('Mouse Y:', event.clientY);           // Y coordinate
  
  event.preventDefault();  // Prevent default action
  event.stopPropagation(); // Stop event bubbling
}
</script>
```

### Common Patterns

#### Prevent Default Behavior

```html
<!-- Prevent form submission -->
<form onsubmit="return false">...</form>
<form onsubmit="event.preventDefault()">...</form>

<!-- Prevent link navigation -->
<a href="#" onclick="return false">Don't navigate</a>

<!-- Prevent right-click menu -->
<div oncontextmenu="return false">No right-click</div>
```

#### Access Element

```html
<!-- Using 'this' keyword -->
<button onclick="console.log(this.textContent)">Click</button>

<!-- Using event.target -->
<button onclick="console.log(event.target.textContent)">Click</button>

<!-- Passing 'this' explicitly -->
<button onclick="handleClick(this)">Click</button>
```

#### Conditional Execution

```html
<!-- Check key pressed -->
<input onkeydown="if(event.key === 'Enter') submitForm()">

<!-- Check Ctrl key -->
<div onclick="if(event.ctrlKey) console.log('Ctrl + Click')">Click</div>

<!-- Check button (0=left, 1=middle, 2=right) -->
<div onmousedown="if(event.button === 2) console.log('Right click')">Click</div>
```

### Best Practices

#### ✅ Do

1. **Use `addEventListener()` instead** of inline handlers
2. **Call `preventDefault()`** to stop default behavior
3. **Call `stopPropagation()`** to prevent bubbling when needed
4. **Pass `event` object** to handlers for access to event details
5. **Return false** to prevent default (works for some events)
6. **Use semantic events** (onclick for clickable, onsubmit for forms)

#### ❌ Don't

1. **Don't use inline handlers in production** (violates CSP, hard to maintain)
2. **Don't use `onkeypress`** (deprecated, use `onkeydown`)
3. **Don't forget to prevent default** when needed (links, forms)
4. **Don't mix inline and addEventListener** (confusing)
5. **Don't put complex logic inline** (use external functions)
6. **Don't use `onclick` on non-interactive elements** (use buttons/links)

### Modern Alternative: addEventListener()

**Why addEventListener is better**:

```html
<!-- ❌ Inline: Limited to one handler -->
<button onclick="doA()">Click</button>

<!-- ✅ addEventListener: Multiple handlers -->
<button id="btn">Click</button>
<script>
  const btn = document.getElementById('btn');
  btn.addEventListener('click', doA);
  btn.addEventListener('click', doB);  // Both run!
  btn.addEventListener('click', doC);  // All three run!
</script>
```

**Separation of concerns**:

```html
<!-- ❌ Inline: Mixed HTML and JavaScript -->
<button onclick="alert('Clicked')">Click</button>

<!-- ✅ Separate: Clean HTML, JS in script -->
<button id="myBtn">Click</button>
<script>
  document.getElementById('myBtn').addEventListener('click', function() {
    alert('Clicked');
  });
</script>
```

**CSP compatibility**:

```html
<!-- ❌ Inline: Blocked by strict CSP -->
<button onclick="alert('Blocked')">Click</button>

<!-- ✅ External: Allowed by CSP -->
<button id="btn">Click</button>
<script src="app.js"></script>
<!-- app.js: document.getElementById('btn').addEventListener('click', ...) -->
```

### Quick Reference Table

#### Most Common Events

| Event | Use For | Example |
|-------|---------|---------|
| `onclick` | Click actions | Buttons, links |
| `onsubmit` | Form submission | Forms |
| `oninput` | Real-time input | Search, validation |
| `onchange` | Final value change | Select, checkbox |
| `onload` | Page/image load | Body, images |
| `onkeydown` | Keyboard shortcuts | Inputs, body |
| `onmouseenter` | Hover effects | Any element |
| `onfocus` | Input focus | Form fields |
| `onblur` | Input unfocus | Form fields |

#### Event Order

**Mouse Click**:
1. `onmousedown`
2. `onmouseup`
3. `onclick`

**Form Submission**:
1. `onsubmit` (can prevent)
2. Form submits

**Input Change**:
1. `oninput` (every keystroke)
2. `onchange` (on blur)

**Page Load**:
1. `DOMContentLoaded` (not an attribute)
2. `onload`

### Debugging Events

```html
<!-- Log all event details -->
<button onclick="console.log(event)">Debug Event</button>

<!-- See event properties -->
<div onclick="console.table({
  type: event.type,
  target: event.target.tagName,
  x: event.clientX,
  y: event.clientY,
  ctrlKey: event.ctrlKey,
  shiftKey: event.shiftKey
})">Click to inspect</div>
```

### Resource

For complete reference, see:
- **MDN Event Reference**: https://developer.mozilla.org/en-US/docs/Web/Events
- **addEventListener()**: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
