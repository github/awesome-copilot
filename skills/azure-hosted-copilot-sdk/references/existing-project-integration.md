# Integrating Copilot SDK into Existing Projects

Add Copilot SDK AI features to an existing application.

## Project Analysis

Detect the project type by scanning for indicator files:

| Indicator | Language | Framework hints |
|-----------|----------|-----------------|
| `package.json` | Node.js | Express, Fastify, Next.js |
| `requirements.txt` / `pyproject.toml` | Python | Flask, FastAPI, Django |
| `go.mod` | Go | Gin, Echo, net/http |
| `*.csproj` / `*.sln` | .NET | ASP.NET, Minimal API |

## Study Template Patterns

Read the template via MCP for reference implementation:

`github-mcp-server-get_file_contents` with `owner: "azure-samples"`, `repo: "copilot-sdk-service"`. Read `AGENTS.md` first.

Use context7 tools (`context7-resolve-library-id` → `context7-query-docs`) for current SDK API examples.

## Integration Steps

### 1. Add SDK dependency

| Language | Package |
|----------|---------|
| Node.js | `@github/copilot-sdk` |
| Python | `github-copilot-sdk` |
| Go / .NET | See SDK repo |

### 2. Create Copilot endpoint

Add a route (e.g., `/api/chat`) that creates a `CopilotClient`, starts a session, and returns the response. Use `sendAndWait` for one-shot or SSE streaming for chat.

Adapt to the app's existing routing pattern (Express router, FastAPI route, etc.).

### 3. Configure authentication

Use `gh auth token` for local dev; for production, use Key Vault.

### 4. Wire into existing app

Register the new route with the existing server/app instance. Do NOT create a separate server.

> ⚠️ **Warning:** Do not duplicate server startup logic.

## BYOM Support

If the user wants Azure BYOM, add on top of standard integration:

1. Add `@azure/identity` dependency
2. Get fresh token per request: `credential.getToken("https://cognitiveservices.azure.com/.default")`
3. Pass `provider` config with `bearerToken` to `createSession`
4. Set `model` to Azure deployment name (required)
5. Set env vars: `AZURE_OPENAI_ENDPOINT`, `MODEL_NAME`

See [Azure Model Configuration](azure-model-config.md).

## Testing

```bash
curl -s -X POST http://localhost:<port>/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
```

## Errors

| Error | Fix |
|-------|-----|
| SDK not found | Verify dependency installed and import path |
| Auth fails locally | Run `gh auth login` then `gh auth refresh --scopes copilot` |
| Route conflicts | Ensure endpoint path doesn't collide |
