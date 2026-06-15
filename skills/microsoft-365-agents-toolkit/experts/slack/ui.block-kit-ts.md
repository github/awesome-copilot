# ui.block-kit-ts

## purpose

Composing Block Kit messages, interactive elements, modals, and view submissions in Slack Bolt (TypeScript).

## rules

1. Always include a top-level `text` string alongside `blocks[]` -- it serves as the notification preview, screen-reader fallback, and is displayed when blocks cannot render (api.slack.com/reference/messaging/compositions#text).
2. Every interactive element **must** have a unique `action_id` string. Bolt routes interaction payloads by matching `action_id` in `app.action()` listeners (slack.dev/bolt-js/concepts/actions).
3. Call `await ack()` **before** any async work in every `app.action`, `app.view`, `app.options`, and `app.shortcut` handler. Slack requires acknowledgement within 3 seconds or the user sees an error (api.slack.com/interactivity/handling#acknowledgment_response).
4. Use `trigger_id` from the interaction payload to open modals via `client.views.open()`. Trigger IDs expire after 3 seconds (api.slack.com/surfaces/modals#opening).
5. In `view_submission` handlers, form values live at `view.state.values[block_id][action_id].value` (or `.selected_option`, `.selected_date`, etc. depending on element type). Always access via both `block_id` and `action_id` keys (api.slack.com/reference/interaction-payloads/views#view_submission).
6. Blocks array maximum is 50 blocks per message and 100 blocks per modal/home-tab view (api.slack.com/reference/block-kit/blocks).
7. To update an existing message after an interaction, use `respond()` (which hits the `response_url`) for ephemeral/in-channel replacement, or `client.chat.update()` with `channel` + `ts` for precise message targeting (api.slack.com/methods/chat.update).
8. Use `input` blocks (not `section` accessory elements) inside modals when you need form-style data collection; only `input` blocks contribute to `view.state.values` on submission (api.slack.com/surfaces/modals#gathering_input).
9. Set `dispatch_action: true` on an `input` block to receive real-time `block_actions` payloads while the modal is open; without it, the value is only available on submission (api.slack.com/reference/block-kit/blocks#input).
10. Namespace `action_id` values with a domain prefix (e.g., `ticket_create_priority`, `approval_approve_btn`) so regex-based listeners can match groups and handlers stay discoverable.

## patterns

### Composing a message with blocks and a text fallback

```typescript
import { App, type KnownBlock } from "@slack/bolt";

function buildTicketBlocks(title: string, assignee: string): KnownBlock[] {
  return [
    { type: "header", text: { type: "plain_text", text: title } },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Assignee:*\n${assignee}` },
        { type: "mrkdwn", text: `*Status:*\nOpen` },
      ],
    },
    { type: "divider" },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Approve" },
          style: "primary",
          action_id: "ticket_approve_btn",
          value: "approved",
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Reject" },
          style: "danger",
          action_id: "ticket_reject_btn",
          value: "rejected",
        },
        {
          type: "static_select",
          placeholder: { type: "plain_text", text: "Change priority" },
          action_id: "ticket_priority_select",
          options: [
            { text: { type: "plain_text", text: "High" }, value: "high" },
            { text: { type: "plain_text", text: "Medium" }, value: "med" },
            { text: { type: "plain_text", text: "Low" }, value: "low" },
          ],
        },
      ],
    },
  ];
}

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

app.command("/ticket", async ({ ack, say }) => {
  await ack();
  await say({
    text: "New ticket: Server outage", // fallback for notifications
    blocks: buildTicketBlocks("Server outage", "<@U12345>"),
  });
});
```

### Opening a modal and handling view submission

```typescript
import type { App, BlockAction, ViewSubmitAction } from "@slack/bolt";

