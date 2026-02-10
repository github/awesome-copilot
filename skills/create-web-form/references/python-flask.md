# Python Flask Forms Reference

> Source: <https://testdriven.io/courses/learn-flask/forms/>

This reference covers how to work with forms in Flask, including handling GET and POST requests, using WTForms for form creation and validation, implementing CSRF protection, and managing file uploads.

---

## Overview

Flask provides tools for handling web forms through:

- The `request` object for accessing submitted form data
- **Flask-WTF** and **WTForms** for declarative form creation, validation, and CSRF protection
- Jinja2 templates for rendering form HTML
- Flash messages for user feedback

---

## Basic Form Handling in Flask

### Handling GET and POST Requests

```python
from flask import Flask, render_template, request, redirect, url_for, flash

app = Flask(__name__)
app.secret_key = 'your-secret-key'

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        if username == 'admin' and password == 'secret':
            flash('Login successful!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid credentials.', 'error')

    return render_template('login.html')
```

### The `request.form` Object

The `request.form` is an `ImmutableMultiDict` that contains parsed form data from POST and PUT requests.

| Method | Description |
|--------|-------------|
| `request.form['key']` | Access a value; raises `400 Bad Request` if missing |
| `request.form.get('key')` | Access a value; returns `None` if missing |
| `request.form.get('key', 'default')` | Access a value with a fallback default |
| `request.form.getlist('key')` | Returns a list of all values for a key (for multi-select fields) |

### The `request.method` Attribute

Used to distinguish between GET (displaying the form) and POST (processing the submission):

```python
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        # Process the form submission
        pass
    # GET: Display the form
    return render_template('register.html')
```

---

## Flask-WTF and WTForms

### Installation

```bash
pip install Flask-WTF
```

Flask-WTF is a Flask extension that integrates WTForms. It provides:

- CSRF protection out of the box
- Integration with Flask's `request` object
- Jinja2 template helpers
- File upload support

### Configuration

```python
from flask import Flask

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'  # Required for CSRF
app.config['WTF_CSRF_ENABLED'] = True          # Enabled by default
```

---

## Defining Forms with WTForms

### Basic Form Class

```python
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, TextAreaField, SubmitField
from wtforms.validators import DataRequired, Email, Length, EqualTo

class RegistrationForm(FlaskForm):
    username = StringField('Username', validators=[
        DataRequired(),
        Length(min=3, max=25)
    ])
    email = StringField('Email', validators=[
        DataRequired(),
        Email()
    ])
    password = PasswordField('Password', validators=[
        DataRequired(),
        Length(min=6)
    ])
    confirm_password = PasswordField('Confirm Password', validators=[
        DataRequired(),
        EqualTo('password', message='Passwords must match.')
    ])
    submit = SubmitField('Register')
```

### Common Field Types

| Field Type | Description |
|-----------|-------------|
| `StringField` | Single-line text input |
| `PasswordField` | Password input (masked characters) |
| `TextAreaField` | Multi-line text input |
| `IntegerField` | Integer input with built-in type coercion |
| `FloatField` | Float input with built-in type coercion |
| `BooleanField` | Checkbox (True/False) |
| `SelectField` | Dropdown select menu |
| `SelectMultipleField` | Multiple-select dropdown |
| `RadioField` | Radio button group |
| `FileField` | File upload input |
| `HiddenField` | Hidden input field |
| `SubmitField` | Submit button |
| `DateField` | Date picker input |

### Common Validators

| Validator | Description |
|-----------|-------------|
| `DataRequired()` | Field must not be empty |
| `Email()` | Must be a valid email format |
| `Length(min, max)` | String length must fall within range |
| `EqualTo('field')` | Must match another field's value |
| `NumberRange(min, max)` | Numeric value must fall within range |
| `Regexp(regex)` | Must match the provided regular expression |
| `URL()` | Must be a valid URL |
| `Optional()` | Field is allowed to be empty |
| `InputRequired()` | Raw input data must be present |
| `AnyOf(values)` | Must be one of the provided values |
| `NoneOf(values)` | Must not be any of the provided values |

---

## Using Forms in Routes

### Route with WTForms

```python
@app.route('/register', methods=['GET', 'POST'])
def register():
    form = RegistrationForm()

    if form.validate_on_submit():
        # form.validate_on_submit() checks:
        # 1. Is the request method POST?
        # 2. Does the form pass all validation?
        # 3. Is the CSRF token valid?

        username = form.username.data
        email = form.email.data
        password = form.password.data

        # Process the data (e.g., save to database)
        flash(f'Account created for {username}!', 'success')
        return redirect(url_for('login'))

    return render_template('register.html', form=form)
```

### `validate_on_submit()` Method

This method combines two checks:

1. `request.method == 'POST'` -- ensures the form was actually submitted
2. `form.validate()` -- runs all validators on the form fields and checks the CSRF token

Returns `True` only if both conditions are met.

---

## Rendering Forms in Templates

### Basic Template Rendering

