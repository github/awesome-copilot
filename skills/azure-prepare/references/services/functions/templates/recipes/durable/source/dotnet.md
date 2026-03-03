# C# (.NET) Durable Functions - Isolated Worker Model

> ⚠️ **IMPORTANT**: Do NOT modify `Program.cs` — the base template's entry point already has the correct configuration (`ConfigureFunctionsWebApplication()` with App Insights). Only add trigger-specific files.

Add the `DurableFunctions.cs` trigger file to your function project and add the `.csproj` additions shown below (keep the existing `Program.cs` from the template unchanged).

## DurableFunctions.cs

```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.DurableTask;
using Microsoft.DurableTask.Client;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Text.Json;

namespace DurableFunc;

public class DurableFunctions
{
    private readonly ILogger<DurableFunctions> _logger;

    public DurableFunctions(ILogger<DurableFunctions> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// HTTP endpoint to start an orchestration.
    /// </summary>
    [Function(nameof(HttpStart))]
    public async Task<HttpResponseData> HttpStart(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "orchestrators/{name}")] HttpRequestData req,
        [DurableClient] DurableTaskClient client,
        string name)
    {
        string? inputData = null;
        try
        {
            inputData = await req.ReadAsStringAsync();
        }
        catch { }

        string instanceId = await client.ScheduleNewOrchestrationInstanceAsync(name, inputData);
        _logger.LogInformation("Started orchestration with ID = '{instanceId}'", instanceId);

        return await client.CreateCheckStatusResponseAsync(req, instanceId);
    }

    /// <summary>
    /// Orchestrator function - coordinates the workflow.
    /// Fan-out/Fan-in pattern: calls activities in parallel and aggregates results.
    /// </summary>
    [Function(nameof(HelloOrchestrator))]
    public static async Task<List<string>> HelloOrchestrator(
        [OrchestrationTrigger] TaskOrchestrationContext context)
    {
        // Fan-out: Start activities in parallel
        var tasks = new List<Task<string>>
        {
            context.CallActivityAsync<string>(nameof(SayHello), "Tokyo"),
            context.CallActivityAsync<string>(nameof(SayHello), "Seattle"),
            context.CallActivityAsync<string>(nameof(SayHello), "London"),
        };

        // Fan-in: Wait for all to complete
        var results = await Task.WhenAll(tasks);
        return results.ToList();
    }

    /// <summary>
    /// Activity function - individual work unit.
    /// </summary>
    [Function(nameof(SayHello))]
    public string SayHello([ActivityTrigger] string city)
    {
        _logger.LogInformation("Processing: {city}", city);
        return $"Hello, {city}!";
    }

    /// <summary>
    /// Health check endpoint.
    /// </summary>
    [Function(nameof(HealthCheck))]
    public HttpResponseData HealthCheck(
        [HttpTrigger(AuthorizationLevel.Function, "get", Route = "health")] HttpRequestData req)
    {
        var response = req.CreateResponse(HttpStatusCode.OK);
        response.Headers.Add("Content-Type", "application/json");
        response.WriteString(JsonSerializer.Serialize(new { status = "healthy", type = "durable" }));
        return response;
    }
}
```

## .csproj additions

```xml
<ItemGroup>
    <PackageReference Include="Microsoft.Azure.Functions.Worker" Version="2.0.0" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.Http" Version="3.2.0" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.DurableTask" Version="1.2.0" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Sdk" Version="2.0.0" />
</ItemGroup>
```

## Local Testing

Set these in `local.settings.json`:
```json
{
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated"
  }
}
```
