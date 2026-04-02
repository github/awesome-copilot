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
