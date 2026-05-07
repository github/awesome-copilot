# NuGet packages and target frameworks

## The three official packages

All packages live under the [`ModelContextProtocol` NuGet profile](https://www.nuget.org/profiles/ModelContextProtocol). The official C# SDK repo is [`modelcontextprotocol/csharp-sdk`](https://github.com/modelcontextprotocol/csharp-sdk), maintained jointly by the MCP project and Microsoft.

| Package | When to use it | Brings in |
|---|---|---|
| **`ModelContextProtocol`** | Default for STDIO servers and most projects | `Core` + `Microsoft.Extensions.Hosting` integration, attribute discovery (`AddMcpServer`, `WithToolsFromAssembly`, etc.) |
| **`ModelContextProtocol.AspNetCore`** | HTTP (Streamable) servers hosted in ASP.NET Core | The above + `WithHttpTransport` and `MapMcp` |
| **`ModelContextProtocol.Core`** | Pure clients, custom hosts, low-level scenarios where you don't want the `Microsoft.Extensions.*` dependencies | Just the protocol + transports + low-level `McpServer.Create` / `McpClient.CreateAsync` |

**Rule of thumb:**
- New STDIO server → `ModelContextProtocol` + `Microsoft.Extensions.Hosting`.
- New HTTP server → `ModelContextProtocol.AspNetCore` only (it transitively pulls in everything you need).
- Pure client app → `ModelContextProtocol.Core` (or `ModelContextProtocol` if you also want hosting/DI for the client).

## Versions

As of 2026, the stable line is **1.x** (`1.2.0` is current at time of writing). The `0.x` line was preview and has breaking differences — if you find docs or blog posts referencing `0.4`/`0.6`, treat them as out of date.

To check the latest:

```bash
dotnet search ModelContextProtocol --prerelease
```

## Target frameworks

The SDK targets **`.NET 8.0`** and **`netstandard2.0`**. That means it runs on:
- .NET 8 (LTS)
- .NET 9
- .NET 10 (current LTS — recommended for new projects)
- .NET Framework 4.6.2+ via netstandard2.0 (rare; only for legacy hosts)

For HTTP servers you specifically need a TFM that supports ASP.NET Core (so .NET 8/9/10).

## Project setup commands

### STDIO server

```bash
dotnet new console -n MyMcpServer -f net10.0
cd MyMcpServer
dotnet add package ModelContextProtocol
dotnet add package Microsoft.Extensions.Hosting
```

### HTTP (Streamable) server

```bash
dotnet new web -n MyMcpServer -f net10.0
cd MyMcpServer
dotnet add package ModelContextProtocol.AspNetCore
```

(`dotnet new web` gives you a minimal ASP.NET Core project — exactly what `MapMcp` needs.)

### Client

```bash
dotnet new console -n MyMcpClient -f net10.0
cd MyMcpClient
dotnet add package ModelContextProtocol.Core
```

## Optional but commonly useful

| Package | Why |
|---|---|
| `Microsoft.Extensions.AI` | Provides `IChatClient`, `ChatMessage`, `ChatRole`, `ChatOptions` — the abstractions used by `AsSamplingChatClient()` and by prompt return types. |
| `Microsoft.Extensions.AI.Abstractions` | Pulled in transitively but worth knowing about for types like `DataContent`, `TextContent`. |
| `OpenTelemetry.Extensions.Hosting` | The SDK emits OTel traces and metrics for tool calls — wire them up if the user has an observability story. |

## What about `dnx`?

Newer Microsoft examples sometimes show launching servers via `dnx PackageName --version 1.2.3`. That's a valid distribution model: publish your server as a NuGet package and let users run it without cloning. It's orthogonal to how the server itself is built — keep your code identical and just change the launch command.
