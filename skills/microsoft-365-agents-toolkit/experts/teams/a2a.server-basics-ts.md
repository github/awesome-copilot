# a2a.server-basics-ts

## purpose

Exposing a Teams bot as an A2A agent with AgentCard definition, A2APlugin setup, and a2a:message event handling.

## rules

1. Create an `A2APlugin` with `new A2APlugin({ agentCard })` where `agentCard` is an `AgentCard` object describing your agent's identity and capabilities. The plugin registers the A2A HTTP endpoint automatically. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
2. The `AgentCard` must include these required fields: `name`, `description`, `url`, `version`, `protocolVersion`, `capabilities`, and `skills`. The `url` must match the A2A endpoint (e.g., `http://localhost:3978/a2a`). [google.github.io/A2A -- Agent Card](https://google.github.io/A2A/#/documentation?id=agent-card)
3. Set `protocolVersion` to `'0.3.0'` to match the current A2A protocol version. Client agents use this to verify compatibility before sending messages. [google.github.io/A2A -- Protocol](https://google.github.io/A2A/)
4. Define `skills` as an array of objects with `id`, `name`, `description`, and optionally `tags` and `examples`. Skills describe what your agent can do. Client agents and LLMs use skill descriptions to decide when to delegate to your agent. [google.github.io/A2A -- Skills](https://google.github.io/A2A/#/documentation?id=agent-card)
5. Handle incoming A2A messages with `app.event('a2a:message', handler)`. The handler receives `{ respond, requestContext }` where `requestContext.userMessage.parts` contains the message parts sent by the calling agent. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
6. Extract text input from message parts by filtering for `kind === 'text'`: `requestContext.userMessage.parts.filter((p) => p.kind === 'text').at(0)?.text`. Always check for the text part before processing. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
7. Send responses using the `respond(text)` helper function. This sends a text response back to the calling agent through the A2A protocol. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
8. Add the `A2APlugin` to the App's `plugins` array. The plugin registers two HTTP routes: the A2A message endpoint at `/a2a` and the agent card at `/a2a/.well-known/agent-card.json`. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
9. Install `@microsoft/teams.a2a` as a dependency. If the agent uses AI to process messages, also install `@microsoft/teams.ai` and `@microsoft/teams.openai`. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
10. Keep skill descriptions specific and actionable. Vague descriptions like "general assistant" cause LLM orchestrators to delegate inappropriately. Include example queries in the `examples` array to guide delegation decisions. [google.github.io/A2A -- Best practices](https://google.github.io/A2A/)

## patterns

### Basic A2A server with AI processing

```typescript
import { App } from '@microsoft/teams.apps';
import { A2APlugin } from '@microsoft/teams.a2a';
import { ChatPrompt } from '@microsoft/teams.ai';
import { OpenAIChatModel } from '@microsoft/teams.openai';
import { ConsoleLogger } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';

const model = new OpenAIChatModel({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
});

const prompt = new ChatPrompt({
  model,
  instructions: 'You are a weather expert. Provide weather information for requested locations.',
});

const agentCard = {
  name: 'Weather Agent',
  description: 'An agent that provides weather information',
  url: 'http://localhost:3978/a2a',
  version: '0.0.1',
  protocolVersion: '0.3.0',
  capabilities: {},
  skills: [
    {
      id: 'get_weather',
      name: 'Get Weather',
      description: 'Get current weather conditions for a location',
      tags: ['weather', 'forecast'],
      examples: ['What is the weather in London?', 'Temperature in Tokyo'],
    },
  ],
};

const app = new App({
  logger: new ConsoleLogger('weather-agent', { level: 'debug' }),
  plugins: [new DevtoolsPlugin(), new A2APlugin({ agentCard })],
});

// Handle incoming A2A messages from other agents
app.event('a2a:message', async ({ respond, requestContext }) => {
  const textInput = requestContext.userMessage.parts
    .filter((p: any) => p.kind === 'text')
    .at(0)?.text;

  if (!textInput) {
    await respond('I only support text input.');
    return;
  }

  // Process with AI and respond
  const result = await prompt.send(textInput);
  await respond(result.content || 'No response available.');
});

// Also handle direct Teams messages
app.on('message', async ({ send, activity }) => {
  const result = await prompt.send(activity.text);
  if (result.content) await send(result.content);
});

app.start(3978);
// A2A endpoint: http://localhost:3978/a2a
// Agent card: http://localhost:3978/a2a/.well-known/agent-card.json
```

### Multi-skill agent card

```typescript
import { A2APlugin } from '@microsoft/teams.a2a';

const agentCard = {
  name: 'IT Help Desk Agent',
  description: 'An agent that handles IT support requests, password resets, and ticket creation',
  url: 'http://localhost:3978/a2a',
  version: '1.0.0',
  protocolVersion: '0.3.0',
  capabilities: {},
  skills: [
    {
      id: 'password_reset',
      name: 'Password Reset',
      description: 'Initiate a password reset for a user account',
      tags: ['password', 'account', 'reset'],
      examples: [
        'Reset password for user john@company.com',
        'I forgot my password',
      ],
    },
    {
      id: 'create_ticket',
      name: 'Create Support Ticket',
      description: 'Create a new IT support ticket with priority and description',
      tags: ['ticket', 'support', 'helpdesk'],
      examples: [
        'Create a high priority ticket for laptop replacement',
        'Submit a ticket about VPN issues',
      ],
    },
    {
      id: 'check_status',
      name: 'Check Ticket Status',
      description: 'Check the status of an existing support ticket by ID',
      tags: ['ticket', 'status'],
      examples: [
        'What is the status of ticket IT-1234?',
        'Check my open tickets',
      ],
    },
  ],
};

const a2aPlugin = new A2APlugin({ agentCard });
```

### A2A message handler with routing

```typescript
import { App } from '@microsoft/teams.apps';
import { A2APlugin } from '@microsoft/teams.a2a';
import { ChatPrompt } from '@microsoft/teams.ai';
import { OpenAIChatModel } from '@microsoft/teams.openai';

const model = new OpenAIChatModel({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
});

const prompt = new ChatPrompt({
  model,
  instructions: `You are an IT help desk agent. You can:
- Reset passwords (ask for the user email)
- Create support tickets (ask for priority and description)
- Check ticket status (ask for ticket ID)
Be concise and helpful.`,
})
  .function('resetPassword', 'Reset a user password', {
    type: 'object',
    properties: {
      email: { type: 'string', description: 'User email address' },
    },
    required: ['email'],
  }, async ({ email }: { email: string }) => {
    return { success: true, message: `Password reset initiated for ${email}` };
  })
  .function('createTicket', 'Create a support ticket', {
    type: 'object',
    properties: {
      priority: { type: 'string', description: 'high, medium, or low' },
      description: { type: 'string', description: 'Issue description' },
    },
    required: ['priority', 'description'],
  }, async ({ priority, description }: { priority: string; description: string }) => {
    const ticketId = `IT-${Date.now()}`;
    return { ticketId, priority, description, status: 'open' };
  });

const agentCard = {
  name: 'IT Help Desk Agent',
  description: 'Handles IT support requests',
  url: 'http://localhost:3978/a2a',
  version: '1.0.0',
  protocolVersion: '0.3.0',
  capabilities: {},
  skills: [
    {
      id: 'it_support',
      name: 'IT Support',
      description: 'Password resets, ticket creation, and status checks',
      tags: ['it', 'support'],
      examples: ['Reset my password', 'Create a ticket for VPN issues'],
    },
  ],
};

const app = new App({
  plugins: [new A2APlugin({ agentCard })],
});

app.event('a2a:message', async ({ respond, requestContext }) => {
  const textInput = requestContext.userMessage.parts
    .filter((p: any) => p.kind === 'text')
    .at(0)?.text;

  if (!textInput) {
    await respond('Please send a text message describing your IT issue.');
    return;
  }

  const result = await prompt.send(textInput);
  await respond(result.content || 'I was unable to process your request.');
});

app.start(3978);
```

## pitfalls

- **Missing required AgentCard fields**: Omitting `name`, `url`, `version`, or `protocolVersion` causes client agents to reject the agent card during discovery. Include all required fields.
- **URL mismatch in AgentCard**: The `url` field must match the actual A2A endpoint URL. If your bot runs on port 3978, the URL is `http://localhost:3978/a2a`. A mismatch causes clients to connect to the wrong endpoint.
- **Not handling non-text message parts**: A2A messages can contain parts of different kinds (text, file, data). Always filter for the expected kind and handle unexpected types gracefully.
- **Forgetting to add A2APlugin to App plugins**: Creating the plugin without adding it to `new App({ plugins: [...] })` means the A2A endpoints are never registered.
- **Vague skill descriptions**: Skills with descriptions like "general helper" provide no guidance to orchestrator agents. Be specific about what the agent can do and include example queries.
- **No error handling in message handler**: If `prompt.send()` throws (e.g., model error), the A2A client receives no response. Wrap processing in try/catch and use `respond()` to send error messages.
- **Missing `protocolVersion`**: Without this field, client agents cannot verify protocol compatibility. Always set it to the current version (`'0.3.0'`).

## references

- [A2A Protocol Specification](https://google.github.io/A2A/)
- [Teams AI Library v2 -- GitHub](https://github.com/microsoft/teams.ts)
- [@microsoft/teams.a2a npm](https://www.npmjs.com/package/@microsoft/teams.a2a)
- [A2A Agent Card documentation](https://google.github.io/A2A/#/documentation?id=agent-card)

## instructions

This expert covers exposing a Teams bot as an A2A (Agent-to-Agent) server using `A2APlugin` from `@microsoft/teams.a2a` in TypeScript. Use it when you need to:

- Define an `AgentCard` with name, description, URL, version, capabilities, and skills
- Create an `A2APlugin` and add it to the App's plugins array
- Handle incoming A2A messages via `app.event('a2a:message', handler)`
- Extract text from `requestContext.userMessage.parts`
- Send responses using the `respond()` helper
- Understand the A2A endpoint URL (`/a2a`) and agent card URL (`/a2a/.well-known/agent-card.json`)

Pair with `a2a.client-basics-ts.md` for calling other A2A agents and `a2a.orchestrator-patterns-ts.md` for multi-agent coordination. Pair with `runtime.app-init-ts.md` for adding A2APlugin to the App, and `ai.chatprompt-basics-ts.md` for processing A2A messages with AI.

## research

Deep Research prompt:

"Write a micro expert on implementing an A2A server in a Teams bot using @microsoft/teams.a2a (TypeScript). Cover AgentCard structure (name, description, url, version, protocolVersion, capabilities, skills), A2APlugin constructor, handling a2a:message events, extracting text from requestContext.userMessage.parts, respond() helper, endpoint URLs, and common pitfalls. Include 2-3 canonical TypeScript code examples."
