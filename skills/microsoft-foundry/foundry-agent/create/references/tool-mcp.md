# MCP Tool (Model Context Protocol)

Connect agents to remote MCP servers to extend capabilities with external tools and data sources. MCP is an open standard for LLM tool integration.

## Prerequisites

- A remote MCP server endpoint (e.g., `https://api.githubcopilot.com/mcp`)
- For authenticated servers: a [project connection](../../../project/connections.md) storing credentials
- RBAC: **Contributor** or **Owner** role on the Foundry project

## Authenticated Server Connections

For authenticated MCP servers, create an `api_key` project connection to store credentials. Unauthenticated servers (public endpoints) don't need a connection — omit `project_connection_id`.

See [Project Connections](../../../project/connections.md) for connection management via Foundry MCP tools.

## MCPTool Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `server_label` | Yes | Unique label for this MCP server within the agent |
| `server_url` | Yes | Remote MCP server endpoint URL |
| `require_approval` | No | `"always"` (default), `"never"`, or `{"never": ["tool1"]}` / `{"always": ["tool1"]}` |
| `allowed_tools` | No | List of specific tools to enable (default: all) |
| `project_connection_id` | No | Connection ID for authenticated servers |

## Approval Workflow

1. Agent sends request → MCP server returns tool calls
2. Response contains `mcp_approval_request` items
3. Your code reviews tool name + arguments
4. Submit `McpApprovalResponse` with `approve=True/False`
5. Agent completes work using approved tool results

> **Best practice:** Always use `require_approval="always"` unless you fully trust the MCP server. Use `allowed_tools` to restrict which tools the agent can access.

## Hosting Local MCP Servers

Agent Service only accepts **remote** MCP endpoints. To use a local server, deploy it to:

| Platform | Transport | Notes |
|----------|-----------|-------|
| [Azure Container Apps](https://github.com/Azure-Samples/mcp-container-ts) | HTTP POST/GET | Any language, container rebuild needed |
| [Azure Functions](https://github.com/Azure-Samples/mcp-sdk-functions-hosting-python) | HTTP streamable | Python/Node/.NET/Java, key-based auth |

## Known Limitations

- **100-second timeout** for non-streaming MCP tool calls
- **Identity passthrough not supported in Teams** — agents published to Teams use project managed identity
- **Network-secured Foundry** can't use private MCP servers in same vNET — only public endpoints

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Invalid tool schema` | `anyOf`/`allOf` in MCP server definition | Update MCP server schema to use simple types |
| `Unauthorized` / `Forbidden` | Wrong credentials in connection | Verify connection credentials match server requirements |
| Model never calls MCP tool | Misconfigured server_label/url | Check `server_label`, `server_url`, `allowed_tools` values |
| Agent stalls after approval | Missing `previous_response_id` | Include `previous_response_id` in follow-up request |
| Timeout | Server takes >100s | Optimize server-side logic or break into smaller operations |

## References

- [MCP tool documentation](https://learn.microsoft.com/azure/ai-foundry/agents/how-to/tools/mcp?view=foundry)
- [Tool Catalog](https://learn.microsoft.com/azure/ai-foundry/agents/concepts/tool-catalog?view=foundry)
- [Project Connections](../../../project/connections.md)
