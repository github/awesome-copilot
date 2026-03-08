# HTML How-To Guides

Practical guides for specific HTML tasks and techniques.

## Define Terms with HTML

HTML provides semantic elements for defining keywords and creating glossaries.

### Inline Definitions with `<dfn>`

Mark the first occurrence of a keyword being defined:

```html
<p><dfn>Firefox</dfn> is the web browser created by the Mozilla Foundation.</p>
```

The `<dfn>` element wraps the term being defined, not the definition itself. The paragraph containing it provides the definition.

### Defining Abbreviations

Combine `<dfn>` with `<abbr>` for abbreviations:

```html
<p>
  <dfn><abbr>HTML</abbr> (HyperText Markup Language)</dfn>
  is a markup language used to structure documents on the web.
</p>
```

**Note**: Don't rely on the `title` attribute for expanding abbreviations - it's not accessible. Always provide the expansion inline.

### Improve Accessibility

Link terms to definitions explicitly using `aria-describedby`:

```html
<p>
  <span id="firefox-def">
    <dfn aria-describedby="firefox-def">Firefox</dfn>
    is the web browser created by the Mozilla Foundation.
  </span>
</p>
```

### Description Lists

For glossaries, dictionaries, FAQs, or key-value pairs, use description lists:

```html
<dl>
  <dt>HTML</dt>
  <dd>HyperText Markup Language - structures web documents</dd>
  
  <dt>CSS</dt>
  <dd>Cascading Style Sheets - styles web documents</dd>
  
  <dt>JavaScript</dt>
  <dd>Programming language for web interactivity</dd>
</dl>
```

**Structure**:
- `<dl>` - Description list wrapper
- `<dt>` - Term being described
- `<dd>` - Description of the term

**Patterns**:
- Multiple `<dt>` in a row: following `<dd>` applies to all
- Multiple `<dd>` in a row: all apply to the last `<dt>`

**Style with CSS**:
```css
dt {
  font-weight: bold;
}

dd {
  margin-left: 2em;
  margin-bottom: 0.5em;
}
```

