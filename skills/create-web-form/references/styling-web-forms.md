# Styling Web Forms Reference

---

## 1. Styling Web Forms

> **Source:** <https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Styling_web_forms>

### Overview

This section covers CSS techniques for styling HTML form elements. It is essential for understanding which form elements are easy to style and which require special techniques.

**Prerequisites:**

- Basic understanding of HTML
- CSS styling basics

**Objective:** Learn styling techniques applicable to form widgets and understand the challenges involved.

### Challenges in Styling Form Widgets

#### Historical Context

- **1995:** HTML 2 specification introduced form controls.
- **Late 1996:** CSS was released but was not widely supported.
- **Early era:** Browsers relied on operating system rendering for form widgets.
- **Modern era:** Most form widgets are now stylable, with some exceptions.

#### Form Widget Classification

**Easy-to-Style Elements:**

1. `<form>`
2. `<fieldset>` and `<legend>`
3. Single-line text `<input>` (type: text, url, email)
4. Multi-line `<textarea>`
5. Buttons (`<input>` and `<button>`)
6. `<label>`
7. `<output>`

**Harder-to-Style Elements:**

- Checkboxes and radio buttons
- `<input type="search">`
- (See "Advanced Form Styling" section for techniques)

**Cannot Be Styled with CSS Alone:**

- `<input type="color">`
- Date-related controls (`<input type="datetime-local">`)
- `<input type="range">`
- `<input type="file">`
- `<select>`, `<option>`, `<optgroup>`, `<datalist>`
- `<progress>` and `<meter>`

### Styling Simple Form Widgets

#### Fonts and Text

**Problem:** Browsers do not consistently inherit `font-family` and `font-size` -- many use system defaults instead.

**Solution:** Force inheritance for consistent styling:

```css
button,
input,
select,
textarea {
  font-family: inherit;
  font-size: 100%;
}
```

The `inherit` value matches the parent element's computed property value.

**Note:** `<input type="submit">` does not inherit in all browsers; use `<button>` instead for better consistency.

#### Box Sizing

**Problem:** Each widget has different default border, padding, and margin rules.

**Solution:** Use `box-sizing` with consistent dimensions:

```css
input,
textarea,
select,
button {
  width: 150px;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}
```

This ensures all elements occupy the same space despite native platform defaults.

#### Legend Placement

The `<legend>` element sits over the `<fieldset>` border by default. To reposition it:

```css
fieldset {
  position: relative;
}

legend {
  position: absolute;
  bottom: 0;
  right: 0;
  color: white;
  background-color: black;
  padding: 3px;
}
```

Example HTML:

```html
<form>
  <fieldset>
    <legend>Choose all the vegetables you like to eat</legend>
    <ul>
      <li>
        <label for="carrots">Carrots</label>
        <input
          type="checkbox"
          checked
          id="carrots"
          name="carrots"
          value="carrots" />
      </li>
      <li>
        <label for="peas">Peas</label>
        <input type="checkbox" id="peas" name="peas" value="peas" />
      </li>
    </ul>
  </fieldset>
</form>
```

**Accessibility Note:** `<legend>` content is spoken by assistive technologies. Reposition it visually but keep it in the DOM. Consider using `transform` instead of positioning to avoid border gaps.

### Practical Styling Example: Postcard Form

#### HTML Structure

```html
<form>
  <h1>to: Mozilla</h1>

  <div id="from">
    <label for="name">from:</label>
    <input type="text" id="name" name="user_name" />
  </div>

  <div id="reply">
    <label for="mail">reply:</label>
    <input type="email" id="mail" name="user_email" />
  </div>

  <div id="message">
    <label for="msg">Your message:</label>
    <textarea id="msg" name="user_message"></textarea>
  </div>

  <div class="button">
    <button type="submit">Send your message</button>
  </div>
</form>
```

#### Set Up Web Fonts

```css
@font-face {
  font-family: "handwriting";
  src:
    url("fonts/journal-webfont.woff2") format("woff2"),
    url("fonts/journal-webfont.woff") format("woff");
  font-weight: normal;
  font-style: normal;
}

@font-face {
  font-family: "typewriter";
  src:
    url("fonts/momot___-webfont.woff2") format("woff2"),
    url("fonts/momot___-webfont.woff") format("woff");
  font-weight: normal;
  font-style: normal;
}
```

#### Overall Layout

```css
body {
  font: 1.3rem sans-serif;
  padding: 0.5em;
  margin: 0;
  background: #222222;
}

form {
  position: relative;
  width: 740px;
  height: 498px;
  margin: 0 auto;
  padding: 1em;
  box-sizing: border-box;
  background: white url("background.jpg");

  /* CSS Grid for layout */
  display: grid;
  grid-gap: 20px;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: 10em 1em 1em 1em;
}
```

