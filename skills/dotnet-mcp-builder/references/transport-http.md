# Streamable HTTP transport (ASP.NET Core)

Streamable HTTP is the modern remote transport. A single endpoint accepts JSON-RPC over HTTP POST and (optionally) streams responses back as Server-Sent Events when the server has more than one message to send.

> **SSE-only is deprecated.** The legacy "HTTP+SSE" transport (separate POST endpoint + GET SSE endpoint) is gone from new clients. Use Streamable HTTP. Only enable legacy SSE (`EnableLegacySse = true`) if you must support a known-old client, and document why.

## When to choose HTTP

- Multi-tenant or remote-hosted server.
- Auth via OAuth / API gateway in front.
- Horizontally scaled deployments (with `Stateless = true`).
- Containers, Azure Container Apps, Kubernetes, etc.

For local single-user scenarios, [STDIO](./transport-stdio.md) is simpler.

## Minimal server

```bash
dotnet new web -n MyHttpServer -f net10.0
cd MyHttpServer
dotnet add package ModelContextProtocol.AspNetCore
```

```csharp
// Program.cs
using ModelContextProtocol.Server;
using System.ComponentModel;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddMcpServer()
    // Since 2.x, Stateless defaults to true: each request is independent,
    // no Mcp-Session-Id tracking, no SSE session endpoints — ready for
    // horizontal scaling without sticky sessions.
    .WithHttpTransport()
    .WithToolsFromAssembly();

var app = builder.Build();

app.MapMcp();              // mounts the MCP endpoints at "/"
// app.MapMcp("/mcp");     // or under a path prefix

app.Run("http://localhost:3001");

[McpServerToolType]
public static class EchoTool
{
    [McpServerTool, Description("Echoes the message back to the client.")]
    public static string Echo(string message) => $"hello {message}";
}
```

## Stateless vs. stateful — the most important decision

> **v2 breaking change:** `HttpServerTransportOptions.Stateless` now defaults to **`true`** (it defaulted to `false` on 1.x). A server upgraded to 2.x without touching options stops creating sessions and stops exposing SSE endpoints. Set `Stateless = false` explicitly to restore the legacy behavior.

| Mode | `options.Stateless` | Behaviour | Use when |
|---|---|---|---|
| **Stateless** | `true` (default since 2.x) | No `Mcp-Session-Id`. Each POST is independent. Serves the current (2026-07-28) revision. | Horizontal scaling, simple tool servers, current-protocol clients. |
| **Stateful** | `false` | Server assigns and tracks `Mcp-Session-Id`. Long-lived session. **Down-level compatibility mode:** the server refuses the 2026-07-28 revision so dual-path clients fall back to an initialize-capable revision (2025-11-25 or earlier). | Legacy `ElicitAsync`/sampling/roots paths, pushed log notifications, clients that haven't adopted 2026-07-28. Requires session affinity at the load balancer. |

**Rule:** on the current (2026-07-28) protocol there are no HTTP sessions — "ask the user something mid-tool" uses the multi-round-trip pattern (throw `InputRequiredException`, handle the retried call; see [`elicitation.md`](./elicitation.md)), which works in both session modes and both revisions. Set `Stateless = false` only for the legacy paths — `ElicitAsync`, the deprecated `SampleAsync`/`RequestRootsAsync`, or pushed log/notification messages — and be aware it pins HTTP clients to a down-level, initialize-capable revision. On the stateless default those legacy calls fail at runtime with no channel to deliver them on.

## Endpoint shape

`MapMcp(pattern = "")` creates a route group at `pattern` and maps:
- **POST** — accepts JSON-RPC requests/responses/notifications. Returns either a JSON response or an SSE stream depending on `Accept` header and whether multiple messages need to flow back.
- **GET** — used by stateful sessions for the server-to-client SSE channel.
- **DELETE** — terminates a stateful session.

Default pattern is the root (`/`). To put MCP under `/mcp/v1`:

```csharp
app.MapMcp("/mcp/v1");
```

Match this on the client side (`Endpoint = new Uri("https://host/mcp/v1")`).

## Version negotiation and routing (2026-07-28)

