# Middleware & Handler Patterns

## Middleware

| Aspect | Slack (Bolt) | Teams SDK v2 |
|---|---|---|
| Global middleware | `app.use(async ({ next }) => { ... await next(); })` | `app.use(async (ctx) => { ... ctx.next(); })` |
| Chaining | Explicit `await next()` — omitting drops the event silently | Explicit `ctx.next()` — omitting stops the pipeline |
| Listener middleware | Passed as extra args to `app.message(filter, middleware, handler)` | No equivalent — use guard functions at handler start |
| Authorization | Custom middleware checking Slack user/workspace | Bot Framework JWT validation is automatic |

**Rating:** GREEN — both have middleware, but Slack's is more granular.

### Key Difference

Slack supports **listener middleware** — functions that run only for specific handlers. Teams has no equivalent. Convert listener middleware to guard conditions at the top of each handler:

```typescript
// Slack: listener middleware
app.message(isAdmin, async ({ say }) => { await say("Admin action"); });

// Teams: guard function
app.on("message", async (ctx) => {
  if (!isAdmin(ctx.activity.from.id)) return;
  await ctx.send("Admin action");
});
```

---

## Acknowledgement (`ack()`)

| Aspect | Slack | Teams |
|---|---|---|
| Required for | Commands, actions, view submissions, shortcuts, options | **Not applicable** — SDK handles automatically |
| Deadline | 3 seconds | No manual acknowledgement |
| What happens if missed | Slack shows "This app didn't respond" error to user | N/A |
| Payload in ack | Commands: optional text/blocks (ephemeral). View submissions: optional `response_action`. | N/A |

**Rating:** GREEN — remove `ack()` calls when porting Slack → Teams.

### Impact

`ack()` is fundamental to Slack's interaction model. Every interactive handler must acknowledge within 3 seconds or the user sees an error. Teams has no equivalent — the SDK handles response timing automatically.

### Mitigation

| Direction | Strategy |
|---|---|
| Slack → Teams | Remove all `ack()` calls. Move async work that previously happened "after ack" into the main handler body. |
| Teams → Slack | Add `await ack()` as the first line of every command, action, view, shortcut, and options handler. Do async work after. |

---

## Handler Registration

| Aspect | Slack (Bolt) | Teams SDK v2 |
|---|---|---|
| Messages | `app.message(pattern, handler)` | `app.message(pattern, handler)` or `app.on("message", handler)` |
| Events | `app.event("event_name", handler)` | `app.on("routeName", handler)` |
| Actions | `app.action("action_id", handler)` | `app.on("card.action", handler)` — route by `data.action` |
| Modals | `app.view("callback_id", handler)` | `app.on("dialog.submit", handler)` |
| Shortcuts | `app.shortcut("callback_id", handler)` | `app.on("message.ext.open", handler)` |
| Options/typeahead | `app.options("action_id", handler)` | `Input.ChoiceSet` with `style: "filtered"` (client-side) |
| Install events | No built-in handler | `app.on("install.add", handler)` |
| Lifecycle events | No built-in handler | `app.event("start" | "error" | "signin" | "activity")` |
| Order matters | First `app.message()` match wins | First match wins for `app.message()`, last registration wins for `app.on()` |

**Rating:** GREEN — different APIs, same concepts.

### Key Mapping

```
Slack                          Teams
─────────────────────────────  ─────────────────────────────
app.message(pattern)       →   app.message(pattern)
app.command("/cmd")        →   app.on("message") + text match
app.action("id")           →   app.on("card.action")
app.view("callback_id")   →   app.on("dialog.submit")
app.event("name")          →   app.on("routeName")
app.shortcut("id")         →   app.on("message.ext.open")
app.options("id")          →   (client-side filtered ChoiceSet)
app.use(middleware)        →   app.use(middleware)
app.error(handler)         →   app.event("error", handler)
```

---

## Error Handling

| Aspect | Slack (Bolt) | Teams SDK v2 |
|---|---|---|
| Global handler | `app.error(async (error) => { ... })` | `app.event("error", ({ error, log }) => { ... })` |
| Unhandled errors | Logged to stderr, process continues | Logged, process continues |
| Per-handler errors | try/catch in individual handlers | try/catch in individual handlers |

**Rating:** GREEN — equivalent patterns.
