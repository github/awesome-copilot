# Feature Gap Analysis: Slack ↔ Teams

A complete inventory of every feature that does **not** have a direct equivalent on the other platform, organized by severity. Each gap includes mitigations in both directions.

## How to Read This Document

- **Slack → Teams** = you have a Slack bot and are adding Teams support
- **Teams → Slack** = you have a Teams bot and are adding Slack support
- Effort estimates are per-feature implementation hours
- Features with direct 1:1 mappings (GREEN) are not listed — see [messaging-and-commands.md](messaging-and-commands.md) and [ui-components.md](ui-components.md) for those

---

## RED Gaps — No Platform Equivalent

These features exist on one platform with **no counterpart** on the other. They require redesign, custom infrastructure, or acceptance of reduced functionality.

---

### R1. Ephemeral Messages

**Slack has it. Teams does not.**

Slack's `chat.postEphemeral()` sends a message visible only to one user in a channel. Teams has no visibility flag — all bot messages are visible to everyone.

| Strategy | Direction | How | Effort |
|---|---|---|---|
| `refresh.userIds` on `Action.Execute` | Slack → Teams | Card shows different content per user. Covers ~80% of cases. Max 60 user IDs per card. | 4–8 hrs |
| Route to 1:1 chat | Slack → Teams | Send private content to user's personal bot chat via proactive messaging. Different UX but reliable. | 2–4 hrs |
| Build `sendEphemeral()` helper | Slack → Teams | Wrapper that auto-detects context and picks the best strategy. Worth it if many handlers use ephemeral. | 8–12 hrs |
| Drop ephemeral behavior | Slack → Teams | Show messages to everyone. Simplest but may expose private data. | 0 hrs |
| **Native `chat.postEphemeral()`** | **Teams → Slack** | **Direct API call. No gap in this direction.** | **0 hrs** |

---

### R2. Custom Emoji Reactions

**Slack has it. Teams does not.**

Slack supports unlimited custom emoji as reactions. Teams supports exactly 6 fixed reactions: like, heart, laugh, surprised, sad, angry. Bots that use reactions as workflow signals (`:white_check_mark:` = approved) cannot map to Teams.

| Strategy | Direction | How | Effort |
|---|---|---|---|
| Adaptive Card buttons | Slack → Teams | Replace reaction workflows with `Action.Submit` buttons (e.g., "Approve" / "Reject"). Better audit trail. | 4–8 hrs |
| Map to 6 fixed reactions | Slack → Teams | Map most important reactions to like/heart/laugh/surprised/sad/angry. Lossy — only works with ≤6 reactions. | 2–4 hrs |
| **Native emoji reactions** | **Teams → Slack** | **Direct mapping. Slack supports unlimited custom emoji.** | **0 hrs** |

---

### R3. Modal Cancel Notification (`viewClosed`)

**Slack has it. Teams does not.**

Slack fires `view_closed` when a user dismisses a modal (with `notify_on_close: true`). Teams sends no notification when a dialog is dismissed — the bot never knows the user cancelled.

| Strategy | Direction | How | Effort |
|---|---|---|---|
| Timeout + explicit Cancel button | Slack → Teams | Add a "Cancel" button inside the dialog. Implement 5-min TTL for cleanup of stale locks/state. | 4–8 hrs |
| Accept stale state | Slack → Teams | Drop cancel cleanup. Accept that some locks may persist until TTL. | 0 hrs |
| **Native `notify_on_close: true`** | **Teams → Slack** | **Set `notify_on_close: true` in `views.open()`. Native support.** | **0 hrs** |

---

### R4. Mid-Form Dynamic Updates

**Slack has it. Teams does not.**

Slack modals support `dispatch_action: true` on inputs, which fires `block_actions` events while the modal is open. The bot can then call `views.update()` to change the modal dynamically (e.g., show/hide fields based on a dropdown selection). Teams dialogs have no equivalent — Adaptive Card inputs don't fire events until the form is submitted.

| Strategy | Direction | How | Effort |
|---|---|---|---|
| Multi-step dialogs | Slack → Teams | Split dependent fields across dialog steps. Step 1 collects the trigger value; step 2 shows dependent fields. | 8–16 hrs |
| `Action.ToggleVisibility` | Slack → Teams | Show/hide elements client-side. Works for simple show/hide but cannot fetch server data. | 2–4 hrs |
| Web-based task module | Slack → Teams | Embed a full web form in an iframe with real-time interactivity. Full control but much more effort. | 16–24 hrs |
| **Native `block_actions` + `views.update()`** | **Teams → Slack** | **Set `dispatch_action: true` on input elements. Handle `block_actions` and call `views.update()`.** | **2–4 hrs** |

---

### R5. Server-Side Field Validation with Inline Errors

**Slack has it. Teams does not.**

Slack's `view_submission` handler can return `response_action: "errors"` with a map of `{ block_id: "error message" }` to show inline validation errors without closing the modal. Teams dialogs close on submit — there is no way to keep the dialog open with error messages.

| Strategy | Direction | How | Effort |
|---|---|---|---|
| Re-open dialog with errors | Slack → Teams | On validation failure, return a new dialog card pre-populated with the user's data and error messages in field labels. | 4–8 hrs |
| Client-side validation only | Slack → Teams | Use Adaptive Card `isRequired`, `regex`, `maxLength`, `min`/`max`. Covers simple cases but not async checks (e.g., "username taken"). | 1–2 hrs |
| **Native `response_action: "errors"`** | **Teams → Slack** | **Return `{ response_action: "errors", errors: { block_id: "msg" } }` from `view_submission` handler.** | **0 hrs** |

---

### R6. Dialog / Modal Stacking

**Slack has it. Teams does not.**

