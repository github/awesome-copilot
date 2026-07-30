---
name: dotnet-mcp-builder
description: 'Build Model Context Protocol (MCP) servers in C#/.NET against the current ModelContextProtocol 2.x NuGet packages. Helps with cases the model gets wrong without guidance — stale versions (0.x preview or 1.x-era defaults), the v2 stateless-by-default HTTP flip, the 2026-07-28 spec deprecations (roots/sampling/logging), MCP Apps and Tasks extension packages, elicitation URL mode, per-session HTTP wiring, OAuth and reverse-proxy deploy specifics, and debugging MapMcp / STDIO / Streamable-HTTP errors. Also covers STDIO and Streamable HTTP transports (SSE is deprecated), tools, prompts, resources, completions, and a basic .NET MCP client. Trigger when the user says or implies any .NET MCP server work: ModelContextProtocol, McpServerTool, MapMcp, WithStdioServerTransport, "MCP server in C#", "MCP tool in dotnet", "expose this as MCP", or names a primitive (prompt/resource/elicitation/MCP App) in a .NET context. Skip for MCP work in other languages.'
---

# Building MCP servers in .NET

This skill helps you write production-quality MCP servers and basic clients in C#/.NET against the **official** [`ModelContextProtocol`](https://www.nuget.org/profiles/ModelContextProtocol) NuGet packages, maintained by Microsoft and the MCP project. It targets the **stable 2.x** line and the current spec (2026-07-28).

## When this skill earns its keep

The .NET MCP SDK had years of preview packages (`0.x-preview`) before reaching `1.0`, and v2 flipped several defaults. Without help, the model tends to:
- Pin a stale preview version that won't compile against current samples.
- Apply 1.x-era defaults that v2 reversed (HTTP was stateful by default; in 2.x `Stateless` defaults to `true`).
- Recommend capabilities the 2026-07-28 spec deprecates (roots, sampling, MCP-channel logging — now `[Obsolete]`, warning `MCP9005`).
- Miss recent spec features (multi-round-trip `input_required`, discovery-first negotiation, MCP Apps/Tasks extension packages, elicitation URL mode, structured content blocks).
- Get HTTP transport details wrong (stateful/stateless, proxy buffering, OAuth wiring).
- Forget the STDIO stdout/stderr trap.

If the task is one of those, *load the matching reference* and follow it. If it's truly trivial (e.g. "rename this tool method"), you don't need to read everything — the cardinal rules below are the minimum.

## Mental model in 30 seconds

A .NET MCP server is an ordinary `Microsoft.Extensions.Hosting` (or `WebApplication`) app that wires an MCP server through DI:

```csharp
builder.Services
    .AddMcpServer()
    .WithStdioServerTransport()      // OR .WithHttpTransport(...)
    .WithToolsFromAssembly()         // discover [McpServerToolType] classes
    .WithPrompts<MyPrompts>()        // optional
    .WithResources<MyResources>();   // optional
```

Primitives are plain C# methods on classes marked with attributes (`[McpServerToolType]` + `[McpServerTool]`, `[McpServerPromptType]` + `[McpServerPrompt]`, `[McpServerResourceType]` + `[McpServerResource]`). Parameters bind from JSON-RPC; the SDK builds the JSON Schema from the signature plus `[Description]` attributes.

Server-to-client features (elicitation, progress notifications, and the now-deprecated sampling/roots/log notifications) are methods on the injected `IMcpServer`.

## Decision tree → which references to load

Always load `references/packages.md` if you're creating a new project or unsure of the current package version.

| Task | Load |
|---|---|
| New STDIO server | `references/transport-stdio.md` |
| New HTTP (Streamable) server | `references/transport-http.md` |
| Add/modify a tool | `references/tool-primitive.md` |
| Add/modify a prompt | `references/prompt-primitive.md` |
| Add/modify a resource | `references/resource-primitive.md` |
| Ask the user a question mid-tool | `references/elicitation.md` |
| Call the client's LLM from a tool (deprecated in 2026-07-28) | `references/sampling.md` |
| Read the user's project roots (deprecated in 2026-07-28) | `references/roots.md` |
| Return an interactive UI | `references/mcp-apps.md` |
| Argument completions, log/progress notifications, filters, server instructions | `references/server-features.md` |
| Write a .NET program that **consumes** an MCP server | `references/client.md` |
| MCP Inspector, in-memory tests, mocks, CI | `references/testing.md` |

