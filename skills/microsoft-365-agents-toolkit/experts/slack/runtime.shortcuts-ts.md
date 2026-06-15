# runtime.shortcuts-ts

## purpose

Global shortcut and message shortcut handling in Slack Bolt TypeScript apps — registration, payload differences, and response patterns.

## rules

1. Register shortcut handlers with `app.shortcut('callback_id', handler)`. The `callback_id` must match the shortcut configured in the Slack app dashboard under **Interactivity & Shortcuts**. Supports string or RegExp matching. [slack.dev/bolt-js/concepts/shortcuts](https://slack.dev/bolt-js/concepts/shortcuts)
2. Slack has two shortcut types: **global shortcuts** (`type: 'shortcut'`) launched from the compose menu or search bar, and **message shortcuts** (`type: 'message_action'`) launched from a message's context menu (three-dot "More actions"). Both require the `ack()` + response pattern. [api.slack.com/interactivity/shortcuts](https://api.slack.com/interactivity/shortcuts)
3. Always call `await ack()` within 3 seconds. Shortcuts provide a `trigger_id` — use it to open a modal with `client.views.open()` immediately after ack. The trigger ID expires quickly, so do not perform slow work between ack and views.open. [api.slack.com/interactivity/shortcuts/using](https://api.slack.com/interactivity/shortcuts/using)
4. Filter by shortcut type using constraints: `app.shortcut({ type: 'message_action', callback_id: 'my_action' }, handler)`. Without a `type` constraint, the handler fires for both global and message shortcuts with that `callback_id`. [bolt-js source: App.ts](https://github.com/slackapi/bolt-js/blob/main/src/App.ts)
5. Global shortcuts provide `shortcut.trigger_id`, `shortcut.user`, and `shortcut.team` but **no channel or message context**. The only response pattern is opening a modal — `say()` is not available. [api.slack.com/interactivity/shortcuts/using#global_shortcuts](https://api.slack.com/interactivity/shortcuts/using#global_shortcuts)
6. Message shortcuts provide `shortcut.message` (the target message with `ts`, `text`, `user`), `shortcut.channel` (channel ID and name), `shortcut.response_url`, and `shortcut.message_ts`. Both `say()` and `respond()` are available. [api.slack.com/interactivity/shortcuts/using#message_shortcuts](https://api.slack.com/interactivity/shortcuts/using#message_shortcuts)
7. Use `shortcut.message.text` and `shortcut.message.ts` from message shortcuts to access the message content the user right-clicked on. The `message` object may not have a `user` field for bot messages. Always handle that as optional. [bolt-js source: types/shortcuts/message-shortcut.ts](https://github.com/slackapi/bolt-js/blob/main/src/types/shortcuts/message-shortcut.ts)
8. Store context for modal follow-up using `private_metadata` on the view. For message shortcuts, serialize the channel ID, message timestamp, and any relevant data into `private_metadata` so the `view_submission` handler can access it. [api.slack.com/surfaces/modals#private_metadata](https://api.slack.com/surfaces/modals#private_metadata)
9. Register shortcuts in the Slack app dashboard: **global shortcuts** under Interactivity → Shortcuts → "Global" tab; **message shortcuts** under Interactivity → Shortcuts → "On messages" tab. Each shortcut needs a name, description, and `callback_id`. [api.slack.com/interactivity/shortcuts#create](https://api.slack.com/interactivity/shortcuts#create)
10. Shortcut payloads include `enterprise` and `is_enterprise_install` fields for Enterprise Grid compatibility. Check `is_enterprise_install` when routing to workspace-specific resources in multi-org deployments. [bolt-js source: types/shortcuts/global-shortcut.ts](https://github.com/slackapi/bolt-js/blob/main/src/types/shortcuts/global-shortcut.ts)

## patterns

### Global shortcut that opens a modal

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

// Global shortcut — no channel context, must open a modal
app.shortcut("create_task", async ({ ack, shortcut, client }) => {
  await ack();

  await client.views.open({
    trigger_id: shortcut.trigger_id,
    view: {
      type: "modal",
      callback_id: "task_modal",
      title: { type: "plain_text", text: "Create Task" },
      submit: { type: "plain_text", text: "Create" },
      blocks: [
        {
          type: "input",
          block_id: "task_title",
          label: { type: "plain_text", text: "Task Title" },
          element: {
            type: "plain_text_input",
            action_id: "title_input",
          },
        },
        {
          type: "input",
          block_id: "task_assignee",
          label: { type: "plain_text", text: "Assign To" },
          element: {
            type: "users_select",
            action_id: "assignee_select",
          },
        },
      ],
    },
  });
});
```

### Message shortcut that forwards a message

```typescript
import { App, MessageShortcut } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

// Message shortcut — has channel and message context
app.shortcut<MessageShortcut>(
  { type: "message_action", callback_id: "save_message" },
  async ({ ack, shortcut, client }) => {
    await ack();

    const messageText = shortcut.message.text || "(no text content)";
    const author = shortcut.message.user
      ? `<@${shortcut.message.user}>`
      : "a bot";

    // Open a modal with the message content pre-filled
    await client.views.open({
      trigger_id: shortcut.trigger_id,
      view: {
        type: "modal",
        callback_id: "save_message_modal",
        title: { type: "plain_text", text: "Save Message" },
        submit: { type: "plain_text", text: "Save" },
        private_metadata: JSON.stringify({
          channel: shortcut.channel.id,
          messageTs: shortcut.message_ts,
        }),
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Message from ${author}:*\n>${messageText}`,
            },
          },
          {
            type: "input",
            block_id: "note_block",
            label: { type: "plain_text", text: "Add a note (optional)" },
            optional: true,
            element: {
              type: "plain_text_input",
              action_id: "note_input",
              multiline: true,
            },
          },
          {
            type: "input",
            block_id: "dest_block",
            label: { type: "plain_text", text: "Save to channel" },
            element: {
              type: "conversations_select",
              action_id: "dest_channel",
              default_to_current_conversation: true,
            },
          },
        ],
      },
    });
  }
);
```

### Handling both shortcut types with one handler

```typescript
import { App, GlobalShortcut, MessageShortcut } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

// Matches both global and message shortcuts with callback_id "quick_note"
app.shortcut("quick_note", async ({ ack, shortcut, client }) => {
  await ack();

  // Determine context based on shortcut type
  const isMessage = shortcut.type === "message_action";
  const metadata = isMessage
    ? JSON.stringify({
        channel: (shortcut as MessageShortcut).channel.id,
        messageTs: (shortcut as MessageShortcut).message_ts,
      })
    : "{}";

  await client.views.open({
    trigger_id: shortcut.trigger_id,
    view: {
      type: "modal",
      callback_id: "quick_note_modal",
      title: { type: "plain_text", text: "Quick Note" },
      submit: { type: "plain_text", text: "Save" },
      private_metadata: metadata,
      blocks: [
        {
          type: "input",
          block_id: "note_block",
          label: { type: "plain_text", text: "Note" },
          element: {
            type: "plain_text_input",
            action_id: "note_input",
            multiline: true,
          },
        },
      ],
    },
  });
});
```

## pitfalls

- **Expecting `say()` on global shortcuts**: Global shortcuts have no channel context. Attempting to use `say()` will fail. The only response path is opening a modal via `client.views.open()` using the `trigger_id`.
- **Treating `shortcut.message.user` as always present**: Bot-posted messages may not include `user` in the message payload. Always handle it as optional when processing message shortcuts.
- **Not using `private_metadata` for modal follow-up**: After a shortcut opens a modal, the `view_submission` handler has no reference to the original shortcut context. Serialize channel ID, message timestamp, and other needed data into `private_metadata`.
- **Forgetting dashboard registration**: Code-side `app.shortcut('my_shortcut')` does nothing if the shortcut is not configured in the Slack app dashboard. Both global and message shortcuts need explicit registration with matching `callback_id`.
- **Confusing shortcuts with slash commands**: Shortcuts are UI-triggered (compose menu, message context menu) and always provide a `trigger_id`. Slash commands are text-triggered and provide both `trigger_id` and `response_url`. The handler signatures and available utilities differ.
- **RegExp matching without type constraint**: Using `app.shortcut(/task_.*/)` matches both global and message shortcuts. If your handler assumes message context (like `shortcut.channel`), add `{ type: 'message_action', callback_id: /task_.*/ }` to avoid runtime errors on global shortcut invocations.

## references

- https://api.slack.com/interactivity/shortcuts
- https://api.slack.com/interactivity/shortcuts/using
- https://api.slack.com/surfaces/modals
- https://slack.dev/bolt-js/concepts/shortcuts
- https://github.com/slackapi/bolt-js/blob/main/src/types/shortcuts/global-shortcut.ts
- https://github.com/slackapi/bolt-js/blob/main/src/types/shortcuts/message-shortcut.ts

## instructions

This expert covers Slack global shortcut and message shortcut handling in Bolt TypeScript. Use it when: registering shortcut handlers with `app.shortcut()`; distinguishing between global shortcuts and message shortcuts; accessing message content from message shortcuts; opening modals from shortcuts using `trigger_id`; passing shortcut context to modal submissions via `private_metadata`; or configuring shortcuts in the Slack app dashboard.

Pair with: `runtime.ack-rules-ts.md` for ack timing rules. `ui.modals-lifecycle-ts.md` for modal open/push/update/submit patterns after opening from a shortcut. `runtime.bolt-foundations-ts.md` for App setup.

## research

Deep Research prompt:

"Write a micro expert on Slack shortcuts (global and message) in Bolt TypeScript. Cover app.shortcut() registration with string/RegExp/constraints, GlobalShortcut vs MessageShortcut payload types and their differences (channel context, message data, say() availability), type-based filtering with constraints, trigger_id usage for opening modals, private_metadata for passing context to view_submission, respond() on message shortcuts, Enterprise Grid fields, and dashboard registration requirements. Source from @slack/bolt App.ts shortcut method, types/shortcuts/ directory, and Slack API shortcut docs."
