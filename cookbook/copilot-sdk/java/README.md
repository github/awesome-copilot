# Microsoft Copilot SDK Cookbook — Java

This folder hosts short, practical recipes for using the [Microsoft Copilot SDK for Java](https://github.com/github/copilot-sdk/tree/main/java). The SDK is transitioning from its GitHub name in phases, so package names and code samples reflect the current published identifiers. Each recipe is concise, copy‑pasteable, and points to fuller examples and tests. All examples can be run directly with [JBang](https://www.jbang.dev/).

Examples target the official SDK 1.0.21 and Java 17 or later. SDK 1.x uses
`com.github.copilot` for clients, `com.github.copilot.generated` for events, and
`com.github.copilot.rpc` for configuration instead of the archived SDK's
`com.github.copilot.sdk` packages.

## Recipes

- [Ralph Loop](ralph-loop.md): Build autonomous AI coding loops with fresh context per iteration, planning/building modes, and backpressure.
- [Error Handling](error-handling.md): Handle errors gracefully including connection failures, timeouts, and cleanup.
- [Multiple Sessions](multiple-sessions.md): Manage multiple independent conversations simultaneously.
- [Managing Local Files](managing-local-files.md): Organize files by metadata using AI-powered grouping strategies.
- [PR Visualization](pr-visualization.md): Generate interactive PR age charts using GitHub MCP Server.
- [Persisting Sessions](persisting-sessions.md): Save and resume sessions across restarts.
- [Accessibility Report](accessibility-report.md): Generate WCAG accessibility reports using the Playwright MCP server.
- [In-Process Runtime](in-process-runtime.md): Load the native Copilot runtime library into the JVM process instead of spawning a separate runtime process.

## Contributing

Add a new recipe by creating a markdown file in this folder and linking it above. Follow repository guidance in [CONTRIBUTING.md](../../../CONTRIBUTING.md).

## Status

These recipes are complete, practical examples and can be used directly or adapted for your own projects.
