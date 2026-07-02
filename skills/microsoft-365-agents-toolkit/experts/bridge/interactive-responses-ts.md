# interactive-responses-ts

## purpose

Bridges Slack interactive response patterns (respond, replace_original, ephemeral) and Teams card/message update patterns for cross-platform bots targeting Slack, Teams, or both.

## rules

1. **Slack `respond({ replace_original: true })` → Teams invoke response with card.** In Slack, `respond()` with `replace_original` replaces the message that triggered the interaction. In Teams, return a new Adaptive Card from the `card.action` handler's return value — the Bot Framework replaces the card inline. The handler must return `{ status: 200, body: { ... } }` with the replacement card. [learn.microsoft.com -- Universal Actions](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/universal-actions-for-adaptive-cards/overview)
2. **Slack `respond({ delete_original: true })` → Teams `deleteActivity(activityId)`.** Slack's delete-original flag removes the message. In Teams, call `deleteActivity(activityId)` on the turn context. You must store the original activity ID (from the `send()` return value or `activity.replyToId`) to delete it later. [learn.microsoft.com -- Delete activity](https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-delete-activity)
3. **Slack `chat.update(channel, ts, ...)` → Teams `updateActivity(activityId, activity)`.** Both platforms support editing a bot's own message after sending. The key difference: Slack identifies messages by `channel + ts`, Teams uses `activityId` (returned from `send()`). Store the activity ID at send time. [learn.microsoft.com -- Update activity](https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-update-activity)
4. **Slack `chat.postEphemeral()` has NO Teams equivalent.** Ephemeral messages visible only to one user do not exist in Teams. Redesign strategies: (a) send a message in the user's 1:1 bot chat, (b) use `Action.Execute` with `refresh.userIds` to show per-user card content, (c) simply send a visible message if privacy is not critical, (d) use a task module/dialog for private interaction. [learn.microsoft.com -- Conversations](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/conversation-basics)
5. **Deferred response pattern: send "processing..." card, update later.** Slack's `response_url` allows 5 follow-up messages within 30 minutes. Teams has no `response_url` concept. Instead: (a) return a "Processing..." card from the invoke handler immediately, (b) store the conversation reference and activity ID, (c) use proactive messaging to update the card when processing completes. No expiry limit on updates. [learn.microsoft.com -- Proactive messages](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
6. **Slack `response_url` (30-min, 5 follow-ups) → `send()` / `updateActivity()` with no expiry.** Slack's response_url is a webhook with time and count limits. Teams' `send()` and `updateActivity()` work indefinitely as long as you have a valid conversation reference. This is actually more flexible — but requires you to store conversation references yourself. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
7. **`Action.Execute` with `refresh.userIds` enables per-user card views.** Slack broadcasts the same message to everyone; only the interacting user sees ephemeral responses. Teams' `Action.Execute` with `refresh` can show different card content to different users — up to 60 user IDs per card. When specified users view the card, Teams automatically invokes the bot to get their personalized version. [learn.microsoft.com -- User-specific views](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/universal-actions-for-adaptive-cards/user-specific-views)
8. **Store activity IDs at send time.** Every `send()` in Teams returns an activity ID (or resource response). Store this ID if you need to update or delete the message later. Slack uses `channel + ts`; Teams uses a single opaque `activityId` string. Failing to store the ID means you cannot update the message. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
9. **Slack `respond({ response_type: 'in_channel' })` → `send()`.** Slack's `in_channel` response type makes an ephemeral-by-default response visible to everyone. In Teams, all bot messages are visible by default — simply call `send()`. There is no visibility toggle. [learn.microsoft.com -- Bot messages](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/conversation-messages)
10. **Card action handler must return within 3 seconds.** Teams invoke activities (including `Action.Execute` and `Action.Submit`) require a synchronous response within ~3 seconds. If processing takes longer, return a "processing" card immediately and update asynchronously via proactive messaging. Slack's `response_url` had a 30-minute window; Teams' invoke has a 3-second window. [learn.microsoft.com -- Invoke activities](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/conversation-messages)
11. **Reverse direction (Teams → Slack):** For Teams → Slack, map `updateActivity` to `respond({ replace_original: true })`, and card refresh (`Action.Execute` with `refresh.userIds`) to ephemeral messages via `chat.postEphemeral`. `deleteActivity` maps to `chat.delete(channel, ts)`. The 3-second invoke deadline has no Slack equivalent -- Slack's `response_url` gives 30 minutes, which is more lenient.

