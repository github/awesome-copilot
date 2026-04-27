# Examples

Copy-paste ready examples covering the most common diagram types.
All examples are valid input files ready to pass to the CLI.

---

## 1 — Minimal flowchart (JSON)

The simplest valid diagram.

```bash
npx excalidraw-gen generate login.json --template flowchart --out login.excalidraw
```

```json
{
  "type": "flowchart",
  "title": "Login Flow",
  "nodes": [
    { "id": "user",      "label": "User",                "type": "start" },
    { "id": "form",      "label": "Login Form",          "type": "process" },
    { "id": "check",     "label": "Valid credentials?",  "type": "decision" },
    { "id": "dashboard", "label": "Dashboard",           "type": "end" },
    { "id": "error",     "label": "Error Page",          "type": "end" }
  ],
  "edges": [
    { "from": "user",  "to": "form" },
    { "from": "form",  "to": "check",     "label": "Submit" },
    { "from": "check", "to": "dashboard", "label": "Valid" },
    { "from": "check", "to": "error",     "label": "Invalid" }
  ]
}
```

---

## 2 — Styled flowchart with semantic colours (JSON)

Uses green/red colour coding for success and failure paths.

```bash
npx excalidraw-gen generate payment.json --template flowchart --out payment.excalidraw
```

```json
{
  "type": "flowchart",
  "title": "Payment Processing",
  "nodes": [
    {
      "id": "customer",
      "label": "Customer",
      "type": "start",
      "style": { "backgroundColor": "#a5d8ff", "strokeColor": "#1971c2", "shape": "ellipse" }
    },
    { "id": "checkout", "label": "Checkout Form", "type": "process" },
    {
      "id": "validate",
      "label": "Card Valid?",
      "type": "decision",
      "style": { "strokeWidth": 3 }
    },
    {
      "id": "charge",
      "label": "Charge Gateway",
      "type": "process",
      "style": { "backgroundColor": "#fff3bf", "strokeColor": "#f08c00", "width": 200 }
    },
    {
      "id": "success",
      "label": "Order Confirmed",
      "type": "end",
      "style": { "backgroundColor": "#b2f2bb", "strokeColor": "#2f9e44", "strokeWidth": 3 }
    },
    {
      "id": "fail",
      "label": "Payment Failed",
      "type": "end",
      "style": { "backgroundColor": "#ffc9c9", "strokeColor": "#c92a2a", "strokeStyle": "dashed" }
    }
  ],
  "edges": [
    { "from": "customer", "to": "checkout" },
    { "from": "checkout", "to": "validate", "label": "Submit" },
    { "from": "validate", "to": "charge",  "label": "Valid",   "style": { "strokeColor": "#2f9e44" } },
    { "from": "validate", "to": "fail",    "label": "Invalid", "style": { "strokeColor": "#c92a2a", "strokeStyle": "dashed" } },
    { "from": "charge",   "to": "success", "label": "Approved","style": { "strokeColor": "#2f9e44" } },
    { "from": "charge",   "to": "fail",    "label": "Declined","style": { "strokeColor": "#c92a2a", "strokeStyle": "dashed" } }
  ]
}
```

---

## 3 — Architecture diagram (JSON)

Service map for a 3-tier web application.

```bash
npx excalidraw-gen generate arch.json --template architecture --out arch.excalidraw
```

```json
{
  "type": "architecture",
  "title": "3-Tier Web App",
  "nodes": [
    { "id": "browser",      "label": "Browser",         "type": "user" },
    { "id": "cdn",          "label": "CDN",             "type": "external" },
    { "id": "gateway",      "label": "API Gateway",     "type": "gateway" },
    { "id": "auth",         "label": "Auth Service",    "type": "service" },
    { "id": "app",          "label": "App Service",     "type": "service" },
    { "id": "redis",        "label": "Redis Cache",     "type": "cache" },
    { "id": "postgres",     "label": "PostgreSQL",      "type": "db" },
    { "id": "s3",           "label": "S3 Storage",      "type": "storage" }
  ],
  "edges": [
    { "from": "browser",  "to": "cdn",      "label": "static assets" },
    { "from": "browser",  "to": "gateway",  "label": "HTTPS" },
    { "from": "gateway",  "to": "auth",     "label": "auth" },
    { "from": "gateway",  "to": "app",      "label": "route" },
    { "from": "app",      "to": "redis",    "label": "cache" },
    { "from": "app",      "to": "postgres", "label": "query" },
    { "from": "app",      "to": "s3",       "label": "files" }
  ]
}
```

