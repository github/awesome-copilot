# draw.io Style Reference

Complete reference for the `style` attribute on `<mxCell>` elements. Styles are semicolon-delimited `key=value` pairs.

---

## Style Format

```text
style="key1=value1;key2=value2;key3=value3;"
```

- Keys and values are case-sensitive
- Trailing semicolon is optional but recommended
- Unknown keys are silently ignored
- Missing keys use draw.io defaults

---

## Universal Style Keys

Apply to all shapes and edges.

| Key | Values | Default | Description |
| ----- | -------- | --------- | ------------- |
| `fillColor` | `#hex` / `none` | `#FFFFFF` | Shape fill color (draw.io default; use semantic palette for project diagrams) |
| `strokeColor` | `#hex` / `none` | `#000000` | Border/line color (draw.io default; use semantic palette for project diagrams) |
| `fontColor` | `#hex` | `#000000` | Text color |
| `fontSize` | integer | `11` | Font size in pt |
| `fontStyle` | bitmask (see below) | `0` | Bold/italic/underline |
| `fontFamily` | string | `Helvetica` | Font family name |
| `align` | `left`/`center`/`right` | `center` | Horizontal text alignment |
| `verticalAlign` | `top`/`middle`/`bottom` | `middle` | Vertical text alignment |
| `opacity` | 0–100 | `100` | Shape opacity (%) |
| `shadow` | `0`/`1` | `0` | Drop shadow |
| `dashed` | `0`/`1` | `0` | Dashed border |
| `dashPattern` | e.g. `8 8` | — | Custom dash/gap pattern (px) |
| `strokeWidth` | float | `2` | Border/line width in px |
| `spacing` | integer | `2` | Padding around text (px) |
| `spacingTop` | integer | `0` | Top text padding |
| `spacingBottom` | integer | `0` | Bottom text padding |
| `spacingLeft` | integer | `4` | Left text padding |
| `spacingRight` | integer | `4` | Right text padding |
| `html` | `0`/`1` | `0` | Allow HTML in label |
| `whiteSpace` | `wrap`/`nowrap` | `nowrap` | Text wrapping |
| `overflow` | `visible`/`hidden`/`fill` | `visible` | Text overflow behaviour |
| `rotatable` | `0`/`1` | `1` | Allow rotation in editor |
| `movable` | `0`/`1` | `1` | Allow move in editor |
| `resizable` | `0`/`1` | `1` | Allow resize in editor |
| `deletable` | `0`/`1` | `1` | Allow delete in editor |
| `editable` | `0`/`1` | `1` | Allow label edit in editor |
| `locked` | `0`/`1` | `0` | Lock all editing |
| `nolabel` | `0`/`1` | `0` | Hide label entirely |
| `noLabel` | `0`/`1` | `0` | Alias of `nolabel` |
| `labelPosition` | `left`/`center`/`right` | `center` | Label anchor horizontal |
| `verticalLabelPosition` | `top`/`middle`/`bottom` | `middle` | Label anchor vertical |
| `imageAlign` | `left`/`center`/`right` | `center` | Image alignment |

### `fontStyle` Bitmask Values

| Value | Effect |
| ------- | -------- |
| `0` | Normal |
| `1` | Bold |
| `2` | Italic |
| `4` | Underline |
| `8` | Strikethrough |

Combine by addition: `3` = bold + italic, `5` = bold + underline, `7` = bold + italic + underline.

---

## Shape Keys (Vertex Only)

| Key | Values | Description |
| ----- | -------- | ------------- |
| `shape` | see Shape Catalog | Override default rectangle shape |
| `rounded` | `0`/`1` | Rounded corners on rectangle |
| `arcSize` | 0–50 | Corner radius % (when `rounded=1`) |
| `perimeter` | function name | Connection perimeter type |
| `aspect` | `fixed` | Lock aspect ratio on resize |
| `rotation` | float | Rotation in degrees |
| `fixedSize` | `0`/`1` | Prevent auto-size when editing label |
| `container` | `0`/`1` | Treat shape as container for children |
| `collapsible` | `0`/`1` | Allow collapse/expand toggle |
| `startSize` | integer | Header size in swimlane/container (px) |
| `swimlaneHead` | `0`/`1` | Show swimlane header |
| `swimlaneBody` | `0`/`1` | Show swimlane body |
| `fillOpacity` | 0–100 | Fill-only opacity (independent of `opacity`) |
| `strokeOpacity` | 0–100 | Stroke-only opacity |
| `gradientColor` | `#hex` / `none` | Gradient end color |
| `gradientDirection` | `north`/`south`/`east`/`west` | Gradient direction |
| `sketch` | `0`/`1` | Rough hand-drawn style |
| `comic` | `0`/`1` | Comic/cartoon line style |
| `glass` | `0`/`1` | Glass reflection effect |

