# HTML Form Examples Reference

This reference consolidates key educational content from W3Schools covering HTML forms, form elements, input types, and form-related attributes.

---

## HTML Forms

> **Source:** https://www.w3schools.com/html/html_forms.asp

### The `<form>` Element

The `<form>` element is used to create an HTML form for user input. It acts as a container for different types of input elements such as text fields, checkboxes, radio buttons, submit buttons, and more.

```html
<form>
  <!-- form elements go here -->
</form>
```

### The `<input>` Element

The `<input>` element is the most used form element. It can be displayed in many ways depending on the `type` attribute.

| Type | Description |
|------|-------------|
| `<input type="text">` | Displays a single-line text input field |
| `<input type="radio">` | Displays a radio button (for selecting one of many choices) |
| `<input type="checkbox">` | Displays a checkbox (for selecting zero or more of many choices) |
| `<input type="submit">` | Displays a submit button (for submitting the form) |
| `<input type="button">` | Displays a clickable button |

### Text Fields

The `<input type="text">` defines a single-line input field for text input.

```html
<form>
  <label for="fname">First name:</label><br>
  <input type="text" id="fname" name="fname"><br>
  <label for="lname">Last name:</label><br>
  <input type="text" id="lname" name="lname">
</form>
```

**Note:** The form itself is not visible. The default width of an input field is 20 characters.

### The `<label>` Element

The `<label>` element defines a label for many form elements. It is useful for screen-reader users because the screen reader will read the label aloud when the user focuses on the input element. It also helps users who have difficulty clicking on very small regions (such as radio buttons or checkboxes) because clicking on the label text toggles the associated input.

The `for` attribute of the `<label>` tag should be equal to the `id` attribute of the `<input>` element to bind them together.

### Radio Buttons

The `<input type="radio">` defines a radio button. Radio buttons let a user select ONE of a limited number of choices.

```html
<form>
  <p>Choose your favorite Web language:</p>
  <input type="radio" id="html" name="fav_language" value="HTML">
  <label for="html">HTML</label><br>
  <input type="radio" id="css" name="fav_language" value="CSS">
  <label for="css">CSS</label><br>
  <input type="radio" id="javascript" name="fav_language" value="JavaScript">
  <label for="javascript">JavaScript</label>
</form>
```

### Checkboxes

The `<input type="checkbox">` defines a checkbox. Checkboxes let a user select ZERO or MORE options of a limited number of choices.

```html
<form>
  <input type="checkbox" id="vehicle1" name="vehicle1" value="Bike">
  <label for="vehicle1"> I have a bike</label><br>
  <input type="checkbox" id="vehicle2" name="vehicle2" value="Car">
  <label for="vehicle2"> I have a car</label><br>
  <input type="checkbox" id="vehicle3" name="vehicle3" value="Boat">
  <label for="vehicle3"> I have a boat</label>
</form>
```

### The Submit Button

The `<input type="submit">` defines a button for submitting the form data to a form-handler. The form-handler is typically a file on the server with a script for processing input data, specified in the form's `action` attribute.

```html
<form action="/action_page.php">
  <label for="fname">First name:</label><br>
  <input type="text" id="fname" name="fname" value="John"><br>
  <label for="lname">Last name:</label><br>
  <input type="text" id="lname" name="lname" value="Doe"><br><br>
  <input type="submit" value="Submit">
</form>
```

### The `name` Attribute for `<input>`

Each input field must have a `name` attribute to be submitted. If the `name` attribute is omitted, the value of the input field will not be sent at all.

---

## HTML Form Attributes

> **Source:** https://www.w3schools.com/html/html_forms_attributes.asp

### The `action` Attribute

The `action` attribute defines the action to be performed when the form is submitted. Usually, the form data is sent to a file on the server when the user clicks the submit button.

```html
<form action="/action_page.php">
  <label for="fname">First name:</label><br>
  <input type="text" id="fname" name="fname" value="John"><br>
  <label for="lname">Last name:</label><br>
  <input type="text" id="lname" name="lname" value="Doe"><br><br>
  <input type="submit" value="Submit">
</form>
```

**Tip:** If the `action` attribute is omitted, the action is set to the current page.

### The `target` Attribute

The `target` attribute specifies where to display the response that is received after submitting the form.

