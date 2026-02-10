# Python Flask App Reference

> Source: <https://realpython.com/python-web-applications/>

This reference covers building Python web applications, including how the web works, choosing a framework, building and deploying a Flask application, and understanding key web development concepts.

---

## Overview

Python offers several approaches to web development:

- **Web frameworks** (Flask, Django, FastAPI) that handle routing, templates, and data
- **Hosting platforms** (Google App Engine, PythonAnywhere, Heroku, etc.) for deployment
- **WSGI** (Web Server Gateway Interface) as the standard interface between web servers and Python applications

---

## How the Web Works

### The HTTP Request-Response Cycle

1. A client (browser) sends an **HTTP request** to a server
2. The server processes the request and returns an **HTTP response**
3. The browser renders the response content

### HTTP Methods

| Method | Purpose |
|--------|---------|
| `GET` | Retrieve data from the server |
| `POST` | Submit data to the server |
| `PUT` | Update existing data on the server |
| `DELETE` | Remove data from the server |

### URL Structure

```
https://example.com:443/path/to/resource?key=value#section
  |         |        |        |              |        |
scheme     host     port     path          query   fragment
```

---

## Choosing a Python Web Framework

### Flask

- **Micro-framework** -- minimal core with extensions for added functionality
- Best for small to medium applications, APIs, and learning
- No database abstraction layer, form validation, or other components built in
- Extensions available for everything (SQLAlchemy, WTForms, Login, etc.)

### Django

- **Full-stack framework** -- batteries included
- Best for large applications with built-in ORM, admin panel, authentication
- Opinionated project structure

### FastAPI

- **Modern, fast, async framework** -- built on Starlette and Pydantic
- Best for building APIs with automatic documentation
- Built-in data validation and serialization

---

## Building a Flask Application

### Installation

```bash
python -m pip install flask
```

### Minimal Application

```python
from flask import Flask

app = Flask(__name__)

@app.route('/')
def home():
    return 'Hello, World!'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
```

### Running the Application

```bash
# Method 1: Direct execution
python app.py

# Method 2: Using Flask CLI
export FLASK_APP=app.py
export FLASK_ENV=development
flask run
```

---

## Routing

### Basic Routes

```python
@app.route('/')
def home():
    return 'Home Page'

@app.route('/about')
def about():
    return 'About Page'

@app.route('/contact')
def contact():
    return 'Contact Page'
```

### Dynamic Routes with URL Parameters

```python
@app.route('/user/<username>')
def show_user(username):
    return f'User: {username}'

@app.route('/post/<int:post_id>')
def show_post(post_id):
    return f'Post ID: {post_id}'
```

### URL Converters

| Converter | Description |
|-----------|-------------|
| `string` | Accepts any text without a slash (default) |
| `int` | Accepts positive integers |
| `float` | Accepts positive floating-point values |
| `path` | Like `string` but also accepts slashes |
| `uuid` | Accepts UUID strings |

### Specifying HTTP Methods

```python
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        return do_login()
    return show_login_form()
```

---

## Templates with Jinja2

### Basic Template Rendering

```python
from flask import render_template

@app.route('/hello/<name>')
def hello(name):
    return render_template('hello.html', name=name)
```

### Template Inheritance

**Base template (`templates/base.html`):**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{% block title %}My App{% endblock %}</title>
    <link rel="stylesheet" href="{{ url_for('static', filename='style.css') }}">
</head>
<body>
    <nav>
        <a href="{{ url_for('home') }}">Home</a>
        <a href="{{ url_for('about') }}">About</a>
    </nav>

    <main>
        {% block content %}{% endblock %}
    </main>

    <footer>
        <p>My Web App</p>
    </footer>
</body>
</html>
```

**Child template (`templates/home.html`):**

```html
{% extends "base.html" %}

{% block title %}Home{% endblock %}