Slack supports `views.push()` to stack up to 3 modals. The user can navigate back by dismissing the top modal. Teams dialogs do not stack — opening a new dialog replaces the current one.

| Strategy | Direction | How | Effort |
|---|---|---|---|
| Single dialog with step routing | Slack → Teams | One dialog with internal step state. Submit handler checks step number and returns the next step's card. Add a "Back" button that decrements the step. | 8–16 hrs |
| Build `StepDialog` helper | Slack → Teams | Reusable class managing step state, forward/back navigation. Worth it if 3+ wizard flows exist. | 16–24 hrs |
| Sequential separate dialogs | Slack → Teams | Close current dialog, open next. No back navigation. Degraded UX. | 4–8 hrs |
| **Native `views.push()`** | **Teams → Slack** | **Call `views.push()` from within a `view_submission` or `block_actions` handler. Up to 3 levels.** | **0 hrs** |

---

### R7. Scheduled Message API

**Slack has it. Teams does not.**

Slack provides `chat.scheduleMessage()` and `chat.deleteScheduledMessage()` as first-class APIs. Teams has no server-side scheduling — the bot must build its own.

| Strategy | Direction | How | Effort |
|---|---|---|---|
| Azure Functions timer + Cosmos DB | Slack → Teams | Store message + target time in DB. Timer function polls every minute and sends via proactive messaging. | 16–24 hrs |
| Azure Queue visibility timeout | Slack → Teams | Enqueue with `visibilityTimeout` set to the delay. Queue trigger fires at the right time. 7-day max. | 8–12 hrs |
| Azure Service Bus scheduled messages | Slack → Teams | `scheduleMessages(msg, scheduledTime)`. Exact-time delivery, native cancellation. Best for high volume. | 12–16 hrs |
| Power Automate | Slack → Teams | "Delay until" action in a flow. No code but requires license for custom connectors. | 8–12 hrs |
| In-process timer (dev only) | Slack → Teams | `setTimeout` / `node-cron`. Not durable — lost on restart. | 2–4 hrs |
| **Native `chat.scheduleMessage()`** | **Teams → Slack** | **Direct API call with `post_at` Unix timestamp. Native cancellation via `deleteScheduledMessage()`.** | **0 hrs** |

---

### R8. Channel Archive

**Slack has it. Teams does not.**

Slack's `conversations.archive()` archives a channel — it becomes read-only and hidden from the channel list. Teams can only archive an entire Team, not individual channels.

| Strategy | Direction | How | Effort |
|---|---|---|---|
| Rename with `[ARCHIVED]` prefix | Slack → Teams | Rename channel, update description to "Archived on {date}". Non-destructive. Cosmetic only. | 4–8 hrs |
| Rename + remove all members | Slack → Teams | Rename + kick everyone. Stronger enforcement but destructive and hard to undo. | 8–12 hrs |
| Team-level archive | Slack → Teams | Archive the entire Team via Graph. Only works if the channel has a dedicated Team. | 2–4 hrs |
| **Native `conversations.archive()`** | **Teams → Slack** | **Direct API call. Reversible via `conversations.unarchive()`.** | **0 hrs** |

---

### R9. Retroactive Link Unfurling

**Slack has it. Teams does not.**

Slack unfurls links in existing messages (edited to add a link, or links posted before the bot was installed). Teams only unfurls links in new messages — editing a message to add a link does not trigger unfurling.

| Strategy | Direction | How | Effort |
|---|---|---|---|
| **Accept the limitation (Recommended)** | Slack → Teams | No workaround exists. New message unfurling works fine. | 0 hrs |
| Manual preview command | Slack → Teams | Bot command where users paste a URL to get a preview card. Niche use case. | 4–8 hrs |
| **Native retroactive unfurling** | **Teams → Slack** | **Slack unfurls retroactively by default. No issue.** | **0 hrs** |

---

### R10. Firewall-Friendly Transport (Socket Mode)

**Slack has it. Teams does not.**

Slack's Socket Mode uses an outbound WebSocket — no inbound ports needed. The bot can run behind any firewall. Teams requires a public HTTPS endpoint for inbound webhooks.

| Strategy | Direction | How | Effort |
|---|---|---|---|
| Deploy to Azure | Slack → Teams | Host in App Service / Functions / Container Apps. Use Dev Tunnels for local dev. Standard cloud deployment. | 4–8 hrs |
| Azure Relay | Slack → Teams | Hybrid connection for strict on-premises firewalls that cannot expose any public endpoint. Adds latency. | 8–16 hrs |
| **Native Socket Mode** | **Teams → Slack** | **Set `socketMode: true` with `appToken`. Outbound WebSocket, zero inbound ports.** | **1–2 hrs** |

---

## RED Gap Workarounds

Detailed implementation patterns for every RED gap. These are the recommended approaches — pick the one that fits your bot's needs.

---

### R1 Workaround: Ephemeral via `refresh.userIds`

The best general-purpose workaround. An `Action.Execute` card with `refresh.userIds` shows personalized content to specific users while showing a default card to everyone else.

```typescript
// Teams: per-user card content (replaces chat.postEphemeral)
const card = {
  type: "AdaptiveCard",
  version: "1.4",
  refresh: {
    action: {
      type: "Action.Execute",
      verb: "personalView",
      data: { requestId: "123" },
    },
    userIds: [actingUserId], // max 60 IDs
  },
  body: [
    { type: "TextBlock", text: "A request was submitted." }, // everyone sees this
  ],
};

// When the specified user views the card, Teams invokes the bot:
app.on("card.action", async (ctx) => {
  if (ctx.activity.value?.action?.verb === "personalView") {
    // Return a personalized card only this user sees
    return {
      status: 200,
      body: {
        type: "AdaptiveCard",
        version: "1.4",
        body: [
          { type: "TextBlock", text: "Your request #123 was approved.", weight: "Bolder" },
          { type: "TextBlock", text: "Only you can see these details." },
        ],
      },
    };
  }
});
```