| Value | Description |
|-------|-------------|
| `_blank` | The response is displayed in a new window or tab |
| `_self` | The response is displayed in the current window (default) |
| `_parent` | The response is displayed in the parent frame |
| `_top` | The response is displayed in the full body of the window |
| `framename` | The response is displayed in a named iframe |

```html
<form action="/action_page.php" target="_blank">
```

### The `method` Attribute

The `method` attribute specifies the HTTP method to be used when submitting the form data. The form data can be sent as URL variables (with `method="get"`) or as an HTTP post transaction (with `method="post"`).

```html
<!-- Using GET -->
<form action="/action_page.php" method="get">

<!-- Using POST -->
<form action="/action_page.php" method="post">
```

**When to use GET:**

- The default method if not specified
- Form data is appended to the URL in name/value pairs
- The length of a URL is limited (about 2048 characters)
- Never use GET to send sensitive data (it will be visible in the URL)
- Useful for form submissions where a user wants to bookmark the result
- GET is suitable for non-secure data, like query strings in search engines

**When to use POST:**

- Appends the form data inside the body of the HTTP request (data is not shown in the URL)
- POST has no size limitations
- Form submissions with POST cannot be bookmarked
- Always use POST when submitting sensitive or personal information

### The `autocomplete` Attribute

The `autocomplete` attribute specifies whether a form should have autocomplete on or off. When autocomplete is on, the browser automatically completes values based on values that the user has entered before.

```html
<form action="/action_page.php" autocomplete="on">
```

### The `novalidate` Attribute

The `novalidate` attribute is a boolean attribute. When present, it specifies that the form data should not be validated when submitted.

```html
<form action="/action_page.php" novalidate>
```

### The `enctype` Attribute

The `enctype` attribute specifies how the form data should be encoded when submitting it to the server. This attribute can only be used with `method="post"`.

| Value | Description |
|-------|-------------|
| `application/x-www-form-urlencoded` | Default. All characters are encoded before sent |
| `multipart/form-data` | Required when the form includes file upload controls (`<input type="file">`) |
| `text/plain` | Sends data without any encoding (not recommended) |

```html
<form action="/action_page.php" method="post" enctype="multipart/form-data">
```

### The `name` Attribute

The `name` attribute specifies the name of the form. It is used to reference elements in JavaScript, or to reference form data after submission. Only forms with a name attribute will have their values passed when submitted.

### The `accept-charset` Attribute

The `accept-charset` attribute specifies the character encodings used for the form submission. The default value is `"unknown"`, which indicates the same encoding as the document.

### All `<form>` Attributes Summary

| Attribute | Description |
|-----------|-------------|
| `accept-charset` | Specifies the character encodings for form submission |
| `action` | Specifies where to send the form data when submitted |
| `autocomplete` | Specifies whether the form should have autocomplete on or off |
| `enctype` | Specifies how the form data should be encoded when submitting (for `method="post"`) |
| `method` | Specifies the HTTP method to use when sending form data |
| `name` | Specifies the name of the form |
| `novalidate` | Specifies that the form should not be validated when submitted |
| `rel` | Specifies the relationship between a linked resource and the current document |
| `target` | Specifies where to display the response after submitting the form |

---

## HTML Form Elements

> **Source:** https://www.w3schools.com/html/html_form_elements.asp

### The `<input>` Element

The most important form element. Can be displayed in several ways depending on the `type` attribute. If `type` is omitted, the input field gets the default type `text`.

### The `<label>` Element

Defines a label for several form elements. The `for` attribute should equal the `id` of a related input to bind them. Users can also click the label to toggle focus/selection on the input control.

### The `<select>` Element

The `<select>` element defines a drop-down list.

```html
<label for="cars">Choose a car:</label>
<select id="cars" name="cars">
  <option value="volvo">Volvo</option>
  <option value="saab">Saab</option>
  <option value="fiat" selected>Fiat</option>
  <option value="audi">Audi</option>
</select>
```

- The `<option>` elements define options that can be selected.
- By default, the first item in the drop-down list is selected.
- The `selected` attribute pre-selects an option.
- Use the `size` attribute to specify the number of visible values.
- Use the `multiple` attribute to allow the user to select more than one value.

```html
<!-- Visible values -->
<select id="cars" name="cars" size="3">

<!-- Allow multiple selections -->
<select id="cars" name="cars" size="4" multiple>
```

### The `<textarea>` Element

The `<textarea>` element defines a multi-line input field (a text area).

