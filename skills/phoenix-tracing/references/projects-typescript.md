# Phoenix Tracing: Projects (TypeScript)

**Organize traces by application using projects (Phoenix's top-level grouping).**

## Overview

Projects group traces for a single application or experiment.

**Use for:** Environments (dev/staging/prod), A/B testing, versioning

## Setup

### Environment Variable (Recommended)

```bash
export PHOENIX_PROJECT_NAME="my-app-prod"
```

```typescript
process.env.PHOENIX_PROJECT_NAME = "my-app-prod";
import { register } from "@arizeai/phoenix-otel";
register();  // Uses "my-app-prod"
```

### Code

```typescript
import { register } from "@arizeai/phoenix-otel";
register({ projectName: "my-app-prod" });
```

## Use Cases

**Environments:**
```typescript
// Dev, staging, prod
register({ projectName: "my-app-dev" });
register({ projectName: "my-app-staging" });
register({ projectName: "my-app-prod" });
```

**A/B Testing:**
```typescript
// Compare models
register({ projectName: "chatbot-gpt4" });
register({ projectName: "chatbot-claude" });
```

**Versioning:**
```typescript
// Track versions
register({ projectName: "my-app-v1" });
register({ projectName: "my-app-v2" });
```

## Via HTTP Header (OTEL Collector / config-based tools)

If you cannot set resource attributes in code (e.g. when using an OTEL Collector or another configuration-driven pipeline), set the `x-project-name` HTTP header on OTLP HTTP exports. The header takes precedence over the `openinference.project.name` resource attribute; every span in the request is routed to that project.

```bash
# Via OTEL_EXPORTER_OTLP_HEADERS environment variable
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:6006"
export OTEL_EXPORTER_OTLP_HEADERS="x-project-name=my-project"
```

```yaml
# OTEL Collector otlphttp exporter
exporters:
  otlphttp:
    endpoint: "http://phoenix:6006"
    headers:
      x-project-name: "my-project"
```

> **Note:** `x-project-name` is only supported by the **HTTP** OTLP endpoint (`/v1/traces`). For gRPC, use the `openinference.project.name` resource attribute instead.