---

## Shape Catalog

### Basic Shapes

| Shape | Style String | Visual |
| ------- | ------------- | -------- |
| Rectangle (default) | *(no shape key needed)* | □ |
| Rounded rectangle | `rounded=1;` | ▢ |
| Ellipse / Circle | `ellipse;` | ○ |
| Diamond | `rhombus;` | ◇ |
| Triangle | `triangle;` | △ |
| Hexagon | `shape=hexagon;` | ⬡ |
| Pentagon | `shape=mxgraph.basic.pentagon;` | ⬠ |
| Star | `shape=mxgraph.basic.star;` | ★ |
| Cross | `shape=mxgraph.basic.x;` | ✕ |
| Cloud | `shape=cloud;` | ☁ |
| Note / Callout | `shape=note;folded=1;` | 📝 |
| Document | `shape=document;` | 📄 |
| Cylinder (database) | `shape=cylinder3;` | 🗄 |
| Tape | `shape=tape;` | — |
| Parallelogram | `shape=parallelogram;perimeter=parallelogramPerimeter;` | ▱ |

### Flowchart Shapes (`mxgraph.flowchart.*`)

| Shape | Style String | Used For |
| ------- | ------------- | ---------- |
| Process | `shape=mxgraph.flowchart.process;` | Standard process |
| Start/End (terminal) | `ellipse;` or `shape=mxgraph.flowchart.terminate;` | Flow start/end |
| Decision | `rhombus;` | Yes/No branch |
| Data (I/O) | `shape=mxgraph.flowchart.io;` | Input/Output |
| Predefined Process | `shape=mxgraph.flowchart.predefined_process;` | Subroutine |
| Manual Input | `shape=mxgraph.flowchart.manual_input;` | Manual entry |
| Manual Operation | `shape=mxgraph.flowchart.manual_operation;` | Manual step |
| Database | `shape=mxgraph.flowchart.database;` | Data store |
| Internal Storage | `shape=mxgraph.flowchart.internal_storage;` | Internal data |
| Direct Data | `shape=mxgraph.flowchart.direct_data;` | Drum storage |
| Document | `shape=mxgraph.flowchart.document;` | Document |
| Multi-document | `shape=mxgraph.flowchart.multi-document;` | Multiple docs |
| On-page Connector | `ellipse;` (small) | Page connector |
| Off-page Connector | `shape=mxgraph.flowchart.off_page_connector;` | Off-page ref |
| Preparation | `shape=mxgraph.flowchart.preparation;` | Initialization |
| Delay | `shape=mxgraph.flowchart.delay;` | Wait state |
| Display | `shape=mxgraph.flowchart.display;` | Output display |
| Sort | `shape=mxgraph.flowchart.sort;` | Sort operation |
| Extract | `shape=mxgraph.flowchart.extract;` | Extract operation |
| Merge | `shape=mxgraph.flowchart.merge;` | Merge paths |
| Or | `shape=mxgraph.flowchart.or;` | OR gate |
| And | `shape=mxgraph.flowchart.and;` | AND gate |
| Annotation | `shape=mxgraph.flowchart.annotation;` | Comment/note |

### UML Shapes (`mxgraph.uml.*`)

| Shape | Style String | Used For |
| ------- | ------------- | ---------- |
| Actor | `shape=mxgraph.uml.actor;` | Use-case actor |
| Boundary | `shape=mxgraph.uml.boundary;` | System boundary |
| Control | `shape=mxgraph.uml.control;` | Controller object |
| Entity | `shape=mxgraph.uml.entity;` | Entity object |
| Component | `shape=component;` | Component box |
| Package | `shape=mxgraph.uml.package;` | Package |
| Note | `shape=note;` | UML note |
| Lifeline | `shape=umlLifeline;startSize=40;` | Sequence lifeline |
| Activation | `shape=umlActivation;` | Activation box |
| Destroy | `shape=mxgraph.uml.destroy;` | Destroy marker |
| State | `ellipse;` | State node |
| Initial State | `ellipse;fillColor=#000000;` | UML initial state |
| Final State | `shape=doubleEllipse;fillColor=#000000;` | UML final state |
| Fork/Join | `shape=mxgraph.uml.fork_or_join;` | Fork/join bar |