**When this doesn't work:** More than 60 users need per-user views, or the content is plain text (not a card). Fall back to sending a proactive message in the user's 1:1 bot chat.

**Reverse (Teams → Slack):** Use `chat.postEphemeral({ channel, user, text })` directly. Native support.

---

### R2 Workaround: Reactions → Adaptive Card Buttons

Replace emoji-reaction workflows with explicit card buttons. This actually improves auditability — button clicks are tracked, emoji reactions are not.

```typescript
// Before (Slack): reaction-based approval
app.event("reaction_added", async ({ event, client }) => {
  if (event.reaction === "white_check_mark") {
    await client.chat.postMessage({
      channel: event.item.channel,
      text: `Approved by <@${event.user}>`,
      thread_ts: event.item.ts,
    });
  }
});

// After (Teams): button-based approval
const approvalCard = {
  type: "AdaptiveCard", version: "1.5",
  body: [{ type: "TextBlock", text: "Request #42 needs approval" }],
  actions: [
    { type: "Action.Submit", title: "Approve", style: "positive",
      data: { action: "approve", requestId: "42" } },
    { type: "Action.Submit", title: "Reject", style: "destructive",
      data: { action: "reject", requestId: "42" } },
  ],
};
```

**When reactions are decorative** (not workflow signals): map to the 6 fixed Teams reactions. Only viable if you use ≤6 distinct reactions.

**Reverse (Teams → Slack):** Map `Action.Submit` buttons to emoji reactions via `reactions.add`, or keep as Slack buttons (usually better UX anyway).

---

### R3 Workaround: Cancel Detection via TTL + Explicit Button

Since Teams sends no notification when a dialog is dismissed, combine two strategies:

```typescript
// 1. Add an explicit Cancel button inside the dialog card
const dialogCard = {
  type: "AdaptiveCard", version: "1.5",
  body: [/* form fields */],
  actions: [
    { type: "Action.Submit", title: "Submit", data: { action: "submit_form" } },
    { type: "Action.Submit", title: "Cancel", data: { action: "cancel_form", lockId: "abc" } },
  ],
};

// 2. Handle explicit cancel
app.on("dialog.submit", async ({ activity, send }) => {
  const data = activity.value?.data;
  if (data?.action === "cancel_form") {
    await releaseLock(data.lockId);
    return { status: 200, body: { task: { type: "message", value: "Cancelled." } } };
  }
  // ... handle submit ...
});

// 3. TTL-based cleanup for users who close via the X button
setInterval(async () => {
  const staleLocks = await getLocksOlderThan(5 * 60_000); // 5 min
  for (const lock of staleLocks) await releaseLock(lock.id);
}, 60_000);
```

**Reverse (Teams → Slack):** Use `notify_on_close: true` in `views.open()` and handle `view_closed` callback.

---

### R4 Workaround: Mid-Form Updates via Multi-Step Dialogs

Split dependent fields across dialog steps. Step 1 collects the value that drives the dynamic behavior; step 2 renders the dependent fields.

```typescript
app.on("dialog.submit", async ({ activity }) => {
  const data = activity.value?.data;

  if (data?.step === 1) {
    // User selected a category — return step 2 with dependent fields
    const subcategories = await getSubcategories(data.category);
    return {
      status: 200,
      body: {
        task: {
          type: "continue",
          value: {
            title: "Step 2 of 2",
            card: buildStep2Card(data.category, subcategories),
          },
        },
      },
    };
  }

  if (data?.step === 2) {
    // Final submission
    await processForm(data);
    return { status: 200, body: { task: { type: "message", value: "Done!" } } };
  }
});
```

**For simple show/hide** (no server data needed): use `Action.ToggleVisibility` to show/hide card elements client-side. This works for "show advanced options" toggles but cannot populate options from an API.

**Reverse (Teams → Slack):** Use `dispatch_action: true` on inputs + `views.update()` in the `block_actions` handler. Native support for real-time form updates.

---

### R5 Workaround: Server Validation via Dialog Re-render

On validation failure, return a `continue` response with the same form, pre-populated with the user's values, plus error messages as colored `TextBlock` elements.

```typescript
app.on("dialog.submit", async ({ activity }) => {
  const data = activity.value?.data;
  const errors: string[] = [];

  if (!data?.email?.includes("@")) errors.push("Invalid email address");
  if ((data?.name?.length ?? 0) < 2) errors.push("Name must be at least 2 characters");

  if (errors.length > 0) {
    return {
      status: 200,
      body: {
        task: {
          type: "continue",
          value: {
            title: "Fix Errors",
            card: {
              contentType: "application/vnd.microsoft.card.adaptive",
              content: {
                type: "AdaptiveCard", version: "1.5",
                body: [
                  // Error banner
                  ...errors.map(e => ({
                    type: "TextBlock", text: e, color: "Attention", weight: "Bolder",
                  })),
                  // Re-populate form with user's previous values
                  { type: "Input.Text", id: "name", label: "Name", value: data.name ?? "" },
                  { type: "Input.Text", id: "email", label: "Email", value: data.email ?? "" },
                ],
                actions: [{ type: "Action.Submit", title: "Submit", data: { action: "register" } }],
              },
            },
          },
        },
      },
    };
  }

  // Validation passed
  await processRegistration(data);
  return { status: 200, body: { task: { type: "message", value: "Registered!" } } };
});
```

**Combine with client-side validation** for the best UX: add `isRequired`, `regex`, and `errorMessage` to catch obvious errors before the server round-trip.

**Reverse (Teams → Slack):** Use `response_action: "errors"` with `{ block_id: "error message" }` natively.

---

### R6 Workaround: Modal Stacking via Step Routing

