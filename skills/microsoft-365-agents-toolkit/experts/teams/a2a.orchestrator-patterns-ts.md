# a2a.orchestrator-patterns-ts

## purpose

Multi-agent orchestration patterns: routing, delegation, custom behavior, and coordination between A2A agents.

## rules

1. The orchestrator pattern uses one primary bot with `A2AClientPlugin` that delegates to multiple specialized A2A agents. The orchestrator's instructions guide the LLM on when and how to delegate. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
2. Customize delegation behavior by passing options to the `A2AClientPlugin` constructor: `buildFunctionMetadata`, `buildMessageForAgent`, and `buildMessageFromAgentResponse`. These hooks control how agents appear as functions and how messages are formatted. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
3. Use `buildFunctionMetadata(card)` to customize how each agent appears to the LLM. Return `{ name, description }` to control the function name and description the LLM sees. This allows consistent naming conventions across agents. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
4. Use `buildMessageForAgent(card, input)` to transform the outgoing message before it reaches the remote agent. This lets you add context, reformat the request, or inject routing metadata. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
5. Use `buildMessageFromAgentResponse(card, response)` to transform the remote agent's response before returning it to the LLM. This lets you format, summarize, or annotate responses. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
6. Write explicit orchestrator instructions that list available agents by name and describe their capabilities. The LLM uses these instructions plus the agent function descriptions to decide delegation. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
7. Combine A2A agents with MCP tools in the same ChatPrompt. Use `A2AClientPlugin` for agent delegation and `McpClientPlugin` for tool invocation. The LLM sees both as callable functions. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
8. Prevent infinite delegation loops by designing clear skill boundaries between agents. An orchestrator should not delegate to an agent that delegates back to the orchestrator. Keep delegation unidirectional. [google.github.io/A2A -- Best practices](https://google.github.io/A2A/)
9. Add fallback handling in orchestrator instructions: if no agent matches the user's request, the orchestrator should answer directly or inform the user that the request cannot be handled. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
10. Test multi-agent flows end-to-end. Start all agent processes, verify agent card URLs are reachable, and test delegation with representative user queries for each agent's skill set. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)

## patterns

### Orchestrator with custom delegation behavior

```typescript
import { App } from '@microsoft/teams.apps';
import { ChatPrompt } from '@microsoft/teams.ai';
import { OpenAIChatModel } from '@microsoft/teams.openai';
import { A2AClientPlugin } from '@microsoft/teams.a2a';
import { ConsoleLogger } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';

const model = new OpenAIChatModel({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
});

const prompt = new ChatPrompt(
  {
    model,
    instructions: `You are the main office assistant. You coordinate with specialized agents:
- askWeatherAgent: handles weather and forecast questions
- askCalendarAgent: handles scheduling and calendar queries
- askITAgent: handles IT support, password resets, and tickets

Delegate to the appropriate agent based on the user's request.
If no agent matches, answer the question yourself.
Always present the agent's response clearly to the user.`,
  },
  [new A2AClientPlugin({
    // Customize how agent functions are named
    buildFunctionMetadata: (card) => ({
      name: `ask${card.name.replace(/\s+/g, '')}`,
      description: `Ask ${card.name}: ${card.description}`,
    }),
    // Customize outgoing messages to agents
    buildMessageForAgent: (card, input) => {
      return `[Request from orchestrator to ${card.name}]: ${input}`;
    },
    // Customize how agent responses are returned to the LLM
    buildMessageFromAgentResponse: (card, response) => {
      if (response.kind === 'message') {
        const text = response.parts
          .filter((p: any) => p.kind === 'text')
          .map((p: any) => p.text)
          .join(' ');
        return `${card.name} responded: ${text}`;
      }
      return `${card.name} sent a non-text response.`;
    },
  })],
)
  .usePlugin('a2a', {
    key: 'weather',
    cardUrl: 'http://weather-agent:4000/a2a/.well-known/agent-card.json',
  })
  .usePlugin('a2a', {
    key: 'calendar',
    cardUrl: 'http://calendar-agent:4001/a2a/.well-known/agent-card.json',
  })
  .usePlugin('a2a', {
    key: 'it-support',
    cardUrl: 'http://it-agent:4002/a2a/.well-known/agent-card.json',
  });

