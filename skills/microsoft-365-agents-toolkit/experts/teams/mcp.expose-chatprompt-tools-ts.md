# mcp.expose-chatprompt-tools-ts

## purpose

Bridging ChatPrompt functions to MCP tools via mcpPlugin.use(prompt) for external discoverability.

## rules

1. Call `mcpPlugin.use(prompt)` to expose all functions defined on a `ChatPrompt` instance as MCP tools. Each `.function()` on the prompt becomes a discoverable, callable MCP tool. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
2. The `mcpPlugin.use(prompt)` call must happen after all `.function()` definitions on the prompt. Functions added after `.use()` are not automatically exposed. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
3. Function names on the ChatPrompt become MCP tool names. Function descriptions become MCP tool descriptions. JSON Schema parameter definitions are translated to the MCP tool schema. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
4. You can combine `mcpPlugin.use(prompt)` with direct `.tool()` definitions on the same McpPlugin. Both sets of tools are exposed at the `/mcp` endpoint. Ensure names are unique across both. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
5. Use `mcpPlugin.use(prompt)` when you want external systems to call the same tools your LLM uses internally. Use direct `.tool()` when you need MCP-specific features like `authInfo` or custom return formats that differ from function calling. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
6. Functions exposed via `.use(prompt)` do not have MCP tool hints (`readOnlyHint`, `idempotentHint`). If you need hints, define the tool directly with `.tool()` instead of relying on the bridge. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
7. The prompt's function handler receives only the typed parameters object, not the MCP `authInfo` context. If you need caller validation, define the tool directly with `.tool()` which provides `authInfo`. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
8. Install the same packages required for both MCP server and AI: `@microsoft/teams.mcp`, `@modelcontextprotocol/sdk`, `zod`, `@microsoft/teams.ai`, and `@microsoft/teams.openai`. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)

## patterns

### Exposing all ChatPrompt functions as MCP tools

```typescript
import { App } from '@microsoft/teams.apps';
import { ChatPrompt } from '@microsoft/teams.ai';
import { OpenAIChatModel } from '@microsoft/teams.openai';
import { McpPlugin } from '@microsoft/teams.mcp';
import { ConsoleLogger } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';

const model = new OpenAIChatModel({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
});

const prompt = new ChatPrompt({
  model,
  instructions: 'You are a helpful assistant with weather and time tools.',
})
  .function('getTime', 'Get the current date and time', () => {
    return new Date().toISOString();
  })
  .function(
    'getWeather',
    'Get weather for a location',
    {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City name' },
      },
      required: ['city'],
    },
    async ({ city }: { city: string }) => {
      // Simulated weather lookup
      return { city, temperature: '72F', condition: 'sunny' };
    }
  );

const mcpPlugin = new McpPlugin({
  name: 'weather-mcp',
  description: 'Weather and time tools',
});

// Bridge: expose all prompt functions as MCP tools
mcpPlugin.use(prompt);

const app = new App({
  logger: new ConsoleLogger('bridge-bot'),
  plugins: [new DevtoolsPlugin(), mcpPlugin],
});

app.on('message', async ({ send, activity }) => {
  const result = await prompt.send(activity.text);
  if (result.content) await send(result.content);
});

app.start(3978);
// MCP tools "getTime" and "getWeather" available at http://localhost:3978/mcp
```

### Combining bridged functions with direct MCP tools

```typescript
import { App } from '@microsoft/teams.apps';
import { ChatPrompt } from '@microsoft/teams.ai';
import { OpenAIChatModel } from '@microsoft/teams.openai';
import { McpPlugin } from '@microsoft/teams.mcp';
import { DevtoolsPlugin } from '@microsoft/teams.dev';
import { z } from 'zod';

const model = new OpenAIChatModel({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
});

// Functions used by the LLM internally
const prompt = new ChatPrompt({
  model,
  instructions: 'You are a helpful assistant.',
})
  .function('searchDocs', 'Search documentation', {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
    },
    required: ['query'],
  }, async ({ query }: { query: string }) => {
    return [{ title: 'Getting Started', snippet: 'How to set up...' }];
  });

const mcpPlugin = new McpPlugin({
  name: 'hybrid-server',
  description: 'Documentation search and admin tools',
});

// Expose LLM functions as MCP tools (searchDocs)
mcpPlugin.use(prompt);

// Add MCP-only tools with authInfo and hints
mcpPlugin.tool(
  'adminReset',
  'Reset a user session (admin only)',
  {
    userId: z.string().describe('User ID to reset'),
  },
  // No readOnlyHint -- this is a mutating operation
  async ({ userId }, { authInfo }) => {
    if (!authInfo) {
      return { content: [{ type: 'text', text: 'Unauthorized' }] };
    }
    // Perform reset...
    return {
      content: [{ type: 'text', text: `Session reset for ${userId}` }],
    };
  }
);

const app = new App({
  plugins: [new DevtoolsPlugin(), mcpPlugin],
});

app.start(3978);
// MCP exposes both "searchDocs" (from prompt) and "adminReset" (direct)
```

