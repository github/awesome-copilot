# Integration Templates

> **Migration Notice**: Integration templates are being replaced by the [composable recipe system](recipes/README.md).
> New integrations should use HTTP base + recipe composition. See [composition.md](recipes/composition.md).

## Composable Recipes (preferred)

| Service | Recipe | Status |
|---------|--------|--------|
| Cosmos DB | [recipes/cosmosdb/](recipes/cosmosdb/README.md) | ✅ Available |
| Event Hubs | [recipes/eventhubs/](recipes/eventhubs/README.md) | ✅ Available |
| Service Bus | [recipes/servicebus/](recipes/servicebus/README.md) | ✅ Available |
| Timer | [recipes/timer/](recipes/timer/README.md) | ✅ Available (source-only) |
| Durable | [recipes/durable/](recipes/durable/README.md) | ✅ Available (requires storage flags) |
| MCP | [recipes/mcp/](recipes/mcp/README.md) | ✅ Available (requires storage flags) |
| Azure SQL | [recipes/sql/](recipes/sql/README.md) | ✅ Available |
| Blob/Event Grid | [recipes/blob-eventgrid/](recipes/blob-eventgrid/README.md) | ✅ Available |

## Legacy: Browse by Service

For integrations not yet recipe-ized, use the Awesome AZD gallery:

| Service | Find Templates |
|---------|----------------|
| AI/OpenAI | [Awesome AZD AI](https://azure.github.io/awesome-azd/?tags=functions&name=ai) |
| Durable Functions | [Awesome AZD Durable](https://azure.github.io/awesome-azd/?tags=functions&name=durable) |

## SWA + Functions

| Stack | Template |
|-------|----------|
| C# + SQL | [todo-csharp-sql-swa-func](https://github.com/Azure-Samples/todo-csharp-sql-swa-func) |
| Node.js + Mongo | [todo-nodejs-mongo-swa-func](https://github.com/azure-samples/todo-nodejs-mongo-swa-func) |

## Flex Consumption Samples

Service Bus and Event Hubs templates: [Azure Functions Flex Consumption Samples](https://github.com/Azure-Samples/azure-functions-flex-consumption-samples)

