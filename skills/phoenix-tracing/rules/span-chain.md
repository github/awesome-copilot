# CHAIN Spans

## Purpose

CHAIN spans represent orchestration layers in your application (LangChain chains, custom workflows, application entry points). Often used as root spans.

## Required Attributes

| Attribute                 | Type   | Description     | Required |
| ------------------------- | ------ | --------------- | -------- |
| `openinference.span.kind` | String | Must be "CHAIN" | Yes      |

## Common Attributes

CHAIN spans typically use [Universal Attributes](fundamentals-universal-attributes.md):

- `input.value` - Input to the chain (user query, request payload)
- `output.value` - Output from the chain (final response)
- `input.mime_type` / `output.mime_type` - Format indicators

## Example: Root Chain

```json
{
  "openinference.span.kind": "CHAIN",
  "input.value": "{\"question\": \"What is the capital of France?\"}",
  "input.mime_type": "application/json",
  "output.value": "{\"answer\": \"The capital of France is Paris.\", \"sources\": [\"doc_123\"]}",
  "output.mime_type": "application/json",
  "session.id": "session_abc123",
  "user.id": "user_xyz789"
}
```

## Example: Nested Sub-Chain

```json
{
  "openinference.span.kind": "CHAIN",
  "input.value": "Summarize this document: ...",
  "output.value": "This document discusses..."
}
```
