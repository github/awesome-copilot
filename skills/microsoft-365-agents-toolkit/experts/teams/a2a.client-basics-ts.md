# a2a.client-basics-ts

## purpose

Calling remote A2A agents from a Teams bot using A2AClientPlugin as a ChatPrompt plugin with automatic delegation.

## rules

1. Create an `A2AClientPlugin` instance and pass it as a ChatPrompt plugin in the second argument array: `new ChatPrompt({ ... }, [new A2AClientPlugin()])`. The plugin registers itself under the name `'a2a'`. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
2. Connect to remote A2A agents using `.usePlugin('a2a', { key, cardUrl })` chained on the ChatPrompt. The `key` is a unique identifier for the agent and `cardUrl` is the URL to its agent card JSON. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
3. Connect to multiple agents by chaining multiple `.usePlugin('a2a', { key, cardUrl })` calls. Each agent's skills are registered as callable functions, and the LLM decides which agent to delegate to based on skill descriptions. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
4. The `key` parameter must be unique across all connected agents. It is used internally to identify the agent when the LLM invokes delegation functions. Use short, descriptive keys (e.g., `'weather'`, `'calendar'`). [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
5. The `cardUrl` must point to the agent's well-known agent card endpoint (e.g., `http://localhost:4000/a2a/.well-known/agent-card.json`). The plugin fetches the card at connection time to read the agent's skills and capabilities. [google.github.io/A2A -- Discovery](https://google.github.io/A2A/)
6. The LLM automatically delegates to connected agents as if they were function calls. No explicit delegation code is needed -- the agent's skills appear as functions the LLM can invoke during `prompt.send()`. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
7. Install `@microsoft/teams.a2a` as a dependency. The A2A client and server plugins are both in this package. Also install `@microsoft/teams.ai` and `@microsoft/teams.openai` for the ChatPrompt and model. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
8. A2AClientPlugin is a ChatPrompt plugin, not an App plugin. Pass it to `new ChatPrompt()`, not to `new App({ plugins: [...] })`. Adding it to the App has no effect. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
9. Agent cards are fetched once at connection time. If a remote agent's skills change, the client bot must be restarted or the plugin must be re-configured to pick up the new skills. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
10. Handle `prompt.send()` failures gracefully. If a remote agent is unreachable or returns an error, the LLM receives an error result for that function call. Wrap `prompt.send()` in try/catch and inform the user. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)

## patterns

### Basic A2A client calling one agent

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
    instructions: 'You are an orchestrator. Delegate weather questions to the weather agent.',
  },
  [new A2AClientPlugin()], // Pass as ChatPrompt plugin
)
  // Connect to a remote weather agent
  .usePlugin('a2a', {
    key: 'weather',
    cardUrl: 'http://localhost:4000/a2a/.well-known/agent-card.json',
  });

const app = new App({
  logger: new ConsoleLogger('a2a-client', { level: 'debug' }),
  plugins: [new DevtoolsPlugin()],
});

// The LLM can now call the weather agent as a function
app.on('message', async ({ send, activity }) => {
  await send({ type: 'typing' });
  const result = await prompt.send(activity.text);
  if (result.content) {
    await send(result.content);
  }
});

app.start(3978);
```

### Multiple agents for different domains

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
    instructions: `You are a helpful office assistant. You can delegate to specialized agents:
- Weather agent: for weather questions
- Calendar agent: for scheduling and calendar queries
- IT agent: for IT support and ticket management

Route user requests to the appropriate agent. If a request does not match any agent, answer it yourself.`,
  },
  [new A2AClientPlugin()],
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
  logger: new ConsoleLogger('multi-agent-client'),
  plugins: [new DevtoolsPlugin()],
});

app.on('message', async ({ send, activity }) => {
  await send({ type: 'typing' });
  try {
    const result = await prompt.send(activity.text);
    if (result.content) {
      await send(result.content);
    }
  } catch (err: any) {
    await send('Sorry, I encountered an error processing your request.');
  }
});

app.start(3978);
```

