---
applyTo: '*'
description: 'Quarkus and MCP Server with HTTP SSE transport development standards and instructions'
---
# Quarkus MCP Server

Build MCP servers with Java 21, Quarkus, and HTTP SSE transport.

## Stack

- Java 21 with Quarkus Framework
- MCP Server Extension: `mcp-server-sse`
- CDI for dependency injection
- MCP Endpoint: `http://localhost:8080/mcp/sse`

## Quick Start

```bash
quarkus create app --no-code -x rest-client-jackson,qute,mcp-server-sse your-domain-mcp-server
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
- Use `@Inject` for dependency injection
- Make data operations thread-safe
- Use `Optional<T>` to avoid null pointer exceptions

## Common Issues

- Don't put business logic in MCP tools (use service layer)
- Don't throw exceptions from tools (return error strings)
- Don't forget to validate input parameters
- Test with edge cases (null, empty inputs)