### Network Shapes (`mxgraph.network.*`)

| Shape | Style String |
| ------- | ------------- |
| Server | `shape=server;` |
| Database server | `shape=mxgraph.network.database;` |
| Firewall | `shape=mxgraph.cisco.firewalls.firewall;` |
| Router | `shape=mxgraph.cisco.routers.router;` |
| Switch | `shape=mxgraph.cisco.switches.workgroup_switch;` |
| Cloud | `shape=cloud;` |
| Internet | `shape=mxgraph.network.internet;` |
| Laptop | `shape=mxgraph.network.laptop;` |
| Desktop | `shape=mxgraph.network.desktop;` |
| Mobile | `shape=mxgraph.network.mobile;` |

### AWS Shapes (`mxgraph.aws4.*`)

Use the AWS4 library. Common shapes:

| Shape | Style String |
| ------- | ------------- |
| EC2 | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.ec2;` |
| Lambda | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.lambda;` |
| S3 | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.s3;` |
| RDS | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.rds;` |
| API Gateway | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.api_gateway;` |
| CloudFront | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.cloudfront;` |
| Load Balancer | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.elb;` |
| SQS | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.sqs;` |
| SNS | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.sns;` |
| DynamoDB | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.dynamodb;` |
| ECS | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.ecs;` |
| EKS | `shape=mxgraph.aws4.resourceIcon;resIcon=mxgraph.aws4.eks;` |
| VPC | `shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_vpc;` |
| Region | `shape=mxgraph.aws4.group;grIcon=mxgraph.aws4.group_region;` |

### Azure Shapes (`mxgraph.azure.*`)

| Shape | Style String |
| ------- | ------------- |
| App Service | `shape=mxgraph.azure.app_service;` |
| Function App | `shape=mxgraph.azure.function_apps;` |
| SQL Database | `shape=mxgraph.azure.sql_database;` |
| Blob Storage | `shape=mxgraph.azure.blob_storage;` |
| API Management | `shape=mxgraph.azure.api_management;` |
| Service Bus | `shape=mxgraph.azure.service_bus;` |
| AKS | `shape=mxgraph.azure.aks;` |
| Container Registry | `shape=mxgraph.azure.container_registry_registries;` |

### GCP Shapes (`mxgraph.gcp2.*`)

| Shape | Style String |
| ------- | ------------- |
| Cloud Run | `shape=mxgraph.gcp2.cloud_run;` |
| Cloud Functions | `shape=mxgraph.gcp2.cloud_functions;` |
| Cloud SQL | `shape=mxgraph.gcp2.cloud_sql;` |
| Cloud Storage | `shape=mxgraph.gcp2.cloud_storage;` |
| GKE | `shape=mxgraph.gcp2.container_engine;` |
| Pub/Sub | `shape=mxgraph.gcp2.cloud_pubsub;` |
| BigQuery | `shape=mxgraph.gcp2.bigquery;` |

---

## Edge Style Keys

| Key | Values | Description |
| ----- | -------- | ------------- |
| `edgeStyle` | see below | Connection routing algorithm |
| `rounded` | `0`/`1` | Rounded corners on orthogonal edges |
| `curved` | `0`/`1` | Curved line segments |
| `orthogonal` | `0`/`1` | Force orthogonal routing |
| `jettySize` | `auto`/integer | Source/target jet size |
| `exitX` | 0.0–1.0 | Source exit point X (0=left, 0.5=center, 1=right) |
| `exitY` | 0.0–1.0 | Source exit point Y (0=top, 0.5=center, 1=bottom) |
| `exitDx` | float | Source exit X offset (px) |
| `exitDy` | float | Source exit Y offset (px) |
| `entryX` | 0.0–1.0 | Target entry point X |
| `entryY` | 0.0–1.0 | Target entry point Y |
| `entryDx` | float | Target entry X offset (px) |
| `entryDy` | float | Target entry Y offset (px) |
| `endArrow` | see Arrow Types | Arrow head at target |
| `startArrow` | see Arrow Types | Arrow tail at source |
| `endFill` | `0`/`1` | Filled end arrow head |
| `startFill` | `0`/`1` | Filled start arrow head |
| `endSize` | integer | End arrow head size (px) |
| `startSize` | integer | Start arrow head size (px) |
| `labelBackgroundColor` | `#hex`/`none` | Label background fill |
| `labelBorderColor` | `#hex`/`none` | Label border color |

### `edgeStyle` Values

