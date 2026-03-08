# Global Attributes Reference

Detailed guide to HTML global attributes that can be used on any element.

## What Are Global Attributes?

Global attributes are attributes that can be applied to **any HTML element**, regardless of the element type. They provide common functionality like styling hooks, accessibility features, custom data storage, and user interaction controls.

## Complete Global Attributes List

### `accesskey`

**Purpose**: Keyboard shortcut to activate or focus element

**Values**: Single character (letter, number, symbol)

**Example**:
```html
<button accesskey="s">Save</button>
<a href="#content" accesskey="c">Skip to Content</a>
```

**Usage**:
- Activated by browser-specific key combination:
  - Windows: `Alt + key`
  - Mac: `Ctrl + Option + key`
  - Linux: `Alt + key`
- Avoid conflicts with browser shortcuts
- Not widely used due to inconsistent browser support

---

### `autocapitalize`

**Purpose**: Control text capitalization on mobile devices

**Values**:
- `off` or `none` - No autocapitalization
- `on` or `sentences` - Capitalize first letter of sentences (default)
- `words` - Capitalize first letter of each word
- `characters` - Capitalize all characters

**Example**:
```html
<input type="text" autocapitalize="words" placeholder="Enter your name">
<textarea autocapitalize="sentences"></textarea>
```

**Usage**: Primarily affects mobile virtual keyboards

---

### `autofocus`

**Purpose**: Automatically focus element when page loads

**Values**: Boolean (no value needed)

**Example**:
```html
<input type="search" autofocus placeholder="Search...">
```

**Usage**:
- Only one element per page should have `autofocus`
- Be cautious with accessibility (can disorient users)
- Avoid on login pages (security risk)

---

### `class`

**Purpose**: Assign CSS class(es) to element

**Values**: Space-separated class names

**Example**:
```html
<div class="container">Single class</div>
<button class="btn btn-primary btn-large">Multiple classes</button>
<article class="card featured">Card with modifier</article>
```

**Usage**:
- Most commonly used global attribute
- Multiple classes separated by spaces
- Class names are case-sensitive
- Use descriptive, semantic names
- Convention: lowercase with hyphens (`btn-primary`) or camelCase (`btnPrimary`)

---

### `contenteditable`

**Purpose**: Make element content editable by user

**Values**:
- `true` - Element is editable
- `false` - Element is not editable
- `plaintext-only` - Only plain text (no formatting)

**Example**:
```html
<div contenteditable="true">
  You can edit this text directly!
</div>

<p contenteditable="false">This cannot be edited</p>

<article contenteditable="plaintext-only">
  Plain text only - no rich formatting
</article>
```

**Usage**:
- Inherits to child elements (unless overridden)
- Use with JavaScript to capture changes
- WYSIWYG editors use this feature
- Accessibility: ensure keyboard navigation works

---

### `data-*`

**Purpose**: Store custom data attributes

**Values**: Any string value

**Example**:
```html
<button data-user-id="12345" data-action="delete">Delete User</button>

<article 
  data-post-id="789" 
  data-author="John Doe"
  data-published="2024-01-15"
  data-category="Technology">
  Article content
</article>

<div data-config='{"theme":"dark","lang":"en"}'>Settings</div>
```

**JavaScript Access**:
```html
<button id="btn" data-user-id="123" data-user-name="John">Click</button>

<script>
  const btn = document.getElementById('btn');
  
  // Access via dataset
  console.log(btn.dataset.userId);    // "123"
  console.log(btn.dataset.userName);  // "John"
  
  // Modify dataset
  btn.dataset.userId = '456';
  
  // Add new data attribute
  btn.dataset.role = 'admin';
</script>
```

**Usage**:
- Must start with `data-`
- Followed by at least one character (no uppercase)
- CamelCase in JavaScript (data-user-id → dataset.userId)
- Ideal for passing data from HTML to JavaScript
- Better than using class names for data storage

---

### `dir`

**Purpose**: Text directionality

**Values**:
- `ltr` - Left-to-right (default for most languages)
- `rtl` - Right-to-left (Arabic, Hebrew)
- `auto` - Browser determines based on content