Simulate `views.push` with a single dialog that routes by step number. Include a "Back" button that decrements the step.

```typescript
app.on("dialog.submit", async ({ activity }) => {
  const data = activity.value?.data;
  const step = data?.step ?? 1;

  if (data?.action === "back") {
    return continueDialog(buildStepCard(step - 1, data));
  }

  if (step < 3) {
    return continueDialog(buildStepCard(step + 1, data));
  }

  // Final step — process all collected data
  await processWizard(data);
  return { status: 200, body: { task: { type: "message", value: "Complete!" } } };
});

function continueDialog(card: object) {
  return {
    status: 200,
    body: { task: { type: "continue", value: { title: `Step ${(card as any).step}`, card } } },
  };
}

function buildStepCard(step: number, previousData: Record<string, unknown>): object {
  // Each step card embeds ALL previous data in Action.Submit.data
  // so nothing is lost between steps
  return {
    contentType: "application/vnd.microsoft.card.adaptive",
    content: {
      type: "AdaptiveCard", version: "1.5",
      body: [/* step-specific fields */],
      actions: [
        ...(step > 1 ? [{ type: "Action.Submit", title: "Back",
          data: { ...previousData, step, action: "back" } }] : []),
        { type: "Action.Submit", title: step === 3 ? "Finish" : "Next",
          data: { ...previousData, step, action: "next" } },
      ],
    },
    step,
  };
}
```

**Key principle:** Every step's `Action.Submit.data` must carry forward ALL data from previous steps, since there's no persistent modal state like Slack's `private_metadata`.

**Reverse (Teams → Slack):** Use `views.push()` natively — up to 3 levels of stacking with built-in "X to go back" behavior.

---

### R7 Workaround: Scheduling via Azure Service Bus

The most production-ready approach. Azure Service Bus supports exact-time delivery and native cancellation.

```typescript
import { ServiceBusClient } from "@azure/service-bus";

const sbClient = new ServiceBusClient(process.env.SERVICEBUS_CONNECTION!);
const sender = sbClient.createSender("scheduled-messages");

// Schedule a message
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
    await teamsApp.send(conversationId, text);
  },
  processError: async (err) => console.error(err),
});
```

**For simpler needs:** Azure Queue with `visibilityTimeout` (max 7 days) or Azure Functions timer + Cosmos DB (poll every minute).

**Reverse (Teams → Slack):** Use `chat.scheduleMessage({ channel, text, post_at })` natively.

---

### R8 Workaround: Channel Archive via Rename + Description

The most widely used workaround. Cosmetic-only — doesn't actually prevent new messages.

```typescript
async function archiveChannel(
  graph: Client, teamId: string, channelId: string
): Promise<void> {
  const channel = await graph.api(`/teams/${teamId}/channels/${channelId}`).get();

  await graph.api(`/teams/${teamId}/channels/${channelId}`).patch({
    displayName: `[ARCHIVED] ${channel.displayName}`.substring(0, 50),
    description: `Archived on ${new Date().toISOString()}. Original: ${channel.description ?? ""}`,
  });
}
```

**For stronger enforcement:** After renaming, remove all non-owner members. This is destructive (members must be re-invited to undo) but prevents new messages.

**Reverse (Teams → Slack):** Use `conversations.archive()` natively. Reversible via `conversations.unarchive()`.

---

### R9 Workaround: Retroactive Unfurling

**No workaround exists.** Teams only unfurls links in new messages. Accept this limitation — it affects a small percentage of use cases (links in edited messages or messages sent before the bot was installed).

If critical, build a `/preview <url>` bot command that returns a card preview on demand.

---

### R10 Workaround: Firewall Transport

**Deploy to a cloud provider.** This is the standard path for any Teams bot. For local development, use Dev Tunnels (built into VS Code) or ngrok.

For strict on-premises environments that truly cannot expose any endpoint, Azure Relay provides a hybrid connection where the bot connects outbound to Azure, and Azure proxies inbound Teams traffic through that connection. This adds 10–50ms latency but requires zero inbound firewall rules.

**Reverse (Teams → Slack):** Enable Socket Mode with `socketMode: true` and `appToken`. Zero inbound ports, zero tunneling.

---

## YELLOW Gaps — Equivalent Exists but Requires Design Decisions

These features have functional equivalents on the other platform, but the mapping is not 1:1 and requires choosing an approach.

---

### Y1. Slash Commands

**Slack has native `/command`. Teams does not.**

| Strategy | Direction | How | Effort |
|---|---|---|---|
| Text pattern matching | Slack → Teams | Detect command-like text in `app.on("message")`. Accept `weather` and `/weather`. | 2–4 hrs |
| Manifest bot commands | Slack → Teams | Add `commands[]` to manifest for Teams command menu. Not `/` prefix but discoverable. | 1–2 hrs |
| Message extension | Slack → Teams | `composeExtensions` for richer command UX with search results or task modules. | 8–12 hrs |
| **Native `app.command()`** | **Teams → Slack** | **Register via `app.command("/cmd", handler)`. Add `ack()` call. Configure in Slack app dashboard.** | **2–4 hrs** |

---

### Y2. Thread Broadcast (`reply_broadcast`)

**Slack has it as a single call. Teams requires two.**

| Strategy | Direction | How | Effort |
|---|---|---|---|
| Two API calls | Slack → Teams | Call `reply()` (thread) + `send()` (channel) separately. | 1–2 hrs |
| `replyWithBroadcast()` wrapper | Slack → Teams | Convenience method that calls both internally. | 2–4 hrs |
| **Native `reply_broadcast: true`** | **Teams → Slack** | **Single `say()` call with `reply_broadcast: true`.** | **0 hrs** |

---

### Y3. Thread Discovery

