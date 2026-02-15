# Form Data Handling Reference

---

## Section 1: Sending and Retrieving Form Data

**Source:** https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Sending_and_retrieving_form_data

### Overview

Once form data is validated on the client-side, it is ready to submit. This section covers what happens when a user submits a form, where the data goes, and how to handle it on the server.

### Client/Server Architecture

The web uses a basic client/server architecture:

- **Client** (web browser) sends an HTTP request to a **server**.
- **Server** (Apache, Nginx, IIS, Tomcat) responds using the same protocol.
- HTML forms are a user-friendly way to configure HTTP requests for sending data.

### On the Client Side: Defining How to Send Data

The `<form>` element controls how data is sent. Two critical attributes are `action` and `method`.

#### The `action` Attribute

The `action` attribute defines where form data gets sent. It must be a valid relative or absolute URL.

**Absolute URL:**

```html
<form action="https://www.example.com">...</form>
```

**Relative URL (same origin):**

```html
<form action="/somewhere_else">...</form>
```

**Same page (no attributes or empty action):**

```html
<form>...</form>
```

**Security Note:** Use HTTPS (secure HTTP) to encrypt data. If a secure form posts to an insecure HTTP URL, browsers display a security warning.

#### The `method` Attribute

Two main HTTP methods transmit form data: **GET** and **POST**.

### GET Method

- Used by browsers to ask the server to send back a resource.
- Data is appended to the URL as query parameters.
- Browser sends an empty body.

**Example Form:**

```html
<form action="https://www.example.com/greet" method="GET">
  <div>
    <label for="say">What greeting do you want to say?</label>
    <input name="say" id="say" value="Hi" />
  </div>
  <div>
    <label for="to">Who do you want to say it to?</label>
    <input name="to" id="to" value="Mom" />
  </div>
  <div>
    <button>Send my greetings</button>
  </div>
</form>
```

**Result URL:** `https://www.example.com/greet?say=Hi&to=Mom`

**HTTP Request:**

```http
GET /?say=Hi&to=Mom HTTP/2.0
Host: example.com
```

**When to use:** Reading data, non-sensitive information.

### POST Method

- Used to send data that the server should process.
- Data is included in the HTTP request body, not the URL.
- More secure for sensitive data (passwords, etc.).

**Example Form:**

```html
<form action="https://www.example.com/greet" method="POST">
  <div>
    <label for="say">What greeting do you want to say?</label>
    <input name="say" id="say" value="Hi" />
  </div>
  <div>
    <label for="to">Who do you want to say it to?</label>
    <input name="to" id="to" value="Mom" />
  </div>
  <div>
    <button>Send my greetings</button>
  </div>
</form>
```

**HTTP Request:**

```http
POST / HTTP/2.0
Host: example.com
Content-Type: application/x-www-form-urlencoded
Content-Length: 13

say=Hi&to=Mom
```

**When to use:** Sensitive data, large amounts of data, modifying server state.

### Viewing HTTP Requests in Browser DevTools

1. Open Developer Tools (F12).
2. Select the "Network" tab.
3. Select "All" to see all requests.
4. Click the request in the "Name" tab.
5. View "Request" (Firefox) or "Payload" (Chrome/Edge).

### On the Server Side: Retrieving the Data

The server receives data as a string parsed into key/value pairs. Access method depends on the server platform.

#### Example: Raw PHP

```php
<?php
  // Access POST data
  $say = htmlspecialchars($_POST["say"]);
  $to  = htmlspecialchars($_POST["to"]);

  // Access GET data
  // $say = htmlspecialchars($_GET["say"]);

  echo $say, " ", $to;
?>
```

**Output:** `Hi Mom`

#### Example: Python with Flask

```python
from flask import Flask, render_template, request

app = Flask(__name__)

@app.route('/', methods=['GET', 'POST'])
def form():
    return render_template('form.html')

@app.route('/hello', methods=['GET', 'POST'])
def hello():
    return render_template('greeting.html',
                         say=request.form['say'],
                         to=request.form['to'])

if __name__ == "__main__":
    app.run()
```