**Not suitable for**: Dialog or conversation markup (speakers don't describe each other).

## Use Data Attributes

Custom data attributes (`data-*`) store extra information on HTML elements without hacks.

### HTML Syntax

Any attribute starting with `data-` is a data attribute:

```html
<article 
  id="electric-cars"
  data-columns="3"
  data-index-number="12314"
  data-parent="cars">
  <!-- Content -->
</article>
```

### JavaScript Access

Access via the `dataset` property (dashes become camelCase):

```javascript
const article = document.querySelector('#electric-cars');

// Read
console.log(article.dataset.columns);      // "3"
console.log(article.dataset.indexNumber);  // "12314" (camelCase)
console.log(article.dataset.parent);       // "cars"

// Write
article.dataset.columns = "4";

// Query with data attributes
const articles = document.querySelectorAll('[data-columns]');
const threeCol = document.querySelectorAll('[data-columns="3"]');
```

### CSS Access

Use data attributes in CSS selectors and generated content:

```css
/* Style based on data attribute */
article[data-columns="3"] {
  width: 400px;
}

article[data-columns="4"] {
  width: 600px;
}

/* Display data value */
article::before {
  content: attr(data-parent);
}
```

### Style Variants Pattern

Instead of multiple classes:

```html
<!-- Traditional approach -->
<div class="callout callout--note">...</div>
<div class="callout callout--warning">...</div>

<!-- Data attribute approach -->
<div class="callout" data-variant="note">...</div>
<div class="callout" data-variant="warning">...</div>
```

```css
.callout {
  margin: 0.5em 0;
  padding: 0.5em;
  border-radius: 4px;
  border: 2px solid;
}

.callout:not([data-variant]) {
  border-color: rgb(15 15 15);
  background-color: rgb(15 15 15 / 0.2);
}

.callout[data-variant="note"] {
  border-color: rgb(15 15 235);
  background-color: rgb(15 15 235 / 0.2);
}

.callout[data-variant="warning"] {
  border-color: rgb(235 15 15);
  background-color: rgb(235 15 15 / 0.2);
}
```

**Benefits**:
- Eliminates invalid states (multiple variants simultaneously)
- Better for static analysis and type checking
- Intuitive toggling: `element.dataset.variant = "warning"`

### Lazy Loading Pattern

Store initial data in `data-*` attributes, load on demand:

```html
<img data-src="large-image.jpg" alt="Description">
```

```javascript
const images = document.querySelectorAll('img[data-src]');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      delete img.dataset.src;
      observer.unobserve(img);
    }
  });
});

images.forEach(img => observer.observe(img));
```

### Important Cautions

**Don't use data attributes for**:
- Content that should be visible and accessible
- Content that search engines should index

Data attributes are for:
- Storing configuration or state
- JavaScript-only data
- Associating non-visible metadata

## Author Fast-Loading HTML Pages

Optimize page load performance for better user experience and reduced server load.

### Reduce Page Weight

**Minimize files**:
- Remove unnecessary whitespace and comments
- Move inline CSS to external stylesheets
- Move inline scripts to external files
- Use minification tools (HTML Tidy, Terser, etc.)

**Compress assets**:
- Enable gzip/brotli compression on server
- Minify and compress images
- Optimize and compress SVG files

### Minimize HTTP Requests

**Reduce file count**:
- Combine CSS files where possible
- Combine JavaScript files
- Use CSS sprites for multiple background images
- Inline critical CSS for above-the-fold content

**Each file requires**:
- DNS lookup
- TCP connection
- HTTP request/response
- Parsing and execution time

### Use a Content Delivery Network (CDN)

**Benefits**:
- Reduced latency through geographic distribution
- Cached content served from nearest node
- Offloads traffic from origin server
- Often includes automatic optimization

### Reduce Domain Lookups

Each unique domain requires DNS lookup time. Minimize different domains for:
- CSS files
- JavaScript files
- Image sources
- External resources

Balance with parallel download limits (browsers typically allow 6 connections per domain).

### Cache Reused Content

**Set proper cache headers**:
- `Last-Modified` - File modification timestamp
- `ETag` - Resource version identifier
- `Cache-Control` - Caching directives
- `Expires` - Expiration date

```http
Cache-Control: public, max-age=31536000
ETag: "abc123"
Last-Modified: Wed, 21 Oct 2025 07:28:00 GMT
```

**For static files**: Server usually handles automatically
**For dynamic pages**: Manually set caching headers when appropriate

### Optimize Loading Order

**Page structure**:
1. HTML content (above-the-fold first)
2. Critical CSS required for initial display
3. Deferred JavaScript after content
4. Additional resources loaded progressively

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Page Title</title>
  <!-- Critical CSS inline or linked -->
  <link rel="stylesheet" href="critical.css">
</head>
<body>
  <!-- Main content here -->
  <main>
    <h1>Content</h1>
    <p>Visible content loads first...</p>
  </main>
  
  <!-- Scripts at end of body -->
  <script src="script.js" defer></script>
</body>
</html>
```

### Reduce Inline Scripts

**Problems with inline scripts**:
- Block HTML parsing
- Can't be cached
- `document.write()` is particularly harmful

**Better approach**:
```html
<!-- Bad: Inline script blocks parsing -->
<script>
  document.write('<div>Content</div>');
</script>

<!-- Good: External script with async/defer -->
<script src="script.js" defer></script>

<!-- Good: Modern DOM manipulation -->
<script>
  const div = document.createElement('div');
  div.textContent = 'Content';
  document.body.appendChild(div);
</script>
```

### Use Async and Defer

**Script loading attributes**:

```html
<!-- Defer: Load in parallel, execute after HTML parsing -->
<script src="script.js" defer></script>

<!-- Async: Load and execute independently, don't block -->
<script src="analytics.js" async></script>

<!-- Regular: Blocks parsing (avoid) -->
<script src="script.js"></script>
```

**When to use**:
- `defer` - Scripts that need DOM or maintain order
- `async` - Independent scripts (analytics, ads)
- Neither - Only if script must run immediately

### Use Modern CSS and Valid Markup

**Benefits of valid HTML**:
- No browser error correction needed
- Faster parsing
- Tools can pre-process reliably
- Better for minification

**Valid markup allows**:
- HTML Tidy whitespace removal
- Tree shaking unused code
- Better compression ratios

### Avoid Layout Tables

**Don't use tables for layout** (legacy method):
```html
<!-- Bad: Table layout -->
<table>
  <tr>
    <td>Sidebar</td>
    <td>Main content</td>
  </tr>
</table>
```

**Use modern CSS layout**:
```css
/* Good: Flexbox layout */
.container {
  display: flex;
}

/* Good: Grid layout */
.container {
  display: grid;
  grid-template-columns: 250px 1fr;
}
```

**Tables are for tabular data only.**

### Specify Image and Table Dimensions

**Improves loading**:
- Browser reserves space immediately
- No reflow when content loads
- Smoother page appearance

```html
<!-- Specify dimensions -->
<img src="photo.jpg" width="800" height="600" alt="Photo">

<!-- For tables -->
<table style="table-layout: fixed; width: 100%;">
  <colgroup>
    <col style="width: 200px;">
    <col style="width: 400px;">
  </colgroup>
  <!-- table content -->
</table>
```

### Use Lazy Loading

**Defer image loading until needed**:

```html
<!-- Lazy load images -->
<img src="photo.jpg" loading="lazy" alt="Description">

<!-- Eager loading (default) -->
<img src="hero.jpg" loading="eager" alt="Hero image">
```

**How it works**:
- `loading="eager"` - Load immediately (default)
- `loading="lazy"` - Load when near viewport
- Reduces initial page load time
- Saves bandwidth for images never seen

**Check if loaded**:
```javascript
const img = document.querySelector('img');
if (img.complete) {
  console.log('Image loaded');
}
```

### Optimize Images and SVGs

**Image optimization**:
- Compress before uploading (Photoshop, TinyPNG, etc.)
- Use appropriate format (JPEG for photos, PNG for graphics, WebP for modern browsers)
- Serve scaled images (don't send 2000px image for 300px display)
- Use responsive images (`srcset`, `<picture>`)

**SVG optimization**:
- Remove unnecessary metadata
- Enable gzip compression on server
- Use SVGO or similar tools
- Inline small SVGs to avoid HTTP request

## Use Cross-Origin Images

Enable cross-origin image use in `<canvas>` elements.

### The Problem

Canvas tainted by cross-origin images cannot be read:

```javascript
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const img = new Image();
img.src = 'https://other-domain.com/image.jpg';
img.onload = () => {
  ctx.drawImage(img, 0, 0);
  // This will throw security error:
  canvas.toDataURL();  // Error: canvas is tainted
};
```

### The Solution

Use CORS-enabled images:

```javascript
const img = new Image();
img.crossOrigin = 'anonymous';  // or 'use-credentials'
img.src = 'https://other-domain.com/image.jpg';
```

```html
<img src="https://other-domain.com/image.jpg" crossorigin="anonymous">
```

### Server Requirements

Server must send CORS headers:

```http
Access-Control-Allow-Origin: *
```

Or specific origin:

```http
Access-Control-Allow-Origin: https://your-domain.com
```

## Add Image Maps

Create clickable regions on images.

### Basic Image Map

```html
<img src="workplace.jpg" alt="Workplace" usemap="#workmap">

<map name="workmap">
  <area shape="rect" coords="34,44,270,350" 
        href="computer.html" alt="Computer">
  <area shape="rect" coords="290,172,333,250" 
        href="phone.html" alt="Phone">
  <area shape="circle" coords="337,300,44" 
        href="coffee.html" alt="Coffee">
</map>
```

### Shape Types

**Rectangle**: `shape="rect" coords="x1,y1,x2,y2"`
- x1,y1 = top-left corner
- x2,y2 = bottom-right corner

**Circle**: `shape="circle" coords="x,y,radius"`
- x,y = center point
- radius = circle radius

**Polygon**: `shape="poly" coords="x1,y1,x2,y2,x3,y3,..."`
- Each pair is a vertex point

**Default**: `shape="default"` - entire image

### JavaScript Interaction

```javascript
const areas = document.querySelectorAll('area');
areas.forEach(area => {
  area.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('Clicked:', area.alt);
    // Custom behavior
  });
});
```

## Add JavaScript to Your Web Page

Multiple ways to include JavaScript in HTML.

### Inline JavaScript

```html
<button onclick="alert('Clicked!')">Click Me</button>
```

**Pros**: Quick for tiny scripts
**Cons**: Not maintainable, no caching, violates separation of concerns

### Internal Script

```html
<script>
  function doSomething() {
    console.log('Doing something');
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    doSomething();
  });
