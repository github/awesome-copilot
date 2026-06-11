# Testing and local debugging

Three workflows: interactive testing with MCP Inspector, in-process integration tests, and CI-friendly unit tests.

## MCP Inspector (interactive)

[MCP Inspector](https://github.com/modelcontextprotocol/inspector) is the go-to tool for trying out a server by hand. It launches your server, connects via STDIO or HTTP, and gives you a UI to list/call tools, view resources, fire elicitations, see logs, and inspect raw JSON-RPC frames.

### STDIO

```bash
npx @modelcontextprotocol/inspector dotnet run --project ./MyMcpServer
```

Pass env vars or args after `--`:

```bash
npx @modelcontextprotocol/inspector \
  dotnet run --project ./MyMcpServer -- \
  --some-flag value
```

### HTTP

Start the server normally (`dotnet run`), then in Inspector pick "Streamable HTTP" and enter the URL (e.g. `http://localhost:3001`).

### Use it for

- Verifying tool descriptions are clear (Inspector renders them like the LLM would consume them).
- Walking through elicitation flows without a real LLM.
- Capturing the exact JSON-RPC payloads when filing bug reports.

## In-process integration tests (recommended)

The cleanest test setup uses `InMemoryTransport` (or the lower-level `StreamServerTransport` / `StreamClientTransport`) to wire a real server and a real client together in the same process. No subprocesses, no network.

```csharp
using System.IO.Pipelines;
using ModelContextProtocol;
using ModelContextProtocol.Client;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using Xunit;

public class WeatherToolsTests
{
    [Fact]
    public async Task GetWeather_returns_text()
    {
        var clientToServer = new Pipe();
        var serverToClient = new Pipe();

        await using var server = McpServer.Create(
            new StreamServerTransport(
                clientToServer.Reader.AsStream(),
                serverToClient.Writer.AsStream()),
            new McpServerOptions
            {
                ToolCollection =
                [
                    McpServerTool.Create(
                        (string city) => $"{city}: 18°C",
                        new() { Name = "GetWeather" })
                ]
            });

        var serverTask = server.RunAsync();

        await using var client = await McpClient.CreateAsync(
            new StreamClientTransport(
                clientToServer.Writer.AsStream(),
                serverToClient.Reader.AsStream()));

        var tools = await client.ListToolsAsync();
        var tool = tools.Single(t => t.Name == "GetWeather");

        var result = await tool.CallAsync(new Dictionary<string, object?>
        {
            ["city"] = "Brussels"
        });

        Assert.False(result.IsError);
        var text = result.Content.OfType<TextContentBlock>().Single().Text;
        Assert.Equal("Brussels: 18°C", text);
    }
}
```

This style lets you assert on the *exposed* behaviour (what a real client sees), not internal details.

## Testing tools that use sampling/elicitation/roots

Inject the MCP server, but supply mock client capabilities. With the in-memory pattern above, register handlers on the client:

```csharp
await using var client = await McpClient.CreateAsync(clientTransport, new McpClientOptions
{
    Capabilities = new()
    {
        Sampling = new()
        {
            SamplingHandler = (req, progress, ct) =>
                Task.FromResult(new CreateMessageResult
                {
                    Content = [new TextContentBlock { Text = "MOCK SUMMARY" }]
                })
        },
        Elicitation = new()
        {
            ElicitationHandler = (req, ct) =>
                Task.FromResult(new ElicitResult
                {
                    Action = "accept",
                    Content = JsonSerializer.SerializeToNode(new { confirm = true })
                                .AsObject().ToDictionary(kv => kv.Key, kv => JsonDocument.Parse(kv.Value!.ToJsonString()).RootElement)
                })
        }
    }
});
```

Now your tool's `server.SampleAsync` / `server.ElicitAsync` calls hit deterministic mocks.

## Unit tests at the DI layer

For pure logic with no MCP-specific behaviour, just test the class:

```csharp
[Fact]
public void Echo_prepends_hello()
{
    Assert.Equal("hello world", EchoTool.Echo("world"));
}
```

The `[McpServerTool]` attribute doesn't affect runtime behaviour outside MCP wiring — your methods are just methods.

## Running it from Claude Desktop / VS Code during development

For end-to-end "feels-like-the-real-thing" testing:

1. Run `dotnet publish -c Release` (or just `dotnet build` and use `dotnet run`).
2. Point Claude Desktop / VS Code at the binary or `dotnet run --project ...`. See [`transport-stdio.md`](./transport-stdio.md) for the config snippets.
3. Restart the host.
4. Trigger the tool from chat.

When iterating, set up `dotnet watch run --project ...` so the server restarts on edit; the host typically reconnects on the next tool call.

## CI

A typical CI pipeline:

```yaml
- run: dotnet restore
- run: dotnet build --no-restore
- run: dotnet test --no-build --logger "trx;LogFileName=test-results.trx"
```

Nothing MCP-specific. The in-memory transport tests run anywhere `dotnet test` runs — no Node, no Docker.

## Common diagnostic tricks

- **"Tool isn't showing up":** call `client.ListToolsAsync()` in a quick test and dump the names. If your tool isn't there, the registration is wrong.
- **"LLM keeps misusing the tool":** open Inspector and look at the schema/description as the LLM sees it. Most "the model is dumb" issues are actually missing `[Description]`.
- **"Sampling/elicitation throws 'method not supported'":** the client doesn't advertise the capability. Either you're testing against a host that doesn't support it (Inspector supports both), or your in-memory client is missing the handler.
- **"HTTP returns 404 for /":** check `app.MapMcp()` is called *and* you're hitting the right path. `MapMcp("/mcp")` means the URL is `http://host/mcp`, not `http://host/`.
