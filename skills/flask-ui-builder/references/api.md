# Flask JSON API + Fetch Frontend Reference

## JSON API Routes

```python
from flask import jsonify, request

@app.route("/api/items", methods=["GET"])
def api_list():
    items = Item.query.all()
    return jsonify([{"id": i.id, "name": i.name} for i in items])

@app.route("/api/items", methods=["POST"])
def api_create():
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "name required"}), 400
    item = Item(name=data["name"])
    db.session.add(item)
    db.session.commit()
    return jsonify({"id": item.id, "name": item.name}), 201

@app.route("/api/items/<int:item_id>", methods=["DELETE"])
def api_delete(item_id):
    item = Item.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()
    return "", 204
```

## CORS (for SPA or external clients)

```
pip install flask-cors
```

```python
from flask_cors import CORS
CORS(app, resources={r"/api/*": {"origins": "*"}})
```

## Fetch from frontend (JS in templates)

```javascript
// GET
const res = await fetch('/api/items');
const items = await res.json();

// POST
const res = await fetch('/api/items', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({name: inputEl.value})
});
const item = await res.json();

// DELETE
await fetch(`/api/items/${id}`, {method: 'DELETE'});
```

## Error handling pattern

```python
@app.errorhandler(404)
def not_found(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": "not found"}), 404
    return render_template("404.html"), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "internal server error"}), 500
```