```html
<textarea name="message" rows="10" cols="30">
The cat was playing in the garden.
</textarea>
```

- The `rows` attribute specifies the visible number of lines in a text area.
- The `cols` attribute specifies the visible width of a text area.
- You can also define the size with CSS using `height` and `width` properties.

```css
textarea {
  width: 100%;
  height: 200px;
}
```

### The `<button>` Element

The `<button>` element defines a clickable button.

```html
<button type="button" onclick="alert('Hello World!')">Click Me!</button>
```

**Note:** Always specify the `type` attribute for the `<button>` element. Different browsers may use different default types.

### The `<fieldset>` and `<legend>` Elements

The `<fieldset>` element groups related data in a form. The `<legend>` element defines a caption for the `<fieldset>` element.

```html
<form action="/action_page.php">
  <fieldset>
    <legend>Personalia:</legend>
    <label for="fname">First name:</label><br>
    <input type="text" id="fname" name="fname" value="John"><br>
    <label for="lname">Last name:</label><br>
    <input type="text" id="lname" name="lname" value="Doe"><br><br>
    <input type="submit" value="Submit">
  </fieldset>
</form>
```

### The `<datalist>` Element

The `<datalist>` element specifies a list of pre-defined options for an `<input>` element. Users will see a drop-down list of the pre-defined options as they input data. The `list` attribute of the `<input>` element must refer to the `id` attribute of the `<datalist>` element.

```html
<form action="/action_page.php">
  <input list="browsers" name="browser">
  <datalist id="browsers">
    <option value="Edge">
    <option value="Firefox">
    <option value="Chrome">
    <option value="Opera">
    <option value="Safari">
  </datalist>
  <input type="submit">
</form>
```

### The `<output>` Element

The `<output>` element represents the result of a calculation (typically performed using JavaScript).

```html
<form action="/action_page.php"
  oninput="x.value=parseInt(a.value)+parseInt(b.value)">
  0
  <input type="range" id="a" name="a" value="50">
  100 +
  <input type="number" id="b" name="b" value="50">
  =
  <output name="x" for="a b"></output>
  <br><br>
  <input type="submit">
</form>
```

### The `<optgroup>` Element

The `<optgroup>` element is used to group related options in a `<select>` element (drop-down list).

```html
<label for="cars">Choose a car:</label>
<select name="cars" id="cars">
  <optgroup label="Swedish Cars">
    <option value="volvo">Volvo</option>
    <option value="saab">Saab</option>
  </optgroup>
  <optgroup label="German Cars">
    <option value="mercedes">Mercedes</option>
    <option value="audi">Audi</option>
  </optgroup>
</select>
```

### Form Elements Summary

| Element | Description |
|---------|-------------|
| `<form>` | Defines an HTML form for user input |
| `<input>` | Defines an input control |
| `<textarea>` | Defines a multiline input control (text area) |
| `<label>` | Defines a label for an `<input>` element |
| `<fieldset>` | Groups related elements in a form |
| `<legend>` | Defines a caption for a `<fieldset>` element |
| `<select>` | Defines a drop-down list |
| `<optgroup>` | Defines a group of related options in a drop-down list |
| `<option>` | Defines an option in a drop-down list |
| `<button>` | Defines a clickable button |
| `<datalist>` | Specifies a list of pre-defined options for input controls |
| `<output>` | Defines the result of a calculation |

---

## HTML Form Input Types

> **Source:** https://www.w3schools.com/html/html_form_input_types.asp

### Input Type: text

`<input type="text">` defines a single-line text input field.

```html
<form>
  <label for="fname">First name:</label><br>
  <input type="text" id="fname" name="fname"><br>
  <label for="lname">Last name:</label><br>
  <input type="text" id="lname" name="lname">
</form>
```

### Input Type: password

`<input type="password">` defines a password field. The characters are masked (shown as asterisks or circles).

```html
<form>
  <label for="username">Username:</label><br>
  <input type="text" id="username" name="username"><br>
  <label for="pwd">Password:</label><br>
  <input type="password" id="pwd" name="pwd">
</form>
```

### Input Type: submit

`<input type="submit">` defines a button for submitting form data to a form-handler. The form-handler is typically a server page specified by the form's `action` attribute.

