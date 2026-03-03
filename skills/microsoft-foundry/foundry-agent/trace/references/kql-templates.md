# KQL Templates — GenAI Trace Query Reference

Ready-to-use KQL templates for querying GenAI OpenTelemetry traces in Application Insights.

## App Insights Table Mapping

| App Insights Table | GenAI Data |
|-------------------|------------|
| `dependencies` | GenAI spans: LLM inference (`chat`), tool execution (`execute_tool`), agent invocation (`invoke_agent`) |
| `requests` | Incoming HTTP requests to the agent endpoint |
| `customEvents` | GenAI evaluation results (`gen_ai.evaluation.result`) — scores, labels, explanations |
| `traces` | Log events, including GenAI events (input/output messages) |
| `exceptions` | Error details with stack traces |

## Key GenAI OTel Attributes

Stored in `customDimensions` on `dependencies` spans:

| Attribute | Description | Example |
|-----------|-------------|---------|
| `gen_ai.operation.name` | Operation type | `chat`, `invoke_agent`, `execute_tool`, `create_agent` |
| `gen_ai.conversation.id` | Conversation/session ID | `conv_5j66UpCpwteGg4YSxUnt7lPY` |
| `gen_ai.response.id` | Response ID | `chatcmpl-123` |
| `gen_ai.agent.name` | Agent name | `my-support-agent` |
| `gen_ai.agent.id` | Agent unique ID | `asst_abc123` |
| `gen_ai.request.model` | Requested model | `gpt-4o` |
| `gen_ai.response.model` | Actual model used | `gpt-4o-2024-05-13` |
| `gen_ai.usage.input_tokens` | Input token count | `450` |
| `gen_ai.usage.output_tokens` | Output token count | `120` |
| `gen_ai.response.finish_reasons` | Stop reasons | `["stop"]`, `["tool_calls"]` |
| `error.type` | Error classification | `timeout`, `rate_limited`, `content_filter` |
| `gen_ai.provider.name` | Provider | `azure.ai.openai`, `openai` |

Stored in `customDimensions` on `customEvents` (name == `gen_ai.evaluation.result`):

| Attribute | Description | Example |
|-----------|-------------|---------|
| `gen_ai.evaluation.name` | Evaluator name | `Relevance`, `IntentResolution` |
| `gen_ai.evaluation.score.value` | Numeric score | `4.0` |
| `gen_ai.evaluation.score.label` | Human-readable label | `pass`, `fail`, `relevant` |
| `gen_ai.evaluation.explanation` | Free-form explanation | `"Response lacks detail..."` |
| `gen_ai.response.id` | Correlates to the evaluated span | `chatcmpl-123` |
| `gen_ai.conversation.id` | Correlates to conversation | `conv_5j66...` |

> **Correlation:** Eval results do NOT link via id-parentId. Use `gen_ai.conversation.id` and/or `gen_ai.response.id` to join with `dependencies` spans.

## Span Correlation

| Field | Purpose |
|-------|---------|
| `operation_Id` | Trace ID — groups all spans in one request |
| `id` | Span ID — unique identifier for this span |
| `operation_ParentId` | Parent span ID — use with `id` to build span trees |

## Hosted Agent Attributes

Stored in `customDimensions` on `traces` (log events), NOT on `dependencies` spans:

| Attribute | Description | Example |
|-----------|-------------|---------|
| `azure.ai.agentserver.agent_name` | Hosted agent name | `hosted-agent-022-001` |
| `azure.ai.agentserver.agent_id` | Internal agent ID | `code-asst-xmwokux85uqc7fodxejaxa` |
| `azure.ai.agentserver.conversation_id` | Conversation ID | `conv_d7ab624de92d...` |
| `azure.ai.agentserver.response_id` | Response ID (caresp format) | `caresp_d7ab624de92d...` |

> **Important:** These attributes are on `traces` table entries, not `dependencies` spans. To correlate with GenAI spans, join on `operation_Id`.

## Response ID Formats

| Agent Type | Prefix | Example |
|------------|--------|---------|
| Hosted agent (AgentServer) | `caresp_` | `caresp_d7ab624de92da637008Rhr4U4E1y9FSE...` |
| Prompt agent (Foundry Responses API) | `resp_` | `resp_4e2f8b016b5a0dad00697bd3c4c1b881...` |
| Azure OpenAI chat completions | `chatcmpl-` | `chatcmpl-abc123def456` |

