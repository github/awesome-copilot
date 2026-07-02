# mcp.server-basics-ts

## purpose

Exposing bot capabilities as MCP tools using McpPlugin with zod schemas, tool hints, and SSE transport.

## rules

1. Create an `McpPlugin` with `new McpPlugin({ name, description })`. The `name` is used as the MCP server identifier and the `description` appears in tool discovery responses. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
2. Define tools using the fluent `.tool(name, description, schema, hints, handler)` chain API. The schema uses zod objects where each key becomes a tool parameter. All parameters are validated before the handler runs. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
3. Set tool hints to communicate tool behavior to clients: `readOnlyHint: true` signals no side effects, `idempotentHint: true` signals safe retries. Omitting hints defaults to assuming the tool may have side effects. [spec.modelcontextprotocol.io -- Tool annotations](https://spec.modelcontextprotocol.io/specification/server/tools/#annotations)
4. Tool handlers must return `{ content: [{ type: 'text', text: string }] }` format. The `content` array can contain multiple content items. Always return at least one content item. [spec.modelcontextprotocol.io -- Tool results](https://spec.modelcontextprotocol.io/specification/server/tools/)
5. Access caller identity via the `authInfo` parameter in tool handlers: `async (params, { authInfo }) => { ... }`. Use this to verify who is calling the tool and enforce authorization. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
6. Add the `McpPlugin` instance to the `App` constructor's `plugins` array. The plugin registers the `/mcp` HTTP endpoint automatically during app initialization. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
7. The MCP server endpoint is available at `http://localhost:{PORT}/mcp` using SSE transport by default. Clients connect to this URL to discover and invoke tools. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
8. Use descriptive tool names and parameter descriptions. MCP clients (including LLMs) rely on names and descriptions to decide when and how to invoke tools. Vague names lead to misuse. [spec.modelcontextprotocol.io -- Tool naming](https://spec.modelcontextprotocol.io/specification/server/tools/)
9. Install the required packages: `@microsoft/teams.mcp`, `@modelcontextprotocol/sdk`, and `zod`. All three are needed -- the plugin depends on the SDK and uses zod for schema validation. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
10. Tools are stateless by default. If a tool needs access to bot state or external services, close over them in the handler or pass the `App` instance. Do not store mutable state inside tool definitions. [spec.modelcontextprotocol.io -- Server design](https://spec.modelcontextprotocol.io/specification/server/)

## patterns

### Basic MCP server with two tools

```typescript
import { App } from '@microsoft/teams.apps';
import { McpPlugin } from '@microsoft/teams.mcp';
import { ConsoleLogger } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';
import { z } from 'zod';

const mcpPlugin = new McpPlugin({
  name: 'my-mcp-server',
  description: 'Exposes greeting and echo tools',
})
  .tool(
    'greet',
    'Greet a user by name',
    { name: z.string().describe('Name to greet') },
    { readOnlyHint: true, idempotentHint: true },
    async ({ name }) => ({
      content: [{ type: 'text', text: `Hello, ${name}!` }],
    })
  )
  .tool(
    'echo',
    'Echoes back the input text',
    { input: z.string().describe('The text to echo') },
    { readOnlyHint: true, idempotentHint: true },
    async ({ input }) => ({
      content: [{ type: 'text', text: `You said: "${input}"` }],
    })
  );

const app = new App({
  logger: new ConsoleLogger('mcp-bot', { level: 'debug' }),
  plugins: [new DevtoolsPlugin(), mcpPlugin],
});

app.on('message', async ({ reply, activity }) => {
  await reply(`Echo: ${activity.text}`);
});

app.start(3978);
// MCP endpoint: http://localhost:3978/mcp
```

### Tool with authInfo and side effects

```typescript
import { App } from '@microsoft/teams.apps';
import { McpPlugin } from '@microsoft/teams.mcp';
import { DevtoolsPlugin } from '@microsoft/teams.dev';
import { z } from 'zod';

// Shared state the tool will modify
const userConversationMap = new Map<string, string>();

const mcpPlugin = new McpPlugin({
  name: 'notification-server',
  description: 'Send notifications to Teams users',
})
  .tool(
    'notifyUser',
    'Send a notification to a user',
    {
      message: z.string().describe('Notification text'),
      userId: z.string().describe('User AAD Object ID'),
    },
    // No readOnlyHint -- this tool has side effects
    async ({ message, userId }, { authInfo }) => {
      // Validate caller identity
      if (!authInfo) {
        return {
          content: [{ type: 'text', text: 'Unauthorized: no auth info' }],
        };
      }

      const convId = userConversationMap.get(userId);
      if (!convId) {
        return {
          content: [{ type: 'text', text: `No conversation found for user ${userId}` }],
        };
      }

      await app.send(convId, `Notification: ${message}`);
      return {
        content: [{ type: 'text', text: 'User notified successfully' }],
      };
    }
  );

const app = new App({
  plugins: [new DevtoolsPlugin(), mcpPlugin],
});

// Track conversations for proactive messaging
app.on('install.add', async ({ activity }) => {
  userConversationMap.set(
    activity.from.aadObjectId!,
    activity.conversation.id
  );
});

app.start(3978);
```

### Multiple tool schemas with complex parameters

```typescript
import { McpPlugin } from '@microsoft/teams.mcp';
import { z } from 'zod';

const mcpPlugin = new McpPlugin({
  name: 'task-manager',
  description: 'Manage tasks and assignments',
})
  .tool(
    'createTask',
    'Create a new task with title, description, and optional assignee',
    {
      title: z.string().describe('Task title'),
      description: z.string().describe('Task description'),
      assignee: z.string().optional().describe('User ID to assign the task to'),
      priority: z.enum(['low', 'medium', 'high']).describe('Task priority level'),
      dueDate: z.string().optional().describe('Due date in ISO 8601 format'),
    },
    async ({ title, description, assignee, priority, dueDate }) => {
      // Create task in your backend
      const taskId = `task-${Date.now()}`;
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ taskId, title, priority, assignee, dueDate }),
        }],
      };
    }
  )
  .tool(
    'listTasks',
    'List all tasks, optionally filtered by status',
    {
      status: z.enum(['open', 'in-progress', 'done']).optional().describe('Filter by status'),
    },
    { readOnlyHint: true },
    async ({ status }) => {
      // Query your backend
      const tasks = [{ id: 'task-1', title: 'Example', status: 'open' }];
      return {
        content: [{ type: 'text', text: JSON.stringify(tasks) }],
      };
    }
  );
```

## pitfalls

- **Missing zod import**: The `.tool()` schema requires `z` from `zod`. Forgetting to install or import `zod` produces a runtime error.
- **Wrong return shape**: Tool handlers must return `{ content: [{ type: 'text', text: '...' }] }`. Returning a plain string or object causes the MCP client to reject the response.
- **Forgetting to add McpPlugin to plugins array**: Creating the plugin and defining tools without adding it to `new App({ plugins: [...] })` means the `/mcp` endpoint is never registered.
- **Not installing all three packages**: `@microsoft/teams.mcp`, `@modelcontextprotocol/sdk`, and `zod` are all required. Missing any one produces import or runtime errors.
- **Exposing dangerous tools without auth checks**: Tools that modify data or send messages should check `authInfo` to verify the caller. Without validation, any MCP client can invoke destructive operations.
- **Tool name collisions**: If you combine `mcpPlugin.use(prompt)` with direct `.tool()` definitions, ensure tool names are unique. Duplicate names cause undefined behavior.
- **Overly broad tool descriptions**: Vague descriptions cause LLM clients to invoke tools incorrectly. Be specific about what the tool does, what it returns, and when to use it.

## references

- [MCP Protocol Specification -- Tools](https://spec.modelcontextprotocol.io/specification/server/tools/)
- [Teams AI Library v2 -- GitHub](https://github.com/microsoft/teams.ts)
- [@microsoft/teams.mcp npm](https://www.npmjs.com/package/@microsoft/teams.mcp)
- [Model Context Protocol -- Introduction](https://modelcontextprotocol.io/introduction)
- [Zod documentation](https://zod.dev/)

## instructions

This expert covers building MCP servers in Teams bots using the `McpPlugin` from `@microsoft/teams.mcp` in TypeScript. Use it when you need to:

- Create an `McpPlugin` with name and description
- Define tools using the `.tool()` chain API with zod schemas
- Set tool hints (`readOnlyHint`, `idempotentHint`) to communicate behavior
- Access `authInfo` in tool handlers for caller validation
- Add the plugin to the App's `plugins` array
- Understand the MCP endpoint URL and SSE transport

Pair with `mcp.expose-chatprompt-tools-ts.md` for bridging existing ChatPrompt functions to MCP tools, and `mcp.security-ts.md` for hardening MCP endpoints. Pair with `mcp.security-ts.md` for securing MCP endpoints, `mcp.expose-chatprompt-tools-ts.md` for bridging ChatPrompt functions to MCP tools, and `runtime.app-init-ts.md` for adding McpPlugin to the App.

## research

Deep Research prompt:

"Write a micro expert on building an MCP server in a Teams bot using @microsoft/teams.mcp (TypeScript). Cover McpPlugin constructor, defining tools with zod schemas and the .tool() chain API, tool hints (readOnlyHint, idempotentHint), authInfo in handlers, adding to App plugins, the /mcp SSE endpoint, and common pitfalls. Include 2-3 canonical TypeScript code examples."
