# Python as Web Framework Reference

> Source: <https://www.topcoder.com/thrive/articles/python-as-web-framework-the-flask-basics>

This reference covers using Python as a web framework through Flask, including setup, routing, templates, request and response handling, form processing, and building practical web applications.

---

## Overview

Flask is a lightweight **WSGI** (Web Server Gateway Interface) web framework written in Python. It is classified as a micro-framework because it does not require particular tools or libraries. Flask has no database abstraction layer, form validation, or any other components where pre-existing third-party libraries provide common functions.

### Why Flask?

- **Lightweight and modular** -- only includes what you need
- **Easy to learn** -- minimal boilerplate to get started
- **Flexible** -- no enforced project structure or dependencies
- **Extensible** -- rich ecosystem of extensions for added functionality
- **Well-documented** with an active community
- **Built-in development server** and debugger

---

## Installation and Setup

### Prerequisites

- Python 3.7+
- pip (Python package manager)

### Install Flask

```bash
pip install flask
```

### Verify Installation

```python
import flask
print(flask.__version__)
```

### Virtual Environment (Recommended)

```bash
# Create a virtual environment
python -m venv venv

# Activate (Linux/macOS)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install Flask in the virtual environment
pip install flask
```

---

## Creating a Basic Flask Application

### Hello World

```python
from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello_world():
    return '<h1>Hello, World!</h1>'

if __name__ == '__main__':
    app.run(debug=True)
```

### Understanding the Code

| Component | Purpose |
|-----------|---------|
| `Flask(__name__)` | Creates a Flask application instance; `__name__` helps Flask locate resources |
| `@app.route('/')` | A decorator that maps a URL path to a Python function |
| `app.run(debug=True)` | Starts the development server with auto-reload and debugger |

### Running the Application

```bash
python app.py
```

The application runs at `http://127.0.0.1:5000/` by default.

### Debug Mode

Debug mode provides:

- **Auto-reloader** -- restarts the server when code changes
- **Interactive debugger** -- shows a traceback in the browser with an interactive Python console
- **Detailed error pages** -- shows full error details instead of generic "500 Internal Server Error"

**Warning:** Never enable debug mode in production -- it allows arbitrary code execution.

---

## Routing

### Basic Routes

```python
@app.route('/')
def index():
    return 'Index Page'

@app.route('/hello')
def hello():
    return 'Hello, World!'

@app.route('/about')
def about():
    return 'About Page'
```

### Variable Rules (Dynamic URLs)

```python
@app.route('/user/<username>')
def show_user_profile(username):
    return f'User: {username}'

@app.route('/post/<int:post_id>')
def show_post(post_id):
    return f'Post {post_id}'

@app.route('/path/<path:subpath>')
def show_subpath(subpath):
    return f'Subpath: {subpath}'
```

### URL Converters

| Converter | Description | Example |
|-----------|-------------|---------|
| `string` | Accepts any text without slashes (default) | `/user/<username>` |
| `int` | Accepts positive integers | `/post/<int:post_id>` |
| `float` | Accepts positive floating-point values | `/price/<float:amount>` |
| `path` | Accepts text including slashes | `/file/<path:filepath>` |
| `uuid` | Accepts UUID strings | `/item/<uuid:item_id>` |

### URL Building with `url_for()`

```python
from flask import url_for

@app.route('/')
def index():
    return 'Index'

@app.route('/login')
def login():
    return 'Login'

@app.route('/user/<username>')
def profile(username):
    return f'{username} profile'

# Usage:
with app.test_request_context():
    print(url_for('index'))                  # /
    print(url_for('login'))                  # /login
    print(url_for('profile', username='John'))  # /user/John
```

### HTTP Methods

```python
from flask import request

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        return do_the_login()
    else:
        return show_the_login_form()
```

---

## Templates with Jinja2

Flask uses the Jinja2 template engine for rendering HTML.

### Rendering Templates