For multi-primitive tasks, load several at once. For trivial edits in an existing file, you usually don't need any.

## Cardinal rules (apply always; these prevent the highest-frequency breakages)

1. **Pin the current stable package, not a preview.** Use `ModelContextProtocol` / `ModelContextProtocol.AspNetCore` / `ModelContextProtocol.Core` at the latest **2.x**. If you find yourself writing `0.3-preview` or `0.4-preview`, stop and check NuGet — preview APIs have breaking differences. 1.x still works but predates the 2026-07-28 spec.
2. **STDIO servers must not write to stdout.** Stdout is the JSON-RPC channel. Configure `LogToStandardErrorThreshold = LogLevel.Trace` before anything else and never `Console.WriteLine` from a tool.
3. **HTTP defaults to stateless in 2.x** (v1.x defaulted to stateful — the single most impactful v2 breaking change). The 2026-07-28 revision has no HTTP sessions at all: setting `Stateless = false` makes the server refuse that revision and serve clients via the legacy `initialize` fallback. For "ask the user something mid-tool" on current-protocol HTTP, use the multi-round-trip `InputRequiredException` pattern; reserve stateful HTTP (or STDIO) for the legacy `ElicitAsync`/sampling/roots paths and pushed notifications.
4. **SSE-only is deprecated.** Use Streamable HTTP. Only enable legacy SSE (`EnableLegacySse = true`) for an old client you must support, and call it out.
5. **Don't design new servers around deprecated capabilities.** The 2026-07-28 spec deprecates roots, sampling, and MCP-channel logging; the SDK marks them `[Obsolete]` (warning `MCP9005`). They still work against down-level clients, but for new designs prefer the multi-round-trip `input_required` pattern and `ILogger` logging. Suppress `MCP9005` only as a documented transition measure.
6. **Always `[Description]` tools and parameters.** This is what the LLM sees when picking and shaping calls. Vague descriptions are the #1 reason tools don't get used.
7. **Show the registration line every time you add a primitive.** A new `[McpServerPromptType]` class without `.WithPrompts<...>()` (or `.WithPromptsFromAssembly()`) is invisible.
8. **Don't invent APIs.** If you're unsure a method exists, say so and check the [API reference](https://csharp.sdk.modelcontextprotocol.io/api/ModelContextProtocol.html) — wrong method names cause silent failures. This applies doubly to the new v2 extension packages (`ModelContextProtocol.Extensions.Tasks`, `ModelContextProtocol.Extensions.Apps`) — check their docs before writing code against them.

## Working style

- **Make minimal, additive changes.** Add a method to the existing tool class rather than restructuring the project.
- **For non-trivial setups, run `dotnet build`.** Catches missing usings, attribute typos, and TFM mismatches before the user sees them.
- **Confirm transport + .NET version + primitives before scaffolding** if context doesn't already make them obvious. Default to **.NET 10** for new projects.

## When the user is stuck

Walk this checklist before guessing:
1. **STDIO:** something is writing to stdout (logger sink, `Console.WriteLine`, library banner).
2. **HTTP 404:** path mismatch — `app.MapMcp()` is root, `app.MapMcp("/mcp")` puts it under `/mcp`.
3. **Tool not appearing:** missing `[McpServerToolType]` on the class, or no `.WithToolsFromAssembly()` / `.WithTools<T>()` registered.
4. **Args not bound:** parameter names must match the JSON-RPC `arguments` keys; complex types bind via `System.Text.Json`.
5. **Sampling/elicitation/roots failing:** these legacy server-to-client calls can't run on current-protocol HTTP — migrate to the multi-round-trip `InputRequiredException` pattern, or (legacy paths only) set `Stateless = false`, knowing that pins HTTP clients to a down-level `initialize` revision. Also check the client actually advertises the capability.
6. **`MCP9005` build warnings after upgrading to 2.x:** the code uses deprecated roots/sampling/logging APIs. Plan the migration; suppress only temporarily.

Still stuck? Point the user at the [`EverythingServer`](https://github.com/modelcontextprotocol/csharp-sdk/tree/main/samples/EverythingServer) sample — it exercises every feature.
