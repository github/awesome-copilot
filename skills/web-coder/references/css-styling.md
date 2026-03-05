# CSS & Styling Reference

Comprehensive reference for Cascading Style Sheets, layout systems, and modern styling techniques.

## Core Concepts

### CSS (Cascading Style Sheets)
Style sheet language used for describing the presentation of HTML documents.

**Three Ways to Apply CSS**:
1. **Inline**: `<div style="color: blue;">`
2. **Internal**: `<style>` tag in HTML
3. **External**: Separate `.css` file (recommended)

### The Cascade
The algorithm that determines which CSS rules apply when multiple rules target the same element.

**Priority Order** (highest to lowest):
1. Inline styles
2. ID selectors (`#id`)
3. Class selectors (`.class`), attribute selectors, pseudo-classes
4. Element selectors (`div`, `p`)
5. Inherited properties

**Important**: `!important` declaration overrides normal specificity (use sparingly)

### CSS Selectors

| Selector | Example | Description |
|----------|---------|-------------|
| Element | `p` | Selects all `<p>` elements |
| Class | `.button` | Selects elements with `class="button"` |
| ID | `#header` | Selects element with `id="header"` |
| Universal | `*` | Selects all elements |
| Descendant | `div p` | `<p>` inside `<div>` (any level) |
| Child | `div > p` | Direct child `<p>` of `<div>` |
| Adjacent Sibling | `h1 + p` | `<p>` immediately after `<h1>` |
| General Sibling | `h1 ~ p` | All `<p>` siblings after `<h1>` |
| Attribute | `[type="text"]` | Elements with specific attribute |
| Attribute Contains | `[href*="example"]` | Contains substring |
| Attribute Starts | `[href^="https"]` | Starts with string |
| Attribute Ends | `[href$=".pdf"]` | Ends with string |

### Pseudo-Classes

Target elements based on state or position:

```css
/* Link states */
a:link { color: blue; }
a:visited { color: purple; }
a:hover { color: red; }
a:active { color: orange; }
a:focus { outline: 2px solid blue; }

/* Structural */
li:first-child { font-weight: bold; }
li:last-child { border-bottom: none; }
li:nth-child(odd) { background: #f0f0f0; }
li:nth-child(3n) { color: red; }
p:not(.special) { color: gray; }

/* Form states */
input:required { border-color: red; }
input:valid { border-color: green; }
input:invalid { border-color: red; }
input:disabled { opacity: 0.5; }
input:checked + label { font-weight: bold; }
```

### Pseudo-Elements

Style specific parts of elements:

```css
/* First line/letter */
p::first-line { font-weight: bold; }
p::first-letter { font-size: 2em; }

/* Generated content */
.quote::before { content: '"'; }
.quote::after { content: '"'; }

/* Selection */
::selection { background: yellow; color: black; }

/* Placeholder */
input::placeholder { color: #999; }
```

## Box Model

Every element is a rectangular box with:

1. **Content**: The actual content (text, images)
2. **Padding**: Space around content, inside border
3. **Border**: Line around padding
4. **Margin**: Space outside border

```css
.box {
  /* Content size */
  width: 300px;
  height: 200px;
  
  /* Padding */
  padding: 20px; /* All sides */
  padding: 10px 20px; /* Vertical | Horizontal */
  padding: 10px 20px 15px 25px; /* Top | Right | Bottom | Left */
  
  /* Border */
  border: 2px solid #333;
  border-radius: 8px;
  
  /* Margin */
  margin: 20px auto; /* Vertical | Horizontal (auto centers) */
  
  /* Box-sizing changes how width/height work */
  box-sizing: border-box; /* Include padding/border in width/height */
}
```

## Layout Systems

### Flexbox

One-dimensional layout system (row or column):