- **Discovery-first:** v2 clients probe the `server/discover` method to learn capabilities instead of the legacy `initialize` handshake. The SDK answers both and falls back automatically for down-level peers (2025-11-25 and earlier) — you don't write any code for this, but don't be surprised to see `server/discover` in traffic captures.
- **Routable headers:** every Streamable HTTP POST carries an `Mcp-Method` header (e.g. `tools/call`), and named invocations (`tools/call`, `prompts/get`, `resources/read`) additionally carry `Mcp-Name` (e.g. the tool name), so gateways and rate limiters can route/throttle per tool without parsing JSON bodies. Don't require `Mcp-Name` globally at the gateway — discovery and list requests legitimately omit it.

## Per-session configuration (HttpContext access)

When you need to vary server behaviour per HTTP request (auth, tenant, headers), use the `ConfigureSessionOptions` callback:

```csharp
builder.Services
    .AddMcpServer()
    .WithHttpTransport(options =>
    {
        options.ConfigureSessionOptions = async (httpContext, mcpOptions, ct) =>
        {
            var tenantId = httpContext.Request.Headers["X-Tenant"].ToString();
            mcpOptions.ServerInstructions = $"Tenant: {tenantId}";
            // mutate any McpServerOptions fields per-session
        };
    });
```

Inside a tool, you can also inject `IHttpContextAccessor` if `AddHttpContextAccessor()` is registered. See the [`AspNetCoreMcpPerSessionTools` sample](https://github.com/modelcontextprotocol/csharp-sdk/tree/main/samples/AspNetCoreMcpPerSessionTools).

## Authentication

The MCP endpoint is just an ASP.NET Core endpoint — apply standard middleware:

```csharp
builder.Services
    .AddAuthentication("Bearer")
    .AddJwtBearer(/* configure */);
builder.Services.AddAuthorization();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapMcp().RequireAuthorization();   // protect the endpoint
```

For OAuth flows where the *MCP server* is the resource server, follow the [MCP authorization spec](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization). The [`ProtectedMcpServer` sample](https://github.com/modelcontextprotocol/csharp-sdk/tree/main/samples/ProtectedMcpServer) shows a working setup with discovery endpoints.

For machine-to-machine, an API key middleware is fine:

```csharp
app.Use(async (ctx, next) =>
{
    if (ctx.Request.Headers["X-Api-Key"] != Configuration["ApiKey"])
    {
        ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return;
    }
    await next();
});
```

## CORS (when the client is in-browser)

```csharp
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins("https://my-host.example.com")
     .AllowAnyHeader()
     .AllowAnyMethod()
     .AllowCredentials()));
// ...
app.UseCors();
app.MapMcp();
```

## Health checks and observability

Add the standard ASP.NET Core probes; the MCP endpoint shouldn't be the liveness check.

```csharp
builder.Services.AddHealthChecks();
// ...
app.MapHealthChecks("/healthz");
```

The SDK emits OpenTelemetry traces (`Activity` per tool call) and metrics. Wire them up if the user has an OTel pipeline:

```csharp
builder.Services
    .AddOpenTelemetry()
    .WithTracing(t => t.AddSource("ModelContextProtocol").AddOtlpExporter())
    .WithMetrics(m => m.AddMeter("ModelContextProtocol").AddOtlpExporter());
```

## Deployment notes

- **Containerise normally.** No special MCP-specific Dockerfile — it's just an ASP.NET Core app.
- **Behind a reverse proxy** (nginx, Azure Front Door, AWS ALB), make sure SSE buffering is **disabled** for the MCP path. nginx: `proxy_buffering off;`. Without this, streaming responses are batched into one slow blob.
- **Timeouts.** The client may keep an SSE connection open for a long time. Set proxy idle timeout high (e.g. 5+ minutes) for stateful deployments; less critical for stateless.
- **Azure Container Apps / App Service** work out of the box; both support long-lived HTTP responses.

## Enabling legacy SSE (compatibility only)

```csharp
builder.Services
    .AddMcpServer()
    .WithHttpTransport(options =>
    {
        options.EnableLegacySse = true;
#pragma warning disable MCP9004
        options.Stateless = false; // SSE requires stateful mode
#pragma warning restore MCP9004
    })
    .WithToolsFromAssembly();
```

Only do this if the user has a documented client that hasn't migrated. New deployments should not enable it.
