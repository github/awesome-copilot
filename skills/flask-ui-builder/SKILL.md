---
name: flask-ui-builder
description: >-
  Build production-ready Flask web applications with clean UI. Use this skill
  whenever the user wants to create a Flask app, web dashboard, admin panel,
  CRUD interface, form-based tool, REST API with a frontend, or any
  Python-backed web UI. Trigger even for loosely phrased requests like
  "make a web app in Python", "build a dashboard with Flask", "create a login
  page using Flask", "I need a simple web UI for my Python script", or
  "turn this script into a web app". Always use this skill when Flask, Jinja2,
  or Python web UI is mentioned — even partially.
author: 'Utkarsh Patrikar'
author_url: 'https://github.com/utkarsh232005'
---

# Flask UI Builder

Build complete, runnable Flask applications with polished frontends. The output is always a real working project — not pseudocode.

---

## 1. When to Use This Skill

**Trigger phrases (load this skill when you see these)**

- "make a web app in Python", "Python web UI", "Flask app"
- "build a dashboard", "admin panel", "CRUD app"
- "create a login page", "user registration form"
- "REST API with frontend", "JSON API + HTML"
- "turn this script into a web app", "add a UI to my Python code"
- "file upload page", "CSV viewer", "database browser"
- Any request mentioning Flask, Jinja2, HTMX + Python, or SQLAlchemy with a web frontend

**What this skill covers**

| Area | Details |
|---|---|
| Routing & Views | Flask routes, Blueprints, app factories |
| Templates | Jinja2 layouts, partials, template inheritance |
| Data Layer | SQLAlchemy ORM, SQLite, migrations |
| Forms | Flask-WTF, CSRF protection, validation |
| Auth | Session-based login, Flask-Login, password hashing |
| Frontend | Tailwind CSS (CDN), HTMX, vanilla JS fetch |
| API | JSON endpoints, CORS, error handling |
| Deployment | Gunicorn, Docker, environment configuration |

---

## 2. Understand the Request

Before writing code, clarify:

1. **Purpose**: What does the app do? (CRUD, dashboard, form processor, API viewer, auth-gated tool, etc.)
2. **Data**: Where does data come from? (SQLite, in-memory, CSV, external API, user input?)
3. **Auth**: Does it need login/session handling?
4. **Scope**: Single-page or multi-route? How many views?
5. **Deployment**: Local only, or production-ready with Docker/Gunicorn?

If the request is vague, make reasonable assumptions and state them upfront. Do not ask excessive questions — pick sensible defaults and build.

---

## 3. Choose Architecture

| Scope | Pattern |
|---|---|
| Single utility / form | One `app.py` + one template |
| Multi-page dashboard | Blueprint-based with `templates/` layout |
| CRUD + DB | SQLAlchemy + Flask-WTF |
| API + SPA-lite | Flask API routes + Fetch/HTMX on frontend |
| Production service | App factory + Blueprints + Gunicorn + Docker |

Default stack (unless user specifies otherwise):
- **Flask 3.x** for routing and server
- **Jinja2** for templating (built-in)
- **SQLite + SQLAlchemy** for persistence if data storage needed
- **Tailwind CSS (CDN)** or plain CSS for styling
- **HTMX** for dynamic interactions without a full SPA

---

## 4. Project Layout

```
my_app/
├── app.py              # App factory or entry point
├── config.py           # Environment-based configuration
├── models.py           # SQLAlchemy models (if DB needed)
├── routes/
│   ├── __init__.py
│   ├── main.py         # Blueprint routes
│   ├── auth.py         # Auth routes (if needed)
│   └── api.py          # JSON API routes (if needed)
├── templates/
│   ├── base.html       # Base layout with nav
│   ├── index.html
│   └── partials/       # HTMX partial templates
├── static/
│   └── style.css       # Custom CSS (keep minimal)
├── tests/
│   ├── conftest.py
│   └── test_routes.py
├── requirements.txt
├── Dockerfile          # For production
└── .env                # Environment variables (gitignored)
```

