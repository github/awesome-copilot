# HTML Essentials

Essential HTML concepts, techniques, and best practices for modern web development.

## HTML Comments

Comments add notes to code without affecting display. Browsers ignore comments.

**Syntax**:
```html
<!-- Single line comment -->

<!--
  Multi-line comment
  spanning several lines
-->
```

**Usage**:
- Add explanatory notes about code
- Temporarily disable HTML without deleting it
- Document complex sections
- Leave notes for collaborators

**Rules**:
- Can be placed before/after DOCTYPE and `<html>`
- Can be used as content in most elements
- **Cannot** be used inside tags (e.g., within attributes)
- **Cannot** be nested
- Not allowed in `<script>`, `<style>`, `<title>`, `<textarea>` (raw text elements)
- First `-->` after `<!--` closes the comment

**Example**:
```html
<!-- Navigation section -->
<nav>
  <ul>
    <li><a href="/">Home</a></li>
    <!-- <li><a href="/old">Old Page</a></li> Disabled temporarily -->
    <li><a href="/contact">Contact</a></li>
  </ul>
</nav>
```

## Content Categories

HTML elements belong to content categories that define what they can contain and where they can be used.

### Main Categories

**1. Metadata Content**
- Elements in `<head>` that modify presentation or link to resources
- Examples: `<base>`, `<link>`, `<meta>`, `<noscript>`, `<script>`, `<style>`, `<template>`, `<title>`

**2. Flow Content**
- Broad category of most elements that can go in `<body>`
- Includes headings, sections, text, embedded content, interactive elements, forms
- Most common elements are flow content

**3. Sectioning Content**
- Defines document sections and creates outline structure
- Elements: `<article>`, `<aside>`, `<nav>`, `<section>`
- Defines scope of `<header>` and `<footer>`

**4. Heading Content**
- Defines section titles
- Elements: `<h1>` through `<h6>`, `<hgroup>`

**5. Phrasing Content**
- Text and inline markup within a document
- Examples: `<a>`, `<abbr>`, `<audio>`, `<b>`, `<bdi>`,  `<bdo>`, `<br>`, `<button>`, `<cite>`, `<code>`, `<data>`, `<em>`, `<i>`, `<img>`, `<input>`, `<kbd>`, `<label>`, `<mark>`, `<q>`, `<s>`, `<small>`, `<span>`, `<strong>`, `<sub>`, `<sup>`, `<time>`, `<u>`, `<var>`, `<video>`

**6. Embedded Content**
- Imports resources or inserts content from other sources
- Elements: `<audio>`, `<canvas>`, `<embed>`, `<iframe>`, `<img>`, `<math>`, `<object>`, `<picture>`, `<svg>`, `<video>`

**7. Interactive Content**
- Elements designed for user interaction
- Examples: `<button>`, `<details>`, `<embed>`, `<iframe>`, `<label>`, `<select>`, `<textarea>`
- Conditional: `<a>` (with href), `<audio>`/`<video>` (with controls), `<input>` (not hidden type)

**8. Palpable Content**
- Content that is rendered and substantial (not empty or hidden)
- Must contain at least one node that is not hidden

### Form-Associated Content

Elements with a form owner (containing `<form>` or linked via `form` attribute):

- **Listed**: In form element collections (`<button>`, `<fieldset>`, `<input>`, `<object>`, `<output>`, `<select>`, `<textarea>`)
- **Submittable**: Used in form data (`<button>`, `<input>`, `<select>`, `<textarea>`)  
- **Resettable**: Affected by form reset (`<input>`, `<output>`, `<select>`, `<textarea>`)
- **Labelable**: Can associate with `<label>` (most form elements except hidden inputs)

### Transparent Content Model

Some elements have "transparent" content - their permitted content is determined by their parent element. Examples: `<a>`, `<ins>`, `<del>`, `<map>`

## Responsive Images

Techniques for serving appropriate images based on device capabilities.

### The Problem

- **Resolution switching**: Smaller images for mobile, larger for desktop
- **Art direction**: Different cropped/composed images for different layouts
- **Pixel density**: Higher resolution images for Retina/high-DPI displays

### Solution 1: srcset and sizes

For serving different image sizes/resolutions:

