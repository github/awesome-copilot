# STDIO transport

STDIO is the right choice when the server runs as a child process of the client (Claude Desktop, VS Code, MCP Inspector, a custom CLI). The client launches your executable; you read JSON-RPC frames from stdin and write them to stdout.

## When to choose STDIO

- Local-first server (file-system access, dev tools, CLI integrations).
- Distributing as a single executable or a `dnx`-runnable NuGet package.
- You want the simplest possible deployment story (no network, no auth).
- You need server-to-client features (sampling, elicitation, roots) — STDIO always supports them, no `Stateless` flag to worry about.

If the user wants a remote/multi-tenant server, use [HTTP Streamable](./transport-http.md) instead.

## Minimal server

```bash
dotnet new console -n MyStdioServer -f net10.0
cd MyStdioServer
dotnet add package ModelContextProtocol
dotnet add package Microsoft.Extensions.Hosting
```

```csharp
// Program.cs
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using ModelContextProtocol.Server;
using System.ComponentModel;

var builder = Host.CreateApplicationBuilder(args);

// CRITICAL: stdout is the JSON-RPC channel. Send all logs to stderr.
builder.Logging.AddConsole(o => o.LogToStandardErrorThreshold = LogLevel.Trace);

builder.Services
    .AddMcpServer()
    .WithStdioServerTransport()
    .WithToolsFromAssembly();

await builder.Build().RunAsync();

[McpServerToolType]
public static class EchoTool
{
    [McpServerTool, Description("Echoes the message back to the client.")]
    public static string Echo(string message) => $"hello {message}";
}
```

## The stdout/stderr trap

The single most common bug in STDIO servers is something writing to stdout that isn't a JSON-RPC frame. The client will then drop the connection with a parse error.

**Things that silently break STDIO:**
- `Console.WriteLine(...)` anywhere in your code.
- A logger configured with the default console sink (writes to stdout).
- `Trace.WriteLine(...)` if a default trace listener is attached.
- Third-party libraries that print banners on startup.

**Defensive checklist:**
1. Configure logging to stderr **before** anything else (the snippet above does this).
2. Don't `Console.Write*` from tools or startup code. Use `ILogger` injected into the tool class.
3. If a dependency is noisy, redirect its logs through `ILogger` or suppress them at startup.

## Server identity

The SDK sends `serverInfo` (name + version) in the `initialize` response. By default it derives them from your assembly. To override:

```csharp
builder.Services
    .AddMcpServer(options =>
    {
        options.ServerInfo = new()
        {
            Name = "my-stdio-server",
            Version = "1.0.0",
            Title = "My STDIO MCP Server"   // optional human-readable name
        };
    })
    .WithStdioServerTransport()
    .WithToolsFromAssembly();
```

## Reading args/env from the client

Clients (e.g. Claude Desktop config) typically launch your server with arguments and environment variables. Read them like any other .NET app:

```csharp
string apiKey = Environment.GetEnvironmentVariable("MY_API_KEY")
    ?? throw new InvalidOperationException("MY_API_KEY not set");

string configPath = args.ElementAtOrDefault(0)
    ?? Path.Combine(Environment.CurrentDirectory, "config.json");
```

Document the expected vars/args in the README so users know what to put in their client config.

## Wiring to Claude Desktop

In `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "dotnet",
      "args": ["run", "--project", "C:/path/to/MyStdioServer"],
      "env": {
        "MY_API_KEY": "..."
      }
    }
  }
}
```

For a published self-contained executable, replace `command`/`args` with the executable path. For a NuGet-distributed server using `dnx`:

```json
"command": "dnx",
"args": ["MyMcpServer", "--version", "1.2.3"]
```

## Wiring to VS Code (GitHub Copilot Chat)

In `.vscode/mcp.json`:

```json
{
  "servers": {
    "my-server": {
      "type": "stdio",
      "command": "dotnet",
      "args": ["run", "--project", "${workspaceFolder}/src/MyMcpServer"]
    }
  }
}
```

## Local debugging

The cleanest workflow is [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector dotnet run --project ./MyStdioServer
```

Inspector launches your server, opens a UI, and lets you call tools / list resources / fire elicitations interactively. See [`testing.md`](./testing.md) for more.

## Graceful shutdown

`builder.Build().RunAsync()` already handles SIGINT/SIGTERM. If you have background work to flush, use `IHostApplicationLifetime`:

```csharp
var host = builder.Build();
var lifetime = host.Services.GetRequiredService<IHostApplicationLifetime>();
lifetime.ApplicationStopping.Register(() =>
{
    // flush, close handles, etc. — keep it fast (<5s) so the client doesn't hang.
});
await host.RunAsync();
```