**Slack has `conversations.replies()`. Teams uses Graph API.**

| Strategy | Direction | How | Effort |
|---|---|---|---|
| Graph API direct | Slack → Teams | `GET /teams/{teamId}/channels/{channelId}/messages/{messageId}/replies`. Requires `ChannelMessage.Read.All`. | 4–8 hrs |
| `getThreadReplies()` helper | Slack → Teams | Wrapper encapsulating Graph client setup, auth, and pagination. | 8–12 hrs |
| **Native `conversations.replies()`** | **Teams → Slack** | **Direct API call with thread `ts`.** | **0 hrs** |

---

### Y4/5/6. File Upload

**Slack: one call. Teams: 3-step consent flow.**

| Strategy | Direction | How | Effort |
|---|---|---|---|
| `sendFile()` helper | Slack → Teams | Unified wrapper: auto-detects personal/channel, routes to OneDrive/SharePoint, chunks >4 MB. | 24–40 hrs |
| Manual FileConsentCard | Slack → Teams | Implement 3-step consent flow directly. Verbose and error-prone. | 16–24 hrs |
| **Native `files.uploadV2()`** | **Teams → Slack** | **Single API call. No consent step.** | **1–2 hrs** |

---

### Y7. Link Unfurling Deadline

**Slack: 30-minute async. Teams: 5-second sync.**

| Strategy | Direction | How | Effort |
|---|---|---|---|
| Cache-first with prefetch | Slack → Teams | Cache middleware wraps handler. Pre-populate for known URLs. Without this, slow unfurls silently fail. | 12–16 hrs |
| Synchronous handler only | Slack → Teams | Direct handler. Only viable for fast data sources (<5 seconds). | 4–8 hrs |
| **Native async `chat.unfurl()`** | **Teams → Slack** | **Handle `link_shared` event. Respond within 30 minutes via `chat.unfurl()`.** | **2–4 hrs** |

---

### Y8. Reminders

**Slack has `reminders.add()`. Teams does not.**

| Strategy | Direction | How | Effort |
|---|---|---|---|
| Piggyback on scheduler (R7) | Slack → Teams | Reuse scheduled message infrastructure. `setReminder()` stores + sends to 1:1 chat at target time. | 4–8 hrs (if scheduler exists) |
| Power Automate + Planner | Slack → Teams | Create Planner tasks with due-date notifications. | 8–12 hrs |
| **Native `reminders.add()`** | **Teams → Slack** | **Direct API call. Platform-managed delivery.** | **0 hrs** |

---

### Y9. Dynamic Select Menus (Server-Side Typeahead)

**Slack has `external_data_source` + `block_suggestion`. Teams does not.**

Slack's `app.options()` handler receives keystrokes and returns filtered results from the server. Teams' `Input.ChoiceSet` is client-side only.

| Strategy | Direction | How | Effort |
|---|---|---|---|
| Pre-populated `Input.ChoiceSet` | Slack → Teams | Load all options at dialog open. Client-side filtering via `style: "filtered"`. Works up to ~500 items. | 2–4 hrs |
| Two-step dialog | Slack → Teams | Step 1: text input for search. Step 2: filtered results as `ChoiceSet`. Works for any dataset size. | 8–12 hrs |
| Web-based task module | Slack → Teams | Embed a web view with search-as-you-type. Full control. High effort. | 16–24 hrs |
| **Native `block_suggestion`** | **Teams → Slack** | **Set `external_data_source: true` on select. Handle `app.options()` for server-side filtering.** | **2–4 hrs** |

---

### Y10. App Home

**Slack has `app_home_opened` + `views.publish()`. Teams uses tabs.**

| Strategy | Direction | How | Effort |
|---|---|---|---|
| `tab.fetch` handler | Slack → Teams | Personal tab returns Adaptive Card on every open. Closest to `app_home_opened`. | 4–8 hrs |
| Welcome card on install | Slack → Teams | Send card to 1:1 chat on `install.add`. Simple but fires once. | 1–2 hrs |
| Static web tab | Slack → Teams | Full web page in iframe. Richer but needs hosting + Teams JS SDK. | 8–16 hrs |
| **Native `views.publish()`** | **Teams → Slack** | **Listen for `app_home_opened` event. Call `views.publish()` with Block Kit.** | **2–4 hrs** |

---

### Y11. View Hash (Race Condition Protection)

**Slack has `view_hash`. Teams does not.**

Slack's `views.update()` accepts a `view_hash` parameter. If the view has changed since the hash was captured, the update is rejected. This prevents race conditions. Teams has no equivalent.

| Strategy | Direction | How | Effort |
|---|---|---|---|
| Manual `_version` field | Slack → Teams | Inject version counter into `Action.Submit.data`. Reject updates where the submitted version doesn't match the stored version. | 2–4 hrs |
| Card versioning middleware | Slack → Teams | SDK plugin auto-injecting and checking version counters on every card send/receive. | 4–8 hrs |
| **Native `view_hash`** | **Teams → Slack** | **Pass `view_hash` from the previous `views.open()` / `views.update()` response.** | **0 hrs** |

---

### Y12. Global Shortcuts

**Slack has `app.shortcut()` (global). Teams uses compose extensions.**

| Strategy | Direction | How | Effort |
|---|---|---|---|
| Compose extension | Slack → Teams | `composeExtensions` with `context: ["compose", "commandBox"]`. Always opens task module. | 8–12 hrs |
| Minimal-dismiss pattern | Slack → Teams | Task module returns tiny "Done" card for fire-and-forget actions. | 4–8 hrs |
| Bot command | Slack → Teams | Replace shortcut with typed command. Simpler but less discoverable. | 2–4 hrs |
| **Native `app.shortcut()`** | **Teams → Slack** | **Register global shortcut callback. Can fire-and-forget (ack + background work).** | **2–4 hrs** |