#### Heading and Layout

```css
h1 {
  font:
    1em "typewriter",
    monospace;
  align-self: end;
}

#message {
  grid-row: 1 / 5;
}

#from,
#reply {
  display: flex;
}
```

#### Labels

```css
label {
  font:
    0.8em "typewriter",
    sans-serif;
}
```

#### Text Fields

```css
input,
textarea {
  font:
    1.4em/1.5em "handwriting",
    cursive,
    sans-serif;
  border: none;
  padding: 0 10px;
  margin: 0;
  width: 80%;
  background: none;
}

input:focus,
textarea:focus {
  background: rgb(0 0 0 / 10%);
  border-radius: 5px;
}
```

#### Textarea Adjustments

```css
textarea {
  display: block;
  padding: 10px;
  margin: 10px 0 0 -10px;
  width: 100%;
  height: 90%;
  border-right: 1px solid;
  /* resize: none; */
  overflow: auto;
}
```

Tips:

- Use `resize: none` only if necessary (avoid restricting user control).
- Set `overflow: auto` for consistent cross-browser rendering.

#### Button Styling

```css
button {
  padding: 5px;
  font: bold 0.6em sans-serif;
  border: 2px solid #333333;
  border-radius: 5px;
  background: none;
  cursor: pointer;
  transform: rotate(-1.5deg);
}

button::after {
  content: " >>>";
}

button:hover,
button:focus {
  background: black;
  color: white;
}
```

### Key CSS Properties for Forms

| Property | Purpose |
|---|---|
| `font-family: inherit` | Inherit parent font |
| `font-size: 100%` | Inherit parent size |
| `box-sizing: border-box` | Include padding/border in width |
| `border: none` | Remove default borders |
| `padding` | Add space inside elements |
| `margin` | Add space outside elements |
| `background` | Control background appearance |
| `:focus` | Style focused form fields |
| `resize` | Allow/prevent textarea resizing |
| `overflow: auto` | Handle scrolling consistently |

### Best Practices

1. **Consistency:** Use `box-sizing: border-box` for predictable sizing.
2. **Inheritance:** Explicitly set `font-family` and `font-size` on form elements.
3. **Accessibility:** Always include `:focus` styles for keyboard navigation.
4. **Browser Support:** Test across browsers for consistent rendering.
5. **User Control:** Avoid removing useful defaults like textarea resizing.
6. **Custom Fonts:** Use `@font-face` with multiple formats (woff2 + woff) for compatibility.

---

## 2. Advanced Form Styling

> **Source:** <https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Advanced_form_styling>

### Overview

This section covers styling form controls that are difficult to style using CSS, categorized into "bad" (more complex CSS needed) and "ugly" (impossible to style thoroughly) categories.

**The Bad:**

- Checkboxes and radio buttons
- `<input type="search">`

**The Ugly:**

- Dropdown widgets: `<select>`, `<option>`, `<optgroup>`, `<datalist>`
- `<input type="color">`
- Date-related controls: `<input type="datetime-local">`
- `<input type="range">`
- `<input type="file">`
- `<progress>` and `<meter>`

### The `appearance` Property

The `appearance` property controls OS-level styling on form controls. The most useful value is `none`, which removes system-level styling and allows custom CSS styling.

```css
input {
  appearance: none;
}
```

This stops controls from using system-level styling, allowing you to build custom styles using CSS.

### Styling Checkboxes and Radio Buttons

#### Approach: Using `appearance: none`

Remove the default checkbox/radio styles completely and create custom designs:

```html
<form>
  <fieldset>
    <legend>Fruit preferences</legend>
    <p>
      <label>
        <input type="checkbox" name="fruit" value="cherry" />
        I like cherry
      </label>
    </p>
    <p>
      <label>
        <input type="checkbox" name="fruit" value="banana" disabled />
        I can't like banana
      </label>
    </p>
  </fieldset>
</form>
```

#### CSS Custom Checkbox Styling

```css
input[type="checkbox"] {
  appearance: none;
  position: relative;
  width: 1em;
  height: 1em;
  border: 1px solid gray;
  /* Adjusts the position of the checkboxes on the text baseline */
  vertical-align: -2px;
  /* Set here so that Windows' High-Contrast Mode can override */
  color: green;
}

input[type="checkbox"]::before {
  content: "\2714";
  position: absolute;
  font-size: 1.2em;
  right: -1px;
  top: -0.3em;
  visibility: hidden;
}

input[type="checkbox"]:checked::before {
  /* Use `visibility` instead of `display` to avoid recalculating layout */
  visibility: visible;
}

input[type="checkbox"]:disabled {
  border-color: black;
  background: #dddddd;
  color: gray;
}
```

