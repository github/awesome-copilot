# draw.io XML Schema Reference

Complete reference for the `.drawio` file format (mxGraph XML). Use this when generating, parsing, or validating diagram files.

---

## Top-Level Structure

Every `.drawio` file is XML with this root structure:

```xml
<!-- Set modified to the current ISO 8601 timestamp when generating a new file -->
<mxfile host="Electron" modified=""
        agent="draw.io" version="26.0.0" type="device">
  <diagram id="<unique-id>" name="<Page Name>">
    <mxGraphModel ...attributes...>
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <!-- All content cells here -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

### `<mxfile>` Attributes

| Attribute | Required | Default | Description |
| ----------- | ---------- | --------- | ------------- |
| `host` | No | `"app.diagrams.net"` | Origin editor (`"Electron"` for desktop/VS Code) |
| `modified` | No | — | ISO 8601 timestamp |
| `agent` | No | — | User agent string |
| `version` | No | — | draw.io version |
| `type` | No | `"device"` | Storage type |

### `<diagram>` Attributes

| Attribute | Required | Description |
| ----------- | ---------- | ------------- |
| `id` | Yes | Unique page identifier (any string) |
| `name` | Yes | Tab label shown in editor |

### `<mxGraphModel>` Attributes

| Attribute | Type | Default | Description |
| ----------- | ------ | --------- | ------------- |
| `dx` | int | `1422` | Scroll X offset |
| `dy` | int | `762` | Scroll Y offset |
| `grid` | `0`/`1` | `1` | Show grid |
| `gridSize` | int | `10` | Grid snap size in px |
| `guides` | `0`/`1` | `1` | Show alignment guides |
| `tooltips` | `0`/`1` | `1` | Enable tooltips |
| `connect` | `0`/`1` | `1` | Enable connection arrows on hover |
| `arrows` | `0`/`1` | `1` | Show directional arrows |
| `fold` | `0`/`1` | `1` | Enable group fold/collapse |
| `page` | `0`/`1` | `1` | Show page boundary |
| `pageScale` | float | `1` | Page zoom scale |
| `pageWidth` | int | `1169` | Page width in px (A4 landscape) |
| `pageHeight` | int | `827` | Page height in px (A4 landscape) |
| `math` | `0`/`1` | `0` | Enable LaTeX math rendering |
| `shadow` | `0`/`1` | `0` | Global shadow on shapes |

**Common page sizes (px at 96dpi):**

| Format | Width | Height |
| -------- | ------- | -------- |
| A4 landscape | `1169` | `827` |
| A4 portrait | `827` | `1169` |
| A3 landscape | `1654` | `1169` |
| Letter landscape | `1100` | `850` |
| Letter portrait | `850` | `1100` |
| Screen (16:9) | `1654` | `931` |

---

## Reserved Cells (Always Required)

```xml
<mxCell id="0" />                 <!-- Root cell — never omit, never add attributes -->
<mxCell id="1" parent="0" />     <!-- Default layer — all cells are children of this -->
```

These two cells MUST be the first entries inside `<root>`. IDs `0` and `1` are reserved and must not be used for any other cell.

---

## Vertex (Shape) Element

```xml
<mxCell
  id="2"
  value="Label Text"
  style="rounded=1;whiteSpace=wrap;html=1;"
  vertex="1"
  parent="1">
  <mxGeometry x="200" y="160" width="120" height="60" as="geometry" />
