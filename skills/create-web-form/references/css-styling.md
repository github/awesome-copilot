# CSS Styling Reference

A consolidated reference covering CSS properties, selectors, pseudo-classes, at-rules, the box model, Flexbox, Grid, and media queries.

---

## Table of Contents

1. [CSS Properties Reference](#1-css-properties-reference)
2. [CSS Selectors](#2-css-selectors)
3. [Pseudo-Classes and Pseudo-Elements](#3-pseudo-classes-and-pseudo-elements)
4. [CSS At-Rules](#4-css-at-rules)
5. [CSS Styling Basics](#5-css-styling-basics)
6. [The Box Model](#6-the-box-model)
7. [Flexbox Layout](#7-flexbox-layout)
8. [Grid Layout](#8-grid-layout)
9. [Media Queries](#9-media-queries)

---

## 1. CSS Properties Reference

> Source: https://www.w3schools.com/cssref/index.php

### Background

| Property | Description |
|---|---|
| `background` | Shorthand for all background properties |
| `background-color` | Sets the background color |
| `background-image` | Sets one or more background images |
| `background-position` | Sets the starting position of a background image |
| `background-repeat` | Sets how a background image is repeated |
| `background-size` | Sets the size of the background image (`cover`, `contain`, length) |
| `background-attachment` | Sets whether background scrolls with content (`scroll`, `fixed`, `local`) |
| `background-clip` | Defines how far the background extends (`border-box`, `padding-box`, `content-box`) |
| `background-origin` | Specifies the positioning area of the background image |

### Border

| Property | Description |
|---|---|
| `border` | Shorthand for border-width, border-style, border-color |
| `border-width` | Sets the width of borders |
| `border-style` | Sets the style (`none`, `solid`, `dashed`, `dotted`, `double`, `groove`, `ridge`, `inset`, `outset`) |
| `border-color` | Sets the color of borders |
| `border-radius` | Sets rounded corners |
| `border-top` / `border-right` / `border-bottom` / `border-left` | Individual side borders |
| `border-collapse` | Sets whether table borders are collapsed into a single border |
| `border-spacing` | Sets the distance between borders of adjacent cells |
| `border-image` | Shorthand for using an image as a border |
| `outline` | A line drawn outside the border (does not take up space) |
| `outline-offset` | Adds space between an outline and the edge of an element |

### Box Model / Dimensions

| Property | Description |
|---|---|
| `width` / `height` | Sets element width/height |
| `min-width` / `min-height` | Sets minimum width/height |
| `max-width` / `max-height` | Sets maximum width/height |
| `margin` | Sets outer spacing (shorthand for top, right, bottom, left) |
| `padding` | Sets inner spacing (shorthand for top, right, bottom, left) |
| `box-sizing` | Defines how width/height are calculated (`content-box`, `border-box`) |
| `overflow` | Controls content overflow (`visible`, `hidden`, `scroll`, `auto`) |
| `overflow-x` / `overflow-y` | Controls horizontal/vertical overflow individually |

### Color and Opacity

| Property | Description |
|---|---|
| `color` | Sets the text color |
| `opacity` | Sets the transparency level (0.0 to 1.0) |

### Display and Visibility

| Property | Description |
|---|---|
| `display` | Controls display behavior (`block`, `inline`, `inline-block`, `flex`, `grid`, `none`, etc.) |
| `visibility` | Controls visibility (`visible`, `hidden`, `collapse`) |
| `float` | Places an element to the left or right of its container |
| `clear` | Specifies which sides of an element floating elements are not allowed |
| `position` | Sets positioning method (`static`, `relative`, `absolute`, `fixed`, `sticky`) |
| `top` / `right` / `bottom` / `left` | Offsets for positioned elements |
| `z-index` | Sets the stack order of positioned elements |

### Typography / Font

| Property | Description |
|---|---|
| `font` | Shorthand for font properties |
| `font-family` | Sets the font (e.g., `"Arial", sans-serif`) |
| `font-size` | Sets the size of text |
| `font-weight` | Sets boldness (`normal`, `bold`, `100`-`900`) |
| `font-style` | Sets style (`normal`, `italic`, `oblique`) |
| `font-variant` | Sets small-caps or other variants |
| `line-height` | Sets the line height / leading |
| `letter-spacing` | Sets spacing between characters |
| `word-spacing` | Sets spacing between words |

### Text

| Property | Description |
|---|---|
| `text-align` | Sets horizontal alignment (`left`, `right`, `center`, `justify`) |
| `text-decoration` | Adds decoration to text (`none`, `underline`, `overline`, `line-through`) |
| `text-transform` | Controls capitalization (`uppercase`, `lowercase`, `capitalize`) |
| `text-indent` | Indents the first line of a text block |
| `text-shadow` | Adds shadow to text |
| `white-space` | Controls how whitespace is handled |
| `word-break` | Controls line breaking rules for words |
| `word-wrap` / `overflow-wrap` | Allows long words to break and wrap to next line |
| `vertical-align` | Sets vertical alignment of inline or table-cell elements |
| `direction` | Sets text direction (`ltr`, `rtl`) |

### List

| Property | Description |
|---|---|
| `list-style` | Shorthand for list properties |
| `list-style-type` | Sets the bullet type (`disc`, `circle`, `square`, `decimal`, `none`, etc.) |
| `list-style-position` | Sets marker position (`inside`, `outside`) |
| `list-style-image` | Uses an image as the list marker |

### Table

| Property | Description |
|---|---|
| `border-collapse` | Merges table cell borders (`collapse`, `separate`) |
| `border-spacing` | Sets spacing between cells (when `separate`) |
| `caption-side` | Sets position of table caption (`top`, `bottom`) |
| `empty-cells` | Controls display of empty cells (`show`, `hide`) |
| `table-layout` | Sets table layout algorithm (`auto`, `fixed`) |

### Transform and Transition

| Property | Description |
|---|---|
| `transform` | Applies 2D or 3D transformations (`translate`, `rotate`, `scale`, `skew`, `matrix`) |
| `transform-origin` | Sets the origin point for transformations |
| `transition` | Shorthand for transition properties |
| `transition-property` | Specifies which properties to transition |
| `transition-duration` | Sets how long the transition takes |
| `transition-timing-function` | Sets the speed curve (`ease`, `linear`, `ease-in`, `ease-out`, `ease-in-out`, `cubic-bezier()`) |
| `transition-delay` | Sets a delay before the transition starts |

### Animation

| Property | Description |
|---|---|
| `animation` | Shorthand for animation properties |
| `animation-name` | Names the `@keyframes` animation |
| `animation-duration` | How long the animation takes |
| `animation-timing-function` | Speed curve of the animation |
| `animation-delay` | Delay before starting |
| `animation-iteration-count` | Number of times to repeat (`infinite` for looping) |
| `animation-direction` | Whether the animation alternates direction (`normal`, `reverse`, `alternate`) |
| `animation-fill-mode` | Styles applied before/after animation (`none`, `forwards`, `backwards`, `both`) |
| `animation-play-state` | Pauses or runs the animation (`running`, `paused`) |

### Flexbox (Container)

| Property | Description |
|---|---|
| `display: flex` | Creates a flex container |
| `flex-direction` | Sets main axis direction (`row`, `column`, `row-reverse`, `column-reverse`) |
| `flex-wrap` | Controls wrapping (`nowrap`, `wrap`, `wrap-reverse`) |
| `flex-flow` | Shorthand for `flex-direction` and `flex-wrap` |
| `justify-content` | Aligns items along the main axis |
| `align-items` | Aligns items along the cross axis |
| `align-content` | Aligns wrapped lines |
| `gap` / `row-gap` / `column-gap` | Sets spacing between flex items |

### Flexbox (Items)

| Property | Description |
|---|---|
| `flex` | Shorthand for `flex-grow`, `flex-shrink`, `flex-basis` |
| `flex-grow` | How much the item grows relative to others |
| `flex-shrink` | How much the item shrinks relative to others |
| `flex-basis` | Default size before distributing space |
| `order` | Sets visual order of flex items |
| `align-self` | Overrides container `align-items` for one item |

### Grid (Container)

| Property | Description |
|---|---|
| `display: grid` | Creates a grid container |
| `grid-template-columns` | Defines column track sizes |
| `grid-template-rows` | Defines row track sizes |
| `grid-template-areas` | Defines named grid areas |
| `grid-template` | Shorthand for rows, columns, areas |
| `gap` / `row-gap` / `column-gap` | Spacing between grid tracks |
| `grid-auto-rows` / `grid-auto-columns` | Size for implicitly created tracks |
| `grid-auto-flow` | Controls auto-placement algorithm (`row`, `column`, `dense`) |
| `justify-items` / `align-items` | Aligns items within their cells |
| `justify-content` / `align-content` | Aligns the grid within its container |

### Grid (Items)

| Property | Description |
|---|---|
| `grid-column` | Shorthand for `grid-column-start` / `grid-column-end` |
| `grid-row` | Shorthand for `grid-row-start` / `grid-row-end` |
| `grid-area` | Assigns item to a named area or shorthand for row/column placement |
| `justify-self` / `align-self` | Aligns an individual item within its cell |

### Other Common Properties

| Property | Description |
|---|---|
| `cursor` | Sets the mouse cursor type (`pointer`, `default`, `grab`, `text`, etc.) |
| `box-shadow` | Adds shadow effects to elements |
| `filter` | Applies graphical effects (`blur()`, `brightness()`, `contrast()`, `grayscale()`, etc.) |
| `clip-path` | Clips an element to a shape |
| `object-fit` | How replaced elements (img, video) fit their container (`fill`, `contain`, `cover`, `none`) |
| `object-position` | Position of replaced element content within its box |
| `resize` | Whether an element is resizable (`none`, `both`, `horizontal`, `vertical`) |
| `user-select` | Controls whether text can be selected (`none`, `auto`, `text`, `all`) |
| `pointer-events` | Controls whether an element reacts to pointer events |
| `content` | Used with `::before` and `::after` pseudo-elements |
| `counter-reset` / `counter-increment` | Creates and increments CSS counters |
| `will-change` | Hints to the browser about upcoming changes for optimization |
| `aspect-ratio` | Sets a preferred aspect ratio for the element |
| `accent-color` | Sets the accent color for form controls |
| `scroll-behavior` | Controls smooth scrolling (`auto`, `smooth`) |

---

## 2. CSS Selectors

> Source: https://www.w3schools.com/cssref/css_selectors.php

### Basic Selectors

| Selector | Example | Description |
|---|---|---|
| `*` | `* { }` | Selects all elements |
| `element` | `p { }` | Selects all `<p>` elements |
| `.class` | `.intro { }` | Selects all elements with `class="intro"` |
| `#id` | `#firstname { }` | Selects the element with `id="firstname"` |
| `element.class` | `p.intro { }` | Selects `<p>` elements with `class="intro"` |

### Grouping

| Selector | Example | Description |
|---|---|---|
| `sel1, sel2` | `div, p { }` | Selects all `<div>` and all `<p>` elements |

### Combinator Selectors

| Selector | Example | Description |
|---|---|---|
| `ancestor descendant` | `div p { }` | Selects all `<p>` inside `<div>` (any depth) |
| `parent > child` | `div > p { }` | Selects `<p>` that are direct children of `<div>` |
| `element + sibling` | `div + p { }` | Selects the first `<p>` immediately after `<div>` |
| `element ~ siblings` | `div ~ p { }` | Selects all `<p>` that are siblings after `<div>` |

### Attribute Selectors

| Selector | Example | Description |
|---|---|---|
| `[attr]` | `[target] { }` | Elements with a `target` attribute |
| `[attr=value]` | `[target="_blank"] { }` | Elements where `target` equals `_blank` |
| `[attr~=value]` | `[title~="flower"] { }` | Attribute contains the word `flower` |
| `[attr\|=value]` | `[lang\|="en"] { }` | Attribute starts with `en` (exact or followed by `-`) |
| `[attr^=value]` | `a[href^="https"] { }` | Attribute value begins with `https` |
| `[attr$=value]` | `a[href$=".pdf"] { }` | Attribute value ends with `.pdf` |
| `[attr*=value]` | `a[href*="w3schools"] { }` | Attribute value contains `w3schools` |

---

## 3. Pseudo-Classes and Pseudo-Elements

> Source: https://www.w3schools.com/cssref/css_ref_pseudo_classes.php

### Pseudo-Classes

Pseudo-classes select elements based on state or position.

**Link and User Action States:**

| Pseudo-Class | Description |
|---|---|
| `:link` | Unvisited links |
| `:visited` | Visited links |
| `:hover` | Element being hovered over |
| `:active` | Element being activated (e.g., clicked) |
| `:focus` | Element that has focus |
| `:focus-within` | Element that contains a focused element |
| `:focus-visible` | Element focused via keyboard (not mouse) |

**Form / Input States:**

| Pseudo-Class | Description |
|---|---|
| `:checked` | Checked checkbox or radio button |
| `:disabled` | Disabled form elements |
| `:enabled` | Enabled form elements |
| `:required` | Form elements with `required` attribute |
| `:optional` | Form elements without `required` attribute |
| `:valid` | Form elements with valid values |
| `:invalid` | Form elements with invalid values |
| `:in-range` | Input values within a specified range |
| `:out-of-range` | Input values outside a specified range |
| `:read-only` | Elements with `readonly` attribute |
| `:read-write` | Elements without `readonly` attribute |
| `:placeholder-shown` | Input elements currently showing placeholder text |
| `:default` | The default form element |
| `:indeterminate` | Checkbox/radio with indeterminate state |

**Structural Pseudo-Classes:**

| Pseudo-Class | Description |
|---|---|
| `:first-child` | First child of its parent |
| `:last-child` | Last child of its parent |
| `:nth-child(n)` | The nth child (`n`, `2n`, `odd`, `even`, `3n+1`, etc.) |
| `:nth-last-child(n)` | The nth child counting from the end |
| `:only-child` | Only child of its parent |
| `:first-of-type` | First element of its type within parent |
| `:last-of-type` | Last element of its type within parent |
| `:nth-of-type(n)` | The nth element of its type |
| `:nth-last-of-type(n)` | The nth element of its type counting from end |
| `:only-of-type` | Only element of its type within parent |
| `:root` | The document root element (usually `<html>`) |
| `:empty` | Elements with no children or text |

**Other Pseudo-Classes:**

| Pseudo-Class | Description |
|---|---|
| `:not(selector)` | Elements that do NOT match the selector |
| `:is(selector)` | Matches any element that matches one of the selectors in the list |
| `:where(selector)` | Same as `:is()` but with zero specificity |
| `:has(selector)` | Parent selector -- matches if the element has a descendant matching the selector |
| `:target` | Element whose ID matches the URL fragment (e.g., `#section1`) |
| `:lang(language)` | Elements with a specified language attribute |

### Pseudo-Elements

Pseudo-elements style specific parts of an element.

| Pseudo-Element | Description |
|---|---|
| `::before` | Inserts content before the element's content |
| `::after` | Inserts content after the element's content |
| `::first-line` | Styles the first line of a block element |
| `::first-letter` | Styles the first letter of a block element |
| `::selection` | Styles the portion selected/highlighted by the user |
| `::placeholder` | Styles the placeholder text of an input |
| `::marker` | Styles the marker (bullet/number) of list items |
| `::backdrop` | Styles the backdrop behind a dialog or fullscreen element |

---

## 4. CSS At-Rules

> Source: https://www.w3schools.com/cssref/css_ref_atrules.php

| At-Rule | Description |
|---|---|
| `@charset` | Specifies the character encoding of the stylesheet (e.g., `@charset "UTF-8";`) |
| `@import` | Imports an external stylesheet (`@import url("style.css");`) |
| `@font-face` | Defines a custom font to be used in the document |
| `@keyframes` | Defines animation keyframes for `animation-name` |
| `@media` | Applies styles conditionally based on media queries |
| `@supports` | Applies styles only if the browser supports a given CSS feature |
| `@page` | Defines styles for printed pages (margins, size, etc.) |
| `@layer` | Declares cascade layers to control specificity ordering |
| `@container` | Applies styles based on the size of a container element |
| `@property` | Registers a custom property with a defined syntax, inheritance, and initial value |
| `@scope` | Limits styles to a specific DOM subtree |
| `@starting-style` | Defines styles for CSS transitions when an element first appears |
| `@counter-style` | Defines custom counter styles for list markers |
| `@namespace` | Declares an XML namespace for use in CSS selectors |
| `@color-profile` | Defines a color profile for use with `color()` function |

### Common At-Rule Examples

```css
/* @font-face -- define a custom font */
@font-face {
  font-family: "MyFont";
  src: url("myfont.woff2") format("woff2"),
       url("myfont.woff") format("woff");
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

/* @keyframes -- define an animation */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* @media -- responsive styles */
@media screen and (max-width: 768px) {
  .container { flex-direction: column; }
}

/* @supports -- feature detection */
@supports (display: grid) {
  .container { display: grid; }
}

/* @layer -- cascade layers */
@layer base, components, utilities;
@layer base {
  body { margin: 0; }
}

/* @container -- container queries */
@container (min-width: 400px) {
  .card { grid-template-columns: 1fr 1fr; }
}
```

---

## 5. CSS Styling Basics

> Source: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics

### What is CSS?

**CSS (Cascading Style Sheets)** is used to style and lay out web pages. It controls fonts, colors, sizes, spacing, layout, animations, and other visual aspects.

### CSS Syntax

```css
selector {
  property: value;
  property: value;
}
```

A **rule** (or **ruleset**) consists of a **selector** and a **declaration block** containing one or more **declarations** (property-value pairs).

### Applying CSS to HTML

There are three ways to apply CSS:

1. **External Stylesheet** (recommended):
   ```html
   <link rel="stylesheet" href="styles.css">
   ```

2. **Internal Stylesheet**:
   ```html
   <style>
     p { color: red; }
   </style>
   ```

3. **Inline Styles** (avoid when possible):
   ```html
   <p style="color: red;">Text</p>
   ```

### The Cascade, Specificity, and Inheritance

- **Cascade**: When multiple rules target the same element, later rules override earlier ones (all else being equal).
- **Specificity**: More specific selectors override less specific ones. Specificity ranking (low to high):
  - Type selectors (`p`, `div`) and pseudo-elements
  - Class selectors (`.intro`), attribute selectors, and pseudo-classes
  - ID selectors (`#main`)
  - Inline styles
  - `!important` (overrides all, use sparingly)
- **Inheritance**: Some properties (mostly text-related) are inherited by child elements; others (mostly layout-related) are not.

### Values and Units

| Unit | Type | Description |
|---|---|---|
| `px` | Absolute | Pixels (most common absolute unit) |
| `em` | Relative | Relative to parent element font size |
| `rem` | Relative | Relative to root element font size |
| `%` | Relative | Percentage of parent element's value |
| `vw` / `vh` | Relative | 1% of viewport width / height |
| `vmin` / `vmax` | Relative | 1% of the smaller/larger viewport dimension |
| `ch` | Relative | Width of the `0` character |
| `fr` | Fraction | Fraction of available space (Grid only) |

### Color Values

```css
color: red;                        /* Named color */
color: #ff0000;                    /* Hex */
color: #f00;                       /* Hex shorthand */
color: rgb(255, 0, 0);             /* RGB */
color: rgba(255, 0, 0, 0.5);      /* RGB with alpha */
color: rgb(255 0 0 / 50%);        /* Modern RGB syntax */
color: hsl(0, 100%, 50%);         /* HSL */
color: hsla(0, 100%, 50%, 0.5);   /* HSL with alpha */
color: hsl(0 100% 50% / 50%);     /* Modern HSL syntax */
```

---

## 6. The Box Model

> Source: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Box_model

### The Four Layers

Every CSS element is surrounded by a box with four layers (inside to outside):

1. **Content Box** -- where content is displayed; sized with `width` and `height`
2. **Padding Box** -- space around content; sized with `padding`
3. **Border Box** -- wraps content and padding; sized with `border`
4. **Margin Box** -- outermost space around the element; sized with `margin`

### Standard vs. Alternative Box Model

**Standard (default -- `content-box`):**
```css
.box {
  width: 350px;       /* Content width only */
  padding: 25px;
  border: 5px solid black;
  margin: 10px;
}
/* Total rendered width: 350 + 25 + 25 + 5 + 5 = 410px */
```

**Alternative (`border-box`):**
```css
.box {
  box-sizing: border-box;
  width: 350px;       /* Includes padding and border */
  padding: 25px;
  border: 5px solid black;
  margin: 10px;
}
/* Total rendered width: 350px (content area shrinks to fit) */
```

**Recommended global reset:**
```css
html {
  box-sizing: border-box;
}

*,
*::before,
*::after {
  box-sizing: inherit;
}
```

### Block vs. Inline vs. Inline-Block

| Behavior | Block | Inline | Inline-Block |
|---|---|---|---|
| Breaks onto new line | Yes | No | No |
| Respects `width`/`height` | Yes | No | Yes |
| Padding/margin push others away | Yes | Left/right only | Yes |
| Fills container width by default | Yes | No | No |
| Common elements | `div`, `p`, `h1`-`h6`, `section` | `a`, `span`, `em`, `strong` | -- (set via CSS) |

### Margin Collapsing

When vertical margins of adjacent block elements touch, they collapse:

- **Two positive margins**: The larger value wins
- **Two negative margins**: The smallest (most negative) value wins
- **One positive + one negative**: They are subtracted from each other

```css
.one { margin-bottom: 50px; }
.two { margin-top: 30px; }
/* Result: 50px gap between them (not 80px) */
```

### Shorthand Notation

```css
/* All four sides */
margin: 10px;                      /* All sides 10px */
margin: 10px 20px;                 /* Vertical 10px, Horizontal 20px */
margin: 10px 20px 30px;            /* Top 10px, Horizontal 20px, Bottom 30px */
margin: 10px 20px 30px 40px;       /* Top, Right, Bottom, Left (clockwise) */
```

---

## 7. Flexbox Layout

> Source: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Flexbox

Flexbox is a **one-dimensional** layout method for arranging items in rows or columns.

### Axes

- **Main Axis**: The direction items are laid out (default: horizontal)
- **Cross Axis**: Perpendicular to the main axis (default: vertical)

### Container Properties

```css
.container {
  display: flex;               /* or inline-flex */

  /* Direction */
  flex-direction: row;         /* row | row-reverse | column | column-reverse */

  /* Wrapping */
  flex-wrap: nowrap;           /* nowrap | wrap | wrap-reverse */

  /* Shorthand for direction + wrap */
  flex-flow: row wrap;

  /* Main axis alignment */
  justify-content: flex-start; /* flex-start | flex-end | center |
                                  space-between | space-around | space-evenly */

  /* Cross axis alignment */
  align-items: stretch;        /* stretch | flex-start | flex-end |
                                  center | baseline */

  /* Multi-line cross axis alignment (when wrapping) */
  align-content: stretch;      /* stretch | flex-start | flex-end | center |
                                  space-between | space-around */

  /* Spacing */
  gap: 10px;                   /* row-gap and column-gap shorthand */
}
```

### Item Properties

```css
.item {
  /* Growth/shrink behavior (shorthand) */
  flex: 1;                     /* flex-grow: 1, flex-shrink: 1, flex-basis: 0 */
  flex: 1 200px;               /* flex-grow: 1, flex-basis: 200px */

  /* Individual properties */
  flex-grow: 0;                /* How much the item grows (0 = don't grow) */
  flex-shrink: 1;              /* How much the item shrinks (0 = don't shrink) */
  flex-basis: auto;            /* Default size before space distribution */

  /* Visual ordering */
  order: 0;                    /* Lower values appear first; default is 0 */

  /* Individual cross-axis alignment */
  align-self: auto;            /* auto | flex-start | flex-end | center |
                                  baseline | stretch */
}
```

### Common Patterns

```css
/* Equal-width columns */
.item { flex: 1; }

/* Centering an item vertically and horizontally */
.container {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Responsive wrapping layout */
.container {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
.item {
  flex: 1 1 300px;   /* Grow, shrink, min-width 300px */
}

/* Sticky footer layout */
body {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
main { flex: 1; }
```

---

## 8. Grid Layout

> Source: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Grids

CSS Grid is a **two-dimensional** layout system for organizing content into rows and columns.

### Container Properties

```css
.container {
  display: grid;               /* or inline-grid */

  /* Define columns and rows */
  grid-template-columns: 200px 1fr 200px;
  grid-template-rows: auto 1fr auto;

  /* Using repeat() */
  grid-template-columns: repeat(3, 1fr);

  /* Responsive auto-fill / auto-fit */
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));

  /* Named areas */
  grid-template-areas:
    "header  header  header"
    "sidebar content content"
    "footer  footer  footer";

  /* Gaps between tracks */
  gap: 20px;
  column-gap: 20px;
  row-gap: 20px;

  /* Size for implicitly created tracks */
  grid-auto-rows: minmax(100px, auto);
  grid-auto-columns: 1fr;

  /* Auto-placement algorithm */
  grid-auto-flow: row;         /* row | column | dense */

  /* Align all items within their cells */
  justify-items: stretch;      /* start | end | center | stretch */
  align-items: stretch;        /* start | end | center | stretch */

  /* Align the grid within its container */
  justify-content: start;      /* start | end | center | stretch |
                                  space-between | space-around | space-evenly */
  align-content: start;
}
```

### Key Functions

| Function | Description |
|---|---|
| `repeat(count, size)` | Repeats a track definition (e.g., `repeat(3, 1fr)`) |
| `minmax(min, max)` | Sets a minimum and maximum size for a track |
| `auto-fill` | Creates as many tracks as fit the container (empty tracks remain) |
| `auto-fit` | Creates as many tracks as fit, then collapses empty tracks |
| `fit-content(max)` | Sizes track to content, up to a maximum |

### The `fr` Unit

The `fr` unit represents one fraction of available space:
```css
grid-template-columns: 2fr 1fr 1fr;
/* First column gets 50%, others get 25% each */
```

### Item Properties

```css
.item {
  /* Placement by line numbers */
  grid-column: 1 / 3;         /* Start at line 1, end at line 3 */
  grid-row: 1 / 2;

  /* Placement by span */
  grid-column: 1 / span 2;    /* Start at line 1, span 2 columns */

  /* Full-width item */
  grid-column: 1 / -1;        /* Line 1 to the last line */

  /* Placement by named area */
  grid-area: header;

  /* Self-alignment within cell */
  justify-self: center;       /* start | end | center | stretch */
  align-self: center;
}
```

### Named Grid Areas Example

```css
.container {
  display: grid;
  grid-template-columns: 1fr 3fr;
  grid-template-areas:
    "header  header"
    "sidebar content"
    "footer  footer";
  gap: 20px;
}

header  { grid-area: header; }
aside   { grid-area: sidebar; }
main    { grid-area: content; }
footer  { grid-area: footer; }
```

### Subgrid

A grid item can inherit its parent's track definitions:
```css
.nested {
  display: grid;
  grid-template-columns: subgrid;
}
```

### Explicit vs. Implicit Grid

- **Explicit grid**: Tracks defined by `grid-template-columns` / `grid-template-rows`
- **Implicit grid**: Auto-generated tracks for content that overflows; controlled by `grid-auto-rows` / `grid-auto-columns`

---

## 9. Media Queries

> Source: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Media_queries

### Syntax

```css
@media media-type and (media-feature) {
  /* CSS rules */
}
```

### Media Types

| Type | Description |
|---|---|
| `all` | All devices (default) |
| `screen` | Screens (monitors, phones, tablets) |
| `print` | Print preview and printed pages |

### Common Media Features

| Feature | Description | Example |
|---|---|---|
| `width` / `min-width` / `max-width` | Viewport width | `(min-width: 768px)` |
| `height` / `min-height` / `max-height` | Viewport height | `(min-height: 600px)` |
| `orientation` | Portrait or landscape | `(orientation: landscape)` |
| `hover` | Can the user hover? | `(hover: hover)` |
| `pointer` | Pointing device precision | `(pointer: fine)` or `(pointer: coarse)` |
| `prefers-color-scheme` | User's color scheme preference | `(prefers-color-scheme: dark)` |
| `prefers-reduced-motion` | User prefers reduced motion | `(prefers-reduced-motion: reduce)` |
| `aspect-ratio` | Viewport aspect ratio | `(aspect-ratio: 16/9)` |
| `resolution` | Device pixel density | `(min-resolution: 2dppx)` |

### Logical Operators

```css
/* AND -- all conditions must be true */
@media screen and (min-width: 600px) and (orientation: landscape) { }

/* OR -- comma-separated; any condition can be true */
@media (min-width: 600px), (orientation: landscape) { }

/* NOT -- negates the entire query */
@media not screen and (min-width: 600px) { }

/* Range syntax (modern) */
@media (30em <= width <= 50em) { }
```

### Mobile-First Responsive Design

Start with mobile styles, then add complexity for larger screens:

```css
/* Base styles (mobile) */
.container {
  width: 90%;
  margin: 0 auto;
}

/* Medium screens (tablets) */
@media screen and (min-width: 40em) {
  .container {
    display: grid;
    grid-template-columns: 3fr 1fr;
    gap: 20px;
  }

  nav ul {
    display: flex;
  }
}

/* Large screens (desktop) */
@media screen and (min-width: 70em) {
  .container {
    max-width: 1200px;
  }
}
```

### Viewport Meta Tag (Required)

Always include this in your HTML `<head>` for responsive design to work on mobile:

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

### Common Breakpoints

While there are no universal breakpoints, commonly used values include:

| Label | Breakpoint |
|---|---|
| Small phones | `< 576px` |
| Phones / large phones | `>= 576px` |
| Tablets | `>= 768px` |
| Desktops | `>= 992px` |
| Large desktops | `>= 1200px` |
| Extra large | `>= 1400px` |

**Best practice**: Do not target specific devices. Instead, add breakpoints where your content needs them -- when line lengths get too long or layouts break.

### Responsive Without Media Queries

Modern CSS layout methods can be inherently responsive:

```css
/* Auto-responsive grid -- no media query needed */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

/* Fluid typography */
h1 {
  font-size: clamp(1.5rem, 4vw, 3rem);
}
```

### Print Styles

```css
@media print {
  nav, .sidebar, footer {
    display: none;
  }

  body {
    font-size: 12pt;
    color: black;
    background: white;
  }

  a[href]::after {
    content: " (" attr(href) ")";
  }
}
```

### Dark Mode Support

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg-color: #1a1a1a;
    --text-color: #e0e0e0;
  }

  body {
    background-color: var(--bg-color);
    color: var(--text-color);
  }
}
```

---

## Quick Syntax Cheat Sheet

```css
/* Variables (Custom Properties) */
:root {
  --primary: #3498db;
  --spacing: 1rem;
}
.element {
  color: var(--primary);
  padding: var(--spacing);
}

/* Nesting (modern CSS) */
.card {
  background: white;
  & .title {
    font-size: 1.5rem;
  }
  &:hover {
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }
}

/* Logical Properties */
margin-inline: auto;          /* left + right margin */
margin-block: 1rem;           /* top + bottom margin */
padding-inline-start: 1rem;   /* left in LTR, right in RTL */

/* Container Queries */
.card-container {
  container-type: inline-size;
}
@container (min-width: 400px) {
  .card { flex-direction: row; }
}

/* Scroll Snap */
.scroll-container {
  scroll-snap-type: x mandatory;
}
.scroll-item {
  scroll-snap-align: start;
}
```

---

*This reference was compiled from content at w3schools.com and developer.mozilla.org (MDN Web Docs). For full details, visit the source URLs listed above each section.*
