# C# (.NET) Timer Trigger - Isolated Worker Model

> ⚠️ **IMPORTANT**: Do NOT modify `Program.cs` — the base template's entry point already has the correct configuration (`ConfigureFunctionsWebApplication()` with App Insights). Only add trigger-specific files.

Add the following trigger file and `.csproj` additions to your function project (keep the existing `Program.cs` and other base template files intact).

## TimerFunctions.cs

```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Text.Json;

namespace TimerFunc;

public class TimerFunctions
{
    private readonly ILogger<TimerFunctions> _logger;

    public TimerFunctions(ILogger<TimerFunctions> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Timer trigger - runs on the schedule defined in TIMER_SCHEDULE.
    /// Default: every 5 minutes (0 */5 * * * *)
    /// </summary>
    [Function(nameof(TimerTrigger))]
    public void TimerTrigger(
        [TimerTrigger("%TIMER_SCHEDULE%", RunOnStartup = false, UseMonitor = true)]
        TimerInfo timer)
    {
        var utcTimestamp = DateTime.UtcNow.ToString("o");
        
        if (timer.IsPastDue)
        {
            _logger.LogWarning("Timer is past due!");
        }
        
        _logger.LogInformation("Timer trigger executed at {timestamp}", utcTimestamp);
        
        // Add your scheduled task logic here
        // Examples:
        // - Call an external API
        // - Process queued items
        // - Generate reports
        // - Clean up old data
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
        
        var schedule = Environment.GetEnvironmentVariable("TIMER_SCHEDULE") ?? "not-set";
        response.WriteString(JsonSerializer.Serialize(new { status = "healthy", schedule }));
        
        return response;
    }
}
```

## .csproj additions

```xml
<ItemGroup>
    <PackageReference Include="Microsoft.Azure.Functions.Worker" Version="2.0.0" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.Http" Version="3.2.0" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Extensions.Timer" Version="4.3.0" />
    <PackageReference Include="Microsoft.Azure.Functions.Worker.Sdk" Version="2.0.0" />
</ItemGroup>
```

## Local Testing

Set these in `local.settings.json`:
```json
{
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "TIMER_SCHEDULE": "0 */5 * * * *"
  }
}
```

## Common Patterns

- [Error Handling](../../common/error-handling.md) — Try/catch + logging patterns
- [Health Check](../../common/health-check.md) — Health endpoint for monitoring
- [UAMI Bindings](../../common/uami-bindings.md) — Managed identity settings