---

### Y13. Message Shortcuts

**Slack has `message_shortcut`. Teams uses action-based message extensions.**

| Strategy | Direction | How | Effort |
|---|---|---|---|
| Action message extension | Slack → Teams | `composeExtensions` command with `context: ["message"]`. Message payload in `activity.value.messagePayload`. | 4–8 hrs |
| **Native `message_shortcut`** | **Teams → Slack** | **Register `app.shortcut()` with type `message_shortcut`. Message in `shortcut.message`.** | **2–4 hrs** |

---

### Y14. Confirmation Dialogs on Buttons

**Slack has native `confirm` object. Teams does not.**

| Strategy | Direction | How | Effort |
|---|---|---|---|
| `Action.ShowCard` inline | Slack → Teams | Inline expand with "Are you sure?" + Yes/No buttons. Native Adaptive Card. | 2–4 hrs |
| Task module confirm | Slack → Teams | Small dialog popup. More prominent, closer to Slack UX. | 4–6 hrs |
| `confirmAction()` helper | Slack → Teams | Template function generating confirm cards. Reusable. | 4–8 hrs |
| **Native `confirm` object** | **Teams → Slack** | **Add `confirm` object to button element. Platform-rendered popup.** | **0 hrs** |

---

### Y15. Unfurl Domain Wildcards

**Slack supports `*.example.com`. Teams requires exact domain listing.**

| Strategy | Direction | How | Effort |
|---|---|---|---|
| Manual enumeration | Slack → Teams | List every subdomain in manifest `domains[]`. Fine for <10. | 1–2 hrs |
| Manifest generator script | Slack → Teams | Script reads subdomain list from config and generates manifest array. | 4–8 hrs |
| **Native wildcard support** | **Teams → Slack** | **Wildcards work out of the box.** | **0 hrs** |

---

### Y16. All Channel Messages Without @Mention

**Slack gets them by default. Teams requires RSC permission.**

| Strategy | Direction | How | Effort |
|---|---|---|---|
| RSC permission | Slack → Teams | Add `ChannelMessage.Read.Group` to manifest `webApplicationInfo.applicationPermissions`. Config only. | 1–2 hrs |
| Require @mention | Slack → Teams | Change UX to require @mention. Simplifies permissions but changes behavior. | 0 hrs |
| **Default behavior** | **Teams → Slack** | **Slack bots receive all messages in channels they're added to. No config needed.** | **0 hrs** |

---

### Y17. Built-in Retry / Resilience

**Slack Bolt has `retryConfig`. Teams SDK has no built-in retry.**

| Strategy | Direction | How | Effort |
|---|---|---|---|
| Build `RetryPlugin` | Slack → Teams | Plugin with exponential backoff, jitter, circuit breaker. | 12–16 hrs |
| Manual retry wrapper | Slack → Teams | Hand-roll backoff around outbound calls. Simpler but easy to get wrong. | 4–8 hrs |
| **Native Bolt `retryConfig`** | **Teams → Slack** | **Configure in `App` constructor. Built-in exponential backoff.** | **0 hrs** |

---

### Y18. Workflow Builder

**Slack has it (free). Teams uses Power Automate (licensed).**

| Strategy | Direction | How | Effort |
|---|---|---|---|
| Bot-driven orchestration | Slack → Teams | State machine + Adaptive Card buttons + persistent storage. No license dependency. | 16–40 hrs |
| Power Automate rebuild | Slack → Teams | Rebuild in Power Automate. Custom steps need Premium license. | 24–80 hrs |
| Teams Workflows app | Slack → Teams | Simplified UI for basic automations (free). Limited scenarios. | 4–8 hrs |
| Hybrid | Slack → Teams | Simple flows → Power Automate, complex → bot-driven. | Varies |
| **Native Workflow Builder** | **Teams → Slack** | **Rebuild in Slack Workflow Builder. Free, no license.** | **8–16 hrs** |

---

### Y19. App Distribution

**Both platforms have app stores, but packaging and review differ.**

| Strategy | Direction | How | Effort |
|---|---|---|---|
| Org app catalog | Slack → Teams | Publish to organization catalog via Teams Admin Center. Requires admin approval. | 2–4 hrs |
| Sideloading | Slack → Teams | ZIP manifest + icons. Upload via Teams client. May be disabled by admin. | 1–2 hrs |
| Partner Center (public) | Slack → Teams | Submit to Teams App Store. 1–2 week review. Requires Partner Network account. | 8–16 hrs |
| **Slack App Directory** | **Teams → Slack** | **Submit via api.slack.com. Hours-to-days review. Implement `InstallProvider` for OAuth install flow.** | **4–8 hrs** |

---

---

## YELLOW Gap Best Practices

Recommended approaches for every YELLOW gap. These are the patterns that produce the best cross-platform UX with the least effort.

---

### Y1. Slash Commands — Best Practice

**Use text pattern matching + manifest bot commands together.**

Register commands in the Teams manifest for discoverability (users see them in the command menu), AND detect them via text pattern matching as a fallback. Accept both `/weather` and `weather` so users migrating from Slack don't have to retrain muscle memory.

```typescript
// Teams: detect both patterns
app.message(/^\/?weather$/i, async (ctx) => {
  const response = await handleWeather();
  await ctx.send(response);
});
```

In the Teams manifest:
```json
{ "commands": [{ "title": "weather", "description": "Check the weather" }] }
```

**Don't:** Create a message extension for every slash command. Reserve extensions for commands that benefit from rich search results or task module UI.

---

### Y2. Thread Broadcast — Best Practice

**Write a one-line helper that makes both calls.** Don't over-engineer this.

```typescript
async function replyWithBroadcast(ctx: any, text: string): Promise<void> {
  await ctx.reply(text);
  await ctx.send(text);
}
```

