---
name: draw-io-diagram-generator
description: Use when creating, editing, or generating draw.io diagram files (.drawio, .drawio.svg, .drawio.png). Covers mxGraph XML authoring, shape libraries, style strings, flowcharts, system architecture, sequence diagrams, ER diagrams, UML class diagrams, network topology, layout strategy, the hediet.vscode-drawio VS Code extension, and the full agent workflow from request to a ready-to-open file.
---

# Draw.io Diagram Generator

This skill enables you to generate, edit, and validate draw.io (`.drawio`) diagram files with
correct mxGraph XML structure. All generated files open immediately in the
[Draw.io VS Code extension](https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio)
(`hediet.vscode-drawio`) without any manual fixes required. You can also open the files in the draw.io web app or desktop app if you prefer.

---

## 1. When to Use This Skill

**Trigger phrases (load this skill when you see these)**

- "create a diagram", "draw a flowchart", "generate an architecture diagram"
- "design a sequence diagram", "make a UML class diagram", "build an ER diagram"
- "add a .drawio file", "update the diagram", "visualise the flow"
- "document the architecture", "show the data model", "diagram the service interactions"
- Any request to produce or modify a `.drawio`, `.drawio.svg`, or `.drawio.png` file

**Supported diagram types**

| Diagram Type | Template Available | Description |
|---|---|---|
| Flowchart | `assets/templates/flowchart.drawio` | Process flows with decisions and branches |
| System Architecture | `assets/templates/architecture.drawio` | Multi-tier / layered service architecture |
| Sequence Diagram | `assets/templates/sequence.drawio` | Actor lifelines and timed message flows |
| ER Diagram | `assets/templates/er-diagram.drawio` | Database tables with relationships |
| UML Class Diagram | `assets/templates/uml-class.drawio` | Classes, interfaces, enums, relationships |
| Network Topology | (use shape library) | Routers, servers, firewalls, subnets |
| BPMN Workflow | (use shape library) | Business process events, tasks, gateways |
| Mind Map | (manual) | Central topic with radiating branches |

---

## 2. Prerequisites

- If running with VS Code integration enabled, Install the drawio extension: **draw.io VS Code extension** — `hediet.vscode-drawio` (extension id). Install with:
  ```
  ext install hediet.vscode-drawio
  ```
- **Supported file extensions**: `.drawio`, `.drawio.svg`, `.drawio.png`
- **Python 3.8+** (optional) — for the validation and shape-insertion scripts in `scripts/`

---

## 3. Step-by-Step Agent Workflow

Follow these steps in order for every diagram generation task.

### Step 1 — Understand the Request

Ask or infer:
1. **Diagram type** — What kind of diagram? (flowchart, architecture, UML, ER, sequence, network...)
2. **Entities / actors** — What are the main components, actors, classes, or tables?
3. **Relationships** — How are they connected? What direction? What cardinality?
4. **Output path** — Where should the `.drawio` file be saved?
5. **Existing file** — Are we creating new or editing an existing file?

If the request is ambiguous, infer the most sensible diagram type from context (e.g. "show the tables" → ER diagram, "show how the API call flows" → sequence diagram).

### Step 2 — Select a Template or Start Fresh

- **Use a template** when the diagram type matches one in `assets/templates/`. Copy the template structure and replace placeholder values.
- **Start fresh** for novel layouts. Begin with the minimal valid skeleton:

```xml
<!-- Set modified="" to the current ISO 8601 timestamp when generating a new file -->
<mxfile host="Electron" modified="" version="26.0.0">
  <diagram id="page-1" name="Page-1">
    <mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1"
                  tooltips="1" connect="1" arrows="1" fold="1"
                  page="1" pageScale="1" pageWidth="1169" pageHeight="827"
                  math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <!-- Your cells go here -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

> **Rule**: ids `0` and `1` are ALWAYS required and must be the first two cells. Never reuse them.

### Step 3 — Plan the Layout

Before generating XML, sketch the logical placement:
- Organise into **rows** or **tiers** (use swimlanes for layers)
- **Horizontal spacing**: 40–60px between same-row shapes
- **Vertical spacing**: 80–120px between tier rows
- Standard shape size: `120x60` px for process boxes, `160x80` px for swimlanes
- Default canvas: A4 landscape = `1169 x 827` px

### Step 4 — Generate the mxGraph XML

**Vertex cell** (every shape):
```xml
<mxCell id="unique-id" value="Label"
        style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;"
        vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="120" height="60" as="geometry" />
