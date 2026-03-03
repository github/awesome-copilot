# Cosmos DB SDK Connection Patterns

## Node.js

```javascript
const { CosmosClient } = require("@azure/cosmos");

const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const database = client.database("appdb");
const container = database.container("items");

// Query example
const { resources } = await container.items
  .query("SELECT * FROM c WHERE c.userId = @userId", {
    parameters: [{ name: "@userId", value: userId }]
  })
  .fetchAll();
```

## Python

```python
from azure.cosmos import CosmosClient
import os

client = CosmosClient.from_connection_string(os.environ["COSMOS_CONNECTION_STRING"])
database = client.get_database_client("appdb")
container = database.get_container_client("items")

# Query example
items = container.query_items(
    query="SELECT * FROM c WHERE c.userId = @userId",
    parameters=[{"name": "@userId", "value": user_id}]
)
```

## .NET

```csharp
using Microsoft.Azure.Cosmos;

var client = new CosmosClient(Environment.GetEnvironmentVariable("COSMOS_CONNECTION_STRING"));
var database = client.GetDatabase("appdb");
var container = database.GetContainer("items");

// Query example
var query = new QueryDefinition("SELECT * FROM c WHERE c.userId = @userId")
    .WithParameter("@userId", userId);
var iterator = container.GetItemQueryIterator<dynamic>(query);
```

## Best Practices

| Practice | Reason |
|----------|--------|
| Reuse client instances | Connection pooling |
| Use parameterized queries | SQL injection prevention |
| Set appropriate timeouts | Handle transient failures |
| Enable diagnostics in dev | Debug RU consumption |
