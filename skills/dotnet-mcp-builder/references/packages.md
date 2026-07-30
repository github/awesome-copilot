# NuGet packages and target frameworks

## The official packages

All packages live under the [`ModelContextProtocol` NuGet profile](https://www.nuget.org/profiles/ModelContextProtocol). The official C# SDK repo is [`modelcontextprotocol/csharp-sdk`](https://github.com/modelcontextprotocol/csharp-sdk), maintained jointly by the MCP project and Microsoft.

| Package | When to use it | Brings in |
|---|---|---|
| **`ModelContextProtocol`** | Default for STDIO servers and most projects | `Core` + `Microsoft.Extensions.Hosting` integration, attribute discovery (`AddMcpServer`, `WithToolsFromAssembly`, etc.) |
| **`ModelContextProtocol.AspNetCore`** | HTTP (Streamable) servers hosted in ASP.NET Core | The above + `WithHttpTransport` and `MapMcp` |
| **`ModelContextProtocol.Core`** | Pure clients, custom hosts, low-level scenarios where you don't want the `Microsoft.Extensions.*` dependencies | Just the protocol + transports + low-level `McpServer.Create` / `McpClient.CreateAsync` |
| **`ModelContextProtocol.Extensions.Tasks`** (2.x) | Long-running task support (the MCP Tasks extension) | Production replacement for the experimental 1.4.x Tasks APIs; register via `WithTasks(...)` |
| **`ModelContextProtocol.Extensions.Apps`** (2.x) | MCP Apps — interactive UI rendered in the host | Typed `[McpAppUi]` attribute + `.WithMcpApps()` registration replacing the hand-rolled `_meta` wiring of 1.x; you still serve the UI as a `ui://` resource, and the APIs are experimental (`MCPEXP003`) — see [`mcp-apps.md`](./mcp-apps.md) |

**Rule of thumb:**
- New STDIO server → `ModelContextProtocol` + `Microsoft.Extensions.Hosting`.
- New HTTP server → `ModelContextProtocol.AspNetCore` only (it transitively pulls in everything you need).
- Pure client app → `ModelContextProtocol.Core` (or `ModelContextProtocol` if you also want hosting/DI for the client).

## Versions

As of mid-2026, the stable line is **2.x** (`2.0.0` is current at time of writing), aligned with the MCP 2026-07-28 spec. The `0.x` line was preview and has breaking differences — if you find docs or blog posts referencing `0.4`/`0.6`, treat them as out of date. The `1.x` line still compiles and interoperates, but predates the v2 changes (stateless-by-default HTTP, discovery-first negotiation, roots/sampling/logging deprecations, the Tasks/Apps extension packages) — prefer 2.x for new projects.

**Upgrading 1.x → 2.0 (highlights, not exhaustive):** stable v1.x APIs keep working; the deprecated capabilities (roots, sampling, logging) are now `[Obsolete]` with `MCP9005` warnings, experimental APIs moved (the 1.4.x Tasks surface → `ModelContextProtocol.Extensions.Tasks`), and several behaviors flipped (`HttpServerTransportOptions.Stateless` now defaults to `true`; non-object tool results emit raw `structuredContent` values; `Tool.inputSchema` is required on deserialization). OAuth also changed at runtime — `AuthorizationRedirectDelegate` → `ClientOAuthOptions.AuthorizationCallbackHandler`, RFC 9207 issuer validation, mandatory PKCE S256 in metadata, `application_type` in dynamic registration — and SSE transport failures now propagate the underlying `HttpRequestException`/`TimeoutException`. Before upgrading, read the full [v2.0.0 release notes](https://github.com/modelcontextprotocol/csharp-sdk/releases/tag/v2.0.0).

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