export function registerTicketModal(app: App): void {
  // Step 1: Button click opens the modal
  app.action("ticket_create_btn", async ({ ack, body, client }) => {
    await ack();
    const triggerBody = body as BlockAction;
    await client.views.open({
      trigger_id: triggerBody.trigger_id!,
      view: {
        type: "modal",
        callback_id: "ticket_create_modal",
        title: { type: "plain_text", text: "Create Ticket" },
        submit: { type: "plain_text", text: "Submit" },
        close: { type: "plain_text", text: "Cancel" },
        blocks: [
          {
            type: "input",
            block_id: "title_block",
            label: { type: "plain_text", text: "Title" },
            element: {
              type: "plain_text_input",
              action_id: "title_input",
              placeholder: { type: "plain_text", text: "Describe the issue" },
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
                { text: { type: "plain_text", text: "Medium" }, value: "med" },
                { text: { type: "plain_text", text: "Low" }, value: "low" },
              ],
            },
          },
          {
            type: "input",
            block_id: "due_block",
            label: { type: "plain_text", text: "Due Date" },
            element: { type: "datepicker", action_id: "due_date" },
            optional: true,
          },
        ],
      },
    });
  });

  // Step 2: Handle the submission
  app.view("ticket_create_modal", async ({ ack, view, client }) => {
    const vals = view.state.values;
    const title = vals.title_block.title_input.value!;
    const priority = vals.priority_block.priority_select.selected_option!.value;
    const dueDate = vals.due_block.due_date.selected_date; // string | null

    // Validate -- return errors to keep modal open
    if (title.length < 5) {
      await ack({
        response_action: "errors",
        errors: { title_block: "Title must be at least 5 characters." },
      });
      return;
    }
    await ack(); // closes the modal

    await client.chat.postMessage({
      channel: "#tickets",
      text: `New ticket: ${title}`,
      blocks: [
        { type: "header", text: { type: "plain_text", text: title } },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Priority:* ${priority}` },
            { type: "mrkdwn", text: `*Due:* ${dueDate ?? "None"}` },
          ],
        },
      ],
    });
  });
}
```

### Handling actions with regex and updating the original message

```typescript
import type { App, BlockAction, ButtonAction } from "@slack/bolt";

export function registerTicketActions(app: App): void {
  // Regex matches both ticket_approve_btn and ticket_reject_btn
  app.action<BlockAction>(
    /^ticket_(approve|reject)_btn$/,
    async ({ ack, action, body, respond }) => {
      await ack();
      const btnAction = action as ButtonAction;
      const decision = btnAction.value; // "approved" | "rejected"
      const user = body.user.id;

      // respond() uses the response_url -- replaces the original message
      await respond({
        replace_original: true,
        text: `Ticket ${decision} by <@${user}>`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Ticket *${decision}* by <@${user}>`,
            },
          },
        ],
      });
    }
  );

  // Static select handler
  app.action("ticket_priority_select", async ({ ack, action, respond }) => {
    await ack();
    const selected = (action as { selected_option: { value: string } })
      .selected_option.value;
    await respond({
      replace_original: false,
      text: `Priority changed to *${selected}*`,
    });
  });
}
```

## pitfalls

- **Forgetting `text` fallback**: If you only send `blocks` without a top-level `text` field, push notifications and screen readers show an empty message. Always set `text`.
- **`section` accessory vs `input` block in modals**: Interactive elements placed as `section` accessories inside a modal do NOT populate `view.state.values` on submission. Only `input` blocks contribute form data.
- **Stale `trigger_id`**: Trigger IDs expire ~3 seconds after the interaction. If you do async work (DB lookup, API call) before `client.views.open()`, call `ack()` immediately and open the view promptly. Do heavy work after the modal is open or on submission.
- **Duplicate `action_id` values**: If two elements share the same `action_id` in a single view, Slack silently drops the second. The API returns an error for messages. Always make `action_id` unique per surface.
- **`response_url` expiry**: The `response_url` from an interaction payload is valid for 30 minutes and supports up to 5 responses. After that, use `client.chat.update()` with `channel` and `ts`.
- **`view_submission` ack with errors**: The `errors` object keys must match `block_id` values, not `action_id`. Mismatched keys silently fail and the modal closes without showing errors.
- **Block limits**: Messages allow max 50 blocks; modals and home tabs allow 100. Exceeding these returns `invalid_blocks` error.
- **`private_metadata` size limit**: Modal `private_metadata` is capped at 3000 characters. For larger payloads, store data server-side and pass a lookup key.
- **`chat.update` requires the original `ts`**: When updating a bot's own message, store the `ts` from the `chat.postMessage` response. The `ts` acts as the message ID.

## references

- https://api.slack.com/reference/block-kit/blocks
- https://api.slack.com/reference/block-kit/block-elements
- https://api.slack.com/reference/block-kit/composition-objects
- https://api.slack.com/surfaces/modals
- https://api.slack.com/reference/interaction-payloads/views
- https://api.slack.com/tools/block-kit-builder
- https://api.slack.com/methods/chat.postMessage
- https://api.slack.com/methods/chat.update
- https://api.slack.com/methods/views.open
- https://slack.dev/bolt-js/concepts/actions
- https://slack.dev/bolt-js/concepts/view-submissions
- https://github.com/slackapi/bolt-js

## instructions

This expert covers Slack Block Kit for bot development using @slack/bolt in TypeScript. Use it when you need to: compose messages with blocks (section, actions, header, divider, context, input, image); wire up interactive elements (buttons, selects, datepickers, checkboxes, overflow menus); open and manage modals with trigger_id and client.views.open(); handle view_submission payloads and extract form values from view.state.values; update or replace messages via respond() or client.chat.update(); and follow action_id naming conventions for maintainable routing. The patterns section provides three canonical examples: a message with blocks and interactive buttons, a modal form with submission handling and validation, and regex-based action routing with message updates.

## research

Deep Research prompt:

"Write a micro expert on Slack Block Kit for bots: composing blocks, interactive elements, action_id patterns, opening modals, handling view submissions, and payload shapes. Provide 2-3 canonical examples and tips for maintainable block templates."
