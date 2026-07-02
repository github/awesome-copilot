# Interactive Responses

## Ephemeral Messages

| Aspect | Slack | Teams |
|---|---|---|
| User-only messages | `chat.postEphemeral()` or `respond({ response_type: "ephemeral" })` | **No native equivalent** |
| Per-user card views | Not available (use ephemeral messages) | `Action.Execute` with `refresh.userIds` |
| Default command response | Ephemeral | Visible to everyone |

**Rating:** RED (Slack → Teams), GREEN (Teams → Slack).

### Impact

Any Slack bot that uses ephemeral messages for user-only feedback — confirmation dialogs, error messages, inline help — has no direct Teams equivalent. Messages are visible to everyone unless workarounds are used.

### Mitigation Strategies (Slack → Teams)

| Strategy | How | Effort |
|---|---|---|
| **`refresh.userIds` (Recommended)** | Adaptive Cards with `Action.Execute` and `refresh.userIds` show different card content per user. Covers ~80% of cases. Limited to 60 user IDs. | 4–8 hrs |
| **1:1 chat fallback** | Route ephemeral content to user's personal bot chat via proactive messaging. Different UX (separate conversation) but reliable. | 2–4 hrs |
| **`sendEphemeral()` helper** | Wrapper that auto-detects context and picks the best strategy. Worth it if reused across multiple handlers. | 8–12 hrs |
| **Drop ephemeral behavior** | Show messages to everyone. Simplest but may expose private data. | 0 hrs |

### Reverse Direction (Teams → Slack)

`refresh.userIds` per-user card views map to Slack's native ephemeral messages. Use `chat.postEphemeral()` directly.

---

## Message Updates and Replacements

| Aspect | Slack | Teams |
|---|---|---|
| Replace original | `respond({ replace_original: true })` | Return card from invoke handler, or `ctx.updateActivity(activityId)` |
| Delete original | `respond({ delete_original: true })` | `ctx.deleteActivity(activityId)` |
| Update by ID | `chat.update({ ts, channel, ... })` | `ctx.updateActivity({ id: activityId, ... })` |
| Response URL | `response_url` — valid 30 min, max 5 uses | No equivalent concept |
| Activity ID | `message.ts` (timestamp-based) | `activity.id` or `activity.replyToId` |

**Rating:** GREEN — direct mapping with different API shapes.

### Key Difference

Slack uses `response_url` (a webhook URL that expires after 30 minutes and allows up to 5 responses). Teams has no `response_url` — you update messages by storing and referencing the `activity.id`.

**Mitigation:** Store the `activity.id` when sending messages that may need updating. Use `ctx.updateActivity()` with the stored ID.

---

## Button Actions

| Aspect | Slack | Teams |
|---|---|---|
| Handler registration | `app.action("action_id", handler)` | `app.on("card.action", handler)` routing on `data.action` |
| Action identifier | `action_id` on button element | `data.action` (or `data.verb`) in `Action.Submit` |
| Button value | `action.value` | `activity.value.action.data` |
| Acknowledgement | Must `ack()` within 3 seconds | Automatic |
| Follow-up response | `respond()` (response_url) | `ctx.send()` or `ctx.updateActivity()` |

**Rating:** GREEN — direct mapping with different routing mechanisms.

**Mitigation:** In Slack, each button has a unique `action_id` with its own handler. In Teams, all `Action.Submit` buttons route through `card.action`; use a `data.action` field to dispatch:

```typescript
// Teams — route by data.action
app.on("card.action", async (ctx) => {
  const action = ctx.activity.value?.action?.data?.action;
  switch (action) {
    case "approve": /* ... */ break;
    case "reject":  /* ... */ break;
  }
});
```

---

## Confirmation Dialogs

| Aspect | Slack | Teams |
|---|---|---|
| Native support | `confirm` object on button elements | **No native equivalent** |
| Behavior | Platform-rendered "Are you sure?" popup | Must be built manually |

**Rating:** YELLOW (Slack → Teams), GREEN (Teams → Slack).

### Mitigation Strategies (Slack → Teams)

| Strategy | How | Effort |
|---|---|---|
| **`Action.ShowCard` inline (Recommended)** | Inline expand with "Are you sure?" text and Yes/No buttons. Native Adaptive Card pattern. | 2–4 hrs |
| **Task module confirm** | Small dialog popup for confirmation. More prominent, closer to Slack UX. | 4–6 hrs |
| **`confirmAction()` helper** | Template function generating confirm cards. Reusable across multiple buttons. | 4–8 hrs |

### Reverse Direction (Teams → Slack)

Use the native `confirm` object on button elements. Built-in, no custom code needed.