### When to use .use(prompt) vs direct .tool()

```typescript
import { ChatPrompt } from '@microsoft/teams.ai';
import { McpPlugin } from '@microsoft/teams.mcp';
import { z } from 'zod';

// Use mcpPlugin.use(prompt) when:
// - You want external MCP clients to call the same functions your LLM uses
// - The functions are stateless and do not need caller identity
// - You want to avoid duplicating function definitions

// Use direct .tool() when:
// - You need authInfo to validate the caller
// - You need tool hints (readOnlyHint, idempotentHint)
// - The tool is MCP-only and should NOT be available to the LLM
// - The return format differs from function calling (MCP content array)

const prompt = new ChatPrompt({ model: myModel, instructions: '...' })
  .function('safeRead', 'Read data (no auth needed)', async () => 'data');

const mcpPlugin = new McpPlugin({ name: 'example', description: 'Example' });

// Bridge safe functions
mcpPlugin.use(prompt);

// Define sensitive tools directly with auth
mcpPlugin.tool(
  'deleteRecord',
  'Delete a record (requires auth)',
  { recordId: z.string().describe('Record ID') },
  async ({ recordId }, { authInfo }) => {
    if (!authInfo) {
      return { content: [{ type: 'text', text: 'Unauthorized' }] };
    }
    return { content: [{ type: 'text', text: `Deleted ${recordId}` }] };
  }
);
```

## pitfalls

- **Calling `.use(prompt)` before defining functions**: Functions added to the prompt after `mcpPlugin.use(prompt)` may not be exposed. Define all `.function()` calls first, then call `.use()`.
- **Tool name collisions**: If a prompt function has the same name as a direct `.tool()` definition, behavior is undefined. Ensure unique names across both sources.
- **Expecting `authInfo` in bridged functions**: Functions exposed via `.use(prompt)` do not receive MCP's `authInfo`. If you need caller validation, define the tool directly with `.tool()`.
- **Missing tool hints on bridged functions**: The `.use(prompt)` bridge does not set `readOnlyHint` or `idempotentHint`. MCP clients will assume the default (potential side effects). Use direct `.tool()` for hinted tools.
- **Exposing dangerous functions**: Every function on the prompt becomes externally callable via MCP. Review all prompt functions before calling `.use()` to ensure none should be internal-only.
- **Forgetting to add McpPlugin to App**: Even with `.use(prompt)` configured, the MCP endpoint is not registered unless the plugin is in the App's `plugins` array.

## references

- [Teams AI Library v2 -- GitHub](https://github.com/microsoft/teams.ts)
- [@microsoft/teams.mcp npm](https://www.npmjs.com/package/@microsoft/teams.mcp)
- [MCP Protocol Specification -- Tools](https://spec.modelcontextprotocol.io/specification/server/tools/)
- [Model Context Protocol -- Introduction](https://modelcontextprotocol.io/introduction)

## instructions

This expert covers bridging ChatPrompt function-calling tools to MCP tools using `mcpPlugin.use(prompt)` in the Teams AI Library v2 (`@microsoft/teams.ts`). Use it when you need to:

- Expose existing ChatPrompt `.function()` definitions as externally discoverable MCP tools
- Understand when to use `mcpPlugin.use(prompt)` vs defining tools directly with `.tool()`
- Combine bridged prompt functions with direct MCP tool definitions on the same plugin
- Understand the limitations of the bridge (no authInfo, no tool hints)

Pair with `mcp.server-basics-ts.md` for direct tool definition patterns and `mcp.security-ts.md` for securing exposed tools. Pair with `mcp.server-basics-ts.md` for McpPlugin setup, and `ai.function-calling-implementation-ts.md` for the ChatPrompt functions being bridged.

## research

Deep Research prompt:

"Write a micro expert on bridging ChatPrompt functions to MCP tools via mcpPlugin.use(prompt) in Teams SDK v2 (TypeScript). Cover how the bridge works, what gets translated (names, descriptions, schemas), limitations (no authInfo, no hints), when to use .use(prompt) vs direct .tool(), combining both approaches, and security considerations. Include 2-3 TypeScript code examples."
