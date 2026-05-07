# Tools

Tools are functions the LLM can call. In the C# SDK they're plain methods on a class marked `[McpServerToolType]`, with each method marked `[McpServerTool]`. The SDK generates the JSON Schema from the method signature and `[Description]` attributes.

## Anatomy of a tool

```csharp
using System.ComponentModel;
using ModelContextProtocol.Server;

[McpServerToolType]
public class WeatherTools
{
    // Static or instance — both work. Instance methods get DI for the containing class.
    [McpServerTool, Description("Returns the current weather for a city.")]
    public static string GetWeather(
        [Description("City name, e.g. 'Brussels'")] string city,
        [Description("Units: 'celsius' or 'fahrenheit'")] string units = "celsius")
    {
        return $"{city}: 18°{units[0]}";
    }
}
```

Register it (one of):

```csharp
.WithToolsFromAssembly()        // discovers all [McpServerToolType] in the calling assembly
.WithTools<WeatherTools>()      // explicit, single class
```

The tool name shown to the LLM is `GetWeather` (PascalCase converted to snake_case is **not** automatic — what you see is what you get unless you set `Name` explicitly).

## Attribute options

```csharp
[McpServerTool(
    Name = "get_weather",                 // override the tool name
    Title = "Get current weather",        // human-readable display name
    Destructive = false,                  // hint: tool modifies state irreversibly
    Idempotent = true,                    // hint: same args ⇒ same result
    OpenWorld = true,                     // hint: interacts with external systems
    ReadOnly = true                       // hint: doesn't mutate any state
)]
[Description("Returns the current weather for a city.")]
public static string GetWeather(...) { ... }
```

The behaviour hints (`Destructive`, `Idempotent`, `OpenWorld`, `ReadOnly`) are advisory — clients use them to decide things like auto-approval. They don't change runtime behaviour.

## Async, cancellation, DI

```csharp
[McpServerTool, Description("Fetches the latest commits for a repo.")]
public async Task<IEnumerable<Commit>> GetCommits(
    string owner,
    string repo,
    IGitHubClient github,                         // injected from DI
    CancellationToken cancellationToken)          // injected by the SDK
{
    return await github.GetCommitsAsync(owner, repo, cancellationToken);
}
```

The SDK recognises and special-cases these parameter types — they don't appear in the tool schema:
- `IMcpServer` / `McpServer` — the current server (used for `ElicitAsync`, `SampleAsync`, `RequestRootsAsync`, sending notifications).
- `CancellationToken` — propagated from the JSON-RPC request.
- `RequestContext<CallToolRequestParams>` — full request context if you need it.
- `IServiceProvider` — request-scoped service provider.
- Anything resolvable from DI that the SDK can recognise as not a primitive payload.

Everything else is treated as a JSON-RPC argument and goes into the schema.

## Return types

The SDK serialises whatever you return into the appropriate content blocks. Practical guidance:

| Return type | What the LLM sees |
|---|---|
| `string` | Single text content block. |
| `int`, `bool`, `double`, etc. | Stringified into a text content block. |
| Any DTO (record/class) | Serialized to JSON in a text content block, plus structured content for clients that support it. |
| `IEnumerable<T>` of DTOs | JSON array. |
| `ContentBlock` / `ImageContentBlock` / `AudioContentBlock` / `EmbeddedResourceBlock` | That single block, untouched. |
| `IEnumerable<ContentBlock>` | Multiple blocks in order. |
| `CallToolResult` | Full control — set `Content`, `StructuredContent`, `IsError`. |

### Returning structured data the LLM can act on

```csharp
public record Forecast(string City, double TempC, string Conditions);

[McpServerTool, Description("Returns a 3-day forecast.")]
public static Forecast[] GetForecast(string city) =>
    new[]
    {
        new Forecast(city, 18.0, "sunny"),
        new Forecast(city, 16.5, "cloudy"),
        new Forecast(city, 14.2, "rain"),
    };
```

