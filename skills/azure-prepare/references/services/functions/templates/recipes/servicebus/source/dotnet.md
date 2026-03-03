# C# (.NET) Service Bus Trigger - Isolated Worker Model

> ⚠️ **IMPORTANT**: Do NOT modify `Program.cs` — the base template's entry point already has the correct configuration (`ConfigureFunctionsWebApplication()` with App Insights). Only add trigger-specific files.

Add the following trigger file under `src/api/` (keep the existing `Program.cs` and other base template files intact).

## ServiceBusFunctions.cs

```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Azure.Messaging.ServiceBus;
using System.Net;
using System.Text.Json;

namespace ServiceBusFunc;

/// <summary>
/// Multi-output type for HTTP + Service Bus output binding.
/// Required when a function needs to return BOTH an HTTP response AND send to Service Bus.
/// </summary>
public class SendMessageOutput
{
    [ServiceBusOutput("%SERVICEBUS_QUEUE_NAME%", Connection = "ServiceBusConnection")]
    public string? ServiceBusMessage { get; set; }
    
    public HttpResponseData? HttpResponse { get; set; }
}

public class ServiceBusFunctions
{
    private readonly ILogger<ServiceBusFunctions> _logger;

    public ServiceBusFunctions(ILogger<ServiceBusFunctions> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Service Bus Queue Trigger - processes messages from the queue.
    /// Connection uses UAMI via ServiceBusConnection__fullyQualifiedNamespace + credential + clientId
    /// </summary>
    [Function(nameof(ServiceBusTrigger))]
    public void ServiceBusTrigger(
        [ServiceBusTrigger("%SERVICEBUS_QUEUE_NAME%", Connection = "ServiceBusConnection")]
        ServiceBusReceivedMessage message)
    {
        _logger.LogInformation("Service Bus trigger processed message: {body}", message.Body);
        _logger.LogInformation("Message ID: {id}", message.MessageId);
        _logger.LogInformation("Delivery count: {count}", message.DeliveryCount);
        _logger.LogInformation("Enqueued time: {time}", message.EnqueuedTime);
    }

    /// <summary>
    /// HTTP endpoint to send messages to Service Bus (for testing).
    /// Uses multi-output binding to return HTTP response AND send to Service Bus.
    /// </summary>
    [Function(nameof(SendMessage))]
    public async Task<SendMessageOutput> SendMessage(
        [HttpTrigger(AuthorizationLevel.Function, "post", Route = "send")] HttpRequestData req)
    {
        var requestBody = await req.ReadAsStringAsync() ?? "{}";
        _logger.LogInformation("Sending message to Service Bus: {message}", requestBody);
        
        // Create HTTP response
        var response = req.CreateResponse(HttpStatusCode.OK);
        response.Headers.Add("Content-Type", "application/json");
        
        var responseBody = JsonSerializer.Serialize(new { status = "sent", data = JsonSerializer.Deserialize<object>(requestBody) });
        await response.WriteStringAsync(responseBody);
        
        // Return both HTTP response and Service Bus message
        return new SendMessageOutput
        {
            HttpResponse = response,
            ServiceBusMessage = requestBody
        };
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
        
        var queueName = Environment.GetEnvironmentVariable("SERVICEBUS_QUEUE_NAME") ?? "not-set";
        response.WriteString(JsonSerializer.Serialize(new { status = "healthy", queue = queueName }));
        
        return response;
    }
}
```

## .csproj additions

```xml
<ItemGroup>
    <PackageReference Include="Microsoft.Azure.Functions.Worker" Version="2.0.0" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.Http" Version="3.2.0" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.ServiceBus" Version="5.22.0" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Sdk" Version="2.0.0" />
</ItemGroup>
```

## Files to Remove

- Any existing HTTP trigger files from the base template

## Local Testing

Set these in `local.settings.json`:
```json
{
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "ServiceBusConnection__fullyQualifiedNamespace": "<namespace>.servicebus.windows.net",
    "SERVICEBUS_QUEUE_NAME": "orders"
  }
}
```

> **Note:** For local development with UAMI, use Azure Identity `DefaultAzureCredential`
> which will use your `az login` credentials. See [auth-best-practices.md](../../../../../../auth-best-practices.md) for production guidance.

## Common Patterns

- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