</mxCell>
```

### `<mxCell>` Vertex Attributes

| Attribute | Required | Type | Description |
| ----------- | ---------- | ------ | ------------- |
| `id` | Yes | string | Unique identifier within this diagram |
| `value` | Yes | string | Label text (HTML allowed if style has `html=1`) |
| `style` | Yes | string | Semicolon-delimited key=value style string |
| `vertex` | Yes | `"1"` | Must be `"1"` to declare this as a shape |
| `parent` | Yes | string | Parent cell ID (`"1"` for default layer) |

### `<mxGeometry>` Vertex Attributes

| Attribute | Required | Type | Description |
| ----------- | ---------- | ------ | ------------- |
| `x` | Yes | float | Left edge of shape (px from canvas origin) |
| `y` | Yes | float | Top edge of shape (px from canvas origin) |
| `width` | Yes | float | Shape width in px |
| `height` | Yes | float | Shape height in px |
| `as` | Yes | `"geometry"` | Always `"geometry"` |

---

## Edge (Connector) Element

```xml
<mxCell
  id="5"
  value="Label"
  style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;"
  edge="1"
  source="2"
  target="3"
  parent="1">
  <mxGeometry relative="1" as="geometry" />
</mxCell>
```

### `<mxCell>` Edge Attributes

| Attribute | Required | Type | Description |
| ----------- | ---------- | ------ | ------------- |
| `id` | Yes | string | Unique identifier |
| `value` | Yes | string | Connector label (empty string for no label) |
| `style` | Yes | string | Style string (see Edge Styles) |
| `edge` | Yes | `"1"` | Must be `"1"` to declare as connector |
| `source` | No | string | ID of source vertex |
| `target` | No | string | ID of target vertex |
| `parent` | Yes | string | Parent cell ID (usually `"1"`) |

### `<mxGeometry>` Edge Attributes

| Attribute | Required | Type | Description |
| ----------- | ---------- | ------ | ------------- |
| `relative` | No | `"1"` | Always `"1"` for edges |
| `as` | Yes | `"geometry"` | Always `"geometry"` |

### Edge with Label Offset

```xml
<mxGeometry x="-0.1" y="10" relative="1" as="geometry">
  <mxPoint as="offset" />
</mxGeometry>
```

The `x` on relative geometry moves the label along the edge (-1 to 1). `y` is perpendicular offset in px.

### Edge with Manual Waypoints (Control Points)

```xml
<mxGeometry relative="1" as="geometry">
  <Array as="points">
    <mxPoint x="340" y="80" />
    <mxPoint x="340" y="200" />
  </Array>
</mxGeometry>
```

---

## Multi-Page Diagrams

```xml
<mxfile>
  <diagram id="page-1" name="Overview">
    <mxGraphModel>...</mxGraphModel>
  </diagram>
  <diagram id="page-2" name="Detail">
    <mxGraphModel>...</mxGraphModel>
  </diagram>
</mxfile>
```

Each `<diagram>` is a separate page/tab. Cell IDs are scoped to their own `<diagram>` — the same ID value can appear in different pages without conflict.

---

## Layer Cells

Layers replace the default `id="1"` layer. Cells are assigned to a layer via `parent`:

```xml
<mxCell id="0" />
<mxCell id="1" value="Background" parent="0" />        <!-- layer 1 -->
<mxCell id="layer2" value="Services" parent="0" />     <!-- layer 2 -->
<mxCell id="layer3" value="Connectors" parent="0" />   <!-- layer 3 -->

<!-- Assign layer via parent attribute -->
<mxCell id="10" value="API" ... parent="layer2">
  <mxGeometry ... />
</mxCell>
```

Toggle layer visibility:

```xml
<mxCell id="layer2" value="Services" parent="0" visible="0" />
```

---

## Swimlane Container

```xml
<!-- Swimlane container -->
<mxCell id="swim1" value="Process" style="shape=pool;startSize=30;horizontal=1;" 
        vertex="1" parent="1">
  <mxGeometry x="40" y="40" width="800" height="340" as="geometry" />
</mxCell>

<!-- Lane 1 (child of swimlane container) -->
<mxCell id="lane1" value="Customer" style="swimlane;startSize=30;" 
        vertex="1" parent="swim1">
  <mxGeometry x="0" y="30" width="800" height="150" as="geometry" />
</mxCell>

<!-- Shape inside lane (child of lane) -->
<mxCell id="step1" value="Place Order" style="rounded=1;whiteSpace=wrap;html=1;" 
        vertex="1" parent="lane1">
  <mxGeometry x="80" y="50" width="120" height="60" as="geometry" />