```html
<img 
  srcset="small.jpg 480w,
          medium.jpg 800w,
          large.jpg 1200w"
  sizes="(max-width: 600px) 480px,
         (max-width: 900px) 800px,
         1200px"
  src="medium.jpg"
  alt="Description"
/>
```

**How it works**:
1. Browser checks screen size, pixel density, zoom, orientation, network speed
2. Finds first true media condition in `sizes`
3. Loads image from `srcset` matching that slot size
4. Falls back to `src` for older browsers

**`srcset` syntax**: `filename width`, e.g., `photo.jpg 800w`
**`sizes` syntax**: `(media-condition) slot-width`, last value is default

### Solution 2: x-descriptors for Pixel Density

For same size, different resolutions:

```html
<img
  srcset="image.jpg,
          image-1.5x.jpg 1.5x,
          image-2x.jpg 2x"
  src="image.jpg"
  alt="Description"
  width="320"
/>
```

Browser picks appropriate resolution based on device pixel ratio.

### Solution 3: Picture Element for Art Direction

Different images for different layouts:

```html
<picture>
  <source media="(max-width: 799px)" srcset="portrait-crop.jpg">
  <source media="(min-width: 800px)" srcset="landscape.jpg">
  <img src="landscape.jpg" alt="Description">
</picture>
```

**Rules**:
- `<source>` elements test media conditions
- First matching condition's image is used  
- `<img>` is required as fallback
- Can combine with `srcset` and `sizes` on `<source>`

### Why Not CSS or JavaScript?

Browsers preload images before CSS/JavaScript parse, so responsive image solutions must be in HTML.

## Media Formats

### Image Formats

- **JPEG**: Photos, complex images, good compression
- **PNG**: Images needing transparency, sharp edges
- **GIF**: Simple animations, limited colors
- **SVG**: Vector graphics, logos, icons, scales perfectly
- **WebP**: Modern format, better compression, good browser support
- **AVIF**: Newest format, excellent compression, growing support

### Audio Formats

- **MP3**: Universal support, good compression
- **AAC**: Better quality than MP3 at same bitrate
- **OGG Vorbis**: Open format, good quality
- **WAV**: Uncompressed, large files, best quality
- **FLAC**: Lossless compression, better than WAV size

### Video Formats

- **MP4 (H.264)**: Universal support, good quality
- **WebM (VP8/VP9)**: Open format, good compression
- **OGG (Theora)**: Open format, older
- **MP4 (H.265/HEVC)**: Better compression than H.264
- **AV1**: Newest, best compression, growing support

**Always provide multiple formats for compatibility**:

```html
<audio controls>
  <source src="audio.mp3" type="audio/mpeg">
  <source src="audio.ogg" type="audio/ogg">
  Fallback text for unsupported browsers
</audio>

<video controls width="640">
  <source src="video.mp4" type="video/mp4">
  <source src="video.webm" type="video/webm">
  Fallback text
</video>
```

## Audio and Video Elements

### Audio Element

```html
<audio controls>
  <source src="song.mp3" type="audio/mpeg">
  <source src="song.ogg" type="audio/ogg">
  Your browser doesn't support audio.
</audio>
```

**Attributes**:
- `controls` - Show playback controls
- `autoplay` - Start automatically (usually blocked by browsers)
- `loop` - Repeat playback
- `muted` - Start muted
- `preload` - none, metadata, auto

### Video Element

```html
<video controls width="640" height="360" poster="thumbnail.jpg">
  <source src="video.mp4" type="video/mp4">
  <source src="video.webm" type="video/webm">
  <track kind="subtitles" src="subs-en.vtt" srclang="en" label="English">
  Your browser doesn't support video.
</video>
```

**Attributes**:
- `controls` - Show playback controls
- `width`, `height` - Dimensions (maintain aspect ratio)
- `poster` - Image shown before playback
- `autoplay` - Auto-start (use with `muted`)
- `loop` - Repeat playback
- `muted` - Start muted
- `preload` - none, metadata, auto

**Tracks** (captions/subtitles):
```html
<track kind="subtitles" src="subs.vtt" srclang="en" label="English" default>
```

Kinds: `subtitles`, `captions`, `descriptions`, `chapters`, `metadata`

## Form Validation

HTML5 provides built-in validation before JavaScript.

### Validation Attributes

