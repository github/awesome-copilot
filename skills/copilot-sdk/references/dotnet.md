# .NET Guide

Use this reference when the user explicitly asks for .NET / C#.

## Prerequisites

- .NET 8.0+
- GitHub Copilot CLI installed and authenticated (`copilot --version`)

## Install

```bash
dotnet new console -n CopilotDemo && cd CopilotDemo
dotnet add package GitHub.Copilot.SDK
```

## Quick Start

```csharp
using GitHub.Copilot.SDK;

await using var client = new CopilotClient();
await using var session = await client.CreateSessionAsync(new SessionConfig { Model = "gpt-4.1" });

var response = await session.SendAndWaitAsync(new MessageOptions { Prompt = "What is 2 + 2?" });
Console.WriteLine(response?.Data.Content);
```

Run: `dotnet run`

## Streaming Responses

Enable real-time output for better UX:

```csharp
await using var session = await client.CreateSessionAsync(new SessionConfig
{
    Model = "gpt-4.1",
    Streaming = true,
});

session.On(ev =>
{
    if (ev is AssistantMessageDeltaEvent deltaEvent)
        Console.Write(deltaEvent.Data.DeltaContent);
    if (ev is SessionIdleEvent)
        Console.WriteLine();
});

await session.SendAndWaitAsync(new MessageOptions { Prompt = "Tell me a short joke" });
```

## Custom Tools (Microsoft.Extensions.AI)

Define tools that Copilot can invoke during reasoning. When you define a tool, you tell Copilot:
1. **What the tool does** (description)
2. **What parameters it needs** (schema)
3. **What code to run** (handler)

```csharp
using GitHub.Copilot.SDK;
using Microsoft.Extensions.AI;
using System.ComponentModel;

var getWeather = AIFunctionFactory.Create(
    ([Description("The city name")] string city) =>
    {
        var conditions = new[] { "sunny", "cloudy", "rainy", "partly cloudy" };
        var temp = Random.Shared.Next(50, 80);
        var condition = conditions[Random.Shared.Next(conditions.Length)];
        return new { city, temperature = $"{temp}°F", condition };
    },
    "get_weather",
    "Get the current weather for a city"
);

await using var session = await client.CreateSessionAsync(new SessionConfig
{
    Model = "gpt-4.1",
    Streaming = true,
    Tools = [getWeather],
});
```

## MCP Server Integration

Connect to MCP (Model Context Protocol) servers for pre-built tools. Connect to GitHub's MCP server for repository, issue, and PR access:

```csharp
await using var session = await client.CreateSessionAsync(new SessionConfig
{
    Model = "gpt-4.1",
    McpServers = new Dictionary<string, McpServerConfig>
    {
        ["github"] = new McpServerConfig
        {
            Type = "http",
            Url = "https://api.githubcopilot.com/mcp/",
        },
    },
});
```

## External CLI Server

Run the CLI in server mode separately and connect the SDK to it. Useful for debugging, resource sharing, or custom environments.

### Start CLI in Server Mode

```bash
copilot --server --port 4321
```

### Connect SDK to External Server

```csharp
using var client = new CopilotClient(new CopilotClientOptions
{
    CliUrl = "localhost:4321"
});

await using var session = await client.CreateSessionAsync(new SessionConfig { Model = "gpt-4.1" });
```

**Note:** When `cliUrl` is provided, the SDK will not spawn or manage a CLI process - it only connects to the existing server.

## Samples

- .NET: https://github.com/github/copilot-sdk/tree/main/dotnet/samples
