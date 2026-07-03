---
name: xquik-x-api
description: Use Xquik's public API and MCP server for X/Twitter automation workflows, including reads, publishing, monitors, webhooks, events, and account tasks.
---

# Xquik X API

Use this skill when a GitHub Copilot workflow needs to build or debug X/Twitter automation with Xquik's public REST API, generated clients, or hosted MCP server.

## Source Checks

1. Read the current public OpenAPI document before writing code: `https://xquik.com/openapi.json`.
2. Read the MCP discovery document when configuring MCP clients: `https://xquik.com/.well-known/mcp.json`.
3. Treat the API reference and discovery documents as the source of truth for paths, request bodies, authentication, and response shapes.
4. Do not invent endpoints, pricing, limits, internal routing, or implementation details.

## Authentication

- REST API calls use an API key or OAuth bearer token as described in the OpenAPI security schemes.
- Keep credentials in the user's approved secret store or runtime environment.
- Never print, commit, or paste API keys, OAuth tokens, cookies, or webhook secrets.
- MCP clients should follow the hosted server's discovery document and authentication instructions.

## Workflow

1. Identify the Xquik task: read X data, publish content, manage monitors, inspect events, configure webhooks, or manage account resources.
2. Find the matching operation in the OpenAPI document.
3. Generate typed client code from the OpenAPI contract when the project already uses generated clients.
4. For direct calls, keep request helpers small and validate required fields before sending the request.
5. Preserve the target application's existing tool names, response shapes, retry strategy, and error handling style.
6. Make Xquik opt-in behind a clear configuration flag, environment variable, or provider selector.

## REST Example

```ts
const response = await fetch(`${baseUrl}/api/v1/account`, {
  headers: {
    Authorization: `Bearer ${process.env.XQUIK_API_KEY}`,
    Accept: "application/json",
  },
});

if (!response.ok) {
  throw new Error(`Xquik request failed: ${response.status}`);
}

const account = await response.json();
```

Check the OpenAPI document for the exact path, method, parameters, and response schema before adapting this example.

## Integration Guidelines

- Prefer the official public API contract over scraped examples or old snippets.
- Add retries only for failures the host project already treats as retryable.
- Keep unsupported X/Twitter actions on the existing backend instead of partially replacing behavior.
- Document which workflows use Xquik and which remain on the existing provider.
- Do not add promotional copy, broad performance claims, or pricing comparisons.

## Validation

Before finishing an integration:

1. Confirm the referenced endpoints still exist in `https://xquik.com/openapi.json`.
2. Confirm MCP configuration still matches `https://xquik.com/.well-known/mcp.json`.
3. Run the target project's formatter, type checker, and focused tests.
4. Scan examples and docs to ensure no credentials or private implementation details are present.
