# Phoenix Tracing: Python Setup

**Setup Phoenix tracing in Python with `arize-phoenix-otel`.**

## Metadata

| Attribute  | Value                               |
| ---------- | ----------------------------------- |
| Priority   | Critical - required for all tracing |
| Setup Time | <5 min                              |

## Quick Start (3 lines)

```python
from phoenix.otel import register
register(project_name="my-app", auto_instrument=True)
```

**Connects to `http://localhost:6006`, auto-instruments all supported libraries.**

## Installation

```bash
pip install arize-phoenix-otel
```

**Supported:** Python 3.10-3.13

## Configuration

### Environment Variables (Recommended)

```bash
export PHOENIX_API_KEY="your-api-key"  # Required for Phoenix Cloud
export PHOENIX_COLLECTOR_ENDPOINT="http://localhost:6006"  # Or Cloud URL
export PHOENIX_PROJECT_NAME="my-app"  # Optional
```

### Python Code

```python
from phoenix.otel import register

tracer_provider = register(
    project_name="my-app",              # Project name
    endpoint="http://localhost:6006",   # Phoenix endpoint
    auto_instrument=True,               # Auto-instrument supported libs
    batch=True,                         # Batch processing (default: True)
)
```

**Parameters:**

- `project_name`: Project name (overrides `PHOENIX_PROJECT_NAME`)
- `endpoint`: Phoenix URL (overrides `PHOENIX_COLLECTOR_ENDPOINT`)
- `auto_instrument`: Enable auto-instrumentation (default: False)
- `batch`: Use BatchSpanProcessor (default: True, production-recommended)
- `protocol`: `"http/protobuf"` (default) or `"grpc"`

## Auto-Instrumentation

Install instrumentors for your frameworks:

```bash
pip install openinference-instrumentation-openai      # OpenAI SDK
pip install openinference-instrumentation-langchain   # LangChain
pip install openinference-instrumentation-llama-index # LlamaIndex
# ... install others as needed
```

Then enable auto-instrumentation:

```python
register(project_name="my-app", auto_instrument=True)
```

Phoenix discovers and instruments all installed OpenInference packages automatically.

## Batch Processing (Production)

Enabled by default. Configure via environment variables:

```bash
export OTEL_BSP_SCHEDULE_DELAY=5000           # Batch every 5s
export OTEL_BSP_MAX_QUEUE_SIZE=2048           # Queue 2048 spans
export OTEL_BSP_MAX_EXPORT_BATCH_SIZE=512     # Send 512 spans/batch
```

**Link:** https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/

## Verification

1. Open Phoenix UI: `http://localhost:6006`
2. Navigate to your project
3. Run your application
4. Check for traces (appear within batch delay)

## Troubleshooting

**No traces:**

- Verify `PHOENIX_COLLECTOR_ENDPOINT` matches Phoenix server
- Set `PHOENIX_API_KEY` for Phoenix Cloud
- Confirm instrumentors installed

**Missing attributes:**

- Check span kind (see rules/ directory)
- Verify attribute names (see rules/ directory)

## Example

```python
from phoenix.otel import register
from openai import OpenAI

# Enable tracing with auto-instrumentation
register(project_name="my-chatbot", auto_instrument=True)

# OpenAI automatically instrumented
client = OpenAI()
response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

## API Reference

- [Python OTEL API Docs](https://arize-phoenix.readthedocs.io/projects/otel/en/latest/)
- [Python Client API Docs](https://arize-phoenix.readthedocs.io/projects/client/en/latest/)