For simple single-file apps, everything goes in `app.py` with inline `render_template_string`.

---

## 5. Build It

### Configuration (config.py)

```python
import os

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-change-me")
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///app.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB upload limit

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False
```

### app.py skeleton

```python
import os
from flask import Flask, render_template, request, redirect, url_for, flash
from config import DevelopmentConfig, ProductionConfig

def create_app():
    app = Flask(__name__)
    env = os.environ.get("FLASK_CONFIG", "development")
    app.config.from_object(
        ProductionConfig if env == "production" else DevelopmentConfig
    )

    @app.route("/")
    def index():
        return render_template("index.html")

    return app

if __name__ == "__main__":
    create_app().run()
```

### Base template (base.html)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{% block title %}App{% endblock %}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/htmx.org@1.9.10"></script>
</head>
<body class="bg-gray-50 text-gray-900 min-h-screen">
  <nav class="bg-white shadow px-6 py-4 flex items-center gap-4">
    <a href="/" class="font-bold text-lg">MyApp</a>
    {% block nav %}{% endblock %}
  </nav>
  <main class="max-w-4xl mx-auto px-4 py-8">
    {% with messages = get_flashed_messages(with_categories=true) %}
      {% for cat, msg in messages %}
        <div class="mb-4 p-3 rounded {% if cat == 'error' %}bg-red-100 text-red-700{% else %}bg-green-100 text-green-700{% endif %}">
          {{ msg }}
        </div>
      {% endfor %}
    {% endwith %}
    {% block content %}{% endblock %}
  </main>
</body>
</html>
```

---

## 6. UI Patterns (Copy-Paste Ready)

### Form with CSRF protection

```html
<form method="POST" class="space-y-4 max-w-md">
  <input type="hidden" name="csrf_token" value="{{ csrf_token() }}">
  <div>
    <label class="block text-sm font-medium mb-1">Name</label>
    <input name="name" type="text" required
      class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
  </div>
  <button type="submit"
    class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
    Submit
  </button>
</form>
```

### Flash message route pattern

```python
@app.route("/submit", methods=["POST"])
def submit():
    name = request.form.get("name", "").strip()
    if not name:
        flash("Name is required.", "error")
        return redirect(url_for("index"))
    # process...
    flash("Saved successfully!", "success")
    return redirect(url_for("index"))
```

### SQLAlchemy CRUD pattern

```python
# Create
new = Item(name=name)
db.session.add(new)
db.session.commit()

# Read
items = Item.query.order_by(Item.created_at.desc()).all()
item = Item.query.get_or_404(item_id)

# Update
item.name = new_name
db.session.commit()

# Delete
db.session.delete(item)
db.session.commit()
```

> For more patterns (file upload, pagination, search/filter, data tables), see `references/patterns.md`.

---

## 7. Security Hardening

Always apply these in production-facing apps:

```python
# CSRF protection (built into Flask-WTF)
from flask_wtf.csrf import CSRFProtect
csrf = CSRFProtect(app)

# Secure session cookies
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=True,  # Set True behind HTTPS
)