#### Other Server-Side Frameworks

| Language   | Frameworks                              |
|------------|-----------------------------------------|
| Python     | Django, Flask, web2py, py4web           |
| Node.js    | Express, Next.js, Nuxt, Remix          |
| PHP        | Laravel, Laminas, Symfony               |
| Ruby       | Ruby On Rails                           |
| Java       | Spring Boot                             |

### A Special Case: Sending Files

Files are binary data and require special handling. Three steps are needed:

#### The `enctype` Attribute

This specifies the `Content-Type` HTTP header.

- **Default:** `application/x-www-form-urlencoded`
- **For files:** `multipart/form-data`

**File Upload Example:**

```html
<form
  method="post"
  action="https://example.com/upload"
  enctype="multipart/form-data">
  <div>
    <label for="file">Choose a file</label>
    <input type="file" id="file" name="myFile" />
  </div>
  <div>
    <button>Send the file</button>
  </div>
</form>
```

**Requirements:**

- Set `method` to `POST` (file content cannot go in a URL).
- Set `enctype` to `multipart/form-data`.
- Include one or more `<input type="file">` controls.

**Note:** Servers can limit file and request sizes to prevent abuse.

### Security Considerations

#### Be Paranoid: Never Trust Your Users

All incoming data must be checked and sanitized:

1. **Escape Dangerous Characters** -- Watch for executable code patterns (JavaScript, SQL commands). Use server-side escaping functions. Different contexts require different escaping.
2. **Limit Incoming Data** -- Only accept what is necessary. Set maximum sizes for requests.
3. **Sandbox Uploaded Files** -- Store on a different server. Serve through a different subdomain or domain. Never execute uploaded files directly.

**Key Rule:** Never trust client-side validation alone -- always validate on the server. Client-side validation can be bypassed; the server has no way to verify what truly happened on the client.

### Quick Reference: GET vs POST

| Aspect             | GET                                  | POST                                   |
|--------------------|--------------------------------------|----------------------------------------|
| Data location      | Visible in URL as query parameters   | Hidden in request body                 |
| Data size          | Limited by URL length                | No inherent limit                      |
| Security           | Not suitable for sensitive data      | Better for sensitive/large data        |
| Caching            | Can be cached                        | Not cached                             |
| Use case           | Reading/retrieving data              | Modifying server state, sending files  |

### Important Notes

- **Form data format:** Name/value pairs joined with ampersands (`name=value&name2=value2`).
- **URL encoding:** Special characters are URL-encoded in query parameters.
- **Default form target:** Without `action`, data submits to the current page.
- **Secure protocol:** Always use HTTPS for sensitive data.

---

## Section 2: Form Validation

**Source:** https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Form_validation

### Overview

Client-side form validation helps ensure data entered matches requirements set by form controls. While important for **user experience**, it must **always** be paired with server-side validation since client-side validation is easily bypassed by malicious users.

### Built-In HTML Validation Attributes

#### `required`

Specifies that a form field must be filled before submission.

```html
<input id="choose" name="i-like" required />
```

- Input matches `:required` and `:invalid` pseudo-classes when empty.
- For radio buttons, one button in a same-named group must be checked.

#### `minlength` and `maxlength`

Constrains character length for text fields and textareas.

```html
<input type="text" minlength="6" maxlength="6" />
<textarea maxlength="140"></textarea>
```

#### `min`, `max`, and `step`

Constrains numeric values and their increments.

```html
<input type="number" min="1" max="10" step="1" />
<input type="date" min="2024-01-01" max="2024-12-31" />
```

#### `type`

Validates against specific formats (email, URL, number, date, etc.).

```html
<input type="email" />
<input type="url" />
<input type="number" />
```

#### `pattern`

Validates against a regular expression.

