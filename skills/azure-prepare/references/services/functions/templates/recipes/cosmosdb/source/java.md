# Cosmos DB Trigger — Java

## Trigger Function

Replace the HTTP trigger class with this Cosmos DB trigger.

### src/main/java/com/function/CosmosTrigger.java

```java
package com.function;

import com.microsoft.azure.functions.*;
import com.microsoft.azure.functions.annotation.*;

public class CosmosTrigger {

    @FunctionName("cosmos_trigger")
    public void run(
        @CosmosDBTrigger(
            name = "documents",
            databaseName = "%COSMOS_DATABASE_NAME%",
            containerName = "%COSMOS_CONTAINER_NAME%",
            connection = "COSMOS_CONNECTION",
            leaseContainerName = "leases",
            createLeaseContainerIfNotExists = true
        ) String[] documents,
        final ExecutionContext context
    ) {
        if (documents != null && documents.length > 0) {
            context.getLogger().info("Documents modified: " + documents.length);
            context.getLogger().info("First document: " + documents[0]);
        }
    }
}
```

## Maven Dependency

Add to `pom.xml` (extensions bundle handles this, but for explicit control):

```xml
<dependency>
    <groupId>com.microsoft.azure.functions</groupId>
    <artifactId>azure-functions-java-library</artifactId>
    <version>[3.0,)</version>
</dependency>
```

> The Cosmos DB extension is included in the Functions v4 extension bundle.

## local.settings.json

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "java",
    "COSMOS_CONNECTION__accountEndpoint": "https://{accountName}.documents.azure.com:443/",
    "COSMOS_DATABASE_NAME": "documents-db",
    "COSMOS_CONTAINER_NAME": "documents"
  }
}
```

## Files to Remove from HTTP Base

- Remove or replace the HTTP trigger Java class(es)

## Common Patterns

- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
