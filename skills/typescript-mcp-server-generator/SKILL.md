---
name: typescript-mcp-server-generator
description: 'Generate a complete MCP server project in TypeScript using the MCP TypeScript SDK v2 (@modelcontextprotocol/server) with tools, resources, and proper configuration'
---

# Generate TypeScript MCP Server

Create a complete Model Context Protocol (MCP) server in TypeScript using the **MCP TypeScript SDK v2** with the following specifications:

## Requirements

1. **Project Structure**: Create a new TypeScript/Node.js project with proper directory structure
2. **NPM Packages**: The v1 monolithic `@modelcontextprotocol/sdk` package is retired. Use the focused v2 packages:
   - `@modelcontextprotocol/server` — server implementation (stdio transport via the `@modelcontextprotocol/server/stdio` subpath)
   - `@modelcontextprotocol/node` — Node HTTP transport (`NodeStreamableHTTPServerTransport`), or a framework adapter: `@modelcontextprotocol/express`, `@modelcontextprotocol/hono`, `@modelcontextprotocol/fastify` — each adapter requires its peer framework to be installed alongside it (e.g. `@modelcontextprotocol/express` + `express`)
   - `@modelcontextprotocol/core` — shared protocol schemas (import `*Schema` constants from here, not from `sdk/types.js`)
   - `zod@^4.2` — v2 requires Zod 4.2+; do not use zod@3
3. **Runtime**: Node.js 20+ (v2 minimum); ESM-first with `"type": "module"` (a CommonJS build is also shipped, so `require()` works if needed)
4. **Server Type**: Choose between HTTP (Streamable HTTP transport) or stdio-based server. SSE and WebSocket transports were removed in v2 — do not generate them.
5. **Tools**: Create at least one useful tool with proper schema validation
6. **Error Handling**: Include comprehensive error handling and validation

## Implementation Details

### Project Setup
- Initialize with `npm init` and create package.json
- Install dependencies: `@modelcontextprotocol/server`, `zod@^4.2`, and the transport package — `@modelcontextprotocol/node` for plain Node HTTP, or a framework adapter together with its peer framework (e.g. `npm install @modelcontextprotocol/express express`)
- Configure TypeScript with ES modules: `"type": "module"` in package.json
- Add dev dependencies: `tsx` or `ts-node` for development
- Create proper .gitignore file

### Server Configuration
- Use `McpServer` class from `@modelcontextprotocol/server` for high-level implementation
- Set server name and version
- Choose the appropriate transport:
  - HTTP (Node): `NodeStreamableHTTPServerTransport` from `@modelcontextprotocol/node`
  - HTTP (Web Standard runtimes): `WebStandardStreamableHTTPServerTransport` from `@modelcontextprotocol/server`
  - stdio: `StdioServerTransport` from `@modelcontextprotocol/server/stdio`
- For HTTP: prefer a framework adapter (`@modelcontextprotocol/express`, etc.) with proper middleware and error handling
- Note that v2 uses Web Standard `Headers`/`Request` types; read headers with `ctx.http?.req?.headers.get('x-custom')`

### Tool Implementation
- Use `registerTool()` with a config object — v1 variadic `.tool()` signatures are gone:
  ```typescript
  server.registerTool('greet', {
    description: 'Greet user',
    inputSchema: z.object({ name: z.string() })
  }, async ({ name }, ctx) => {
    return { content: [{ type: 'text', text: `Hello, ${name}!` }] };
  });
  ```
- Schemas must be full Zod objects (`z.object({...})`) — raw shape objects (`{ name: z.string() }`) are deprecated
- Provide clear `title` and `description` fields
- Return both `content` and `structuredContent` in results
- The handler's second parameter is a structured `ctx` object (replaces v1 `extra`): `ctx.mcpReq.signal`, `ctx.mcpReq.id`, `ctx.mcpReq.send(...)`, `ctx.mcpReq.notify(...)`
- Implement proper error handling with try-catch blocks; use the v2 error hierarchy (`ProtocolError`, `SdkError`, `SdkHttpError` with `.status`) instead of v1 `McpError`/`StreamableHTTPError`
- Support async operations where appropriate

### Resource/Prompt Setup (Optional)
- Add resources using `registerResource()` with ResourceTemplate for dynamic URIs
- Add prompts using `registerPrompt()` with argument schemas (same config-object style as `registerTool()`)
- Consider adding completion support for better UX; note the v2 `completable()` wrapper order: `completable(z.string(), callback).optional()` (optional applied outside)

### Code Quality
- Use TypeScript for type safety
- Follow async/await patterns consistently
- Implement proper cleanup on transport close events
- Use environment variables for configuration
- Add inline comments for complex logic
- Structure code with clear separation of concerns

## Example Tool Types to Consider
- Data processing and transformation
- External API integrations
- File system operations (read, search, analyze)
- Database queries
- Text analysis or summarization (LLM-assisted via the multi-round `input_required` pattern)
- System information retrieval

## Configuration Options
- **For HTTP Servers**: 
  - Port configuration via environment variables
  - CORS setup for browser clients
  - Session management (stateless vs stateful)
  - DNS rebinding protection for local servers
  - Strict `Content-Type` handling: v2 rejects non-`application/json` POST bodies
  
- **For stdio Servers**:
  - Proper stdin/stdout handling
  - Environment-based configuration
  - Process lifecycle management

## Migrating an Existing v1 Server
- Run the official codemod first: `npx @modelcontextprotocol/codemod@latest v1-to-v2 .`
- Then search for `@mcp-codemod-error` markers for the parts requiring manual judgment (transport choice, header reads, error classification)
- Swap `McpError + ErrorCode` checks for the new error classes; HTTP status now lives on `error.status`, not `error.code`
- `Server.createMessage()`, `listRoots()`, `sendLoggingMessage()` and the `roots`/`sampling`/`logging` capability fields are deprecated in v2 — avoid them in new code

## Testing Guidance
- Explain how to run the server (`npm start` or `npx tsx server.ts`)
- Provide MCP Inspector command: `npx @modelcontextprotocol/inspector`
- For HTTP servers, include connection URL: `http://localhost:PORT/mcp`
- Include example tool invocations
- Add troubleshooting tips for common issues

## Additional Features to Consider
- LLM-powered tools using the multi-round `input_required` pattern (the v2 replacement for the deprecated sampling subsystem)
- User input elicitation for interactive workflows
- Dynamic tool registration with enable/disable capabilities
- Notification debouncing for bulk updates
- Resource links for efficient data references

Generate a complete, production-ready MCP server with comprehensive documentation, type safety, and error handling.
