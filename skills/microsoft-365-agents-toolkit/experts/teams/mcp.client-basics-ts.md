# mcp.client-basics-ts

## purpose

Consuming external MCP servers as AI tools using McpClientPlugin with ChatPrompt integration.

## rules

1. Create an `McpClientPlugin` instance and pass it as a ChatPrompt plugin in the second argument array: `new ChatPrompt({ ... }, [new McpClientPlugin({ logger })])`. The plugin registers itself under the name `'mcpClient'`. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
2. Connect to MCP servers using `.usePlugin('mcpClient', { url })` chained on the ChatPrompt. Each call adds one server connection. The URL must point to the server's MCP endpoint (e.g., `http://localhost:3978/mcp`). [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
3. Connect to multiple MCP servers by chaining multiple `.usePlugin('mcpClient', { url })` calls. Each server's tools are merged and made available to the LLM as callable functions. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
4. Set transport options via `params.transport`: `'sse'` (default) for Server-Sent Events or `'streamable-http'` for HTTP-based streaming. Match the transport to what the remote MCP server supports. [spec.modelcontextprotocol.io -- Transports](https://spec.modelcontextprotocol.io/specification/basic/transports/)
5. Use `params.refetchTimeoutMs` to control how often tools are re-fetched from the server. Set this when MCP servers may add or remove tools dynamically. Default behavior fetches tools once at connection. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
6. Pass custom headers for authentication via `params.headers`. For Azure Functions-hosted MCP servers, include `'x-functions-key'` with the function key. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
7. Install the required packages: `@microsoft/teams.mcpclient`, `@modelcontextprotocol/sdk`, plus `@microsoft/teams.ai` and `@microsoft/teams.openai` for the ChatPrompt and model. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
8. Tools from MCP servers are automatically available to the LLM during `prompt.send()`. The LLM sees them as callable functions alongside any locally defined `.function()` tools. No extra configuration is needed. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
9. MCP client connections are established lazily on the first `prompt.send()` call, not at construction time. Ensure the MCP servers are running before the bot processes its first message. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
10. Handle connection failures gracefully. If an MCP server is unreachable, the tool list for that server will be empty and the LLM will not be able to invoke those tools. Log connection errors for debugging. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)

## patterns

### Basic MCP client consuming one server

```typescript
import { App } from '@microsoft/teams.apps';
import { ChatPrompt } from '@microsoft/teams.ai';
import { OpenAIChatModel } from '@microsoft/teams.openai';
import { McpClientPlugin } from '@microsoft/teams.mcpclient';
import { ConsoleLogger } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';

const logger = new ConsoleLogger('mcp-client-bot', { level: 'debug' });

const model = new OpenAIChatModel({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
});

const prompt = new ChatPrompt(
  {
    model,
    instructions: 'You are a helpful assistant. Use available tools to answer questions.',
  },
  [new McpClientPlugin({ logger })], // Pass as ChatPrompt plugin
)
  // Connect to an MCP server -- tools are auto-discovered
  .usePlugin('mcpClient', {
    url: 'http://localhost:3978/mcp',
  });

const app = new App({
  logger,
  plugins: [new DevtoolsPlugin()],
});

// Tools from the MCP server are automatically available to the LLM
app.on('message', async ({ send, activity }) => {
  const result = await prompt.send(activity.text);
  if (result.content) {
    await send(result.content);
  }
});

app.start(4000);
```

### Multiple MCP servers with different transports

```typescript
import { App } from '@microsoft/teams.apps';
import { ChatPrompt } from '@microsoft/teams.ai';
import { OpenAIChatModel } from '@microsoft/teams.openai';
import { McpClientPlugin } from '@microsoft/teams.mcpclient';
import { ConsoleLogger } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';

const logger = new ConsoleLogger('multi-mcp-bot');

const model = new OpenAIChatModel({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
});

const prompt = new ChatPrompt(
  {
    model,
    instructions: 'Use the available tools to help the user. You have access to weather, tasks, and search tools.',
  },
  [new McpClientPlugin({ logger })],
)
  // Local MCP server (default SSE transport)
  .usePlugin('mcpClient', {
    url: 'http://localhost:3978/mcp',
  })
  // Remote Azure Functions MCP server with auth header
  .usePlugin('mcpClient', {
    url: 'https://my-mcp-server.azurewebsites.net/mcp/sse',
    params: {
      headers: { 'x-functions-key': process.env.FUNCTION_KEY! },
      transport: 'sse',
      refetchTimeoutMs: 60_000, // Re-fetch tools every 60 seconds
    },
  })
  // Another server using streamable-http transport
  .usePlugin('mcpClient', {
    url: 'https://search-mcp.example.com/mcp',
    params: {
      transport: 'streamable-http',
    },
  });

const app = new App({
  logger,
  plugins: [new DevtoolsPlugin()],
});

app.on('message', async ({ send, activity }) => {
  const result = await prompt.send(activity.text);
  if (result.content) {
    await send(result.content);
  }
});

app.start(4000);
```

