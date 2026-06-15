# shortcuts-extensions-ts

## purpose

Bridges Slack shortcuts (global and message) and Teams message extensions / compose extensions for cross-platform bots targeting Slack, Teams, or both.

## rules

1. **Slack global shortcuts → Teams action-based compose extensions with `context: ['compose', 'commandBox']`.** Slack global shortcuts appear in the lightning bolt menu and don't reference a specific message. In Teams, the equivalent is a compose extension with `fetchTask: true` and action context targeting the compose box and command bar. [learn.microsoft.com -- Action-based extensions](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/define-action-command)
2. **Slack message shortcuts → Teams action-based extensions with `context: ['message']`.** Slack message shortcuts appear in the message context menu (⋮ → More actions). In Teams, action-based extensions with `context: ['message']` appear in the message overflow menu (... → More actions). The target message content is available in the invoke payload. [learn.microsoft.com -- Message context](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/define-action-command#choose-action-command-invoke-locations)
3. **Slack `trigger_id` + `views.open()` → Teams `fetchTask: true` + task module.** Slack shortcuts use the `trigger_id` to open a modal. Teams action-based extensions use `fetchTask: true` in the manifest, which causes Teams to invoke the bot's `message.ext.open` handler to fetch the task module (dialog) content. No trigger_id needed. [learn.microsoft.com -- Task module from extension](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/create-task-module)
4. **Slack `shortcut.message` (target message in message shortcuts) → Teams `activity.value.messagePayload`.** When a message shortcut is invoked in Slack, the message object is in `shortcut.message`. In Teams, the message that was acted upon is in `activity.value.messagePayload` with `id`, `body.content`, `from`, `createdDateTime`, and `attachments`. [learn.microsoft.com -- Message payload](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/define-action-command#payload-activity-properties-when-invoked-from-a-message)
5. **Manifest `composeExtensions[].commands[]` with `type: "action"` is required.** Unlike Slack where shortcuts are configured in the app dashboard, Teams requires each action command to be declared in the manifest JSON with its title, description, parameters, and context array. Without this, the extension never appears. [learn.microsoft.com -- Manifest schema](https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema#composeextensionscommands)
6. **Slack `app.shortcut('callback_id')` → Teams handler routing via `activity.value.commandId`.** Slack routes shortcuts by `callback_id`. Teams invokes the same `message.ext.open` handler for all action commands — differentiate by checking `activity.value.commandId` against the command `id` in the manifest. [learn.microsoft.com -- Handle action](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/respond-to-task-module-submit)
7. **Task module response replaces Slack modal view return.** Slack's `views.open()` returns a view object with blocks. Teams' `message.ext.open` handler returns a task module response containing either an Adaptive Card or an iframe URL. The Adaptive Card path is closest to Slack's modal behavior. [learn.microsoft.com -- Task modules](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/what-are-task-modules)
8. **Slack `view_submission` → Teams `message.ext.submit`.** When the user submits the task module form, Teams invokes the `message.ext.submit` handler (or `composeExtension/submitAction` activity). The form data is in `activity.value.data`. The handler can return a card to insert into the compose box, send a message, or show another task module. [learn.microsoft.com -- Handle submit](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/respond-to-task-module-submit)
9. **No "fire and forget" shortcuts in Teams.** Slack global shortcuts can trigger background actions without showing a modal (just `ack()` + do work). Teams action-based extensions always show a task module if `fetchTask: true`. To mimic fire-and-forget, return a minimal confirmation card from the task module and process in the background. [learn.microsoft.com -- Action commands](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/define-action-command)
10. **Teams action extensions can insert cards into the compose box.** Slack shortcuts post messages via `say()` or `respond()`. Teams action extensions can return a card that gets inserted into the user's compose box for them to review and send. This is a UX improvement — the user controls when the message is posted. Return `{ composeExtension: { type: 'result', attachments: [...] } }` from the submit handler. [learn.microsoft.com -- Respond to submit](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/respond-to-task-module-submit#respond-with-an-adaptive-card-message-sent-from-a-bot)
11. **Reverse direction (Teams → Slack):** For Teams → Slack, map compose extensions to `app.shortcut` with `global_shortcut` or `message_shortcut` type. Action-based extensions with `context: ['compose', 'commandBox']` map to Slack global shortcuts; extensions with `context: ['message']` map to Slack message shortcuts. Task module forms become Slack modals opened via `views.open()` with a `trigger_id`. The `message.ext.submit` handler maps to a Slack `view_submission` handler.

## patterns

### Message shortcut → action-based message extension

**Slack (before):**

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

// Message shortcut — appears in message context menu
app.shortcut("create_ticket_from_message", async ({ ack, shortcut, client }) => {
  await ack();

  const message = (shortcut as any).message;
  await client.views.open({
    trigger_id: shortcut.trigger_id,
    view: {
      type: "modal",
      callback_id: "ticket_from_message",
      title: { type: "plain_text", text: "Create Ticket" },
      submit: { type: "plain_text", text: "Create" },
      blocks: [
        {
          type: "input",
          block_id: "title_block",
          label: { type: "plain_text", text: "Ticket Title" },
          element: {
            type: "plain_text_input",
            action_id: "title_input",
            initial_value: message.text?.substring(0, 100) ?? "",
          },
        },
        {
          type: "input",
          block_id: "priority_block",
          label: { type: "plain_text", text: "Priority" },
          element: {
            type: "static_select",
            action_id: "priority_select",
            options: [
              { text: { type: "plain_text", text: "High" }, value: "high" },
              { text: { type: "plain_text", text: "Medium" }, value: "medium" },
              { text: { type: "plain_text", text: "Low" }, value: "low" },
            ],
          },
        },
      ],
      private_metadata: JSON.stringify({
        channel: message.channel,
        messageTs: message.ts,
      }),
    },
  });
});

app.view("ticket_from_message", async ({ ack, view, client }) => {
  await ack();
  const title = view.state.values.title_block.title_input.value!;
  const priority = view.state.values.priority_block.priority_select.selected_option?.value;
  const meta = JSON.parse(view.private_metadata);
  await client.chat.postMessage({
    channel: meta.channel,
    text: `Ticket created: *${title}* [${priority}]`,
    thread_ts: meta.messageTs,
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

// message.ext.open — returns task module (replaces views.open with trigger_id)
app.on("message.ext.open" as any, async ({ activity }) => {
  const commandId = activity.value?.commandId;

  if (commandId === "createTicketFromMessage") {
    // Target message content (replaces shortcut.message)
    const messagePayload = activity.value?.messagePayload;
    const messageText = messagePayload?.body?.content ?? "";

    return {
      status: 200,
      body: {
        task: {
          type: "continue",
          value: {
            title: "Create Ticket",
            card: {
              contentType: "application/vnd.microsoft.card.adaptive",
              content: {
                type: "AdaptiveCard",
                version: "1.5",
                body: [
                  {
                    type: "Input.Text",
                    id: "ticketTitle",
                    label: "Ticket Title",
                    value: messageText.substring(0, 100),
                    isRequired: true,
                  },
                  {
                    type: "Input.ChoiceSet",
                    id: "priority",
                    label: "Priority",
                    value: "medium",
                    choices: [
                      { title: "High", value: "high" },
                      { title: "Medium", value: "medium" },
                      { title: "Low", value: "low" },
                    ],
                  },
                ],
                actions: [{
                  type: "Action.Submit",
                  title: "Create",
                }],
              },
            },
          },
        },
      },
    };
  }
});

// message.ext.submit — handle form submission (replaces app.view handler)
app.on("message.ext.submit" as any, async ({ activity, send }) => {
  const data = activity.value?.data;
  if (data) {
    const title = data.ticketTitle;
    const priority = data.priority;

    // Send confirmation to the conversation
    await send(`Ticket created: **${title}** [${priority}]`);
  }
  return { status: 200, body: {} };
});

app.start(3978);
```

**Manifest for the message action extension:**

```json
{
  "composeExtensions": [
    {
      "botId": "${{BOT_ID}}",
      "commands": [
        {
          "id": "createTicketFromMessage",
          "type": "action",
          "title": "Create Ticket",
          "description": "Create a ticket from this message",
          "context": ["message"],
          "fetchTask": true
        }
      ]
    }
  ]
}
```

### Global shortcut → compose extension

**Slack (before):**

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

// Global shortcut — appears in the ⚡ menu
app.shortcut("quick_note", async ({ ack, shortcut, client }) => {
  await ack();
  await client.views.open({
    trigger_id: shortcut.trigger_id,
    view: {
      type: "modal",
      callback_id: "quick_note_modal",
      title: { type: "plain_text", text: "Quick Note" },
      submit: { type: "plain_text", text: "Save" },
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

app.view("quick_note_modal", async ({ ack, view }) => {
  const note = view.state.values.note_block.note_input.value!;
  await ack();
  await saveNote(note);
});
```

**Teams (after):**

```typescript
import { App } from "@microsoft/teams.apps";
import { ConsoleLogger } from "@microsoft/teams.common";

const app = new App({
  logger: new ConsoleLogger("my-bot", { level: "info" }),
});

app.on("message.ext.open" as any, async ({ activity }) => {
  if (activity.value?.commandId === "quickNote") {
    return {
      status: 200,
      body: {
        task: {
          type: "continue",
          value: {
            title: "Quick Note",
            card: {
              contentType: "application/vnd.microsoft.card.adaptive",
              content: {
                type: "AdaptiveCard",
                version: "1.5",
                body: [{
                  type: "Input.Text",
                  id: "noteText",
                  label: "Note",
                  isMultiline: true,
                  isRequired: true,
                }],
                actions: [{ type: "Action.Submit", title: "Save" }],
              },
            },
          },
        },
      },
    };
  }
});

app.on("message.ext.submit" as any, async ({ activity }) => {
  const note = activity.value?.data?.noteText;
  if (note) {
    await saveNote(note);
  }
  // Return empty to close the task module
  return { status: 200, body: {} };
});

async function saveNote(note: string) { /* persist note */ }

app.start(3978);
```

**Manifest for compose/commandBox action:**

```json
{
  "composeExtensions": [
    {
      "botId": "${{BOT_ID}}",
      "commands": [
        {
          "id": "quickNote",
          "type": "action",
          "title": "Quick Note",
          "description": "Save a quick note",
          "context": ["compose", "commandBox"],
          "fetchTask": true
        }
      ]
    }
  ]
}
```

### Shortcut mapping table

| Slack Pattern | Teams Equivalent | Notes |
|---|---|---|
| `app.shortcut('callback_id')` (global) | `message.ext.open` + `commandId` check | Compose extension action |
| `app.shortcut('callback_id')` (message) | `message.ext.open` + `commandId` check | `context: ['message']` in manifest |
| `shortcut.trigger_id` + `views.open()` | `fetchTask: true` → return task module | No trigger_id needed |
| `shortcut.message` | `activity.value.messagePayload` | Target message content |
| `callback_id` routing | `activity.value.commandId` routing | Different field name |
| `view_submission` handler | `message.ext.submit` handler | Form data in `activity.value.data` |
| `ack()` + background work | Return minimal card + async work | No fire-and-forget |
| `say()` / `respond()` after shortcut | `send()` or return compose card | Can insert into compose box |

## pitfalls

- **Missing `composeExtensions` commands in manifest**: Each shortcut must have a corresponding command entry in the manifest with `type: "action"`. Without it, the action never appears in Teams' UI.
- **Forgetting `fetchTask: true`**: Without this flag, Teams won't invoke the `message.ext.open` handler. Instead, it expects parameters defined in the manifest and skips the task module entirely.
- **`context` array determines placement**: Omitting the `context` array or using wrong values means the action appears in unexpected places or not at all. Use `['message']` for message shortcuts, `['compose', 'commandBox']` for global shortcuts.
- **`messagePayload` HTML content**: The target message body in `activity.value.messagePayload.body.content` may be HTML-formatted (not plain text). Parse or strip HTML before using as form default values.
- **No background-only shortcuts**: Slack allows shortcuts that just `ack()` and do work silently. Teams action extensions always present a task module. Wrap background actions in a minimal "Processing..." → "Done" card flow.
- **Submit handler must return within 3 seconds**: Like all invoke activities, the `message.ext.submit` handler must respond quickly. Long-running operations should return immediately and process asynchronously.

## references

- https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/define-action-command
- https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/create-task-module
- https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/action-commands/respond-to-task-module-submit
- https://learn.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema#composeextensionscommands
- https://github.com/microsoft/teams.ts
- https://api.slack.com/interactivity/shortcuts — Slack shortcuts
- https://api.slack.com/reference/interaction-payloads/shortcuts — Slack shortcut payloads

## instructions

Use this expert when adding cross-platform support in either direction for shortcuts and message/compose extensions. It covers: Slack global shortcuts bridged to Teams compose extensions, Slack message shortcuts bridged to Teams action-based extensions with `context: ['message']`, `trigger_id` vs `fetchTask: true`, target message access via `messagePayload`, task module form flows bridged to Slack modals, and reverse mapping from Teams extensions to Slack shortcuts. Pair with `../teams/ui.message-extensions-ts.md` for general message extension patterns, `../teams/ui.dialogs-task-modules-ts.md` for task module details, and `ui-modals-dialogs-ts.md` for modal-to-dialog conversion.

## research

Deep Research prompt:

"Write a micro expert for bridging Slack shortcuts (global shortcuts and message shortcuts) and Microsoft Teams action-based message extensions in either direction. Cover: manifest composeExtensions command config with context arrays, fetchTask: true for task module invocation, trigger_id elimination, message payload access for message shortcuts, view_submission to message.ext.submit, the lack of fire-and-forget shortcuts in Teams, compose box card insertion, and reverse mapping from Teams compose/action extensions back to Slack shortcuts. Include TypeScript code examples and a mapping table."
