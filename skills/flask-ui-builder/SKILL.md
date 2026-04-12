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
- "form-based tool", "data entry interface"
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

Pick the right pattern for the scope:

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

For anything beyond a single script, use this layout:

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
│   ├── partials/       # HTMX partial templates
│   └── ...
├── static/
│   ├── style.css       # Custom CSS (keep minimal)
│   └── js/             # Custom JS (if any)
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
from flask import Flask, render_template, request, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy  # only if DB needed

app = Flask(__name__)
app.secret_key = "change-me-in-production"
# app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///app.db"
# db = SQLAlchemy(app)

@app.route("/")
def index():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(debug=True)
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
  <!-- or link your static/style.css -->
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

### Form with validation

```html
<form method="POST" class="space-y-4 max-w-md">
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

### Data table

```html
<table class="w-full text-sm border-collapse">
  <thead>
    <tr class="bg-gray-100">
      <th class="text-left px-4 py-2 border-b">Name</th>
      <th class="text-left px-4 py-2 border-b">Status</th>
      <th class="px-4 py-2 border-b">Actions</th>
    </tr>
  </thead>
  <tbody>
    {% for item in items %}
    <tr class="hover:bg-gray-50">
      <td class="px-4 py-2 border-b">{{ item.name }}</td>
      <td class="px-4 py-2 border-b">{{ item.status }}</td>
      <td class="px-4 py-2 border-b text-center">
        <a href="{{ url_for('edit', id=item.id) }}" class="text-blue-600 hover:underline">Edit</a>
        <form method="POST" action="{{ url_for('delete', id=item.id) }}" class="inline">
          <button class="text-red-600 hover:underline ml-2">Delete</button>
        </form>
      </td>
    </tr>
    {% endfor %}
  </tbody>
</table>
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

### File upload pattern

```python
import os
from werkzeug.utils import secure_filename

UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "pdf", "csv"}

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route("/upload", methods=["POST"])
def upload():
    file = request.files.get("file")
    if not file or file.filename == "":
        flash("No file selected.", "error")
        return redirect(url_for("index"))
    if not allowed_file(file.filename):
        flash("File type not allowed.", "error")
        return redirect(url_for("index"))
    filename = secure_filename(file.filename)
    file.save(os.path.join(app.config["UPLOAD_FOLDER"], filename))
    flash(f"Uploaded {filename}!", "success")
    return redirect(url_for("index"))
```

```html
<form method="POST" action="/upload" enctype="multipart/form-data" class="space-y-4">
  <input type="file" name="file" accept=".png,.jpg,.jpeg,.gif,.pdf,.csv"
    class="block w-full text-sm border rounded p-2">
  <button type="submit"
    class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
    Upload
  </button>
</form>
```

### Pagination pattern

```python
@app.route("/items")
def list_items():
    page = request.args.get("page", 1, type=int)
    per_page = 20
    pagination = Item.query.order_by(Item.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return render_template("items.html", pagination=pagination)
```

```html
<!-- Pagination controls -->
<nav class="flex gap-2 mt-6">
  {% if pagination.has_prev %}
    <a href="?page={{ pagination.prev_num }}"
      class="px-3 py-1 border rounded hover:bg-gray-100">← Prev</a>
  {% endif %}
  <span class="px-3 py-1 text-gray-500">
    Page {{ pagination.page }} of {{ pagination.pages }}
  </span>
  {% if pagination.has_next %}
    <a href="?page={{ pagination.next_num }}"
      class="px-3 py-1 border rounded hover:bg-gray-100">Next →</a>
  {% endif %}
</nav>
```

### Search / filter pattern

```python
@app.route("/search")
def search():
    q = request.args.get("q", "").strip()
    if q:
        items = Item.query.filter(Item.name.ilike(f"%{q}%")).all()
    else:
        items = Item.query.all()
    return render_template("index.html", items=items, query=q)
```

```html
<!-- HTMX-powered live search -->
<input type="search" name="q" placeholder="Search items..."
  hx-get="/search" hx-target="#results" hx-trigger="keyup changed delay:300ms"
  class="w-full border rounded px-3 py-2">
<div id="results">
  {% include "partials/item_list.html" %}
</div>
```

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

# Content Security Policy header
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
- **Escape** all user content in Jinja2 (automatic with `{{ }}`, but watch `|safe`)

---

## 8. Testing

### Setup (conftest.py)

```python
import pytest
from app import create_app, db

@pytest.fixture
def app():
    app = create_app()
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()
```

### Route tests (test_routes.py)