**Example**:
```html
<p dir="ltr">English text (left to right)</p>
<p dir="rtl">مرحبا (right to left)</p>
<p dir="auto">Mixed content: Hello مرحبا</p>
```

**Usage**:
- Inherit to all child elements
- Set on `<html>` for entire document
- Use `auto` for user-generated content with unknown direction

---

### `draggable`

**Purpose**: Enable drag-and-drop functionality

**Values**:
- `true` - Element is draggable
- `false` - Element is not draggable
- `auto` - Browser default (images and links draggable)

**Example**:
```html
<div draggable="true">Drag me!</div>
<img src="image.jpg" alt="Image" draggable="false">
```

**Usage**:
- Requires JavaScript drag-and-drop event handlers
- Events: `dragstart`, `drag`, `dragend`, `dragenter`, `dragleave`, `dragover`, `drop`

---

### `enterkeyhint`

**Purpose**: Customize Enter key label on virtual keyboards

**Values**:
- `enter` - Default Enter key
- `done` - "Done" label
- `go` - "Go" label
- `next` - "Next" label
- `previous` - "Previous" label
- `search` - "Search" label
- `send` - "Send" label

**Example**:
```html
<input type="text" enterkeyhint="next">
<input type="search" enterkeyhint="search">
<textarea enterkeyhint="send"></textarea>
```

**Usage**: Mobile-specific, affects virtual keyboard appearance

---

### `hidden`

**Purpose**: Hide element from display

**Values**: Boolean (no value needed)

**Example**:
```html
<div hidden>This is hidden</div>
<p hidden>Not displayed on page</p>
```

**Usage**:
- Equivalent to `display: none` in CSS
- Element not rendered and not accessible
- Screen readers ignore hidden content
- Use `aria-hidden="true"` to hide from screen readers but keep visible
- Can be toggled with JavaScript

---

### `id`

**Purpose**: Unique identifier for element

**Values**: Unique string (must be unique per document)

**Example**:
```html
<header id="main-header">Header</header>
<button id="submit-btn">Submit</button>
<article id="post-123">Article content</article>
```

**Usage**:
- Must be unique within the document
- Can be referenced by CSS (`#main-header`) and JavaScript
- Used for fragment identifiers (`#main-header` in URLs)
- Used with `<label for="id">` to associate labels with inputs
- Convention: lowercase with hyphens or camelCase
- Cannot start with a number

---

### `inert`

**Purpose**: Make element non-interactive

**Values**: Boolean (no value needed)

**Example**:
```html
<div inert>
  <button>Cannot be clicked</button>
  <a href="#">Cannot be focused</a>
  <input type="text">Cannot be edited</input>
</div>
```

**Usage**:
- Element and descendants cannot receive focus
- Element and descendants removed from tab order
- Element and descendants ignored by screen readers
- Useful for modals (inert background content)
- Relatively new attribute (check browser support)

---

### `inputmode`

**Purpose**: Hint for virtual keyboard type

**Values**:
- `none` - No virtual keyboard
- `text` - Standard text keyboard (default)
- `decimal` - Numeric keyboard with decimal
- `numeric` - Numeric keyboard
- `tel` - Telephone number pad
- `search` - Search-optimized keyboard
- `email` - Email keyboard (@ symbol)
- `url` - URL keyboard (/ and .com)

**Example**:
```html
<input type="text" inputmode="numeric" placeholder="Enter PIN">
<input type="text" inputmode="email" placeholder="Email">
<input type="text" inputmode="tel" placeholder="Phone">
```

**Usage**:
- Mobile-specific optimization
- Use with `type="text"` to get specific keyboards without validation
- Better UX than wrong keyboard type

---

### `is`

**Purpose**: Specify custom element name (Web Components)

**Values**: Custom element name

**Example**:
```html
<button is="fancy-button">Click Me</button>
<ul is="expanding-list">
  <li>Item 1</li>
  <li>Item 2</li>
</ul>
```

**Usage**:
- Used with Web Components
- Extends built-in elements
- Requires JavaScript custom element definition

---

### `itemid`, `itemprop`, `itemref`, `itemscope`, `itemtype`