# Security headers
@app.after_request
def set_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response
```

- **Never** store secrets in code — use `os.environ.get("SECRET_KEY")`
- **Always** use `secure_filename()` for file uploads
- **Always** validate and sanitize user input server-side
- **Always** include CSRF tokens in POST forms (`{{ csrf_token() }}`)
- **Escape** all user content in Jinja2 (automatic with `{{ }}`, but watch `|safe`)

---

## 8. Deployment

### requirements.txt

```
flask>=3.0
flask-sqlalchemy>=3.1   # if using DB
flask-wtf>=1.2          # if using WTF forms
gunicorn>=22.0          # production WSGI server
python-dotenv>=1.0      # .env file support
```

### .env file

```bash
SECRET_KEY=your-random-secret-key-here
DATABASE_URL=sqlite:///app.db
FLASK_CONFIG=production
FLASK_DEBUG=0
```

> For Gunicorn commands, Dockerfile, and full deployment details, see `references/patterns.md`.

---

## 9. Output Rules

1. **Always output runnable code** — never pseudocode.
2. **Provide every file** needed to run the app from scratch.
3. **State how to run**: include `pip install -r requirements.txt` and `python app.py`.
4. **One command to start**: no complex setup unless unavoidable.
5. **Default to SQLite** for persistence — zero configuration.
6. **Comment non-obvious logic** but don't over-comment trivial lines.
7. **Keep CSS minimal** — use Tailwind CDN unless user wants custom styling.
8. **Include CSRF protection** on all forms by default.
9. **Provide tests** for any app with more than 2 routes.

---

## 10. Anti-Patterns to Avoid

- ❌ Using `os.system` or subprocess inside routes
- ❌ Storing secrets in code (use `os.environ.get(...)`)
- ❌ Running with `debug=True` in production
- ❌ Blocking routes with long-running sync tasks
- ❌ Deeply nested Jinja logic — move complexity to Python
- ❌ Giant single-file apps past ~150 lines (use blueprints)
- ❌ Using `|safe` filter without sanitizing input first
- ❌ Missing CSRF tokens on POST forms
- ❌ Raw SQL queries when SQLAlchemy ORM is available
- ❌ Serving static files with Flask in production (use Nginx or a CDN)

---

## 11. Troubleshooting

| Problem | Likely Cause | Fix |
|---|---|---|
| `TemplateNotFound` | Wrong template path or missing `template_folder` | Check `templates/` structure and Blueprint config |
| `405 Method Not Allowed` | Route missing `methods=["POST"]` | Add the HTTP method to `@app.route(...)` |
| CSRF token missing/invalid | Form lacks `{{ csrf_token() }}` | Add CSRF token or init `CSRFProtect(app)` |
| `OperationalError` | Database not created | Call `db.create_all()` inside app context |
| Static files not loading | Wrong path | Use `{{ url_for('static', filename='style.css') }}` |
| Flash messages not showing | Missing `get_flashed_messages()` | Add flash rendering block to `base.html` |
| HTMX returns full page | Route returns full template | Return only the HTML fragment for HTMX targets |
| File upload fails | Missing `enctype="multipart/form-data"` | Add the enctype attribute to the form |
| Blueprint import errors | Circular imports | Use app factory pattern with `create_app()` |

---

## 12. Copilot Prompting Tips

- Be specific: "Flask CRUD app for managing books with SQLite" beats "make a web app"
- Mention UI style upfront: "use Tailwind CSS" or "plain Bootstrap"
- For HTMX, specify what updates dynamically: "delete button should remove the row without reload"
- Include the data model: "Item has name (string), status (enum: active/archived), created_at (datetime)"
- Paste the exact error message when asking `/fix`
- Use `@workspace` scope in Copilot Chat so it reads your project structure

---

## 13. Reference Files

| File | Contents |
|---|---|
| `references/auth.md` | Session-based login, password hashing, Flask-Login |
| `references/htmx.md` | HTMX + Flask patterns — load, submit, delete, polling |
| `references/api.md` | JSON API routes, CORS, fetch-based frontends |
| `references/blueprints.md` | Blueprint structure, app factory, model separation |
| `references/patterns.md` | File upload, pagination, search, data tables, testing, deployment |

---

## 14. Related Skills

| Skill | Relationship |
|---|---|
| **premium-frontend-ui** | Creative philosophy and premium aesthetics for any frontend |
| **gsap-framer-scroll-animation** | Advanced scroll animations for marketing or portfolio pages |

---

## Author

**Utkarsh Patrikar** - [GitHub](https://github.com/utkarsh232005)