{% block content %}
    <h1>Welcome to My App</h1>
    <p>This is the home page.</p>
{% endblock %}
```

### Jinja2 Template Syntax

| Syntax | Purpose |
|--------|---------|
| `{{ variable }}` | Output the value of a variable |
| `{% statement %}` | Execute a control flow statement |
| `{# comment #}` | Template comment (not rendered) |
| `{{ url_for('func') }}` | Generate a URL for a view function |
| `{{ url_for('static', filename='style.css') }}` | Generate a URL for a static file |

### Control Flow in Templates

```html
{% if user %}
    <h1>Hello, {{ user.name }}!</h1>
{% else %}
    <h1>Hello, stranger!</h1>
{% endif %}

<ul>
{% for item in items %}
    <li>{{ item }}</li>
{% endfor %}
</ul>
```

---

## Project Structure

### Recommended Flask Project Layout

```
my_flask_app/
    app.py                  # Application entry point
    config.py               # Configuration settings
    requirements.txt        # Python dependencies
    static/                 # Static files (CSS, JS, images)
        style.css
        script.js
    templates/              # Jinja2 HTML templates
        base.html
        home.html
        about.html
    models.py               # Database models (if using a database)
    forms.py                # WTForms form classes
```

### Larger Application Structure (Blueprints)

```
my_flask_app/
    app/
        __init__.py         # Application factory
        models.py
        auth/
            __init__.py
            routes.py
            forms.py
            templates/
                login.html
                register.html
        main/
            __init__.py
            routes.py
            templates/
                home.html
                about.html
    config.py
    requirements.txt
    run.py
```

---

## Working with Static Files

Flask automatically serves files from the `static/` directory.

### Referencing Static Files in Templates

```html
<link rel="stylesheet" href="{{ url_for('static', filename='style.css') }}">
<script src="{{ url_for('static', filename='script.js') }}"></script>
<img src="{{ url_for('static', filename='images/logo.png') }}" alt="Logo">
```

---

## Database Integration

### Using Flask-SQLAlchemy

```bash
pip install Flask-SQLAlchemy
```

```python
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)

    def __repr__(self):
        return f'<User {self.username}>'
```

### Creating the Database

```python
with app.app_context():
    db.create_all()
```

---

## Deployment

### Deploying to PythonAnywhere

1. Create a free account at pythonanywhere.com
2. Upload your code via git or the file browser
3. Set up a virtual environment and install dependencies
4. Configure a WSGI file pointing to your Flask app
5. Reload the web application

### Deploying to Heroku

1. Create a `Procfile`:

```
web: gunicorn app:app
```

1. Create a `requirements.txt`:

```bash
pip freeze > requirements.txt
```

1. Deploy:

```bash
heroku create
git push heroku main
```

### Deploying to Google App Engine

Create an `app.yaml` configuration:

```yaml
runtime: python39
entrypoint: gunicorn -b :$PORT app:app

handlers:
  - url: /static
    static_dir: static
  - url: /.*
    script: auto
```

### WSGI Servers

For production, use a WSGI server instead of Flask's built-in development server:

| Server | Description |
|--------|-------------|
| **Gunicorn** | Production-grade WSGI server for Unix |
| **Waitress** | Production-grade WSGI server for Windows and Unix |
| **uWSGI** | Full-featured WSGI server with many deployment options |

```bash
# Using Gunicorn
pip install gunicorn
gunicorn app:app

# Using Waitress
pip install waitress
waitress-serve --port=5000 app:app
```

---

## Environment Configuration

### Using Environment Variables

```python
import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-fallback-key')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///site.db')
    DEBUG = os.environ.get('FLASK_DEBUG', False)
```

### Using python-dotenv

```bash
pip install python-dotenv
```

Create a `.env` file:

```
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///site.db
FLASK_DEBUG=1
```

Load in your application:

```python
from dotenv import load_dotenv
load_dotenv()
```

---

## Key Takeaways

1. **Flask is a micro-framework** -- it provides routing, templates, and request handling while leaving other choices (database, forms, authentication) to extensions.
2. **Use Jinja2 template inheritance** to keep HTML DRY with base templates and child blocks.
3. **Organize your project** with a clear structure: separate `templates/`, `static/`, and Python modules.
4. **Use Blueprints** for larger applications to group related routes and templates.
5. **Never use the Flask development server in production** -- use Gunicorn, Waitress, or uWSGI.
6. **Store configuration in environment variables** using `python-dotenv` or platform-specific config.
7. **Use `url_for()`** to generate URLs dynamically rather than hard-coding paths.
8. **Flask-SQLAlchemy** provides a convenient ORM layer for database operations.
9. **Multiple hosting platforms** support Flask apps: PythonAnywhere, Heroku, Google App Engine, and others.
