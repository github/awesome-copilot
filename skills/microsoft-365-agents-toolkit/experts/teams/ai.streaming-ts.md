# ai.streaming-ts

## purpose

Real-time streaming of AI responses with typing indicators and progressive rendering.

## rules

1. Use the `onChunk` callback in `prompt.send()` options to receive text chunks as they arrive from the LLM. Each chunk is a `string` fragment of the ongoing response.
2. Inside `onChunk`, call `stream.emit(chunk)` to send the accumulated text to the user with a typing indicator. The `stream` object is available on the handler context (`ctx.stream`).
3. `stream.emit()` accepts either a plain `string` or a `MessageActivity` instance. Use `MessageActivity` when you need to attach feedback buttons, AI-generated markers, or citations to the streaming message.
4. Call `stream.update(text)` to send a status update (e.g., `"Thinking..."`, `"Searching documents..."`). Status updates are separate from the accumulated content and display as informative indicators.
5. `stream.close()` is called automatically when the message handler returns. It sends the final message containing all accumulated content, attachments, and entities. You do not need to call it manually in typical usage.
6. If you need to finalize the stream early (e.g., after an error), call `stream.close()` explicitly. After close, further `emit()` calls are ignored.
7. Streaming works internally by batching: content is queued and flushed in batches of up to 10 items every 500ms. Text accumulates across chunks so the final message contains the complete response.
8. Listen to stream events with `stream.events.on('chunk', handler)` for each sent chunk and `stream.events.once('close', handler)` for the final message. Use these for logging, analytics, or post-processing.
9. When combining streaming with `MessageActivity` features (feedback, citations), construct a new `MessageActivity` in each `onChunk` call. The stream accumulates content across emissions automatically.
10. Do not call `await send()` for the final message when streaming -- `stream.close()` handles it. Calling both `send()` and allowing the auto-close results in duplicate messages.

## patterns

### Basic text streaming with onChunk

```typescript
import { ChatPrompt } from '@microsoft/teams.ai';

app.on('message', async ({ send, stream, activity }) => {
  const prompt = new ChatPrompt({ model, instructions: 'You are a helpful assistant.' });

  // Stream chunks as they arrive
  const response = await prompt.send(activity.text, {
    onChunk: (chunk: string) => {
      stream.emit(chunk); // Sends typing indicators with accumulated text
    },
  });

  // stream.close() is called automatically after the handler returns,
  // sending the final message with all accumulated content
});
```

### Streaming with feedback buttons and AI markers

```typescript
import { MessageActivity } from '@microsoft/teams.api';

app.on('message', async ({ stream, activity }) => {
  const prompt = new ChatPrompt({ model, instructions: 'You are a helpful assistant.' });

  const response = await prompt.send(activity.text, {
    onChunk: (chunk: string) => {
      // Emit a MessageActivity with feedback buttons on each chunk
      stream.emit(new MessageActivity(chunk).addFeedback());
    },
  });

  // Final message automatically includes feedback buttons
});
```

### Stream API with status updates and event listeners

```typescript
app.on('message', async ({ stream, activity }) => {
  // Show a status while the LLM is thinking
  stream.update('Searching documents...');

  const prompt = new ChatPrompt({ model, instructions: 'You are a research assistant.' });

  // Listen for stream events
  stream.events.on('chunk', (sentActivity) => {
    console.log('Chunk sent to user');
  });

  stream.events.once('close', (sentActivity) => {
    console.log('Final message delivered:', sentActivity.id);
  });

  const response = await prompt.send(activity.text, {
    onChunk: (chunk: string) => {
      stream.emit(chunk);
    },
  });

  // stream.close() sends the final message automatically
});
```

## pitfalls

- **Calling `send()` after streaming**: If you call `await send(response.content)` after streaming, the user receives a duplicate final message. The auto-close on `stream.close()` already sends the complete response.
- **Forgetting `stream.emit()` inside `onChunk`**: Defining `onChunk` without calling `stream.emit()` means the user sees nothing until the final message. The `onChunk` callback alone does not send anything to the client.
- **Calling `stream.close()` too early**: Explicitly closing the stream before `prompt.send()` resolves discards remaining chunks. Only call `close()` manually for error bailout scenarios.
- **Heavy computation in `onChunk`**: The callback fires on every token. Expensive operations (API calls, database writes) inside `onChunk` create backpressure and degrade streaming performance. Log or buffer instead.
- **Not handling errors during streaming**: If the LLM request fails mid-stream, the user sees partial text with no indication of failure. Wrap `prompt.send()` in try/catch and call `stream.emit('An error occurred.')` followed by `stream.close()` in the catch block.
- **Assuming chunk boundaries are semantic**: Chunks are raw token fragments, not words or sentences. Do not parse or process individual chunks as complete text units.
- **Ignoring batching behavior**: The SDK batches up to 10 items every 500ms. Very rapid `emit()` calls do not produce 1:1 client updates. This is normal and expected.

## references

- [Teams AI Library v2 -- GitHub](https://github.com/microsoft/teams.ts)
- [Teams Streaming Protocol -- Microsoft Learn](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/streaming)
- [@microsoft/teams.ai -- npm](https://www.npmjs.com/package/@microsoft/teams.ai)
- [OpenAI Streaming -- API Reference](https://platform.openai.com/docs/api-reference/chat/create#chat-create-stream)

## instructions

This expert covers real-time streaming of AI responses in Teams AI v2. Use it when you need to:

- Stream LLM responses to the user with typing indicators using `onChunk` and `stream.emit()`
- Display status updates during long-running operations with `stream.update()`
- Combine streaming with `MessageActivity` for feedback buttons and AI-generated markers
- Understand the internal batching mechanism (10 items / 500ms) and its effect on UX
- Handle errors gracefully during streaming
- Use stream events (`chunk`, `close`) for logging and analytics

Pair with `ai.chatprompt-basics-ts.md` for prompt.send() with onChunk, `ai.citations-feedback-ts.md` for combining streaming with feedback buttons, and `runtime.routing-handlers-ts.md` for ctx.stream.

## research

Deep Research prompt:

"Write a micro expert on streaming AI responses in Teams SDK v2 (TypeScript). Explain how ctx.stream works, how onChunk accumulates text, how to emit MessageActivity vs strings, and how to combine streaming with typing indicators, final messages, and error handling. Include at least two patterns: (1) plain text streaming, (2) streaming with addAiGenerated/addFeedback."