```css
.container {
  display: flex;
  
  /* Direction */
  flex-direction: row; /* row | row-reverse | column | column-reverse */
  
  /* Wrapping */
  flex-wrap: wrap; /* nowrap | wrap | wrap-reverse */
  
  /* Main axis alignment */
  justify-content: center; /* flex-start | flex-end | center | space-between | space-around | space-evenly */
  
  /* Cross axis alignment */
  align-items: center; /* flex-start | flex-end | center | stretch | baseline */
  
  /* Multi-line cross axis */
  align-content: center; /* flex-start | flex-end | center | space-between | space-around | stretch */
  
  /* Gap between items */
  gap: 1rem;
}

.item {
  /* Grow factor */
  flex-grow: 1; /* Takes available space */
  
  /* Shrink factor */
  flex-shrink: 1; /* Can shrink if needed */
  
  /* Base size */
  flex-basis: 200px; /* Initial size before growing/shrinking */
  
  /* Shorthand */
  flex: 1 1 200px; /* grow | shrink | basis */
  
  /* Individual alignment */
  align-self: flex-end; /* Overrides container's align-items */
  
  /* Order */
  order: 2; /* Change visual order (default: 0) */
}
```

### CSS Grid

Two-dimensional layout system (rows and columns):

```css
.container {
  display: grid;
  
  /* Define columns */
  grid-template-columns: 200px 1fr 1fr; /* Fixed | Flexible | Flexible */
  grid-template-columns: repeat(3, 1fr); /* Three equal columns */
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); /* Responsive */
  
  /* Define rows */
  grid-template-rows: 100px auto 50px; /* Fixed | Auto | Fixed */
  
  /* Named areas */
  grid-template-areas:
    "header header header"
    "sidebar main main"
    "footer footer footer";
  
  /* Gap between cells */
  gap: 1rem; /* Row and column gap */
  row-gap: 1rem;
  column-gap: 2rem;
  
  /* Alignment */
  justify-items: start; /* Align items horizontally within cells */
  align-items: start; /* Align items vertically within cells */
  justify-content: center; /* Align grid within container horizontally */
  align-content: center; /* Align grid within container vertically */
}

.item {
  /* Span columns */
  grid-column: 1 / 3; /* Start / End */
  grid-column: span 2; /* Span 2 columns */
  
  /* Span rows */
  grid-row: 1 / 3;
  grid-row: span 2;
  
  /* Named area */
  grid-area: header;
  
  /* Individual alignment */
  justify-self: center; /* Horizontal alignment */
  align-self: center; /* Vertical alignment */
}
```

### Grid vs Flexbox

| Use Case | Best Choice |
|----------|-------------|
| One-dimensional layout (row or column) | Flexbox |
| Two-dimensional layout (rows and columns) | Grid |
| Align items along one axis | Flexbox |
| Create complex page layouts | Grid |
| Distribute space between items | Flexbox |
| Precise control over rows and columns | Grid |
| Content-first responsive design | Flexbox |
| Layout-first responsive design | Grid |

## Positioning

### Position Types

```css
/* Static (default) - normal flow */
.static { position: static; }

/* Relative - offset from normal position */
.relative {
  position: relative;
  top: 10px; /* Move down 10px */
  left: 20px; /* Move right 20px */
}

/* Absolute - removed from flow, positioned relative to nearest positioned ancestor */
.absolute {
  position: absolute;
  top: 0;
  right: 0;
}

/* Fixed - removed from flow, positioned relative to viewport */
.fixed {
  position: fixed;
  bottom: 20px;
  right: 20px;
}

/* Sticky - switches between relative and fixed based on scroll */
.sticky {
  position: sticky;
  top: 0; /* Sticks to top when scrolling */
}
```

### Inset Properties

Shorthand for positioning:

```css
.element {
  position: absolute;
  inset: 0; /* All sides: top, right, bottom, left = 0 */
  inset: 10px 20px; /* Vertical | Horizontal */
  inset: 10px 20px 30px 40px; /* Top | Right | Bottom | Left */
}
```

### Stacking Context

Control layering with `z-index`:

```css
.behind { z-index: 1; }
.infront { z-index: 10; }
.onTop { z-index: 100; }
```

**Note**: `z-index` only works on positioned elements (not `static`)

## Responsive Design

### Media Queries

Apply styles based on device characteristics:

