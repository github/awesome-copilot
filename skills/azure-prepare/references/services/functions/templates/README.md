# Azure Functions Templates

AZD template selection for Azure Functions deployments.

## Template Selection: Base + Recipe Composition

**Check integration indicators IN ORDER before defaulting to HTTP.**

All integrations use the **HTTP base template** (per language) + a **composable recipe** for the integration delta.

| Priority | Integration | Indicators | Action |
|----------|-------------|------------|--------|
| 1 | MCP Server | `MCPTrigger`, `@app.mcp_tool`, "mcp" in name | HTTP base + [MCP source](mcp.md) (no IaC delta) |
| 2 | Cosmos DB | `CosmosDBTrigger`, `@app.cosmos_db` | HTTP base + [cosmosdb recipe](recipes/cosmosdb/README.md) |
| 3 | Azure SQL | `SqlTrigger`, `@app.sql` | HTTP base + sql recipe |
| 4 | AI/OpenAI | `openai`, `langchain`, `semantic_kernel` | [Awesome AZD](https://azure.github.io/awesome-azd/?tags=functions&name=ai) |
| 5 | SWA | `staticwebapp.config.json` | [integrations.md](integrations.md) |
| 6 | Service Bus | `ServiceBusTrigger` | HTTP base + servicebus recipe |
| 7 | Durable | `DurableOrchestrationTrigger` | HTTP base + durable source (no IaC delta) |
| 8 | Event Hubs | `EventHubTrigger` | HTTP base + eventhubs recipe |
| 9 | Blob | `BlobTrigger` | HTTP base + blob-eventgrid recipe |
| 10 | Timer | `TimerTrigger`, `@app.schedule` | HTTP base + timer source (no IaC delta) |
| 11 | **HTTP (default)** | No specific indicators | [HTTP base only](http.md) |

See [selection.md](selection.md) for detailed indicator patterns.
See [recipes/README.md](recipes/README.md) for the composable recipe architecture.

## Template Usage

```bash
# Non-interactive initialization (REQUIRED for agents)
ENV_NAME="$(basename "$PWD" | tr '[:upper:]' '[:lower:]' | tr ' _' '-')-dev"
azd init -t <TEMPLATE> -e "$ENV_NAME" --no-prompt
```

| Flag | Purpose |
|------|---------|
| `-e <name>` | Set environment name |
| `-t <template>` | Specify template |
| `--no-prompt` | Skip confirmations (required) |

## What azd Creates

- Flex Consumption plan (default)
- User-assigned managed identity
- RBAC role assignments (no connection strings)
- Storage with `allowSharedKeyAccess: false`
- App Insights with `disableLocalAuth: true`

## References

- [Composable Recipes](recipes/README.md) — **NEW: Base + Recipe composition architecture**
- [MCP Server Templates](mcp.md)
- [HTTP Templates](http.md)
- [Integration Templates](integrations.md) (legacy — migrating to recipes)
- [Detailed Selection Tree](selection.md)
- [Spec: Composable Templates](SPEC-composable-templates.md)

**Browse all:** [Awesome AZD Functions](https://azure.github.io/awesome-azd/?tags=functions)