const app = new App({
  logger: new ConsoleLogger('orchestrator', { level: 'debug' }),
  plugins: [new DevtoolsPlugin()],
});

app.on('message', async ({ send, stream, activity }) => {
  await send({ type: 'typing' });
  try {
    const result = await prompt.send(activity.text);
    if (result.content) {
      await send(result.content);
    }
  } catch (err: any) {
    await send('Sorry, one of my specialized agents is unavailable. Please try again later.');
  }
});

app.start(3978);
```

### Combining A2A agents with MCP tools

```typescript
import { App } from '@microsoft/teams.apps';
import { ChatPrompt } from '@microsoft/teams.ai';
import { OpenAIChatModel } from '@microsoft/teams.openai';
import { A2AClientPlugin } from '@microsoft/teams.a2a';
import { McpClientPlugin } from '@microsoft/teams.mcpclient';
import { ConsoleLogger } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';

const logger = new ConsoleLogger('hybrid-orchestrator');

const model = new OpenAIChatModel({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
});

const prompt = new ChatPrompt(
  {
    model,
    instructions: `You are a powerful assistant with access to:
- Remote agents for complex tasks (weather, IT support)
- MCP tools for data lookup (search, documents)
- Local functions for simple operations (time, math)

Choose the best tool or agent for each request.`,
  },
  [
    new A2AClientPlugin(),
    new McpClientPlugin({ logger }),
  ],
)
  // A2A agents for complex, conversational tasks
  .usePlugin('a2a', {
    key: 'weather',
    cardUrl: 'http://weather-agent:4000/a2a/.well-known/agent-card.json',
  })
  .usePlugin('a2a', {
    key: 'it-support',
    cardUrl: 'http://it-agent:4002/a2a/.well-known/agent-card.json',
  })
  // MCP tools for data access
  .usePlugin('mcpClient', {
    url: 'http://localhost:5000/mcp',
  })
  // Local function
  .function('getTime', 'Get the current date and time', () => {
    return new Date().toISOString();
  });

const app = new App({
  logger,
  plugins: [new DevtoolsPlugin()],
});

app.on('message', async ({ send, activity }) => {
  await send({ type: 'typing' });
  const result = await prompt.send(activity.text);
  if (result.content) {
    await send(result.content);
  }
});

app.start(3978);
```

### Orchestrator that is also an A2A server

```typescript
import { App } from '@microsoft/teams.apps';
import { ChatPrompt } from '@microsoft/teams.ai';
import { OpenAIChatModel } from '@microsoft/teams.openai';
import { A2APlugin, A2AClientPlugin } from '@microsoft/teams.a2a';
import { ConsoleLogger } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';

const model = new OpenAIChatModel({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
});

// This bot is both an A2A server AND an A2A client
// It can be called by other agents AND delegate to downstream agents

const prompt = new ChatPrompt(
  {
    model,
    instructions: `You are a coordinator agent. You handle general queries and delegate specialized tasks to sub-agents.`,
  },
  [new A2AClientPlugin()],
)
  .usePlugin('a2a', {
    key: 'weather',
    cardUrl: 'http://weather-agent:4000/a2a/.well-known/agent-card.json',
  });

// Agent card so other agents can call this orchestrator
const agentCard = {
  name: 'Coordinator Agent',
  description: 'A coordinator that routes requests to specialized agents',
  url: 'http://localhost:3978/a2a',
  version: '1.0.0',
  protocolVersion: '0.3.0',
  capabilities: {},
  skills: [
    {
      id: 'coordinate',
      name: 'Coordinate Request',
      description: 'Route a request to the best available specialist agent',
      tags: ['coordination', 'routing'],
      examples: ['What is the weather in Paris?', 'Help me with a general question'],
    },
  ],
};

