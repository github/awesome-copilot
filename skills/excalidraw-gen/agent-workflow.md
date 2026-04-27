# Agent Workflow

Use this file as your step-by-step checklist when generating a diagram from
a user request. Follow the steps in order.

---

## Step 1 — Identify the diagram type

Ask: is this a **process/flow** or a **system/infrastructure** diagram?

| User asks for... | Use |
|-----------------|-----|
| Workflow, process, flowchart, decision tree, pipeline, sequence, state machine | `"type": "flowchart"` + `--template flowchart` |
| Architecture, system diagram, service map, infrastructure, data flow between services | `"type": "architecture"` + `--template architecture` |

---

## Step 2 — Identify the layout

| Situation | Use |
|-----------|-----|
| Nodes have a clear top-to-bottom order (almost always) | `--layout dag` (default) |
| Nodes are an unordered set with no hierarchy (e.g. a catalogue) | `--layout grid` |

> **DAG layout warning**: The `dag` layout requires a directed acyclic graph. Any cycle (e.g. `response → user` where `user` is also a source) will cause the cycle nodes to be collapsed into a single horizontal row, breaking the visual hierarchy. **Never create edges that point back toward a source node when using `--layout dag`.**

---

## Step 3 — Enumerate all nodes

For each distinct entity, component, or step in the diagram:

1. Assign a short `snake_case` **id** (e.g. `auth_service`, `validate_card`)
2. Write a concise **label** (what appears inside the shape)
3. Pick the most specific **type** from [node-types.md](node-types.md)
4. Note if any node needs **style overrides** (see Step 5)

**Tips**:
- Start/entry nodes → `start` (flowchart) or `user` (architecture)
- Terminal/result nodes → `end` (flowchart)
- Branch points → `decision`
- Do not skip nodes. Every visible box in the intended diagram must be in `nodes`.

---

## Step 4 — Define all edges

For each connection between nodes:

1. Set `from` to the source node's `id`
2. Set `to` to the target node's `id`
3. Add a `label` if the transition has a meaningful name (Submit, Approved, Fail, Cache hit, etc.)
4. Always label outbound edges from `decision` nodes — unlabelled branches are ambiguous
5. Set `"bidirectional": true` for two-way relationships (read/write, sync, mutual dependency)

**Check**:
- Every `from` and `to` value must exactly match an `id` in `nodes` (case-sensitive)
- No `from === to` (self-loops are invalid — use an intermediate node instead)
- No two edges with the same `from`/`to` pair (duplicates are dropped)
- **No cycles when using `--layout dag`** — do not create an edge that points back to any ancestor node. Cycles cause the layout engine to flatten all involved nodes into a single horizontal line, producing an unreadable diagram. If a "reply" or "return" relationship is needed, represent it with a `label` on the terminal node (e.g. label `"Response to User"`) instead of drawing a back-edge.

---

## Step 5 — Apply semantic styling (optional but recommended)

Use colours to convey meaning at a glance. Consistency within a diagram matters more than any specific colour.

### Standard conventions

| Meaning | Node style | Edge style |
|---------|-----------|------------|
| Success / ok / go | `backgroundColor: "#b2f2bb"`, `strokeColor: "#2f9e44"` | `strokeColor: "#2f9e44"` |
| Failure / error / stop | `backgroundColor: "#ffc9c9"`, `strokeColor: "#c92a2a"`, `strokeStyle: "dashed"` | `strokeColor: "#c92a2a"`, `strokeStyle: "dashed"` |
| Warning / manual / wait | `backgroundColor: "#ffe8cc"`, `strokeColor: "#fd7e14"` | `strokeColor: "#fd7e14"` |
| User / actor | `backgroundColor: "#a5d8ff"`, `strokeColor: "#1971c2"`, `shape: "ellipse"` | — |
| External / third-party | `backgroundColor: "#ffc9c9"`, `strokeColor: "#e03131"` | — |
| Async / queue | `backgroundColor: "#fff3bf"`, `strokeColor: "#fab005"` | — |

### When to use `strokeStyle: "dashed"`
- On `decision` node borders → emphasises it's a branch point
- On failure/rejection paths → visually distinguishes from success paths
- On external or optional connections → shows they're not guaranteed

---

## Step 6 — Choose the theme (optional)

| Theme | When to use |
|-------|-------------|
| `default` | General purpose — clean white background, vivid colours |
| `pastel` | Presentations, documentation, light/friendly aesthetic |
| `dark` | Dark-mode contexts, technical dashboards |

---

## Step 7 — Write the input file

Choose JSON or YAML — both are equivalent. YAML is often cleaner for diagrams
with many style overrides. JSON is better when the data is already programmatic.

Validate your file mentally against the rules in [validation.md](validation.md)
before running the CLI.

---

## Step 8 — Run the CLI

```bash
# Flowchart (default theme, DAG layout)
npx excalidraw-gen generate diagram.json --template flowchart --out diagram.excalidraw

# Architecture with dark theme
npx excalidraw-gen generate arch.json --template architecture --theme dark --out arch.excalidraw

# YAML input
npx excalidraw-gen generate pipeline.yaml --out pipeline.excalidraw

# Print to stdout (for piping or inspection)
npx excalidraw-gen generate diagram.json
```

---

## Step 9 — Open the output

Open the `.excalidraw` file at [excalidraw.com](https://excalidraw.com) via **Open** → select file,
or in the Excalidraw desktop app.

---

## Common patterns reference

### Decision fan-out
A `decision` node routes to 2+ targets. Always label every outbound edge.

```
decision ──"Yes"──► success_node
         └──"No"───► error_node
```

### Retry loop
Self-loops are invalid. Use an intermediate retry node instead.

```
process ──"Error"──► retry ──"Retry"──► process
                          └──"Give up"──► fail
```

### Parallel branches that converge
Route through a join/merge node.

```
split ──► branch_a ──► join ──► continue
      └──► branch_b ──►┘
```

### Bidirectional data flow
Use `"bidirectional": true` for read/write or two-way sync relationships.

```json
{ "from": "app", "to": "db", "label": "read/write", "bidirectional": true }
```

### Very long node labels
Set `width` in the node's `style` to control line wrapping.

```json
{ "style": { "width": 260 } }
```

### Pastel-themed diagrams
Add `--theme pastel` to the CLI command — no changes to the input file needed.
All template colours automatically lighten.

### Isolating a sub-diagram
If a small set of nodes is logically separate (e.g. an inset legend), group them
by using consistent style overrides and placing them with a common node `type`.
The layout engine places nodes by their graph connectivity.