| Value | Routing | Use When |
| ------- | --------- | ---------- |
| `none` | Straight line | Simple direct connections |
| `orthogonalEdgeStyle` | Right-angle turns | Flowcharts, architecture |
| `elbowEdgeStyle` | Single elbow | Clean directional diagrams |
| `entityRelationEdgeStyle` | ER-style routing | ER diagrams |
| `segmentEdgeStyle` | Segmented with handles | Fine-tuned routing |
| `isometricEdgeStyle` | Isometric grid | Isometric diagrams |

### Arrow Types (`endArrow` / `startArrow`)

| Value | Shape | Use For |
| ------- | ------- | --------- |
| `block` | Filled triangle | Standard directed arrow |
| `open` | Open chevron → | Open/light arrow |
| `classic` | Classic arrow | Default draw.io arrow |
| `classicThin` | Thin classic | Compact diagrams |
| `none` | No arrowhead | Undirected lines |
| `oval` | Circle dot | Aggregation start |
| `diamond` | Hollow diamond | Aggregation |
| `diamondThin` | Thin diamond | Slim diagrams |
| `ERone` | `\|` bar | ER cardinality "one" |
| `ERmany` | Crow's foot | ER cardinality "many" |
| `ERmandOne` | `\|\|` | ER mandatory one |
| `ERzeroToOne` | `o\|` | ER zero-or-one |
| `ERzeroToMany` | `o<` | ER zero-or-many |
| `ERoneToMany` | `\|<` | ER one-or-many |

---

## Color Palette

### Semantic Colors (Recommended for Consistent Diagrams)

| Meaning | Fill | Stroke | Usage |
| --------- | ------ | -------- | ------- |
| User / Client | `#dae8fc` | `#6c8ebf` | Browser, client apps |
| Service / Process | `#d5e8d4` | `#82b366` | Backend services |
| Database / Storage | `#f5f5f5` | `#666666` | Databases, files |
| Decision / Warning | `#fff2cc` | `#d6b656` | Decision nodes, alerts |
| Error / Critical | `#f8cecc` | `#b85450` | Error paths, critical |
| External / Partner | `#e1d5e7` | `#9673a6` | 3rd party, external |
| Queue / Async | `#ffe6cc` | `#d79b00` | Message queues |
| Gateway / Proxy | `#dae8fc` | `#0050ef` | API gateways, proxies |

### Dark Background Shapes

For dark-themed diagrams, swap to:

- Fill: `#1e4d78` (dark blue), `#1a4731` (dark green)
- Stroke: `#4aa3df`, `#67ab9f`
- Font: `#ffffff`

---

## Complete Style Examples

### Rounded Blue Box

```text
rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;
```

### Green Process Step

```text
rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;
```

### Yellow Decision Diamond

```text
rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;
```

### Red Error Box

```text
rounded=1;whiteSpace=wrap;html=1;fillColor=#f8cecc;strokeColor=#b85450;
```

### Database Cylinder

```text
shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;fillColor=#f5f5f5;strokeColor=#666666;
```

### Swimlane Container

```text
shape=pool;startSize=30;horizontal=1;fillColor=#f5f5f5;strokeColor=#999999;
```

### Swimlane Lane

```text
swimlane;startSize=30;fillColor=#ffffff;strokeColor=#999999;
```

### Orthogonal Connector

```text
edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;
```

### Directed Arrow (bold)

```text
edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;endFill=1;strokeWidth=2;
```

### Dashed Dependency Line

```text
edgeStyle=orthogonalEdgeStyle;dashed=1;endArrow=open;endFill=0;strokeColor=#666666;
```

### ER Relationship Line (one-to-many)

```text
edgeStyle=entityRelationEdgeStyle;html=1;endArrow=ERmany;startArrow=ERmandOne;endFill=1;startFill=1;
```

### UML Inheritance Arrow (hollow triangle)

```text
edgeStyle=orthogonalEdgeStyle;html=1;endArrow=block;endFill=0;
```

### UML Composition (filled diamond)

```text
edgeStyle=orthogonalEdgeStyle;html=1;startArrow=diamond;startFill=1;endArrow=none;
```

### UML Aggregation (open diamond)

```text
edgeStyle=orthogonalEdgeStyle;html=1;startArrow=diamond;startFill=0;endArrow=none;
```

### UML Dependency (dashed arrow)

```text
edgeStyle=orthogonalEdgeStyle;dashed=1;html=1;endArrow=open;endFill=0;
```

### Invisible connector (for alignment)

```text
edgeStyle=none;strokeColor=none;endArrow=none;
```
