# Template Selection Decision Tree

**CRITICAL**: Check for specific integration indicators IN ORDER before defaulting to HTTP.

**Architecture**: All deployments start from an [HTTP base template](http.md) per language/IaC combo. Integrations are applied as [composable recipes](recipes/README.md) on top of the base. See [composition.md](recipes/composition.md) for the merge algorithm.

Cross-reference with [top Azure Functions scenarios](https://learn.microsoft.com/en-us/azure/azure-functions/functions-scenarios) and [official AZD gallery templates](https://azure.github.io/awesome-azd/?tags=msft&tags=functions).

```
1. Is this an MCP server?
   Indicators: mcp_tool_trigger, MCPTrigger, @app.mcp_tool, "mcp" in project name
   └─► YES → HTTP base + MCP source snippet (toggle enableQueue in base)
   Recipe: recipes/mcp/ ✅ Available

2. Does it use Cosmos DB?
   Indicators: CosmosDBTrigger, @app.cosmos_db, cosmos_db_input, cosmos_db_output
   └─► YES → HTTP base + cosmosdb recipe (IaC + RBAC + networking + source)
   Recipe: recipes/cosmosdb/ ✅ Available

3. Does it use Azure SQL?
   Indicators: SqlTrigger, @app.sql, sql_input, sql_output, SqlInput, SqlOutput
   └─► YES → HTTP base + sql recipe (use AZD templates)
   Recipe: recipes/sql/ ✅ Available

4. Does it use AI/OpenAI?
   Indicators: openai, AzureOpenAI, azure-ai-openai, langchain, langgraph,
               semantic_kernel, Microsoft.Agents, azure-ai-projects,
               CognitiveServices, text_completion, embeddings_input,
               ChatCompletions, azure.ai.inference, @azure/openai
   └─► YES → Use AI Template from Awesome AZD (complex, not yet recipe-ized)

5. Is it a full-stack app with SWA?
   Indicators: staticwebapp.config.json, swa-cli, @azure/static-web-apps
   └─► YES → Use SWA+Functions Template (see integrations.md)

6. Does it use Service Bus?
   Indicators: ServiceBusTrigger, @app.service_bus_queue, @app.service_bus_topic
   └─► YES → HTTP base + servicebus recipe (IaC + RBAC + networking + source)
   Recipe: recipes/servicebus/ ✅ Available

7. Is it for orchestration or workflows?
   Indicators: DurableOrchestrationTrigger, orchestrator, durable_functions
   └─► YES → HTTP base + durable source snippet (toggle enableQueue + enableTable in base)
   Recipe: recipes/durable/ ✅ Available

8. Does it use Event Hubs?
   Indicators: EventHubTrigger, @app.event_hub, event_hub_output
   └─► YES → HTTP base + eventhubs recipe (IaC + RBAC + networking + source)
   Recipe: recipes/eventhubs/ ✅ Available

9. Does it use Event Grid?
   Indicators: EventGridTrigger, @app.event_grid, event_grid_output
   └─► YES → HTTP base + blob-eventgrid recipe (use AZD templates)
   Recipe: recipes/blob-eventgrid/ ✅ Available

10. Is it for file processing with Blob Storage?
    Indicators: BlobTrigger, @app.blob, blob_input, blob_output
    └─► YES → HTTP base + blob-eventgrid recipe (use AZD templates)
    Recipe: recipes/blob-eventgrid/ ✅ Available

11. Is it for scheduled tasks?
    Indicators: TimerTrigger, @app.schedule, cron, scheduled task
    └─► YES → HTTP base + timer source snippet (no IaC delta)
    Recipe: recipes/timer/ ✅ Available

12. DEFAULT → HTTP base template by runtime (see http.md)
```

## Recipe Types

| Type | IaC Delta? | Examples |
|------|-----------|----------|
| **Full recipe** | Yes — Bicep module + Terraform module + RBAC + networking | cosmosdb, servicebus, eventhubs |
| **AZD template** | Use dedicated AZD template from Awesome AZD | sql, blob-eventgrid |
| **Source-only** | No — only replace function source code (may toggle storage params) | timer, durable, mcp |
