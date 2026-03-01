---
name: copilot-sdk
description: Build agentic applications with GitHub Copilot SDK. Use when embedding AI agents in apps, creating custom tools, implementing streaming responses, managing sessions, connecting to MCP servers, or creating custom agents. Triggers on Copilot SDK, GitHub SDK, agentic app, embed Copilot, programmable agent, MCP server, custom agent.
---

# GitHub Copilot SDK

Embed Copilot's agentic workflows in any application using Python, TypeScript, Go, or .NET.

Use this file as the high-level architecture and workflow guide. Keep language-specific implementation details in `references/`.

## Overview

The GitHub Copilot SDK exposes the same engine behind Copilot CLI: a production-tested agent runtime you can invoke programmatically. No need to build your own orchestration - you define agent behavior, Copilot handles planning, tool invocation, file edits, and more.

## Prerequisites

1. **GitHub Copilot CLI** installed and authenticated ([Installation guide](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli))
2. **Language runtime**: Node.js 18+, Python 3.8+, Go 1.21+, or .NET 8.0+

Verify CLI: `copilot --version`

## Event Types

| Event | Description |
|-------|-------------|
| `user.message` | User input added |
| `assistant.message` | Complete model response |
| `assistant.message_delta` | Streaming response chunk |
| `assistant.reasoning` | Model reasoning (model-dependent) |
| `assistant.reasoning_delta` | Streaming reasoning chunk |
| `tool.execution_start` | Tool invocation started |
| `tool.execution_complete` | Tool execution finished |
| `session.idle` | No active processing |
| `session.error` | Error occurred |

## Client Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `cliPath` | Path to Copilot CLI executable | System PATH |
| `cliUrl` | Connect to existing server (e.g., "localhost:4321") | None |
| `port` | Server communication port | Random |
| `useStdio` | Use stdio transport instead of TCP | true |
| `logLevel` | Logging verbosity | "info" |
| `autoStart` | Launch server automatically | true |
| `autoRestart` | Restart on crashes | true |
| `cwd` | Working directory for CLI process | Inherited |

## Session Configuration

| Option | Description |
|--------|-------------|
| `model` | LLM to use ("gpt-4.1", "claude-sonnet-4.5", etc.) |
| `sessionId` | Custom session identifier |
| `tools` | Custom tool definitions |
| `mcpServers` | MCP server connections |
| `customAgents` | Custom agent personas |
| `systemMessage` | Override default system prompt |
| `streaming` | Enable incremental response chunks |
| `availableTools` | Whitelist of permitted tools |
| `excludedTools` | Blacklist of disabled tools |

## How Tools Work

When Copilot decides to call your tool:
1. Copilot sends a tool call request with the parameters
2. The SDK runs your handler function
3. The result is sent back to Copilot
4. Copilot incorporates the result into its response

Copilot decides when to call your tool based on the user's question and your tool's description.

## Best Practices

1. **Always cleanup**: Use `try-finally` or `defer` to ensure `client.stop()` is called
2. **Set timeouts**: Use `sendAndWait` with timeout for long operations
3. **Handle events**: Subscribe to error events for robust error handling
4. **Use streaming**: Enable streaming for better UX on long responses
5. **Persist sessions**: Use custom session IDs for multi-turn conversations
6. **Define clear tools**: Write descriptive tool names and descriptions

## Architecture

```
Your Application
       |
  SDK Client
       | JSON-RPC
  Copilot CLI (server mode)
       |
  GitHub (models, auth)
```

The SDK manages the CLI process lifecycle automatically. All communication happens via JSON-RPC over stdio or TCP.

## Resources

- **GitHub Repository**: https://github.com/github/copilot-sdk
- **Getting Started Guide**: https://github.com/github/copilot-sdk/blob/main/docs/getting-started.md
- **GitHub MCP Server**: https://github.com/github/github-mcp-server
- **MCP Servers Directory**: https://github.com/modelcontextprotocol/servers
- **Cookbook**: https://github.com/github/awesome-copilot/tree/main/cookbook

## Status

This SDK is in **Technical Preview** and may have breaking changes. Not recommended for production use yet.