```html
<input
  type="text"
  pattern="[Bb]anana|[Cc]herry"
  required
/>
```

**Pattern Examples:**

| Pattern  | Matches                                  |
|----------|------------------------------------------|
| `a`      | Single character 'a'                     |
| `abc`    | 'a' followed by 'b' followed by 'c'     |
| `ab?c`   | 'ac' or 'abc'                            |
| `ab*c`   | 'ac', 'abc', 'abbbbbc', etc.             |
| `a\|b`   | 'a' or 'b'                               |

### CSS Pseudo-Classes for Validation States

#### Valid States

```css
input:valid {
  border: 2px solid black;
}

input:user-valid {
  /* Matches after user interaction */
}

input:in-range {
  /* For inputs with min/max */
}
```

#### Invalid States

```css
input:invalid {
  border: 2px dashed red;
}

input:user-invalid {
  /* Matches after user interaction */
}

input:out-of-range {
  /* For inputs with min/max */
}

input:required {
  /* Matches required fields */
}
```

### Complete Built-In Validation Example

```html
<form>
  <p>Please complete all required (*) fields.</p>

  <fieldset>
    <legend>Do you have a driver's license? *</legend>
    <input type="radio" required name="driver" id="r1" value="yes" />
    <label for="r1">Yes</label>
    <input type="radio" required name="driver" id="r2" value="no" />
    <label for="r2">No</label>
  </fieldset>

  <p>
    <label for="age">How old are you?</label>
    <input type="number" min="12" max="120" step="1" id="age" name="age" />
  </p>

  <p>
    <label for="fruit">What's your favorite fruit? *</label>
    <input
      type="text"
      id="fruit"
      name="fruit"
      list="fruits"
      required
      pattern="[Bb]anana|[Cc]herry|[Aa]pple"
    />
    <datalist id="fruits">
      <option>Banana</option>
      <option>Cherry</option>
      <option>Apple</option>
    </datalist>
  </p>

  <p>
    <label for="email">Email address:</label>
    <input type="email" id="email" name="email" />
  </p>

  <button>Submit</button>
</form>
```

### Constraint Validation API

The Constraint Validation API provides methods and properties for custom validation logic.

#### Key Properties

**`validationMessage`** -- Returns localized validation error message.

**`validity`** -- Returns a `ValidityState` object with these properties:

| Property          | Description                                         |
|-------------------|-----------------------------------------------------|
| `valid`           | `true` if element meets all constraints             |
| `valueMissing`    | `true` if required but empty                        |
| `typeMismatch`    | `true` if value does not match type (e.g., email)   |
| `patternMismatch` | `true` if pattern does not match                    |
| `tooLong`         | `true` if exceeds `maxlength`                       |
| `tooShort`        | `true` if below `minlength`                         |
| `rangeOverflow`   | `true` if exceeds `max`                             |
| `rangeUnderflow`  | `true` if below `min`                               |
| `customError`     | `true` if custom error set via `setCustomValidity()` |

**`willValidate`** -- Boolean, `true` if element will be validated on form submission.

#### Key Methods

```javascript
// Check validity without submitting
element.checkValidity()    // Returns boolean

// Report validity to user
element.reportValidity()   // Shows browser's error message

// Set custom error message
element.setCustomValidity("Custom error text")

// Clear custom error
element.setCustomValidity("")
```

### JavaScript Custom Validation Examples

#### Basic Custom Error Message

```javascript
const email = document.getElementById("mail");

email.addEventListener("input", (event) => {
  if (email.validity.typeMismatch) {
    email.setCustomValidity("I am expecting an email address!");
  } else {
    email.setCustomValidity("");
  }
});
```

#### Extending Built-In Validation

```javascript
const email = document.getElementById("mail");

email.addEventListener("input", (event) => {
  // Reset custom validity
  email.setCustomValidity("");

  // Check built-in constraints first
  if (!email.validity.valid) {
    return;
  }

  // Add custom constraint
  if (!email.value.endsWith("@example.com")) {
    email.setCustomValidity("Please enter an email with @example.com domain");
  }
});
```