</script>
```

**Pros**: No external request
**Cons**: Not cached, not reusable

### External Script (Recommended)

```html
<script src="script.js"></script>
```

**Pros**: Cached, reusable, maintainable, separates concerns
**Cons**: Additional HTTP request (minimal with caching)

### Script Placement

**End of body** (traditional):
```html
<body>
  <!-- content -->
  <script src="script.js"></script>
</body>
```

**Head with defer** (modern):
```html
<head>
  <script src="script.js" defer></script>
</head>
```

**Head with async** (independent scripts):
```html
<head>
  <script src="analytics.js" async></script>
</head>
```

### Module Scripts

```html
<script type="module" src="module.js"></script>
```

**Features**:
- Deferred by default
- Strict mode enabled
- Can use import/export
- Separate scope

## Best Practices

1. **Semantic HTML**: Use elements that convey meaning (`<dfn>`, `<dl>`, `<abbr>`)
2. **Data attributes**: Store JavaScript-only data, not visible content
3. **Performance**: Minimize requests, optimize images, use lazy loading
4. **Valid markup**: Enables optimization tools and faster parsing
5. **External resources**: Use external CSS/JS files for caching
6. **Async loading**: Use `async`/`defer` for non-critical scripts
7. **Accessibility**: Keep visible content in HTML, not data attributes
8. **Progressive enhancement**: Content loads first, enhancement after

## Resources

- [MDN: Define Terms](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/Define_terms_with_HTML)
- [MDN: Use Data Attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/Use_data_attributes)
- [MDN: Fast-Loading Pages](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/Author_fast-loading_HTML_pages)
- [MDN: CORS Enabled Images](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image)
- [MDN: Add JavaScript](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/Add_JavaScript_to_your_web_page)
