# state.storage-patterns-ts

## purpose

State management with IStorage interface, LocalStorage, and per-user/per-conversation state patterns in Teams bots.

## rules

1. Use the `IStorage` interface (`get`/`set`/`delete`) for all state management. It supports both synchronous and async implementations, so custom backends (Redis, Cosmos DB) can return Promises. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
2. `LocalStorage` from `@microsoft/teams.common` is an in-memory store with optional LRU eviction. Pass `{ max: N }` to cap entries and prevent unbounded memory growth in long-running bots. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
3. Pass storage to the `App` constructor via the `storage` option. The storage instance is then available as `ctx.storage` in all route handlers. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
4. For per-user state, key on `activity.from.id` (or `activity.from.aadObjectId` for AAD-stable IDs). For per-conversation state, key on `activity.conversation.id`. Choose the right scope for your data. [learn.microsoft.com -- Bot state](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-context)
5. When combining state with `ChatPrompt`, pass the user's stored `messages` array to the prompt's `messages` option. This restores conversation history across handler invocations. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
6. Initialize state lazily: check if state exists for the key, and if not, create a default state object and store it. This avoids null reference errors on first interaction. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
7. `LocalStorage` is volatile -- data is lost on process restart. For production bots, implement `IStorage` backed by a persistent store (Azure Cosmos DB, Redis, SQL). [learn.microsoft.com -- Bot state management](https://learn.microsoft.com/en-us/azure/bot-service/bot-builder-concept-state)
8. Keep state objects small. Store only what is needed (message history, preferences, session flags). Large state objects increase memory pressure and serialization cost for persistent backends. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
9. The `IStorage` generic signature is `IStorage<TKey, TValue>`. Type both the key and value for compile-time safety. For example, `new LocalStorage<IUserState>()` types the value while using string keys. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
10. Do not rely on in-memory state in multi-instance deployments (e.g., Azure App Service with multiple instances or containers). Each instance has its own `LocalStorage`. Use a shared persistent store instead. [learn.microsoft.com -- Scale out](https://learn.microsoft.com/en-us/azure/bot-service/bot-builder-concept-state)

## patterns

### Per-user state with ChatPrompt message history

```typescript
import { App } from '@microsoft/teams.apps';
import { ChatPrompt, LocalMemory, Message } from '@microsoft/teams.ai';
import { OpenAIChatModel } from '@microsoft/teams.openai';
import { LocalStorage, ConsoleLogger } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';

const model = new OpenAIChatModel({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
});

interface IUserState {
  messages: Message[];
  preferences: Record<string, any>;
}

const userStore = new LocalStorage<IUserState>({}, {
  max: 1000, // LRU eviction after 1000 users
});

const app = new App({
  logger: new ConsoleLogger('state-bot', { level: 'debug' }),
  plugins: [new DevtoolsPlugin()],
});

app.on('message', async ({ activity, send }) => {
  const userId = activity.from.id;

  // Lazy initialization: create state if it does not exist
  let state = userStore.get(userId);
  if (!state) {
    state = { messages: [], preferences: {} };
    userStore.set(userId, state);
  }

  const prompt = new ChatPrompt({
    model,
    instructions: 'You are a helpful assistant.',
    messages: state.messages, // Restore conversation history
  });

  const result = await prompt.send(activity.text);
  if (result.content) {
    await send(result.content);
  }
});

app.start(3978);
```

### Per-conversation state with App storage

```typescript
import { App } from '@microsoft/teams.apps';
import { ChatPrompt, Message } from '@microsoft/teams.ai';
import { OpenAIChatModel } from '@microsoft/teams.openai';
import { LocalStorage, ConsoleLogger } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';

const model = new OpenAIChatModel({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
});

interface IConversationState {
  messages: Message[];
  topicCount: number;
}

// Pass storage to App -- available as ctx.storage in handlers
const storage = new LocalStorage<IConversationState>({}, { max: 500 });

const app = new App({
  storage,
  logger: new ConsoleLogger('conv-bot'),
  plugins: [new DevtoolsPlugin()],
});

app.on('message', async ({ activity, send, storage }) => {
  const convId = activity.conversation.id;

  let state = storage.get(convId) as IConversationState | undefined;
  if (!state) {
    state = { messages: [], topicCount: 0 };
    storage.set(convId, state);
  }

  const prompt = new ChatPrompt({
    model,
    instructions: 'You are a helpful assistant. Be concise.',
    messages: state.messages,
  });

  const result = await prompt.send(activity.text);
  if (result.content) {
    state.topicCount++;
    await send(result.content);
  }
});

app.start(3978);
```

### IStorage interface for custom backends

```typescript
import { IStorage } from '@microsoft/teams.common';

// Example: custom Redis-backed storage implementing IStorage
class RedisStorage<T> implements IStorage<string, T> {
  private client: any; // Your Redis client

  constructor(redisClient: any) {
    this.client = redisClient;
  }

  async get(key: string): Promise<T | undefined> {
    const raw = await this.client.get(`bot:state:${key}`);
    return raw ? JSON.parse(raw) : undefined;
  }

  async set(key: string, value: T): Promise<void> {
    await this.client.set(`bot:state:${key}`, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    await this.client.del(`bot:state:${key}`);
  }
}

// Usage with App
// const storage = new RedisStorage<IConversationState>(redisClient);
// const app = new App({ storage });
```

## pitfalls

- **Unbounded `LocalStorage`**: Not setting `max` on `LocalStorage` allows the store to grow without limit, eventually exhausting process memory. Always specify a max entry count.
- **Data loss on restart**: `LocalStorage` is in-memory only. Restarting the process loses all state. Use a persistent backend (Cosmos DB, Redis) for production bots.
- **Wrong state key scope**: Using `activity.from.id` when you want conversation-scoped state (or vice versa) causes data to bleed across contexts. Use `activity.conversation.id` for conversation state and `activity.from.id` for user state.
- **Mutating state without re-setting**: If your `IStorage` backend uses serialization (e.g., Redis), mutating the returned object does not persist changes. Call `storage.set(key, state)` after modifications.
- **Large message history**: Passing the entire message history to `ChatPrompt` without a `max` limit on `LocalMemory` can exceed token limits. Use `LocalMemory` with `max` and `collapse` for automatic summarization.
- **Multi-instance deployments with `LocalStorage`**: Each process instance has its own in-memory store. In scaled deployments, a user may hit different instances, seeing inconsistent state.
- **Missing null check on `get()`**: `storage.get(key)` returns `undefined` if the key does not exist. Always check for `undefined` and initialize before accessing properties.

## references

- [Teams AI Library v2 -- GitHub](https://github.com/microsoft/teams.ts)
- [Bot state management concepts](https://learn.microsoft.com/en-us/azure/bot-service/bot-builder-concept-state)
- [Azure Cosmos DB for state storage](https://learn.microsoft.com/en-us/azure/cosmos-db/introduction)
- [Teams bot conversation context](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/bots-context)

## instructions

This expert covers state management and storage patterns for Teams bots built with the Teams AI Library v2 (`@microsoft/teams.ts`) in TypeScript. Use it when you need to:

- Understand the `IStorage` interface (`get`/`set`/`delete`) and implement custom backends
- Configure `LocalStorage` with LRU eviction limits
- Pass storage to the `App` constructor and access it in handlers via `ctx.storage`
- Implement per-user state keyed on `activity.from.id`
- Implement per-conversation state keyed on `activity.conversation.id`
- Combine stored message history with `ChatPrompt` for multi-turn conversations

Pair with `ai.memory-localmemory-ts.md` for `LocalMemory` (AI message memory with summarization) and `auth.oauth-sso-ts.md` for authenticated state patterns. Pair with `ai.memory-localmemory-ts.md` for combining state with AI conversation history, and `runtime.app-init-ts.md` for passing storage to the App constructor.

## research

Deep Research prompt:

"Write a micro expert on state and storage patterns for Teams SDK v2 bots (TypeScript). Cover IStorage interface, LocalStorage with LRU eviction, per-user and per-conversation state, combining state with ChatPrompt messages, implementing custom persistent backends (Redis, Cosmos DB), and warnings about multi-instance deployments. Include 2-3 TypeScript code examples."