```css
/* Mobile-first approach */
.container {
  padding: 1rem;
}

/* Tablet and up */
@media (min-width: 768px) {
  .container {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    padding: 3rem;
  }
}

/* Landscape orientation */
@media (orientation: landscape) {
  .header { height: 60px; }
}

/* High-DPI screens */
@media (min-resolution: 192dpi) {
  .logo { background-image: url('logo@2x.png'); }
}

/* Dark mode preference */
@media (prefers-color-scheme: dark) {
  body {
    background: #222;
    color: #fff;
  }
}

/* Reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Responsive Units

| Unit | Description | Example |
|------|-------------|---------|
| `px` | Pixels (absolute) | `16px` |
| `em` | Relative to parent font-size | `1.5em` |
| `rem` | Relative to root font-size | `1.5rem` |
| `%` | Relative to parent | `50%` |
| `vw` | Viewport width (1vw = 1% of viewport width) | `50vw` |
| `vh` | Viewport height | `100vh` |
| `vmin` | Smaller of vw or vh | `10vmin` |
| `vmax` | Larger of vw or vh | `10vmax` |
| `ch` | Width of "0" character | `40ch` |
| `fr` | Fraction of available space (Grid only) | `1fr` |

### Responsive Images

```css
img {
  max-width: 100%;
  height: auto;
}

/* Art direction with picture element */
```

```html
<picture>
  <source media="(min-width: 1024px)" srcset="large.jpg">
  <source media="(min-width: 768px)" srcset="medium.jpg">
  <img src="small.jpg" alt="Responsive image">
</picture>
```

## Typography

```css
.text {
  /* Font family */
  font-family: 'Helvetica Neue', Arial, sans-serif;
  
  /* Font size */
  font-size: 16px; /* Base size */
  font-size: 1rem; /* Relative to root */
  font-size: clamp(14px, 2vw, 20px); /* Responsive with min/max */
  
  /* Font weight */
  font-weight: normal; /* 400 */
  font-weight: bold; /* 700 */
  font-weight: 300; /* Light */
  
  /* Font style */
  font-style: italic;
  
  /* Line height */
  line-height: 1.5; /* 1.5 times font-size */
  line-height: 24px;
  
  /* Letter spacing */
  letter-spacing: 0.05em;
  
  /* Text alignment */
  text-align: left; /* left | right | center | justify */
  
  /* Text decoration */
  text-decoration: underline;
  text-decoration: none; /* Remove underline from links */
  
  /* Text transform */
  text-transform: uppercase; /* uppercase | lowercase | capitalize */
  
  /* Word spacing */
  word-spacing: 0.1em;
  
  /* White space handling */
  white-space: nowrap; /* Don't wrap */
  white-space: pre-wrap; /* Preserve whitespace, wrap lines */
  
  /* Text overflow */
  overflow: hidden;
  text-overflow: ellipsis; /* Show ... when text overflows */
  
  /* Word break */
  word-wrap: break-word; /* Break long words */
  overflow-wrap: break-word; /* Modern version */
}
```

## Colors

```css
.colors {
  /* Named colors */
  color: red;
  
  /* Hex */
  color: #ff0000; /* Red */
  color: #f00; /* Shorthand */
  color: #ff0000ff; /* With alpha */
  
  /* RGB */
  color: rgb(255, 0, 0);
  color: rgba(255, 0, 0, 0.5); /* With alpha */
  color: rgb(255 0 0 / 0.5); /* Modern syntax */
  
  /* HSL (Hue, Saturation, Lightness) */
  color: hsl(0, 100%, 50%); /* Red */
  color: hsla(0, 100%, 50%, 0.5); /* With alpha */
  color: hsl(0 100% 50% / 0.5); /* Modern syntax */
  
  /* Color keywords */
  color: currentColor; /* Inherit color */
  color: transparent;
}
```

### CSS Color Space

Modern color spaces for wider gamut:

```css
.modern-colors {
  /* Display P3 (Apple devices) */
  color: color(display-p3 1 0 0);
  
  /* Lab color space */
  color: lab(50% 125 0);
  
  /* LCH color space */
  color: lch(50% 125 0deg);
}
```

## Animations and Transitions

### Transitions

Smooth changes between states:

```css
.button {
  background: blue;
  color: white;
  transition: all 0.3s ease;
  /* transition: property duration timing-function delay */
}

