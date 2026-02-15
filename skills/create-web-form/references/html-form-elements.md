# HTML Form Elements Reference

A consolidated reference for HTML form-related elements, sourced from the Mozilla Developer Network (MDN) Web Docs.

---

## Table of Contents

1. [`<form>`](#form)
2. [`HTMLFormElement.elements`](#htmlformelementelements)
3. [`<button>`](#button)
4. [`<datalist>`](#datalist)
5. [`<fieldset>`](#fieldset)
6. [`<input>`](#input)
7. [`<label>`](#label)
8. [`<legend>`](#legend)
9. [`<meter>`](#meter)
10. [`<optgroup>`](#optgroup)
11. [`<option>`](#option)
12. [`<output>`](#output)
13. [`<progress>`](#progress)
14. [`<select>`](#select)
15. [`<textarea>`](#textarea)

---

## `<form>`

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/form>

### Description

The `<form>` element represents a document section containing interactive controls for submitting information to a server. Both opening and closing tags are mandatory. Forms cannot be nested inside other forms.

### Key Attributes

| Attribute | Description |
|-----------|-------------|
| `action` | URL that processes the form submission. Can be overridden by `formaction` on submit buttons. |
| `method` | HTTP method: `get` (default), `post`, or `dialog`. Defines how data is sent. |
| `enctype` | MIME type for POST submissions: `application/x-www-form-urlencoded` (default), `multipart/form-data` (for files), `text/plain`. |
| `novalidate` | Boolean attribute that disables form validation on submission. |
| `autocomplete` | Controls auto-completion: `on` (default) or `off`. |
| `accept-charset` | Character encoding accepted (typically `UTF-8`). |
| `name` | Form identifier; must be unique. Becomes a property of `window`, `document`, and `document.forms`. |
| `target` | Where to display the response: `_self` (default), `_blank`, `_parent`, `_top`. |
| `rel` | Link relationship types: `external`, `nofollow`, `noopener`, `noreferrer`, etc. |

### Usage Notes

- Forms **cannot contain nested forms**.
- Supports CSS pseudo-classes: `:valid` and `:invalid` for styling based on form validity.
- DOM Interface: `HTMLFormElement`.
- Implicit ARIA role: `form`.

### Example

```html
<form action="/submit" method="post">
  <div>
    <label for="name">Name:</label>
    <input type="text" id="name" name="name" required />
  </div>
  <div>
    <label for="email">Email:</label>
    <input type="email" id="email" name="email" required />
  </div>
  <input type="submit" value="Submit" />
</form>
```

---

## `HTMLFormElement.elements`

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements>

### Description

The `elements` property returns an `HTMLFormControlsCollection` containing all the form controls associated with a `<form>` element. Controls can be accessed by index or by their `name`/`id` attributes.

### Return Value

- **Type:** `HTMLFormControlsCollection` (a live collection based on `HTMLCollection`)
- **Live:** Yes -- automatically updates when controls are added or removed.
- **Order:** Tree order (preorder, depth-first traversal of the document).

### Included Form Controls

The collection includes:

- `<button>`
- `<fieldset>`
- `<input>` (except `type="image"`)
- `<object>`
- `<output>`
- `<select>`
- `<textarea>`
- Form-associated custom elements

**Note:** `<label>` and `<legend>` elements are **not** included.

### Example

```javascript
// Access form controls
const inputs = document.getElementById("my-form").elements;
const firstControl = inputs[0];           // By index
const byName = inputs["username"];        // By name attribute

// Iterate over controls
for (const control of inputs) {
  if (control.nodeName === "INPUT" && control.type === "text") {
    control.value = control.value.toUpperCase();
  }
}

// Get number of controls
console.log(inputs.length);
```

---

## `<button>`

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button>

### Description

The `<button>` element is an interactive element activated by a user (via mouse, keyboard, finger, voice, or assistive technology) that performs an action, such as submitting a form or opening a dialog. By default, its appearance reflects the user's platform but can be fully customized with CSS.

### Key Attributes

| Attribute | Description |
|-----------|-------------|
| `type` | Specifies behavior: `submit` (default for forms), `reset` (clears form), `button` (no default behavior). |
| `disabled` | Boolean; prevents user interaction. |
| `name` | Button name for form submission. |
| `value` | Value submitted with form data. |
| `form` | Associates button with a form by ID. |
| `formaction` | Overrides form's `action` URL. |
| `formmethod` | Overrides form's HTTP method (`post`/`get`). |
| `autofocus` | Gives button focus on page load. |
| `popovertarget` | Controls a popover element by ID. |
| `popovertargetaction` | Popover action: `show`, `hide`, or `toggle`. |

### Usage Notes

- `<button>` is easier to style than `<input type="button">` because it supports inner HTML content (text, images, icons, pseudo-elements).
- Always set `type="button"` for non-form buttons to prevent unintended form submission.
- Default display is `flow-root`; buttons center children both horizontally and vertically.

### Accessibility Considerations

- Icon-only buttons must include visible text or ARIA attributes describing functionality.
- Minimum recommended interactive target size: 44x44 CSS pixels.
- Space buttons adequately to prevent accidental activation.
- Use `:focus-visible` for keyboard focus indicators with sufficient contrast (4.5:1 ratio).
- Use `aria-pressed` to describe toggle button state (not `aria-checked` or `aria-selected`).

### Example

```html
<!-- Basic button -->
<button type="button">Click me</button>

<!-- Form submission button -->
<form>
  <input type="text" name="username" />
  <button type="submit">Submit</button>
</form>

<!-- Styled button -->
<button class="favorite" type="button">Add to favorites</button>

<style>
  .favorite {
    padding: 10px 20px;
    background-color: tomato;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  }

  .favorite:hover {
    background-color: red;
  }
</style>
```

---

## `<datalist>`

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/datalist>

### Description

The `<datalist>` element contains a set of `<option>` elements that represent permissible or recommended options available to choose from within other controls, such as `<input>` elements. It provides autocomplete/suggestion functionality without restricting user input.

### How It Works

The `<datalist>` is associated with an `<input>` element via:

1. Give the `<datalist>` a unique `id`.
2. Add the `list` attribute to the `<input>` with the same `id` value.

### Key Attributes

- **`<datalist>` itself:** No specific attributes (only global attributes like `id`).
- **`<option>` children:** `value` (the suggestion; required), `label` (display text; optional).

### Supported Input Types

- Text-based: `text`, `search`, `url`, `tel`, `email`, `number`
- Date/Time: `month`, `week`, `date`, `time`, `datetime-local`
- Visual: `range`, `color`

### Usage Notes

- **Not a replacement for `<select>`** -- users can still enter values not in the list.
- Provides suggestions, not restrictions.
- Browser styling of the dropdown is limited.
- Some screen readers may not announce suggestions.

### Example

```html
<label for="ice-cream-choice">Choose a flavor:</label>
<input list="ice-cream-flavors" id="ice-cream-choice" />

<datalist id="ice-cream-flavors">
  <option value="Chocolate"></option>
  <option value="Coconut"></option>
  <option value="Mint"></option>
  <option value="Strawberry"></option>
  <option value="Vanilla"></option>
</datalist>
```

---

## `<fieldset>`

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/fieldset>

### Description

The `<fieldset>` element is used to group several form controls and labels together within a web form. It provides semantic grouping and visual organization of related form fields.

### Key Attributes

| Attribute | Description |
|-----------|-------------|
| `disabled` | Boolean attribute that disables all form controls inside the fieldset (except those in `<legend>`). Disabled controls will not be editable or submitted. |
| `form` | Links the fieldset to a `<form>` by referencing the form's `id`, even if the fieldset is not nested inside it. |
| `name` | Specifies the name associated with the group. |

### Usage Notes

- The first `<legend>` element nested in the fieldset provides its caption and should be the first child.
- Displays as `block` by default with a 2px groove border and padding.
- When disabled, all descendant form controls become disabled *except* those inside the `<legend>` element.
- Implicit ARIA role: `group`.
- DOM Interface: `HTMLFieldSetElement`.

### Example

```html
<form>
  <fieldset>
    <legend>Choose your favorite monster</legend>

    <input type="radio" id="kraken" name="monster" value="K" />
    <label for="kraken">Kraken</label><br />

    <input type="radio" id="sasquatch" name="monster" value="S" />
    <label for="sasquatch">Sasquatch</label><br />

    <input type="radio" id="mothman" name="monster" value="M" />
    <label for="mothman">Mothman</label>
  </fieldset>
</form>
```

---

## `<input>`

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input>

### Description

The `<input>` element creates interactive controls for web-based forms to accept data from the user. It is one of the most powerful and complex HTML elements due to the numerous combinations of input types and attributes.

### Input Types (24 total)

| Type | Purpose |
|------|---------|
| `button` | Push button with no default behavior |
| `checkbox` | Single value selection/deselection |
| `color` | Color picker control |
| `date` | Date input (year, month, day) |
| `datetime-local` | Date and time without timezone |
| `email` | Email address field |
| `file` | File upload control |
| `hidden` | Non-displayed value submitted to server |
| `image` | Graphical submit button |
| `month` | Month and year input |
| `number` | Numeric input with validation |
| `password` | Obscured text field |
| `radio` | Single choice from multiple options |
| `range` | Numeric value selector (slider) |
| `reset` | Form reset button |
| `search` | Search string input |
| `submit` | Form submission button |
| `tel` | Telephone number field |
| `text` | Single-line text (default) |
| `time` | Time input |
| `url` | URL field with validation |
| `week` | Week and year input |

### Key Attributes

| Attribute | Applicable Types | Purpose |
|-----------|-----------------|---------|
| `type` | All | Specifies the input control type |
| `name` | All | Form control identifier for submission |
| `value` | All | Control's initial/current value |
| `id` | All | Unique element identifier |
| `required` | Most | Makes input mandatory |
| `disabled` | All | Disables user interaction |
| `readonly` | Text-like | Prevents value editing |
| `placeholder` | Text-like | Hint text when empty |
| `min` / `max` | Numeric/date | Value range limits |
| `minlength` / `maxlength` | Text-like | Character count limits |
| `pattern` | Text-like | Regex validation pattern |
| `step` | Numeric/date | Incremental value steps |
| `autocomplete` | Most | Form autofill hint |
| `list` | Most | Associates with `<datalist>` |
| `checked` | Checkbox/radio | Pre-selected state |
| `multiple` | Email/file | Allow multiple values |

### Usage Notes

- **Labels required:** Always pair inputs with `<label>` elements for accessibility.
- **Placeholders are not labels:** Placeholders disappear when typing and are not accessible to all screen readers.
- **Client-side validation:** Use constraint attributes (`required`, `pattern`, `min`, `max`) for browser validation, but always validate server-side as well.
- **Default type:** If `type` is not specified, it defaults to `text`.
- **Form association:** Use `name` attribute for form submission; inputs without `name` are not submitted.
- **CSS pseudo-classes:** Style with `:invalid`, `:valid`, `:checked`, `:disabled`, `:placeholder-shown`, etc.

### Example

```html
<label for="name">Name (4 to 8 characters):</label>
<input
  type="text"
  id="name"
  name="name"
  required
  minlength="4"
  maxlength="8"
  size="10" />
```

---

## `<label>`

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/label>

### Description

The `<label>` element represents a caption for an item in a user interface. It associates descriptive text with form controls to enhance usability and accessibility.

### Key Attributes

| Attribute | Description |
|-----------|-------------|
| `for` | The `id` of the labelable form control to associate with this label. JavaScript reflection: `htmlFor`. |

### Associating Labels with Controls

**Explicit association (recommended):**

```html
<label for="username">Enter your username:</label>
<input id="username" name="username" type="text" />
```

**Implicit association:**

```html
<label>
  I like peas.
  <input type="checkbox" name="peas" />
</label>
```

**Combined (both methods for maximum compatibility):**

```html
<label for="peas">
  I like peas.
  <input type="checkbox" name="peas" id="peas" />
</label>
```

### Labelable Elements

Labels can be associated with: `<button>`, `<input>` (except `type="hidden"`), `<meter>`, `<output>`, `<progress>`, `<select>`, and `<textarea>`.

### Accessibility Guidelines

**Do:**
- Use explicit association with the `for` attribute for broad tool compatibility.
- Place context (like links to terms) *before* the form control.
- Use `<legend>` within `<fieldset>` for form section titles.

**Do not:**
- Place interactive elements (links, buttons) inside labels -- it makes form controls difficult to activate.
- Use heading elements inside labels -- it interferes with assistive technology navigation.
- Add labels to `<input type="button">` or `<button>` elements (they have built-in labels via their content/value).

---

## `<legend>`

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/legend>

### Description

The `<legend>` element represents a caption for the content of its parent `<fieldset>`. It provides a semantic way to label grouped form controls.

### Key Details

- **Must be** the first child of a `<fieldset>` element.
- Provides an accessible label for the entire fieldset group.
- Only supports global attributes (no element-specific attributes).
- Can contain phrasing content and headings (`h1`--`h6`).
- DOM Interface: `HTMLLegendElement`.

### Example

```html
<fieldset>
  <legend>Choose your favorite monster</legend>

  <input type="radio" id="kraken" name="monster" value="K" />
  <label for="kraken">Kraken</label><br />

  <input type="radio" id="sasquatch" name="monster" value="S" />
  <label for="sasquatch">Sasquatch</label>
</fieldset>
```

```css
legend {
  background-color: black;
  color: white;
  padding: 3px 6px;
}
```

---

## `<meter>`

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meter>

### Description

The `<meter>` element represents a scalar value within a known range or a fractional value. It is commonly used to display measurements like fuel levels, temperature, disk usage, or ratings.

### Key Attributes

| Attribute | Default | Description |
|-----------|---------|-------------|
| `value` | `0` | Current numeric value (must be between `min` and `max`). |
| `min` | `0` | Lower bound of the measured range. |
| `max` | `1` | Upper bound of the measured range. |
| `low` | `min` value | Upper bound of the "low" end of the range. |
| `high` | `max` value | Lower bound of the "high" end of the range. |
| `optimum` | -- | Optimal numeric value; indicates the preferred range section. |

### Usage Notes

- Unless the `value` is between 0 and 1, define `min` and `max` to ensure `value` falls within the range.
- Browsers color the meter bar differently based on whether the value is below `low`, between `low` and `high`, above `high`, or relative to `optimum`.
- Cannot contain nested `<meter>` elements.
- Implicit ARIA role: `meter`.

### Difference from `<progress>`

- **`<meter>`**: Displays a scalar measurement within a range (e.g., temperature, disk usage).
- **`<progress>`**: Displays task completion progress from 0 to max.

### Example

```html
<!-- Simple battery level -->
<p>Battery level: <meter min="0" max="100" value="75">75%</meter></p>

<!-- With low/high ranges -->
<p>
  Student's exam score:
  <meter low="50" high="80" max="100" value="84">84%</meter>
</p>

<!-- Complete example with optimum -->
<label for="fuel">Fuel level:</label>
<meter id="fuel" min="0" max="100" low="33" high="66" optimum="80" value="50">
  at 50/100
</meter>
```

---

## `<optgroup>`

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/optgroup>

### Description

The `<optgroup>` element creates a grouping of options within a `<select>` element, allowing you to organize related options into labeled groups.

### Key Attributes

| Attribute | Description |
|-----------|-------------|
| `label` | The name of the option group (**mandatory**). Browsers display this as a non-selectable label in the UI. |
| `disabled` | Boolean attribute. When set, all options in this group become non-selectable and appear greyed out. |

### Usage Notes

- Must be a child of a `<select>` element.
- Contains one or more `<option>` elements.
- Cannot be nested within other `<optgroup>` elements.
- The `label` attribute is **mandatory**.
- Implicit ARIA role: `group`.

### Example

```html
<label for="dino-select">Choose a dinosaur:</label>
<select id="dino-select">
  <optgroup label="Theropods">
    <option>Tyrannosaurus</option>
    <option>Velociraptor</option>
    <option>Deinonychus</option>
  </optgroup>
  <optgroup label="Sauropods">
    <option>Diplodocus</option>
    <option>Saltasaurus</option>
    <option>Apatosaurus</option>
  </optgroup>
  <optgroup label="Extinct Groups" disabled>
    <option>Stegosaurus</option>
  </optgroup>
</select>
```

---

## `<option>`

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/option>

### Description

The `<option>` element defines items contained within `<select>`, `<optgroup>`, or `<datalist>` elements. It represents individual menu items or selectable options.

### Key Attributes

| Attribute | Description |
|-----------|-------------|
| `value` | The value submitted with the form if the option is selected. If omitted, the element's text content is used. |
| `selected` | Boolean attribute that marks the option as initially selected. Only one `<option>` per `<select>` (without `multiple`) can have this attribute. |
| `disabled` | Boolean attribute that disables the option (greyed out, no interaction). Options are also disabled if their `<optgroup>` ancestor is disabled. |
| `label` | Text label for the option. If not defined, the element's text content is used. |

### Context of Use

- **Within `<select>`**: Lists selectable options; users choose one (or multiple if `multiple` attribute is set on the select).
- **Within `<optgroup>`**: Groups related options together.
- **Within `<datalist>`**: Provides autocomplete suggestions for `<input>` elements.

### Usage Notes

- End tag is optional if immediately followed by another `<option>` or `<optgroup>`.
- Implicit ARIA role: `option`.

### Example

```html
<label for="pet-select">Choose a pet:</label>
<select id="pet-select">
  <option value="">--Please choose an option--</option>
  <option value="dog">Dog</option>
  <option value="cat">Cat</option>
  <option value="hamster" disabled>Hamster</option>
  <option value="parrot" selected>Parrot</option>
</select>
```

---

## `<output>`

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/output>

### Description

The `<output>` element is a container element that displays the results of a calculation or the outcome of a user action. It is form-associated and is implemented as an ARIA live region by most browsers, meaning assistive technology will announce changes automatically.

### Key Attributes

| Attribute | Description |
|-----------|-------------|
| `for` | Space-separated list of element `id`s that contributed to the calculation. |
| `form` | Associates the output with a specific `<form>` by its `id` (overrides ancestor forms). |
| `name` | The element's name; used in `form.elements` API. |

### Usage Notes

- The `<output>` value, name, and contents are **not submitted** with the form.
- Implemented as an `aria-live` region; assistive technology announces changes automatically.
- Must have both opening and closing tags.

### Example

```html
<form id="example-form">
  <input type="range" id="b" name="b" value="50" /> +
  <input type="number" id="a" name="a" value="10" /> =
  <output name="result" for="a b">60</output>
</form>

<script>
  const form = document.getElementById("example-form");
  form.addEventListener("input", () => {
    const result = form.elements["a"].valueAsNumber +
                   form.elements["b"].valueAsNumber;
    form.elements["result"].value = result;
  });
</script>
```

---

## `<progress>`

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/progress>

### Description

The `<progress>` element displays a progress indicator showing the completion of a task, typically rendered as a progress bar.

### Key Attributes

| Attribute | Description |
|-----------|-------------|
| `max` | Total amount of work required. Must be greater than 0 and a valid floating-point number. Default: `1`. |
| `value` | Completed amount (0 to `max`, or 0 to 1 if `max` is omitted). If omitted, shows an indeterminate progress bar. |

### Difference from `<meter>`

- Minimum value is always 0 (the `min` attribute is **not allowed** for `<progress>`).
- `<progress>` is specifically for task completion; `<meter>` is for scalar measurements.

### Usage Notes

- Both opening and closing tags are required.
- Implicit ARIA role: `progressbar`.
- Text between tags is fallback content for older browsers (not an accessible label).
- Use the `:indeterminate` pseudo-class to style indeterminate progress bars.
- Remove the `value` attribute (`element.removeAttribute('value')`) to make an indeterminate progress bar.

### Accessibility Considerations

- Always provide an accessible label using a `<label>` element, `aria-labelledby`, or `aria-label`.
- For page sections that are loading: set `aria-busy="true"` on the section being updated, use `aria-describedby` to link to the progress element, and remove `aria-busy` when loading completes.

### Example

```html
<!-- Basic progress bar -->
<label for="file">File progress:</label>
<progress id="file" max="100" value="70">70%</progress>

<!-- Accessible with implicit label -->
<label>
  Uploading Document: <progress value="70" max="100">70%</progress>
</label>

<!-- Indeterminate (no value attribute) -->
<progress max="100"></progress>
```

---

## `<select>`

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select>

### Description

The `<select>` element represents a control that provides a menu of options, allowing users to select from a dropdown list of choices.

### Key Attributes

| Attribute | Description |
|-----------|-------------|
| `name` | Specifies the name of the control for form submission. |
| `multiple` | Boolean attribute allowing selection of multiple options. |
| `size` | Number of visible rows in a scrolling list box (default: `0`). |
| `required` | Boolean attribute requiring a non-empty option selection. |
| `disabled` | Boolean attribute preventing user interaction. |
| `autofocus` | Boolean attribute giving focus to the control on page load. |
| `form` | Associates the select with a specific form by ID. |
| `autocomplete` | Provides hints for autocomplete behavior. |

### Usage Notes

- Each option is defined with nested `<option>` elements.
- Use `<optgroup>` to group related options visually.
- Use `<hr>` elements to create visual separators between options.
- The `value` attribute on `<option>` elements specifies data submitted to the server.
- If no `value` attribute exists on an option, the option's text content is used.
- Without a `selected` attribute, the first option defaults as selected.
- Multiple selections with `multiple` attribute are submitted as `name=value1&name=value2`.

### Accessibility Considerations

- Associate with labels using `<label>` with `for` attribute matching the select's `id`.
- Implicit ARIA roles: `combobox` (single select), `listbox` (multiple or size > 1).

### Example

```html
<label for="pet-select">Choose a pet:</label>

<select name="pets" id="pet-select">
  <option value="">--Please choose an option--</option>
  <option value="dog">Dog</option>
  <option value="cat">Cat</option>
  <option value="hamster">Hamster</option>
</select>
```

---

## `<textarea>`

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/textarea>

### Description

The `<textarea>` element represents a multi-line plain-text editing control for allowing users to enter sizeable amounts of free-form text (e.g., comments, feedback, reviews).

### Key Attributes

| Attribute | Description |
|-----------|-------------|
| `rows` | Number of visible text lines (default: `2`). |
| `cols` | Visible width in average character widths (default: `20`). |
| `name` | Control name for form submission. |
| `id` | For associating with `<label>` elements. |
| `placeholder` | Hint text displayed to the user. |
| `maxlength` | Maximum string length (UTF-16 code units). |
| `minlength` | Minimum string length (UTF-16 code units). |
| `wrap` | Line wrapping behavior: `soft` (default), `hard`, or `off`. |
| `disabled` | Boolean; disables user interaction. |
| `readonly` | Boolean; user cannot modify content but it remains focusable and submittable. |
| `required` | Boolean; user must fill in a value. |
| `autocomplete` | `on` or `off` for browser auto-completion. |
| `spellcheck` | `true`, `false`, or `default` for spell-checking behavior. |
| `autofocus` | Boolean; receives focus on page load. |

### Usage Notes

- Initial content goes between opening and closing tags (not as a `value` attribute).
- Use `.value` property in JavaScript to get/set content; `.defaultValue` for the initial value.
- Resizable by default; disable resizing with `resize: none` in CSS.
- Use `:valid` and `:invalid` pseudo-classes for styling based on `minlength`/`maxlength`/`required` constraints.

### Example

```html
<label for="story">Tell us your story:</label>

<textarea
  id="story"
  name="story"
  rows="5"
  cols="33"
  placeholder="Enter your feedback here..."
  maxlength="500"
  required>
It was a dark and stormy night...
</textarea>
```

```css
textarea {
  padding: 10px;
  border: 1px solid #cccccc;
  border-radius: 5px;
  font-family: Arial, sans-serif;
  resize: vertical;
}

textarea:invalid {
  border-color: red;
}

textarea:valid {
  border-color: green;
}
```