## patterns

### Card replacement flow (replace_original → invoke response)

**Slack (before):**

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

// Send initial message with a button
app.command("/approve", async ({ ack, respond }) => {
  await ack();
  await respond({
    response_type: "in_channel",
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: "Request #123 needs approval" },
        accessory: {
          type: "button",
          text: { type: "plain_text", text: "Approve" },
          action_id: "approve_request",
          value: "123",
        },
      },
    ],
  });
});

// Replace the original message when button is clicked
app.action("approve_request", async ({ ack, respond, body }) => {
  await ack();
  await respond({
    replace_original: true,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Request #123 — *Approved* by <@${body.user.id}>`,
        },
      },
    ],
  });
});
```

**Teams (after):**

```typescript
import { App } from "@microsoft/teams.apps";
import { ConsoleLogger } from "@microsoft/teams.common";

const app = new App({
  logger: new ConsoleLogger("my-bot", { level: "info" }),
});

// Send initial approval card
app.message(/^\/?approve$/i, async ({ send }) => {
  const response = await send({
    attachments: [{
      contentType: "application/vnd.microsoft.card.adaptive",
      content: {
        type: "AdaptiveCard",
        version: "1.5",
        body: [
          { type: "TextBlock", text: "Request #123 needs approval", weight: "Bolder" },
        ],
        actions: [{
          type: "Action.Execute",
          title: "Approve",
          verb: "approveRequest",
          data: { requestId: "123" },
        }],
      },
    }],
  });
  // Store response.id if you need to update/delete later via proactive messaging
});

// Handle Action.Execute — return replacement card (replaces replace_original)
app.on("card.action" as any, async ({ activity }) => {
  const data = activity.value?.action?.data ?? activity.value;
  if (data?.verb === "approveRequest") {
    const approver = activity.from?.name ?? "Someone";
    // Returning a card from the handler replaces the original card inline
    return {
      status: 200,
      body: {
        type: "AdaptiveCard",
        version: "1.5",
        body: [
          {
            type: "TextBlock",
            text: `Request #${data.requestId} — **Approved** by ${approver}`,
            wrap: true,
          },
        ],
        // No actions = card becomes read-only after approval
      },
    };
  }
});

app.start(3978);
```

### Deferred response with processing indicator

**Slack (before):**

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

app.action("run_report", async ({ ack, respond }) => {
  await ack();

  // Immediate feedback
  await respond({ replace_original: true, text: "Generating report..." });

  // Long-running task — uses response_url (valid for 30 min, 5 follow-ups)
  const report = await generateReport(); // takes 15 seconds
  await respond({
    replace_original: true,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `Report ready: ${report.url}` },
      },
    ],
  });
});
```

**Teams (after):**

```typescript
import { App } from "@microsoft/teams.apps";
import { ConsoleLogger } from "@microsoft/teams.common";

const app = new App({
  logger: new ConsoleLogger("my-bot", { level: "info" }),
});

// Store conversation references for proactive updates
const conversationRefs = new Map<string, any>();

app.on("card.action" as any, async ({ activity, send }) => {
  const data = activity.value?.action?.data ?? activity.value;
  if (data?.verb === "runReport") {
    // Store conversation reference for later proactive update
    const convRef = {
      conversationId: activity.conversation?.id,
      serviceUrl: (activity as any).serviceUrl,
    };

    // Return "processing" card immediately (must respond within 3 seconds)
    const processingCard = {
      status: 200,
      body: {
        type: "AdaptiveCard",
        version: "1.5",
        body: [
          { type: "TextBlock", text: "Generating report...", isSubtle: true },
          {
            type: "TextBlock",
            text: "This may take a moment. The card will update when ready.",
            wrap: true,
            size: "Small",
          },
        ],
      },
    };

    // Kick off async work — update the card when done
    // No 30-minute expiry like Slack's response_url
    setImmediate(async () => {
      try {
        const report = await generateReport();
        // Proactive message to update the card
        await send({
          attachments: [{
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
              type: "AdaptiveCard",
              version: "1.5",
              body: [
                { type: "TextBlock", text: "Report Ready", weight: "Bolder" },
                { type: "TextBlock", text: `[Download Report](${report.url})`, wrap: true },
              ],
            },
          }],
        });
      } catch (err) {
        await send("Report generation failed. Please try again.");
      }
    });

    return processingCard;
  }
});

async function generateReport() {
  // Simulate long-running work
  await new Promise((r) => setTimeout(r, 15000));
  return { url: "https://example.com/report.pdf" };
}

app.start(3978);
```