.button:hover {
  background: darkblue;
  transform: scale(1.05);
}

/* Individual properties */
.element {
  transition-property: opacity, transform;
  transition-duration: 0.3s, 0.5s;
  transition-timing-function: ease, ease-in-out;
  transition-delay: 0s, 0.1s;
}
```

### Keyframe Animations

```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.element {
  animation: fadeIn 0.5s ease forwards;
  /* animation: name duration timing-function delay iteration-count direction fill-mode */
}

/* Multiple keyframes */
@keyframes slide {
  0% { transform: translateX(0); }
  50% { transform: translateX(100px); }
  100% { transform: translateX(0); }
}

.slider {
  animation: slide 2s infinite alternate;
}
```

## Transforms

```css
.transform {
  /* Translate (move) */
  transform: translate(50px, 100px); /* X, Y */
  transform: translateX(50px);
  transform: translateY(100px);
  
  /* Rotate */
  transform: rotate(45deg);
  
  /* Scale */
  transform: scale(1.5); /* 150% size */
  transform: scale(2, 0.5); /* X, Y different */
  
  /* Skew */
  transform: skew(10deg, 5deg);
  
  /* Multiple transforms */
  transform: translate(50px, 0) rotate(45deg) scale(1.2);
  
  /* 3D transforms */
  transform: rotateX(45deg) rotateY(30deg);
  transform: perspective(500px) translateZ(100px);
}
```

## CSS Variables (Custom Properties)

```css
:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --spacing: 1rem;
  --border-radius: 4px;
}

.element {
  color: var(--primary-color);
  padding: var(--spacing);
  border-radius: var(--border-radius);
  
  /* With fallback */
  color: var(--accent-color, red);
}

/* Dynamic changes */
.dark-theme {
  --primary-color: #0056b3;
  --background: #222;
  --text: #fff;
}
```

## CSS Preprocessors

### Common Features

- Variables
- Nesting
- Mixins (reusable styles)
- Functions
- Imports

**Popular Preprocessors**: Sass/SCSS, Less, Stylus

## Best Practices

### Do's
- ✅ Use external stylesheets
- ✅ Use class selectors over ID selectors
- ✅ Keep specificity low
- ✅ Use responsive units (rem, em, %)
- ✅ Mobile-first approach
- ✅ Use CSS variables for theming
- ✅ Organize CSS logically
- ✅ Use shorthand properties
- ✅ Minify CSS for production

### Don'ts
- ❌ Use `!important` excessively
- ❌ Use inline styles
- ❌ Use fixed pixel widths
- ❌ Over-nest selectors
- ❌ Use vendor prefixes manually (use autoprefixer)
- ❌ Forget to test cross-browser
- ❌ Use IDs for styling
- ❌ Ignore CSS specificity

## Glossary Terms

**Key Terms Covered**:
- Alignment container
- Alignment subject
- Aspect ratio
- Baseline
- Block (CSS)
- Bounding box
- Cross Axis
- CSS
- CSS Object Model (CSSOM)
- CSS pixel
- CSS preprocessor
- Descriptor (CSS)
- Fallback alignment
- Flex
- Flex container
- Flex item
- Flexbox
- Flow relative values
- Grid
- Grid areas
- Grid Axis
- Grid Cell
- Grid Column
- Grid container
- Grid lines
- Grid Row
- Grid Tracks
- Gutters
- Ink overflow
- Inset properties
- Layout mode
- Logical properties
- Main axis
- Media query
- Physical properties
- Pixel
- Property (CSS)
- Pseudo-class
- Pseudo-element
- Selector (CSS)
- Stacking context
- Style origin
- Stylesheet
- Vendor prefix

## Additional Resources

- [MDN CSS Reference](https://developer.mozilla.org/en-US/docs/Web/CSS)
- [CSS Tricks Complete Guide to Flexbox](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [CSS Tricks Complete Guide to Grid](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [Can I Use](https://caniuse.com/) - Browser compatibility tables
