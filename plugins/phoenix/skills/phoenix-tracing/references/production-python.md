# Phoenix Tracing: Production Guide (Python)

**CRITICAL: Configure batching, data masking, and span filtering for production deployment.**

## Metadata

| Attribute | Value |
|-----------|-------|
| Priority | Critical - production readiness |
| Impact | Security, Performance |
| Setup Time | 5-15 min |

## Batch Processing

**Enable batch processing for production efficiency.** Batching reduces network overhead by sending spans in groups rather than individually.

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

**Python TraceConfig:**

```python
from phoenix.otel import register
from openinference.instrumentation import TraceConfig

config = TraceConfig(
    hide_inputs=True,
    hide_outputs=True,
    hide_input_messages=True
)
register(trace_config=config)
```

**Precedence:** Code > Environment variables > Defaults

---

## Span Filtering

**Suppress specific code blocks:**

```python
from phoenix.otel import suppress_tracing

with suppress_tracing():
    internal_logging()  # No spans generated
```
