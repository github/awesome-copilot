# Foundry Project Connections

Connections authenticate and link external resources to a Foundry project. Many agent tools (Azure AI Search, Bing Grounding, MCP) require a project connection before use.

## Managing Connections via MCP

Use the Foundry MCP server for all connection operations. The MCP tools handle authentication, validation, and project scoping automatically.

| Operation | MCP Tool | Description |
|-----------|----------|-------------|
| List all connections | `foundry_connections_list` | Lists all connections in the current project |
| Get connection details | `foundry_connections_get` | Retrieves a specific connection by name, including its ID |
| Create a connection | `foundry_connections_create` | Creates a new connection to an external resource |
| Delete a connection | `foundry_connections_delete` | Removes a connection from the project |

> 💡 **Tip:** The `connection_id` returned by `foundry_connections_get` is the value you pass as `project_connection_id` when configuring agent tools.

## Create Connection via Portal

1. Open [Microsoft Foundry portal](https://ai.azure.com)
2. Navigate to **Operate** → **Admin** → select your project
3. Select **Add connection** → choose service type
4. Browse for resource, select auth method, click **Add connection**

## Connection ID Format

For REST and TypeScript samples, the full connection ID format is:

```
/subscriptions/{subId}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{account}/projects/{project}/connections/{connectionName}
```

Python and C# SDKs resolve this automatically from the connection name.

## Common Connection Types

| Type | Resource | Used By |
|------|----------|---------|
| `azure_ai_search` | Azure AI Search | AI Search tool |
| `bing` | Grounding with Bing Search | Bing grounding tool |
| `bing_custom_search` | Grounding with Bing Custom Search | Bing Custom Search tool |
| `api_key` | Any API-key resource | MCP servers, custom tools |
| `azure_openai` | Azure OpenAI | Model access |

## RBAC for Connection Management

| Role | Scope | Permission |
|------|-------|------------|
| **Azure AI Project Manager** | Project | Create/manage project connections |
| **Contributor** or **Owner** | Subscription/RG | Create Bing/Search resources, get keys |

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Connection not found` | Name mismatch or wrong project | Use `foundry_connections_list` to find correct name |
| `Unauthorized` creating connection | Missing Azure AI Project Manager role | Assign role on the Foundry project |
| `Invalid connection ID format` | Using name instead of full resource ID | Use `foundry_connections_get` to resolve the full ID |