const app = new App({
  logger: new ConsoleLogger('coordinator'),
  plugins: [
    new DevtoolsPlugin(),
    new A2APlugin({ agentCard }), // Server: accept A2A messages
  ],
});

// Handle A2A messages from other agents
app.event('a2a:message', async ({ respond, requestContext }) => {
  const textInput = requestContext.userMessage.parts
    .filter((p: any) => p.kind === 'text')
    .at(0)?.text;

  if (!textInput) {
    await respond('Please send a text message.');
    return;
  }

  const result = await prompt.send(textInput);
  await respond(result.content || 'Unable to process request.');
});

// Handle direct Teams messages
app.on('message', async ({ send, activity }) => {
  const result = await prompt.send(activity.text);
  if (result.content) await send(result.content);
});

app.start(3978);
```

## pitfalls

- **Infinite delegation loops**: Agent A delegates to Agent B which delegates back to Agent A. Design clear, unidirectional delegation hierarchies. Do not connect an orchestrator to an agent that connects back to the orchestrator.
- **Inconsistent function naming**: Without `buildFunctionMetadata`, agent function names are auto-generated from the agent card. This can produce confusing names for the LLM. Use the hook to standardize naming.
- **Overloading the orchestrator prompt**: Too many agents with overlapping skill descriptions confuse the LLM about where to delegate. Keep agent responsibilities distinct and non-overlapping.
- **Not handling partial failures**: In a multi-agent system, one agent may be down while others are available. The orchestrator should gracefully handle individual agent failures without crashing the entire flow.
- **Missing fallback behavior**: If no agent matches the user's request, the orchestrator needs instructions to answer directly. Without fallback instructions, the LLM may force a bad delegation.
- **Forgetting A2AClientPlugin is a ChatPrompt plugin**: It must be passed to `new ChatPrompt()`, not to `new App()`. This is a common mistake when combining A2A with App-level plugins like `A2APlugin`.
- **Stale agent cards**: If a downstream agent changes its skills, the orchestrator will not see the updates until it is restarted. Plan for periodic restarts or manual refresh in dynamic environments.

## references

- [A2A Protocol Specification](https://google.github.io/A2A/)
- [Teams AI Library v2 -- GitHub](https://github.com/microsoft/teams.ts)
- [@microsoft/teams.a2a npm](https://www.npmjs.com/package/@microsoft/teams.a2a)
- [Model Context Protocol -- Introduction](https://modelcontextprotocol.io/introduction)

## instructions

This expert covers multi-agent orchestration patterns for Teams bots using A2A and MCP in the Teams AI Library v2 (`@microsoft/teams.ts`). Use it when you need to:

- Build an orchestrator bot that delegates to multiple specialized A2A agents
- Customize delegation behavior with `buildFunctionMetadata`, `buildMessageForAgent`, and `buildMessageFromAgentResponse`
- Combine A2A agents with MCP tools and local functions in a single ChatPrompt
- Build a bot that is both an A2A server and client (bidirectional agent)
- Design delegation hierarchies that avoid infinite loops
- Handle partial failures in multi-agent systems

Pair with `a2a.client-basics-ts.md` for basic client setup, `a2a.server-basics-ts.md` for building the agents being called, and `mcp.client-basics-ts.md` for combining MCP tools. Pair with `a2a.server-basics-ts.md` and `a2a.client-basics-ts.md` for foundational A2A setup, and `mcp.client-basics-ts.md` when combining A2A with MCP tool consumption.

## research

Deep Research prompt:

"Write a micro expert on multi-agent orchestration patterns for Teams bots (TypeScript). Cover orchestrator design with A2AClientPlugin custom behavior (buildFunctionMetadata, buildMessageForAgent, buildMessageFromAgentResponse), combining A2A with MCP, building a bot that is both A2A server and client, delegation hierarchy design, preventing infinite loops, partial failure handling, and naming conventions. Include 2-3 TypeScript code examples."
