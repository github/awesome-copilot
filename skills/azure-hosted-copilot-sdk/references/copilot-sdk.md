# Copilot SDK Reference

## Template

```bash
azd init --template azure-samples/copilot-sdk-service
```

**Architecture:** API (Express/TS) + Web UI (React/Vite), deployed as 2 Container Apps. Chat endpoint streams token-level deltas via `assistant.message_delta` SSE events. Azure BYOM gets a fresh bearer token per-request (no expiry issues).

## Documentation

| Resource | URL |
|----------|-----|
| Overview & Getting Started | https://github.com/github/copilot-sdk |
| Getting Started Guide | https://github.com/github/copilot-sdk/blob/main/docs/getting-started.md |
| Node.js SDK | https://github.com/github/copilot-sdk/tree/main/nodejs |
| Python SDK | https://github.com/github/copilot-sdk/tree/main/python |
| Go SDK | https://github.com/github/copilot-sdk/tree/main/go |
| .NET SDK | https://github.com/github/copilot-sdk/tree/main/dotnet |
| Debugging | https://github.com/github/copilot-sdk/blob/main/docs/debugging.md |
| Compatibility | https://github.com/github/copilot-sdk/blob/main/docs/compatibility.md |

## Getting Current Examples

Use **context7** MCP tools as the PRIMARY way to get SDK documentation and code examples:

1. Call `context7-resolve-library-id` with `libraryName: "copilot-sdk"` to find the library ID
2. Call `context7-query-docs` with the resolved ID and a query matching the user's goal
3. Select the most relevant snippets for the user's scenario

> 💡 **Tip:** Fall back to `github-mcp-server-get_file_contents` with `owner: "github"`, `repo: "copilot-sdk"` to read files directly from the repo.

## Three Model Paths

| Path | Config | Auth |
|------|--------|------|
| GitHub default | No `model` param | `GITHUB_TOKEN` |
| GitHub specific | `model: "<name>"` | `GITHUB_TOKEN` |
| Azure BYOM | `model` + `provider` with `bearerToken` | `DefaultAzureCredential` (local dev) / `ManagedIdentityCredential` (production) |

**Model discovery:**
- GitHub models: call `listModels()` on the SDK client
- Azure deployments: `az cognitiveservices account deployment list`

Full BYOM config details: [Azure Model Configuration](azure-model-config.md).

> ⚠️ **Warning:** `model` is **required** when using a provider — SDK throws if missing.

## Template Customization

Read `AGENTS.md` FIRST — it lists every source file with its purpose. Then:

1. Adapt routes — update endpoints, system message, and tool definitions
2. Customize the UI — the template UI is just an example
3. Keep template infra — do NOT regenerate Dockerfile, Bicep, or `azure.yaml`
4. If using multi-tool AI sessions, increase `proxy_read_timeout` in `nginx.conf.template` to 300s (default 60s causes 504)

**Existing project:** See [Existing Project Integration](existing-project-integration.md) for adding Copilot SDK to your codebase.

## Testing

| Check | Command |
|-------|---------|
| Run locally | `azd app run` — starts API + UI |
| Health check | `curl -s http://localhost:3000/health` |
| Test endpoint | `curl -s -X POST http://localhost:3000/api/<endpoint> -H "Content-Type: application/json" -d '{"input":"test"}'` |

## Errors

| Error | Fix |
|-------|-----|
| `docker info` fails | Install Docker Desktop and start it |
| `gh auth token` fails | Run `gh auth login` then `gh auth refresh --scopes copilot` |
| `ECONNREFUSED` on JSON-RPC | Set autoStart or start CLI manually |
| `Model not available` | Check model name; for BYOM verify provider config |
| Session hangs | Set a max turns limit or add a hook to break |
| `504 Gateway Timeout` | Increase `proxy_read_timeout` in `nginx.conf.template` to 300s |
