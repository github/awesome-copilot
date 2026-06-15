# runtime.bolt-foundations-ts

## purpose

Core Slack Bolt app structure: App constructor, middleware, event loop, and handler registration patterns in TypeScript.

## rules

1. Initialize the Bolt `App` with at minimum `token` (bot OAuth token) and `signingSecret` (request verification); for socket mode add `socketMode: true` and `appToken`. Never hard-code secrets -- pull from `process.env`. [slack.dev/bolt-js/getting-started](https://slack.dev/bolt-js/getting-started)
2. Call `await app.start(port)` to launch the HTTP receiver (default Express). In socket mode the port argument is ignored and a WebSocket connection is established instead. [slack.dev/bolt-js/concepts/socket-mode](https://slack.dev/bolt-js/concepts/socket-mode)
3. Register handlers by type: `app.message()` for messages, `app.command()` for slash commands, `app.action()` for Block Kit interactions, `app.view()` for modal submissions, `app.event()` for Events API, `app.shortcut()` for global/message shortcuts, and `app.options()` for dynamic select menus. Each handler type receives a different payload shape. [slack.dev/bolt-js/reference](https://slack.dev/bolt-js/reference)
4. Every handler receives a context object with named properties. Common properties include `say` (post to the conversation), `respond` (hit the response_url), `client` (Slack WebClient), `body` (full payload), `ack` (acknowledge the request), `next` (pass to next middleware), and `context` (app-level metadata like botUserId). [slack.dev/bolt-js/concepts/listener-middleware](https://slack.dev/bolt-js/concepts/listener-middleware)
5. `app.message()` accepts a string, RegExp, or no argument (catch-all). String matching is substring-based. For exact matching use a RegExp with anchors (e.g., `/^hello$/i`). [slack.dev/bolt-js/concepts/message-listening](https://slack.dev/bolt-js/concepts/message-listening)
6. Use `app.use()` to register global middleware that runs before all route handlers. Middleware must call `await next()` to continue to the next middleware or handler; omitting `next()` silently swallows the event. [slack.dev/bolt-js/concepts/global-middleware](https://slack.dev/bolt-js/concepts/global-middleware)
7. Register `app.error(async (error) => { ... })` for global error handling. Unhandled errors in listeners bubble to this handler. Without it, errors are logged to stderr and the process continues. [slack.dev/bolt-js/concepts/error-handling](https://slack.dev/bolt-js/concepts/error-handling)
8. The `client` property in handler context is a pre-authenticated `WebClient` bound to the bot token. Use it for Slack API calls like `client.chat.postMessage()`, `client.views.open()`, `client.users.info()`, etc. For workspace-level calls needing a user token, instantiate a separate `WebClient`. [slack.dev/bolt-js/concepts/web-api](https://slack.dev/bolt-js/concepts/web-api)
9. Handler registration order matters: Bolt evaluates listeners in registration order and stops at the first match for `app.message()`. Place more specific patterns before catch-all handlers. [slack.dev/bolt-js/concepts/message-listening](https://slack.dev/bolt-js/concepts/message-listening)
10. The `say()` function posts a message to the same channel where the event occurred. It accepts a string or a full message payload with `blocks`, `text`, `thread_ts`, and `attachments`. For posting to a different channel, use `client.chat.postMessage()` with an explicit `channel` parameter. [slack.dev/bolt-js/concepts/message-sending](https://slack.dev/bolt-js/concepts/message-sending)

## patterns

### Initializing a Bolt app with socket mode and registering middleware

```typescript
import { App, LogLevel } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN!,
  logLevel: LogLevel.INFO,
});

// Global middleware -- runs before every handler
app.use(async ({ next, context, logger }) => {
  logger.info(`Event from user ${context.userId ?? "unknown"}`);
  await next();
});

// Global error handler
app.error(async (error) => {
  console.error("Unhandled error:", error);
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("Bolt app is running");
})();
```

### Registering message handlers with pattern matching

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

// Exact keyword match via RegExp
app.message(/^hello$/i, async ({ message, say }) => {
  if (message.subtype) return; // skip message_changed, etc.
  await say(`Hey there <@${(message as any).user}>!`);
});

// Substring match -- triggers on any message containing "help"
app.message("help", async ({ say }) => {
  await say("Here are things I can help with...");
});

// Catch-all: fires for every message not matched above
app.message(async ({ message, say, client }) => {
  if (message.subtype) return;
  const userId = (message as any).user;
  const userInfo = await client.users.info({ user: userId });
  await say(`Got it, ${userInfo.user?.real_name ?? "friend"}.`);
});
```

### Registering multiple handler types on a single app

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

// Slash command
app.command("/status", async ({ ack, say, command }) => {
  await ack();
  await say(`Status requested by <@${command.user_id}>`);
});

// Block Kit button action
app.action("approve_btn", async ({ ack, respond }) => {
  await ack();
  await respond({ replace_original: true, text: "Approved!" });
});

// Events API -- channel member joined
app.event("member_joined_channel", async ({ event, say }) => {
  await say(`Welcome to the channel, <@${event.user}>!`);
});

// Modal view submission
app.view("feedback_modal", async ({ ack, view, client }) => {
  const vals = view.state.values;
  const comment = vals.comment_block.comment_input.value!;
  await ack();
  await client.chat.postMessage({
    channel: "#feedback",
    text: `New feedback: ${comment}`,
  });
});

// Global shortcut
app.shortcut("open_ticket", async ({ ack, shortcut, client }) => {
  await ack();
  await client.views.open({
    trigger_id: shortcut.trigger_id,
    view: {
      type: "modal",
      callback_id: "ticket_modal",
      title: { type: "plain_text", text: "New Ticket" },
      submit: { type: "plain_text", text: "Create" },
      blocks: [
        {
          type: "input",
          block_id: "title_block",
          label: { type: "plain_text", text: "Title" },
          element: { type: "plain_text_input", action_id: "title_input" },
        },
      ],
    },
  });
});

// Dynamic options for external select menus
app.options("user_search_options", async ({ ack, options }) => {
  const query = options.value;
  const matches = await searchUsers(query);
  await ack({
    options: matches.map((u) => ({
      text: { type: "plain_text" as const, text: u.name },
      value: u.id,
    })),
  });
});

async function searchUsers(query: string) {
  return [{ name: "Alice", id: "U001" }];
}

(async () => {
  await app.start(3000);
  console.log("App running on port 3000");
})();
```

## pitfalls

- **Forgetting `await next()` in middleware**: Global middleware registered with `app.use()` must call `await next()` or downstream handlers never execute. The event is silently dropped with no error.
- **Not checking `message.subtype`**: Bot messages, message edits (`message_changed`), and deletions (`message_deleted`) all trigger `app.message()`. Filter on `subtype` to avoid infinite loops or duplicate processing.
- **Registering catch-all before specific handlers**: `app.message()` with no pattern matches everything. If registered first, more specific `app.message("keyword")` handlers are never reached.
- **Confusing `say` and `respond`**: `say()` posts a new visible message to the channel. `respond()` uses the `response_url` (only available in command/action payloads) and can post ephemerally or replace the original message. Using `respond()` in an event handler where no `response_url` exists throws an error.
- **Missing `ack()` in interactive handlers**: Commands, actions, views, shortcuts, and options handlers must call `ack()` within 3 seconds. Message and event handlers do not require `ack()`. Calling `ack()` where it does not exist throws a runtime error.
- **Using `say()` in non-conversational contexts**: Global shortcuts and some events do not have a channel context. Calling `say()` fails with "channel not found". Use `client.chat.postMessage()` with an explicit channel instead.
- **Socket mode with HTTP receiver**: Setting `socketMode: true` without providing `appToken` throws immediately. Conversely, providing `appToken` without `socketMode: true` ignores it and uses the HTTP receiver.

## references

- https://slack.dev/bolt-js/getting-started
- https://slack.dev/bolt-js/concepts/basic
- https://slack.dev/bolt-js/concepts/message-listening
- https://slack.dev/bolt-js/concepts/actions
- https://slack.dev/bolt-js/concepts/commands
- https://slack.dev/bolt-js/concepts/events
- https://slack.dev/bolt-js/concepts/view-submissions
- https://slack.dev/bolt-js/concepts/global-middleware
- https://slack.dev/bolt-js/concepts/error-handling
- https://slack.dev/bolt-js/concepts/socket-mode
- https://slack.dev/bolt-js/reference
- https://api.slack.com/methods
- https://github.com/slackapi/bolt-js

## instructions

This expert covers the foundational structure of a Slack Bolt application in TypeScript. Use it when you need to: set up an App instance with the correct constructor options (token, signingSecret, socketMode, appToken); register handlers for messages, commands, actions, views, events, shortcuts, and options menus; wire up global middleware with app.use(); understand the context object properties available in each handler type (say, respond, client, body, ack, next); implement global error handling with app.error(); and understand handler registration order and event routing. This is the starting point for any Slack Bolt project and the foundation for all other Slack expert files. Pair with `runtime.ack-rules-ts.md` for acknowledgement timing rules that apply to all interactive handlers.

## research

Deep Research prompt:

"Write a micro expert on Slack Bolt for JavaScript/TypeScript app foundations: App constructor options (token, signingSecret, socketMode, appToken, logLevel), app.start(), all handler registration methods (app.message, app.command, app.action, app.view, app.event, app.shortcut, app.options), global middleware with app.use() and next(), the context object shape for each handler type, and app.error() global error handling. Provide 2-3 canonical TypeScript examples and common pitfalls."