```html
<form action="/action_page.php">
  <label for="fname">First name:</label><br>
  <input type="text" id="fname" name="fname" value="John"><br>
  <label for="lname">Last name:</label><br>
  <input type="text" id="lname" name="lname" value="Doe"><br><br>
  <input type="submit" value="Submit">
</form>
```

If you omit the submit button's `value` attribute, the button will get a default text.

### Input Type: reset

`<input type="reset">` defines a reset button that will reset all form values to their default values.

```html
<form action="/action_page.php">
  <label for="fname">First name:</label><br>
  <input type="text" id="fname" name="fname" value="John"><br>
  <label for="lname">Last name:</label><br>
  <input type="text" id="lname" name="lname" value="Doe"><br><br>
  <input type="submit" value="Submit">
  <input type="reset">
</form>
```

### Input Type: radio

`<input type="radio">` defines a radio button. Radio buttons let a user select only ONE of a limited number of choices.

```html
<form>
  <input type="radio" id="html" name="fav_language" value="HTML">
  <label for="html">HTML</label><br>
  <input type="radio" id="css" name="fav_language" value="CSS">
  <label for="css">CSS</label><br>
  <input type="radio" id="javascript" name="fav_language" value="JavaScript">
  <label for="javascript">JavaScript</label>
</form>
```

### Input Type: checkbox

`<input type="checkbox">` defines a checkbox. Checkboxes let a user select ZERO or MORE options.

```html
<form>
  <input type="checkbox" id="vehicle1" name="vehicle1" value="Bike">
  <label for="vehicle1"> I have a bike</label><br>
  <input type="checkbox" id="vehicle2" name="vehicle2" value="Car">
  <label for="vehicle2"> I have a car</label><br>
  <input type="checkbox" id="vehicle3" name="vehicle3" value="Boat">
  <label for="vehicle3"> I have a boat</label>
</form>
```

### Input Type: button

`<input type="button">` defines a button.

```html
<input type="button" onclick="alert('Hello World!')" value="Click Me!">
```

### Input Type: color

`<input type="color">` is used for input fields that should contain a color. Depending on browser support, a color picker can be shown.

```html
<form>
  <label for="favcolor">Select your favorite color:</label>
  <input type="color" id="favcolor" name="favcolor" value="#ff0000">
</form>
```

### Input Type: date

`<input type="date">` is used for input fields that should contain a date. Depending on browser support, a date picker can be shown.

```html
<form>
  <label for="birthday">Birthday:</label>
  <input type="date" id="birthday" name="birthday">
</form>
```

You can use the `min` and `max` attributes to add restrictions:

```html
<input type="date" id="datemin" name="datemin" min="2000-01-02">
<input type="date" id="datemax" name="datemax" max="1979-12-31">
```

### Input Type: datetime-local

`<input type="datetime-local">` specifies a date and time input field, with no time zone.

```html
<form>
  <label for="birthdaytime">Birthday (date and time):</label>
  <input type="datetime-local" id="birthdaytime" name="birthdaytime">
</form>
```

### Input Type: email

`<input type="email">` is used for input fields that should contain an e-mail address. Depending on browser support, the e-mail address can be automatically validated. Some smartphones recognize the email type and add `.com` to the keyboard.

```html
<form>
  <label for="email">Enter your email:</label>
  <input type="email" id="email" name="email">
</form>
```

### Input Type: file

`<input type="file">` defines a file-select field and a "Browse" button for file uploads.

```html
<form>
  <label for="myfile">Select a file:</label>
  <input type="file" id="myfile" name="myfile">
</form>
```

### Input Type: hidden

`<input type="hidden">` defines a hidden input field (not visible to the user). A hidden field lets web developers include data that cannot be seen or modified by users when a form is submitted.

```html
<form>
  <label for="fname">First name:</label>
  <input type="text" id="fname" name="fname"><br><br>
  <input type="hidden" id="custId" name="custId" value="3487">
  <input type="submit" value="Submit">
</form>
```

### Input Type: image

`<input type="image">` defines an image as a submit button. The path to the image is specified in the `src` attribute.

```html
<form>
  <input type="image" src="img_submit.gif" alt="Submit" width="48" height="48">
</form>
```

### Input Type: month

`<input type="month">` allows the user to select a month and year.

```html
<form>
  <label for="bdaymonth">Birthday (month and year):</label>
  <input type="month" id="bdaymonth" name="bdaymonth">
</form>
```

### Input Type: number

`<input type="number">` defines a numeric input field. You can set restrictions on what numbers are accepted.