```python
from flask import render_template

@app.route('/hello/')
@app.route('/hello/<name>')
def hello(name=None):
    return render_template('hello.html', name=name)
```

### Template File (`templates/hello.html`)

```html
<!DOCTYPE html>
<html>
<head>
    <title>Hello</title>
</head>
<body>
    {% if name %}
        <h1>Hello, {{ name }}!</h1>
    {% else %}
        <h1>Hello, World!</h1>
    {% endif %}
</body>
</html>
```

### Template Syntax

| Syntax | Purpose | Example |
|--------|---------|---------|
| `{{ ... }}` | Expression output | `{{ user.name }}` |
| `{% ... %}` | Statement (control flow) | `{% if user %}...{% endif %}` |
| `{# ... #}` | Comment (not rendered) | `{# This is a comment #}` |

### Template Inheritance

**Base template (`base.html`):**

```html
<!DOCTYPE html>
<html>
<head>
    <title>{% block title %}Default Title{% endblock %}</title>
</head>
<body>
    <header>
        {% block header %}
            <h1>My Website</h1>
        {% endblock %}
    </header>

    <main>
        {% block content %}{% endblock %}
    </main>

    <footer>
        {% block footer %}
            <p>Footer content</p>
        {% endblock %}
    </footer>
</body>
</html>
```

**Child template (`home.html`):**

```html
{% extends "base.html" %}

{% block title %}Home Page{% endblock %}

{% block content %}
    <h2>Welcome!</h2>
    <p>This is the home page.</p>
{% endblock %}
```

### Loops and Conditionals

```html
<!-- For loop -->
<ul>
{% for item in navigation %}
    <li><a href="{{ item.href }}">{{ item.caption }}</a></li>
{% endfor %}
</ul>

<!-- Conditionals -->
{% if users %}
    <ul>
    {% for user in users %}
        <li>{{ user.username }}</li>
    {% endfor %}
    </ul>
{% else %}
    <p>No users found.</p>
{% endif %}
```

---

## Request and Response

### The Request Object

```python
from flask import request

@app.route('/login', methods=['POST', 'GET'])
def login():
    error = None
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        if valid_login(username, password):
            return log_the_user_in(username)
        else:
            error = 'Invalid username/password'

    return render_template('login.html', error=error)
```

### Request Object Attributes

| Attribute | Description |
|-----------|-------------|
| `request.method` | The HTTP method (GET, POST, etc.) |
| `request.form` | Form data from POST/PUT requests |
| `request.args` | URL query string parameters |
| `request.files` | Uploaded files |
| `request.cookies` | Request cookies |
| `request.headers` | Request headers |
| `request.json` | Parsed JSON data (if content type is JSON) |
| `request.data` | Raw request data as bytes |
| `request.url` | The full URL of the request |
| `request.path` | The URL path (without query string) |

### Query String Parameters

```python
# URL: /search?q=flask&page=2
@app.route('/search')
def search():
    query = request.args.get('q', '')
    page = request.args.get('page', 1, type=int)
    return f'Searching for: {query}, Page: {page}'
```

### Responses

```python
from flask import make_response, jsonify

# Simple string response
@app.route('/')
def index():
    return 'Hello World'

# Response with status code
@app.route('/not-found')
def not_found():
    return 'Page Not Found', 404

# Custom response object
@app.route('/custom')
def custom():
    response = make_response('Custom Response')
    response.headers['X-Custom-Header'] = 'custom-value'
    return response

# JSON response
@app.route('/api/data')
def api_data():
    return jsonify({'name': 'Flask', 'version': '2.0'})
```

---

## Form Handling

### HTML Form

```html
<form method="POST" action="/submit">
    <label for="name">Name:</label>
    <input type="text" id="name" name="name" required>

    <label for="email">Email:</label>
    <input type="email" id="email" name="email" required>

    <label for="message">Message:</label>
    <textarea id="message" name="message" required></textarea>

    <button type="submit">Submit</button>
</form>
```