**Don't:** Try to batch these into a single API call — Teams doesn't support it. Two calls is the correct pattern.

---

### Y3. Thread Discovery — Best Practice

**Use Graph API directly with the `ctx.appGraph` client.** Don't build a wrapper unless you need pagination across multiple threads.

```typescript
const replies = await ctx.appGraph
  .api(`/teams/${teamId}/channels/${channelId}/messages/${messageId}/replies`)
  .top(50)
  .get();
```

**Watch out for:** `ChannelMessage.Read.All` is an application permission requiring admin consent. If you only need thread replies in the bot's own conversations, you may be able to use delegated permissions instead.

---

### Y4/5/6. File Upload — Best Practice

**Build the `sendFile()` helper.** The manual FileConsentCard flow is a 30-line footgun that's easy to get wrong. A helper that auto-detects personal vs. channel context and handles chunking for large files pays for itself after the second use.

**Key decisions:**
- Personal chat → FileConsentCard flow (requires `supportsFiles: true` in manifest)
- Channel → Direct Graph API upload to SharePoint (no consent card)
- Files >4 MB → Graph resumable upload session with 320 KB–60 MB chunks

**Don't:** Store pending file buffers in memory for long periods. Upload promptly or stream to a temporary blob.

---

### Y7. Link Unfurling — Best Practice

**Always use a cache layer.** The 5-second Teams deadline makes this non-optional. Cache aggressively:

1. On first unfurl, fetch and cache the preview data
2. Set a reasonable TTL (5–60 minutes depending on data freshness needs)
3. For known high-traffic URLs, pre-populate the cache on startup

```typescript
const cache = new Map<string, { data: any; expires: number }>();

app.on("message.ext.query-link", async ({ activity }) => {
  const url = activity.value?.url;
  const cached = cache.get(url);
  if (cached && cached.expires > Date.now()) {
    return buildUnfurlResponse(cached.data);
  }
  const data = await fetchPreviewData(url); // must complete in <4 seconds
  cache.set(url, { data, expires: Date.now() + 300_000 }); // 5 min TTL
  return buildUnfurlResponse(data);
});
```

**Don't:** Make multiple API calls in the unfurl handler. Pre-fetch or batch data sources.

---

### Y8. Reminders — Best Practice

**Piggyback on whatever scheduling infrastructure you built for R7.** Don't create a separate system. A reminder is just a scheduled message sent to a 1:1 conversation.

```typescript
async function setReminder(userId: string, text: string, when: Date): Promise<void> {
  const conversationId = await get1to1ConversationId(userId);
  await scheduleMessage(conversationId, `Reminder: ${text}`, when);
}
```

**Don't:** Use Power Automate + Planner for bot reminders — it adds an external dependency and licensing complexity. Keep it in the bot.

---

### Y9. Dynamic Select Menus — Best Practice

**Pre-populate with `Input.ChoiceSet` `style: "filtered"` for datasets under 500 items.** This covers the vast majority of cases (user lists, category selects, project dropdowns).

```json
{
  "type": "Input.ChoiceSet",
  "id": "user_select",
  "label": "Assign to",
  "style": "filtered",
  "choices": [
    { "title": "Alice Smith", "value": "alice@company.com" },
    { "title": "Bob Jones", "value": "bob@company.com" }
  ]
}
```

**For datasets over 500 items:** Use a two-step dialog. Step 1 is a text input for search. The submit handler queries the server and returns step 2 with filtered results as a `ChoiceSet`.

**Don't:** Build a web-based task module just for a searchable dropdown. The effort (16–24 hrs) rarely justifies the marginal UX improvement over two-step.

---

### Y10. App Home — Best Practice

**Use `tab.fetch` to return an Adaptive Card.** It fires on every tab open (like `app_home_opened`) and supports `tab.submit` for interactions within the tab.

```typescript
app.on("tab.fetch", async (ctx) => {
  const userData = await getUserDashboard(ctx.activity.from?.aadObjectId ?? "");
  return {
    status: 200,
    body: {
      tab: {
        type: "continue",
        value: { cards: [{ card: buildDashboardCard(userData) }] },
      },
    },
  };
});
```

**Don't:** Use a static web tab unless you need rich interactivity beyond what Adaptive Cards can provide (charts, real-time updates, complex navigation). Web tabs require hosting, CORS configuration, and the Teams JS SDK.

---

### Y11. View Hash — Best Practice

**Inject a `_version` counter into every card's `Action.Submit.data`.** Increment on every update. Reject submissions where the version doesn't match.

```typescript
let cardVersion = 0;

function buildCard(data: any): object {
  cardVersion++;
  return {
    type: "AdaptiveCard", version: "1.5",
    body: [/* ... */],
    actions: [{
      type: "Action.Submit", title: "Update",
      data: { ...data, _version: cardVersion },
    }],
  };
}

app.on("card.action", async (ctx) => {
  const submitted = ctx.activity.value?.action?.data;
  if (submitted?._version !== cardVersion) {
    await ctx.send("This card is outdated. Please use the latest version.");
    return;
  }
  // Process the update...
});
```

**Don't:** Skip version checking for low-traffic bots — race conditions happen even with single users (fast double-clicks, multiple tabs).

---

### Y12. Global Shortcuts — Best Practice

**Use compose extensions for actions that open a form.** For fire-and-forget actions (no UI), use the minimal-dismiss pattern: return a tiny "Done" card that auto-closes.

```json
{
  "composeExtensions": [{
    "commands": [{
      "id": "quickAction",
      "type": "action",
      "title": "Quick Action",
      "context": ["compose", "commandBox"],
      "fetchTask": true
    }]
  }]
}
```

**Don't:** Replace every shortcut with a bot command. Commands are less discoverable than compose extensions, which appear in the Teams UI with icons and descriptions.

