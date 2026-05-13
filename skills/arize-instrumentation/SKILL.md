---
name: arize-instrumentation
description: Adds Arize AX tracing to an LLM application for the first time. Follows a two-phase agent-assisted flow to analyze the codebase then implement instrumentation after user confirmation. Use when the user wants to instrument their app, add tracing from scratch, set up LLM observability, integrate OpenTelemetry or openinference, or get started with Arize tracing.
metadata:
  author: arize
  version: "1.0"
compatibility: Python and TypeScript/JavaScript apps use openinference-instrumentation packages for auto-instrumentation. Java and Go apps use the OpenTelemetry SDK with manual OpenInference spans. See https://arize.com/docs/PROMPT.md for setup details.
---

# Arize Instrumentation Skill

Use this skill when the user wants to **add Arize AX tracing** to their application. Follow the **two-phase, agent-assisted flow** from the [Agent-Assisted Tracing Setup](https://arize.com/docs/ax/alyx/tracing-assistant) and the [Arize AX Tracing — Agent Setup Prompt](https://arize.com/docs/PROMPT.md).

## Quick start (for the user)

If the user asks you to "set up tracing" or "instrument my app with Arize", you can start with:

> Follow the instructions from https://arize.com/docs/PROMPT.md and ask me questions as needed.

Then execute the two phases below.

## Core principles

- **Prefer inspection over mutation** — understand the codebase before changing it.
- **Do not change business logic** — tracing is purely additive.
- **Use auto-instrumentation where available** — add manual spans only for custom logic not covered by integrations.
- **Follow existing code style** and project conventions.
- **Keep output concise and production-focused** — do not generate extra documentation or summary files.
- **NEVER embed literal credential values in generated code** — always reference environment variables (e.g., `os.environ["ARIZE_API_KEY"]`, `process.env.ARIZE_API_KEY`). This includes API keys, space IDs, and any other secrets. The user sets these in their own environment; the agent must never output raw secret values.

## Phase 0: Environment preflight

Before changing code:

1. Confirm the repo/service scope is clear. For monorepos, do not assume the whole repo should be instrumented.
2. Identify the local runtime surface you will need for verification:
   - package manager and app start command
   - whether the app is long-running, server-based, or a short-lived CLI/script
   - whether `ax` will be needed for post-change verification
3. Do NOT proactively check `ax` installation or version. If `ax` is needed for verification later, just run it when the time comes. If it fails, see references/ax-profiles.md.
4. Never silently replace a user-provided space ID, project name, or project ID. If the CLI, collector, and user input disagree, surface that mismatch as a concrete blocker.

## Phase 1: Analysis (read-only)

**Do not write any code or create any files during this phase.**

### Steps

1. **Check dependency manifests** to detect stack:
   - Python: `pyproject.toml`, `requirements.txt`, `setup.py`, `Pipfile`
   - TypeScript/JavaScript: `package.json`
   - Java: `pom.xml`, `build.gradle`, `build.gradle.kts`
   - Go: `go.mod`

2. **Scan import statements** in source files to confirm what is actually used.

3. **Check for existing tracing/OTel** — look for `TracerProvider`, `register()`, `opentelemetry` imports, `ARIZE_*`, `OTEL_*`, `OTLP_*` env vars, or other observability config (Datadog, Honeycomb, etc.).

4. **Identify scope** — for monorepos or multi-service projects, ask which service(s) to instrument.

### What to identify

| Item | Examples |
|------|----------|
| Language | Python, TypeScript/JavaScript, Java, Go |
| Package manager | pip/poetry/uv, npm/pnpm/yarn, maven/gradle, go modules |
| LLM providers | OpenAI, Anthropic, LiteLLM, Bedrock, etc. |
| Frameworks | LangChain, LangGraph, LlamaIndex, Vercel AI SDK, Mastra, etc. |
| Existing tracing | Any OTel or vendor setup |
| Tool/function use | LLM tool use, function calling, or custom tools the app executes (e.g. in an agent loop) |

**Key rule:** When a framework is detected alongside an LLM provider, inspect the framework-specific tracing docs first and prefer the framework-native integration path when it already captures the model and tool spans you need. Add separate provider instrumentation only when the framework docs require it or when the framework-native integration leaves obvious gaps. If the app runs tools and the framework integration does not emit tool spans, add manual TOOL spans so each invocation appears with input/output (see **Enriching traces** below).

### Phase 1 output

Return a concise summary:

- Detected language, package manager, providers, frameworks
- Proposed integration list (from the routing table in the docs)
- Any existing OTel/tracing that needs consideration
- If monorepo: which service(s) you propose to instrument
- **If the app uses LLM tool use / function calling:** note that you will add manual CHAIN + TOOL spans so each tool call appears in the trace with input/output (avoids sparse traces).

If the user explicitly asked you to instrument the app now, and the target service is already clear, present the Phase 1 summary briefly and continue directly to Phase 2. If scope is ambiguous, or the user asked for analysis first, stop and wait for confirmation.

## Integration routing and docs

The **canonical list** of supported integrations and doc URLs is in the [Agent Setup Prompt](https://arize.com/docs/PROMPT.md). Use it to map detected signals to implementation docs.

- **LLM providers:** [OpenAI](https://arize.com/docs/ax/integrations/llm-providers/openai), [Anthropic](https://arize.com/docs/ax/integrations/llm-providers/anthropic), [LiteLLM](https://arize.com/docs/ax/integrations/llm-providers/litellm), [Google Gen AI](https://arize.com/docs/ax/integrations/llm-providers/google-gen-ai), [Bedrock](https://arize.com/docs/ax/integrations/llm-providers/amazon-bedrock), [Ollama](https://arize.com/docs/ax/integrations/llm-providers/llama), [Groq](https://arize.com/docs/ax/integrations/llm-providers/groq), [MistralAI](https://arize.com/docs/ax/integrations/llm-providers/mistralai), [OpenRouter](https://arize.com/docs/ax/integrations/llm-providers/openrouter), [VertexAI](https://arize.com/docs/ax/integrations/llm-providers/vertexai).
- **Python frameworks:** [LangChain](https://arize.com/docs/ax/integrations/python-agent-frameworks/langchain), [LangGraph](https://arize.com/docs/ax/integrations/python-agent-frameworks/langgraph), [LlamaIndex](https://arize.com/docs/ax/integrations/python-agent-frameworks/llamaindex), [CrewAI](https://arize.com/docs/ax/integrations/python-agent-frameworks/crewai), [DSPy](https://arize.com/docs/ax/integrations/python-agent-frameworks/dspy), [AutoGen](https://arize.com/docs/ax/integrations/python-agent-frameworks/autogen), [Semantic Kernel](https://arize.com/docs/ax/integrations/python-agent-frameworks/semantic-kernel), [Pydantic AI](https://arize.com/docs/ax/integrations/python-agent-frameworks/pydantic), [Haystack](https://arize.com/docs/ax/integrations/python-agent-frameworks/haystack), [Guardrails AI](https://arize.com/docs/ax/integrations/python-agent-frameworks/guardrails-ai), [Hugging Face Smolagents](https://arize.com/docs/ax/integrations/python-agent-frameworks/hugging-face-smolagents), [Instructor](https://arize.com/docs/ax/integrations/python-agent-frameworks/instructor), [Agno](https://arize.com/docs/ax/integrations/python-agent-frameworks/agno), [Google ADK](https://arize.com/docs/ax/integrations/python-agent-frameworks/google-adk), [MCP](https://arize.com/docs/ax/integrations/python-agent-frameworks/model-context-protocol), [Portkey](https://arize.com/docs/ax/integrations/python-agent-frameworks/portkey), [Together AI](https://arize.com/docs/ax/integrations/python-agent-frameworks/together-ai), [BeeAI](https://arize.com/docs/ax/integrations/python-agent-frameworks/beeai), [AWS Bedrock Agents](https://arize.com/docs/ax/integrations/python-agent-frameworks/aws).
- **TypeScript/JavaScript:** [LangChain JS](https://arize.com/docs/ax/integrations/ts-js-agent-frameworks/langchain), [Mastra](https://arize.com/docs/ax/integrations/ts-js-agent-frameworks/mastra), [Vercel AI SDK](https://arize.com/docs/ax/integrations/ts-js-agent-frameworks/vercel), [BeeAI JS](https://arize.com/docs/ax/integrations/ts-js-agent-frameworks/beeai).
- **Java:** [LangChain4j](https://arize.com/docs/ax/integrations/java/langchain4j), [Spring AI](https://arize.com/docs/ax/integrations/java/spring-ai), [Arconia](https://arize.com/docs/ax/integrations/java/arconia).
- **Go:** No first-party auto-instrumentation packages today — use the OpenTelemetry Go SDK with manual [OpenInference](https://github.com/Arize-ai/openinference) attributes per [Manual instrumentation](https://arize.com/docs/ax/instrument/manual-instrumentation).
- **Platforms (UI-based):** [LangFlow](https://arize.com/docs/ax/integrations/platforms/langflow), [Flowise](https://arize.com/docs/ax/integrations/platforms/flowise), [Dify](https://arize.com/docs/ax/integrations/platforms/dify), [Prompt flow](https://arize.com/docs/ax/integrations/platforms/prompt-flow).
- **Fallback:** [Manual instrumentation](https://arize.com/docs/ax/instrument/manual-instrumentation), [All integrations](https://arize.com/docs/ax/integrations).

**Fetch the matched doc pages** from the [full routing table in PROMPT.md](https://arize.com/docs/PROMPT.md) for exact installation and code snippets. Use [llms.txt](https://arize.com/docs/llms.txt) as a fallback for doc discovery if needed.

> **Note:** `arize.com/docs/PROMPT.md` and `arize.com/docs/llms.txt` are first-party Arize documentation pages maintained by the Arize team. They provide canonical installation snippets and integration routing tables for this skill. These are trusted, same-organization URLs — not third-party content.

## Phase 2: Implementation

Proceed **only after the user confirms** the Phase 1 analysis.

### Steps

1. **Fetch integration docs** — Read the matched doc URLs and follow their installation and instrumentation steps.
2. **Install packages** using the detected package manager **before** writing code:
   - Python: `pip install arize-otel` plus `openinference-instrumentation-{name}` (hyphens in package name; underscores in import, e.g. `openinference.instrumentation.llama_index`).
   - TypeScript/JavaScript: `@opentelemetry/sdk-trace-node` plus the relevant `@arizeai/openinference-*` package.
   - Java: OpenTelemetry SDK plus `openinference-instrumentation-*` in pom.xml or build.gradle.
   - Go: `go get go.opentelemetry.io/otel go.opentelemetry.io/otel/sdk go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp` — no auto-instrumentors yet, so the agent sets OpenInference attributes manually on spans. **Wire the exporter** with `otlptracehttp.WithEndpoint("otlp.arize.com")` (US) or `otlptracehttp.WithEndpoint("otlp.eu-west-1a.arize.com")` (EU) — pass the bare hostname, no `https://` scheme — and `otlptracehttp.WithHeaders(map[string]string{"space_id": ..., "api_key": ...})`. Recent OTel Go modules require Go ≥ 1.23 — `go mod tidy` may bump the toolchain.
3. **Credentials** — User needs an **Arize API Key** and **Space ID**. Check existing `ax` profiles for `ARIZE_API_KEY` and `ARIZE_SPACE` — never read `.env` files:
   - Run `ax profiles show` to check for an existing profile.
   - If no profile exists, guide the user to run `ax profiles create` which provides an **interactive wizard** that walks through API key and space setup. See [CLI profiles docs](https://arize.com/docs/api-clients/cli/profiles) for details.
   - If the user needs to find their API key manually, direct them to **https://app.arize.com** and to navigate to the settings page (do not use organization-specific URLs with placeholder IDs — they won't resolve for new users).
   - If credentials are not set, instruct the user to set them as environment variables — never embed raw values in generated code. All generated instrumentation code must reference `os.environ["ARIZE_API_KEY"]` (Python), `process.env.ARIZE_API_KEY` (TypeScript/JavaScript), or `os.Getenv("ARIZE_API_KEY")` (Go).
   - See references/ax-profiles.md for full profile setup and troubleshooting.
4. **Centralized instrumentation** — Create a single module (e.g. `instrumentation.py`, `instrumentation.ts`, `instrumentation.go`) and initialize tracing **before** any LLM client is created.
5. **Existing OTel** — If there is already a TracerProvider, add Arize as an **additional** exporter (e.g. BatchSpanProcessor with Arize OTLP). Do not replace existing setup unless the user asks.

### Implementation rules

- Use **auto-instrumentation first**; manual spans only when needed.
- Prefer the repo's native integration surface before adding generic OpenTelemetry plumbing. If the framework ships an exporter or observability package, use that first unless there is a documented gap.
- **Fail gracefully** if env vars are missing (warn, do not crash).
- **Import order:** register tracer → attach instrumentors → then create LLM clients.
- **Project name attribute (required):** Arize rejects spans with HTTP 500 if the project name is missing — `service.name` alone is not accepted. Set it as a **resource attribute** on the TracerProvider (recommended — one place, applies to all spans):
  - **Python:** `register(project_name="my-app")` handles it automatically (sets `"openinference.project.name"` on the resource). For routing spans to different projects, use `set_routing_context(space_id=..., project_name=...)` from `arize.otel`.
  - **TypeScript:** Arize accepts both `"model_id"` (shown in the official TS quickstart) and `"openinference.project.name"` via `SEMRESATTRS_PROJECT_NAME` from `@arizeai/openinference-semantic-conventions` (shown in the manual instrumentation docs) — both work.
  - **Go:** Pass `attribute.String("openinference.project.name", "my-app")` to `resource.New(...)` and apply via `sdktrace.WithResource(res)`. The Go SDK has no helper for this, so it must be set manually on every TracerProvider.
- **CLI/script apps — flush before exit:** `provider.shutdown()` (TS) / `provider.force_flush()` then `provider.shutdown()` (Python) / `tp.Shutdown(ctx)` (Go) must be called before the process exits, otherwise async OTLP exports are dropped and no traces appear.
- **When the app has tool/function execution:** add manual CHAIN + TOOL spans (see **Enriching traces** below) so the trace tree shows each tool call and its result — otherwise traces will look sparse (only LLM API spans, no tool input/output).

## Enriching traces: manual spans for tool use and agent loops

### Why doesn't the auto-instrumentor do this?

**Provider instrumentors (Anthropic, OpenAI, etc.) only wrap the LLM *client* — the code that sends HTTP requests and receives responses.** They see:

- One span per API call: request (messages, system prompt, tools) and response (text, tool_use blocks, etc.).

They **cannot** see what happens *inside your application* after the response:

- **Tool execution** — Your code parses the response, calls `run_tool("check_loan_eligibility", {...})`, and gets a result. That runs in your process; the instrumentor has no hook into your `run_tool()` or the actual tool output. The *next* API call (sending the tool result back) is just another `messages.create` span — the instrumentor doesn't know that the message content is a tool result or what the tool returned.
- **Agent/chain boundary** — The idea of "one user turn → multiple LLM calls + tool calls" is an *application-level* concept. The instrumentor only sees separate API calls; it doesn't know they belong to the same logical "run_agent" run.

So TOOL and CHAIN spans have to be added **manually** (or by a *framework* instrumentor like LangChain/LangGraph that knows about tools and chains). Once you add them, they appear in the same trace as the LLM spans because they use the same TracerProvider.

---

To avoid sparse traces where tool inputs/outputs are missing:

1. **Detect** agent/tool patterns: a loop that calls the LLM, then runs one or more tools (by name + arguments), then calls the LLM again with tool results.
2. **Add manual spans** using the same TracerProvider (e.g. `opentelemetry.trace.get_tracer(...)` after `register()`):
   - **CHAIN span** — Wrap the full agent run (e.g. `run_agent`): set `openinference.span.kind` = `"CHAIN"`, `input.value` = user message, `output.value` = final reply.
   - **TOOL span** — Wrap each tool invocation: set `openinference.span.kind` = `"TOOL"`, `input.value` = JSON of arguments, `output.value` = JSON of result. Use the tool name as the span name (e.g. `check_loan_eligibility`).

**OpenInference attributes (use these so Arize shows spans correctly):**

| Attribute | Use |
|-----------|-----|
| `openinference.span.kind` | Pick the right value: `"LLM"` for raw provider API calls (OpenAI, Anthropic, etc.); `"CHAIN"` for orchestration / agent-loop boundaries; `"TOOL"` for tool/function execution; `"RETRIEVER"` for vector-store / search lookups; `"EMBEDDING"` for embedding API calls; `"AGENT"` for an autonomous sub-agent run nested inside a larger chain; `"RERANKER"` for rerank API calls; `"GUARDRAIL"` for guardrail/policy checks; `"EVALUATOR"` for online eval calls. |
| `input.value` | string (e.g. user message or JSON of tool args) |
| `output.value` | string (e.g. final reply or JSON of tool result) |

**LLM-span attributes (set these in addition to the three above when the span is an actual LLM call):**

| Attribute | Use |
|-----------|-----|
| `llm.model_name` | model identifier (e.g. `"gpt-4o-mini"`) |
| `llm.provider` / `llm.system` | provider name (e.g. `"openai"`, `"anthropic"`) |
| `llm.input_messages.{i}.message.role` | `"system"` / `"user"` / `"assistant"` / `"tool"` for the i-th input message |
| `llm.input_messages.{i}.message.content` | text content of the i-th input message |
| `llm.output_messages.{i}.message.role` | role of the i-th output message |
| `llm.output_messages.{i}.message.content` | text content of the i-th output message |
| `llm.token_count.prompt` | int — prompt/input tokens |
| `llm.token_count.completion` | int — completion/output tokens |
| `llm.token_count.total` | int — total tokens |

In Python and TypeScript these names are exposed via `openinference-semantic-conventions` packages; in Go they must be hand-typed as the strings above.

**Python pattern:** Get the global tracer (same provider as Arize), then use context managers so tool spans are children of the CHAIN span and appear in the same trace as the LLM spans:

```python
from opentelemetry.trace import get_tracer

tracer = get_tracer("my-app", "1.0.0")

# In your agent entrypoint:
with tracer.start_as_current_span("run_agent") as chain_span:
    chain_span.set_attribute("openinference.span.kind", "CHAIN")
    chain_span.set_attribute("input.value", user_message)
    # ... LLM call ...
    for tool_use in tool_uses:
        with tracer.start_as_current_span(tool_use["name"]) as tool_span:
            tool_span.set_attribute("openinference.span.kind", "TOOL")
            tool_span.set_attribute("input.value", json.dumps(tool_use["input"]))
            result = run_tool(tool_use["name"], tool_use["input"])
            tool_span.set_attribute("output.value", result)
        # ... append tool result to messages, call LLM again ...
    chain_span.set_attribute("output.value", final_reply)
```

**Go pattern:** Get a tracer from the global TracerProvider (registered via `otel.SetTracerProvider`), then nest spans with `tracer.Start` so tool spans become children of the CHAIN span.

> **Critical for short-lived processes:** never call `log.Fatalf` / `os.Exit` after a span has started — they skip the deferred `tp.Shutdown(ctx)` and the in-flight CHAIN/LLM spans never flush. Use `log.Printf` + `return` from `main` instead, and keep `tp.Shutdown(ctx)` deferred at the top of `main`.

```go
import (
    "context"
    "encoding/json"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
)

var tracer = otel.Tracer("my-app")

func runAgent(ctx context.Context, userMessage string) string {
    ctx, chainSpan := tracer.Start(ctx, "run_agent")
    defer chainSpan.End()
    chainSpan.SetAttributes(
        attribute.String("openinference.span.kind", "CHAIN"),
        attribute.String("input.value", userMessage),
    )

    // ... LLM call ...
    for _, toolUse := range toolUses {
        ctx, toolSpan := tracer.Start(ctx, toolUse.Name)
        argsJSON, err := json.Marshal(toolUse.Input)
        if err != nil {
            toolSpan.RecordError(err)
        }
        toolSpan.SetAttributes(
            attribute.String("openinference.span.kind", "TOOL"),
            attribute.String("input.value", string(argsJSON)),
        )
        result := runTool(toolUse.Name, toolUse.Input)
        toolSpan.SetAttributes(attribute.String("output.value", result))
        toolSpan.End()
        // ... append tool result to messages, call LLM again ...
    }

    chainSpan.SetAttributes(attribute.String("output.value", finalReply))
    return finalReply
}
```

See [Manual instrumentation](https://arize.com/docs/ax/instrument/manual-instrumentation) for more span kinds and attributes.

## Verification

Treat instrumentation as complete only when all of the following are true:

1. The app still builds or typechecks after the tracing change.
2. The app starts successfully with the new tracing configuration.
3. You trigger at least one real request or run that should produce spans.
4. You either verify the resulting trace in Arize, or you provide a precise blocker that distinguishes app-side success from Arize-side failure.

After implementation:

1. Run the application and trigger at least one LLM call.
2. **Use the `arize-trace` skill** to confirm traces arrived. If empty, retry shortly. Verify spans have expected `openinference.span.kind`, `input.value`/`output.value`, and parent-child relationships.
3. If no traces: verify `ARIZE_SPACE` and `ARIZE_API_KEY`, ensure tracer is initialized before instrumentors and clients, check connectivity to `otlp.arize.com:443`, and inspect app/runtime exporter logs so you can tell whether spans are being emitted locally but rejected remotely. For debug set `GRPC_VERBOSITY=debug` or pass `log_to_console=True` to `register()`. Common gotchas: (a) missing project name resource attribute causes HTTP 500 rejections — `service.name` alone is not enough; Python: pass `project_name` to `register()`; TypeScript: set `"model_id"` or `SEMRESATTRS_PROJECT_NAME` on the resource; Go: add `attribute.String("openinference.project.name", "my-app")` to `resource.New(...)`; (b) CLI/script processes exit before OTLP exports flush — call `provider.force_flush()` then `provider.shutdown()` (Python/TS) or `tp.Shutdown(ctx)` (Go) before exit; (c) CLI-visible spaces/projects can disagree with a collector-targeted space ID — report the mismatch instead of silently rewriting credentials.
4. If the app uses tools: confirm CHAIN and TOOL spans appear with `input.value` / `output.value` so tool calls and results are visible.

When verification is blocked by CLI or account issues, end with a concrete status:

- app instrumentation status
- latest local trace ID or run ID
- whether exporter logs show local span emission
- whether the failure is credential, space/project resolution, network, or collector rejection

## Leveraging the Tracing Assistant (MCP)

For deeper instrumentation guidance inside the IDE, the user can enable:

- **Arize AX Tracing Assistant MCP** — instrumentation guides, framework examples, and support. In Cursor: **Settings → MCP → Add** and use:
  ```json
  "arize-tracing-assistant": {
    "command": "uvx",
    "args": ["arize-tracing-assistant@latest"]
  }
  ```
- **Arize AX Docs MCP** — searchable docs. In Cursor:
  ```json
  "arize-ax-docs": {
    "url": "https://arize.com/docs/mcp"
  }
  ```

Then the user can ask things like: *"Instrument this app using Arize AX"*, *"Can you use manual instrumentation so I have more control over my traces?"*, *"How can I redact sensitive information from my spans?"*

See the full setup at [Agent-Assisted Tracing Setup](https://arize.com/docs/ax/alyx/tracing-assistant).

## Reference links

| Resource | URL |
|----------|-----|
| Agent-Assisted Tracing Setup | https://arize.com/docs/ax/alyx/tracing-assistant |
| Agent Setup Prompt (full routing + phases) | https://arize.com/docs/PROMPT.md |
| Arize AX Docs | https://arize.com/docs/ax |
| Full integration list | https://arize.com/docs/ax/integrations |
| Doc index (llms.txt) | https://arize.com/docs/llms.txt |

## Save Credentials for Future Use

See references/ax-profiles.md § Save Credentials for Future Use.
