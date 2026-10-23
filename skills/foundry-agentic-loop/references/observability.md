# Observability contract

Reference for the `foundry-agentic-loop` skill: the end-to-end monitoring contract the generated infra must satisfy. `foundry-agentic-loop` declares the intent (telemetry **ON by default**, one Application Insights, keyless); this file holds the baseline infra, per-tier instrumentation, agent-observability, and content-capture detail. Defer SDK/instrumentation wiring to `appinsights-instrumentation` and role assignments to the `microsoft-foundry/rbac` sub-skill.

End-to-end monitoring is **on by default**: every tier - **backend, hosted agents, MCP servers, and Foundry models** - emits OpenTelemetry into **one Application Insights** resource so a single distributed trace follows a request from the browser through the backend, the agent loop, each tool/MCP call, and every model call. The generated Bicep must provision and wire it.

## Baseline infra (generated Bicep)

- Provision **one Application Insights** resource (backed by a Log Analytics workspace) shared by all components - this is what makes the **Application Map** and end-to-end transaction search work.
- Inject its connection string into every app, agent, and MCP server as `APPLICATIONINSIGHTS_CONNECTION_STRING`; authenticate the telemetry channel with each component's **managed identity** via the **Monitoring Metrics Publisher** assignments in [`rbac-contract.md`](rbac-contract.md) - **no instrumentation key, no connection-string secret on the data plane**.
- Build the exporter credential with `DefaultAzureCredential` and the component's managed identity client ID, never `ManagedIdentityCredential` alone: the same code exports as the managed identity in Azure and as the signed-in developer locally. The Bicep grants the deploying principal **Monitoring Metrics Publisher** too, so Verify proves telemetry without deploying.
- **Connect the same Application Insights resource to the Foundry project** (Foundry portal → Agents → Traces → Connect, or an Application Insights connection on the project) so Foundry **server-side** agent/model traces land in the same resource.
- Grant operators **Log Analytics Reader** on the resource so they can query telemetry.

## Per-tier instrumentation (defer wiring to `appinsights-instrumentation`)

| Tier | How it's instrumented | What lands in Application Insights |
| --- | --- | --- |
| **Backend** (API) | Azure Monitor OpenTelemetry distro (`configure_azure_monitor()` / `useAzureMonitor()` / `.UseAzureMonitor()`); auto-instruments inbound + outbound HTTP | Request/dependency spans, logs, metrics; W3C `traceparent` propagated to agents, MCP servers, and models |
| **Hosted agent** (Copilot SDK or MAF) | See *Agent observability* below | `invoke_agent` / `chat` / `execute_tool` spans, GenAI metrics, prompts & responses (when content capture is on) |
| **MCP server** | Azure Monitor OTel distro on the server process; record tool name, status or error class, duration and input/output sizes or item counts as span attributes, never arguments or results (see capture below) | Tool-call spans that nest under the agent's `execute_tool` span via propagated trace context |
| **Foundry models** | Foundry **server-side tracing** (automatic once App Insights is connected) plus model-SDK instrumentation when you call models from your own code | `gen_ai` chat spans: model, token usage, finish reason, and prompt/response content (when capture is on) |

## Agent observability

- **MAF** is natively instrumented (`ENABLE_INSTRUMENTATION=true`) and emits `invoke_agent` / `chat` / `execute_tool` spans and `gen_ai` metrics. When the hosting adapter already exports to Application Insights, don't start a second exporter; otherwise call `configure_azure_monitor(connection_string=os.environ["APPLICATIONINSIGHTS_CONNECTION_STRING"])` once at startup.
- **Copilot SDK:** the hosting adapter exports host spans from `APPLICATIONINSIGHTS_CONNECTION_STRING`. The Copilot runtime is a separate producer: it exports its `invoke_agent` / `chat` / `execute_tool` spans over OTLP only when the client gets a `telemetry` config pointing `COPILOT_OTLP_ENDPOINT` at a reachable receiver, such as a collector with the Azure Monitor exporter. The reference agent [`copilot-sdk-with-toolbox.py`](copilot-sdk-with-toolbox.py) adds its own spans at the toolbox boundary. Follow [copilot-sdk-foundry.md](copilot-sdk-foundry.md#telemetry) for the route, identities and delivery checks.
- **Foundry-hosted agents** get `APPLICATIONINSIGHTS_CONNECTION_STRING` injected automatically and produce **server-side traces** (agent runs, tool calls, model calls, and the conversation view) with no code change; client-side instrumentation layers on top for your own app code.

## Capture the full detail (request data, prompts, responses)

Content capture is **off by default** because spans then carry prompts, completions, tool arguments/results, and request bodies (PII/secrets risk). Turn it on per layer:

| Layer | Flag to capture content |
| --- | --- |
| MAF | `ENABLE_SENSITIVE_DATA=true` (or `enable_sensitive_telemetry()`) |
| Copilot runtime | `telemetry={"capture_content": True}` |
| Model SDK (OpenAI / Azure AI Inference) | `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true` (or `AZURE_TRACING_GEN_AI_CONTENT_RECORDING_ENABLED=true`) |
| Backend / MCP server | add request/response bodies and tool args/results as span attributes explicitly, behind a config flag that is off by default |

- **Treat captured content as sensitive:** keep capture off unless the user approves it, for dev/test with synthetic data. In production gate it behind config, redact secrets and PII before export, and apply production log access and retention.
- Set a distinct **cloud role name / `service.name`** per component (frontend, backend, agent, mcp-server) so the **Application Map** renders the topology and transactions correlate across tiers.
- Defer SDK/instrumentation wiring to `appinsights-instrumentation` and role assignments to the `microsoft-foundry/rbac` sub-skill.
