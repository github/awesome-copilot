# Node Types Reference

The `type` field on a node selects its default shape and colour from the active template.
Style overrides in the node's `style` object always win over template defaults.

Choose between `--template flowchart` and `--template architecture` when running the CLI.
The node types available depend on the template selected.

---

## Flowchart template (`--template flowchart`)

Use for: processes, workflows, decision trees, pipelines, sequences, state machines.

| `type`       | Shape                      | Fill colour   | Stroke colour | Use when |
|--------------|----------------------------|---------------|---------------|----------|
| `start`      | Ellipse                    | `#e7f5ff`     | `#1971c2`     | Entry point, trigger, user, actor, system that initiates the flow |
| `end`        | Ellipse                    | `#fff0f6`     | `#c2255c`     | Terminal state, result, final output, error termination |
| `process`    | Rectangle (rounded)        | `#d0bfff`     | `#7048e8`     | Task, action, step, operation, computation |
| `decision`   | Rectangle (dashed, orange) | `#ffd8a8`     | `#e8590c`     | Branch point, condition check, yes/no gate, switch |
| `io`         | Rectangle (rounded)        | `#e3fafc`     | `#0c8599`     | Input/output operation — reading a file, API call, user prompt |
| `subprocess` | Rectangle (rounded)        | `#d3f9d8`     | `#40c057`     | Encapsulated sub-process, called function, external routine |

> **No diamond shape**: Excalidraw raw JSON has no working `diamond` element type.
> `decision` nodes render as dashed orange rectangles — this is the standard approach.

**Default** (unknown or omitted `type`): plain purple rectangle — same appearance as `process`.

---

## Architecture template (`--template architecture`)

Use for: system diagrams, infrastructure maps, service topology, data flow between components.

| `type`        | Shape                       | Fill colour   | Stroke colour | Use when |
|---------------|-----------------------------|---------------|---------------|----------|
| `service`     | Rectangle (rounded)         | `#d0bfff`     | `#7048e8`     | Microservice, backend application, internal service |
| `api`         | Rectangle (rounded)         | `#d0bfff`     | `#7048e8`     | REST API, GraphQL server, gRPC endpoint |
| `db`          | Rectangle (rounded)         | `#b2f2bb`     | `#2f9e44`     | Relational database (PostgreSQL, MySQL, SQLite) |
| `database`    | Rectangle (rounded)         | `#b2f2bb`     | `#2f9e44`     | Alias for `db` |
| `queue`       | Rectangle (rounded)         | `#fff3bf`     | `#fab005`     | Message queue or broker (Kafka, RabbitMQ, SQS, PubSub) |
| `cache`       | Rectangle (rounded)         | `#ffe8cc`     | `#fd7e14`     | Cache layer (Redis, Memcached, CDN edge cache) |
| `storage`     | Rectangle (rounded)         | `#ffec99`     | `#f08c00`     | Object/blob/file storage (S3, GCS, Azure Blob) |
| `frontend`    | Rectangle (rounded)         | `#a5d8ff`     | `#1971c2`     | Web app, SPA, mobile client, desktop app |
| `gateway`     | Rectangle (bold, rounded)   | `#ffa8a8`     | `#c92a2a`     | API gateway, load balancer, reverse proxy, ingress |
| `orchestrator`| Rectangle (bold, rounded)   | `#ffa8a8`     | `#c92a2a`     | Container orchestrator (Kubernetes, Nomad, Docker Swarm) |
| `user`        | Ellipse                     | `#e7f5ff`     | `#1971c2`     | Human actor, end user, client operator |
| `actor`       | Ellipse                     | `#e7f5ff`     | `#1971c2`     | Alias for `user` |
| `external`    | Rectangle (rounded)         | `#ffc9c9`     | `#e03131`     | Third-party service, external SaaS, outside system boundary |
| `monitor`     | Rectangle (rounded)         | `#d3f9d8`     | `#40c057`     | Monitoring, logging, alerting, observability (Datadog, Prometheus) |
| `ml`          | Rectangle (rounded)         | `#e599f7`     | `#9c36b5`     | ML model, training pipeline, inference service |
| `ai`          | Rectangle (rounded)         | `#e599f7`     | `#9c36b5`     | Alias for `ml` |

**Default** (unknown or omitted `type`): pale grey rectangle (`#f8f9fa` / `#495057`).

---

## Cross-template type compatibility

Both templates accept any `type` string. If the type is not in the template's
registry, the default node style is used. This means:

- You can use `start`/`end` on an architecture diagram — they'll render with the
  architecture template's default style.
- You can use `service` on a flowchart — it'll render as a plain purple rectangle.

When in doubt, pick the template that matches the majority of your node types.

---

## Quick-pick guide

| What you're modelling | Recommended type |
|-----------------------|-----------------|
| User / human actor    | `start` (flowchart) or `user` (architecture) |
| API call / service    | `io` (flowchart) or `api` / `service` (architecture) |
| Database              | `subprocess` (flowchart) or `db` (architecture) |
| Cache                 | `subprocess` (flowchart) or `cache` (architecture) |
| Condition / branch    | `decision` (both templates) |
| Success terminal      | `end` with green style override |
| Failure terminal      | `end` with red + dashed style override |
| External dependency   | `external` (architecture) |
| Queue / async step    | `queue` (architecture) or `io` (flowchart) |
