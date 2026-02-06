# MCP Server — Complete Reference

Aspire exposes an **MCP (Model Context Protocol) server** that lets AI coding assistants query and control your running distributed application. This enables AI tools to inspect resource status, read logs, view traces, and restart services — all from within the AI assistant's context.

---

## Two Entry Points

| Mode | Transport | Protocol | Start Method |
|---|---|---|---|
| **CLI** | STDIO | MCP over stdin/stdout | `aspire mcp init` generates config |
| **Dashboard** | HTTP (SSE) | MCP over Server-Sent Events | Auto-started with dashboard |

### CLI MCP Server (STDIO)

The CLI-based MCP server runs as a subprocess of your AI tool. Your AI assistant spawns the Aspire process and communicates via stdin/stdout.

```bash
# Initialize — interactive, selects your AI tool
aspire mcp init
```

This generates the appropriate config file for your AI tool.

### Dashboard MCP Server (HTTP/SSE)

The dashboard automatically exposes an MCP endpoint when running. AI tools connect via HTTP/SSE to the dashboard URL.

No additional setup needed — if the dashboard is running, the MCP endpoint is available.

---

## MCP Tools (10 available)

| Tool | Description | Example use |
|---|---|---|
| `list_resources` | List all resources in the AppHost | "What services are running?" |
| `get_resource` | Get details of a specific resource | "Show me the API resource details" |
| `get_resource_logs` | Get console logs for a resource | "Show me the last 50 log lines from the API" |
| `get_resource_health` | Get health check status | "Is the database healthy?" |
| `start_resource` | Start a stopped resource | "Start the worker service" |
| `stop_resource` | Stop a running resource | "Stop the ML service" |
| `restart_resource` | Restart a resource | "Restart the API" |
| `get_dashboard_url` | Get the dashboard URL | "Open the Aspire dashboard" |
| `get_traces` | Get distributed traces | "Show me recent traces for the API" |
| `get_metrics` | Get metrics data | "What's the request rate for the API?" |

---

## Setup by AI Assistant

### Claude Code

```bash
aspire mcp init
# Select: Claude Code
```

Generates `.mcp.json` in the project root:

```json
{
  "mcpServers": {
    "aspire": {
      "command": "aspire",
      "args": ["mcp", "serve"],
      "cwd": "/path/to/your/apphost"
    }
  }
}
```

### GitHub Copilot (VS Code)

```bash
aspire mcp init
# Select: GitHub Copilot (VS Code)
```

Generates `.vscode/mcp.json`:

```json
{
  "servers": {
    "aspire": {
      "command": "aspire",
      "args": ["mcp", "serve"],
      "cwd": "${workspaceFolder}/src/AppHost"
    }
  }
}
```

### Cursor

```bash
aspire mcp init
# Select: Cursor
```

Generates `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "aspire": {
      "command": "aspire",
      "args": ["mcp", "serve"],
      "cwd": "/path/to/your/apphost"
    }
  }
}
```

### OpenAI Codex CLI

```bash
aspire mcp init
# Select: OpenAI Codex CLI
```

Generates appropriate configuration for the Codex CLI environment.

### VS Code Chat

```bash
aspire mcp init
# Select: VS Code Chat
```

Uses the same `.vscode/mcp.json` format as GitHub Copilot.

---

## Usage Patterns

### Debugging with AI assistance

Once MCP is configured, your AI assistant can:

1. **Inspect running state:**
   - "List all my Aspire resources and their status"
   - "Is the database healthy?"
   - "What port is the API running on?"

2. **Read logs:**
   - "Show me the recent logs from the ML service"
   - "Are there any errors in the worker logs?"
   - "What was the last exception in the API?"

3. **View traces:**
   - "Show me the trace for the last failed request"
   - "What's the latency for API → Database calls?"

4. **Control resources:**
   - "Restart the API service"
   - "Stop the worker while I debug the queue"
   - "Start the ML service back up"

### Example conversation flow

```
User: "My API is returning 500 errors"

AI Assistant (using MCP):
1. Calls list_resources → sees API is "Running"
2. Calls get_resource_logs("api") → finds NullReferenceException
3. Calls get_traces("api") → finds the failing endpoint
4. Reports: "The /orders endpoint is throwing a NullReferenceException 
   at OrderService.cs:42. The trace shows the database connection 
   string is null — the WithReference() for the database might be 
   missing in your AppHost."
```

---

## Security Considerations

- The MCP server only exposes resources from the local AppHost
- No authentication is required (local development only)
- The STDIO transport only works for the AI tool that spawned the process
- The HTTP/SSE transport is bound to localhost by default
- **Do not expose the MCP endpoint to the network in production**