**Key Pseudo-Classes:**

- `:checked` -- checkbox/radio button is in a checked state
- `:disabled` -- checkbox/radio button is disabled and cannot be interacted with

### Search Boxes and `appearance`

For `<input type="search">` elements, `appearance: none` was historically necessary but is no longer required in Safari 16+.

Removing the "x" delete button:

```css
input[type="search"]:not(:focus, :active)::-webkit-search-cancel-button {
  display: none;
}
```

### Styling "Ugly" Form Controls

#### Global Normalization

Apply consistent styles across all form controls:

```css
button,
label,
input,
select,
progress,
meter {
  display: block;
  font-family: inherit;
  font-size: 100%;
  margin: 0;
  box-sizing: border-box;
  width: 100%;
  padding: 5px;
  height: 30px;
}

input[type="text"],
input[type="datetime-local"],
input[type="color"],
select {
  box-shadow: inset 1px 1px 3px #cccccc;
  border-radius: 5px;
}
```

### Styling Select and Datalist Elements

#### Creating a Custom Select Arrow

```html
<label for="select">Select box:</label>
<div class="select-wrapper">
  <select id="select" name="select">
    <option>Banana</option>
    <option>Cherry</option>
    <option>Lemon</option>
  </select>
</div>
```

```css
select {
  appearance: none;
  width: 100%;
  height: 100%;
}

.select-wrapper {
  position: relative;
}

.select-wrapper::after {
  content: "\25BC";
  font-size: 1rem;
  top: 3px;
  right: 10px;
  position: absolute;
}
```

**Limitations:**

- You cannot style the dropdown option box that appears when clicked.
- You cannot style the autocomplete list with `<datalist>`.
- For full control, use a library, build a custom control, or use the `multiple` attribute.

### Styling Date Input Types

Date/time inputs (`datetime-local`, `time`, `week`, `month`) have limited styling options:

```css
input[type="datetime-local"] {
  box-shadow: inset 1px 1px 3px #cccccc;
  border-radius: 5px;
}
```

The containing box can be styled, but internal parts (popup calendar, spinners) cannot. For full control, use a custom control library or build your own.

### Styling Range Input Types

Range sliders can be customized with significant CSS effort:

```css
input[type="range"] {
  appearance: none;
  background: red;
  height: 2px;
  padding: 0;
  outline: 1px solid transparent;
}
```

Full range styling requires complex CSS with browser-specific pseudo-elements (`::-webkit-slider-thumb`, `::-moz-range-thumb`, etc.).

### Styling Color Input Types

```css
input[type="color"] {
  border: 0;
  padding: 0;
}
```

For more significant customization, a custom solution is required.

### Styling File Input Types

File inputs are mostly stylable except for the file picker button, which is completely unstylable. The recommended approach is to hide the input and style the label.

```html
<label for="file">Choose a file to upload</label>
<input id="file" name="file" type="file" multiple />
```

```css
input[type="file"] {
  height: 0;
  padding: 0;
  opacity: 0;
}

label[for="file"] {
  box-shadow: 1px 1px 3px #cccccc;
  background: linear-gradient(to bottom, #eeeeee, #cccccc);
  border: 1px solid darkgrey;
  border-radius: 5px;
  text-align: center;
  line-height: 1.5;
}

label[for="file"]:hover {
  background: linear-gradient(to bottom, white, #dddddd);
}

label[for="file"]:active {
  box-shadow: inset 1px 1px 3px #cccccc;
}
```

#### JavaScript to Display File Information

```javascript
const fileInput = document.querySelector("#file");
const fileList = document.querySelector("#file-list");

fileInput.addEventListener("change", updateFileList);

function updateFileList() {
  while (fileList.firstChild) {
    fileList.removeChild(fileList.firstChild);
  }

  const curFiles = fileInput.files;

  if (curFiles.length > 0) {
    for (const file of curFiles) {
      const listItem = document.createElement("li");
      listItem.textContent = `File name: ${file.name}; file size: ${returnFileSize(file.size)}.`;
      fileList.appendChild(listItem);
    }
  }
}

function returnFileSize(number) {
  if (number < 1e3) {
    return `${number} bytes`;
  } else if (number >= 1e3 && number < 1e6) {
    return `${(number / 1e3).toFixed(1)} KB`;
  }
  return `${(number / 1e6).toFixed(1)} MB`;
}
```

### Styling Progress and Meter Elements

Progress bars and meters are the most difficult to style.

```css
progress,
meter {
  display: block;
  width: 100%;
  padding: 5px;
  height: 30px;
}
```

**Limitations:**

- Inconsistent height handling between browsers.
- Cannot style foreground bar color separately.
- `appearance: none` makes things worse, not better.
- **Recommendation:** Use custom solutions or third-party libraries.

