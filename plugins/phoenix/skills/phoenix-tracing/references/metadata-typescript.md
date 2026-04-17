# Phoenix Tracing: Custom Metadata (TypeScript)

Add custom attributes to spans for richer observability.

## Using Context (Propagates to All Child Spans)

```typescript
import { context } from "@arizeai/phoenix-otel";
import { setMetadata } from "@arizeai/openinference-core";

context.with(
  setMetadata(context.active(), {
    experiment_id: "exp_123",
    model_version: "gpt-4-1106-preview",
    environment: "production",
  }),
  async () => {
    // All spans created within this block will have:
    // "metadata" = '{"experiment_id": "exp_123", ...}'
    await myApp.run(query);
  }
);
```

## On a Single Span

```typescript
import { traceChain } from "@arizeai/openinference-core";
import { trace } from "@arizeai/phoenix-otel";

const myFunction = traceChain(
  async (input: string) => {
    const span = trace.getActiveSpan();

    span?.setAttribute(
      "metadata",
      JSON.stringify({
        experiment_id: "exp_123",
        model_version: "gpt-4-1106-preview",
        environment: "production",
      })
    );

    return result;
  },
  { name: "my-function" }
);

await myFunction("hello");
```