```html
<input type="email" required>
<input type="url" required>
<input type="number" min="0" max="100" step="5">
<input type="text" pattern="[A-Za-z]{3,}" title="At least 3 letters">
<input type="text" minlength="3" maxlength="20">
```

**Common validation attributes**:
- `required` - Field must be filled
- `pattern` - Regex pattern to match
- `min`, `max` - Numeric/date range
- `minlength`, `maxlength` - String length
- `step` - Increment for numbers
- `type` - Built-in validation (email, url, tel, etc.)

### Input Types with Validation

- `email` - Validates email format
- `url` - Validates URL format
- `tel` - Telephone number
- `number` - Numeric input
- `range` - Slider
- `date`, `time`, `datetime-local` - Date/time pickers
- `color` - Color picker

### Constraint Validation API

Check validation via JavaScript:

```javascript
const input = document.querySelector('input');
if (input.checkValidity()) {
  // Valid
} else {
  console.log(input.validationMessage);
}
```

## Date and Time Formats

The `<time>` element and datetime attributes use ISO 8601 format.

```html
<!-- Date only -->
<time datetime="2026-03-08">March 8, 2026</time>

<!-- Time only -->
<time datetime="14:30">2:30 PM</time>

<!-- Date and time -->
<time datetime="2026-03-08T14:30">March 8, 2026 at 2:30 PM</time>

<!-- With timezone -->
<time datetime="2026-03-08T14:30:00-05:00">2:30 PM EST</time>

<!-- Duration -->
<time datetime="PT2H30M">2 hours 30 minutes</time>
```

**Format patterns**:
- Date: `YYYY-MM-DD`
- Time: `HH:MM` or `HH:MM:SS`
- Combined: `YYYY-MM-DDTHH:MM:SS`
- Timezone: `+HH:MM` or `-HH:MM` or `Z` (UTC)
- Duration: `P` prefix, e.g., `PT2H` (2 hours)

## Quirks Mode and Standards Mode

Browsers render pages in different  modes based on DOCTYPE:

**Standards Mode** (recommended):
```html
<!DOCTYPE html>
```
- Follows modern web standards
- Consistent, predictable rendering

**Quirks Mode**:
- No DOCTYPE or old DOCTYPE
- Emulates old browser bugs for legacy sites
- **Avoid this!**

**Limited Quirks Mode**:
- Some old DOCTYPEs trigger this
- Between standards and quirks

**Always use `<!DOCTYPE html>` for standards mode.**

## Microdata

Add machine-readable data to HTML:

```html
<div itemscope itemtype="https://schema.org/Person">
  <h1 itemprop="name">John Doe</h1>
  <img itemprop="image" src="photo.jpg" alt="John">
  <p itemprop="jobTitle">Software Engineer</p>
  <a itemprop="url" href="https://example.com">Website</a>
</div>
```

**Attributes**:
- `itemscope` - Creates item
- `itemtype` - Defines type (URL to vocabulary)
- `itemprop` - Names property

Common vocabularies at [Schema.org](https://schema.org)

## Microformats

Simpler alternative to microdata using class names:

```html
<div class="h-card">
  <span class="p-name">John Doe</span>
  <span class="p-org">Company Inc</span>
  <a class="u-email" href="mailto:john@example.com">Email</a>
</div>
```

Common microformats: `h-card` (person), `h-entry` (blog post), `h-event` (event)

## Best Practices

1. **Always use `<!DOCTYPE html>`** - Ensures standards mode
2. **Provide multiple media formats** - For cross-browser support
3. **Use responsive images** - Optimize for device and bandwidth
4. **Leverage HTML5 validation** - Before adding JavaScript
5. **Add meaningful metadata** - Microdata/microformats for SEO
6. **Comment complex sections** - Help future maintainers
7. **Test different devices** - Responsive images and media
8. **Include fallback content** - For unsupported features
9. **Use semantic elements** - Follow content categories
10. **Validate regularly** - Check with W3C validator

## Resources

- [MDN: HTML Comments](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Comments)
- [MDN: Content Categories](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Content_categories)
- [MDN: Responsive Images](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images)
- [MDN: Constraint Validation](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Constraint_validation)
- [MDN: Date and Time Formats](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Date_and_time_formats)
- [MDN: Media Formats](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats)
- [Schema.org](https://schema.org)
- [Microformats Wiki](http://microformats.org/wiki/)