### Summary of Styling Approaches

| Control Type | Approach | Difficulty |
|---|---|---|
| Checkbox/Radio | `appearance: none` + custom design | Medium |
| Search input | `appearance: none` for older browsers | Low |
| Select/Datalist | Wrapper + custom arrow, limited control | Medium |
| Date inputs | Basic styling only | High |
| Range slider | `appearance: none` + complex pseudo-elements | High |
| Color input | Remove borders/padding | Low |
| File input | Hide + style label | Medium |
| Progress/Meter | Custom solution recommended | Very High |

### Key Takeaways

1. Use `appearance: none` to remove OS-level styling before applying custom CSS.
2. Pseudo-classes like `:checked` and `:disabled` are essential for form control states.
3. Some controls (dropdown internals, file button, progress internals) have inherent limitations.
4. For full customization of "ugly" elements, consider custom JavaScript-based controls, third-party libraries, or modern HTML/CSS features like Customizable Select Elements.

---

## 3. Customizable Select Elements

> **Source:** <https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select>

### Overview

Customizable select elements allow you to build fully-styled `<select>` elements using experimental HTML and CSS features with full control over:

- The select button styling
- Drop-down picker appearance
- Arrow icon design
- Current selection checkmark
- Individual `<option>` element styling

**Warning:** Limited browser support exists for these features. Features may cause hydration failures with Server-Side Rendering (SSR) in some JavaScript frameworks.

### What Features Comprise a Customizable Select?

#### HTML Elements

**`<select>`, `<option>`, `<optgroup>` elements:**

- Work like traditional selects but with additional permitted content types.
- `<option>` elements can now contain markup (spans, images, semantic elements) not just text.

**`<button>` element inside `<select>`:**

- First child of the `<select>` element (previously not allowed).
- Replaces default button rendering of the closed select.
- Known as the **select button** (opens the drop-down picker).
- The select button is `inert` by default, making child interactive elements non-focusable.

**`<selectedcontent>` element:**

- Optionally placed inside the first `<button>` child.
- Displays the currently selected value in the closed `<select>`.
- Contains a clone of the currently-selected `<option>`'s content.

#### CSS Properties and Pseudo-Elements

| Feature | Purpose |
|---|---|
| `appearance: base-select` | Opts into browser-defined custom select styles (required on both `select` and `::picker(select)`) |
| `::picker(select)` | Targets the entire picker contents (all elements except the first `<button>`) |
| `::picker-icon` | Targets the arrow icon inside the select button |
| `::checkmark` | Targets the checkmark in the currently-selected `<option>` |
| `:open` | Targets select button when picker is open |
| `:checked` | Targets the currently-selected `<option>` |
| `:popover-open` | Targets picker in showing state (via Popover API) |

#### Automatic Behaviors

- **Invoker/Popover relationship** via the Popover API.
- **Implicit anchor reference** via CSS anchor positioning (no explicit anchor-name/position-anchor needed).
- **Automatic positioning** with fallback options to prevent viewport overflow.

### HTML Markup Structure

#### Basic Example: Pet Selector

```html
<form>
  <p>
    <label for="pet-select">Select pet:</label>
    <select id="pet-select">
      <button>
        <selectedcontent></selectedcontent>
      </button>

      <option value="">Please select a pet</option>
      <option value="cat">
        <span class="icon" aria-hidden="true">&#x1F431;</span>
        <span class="option-label">Cat</span>
      </option>
      <option value="dog">
        <span class="icon" aria-hidden="true">&#x1F436;</span>
        <span class="option-label">Dog</span>
      </option>
      <option value="hamster">
        <span class="icon" aria-hidden="true">&#x1F439;</span>
        <span class="option-label">Hamster</span>
      </option>
      <option value="chicken">
        <span class="icon" aria-hidden="true">&#x1F414;</span>
        <span class="option-label">Chicken</span>
      </option>
      <option value="fish">
        <span class="icon" aria-hidden="true">&#x1F41F;</span>
        <span class="option-label">Fish</span>
      </option>
      <option value="snake">
        <span class="icon" aria-hidden="true">&#x1F40D;</span>
        <span class="option-label">Snake</span>
      </option>
    </select>
  </p>
</form>
```

**Key Markup Points:**

- Use `aria-hidden="true"` on decorative icons to prevent duplicate announcements to assistive technology.
- `<button><selectedcontent></selectedcontent></button>` represents the select button and allows style customization.
- Multi-element `<option>` content is cloned into `<selectedcontent>` and displayed in the closed select.
- **Progressive enhancement:** Non-supporting browsers ignore the button structure and strip non-text option content.

#### Value Extraction Rules

When `<option>` contains multi-level DOM sub-trees:

