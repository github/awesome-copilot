# MCP Server — Complete Reference

Aspire exposes an **MCP (Model Context Protocol) server** that lets AI coding assistants query and control your running distributed application, and search Aspire documentation. This enables AI tools to inspect resource status, read logs, view traces, restart services, and look up docs — all from within the AI assistant's context.

Reference: https://aspire.dev/get-started/configure-mcp/

---

## Setup: `aspire mcp init`

The easiest way to configure the MCP server is using the Aspire CLI:

```bash
# Open a terminal in your project directory
aspire mcp init
```

The command walks you through an interactive setup:

1. **Workspace root** — prompts for the path to your workspace root (defaults to current directory)
2. **Environment detection** — detects supported AI environments (VS Code, Copilot CLI, Claude Code, OpenCode) and asks which to configure
3. **Playwright MCP** — optionally offers to configure the Playwright MCP server alongside Aspire
4. **Config creation** — writes the appropriate configuration files (e.g., `.vscode/mcp.json`)
5. **AGENTS.md** — if one doesn't already exist, creates an `AGENTS.md` with Aspire-specific instructions for AI agents

> **Note:** `aspire mcp init` uses interactive prompts (Spectre.Console). It must be run in a real terminal — the VS Code integrated terminal may not handle the prompts correctly. Use an external terminal if needed.

---

## Understanding the Configuration

When you run `aspire mcp init`, the CLI creates configuration files appropriate for your detected environment.

### VS Code (GitHub Copilot)

Creates or updates `.vscode/mcp.json`:

```json
{
  "servers": {
    "aspire": {
      "type": "stdio",
      "command": "aspire",
      "args": ["mcp", "start"]
    }
  }
}
```

## MCP Tools

The tools available depend on your Aspire CLI version. Check with `aspire --version`.

### Tools available in 13.1+ (stable)

#### Resource management tools

These tools require a running AppHost (`aspire run`).

| Tool                         | Description                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| `list_resources`             | Lists all resources, including state, health status, source, endpoints, and commands                |
| `list_console_logs`          | Lists console logs for a resource                                                                   |
| `list_structured_logs`       | Lists structured logs, optionally filtered by resource name                                         |
| `list_traces`                | Lists distributed traces. Traces can be filtered using an optional resource name parameter          |
| `list_trace_structured_logs` | Lists structured logs for a specific trace                                                          |
| `execute_resource_command`   | Executes a resource command (accepts resource name and command name)                                |

#### AppHost management tools

| Tool             | Description                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------- |
| `list_apphosts`  | Lists all detected AppHost connections, showing which are in/out of working directory scope |
| `select_apphost` | Selects which AppHost to use when multiple are running                                      |

#### Integration tools

These work without a running AppHost.

| Tool                   | Description                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `list_integrations`    | Lists available Aspire hosting integrations (NuGet packages for databases, message brokers, cloud services, etc.) |
| `get_integration_docs` | Gets documentation for a specific Aspire hosting integration package                                              |

### Tools added in 13.2+ (documentation search)

> **Version gate:** These tools were added in [PR #14028](https://github.com/dotnet/aspire/pull/14028) and ship in Aspire CLI **13.2**. If you are on 13.1, these tools will NOT appear. To get them early, update to the daily channel: `aspire update --self --channel daily`.

| Tool          | Description                                                              |
| ------------- | ------------------------------------------------------------------------ |
| `list_docs`   | Lists all available documentation from aspire.dev                        |
| `search_docs` | Performs weighted lexical search across indexed aspire.dev documentation |
| `get_doc`     | Retrieves a specific document by its slug                                |

These tools index aspire.dev content using the `llms.txt` specification and provide weighted lexical search (titles 10x, summaries 8x, headings 6x, code 5x, body 1x). They work without a running AppHost.

### Fallback for documentation (13.1 users)

If you are on Aspire CLI 13.1 and don't have `list_docs`/`search_docs`/`get_doc`, use **Context7** as a fallback for documentation queries. See the [SKILL.md documentation research section](../SKILL.md#1-researching-aspire-documentation) for details.

---

## Excluding Resources from MCP

Resources and associated telemetry can be excluded from MCP results by annotating the resource:

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var apiService = builder.AddProject<Projects.Api>("apiservice")
    .ExcludeFromMcp();  // Hidden from MCP tools

builder.AddProject<Projects.Web>("webfrontend")
    .WithExternalHttpEndpoints()
    .WithReference(apiService);

builder.Build().Run();
```

---

## Supported AI Assistants

The `aspire mcp init` command supports:

- [VS Code](https://code.visualstudio.com/docs/copilot/customization/mcp-servers) (GitHub Copilot)
- [Copilot CLI](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-copilot-cli#add-an-mcp-server)
- [Claude Code](https://docs.claude.com/en/docs/claude-code/mcp)
- [OpenCode](https://opencode.ai/docs/mcp-servers/)

The MCP server uses the **STDIO transport protocol** and may work with other agentic coding environments that support this protocol.

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

3. **View traces:**

   - "Show me the trace for the last failed request"
   - "What's the latency for API → Database calls?"

4. **Control resources:**

   - "Restart the API service"
   - "Stop the worker while I debug the queue"

5. **Search docs (13.2+):**
   - "Search the Aspire docs for Redis caching"
   - "How do I configure service discovery?"
   - _(Requires CLI 13.2+. On 13.1, use Context7 or `list_integrations`/`get_integration_docs` for integration-specific docs.)_

---

## Security Considerations

- The MCP server only exposes resources from the local AppHost
- No authentication is required (local development only)
- The STDIO transport only works for the AI tool that spawned the process
- **Do not expose the MCP endpoint to the network in production**

---

## Limitations

- AI models have limits on data processing. Large data fields (e.g., stack traces) may be truncated.
- Requests involving large collections of telemetry may be shortened by omitting older items.

---

## Troubleshooting

If you run into issues, check the [open MCP issues on GitHub](https://github.com/dotnet/aspire/issues?q=is%3Aissue+is%3Aopen+label%3Aarea-mcp).

## See Also

- [aspire mcp command](https://aspire.dev/reference/cli/commands/aspire-mcp/)
- [aspire mcp init command](https://aspire.dev/reference/cli/commands/aspire-mcp-init/)
- [aspire mcp start command](https://aspire.dev/reference/cli/commands/aspire-mcp-start/)
- [GitHub Copilot in the Dashboard](https://aspire.dev/dashboard/copilot/)
- [How I taught AI to read Aspire docs](https://davidpine.dev/posts/aspire-docs-mcp-tools/)
