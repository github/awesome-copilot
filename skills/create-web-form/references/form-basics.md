# Form Basics Reference

This reference consolidates key educational content from MDN Web Docs covering the fundamentals of creating and structuring HTML web forms.

---

## Your First Form

> **Source:** https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Your_first_form

### What Are Web Forms?

Web forms are one of the main points of interaction between users and websites or applications. They allow users to enter data for server processing and storage, or to update the interface immediately on the client side.

A web form consists of:

- **Form controls (widgets):** text fields, dropdowns, buttons, checkboxes, radio buttons
- **Additional elements:** mostly built with the `<input>` element, plus other semantic elements
- **Form labels:** paired with controls for accessibility

Form controls can enforce specific formats via **form validation** and should be paired with text labels for both sighted and visually impaired users.

### Designing Your Form

Best practices before writing any code:

- Step back and plan your form before coding
- Create a mockup to define the data you need
- Keep forms simple and focused
- Ask only for absolutely necessary data
- Larger forms risk frustrating users and losing engagement

### The `<form>` Element

The `<form>` element formally defines a form container and its behavior.

```html
<form action="/my-handling-form-page" method="post">...</form>
```

**Attributes:**

| Attribute | Description |
|-----------|-------------|
| `action`  | The URL where form data is sent when submitted |
| `method`  | The HTTP method for sending data (`get` or `post`) |

Both attributes are optional but it is standard practice to always set them.

### The `<label>`, `<input>`, and `<textarea>` Elements

```html
<form action="/my-handling-form-page" method="post">
  <p>
    <label for="name">Name:</label>
    <input type="text" id="name" name="user_name" />
  </p>
  <p>
    <label for="mail">Email:</label>
    <input type="email" id="mail" name="user_email" />
  </p>
  <p>
    <label for="msg">Message:</label>
    <textarea id="msg" name="user_message"></textarea>
  </p>
</form>
```

#### The `<label>` Element

- The `for` attribute must match the `id` of its associated form control.
- Clicking or tapping a label activates its associated control.
- Provides an accessible name for screen readers.
- Improves usability for mouse, trackpad, and touch devices.

#### The `<input>` Element

The `type` attribute defines how the input appears and behaves.

| Type    | Description |
|---------|-------------|
| `text`  | Basic single-line text field (default); accepts any text |
| `email` | Single-line field that validates for well-formed email addresses; shows an appropriate keyboard on mobile devices |

`<input>` is a **void element** -- it has no closing tag.

Setting a default value:

```html
<input type="text" value="by default this element is filled with this text" />
```

#### The `<textarea>` Element

A multi-line text field for longer messages. Unlike `<input>`, it is **not** a void element and requires a closing tag.

Setting a default value:

```html
<textarea>
by default this element is filled with this text
</textarea>
```

### The `<button>` Element

```html
<p class="button">
  <button type="submit">Send your message</button>
</p>
```

**`type` attribute values:**

| Value    | Description |
|----------|-------------|
| `submit` | Sends form data to the URL defined in in the `<form>` element's `action` attribute (default) |
| `reset`  | Resets all widgets to their default values (considered a UX anti-pattern -- avoid unless necessary) |
| `button` | Does nothing by default; useful for custom JavaScript functionality |

The `<button>` element is preferred over `<input type="submit">` because `<button>` allows full HTML content inside it, enabling more complex designs, while `<input>` only allows plain text.

### Basic Form Styling

```css
body {
  text-align: center;
}

form {
  display: inline-block;
  padding: 1em;
  border: 1px solid #cccccc;
  border-radius: 1em;
}

p + p {
  margin-top: 1em;
}

label {
  display: inline-block;
  min-width: 90px;
  text-align: right;
}

input,
textarea {
  font: 1em sans-serif;
  width: 300px;
  box-sizing: border-box;
  border: 1px solid #999999;
}

input:focus,
textarea:focus {
  outline-style: solid;
  outline-color: black;
}

textarea {
  vertical-align: top;
  height: 5em;
}

.button {
  padding-left: 90px;
}

button {
  margin-left: 0.5em;
}
```

### Sending Form Data to Your Web Server

Form data is sent as **name/value pairs**. Every form control that should submit data must have a `name` attribute.

```html
<form action="/my-handling-form-page" method="post">
  <input type="text" id="name" name="user_name" />
  <input type="email" id="mail" name="user_email" />
  <textarea id="msg" name="user_message"></textarea>
  <button type="submit">Send your message</button>
</form>
```

This form sends three pieces of data to `/my-handling-form-page` via HTTP POST:

- `user_name` -- the user's name
- `user_email` -- the user's email
- `user_message` -- the user's message

