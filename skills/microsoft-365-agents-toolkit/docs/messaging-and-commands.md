# Messaging & Commands

## Message Handling

| Aspect | Slack | Teams |
|---|---|---|
| Handler | `app.message(pattern, handler)` | `app.on("message", handler)` |
| Pattern matching | String (substring), RegExp, or catch-all | RegExp or manual `text.match()` |
| Reply to channel | `say(text)` | `ctx.send(text)` |
| Reply in thread | `say({ text, thread_ts })` | `ctx.reply(text)` |
| Get message text | `message.text` | `ctx.activity.text` |
| Get sender | `message.user` (Slack ID) | `ctx.activity.from.id` (AAD ID) |

**Rating:** GREEN — direct mapping in both directions.

**Mitigation:** Extract message handling into a platform-agnostic service layer that receives `(text, userId, platform)` and returns structured data. Each adapter converts to the platform's native format.

---

## Slash Commands

| Aspect | Slack | Teams |
|---|---|---|
| Invocation | `/command args` | No native equivalent |
| Handler | `app.command("/cmd", handler)` | `app.on("message")` with text pattern matching |
| Acknowledgement | Must `ack()` within 3 seconds | Automatic — no `ack()` |
| Default response | Ephemeral (user-only) | Visible to everyone |
| Modal trigger | `trigger_id` from command → `views.open()` | `dialog.open` handler or Adaptive Card form |
| Registration | Slack app dashboard + `commands` scope | Manifest `commands[]` array (bot commands, not slash) |

**Rating:** YELLOW — functional equivalent exists but UX is fundamentally different.

### Impact

- Slash commands are a core Slack interaction pattern with no Teams counterpart
- Teams bot commands appear in a command menu but don't use `/` prefix
- Ephemeral responses don't exist in Teams

### Mitigation Strategies

| Strategy | How | Effort |
|---|---|---|
| **Text commands (Recommended)** | Detect command-like patterns in `app.on("message")`. Accept both `weather` and `/weather`. | 2–4 hrs |
| **Manifest bot commands** | Add `commands[]` to manifest for discoverability in Teams command menu. Users type the command name. | 1–2 hrs |
| **Message extension** | Use `composeExtensions` for a richer command experience with search results or task modules. | 8–12 hrs |

### Reverse Direction (Teams → Slack)

Teams bot commands map directly to Slack slash commands via `app.command()`. Add `ack()` calls (required in Slack, absent in Teams) and configure the command in the Slack app dashboard.

---

## Events / Activities

| Slack Event | Teams Activity | Notes |
|---|---|---|
| `message` | `message` | Direct mapping |
| `app_mention` | `message` (in channel) | Teams channels require @mention by default |
| `member_joined_channel` | `conversationUpdate` (`membersAdded`) | Different event shape |
| `member_left_channel` | `conversationUpdate` (`membersRemoved`) | Different event shape |
| `reaction_added` | `messageReaction` | Teams has only 6 fixed reactions |
| `app_home_opened` | `install.add` (closest) | No "opened" event in Teams |
| `channel_created` | No equivalent | Use Graph API subscription |
| `team_join` | `conversationUpdate` (`membersAdded`) | Same event, different context |

**Rating:** GREEN for most events, RED for custom emoji reactions.

### @Mention Behavior

| Aspect | Slack | Teams |
|---|---|---|
| Channel messages | Bot receives all messages in joined channels | Bot only receives messages with @mention (default) |
| Override | Default behavior | Add `ChannelMessage.Read.Group` RSC permission to manifest |
| Mention stripping | Not needed | Set `activity.mentions.stripText: true` in App options |

**Mitigation:** To receive all channel messages in Teams without @mention, add RSC permission to the manifest. This is a config-only change (1–2 hrs).

---

## Threading

| Aspect | Slack | Teams |
|---|---|---|
| Reply in thread | `say({ thread_ts: message.ts })` | `ctx.reply(text)` |
| Thread broadcast | `say({ thread_ts, reply_broadcast: true })` | Two API calls: `reply()` + `send()` |
| Get thread replies | `conversations.replies({ ts })` | Graph API `GET /messages/{id}/replies` |
| Thread discovery | Native API | Requires `ChannelMessage.Read.All` Graph permission |

**Rating:** GREEN for basic threading, YELLOW for broadcast and discovery.

### Mitigation for Thread Broadcast

Slack's `reply_broadcast` posts in both the thread and the channel in one call. Teams requires two separate calls: `reply()` for the thread and `send()` for the channel. Wrap in a helper:

```typescript
async function replyWithBroadcast(ctx, text: string): Promise<void> {
  await ctx.reply(text);  // Thread reply
  await ctx.send(text);   // Channel message
}
```

Effort: 1–2 hrs.
