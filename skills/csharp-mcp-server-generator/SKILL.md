---
name: csharp-mcp-server-generator
description: 'Deprecated: superseded by dotnet-mcp-builder, which targets the current stable ModelContextProtocol 1.x packages and covers every MCP primitive (tools, prompts, resources, elicitation, sampling, roots, MCP Apps) plus both transports (STDIO and Streamable HTTP). Install dotnet-mcp-builder instead.'
---

# csharp-mcp-server-generator (deprecated)

This skill has been superseded by **`dotnet-mcp-builder`**.

`dotnet-mcp-builder` is a strict superset: it targets the current stable `ModelContextProtocol` 1.x NuGet packages (this skill predated 1.0 and referenced the prerelease line, which has breaking API differences), covers both transports (STDIO and Streamable HTTP — the legacy HTTP+SSE transport is deprecated upstream), and covers every primitive in the current MCP spec (2025-11-25): tools, prompts, resources, elicitation (form + URL mode), sampling, roots, completions, logging, and MCP Apps. It also includes a basic .NET MCP client and testing reference, and steers the model away from common pitfalls — STDIO stdout/stderr trap, stateless-vs-stateful HTTP wiring, OAuth and reverse-proxy specifics for remote deployments.

## Migration steps

1. Install the replacement skill:
   ```
   gh skills install github/awesome-copilot dotnet-mcp-builder
   ```
2. (Optional) Uninstall this skill so the deprecation notice no longer appears in your skill list:
   ```
   gh skills uninstall github/awesome-copilot csharp-mcp-server-generator
   ```
3. Re-run your existing prompts. The new skill triggers on the same .NET MCP server intents and on a broader set (HTTP transport, prompts/resources, elicitation, MCP Apps, debugging).

The replacement skill lives under `skills/dotnet-mcp-builder/` in this repository.
