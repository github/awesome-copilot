# Other server features (completions, logging, progress, filters)

A quick reference for the smaller MCP server features beyond the core primitives. Each section is short — load this file when one of these comes up.

## Argument completions

Completions let the host autocomplete prompt arguments and resource template parameters. The user starts typing; the client asks the server "what are valid values?".

Implement via the low-level handler (no high-level attribute exists yet):

```csharp
builder.Services.Configure<McpServerOptions>(options =>
{
    options.Capabilities ??= new();
    options.Capabilities.Completions ??= new();

    options.Capabilities.Completions.CompleteHandler = async (ctx, ct) =>
    {
        // ctx.Params.Ref tells us what they're completing (a prompt or resource).
        // ctx.Params.Argument has the partial value typed so far.
        var partial = ctx.Params.Argument.Value ?? "";
        var matches = MyDataSource
            .Where(x => x.StartsWith(partial, StringComparison.OrdinalIgnoreCase))
            .Take(100)
            .ToArray();

        return new CompleteResult
        {
            Completion = new()
            {
                Values = matches,
                HasMore = false,
                Total = matches.Length
            }
        };
    };
});
```

Useful for: project IDs, file names, enum values that depend on dynamic data.

## Logging

Servers can emit log messages that hosts surface in their UI (and the LLM can sometimes see). Use the standard `ILogger<T>` injected via DI — the SDK plumbs it through.

```csharp
public class WeatherTools
{
    private readonly ILogger<WeatherTools> _log;
    public WeatherTools(ILogger<WeatherTools> log) => _log = log;

    [McpServerTool, Description("…")]
    public string GetWeather(string city)
    {
        _log.LogInformation("Looking up weather for {City}", city);
        return "...";
    }
}
```

For STDIO servers, remember: console logging **must** go to stderr (`LogToStandardErrorThreshold = LogLevel.Trace`) — otherwise it corrupts the JSON-RPC stream. See [`transport-stdio.md`](./transport-stdio.md).

To send a log specifically over the MCP channel (so the *host UI* sees it, not just your container logs):

```csharp
await server.SendNotificationAsync(
    NotificationMethods.LoggingMessageNotification,
    new LoggingMessageNotificationParams
    {
        Level = LoggingLevel.Info,
        Logger = "weather",
        Data = JsonSerializer.SerializeToElement(new { city, latency_ms = 123 })
    },
    ct);
```

The client may have set a `setLevel` filter — don't spam levels below it.

## Progress notifications

For long-running tools, send progress updates so the host can display a spinner with text:

```csharp
[McpServerTool, Description("Processes a large dataset.")]
public static async Task<string> Process(
    IMcpServer server,
    RequestContext<CallToolRequestParams> ctx,
    string datasetId,
    CancellationToken ct)
{
    var progressToken = ctx.Params.Meta?.ProgressToken;

    for (int i = 0; i < 100; i++)
    {
        await Task.Delay(50, ct);

        if (progressToken is not null)
        {
            await server.SendNotificationAsync(
                NotificationMethods.ProgressNotification,
                new ProgressNotificationParams
                {
                    ProgressToken = progressToken,
                    Progress = i + 1,
                    Total = 100,
                    Message = $"Processing item {i + 1} of 100"
                },
                ct);
        }
    }

    return "Done.";
}
```

Only send progress if the client passed a `progressToken` in the request meta — otherwise the host isn't listening.

## Notification handlers (server-side)

Servers can react to notifications the client sends:

```csharp
options.Capabilities ??= new();
options.Capabilities.NotificationHandlers ??= [];

options.Capabilities.NotificationHandlers[NotificationMethods.RootsListChangedNotification] =
    async (notification, ct) =>
    {
        // Refresh root cache, etc.
    };

options.Capabilities.NotificationHandlers[NotificationMethods.CancelledNotification] =
    async (notification, ct) =>
    {
        // The client cancelled a request; if you have side-effects in flight, abort them.
    };
```

## Filters / middleware

The SDK supports filters that wrap tool calls (think ASP.NET Core middleware for MCP). Use them for cross-cutting concerns: auth checks, telemetry, rate limiting, audit logging.

```csharp
builder.Services
    .AddMcpServer()
    .WithStdioServerTransport()
    .WithToolsFromAssembly()
    .WithCallToolFilter(async (ctx, next) =>
    {
        var sw = Stopwatch.StartNew();
        try
        {
            return await next(ctx);
        }
        finally
        {
            sw.Stop();
            ctx.Server.Services?
                .GetRequiredService<ILogger<Program>>()
                .LogInformation("Tool {Tool} took {Ms}ms",
                    ctx.Params.Name, sw.ElapsedMilliseconds);
        }
    });
```

Similar `With*Filter` helpers exist for resources, prompts, and other capabilities — check the SDK API reference for the current set.

## Server instructions (system-prompt-ish)

You can supply instructions sent to the client at initialise time. Hosts may include them in the LLM's system prompt.

```csharp
builder.Services.AddMcpServer(options =>
{
    options.ServerInstructions =
        "Use the booking tools to schedule meetings. " +
        "Always confirm with the user before booking via elicitation.";
});
```

Keep this short — every token here costs the user.

## Capabilities advertising

If you want to *not* advertise a capability you happen to have code for, you can mute it:

```csharp
builder.Services.AddMcpServer(options =>
{
    options.Capabilities = new()
    {
        Tools = new(),       // advertise tools
        Prompts = new(),     // advertise prompts
        Resources = null,    // do NOT advertise resources, even if some are registered
        Logging = new()
    };
});
```

By default, the SDK advertises everything you've registered — usually the right behaviour.
