---
applyTo: '**/*.java, **/application*.properties, **/application*.yml, **/application*.yaml'
description: 'Quarkus MCP Server development standards and instructions, with Streamable HTTP (preferred) and legacy HTTP SSE transports'
---
# Quarkus MCP Server

Apply these instructions only when the project uses a Quarkus MCP Server extension (`mcp-server-http`, or the legacy `mcp-server-sse`).

Build MCP servers with Java 21, Quarkus, and Streamable HTTP transport (legacy HTTP SSE is also supported).

## Stack

- Java 21 with Quarkus Framework
- MCP Server Extension: `mcp-server-http` (`io.quarkiverse.mcp:quarkus-mcp-server-http`), which serves both transports: legacy HTTP/SSE at `http://localhost:8080/mcp/sse` and Streamable HTTP (preferred; SSE is deprecated in the MCP spec) at `http://localhost:8080/mcp`
- `mcp-server-sse` is not managed by recent Quarkus platform BOMs (verified: absent from 3.40.1); the Quarkus CLI silently falls back to an older platform stream when asked for it. Use it only to keep an existing project that already depends on it.
- CDI for dependency injection

## Quick Start

```bash
quarkus create app --no-code -x rest-client-jackson,qute,mcp-server-http your-domain-mcp-server
```

## Structure

- Use standard Java naming conventions (PascalCase classes, camelCase methods)
- Organize in packages: `model`, `repository`, `service`, `mcp`
- Use Record types for immutable data models
- State management for immutable data must be managed by repository layer
- Add Javadoc for public methods

## MCP Tools

- Must be public methods in `@ApplicationScoped` CDI beans
- Use `@Tool(name="tool_name", description="clear description")`
- Never return `null` - return error messages instead
- Always validate parameters and handle errors gracefully

## Architecture

- Separate concerns: MCP tools → Service layer → Repository
- Use constructor injection (`@Inject` is optional on a single constructor)
- Make data operations thread-safe
- Use `Optional<T>` to avoid null pointer exceptions

## Common Issues

- Don't put business logic in MCP tools (use service layer)
- For expected business errors throw `io.quarkiverse.mcp.server.ToolCallException` (its message becomes a failed tool result); don't let other unhandled exceptions escape, as they are reported as generic internal errors
- Don't forget to validate input parameters
- Test with edge cases (null, empty inputs)
