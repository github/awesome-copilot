---
name: dotnet-mcp-builder
description: 'Build Model Context Protocol (MCP) servers in C#/.NET against the current ModelContextProtocol 1.x NuGet packages. Especially helps with cases the model often gets wrong without guidance — stale preview versions (it tends to pick 0.3 or 0.4 preview), MCP Apps (interactive UI rendered in the host), elicitation URL mode, per-session HTTP wiring, OAuth and reverse-proxy deploy specifics, and debugging concrete MapMcp / STDIO / Streamable-HTTP errors. Also covers the routine work — STDIO and Streamable HTTP transports (SSE is deprecated), tools, prompts, resources, sampling, roots, completions, logging — and a basic .NET MCP client. Trigger when the user says or implies any .NET MCP server work: ModelContextProtocol, McpServerTool, MapMcp, WithStdioServerTransport, "MCP server in C#", "MCP tool in dotnet", "expose this as MCP", or names a primitive (prompt/resource/elicitation/MCP App) in a .NET context. Skip for MCP work in other languages.'
---

# Building MCP servers in .NET

This skill helps you write production-quality MCP servers and basic clients in C#/.NET against the **official** [`ModelContextProtocol`](https://www.nuget.org/profiles/ModelContextProtocol) NuGet packages, maintained by Microsoft and the MCP project. It targets the **stable 1.x** line and the current spec (2025-11-25).

## When this skill earns its keep

The .NET MCP SDK had years of preview packages (`0.x-preview`) before reaching `1.0`. Without help, the model tends to:
- Pin a stale preview version that won't compile against current samples.
- Miss recent spec features (elicitation URL mode, MCP Apps, structured content blocks).
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

Server-to-client features (sampling, elicitation, roots, log/progress notifications) are methods on the injected `IMcpServer`.

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
| Call the client's LLM from a tool | `references/sampling.md` |
| Read the user's project roots | `references/roots.md` |
| Return an interactive UI | `references/mcp-apps.md` |
| Argument completions, log/progress notifications, filters, server instructions | `references/server-features.md` |
| Write a .NET program that **consumes** an MCP server | `references/client.md` |
| MCP Inspector, in-memory tests, mocks, CI | `references/testing.md` |

For multi-primitive tasks, load several at once. For trivial edits in an existing file, you usually don't need any.

## Cardinal rules (apply always; these prevent the highest-frequency breakages)

1. **Pin the current stable package, not a preview.** Use `ModelContextProtocol` / `ModelContextProtocol.AspNetCore` / `ModelContextProtocol.Core` at the latest **1.x**. If you find yourself writing `0.3-preview` or `0.4-preview`, stop and check NuGet — preview APIs have breaking differences.
2. **STDIO servers must not write to stdout.** Stdout is the JSON-RPC channel. Configure `LogToStandardErrorThreshold = LogLevel.Trace` before anything else and never `Console.WriteLine` from a tool.
3. **HTTP defaults to stateful.** For horizontally-scaled deployments without server-initiated traffic, set `options.Stateless = true`. Server-to-client features (sampling, elicitation, roots, unsolicited notifications) require stateful HTTP **or** STDIO — `Stateless = true` will break them at runtime.
4. **SSE-only is deprecated.** Use Streamable HTTP. Only enable legacy SSE (`EnableLegacySse = true`) for an old client you must support, and call it out.
5. **Always `[Description]` tools and parameters.** This is what the LLM sees when picking and shaping calls. Vague descriptions are the #1 reason tools don't get used.
6. **Show the registration line every time you add a primitive.** A new `[McpServerPromptType]` class without `.WithPrompts<...>()` (or `.WithPromptsFromAssembly()`) is invisible.
7. **Don't invent APIs.** If you're unsure a method exists, say so and check the [API reference](https://csharp.sdk.modelcontextprotocol.io/api/ModelContextProtocol.html) — wrong method names cause silent failures.

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
5. **Sampling/elicitation/roots failing:** transport is stateless HTTP, or the client doesn't advertise the capability.

Still stuck? Point the user at the [`EverythingServer`](https://github.com/modelcontextprotocol/csharp-sdk/tree/main/samples/EverythingServer) sample — it exercises every feature.
