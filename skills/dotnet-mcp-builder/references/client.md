# Building an MCP client in .NET

A short reference for *consuming* an MCP server from .NET — useful for testing your server, building agent harnesses, or wiring MCP into a Semantic Kernel / Microsoft.Extensions.AI pipeline.

For just *running* a server, ignore this file.

## Packages

```bash
dotnet add package ModelContextProtocol.Core   # minimal: just client + transports
# or
dotnet add package ModelContextProtocol         # adds DI/hosting helpers
```

## Connecting via STDIO (launching a server process)

```csharp
using ModelContextProtocol.Client;

var transport = new StdioClientTransport(new StdioClientTransportOptions
{
    Command = "dotnet",
    Arguments = ["run", "--project", "../MyMcpServer"],
    EnvironmentVariables = new() { ["MY_API_KEY"] = "..." },
    ShutdownTimeout = TimeSpan.FromSeconds(10),
    StandardErrorLines = line => Console.Error.WriteLine($"[server] {line}")
});

await using var client = await McpClient.CreateAsync(transport);
```

`StandardErrorLines` is a great debugging aid — you'll see your server's logs as they happen.

## Connecting via HTTP (Streamable)

```csharp
using ModelContextProtocol.Client;

var transport = new HttpClientTransport(new HttpClientTransportOptions
{
    Endpoint = new Uri("https://my-server.example.com/mcp"),
    TransportMode = HttpTransportMode.StreamableHttp,
    ConnectionTimeout = TimeSpan.FromSeconds(30),
    AdditionalHeaders = new Dictionary<string, string>
    {
        ["Authorization"] = "Bearer ..."
    }
});

await using var client = await McpClient.CreateAsync(transport);
```

`TransportMode = AutoDetect` (the default) tries Streamable HTTP first and falls back to SSE — useful for older servers, but pin to `StreamableHttp` for new code so failures are loud.

## Listing and calling tools

```csharp
IList<McpClientTool> tools = await client.ListToolsAsync();

foreach (var t in tools)
    Console.WriteLine($"- {t.Name}: {t.Description}");

var echo = tools.First(t => t.Name == "Echo");
CallToolResult result = await echo.CallAsync(new Dictionary<string, object?>
{
    ["message"] = "hello"
});

if (result.IsError == true)
{
    var msg = result.Content.OfType<TextContentBlock>().FirstOrDefault()?.Text;
    Console.Error.WriteLine($"Tool failed: {msg}");
    return;
}

foreach (var block in result.Content)
{
    switch (block)
    {
        case TextContentBlock text:
            Console.WriteLine(text.Text);
            break;
        case ImageContentBlock image:
            File.WriteAllBytes("out.png", image.DecodedData.ToArray());
            break;
    }
}
```

## Listing prompts and resources

```csharp
IList<McpClientPrompt> prompts = await client.ListPromptsAsync();
GetPromptResult pr = await client.GetPromptAsync("code_review",
    new Dictionary<string, object?> { ["language"] = "csharp", ["code"] = "..." });

IList<McpClientResource> resources = await client.ListResourcesAsync();
ReadResourceResult rr = await client.ReadResourceAsync("config://app/settings");
```

## Subscribing to server notifications

```csharp
client.RegisterNotificationHandler(
    NotificationMethods.ToolListChangedNotification,
    async (notification, ct) =>
    {
        var updated = await client.ListToolsAsync(cancellationToken: ct);
        Console.WriteLine($"Tool list changed; now {updated.Count} tools.");
    });
```

## Handling server-to-client requests (sampling, elicitation, roots)

If your server uses these features, your client must handle them. Configure handlers when creating the client:

```csharp
await using var client = await McpClient.CreateAsync(transport, new McpClientOptions
{
    Capabilities = new()
    {
        Sampling = new()
        {
            SamplingHandler = async (req, progress, ct) =>
            {
                // Route req.Messages to your IChatClient and return a CreateMessageResult.
                var response = await myChatClient.GetResponseAsync(/* convert */, ct);
                return new CreateMessageResult { /* fill in */ };
            }
        },
        Elicitation = new()
        {
            ElicitationHandler = async (req, ct) =>
            {
                // Show req.Message + req.RequestedSchema to the user; collect input.
                return new ElicitResult { Action = "accept", Content = collectedValues };
            }
        },
        Roots = new()
        {
            RootsHandler = async (req, ct) =>
            {
                return new ListRootsResult
                {
                    Roots = new[] { new Root { Uri = "file:///workspace", Name = "Workspace" } }
                };
            }
        }
    }
});
```

If you don't supply a handler and the server calls the feature, the call fails with a "method not supported" error.

## Using MCP tools as `IChatClient` function tools

If you're plugging MCP into a `Microsoft.Extensions.AI` pipeline, expose tools as `AIFunction`:

```csharp
using Microsoft.Extensions.AI;

IList<McpClientTool> mcpTools = await client.ListToolsAsync();

var chatOptions = new ChatOptions
{
    Tools = mcpTools.Cast<AITool>().ToList()
};

var chatClient = new MyChatClient(...);   // any IChatClient
var response = await chatClient.GetResponseAsync(messages, chatOptions);
```

`McpClientTool` implements `AIFunction` — function-calling middleware will invoke the right tool and feed the result back to the LLM automatically.

## Resuming a session (HTTP, stateful)

```csharp
var transport = new HttpClientTransport(new HttpClientTransportOptions
{
    Endpoint = new Uri("https://my-server.example.com/mcp"),
    KnownSessionId = previousSessionId
});

await using var client = await McpClient.ResumeSessionAsync(transport, new ResumeClientSessionOptions
{
    ServerCapabilities = previousServerCapabilities,
    ServerInfo = previousServerInfo
});
```

Useful for long-lived agent processes that survive transient network drops.
