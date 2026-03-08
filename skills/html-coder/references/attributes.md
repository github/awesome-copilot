# HTML Attributes Reference

Comprehensive guide to common HTML attributes, input types, script configurations, and meta element usage.

## Input Types (`<input type="...">`)

The `type` attribute determines the behavior and appearance of input controls.

### Text-Based Input Types

| Type | Purpose | Key Attributes |
|------|---------|----------------|
| `text` | Single-line text (default) | `maxlength`, `minlength`, `pattern`, `placeholder`, `size` |
| `password` | Obscured text for passwords | `maxlength`, `minlength`, `pattern` |
| `email` | Email address validation | `multiple`, `pattern`, `placeholder` |
| `url` | URL validation | `pattern`, `placeholder` |
| `tel` | Telephone number input | `pattern`, `placeholder` |
| `search` | Search field with clear button | `placeholder`, `list` |
| `textarea` | Multi-line text (separate element) | `rows`, `cols`, `maxlength`, `wrap` |

### Date and Time Input Types

| Type | Format | Example |
|------|--------|---------|
| `date` | Year-month-day | 2024-01-15 |
| `datetime-local` | Date and time, no timezone | 2024-01-15T14:30 |
| `month` | Year and month | 2024-01 |
| `week` | Year and week number | 2024-W03 |
| `time` | Hours and minutes | 14:30 |

**Common attributes**: `min`, `max`, `step`

### Numeric Input Types

| Type | Purpose | Attributes |
|------|---------|------------|
| `number` | Numeric input with spinner | `min`, `max`, `step` |
| `range` | Slider control | `min`, `max`, `step` |

### Selection Input Types

| Type | Purpose | Usage |
|------|---------|-------|
| `checkbox` | Toggle option on/off | Groups by `name`, checked individually |
| `radio` | Select one from group | Same `name` required for grouping |
| `select` | Dropdown menu (separate element) | Contains `<option>` elements |

### File and Media Input Types

| Type | Purpose | Attributes |
|------|---------|------------|
| `file` | File upload | `accept`, `multiple`, `capture` |
| `color` | Color picker | `value` (hex color) |
| `image` | Graphical submit button | `src`, `alt`, `width`, `height` |

### Button Input Types

| Type | Purpose | Default Behavior |
|------|---------|-----------------|
| `button` | Generic button | None (requires JavaScript) |
| `submit` | Form submission | Submits form to `action` URL |
| `reset` | Form reset (not recommended) | Resets all fields to default |

### Special Input Types

| Type | Purpose |
|------|---------|
| `hidden` | Invisible data field |

### Deprecated Input Type

| Type | Status | Alternative |
|------|--------|-------------|
| `datetime` | Deprecated | Use `datetime-local` |

## Common Input Attributes

### Form Control Attributes

| Attribute | Valid For | Purpose |
|-----------|-----------|---------|
| `name` | All except image/button without form | Identifies field in form submission |
| `value` | All | Initial/current value of control |
| `id` | All | Unique identifier for labeling |
| `required` | Most types | Field must be filled before submission |
| `disabled` | All | Prevents interaction and submission |
| `readonly` | Text-based types | Prevents editing but allows submission |
| `autofocus` | All | Automatically focused on page load |
| `placeholder` | Text-based types | Hint text displayed when empty |

### Validation Attributes

| Attribute | Valid For | Purpose |
|-----------|-----------|---------|
| `pattern` | Text-based types | Regular expression for validation |
| `min` | Numeric, date/time | Minimum value |
| `max` | Numeric, date/time | Maximum value |
| `minlength` | Text-based types | Minimum character count |
| `maxlength` | Text-based types | Maximum character count |
| `step` | Numeric, date/time | Increment value (`any` allows decimals) |

### Autocomplete Attributes

| Attribute | Purpose | Values |
|-----------|---------|--------|
| `autocomplete` | Browser autofill behavior | `on`, `off`, or specific values (e.g., `name`, `email`, `tel`) |
| `list` | Links to `<datalist>` | ID of datalist element |
| `multiple` | Multiple values | For `email` and `file` types |

### Form Override Attributes

Valid only for `submit` and `image` types:

| Attribute | Overrides |
|-----------|-----------|
| `formaction` | Form's `action` |
| `formenctype` | Form's `enctype` |
| `formmethod` | Form's `method` |
| `formnovalidate` | Form's validation |
| `formtarget` | Form's `target` |

### Other Input Attributes

| Attribute | Valid For | Purpose |
|-----------|-----------|---------|
| `checked` | `checkbox`, `radio` | Initially checked state |
| `accept` | `file` | Allowed file types (e.g., `image/*`, `.pdf`) |
| `capture` | `file` | Media capture method (`user`, `environment`) |
| `size` | Text-based types | Visual width in characters |
| `src` | `image` | Image URL |
| `alt` | `image` | Alternative text |
| `width`, `height` | `image` | Image dimensions |
| `dirname` | Text types | Submits text directionality (`ltr`/`rtl`) |

