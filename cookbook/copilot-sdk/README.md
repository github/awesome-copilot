# Microsoft Copilot SDK Cookbook

This cookbook collects small, focused recipes showing how to accomplish common tasks with the Microsoft Copilot SDK across languages. The SDK is transitioning from the GitHub Copilot SDK in phases, and no immediate changes are required. Package names, namespaces, and repository links in these recipes remain as currently published; see the [official transition announcement](https://github.blog/changelog/2026-10-28-github-copilot-sdk-is-becoming-microsoft-copilot-sdk/). Each recipe is intentionally short and practical, with copy‑pasteable snippets and pointers to fuller examples and tests.

## Recipes by Language

### .NET (C#)

- [Ralph Loop](dotnet/ralph-loop.md): Build autonomous AI coding loops with fresh context per iteration, planning/building modes, and backpressure.
- [Error Handling](dotnet/error-handling.md): Handle errors gracefully including connection failures, timeouts, and cleanup.
- [Multiple Sessions](dotnet/multiple-sessions.md): Manage multiple independent conversations simultaneously.
- [Managing Local Files](dotnet/managing-local-files.md): Organize files by metadata using AI-powered grouping strategies.
- [PR Visualization](dotnet/pr-visualization.md): Generate interactive PR age charts using GitHub MCP Server.
- [Persisting Sessions](dotnet/persisting-sessions.md): Save and resume sessions across restarts.
- [Accessibility Report](dotnet/accessibility-report.md): Generate WCAG accessibility reports using the Playwright MCP server.
- [In-Process Runtime](dotnet/in-process-runtime.md): Run the Copilot runtime in-process instead of launching a separate CLI process.

### Node.js / TypeScript

- [Ralph Loop](nodejs/ralph-loop.md): Build autonomous AI coding loops with fresh context per iteration, planning/building modes, and backpressure.
- [Error Handling](nodejs/error-handling.md): Handle errors gracefully including connection failures, timeouts, and cleanup.
- [Multiple Sessions](nodejs/multiple-sessions.md): Manage multiple independent conversations simultaneously.
- [Managing Local Files](nodejs/managing-local-files.md): Organize files by metadata using AI-powered grouping strategies.
- [PR Visualization](nodejs/pr-visualization.md): Generate interactive PR age charts using GitHub MCP Server.
- [Persisting Sessions](nodejs/persisting-sessions.md): Save and resume sessions across restarts.
- [Accessibility Report](nodejs/accessibility-report.md): Generate WCAG accessibility reports using the Playwright MCP server.

### Python

- [Ralph Loop](python/ralph-loop.md): Build autonomous AI coding loops with fresh context per iteration, planning/building modes, and backpressure.
- [Error Handling](python/error-handling.md): Handle errors gracefully including connection failures, timeouts, and cleanup.
- [Multiple Sessions](python/multiple-sessions.md): Manage multiple independent conversations simultaneously.
- [Managing Local Files](python/managing-local-files.md): Organize files by metadata using AI-powered grouping strategies.
- [PR Visualization](python/pr-visualization.md): Generate interactive PR age charts using GitHub MCP Server.
- [Persisting Sessions](python/persisting-sessions.md): Save and resume sessions across restarts.
- [Accessibility Report](python/accessibility-report.md): Generate WCAG accessibility reports using the Playwright MCP server.

### Go

- [Ralph Loop](go/ralph-loop.md): Build autonomous AI coding loops with fresh context per iteration, planning/building modes, and backpressure.
- [Error Handling](go/error-handling.md): Handle errors gracefully including connection failures, timeouts, and cleanup.
- [Multiple Sessions](go/multiple-sessions.md): Manage multiple independent conversations simultaneously.
- [Managing Local Files](go/managing-local-files.md): Organize files by metadata using AI-powered grouping strategies.
- [PR Visualization](go/pr-visualization.md): Generate interactive PR age charts using GitHub MCP Server.
- [Persisting Sessions](go/persisting-sessions.md): Save and resume sessions across restarts.
- [Accessibility Report](go/accessibility-report.md): Generate WCAG accessibility reports using the Playwright MCP server.

### Java

- [Ralph Loop](java/ralph-loop.md): Build autonomous AI coding loops with fresh context per iteration, planning/building modes, and backpressure.
- [Error Handling](java/error-handling.md): Handle errors gracefully including connection failures, timeouts, and cleanup.
- [Multiple Sessions](java/multiple-sessions.md): Manage multiple independent conversations simultaneously.
- [Managing Local Files](java/managing-local-files.md): Organize files by metadata using AI-powered grouping strategies.
- [PR Visualization](java/pr-visualization.md): Generate interactive PR age charts using GitHub MCP Server.
- [Persisting Sessions](java/persisting-sessions.md): Save and resume sessions across restarts.
- [Accessibility Report](java/accessibility-report.md): Generate WCAG accessibility reports using the Playwright MCP server.
- [In-Process Runtime](java/in-process-runtime.md): Load the native Copilot runtime library into the JVM process instead of spawning a separate runtime process.

## How to Use

- Browse your language section above and open the recipe links
- Each recipe includes runnable examples in a `recipe/` subfolder with language-specific tooling
- See existing examples and tests at the official SDK repository's `java/v1.0.21` tag for version-specific references:
  - [Node.js example](https://github.com/github/copilot-sdk/blob/java/v1.0.21/nodejs/examples/basic-example.ts)
  - E2E tests: [Go](https://github.com/github/copilot-sdk/tree/java/v1.0.21/go/internal/e2e), [Python](https://github.com/github/copilot-sdk/tree/java/v1.0.21/python/e2e), [Node.js](https://github.com/github/copilot-sdk/tree/java/v1.0.21/nodejs/test/e2e), [.NET](https://github.com/github/copilot-sdk/tree/java/v1.0.21/dotnet/test/Harness), [Java](https://github.com/github/copilot-sdk/tree/java/v1.0.21/java/sdk/src/test/java/com/github/copilot/e2e)

## Running Examples

Before running examples, follow the prerequisites in your language's recipe README:

 - [.NET](dotnet/recipe/README.md#prerequisites)
 - [Node.js](nodejs/recipe/README.md#prerequisites)
 - [Python](python/recipe/README.md#prerequisites)
 - [Go](go/recipe/README.md#prerequisites)
 - [Java](java/recipe/README.md#prerequisites)

### .NET

```bash
cd dotnet/cookbook/recipe
dotnet run <filename>.cs
```

### Node.js

```bash
cd nodejs/cookbook/recipe
npm install
npx tsx <filename>.ts
```

### Python

```bash
cd python/cookbook/recipe
pip install -r requirements.txt
python <filename>.py
```

### Go

```bash
cd go/cookbook/recipe
go run <filename>.go
```

### Java

```bash
cd java/recipe
jbang <FileName>.java
```

## Contributing

- Propose or add a new recipe by creating a markdown file in your language's `cookbook/` folder and a runnable example in `recipe/`
- Follow repository guidance in [CONTRIBUTING.md](../../CONTRIBUTING.md)

## Status

The cookbook covers 5 languages, with 8 recipes for .NET and Java and 7 shared recipes for Node.js, Python, and Go. Each recipe includes both markdown documentation and runnable examples.