### Combining MCP client with local functions

```typescript
import { App } from '@microsoft/teams.apps';
import { ChatPrompt } from '@microsoft/teams.ai';
import { OpenAIChatModel } from '@microsoft/teams.openai';
import { McpClientPlugin } from '@microsoft/teams.mcpclient';
import { ConsoleLogger } from '@microsoft/teams.common';

const logger = new ConsoleLogger('hybrid-bot');

const model = new OpenAIChatModel({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
});

const prompt = new ChatPrompt(
  {
    model,
    instructions: 'You are a helpful assistant with both local and remote tools.',
  },
  [new McpClientPlugin({ logger })],
)
  // Remote tools from MCP server
  .usePlugin('mcpClient', {
    url: 'http://localhost:3978/mcp',
  })
  // Local function defined directly on the prompt
  .function(
    'getTime',
    'Get the current date and time',
    () => new Date().toISOString()
  );

// The LLM sees both MCP tools and local functions
```

## pitfalls

- **Wrong `usePlugin` name**: The first argument must be the string `'mcpClient'` exactly. A typo silently fails to connect and no tools are discovered.
- **MCP server not running**: If the server at the specified URL is not running when `prompt.send()` is called, tools from that server are unavailable. The LLM will not know about them.
- **Missing `@modelcontextprotocol/sdk`**: The McpClientPlugin depends on the MCP SDK package. Forgetting to install it causes a runtime import error.
- **Transport mismatch**: Specifying `transport: 'streamable-http'` against a server that only supports SSE (or vice versa) causes connection failures. Verify the server's supported transport.
- **No error handling on `prompt.send()`**: If an MCP tool call fails server-side, the error propagates through `prompt.send()`. Wrap it in try/catch and inform the user.
- **Stale tool list**: Without `refetchTimeoutMs`, tools are fetched once. If a server adds new tools after the bot connects, the LLM will not see them. Set `refetchTimeoutMs` for dynamic tool discovery.
- **Passing McpClientPlugin to App instead of ChatPrompt**: `McpClientPlugin` is a ChatPrompt plugin (second argument to `new ChatPrompt()`), not an App plugin. Adding it to `new App({ plugins: [...] })` has no effect.

## references

- [Teams AI Library v2 -- GitHub](https://github.com/microsoft/teams.ts)
- [@microsoft/teams.mcpclient npm](https://www.npmjs.com/package/@microsoft/teams.mcpclient)
- [MCP Protocol Specification -- Transports](https://spec.modelcontextprotocol.io/specification/basic/transports/)
- [Model Context Protocol -- Introduction](https://modelcontextprotocol.io/introduction)

## instructions

This expert covers consuming external MCP servers from Teams bots using `McpClientPlugin` from `@microsoft/teams.mcpclient` in TypeScript. Use it when you need to:

- Create an `McpClientPlugin` and pass it as a ChatPrompt plugin
- Connect to one or more MCP servers via `.usePlugin('mcpClient', { url })`
- Configure transport options (`sse`, `streamable-http`), refresh intervals, and authentication headers
- Understand how MCP tools are automatically discovered and made available to the LLM
- Combine MCP remote tools with locally defined `.function()` tools

Pair with `mcp.server-basics-ts.md` to understand the server side, and `ai.chatprompt-basics-ts.md` for ChatPrompt fundamentals. Pair with `ai.chatprompt-basics-ts.md` for ChatPrompt constructor where McpClientPlugin is passed, and `mcp.security-ts.md` for authenticating to remote MCP servers.

## research

Deep Research prompt:

"Write a micro expert on consuming external MCP servers from a Teams bot using McpClientPlugin (TypeScript). Cover McpClientPlugin construction, ChatPrompt integration, .usePlugin('mcpClient', { url, params }) for connecting to servers, transport options (sse, streamable-http), refetchTimeoutMs, custom headers, multiple server connections, and error handling. Include 2-3 TypeScript code examples."