### Ephemeral workaround: `refresh.userIds` (R1)

Use `Action.Execute` with `refresh.userIds` to show personalized card content to specific users — the closest Teams equivalent to Slack's `chat.postEphemeral()`.

```typescript
// Send a card where only the acting user sees personalized content
async function sendWithEphemeralView(
  send: (msg: any) => Promise<any>,
  actingUserId: string,
  publicText: string,
  privateData: Record<string, unknown>
): Promise<void> {
  await send({
    attachments: [{
      contentType: "application/vnd.microsoft.card.adaptive",
      content: {
        type: "AdaptiveCard",
        version: "1.4",
        refresh: {
          action: {
            type: "Action.Execute",
            verb: "personalView",
            data: privateData,
          },
          userIds: [actingUserId], // max 60 IDs
        },
        body: [
          { type: "TextBlock", text: publicText }, // everyone sees this
        ],
      },
    }],
  });
}

// When the specified user views the card, Teams invokes the bot:
app.on("card.action" as any, async ({ activity }) => {
  const data = activity.value?.action?.data ?? activity.value;
  if (data?.verb === "personalView") {
    return {
      status: 200,
      body: {
        type: "AdaptiveCard",
        version: "1.4",
        body: [
          { type: "TextBlock", text: "This content is only visible to you.", weight: "Bolder" },
          { type: "FactSet", facts: [
            { title: "Request ID", value: data.requestId },
            { title: "Status", value: "Pending your review" },
          ]},
        ],
      },
    };
  }
});
```

**Key constraints:** Max 60 user IDs per card. Requires `Action.Execute` (not `Action.Submit`). Manifest version must be ≥1.12.

**Reverse (Teams → Slack):** Map card refresh to `chat.postEphemeral(channel, user, { blocks })`.

### Card version checking (Y11)

Inject a `_version` counter into `Action.Submit.data` to prevent race conditions — the Teams equivalent of Slack's `view_hash` parameter.

```typescript
// Track version per card instance
const cardVersions = new Map<string, number>();

function buildVersionedCard(cardId: string, data: any): object {
  const version = (cardVersions.get(cardId) ?? 0) + 1;
  cardVersions.set(cardId, version);
  return {
    type: "AdaptiveCard", version: "1.5",
    body: [/* card content */],
    actions: [{
      type: "Action.Submit", title: "Update",
      data: { ...data, _cardId: cardId, _version: version },
    }],
  };
}

app.on("card.action" as any, async ({ activity, send }) => {
  const submitted = activity.value?.action?.data ?? activity.value;
  const currentVersion = cardVersions.get(submitted?._cardId);
  if (submitted?._version !== currentVersion) {
    await send("This card is outdated. Please use the latest version.");
    return { status: 200 };
  }
  // Process the update safely...
});
```

**Don't:** Skip version checking even for low-traffic bots — fast double-clicks and multiple tabs cause race conditions.

**Reverse (Teams → Slack):** Use `view_hash` from `views.open()` / `views.update()` responses natively.

### Response pattern mapping table