---

### Y13. Message Shortcuts — Best Practice

**Use action-based message extensions with `context: ["message"]`.** This is the closest 1:1 mapping to Slack's message shortcuts.

Access the original message via `activity.value.messagePayload` — it contains the message text, sender, and timestamp.

**Don't:** Forget to add `fetchTask: true` in the manifest command. Without it, the extension silently does nothing when clicked.

---

### Y14. Confirmation Dialogs — Best Practice

**Use `Action.ShowCard` for inline confirmation.** It expands inline without leaving the current context — closest to Slack's native `confirm` popup.

```json
{
  "type": "Action.ShowCard",
  "title": "Delete",
  "card": {
    "type": "AdaptiveCard",
    "body": [{ "type": "TextBlock", "text": "Are you sure you want to delete this?", "weight": "Bolder" }],
    "actions": [
      { "type": "Action.Submit", "title": "Yes, delete", "style": "destructive",
        "data": { "action": "confirm_delete", "itemId": "42" } },
      { "type": "Action.Submit", "title": "Cancel",
        "data": { "action": "cancel_delete" } }
    ]
  }
}
```

**Don't:** Open a full task module dialog for a simple yes/no confirmation. It's too heavy for the interaction.

---

### Y15. Unfurl Domain Wildcards — Best Practice

**Enumerate domains in the manifest.** For fewer than 10 subdomains, list them manually. For more, write a build-time script that reads your subdomain list and generates the manifest array.

```json
{
  "composeExtensions": [{
    "messageHandlers": [{
      "type": "link",
      "value": {
        "domains": [
          "app.example.com",
          "docs.example.com",
          "api.example.com"
        ]
      }
    }]
  }]
}
```

**Don't:** Try to register a single wildcard domain — Teams will reject it silently.

---

### Y16. All Channel Messages — Best Practice

**Add the RSC permission to the manifest.** It's config-only, no code change, and matches Slack's default behavior.

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

Also set `activity.mentions.stripText: true` in the App constructor to remove `<at>bot</at>` text from messages that do include an @mention.

**Don't:** Change your UX to require @mention unless your bot genuinely shouldn't listen to all messages.

---

### Y17. Built-in Retry — Best Practice

**Build a retry utility with exponential backoff and jitter.** Apply it to all outbound API calls (Graph, proactive messaging, external services).

```typescript
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      if (attempt === maxRetries) throw err;
      const retryAfter = err?.response?.headers?.["retry-after"];
      const baseDelay = retryAfter ? parseInt(retryAfter) * 1000 : 1000 * 2 ** attempt;
      const jitter = Math.random() * 1000;
      await new Promise(r => setTimeout(r, baseDelay + jitter));
    }
  }
  throw new Error("Unreachable");
}
```

**For proactive broadcasts** (sending to hundreds of users): use `p-queue` with concurrency control (e.g., 5 concurrent sends) to stay within Teams' rate limits (~1 msg/sec/conversation).

**Don't:** Retry without jitter. Without random delay, multiple bot instances retry at the same time and cause a thundering herd.

---

### Y18. Workflow Builder — Best Practice

**Keep workflow logic in the bot (bot-driven orchestration).** This avoids Power Automate licensing dependencies and keeps everything in one codebase.

Pattern: state machine with Adaptive Card buttons for user decisions, persistent storage for workflow state, and proactive messaging for notifications.

**When to use Power Automate instead:** Approval workflows that benefit from the built-in Approvals connector, and simple recurring tasks that business users should manage themselves.

**Don't:** Build a hybrid system (some flows in Power Automate, some in the bot) unless you have a clear organizational reason. Two systems means two places to debug.

---

### Y19. App Distribution — Best Practice

**Start with sideloading for dev/test, use org catalog for internal deployment, and Partner Center only for public distribution.**

Sideloading checklist:
1. `manifest.json` — schema v1.19+, valid `id`, correct `botId`
2. `color.png` — 192x192 full-color icon
3. `outline.png` — 32x32 transparent monochrome outline
4. ZIP all three (no nested folders)
5. Upload via Teams client → Apps → Manage your apps

**Don't:** Submit to Partner Center (public store) until the bot is fully stable. The 1–2 week review cycle makes iteration slow. Use org catalog for internal users.

---

## Summary: Gap Asymmetry

Most RED gaps are asymmetric — they only apply in one direction. The pattern is clear:

| Direction | RED gaps to handle | Why |
|---|---|---|
| **Slack → Teams** | 10 RED gaps | Teams lacks ephemeral, custom reactions, modal stacking, cancel notifications, mid-form updates, field validation, scheduling, channel archive, retroactive unfurl, Socket Mode |
| **Teams → Slack** | 0 RED gaps | Slack has native support for everything Teams offers, plus more |

This means **adding Slack to a Teams bot is significantly easier** than adding Teams to a Slack bot. A Teams → Slack migration mostly involves mapping concepts 1:1 (Adaptive Cards → Block Kit, `app.on("message")` → `app.message()`, etc.) with few design decisions. A Slack → Teams migration requires redesigning multiple interaction patterns.

### Effort Estimates by Bot Complexity

| Profile | Slack Features Used | Slack → Teams Effort | Teams → Slack Effort |
|---|---|---|---|
| **A** — Simple | Messages, basic commands, simple cards | 8–16 hrs | 4–8 hrs |
| **B** — Moderate | A + ephemeral, threads, files, basic interactivity | 40–80 hrs | 8–16 hrs |
| **C** — Complex | B + shortcuts, App Home, unfurling, dynamic selects, modals | 80–160 hrs | 16–32 hrs |
| **D** — Full | C + workflows, scheduling, Socket Mode, stacked modals | 160–300 hrs | 32–48 hrs |