## Script Types (`<script type="...">`)

### Standard Script Types

| Type | Purpose | Behavior |
|------|---------|----------|
| **(default)** | Classic JavaScript | Blocks parsing, executes immediately |
| `text/javascript` | Classic JavaScript (explicit) | Same as default (optional to specify) |
| `module` | ES6 module script | Deferred, strict mode, separate scope |
| `importmap` | Import map for modules | JSON configuration for module imports |
| `speculationrules` | Speculation rules (experimental) | JSON for prefetch/prerender configuration |

### Data Block Types

Any non-JavaScript MIME type creates a data block:

```html
<script type="application/json" id="data">
  {"key": "value"}
</script>
```

Access via: `JSON.parse(document.getElementById('data').textContent)`

### Script Attributes

| Attribute | Purpose | Compatible With |
|-----------|---------|-----------------|
| `async` | Load asynchronously, execute when ready | Classic scripts, external files |
| `defer` | Load asynchronously, execute after parsing | Classic scripts, external files |
| `src` | External script URL | All types |
| `integrity` | SRI hash for security verification | External files |
| `crossorigin` | CORS mode | External files (`anonymous`, `use-credentials`) |
| `referrerpolicy` | Referrer policy | External files |
| `nomodule` | Skip in module-supporting browsers | Fallback scripts |
| `blocking="render"` | Blocks rendering until loaded | Scripts in `<head>` |

**Loading Behavior Comparison**:

- **No attributes**: Blocks parsing, executes immediately
- **`async`**: Loads in parallel, executes as soon as loaded (order not guaranteed)
- **`defer`**: Loads in parallel, executes after DOM parsing in document order
- **`type="module"`**: Deferred by default

## Meta Element Attributes

### Meta Charset

Specifies character encoding (must be UTF-8):

```html
<meta charset="UTF-8">
```

### Meta Name/Content Pairs

Common `name` values:

| Name | Purpose | Content Examples |
|------|---------|------------------|
| `description` | Page description for search engines | Max 155 characters |
| `keywords` | Keywords (largely ignored by search engines) | Comma-separated list |
| `author` | Document author | Name or organization |
| `viewport` | Mobile viewport configuration | `width=device-width, initial-scale=1` |
| `theme-color` | Browser UI color | Hex color (`#4285f4`) |
| `color-scheme` | Preferred color scheme | `light`, `dark`, `light dark` |
| `referrer` | Referrer policy | `no-referrer`, `origin`, etc. |
| `robots` | Search engine indexing instructions | `index,follow`, `noindex`, etc. |
| `generator` | Software that generated the page | Application name |

### Meta HTTP-Equiv

Simulates HTTP headers:

| http-equiv | Purpose | Content Examples |
|------------|---------|------------------|
| `content-type` | MIME type and charset (deprecated, use `<meta charset>`) | `text/html; charset=UTF-8` |
| `refresh` | Auto-refresh or redirect | `5`, `3;url=https://example.com` |
| `content-security-policy` | CSP directives | `default-src 'self'` |
| `x-ua-compatible` | IE compatibility mode | `IE=edge` |

### Viewport Configuration

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

**Viewport Properties**:

| Property | Values | Purpose |
|----------|--------|---------|
| `width` | Pixels or `device-width` | Viewport width |
| `height` | Pixels or `device-height` | Viewport height |
| `initial-scale` | 0-10 | Initial zoom level |
| `minimum-scale` | 0-10 | Minimum zoom level |
| `maximum-scale` | 0-10 | Maximum zoom level |
| `user-scalable` | `yes`, `no` | Allow pinch zoom |
| `viewport-fit` | `auto`, `contain`, `cover` | Safe area insets (notches) |
| `interactive-widget` | `resizes-visual`, `resizes-content`, `overlays-content` | On-screen keyboard behavior |

## Link Relationship Types (`<link rel="...">`)

| rel Value | Purpose | Example |
|-----------|---------|---------|
| `stylesheet` | External CSS file | `<link rel="stylesheet" href="style.css">` |
| `icon` | Favicon | `<link rel="icon" href="favicon.ico">` |
| `apple-touch-icon` | iOS home screen icon | `<link rel="apple-touch-icon" href="icon.png">` |
| `manifest` | Web app manifest | `<link rel="manifest" href="manifest.json">` |
| `alternate` | Alternate version | `<link rel="alternate" hreflang="es" href="/es/">` |
| `canonical` | Preferred URL | `<link rel="canonical" href="https://example.com/page">` |
| `preload` | Priority resource loading | `<link rel="preload" href="font.woff2" as="font">` |
| `prefetch` | Low-priority future resource | `<link rel="prefetch" href="next-page.html">` |
| `preconnect` | Early connection to origin | `<link rel="preconnect" href="https://cdn.example.com">` |
| `dns-prefetch` | Early DNS lookup | `<link rel="dns-prefetch" href="https://cdn.example.com">` |
| `modulepreload` | Preload ES module | `<link rel="modulepreload" href="module.js">` |
| `author` | Author information | `<link rel="author" href="/about">` |
| `license` | License information | `<link rel="license" href="/license">` |
| `next` | Next page in series | `<link rel="next" href="/page2">` |
| `prev` | Previous page in series | `<link rel="prev" href="/page1">` |

