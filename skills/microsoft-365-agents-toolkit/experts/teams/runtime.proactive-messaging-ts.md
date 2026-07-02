# runtime.proactive-messaging-ts

## purpose

Sending messages outside of conversation turns using stored conversation references, `app.send()`, and timer/webhook-triggered notifications.

## rules

1. Proactive messaging requires a stored `conversationId`. Capture it during the `install.add` event from `activity.conversation.id` and associate it with a user identifier such as `activity.from.aadObjectId`. Without a stored conversation ID, proactive messaging is impossible. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
2. Send proactive messages with `app.send(conversationId, message)` where `message` is a string or activity object. This method is available on the `App` instance directly -- it does not require an active activity context. [github.com/microsoft/teams.ts -- apps](https://github.com/microsoft/teams.ts/tree/main/packages/apps)
3. Store conversation IDs persistently for production use. In-memory maps (e.g., `new Map<string, string>()`) work for development but are lost on restart. Use the App's `storage` (IStorage) or an external database for production deployments. [github.com/microsoft/teams.ts -- common](https://github.com/microsoft/teams.ts/tree/main/packages/common)
4. The `install.add` event fires when the bot is installed to a personal chat, team channel, or group chat. This is the canonical place to capture conversation IDs. Also consider capturing from any `activity.conversation.id` in message handlers as a fallback. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
5. For channel-scoped proactive messages, the `conversationId` format differs from personal chat. Channel conversation IDs include the channel thread ID. Store them separately and send to the correct one based on context. [learn.microsoft.com -- Proactive messages](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
6. Proactive messages can be triggered by timers (`setTimeout`, `setInterval`, cron jobs), webhooks (Express routes), external events (queue messages, database triggers), or scheduled tasks. The trigger mechanism is independent of the Teams SDK. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
7. The `ctx.ref` property on any handler context contains a `ConversationReference` that can also be stored for proactive messaging. This provides richer context (serviceUrl, channelId, bot info) beyond just the conversation ID. [github.com/microsoft/teams.ts -- apps](https://github.com/microsoft/teams.ts/tree/main/packages/apps)
8. Proactive messages require valid bot credentials (`clientId`, `clientSecret`, `tenantId`) to authenticate with the Bot Framework. The `skipAuth: true` option works only with DevTools, not for proactive messages to real Teams clients. [learn.microsoft.com -- Bot authentication](https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-authentication)
9. Rate limits apply to proactive messaging. Teams throttles bots that send too many messages too quickly. Implement exponential backoff and respect HTTP 429 responses. Batch notifications and add delays between sends for large user bases. [learn.microsoft.com -- Rate limiting](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/rate-limit)
10. Handle the `install.remove` event to clean up stored conversation IDs. When a user uninstalls the bot, proactive messages to their conversation ID will fail. Remove stale entries to avoid unnecessary API calls and errors. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)

## patterns

### Basic proactive messaging with install tracking

```typescript
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';

const app = new App({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,
  logger: new ConsoleLogger('proactive-bot', { level: 'debug' }),
  plugins: [new DevtoolsPlugin()],
});

// In-memory store (use persistent storage in production)
const conversationIds = new Map<string, string>();

// Store conversation ID when bot is installed
app.on('install.add', async ({ activity, send }) => {
  conversationIds.set(activity.from.aadObjectId!, activity.conversation.id);
  await send('Hi! I will send you reminders.');
});

// Clean up when bot is uninstalled
app.on('install.remove', async ({ activity, log }) => {
  conversationIds.delete(activity.from.aadObjectId!);
  log.info(`Removed conversation for user ${activity.from.aadObjectId}`);
});

// Send a proactive message to a specific user
async function notifyUser(userId: string, message: string): Promise<void> {
  const conversationId = conversationIds.get(userId);
  if (conversationId) {
    await app.send(conversationId, message);
  }
}

// Example: scheduled notification via timer
setTimeout(() => {
  notifyUser('user-aad-id', 'Reminder: your meeting starts in 5 minutes!');
}, 60_000);

app.on('message', async ({ send, activity }) => {
  await send(`Echo: ${activity.text}`);
});

app.start(process.env.PORT || 3978).catch(console.error);
```

### Proactive messaging from a webhook endpoint

```typescript
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger, LocalStorage } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';
import express from 'express';

interface ConversationEntry {
  conversationId: string;
  userName: string;
}

const conversationStore = new LocalStorage<ConversationEntry>();

const app = new App({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,
  logger: new ConsoleLogger('webhook-bot', { level: 'debug' }),
  storage: conversationStore,
  plugins: [new DevtoolsPlugin()],
});

// Capture conversation references from any message
app.on('message', async ({ activity, send }) => {
  const userId = activity.from.aadObjectId!;
  if (!conversationStore.get(userId)) {
    conversationStore.set(userId, {
      conversationId: activity.conversation.id,
      userName: activity.from.name || 'Unknown',
    });
  }
  await send(`Echo: ${activity.text}`);
});

app.on('install.add', async ({ activity, send }) => {
  conversationStore.set(activity.from.aadObjectId!, {
    conversationId: activity.conversation.id,
    userName: activity.from.name || 'Unknown',
  });
  await send('Installed! You will receive notifications here.');
});

// Notify all stored users (called from external webhook or scheduled job)
async function broadcastMessage(message: string): Promise<void> {
  // Note: In a real app, iterate stored entries from your database
  // and add delays between sends to respect rate limits
}

app.start(process.env.PORT || 3978).catch(console.error);
```

### Proactive messaging with Adaptive Cards

```typescript
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';

const app = new App({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,
  logger: new ConsoleLogger('card-notify-bot'),
  plugins: [new DevtoolsPlugin()],
});

const conversationIds = new Map<string, string>();

app.on('install.add', async ({ activity, send }) => {
  conversationIds.set(activity.from.aadObjectId!, activity.conversation.id);
  await send('Notifications enabled.');
});

// Send a rich Adaptive Card proactively
async function sendAlertCard(userId: string, title: string, body: string): Promise<void> {
  const conversationId = conversationIds.get(userId);
  if (!conversationId) return;

  await app.send(conversationId, {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          type: 'AdaptiveCard',
          version: '1.5',
          body: [
            { type: 'TextBlock', text: title, weight: 'Bolder', size: 'Medium' },
            { type: 'TextBlock', text: body, wrap: true },
          ],
          actions: [
            {
              type: 'Action.Submit',
              title: 'Acknowledge',
              data: { verb: 'ackAlert', userId },
            },
          ],
        },
      },
    ],
  });
}

app.on('card.action', async ({ activity, send }) => {
  const data = activity.value?.action?.data;
  if (data?.verb === 'ackAlert') {
    await send('Alert acknowledged.');
  }
});

app.on('message', async ({ send, activity }) => {
  await send(`Echo: ${activity.text}`);
});

app.start(process.env.PORT || 3978).catch(console.error);
```

## pitfalls

- **No stored conversation ID**: Without capturing the conversation ID during `install.add` or from an activity, `app.send()` has nowhere to send. Always persist conversation IDs as early as possible.
- **In-memory storage lost on restart**: Using a `Map` or plain object for conversation IDs means all stored IDs vanish when the process restarts. Use persistent storage (database, Azure Table Storage, etc.) in production.
- **Missing bot credentials for proactive sends**: `app.send()` authenticates with the Bot Framework using `clientId`/`clientSecret`/`tenantId`. Without valid credentials, proactive messages fail with 401 errors.
- **Rate limiting / throttling**: Teams throttles bots that send too many proactive messages. A burst of notifications to thousands of users triggers HTTP 429 responses. Add delays (e.g., 1-2 seconds between sends) and implement retry logic with exponential backoff.
- **Stale conversation IDs**: When a user uninstalls the bot, the conversation ID becomes invalid. Sending to it produces errors. Handle `install.remove` to prune stale entries.
- **Channel vs personal conversation IDs**: Channel and personal chat conversation IDs have different formats. A conversation ID captured from a channel install targets that channel's general thread, not individual users. Map them correctly based on your notification requirements.
- **Proactive messages in DevTools only**: With `skipAuth: true` and no real credentials, proactive messaging works in DevTools but fails against real Teams clients. Always test with real Azure Bot credentials before deploying.
- **Forgetting error handling on `app.send()`**: The `app.send()` call can throw (network errors, invalid conversation ID, rate limits). Always wrap in try/catch or handle the rejected Promise.

## references

- [Teams SDK v2 GitHub repository](https://github.com/microsoft/teams.ts)
- [Teams: Send proactive messages](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
- [Teams: Bot rate limiting](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/rate-limit)
- [Bot Framework: Conversation reference](https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-api-reference)
- [Teams: Conversation events (install)](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/subscribe-to-conversation-events)

## instructions

This expert covers proactive messaging in Teams SDK v2 -- sending messages to users outside of a direct conversation turn. Use it when you need to:

- Capture and store conversation IDs on bot install (`install.add`)
- Send proactive messages using `app.send(conversationId, message)`
- Trigger notifications from timers, webhooks, external events, or scheduled jobs
- Send proactive Adaptive Cards (not just text)
- Handle the difference between personal chat and channel conversation IDs
- Implement cleanup on `install.remove` to prune stale references
- Understand rate limiting and throttling constraints for bulk notifications

Pair with `runtime.app-init-ts.md` for App constructor setup (credentials are required for proactive messaging) and `runtime.routing-handlers-ts.md` for the `install.add` / `install.remove` route registration. Pair with `state.storage-patterns-ts.md` for persisting conversation IDs across restarts, and `runtime.app-init-ts.md` for App credentials required by proactive sends.

## research

Deep Research prompt:

"Write a micro expert on proactive messaging in Teams SDK v2 (TypeScript). Cover capturing conversation IDs on install.add from activity.conversation.id and activity.from.aadObjectId, storing references persistently, sending with app.send(conversationId, message), ConversationReference from ctx.ref, timer/webhook/cron-triggered sends, channel vs personal chat conversation ID differences, rate limiting and throttling (HTTP 429, backoff), cleanup on install.remove, sending Adaptive Cards proactively, and error handling. Include 2-3 canonical patterns (basic install tracking, webhook-triggered, rich card notifications) and common failure modes."
