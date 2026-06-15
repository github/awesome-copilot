# bolt-assistant-ts

## purpose

Slack Assistant container patterns for Bolt.js — `Assistant` class configuration, thread lifecycle handlers (`threadStarted`, `userMessage`, `threadContextChanged`), utility functions (`say`, `setStatus`, `setSuggestedPrompts`, `setTitle`), and thread context storage.

## rules

1. **Provide `threadStarted` and `userMessage` handlers (required).** These are the minimum callbacks for an Assistant. `threadContextChanged` is optional and defaults to saving context via the thread context store. [slack.dev/bolt-js/concepts/assistant](https://slack.dev/bolt-js/concepts/assistant)
2. **Call `setStatus()` to show typing indicators.** Use `await setStatus("Thinking...")` at the start of `userMessage` to show the user that processing is happening. The status clears automatically when the bot sends a reply via `say()`, or pass an empty string to clear manually. [api.slack.com/docs/assistants](https://api.slack.com/docs/assistants)
3. **Use `setSuggestedPrompts()` in `threadStarted`.** Provide up to 4 preset prompts with `title` and `message` properties. This helps users discover what the assistant can do. An optional top-level `title` parameter labels the prompt group (defaults to "Try these prompts:"). [api.slack.com/docs/assistants](https://api.slack.com/docs/assistants)
4. **Use `setTitle()` to label conversation threads.** Call `setTitle(summary)` after processing the first `userMessage` to give the thread a meaningful name in the sidebar. [api.slack.com/docs/assistants](https://api.slack.com/docs/assistants)
5. **Thread context is NOT included in `userMessage` events.** The `message` event payload does not carry thread context. Call `await getThreadContext()` in `userMessage` handlers to retrieve the current context (channel_id, team_id, enterprise_id). [slack.dev/bolt-js/concepts/assistant](https://slack.dev/bolt-js/concepts/assistant)
6. **Use `saveThreadContext()` in `threadStarted`.** The initial thread context (which channel the user was viewing) arrives in the `threadStarted` event. Save it immediately so `userMessage` handlers can retrieve it later. [slack.dev/bolt-js/concepts/assistant](https://slack.dev/bolt-js/concepts/assistant)
7. **The default `AssistantThreadContextStore` uses message metadata.** Context is persisted by updating the bot's first message in the thread with metadata. This survives app restarts without external storage. For production, implement a custom store backed by a database. [slack.dev/bolt-js/concepts/assistant](https://slack.dev/bolt-js/concepts/assistant)
8. **Register the assistant with `app.assistant(assistant)`.** This adds middleware that intercepts `assistant_thread_started`, `assistant_thread_context_changed`, and thread messages. The middleware stops propagation — registered `app.message()` handlers will NOT fire for assistant threads. [slack.dev/bolt-js/concepts/assistant](https://slack.dev/bolt-js/concepts/assistant)
9. **`threadContextChanged` fires when the user switches channels.** The updated context is in `event.assistant_thread.context`. The default behavior (when handler is omitted) automatically calls `saveThreadContext()` to persist the new context.
10. **All handlers receive the same utility set.** Every handler gets: `say`, `getThreadContext`, `saveThreadContext`, `setStatus`, `setSuggestedPrompts`, `setTitle`, plus the standard `client`, `context`, and `logger`.

## patterns

### Basic assistant with suggested prompts and status

```typescript
import { App, Assistant } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  appToken: process.env.SLACK_APP_TOKEN!,
  socketMode: true,
});

const assistant = new Assistant({
  threadStarted: async ({ say, setSuggestedPrompts, saveThreadContext }) => {
    await saveThreadContext();
    await say("Hi! How can I help?");
    await setSuggestedPrompts({
      title: "Try one of these:",
      prompts: [
        { title: "Summarize", message: "Summarize this channel's recent messages" },
        { title: "Draft", message: "Help me draft a message" },
        { title: "Search", message: "Search our docs for..." },
      ],
    });
  },

  userMessage: async ({ message, say, setStatus, setTitle, getThreadContext }) => {
    await setStatus("Thinking...");

    const context = await getThreadContext();
    const channelId = context?.channel_id;
    const userText = message.text ?? "";

    // Set thread title from first message
    await setTitle(userText.slice(0, 50));

    // Business logic / AI call here...
    const answer = await generateAnswer(userText, channelId);
    await say(answer);
  },
});

app.assistant(assistant);

async function generateAnswer(text: string, channelId?: string): Promise<string> {
  return `You asked: "${text}" (from channel ${channelId ?? "unknown"})`;
}

(async () => {
  await app.start();
  console.log("Assistant is running");
})();
```

### Custom thread context store backed by a database

```typescript
import { type AssistantThreadContextStore, type AllAssistantMiddlewareArgs, type AssistantThreadContext } from "@slack/bolt";

const contextStore: AssistantThreadContextStore = {
  async get({ payload }: AllAssistantMiddlewareArgs): Promise<AssistantThreadContext> {
    const threadTs = "assistant_thread" in payload
      ? payload.assistant_thread.thread_ts
      : payload.thread_ts;
    const row = await db.query("SELECT context FROM assistant_threads WHERE thread_ts = $1", [threadTs]);
    return row?.context ?? {};
  },

  async save({ payload }: AllAssistantMiddlewareArgs): Promise<void> {
    const threadTs = "assistant_thread" in payload
      ? payload.assistant_thread.thread_ts
      : payload.thread_ts;
    const context = "assistant_thread" in payload
      ? payload.assistant_thread.context
      : {};
    await db.query(
      "INSERT INTO assistant_threads (thread_ts, context) VALUES ($1, $2) ON CONFLICT (thread_ts) DO UPDATE SET context = $2",
      [threadTs, context]
    );
  },
};

const assistant = new Assistant({
  threadContextStore: contextStore,
  threadStarted: async ({ saveThreadContext, say }) => {
    await saveThreadContext(); // uses custom store
    await say("Hello! I'm ready to help.");
  },
  userMessage: async ({ getThreadContext, say, setStatus }) => {
    await setStatus("Processing...");
    const ctx = await getThreadContext(); // reads from custom store
    await say(`Context channel: ${ctx?.channel_id}`);
  },
});
```

### Handling context changes with custom logic

```typescript
const assistant = new Assistant({
  threadStarted: async ({ saveThreadContext, say, setSuggestedPrompts }) => {
    await saveThreadContext();
    await say("I'll adapt to whatever channel you're viewing.");
    await setSuggestedPrompts({
      prompts: [
        { title: "What's happening?", message: "What's the latest in this channel?" },
      ],
    });
  },

  userMessage: async ({ getThreadContext, say, setStatus }) => {
    await setStatus("Looking up context...");
    const ctx = await getThreadContext();
    await say(`You're currently viewing <#${ctx?.channel_id ?? "unknown"}>.`);
  },

  threadContextChanged: async ({ event, saveThreadContext, logger }) => {
    const newChannel = event.assistant_thread.context?.channel_id;
    logger.info(`User switched to channel: ${newChannel}`);
    await saveThreadContext(); // persist the new context
  },
});
```

## pitfalls

- **Forgetting `saveThreadContext()` in `threadStarted`**: Without saving, `getThreadContext()` in `userMessage` returns empty/stale data. The initial context is only available in the `threadStarted` event.
- **Assistant middleware blocks `app.message()` handlers**: Once `app.assistant()` is registered, messages in assistant threads are consumed by the Assistant middleware and do NOT propagate to `app.message()` listeners. Don't register duplicate handlers.
- **`setSuggestedPrompts` limit of 4**: Passing more than 4 prompts causes the API to reject the call. Keep it to 4 or fewer.
- **Default context store requires bot to post first**: The `DefaultThreadContextStore` saves context as metadata on the bot's first message. If `threadStarted` doesn't call `say()`, there's no message to attach metadata to, and context storage fails silently.
- **No `ack()` in assistant handlers**: Unlike actions/commands, assistant handlers don't have an `ack()` function. Events are fire-and-forget from Slack's perspective.
- **`message.text` can be undefined**: Always handle the case where `message.text` is `undefined` (e.g., when the user sends only an attachment).

## references

- https://api.slack.com/docs/assistants
- https://slack.dev/bolt-js/concepts/assistant
- https://github.com/slackapi/bolt-js/blob/main/src/Assistant.ts
- https://github.com/slackapi/bolt-js/blob/main/src/AssistantThreadContextStore.ts

## instructions

This expert covers the Slack Assistant container for Bolt.js in TypeScript. Use it when you need to: create an AI assistant that lives in Slack's assistant panel; handle thread lifecycle events (threadStarted, userMessage, threadContextChanged); use utility functions for status indicators, suggested prompts, and thread titles; implement custom thread context stores for production persistence; and understand the middleware behavior that separates assistant threads from regular message handlers. Pair with `runtime.bolt-foundations-ts.md` for general Bolt app setup and `ui.block-kit-ts.md` for rich message formatting within assistant responses.

## research

Deep Research prompt:

"Write a micro expert on the Slack Assistant container in Bolt.js TypeScript. Cover: Assistant class constructor (threadStarted, userMessage, threadContextChanged, threadContextStore), utility functions (say, setStatus, setSuggestedPrompts, setTitle, getThreadContext, saveThreadContext), AssistantThreadContextStore interface (get, save), DefaultThreadContextStore message metadata pattern, app.assistant() registration and middleware behavior, thread lifecycle event payloads, and common patterns for AI-powered assistants. Provide 2-3 canonical TypeScript examples."
