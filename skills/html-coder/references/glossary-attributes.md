# HTML Attributes Glossary

Complete reference of HTML attributes organized by category and element.

## Global Attributes

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

### Inputmode Values

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

## ARIA Attributes

Accessibility attributes (prefix `aria-`):

### ARIA Roles
| Attribute | Description | Example |
|-----------|-------------|---------|
| `role` | Element role | `role="button"`, `role="navigation"` |

### ARIA States and Properties

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

## Link Attributes (`<a>`)

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

### Link Relationships (`rel`)

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

### Referrer Policy

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

## Image Attributes (`<img>`)

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

## Form Attributes (`<form>`)

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

## Input Attributes (`<input>`)

### Universal Input Attributes

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

### Input Types

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

### Type-Specific Attributes

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

### Autocomplete Values

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

## Button Attributes (`<button>`)

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

## Select Attributes (`<select>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `name` | Field name | String |
| `size` | Visible options | Integer |
| `multiple` | Multiple selection | Boolean |
| `required` | Required field | Boolean |
| `disabled` | Disabled state | Boolean |
| `autofocus` | Auto focus | Boolean |
| `form` | Associated form | Form ID |

## Option Attributes (`<option>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `value` | Option value | String |
| `label` | Option label | String |
| `selected` | Pre-selected | Boolean |
| `disabled` | Disabled option | Boolean |

## Textarea Attributes (`<textarea>`)

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

## Media Attributes (`<audio>`, `<video>`)

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

## Script Attributes (`<script>`)

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

## Table Attributes

### Table (`<table>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `border` | Border (deprecated) | Integer (use CSS) |
| `cellspacing` | Cell spacing (deprecated) | Integer (use CSS) |
| `cellpadding` | Cell padding (deprecated) | Integer (use CSS) |

### Table Cell (`<td>`, `<th>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `colspan` | Column span | Integer |
| `rowspan` | Row span | Integer |
| `headers` | Header references | Space-separated IDs |
| `scope` | Header scope (`<th>` only) | `row`, `col`, `rowgroup`, `colgroup` |

## Iframe Attributes (`<iframe>`)

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

### Sandbox Values

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

## Meta Attributes (`<meta>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `charset` | Character encoding | `UTF-8` (most common) |
| `name` | Metadata name | `description`, `keywords`, `author`, `viewport`, etc. |
| `content` | Metadata content | String |
| `http-equiv` | HTTP header | `content-type`, `refresh`, `content-security-policy`, etc. |
| `property` | Property name (Open Graph) | `og:title`, `og:image`, etc. |

## Progress/Meter Attributes

### Progress (`<progress>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `value` | Current value | Number |
| `max` | Maximum value | Number |

### Meter (`<meter>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `value` | Current value | Number |
| `min` | Minimum value | Number |
| `max` | Maximum value | Number |
| `low` | Low threshold | Number |
| `high` | High threshold | Number |
| `optimum` | Optimum value | Number |

## Details Attributes (`<details>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `open` | Initially open | Boolean |

## Dialog Attributes (`<dialog>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `open` | Visible dialog | Boolean |

## Canvas Attributes (`<canvas>`)

| Attribute | Description | Values |
|-----------|-------------|--------|
| `width` | Canvas width | Integer (pixels) |
| `height` | Canvas height | Integer (pixels) |

## Quick Reference

### Most Common Attributes

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

## Notes

- **Boolean attributes**: Presence = true, absence = false (e.g., `disabled`, `required`)
- **Global attributes**: Can be used on any element
- **Deprecated attributes**: Many presentational attributes deprecated (use CSS instead)
- **Validation**: Use W3C Validator to check attribute usage
- **Accessibility**: ARIA attributes enhance accessibility for screen readers