Each server-side language (PHP, Python, Ruby, Java, C#, etc.) has its own mechanism for handling form data using the `name` attributes.

### Complete Example

```html
<form action="/my-handling-form-page" method="post">
  <div>
    <label for="name">Name:</label>
    <input type="text" id="name" name="user_name" />
  </div>

  <div>
    <label for="mail">Email:</label>
    <input type="email" id="mail" name="user_email" />
  </div>

  <div>
    <label for="msg">Message:</label>
    <textarea id="msg" name="user_message"></textarea>
  </div>

  <div class="button">
    <button type="submit">Send your message</button>
  </div>
</form>
```

### Key Takeaways

1. **Accessibility first:** Always use `<label>` elements with `for` attributes.
2. **Semantic HTML:** Use appropriate `<input>` types (email, text, etc.).
3. **Keep it simple:** Ask only for necessary data.
4. **Name your controls:** Every input needs a `name` attribute for form submission.
5. **Styling matters:** Forms need CSS to look professional.

---

## How to Structure a Web Form

> **Source:** https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/How_to_structure_a_web_form

### The `<form>` Element

The `<form>` element formally defines a form and determines its behavior.

Key points:

- All form content must be nested inside `<form>`.
- Assistive technologies and browser plugins can discover `<form>` elements and provide special features.
- **It is strictly forbidden to nest a form inside another form** -- doing so causes unpredictable behavior.
- Form controls can exist outside a `<form>` element but should be associated using the `form` attribute.

### The `<fieldset>` and `<legend>` Elements

`<fieldset>` creates groups of widgets for styling and semantic purposes. `<legend>` labels a fieldset by describing its purpose and is positioned directly after the opening `<fieldset>` tag.

Many assistive technologies (such as JAWS and NVDA) treat the legend text as part of each control's label within the fieldset.

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

A screen reader would announce: "Fruit juice size small," "Fruit juice size medium," "Fruit juice size large."

**Use cases:**

- Essential for grouping radio buttons
- Sectioning complex, long forms across multiple pages
- Improving usability when many controls appear on a single page

### The `<label>` Element

The `<label>` element is the formal way to define a label for an HTML form widget.

#### Two Methods for Associating Labels

**Method 1: Using the `for` attribute (recommended)**

```html
<label for="name">Name:</label>
<input type="text" id="name" name="user_name" />
```

A screen reader would announce: "Name, edit text."

**Method 2: Implicit association (nesting)**

```html
<label for="name">
  Name: <input type="text" id="name" name="user_name" />
</label>
```

**Best practice:** Always set the `for` attribute even when nesting, to ensure all assistive technologies understand the relationship.

#### Labels Are Clickable

Clicking or tapping a label activates the corresponding widget. This is especially useful for radio buttons and checkboxes which have small hit areas.

```html
<form>
  <p>
    <input type="checkbox" id="taste_1" name="taste_cherry" value="cherry" />
    <label for="taste_1">I like cherry</label>
  </p>
  <p>
    <input type="checkbox" id="taste_2" name="taste_banana" value="banana" />
    <label for="taste_2">I like banana</label>
  </p>
</form>
```

#### Handling Multiple Labels

Avoid placing multiple separate labels on one widget. Instead, include all label information in one `<label>` element:

```html
<div>
  <label for="username">Name *:</label>
  <input id="username" type="text" name="username" required />
</div>
```

### Common HTML Structures Used with Forms

Recommended structural elements for organizing form content:

- `<ul>` or `<ol>` lists with `<li>` items -- best for multiple checkboxes or radio buttons
- `<p>` and `<div>` elements for wrapping labels and widgets
- `<section>` elements to organize complex forms into logical groups
- HTML headings (`<h1>`, `<h2>`, etc.) for sectioning
- If a form has required fields, include a statement explaining the notation (e.g., "* required") before the form begins

### Building a Form Structure -- Payment Form Example

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
        <li>
          <label for="title_3">
            <input type="radio" id="title_3" name="title" value="Q" />
            Queen
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
      <label for="card">
        <span>Card type:</span>
      </label>
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
    <p>
      <label for="expiration">Expiration date *:</label>
      <input
        type="text"
        id="expiration"
        name="expiration"
        required
        placeholder="MM/YY"
        pattern="^(0[1-9]|1[0-2])\/([0-9]{2})$" />
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

### Important Attributes Reference

| Attribute     | Element        | Purpose |
|---------------|----------------|---------|
| `for`         | `<label>`      | Associates a label with a form control by matching the control's `id` |
| `id`          | Form control   | Unique identifier for associating with labels |
| `name`        | Form control   | Identifies data submitted with the form |
| `required`    | Form control   | Marks a field as required for submission |
| `placeholder` | `<input>`      | Shows example format inside the field (e.g., "MM/YY") |
| `pattern`     | `<input>`      | Regular expression for client-side validation |
| `form`        | Form control   | Associates a control with a `<form>`, even if the control is outside it |
| `type`        | `<input>`, `<button>` | Specifies input behavior (text, email, password, tel, etc.) |

### Key Best Practices for Accessible Form Structure

1. Always use the `<form>` element to wrap all form content.
2. Use `<fieldset>` and `<legend>` to group related controls, especially radio buttons.
3. Always associate labels with form controls using the `for` attribute pointing to the control's `id`.
4. Use semantic HTML (`<section>`, headings) to organize complex forms.
5. State required-field notation upfront in a paragraph before the form.
6. Use lists (`<ul>`/`<ol>`) for multiple checkboxes or radio buttons.
7. Test with screen readers to verify accessibility.
8. Never nest forms inside other forms.
9. Make labels clickable to increase hit areas for checkbox and radio button controls.