#### Complex Form Validation with Custom Messages

```javascript
const form = document.querySelector("form");
const email = document.getElementById("mail");
const emailError = document.querySelector("#mail + span.error");

email.addEventListener("input", (event) => {
  if (email.validity.valid) {
    emailError.textContent = "";
    emailError.className = "error";
  } else {
    showError();
  }
});

form.addEventListener("submit", (event) => {
  if (!email.validity.valid) {
    showError();
    event.preventDefault();
  }
});

function showError() {
  if (email.validity.valueMissing) {
    emailError.textContent = "You need to enter an email address.";
  } else if (email.validity.typeMismatch) {
    emailError.textContent = "Entered value needs to be an email address.";
  } else if (email.validity.tooShort) {
    emailError.textContent =
      `Email should be at least ${email.minLength} characters; you entered ${email.value.length}.`;
  }
  emailError.className = "error active";
}
```

#### Disabling Built-In Validation with `novalidate`

Use `novalidate` on the form to disable the browser's automatic validation while retaining CSS pseudo-classes:

```html
<form novalidate>
  <input type="email" id="mail" required minlength="8" />
  <span class="error" aria-live="polite"></span>
</form>
```

### Manual Validation Without the Constraint API

For custom form controls or complete control over validation:

```javascript
const form = document.querySelector("form");
const email = document.getElementById("mail");
const error = document.getElementById("error");

const emailRegExp = /^[\w.!#$%&'*+/=?^`{|}~-]+@[a-z\d-]+(?:\.[a-z\d-]+)*$/i;

const isValidEmail = () => {
  return email.value.length !== 0 && emailRegExp.test(email.value);
};

const setEmailClass = (isValid) => {
  email.className = isValid ? "valid" : "invalid";
};

const updateError = (isValid) => {
  if (isValid) {
    error.textContent = "";
    error.removeAttribute("class");
  } else {
    error.textContent = "Please enter a valid email address.";
    error.setAttribute("class", "active");
  }
};

email.addEventListener("input", () => {
  const validity = isValidEmail();
  setEmailClass(validity);
  updateError(validity);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const validity = isValidEmail();
  setEmailClass(validity);
  updateError(validity);
});
```

### Styling Error Messages

```css
/* Invalid field styling */
input:invalid {
  border-color: #990000;
  background-color: #ffdddd;
}

input:focus:invalid {
  outline: none;
}

/* Error message container */
.error {
  width: 100%;
  padding: 0;
  font-size: 80%;
  color: white;
  background-color: #990000;
  border-radius: 0 0 5px 5px;
}

.error.active {
  padding: 0.3em;
}
```

### Accessibility Best Practices

1. **Mark required fields** with an asterisk in the label:
   ```html
   <label for="name">Name *</label>
   ```
2. **Use `aria-live`** for dynamic error messages:
   ```html
   <span class="error" aria-live="polite"></span>
   ```
3. **Provide clear, helpful messages** that explain what is expected and how to fix errors.
4. **Avoid relying on color alone** to indicate errors.

### Validation Summary

| Approach               | Pros                                        | Cons                                   |
|------------------------|---------------------------------------------|----------------------------------------|
| HTML built-in          | No JavaScript needed, fast                  | Limited customization                  |
| Constraint Validation API | Modern, integrates with built-in features | Requires JavaScript                    |
| Fully manual (JS)      | Complete control over UI and logic          | More code, must handle everything      |

- **HTML validation** is faster and does not require JavaScript.
- **JavaScript validation** provides more customization and control.
- **Always validate server-side** -- client-side validation is not secure.
- **Use the Constraint Validation API** for modern, built-in functionality.
- **Provide clear error messages** and guidance to users.
- **Style validation states** with `:valid` and `:invalid` pseudo-classes.
