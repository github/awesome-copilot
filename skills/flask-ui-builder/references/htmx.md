# HTMX + Flask Reference

HTMX lets you build dynamic UIs without writing JavaScript. Flask routes return HTML fragments.

## Setup (CDN)

```html
<script src="https://unpkg.com/htmx.org@1.9.10"></script>
```

## Core Patterns

### Load content into a div

```html
<button hx-get="/partial/stats" hx-target="#stats-box" hx-swap="innerHTML">
  Refresh Stats
</button>
<div id="stats-box">Loading...</div>
```

```python
@app.route("/partial/stats")
def partial_stats():
    data = get_stats()
    return render_template("partials/stats.html", data=data)
```

### Inline form submit (no page reload)

```html
<form hx-post="/add" hx-target="#item-list" hx-swap="afterbegin" hx-on::after-request="this.reset()">
  <input name="title" placeholder="New item" required>
  <button type="submit">Add</button>
</form>
<ul id="item-list">
  {% for item in items %}<li>{{ item.title }}</li>{% endfor %}
</ul>
```

```python
@app.route("/add", methods=["POST"])
def add():
    item = Item(title=request.form["title"])
    db.session.add(item)
    db.session.commit()
    return f"<li>{item.title}</li>"  # returns just the new row
```

### Delete row without page reload

```html
<tr id="row-{{ item.id }}">
  <td>{{ item.name }}</td>
  <td>
    <button hx-delete="/delete/{{ item.id }}"
            hx-target="#row-{{ item.id }}"
            hx-swap="outerHTML"
            hx-confirm="Delete this item?">
      Delete
    </button>
  </td>
</tr>
```

```python
@app.route("/delete/<int:item_id>", methods=["DELETE"])
def delete(item_id):
    item = Item.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()
    return ""  # return empty = removes the row
```

### Polling (live updates)

```html
<div hx-get="/status" hx-trigger="every 3s" hx-swap="innerHTML">
  Loading...
</div>
```

## Tips

- Always return HTML from HTMX-targeted routes, not JSON
- Use `hx-swap="outerHTML"` to replace entire element, `innerHTML` for just content
- For toasts/notifications, use `hx-target="#toast"` and a fixed toast div
- Add `hx-indicator=".spinner"` for loading states
