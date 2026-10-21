# Universal Attributes

This document covers attributes that can be used on any span kind in OpenInference.

## Overview

These attributes can be used on **any span kind** to provide additional context, tracking, and metadata.

## Input/Output

| Attribute          | Type   | Description                                          |
| ------------------ | ------ | ---------------------------------------------------- |
| `input.value`      | String | Input to the operation (prompt, query, document)     |
| `input.mime_type`  | String | MIME type (e.g., "text/plain", "application/json")   |
| `output.value`     | String | Output from the operation (response, vector, result) |
| `output.mime_type` | String | MIME type of output                                  |

### Why Capture I/O?

**Always capture input/output for evaluation-ready spans:**
- Phoenix evaluators (faithfulness, relevance, Q&A correctness) require `input.value` and `output.value`
- Phoenix UI displays I/O prominently in trace views for debugging
- Enables exporting I/O for creating fine-tuning datasets
- Provides complete context for analyzing agent behavior

**Example attributes:**

```json
{
  "openinference.span.kind": "CHAIN",
  "input.value": "What is the weather?",
  "input.mime_type": "text/plain",
  "output.value": "I don't have access to weather data.",
  "output.mime_type": "text/plain"
}
```

**See language-specific implementation:**
- TypeScript: `instrumentation-manual-typescript.md`
- Python: `instrumentation-manual-python.md`

## Session and User Tracking

| Attribute    | Type   | Description                                    |
| ------------ | ------ | ---------------------------------------------- |
| `session.id` | String | Session identifier for grouping related traces |
| `user.id`    | String | User identifier for per-user analysis          |

**Example:**

```json
{
  "openinference.span.kind": "LLM",
  "session.id": "session_abc123",
  "user.id": "user_xyz789"
}
```

## Metadata

| Attribute  | Type   | Description                                |
| ---------- | ------ | ------------------------------------------ |
| `metadata` | string | JSON-serialized object of key-value pairs  |

**Example:**

```json
{
  "openinference.span.kind": "LLM",
  "metadata": "{\"environment\": \"production\", \"model_version\": \"v2.1\", \"cost_center\": \"engineering\"}"
}
```