## Form Attributes

### Form Element Attributes

| Attribute | Purpose | Values |
|-----------|---------|--------|
| `action` | Submission URL | URL |
| `method` | HTTP method | `get`, `post` |
| `enctype` | Encoding type | `application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain` |
| `target` | Where to display response | `_self`, `_blank`, `_parent`, `_top`, frame name |
| `autocomplete` | Form autofill | `on`, `off` |
| `novalidate` | Skip validation | Boolean |
| `accept-charset` | Character encodings | `UTF-8` |

## Autocomplete Values

Detailed autocomplete tokens for better autofill:

**Personal Information**:
- `name`, `given-name`, `family-name`, `additional-name`, `honorific-prefix`, `honorific-suffix`, `nickname`

**Contact Information**:
- `email`, `tel`, `tel-country-code`, `tel-national`, `tel-area-code`, `tel-local`

**Address Information**:
- `street-address`, `address-line1`, `address-line2`, `address-level1` (state/province), `address-level2` (city), `postal-code`, `country`, `country-name`

**Payment Information**:
- `cc-name`, `cc-number`, `cc-exp`, `cc-exp-month`, `cc-exp-year`, `cc-csc`, `cc-type`
- `transaction-currency`, `transaction-amount`

**Account Information**:
- `username`, `new-password`, `current-password`, `one-time-code`

**Other**:
- `bday`, `bday-day`, `bday-month`, `bday-year`, `sex`, `url`, `photo`, `organization`, `job-title`

**Section and Shipping**:
- Prefix with `shipping` or `billing` (e.g., `shipping email`, `billing address-line1`)

## Global Attributes

Applicable to all HTML elements:

| Attribute | Purpose |
|-----------|---------|
| `id` | Unique identifier |
| `class` | CSS class name(s) |
| `style` | Inline CSS styles |
| `title` | Advisory tooltip text |
| `lang` | Language code |
| `dir` | Text direction (`ltr`, `rtl`, `auto`) |
| `hidden` | Element hidden from display |
| `tabindex` | Tab navigation order |
| `accesskey` | Keyboard shortcut |
| `contenteditable` | Editable content (`true`, `false`) |
| `draggable` | Draggable element (`true`, `false`) |
| `spellcheck` | Spell checking (`true`, `false`) |
| `translate` | Translation hint (`yes`, `no`) |
| `data-*` | Custom data attributes |

## ARIA Attributes

Improve accessibility (prefix with `aria-`):

**Roles**: `role="navigation"`, `role="main"`, `role="complementary"`, `role="button"`, `role="alert"`

**States/Properties**:
- `aria-label` - Accessible name
- `aria-describedby` - Description reference
- `aria-labelledby` - Label reference
- `aria-hidden` - Hide from screen readers
- `aria-live` - Live region announcements
- `aria-expanded` - Expanded state
- `aria-checked` - Checked state
- `aria-selected` - Selected state
- `aria-disabled` - Disabled state

## Event Attributes

JavaScript event handlers (use cautiously, prefer addEventListener):

**Mouse Events**: `onclick`, `ondblclick`, `onmousedown`, `onmouseup`, `onmouseover`, `onmouseout`, `onmousemove`

**Keyboard Events**: `onkeydown`, `onkeyup`, `onkeypress`

**Form Events**: `onsubmit`, `onchange`, `oninput`, `onfocus`, `onblur`, `onreset`

**Media Events**: `onplay`, `onpause`, `onended`, `onvolumechange`

**Window Events**: `onload`, `onunload`, `onresize`, `onscroll`, `onerror`

## Best Practices

1. **Use semantic attributes**: Choose `type="email"` over `type="text"` with pattern
2. **Always include labels**: Use `<label for="id">` with form controls
3. **Validate appropriately**: Use HTML5 validation before JavaScript
4. **Provide accessible names**: Use `aria-label` when labels aren't visible
5. **Be specific with autocomplete**: Use detailed tokens for better UX
6. **Avoid inline event handlers**: Use `addEventListener()` instead
7. **Use `defer` for scripts**: Better performance than blocking scripts
8. **Set proper viewport**: Essential for responsive mobile design
9. **Include meta description**: Improves SEO and search result display
10. **Use data attributes wisely**: For JavaScript-only data, not visible content

## Resources

- [MDN: Input Types](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input)
- [MDN: Input Attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#attributes)
- [MDN: Script Element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script)
- [MDN: Meta Element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta)
- [MDN: Link Types](https://developer.mozilla.org/en-US/docs/Web/HTML/Link_types)
- [MDN: Autocomplete Attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete)
- [MDN: Global Attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes)