The SDK emits the array as both a JSON text block (for older clients) and `structuredContent` (for newer ones), and infers an output schema from `Forecast`.

### Returning images / audio

```csharp
[McpServerTool, Description("Generates a chart and returns it as a PNG.")]
public static ImageContentBlock RenderChart(string title)
{
    byte[] png = Renderer.Render(title);
    return ImageContentBlock.FromBytes(png, "image/png");
}

[McpServerTool, Description("Synthesises speech.")]
public static AudioContentBlock Speak(string text)
{
    byte[] wav = Tts.Synthesize(text);
    return AudioContentBlock.FromBytes(wav, "audio/wav");
}
```

### Mixing content blocks

```csharp
[McpServerTool, Description("Returns the chart and a caption.")]
public static IEnumerable<ContentBlock> RenderAnnotatedChart(string title)
{
    byte[] png = Renderer.Render(title);
    return new ContentBlock[]
    {
        new TextContentBlock { Text = $"Chart for: {title}" },
        ImageContentBlock.FromBytes(png, "image/png"),
        new TextContentBlock { Text = "Generated at " + DateTime.UtcNow.ToString("u") }
    };
}
```

### Returning an embedded resource

Useful when the tool result *is* a document the user might want to reuse:

```csharp
[McpServerTool, Description("Looks up a contract.")]
public static EmbeddedResourceBlock GetContract(string id)
{
    return new EmbeddedResourceBlock
    {
        Resource = new TextResourceContents
        {
            Uri = $"contracts://{id}",
            MimeType = "text/markdown",
            Text = LoadContract(id)
        }
    };
}
```

## Errors

There are two flavours of error a tool can produce:

### Tool-level errors (the LLM can read and recover from these)

Throw any exception — the SDK catches it and returns a `CallToolResult` with `IsError = true` and the exception message in a text block:

```csharp
[McpServerTool, Description("Divides a by b.")]
public static double Divide(double a, double b)
{
    if (b == 0)
        throw new ArgumentException("Cannot divide by zero.");
    return a / b;
}
```

You can also build the result explicitly:

```csharp
[McpServerTool, Description("…")]
public static CallToolResult Foo(...)
{
    return new CallToolResult
    {
        IsError = true,
        Content = [new TextContentBlock { Text = "Detailed error explanation for the LLM." }]
    };
}
```

### Protocol-level errors (the call is rejected before the LLM sees a result)

Use `McpException` (or `McpProtocolException` with an explicit error code) for things like bad arguments:

```csharp
[McpServerTool, Description("…")]
public static string Process(string input)
{
    if (string.IsNullOrWhiteSpace(input))
        throw new McpProtocolException("Missing required input", McpErrorCode.InvalidParams);
    return $"Processed: {input}";
}
```

**Heuristic:** if the LLM should *try again* with different arguments, throw a regular exception so it gets a tool error. If the call is malformed in a way the LLM can't fix, throw `McpProtocolException`.

## Notifying clients of tool list changes

If your tools come and go at runtime (e.g. plugin loaded, user logged in), notify the client:

```csharp
await server.SendNotificationAsync(
    NotificationMethods.ToolListChangedNotification,
    new ToolListChangedNotificationParams(),
    cancellationToken);
```

Requires a stateful transport (STDIO or stateful HTTP).

## Common pitfalls

- **Forgetting `[McpServerToolType]` on the class.** The method-level `[McpServerTool]` alone won't be discovered by `WithToolsFromAssembly`.
- **Vague descriptions.** `[Description("Gets data")]` makes the LLM guess. Spend a sentence describing what the tool does, when to call it, and what it returns.
- **Big payloads.** Tools that return megabytes of JSON eat the model's context. Trim or paginate. For binary blobs, return an `EmbeddedResourceBlock` so the host can decide how to render it.
- **Hiding errors.** Returning `"failed"` as a string looks like success to the SDK. Throw the exception or set `IsError = true`.