1. Browser retrieves the `textContent` property.
2. Applies `trim()`.
3. Sets result as the `<select>` value.

### CSS Styling Techniques

#### 1. Opting Into Custom Select Rendering

**Required first step:**

```css
select,
::picker(select) {
  appearance: base-select;
}
```

This removes OS-level styling and enables custom browser base styles.

#### 2. Styling the Select Button

```css
* {
  box-sizing: border-box;
}

html {
  font-family: "Helvetica", "Arial", sans-serif;
}

select {
  border: 2px solid #dddddd;
  background: #eeeeee;
  padding: 10px;
  transition: 0.4s;
  flex: 1;
}

select:hover,
select:focus {
  background: #dddddd;
}
```

#### 3. Styling the Picker Icon

```css
select::picker-icon {
  color: #999999;
  transition: 0.4s rotate;
}

/* Rotate icon when picker opens */
select:open::picker-icon {
  rotate: 180deg;
}
```

#### 4. Styling the Drop-Down Picker

```css
::picker(select) {
  border: none;
  border-radius: 8px;
}

option {
  display: flex;
  justify-content: flex-start;
  gap: 20px;

  border: 2px solid #dddddd;
  background: #eeeeee;
  padding: 10px;
  transition: 0.4s;
}

/* Round top and bottom corners */
option:first-of-type {
  border-radius: 8px 8px 0 0;
}

option:last-of-type {
  border-radius: 0 0 8px 8px;
}

/* Remove internal borders except last */
option:not(option:last-of-type) {
  border-bottom: none;
}

/* Zebra striping */
option:nth-of-type(odd) {
  background: white;
}

/* Highlight on hover/focus */
option:hover,
option:focus {
  background: plum;
}

/* Style option icons */
option .icon {
  font-size: 1.6rem;
  text-box: trim-both cap alphabetic;
}
```

#### 5. Styling Selected Content in the Button

Hide icon when displayed in button (but keep it in picker):

```css
selectedcontent .icon {
  display: none;
}
```

#### 6. Styling the Currently Selected Option

```css
option:checked {
  font-weight: bold;
}
```

#### 7. Styling the Checkmark

Move to end with custom content:

```css
option::checkmark {
  order: 1;
  margin-left: auto;
  content: "\2611\FE0F";
}
```

**Note:** `::checkmark` is not in the accessibility tree; generated content will not be announced by assistive technology.

### Advanced Techniques

#### Popover Animations

Use Popover API states to animate picker visibility:

```css
/* Initial hidden state */
::picker(select) {
  opacity: 0;
  transition: all 0.4s allow-discrete;
}

/* Showing state */
::picker(select):popover-open {
  opacity: 1;
}

/* Required for animating from display: none */
@starting-style {
  ::picker(select):popover-open {
    opacity: 0;
  }
}
```

**Key points:**

- Use `allow-discrete` to enable discrete property animations.
- Animates both `opacity` and automatically-changed properties (`display`, `overlay`).
- `@starting-style` specifies the initial state for display transitions.

#### Anchor Positioning

Position picker relative to the select button:

```css
::picker(select) {
  top: calc(anchor(bottom) + 1px);
  left: anchor(10%);
}
```

**Details:**

- Implicit anchor reference (no explicit anchor-name needed).
- `anchor(bottom)` = bottom edge of the select button.
- `anchor(10%)` = 10% of button's width from its left edge.
- Browser default styles include position-try fallbacks for viewport overflow.

### Other Select Features

**`<select multiple>`:**

- Currently no support specified for customizable selects.
- To be addressed in future updates.

**`<optgroup>`:**

- Default styling: bolded and indented less than options.
- Must be styled to fit overall design.
- Can now contain `<legend>` element as child for easier targeting.
- `<legend>` text replaces/clarifies the `label` attribute.

### Browser Support and Compatibility

Check browser compatibility tables for:

- `<selectedcontent>`
- `::picker(select)`
- `::checkmark`
- `::picker-icon`
- `:open` pseudo-class
- `appearance: base-select`

**Progressive Enhancement:** Non-supporting browsers fall back to classic select behavior with text-only options.

### Key Benefits

1. **Full CSS customization** of select appearance.
2. **Rich option content** (images, multiple text spans).
3. **Smooth animations** via Popover API.
4. **Smart positioning** with anchor positioning.
5. **Progressive enhancement** -- works in older browsers.
6. **No JavaScript required** for basic functionality.
7. **Accessible by default** with ARIA-compatible structure.

---

## 4. UI Pseudo-Classes

> **Source:** <https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/UI_pseudo-classes>

### Overview

UI pseudo-classes in CSS allow you to style form controls based on their different states. This section covers styling forms in various states using CSS selectors.

**Prerequisites:**

