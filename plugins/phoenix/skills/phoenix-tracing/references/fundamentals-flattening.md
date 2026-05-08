# Flattening Convention

OpenInference flattens nested data structures into dot-notation attributes for database compatibility, OpenTelemetry compatibility, and simple querying.

## Flattening Rules

**Objects → Dot Notation**

```javascript
{ llm: { model_name: "gpt-4", token_count: { prompt: 10, completion: 20 } } }
// becomes
{ "llm.model_name": "gpt-4", "llm.token_count.prompt": 10, "llm.token_count.completion": 20 }
```

**Arrays → Zero-Indexed Notation**

```javascript
{ llm: { input_messages: [{ role: "user", content: "Hi" }] } }
// becomes
{ "llm.input_messages.0.message.role": "user", "llm.input_messages.0.message.content": "Hi" }
```

**Message Convention: `.message.` segment required**

```
llm.input_messages.{index}.message.{field}
llm.input_messages.0.message.tool_calls.0.tool_call.function.name
```

## Complete Example

```javascript
// Original
{
  openinference: { span: { kind: "LLM" } },
  llm: {
    model_name: "claude-3-5-sonnet-20241022",
    invocation_parameters: { temperature: 0.7, max_tokens: 1000 },
    input_messages: [{ role: "user", content: "Tell me a joke" }],
    output_messages: [{ role: "assistant", content: "Why did the chicken cross the road?" }],
    token_count: { prompt: 5, completion: 10, total: 15 }
  }
}

// Flattened (stored in Phoenix spans.attributes JSONB)
{
  "openinference.span.kind": "LLM",
  "llm.model_name": "claude-3-5-sonnet-20241022",
  "llm.invocation_parameters": "{\"temperature\": 0.7, \"max_tokens\": 1000}",
  "llm.input_messages.0.message.role": "user",
  "llm.input_messages.0.message.content": "Tell me a joke",
  "llm.output_messages.0.message.role": "assistant",
  "llm.output_messages.0.message.content": "Why did the chicken cross the road?",
  "llm.token_count.prompt": 5,
  "llm.token_count.completion": 10,
  "llm.token_count.total": 15
}
```
