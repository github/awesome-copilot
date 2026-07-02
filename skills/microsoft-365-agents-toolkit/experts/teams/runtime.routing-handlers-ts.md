# runtime.routing-handlers-ts

## purpose

Routing patterns: message handlers, event handlers, invoke routes, middleware, pattern matching, and all available route names in Teams SDK v2.

## rules

1. Use `app.on(routeName, handler)` for activity-based routes and invoke routes. The handler receives an activity context (`ctx`) with properties and methods for that activity type. Always destructure only what you need. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
2. Use `app.message(pattern, handler)` for pattern-matched message handling. The `pattern` argument accepts a `string` (exact match) or `RegExp`. String patterns match the full message text; regex patterns test against `activity.text`. Multiple `app.message()` calls are evaluated in registration order -- first match wins. [github.com/microsoft/teams.ts -- apps](https://github.com/microsoft/teams.ts/tree/main/packages/apps)
3. Register middleware with `app.use(handler)`. Middleware runs before all route handlers for every activity. Call `ctx.next()` inside middleware to pass control to the next middleware or the matched route handler. Omitting `ctx.next()` short-circuits the pipeline. [github.com/microsoft/teams.ts -- apps](https://github.com/microsoft/teams.ts/tree/main/packages/apps)
4. Activity routes include: `message`, `conversationUpdate`, `typing`, `messageUpdate`, `messageDelete`, `event`, `endOfConversation`, `contactRelationUpdate`, `mention`, and `activity` (catch-all fallback). The `activity` route fires only if no more-specific route matched. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
5. Install routes are `install.add` (bot installed to conversation/team) and `install.remove` (bot uninstalled). Use `install.add` to send welcome messages and store conversation IDs for proactive messaging. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
6. Invoke routes map to Teams invoke names: `dialog.open` (`task/fetch`), `dialog.submit` (`task/submit`), `card.action` (`adaptiveCard/action`), `message.ext.query` (`composeExtension/query`), `message.ext.select-item` (`composeExtension/selectItem`), `message.ext.submit` (`composeExtension/submitAction`), `message.ext.open` (`composeExtension/fetchTask`), `message.ext.query-link` (`composeExtension/queryLink`), `message.ext.setting` (`composeExtension/setting`). Invoke handlers must return a response object with `status` and `body`. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
7. Additional invoke routes: `config.open` (`config/fetch`), `config.submit` (`config/submit`), `tab.open` (`tab/fetch`), `tab.submit` (`tab/submit`), `signin.token-exchange` (`signin/tokenExchange`), `signin.verify-state` (`signin/verifyState`), `file.consent` (`fileConsent/invoke`), `handoff.action` (`handoff/action`), `message.submit` (`message/submitAction`). [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
8. App-level events (registered with `app.event()`, not `app.on()`) include: `start` (server listening), `signin` (user completed OAuth), `error` (unhandled error), `activity` (every inbound activity), and `activity.sent` (every outbound activity). These are lifecycle observers, not route handlers. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
9. Feedback handling uses `app.on('message.submit.feedback', handler)` where `activity.value.actionValue.reaction` is `'like'` or `'dislike'` and `activity.value.actionValue.feedback` contains optional text. Return `{ status: 200 }` from the handler. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
10. Register all handlers and middleware before calling `app.start()`. The route matching order is: middleware (in registration order) -> `app.message()` pattern matches (first match wins) -> `app.on()` specific routes -> `app.on('activity')` catch-all. [github.com/microsoft/teams.ts -- apps](https://github.com/microsoft/teams.ts/tree/main/packages/apps)

## patterns

### Message handlers with pattern matching

```typescript
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';

const app = new App({
  logger: new ConsoleLogger('router-bot', { level: 'debug' }),
  plugins: [new DevtoolsPlugin()],
});

// Exact string match
app.message('/help', async ({ send }) => {
  await send('Here is how I can help...');
});

// RegExp pattern match (case-insensitive)
app.message(/^hello/i, async ({ send }) => {
  await send('Hi there!');
});

// Catch-all message handler (runs if no pattern matched above)
app.on('message', async ({ send, activity }) => {
  await send(`You said "${activity.text}"`);
});

app.start(3978);
```

### Middleware, install handlers, and invoke routes

```typescript
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';

const app = new App({
  logger: new ConsoleLogger('full-bot', { level: 'debug' }),
  plugins: [new DevtoolsPlugin()],
});

// --- Middleware: runs before all route handlers ---
app.use(async (ctx) => {
  ctx.log.info(`Received: ${ctx.activity.type}`);
  await ctx.next();
});

// --- Install routes ---
app.on('install.add', async ({ send }) => {
  await send('Thanks for installing me!');
});

app.on('install.remove', async ({ activity, log }) => {
  log.info(`Uninstalled from ${activity.conversation.id}`);
});

// --- Dialog invoke routes (return response objects) ---
app.on('dialog.open', async ({ send }) => {
  return {
    status: 200,
    body: {
      task: {
        type: 'continue',
        value: {
          title: 'My Dialog',
          card: {
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: {
              type: 'AdaptiveCard',
              version: '1.5',
              body: [{ type: 'TextBlock', text: 'Enter data below' }],
            },
          },
        },
      },
    },
  };
});

app.on('dialog.submit', async ({ activity }) => {
  const formData = activity.value.data;
  return {
    status: 200,
    body: {
      task: { type: 'message', value: 'Form submitted successfully!' },
    },
  };
});

// --- Card action handler ---
app.on('card.action', async ({ activity, send }) => {
  const data = activity.value;
  await send(`Card action received: ${JSON.stringify(data)}`);
});

// --- Feedback handler ---
app.on('message.submit.feedback', async ({ activity, log }) => {
  const feedback = {
    messageId: activity.replyToId || activity.id,
    reaction: activity.value.actionValue.reaction,
    feedback: activity.value.actionValue.feedback,
  };
  log.info('Feedback received:', feedback);
  return { status: 200 };
});

// --- Catch-all fallback ---
app.on('message', async ({ send, activity }) => {
  await send(`Echo: ${activity.text}`);
});

app.start(3978);
```

### App-level lifecycle events

```typescript
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';
import * as endpoints from '@microsoft/teams.graph-endpoints';

const app = new App({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,
  oauth: { defaultConnectionName: 'graph' },
  logger: new ConsoleLogger('lifecycle-bot'),
  plugins: [new DevtoolsPlugin()],
});

// Fires when server starts listening
app.event('start', (logger) => {
  logger.info('Bot started');
});

// Fires after successful OAuth sign-in
app.event('signin', async ({ send, userGraph }) => {
  const me = await userGraph.call(endpoints.me.get);
  await send(`Welcome, ${me.displayName}!`);
});

// Fires on unhandled errors
app.event('error', ({ error, log }) => {
  log.error('Unhandled error:', error);
});

// Fires for every inbound activity (observer, not a route)
app.event('activity', ({ activity }) => {
  // Logging, telemetry, analytics
});

// Fires after every outbound activity
app.event('activity.sent', ({ activity }) => {
  // Track sent messages
});

app.start(process.env.PORT || 3978).catch(console.error);
```

## pitfalls

- **Forgetting `ctx.next()` in middleware**: Without it, the pipeline stops and no route handler fires. The request appears to hang or silently succeed without processing.
- **Registering `app.on('message')` before `app.message()` patterns**: The generic `message` handler may consume the activity before pattern-matched handlers run. Register `app.message()` calls first, then `app.on('message')` as a catch-all.
- **Not returning from invoke handlers**: Dialog, card action, and message extension handlers must return a response object with `status` and `body`. Returning `undefined` causes the Teams client to show an error or hang.
- **Confusing `app.on()` with `app.event()`**: `app.on('message', ...)` is an activity route handler. `app.event('start', ...)` is a lifecycle event. Using the wrong method means your handler never fires.
- **Missing manifest scopes for routes**: If the manifest `bots.scopes` does not include `"team"`, the bot never receives activities from channels. If `"personal"` is missing, 1:1 chat does not work. Match scopes to your route expectations.
- **Using `send()` vs `reply()`**: `send()` creates a new top-level message. `reply()` threads under the current message. In channels, `reply()` is usually what you want to keep conversations organized.
- **Duplicate route registration**: Registering the same route name twice does not throw an error -- the second handler replaces or competes with the first. Be explicit about which handler owns each route.
- **Forgetting `message.submit.feedback` handler**: If you use `.addFeedback()` on outbound messages but never register the feedback handler, thumbs up/down clicks fail silently in the Teams client.

## references

- [Teams SDK v2 GitHub repository](https://github.com/microsoft/teams.ts)
- [Teams SDK v2 -- @microsoft/teams.apps](https://github.com/microsoft/teams.ts/tree/main/packages/apps)
- [Teams platform: Bot activity handlers](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/bot-basics)
- [Teams platform: Task modules and cards](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/what-are-task-modules)
- [Teams platform: Message extensions](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/what-are-messaging-extensions)
- [Teams platform: Conversation events](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/subscribe-to-conversation-events)

## instructions

This expert covers all routing and event handling in Teams SDK v2. Use it when you need to:

- Register message handlers with `app.on('message')` or pattern-matched handlers with `app.message()`
- Implement middleware with `app.use()` and understand the `next()` pipeline
- Handle invoke routes for dialogs (`dialog.open`, `dialog.submit`), card actions (`card.action`), message extensions (`message.ext.*`), tabs, config, and sign-in
- Handle install/uninstall events (`install.add`, `install.remove`)
- Register app-level lifecycle events (`start`, `signin`, `error`, `activity`, `activity.sent`)
- Handle user feedback from `.addFeedback()` buttons via `message.submit.feedback`
- Understand route matching order and fallback behavior

Pair with `runtime.app-init-ts.md` for App constructor patterns and `ui.adaptive-cards-ts.md` for card action handler details. Pair with `runtime.app-init-ts.md` for App constructor setup before registering handlers, and `ui.adaptive-cards-ts.md` for card.action handler details.

## research

Deep Research prompt:

"Write a micro expert for Teams SDK v2 routing and event handling in TypeScript. Cover app.on() vs app.message() vs app.event(), string and RegExp pattern matching, middleware with app.use() and ctx.next(), all activity routes (message, conversationUpdate, typing, messageUpdate, messageDelete, event, endOfConversation, contactRelationUpdate, mention, activity catch-all), install routes (install.add, install.remove), all invoke routes (dialog.open/submit, card.action, message.ext.query/select-item/submit/open/query-link/setting, config.open/submit, tab.open/submit, signin.token-exchange/verify-state, file.consent, handoff.action, message.submit, message.submit.feedback), app-level lifecycle events (start, signin, error, activity, activity.sent), invoke handler return contracts, and route matching order. Include canonical patterns and common mistakes."