- Basic understanding of HTML and CSS
- Knowledge of pseudo-classes and pseudo-elements

**Objective:** Understand what parts of forms are hard to style and why, and learn how to customize form controls using pseudo-classes.

### Available Pseudo-Classes

#### Common Pseudo-Classes

- **`:hover`** -- Selects an element only when hovered over by a mouse pointer.
- **`:focus`** -- Selects an element only when focused (tabbed to via keyboard).
- **`:active`** -- Selects an element only when being activated (clicked or Return/Enter pressed).

#### Form-Specific Pseudo-Classes

**Required and Optional:**

- **`:required`** -- Targets elements with the `required` HTML attribute.
- **`:optional`** -- Targets form controls that are optional.

**Validation States:**

- **`:valid`** -- Targets form controls with valid data.
- **`:invalid`** -- Targets form controls with invalid data.
- **`:in-range`** -- Targets numeric inputs within min/max range.
- **`:out-of-range`** -- Targets numeric inputs outside min/max range.

**Enabled/Disabled and Read States:**

- **`:enabled`** -- Targets elements that can be activated.
- **`:disabled`** -- Targets elements that cannot be interacted with.
- **`:read-only`** -- Targets elements with `readonly` attribute.
- **`:read-write`** -- Targets editable form controls (default state).

**Checkbox and Radio States:**

- **`:checked`** -- Targets selected checkboxes and radio buttons.
- **`:indeterminate`** -- Targets elements in neither checked nor unchecked state.
- **`:default`** -- Targets elements checked by default on page load.

**Additional Useful Pseudo-Classes:**

- **`:focus-within`** -- Matches an element or its descendants when focused.
- **`:focus-visible`** -- Matches elements focused via keyboard (not touch/mouse).
- **`:placeholder-shown`** -- Matches inputs/textareas showing placeholder text when empty.

### Styling Inputs Based on Required or Optional

#### HTML Structure

```html
<form>
  <fieldset>
    <legend>Feedback form</legend>
    <div>
      <label for="fname">First name: </label>
      <input id="fname" name="fname" type="text" required />
    </div>
    <div>
      <label for="lname">Last name: </label>
      <input id="lname" name="lname" type="text" required />
    </div>
    <div>
      <label for="email">Email address (if you want a response): </label>
      <input id="email" name="email" type="email" />
    </div>
    <div><button>Submit</button></div>
  </fieldset>
</form>
```

#### CSS Styling

```css
body {
  font-family: sans-serif;
  margin: 20px auto;
  max-width: 70%;
}

fieldset {
  padding: 10px 30px 0;
}

legend {
  color: white;
  background: black;
  padding: 5px 10px;
}

fieldset > div {
  margin-bottom: 20px;
  display: flex;
  flex-flow: row wrap;
}

button,
label,
input {
  display: block;
  font-size: 100%;
  box-sizing: border-box;
  width: 100%;
  padding: 5px;
}

input {
  box-shadow: inset 1px 1px 3px #cccccc;
  border-radius: 5px;
}

input:hover,
input:focus {
  background-color: #eeeeee;
}

button {
  width: 60%;
  margin: 0 auto;
}

/* Required vs Optional Styling */
input:required {
  border: 2px solid;
}

input:optional {
  border: 2px dashed;
}
```

**Key Points:**

- Required controls have a solid border; optional controls have a dashed border.
- Avoid using color alone to distinguish required vs optional (colorblind accessibility).
- Standard web convention: use an asterisk (*) or the word "required" for required fields.
- `:optional` is rarely used since form controls are optional by default.

### Using Generated Content with Pseudo-Classes

Use `::before` and `::after` pseudo-elements with the `content` property to add visual indicators without adding DOM elements. Screen readers will not read the generated content.

#### HTML with Span for Generated Content

```html
<form>
  <fieldset>
    <legend>Feedback form</legend>

    <p>Required fields are labeled with "required".</p>
    <div>
      <label for="fname">First name: </label>
      <input id="fname" name="fname" type="text" required />
      <span></span>
    </div>
    <div>
      <label for="lname">Last name: </label>
      <input id="lname" name="lname" type="text" required />
      <span></span>
    </div>
    <div>
      <label for="email">Email address (include if you want a response):</label>
      <input id="email" name="email" type="email" />
      <span></span>
    </div>
    <div><button>Submit</button></div>
  </fieldset>
</form>
```

#### CSS for Generated Content

