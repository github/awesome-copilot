# anthropic-ts

## purpose

Configuring and calling Anthropic Claude models from TypeScript using the official SDK. Covers direct API usage, tool use, streaming, vision, and integration patterns for bots.

## rules

1. **Use the official `@anthropic-ai/sdk` package.** `npm install @anthropic-ai/sdk`. This is the only supported TypeScript/JavaScript SDK. [docs.anthropic.com/en/docs/build-with-claude/getting-started](https://docs.anthropic.com/en/docs/build-with-claude/getting-started)
2. **The SDK reads `ANTHROPIC_API_KEY` from the environment by default.** You can also pass it explicitly: `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`. [docs.anthropic.com/en/api/client-sdks](https://docs.anthropic.com/en/api/client-sdks)
3. **Use the Messages API, not the legacy Completions API.** All Claude models use `client.messages.create()`. The legacy `client.completions.create()` is deprecated. [docs.anthropic.com/en/api/messages](https://docs.anthropic.com/en/api/messages)
4. **Always specify `max_tokens`.** Unlike OpenAI, Anthropic requires `max_tokens` on every request. There is no default. Omitting it throws an error. [docs.anthropic.com/en/api/messages](https://docs.anthropic.com/en/api/messages)
5. **System messages go in the `system` parameter, not in `messages`.** Claude uses a top-level `system` string, not a `{ role: 'system', content: '...' }` message. Putting system content in `messages` with role `'system'` will error. [docs.anthropic.com/en/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
6. **Use `model` IDs like `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`.** Check the model names page for the latest IDs. Aliases like `claude-3-5-sonnet-latest` are available but less predictable. [docs.anthropic.com/en/docs/about-claude/models](https://docs.anthropic.com/en/docs/about-claude/models)
7. **Tool use follows the `tools` + `tool_use` / `tool_result` pattern.** Define tools in the request, receive `tool_use` content blocks in the response, execute them, then send `tool_result` blocks back. [docs.anthropic.com/en/docs/build-with-claude/tool-use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
8. **Streaming uses `client.messages.stream()`.** Returns a `MessageStream` with event-driven or async iteration. Use `stream.on('text', (text) => ...)` for incremental text or `for await (const event of stream)` for full events. [docs.anthropic.com/en/api/messages-streaming](https://docs.anthropic.com/en/api/messages-streaming)
9. **Handle rate limits with exponential backoff.** The SDK throws `RateLimitError` (HTTP 429). Implement retry logic with backoff, or use the SDK's built-in `maxRetries` option (defaults to 2). [docs.anthropic.com/en/api/rate-limits](https://docs.anthropic.com/en/api/rate-limits)
10. **For Bedrock-hosted Claude, use the Bedrock expert instead.** This expert covers direct Anthropic API access. If you're accessing Claude through AWS Bedrock, see `bedrock-ts.md` — the SDK and auth are completely different.

## patterns

### Basic chat completion

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 3,
  timeout: 30000,
});

const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  system: 'You are a helpful assistant in a Slack workspace.',
  messages: [
    { role: 'user', content: userMessage },
  ],
});

const reply = response.content[0].type === 'text'
  ? response.content[0].text
  : '';
```

### Streaming

```typescript
const stream = client.messages.stream({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  system: 'You are a helpful assistant.',
  messages: [{ role: 'user', content: userMessage }],
});

stream.on('text', (text) => {
  process.stdout.write(text);
});

const finalMessage = await stream.finalMessage();
```

### Tool use (function calling)

```typescript
const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  tools: [{
    name: 'get_weather',
    description: 'Get current weather for a location',
    input_schema: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name' },
      },
      required: ['location'],
    },
  }],
  messages: [{ role: 'user', content: 'What is the weather in Seattle?' }],
});

// Check for tool use in the response
const toolUseBlock = response.content.find((b) => b.type === 'tool_use');
if (toolUseBlock && toolUseBlock.type === 'tool_use') {
  const result = await executeFunction(toolUseBlock.name, toolUseBlock.input);

  // Send tool result back
  const followUp = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    tools: [/* same tools */],
    messages: [
      { role: 'user', content: 'What is the weather in Seattle?' },
      { role: 'assistant', content: response.content },
      {
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: toolUseBlock.id,
          content: JSON.stringify(result),
        }],
      },
    ],
  });
}
```

### Multi-turn conversation

```typescript
const conversationHistory: Anthropic.MessageParam[] = [];

async function chat(userInput: string): Promise<string> {
  conversationHistory.push({ role: 'user', content: userInput });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: 'You are a helpful Slack bot.',
    messages: conversationHistory,
  });

  const assistantText = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  conversationHistory.push({ role: 'assistant', content: response.content });
  return assistantText;
}
```

## pitfalls

- **Putting system message in `messages` array.** Claude requires `system` as a top-level parameter. `{ role: 'system', content: '...' }` in `messages` will error.
- **Forgetting `max_tokens`.** Anthropic requires this on every request. Unlike OpenAI, there's no default.
- **Response content is an array, not a string.** `response.content` is `ContentBlock[]`. Each block has a `type` (`text`, `tool_use`). Don't treat it as a plain string.
- **Tool result must reference `tool_use_id`.** When sending `tool_result` blocks, you must include the exact `tool_use_id` from the model's response. Mismatches cause errors.
- **`stop_reason` vs `finish_reason`.** Anthropic uses `stop_reason` (values: `end_turn`, `max_tokens`, `stop_sequence`, `tool_use`). Don't confuse with OpenAI's `finish_reason`.
- **Model ID format differs from OpenAI.** Anthropic uses IDs like `claude-sonnet-4-6`, not `gpt-4o`. Check the models page for current IDs.

## references

- [Anthropic TypeScript SDK — GitHub](https://github.com/anthropics/anthropic-sdk-typescript)
- [Messages API Reference](https://docs.anthropic.com/en/api/messages)
- [Tool Use Guide](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
- [Streaming Guide](https://docs.anthropic.com/en/api/messages-streaming)
- [Claude Models](https://docs.anthropic.com/en/docs/about-claude/models)

## instructions

This expert covers direct Anthropic API usage from TypeScript. Use it when the developer is calling Claude models via the Anthropic API (not through Bedrock). For Bedrock-hosted Claude, see `bedrock-ts.md` instead.

Pair with: `bedrock-ts.md` (if also using Bedrock), `openai-azure-openai-ts.md` (if mixing providers), `../security/secrets-ts.md` (API key management).

## research

Deep Research prompt:

"Write a micro expert on using the @anthropic-ai/sdk TypeScript package. Cover: client initialization, Messages API, system messages, max_tokens requirement, streaming with MessageStream, tool use (defining tools, handling tool_use blocks, sending tool_result), multi-turn conversations, vision/image input, prompt caching, rate limits and retries, error handling, and model selection guidance."