**Purpose**: Microdata attributes for structured data

**Example**:
```html
<div itemscope itemtype="https://schema.org/Person">
  <span itemprop="name">John Doe</span>
  <span itemprop="jobTitle">Software Engineer</span>
  <a href="mailto:john@example.com" itemprop="email">Email</a>
</div>

<div itemscope itemtype="https://schema.org/Product" itemid="urn:isbn:978-0-12-345678-9">
  <span itemprop="name">Product Name</span>
  <span itemprop="price" content="29.99">$29.99</span>
</div>
```

**Usage**:
- SEO: helps search engines understand content
- Use with Schema.org types
- Alternative to JSON-LD for structured data

---

### `lang`

**Purpose**: Specify language of element content

**Values**: Language code (ISO 639-1)

**Example**:
```html
<html lang="en">
<p lang="es">Hola, ¿cómo estás?</p>
<p lang="fr">Bonjour, comment ça va?</p>
<blockquote lang="de">Guten Tag!</blockquote>
```

**Common Language Codes**:
- `en` - English
- `en-US` - English (United States)
- `en-GB` - English (United Kingdom)
- `es` - Spanish
- `fr` - French
- `de` - German
- `it` - Italian
- `pt` - Portuguese
- `ja` - Japanese
- `zh` - Chinese
- `ar` - Arabic
- `ru` - Russian

**Usage**:
- Set on `<html>` for primary page language
- Override for sections in different languages
- Helps screen readers with pronunciation
- Assists search engines and translation tools

---

### `nonce`

**Purpose**: Cryptographic nonce for Content Security Policy (CSP)

**Values**: Random string (unique per page load)

**Example**:
```html
<!-- In HTML head -->
<meta http-equiv="Content-Security-Policy" content="script-src 'nonce-r@nd0mStr1ng'">

<!-- Script with matching nonce -->
<script nonce="r@nd0mStr1ng">
  console.log('This script is allowed');
</script>

<!-- This script without nonce is blocked -->
<script>
  console.log('This script is blocked');
</script>
```

**Usage**:
- Security feature for CSP
- Server must generate random nonce per page load
- Only scripts/styles with matching nonce execute
- Prevents XSS attacks

---

### `part`

**Purpose**: Expose shadow DOM parts for styling (Web Components)

**Values**: Space-separated part names

**Example**:
```html
<custom-button>
  <button part="button">Click Me</button>
  <span part="icon">🔔</span>
</custom-button>

<style>
  custom-button::part(button) {
    background: blue;
  }
  custom-button::part(icon) {
    font-size: 2em;
  }
</style>
```

**Usage**: Advanced feature for Web Components

---

### `slot`

**Purpose**: Assign content to named slot in Web Components

**Values**: Slot name

**Example**:
```html
<custom-card>
  <h2 slot="title">Card Title</h2>
  <p slot="content">Card content goes here.</p>
  <button slot="actions">Action</button>
</custom-card>
```

**Usage**: Used with Shadow DOM and Web Components

---

### `spellcheck`

**Purpose**: Enable/disable spell checking

**Values**:
- `true` - Enable spell checking
- `false` - Disable spell checking

**Example**:
```html
<input type="text" spellcheck="true" placeholder="Spell checked">
<textarea spellcheck="false">No spell check here</textarea>
<div contenteditable="true" spellcheck="true">Editable with spellcheck</div>
```

**Usage**:
- Works on editable content
- Applies to `<input>`, `<textarea>`, and `contenteditable` elements
- Default behavior varies by browser and element type

---

### `style`

**Purpose**: Inline CSS styles

**Values**: CSS declarations

**Example**:
```html
<p style="color: red; font-weight: bold;">Red and bold text</p>
<div style="background-color: #f0f0f0; padding: 20px; border-radius: 8px;">
  Styled container
</div>
```

**Usage**:
- Highest CSS specificity (overrides external/internal styles)
- Not recommended for production (hard to maintain)
- Useful for dynamic styles via JavaScript
- Avoid when possible (use CSS classes instead)

---

### `tabindex`

**Purpose**: Control tab order and focusability