```css
fieldset > div {
  margin-bottom: 20px;
  display: flex;
  flex-flow: row wrap;
}

button,
label,
input {
  display: block;
  font-family: inherit;
  font-size: 100%;
  margin: 0;
  box-sizing: border-box;
  width: 100%;
  padding: 5px;
  height: 30px;
}

input {
  box-shadow: inset 1px 1px 3px #cccccc;
  border-radius: 5px;
}

input:hover,
input:focus {
  background-color: #eeeeee;
}

/* Generated content styling */
input + span {
  position: relative;
}

input:required + span::after {
  font-size: 0.7rem;
  position: absolute;
  content: "required";
  color: white;
  background-color: black;
  padding: 5px 10px;
  top: -26px;
  left: -70px;
}

button {
  width: 60%;
  margin: 0 auto;
}
```

**Key Technique:**

- Set `<span>` to `position: relative` to serve as a positioning context.
- Generated content can be positioned absolutely within that context.
- Use the adjacent sibling combinator (`+`) to target the span after the input.
- Text inputs (`text`, `password`, `button`) do not display generated content. Other types (`range`, `color`, `checkbox`, etc.) do support it.

### Styling Controls Based on Validity

#### :valid and :invalid

**Key Points:**

- Controls with no constraint validation always match `:valid`.
- Inputs with `required` and no value match both `:invalid` and `:required`.
- Email/URL inputs match `:invalid` when data does not match required pattern.
- Inputs with values outside range (min/max) match both `:invalid` and `:out-of-range`.

#### CSS Styling

```css
input + span {
  position: relative;
}

input:required + span::after {
  font-size: 0.7rem;
  position: absolute;
  content: "required";
  color: white;
  background-color: black;
  padding: 5px 10px;
  top: -26px;
  left: -70px;
}

/* Validation indicators */
input + span::before {
  position: absolute;
  right: -20px;
  top: 5px;
}

input:invalid {
  border: 2px solid red;
}

input:invalid + span::before {
  content: "\2716";
  color: red;
}

input:valid + span::before {
  content: "\2713";
  color: green;
}
```

#### :in-range and :out-of-range

For numeric inputs with `min` and `max` attributes:

```html
<div>
  <label for="age">Age (must be 12+): </label>
  <input id="age" name="age" type="number" min="12" max="120" required />
  <span></span>
</div>
```

```css
input + span {
  position: relative;
}

input + span::after {
  font-size: 0.7rem;
  position: absolute;
  padding: 5px 10px;
  top: -26px;
}

input:required + span::after {
  color: white;
  background-color: black;
  content: "required";
  left: -70px;
}

input:out-of-range + span::after {
  color: white;
  background-color: red;
  width: 155px;
  content: "Outside allowable value range";
  left: -182px;
}

input + span::before {
  position: absolute;
  right: -20px;
  top: 5px;
}

input:invalid {
  border: 2px solid red;
}

input:invalid + span::before {
  content: "\2716";
  color: red;
}

input:valid + span::before {
  content: "\2713";
  color: green;
}
```

**Important Notes:**

- `:out-of-range` inputs also match `:invalid`.
- CSS cascade applies: later rules override earlier ones.
- Use `:out-of-range` when you want a more specific error message for range violations.
- **Numeric input types:** `date`, `month`, `week`, `time`, `datetime-local`, `number`, `range`.

### Styling Enabled and Disabled Inputs

#### Use Case

Disable form fields that do not apply based on user input (e.g., billing address fields when same as shipping).

#### HTML Structure

```html
<form>
  <fieldset id="shipping">
    <legend>Shipping address</legend>
    <div>
      <label for="name1">Name: </label>
      <input id="name1" name="name1" type="text" required />
    </div>
    <div>
      <label for="address1">Address: </label>
      <input id="address1" name="address1" type="text" required />
    </div>
    <div>
      <label for="zip-code1">Zip/postal code: </label>
      <input id="zip-code1" name="zip-code1" type="text" required />
    </div>
  </fieldset>
  <fieldset id="billing">
    <legend>Billing address</legend>
    <div>
      <label for="billing-checkbox">Same as shipping address:</label>
      <input type="checkbox" id="billing-checkbox" checked />
    </div>
    <div>
      <label for="name" class="billing-label">Name: </label>
      <input id="name" name="name" type="text" disabled required />
    </div>
    <div>
      <label for="address2" class="billing-label">Address:</label>
      <input id="address2" name="address2" type="text" disabled required />
    </div>
    <div>
      <label for="zip-code2" class="billing-label">Zip/postal code:</label>
      <input id="zip-code2" name="zip-code2" type="text" disabled required />
    </div>
  </fieldset>

  <div><button>Submit</button></div>
</form>
```

#### CSS Styling

```css
input[type="text"]:disabled {
  background: #eeeeee;
  border: 1px solid #cccccc;
}

label:has(+ :disabled) {
  color: #aaaaaa;
}
```

#### JavaScript to Toggle Disabled State

