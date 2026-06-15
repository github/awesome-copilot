# ai.memory-localmemory-ts

## purpose

Conversation history management with LocalMemory, message limits, and auto-summarization.

## rules

1. Import `LocalMemory` from `@microsoft/teams.ai`. This is the built-in memory class that implements the `IMemory` interface for managing conversation history with automatic overflow handling.
2. Pass a `max` value to the `LocalMemory` constructor to cap the number of messages retained. When the limit is reached, the collapse strategy is triggered automatically. Choose a value that balances context quality with token budget (e.g., 20-50 messages for typical chat bots).
3. Set `collapse.strategy` to `'half'` (default) to summarize and discard the oldest half of messages when the limit is hit, or `'full'` to summarize all messages into a single summary message. The `'half'` strategy preserves recent context while the `'full'` strategy maximizes compression.
4. Provide a `collapse.model` -- an `OpenAIChatModel` instance used to generate the summary when collapse is triggered. This can be the same model used for chat or a cheaper/faster model dedicated to summarization.
5. Pass the `LocalMemory` instance as the `messages` property of the `ChatPrompt` constructor. The prompt reads from and writes to this memory automatically on each `prompt.send()` call.
6. For multi-turn bots, maintain a `Map<string, LocalMemory>` keyed by conversation ID. Create a new `LocalMemory` per conversation to prevent history leaking across users or channels.
7. Use the `IMemory` interface methods (`push`, `pop`, `get`, `set`, `delete`, `values`, `length`, `where`, `collapse`) for programmatic access to conversation history. Call `memory.where(predicate)` to filter messages by role or content.
8. Seed initial context by passing a `messages` array to the `LocalMemory` constructor. Use this for few-shot examples or system-level context that should always be present at the start of a conversation.
9. Call `memory.collapse()` manually when you need to free token budget mid-conversation (e.g., before a large function call result). The method returns the summary message or `undefined` if collapse was not needed.
10. For production deployments that must survive restarts, serialize `memory.values()` to persistent storage (database, blob) and rehydrate by passing the stored messages array to a new `LocalMemory` constructor.

## patterns

### Basic LocalMemory with collapse

```typescript
import { LocalMemory, ChatPrompt } from '@microsoft/teams.ai';
import { OpenAIChatModel } from '@microsoft/teams.openai';

const model = new OpenAIChatModel({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
});

const summaryModel = new OpenAIChatModel({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini',
});

const memory = new LocalMemory({
  max: 50,              // Keep up to 50 messages
  messages: [],          // Optional initial messages
  collapse: {
    strategy: 'half',    // Summarize oldest half when full
    model: summaryModel, // Model used for summarization
  },
});

const prompt = new ChatPrompt({
  model,
  instructions: 'You are a helpful assistant.',
  messages: memory,
});

const result = await prompt.send('Hello!');
```

### Per-conversation memory with Map

```typescript
import { LocalMemory, ChatPrompt, Message } from '@microsoft/teams.ai';

const conversationMemories = new Map<string, LocalMemory>();

app.on('message', async ({ send, activity }) => {
  const convId = activity.conversation.id;

  // Get or create per-conversation memory
  if (!conversationMemories.has(convId)) {
    conversationMemories.set(convId, new LocalMemory({
      max: 30,
      collapse: {
        strategy: 'half',
        model: summaryModel,
      },
    }));
  }

  const prompt = new ChatPrompt({
    model,
    instructions: 'You are a helpful assistant.',
    messages: conversationMemories.get(convId)!,
  });

  const result = await prompt.send(activity.text);
  if (result.content) {
    await send(result.content);
  }
});
```

### IMemory interface methods

```typescript
// Push a message manually
memory.push({ role: 'user', content: 'Hello' });

// Get message count
const count = memory.length();

// Retrieve all messages
const allMessages = memory.values();

// Filter messages by role
const userMessages = memory.where((msg) => msg.role === 'user');

// Get a specific message by index
const first = memory.get(0);

// Replace a message at index
memory.set(0, { role: 'system', content: 'Updated context' });

// Remove the last message
memory.pop();

// Delete message at index
memory.delete(2);

// Manually trigger collapse/summarization
const summary = await memory.collapse();
```

## pitfalls

- **Sharing a single LocalMemory across conversations**: All users see each other's history. Always key memory instances by conversation ID (or user ID for 1:1 bots).
- **Setting `max` too low**: A max of 5-10 causes frequent collapse, losing important context. Start with 20-50 and tune based on your token budget and average conversation length.
- **Setting `max` too high**: Exceeding the model's context window causes truncation errors or degraded response quality. Keep `max * average_message_tokens` well under the model's context limit.
- **Forgetting `collapse.model`**: If you set a collapse strategy but omit the model, summarization will fail silently and old messages will simply be dropped instead of summarized.
- **Memory lost on restart**: `LocalMemory` is in-memory only. Bot process restarts lose all conversation history. For production, serialize `memory.values()` to a database and rehydrate on startup.
- **Passing a raw `Message[]` instead of `LocalMemory`**: Passing a plain array as `messages` works for simple cases but you lose collapse, max limits, and the `IMemory` interface. Use `LocalMemory` for anything beyond trivial demos.
- **Not cleaning up stale conversations**: The `Map` grows indefinitely. Implement a TTL or LRU eviction policy to remove inactive conversation memories.

## references

- [Teams AI Library v2 -- GitHub](https://github.com/microsoft/teams.ts)
- [@microsoft/teams.ai -- npm](https://www.npmjs.com/package/@microsoft/teams.ai)
- [OpenAI Context Window Limits](https://platform.openai.com/docs/models)
- [Conversation History Best Practices -- Microsoft Learn](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/)

## instructions

This expert covers conversation history management with `LocalMemory` in Teams AI v2. Use it when you need to:

- Configure `LocalMemory` with max message limits and collapse strategies
- Choose between `'half'` and `'full'` collapse strategies for summarization
- Implement per-conversation or per-user memory isolation using a `Map`
- Use the `IMemory` interface methods for programmatic history access
- Seed conversations with initial context messages
- Persist and rehydrate conversation history across bot restarts

Pair with `ai.chatprompt-basics-ts.md` for passing memory to ChatPrompt constructor, and `state.storage-patterns-ts.md` for persisting conversation history across restarts.

## research

Deep Research prompt:

"Write a micro expert on memory in Teams AI (TypeScript). Cover LocalMemory configuration, max messages, collapse strategies (half/full), supplying a summarization model, and state scoping (per-user vs per-conversation). Include practical code patterns and warnings about memory leakage across conversations."
