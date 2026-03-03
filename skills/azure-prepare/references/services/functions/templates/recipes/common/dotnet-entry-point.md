# C# (.NET) Entry Point (DO NOT MODIFY)

The base Azure Functions template includes a properly configured `Program.cs` that should NOT be modified or replaced by recipes.

> ⛔ **CRITICAL**: Do NOT replace or modify `Program.cs` from the base template.

## Base Template Program.cs

The official `functions-quickstart-dotnet-azd` template uses:

```csharp
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication()  // ASP.NET Core integration
    .ConfigureServices(services =>
    {
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();
    })
    .Build();

host.Run();
```

## Why This Matters

| Feature | ConfigureFunctionsWebApplication | ConfigureFunctionsWorkerDefaults |
|---------|----------------------------------|----------------------------------|
| ASP.NET Core integration | ✅ Yes | ❌ No |
| IActionResult return types | ✅ Yes | ❌ No |
| [FromBody] model binding | ✅ Yes | ❌ No |
| App Insights integration | ✅ Built-in | ❌ Manual setup |
| Modern HTTP handling | ✅ Yes | ⚠️ Limited |

## What Recipes Should Provide

Recipes only need to add:
1. **Trigger function files** (`.cs` files with `[Function]` attributes)
2. **Package references** (`.csproj` additions for extensions)
3. **App settings** (connection strings, configuration)

All triggers use attribute-based binding — no Program.cs modifications needed:
- `[HttpTrigger]`, `[TimerTrigger]`, `[CosmosDBTrigger]`
- `[ServiceBusTrigger]`, `[EventHubTrigger]`, `[BlobTrigger]`
- `[DurableClient]`, `[SqlTrigger]`

## Common Mistake

❌ **WRONG** — Recipe overwrites Program.cs with outdated version:
```csharp
var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()  // OLD PATTERN
    .Build();
```

✅ **CORRECT** — Recipe leaves Program.cs untouched, only adds function files.
