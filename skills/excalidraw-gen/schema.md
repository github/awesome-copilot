# Input File Schema

Both JSON and YAML are accepted. Use whichever is more readable for the content.
The parser auto-detects the format — no flag needed.

---

## Top-level fields

| Field   | Type   | Required | Description |
|---------|--------|----------|-------------|
| `type`  | string | ✅       | `"flowchart"` or `"architecture"` |
| `nodes` | array  | ✅       | List of node objects (at least one required) |
| `edges` | array  | ✅       | List of edge objects (can be empty) |
| `title` | string | optional | Diagram title — metadata only, not rendered |

---

## Node object fields

| Field      | Type   | Required | Description |
|------------|--------|----------|-------------|
| `id`       | string | ✅       | Unique identifier. Use `snake_case`. No spaces. Must be unique across all nodes. |
| `label`    | string | ✅       | Display text shown inside the node shape. Supports multi-line wrapping. |
| `type`     | string | optional | Node type key — controls default shape and colour. See [node-types.md](node-types.md). Defaults to `process` if omitted. |
| `metadata` | object | optional | Arbitrary key-value data attached to the node. Not rendered in the diagram. |
| `style`    | object | optional | Per-node visual overrides. See [style-overrides.md](style-overrides.md). |

### Node `id` rules
- Must be unique across the entire `nodes` array — duplicates cause a validation error.
- Whitespace is stripped automatically.
- Use descriptive ids: `auth_service`, `validate_card`, `error_page`.
- Avoid special characters other than `_` and `-`.

### Node `label` rules
- Required and must be non-empty.
- Long labels auto-wrap. Node width auto-adjusts from 180px to 260px based on label length; height expands to fit.
- To force a specific width beyond the auto range, set `width` in `style`.

---

## Edge object fields

| Field           | Type    | Required | Description |
|-----------------|---------|----------|-------------|
| `from`          | string  | ✅       | Source node `id` |
| `to`            | string  | ✅       | Target node `id` |
| `label`         | string  | optional | Text shown along the arrow at its geometric midpoint |
| `bidirectional` | boolean | optional | `true` renders arrowheads at both ends. Default: `false` |
| `style`         | object  | optional | Per-edge visual overrides. See [style-overrides.md](style-overrides.md). |

### Edge rules
- `from` and `to` must both reference existing node `id` values — unknown ids cause a validation error.
- `from` and `to` must not be equal — self-loops cause a validation error.
- Duplicate edges (same `from`/`to` pair) are silently dropped (only the first is kept).

---

## Minimal valid JSON skeleton

```json
{
  "type": "flowchart",
  "nodes": [
    { "id": "a", "label": "Start" },
    { "id": "b", "label": "End" }
  ],
  "edges": [
    { "from": "a", "to": "b" }
  ]
}
```

## Minimal valid YAML skeleton

```yaml
type: flowchart
nodes:
  - id: a
    label: Start
  - id: b
    label: End
edges:
  - from: a
    to: b
```

---

## Full node example (all fields)

```json
{
  "id": "payment_gateway",
  "label": "Charge Payment Gateway",
  "type": "process",
  "metadata": { "owner": "payments-team", "sla": "99.9%" },
  "style": {
    "backgroundColor": "#fff3bf",
    "strokeColor": "#f08c00",
    "strokeWidth": 2,
    "strokeStyle": "solid",
    "fillStyle": "solid",
    "width": 240,
    "opacity": 100
  }
}
```

## Full edge example (all fields)

```json
{
  "from": "validate",
  "to": "payment_gateway",
  "label": "Valid",
  "bidirectional": false,
  "style": {
    "strokeColor": "#2f9e44",
    "strokeStyle": "solid",
    "strokeWidth": 2,
    "opacity": 100
  }
}
```
