# JavaScript Cosmos DB Trigger

## Dependencies

**package.json:**
```json
{
  "dependencies": {
    "@azure/functions": "^4.0.0"
  }
}
```

## Source Code

**src/functions/cosmosDBTrigger.js:**
```javascript
const { app } = require('@azure/functions');

app.cosmosDB('cosmosDBTrigger', {
    connectionStringSetting: 'COSMOS_CONNECTION',
    databaseName: '%COSMOS_DATABASE_NAME%',
    containerName: '%COSMOS_CONTAINER_NAME%',
    createLeaseContainerIfNotExists: true,
    handler: async (documents, context) => {
        context.log(`Cosmos DB trigger processed ${documents.length} documents`);
        
        for (const doc of documents) {
            context.log(`Document ID: ${doc.id}`);
            context.log(`Document content: ${JSON.stringify(doc)}`);
        }
    }
});
```

**src/functions/healthCheck.js:**
```javascript
const { app } = require('@azure/functions');

app.http('health', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        return {
            status: 200,
            jsonBody: { 
                status: 'healthy',
                trigger: 'cosmosdb'
            }
        };
    }
});
```

## Files to Remove

- `src/functions/httpTrigger.js`

## App Settings Required

```
COSMOS_CONNECTION__accountEndpoint=https://<account>.documents.azure.com:443/
COSMOS_CONNECTION__credential=managedidentity
COSMOS_CONNECTION__clientId=<uami-client-id>
COSMOS_DATABASE_NAME=<database>
COSMOS_CONTAINER_NAME=<container>
```

## Common Patterns

- [Node.js Entry Point](../../common/nodejs-entry-point.md) — **REQUIRED** src/index.js setup
- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