```python
def test_index_returns_200(client):
    response = client.get("/")
    assert response.status_code == 200

def test_create_item(client):
    response = client.post("/submit", data={"name": "Test Item"}, follow_redirects=True)
    assert response.status_code == 200
    assert b"Saved successfully" in response.data

def test_create_item_validation(client):
    response = client.post("/submit", data={"name": ""}, follow_redirects=True)
    assert b"required" in response.data

def test_api_returns_json(client):
    response = client.get("/api/items")
    assert response.content_type == "application/json"
    assert response.status_code == 200
```

### Run tests

```bash
pip install pytest
pytest tests/ -v
```

---

## 9. Deployment

### requirements.txt

Always produce a `requirements.txt`:

```
flask>=3.0
flask-sqlalchemy>=3.1   # if using DB
flask-wtf>=1.2          # if using WTF forms
gunicorn>=22.0          # production WSGI server
python-dotenv>=1.0      # .env file support
```

### Gunicorn (production server)

```bash
# Never use flask run or app.run() in production
gunicorn --bind 0.0.0.0:8000 --workers 4 "app:create_app()"
```

### Dockerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "4", "app:create_app()"]
```

### .env file

```bash
SECRET_KEY=your-random-secret-key-here
DATABASE_URL=sqlite:///app.db
FLASK_ENV=production
```

```python
# Load in app.py or config.py
from dotenv import load_dotenv
load_dotenv()
```

---

## 10. Output Rules

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

## 11. Anti-Patterns to Avoid

- ❌ Using `os.system` or subprocess inside routes
- ❌ Storing secrets in code (use `os.environ.get(...)`)
- ❌ Running with `debug=True` in production
- ❌ Blocking routes with long-running sync tasks (suggest background thread or note the limitation)
- ❌ Deeply nested Jinja logic — move complexity to Python
- ❌ Giant single-file apps past ~150 lines (use blueprints)
- ❌ Using `|safe` filter without sanitizing input first
- ❌ Missing CSRF tokens on POST forms
- ❌ Raw SQL queries when SQLAlchemy ORM is available
- ❌ Serving static files with Flask in production (use Nginx or a CDN)

---

## 12. Troubleshooting

| Problem | Likely Cause | Fix |
|---|---|---|
| `TemplateNotFound` | Wrong template path or missing `template_folder` in Blueprint | Check `templates/` directory structure and Blueprint config |
| `405 Method Not Allowed` | Route missing `methods=["POST"]` | Add the HTTP method to `@app.route(...)` |
| CSRF token missing/invalid | Form lacks `{{ form.hidden_tag() }}` or `CSRFProtect` not initialized | Add CSRF token to form or init `CSRFProtect(app)` |
| `sqlalchemy.exc.OperationalError` | Database not created | Call `db.create_all()` inside app context |
| Static files not loading | Wrong `url_for` or path | Use `{{ url_for('static', filename='style.css') }}` |
| Flash messages not showing | Missing `get_flashed_messages()` in template | Add flash rendering block to `base.html` |
| HTMX requests return full page | Route returns full template instead of partial | Return only the HTML fragment for HTMX targets |
| File upload fails silently | Missing `enctype="multipart/form-data"` on form | Add the enctype attribute |
| Import errors with Blueprints | Circular imports between `app.py` and routes | Use app factory pattern with `create_app()` |

---

## 13. Copilot Prompting Tips

- Be specific about the app's purpose — "Flask CRUD app for managing books with SQLite" beats "make a web app"
- Mention the UI style upfront — "use Tailwind CSS" or "plain Bootstrap" avoids regeneration
- For HTMX, specify what should update dynamically — "delete button should remove the row without page reload"
- Include the data model — "Item has name (string), status (enum: active/archived), created_at (datetime)"
- If you want auth, say so early — "add login/register pages with session-based auth"
- Paste the exact error message when asking `/fix` — Copilot fixes are dramatically better with real errors
- Use `@workspace` scope in Copilot Chat so it reads your existing project structure

---

## 14. Reference Files

For advanced patterns, read:

| File | Contents |
|---|---|
| `references/auth.md` | Session-based login, password hashing, Flask-Login setup |
| `references/htmx.md` | HTMX + Flask patterns — load, submit, delete, polling |
| `references/api.md` | JSON API routes, CORS, fetch-based frontends, error handling |
| `references/blueprints.md` | Blueprint structure, app factory, model separation |

---

## 15. Related Skills

| Skill | Relationship |
|---|---|
| **premium-frontend-ui** | Creative philosophy and premium aesthetics — defines the visual quality bar for any frontend |
| **gsap-framer-scroll-animation** | Advanced scroll animations if the Flask app serves a marketing or portfolio landing page |

---

## Author

**Utkarsh Patrikar** - [GitHub](https://github.com/utkarsh232005)