</mxCell>
```

**Edge cell** (every connector):
```xml
<mxCell id="edge-id" value="Label (optional)"
        style="edgeStyle=orthogonalEdgeStyle;html=1;"
        edge="1" source="source-id" target="target-id" parent="1">
  <mxGeometry relative="1" as="geometry" />
</mxCell>
```

**Critical rules**:
- Every cell id must be **globally unique** within the file
- Every vertex must have an `mxGeometry` child with `x`, `y`, `width`, `height`, `as="geometry"`
- Every edge must have `source` and `target` matching existing vertex ids — **exception**: floating edges (e.g. sequence diagram lifelines) use `sourcePoint`/`targetPoint` inside `<mxGeometry>` instead; see §4 Sequence Diagram
- Every cell's `parent` must reference an existing cell id
- Use `html=1` in style when the label contains HTML (`<b>`, `<i>`, `<br>`)
- Escape XML special characters in labels: `&` => `&amp;`, `<` => `&lt;`, `>` => `&gt;`

### Step 5 — Apply Correct Styles

Use the standard semantic color palette for consistency:

| Purpose | fillColor | strokeColor |
|---|---|---|
| Primary / Info | `#dae8fc` | `#6c8ebf` |
| Success / Start | `#d5e8d4` | `#82b366` |
| Warning / Decision | `#fff2cc` | `#d6b656` |
| Error / End | `#f8cecc` | `#b85450` |
| Neutral | `#f5f5f5` | `#666666` |
| External / Partner | `#e1d5e7` | `#9673a6` |

Common style strings by diagram type:

```
# Rounded process box (flowchart)
rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;

# Decision diamond
rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;

# Start/End terminal
ellipse;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;

# Database cylinder
shape=mxgraph.flowchart.database;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;

# Swimlane container (tier)
swimlane;startSize=30;fillColor=#dae8fc;strokeColor=#6c8ebf;fontStyle=1;

# UML class box
swimlane;fontStyle=1;align=center;startSize=40;fillColor=#dae8fc;strokeColor=#6c8ebf;

# Interface / stereotype box
swimlane;fontStyle=3;align=center;startSize=40;fillColor=#f5f5f5;strokeColor=#666666;

# ER table container
shape=table;startSize=30;container=1;collapsible=1;childLayout=tableLayout;

# Orthogonal connector
edgeStyle=orthogonalEdgeStyle;html=1;

# ER relationship (crow's foot)
edgeStyle=entityRelationEdgeStyle;html=1;endArrow=ERmany;startArrow=ERone;
```

> See `references/style-reference.md` for the complete style key catalog and `references/shape-libraries.md` for all shape library names.

### Step 6 — Save and Validate

1. **Write the file** to the requested path with `.drawio` extension
2. **Run the validator** (optional but recommended):
   ```bash
   python .github/skills/draw-io-diagram-generator/scripts/validate-drawio.py <path-to-file.drawio>
   ```
3. **Tell the user** how to open the file:
   > "Open `<filename>` in VS Code — it will render automatically with the draw.io extension. You can use draw.io's web app or desktop app as well if you prefer."
4. **Provide a brief description** of what is in the diagram so the user knows what to expect.

---

## 4. Diagram-Type Recipes

### Flowchart

Key elements: Start (ellipse) => Process (rounded rectangle) => Decision (diamond) => End (ellipse)

