# events-activities-ts

## purpose

Bridges Slack event subscriptions and Teams activity handlers for cross-platform bots targeting Slack, Teams, or both.

## rules

1. Slack's `app.event('event_name')` maps to Teams' `app.on('route_name')` pattern. The event names and payload shapes are completely different between the two platforms. Always consult the mapping table below for the correct Teams route. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
2. Slack's `app.message(pattern)` maps directly to Teams' `app.message(pattern)` for pattern-matched messages. For a catch-all, Slack uses `app.message(async ...)` while Teams uses `app.on('message', async ...)`. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
3. Slack's `app.event('app_mention')` has no dedicated Teams route. In Teams channels, bots receive messages only when @mentioned, so the standard `app.on('message')` handler already implies a mention context. Check `activity.entities` for mention details or use the `mention` route if available. [learn.microsoft.com -- Mentions in bots](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-and-group-conversations#receive-only-at-mentioned-messages)
4. Slack's `app.event('member_joined_channel')` and `app.event('member_left_channel')` map to Teams' `app.on('conversationUpdate')` with inspection of `activity.membersAdded` or `activity.membersRemoved` arrays. [learn.microsoft.com -- conversationUpdate](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/subscribe-to-conversation-events)
5. Slack's `say()` maps to Teams' `send()` for posting a new message. Slack's threaded replies via `say({ thread_ts })` map to Teams' `reply()` method which uses `replyToId` internally for threaded conversation. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
6. Slack's `app.event('reaction_added')` and `app.event('reaction_removed')` map to Teams' `app.on('messageReaction')` route. Teams delivers both added and removed reactions in a single route -- inspect `activity.reactionsAdded` and `activity.reactionsRemoved` arrays. [learn.microsoft.com -- Message reactions](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/subscribe-to-conversation-events#message-reaction-events)
7. Slack's ephemeral messages (`respond({ response_type: 'ephemeral' })`) have **no Teams equivalent**. Redesign ephemeral responses as: (a) messages in personal (1:1) chat, (b) Adaptive Cards with user-specific `Action.Execute` refresh, or (c) simply visible messages if privacy is not critical. [learn.microsoft.com -- Conversations](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/conversation-basics)
8. In Teams channels, bots require @mention to receive messages (default behavior). This is fundamentally different from Slack where bots receive all channel messages. To receive all messages without mention, the app must request Resource-Specific Consent (RSC) permission `ChannelMessage.Read.Group`. [learn.microsoft.com -- RSC](https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
9. Slack's `app.event('app_home_opened')` (App Home tab) maps to Teams' static tab or `tab.open` invoke route for personal tabs. There is no direct equivalent -- Teams tabs are web pages rendered in an iframe, not bot-driven views. [learn.microsoft.com -- Personal tabs](https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/what-are-tabs)
10. Teams provides install/uninstall events via `app.on('install.add')` and `app.on('install.remove')` which have no direct Slack equivalent. Use these to send welcome messages and store conversation references for proactive messaging. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
11. **Teams has only 6 reaction types** (`like`, `heart`, `laugh`, `surprised`, `sad`, `angry`) — Slack supports unlimited custom emoji reactions. Bots that use reactions as workflow triggers (e.g., `:white_check_mark:` to mark approved, `:eyes:` to claim a ticket) must be redesigned. Replace reaction-based workflows with `Action.Submit` buttons on Adaptive Cards, which provide explicit, typed actions instead of ambiguous emoji semantics. [learn.microsoft.com -- Message reactions](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/subscribe-to-conversation-events#message-reaction-events)
12. **Threading model differs significantly.** Slack uses `thread_ts` to identify a parent message and `reply_broadcast` to also post a thread reply to the channel. Teams uses `replyToId` in the activity and the `reply()` method. There is **no "also send to channel"** equivalent in Teams — a reply stays in the thread. Thread discovery requires the Graph API: `GET /teams/{team-id}/channels/{channel-id}/messages/{message-id}/replies`. This Graph call requires `ChannelMessage.Read.All` application permission. [learn.microsoft.com -- List replies](https://learn.microsoft.com/en-us/graph/api/chatmessage-list-replies)

## patterns

### Migrating message handlers (say to send, thread_ts to reply)

**Slack (before):**

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

// Pattern-matched message
app.message(/^hello$/i, async ({ message, say }) => {
  await say(`Hello <@${(message as any).user}>!`);
});

// Catch-all message handler
app.message(async ({ message, say }) => {
  if (message.subtype) return;
  // Reply in thread
  await say({
    text: `You said: ${(message as any).text}`,
    thread_ts: (message as any).ts,
  });
});

// App mention event
app.event("app_mention", async ({ event, say }) => {
  await say(`Thanks for mentioning me, <@${event.user}>!`);
});
```

**Teams (after):**

```typescript
import { App } from "@microsoft/teams.apps";
import { ConsoleLogger } from "@microsoft/teams.common";
import { DevtoolsPlugin } from "@microsoft/teams.dev";

const app = new App({
  logger: new ConsoleLogger("my-bot", { level: "info" }),
  plugins: [new DevtoolsPlugin()],
});

// Pattern-matched message (same API shape as Slack)
app.message(/^hello$/i, async ({ send, activity }) => {
  await send(`Hello ${activity.from.name}!`);
});

// Catch-all message handler
app.on("message", async ({ activity, reply }) => {
  // reply() creates a threaded reply (like say({ thread_ts }) in Slack)
  await reply(`You said: "${activity.text}"`);
});

// No separate app_mention route needed -- in channels, bots only
// receive messages when @mentioned, so app.on('message') covers it.
// For explicit mention detection:
app.on("message", async ({ activity, send }) => {
  const mentions = activity.entities?.filter(
    (e: any) => e.type === "mention" && e.mentioned?.id !== activity.recipient?.id
  );
  if (mentions?.length) {
    await send("I see you mentioned someone!");
  }
});

app.start(3978);
```

### Migrating member join/leave and reaction events

**Slack (before):**

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

// Member joined channel
app.event("member_joined_channel", async ({ event, say }) => {
  await say(`Welcome to the channel, <@${event.user}>!`);
});

// Member left channel
app.event("member_left_channel", async ({ event, client }) => {
  await client.chat.postMessage({
    channel: event.channel,
    text: `<@${event.user}> has left the channel.`,
  });
});

// Reaction added
app.event("reaction_added", async ({ event, client }) => {
  if (event.reaction === "eyes") {
    await client.chat.postMessage({
      channel: event.item.channel,
      text: `Someone is looking at this! :eyes:`,
      thread_ts: event.item.ts,
    });
  }
});
```

**Teams (after):**

```typescript
import { App } from "@microsoft/teams.apps";
import { ConsoleLogger } from "@microsoft/teams.common";
import { DevtoolsPlugin } from "@microsoft/teams.dev";

const app = new App({
  logger: new ConsoleLogger("my-bot", { level: "info" }),
  plugins: [new DevtoolsPlugin()],
});

// Member joined -- conversationUpdate with membersAdded
app.on("conversationUpdate", async ({ activity, send }) => {
  if (activity.membersAdded?.length) {
    for (const member of activity.membersAdded) {
      // Skip the bot itself
      if (member.id !== activity.recipient?.id) {
        await send(`Welcome to the channel, ${member.name}!`);
      }
    }
  }

  // Member left -- conversationUpdate with membersRemoved
  if (activity.membersRemoved?.length) {
    for (const member of activity.membersRemoved) {
      if (member.id !== activity.recipient?.id) {
        await send(`${member.name} has left the channel.`);
      }
    }
  }
});

// Reaction events -- messageReaction route
app.on("messageReaction" as any, async ({ activity, send }) => {
  if (activity.reactionsAdded?.length) {
    for (const reaction of activity.reactionsAdded) {
      if (reaction.type === "like") {
        await send("Someone liked a message!");
      }
    }
  }
});

// Install event (no Slack equivalent) -- good for welcome messages
app.on("install.add", async ({ send, activity }) => {
  await send("Thanks for installing me! Type 'help' to get started.");
});

app.start(3978);
```

### Event mapping reference table

| Slack Event / Handler | Teams Route / Handler | Notes |
|---|---|---|
| `app.message(pattern)` | `app.message(pattern)` | Direct equivalent; Teams uses RegExp |
| `app.message(async ...)` (catch-all) | `app.on('message', async ...)` | Named route for catch-all |
| `app.event('app_mention')` | `app.on('message')` | Channel messages imply @mention |
| `app.event('member_joined_channel')` | `app.on('conversationUpdate')` + `membersAdded` | Check `activity.membersAdded` array |
| `app.event('member_left_channel')` | `app.on('conversationUpdate')` + `membersRemoved` | Check `activity.membersRemoved` array |
| `app.event('reaction_added')` | `app.on('messageReaction')` + `reactionsAdded` | Inspect `activity.reactionsAdded` |
| `app.event('reaction_removed')` | `app.on('messageReaction')` + `reactionsRemoved` | Inspect `activity.reactionsRemoved` |
| `app.event('message_changed')` | `app.on('messageUpdate')` | Message edit event |
| `app.event('message_deleted')` | `app.on('messageDelete')` | Message deletion event |
| `app.event('app_home_opened')` | `app.on('tab.open')` or static tab | Web-based tab, not bot view |
| `app.event('team_join')` | `app.on('conversationUpdate')` + `membersAdded` | Same route as channel join |
| `say(text)` | `send(text)` | Post new message |
| `say({ thread_ts })` | `reply(text)` | Threaded reply |
| `say({ thread_ts, reply_broadcast: true })` | `reply(text)` + `send(text)` | No single-call equivalent; must send twice |
| `respond({ response_type: 'ephemeral' })` | *(no equivalent)* | Redesign required |
| Reaction: any custom emoji (`:white_check_mark:`, `:rocket:`, etc.) | Reaction: 6 fixed types only (`like`, `heart`, `laugh`, `surprised`, `sad`, `angry`) | Custom emoji reactions impossible |
| Thread discovery: `conversations.replies(channel, thread_ts)` | Graph API `GET /messages/{id}/replies` | Requires `ChannelMessage.Read.All` permission |
| *(no equivalent)* | `app.on('install.add')` | Bot installed event |
| *(no equivalent)* | `app.on('install.remove')` | Bot uninstalled event |
| *(no equivalent)* | `app.on('typing')` | User typing indicator |

### Reaction workflow workaround: Adaptive Card buttons (R2)

Replace Slack's custom emoji reaction workflows with explicit `Action.Submit` buttons on Adaptive Cards — the recommended Teams alternative.

```typescript
// Slack (before): reaction-based approval
app.event("reaction_added", async ({ event, client }) => {
  if (event.reaction === "white_check_mark") {
    await client.chat.postMessage({
      channel: event.item.channel,
      text: `Approved by <@${event.user}>`,
      thread_ts: event.item.ts,
    });
  }
});

// Teams (after): button-based approval
app.on("card.action" as any, async ({ activity }) => {
  const data = activity.value?.action?.data ?? activity.value;
  if (data?.action === "approve") {
    return {
      status: 200,
      body: {
        type: "AdaptiveCard", version: "1.5",
        body: [{
          type: "TextBlock",
          text: `Approved by ${activity.from?.name}`,
          color: "Good", weight: "Bolder",
        }],
        // No actions = card becomes read-only
      },
    };
  }
});

// Send the approval card (replaces posting a message users react to)
function buildApprovalCard(requestId: string): object {
  return {
    type: "AdaptiveCard", version: "1.5",
    body: [
      { type: "TextBlock", text: `Request #${requestId} needs approval`, weight: "Bolder" },
    ],
    actions: [
      { type: "Action.Submit", title: "Approve", style: "positive",
        data: { action: "approve", requestId } },
      { type: "Action.Submit", title: "Reject", style: "destructive",
        data: { action: "reject", requestId } },
    ],
  };
}
```

**Why buttons are better:** Buttons provide explicit typed actions with an audit trail. Reactions are ambiguous (`:thumbsup:` vs `:+1:` vs `:white_check_mark:`) and produce no structured data.

**Reverse (Teams → Slack):** Slack supports unlimited custom emoji — map directly or keep the button pattern (works on both platforms).

### Thread broadcast helper (Y2)

Slack's `reply_broadcast: true` sends a thread reply that also appears in the channel. Teams has no single-call equivalent — use a helper that makes both calls.

```typescript
// Teams: replicate reply_broadcast behavior
async function replyWithBroadcast(
  ctx: { reply: (text: string) => Promise<any>; send: (text: string) => Promise<any> },
  text: string
): Promise<void> {
  await ctx.reply(text);  // threaded reply
  await ctx.send(text);   // also post to channel
}

// Usage in a handler
app.on("message", async (ctx) => {
  if (ctx.activity.text?.includes("broadcast")) {
    await replyWithBroadcast(ctx, "This appears in both the thread and the channel.");
  }
});
```

**Don't:** Try to batch into a single API call — Teams doesn't support it. Two calls is the correct pattern.

**Reverse (Teams → Slack):** Use `say({ text, thread_ts: message.ts, reply_broadcast: true })` natively — single call.

### Thread discovery via Graph API (Y3)

Fetching thread replies in Teams requires the Graph API, unlike Slack's simple `conversations.replies()`.

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

async function getThreadReplies(
  graphClient: Client,
  teamId: string,
  channelId: string,
  messageId: string,
  top: number = 50
): Promise<any[]> {
  const response = await graphClient
    .api(`/teams/${teamId}/channels/${channelId}/messages/${messageId}/replies`)
    .top(top)
    .get();
  return response.value;
}

// Usage in a handler (requires ChannelMessage.Read.All application permission)
app.on("message", async ({ activity, send }) => {
  if (activity.text?.match(/^\/?replies/i)) {
    const replies = await getThreadReplies(
      graphClient,
      activity.channelData?.teamsTeamId,
      activity.channelData?.teamsChannelId,
      activity.conversation?.id?.split(";")[0] ?? ""
    );
    await send(`Found ${replies.length} replies in this thread.`);
  }
});
```

**Watch out for:** `ChannelMessage.Read.All` is an application permission requiring admin consent. If you only need replies in the bot's own conversations, delegated permissions may suffice.

**Reverse (Teams → Slack):** Use `conversations.replies({ channel, ts: thread_ts })` natively — no special permissions needed.

### RSC permission for all channel messages (Y16)

Add RSC permission to the Teams manifest so the bot receives all channel messages without @mention — matching Slack's default behavior.

```json
{
  "webApplicationInfo": {
    "id": "{{CLIENT_ID}}",
    "resource": "api://{{CLIENT_ID}}"
  },
  "authorization": {
    "permissions": {
      "resourceSpecific": [
        { "name": "ChannelMessage.Read.Group", "type": "Application" }
      ]
    }
  }
}
```

Also strip @mention text from messages that do include a mention:

```typescript
const app = new App({
  // ... other options
  activity: { mentions: { stripText: true } },
});
```

**Don't:** Change your UX to require @mention unless your bot genuinely shouldn't listen to all messages.

**Reverse (Teams → Slack):** Slack bots receive all messages in channels they're added to by default — no config needed.

### Reverse direction (Teams → Slack)

For Teams → Slack, reverse the mapping -- Teams routes map back to Slack events:
- `app.on('message')` → `app.message(async ...)` catch-all or `app.event('app_mention')` if handling @mentions specifically
- `app.message(pattern)` → `app.message(pattern)` (direct equivalent)
- `app.on('conversationUpdate')` + `membersAdded` → `app.event('member_joined_channel')`
- `app.on('conversationUpdate')` + `membersRemoved` → `app.event('member_left_channel')`
- `app.on('messageReaction')` + `reactionsAdded` → `app.event('reaction_added')` -- note Teams has 6 fixed types; Slack supports unlimited custom emoji
- `app.on('messageReaction')` + `reactionsRemoved` → `app.event('reaction_removed')`
- `app.on('messageUpdate')` → `app.event('message_changed')`
- `app.on('messageDelete')` → `app.event('message_deleted')`
- `app.on('install.add')` → no direct Slack equivalent (use `app_home_opened` or OAuth completion callback for welcome messages)
- `send(text)` → `say(text)`
- `reply(text)` → `say({ text, thread_ts: message.ts })`
- Add `ack()` calls to Slack event handlers where required
- Slack bots receive all channel messages by default (no @mention required) -- adjust UX expectations accordingly

## pitfalls

- **Assuming all channel messages are delivered**: In Teams channels, bots only receive messages when @mentioned. This is the biggest behavioral difference from Slack. Design accordingly or use RSC permissions for broader message access.
- **Missing ephemeral message redesign**: Code that uses `respond({ response_type: 'ephemeral' })` will not work in Teams. Identify all ephemeral patterns early and plan alternative UX (personal chat, card refresh, or visible messages).
- **Not filtering the bot from `membersAdded`**: The `conversationUpdate` event fires when the bot itself is added. Always check `member.id !== activity.recipient?.id` to avoid the bot welcoming itself.
- **Thread model differences**: Slack threads use `thread_ts` on individual messages. Teams threaded replies use `reply()` or `replyToId`. The nesting model is similar but the API is different.
- **Reaction type mismatch**: Slack reactions use emoji names (e.g., `"eyes"`, `"thumbsup"`). Teams reactions use a limited set of types (`"like"`, `"heart"`, `"laugh"`, `"surprised"`, `"sad"`, `"angry"`). Custom emoji reactions do not exist in Teams.
- **Event handler context shape**: Slack event handlers receive `{ event, say, client }`. Teams handlers receive `{ activity, send, reply, stream }`. Do not try to destructure Slack property names from Teams handlers.
- **No `client` equivalent for arbitrary API calls**: Slack's `client.chat.postMessage()` for posting to other channels maps to `app.send(conversationId, text)` in Teams. Store conversation IDs at install time for proactive messaging.
- **Reaction-based workflows break silently**: A Slack bot using `:white_check_mark:` reactions as approval triggers will not error in Teams — it simply never fires because the custom emoji doesn't exist. Audit all `reaction_added` handlers for custom emoji names before migration.
- **No `reply_broadcast` equivalent**: Slack's "also send to channel" flag on threaded replies has no Teams counterpart. If the bot relies on broadcasting thread replies to the main channel, you must send two separate messages: a `reply()` to the thread and a `send()` to the channel.
- **Thread discovery requires Graph API with app permissions**: Fetching thread replies in Teams requires calling the Graph API (`/messages/{id}/replies`) with `ChannelMessage.Read.All` application-level permission. This is a significant permission escalation compared to Slack's `conversations.replies` which uses the standard bot token.

## references

- https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/subscribe-to-conversation-events
- https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-and-group-conversations
- https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/conversation-basics
- https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages
- https://learn.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent
- https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/what-are-tabs
- https://github.com/microsoft/teams.ts
- https://slack.dev/bolt-js/concepts/events
- https://slack.dev/bolt-js/concepts/message-listening

## instructions

This expert covers bridging Slack event subscriptions and Teams activity handlers. Use it when adding cross-platform support in either direction: mapping Slack events (app_mention, member_joined_channel, member_left_channel, reaction_added, reaction_removed, message_changed, message_deleted, app_home_opened) to their Teams equivalents (message, conversationUpdate, messageReaction, messageUpdate, messageDelete, tab.open, install.add) or vice versa; converting between `say()`/`send()` and `reply()`/threaded patterns; handling ephemeral message differences; understanding the @mention requirement in Teams channels vs Slack's default all-message delivery; and mapping event payload properties between platforms. The comprehensive mapping table and reverse-direction section provide a quick reference for bridging in both directions. Pair with `../slack/runtime.bolt-foundations-ts.md` for Slack event patterns, and `../teams/runtime.routing-handlers-ts.md` for Teams activity routes.

## research

Deep Research prompt:

"Write a micro expert for bridging Slack events and Teams activity routes bidirectionally. Cover all major Slack events (app_mention, member_joined_channel, member_left_channel, reaction_added, reaction_removed, message subtypes, app_home_opened) with their Teams equivalents (message, conversationUpdate, messageReaction, messageUpdate, messageDelete, typing, install events) and vice versa. Include side-by-side TypeScript code examples, a comprehensive bidirectional mapping table, payload shape differences, the @mention requirement in channels, ephemeral message handling strategies, and common pitfalls for both directions."
