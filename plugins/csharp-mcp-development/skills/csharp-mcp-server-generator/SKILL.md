---
name: csharp-mcp-server-generator
description: 'Generate a complete MCP server project in C# with tools, prompts, and proper configuration'
---

# Generate C# MCP Server

Create a complete Model Context Protocol (MCP) server in C# with the following specifications:

## Requirements

1. **Project Structure**: Create a new C# console application with proper directory structure
2. **NuGet Packages**: Include ModelContextProtocol (prerelease) and Microsoft.Extensions.Hosting
3. **Logging Configuration**: Configure all logs to stderr to avoid interfering with stdio transport
4. **Server Setup**: Use the Host builder pattern with proper DI configuration
5. **Tools**: Create at least one useful tool with proper attributes and descriptions
6. **Error Handling**: Include proper error handling and validation

## Implementation Details

### Basic Project Setup
- Use .NET 8.0 or later
- Create a console application
- Add necessary NuGet packages with --prerelease flag
- Configure logging to stderr

### Server Configuration
- Use `Host.CreateApplicationBuilder` for DI and lifecycle management
- Configure `AddMcpServer()` with stdio transport
- Use `WithToolsFromAssembly()` for automatic tool discovery
- Ensure the server runs with `RunAsync()`

### Tool Implementation
- Use `[McpServerToolType]` attribute on tool classes
- Use `[McpServerTool]` attribute on tool methods
- Add `[Description]` attributes to tools and parameters
- Support async operations where appropriate
- Include proper parameter validation

### Code Quality
- Follow C# naming conventions
- Include XML documentation comments
- Use nullable reference types
- Implement proper error handling with McpProtocolException
- Use structured logging for debugging

## Example Tool Types to Consider
- File operations (read, write, search)
- Data processing (transform, validate, analyze)
- External API integrations (HTTP requests)
- System operations (execute commands, check status)
- Database operations (query, update)

## Testing Guidance
- Explain how to run the server
- Provide example commands to test with MCP clients
- Include troubleshooting tips

Generate a complete, production-ready MCP server with comprehensive documentation and error handling.
