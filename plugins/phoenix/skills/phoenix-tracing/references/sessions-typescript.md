# Sessions (TypeScript)

Track multi-turn conversations by grouping traces with session IDs. **Use `withSpan` directly from `@arizeai/openinference-core`** - no wrappers or custom utilities needed.

## Core Concept

**Session Pattern:**
1. Generate a unique `session.id` once at application startup
2. Export SESSION_ID, import `withSpan` where needed
3. Use `withSpan` to create a parent CHAIN span with `session.id` for each interaction
4. All child spans (LLM, TOOL, AGENT, etc.) automatically group under the parent
5. Query traces by `session.id` in Phoenix to see all interactions

## Implementation (Best Practice)

### 1. Setup (instrumentation.ts)

```typescript
import { register } from "@arizeai/phoenix-otel";
import { randomUUID } from "node:crypto";

// Initialize Phoenix
register({
  projectName: "your-app",
  url: process.env.PHOENIX_COLLECTOR_ENDPOINT || "http://localhost:6006",
  apiKey: process.env.PHOENIX_API_KEY,
  batch: true,
});

// Generate and export session ID
export const SESSION_ID = randomUUID();
```

### 2. Usage (app code)

```typescript
import { withSpan } from "@arizeai/openinference-core";
import { SESSION_ID } from "./instrumentation";

// Use withSpan directly - no wrapper needed
const handleInteraction = withSpan(
  async () => {
    const result = await agent.generate({ prompt: userInput });
    return result;
  },
  {
    name: "cli.interaction",
    kind: "CHAIN",
    attributes: { "session.id": SESSION_ID },
  }
);

// Call it
const result = await handleInteraction();
```

### With Input Parameters

```typescript
const processQuery = withSpan(
  async (query: string) => {
    return await agent.generate({ prompt: query });
  },
  {
    name: "process.query",
    kind: "CHAIN",
    attributes: { "session.id": SESSION_ID },
  }
);

await processQuery("What is 2+2?");
```

## Key Points

### Session ID Scope
- **CLI/Desktop Apps**: Generate once at process startup
- **Web Servers**: Generate per-user session (e.g., on login, store in session storage)
- **Stateless APIs**: Accept session.id as a parameter from client

### Span Hierarchy
```
cli.interaction (CHAIN) ← session.id here
├── ai.generateText (AGENT)
│   ├── ai.generateText.doGenerate (LLM)
│   └── ai.toolCall (TOOL)
└── ai.generateText.doGenerate (LLM)
```

The `session.id` is only set on the **root span**. Child spans are automatically grouped by the trace hierarchy.

### Querying Sessions

```bash
# Get all traces for a session
npx @arizeai/phoenix-cli traces \
  --endpoint http://localhost:6006 \
  --project your-app \
  --format raw \
  --no-progress | \
  jq '.[] | select(.spans[0].attributes["session.id"] == "YOUR-SESSION-ID")'
```

## Dependencies

```json
{
  "dependencies": {
    "@arizeai/openinference-core": "^2.0.5",
    "@arizeai/phoenix-otel": "^0.4.1"
  }
}
```

**Note:** `@opentelemetry/api` is NOT needed - it's only for manual span management.

## Why This Pattern?

1. **Simple**: Just export SESSION_ID, use withSpan directly - no wrappers
2. **Built-in**: `withSpan` from `@arizeai/openinference-core` handles everything
3. **Type-safe**: Preserves function signatures and type information
4. **Automatic lifecycle**: Handles span creation, error tracking, and cleanup
5. **Framework-agnostic**: Works with any LLM framework (AI SDK, LangChain, etc.)
6. **No extra deps**: Don't need `@opentelemetry/api` or custom utilities

## Adding More Attributes

```typescript
import { withSpan } from "@arizeai/openinference-core";
import { SESSION_ID } from "./instrumentation";

const handleWithContext = withSpan(
  async (userInput: string) => {
    return await agent.generate({ prompt: userInput });
  },
  {
    name: "cli.interaction",
    kind: "CHAIN",
    attributes: {
      "session.id": SESSION_ID,
      "user.id": userId,              // Track user
      "metadata.environment": "prod",  // Custom metadata
    },
  }
);
```

## Anti-Pattern: Don't Create Wrappers

❌ **Don't do this:**
```typescript
// Unnecessary wrapper
export function withSessionTracking(fn) {
  return withSpan(fn, { attributes: { "session.id": SESSION_ID } });
}
```

✅ **Do this instead:**
```typescript
// Use withSpan directly
import { withSpan } from "@arizeai/openinference-core";
import { SESSION_ID } from "./instrumentation";

const handler = withSpan(fn, {
  attributes: { "session.id": SESSION_ID }
});
```

## Alternative: Context API Pattern

For web servers or complex async flows where you need to propagate session IDs through middleware, you can use the Context API:

```typescript
import { context } from "@opentelemetry/api";
import { setSession } from "@arizeai/openinference-core";

await context.with(
  setSession(context.active(), { sessionId: "user_123_conv_456" }),
  async () => {
    const response = await llm.invoke(prompt);
  }
);
```

**Use Context API when:**
- Building web servers with middleware chains
- Session ID needs to flow through many async boundaries
- You don't control the call stack (e.g., framework-provided handlers)

**Use withSpan when:**
- Building CLI apps or scripts
- You control the function call points
- Simpler, more explicit code is preferred

## Related

- `fundamentals-universal-attributes.md` - Other universal attributes (user.id, metadata)
- `span-chain.md` - CHAIN span specification
- `sessions-python.md` - Python session tracking patterns