</mxCell>
```

> **Key**: Cells inside a swimlane have `parent` set to the **lane's ID**, not `"1"`.  
> Coordinates inside lanes are **relative to the lane origin**.

---

## Group Cells

```xml
<!-- Invisible group container -->
<mxCell id="group1" value="" style="group;" vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="300" height="200" as="geometry" />
</mxCell>

<!-- Children relative to group origin -->
<mxCell id="child1" value="A" style="rounded=1;" vertex="1" parent="group1">
  <mxGeometry x="20" y="20" width="100" height="60" as="geometry" />
</mxCell>
```

---

## HTML Labels

When `html=1` is in the style, `value` can contain HTML:

```xml
<mxCell value="&lt;b&gt;OrderService&lt;/b&gt;&lt;br&gt;&lt;i&gt;:8080&lt;/i&gt;"
        style="rounded=1;html=1;" vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="160" height="60" as="geometry" />
</mxCell>
```

HTML must be XML-escaped:

- `<` → `&lt;`
- `>` → `&gt;`
- `&` → `&amp;`
- `"` → `&quot;`

Common HTML tags supported: `<b>`, `<i>`, `<u>`, `<br>`, `<font color="#hex">`, `<span style="...">`, `<hr/>`

---

## Tooltip / Metadata

```xml
<mxCell value="Service Name" tooltip="Handles order processing" style="..." vertex="1" parent="1">
  <mxGeometry ... />
</mxCell>
```

---

## ID Generation Rules

| Rule | Detail |
| ------ | -------- |
| IDs `0` and `1` | Reserved — always the root and default layer |
| All other IDs | Must be unique within their `<diagram>` |
| Safe pattern | Sequential integers starting at `2`, or UUID strings |
| Cross-page | IDs do not need to be unique across different `<diagram>` pages |

**Safe sequential ID example:**

```text
id="2", id="3", id="4", ...
```

**UUID-style example:**

```text
id="a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

---

## Coordinate System

- Origin `(0, 0)` is **top-left** of the canvas
- `x` increases **rightward**
- `y` increases **downward**
- All units are **pixels**

---

## Recommended Spacing

| Context | Value |
| --------- | ------- |
| Minimum gap between shapes | `40px` |
| Comfortable gap | `80px` |
| Swimlane inner padding | `20px` |
| Page margin from edge | `40px` |
| Connector routing clearance | `10px` |

---

## Minimal Valid `.drawio` File

```xml
<mxfile host="Electron" modified="2026-03-25T00:00:00.000Z" version="26.0.0">
  <diagram id="main" name="Page-1">
    <mxGraphModel dx="1422" dy="762" grid="1" gridSize="10" guides="1"
                  tooltips="1" connect="1" arrows="1" fold="1"
                  page="1" pageScale="1" pageWidth="1169" pageHeight="827"
                  math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

---

## Validation Rules

### Must Pass

- [ ] `id="0"` and `id="1"` cells always present as first two children of `<root>`
- [ ] No other cell uses `id="0"` or `id="1"`
- [ ] All `id` values are unique within each `<diagram>`
- [ ] Every `<mxCell>` has exactly one `<mxGeometry>` child
- [ ] `<mxGeometry>` has `as="geometry"` attribute
- [ ] Vertex cells have `vertex="1"`, edge cells have `edge="1"`
- [ ] Edge `source`/`target` IDs reference existing vertex IDs in the same diagram
- [ ] Swimlane children have `parent` set to the swimlane/lane ID, not `"1"`
- [ ] HTML in `value` attributes is XML-escaped

### Recommended

- [ ] Shapes do not overlap unless intentional (use ≥40px gap)
- [ ] Edge labels are short (≤4 words)
- [ ] Layer cells have descriptive `value` names
- [ ] All shapes fit within `pageWidth` × `pageHeight` bounds