### Processing Form Data

```python
@app.route('/submit', methods=['GET', 'POST'])
def submit():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        message = request.form.get('message')

        # Validate the data
        if not name or not email or not message:
            return render_template('form.html', error='All fields are required.')

        # Process the data (save to DB, send email, etc.)
        return render_template('success.html', name=name)

    return render_template('form.html')
```

---

## Static Files

Flask serves static files from the `static/` folder by default.

### Serving Static Files

```html
<link rel="stylesheet" href="{{ url_for('static', filename='css/style.css') }}">
<script src="{{ url_for('static', filename='js/main.js') }}"></script>
<img src="{{ url_for('static', filename='images/logo.png') }}" alt="Logo">
```

### Static File Organization

```
static/
    css/
        style.css
    js/
        main.js
    images/
        logo.png
```

---

## Sessions and Cookies

### Using Sessions

```python
from flask import session

app.secret_key = 'your-secret-key'

@app.route('/login', methods=['POST'])
def login():
    session['username'] = request.form['username']
    return redirect(url_for('index'))

@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('index'))

@app.route('/')
def index():
    if 'username' in session:
        return f'Logged in as {session["username"]}'
    return 'You are not logged in'
```

### Setting Cookies

```python
from flask import make_response

@app.route('/set-cookie')
def set_cookie():
    response = make_response('Cookie set!')
    response.set_cookie('username', 'flask_user', max_age=3600)
    return response

@app.route('/get-cookie')
def get_cookie():
    username = request.cookies.get('username')
    return f'Username: {username}'
```

---

## Error Handling

### Custom Error Pages

```python
@app.errorhandler(404)
def page_not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_server_error(error):
    return render_template('500.html'), 500
```

### Aborting Requests

```python
from flask import abort

@app.route('/user/<int:user_id>')
def get_user(user_id):
    user = find_user(user_id)
    if user is None:
        abort(404)
    return render_template('user.html', user=user)
```

---

## Redirects

```python
from flask import redirect, url_for

@app.route('/old-page')
def old_page():
    return redirect(url_for('new_page'))

@app.route('/new-page')
def new_page():
    return 'This is the new page.'

# Redirect with status code
@app.route('/moved')
def moved():
    return redirect(url_for('new_page'), code=301)
```

---

## Flask Extensions

Common Flask extensions for building web applications:

| Extension | Purpose |
|-----------|---------|
| **Flask-SQLAlchemy** | Database ORM integration |
| **Flask-WTF** | Form handling with WTForms and CSRF protection |
| **Flask-Login** | User session management and authentication |
| **Flask-Mail** | Email sending support |
| **Flask-Migrate** | Database migration management via Alembic |
| **Flask-RESTful** | Building REST APIs |
| **Flask-CORS** | Cross-Origin Resource Sharing support |
| **Flask-Caching** | Response caching |
| **Flask-Limiter** | Rate limiting for API endpoints |

---

## Key Takeaways

1. **Flask is a micro-framework** -- it provides the essentials (routing, templates, request handling) and lets you choose extensions for everything else.
2. **Routing maps URLs to functions** using the `@app.route()` decorator with support for dynamic URL parameters and multiple HTTP methods.
3. **Jinja2 templates** support inheritance, loops, conditionals, and variable output for building dynamic HTML pages.
4. **The `request` object** gives access to form data, query parameters, headers, cookies, and uploaded files.
5. **Use `url_for()`** to build URLs dynamically instead of hard-coding paths.
6. **Debug mode** is essential for development but must be disabled in production.
7. **Virtual environments** isolate project dependencies and should always be used.
8. **Static files** are served from the `static/` directory and referenced using `url_for('static', filename='...')`.
9. **Sessions** provide server-side user state management, requiring a `SECRET_KEY` configuration.
10. **Flask extensions** provide modular functionality for databases, forms, authentication, email, and more.
