# Form Controls Reference

A consolidated reference guide covering HTML form structure, native form controls, HTML5 input types, and additional form elements. Content sourced from the Mozilla Developer Network (MDN) Web Docs.

---

## Table of Contents

1. [How to Structure a Web Form](#how-to-structure-a-web-form)
2. [Basic Native Form Controls](#basic-native-form-controls)
3. [HTML5 Input Types](#html5-input-types)
4. [Other Form Controls](#other-form-controls)

---

## How to Structure a Web Form

> **Source:** https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/How_to_structure_a_web_form

### The `<form>` Element

The `<form>` element formally defines a form and determines its behavior. It must wrap all form contents.

**Important:** Never nest a form inside another form -- this causes unpredictable behavior.

```html
<form>
  <!-- form contents -->
</form>
```

Form controls can exist outside a `<form>` element using the `form` attribute to associate them with a specific form by its ID.

### Grouping and Semantic Structure

#### The `<fieldset>` and `<legend>` Elements

`<fieldset>` groups widgets that share the same purpose, improving usability and accessibility. `<legend>` provides a descriptive label for the fieldset.

**Key Benefits:**
- Screen readers (like JAWS and NVDA) speak the legend before each control inside the fieldset
- Essential for grouping radio buttons and checkboxes
- Useful for sectioning long forms across multiple pages

```html
<form>
  <fieldset>
    <legend>Fruit juice size</legend>
    <p>
      <input type="radio" name="size" id="size_1" value="small" />
      <label for="size_1">Small</label>
    </p>
    <p>
      <input type="radio" name="size" id="size_2" value="medium" />
      <label for="size_2">Medium</label>
    </p>
    <p>
      <input type="radio" name="size" id="size_3" value="large" />
      <label for="size_3">Large</label>
    </p>
  </fieldset>
</form>
```

**Result:** Screen readers announce: "Fruit juice size small," "Fruit juice size medium," "Fruit juice size large"

### Labels: The Foundation of Accessibility

#### The `<label>` Element

Labels formally associate text with form controls. The `for` attribute connects a label to its input via the input's `id`.

```html
<label for="name">Name:</label>
<input type="text" id="name" name="user_name" />
```

**Implicit Association:** Nest the control inside the label (though explicit `for` attribute is still best practice):

```html
<label for="name">
  Name: <input type="text" id="name" name="user_name" />
</label>
```

**Accessibility Impact:**
- Screen readers announce: "Name, edit text"
- Without proper labels: "Edit text blank" (not helpful)

#### Labels Are Clickable

Clicking or tapping a label activates its associated control -- especially useful for checkboxes and radio buttons with small hit areas.

```html
<form>
  <p>
    <input type="checkbox" id="taste_1" name="taste_cherry" value="cherry" />
    <label for="taste_1">I like cherry</label>
  </p>
</form>
```

#### Multiple Labels (Best Practices)

Avoid putting multiple labels on a single widget. Instead, include all text within one label:

```html
<!-- Not recommended -->
<label for="username">Name:</label>
<input id="username" type="text" name="username" required />
<label for="username">*</label>

<!-- Better -->
<label for="username">
  <span>Name:</span>
  <input id="username" type="text" name="username" required />
  <span>*</span>
</label>

<!-- Best -->
<label for="username">Name *:</label>
<input id="username" type="text" name="username" required />
```

### Common HTML Structures with Forms

Use these semantic HTML elements to structure forms:

- `<ul>` / `<ol>` with `<li>`: Recommended for grouping checkboxes or radio buttons
- `<p>`: Wrap label-control pairs
- `<div>`: General grouping
- `<section>`: Group related form sections
- `<h1>`, `<h2>`: Organize complex forms into sections

### Complete Payment Form Example

```html
<form>
  <h1>Payment form</h1>
  <p>Please complete all required (*) fields.</p>

  <!-- Contact Information Section -->
  <section>
    <h2>Contact information</h2>

    <fieldset>
      <legend>Title</legend>
      <ul>
        <li>
          <label for="title_1">
            <input type="radio" id="title_1" name="title" value="A" />
            Ace
          </label>
        </li>
        <li>
          <label for="title_2">
            <input type="radio" id="title_2" name="title" value="K" />
            King
          </label>
        </li>
      </ul>
    </fieldset>

    <p>
      <label for="name">Name *:</label>
      <input type="text" id="name" name="username" required />
    </p>

    <p>
      <label for="mail">Email *:</label>
      <input type="email" id="mail" name="user-mail" required />
    </p>

    <p>
      <label for="pwd">Password *:</label>
      <input type="password" id="pwd" name="password" required />
    </p>
  </section>

  <!-- Payment Information Section -->
  <section>
    <h2>Payment information</h2>

    <p>
      <label for="card">Card type:</label>
      <select id="card" name="user-card">
        <option value="visa">Visa</option>
        <option value="mc">Mastercard</option>
        <option value="amex">American Express</option>
      </select>
    </p>

    <p>
      <label for="number">Card number *:</label>
      <input type="tel" id="number" name="card-number" required />
    </p>
  </section>

  <!-- Submit Section -->
  <section>
    <p>
      <button type="submit">Validate the payment</button>
    </p>
  </section>
</form>
```

### Form Structure Best Practices

| Practice | Benefit |
|----------|---------|
| Always use `<form>` wrapper | Recognized by assistive tech and browser plugins |
| Wrap related controls in `<fieldset>` with `<legend>` | Improves usability and accessibility |
| Always associate labels with `for` attribute | Screen readers announce label with control |
| Use semantic HTML (`<section>`, `<h2>`, etc.) | Better form structure and accessibility |
| Group radio buttons/checkboxes in lists | Clearer visual and semantic organization |
| Indicate required fields clearly | Users and AT know which fields are mandatory |
| Test with screen readers | Verify the form is truly accessible |

---

## Basic Native Form Controls

> **Source:** https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Basic_native_form_controls

### Text Input Fields

#### Single Line Text Fields

Created with `<input type="text">` or omitting the type attribute (text is the default).

```html
<input type="text" id="comment" name="comment" value="I'm a text field" />
```

**Common text field behaviors:**
- Can be marked as `readonly` (value shown but not modifiable, still sent in form submission) or `disabled` (not sent with form)
- Support `placeholder` attribute for brief descriptions
- Can be constrained with `size` (physical box size) and `maxlength` (character limit)
- Benefit from `spellcheck` attribute
- Remove line breaks automatically before sending to server

#### Password Field

Obscures input characters (shown as dots or asterisks) for security.

```html
<input type="password" id="pwd" name="pwd" />
```

**Security Note:** This only hides the text visually. Always use HTTPS for secure form transmission to prevent data interception.

#### Hidden Content

Invisible form control sent with form data (e.g., timestamps, tracking information).

```html
<input type="hidden" id="timestamp" name="timestamp" value="1286705410" />
```

- Not visible to users
- Never receives focus
- Cannot be intentionally edited by users
- Screen readers will not notice it
- Must have `name` and `value` attributes

### Checkable Items: Checkboxes and Radio Buttons

#### Checkbox

Multiple selections allowed. Each checkbox can be independently checked or unchecked.

```html
<fieldset>
  <legend>Choose all the vegetables you like to eat</legend>
  <ul>
    <li>
      <label for="carrots">Carrots</label>
      <input
        type="checkbox"
        id="carrots"
        name="vegetable"
        value="carrots"
        checked />
    </li>
    <li>
      <label for="peas">Peas</label>
      <input type="checkbox" id="peas" name="vegetable" value="peas" />
    </li>
    <li>
      <label for="cabbage">Cabbage</label>
      <input type="checkbox" id="cabbage" name="vegetable" value="cabbage" />
    </li>
  </ul>
</fieldset>
```

**Properties:**
- Use same `name` attribute for related checkboxes
- Include `checked` attribute to pre-select
- Only values of checked boxes are sent with form

#### Radio Button

Only one selection allowed per group. Tied together by the same `name` attribute.

```html
<fieldset>
  <legend>What is your favorite meal?</legend>
  <ul>
    <li>
      <label for="soup">Soup</label>
      <input type="radio" id="soup" name="meal" value="soup" checked />
    </li>
    <li>
      <label for="curry">Curry</label>
      <input type="radio" id="curry" name="meal" value="curry" />
    </li>
    <li>
      <label for="pizza">Pizza</label>
      <input type="radio" id="pizza" name="meal" value="pizza" />
    </li>
  </ul>
</fieldset>
```

**Properties:**
- Buttons in same group share `name` attribute
- Checking one automatically unchecks others
- Only checked value is sent with form
- Cannot uncheck all without resetting form

**Accessibility Best Practice:** Wrap related items in `<fieldset>` with `<legend>` describing the group, and place each `<label>`/`<input>` pair together.

### Buttons

#### Submit Button

Sends form data to server.

```html
<!-- Using <input> -->
<input type="submit" value="Submit this form" />

<!-- Using <button> -->
<button type="submit">Submit this form</button>
```

#### Reset Button

Resets all form widgets to default values.

```html
<!-- Using <input> -->
<input type="reset" value="Reset this form" />

<!-- Using <button> -->
<button type="reset">Reset this form</button>
```

#### Anonymous Button

No automatic effect; requires JavaScript customization.

```html
<!-- Using <input> -->
<input type="button" value="Do Nothing without JavaScript" />

<!-- Using <button> -->
<button type="button">Do Nothing without JavaScript</button>
```

**Advantage of `<button>` elements:** Much easier to style and supports HTML content inside tags.

### Image Button

Renders as an image but behaves as a submit button. Submits X and Y coordinates of click.

```html
<input type="image" alt="Click me!" src="my-img.png" width="80" height="30" />
```

**Coordinate Submission:**
- X coordinate key: `[name].x`
- Y coordinate key: `[name].y`

**Example URL with GET method:**
```
https://example.com?pos.x=123&pos.y=456
```

### File Picker

Allows users to select one or more files to send to server.

```html
<!-- Single file -->
<input type="file" name="file" id="file" accept="image/*" />

<!-- Multiple files -->
<input type="file" name="file" id="file" accept="image/*" multiple />
```

**Mobile Device Capture** -- access device camera, microphone, or storage directly:

```html
<input type="file" accept="image/*;capture=camera" />
<input type="file" accept="video/*;capture=camcorder" />
<input type="file" accept="audio/*;capture=microphone" />
```

**Attributes:**
- `accept`: Constrains file types (e.g., `image/*`, `.pdf`)
- `multiple`: Allows selecting multiple files

### Common Attributes for All Form Controls

| Attribute | Default | Description |
|-----------|---------|-------------|
| `autofocus` | false | Element automatically receives focus when page loads (only one per document) |
| `disabled` | false | User cannot interact; inherits from containing `<fieldset>` if applicable |
| `form` | -- | Associates control with `<form>` element by ID (allows control outside form) |
| `name` | -- | Control name; submitted with form data |
| `value` | -- | Element's initial value |

### Form Data Submission Behavior

**Checkable Items Special Case:**
- Values sent only if checked
- Unchecked items: nothing is sent (not even name)
- Checked but no value attribute: name is sent with value of `"on"`

```html
<input type="checkbox" name="subscribe" value="yes" />
```
- If checked: `subscribe=yes`
- If unchecked: (nothing)

---

## HTML5 Input Types

> **Source:** https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/HTML5_input_types

HTML5 introduced new `<input type>` values to create native form controls with built-in validation and improved user experience across devices.

### Email Address Field (`type="email"`)

```html
<label for="email">Enter your email address:</label>
<input type="email" id="email" name="email" />
```

**Key Features:**
- **Validation**: Browser validates email format before submission
- **Multiple emails**: Use `multiple` attribute for comma-separated addresses
- **Mobile keyboards**: Displays `@` symbol by default on touch devices
- **Invalid state**: Matches `:invalid` pseudo-class and returns `typeMismatch` validity

```html
<input type="email" id="email" name="email" multiple />
```

**Important Notes:**
- `a@b` is considered valid (allows intranet addresses)
- Use the `pattern` attribute for custom validation

### Search Field (`type="search"`)

```html
<label for="search">Enter a search term:</label>
<input type="search" id="search" name="search" />
```

**Key Features:**
- **Visual styling**: Rounded corners in some browsers
- **Clear icon**: Displays a clear button to empty the field when focused with a value
- **Keyboard**: Enter key may display "search" or magnifying glass icon
- **Auto-completion**: Values saved and reused across site pages

### Phone Number Field (`type="tel"`)

```html
<label for="tel">Enter a telephone number:</label>
<input type="tel" id="tel" name="tel" />
```

**Key Features:**
- **Mobile keyboards**: Displays numeric keypad on touch devices
- **No format enforcement**: Allows letters and special characters (accommodates various international formats)
- **Pattern validation**: Use `pattern` attribute to enforce specific formats

### URL Field (`type="url"`)

```html
<label for="url">Enter a URL:</label>
<input type="url" id="url" name="url" />
```

**Key Features:**
- **Validation requirements**: Protocol required (e.g., `http:`) and proper URL format enforced
- **Mobile keyboards**: Displays colon, period, and forward slash by default
- **Note**: Well-formed URLs do not guarantee the site exists

### Numeric Field (`type="number"`)

```html
<label for="number">Enter a number:</label>
<input type="number" id="number" name="number" />
```

**Attributes:**

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `min` | Minimum value | `min="1"` |
| `max` | Maximum value | `max="10"` |
| `step` | Increment/decrement value | `step="2"` |

**Examples:**

Odd numbers between 1-10:
```html
<input type="number" name="age" id="age" min="1" max="10" step="2" />
```

Decimal values (0-1):
```html
<input type="number" name="change" id="pennies" min="0" max="1" step="0.01" />
```

**Key Features:**
- **Spinner buttons**: Increase/decrease values
- **Mobile**: Numeric keyboard displayed
- **Default step**: `1` (only allows integers unless changed)
- **Float numbers**: Use `step="any"` or `step="0.01"`

### Slider Controls (`type="range"`)

```html
<label for="price">Choose a maximum house price:</label>
<input
  type="range"
  name="price"
  id="price"
  min="50000"
  max="500000"
  step="1000"
  value="250000" />
<output class="price-output" for="price"></output>
```

**JavaScript to Display Value:**
```javascript
const price = document.querySelector("#price");
const output = document.querySelector(".price-output");

output.textContent = price.value;

price.addEventListener("input", () => {
  output.textContent = price.value;
});
```

**Key Features:**
- Less precise than text input (best for approximate values)
- Thumb movement via mouse, touch, or keyboard arrows
- Use `<output>` element for displaying current value
- Configure with `min`, `max`, `step` attributes

### Date and Time Pickers

#### Date (`type="date"`)

```html
<label for="date">Enter the date:</label>
<input type="date" name="date" id="date" />
```
Captures: Year, month, day (no time).

#### Date and Time Local (`type="datetime-local"`)

```html
<label for="datetime">Enter the date and time:</label>
<input type="datetime-local" name="datetime" id="datetime" />
```
Captures: Date and time (no timezone).

#### Month (`type="month"`)

```html
<label for="month">Enter the month:</label>
<input type="month" name="month" id="month" />
```
Captures: Month and year.

#### Time (`type="time"`)

```html
<label for="time">Enter a time:</label>
<input type="time" name="time" id="time" />
```
- **Display format**: 12-hour (in some browsers)
- **Return format**: Always 24-hour

#### Week (`type="week"`)

```html
<label for="week">Enter the week:</label>
<input type="week" name="week" id="week" />
```
- Weeks: Monday-Sunday
- Week 1: Contains first Thursday of the year

#### Date/Time Constraints

```html
<label for="myDate">When are you available this summer?</label>
<input
  type="date"
  name="myDate"
  min="2025-06-01"
  max="2025-08-31"
  step="7"
  id="myDate" />
```

#### Validation Example (CSS)

```css
input:invalid + span::after {
  content: " X";
}

input:valid + span::after {
  content: " checkmark";
}
```

### Color Picker (`type="color"`)

```html
<label for="color">Pick a color:</label>
<input type="color" name="color" id="color" />
```

**Key Features:**
- Opens OS default color-picking functionality
- Return value: Always lowercase 6-digit hexadecimal (e.g., `#ff0000`)
- No manual format entry: System color picker handles selection

### Client-Side Validation Notes

**Advantages:**
- Immediate user feedback
- Guides accurate form completion
- Saves server round trips

**Important Limitations:**
- NOT a security measure -- easily disabled by users
- Server-side validation is always required
- Prevents only obvious mistakes, not malicious data

### HTML5 Input Types Summary

| Type | Purpose | Key Attribute | Mobile Keyboard |
|------|---------|---------------|-----------------|
| `email` | Email address | `multiple` | @ symbol |
| `search` | Search queries | `pattern` | Standard |
| `tel` | Phone numbers | `pattern` | Numeric |
| `url` | Web URLs | Required protocol | `:/.` symbols |
| `number` | Numeric values | `min`, `max`, `step` | Numeric |
| `range` | Slider selection | `min`, `max`, `step` | N/A |
| `date` | Date picker | `min`, `max` | Calendar |
| `time` | Time picker | `min`, `max` | Clock |
| `color` | Color picker | Default hex | Color picker |

---

## Other Form Controls

> **Source:** https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Other_form_controls

### Multi-Line Text Fields (`<textarea>`)

```html
<textarea cols="30" rows="8"></textarea>
```

**Key Characteristics:**
- Allows users to input multiple lines of text
- Supports hard line breaks (pressing return)
- Content is placed between opening and closing tags
- Requires a closing tag (unlike `<input>`)

**Controlling Multi-Line Rendering:**

| Attribute | Description |
|-----------|-------------|
| `cols` | Visible width in average character widths (default: 20) |
| `rows` | Number of visible text rows (default: 2) |
| `wrap` | Text wrapping behavior: `soft` (default), `hard`, or `off` |

**Example with wrapping:**
```html
<textarea cols="30" rows="8" wrap="hard"></textarea>
```

**Controlling Resizability (CSS):**
```css
textarea {
  resize: both;        /* horizontal and vertical */
  resize: horizontal;  /* horizontal only */
  resize: vertical;    /* vertical only */
  resize: none;        /* no resizing */
}
```

### Drop-Down Controls

#### Select Box (Single Selection)

```html
<select id="simple" name="simple">
  <option>Banana</option>
  <option selected>Cherry</option>
  <option>Lemon</option>
</select>
```

**With Grouping (`<optgroup>`):**
```html
<select id="groups" name="groups">
  <optgroup label="fruits">
    <option>Banana</option>
    <option selected>Cherry</option>
    <option>Lemon</option>
  </optgroup>
  <optgroup label="vegetables">
    <option>Carrot</option>
    <option>Eggplant</option>
    <option>Potato</option>
  </optgroup>
</select>
```

**With Value Attributes:**
```html
<select id="simple" name="simple">
  <option value="banana">Big, beautiful yellow banana</option>
  <option value="cherry">Succulent, juicy cherry</option>
  <option value="lemon">Sharp, powerful lemon</option>
</select>
```

**Attributes:**
- `selected` -- Sets the default selected option
- `value` -- The value sent when form is submitted (if omitted, uses option text)
- `size` -- Number of visible options

#### Multiple Choice Select Box

```html
<select id="multi" name="multi" multiple size="2">
  <optgroup label="fruits">
    <option>Banana</option>
    <option selected>Cherry</option>
    <option>Lemon</option>
  </optgroup>
  <optgroup label="vegetables">
    <option>Carrot</option>
    <option>Eggplant</option>
    <option>Potato</option>
  </optgroup>
</select>
```

**Notes:**
- Add `multiple` attribute to allow multiple selections
- Users select via Cmd/Ctrl+click on desktop
- All values display as a list (not dropdown)

#### Autocomplete Box (`<datalist>`)

```html
<label for="myFruit">What's your favorite fruit?</label>
<input type="text" name="myFruit" id="myFruit" list="mySuggestion" />
<datalist id="mySuggestion">
  <option>Apple</option>
  <option>Banana</option>
  <option>Blackberry</option>
  <option>Blueberry</option>
  <option>Lemon</option>
  <option>Lychee</option>
  <option>Peach</option>
  <option>Pear</option>
</datalist>
```

**How It Works:**
- `<datalist>` provides suggested values
- Bound to input via `list` attribute (must match datalist `id`)
- Browsers display matching values as user types
- Works with various input types (text, email, range, color, etc.)

### Progress Bar (`<progress>`)

```html
<progress max="100" value="75">75/100</progress>
```

**Attributes:**
- `max` -- Maximum value (default: 1.0 if not specified)
- `value` -- Current progress value
- Content inside is fallback for unsupported browsers

**Use Cases:** Download progress, questionnaire completion, task progress.

### Meter (`<meter>`)

```html
<meter min="0" max="100" value="75" low="33" high="66" optimum="0">75</meter>
```

**Attributes:**
- `min` / `max` -- Range boundaries
- `low` / `high` -- Define three ranges (lower, medium, higher)
- `value` -- Current meter value
- `optimum` -- Preferred value (determines color coding)

**Color Coding:**
- Green: Value in preferred range
- Yellow: Value in average range
- Red: Value in worst range

**Optimum Logic:**
- If `optimum` in lower range: lower is preferred
- If `optimum` in medium range: medium is preferred
- If `optimum` in higher range: higher is preferred

**Use Cases:** Disk space usage, temperature gauge, ratings.

### Other Form Controls Summary

| Element | Purpose | Input Type |
|---------|---------|------------|
| `<textarea>` | Multi-line text input | Text content |
| `<select>` | Single or multiple selection | Predefined options |
| `<datalist>` | Suggested autocomplete values | Text input with suggestions |
| `<progress>` | Progress indication | Read-only display |
| `<meter>` | Measurement display | Read-only display |
