# ARIA Form Role Reference

> **Source:** <https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/form_role>

## Definition and Description

The `form` role identifies a group of elements on a page that provide equivalent functionality to an HTML form. It is a **landmark role** that helps users navigate to form sections.

A `form` landmark identifies a region of content that contains a collection of items and objects that, as a whole, combine to create a form when no other named landmark is appropriate (e.g., `main` or `search`).

**Important:** The form is not exposed as a landmark region unless it has an accessible name.

## Preferred Approach: Use HTML `<form>` Instead

Use an HTML `<form>` element to contain your form controls, rather than the ARIA `form` role, unless you have a very good reason. The HTML `<form>` element is sufficient to tell assistive technologies that there is a form.

```html
<!-- Recommended semantic approach -->
<form id="send-comment" aria-label="Add a comment">
  <!-- form controls here -->
</form>
```

The `<form>` element will automatically communicate as a `form` landmark if provided an accessible name.

## When to Use `role="form"`

The `form` role should be used to identify a **region of the page** containing form content, not individual form fields. It is appropriate when you are not using a native `<form>` element but still want to convey form semantics to assistive technologies.

### Basic Example

```html
<div role="form" id="contact-info" aria-label="Contact information">
  <!-- form content -->
</div>
```

### Full Example with Form Controls

```html
<div role="form" id="send-comment" aria-label="Add a comment">
  <label for="username">Username</label>
  <input
    id="username"
    name="username"
    autocomplete="nickname"
    autocorrect="off"
    type="text" />

  <label for="email">Email</label>
  <input
    id="email"
    name="email"
    autocomplete="email"
    autocapitalize="off"
    autocorrect="off"
    spellcheck="false"
    type="text" />

  <label for="comment">Comment</label>
  <textarea id="comment" name="comment"></textarea>

  <input value="Comment" type="submit" />
</div>
```

## Accessible Naming (Required for Landmark Exposure)

Each `<form>` element and form `role` that needs to be exposed as a landmark **must be given an accessible name** using one of:

- `aria-label`
- `aria-labelledby`
- `title` attribute

### Example with `aria-label`

```html
<div role="form" id="gift-cards" aria-label="Purchase a gift card">
  <!-- form content -->
</div>
```

### Avoid Redundant Descriptions

Screen readers announce the role type, so do not repeat it in the label:

- **Incorrect:** `aria-label="Contact form"` (announces "contact form form")
- **Correct:** `aria-label="Contact information"` (concise and non-redundant)

## Attributes and Interactions

### Associated WAI-ARIA Roles, States, and Properties

No role-specific states or properties are defined for the `form` role.

### Keyboard Interactions

No role-specific keyboard interactions are defined for the `form` role.

### Required JavaScript Features

- **`onsubmit` Event Handler:** Handles events raised when the form is submitted.
- Anything that is not a native `<form>` element cannot be submitted using standard form submission. You must use JavaScript to build alternative data submission mechanisms (e.g., with `fetch()` or `XMLHttpRequest`).

## Accessibility Concerns

### 1. Use Sparingly

Landmark roles are intended for larger overall sections of the document. Using too many landmark roles creates "noise" in screen readers, making it difficult for users to understand the overall page layout.

### 2. Inputs Are Not Forms

Do not declare `role="form"` on individual form elements (inputs, textareas, selects, etc.). Apply the role to the **wrapper element only**.

```html
<!-- Incorrect -->
<input role="form" type="text" />

<!-- Correct -->
<div role="form" aria-label="User details">
  <input type="text" />
</div>
```

### 3. Use `search` Role for Search Forms

If a form is used for search functionality, use the more specialized `role="search"` instead of `role="form"`.

### 4. Use Native Form Controls

Even when using `role="form"`, prefer native HTML form controls:

- `<button>`
- `<input>`
- `<select>`
- `<textarea>`
- `<label>`

## Best Practices

- **Prefer the HTML `<form>` element.** Using the semantic `<form>` element automatically communicates the form landmark without needing ARIA.
- **Provide unique labels.** Each form in a document should have a unique accessible name to help users understand its purpose.
- **Make labels visible.** Labels should be visible to all users, not just assistive technology users.
- **Use appropriate landmark roles.** Use `role="search"` for search forms, `role="form"` for general form groups, and the `<form>` HTML element whenever possible.

## Specifications

- [WAI-ARIA: form role specification](https://w3c.github.io/aria/#form)
- [WAI-ARIA APG: Form landmark example](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/form.html)

## Related References

- [`<form>` HTML element (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/form)
- [`<legend>` HTML element (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/legend)
- [`<label>` HTML element (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/label)
- [`search` ARIA role (MDN)](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/search_role)