```html
<form method="POST" action="{{ url_for('register') }}">
    {{ form.hidden_tag() }}

    <div>
        {{ form.username.label }}
        {{ form.username(class="form-control", placeholder="Enter username") }}
        {% for error in form.username.errors %}
            <span class="error">{{ error }}</span>
        {% endfor %}
    </div>

    <div>
        {{ form.email.label }}
        {{ form.email(class="form-control", placeholder="Enter email") }}
        {% for error in form.email.errors %}
            <span class="error">{{ error }}</span>
        {% endfor %}
    </div>

    <div>
        {{ form.password.label }}
        {{ form.password(class="form-control") }}
        {% for error in form.password.errors %}
            <span class="error">{{ error }}</span>
        {% endfor %}
    </div>

    <div>
        {{ form.confirm_password.label }}
        {{ form.confirm_password(class="form-control") }}
        {% for error in form.confirm_password.errors %}
            <span class="error">{{ error }}</span>
        {% endfor %}
    </div>

    {{ form.submit(class="btn btn-primary") }}
</form>
```

### Key Template Elements

| Element | Purpose |
|---------|---------|
| `{{ form.hidden_tag() }}` | Renders the hidden CSRF token field |
| `{{ form.field.label }}` | Renders the `<label>` element for the field |
| `{{ form.field() }}` | Renders the `<input>` element for the field |
| `{{ form.field(class="...") }}` | Renders the input with additional HTML attributes |
| `{{ form.field.errors }}` | List of validation error messages for the field |
| `{{ form.field.data }}` | The current value of the field |

---

## CSRF Protection

### How CSRF Protection Works

Flask-WTF automatically includes CSRF protection:

1. A unique token is generated per session and embedded as a hidden form field.
2. When the form is submitted, Flask-WTF verifies the token matches the session token.
3. If the token is missing or invalid, the request is rejected with a `400 Bad Request`.

### Including the CSRF Token

In your template, always include one of these:

```html
<!-- Option 1: Hidden tag (includes CSRF + all hidden fields) -->
{{ form.hidden_tag() }}

<!-- Option 2: CSRF token only -->
{{ form.csrf_token }}
```

### CSRF for AJAX Requests

For JavaScript-based form submissions:

```html
<meta name="csrf-token" content="{{ csrf_token() }}">
```

```javascript
fetch('/api/submit', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': document.querySelector('meta[name="csrf-token"]').content
    },
    body: JSON.stringify(data)
});
```

---

## Custom Validators

### Inline Custom Validator

Define a method on the form class with the naming pattern `validate_<fieldname>`:

```python
from wtforms import ValidationError

class RegistrationForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    email = StringField('Email', validators=[DataRequired(), Email()])

    def validate_username(self, field):
        if field.data.lower() in ['admin', 'root', 'superuser']:
            raise ValidationError('That username is reserved.')

    def validate_email(self, field):
        # Check if email already exists in database
        if User.query.filter_by(email=field.data).first():
            raise ValidationError('That email is already registered.')
```

### Reusable Custom Validator

```python
from wtforms import ValidationError

def validate_no_special_chars(form, field):
    if not field.data.isalnum():
        raise ValidationError('Field must contain only letters and numbers.')

class MyForm(FlaskForm):
    username = StringField('Username', validators=[
        DataRequired(),
        validate_no_special_chars
    ])
```

---

## File Uploads

### Form with File Upload

```python
from flask_wtf.file import FileField, FileAllowed, FileRequired

class UploadForm(FlaskForm):
    photo = FileField('Profile Photo', validators=[
        FileRequired(),
        FileAllowed(['jpg', 'png', 'gif'], 'Images only!')
    ])
    submit = SubmitField('Upload')
```

### Handling File Uploads in Routes

```python
import os
from werkzeug.utils import secure_filename

UPLOAD_FOLDER = 'static/uploads'

@app.route('/upload', methods=['GET', 'POST'])
def upload():
    form = UploadForm()

    if form.validate_on_submit():
        file = form.photo.data
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        flash('File uploaded successfully!', 'success')
        return redirect(url_for('upload'))

    return render_template('upload.html', form=form)
```

### Multipart Form Encoding

File upload forms must use `enctype="multipart/form-data"`:

```html
<form method="POST" enctype="multipart/form-data">
    {{ form.hidden_tag() }}
    {{ form.photo.label }}
    {{ form.photo() }}
    {{ form.submit() }}
</form>
```

---

## Flash Messages

### Setting Flash Messages

```python
from flask import flash

flash('Operation successful!', 'success')
flash('An error occurred.', 'error')
flash('Please check your input.', 'warning')
```

### Displaying Flash Messages in Templates

```html
{% with messages = get_flashed_messages(with_categories=true) %}
    {% if messages %}
        {% for category, message in messages %}
            <div class="alert alert-{{ category }}">
                {{ message }}
            </div>
        {% endfor %}
    {% endif %}
{% endwith %}
```

---

## Key Takeaways

1. **Use Flask-WTF** for form handling -- it provides CSRF protection, validation, and clean form definitions.
2. **`validate_on_submit()`** is the primary method for checking both submission and validation in one call.
3. **Always include `{{ form.hidden_tag() }}`** in templates to enable CSRF protection.
4. **Use WTForms validators** for clean, declarative server-side validation.
5. **Custom validators** can be defined inline on the form class or as reusable functions.
6. **Flash messages** provide user feedback for form actions.
7. **File uploads** require `enctype="multipart/form-data"` and should use `secure_filename()` for safety.
8. **Set a `SECRET_KEY`** in your Flask config -- it is required for CSRF tokens and session management.
