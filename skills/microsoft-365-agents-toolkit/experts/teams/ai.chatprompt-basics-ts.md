# ai.chatprompt-basics-ts

## purpose

ChatPrompt construction, system instructions, sending messages, and response handling in Teams AI v2.

## rules

1. Always import `ChatPrompt` from `@microsoft/teams.ai` and pass a configured `IChatModel` instance (typically `OpenAIChatModel`) as the `model` option. The `model` field is the only required option. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
2. Set `instructions` to define the system prompt. This accepts a `string`, `string[]` (joined with newlines), or an `ITemplate` for dynamic instructions. The `role` option controls whether instructions are sent as `'system'` (default) or `'user'` role. [github.com/microsoft/teams.ts -- ChatPrompt](https://github.com/microsoft/teams.ts)
3. Pass a `LocalMemory` instance as `messages` for automatic conversation history management with configurable limits and auto-summarization. Alternatively, pass a raw `Message[]` array for manual control. [github.com/microsoft/teams.ts -- LocalMemory](https://github.com/microsoft/teams.ts)
4. Call `prompt.send(input)` to send a user message and get a `ModelMessage` response. The input can be a `string` or a `ContentPart[]` array for multimodal input (text + images). [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
5. Always check `response.content` before sending -- it may be `undefined` if the model returned only function calls. When `autoFunctionCalling` is `true` (the default), function results are automatically fed back and the final response will have content. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
6. Use `prompt.send(input, { request: { temperature, max_tokens } })` to override model parameters per-request. These merge with the model's `requestOptions` defaults. [OpenAI -- Chat Completions](https://platform.openai.com/docs/api-reference/chat/create)
7. Use `prompt.send(input, { messages: extraMessages })` to inject additional context messages for a single request without persisting them to memory. This is useful for RAG-injected context. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
8. Use `.use(otherPrompt)` to compose sub-prompts and inherit their function definitions. This enables modular function organization across multiple ChatPrompt instances. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
9. Set `name` and `description` on the prompt for debugging and identification. These appear in logs when a `logger` is provided and are used by ChatPrompt plugins for metadata. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
10. Pass ChatPrompt plugins as the second constructor argument: `new ChatPrompt(options, [plugin1, plugin2])`. Plugins hook into the send lifecycle (before/after send, before/after function calls). [github.com/microsoft/teams.ts -- ChatPromptPlugin](https://github.com/microsoft/teams.ts)

## patterns

### Basic ChatPrompt with system instructions

```typescript
import { ChatPrompt, LocalMemory } from '@microsoft/teams.ai';
import { OpenAIChatModel } from '@microsoft/teams.openai';

const model = new OpenAIChatModel({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o',
});

const prompt = new ChatPrompt({
  name: 'my-agent',
  description: 'A helpful assistant',
  model: model,
  instructions: 'You are a helpful assistant that answers questions concisely.',
  messages: new LocalMemory({ max: 50 }),
});

// In a message handler
app.on('message', async ({ send, activity }) => {
  const response = await prompt.send(activity.text);
  if (response.content) {
    await send(response.content);
  }
});
```

### Sending with per-request options and multimodal input

```typescript
import { ChatPrompt } from '@microsoft/teams.ai';

const prompt = new ChatPrompt({
  model,
  instructions: 'You are a vision-capable assistant. Describe images in detail.',
});

// Text-only with request overrides
const textResponse = await prompt.send('Summarize quantum computing', {
  request: { temperature: 0.3, max_tokens: 500 },
});

// Multimodal: text + image
const visionResponse = await prompt.send([
  { type: 'text', text: 'What is in this image?' },
  { type: 'image_url', image_url: 'https://example.com/photo.jpg' },
]);

if (visionResponse.content) {
  await send(visionResponse.content);
}
```

### Composing prompts with .use()

```typescript
import { ChatPrompt } from '@microsoft/teams.ai';

// Sub-prompt with specialized functions
const weatherPrompt = new ChatPrompt({
  model,
  instructions: 'Weather helper',
})
  .function('getWeather', 'Get weather for a city', {
    type: 'object',
    properties: {
      city: { type: 'string', description: 'City name' },
    },
    required: ['city'],
  }, async ({ city }: { city: string }) => {
    const res = await fetch(`https://api.weather.example.com/${city}`);
    return await res.json();
  });

// Main prompt inherits weather functions via .use()
const mainPrompt = new ChatPrompt({
  model,
  instructions: 'You are a general-purpose assistant with weather capabilities.',
  messages: new LocalMemory({ max: 100 }),
})
  .use(weatherPrompt);

app.on('message', async ({ send, activity }) => {
  const result = await mainPrompt.send(activity.text);
  if (result.content) {
    await send(result.content);
  }
});
```

## pitfalls

- **Forgetting to check `response.content`**: When the model returns only function calls (and `autoFunctionCalling` is `false`), `content` is `undefined`. Sending `undefined` to Teams produces an error.
- **Sharing a single prompt across conversations**: A `ChatPrompt` with a `LocalMemory` or `Message[]` accumulates history. If shared across conversations, users see each other's messages. Create a new prompt (or separate memory) per conversation.
- **Instructions too long**: Very long system prompts consume tokens from every request. Keep instructions focused and use function descriptions to offload behavioral guidance.
- **Missing `model` option**: The `model` field is required. Omitting it throws at construction time, not at `send()` time.
- **Using `.use()` after `.send()`**: While not strictly an error, composing prompts with `.use()` should be done during setup, not mid-conversation. Function registrations happen at composition time.
- **Ignoring the `function_calls` field**: When `autoFunctionCalling` is `false`, the response may contain `function_calls` that need manual handling. Always check both `content` and `function_calls` on `ModelMessage`.

## references

- [Teams AI Library v2 -- GitHub](https://github.com/microsoft/teams.ts)
- [@microsoft/teams.ai -- npm](https://www.npmjs.com/package/@microsoft/teams.ai)
- [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat/create)
- [OpenAI Vision Guide](https://platform.openai.com/docs/guides/vision)
- [Teams AI v2 Examples](https://github.com/microsoft/teams.ts/tree/main/examples)

## instructions

This expert covers creating and using `ChatPrompt` from `@microsoft/teams.ai` in Teams AI v2. Use it when you need to:

- Construct a ChatPrompt with system instructions, name, description, and memory
- Send text or multimodal (text + image) input to the LLM via `prompt.send()`
- Handle `ModelMessage` responses (content, function_calls, context/citations)
- Override request parameters (temperature, max_tokens) per-send
- Compose prompts with `.use()` for modular function organization
- Pass ChatPrompt plugins for lifecycle hooks

Pair with `ai.model-setup-ts.md` for model configuration, `ai.function-calling-design-ts.md` and `ai.function-calling-implementation-ts.md` for adding functions, and `ai.memory-localmemory-ts.md` for conversation history management.

## research

Deep Research prompt:

"Write a micro expert on ChatPrompt in the Teams AI Library v2 (TypeScript). Cover the ChatPrompt constructor options (model, name, description, instructions, role, messages, logger), the ChatPromptOptions reference table, prompt.send() with all options (onChunk, autoFunctionCalling, messages, request overrides), ModelMessage response shape (content, function_calls, audio, context), multimodal input (text + images via ContentPart[]), composing prompts with .use(), and ChatPrompt plugin integration."
