# MCP (Model Context Protocol) Recipe

Adds MCP tool endpoints to an Azure Functions base template for AI agent integration.

## Overview

This recipe creates Azure Functions that expose tools via the Model Context Protocol (MCP),
enabling AI agents (like GitHub Copilot, Claude, etc.) to invoke your functions as tools.

## Integration Type

| Aspect | Value |
|--------|-------|
| **Trigger** | HTTP (MCP protocol) |
| **Protocol** | JSON-RPC 2.0 over HTTP |
| **Auth** | Function key or Entra ID |
| **IaC** | ⚠️ Set `enableQueue: true` in main.bicep |

## Storage Endpoint Flags

MCP uses Queue storage for state management and backplane. Set the flag in main.bicep:

```bicep
module storage './shared/storage.bicep' = {
  params: {
    enableBlob: true    // Default - deployment packages
    enableQueue: true   // Required for MCP - state management and backplane
  }
}
```

## Composition Steps

Apply these steps AFTER `azd init -t functions-quickstart-{lang}-azd`:

| # | Step | Details |
|---|------|---------|
| 1 | **Replace source code** | Add MCP tool handlers from `source/{lang}.md` |
| 2 | **Configure host.json** | Enable HTTP/2 for streaming (optional) |

## MCP Tool Pattern

Each MCP tool is a function that:
1. Receives JSON-RPC request with tool name and arguments
2. Executes the tool logic
3. Returns JSON-RPC response with result

## Files

| Path | Description |
|------|-------------|
| [source/python.md](source/python.md) | Python MCP tools using `@app.mcp_tool` decorator |
| [source/typescript.md](source/typescript.md) | TypeScript MCP tools |
| [source/javascript.md](source/javascript.md) | JavaScript MCP tools |
| [source/dotnet.md](source/dotnet.md) | C# (.NET) MCP tools |
| [source/java.md](source/java.md) | Java MCP tools |
| [source/powershell.md](source/powershell.md) | PowerShell MCP tools |
| [eval/summary.md](eval/summary.md) | Evaluation summary |
| [eval/python.md](eval/python.md) | Python evaluation results |

## Example Tools Included

| Tool | Description |
|------|-------------|
| `get_weather` | Returns weather for a city (demo) |
| `search_docs` | Searches documentation (demo) |
| `run_query` | Executes a database query (demo) |

## MCP Configuration

Add to your MCP client config (e.g., `.copilot/mcp-config.json`):

```json
{
  "servers": {
    "my-azure-tools": {
      "type": "http",
      "url": "https://<func-app>.azurewebsites.net/api/mcp",
      "headers": {
        "x-functions-key": "<function-key>"
      }
    }
  }
}
```

## Common Issues

### Tool Not Discovered

**Cause:** MCP client can't reach the function endpoint.

**Solution:** Verify function URL and authentication key.

### Timeout on Long Operations

**Cause:** Default HTTP timeout exceeded.

**Solution:** Use streaming responses or async patterns for long operations.
