# Cosmos DB Trigger — TypeScript

## Trigger Function

Replace the HTTP trigger file(s) with this Cosmos DB trigger.

### src/functions/cosmosTrigger.ts

```typescript
import { app, InvocationContext } from "@azure/functions";

interface MyDocument {
    id: string;
    Text: string;
    Number: number;
    Boolean: boolean;
}

export async function cosmosTrigger(documents: MyDocument[], context: InvocationContext): Promise<void> {
    context.log(`Cosmos DB trigger function processed ${documents.length} document(s)`);

    for (const document of documents) {
        context.log(`Document Id: ${document.id}`);
    }
}

app.cosmosDB("cosmosTrigger", {
    connection: "COSMOS_CONNECTION",
    databaseName: "%COSMOS_DATABASE_NAME%",
    containerName: "%COSMOS_CONTAINER_NAME%",
    createLeaseContainerIfNotExists: true,
    leaseContainerName: "leases",
    handler: cosmosTrigger,
});
```

## Package Dependency

Add to `package.json`:

```json
{
  "dependencies": {
    "@azure/functions": "^4.0.0"
  }
}
```

> The Cosmos DB extension is included in the Functions v4 extension bundle — no additional npm package needed.

## local.settings.json

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_CONNECTION__accountEndpoint": "https://{accountName}.documents.azure.com:443/",
    "COSMOS_DATABASE_NAME": "documents-db",
    "COSMOS_CONTAINER_NAME": "documents"
  }
}
```

## Files to Remove from HTTP Base

- `src/functions/httpGetFunction.ts`
- `src/functions/httpPostBodyFunction.ts`

## Common Patterns

- [Node.js Entry Point](../../common/nodejs-entry-point.md) — **REQUIRED** src/index.ts setup + build
- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