| Slack Pattern | Teams Equivalent | Notes |
|---|---|---|
| `respond({ replace_original: true, blocks })` | Return card from `card.action` handler | Inline card replacement |
| `respond({ delete_original: true })` | `deleteActivity(activityId)` | Must store activity ID |
| `respond({ response_type: 'in_channel' })` | `send(text)` | All Teams messages are visible |
| `respond({ response_type: 'ephemeral' })` | *(no equivalent)* | Redesign: 1:1 chat, Action.Execute refresh, or visible |
| `chat.update(channel, ts, ...)` | `updateActivity(activityId, activity)` | Store activity ID from send() |
| `chat.delete(channel, ts)` | `deleteActivity(activityId)` | Store activity ID from send() |
| `chat.postEphemeral(channel, user, ...)` | *(no equivalent)* | Use Action.Execute `refresh.userIds` for per-user views |
| `response_url` (30-min, 5 follow-ups) | `send()` / `updateActivity()` | No expiry, no count limit |
| Button click → `ack()` + `respond()` | `card.action` handler → return card | No ack needed |

## pitfalls

- **Forgetting to store activity IDs**: Unlike Slack where `channel + ts` identifies any message, Teams requires the `activityId` returned from `send()`. If you don't store it, you cannot update or delete the message later. This is the #1 migration failure for interactive patterns.
- **3-second invoke timeout**: Slack's `ack()` gave you 3 seconds to acknowledge, then `response_url` gave 30 minutes for follow-up. Teams invoke handlers must return the full response (including replacement card) within ~3 seconds. Anything longer requires the deferred pattern (return processing card, update proactively).
- **No ephemeral messages — silent behavioral change**: Code using `chat.postEphemeral()` will not error during migration — it simply has no equivalent. The migrated bot must explicitly choose an alternative strategy. Audit all `postEphemeral` calls before migration.
- **`Action.Execute` vs `Action.Submit`**: `Action.Submit` sends data to the bot but does NOT support automatic card refresh or per-user views. `Action.Execute` (Universal Actions) supports both. Always use `Action.Execute` for interactive cards that need replacement or per-user content. Requires manifest version 1.12+.
- **`refresh.userIds` limit of 60**: The per-user card refresh feature (`Action.Execute` with `refresh.userIds`) supports a maximum of 60 user IDs per card. For broader audiences, send the base card to everyone and only personalize for the acting user.
- **Card replacement only works for invoke responses**: You can only replace a card inline by returning a new card from the invoke handler. If the interaction is not an invoke (e.g., a proactive message), you must use `updateActivity()` instead.
- **`deleteActivity` may not work in all contexts**: Deleting activities works in 1:1 and group chats but may be restricted in channels depending on permissions. Test deletion behavior in your target conversation types.

## references

- https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/universal-actions-for-adaptive-cards/overview
- https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/universal-actions-for-adaptive-cards/user-specific-views
- https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages
- https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-update-activity
- https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-delete-activity
- https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/conversation-messages
- https://github.com/microsoft/teams.ts
- https://api.slack.com/interactivity/handling — Slack interactive responses
- https://api.slack.com/methods/chat.update — Slack chat.update
- https://api.slack.com/methods/chat.postEphemeral — Slack chat.postEphemeral

## instructions

Use this expert when adding cross-platform support in either direction for Slack interactive response patterns or Teams card/message update patterns. It covers: `respond({ replace_original })` to invoke card replacement, `respond({ delete_original })` to `deleteActivity()`, `chat.update()` to `updateActivity()`, `chat.postEphemeral()` redesign strategies, deferred response patterns (processing card + proactive update), `response_url` elimination, and `Action.Execute` with `refresh.userIds` for per-user card views. For Teams → Slack, map `updateActivity` to `respond({ replace_original })`, and card refresh to ephemeral messages. Pair with `../teams/ui.adaptive-cards-ts.md` for card construction patterns, `../teams/runtime.proactive-messaging-ts.md` for deferred update infrastructure, and `events-activities-ts.md` for the underlying event/activity mapping.

## research

Deep Research prompt:

"Write a micro expert for bridging Slack interactive response patterns (respond, replace_original, ephemeral) and Teams card/message update patterns in either direction for cross-platform bots. Cover: respond({ replace_original }) to invoke card replacement and vice versa, respond({ delete_original }) to deleteActivity, chat.update to updateActivity, chat.postEphemeral redesign strategies, response_url expiry semantics, deferred response patterns with processing indicators, Action.Execute with refresh.userIds for per-user views, reverse-direction mapping from Teams to Slack, and the 3-second invoke timeout constraint. Include side-by-side TypeScript code examples and a mapping table."