```xml
<!-- Start node -->
<mxCell id="start" value="Start"
        style="ellipse;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;"
        vertex="1" parent="1">
  <mxGeometry x="500" y="80" width="120" height="60" as="geometry" />
</mxCell>

<!-- Process -->
<mxCell id="p1" value="Process Step"
        style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;"
        vertex="1" parent="1">
  <mxGeometry x="500" y="200" width="120" height="60" as="geometry" />
</mxCell>

<!-- Decision -->
<mxCell id="d1" value="Condition?"
        style="rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;"
        vertex="1" parent="1">
  <mxGeometry x="460" y="320" width="200" height="100" as="geometry" />
</mxCell>

<!-- Arrow: start to p1 -->
<mxCell id="e1" value=""
        style="edgeStyle=orthogonalEdgeStyle;html=1;"
        edge="1" source="start" target="p1" parent="1">
  <mxGeometry relative="1" as="geometry" />
</mxCell>
```

### Architecture Diagram (3-tier)

Use **swimlane containers** for each tier. All service boxes are children of their swimlane.

```xml
<!-- Tier swimlane -->
<mxCell id="tier1" value="Client Layer"
        style="swimlane;startSize=30;fillColor=#dae8fc;strokeColor=#6c8ebf;fontStyle=1;"
        vertex="1" parent="1">
  <mxGeometry x="60" y="100" width="1050" height="130" as="geometry" />
</mxCell>

<!-- Service inside tier (parent="tier1", coords are relative to tier) -->
<mxCell id="webapp" value="Web App"
        style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;"
        vertex="1" parent="tier1">
  <mxGeometry x="80" y="40" width="120" height="60" as="geometry" />
</mxCell>
```

> Connectors between tiers use absolute coordinates with `parent="1"`.

### Sequence Diagram

Key elements: Actors (top), Lifelines (dashed vertical lines), Activation boxes, Message arrows.

- Lifelines: `edge="1"` with `endArrow=none` and `dashed=1`, no source/target — use `sourcePoint`/`targetPoint` in geometry
- Synchronous message: `endArrow=block;endFill=1`
- Return message: `endArrow=open;endFill=0;dashed=1`
- Self-call: loop the edge via two Array points to the right and back

**Minimal XML snippet:**

```xml
<!-- Actor (stick figure) -->
<mxCell id="actorA" value="Client"
        style="shape=mxgraph.uml.actor;pointerEvents=1;dashed=0;whiteSpace=wrap;html=1;aspect=fixed;"
        vertex="1" parent="1">
  <mxGeometry x="110" y="80" width="60" height="80" as="geometry" />
</mxCell>

<!-- Service box -->
<mxCell id="actorB" value="API Server"
        style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;"
        vertex="1" parent="1">
  <mxGeometry x="480" y="100" width="160" height="60" as="geometry" />
</mxCell>

<!-- Lifeline — floating edge: uses sourcePoint/targetPoint, NOT source/target attributes -->
<mxCell id="lifA" value=""
        style="edgeStyle=none;dashed=1;endArrow=none;"
        edge="1" parent="1">
  <mxGeometry relative="1" as="geometry">
    <mxPoint x="140" y="160" as="sourcePoint" />
    <mxPoint x="140" y="700" as="targetPoint" />
  </mxGeometry>
</mxCell>

<!-- Activation box (thin rectangle on lifeline) -->
<mxCell id="actA1" value=""
        style="fillColor=#dae8fc;strokeColor=#6c8ebf;"
        vertex="1" parent="1">
  <mxGeometry x="130" y="220" width="20" height="180" as="geometry" />
</mxCell>

<!-- Synchronous message -->
<mxCell id="msg1" value="POST /orders"
        style="edgeStyle=elbowEdgeStyle;elbow=vertical;html=1;endArrow=block;endFill=1;"
        edge="1" source="actA1" target="actorB" parent="1">
  <mxGeometry relative="1" as="geometry" />
</mxCell>

<!-- Return message (dashed) -->
<mxCell id="msg2" value="201 Created"
        style="edgeStyle=elbowEdgeStyle;elbow=vertical;dashed=1;html=1;endArrow=open;endFill=0;"
        edge="1" source="actorB" target="actA1" parent="1">
  <mxGeometry relative="1" as="geometry" />
</mxCell>
```