**Values**:
- Positive number - Explicit tab order (not recommended)
- `0` - Natural tab order, element focusable
- `-1` - Programmatically focusable, not in tab order

**Example**:
```html
<!-- Natural tab order -->
<button tabindex="0">First</button>
<button tabindex="0">Second</button>

<!-- Remove from tab order -->
<div tabindex="-1">Focusable via JavaScript only</div>

<!-- Avoid explicit order (anti-pattern) -->
<button tabindex="3">Third</button>
<button tabindex="1">First</button>
<button tabindex="2">Second</button>
```

**Usage**:
- `0` - Add focusability to non-interactive elements
- `-1` - Remove from tab order (still focusable via JS)
- Positive values - Avoid (confusing for users)
- Essential for custom interactive components

---

### `title`

**Purpose**: Advisory information (tooltip)

**Values**: Text string

**Example**:
```html
<button title="Save your changes">💾</button>
<abbr title="HyperText Markup Language">HTML</abbr>
<a href="#" title="Go to homepage">Home</a>
<img src="icon.svg" alt="Icon" title="Additional info about icon">
```

**Usage**:
- Displays as tooltip on hover
- Should not contain essential information (not accessible on mobile)
- Good for abbreviations and supplementary info
- Not a substitute for proper labels or alt text
- Screen readers may announce title, but inconsistently

---

### `translate`

**Purpose**: Specify if content should be translated

**Values**:
- `yes` - Content should be translated (default)
- `no` - Content should not be translated

**Example**:
```html
<p translate="yes">This text can be translated.</p>
<p translate="no">Brand Name™</p>
<code translate="no">console.log('hello');</code>
```

**Usage**:
- Hint for translation tools
- Use for proper nouns, brand names, code
- Not widely supported

---

## Global Attributes Usage Patterns

### Styling Hooks
```html
<div id="app" class="container dark-theme">
  <h1 class="title">Page Title</h1>
  <p class="description">Description text</p>
</div>
```

### JavaScript Interaction
```html
<button 
  id="submit-btn"
  data-user-id="123"
  data-action="submit"
  onclick="handleClick()">
  Submit
</button>
```

### Accessibility
```html
<div 
  role="dialog"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-desc"
  tabindex="-1">
  <h2 id="dialog-title">Dialog Title</h2>
  <p id="dialog-desc">Dialog description</p>
</div>
```

### Internationalization
```html
<html lang="en" dir="ltr">
  <p lang="es">Hola</p>
  <p lang="ar" dir="rtl">مرحبا</p>
</html>
```

### Custom Data Storage
```html
<article
  data-post-id="789"
  data-author="John Doe"
  data-published="2024-01-15"
  data-tags='["tech","web","html"]'>
  Article content
</article>
```

## Best Practices

### ✅ Do

1. **Use semantic `class` names** (`.btn-primary` not `.blue-button`)
2. **Keep `id` unique** within document
3. **Prefer CSS classes over inline `style`**
4. **Use `data-*` for custom data** (not `class` or `id`)
5. **Set `lang` on `<html>`** for accessibility
6. **Use `tabindex="0"`** to make custom components focusable
7. **Use `hidden`** to hide content completely
8. **Provide descriptive `title`** for abbreviations

### ❌ Don't

1. **Don't use positive `tabindex`** values (confusing order)
2. **Don't rely on `title` for essential info** (inaccessible on mobile)
3. **Don't use `accesskey`** (conflicts with browser shortcuts)
4. **Don't use multiple `autofocus`** on one page
5. **Don't use inline `style`** extensively (hard to maintain)
6. **Don't use `id` for styling multiple elements** (use `class`)
7. **Don't forget to make `contenteditable` keyboard accessible**
8. **Don't use `hidden` with CSS `display`** (creates conflicts)

## Browser Support

Most global attributes have excellent browser support. Notable exceptions:

- **`inert`**: Limited support (newer attribute)
- **`enterkeyhint`**: Mobile browsers only
- **`part`** and **`slot`**: Require Web Components support
- **`inputmode`**: Mobile browsers primarily

Always check [Can I Use](https://caniuse.com/) for current browser support.
