# MCP Server Templates

Templates for hosting MCP (Model Context Protocol) servers on Azure Functions.

**Indicators**: `mcp_tool_trigger`, `MCPTrigger`, `@app.mcp_tool`, project name contains "mcp"

## Standard MCP Templates

| Language | Template |
|----------|----------|
| Python | `azd init -t remote-mcp-functions-python` |
| TypeScript | `azd init -t remote-mcp-functions-typescript` |
| C# (.NET) | `azd init -t remote-mcp-functions-dotnet` |
| Java | `azd init -t remote-mcp-functions-java` |

## MCP + API Management (OAuth)

| Language | Template |
|----------|----------|
| Python | `azd init -t remote-mcp-apim-functions-python` |

## Self-Hosted MCP SDK

| Language | Template |
|----------|----------|
| Python | `azd init -t remote-mcp-sdk-functions-hosting-python` |
| TypeScript | `azd init -t remote-mcp-sdk-functions-hosting-node` |
| C# | `azd init -t remote-mcp-sdk-functions-hosting-dotnet` |

## Local Development

MCP templates require local storage emulation (Azurite) for local testing:

```bash
# Start Azurite (in separate terminal or background)
npx azurite --silent --location /tmp/azurite &

# Build and run
npm install
npm run build
func start
```

> The template's `local.settings.json` uses `UseDevelopmentStorage=true` which requires Azurite.

## Storage Requirements

MCP needs Queue storage for state management and backplane. Ensure `enableQueue: true` in `main.bicep`:

```bicep
var storageEndpointConfig = {
  enableBlob: true   // Required for deployment
  enableQueue: true  // Required for MCP state management and backplane
  enableTable: false // Not required for MCP
}
```
