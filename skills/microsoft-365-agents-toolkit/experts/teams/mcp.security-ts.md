# mcp.security-ts

## purpose

Security considerations for MCP server/client: authentication, authorization, input validation, and endpoint hardening.

## rules

1. Always check the `authInfo` parameter in tool handlers for tools that modify state or access sensitive data. The `authInfo` object contains caller identity information provided by the MCP transport layer. Reject requests where `authInfo` is missing or invalid. [spec.modelcontextprotocol.io -- Security](https://spec.modelcontextprotocol.io/specification/basic/security/)
2. Validate all tool inputs using zod schemas. The `.tool()` API validates parameters before the handler runs, but add additional business-logic validation (e.g., string length limits, allowed values, format checks) inside the handler. [zod.dev](https://zod.dev/)
3. Apply the principle of least privilege to tool permissions. Only expose tools that external callers genuinely need. Internal-only functions should remain on the ChatPrompt without being bridged to MCP via `mcpPlugin.use(prompt)`. [spec.modelcontextprotocol.io -- Security considerations](https://spec.modelcontextprotocol.io/specification/basic/security/)
4. Require HTTPS for production MCP endpoints. SSE and streamable-http transports transmit tool calls and responses in cleartext over HTTP. Use TLS termination (Azure App Service, reverse proxy, or load balancer) to encrypt traffic. [spec.modelcontextprotocol.io -- Transports](https://spec.modelcontextprotocol.io/specification/basic/transports/)
5. For Azure Functions-hosted MCP servers, require a function key via the `x-functions-key` header. MCP clients pass this in `params.headers`. Without it, the endpoint is publicly accessible. [learn.microsoft.com -- Azure Functions auth](https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook-trigger#authorization-keys)
6. Rate-limit MCP tool invocations to prevent abuse. Track call counts per caller (using `authInfo`) and return an error response when limits are exceeded. The MCP protocol does not enforce rate limits; you must implement them. [spec.modelcontextprotocol.io -- Security](https://spec.modelcontextprotocol.io/specification/basic/security/)
7. Sanitize tool output before returning it. If tool results include user-generated content or database values, escape or validate them to prevent injection attacks in downstream consumers. [spec.modelcontextprotocol.io -- Security](https://spec.modelcontextprotocol.io/specification/basic/security/)
8. Log all tool invocations with caller identity, tool name, parameters (redacting secrets), and result status. Audit logs are critical for detecting misuse and debugging authorization failures. [spec.modelcontextprotocol.io -- Security](https://spec.modelcontextprotocol.io/specification/basic/security/)
9. Do not embed secrets (API keys, connection strings) in tool schemas or descriptions. These are exposed to MCP clients during tool discovery. Keep secrets in environment variables and access them only inside handler implementations. [spec.modelcontextprotocol.io -- Security](https://spec.modelcontextprotocol.io/specification/basic/security/)
10. When consuming external MCP servers as a client, validate the server's TLS certificate and pin to known server URLs. Do not connect to arbitrary MCP server URLs provided by untrusted input. [spec.modelcontextprotocol.io -- Security](https://spec.modelcontextprotocol.io/specification/basic/security/)

## patterns

### Tool handler with authInfo validation

```typescript
import { McpPlugin } from '@microsoft/teams.mcp';
import { z } from 'zod';

const ALLOWED_CALLERS = new Set([
  'trusted-client-id-1',
  'trusted-client-id-2',
]);

const mcpPlugin = new McpPlugin({
  name: 'secure-server',
  description: 'Server with auth-gated tools',
})
  .tool(
    'deleteUser',
    'Delete a user account (admin only)',
    {
      userId: z.string().min(1).describe('User ID to delete'),
    },
    async ({ userId }, { authInfo }) => {
      // Reject unauthenticated callers
      if (!authInfo) {
        return {
          content: [{ type: 'text', text: 'Error: Authentication required' }],
        };
      }

      // Validate caller is in the allowlist
      if (!ALLOWED_CALLERS.has(authInfo.clientId)) {
        return {
          content: [{ type: 'text', text: `Error: Caller ${authInfo.clientId} not authorized` }],
        };
      }

      // Perform the deletion
      // await userService.delete(userId);
      return {
        content: [{ type: 'text', text: `User ${userId} deleted successfully` }],
      };
    }
  );
```

### Input validation beyond zod schema

```typescript
import { McpPlugin } from '@microsoft/teams.mcp';
import { z } from 'zod';

const mcpPlugin = new McpPlugin({
  name: 'validated-server',
  description: 'Server with strict input validation',
})
  .tool(
    'sendEmail',
    'Send an email notification',
    {
      to: z.string().email().describe('Recipient email address'),
      subject: z.string().max(200).describe('Email subject (max 200 chars)'),
      body: z.string().max(5000).describe('Email body (max 5000 chars)'),
    },
    { idempotentHint: false },
    async ({ to, subject, body }, { authInfo }) => {
      // Additional business-logic validation
      if (!authInfo) {
        return {
          content: [{ type: 'text', text: 'Error: Authentication required' }],
        };
      }

      // Block external email addresses if policy requires it
      if (!to.endsWith('@company.com')) {
        return {
          content: [{ type: 'text', text: 'Error: Can only send to @company.com addresses' }],
        };
      }

      // Sanitize body content (strip HTML/scripts)
      const sanitizedBody = body.replace(/<[^>]*>/g, '');

      // Send email via your service
      // await emailService.send({ to, subject, body: sanitizedBody });
      return {
        content: [{ type: 'text', text: `Email sent to ${to}` }],
      };
    }
  );
```

### Secure MCP client with auth headers

```typescript
import { ChatPrompt } from '@microsoft/teams.ai';
import { OpenAIChatModel } from '@microsoft/teams.openai';
import { McpClientPlugin } from '@microsoft/teams.mcpclient';
import { ConsoleLogger } from '@microsoft/teams.common';

const logger = new ConsoleLogger('secure-client');

const model = new OpenAIChatModel({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
});

const prompt = new ChatPrompt(
  { model, instructions: 'Use tools to help the user.' },
  [new McpClientPlugin({ logger })],
)
  // Connect to secure Azure Functions MCP server
  .usePlugin('mcpClient', {
    url: 'https://my-mcp-server.azurewebsites.net/mcp/sse',
    params: {
      headers: {
        'x-functions-key': process.env.FUNCTION_KEY!,
        'Authorization': `Bearer ${process.env.MCP_API_TOKEN}`,
      },
      transport: 'sse',
    },
  });

// Only connect to known, trusted server URLs
// NEVER construct MCP server URLs from user input
```

## pitfalls

- **No `authInfo` check on mutating tools**: Tools that create, update, or delete data without checking `authInfo` are callable by any MCP client. Always validate the caller for side-effecting tools.
- **Relying only on zod for validation**: Zod validates data types and shapes but not business rules. A valid string can still contain malicious content, a valid email can be an external address, and a valid number can be out of business range.
- **Exposing all prompt functions via `.use(prompt)`**: This makes every ChatPrompt function externally callable. Review functions for sensitivity before bridging. Keep internal-only tools off the MCP surface.
- **HTTP in production**: Running MCP over unencrypted HTTP in production exposes tool calls, parameters, and responses to network sniffing. Always use HTTPS with proper TLS certificates.
- **Hardcoded secrets in tool schemas**: Tool parameter descriptions and names are sent to clients during discovery. Never include API keys, connection strings, or internal URLs in schema metadata.
- **No rate limiting**: Without rate limits, a malicious or buggy MCP client can invoke expensive tools thousands of times. Implement per-caller rate limiting in your tool handlers.
- **Connecting to untrusted MCP servers**: An MCP client that connects to user-supplied server URLs risks executing malicious tool definitions. Only connect to server URLs from your configuration, never from user input.
- **Missing audit logging**: Without logs of tool invocations, you cannot detect misuse, investigate incidents, or comply with security audits. Log every tool call with caller, tool name, and outcome.

## references

- [MCP Protocol Specification -- Security Considerations](https://spec.modelcontextprotocol.io/specification/basic/security/)
- [MCP Protocol Specification -- Transports](https://spec.modelcontextprotocol.io/specification/basic/transports/)
- [Azure Functions HTTP authorization keys](https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook-trigger#authorization-keys)
- [Zod documentation](https://zod.dev/)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [Teams AI Library v2 -- GitHub](https://github.com/microsoft/teams.ts)

## instructions

This expert covers security hardening for MCP servers and clients in Teams bots built with the Teams AI Library v2 (`@microsoft/teams.ts`). Use it when you need to:

- Validate caller identity using `authInfo` in MCP tool handlers
- Implement authorization allowlists for sensitive tools
- Add input validation beyond zod schema validation (business rules, sanitization)
- Secure MCP endpoints with HTTPS and function keys
- Configure authenticated MCP client connections with custom headers
- Apply the principle of least privilege to tool exposure
- Implement rate limiting and audit logging for tool invocations

Pair with `mcp.server-basics-ts.md` for tool definition patterns and `mcp.client-basics-ts.md` for client connection setup. Pair with `mcp.server-basics-ts.md` for McpPlugin tool definitions, and `../security/input-validation-ts.md` for general input validation patterns.

## research

Deep Research prompt:

"Write a micro expert on MCP security for Teams bot tool exposure and consumption (TypeScript). Cover authInfo validation in tool handlers, authorization allowlists, zod schema validation plus business-logic validation, HTTPS requirements, Azure Functions key headers, rate limiting, audit logging, principle of least privilege for tool exposure, and securing client connections. Include 2-3 TypeScript code examples."
