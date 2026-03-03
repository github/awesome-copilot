# Cosmos DB Trigger — C# (.NET Isolated)

## Trigger Function

Replace the HTTP trigger file(s) with this Cosmos DB trigger.

### CosmosTrigger.cs

```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace MyFunctionApp
{
    public class CosmosTrigger
    {
        private readonly ILogger _logger;

        public CosmosTrigger(ILoggerFactory loggerFactory)
        {
            _logger = loggerFactory.CreateLogger<CosmosTrigger>();
        }

        [Function("cosmos_trigger")]
        public void Run([CosmosDBTrigger(
            databaseName: "%COSMOS_DATABASE_NAME%",
            containerName: "%COSMOS_CONTAINER_NAME%",
            Connection = "COSMOS_CONNECTION",
            LeaseContainerName = "leases",
            CreateLeaseContainerIfNotExists = true)] IReadOnlyList<MyDocument> input)
        {
            if (input != null && input.Count > 0)
            {
                _logger.LogInformation("Documents modified: " + input.Count);
                _logger.LogInformation("First document Id: " + input[0].id);
            }
        }
    }

    public class MyDocument
    {
        public required string id { get; set; }
        public required string Text { get; set; }
        public int Number { get; set; }
        public bool Boolean { get; set; }
    }
}
```

## Package Reference

Add to `.csproj`:

```xml
<PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.CosmosDB" Version="4.*" />
```

## local.settings.json

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "COSMOS_CONNECTION__accountEndpoint": "https://{accountName}.documents.azure.com:443/",
    "COSMOS_DATABASE_NAME": "documents-db",
    "COSMOS_CONTAINER_NAME": "documents"
  }
}
```

## Files to Remove from HTTP Base

- `httpGetFunction.cs`
- `httpPostBodyFunction.cs`

## Common Patterns

- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