---

## 4 — CI/CD pipeline (YAML)

Demonstrates YAML input format and conditional branching.

```bash
npx excalidraw-gen generate pipeline.yaml --out pipeline.excalidraw
```

```yaml
type: flowchart
title: CI/CD Pipeline

nodes:
  - id: dev
    label: Developer
    type: start
    style:
      backgroundColor: "#a5d8ff"
      strokeColor: "#1971c2"
      shape: ellipse

  - id: push
    label: Git Push
    type: process

  - id: ci
    label: CI Build & Test
    type: process
    style:
      backgroundColor: "#d0bfff"
      strokeColor: "#7048e8"
      width: 200

  - id: gate
    label: Quality Gate
    type: decision
    style:
      strokeStyle: dashed
      strokeWidth: 3

  - id: staging
    label: Deploy to Staging
    type: process
    style:
      backgroundColor: "#fff3bf"
      strokeColor: "#f08c00"

  - id: approve
    label: Manual Approval
    type: decision
    style:
      backgroundColor: "#ffe8cc"
      strokeColor: "#fd7e14"
      strokeStyle: dashed

  - id: prod
    label: Deploy to Production
    type: end
    style:
      backgroundColor: "#b2f2bb"
      strokeColor: "#2f9e44"
      strokeWidth: 3

  - id: fail
    label: Notify & Fail
    type: end
    style:
      backgroundColor: "#ffc9c9"
      strokeColor: "#c92a2a"
      strokeStyle: dashed

edges:
  - from: dev
    to: push

  - from: push
    to: ci
    label: trigger

  - from: ci
    to: gate
    label: results

  - from: gate
    to: staging
    label: Pass
    style:
      strokeColor: "#2f9e44"

  - from: gate
    to: fail
    label: Fail
    style:
      strokeColor: "#c92a2a"
      strokeStyle: dashed

  - from: staging
    to: approve

  - from: approve
    to: prod
    label: Approved
    style:
      strokeColor: "#2f9e44"
      strokeWidth: 2

  - from: approve
    to: fail
    label: Rejected
    style:
      strokeColor: "#c92a2a"
      strokeStyle: dashed
```

---

## 5 — ML inference architecture (JSON + dark theme)

```bash
npx excalidraw-gen generate ml.json --template architecture --theme dark --out ml.excalidraw
```

```json
{
  "type": "architecture",
  "title": "ML Inference Platform",
  "nodes": [
    { "id": "client",    "label": "Client App",          "type": "frontend" },
    { "id": "gateway",   "label": "API Gateway",         "type": "gateway" },
    { "id": "router",    "label": "Request Router",      "type": "service" },
    { "id": "model_a",   "label": "Model A (v2)",        "type": "ml" },
    { "id": "model_b",   "label": "Model B (v3-beta)",   "type": "ml" },
    { "id": "cache",     "label": "Result Cache",        "type": "cache" },
    { "id": "store",     "label": "Model Registry",      "type": "storage" },
    { "id": "monitor",   "label": "Metrics & Logging",   "type": "monitor" }
  ],
  "edges": [
    { "from": "client",  "to": "gateway",  "label": "predict" },
    { "from": "gateway", "to": "router",   "label": "route" },
    { "from": "router",  "to": "cache",    "label": "check cache" },
    { "from": "router",  "to": "model_a",  "label": "stable" },
    { "from": "router",  "to": "model_b",  "label": "canary 10%" },
    { "from": "model_a", "to": "monitor",  "label": "metrics" },
    { "from": "model_b", "to": "monitor",  "label": "metrics" },
    { "from": "store",   "to": "model_a",  "label": "weights", "bidirectional": true },
    { "from": "store",   "to": "model_b",  "label": "weights", "bidirectional": true }
  ]
}
```

---

## 6 — Grid layout (JSON)

Grid layout is best for unordered collections with no hierarchy.

```bash
npx excalidraw-gen generate components.json --layout grid --out components.excalidraw
```

```json
{
  "type": "architecture",
  "title": "Service Inventory",
  "nodes": [
    { "id": "auth",     "label": "Auth Service",     "type": "service" },
    { "id": "billing",  "label": "Billing Service",  "type": "service" },
    { "id": "notify",   "label": "Notification Svc", "type": "service" },
    { "id": "search",   "label": "Search Service",   "type": "service" },
    { "id": "profile",  "label": "Profile Service",  "type": "service" },
    { "id": "upload",   "label": "Upload Service",   "type": "service" }
  ],
  "edges": []
}
```
