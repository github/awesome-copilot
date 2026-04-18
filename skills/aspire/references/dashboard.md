# Dashboard — Complete Reference

The Aspire Dashboard provides real-time observability for all resources in your distributed application. It launches automatically with `aspire run` and can also run standalone.

---

## Features

### Resources view

Displays all resources (projects, containers, executables) with:

- **Name** and **type** (Project, Container, Executable)
- **State** (Starting, Running, Stopped, FailedToStart, etc.)
- **Start time** and **uptime**
- **Endpoints** — clickable URLs for each exposed endpoint
- **Source** — project path, container image, or executable path
- **Actions** — Stop, Start, Restart buttons

### Console logs

Aggregated raw stdout/stderr from all resources:

- Filter by resource name
- Search within logs
- Auto-scroll with pause
- Color-coded by resource

### Structured logs

Application-level structured logs (via ILogger, OpenTelemetry):

- **Filterable** by resource, log level, category, message content
- **Expandable** — click to see full log entry with all properties
- **Correlated** with traces — click to jump to the related trace
- Supports .NET ILogger structured logging properties
- Supports OpenTelemetry log signals from any language

### Distributed traces

End-to-end request traces across all services:

- **Waterfall view** — shows the full call chain with timing
- **Span details** — HTTP method, URL, status code, duration
- **Database spans** — SQL queries, connection details
- **Messaging spans** — queue operations, topic publishes
- **Error highlighting** — failed spans shown in red
- **Cross-service correlation** — trace context propagated automatically for .NET; manual for other languages

### Metrics

Real-time and historical metrics:

- **Runtime metrics** — CPU, memory, GC, thread pool
- **HTTP metrics** — request rate, error rate, latency percentiles
- **Custom metrics** — any metrics your services emit via OpenTelemetry
- **Chartable** — time-series graphs for each metric

### GenAI Visualizer

For applications using AI/LLM integrations:

- **Token usage** — prompt tokens, completion tokens, total tokens per request
- **Prompt/completion pairs** — see the exact prompt sent and response received
- **Model metadata** — which model, temperature, max tokens
- **Latency** — time per AI call
- Requires services to emit [GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) via OpenTelemetry

---

## Dashboard URL

By default, the dashboard runs on an auto-assigned port. Find it:

- In the terminal output when `aspire run` starts
- Via MCP: `list_resources` tool
- Override with `--dashboard-port`:

```bash
aspire run --dashboard-port 18888
```

---

## Standalone Dashboard

Run the dashboard without an AppHost — useful for existing applications that already emit OpenTelemetry:

```bash
docker run --rm -d \
  -p 18888:18888 \
  -p 4317:18889 \
  mcr.microsoft.com/dotnet/aspire-dashboard:latest
```

| Port             | Purpose                                                      |
| ---------------- | ------------------------------------------------------------ |
| `18888`          | Dashboard web UI                                             |
| `4317` → `18889` | OTLP gRPC receiver (standard OTel port → dashboard internal) |

### Configure your services

Point your OpenTelemetry exporters at the dashboard:

```bash
# Environment variables for any language's OpenTelemetry SDK
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_SERVICE_NAME=my-service
```

### Docker Compose example

```yaml
services:
  dashboard:
    image: mcr.microsoft.com/dotnet/aspire-dashboard:latest
    ports:
      - "18888:18888"
      - "4317:18889"

  api:
    build: ./api
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://dashboard:18889
      - OTEL_SERVICE_NAME=api

  worker:
    build: ./worker
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://dashboard:18889
      - OTEL_SERVICE_NAME=worker
```

---

## Dashboard configuration

### Authentication

The standalone dashboard supports authentication via browser tokens:

```bash
docker run --rm -d \
  -p 18888:18888 \
  -p 4317:18889 \
  -e DASHBOARD__FRONTEND__AUTHMODE=BrowserToken \
  -e DASHBOARD__FRONTEND__BROWSERTOKEN__TOKEN=my-secret-token \
  mcr.microsoft.com/dotnet/aspire-dashboard:latest
```

### OTLP configuration

```bash
# Accept OTLP over gRPC (default)
-e DASHBOARD__OTLP__GRPC__ENDPOINT=http://0.0.0.0:18889

# Accept OTLP over HTTP
-e DASHBOARD__OTLP__HTTP__ENDPOINT=http://0.0.0.0:18890

# Require API key for OTLP
-e DASHBOARD__OTLP__AUTHMODE=ApiKey
-e DASHBOARD__OTLP__PRIMARYAPIKEY=my-api-key
```

### Resource limits

```bash
# Limit log entries retained
-e DASHBOARD__TELEMETRYLIMITS__MAXLOGCOUNT=10000

# Limit trace entries retained
-e DASHBOARD__TELEMETRYLIMITS__MAXTRACECOUNT=10000

# Limit metric data points
-e DASHBOARD__TELEMETRYLIMITS__MAXMETRICCOUNT=50000
```

---

## Copilot integration

The dashboard integrates with GitHub Copilot in VS Code:

- Ask questions about resource status
- Query logs and traces in natural language
- The MCP server (see [MCP Server](mcp-server.md)) provides the bridge

---

## Non-.NET service telemetry

For non-.NET services to appear in the dashboard, they must emit OpenTelemetry signals. Aspire auto-injects the OTLP endpoint env var when using `.WithReference()`:

### Python (OpenTelemetry SDK)

```python
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
import os

# Aspire injects OTEL_EXPORTER_OTLP_ENDPOINT automatically
endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=endpoint)))
trace.set_tracer_provider(provider)
```

### JavaScript (OpenTelemetry SDK)

```javascript
const { NodeTracerProvider } = require("@opentelemetry/sdk-trace-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-grpc");

const provider = new NodeTracerProvider();
provider.addSpanProcessor(
  new BatchSpanProcessor(
    new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4317",
    })
  )
);
provider.register();
```
