# runtime.ack-rules-ts

## purpose

Acknowledgement (ack) semantics, timing constraints, and async patterns for Slack interactions in Bolt TypeScript apps.

## rules

1. Slack requires every interactive request (commands, actions, view submissions, shortcuts, options) to be acknowledged within **3 seconds**. Failure to `ack()` in time causes the user to see a "dispatch_failed" error or a timeout spinner. [api.slack.com/interactivity/handling#acknowledgment_response](https://api.slack.com/interactivity/handling#acknowledgment_response)
2. **Commands** (`app.command`): must call `await ack()`. Optionally pass a string or blocks payload to `ack()` to send an immediate ephemeral response. Calling `ack()` with no argument sends a 200 OK with no visible reply. [slack.dev/bolt-js/concepts/commands](https://slack.dev/bolt-js/concepts/commands)
3. **Actions** (`app.action`): must call `await ack()`. The `ack()` function takes no arguments for actions -- it simply acknowledges receipt. Any response goes through `respond()` or `client` API calls after ack. [slack.dev/bolt-js/concepts/actions](https://slack.dev/bolt-js/concepts/actions)
4. **View submissions** (`app.view`): must call `await ack()`. Optionally pass a `response_action` object to control modal behavior: `{ response_action: "errors", errors: { block_id: "msg" } }` to show validation errors, `{ response_action: "update", view: {...} }` to replace the modal, `{ response_action: "push", view: {...} }` to push a new view onto the stack, or `{ response_action: "clear" }` to close all views in the stack. [api.slack.com/surfaces/modals#response_actions](https://api.slack.com/surfaces/modals#response_actions)
5. **Shortcuts** (`app.shortcut`): must call `await ack()` with no arguments. Then use `trigger_id` from the payload to open a modal via `client.views.open()`. [slack.dev/bolt-js/concepts/shortcuts](https://slack.dev/bolt-js/concepts/shortcuts)
6. **Options** (`app.options`): must call `await ack()` with an options payload containing the dynamic choices to display in the select menu. [slack.dev/bolt-js/concepts/options](https://slack.dev/bolt-js/concepts/options)
7. **Messages** (`app.message`) and **events** (`app.event`): do NOT require `ack()`. These are fire-and-forget from Slack's perspective. The `ack` property is not present in their context objects. [slack.dev/bolt-js/concepts/message-listening](https://slack.dev/bolt-js/concepts/message-listening)
8. Always call `ack()` **before** any async work (database calls, API requests, LLM inference). Perform long-running operations after acknowledgement to stay within the 3-second window. [api.slack.com/interactivity/handling#acknowledgment_response](https://api.slack.com/interactivity/handling#acknowledgment_response)
9. For commands that need a visible immediate reply, pass the response to `ack(text)` or `ack({ text, blocks })`. For a delayed or richer response, `ack()` with no arguments first, then use `respond()` or `say()` for the follow-up message. [slack.dev/bolt-js/concepts/commands](https://slack.dev/bolt-js/concepts/commands)
10. Duplicate ack calls are harmless but wasteful -- Slack ignores the second acknowledgement. However, calling `ack()` after the 3-second window has passed still results in a user-visible error regardless of the call. [api.slack.com/interactivity/handling](https://api.slack.com/interactivity/handling)

## patterns

### Command handler: ack immediately, then do async work

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

app.command("/deploy", async ({ ack, command, respond }) => {
  // Acknowledge immediately with an ephemeral message
  await ack(`Deploying \`${command.text || "latest"}\`... please wait.`);

  // Now safe to do slow async work -- ack already sent
  const result = await runDeployment(command.text);

  // Follow up via response_url (visible only to the user by default)
  await respond({
    response_type: "in_channel", // make visible to everyone
    text: `Deployment complete: ${result.status}`,
  });
});

async function runDeployment(target: string) {
  // simulate slow operation
  await new Promise((r) => setTimeout(r, 5000));
  return { status: "success" };
}
```

### Action handler: ack with no payload, then update the message

```typescript
import { App, type BlockAction, type ButtonAction } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

app.action<BlockAction>("approve_request", async ({ ack, action, body, client }) => {
  // Step 1: ack immediately -- no arguments for actions
  await ack();

  // Step 2: do async work after ack
  const requestId = (action as ButtonAction).value;
  await approveInDatabase(requestId!);

  // Step 3: update the original message to reflect the new state
  await client.chat.update({
    channel: body.channel!.id,
    ts: body.message!.ts,
    text: `Request ${requestId} approved by <@${body.user.id}>`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:white_check_mark: Request \`${requestId}\` approved by <@${body.user.id}>`,
        },
      },
    ],
  });
});

async function approveInDatabase(id: string) {
  await new Promise((r) => setTimeout(r, 1000));
}
```

### View submission: ack with response_action for validation or update

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

app.view("create_ticket_modal", async ({ ack, view, client }) => {
  const vals = view.state.values;
  const title = vals.title_block.title_input.value!;
  const priority = vals.priority_block.priority_select.selected_option!.value;

  // Validation: return errors to keep the modal open
  if (title.length < 5) {
    await ack({
      response_action: "errors",
      errors: { title_block: "Title must be at least 5 characters." },
    });
    return;
  }

  // Option A: close the modal (default ack behavior)
  await ack();

  // Option B (alternative): update the modal with a confirmation view
  // await ack({
  //   response_action: "update",
  //   view: {
  //     type: "modal",
  //     title: { type: "plain_text", text: "Ticket Created" },
  //     blocks: [
  //       { type: "section", text: { type: "mrkdwn", text: `:ticket: *${title}* created.` } },
  //     ],
  //   },
  // });

  // Post-ack async work: create the ticket and notify the channel
  await client.chat.postMessage({
    channel: "#tickets",
    text: `New ticket: ${title} (${priority})`,
  });
});
```

## pitfalls

- **Doing async work before `ack()`**: Database queries, API calls, or LLM inference before `ack()` risks exceeding the 3-second deadline. Always ack first, then process.
- **Passing arguments to `ack()` in action handlers**: Unlike commands, `app.action()` handlers do not accept a payload in `ack()`. Passing text to `ack("done")` in an action handler is silently ignored or throws depending on the Bolt version.
- **`response_action: "errors"` keys must be `block_id` values**: In view submissions, the `errors` object keys must match `block_id` strings, not `action_id`. Mismatched keys cause the modal to close without showing errors.
- **Missing `ack()` entirely**: If a handler throws before reaching `ack()`, the user sees a timeout error. Wrap handler logic in try/catch and ensure `ack()` is called in both success and error paths.
- **Late ack after exactly 3 seconds**: The 3-second limit is strict. Network latency between your server and Slack counts. In practice, aim to ack within the first 100ms of handler execution.
- **Confusing `ack()` with `respond()`**: `ack()` is the HTTP response to Slack's request. `respond()` uses the `response_url` and is a separate HTTP call. They serve different purposes and both may be needed in a single handler.
- **Calling `ack()` in message/event handlers**: The `ack` function does not exist in `app.message()` or `app.event()` context objects. Attempting to destructure `{ ack }` from these handlers results in `undefined`.

## references

- https://api.slack.com/interactivity/handling#acknowledgment_response
- https://api.slack.com/surfaces/modals#response_actions
- https://slack.dev/bolt-js/concepts/commands
- https://slack.dev/bolt-js/concepts/actions
- https://slack.dev/bolt-js/concepts/view-submissions
- https://slack.dev/bolt-js/concepts/shortcuts
- https://slack.dev/bolt-js/concepts/options
- https://slack.dev/bolt-js/concepts/acknowledge
- https://api.slack.com/interactivity/slash-commands#responding_to_commands
- https://github.com/slackapi/bolt-js

## instructions

This expert covers Slack Bolt acknowledgement (ack) semantics in TypeScript. Use it when you need to understand: which handler types require ack() and which do not; the 3-second deadline and how to structure handlers to meet it; ack() with response payloads for commands (text/blocks) and view submissions (response_action for errors, update, push, clear); the correct pattern of ack-first-then-async-work; and common mistakes that cause timeout errors or silent failures. This is critical knowledge for any Slack bot that handles commands, button clicks, modal submissions, shortcuts, or dynamic select menus. Pair with `runtime.bolt-foundations-ts.md` for the handler types where ack rules apply, and `ui.block-kit-ts.md` for Block Kit modal submission patterns.

## research

Deep Research prompt:

"Write a micro expert on Slack Bolt ack() rules in TypeScript. Cover which handler types require ack (commands, actions, views, shortcuts, options) vs those that do not (messages, events), the 3-second deadline, ack() with response payloads for commands and view submissions (response_action: errors/update/push/clear), async-after-ack patterns, and common mistakes that cause timeouts. Provide 2-3 canonical TypeScript examples."
