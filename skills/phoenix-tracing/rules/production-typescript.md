# Phoenix Tracing: Production Guide (TypeScript)

**CRITICAL: Configure batching, data masking, and span filtering for production deployment.**

## Metadata

| Attribute | Value |
|-----------|-------|
| Priority | Critical - production readiness |
| Impact | Security, Performance |
| Setup Time | 5-15 min |

## Batch Processing

**Enable batch processing for production efficiency.** Batching reduces network overhead by sending spans in groups rather than individually.

```typescript
import { register } from "@arizeai/phoenix-otel";

const provider = register({
  projectName: "my-app",
  batch: true,  // Production default
});
```

### Shutdown Handling

**CRITICAL:** Spans may not be exported if still queued in the processor when your process exits. Call `provider.shutdown()` to explicitly flush before exit.

```typescript
// Explicit shutdown to flush queued spans
const provider = register({
  projectName: "my-app",
  batch: true,
});

async function main() {
  await doWork();
  await provider.shutdown();  // Flush spans before exit
}

main().catch(async (error) => {
  console.error(error);
  await provider.shutdown();  // Flush on error too
  process.exit(1);
});
```

**Graceful termination signals:**

```typescript
// Graceful shutdown on SIGTERM
const provider = register({
  projectName: "my-server",
  batch: true,
});

process.on("SIGTERM", async () => {
  await provider.shutdown();
  process.exit(0);
});
```

---

## Data Masking (PII Protection)

**Environment variables:**

```bash
export OPENINFERENCE_HIDE_INPUTS=true          # Hide input.value
export OPENINFERENCE_HIDE_OUTPUTS=true         # Hide output.value
export OPENINFERENCE_HIDE_INPUT_MESSAGES=true  # Hide LLM input messages
export OPENINFERENCE_HIDE_OUTPUT_MESSAGES=true # Hide LLM output messages
export OPENINFERENCE_HIDE_INPUT_IMAGES=true    # Hide image content
export OPENINFERENCE_HIDE_INPUT_TEXT=true      # Hide embedding text
export OPENINFERENCE_BASE64_IMAGE_MAX_LENGTH=10000  # Limit image size
```

**TypeScript TraceConfig:**

```typescript
import { register } from "@arizeai/phoenix-otel";
import { OpenAIInstrumentation } from "@arizeai/openinference-instrumentation-openai";

const traceConfig = {
  hideInputs: true,
  hideOutputs: true,
  hideInputMessages: true
};

const instrumentation = new OpenAIInstrumentation({ traceConfig });
```

**Precedence:** Code > Environment variables > Defaults

---

## Span Filtering

**Suppress specific code blocks:**

```typescript
import { suppressTracing } from "@opentelemetry/core";
import { context } from "@opentelemetry/api";

await context.with(suppressTracing(context.active()), async () => {
  internalLogging(); // No spans generated
});
```

**Sampling:**

```bash
export OTEL_TRACES_SAMPLER="parentbased_traceidratio"
export OTEL_TRACES_SAMPLER_ARG="0.1"  # Sample 10%
```

---

## Error Handling

```typescript
import { SpanStatusCode } from "@opentelemetry/api";

try {
  result = await riskyOperation();
  span?.setStatus({ code: SpanStatusCode.OK });
} catch (e) {
  span?.recordException(e);
  span?.setStatus({ code: SpanStatusCode.ERROR });
  throw e;
}
```

---

## Production Checklist

- [ ] Batch processing enabled
- [ ] **Shutdown handling:** Call `provider.shutdown()` before exit to flush queued spans
- [ ] **Graceful termination:** Flush spans on SIGTERM/SIGINT signals
- [ ] Data masking configured (`HIDE_INPUTS`/`HIDE_OUTPUTS` if PII)
- [ ] Span filtering for health checks/noisy paths
- [ ] Error handling implemented
- [ ] Graceful degradation if Phoenix unavailable
- [ ] Performance tested
- [ ] Monitoring configured (Phoenix UI checked)
