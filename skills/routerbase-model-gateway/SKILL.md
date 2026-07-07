---
name: routerbase-model-gateway
description: Integrate and route AI model requests through RouterBase. Use when migrating OpenAI-compatible clients, choosing model IDs, designing fallbacks, configuring streaming, tool calling, JSON mode, or building chat, image, video, audio, speech, and embedding workflows.
---

# RouterBase Model Gateway

Use [routerbase](https://routerbase.com/) as an OpenAI-compatible model gateway for AI applications. This skill helps you migrate existing OpenAI SDK clients, keep credentials private, select model IDs, and design production-safe fallback behavior across chat, image, video, audio, speech, and embedding workflows.

## When to Use This Skill

Use this skill when the task involves:

- Migrating an OpenAI-compatible client to RouterBase.
- Adding RouterBase to a backend, serverless function, CLI, agent, or internal tool.
- Selecting model IDs by cost, latency, quality, context length, modality, or feature support.
- Designing fallback routing for chat, vision, tool calling, JSON output, or streaming.
- Building image, video, audio, speech, or embedding workflows.
- Debugging RouterBase authentication, endpoint paths, request payloads, model IDs, streaming, or async media jobs.

## Prerequisites

- A server-side runtime that can safely read environment variables.
- `ROUTERBASE_API_KEY` configured outside the repository.
- An OpenAI-compatible SDK or HTTP client.
- A clear validation path for model availability, pricing, and feature support before production.

## Core Capabilities

### 1. OpenAI-Compatible Migration

Preserve the existing OpenAI-compatible request shape when possible. Change the base URL to `https://routerbase.com/v1`, use `ROUTERBASE_API_KEY`, and keep provider secrets out of client-side code.

```js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.ROUTERBASE_API_KEY,
  baseURL: process.env.ROUTERBASE_BASE_URL || "https://routerbase.com/v1",
});
```

### 2. Model Routing

Turn workload requirements into a routing table:

```markdown
| Use case | Primary model | Fallback model | Reason | Validation |
| --- | --- | --- | --- | --- |
| Support chat | model-id | model-id | Low latency and tool support | Run fixture prompts and compare output shape |
```

Treat model IDs, prices, and availability as live catalog data. If you cannot check the live catalog, label model IDs as examples and explain what must be verified.

### 3. Media Workflows

Keep media workflows modality-specific:

- Image generation is usually a synchronous request/response workflow.
- Video and some audio jobs may be asynchronous and require polling or callbacks.
- Persist task IDs, statuses, result URLs, request payload hashes, and error details.
- Store generated media in durable application storage if it must be reused.

## Usage Examples

### Chat Migration

```
Use routerbase-model-gateway to migrate this OpenAI chat completion code to RouterBase.
```

### Routing Plan

```
Use routerbase-model-gateway to choose a primary and fallback model for low-latency support chat with JSON output.
```

### Media Generation

```
Use routerbase-model-gateway to add image and video generation with async polling and safe storage.
```

## Guidelines

1. **Keep secrets server-side** - Never put RouterBase keys in browser code, mobile apps, logs, screenshots, or public repositories.
2. **Validate features** - Confirm the selected model supports required features such as streaming, tool calling, JSON mode, vision, context length, or media parameters.
3. **Retry carefully** - Retry network timeouts, transient rate limits, and 5xx failures. Do not blindly retry authentication, validation, invalid-model, or policy errors.
4. **Log safely** - Log request type, model ID, latency, status, and retry count, but not API keys, private prompts, private media URLs, or customer payloads.
5. **Use human review** - Require human review for high-impact medical, legal, financial, safety, security, or compliance outputs.

## Output Checklist

When completing a RouterBase task, provide:

- The base URL or endpoint.
- The required environment variables.
- Files changed or proposed.
- A minimal request example.
- A routing table with primary and fallback models.
- Retry and error-handling behavior.
- A smoke-test or validation plan.
- Remaining assumptions about live catalog availability, pricing, or account access.