> **Note:** Lifelines are floating edges that use `sourcePoint`/`targetPoint` in `<mxGeometry>` instead of `source`/`target` attributes. This is the standard draw.io pattern for sequence diagrams.

### ER Diagram

Use `shape=table` containers with `childLayout=tableLayout`. Rows are `shape=tableRow` cells with `portConstraint=eastwest`. Columns inside each row are `shape=partialRectangle`.

Relationship arrows use `edgeStyle=entityRelationEdgeStyle`:
- One-to-One: `startArrow=ERone;endArrow=ERone`
- One-to-Many: `startArrow=ERone;endArrow=ERmany`
- Many-to-Many: `startArrow=ERmany;endArrow=ERmany`
- Mandatory: `ERmandOne`, Optional: `ERzeroToOne`

### UML Class Diagram

Class boxes are swimlane containers. Attributes and methods are plain text cells. Dividers are zero-height swimlane children.

Arrow styles by relationship type:

| Relationship | Style String |
|---|---|
| Inheritance (extends) | `edgeStyle=orthogonalEdgeStyle;html=1;endArrow=block;endFill=0;` |
| Realization (implements) | `edgeStyle=orthogonalEdgeStyle;dashed=1;html=1;endArrow=block;endFill=0;` |
| Composition | `edgeStyle=orthogonalEdgeStyle;html=1;startArrow=diamond;startFill=1;endArrow=none;` |
| Aggregation | `edgeStyle=orthogonalEdgeStyle;html=1;startArrow=diamond;startFill=0;endArrow=none;` |
| Dependency | `edgeStyle=orthogonalEdgeStyle;dashed=1;html=1;endArrow=open;endFill=0;` |
| Association | `edgeStyle=orthogonalEdgeStyle;html=1;endArrow=open;endFill=0;` |

---

## 5. Multi-Page Diagrams

Add multiple `<diagram>` elements for complex systems:

```xml
<mxfile host="Electron" version="26.0.0">
  <diagram id="overview" name="Overview">
    <!-- overview mxGraphModel -->
  </diagram>
  <diagram id="detail" name="Detail View">
    <!-- detail mxGraphModel -->
  </diagram>
</mxfile>
```

Each page has its own independent cell id namespace. The same id value can appear in different pages without conflict.

---

## 6. Editing Existing Diagrams

When modifying an existing `.drawio` file:

1. **Read** the file first to understand existing cell ids, positions, and parent hierarchy
2. **Identify the target diagram page** — by index or `name` attribute
3. **Assign new unique ids** that do not collide with existing ids
4. **Respect the container hierarchy** — children of a swimlane use coordinates relative to their parent
5. **Verify edges** — after repositioning nodes, confirm edge source/target ids remain valid

Use `scripts/add-shape.py` to safely add a single shape without editing raw XML:
```bash
python .github/skills/draw-io-diagram-generator/scripts/add-shape.py docs/arch.drawio "New Service" 700 380
```

---

## 7. Best Practices

**Layout**
- Align shapes to the 10px grid (all coordinates divisible by 10)
- Group related shapes inside swimlane containers
- One diagram topic per page; use multi-page files for complex systems
- Aim for 40 or fewer cells per page for readability

**Labels**
- Add a title text cell (`text;strokeColor=none;fillColor=none;fontSize=18;fontStyle=1`) at top of every page
- Always set `whiteSpace=wrap;html=1` on vertex shapes
- Keep labels concise — 3 words or fewer per shape where possible

**Style consistency**
- Use the semantic color palette from Section 3 Step 5 consistently across a project
- Prefer `edgeStyle=orthogonalEdgeStyle` for clean right-angle connectors
- Do not inline arbitrary HTML in labels unless necessary