```javascript
function toggleBilling() {
  const billingItems = document.querySelectorAll('#billing input[type="text"]');
  for (const item of billingItems) {
    item.disabled = !item.disabled;
  }
}

document
  .getElementById("billing-checkbox")
  .addEventListener("change", toggleBilling);
```

**Key Points:**

- **Disabled inputs:** Cannot be interacted with, data not sent to server.
- **Enabled inputs:** Can be selected, clicked, typed into (default state).
- Use `:disabled` and `:enabled` pseudo-classes to target these states.
- Style labels using `:has()` pseudo-class to gray them out alongside disabled inputs.

### Read-Only and Read-Write Inputs

#### Difference from Disabled

- **Read-only inputs:** Cannot be edited by user, but values ARE submitted to server.
- **Read-write inputs:** Can be edited (default state).
- Use the `readonly` attribute on the input element.

#### CSS Styling

```css
input:read-only,
textarea:read-only {
  border: 0;
  box-shadow: none;
  background-color: white;
}

textarea:read-write {
  box-shadow: inset 1px 1px 3px #cccccc;
  border-radius: 5px;
}
```

**Key Points:**

- Remove borders/shadows for read-only elements to show they are not editable.
- Add styling to read-write elements to make them clearly editable.
- `:enabled` and `:read-write` are rarely used since they represent default states.

### Radio and Checkbox States

#### :checked

The `:checked` pseudo-class targets selected checkboxes and radio buttons.

```css
input[type="radio"] {
  appearance: none;
}

input[type="radio"] {
  width: 20px;
  height: 20px;
  border-radius: 10px;
  border: 2px solid gray;
  vertical-align: -2px;
  outline: none;
}

input[type="radio"]::before {
  display: block;
  content: " ";
  width: 10px;
  height: 10px;
  border-radius: 6px;
  background-color: red;
  font-size: 1.2em;
  transform: translate(3px, 3px) scale(0);
  transform-origin: center;
  transition: all 0.3s ease-in;
}

input[type="radio"]:checked::before {
  transform: translate(3px, 3px) scale(1);
  transition: all 0.3s cubic-bezier(0.25, 0.25, 0.56, 2);
}
```

**Advantages:**

- Using transforms instead of width/height prevents layout jumping.
- `transform-origin` allows animation from the center.
- `transition` provides a smooth animation effect.

#### :default

The `:default` pseudo-class matches radios/checkboxes checked by default (with `checked` attribute), even if unchecked later.

```css
input ~ span {
  position: relative;
}

input:default ~ span::after {
  font-size: 0.7rem;
  position: absolute;
  content: "Default";
  color: white;
  background-color: black;
  padding: 5px 10px;
  right: -65px;
  top: -3px;
}
```

- Uses subsequent-sibling combinator (`~`) instead of next-sibling (`+`).
- Needed because `<span>` does not come immediately after `<input>`.
- Shows which option was selected by default on page load.

#### :indeterminate

The `:indeterminate` pseudo-class matches elements in neither checked nor unchecked state.

**Elements that are indeterminate:**

- `<input type="radio">` when all same-named radio buttons are unchecked.
- `<input type="checkbox">` when `indeterminate` property set to `true` via JavaScript.
- `<progress>` elements with no value.

```css
input[type="radio"]:indeterminate {
  border: 2px solid red;
  animation: 0.4s linear infinite alternate border-pulse;
}

@keyframes border-pulse {
  from {
    border: 2px solid red;
  }

  to {
    border: 6px solid red;
  }
}
```

**Use Case:** An animated visual indicator reminding users they need to select a radio button before proceeding.

### Additional Useful Pseudo-Classes

#### :focus-within

Matches an element **or its descendants** when focused.

```css
form:focus-within {
  border: 2px solid blue;
}
```

**Use Case:** Highlight an entire form when any input inside receives focus.

#### :focus-visible

Matches elements focused via **keyboard interaction** (not touch or mouse).

```css
input:focus-visible {
  outline: 3px solid blue;
}
```

**Use Case:** Show keyboard focus indicator while hiding mouse focus styling.

#### :placeholder-shown

Matches `<input>` and `<textarea>` elements showing their placeholder text (when empty).

```css
input:placeholder-shown {
  color: #999;
}
```

**Use Case:** Style inputs differently when placeholder is visible.

### Summary

This section covered all major UI pseudo-classes for form styling, including:

1. Required vs Optional styling with visual indicators.
2. Generated content techniques for accessible labeling.
3. Validation states (valid, invalid, in-range, out-of-range).
4. Enabled/disabled and read-only/read-write states.
5. Radio and checkbox states (checked, default, indeterminate).
6. Additional pseudo-classes for advanced styling.

These pseudo-classes enable sophisticated form styling without JavaScript, improve accessibility through semantic HTML, and provide better user experience through visual feedback on form states.