```html
<form>
  <label for="quantity">Quantity (between 1 and 5):</label>
  <input type="number" id="quantity" name="quantity" min="1" max="5">
</form>
```

**Input restrictions:**

| Attribute | Description |
|-----------|-------------|
| `disabled` | Specifies that an input field should be disabled |
| `max` | Specifies the maximum value for an input field |
| `maxlength` | Specifies the maximum number of characters for an input field |
| `min` | Specifies the minimum value for an input field |
| `pattern` | Specifies a regular expression to check the input value against |
| `readonly` | Specifies that an input field is read only (cannot be changed) |
| `required` | Specifies that an input field is required (must be filled out) |
| `size` | Specifies the width (in characters) of an input field |
| `step` | Specifies the legal number intervals for an input field |
| `value` | Specifies the default value for an input field |

### Input Type: range

`<input type="range">` defines a control for entering a number whose exact value is not important (like a slider control). Default range is 0 to 100. You can set restrictions with `min`, `max`, and `step`.

```html
<form>
  <label for="vol">Volume (between 0 and 50):</label>
  <input type="range" id="vol" name="vol" min="0" max="50">
</form>
```

### Input Type: search

`<input type="search">` is used for search fields (behaves like a regular text field).

```html
<form>
  <label for="gsearch">Search Google:</label>
  <input type="search" id="gsearch" name="gsearch">
</form>
```

### Input Type: tel

`<input type="tel">` is used for input fields that should contain a telephone number.

```html
<form>
  <label for="phone">Enter your phone number:</label>
  <input type="tel" id="phone" name="phone"
    pattern="[0-9]{3}-[0-9]{2}-[0-9]{3}">
</form>
```

### Input Type: time

`<input type="time">` allows the user to select a time (no time zone).

```html
<form>
  <label for="appt">Select a time:</label>
  <input type="time" id="appt" name="appt">
</form>
```

### Input Type: url

`<input type="url">` is used for input fields that should contain a URL address. Depending on browser support, the url field can be automatically validated. Some smartphones recognize the url type and add `.com` to the keyboard.

```html
<form>
  <label for="homepage">Add your homepage:</label>
  <input type="url" id="homepage" name="homepage">
</form>
```

### Input Type: week

`<input type="week">` allows the user to select a week and year.

```html
<form>
  <label for="week">Select a week:</label>
  <input type="week" id="week" name="week">
</form>
```

### Input Types Summary

| Input Type | Description |
|------------|-------------|
| `text` | Default. Single-line text input |
| `password` | Password field (characters are masked) |
| `submit` | Submit button |
| `reset` | Reset button |
| `radio` | Radio button |
| `checkbox` | Checkbox |
| `button` | Clickable button |
| `color` | Color picker |
| `date` | Date control (year, month, day) |
| `datetime-local` | Date and time control (no timezone) |
| `email` | Field for an e-mail address |
| `file` | File-select field and a "Browse" button |
| `hidden` | Hidden input field |
| `image` | Image as a submit button |
| `month` | Month and year control |
| `number` | Field for entering a number |
| `range` | Slider control for entering a number in a range |
| `search` | Text field for searching |
| `tel` | Field for entering a telephone number |
| `time` | Control for entering a time |
| `url` | Field for entering a URL |
| `week` | Week and year control |

---

## HTML Input Attributes

> **Source:** https://www.w3schools.com/html/html_form_attributes.asp

### The `value` Attribute

The `value` attribute specifies an initial value for an input field.

```html
<form>
  <label for="fname">First name:</label><br>
  <input type="text" id="fname" name="fname" value="John"><br>
  <label for="lname">Last name:</label><br>
  <input type="text" id="lname" name="lname" value="Doe">
</form>
```

### The `readonly` Attribute

The `readonly` attribute specifies that an input field is read-only. A read-only input field cannot be modified but can be tabbed to, highlighted, and copied. The value of a read-only field will be sent when submitting the form.

```html
<input type="text" id="fname" name="fname" value="John" readonly>
```

### The `disabled` Attribute

The `disabled` attribute specifies that an input field should be disabled. A disabled field is unusable and un-clickable. The value of a disabled field will **not** be sent when submitting the form.

```html
<input type="text" id="fname" name="fname" value="John" disabled>
```

### The `size` Attribute