When searching by response ID, use the appropriate prefix to narrow results. The `gen_ai.response.id` attribute appears on `dependencies` spans (for `chat` operations) and in `customEvents` (for evaluation results).

## Common Query Templates

### Overview — Conversations in last 24h
```kql
dependencies
| where timestamp > ago(24h)
| where isnotempty(customDimensions["gen_ai.operation.name"])
| summarize
    spanCount = count(),
    errorCount = countif(success == false),
    avgDuration = avg(duration),
    totalInputTokens = sum(toint(customDimensions["gen_ai.usage.input_tokens"])),
    totalOutputTokens = sum(toint(customDimensions["gen_ai.usage.output_tokens"]))
  by bin(timestamp, 1h)
| order by timestamp desc
```

### Error Rate by Operation
```kql
dependencies
| where timestamp > ago(24h)
| where isnotempty(customDimensions["gen_ai.operation.name"])
| summarize
    total = count(),
    errors = countif(success == false),
    errorRate = round(100.0 * countif(success == false) / count(), 1)
  by operation = tostring(customDimensions["gen_ai.operation.name"])
| order by errorRate desc
```

### Token Usage by Model
```kql
dependencies
| where timestamp > ago(24h)
| where customDimensions["gen_ai.operation.name"] == "chat"
| summarize
    calls = count(),
    totalInput = sum(toint(customDimensions["gen_ai.usage.input_tokens"])),
    totalOutput = sum(toint(customDimensions["gen_ai.usage.output_tokens"])),
    avgInput = avg(todouble(customDimensions["gen_ai.usage.input_tokens"])),
    avgOutput = avg(todouble(customDimensions["gen_ai.usage.output_tokens"]))
  by model = tostring(customDimensions["gen_ai.request.model"])
| order by totalInput desc
```

### Tool Call Details
```kql
dependencies
| where operation_Id == "<operation_id>"
| where customDimensions["gen_ai.operation.name"] == "execute_tool"
| project timestamp, duration, success,
    toolName = tostring(customDimensions["gen_ai.tool.name"]),
    toolType = tostring(customDimensions["gen_ai.tool.type"]),
    toolCallId = tostring(customDimensions["gen_ai.tool.call.id"]),
    toolArgs = tostring(customDimensions["gen_ai.tool.call.arguments"]),
    toolResult = tostring(customDimensions["gen_ai.tool.call.result"])
| order by timestamp asc
```

Key tool attributes:

| Attribute | Description | Example |
|-----------|-------------|---------|
| `gen_ai.tool.name` | Tool function name | `remote_functions.bing_grounding`, `python` |
| `gen_ai.tool.type` | Tool type | `extension`, `function` |
| `gen_ai.tool.call.id` | Unique call ID | `call_db64aa6a004a...` |
| `gen_ai.tool.call.arguments` | JSON arguments passed | `{"query": "latest AI news"}` |
| `gen_ai.tool.call.result` | Tool output (may be truncated) | `<<ImageDisplayed>>` |

### Evaluation Results by Conversation
```kql
customEvents
| where timestamp > ago(24h)
| where name == "gen_ai.evaluation.result"
| extend
    evalName = tostring(customDimensions["gen_ai.evaluation.name"]),
    score = todouble(customDimensions["gen_ai.evaluation.score.value"]),
    label = tostring(customDimensions["gen_ai.evaluation.score.label"]),
    conversationId = tostring(customDimensions["gen_ai.conversation.id"])
| summarize
    evalCount = count(),
    avgScore = avg(score),
    failCount = countif(label == "fail" or label == "not_relevant" or label == "incorrect"),
    evaluators = make_set(evalName)
  by conversationId
| order by failCount desc
```

> For detailed eval queries by response ID or conversation ID, see [Eval Correlation](eval-correlation.md).

## OTel Reference Links

- [GenAI Spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/)
- [GenAI Agent Spans](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-agent-spans/)
- [GenAI Events](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-events/)
- [GenAI Metrics](https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-metrics/)
