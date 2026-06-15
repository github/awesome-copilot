# scheduling-deferred-send-ts

## purpose

Bridges Slack scheduling (chat.scheduleMessage, reminders) and Teams deferred delivery patterns for cross-platform bots targeting Slack, Teams, or both.

## rules

1. **Slack `chat.scheduleMessage` has NO Teams equivalent.** Teams has no built-in scheduled message API. Replace with: store the message + target time in persistent storage, then use a timer mechanism to send proactively at the scheduled time via `app.send(conversationId, message)`. [learn.microsoft.com -- Proactive messages](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
2. **Slack `chat.deleteScheduledMessage` → delete from your own storage/queue.** Since scheduled messages are self-managed in Teams, cancellation is simply removing the pending item from your storage (database row, queue message, cron job). No platform API call needed. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
3. **Slack `reminders.add` → persistent storage + background poll + proactive send.** Slack reminders are platform-managed with DM delivery. In Teams, the bot must: (a) store the reminder with target user/time, (b) poll or use a timer to detect due reminders, (c) send a proactive message to the user's 1:1 chat. [learn.microsoft.com -- Proactive messages](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
4. **In-process timers (`node-cron`, `setTimeout`) are for development only.** `node-cron` or `setTimeout` work for local dev and single-instance deployments. They are NOT durable — a process restart loses all scheduled items. Never use in-process timers for production scheduled messages. [npmjs.com/node-cron](https://www.npmjs.com/package/node-cron)
5. **Azure Functions timer trigger provides durable serverless scheduling.** Create a timer-triggered function that polls your database for due messages and sends them proactively. The CRON expression configures frequency (e.g., `"0 */1 * * * *"` for every minute). Azure manages the timer lifecycle across restarts. [learn.microsoft.com -- Timer trigger](https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer)
6. **Azure Queue Storage with visibility timeout enables exact-time scheduling.** Enqueue a message with `visibilityTimeout` set to the delay duration. The message becomes visible at the target time, triggering a queue-triggered function that sends the proactive message. Maximum visibility timeout is 7 days. [learn.microsoft.com -- Queue trigger](https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue-trigger)
7. **Azure Service Bus scheduled messages support exact-time delivery.** `ServiceBusSender.scheduleMessages(message, scheduledEnqueueTimeUtc)` enqueues with a future delivery time. No polling needed — Service Bus delivers at the exact time. Supports cancellation via `cancelScheduledMessage(sequenceNumber)`. Best for high-volume scheduled sends. [learn.microsoft.com -- Service Bus scheduling](https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sequencing#scheduled-messages)
8. **Power Automate "Recurrence" trigger is a no-code alternative.** For simple recurring messages (daily standup reminder, weekly digest), a Power Automate flow with a Recurrence trigger can send messages via the bot's webhook or Graph API without code. Good for business users managing their own schedules. [learn.microsoft.com -- Power Automate Recurrence](https://learn.microsoft.com/en-us/power-automate/triggers-introduction#recurrence-trigger)
9. **Store conversation references at install time for proactive messaging.** All scheduled/reminder sends require a valid conversation reference (including `serviceUrl`). Capture and persist the reference in the `install.add` handler. Without it, the bot cannot send proactive messages at scheduled time. [learn.microsoft.com -- Conversation reference](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages#get-the-conversation-reference)
10. **Rate limiting applies to bulk scheduled sends.** Teams limits bots to ~1 message/second per conversation and ~30 messages/minute per conversation. If many scheduled messages are due at the same time (e.g., "send daily digest to 500 users at 9 AM"), implement a send queue with concurrency control and staggered delivery. [learn.microsoft.com -- Rate limits](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/rate-limit)
11. **Reverse direction (Teams → Slack):** For Teams → Slack, this is simpler — Slack has native `chat.scheduleMessage` and `reminders.add` APIs. Timer-based infrastructure (Azure Functions, Queue Storage, Service Bus) can be replaced with direct Slack API calls. Map proactive send patterns to `chat.scheduleMessage` with a `post_at` Unix timestamp. Map Power Automate recurrence flows to Slack Workflow Builder scheduled triggers or `reminders.add` for user-facing reminders.

## patterns

### node-cron + proactive messaging (development / single-instance)

**Slack (before):**

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

// Schedule a message for 30 minutes from now
app.command("/remind", async ({ ack, command, client }) => {
  await ack();
  const postAt = Math.floor(Date.now() / 1000) + 30 * 60;
  const result = await client.chat.scheduleMessage({
    channel: command.channel_id,
    text: command.text,
    post_at: postAt,
  });
  await client.chat.postMessage({
    channel: command.channel_id,
    text: `Reminder set! ID: ${result.scheduled_message_id}`,
  });
});

// Cancel a scheduled message
app.command("/cancel-remind", async ({ ack, command, client }) => {
  await ack();
  await client.chat.deleteScheduledMessage({
    channel: command.channel_id,
    scheduled_message_id: command.text.trim(),
  });
  await client.chat.postMessage({
    channel: command.channel_id,
    text: "Reminder cancelled.",
  });
});
```

**Teams (after) — node-cron for dev:**

```typescript
import { App } from "@microsoft/teams.apps";
import { ConsoleLogger } from "@microsoft/teams.common";
import cron from "node-cron";

const app = new App({
  logger: new ConsoleLogger("my-bot", { level: "info" }),
});

// In-memory store (replace with database in production)
const scheduledMessages = new Map<string, {
  conversationId: string;
  text: string;
  sendAt: Date;
  cronTask?: cron.ScheduledTask;
}>();

// Store conversation references at install time
const conversationRefs = new Map<string, any>();

app.on("install.add", async ({ activity }) => {
  const convId = activity.conversation?.id ?? "";
  conversationRefs.set(convId, {
    conversationId: convId,
    serviceUrl: (activity as any).serviceUrl,
  });
});

// Schedule a reminder
app.message(/^\/?remind (.+)$/i, async ({ send, activity }) => {
  const text = activity.text?.replace(/^\/?remind\s+/i, "") ?? "";
  const convId = activity.conversation?.id ?? "";
  const id = `rem_${Date.now()}`;
  const sendAt = new Date(Date.now() + 30 * 60_000); // 30 min from now

  scheduledMessages.set(id, { conversationId: convId, text, sendAt });

  // Schedule with node-cron (NOT durable — dev only)
  const task = cron.schedule(
    cronFromDate(sendAt),
    async () => {
      await app.send(convId, text);
      scheduledMessages.delete(id);
      task.stop();
    },
    { scheduled: true }
  );

  scheduledMessages.get(id)!.cronTask = task;
  await send(`Reminder set for ${sendAt.toISOString()}. ID: ${id}`);
});

// Cancel a reminder
app.message(/^\/?cancel-remind (\S+)$/i, async ({ send, activity }) => {
  const id = activity.text?.match(/cancel-remind\s+(\S+)/i)?.[1] ?? "";
  const item = scheduledMessages.get(id);
  if (item) {
    item.cronTask?.stop();
    scheduledMessages.delete(id);
    await send("Reminder cancelled.");
  } else {
    await send("Reminder not found.");
  }
});

function cronFromDate(date: Date): string {
  return `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;
}

app.start(3978);
```

### Azure Functions timer + Cosmos DB (production)

**Timer-triggered function (polls for due messages):**

```typescript
// src/functions/sendScheduledMessages.ts
import { app as azFunc, InvocationContext, Timer } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";

const cosmos = new CosmosClient(process.env.COSMOS_CONNECTION!);
const container = cosmos.database("botdb").container("scheduled-messages");

// Runs every minute — checks for due scheduled messages
azFunc.timer("sendScheduledMessages", {
  schedule: "0 */1 * * * *", // every minute
  handler: async (timer: Timer, context: InvocationContext) => {
    const now = new Date().toISOString();

    // Query for messages due now or overdue
    const { resources: dueMessages } = await container.items
      .query({
        query: "SELECT * FROM c WHERE c.sendAt <= @now AND c.status = 'pending'",
        parameters: [{ name: "@now", value: now }],
      })
      .fetchAll();

    for (const msg of dueMessages) {
      try {
        // Send proactive message via Teams bot
        // In practice, import your Teams app instance and call app.send()
        await sendProactiveMessage(msg.conversationId, msg.text, msg.serviceUrl);

        // Mark as sent
        await container.item(msg.id, msg.conversationId).replace({
          ...msg,
          status: "sent",
          sentAt: new Date().toISOString(),
        });
      } catch (err) {
        context.error(`Failed to send scheduled message ${msg.id}:`, err);
        // Mark as failed for retry
        await container.item(msg.id, msg.conversationId).replace({
          ...msg,
          status: "failed",
          error: String(err),
        });
      }
    }

    context.log(`Processed ${dueMessages.length} scheduled messages.`);
  },
});

async function sendProactiveMessage(conversationId: string, text: string, serviceUrl: string) {
  // Use Bot Framework REST API or your Teams app instance
  // POST to {serviceUrl}/v3/conversations/{conversationId}/activities
  const response = await fetch(`${serviceUrl}/v3/conversations/${conversationId}/activities`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await getBotToken()}`,
    },
    body: JSON.stringify({
      type: "message",
      text,
    }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
}

async function getBotToken(): Promise<string> {
  // Obtain token via client credentials flow
  return "...";
}
```

**Scheduling endpoint (called from the bot handler):**

```typescript
// In your bot handler — schedule a message
app.message(/^\/?remind (.+)$/i, async ({ send, activity }) => {
  const text = activity.text?.replace(/^\/?remind\s+/i, "") ?? "";
  const convId = activity.conversation?.id ?? "";
  const sendAt = new Date(Date.now() + 30 * 60_000);

  // Persist to Cosmos DB — timer function will pick it up
  await container.items.create({
    id: `rem_${Date.now()}`,
    conversationId: convId,
    serviceUrl: (activity as any).serviceUrl,
    text,
    sendAt: sendAt.toISOString(),
    status: "pending",
    createdBy: activity.from?.aadObjectId,
  });

  await send(`Reminder set for ${sendAt.toISOString()}.`);
});
```

### Azure Service Bus scheduled messages (R7 — production, exact-time)

The most production-ready approach for exact-time delivery with native cancellation support.

```typescript
import { ServiceBusClient } from "@azure/service-bus";

const sbClient = new ServiceBusClient(process.env.SERVICEBUS_CONNECTION!);
const sender = sbClient.createSender("scheduled-messages");

// Schedule a message for exact-time delivery
async function scheduleMessage(
  conversationId: string, text: string, sendAt: Date
): Promise<Long> {
  const [sequenceNumber] = await sender.scheduleMessages(
    { body: { conversationId, text } },
    sendAt
  );
  return sequenceNumber; // store this for cancellation
}

// Cancel a scheduled message
async function cancelScheduled(sequenceNumber: Long): Promise<void> {
  await sender.cancelScheduledMessages(sequenceNumber);
}

// Receiver (runs as a separate process or Azure Function)
const receiver = sbClient.createReceiver("scheduled-messages");
receiver.subscribe({
  processMessage: async (msg) => {
    const { conversationId, text } = msg.body;
    await app.send(conversationId, text);
  },
  processError: async (err) => console.error(err),
});
```

**Bot handler integration:**

```typescript
app.message(/^\/?schedule (.+) at (.+)$/i, async ({ send, activity }) => {
  const match = activity.text?.match(/schedule (.+) at (.+)/i);
  const text = match?.[1] ?? "";
  const sendAt = new Date(match?.[2] ?? "");
  const convId = activity.conversation?.id ?? "";

  const seqNum = await scheduleMessage(convId, text, sendAt);
  // Store seqNum in database for cancellation
  await send(`Scheduled for ${sendAt.toISOString()}. Cancel ID: ${seqNum}`);
});
```

**When to use Service Bus vs other approaches:**
- **Service Bus:** High-volume, exact-time delivery, native cancellation. Best overall.
- **Queue Storage:** Simple delays under 7 days. Cheaper. No native cancellation.
- **Cosmos DB + Timer:** Unlimited delay. Minute-level precision. Most flexible.

**Reverse (Teams → Slack):** Use `chat.scheduleMessage({ channel, text, post_at })` natively.

### Scheduling approach comparison

| Approach | Durability | Precision | Max Delay | Cancellation | Best For |
|---|---|---|---|---|---|
| `setTimeout` / `node-cron` | None (lost on restart) | ~1 sec | Unlimited | In-memory | Dev only |
| Azure Functions timer | Durable | ~1 min (poll interval) | Unlimited | Delete DB row | General production |
| Queue Storage visibility timeout | Durable | ~seconds | 7 days | Delete queue message | Short delays, simple |
| Service Bus scheduled messages | Durable | ~seconds | Unlimited | `cancelScheduledMessage()` | High-volume, exact-time |
| Power Automate Recurrence | Durable | ~1 min | Unlimited | Disable flow | No-code recurring |

## pitfalls

- **In-process timers are not durable**: `setTimeout` and `node-cron` lose all scheduled items on process restart, deployment, or scaling event. Never use for production. This is the #1 migration failure — developers assume their timer survives restarts like Slack's `scheduleMessage`.
- **Missing conversation reference at send time**: Proactive messaging requires a valid `serviceUrl` and `conversationId` stored at install time. If the bot hasn't stored these, it cannot send scheduled messages. Always persist conversation references in the `install.add` handler.
- **Rate limiting on bulk sends**: Sending 500 scheduled messages at 9:00 AM will hit the ~1 msg/sec/conversation limit. Implement a staggered send queue with delays between messages. Service Bus or Queue Storage with staggered visibility timeouts helps distribute load.
- **Timer function CRON precision**: Azure Functions timer triggers run at CRON intervals (e.g., every minute), not at exact timestamps. A message scheduled for 9:00:30 may not send until 9:01:00. For higher precision, use Queue Storage visibility timeout or Service Bus scheduled messages.
- **Queue Storage 7-day visibility timeout limit**: Messages with visibility timeout > 7 days silently default to 7 days. For long-horizon scheduling (weeks/months), use a database + timer function approach instead.
- **Power Automate requires premium license for custom connectors**: Sending via the bot's API requires a custom connector or HTTP action in Power Automate, which may need a premium license depending on the organization's plan.

## references

- https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages
- https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-timer
- https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-storage-queue-trigger
- https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sequencing#scheduled-messages
- https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/rate-limit
- https://learn.microsoft.com/en-us/power-automate/triggers-introduction
- https://github.com/microsoft/teams.ts
- https://api.slack.com/methods/chat.scheduleMessage — Slack scheduled messages
- https://api.slack.com/methods/reminders.add — Slack reminders

## instructions

Use this expert when adding cross-platform support in either direction for scheduled messages, reminders, and deferred delivery. It covers: Slack `chat.scheduleMessage` bridged to Teams timer + proactive send, `reminders.add` bridged to persistent storage patterns, in-process timers (dev), Azure Functions timer triggers (production), Queue Storage visibility timeout, Service Bus scheduled messages, Power Automate Recurrence, rate limiting for bulk sends, conversation reference storage requirements, and reverse mapping from Teams deferred patterns back to Slack native scheduling APIs. Pair with `../teams/runtime.proactive-messaging-ts.md` for proactive messaging infrastructure, `../teams/state.storage-patterns-ts.md` for persisting scheduled items, and `slack-interactive-responses-to-teams-ts.md` for deferred response patterns.

## research

Deep Research prompt:

"Write a micro expert for bridging Slack scheduled messages (chat.scheduleMessage, chat.deleteScheduledMessage) and reminders (reminders.add) with Microsoft Teams deferred delivery patterns in either direction. Cover: proactive messaging with stored conversation references, in-process timers (node-cron/setTimeout) for dev, Azure Functions timer trigger for production, Queue Storage visibility timeout, Service Bus scheduled messages, Power Automate Recurrence, rate limiting for bulk sends, cancellation patterns, and reverse mapping from Teams deferred infrastructure back to Slack native scheduling APIs. Include TypeScript code examples and a comparison table."
