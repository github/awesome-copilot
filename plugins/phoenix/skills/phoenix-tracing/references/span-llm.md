# LLM Spans

Represent calls to language models (OpenAI, Anthropic, local models, etc.).

## Required Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `openinference.span.kind` | String | Must be "LLM" |
| `llm.model_name` | String | Model identifier (e.g., "gpt-4", "claude-3-5-sonnet-20241022") |

## Key Attributes

| Category | Attributes | Example |
|----------|------------|---------|
| **Model** | `llm.model_name`, `llm.provider` | "gpt-4-turbo", "openai" |
| **Tokens** | `llm.token_count.prompt`, `llm.token_count.completion`, `llm.token_count.total` | 25, 8, 33 |
| **Cost** | `llm.cost.prompt`, `llm.cost.completion`, `llm.cost.total` | 0.0021, 0.0045, 0.0066 |
| **Parameters** | `llm.invocation_parameters` (JSON) | `{"temperature": 0.7, "max_tokens": 1024}` |
| **Messages** | `llm.input_messages.{i}.*`, `llm.output_messages.{i}.*` | See examples below |
| **Tools** | `llm.tools.{i}.tool.json_schema` | Function definitions |

## Cost Tracking

**Core attributes:**
- `llm.cost.prompt` - Total input cost (USD)
- `llm.cost.completion` - Total output cost (USD)
- `llm.cost.total` - Total cost (USD)

**Detailed cost breakdown:**
- `llm.cost.prompt_details.{input,cache_read,cache_write,audio}` - Input cost components
- `llm.cost.completion_details.{output,reasoning,audio}` - Output cost components

## Messages

**Input messages:**
- `llm.input_messages.{i}.message.role` - "user", "assistant", "system", "tool"
- `llm.input_messages.{i}.message.content` - Text content
- `llm.input_messages.{i}.message.contents.{j}` - Multimodal (text + images)
- `llm.input_messages.{i}.message.tool_calls` - Tool invocations

**Output messages:** Same structure as input messages.

## Example: Basic LLM Call

```json
{
  "openinference.span.kind": "LLM",
  "llm.model_name": "claude-3-5-sonnet-20241022",
  "llm.invocation_parameters": "{\"temperature\": 0.7, \"max_tokens\": 1024}",
  "llm.input_messages.0.message.role": "system",
  "llm.input_messages.0.message.content": "You are a helpful assistant.",
  "llm.input_messages.1.message.role": "user",
  "llm.input_messages.1.message.content": "What is the capital of France?",
  "llm.output_messages.0.message.role": "assistant",
  "llm.output_messages.0.message.content": "The capital of France is Paris.",
  "llm.token_count.prompt": 25,
  "llm.token_count.completion": 8,
  "llm.token_count.total": 33
}
```

## Example: LLM with Tool Calls

```json
{
  "openinference.span.kind": "LLM",
  "llm.model_name": "gpt-4-turbo",
  "llm.input_messages.0.message.content": "What's the weather in SF?",
  "llm.output_messages.0.message.tool_calls.0.tool_call.function.name": "get_weather",
  "llm.output_messages.0.message.tool_calls.0.tool_call.function.arguments": "{\"location\": \"San Francisco\"}",
  "llm.tools.0.tool.json_schema": "{\"type\": \"function\", \"function\": {\"name\": \"get_weather\"}}"
}
```

## See Also

- **Instrumentation:** `instrumentation-auto-python.md`, `instrumentation-manual-python.md`
- **Full spec:** https://github.com/Arize-ai/openinference/blob/main/spec/semantic_conventions.md
