# Validation Rules

The CLI validates the input file before rendering. Validation produces **errors**
(which abort rendering) and **warnings** (which print to stderr but still produce output).

---

## Errors — these abort generation

Fix all errors before the CLI will produce an output file.

| Rule | Example of violation |
|------|---------------------|
| `nodes` must not be empty | `"nodes": []` |
| `type` must be `"flowchart"` or `"architecture"` | `"type": "sequence"` |
| All node `id` values must be unique | Two nodes both have `"id": "start"` |
| All `id` values must be non-empty strings | `"id": ""` |
| All `label` values must be non-empty strings | `"label": ""` |
| Edge `from` must reference an existing node `id` | `"from": "typo_id"` (no such node) |
| Edge `to` must reference an existing node `id` | `"to": "deleted_node"` (no such node) |
| Self-loops are not allowed | `{ "from": "a", "to": "a" }` |
| Node count must not exceed `--max-nodes` (default: 200) | 250 nodes without raising the limit |

---

## Warnings — output is still generated

Warnings are printed to stderr. The `.excalidraw` file is still written.

| Condition | Warning message pattern | Effect on layout |
|-----------|------------------------|------------------|
| Cycle detected in the graph | `Cycle detected: X → Y` | Nodes in the cycle are placed at the end of the DAG layout |
| Disconnected node | `Node "X" is disconnected` | The node is placed by the layout engine but may float away from the main diagram |
| Duplicate edge | `Duplicate edge "X" → "Y" dropped` | Only the first occurrence of a duplicate `from`/`to` pair is kept |

---

## How cycles are handled

Cycles (e.g. A → B → C → A) are **not errors** — the layout engine uses
Kahn's topological sort, which places cyclic nodes at the end of the layout
rather than hanging indefinitely. The diagram will still generate correctly.

If you intentionally have cycles (e.g. a retry loop), the layout may look slightly
unusual for the cyclic portion, but the rest of the diagram is unaffected.

---

## How to avoid common errors

### Unknown node references
Always define every node in `nodes` before referencing it in an edge.
Copy-paste the `id` exactly — the validator is case-sensitive (`Auth` ≠ `auth`).

### Self-loops
To represent a recursive or retry action, use a separate node:

```json
// Instead of: { "from": "process", "to": "process" }

// Do this:
{ "from": "process", "to": "retry", "label": "Retry" },
{ "from": "retry",   "to": "process" }
```

### Disconnected nodes
Every node should have at least one edge connecting it to the rest of the diagram.
If you need an isolated annotation, consider adding a dummy edge with `"opacity": 0`
on the edge style, or remove the node entirely.

### Duplicate edges
If you need two labelled branches between the same two nodes (e.g. A → B labelled
"cache hit" and A → B labelled "cache miss"), these are considered duplicate edges
and the second will be dropped. Route via an intermediate node instead:

```json
// Instead of two A → B edges:
{ "from": "a", "to": "hit",  "label": "Cache hit" },
{ "from": "a", "to": "miss", "label": "Cache miss" },
{ "from": "hit",  "to": "b" },
{ "from": "miss", "to": "b" }
```

---

## Checking output warnings

Run the CLI and check stderr for warnings:

```bash
npx excalidraw-gen generate diagram.json --out out.excalidraw 2>warnings.txt
cat warnings.txt
```

Or pipe stderr inline:

```bash
npx excalidraw-gen generate diagram.json --out out.excalidraw 2>&1 | grep -i warn
```