**File naming**
- Use kebab-case: `order-service-flow.drawio`, `database-schema.drawio`
- Place diagrams alongside the code they document: `docs/` or `architecture/`

---

## 8. Troubleshooting

| Problem | Likely Cause | Fix |
|---|---|---|
| File opens blank in VS Code | Missing id=0 or id=1 cell | Add both root cells before any other cells |
| Shape at wrong position | Child inside container — coords are relative | Check `parent`; adjust x/y relative to container |
| Edge not visible | source or target id does not match any vertex | Verify both ids exist exactly as written |
| Diagram shows "Compressed" | mxGraphModel is base64-encoded | Open in draw.io web, File > Export > XML (uncompressed) |
| Shape style not rendering | Typo in shape= name | Check `references/shape-libraries.md` for exact style string |
| Label shows escaped HTML | html=0 on a cell with HTML label | Add `html=1;` to the cell style |
| Container children overlap container edge | Container height too small | Increase container height in mxGeometry |

---

## 9. Validation Checklist

Before delivering any generated `.drawio` file, verify:

- [ ] File starts with `<mxfile>` root element
- [ ] Every `<diagram>` has a non-empty `id` attribute
- [ ] `<mxCell id="0" />` is the first cell in every diagram
- [ ] `<mxCell id="1" parent="0" />` is the second cell in every diagram
- [ ] All cell `id` values are unique within each diagram
- [ ] Every vertex cell has `vertex="1"` and a child `<mxGeometry as="geometry">`
- [ ] Every edge cell has `edge="1"` and either: (a) `source`/`target` pointing to existing vertex ids, or (b) `<mxPoint as="sourcePoint">` and `<mxPoint as="targetPoint">` in its `<mxGeometry>` (floating edge — used for sequence diagram lifelines)
- [ ] Every cell (except id=0) has a `parent` pointing to an existing id
- [ ] `html=1` is in the style for any label containing HTML tags
- [ ] XML is well-formed (no unclosed tags, no unescaped `&`, `<`, `>` in attribute values)
- [ ] A title label cell exists at the top of each page

Run the automated validator:
```bash
python .github/skills/draw-io-diagram-generator/scripts/validate-drawio.py <file.drawio>
```

---

## 10. Output Format

When delivering a diagram, always provide:

1. **The `.drawio` file** written to the requested path
2. **A one-sentence summary** of what the diagram shows
3. **How to open it**:
   > "Open `<filename>` in VS Code — the draw.io extension will render it automatically. Or you can open it in the draw.io web app or desktop app if you prefer."
4. **How to edit it** (if the user is likely to customise):
   > "Click any shape to select it. Double-click to edit the label. Drag to reposition."
5. **Validation status** — whether the validator script was run and passed

---

## 11. References

All companion files are in `.github/skills/draw-io-diagram-generator/`:

| File | Contents |
|---|---|
| `references/drawio-xml-schema.md` | Complete mxfile / mxGraphModel / mxCell attribute reference, coordinate system, reserved cells, validation rules |
| `references/style-reference.md` | All style keys with allowed values, vertex and edge style keys, shape catalog, semantic color palette |
| `references/shape-libraries.md` | All shape library categories (General, Flowchart, UML, ER, Network, BPMN, Mockup, K8s) with style strings |
| `assets/templates/flowchart.drawio` | Ready-to-use flowchart template |
| `assets/templates/architecture.drawio` | 4-tier system architecture template |
| `assets/templates/sequence.drawio` | 3-actor sequence diagram template |
| `assets/templates/er-diagram.drawio` | 3-table ER diagram with crow's foot relationships |
| `assets/templates/uml-class.drawio` | Interface + 2 classes + enum with relationship arrows |
| `scripts/validate-drawio.py` | Python script to validate XML structure of any .drawio file |
| `scripts/add-shape.py` | Python CLI to add a new shape to an existing diagram |
| `scripts/README.md` | How to use the scripts with examples |