### Combining A2A agents with local functions

```typescript
import { App } from '@microsoft/teams.apps';
import { ChatPrompt } from '@microsoft/teams.ai';
import { OpenAIChatModel } from '@microsoft/teams.openai';
import { A2AClientPlugin } from '@microsoft/teams.a2a';

const model = new OpenAIChatModel({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
});

const prompt = new ChatPrompt(
  {
    model,
    instructions: 'You are a helpful assistant with access to both local tools and remote agents.',
  },
  [new A2AClientPlugin()],
)
  // Remote agent for weather
  .usePlugin('a2a', {
    key: 'weather',
    cardUrl: 'http://localhost:4000/a2a/.well-known/agent-card.json',
  })
  // Local function for time
  .function('getTime', 'Get the current date and time', () => {
    return new Date().toISOString();
  })
  // Local function for calculations
  .function(
    'calculate',
    'Evaluate a math expression',
    {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Math expression' },
      },
      required: ['expression'],
    },
    ({ expression }: { expression: string }) => {
      return String(eval(expression)); // Use safe parser in production
    }
  );

// The LLM sees both remote A2A agents and local functions
```

## pitfalls

- **Wrong `usePlugin` name**: The first argument must be the string `'a2a'` exactly. A typo means the plugin is never activated and no agents are connected.
- **Duplicate agent keys**: Using the same `key` for two agents causes one to overwrite the other. Each key must be unique.
- **Unreachable agent card URL**: If the `cardUrl` is wrong or the remote agent is not running, the card fetch fails and the agent's skills are not registered. The LLM will not know the agent exists.
- **Passing A2AClientPlugin to App**: `A2AClientPlugin` is a ChatPrompt plugin, not an App plugin. Adding it to `new App({ plugins: [...] })` has no effect and the LLM will not see any agents.
- **No error handling**: If a remote agent fails during delegation, `prompt.send()` may throw. Always wrap in try/catch and provide a fallback response to the user.
- **Vague orchestrator instructions**: The LLM needs clear instructions about which agents handle which types of requests. Without guidance, delegation may be inconsistent or incorrect.
- **Agent card caching**: Agent cards are fetched once. If the remote agent updates its skills, the client bot must restart to see the changes.

## references

- [A2A Protocol Specification](https://google.github.io/A2A/)
- [Teams AI Library v2 -- GitHub](https://github.com/microsoft/teams.ts)
- [@microsoft/teams.a2a npm](https://www.npmjs.com/package/@microsoft/teams.a2a)
- [A2A Agent Card documentation](https://google.github.io/A2A/#/documentation?id=agent-card)

## instructions

This expert covers calling remote A2A agents from a Teams bot using `A2AClientPlugin` from `@microsoft/teams.a2a` in TypeScript. Use it when you need to:

- Create an `A2AClientPlugin` and pass it as a ChatPrompt plugin
- Connect to one or more remote A2A agents via `.usePlugin('a2a', { key, cardUrl })`
- Understand how the LLM automatically delegates to agents as function calls
- Combine A2A agent delegation with locally defined `.function()` tools
- Handle delegation errors and fallback responses

Pair with `a2a.server-basics-ts.md` for building the agent being called, and `a2a.orchestrator-patterns-ts.md` for advanced multi-agent coordination patterns. Pair with `ai.chatprompt-basics-ts.md` for ChatPrompt constructor where A2AClientPlugin is passed, and `a2a.orchestrator-patterns-ts.md` for multi-agent coordination.

## research

Deep Research prompt:

"Write a micro expert on using A2AClientPlugin in a Teams bot (TypeScript). Cover creating the plugin, passing it to ChatPrompt, .usePlugin('a2a', { key, cardUrl }) for connecting to agents, how the LLM automatically delegates, connecting to multiple agents, combining with local functions, error handling, and common pitfalls. Include 2-3 TypeScript code examples."
