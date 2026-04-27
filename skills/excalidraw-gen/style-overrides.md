# Style Overrides

Both nodes and edges accept an optional `style` object.
Any field you provide overrides only that specific property —
all other properties fall back to the template default.
You can override none, some, or all fields independently.

---

## Node `style` fields

| Field             | Type   | Accepted values | Default (template) | Description |
|-------------------|--------|-----------------|--------------------|-------------|
| `backgroundColor` | string | hex colour, `"transparent"` | Template fill | Shape fill colour |
| `strokeColor`     | string | hex colour      | Template stroke | Border/outline colour |
| `strokeWidth`     | number | `1` – `5`       | `2`               | Border thickness in px |
| `strokeStyle`     | string | `"solid"`, `"dashed"`, `"dotted"` | `"solid"` | Border line style |
| `fillStyle`       | string | `"solid"`, `"hachure"`, `"cross-hatch"`, `"zigzag"` | `"solid"` | Fill pattern |
| `shape`           | string | `"rectangle"`, `"ellipse"` | Template shape | Override the template shape |
| `width`           | number | pixels          | `180–260` (auto)   | Node width. Auto-adjusts from 180px to 260px based on label length. Set explicitly to override. |
| `height`          | number | pixels          | auto               | Node height. Auto-computed from label wrap if omitted. |
| `opacity`         | number | `0` – `100`     | `100`              | Node opacity |

### `fillStyle` visual guide

| Value         | Appearance |
|---------------|------------|
| `"solid"`     | Flat, filled colour (default) |
| `"hachure"`   | Diagonal hatching pattern over the fill colour |
| `"cross-hatch"` | Cross-hatching pattern |
| `"zigzag"`    | Zigzag line pattern |

---

## Edge `style` fields

| Field         | Type   | Accepted values | Default | Description |
|---------------|--------|-----------------|---------|-------------|
| `strokeColor` | string | hex colour      | `"#1e1e1e"` (dark) | Arrow line colour |
| `strokeStyle` | string | `"solid"`, `"dashed"`, `"dotted"` | `"solid"` | Arrow line style |
| `strokeWidth` | number | `1` – `5`       | `2`     | Arrow thickness in px |
| `opacity`     | number | `0` – `100`     | `100`   | Arrow opacity |

---

## Recommended colour palette

These pairs are designed to work together. Use consistently across a diagram
to establish semantic meaning.

| Semantic meaning         | `backgroundColor` | `strokeColor` |
|--------------------------|-------------------|---------------|
| Blue — information, user | `#a5d8ff`         | `#1971c2`     |
| Green — success, ok, go  | `#b2f2bb`         | `#2f9e44`     |
| Red — error, failure     | `#ffc9c9`         | `#c92a2a`     |
| Orange — warning, manual | `#ffe8cc`         | `#fd7e14`     |
| Purple — process, service| `#d0bfff`         | `#7048e8`     |
| Yellow — queue, async    | `#fff3bf`         | `#fab005`     |
| Teal — I/O, data         | `#e3fafc`         | `#0c8599`     |
| Pink-red — gateway       | `#ffa8a8`         | `#c92a2a`     |
| Purple-haze — ML/AI      | `#e599f7`         | `#9c36b5`     |

### Edge colour conventions in diagrams
- **Green edge** (`#2f9e44`) — success path, approval, valid condition
- **Red edge** (`#c92a2a`) — failure path, rejection, invalid condition
- **Dashed red edge** — failure + visual emphasis (most noticeable for errors)
- **Orange edge** (`#fd7e14`) — manual step, wait state, external dependency

---

## Node style examples

### Success terminal node
```json
{
  "id": "success",
  "label": "Order Confirmed",
  "type": "end",
  "style": {
    "backgroundColor": "#b2f2bb",
    "strokeColor": "#2f9e44",
    "strokeWidth": 3
  }
}
```

### Failure terminal node
```json
{
  "id": "fail",
  "label": "Payment Failed",
  "type": "end",
  "style": {
    "backgroundColor": "#ffc9c9",
    "strokeColor": "#c92a2a",
    "strokeStyle": "dashed",
    "opacity": 90
  }
}
```

### Wide process node with hachure fill
```json
{
  "id": "batch_job",
  "label": "Nightly Batch Processing",
  "type": "process",
  "style": {
    "backgroundColor": "#fff3bf",
    "strokeColor": "#f08c00",
    "fillStyle": "hachure",
    "width": 260
  }
}
```

### Manual approval (ellipse override)
```json
{
  "id": "approve",
  "label": "Manual Approval",
  "type": "decision",
  "style": {
    "backgroundColor": "#ffe8cc",
    "strokeColor": "#fd7e14",
    "strokeStyle": "dashed",
    "shape": "ellipse"
  }
}
```

---

## Edge style examples

### Success path edge
```json
{ "from": "gate", "to": "deploy", "label": "Pass", "style": { "strokeColor": "#2f9e44" } }
```

### Failure path edge (dashed red)
```json
{ "from": "gate", "to": "fail", "label": "Fail", "style": { "strokeColor": "#c92a2a", "strokeStyle": "dashed" } }
```

### Thick highlighted edge
```json
{ "from": "client", "to": "gateway", "label": "HTTPS", "style": { "strokeWidth": 3, "strokeColor": "#1971c2" } }
```

### Faded background edge
```json
{ "from": "worker", "to": "db", "label": "write", "style": { "opacity": 60 } }
```
