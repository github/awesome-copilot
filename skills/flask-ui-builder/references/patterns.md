# Flask UI Patterns Reference

Copy-paste ready UI patterns for Flask + Jinja2 + Tailwind CSS applications.

## File upload pattern

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
  <input type="hidden" name="csrf_token" value="{{ csrf_token() }}">
  <input type="file" name="file" accept=".png,.jpg,.jpeg,.gif,.pdf,.csv"
    class="block w-full text-sm border rounded p-2">
  <button type="submit"
    class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
    Upload
  </button>
</form>
```

## Pagination pattern

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

## Search / filter pattern

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

## Data table

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
          <input type="hidden" name="csrf_token" value="{{ csrf_token() }}">
          <button class="text-red-600 hover:underline ml-2">Delete</button>
        </form>
      </td>
    </tr>
    {% endfor %}
  </tbody>
</table>
```

## Testing

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

## Deployment

### Gunicorn (production server)

```bash
# Never use flask run or app.run() in production

# If app.py defines a module-level Flask instance:
gunicorn --bind 0.0.0.0:8000 --workers 4 app:app

# If app.py defines an application factory:
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
FLASK_DEBUG=0
```

```python
# Load in app.py or config.py
from dotenv import load_dotenv
load_dotenv()
```