The `size` attribute specifies the visible width, in characters, of an input field. The default value for `size` is 20. Works with: text, search, tel, url, email, and password.

```html
<input type="text" id="fname" name="fname" size="50">
```

### The `maxlength` Attribute

The `maxlength` attribute specifies the maximum number of characters allowed in an input field. When a `maxlength` is set, the input field will not accept more than the specified number of characters.

```html
<input type="text" id="fname" name="fname" maxlength="10">
```

### The `min` and `max` Attributes

The `min` and `max` attributes specify the minimum and maximum values for an input field. Work with: number, range, date, datetime-local, month, time, and week.

```html
<input type="date" id="datemin" name="datemin" min="2000-01-02">
<input type="date" id="datemax" name="datemax" max="1979-12-31">
<input type="number" id="quantity" name="quantity" min="1" max="5">
```

### The `multiple` Attribute

The `multiple` attribute specifies that the user is allowed to enter more than one value in an input field. Works with email and file.

```html
<input type="file" id="files" name="files" multiple>
```

### The `pattern` Attribute

The `pattern` attribute specifies a regular expression that the input field's value is checked against when the form is submitted. Works with: text, date, search, url, tel, email, and password.

```html
<input type="text" id="country_code" name="country_code"
  pattern="[A-Za-z]{3}" title="Three letter country code">
```

**Tip:** Use the global `title` attribute to describe the pattern to help the user.

### The `placeholder` Attribute

The `placeholder` attribute specifies a short hint that describes the expected value of an input field. The hint is displayed in the input field before the user enters a value. Works with: text, search, url, tel, email, and password.

```html
<input type="tel" id="phone" name="phone"
  placeholder="123-45-678">
```

### The `required` Attribute

The `required` attribute specifies that an input field must be filled out before submitting the form.

```html
<input type="text" id="username" name="username" required>
```

### The `step` Attribute

The `step` attribute specifies the legal number intervals for an input field. Works with: number, range, date, datetime-local, month, time, and week.

```html
<!-- Accept values at intervals of 3 -->
<input type="number" id="points" name="points" step="3">
```

**Note:** Input restrictions are not foolproof. JavaScript provides additional ways to restrict illegal input. Server-side validation is always required.

### The `autofocus` Attribute

The `autofocus` attribute specifies that an input field should automatically get focus when the page loads.

```html
<input type="text" id="fname" name="fname" autofocus>
```

### The `height` and `width` Attributes

The `height` and `width` attributes specify the height and width of an `<input type="image">` element. Always specify the size of images to prevent page flickering during load.

```html
<input type="image" src="img_submit.gif" alt="Submit" width="48" height="48">
```

### The `list` Attribute

The `list` attribute refers to a `<datalist>` element that contains pre-defined options for an `<input>` element.

```html
<input list="browsers">
<datalist id="browsers">
  <option value="Edge">
  <option value="Firefox">
  <option value="Chrome">
  <option value="Opera">
  <option value="Safari">
</datalist>
```

### The `autocomplete` Attribute

The `autocomplete` attribute specifies whether a form or an input field should have autocomplete on or off. When on, the browser automatically completes values based on previously entered values.

```html
<form action="/action_page.php" autocomplete="on">
  <label for="fname">First name:</label>
  <input type="text" id="fname" name="fname"><br><br>
  <label for="email">Email:</label>
  <input type="email" id="email" name="email" autocomplete="off"><br><br>
  <input type="submit">
</form>
```

**Tip:** `autocomplete` works with the `<form>` element and the following `<input>` types: text, search, url, tel, email, password, datepickers, range, and color.

### Input Attributes Summary

| Attribute | Description |
|-----------|-------------|
| `value` | Specifies the default value of an input element |
| `readonly` | Specifies that an input field is read-only |
| `disabled` | Specifies that an input field is disabled |
| `size` | Specifies the visible width of an input field |
| `maxlength` | Specifies the maximum number of characters in an input field |
| `min` | Specifies the minimum value for an input field |
| `max` | Specifies the maximum value for an input field |
| `multiple` | Specifies that a user can enter more than one value |
| `pattern` | Specifies a regular expression to check the value against |
| `placeholder` | Specifies a short hint describing the expected value |
| `required` | Specifies that an input field must be filled out |
| `step` | Specifies the legal number intervals |
| `autofocus` | Specifies that an input field should get focus on page load |
| `height` | Specifies the height of an `<input type="image">` |
| `width` | Specifies the width of an `<input type="image">` |
| `list` | Refers to a `<datalist>` element with pre-defined options |
| `autocomplete` | Specifies whether autocomplete is on or off |

