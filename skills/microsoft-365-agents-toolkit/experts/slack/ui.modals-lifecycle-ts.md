# ui.modals-lifecycle-ts

## purpose

Modal (view) lifecycle management in Slack Bolt TypeScript — opening, updating, pushing, submitting, closing, and input validation.

## rules

1. Open a modal with `client.views.open({ trigger_id, view })`. A `trigger_id` is required and comes from commands, shortcuts, or interactive actions. It expires in ~3 seconds, so call `views.open` immediately after `ack()`. [api.slack.com/surfaces/modals#opening](https://api.slack.com/surfaces/modals#opening)
2. The `view` object requires `type: 'modal'`, `title` (plain_text, max 24 chars), and `blocks`. Optionally include `submit` (button label), `close` (button label), `callback_id` (for submission handling), and `private_metadata` (max 3000 chars of serialized context). [api.slack.com/reference/surfaces/views](https://api.slack.com/reference/surfaces/views)
3. Register submission handlers with `app.view('callback_id', handler)`. The default event type is `view_submission`. The handler receives `view` (the full view state), `body` (the submission event), and `ack`. [slack.dev/bolt-js/concepts/view-submissions](https://slack.dev/bolt-js/concepts/view-submissions)
4. Access input values through `view.state.values[blockId][actionId]`. Each input element's value depends on its type: `.value` for text inputs, `.selected_option` for selects, `.selected_date` for date pickers, `.selected_users` for multi-user selects, `.selected_conversations` for conversation selects, `.files` for file inputs. [api.slack.com/reference/interaction-payloads/views#view_submission_fields](https://api.slack.com/reference/interaction-payloads/views#view_submission_fields)
5. Validate inputs in the submission handler by returning errors from `ack()`: `await ack({ response_action: 'errors', errors: { block_id: 'Error message' } })`. This keeps the modal open and displays inline errors under the specified blocks. [api.slack.com/surfaces/modals#validation](https://api.slack.com/surfaces/modals#validation)
6. Four response actions are available in `ack()` for `view_submission`: `update` (replace current view), `push` (add new view to stack), `clear` (close all views in stack), and `errors` (show validation errors). Calling `ack()` with no arguments simply closes the current modal. [api.slack.com/surfaces/modals#response_actions](https://api.slack.com/surfaces/modals#response_actions)
7. Update a modal mid-interaction with `client.views.update({ view_id, view })`. Use `body.view.id` (from an action inside the modal) as the `view_id`. Optionally pass `hash` (from `body.view.hash`) to prevent race conditions — the update fails if the view changed since you read it. [api.slack.com/methods/views.update](https://api.slack.com/methods/views.update)
8. Push a new modal onto the stack with `client.views.push({ trigger_id, view })`. Up to 3 modals can be stacked. The `trigger_id` must come from an interaction inside the current modal (e.g., a button action). [api.slack.com/methods/views.push](https://api.slack.com/methods/views.push)
9. Handle `view_closed` events by registering `app.view({ callback_id: 'id', type: 'view_closed' }, handler)`. The payload includes `is_cleared` (true if the user clicked "X", false if the modal was programmatically cleared). You must set `notify_on_close: true` in the view definition to receive this event. [api.slack.com/reference/interaction-payloads/views#view_closed](https://api.slack.com/reference/interaction-payloads/views#view_closed)
10. Pass context between the trigger (command/shortcut/action) and the submission handler using `private_metadata`. Serialize the channel ID, user context, or any data needed by the submission handler as a JSON string. [api.slack.com/surfaces/modals#private_metadata](https://api.slack.com/surfaces/modals#private_metadata)
11. Use `view.response_urls` in the submission handler to post messages back to channels when the view contains inputs with `response_url_enabled: true` (only available on `conversations_select` and `channels_select` inputs). [api.slack.com/surfaces/modals#response_url](https://api.slack.com/surfaces/modals#response_url)
12. Modal `title` is limited to 24 characters, `submit` and `close` labels to 24 characters, and `private_metadata` to 3000 characters. Exceeding these limits causes the `views.open` or `views.update` call to fail silently or return an error. [api.slack.com/reference/surfaces/views](https://api.slack.com/reference/surfaces/views)

## patterns

### Multi-step modal with push and update

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

// Step 1: Open initial modal from a command
app.command("/survey", async ({ ack, command, client }) => {
  await ack();

  await client.views.open({
    trigger_id: command.trigger_id,
    view: {
      type: "modal",
      callback_id: "survey_step1",
      title: { type: "plain_text", text: "Survey (1/2)" },
      submit: { type: "plain_text", text: "Next" },
      close: { type: "plain_text", text: "Cancel" },
      private_metadata: JSON.stringify({ channel: command.channel_id }),
      blocks: [
        {
          type: "input",
          block_id: "name_block",
          label: { type: "plain_text", text: "Your Name" },
          element: {
            type: "plain_text_input",
            action_id: "name_input",
          },
        },
      ],
    },
  });
});

// Step 2: Push second modal on submit
app.view("survey_step1", async ({ ack, view }) => {
  const name = view.state.values.name_block.name_input.value!;

  // Push step 2 onto the modal stack
  await ack({
    response_action: "push",
    view: {
      type: "modal",
      callback_id: "survey_step2",
      title: { type: "plain_text", text: "Survey (2/2)" },
      submit: { type: "plain_text", text: "Submit" },
      private_metadata: JSON.stringify({
        ...JSON.parse(view.private_metadata || "{}"),
        name,
      }),
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Thanks, *${name}*! One more question:`,
          },
        },
        {
          type: "input",
          block_id: "rating_block",
          label: { type: "plain_text", text: "Rating (1-5)" },
          element: {
            type: "static_select",
            action_id: "rating_select",
            options: [1, 2, 3, 4, 5].map((n) => ({
              text: { type: "plain_text" as const, text: String(n) },
              value: String(n),
            })),
          },
        },
      ],
    },
  });
});

// Final submission: validate and process
app.view("survey_step2", async ({ ack, view, client }) => {
  const meta = JSON.parse(view.private_metadata || "{}");
  const rating = view.state.values.rating_block.rating_select.selected_option!.value;

  // Clear entire modal stack
  await ack({ response_action: "clear" });

  // Post results to original channel
  await client.chat.postMessage({
    channel: meta.channel,
    text: `Survey from *${meta.name}*: rated ${rating}/5`,
  });
});
```

### Validation with inline errors

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

app.view("registration_modal", async ({ ack, view, client }) => {
  const vals = view.state.values;
  const email = vals.email_block.email_input.value || "";
  const age = vals.age_block.age_input.value || "";

  const errors: Record<string, string> = {};

  if (!email.includes("@") || !email.includes(".")) {
    errors.email_block = "Please enter a valid email address.";
  }

  const ageNum = parseInt(age, 10);
  if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
    errors.age_block = "Age must be a number between 13 and 120.";
  }

  if (Object.keys(errors).length > 0) {
    // Return errors — modal stays open with inline error messages
    await ack({ response_action: "errors", errors });
    return;
  }

  // Valid — close modal
  await ack();

  const meta = JSON.parse(view.private_metadata || "{}");
  await client.chat.postMessage({
    channel: meta.channel,
    text: `Registration: ${email}, age ${age}`,
  });
});
```

### Dynamic modal update from button action inside modal

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

// Handle button click inside a modal — update the view
app.action("add_item", async ({ ack, body, client }) => {
  await ack();

  if (!body.view) return;

  // Parse current items from private_metadata
  const meta = JSON.parse(body.view.private_metadata || '{"items":[]}');
  meta.items.push(`Item ${meta.items.length + 1}`);

  // Rebuild blocks with updated item list
  const itemBlocks = meta.items.map((item: string) => ({
    type: "section" as const,
    text: { type: "mrkdwn" as const, text: `• ${item}` },
  }));

  await client.views.update({
    view_id: body.view.id,
    hash: body.view.hash, // Prevent race conditions
    view: {
      type: "modal",
      callback_id: "item_list_modal",
      title: { type: "plain_text", text: "Item List" },
      submit: { type: "plain_text", text: "Done" },
      private_metadata: JSON.stringify(meta),
      blocks: [
        ...itemBlocks,
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Add Item" },
              action_id: "add_item",
            },
          ],
        },
      ],
    },
  });
});
```

## pitfalls

- **Calling `views.open` after the trigger_id expires**: The trigger ID from commands, shortcuts, and actions is valid for ~3 seconds. Do any slow work (API calls, database queries) **after** opening the modal, not before. Use `views.update` to populate the modal with data later.
- **Missing `callback_id` on the view**: Without `callback_id`, `app.view()` cannot match the submission. The modal will submit but no handler will fire, leaving the user with a spinning submit button.
- **Wrong block IDs in error responses**: `response_action: 'errors'` keys must match `block_id` values from `input` blocks in the view. A typo in the block ID silently ignores the error and closes the modal.
- **Exceeding `private_metadata` limit**: The 3000-character limit is easy to hit when serializing large objects. Store minimal identifiers (IDs, keys) and look up full data in your submission handler.
- **Not setting `notify_on_close: true`**: The `view_closed` event is not sent by default. If you need cleanup logic when users dismiss a modal, set `notify_on_close: true` in the view definition.
- **Stacking more than 3 modals**: Slack limits the modal stack to 3 views. A `views.push` call beyond this limit returns an error. Design multi-step flows to use `update` instead of `push` for 4+ steps.
- **Using `views.update` on a closed view**: If the user closes the modal before your `views.update` call arrives, the call fails. Wrap in a try/catch when updates happen asynchronously.
- **Accessing `view.state.values` on non-input blocks**: Only `input`-type blocks contribute to `view.state.values`. Section blocks with accessories, action blocks, and context blocks do not appear in the values object.

## references

- https://api.slack.com/surfaces/modals
- https://api.slack.com/surfaces/modals#opening
- https://api.slack.com/surfaces/modals#updating
- https://api.slack.com/surfaces/modals#response_actions
- https://api.slack.com/surfaces/modals#validation
- https://api.slack.com/methods/views.open
- https://api.slack.com/methods/views.update
- https://api.slack.com/methods/views.push
- https://api.slack.com/reference/surfaces/views
- https://slack.dev/bolt-js/concepts/view-submissions
- https://github.com/slackapi/bolt-js/blob/main/src/types/view/index.ts

## instructions

This expert covers the full modal (view) lifecycle in Slack Bolt TypeScript. Use it when: opening modals from commands, shortcuts, or button actions; building multi-step modal flows with push and update; handling `view_submission` with input validation and error responses; dynamically updating modals in response to in-modal interactions; using `private_metadata` to pass context from trigger to submission; handling `view_closed` for cleanup; or working with `response_url` in modal submissions.

Pair with: `runtime.ack-rules-ts.md` for ack timing on view submissions. `ui.block-kit-ts.md` for constructing modal block layouts and input elements. `runtime.shortcuts-ts.md` when modals are opened from shortcuts. `runtime.slash-commands-ts.md` when modals are opened from commands.

## research

Deep Research prompt:

"Write a micro expert on Slack modal (view) lifecycle management in Bolt TypeScript. Cover views.open (trigger_id, view structure with callback_id/title/blocks/submit/close/private_metadata), views.update (view_id, hash for race conditions), views.push (modal stacking, 3-view limit), app.view() submission handlers (view.state.values access patterns for different input types), response_action variants (update, push, clear, errors), input validation with inline errors, view_closed events (notify_on_close, is_cleared), private_metadata for context passing, response_url_enabled for channel-targeted responses, and character limits (title 24, private_metadata 3000). Source from @slack/bolt types/view/index.ts, Slack API modal docs, and bolt-js view handler implementation."