---

## HTML Input form* Attributes

> **Source:** https://www.w3schools.com/html/html_form_attributes_form.asp

### The `form` Attribute

The input `form` attribute specifies the form the `<input>` element belongs to. The value of this attribute must be equal to the `id` attribute of the `<form>` element it belongs to. This allows an input field located outside the form to still be associated with it.

```html
<form action="/action_page.php" id="form1">
  <label for="fname">First name:</label>
  <input type="text" id="fname" name="fname"><br><br>
  <input type="submit" value="Submit">
</form>

<!-- This input is outside the form but still part of it -->
<label for="lname">Last name:</label>
<input type="text" id="lname" name="lname" form="form1">
```

### The `formaction` Attribute

The input `formaction` attribute specifies the URL of the file that will process the input when the form is submitted. This attribute overrides the `action` attribute of the `<form>` element. Works with submit and image input types.

```html
<form action="/action_page.php">
  <label for="fname">First name:</label>
  <input type="text" id="fname" name="fname"><br><br>
  <input type="submit" value="Submit">
  <input type="submit" formaction="/action_page2.php" value="Submit as Admin">
</form>
```

### The `formenctype` Attribute

The input `formenctype` attribute specifies how the form data should be encoded when submitted (only for forms with `method="post"`). This attribute overrides the `enctype` attribute of the `<form>` element. Works with submit and image input types.

```html
<form action="/action_page_binary.asp" method="post">
  <label for="fname">First name:</label>
  <input type="text" id="fname" name="fname"><br><br>
  <input type="submit" value="Submit">
  <input type="submit" formenctype="multipart/form-data"
    value="Submit as Multipart/form-data">
</form>
```

### The `formmethod` Attribute

The input `formmethod` attribute defines the HTTP method for sending form data to the action URL. This attribute overrides the `method` attribute of the `<form>` element. Works with submit and image input types.

```html
<form action="/action_page.php" method="get">
  <label for="fname">First name:</label>
  <input type="text" id="fname" name="fname"><br><br>
  <label for="lname">Last name:</label>
  <input type="text" id="lname" name="lname"><br><br>
  <input type="submit" value="Submit using GET">
  <input type="submit" formmethod="post" value="Submit using POST">
</form>
```

### The `formtarget` Attribute

The input `formtarget` attribute specifies a name or keyword that indicates where to display the response after submitting the form. This attribute overrides the `target` attribute of the `<form>` element. Works with submit and image input types.

```html
<form action="/action_page.php">
  <label for="fname">First name:</label>
  <input type="text" id="fname" name="fname"><br><br>
  <label for="lname">Last name:</label>
  <input type="text" id="lname" name="lname"><br><br>
  <input type="submit" value="Submit">
  <input type="submit" formtarget="_blank" value="Submit to a new window/tab">
</form>
```

### The `formnovalidate` Attribute

The input `formnovalidate` attribute specifies that an `<input>` element should not be validated when submitted. This attribute overrides the `novalidate` attribute of the `<form>` element. Works with the submit input type.

```html
<form action="/action_page.php">
  <label for="email">Enter your email:</label>
  <input type="email" id="email" name="email"><br><br>
  <input type="submit" value="Submit">
  <input type="submit" formnovalidate="formnovalidate"
    value="Submit without validation">
</form>
```

### The `novalidate` Attribute

The `novalidate` attribute is a `<form>` attribute. When present, it specifies that all form data should not be validated when submitted.

```html
<form action="/action_page.php" novalidate>
  <label for="email">Enter your email:</label>
  <input type="email" id="email" name="email"><br><br>
  <input type="submit" value="Submit">
</form>
```

### form* Attributes Summary

| Attribute | Description |
|-----------|-------------|
| `form` | Specifies the form the input element belongs to |
| `formaction` | Specifies the URL for form submission (overrides form's `action`) |
| `formenctype` | Specifies how form data should be encoded (overrides form's `enctype`) |
| `formmethod` | Specifies the HTTP method for sending data (overrides form's `method`) |
| `formnovalidate` | Specifies that the input should not be validated (overrides form's `novalidate`) |
| `formtarget` | Specifies where to display the response (overrides form's `target`) |
