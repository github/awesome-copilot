# runtime.slash-commands-ts

## purpose

Slack slash command registration, payload handling, and response patterns in Bolt TypeScript apps.

## rules

1. Register slash command handlers with `app.command('/command-name', handler)`. The command string must include the leading `/` and match the command configured in the Slack app dashboard. [slack.dev/bolt-js/concepts/commands](https://slack.dev/bolt-js/concepts/commands)
2. The handler context includes `command` (the full payload), `ack`, `say`, `respond`, and `client`. The `command` object contains: `text` (everything after the command), `trigger_id`, `response_url`, `user_id`, `user_name`, `channel_id`, `channel_name`, `team_id`, `team_domain`, and `enterprise_id`. [api.slack.com/interactivity/slash-commands](https://api.slack.com/interactivity/slash-commands)
3. Always call `await ack()` within 3 seconds. Optionally pass a string or `{ text, blocks }` to `ack()` for an immediate ephemeral response visible only to the invoking user. [api.slack.com/interactivity/slash-commands#responding_to_commands](https://api.slack.com/interactivity/slash-commands#responding_to_commands)
4. The default response type for `ack(text)` and `respond()` is **ephemeral** (visible only to the user). To make a response visible to the entire channel, set `response_type: "in_channel"` in the `respond()` payload. [api.slack.com/interactivity/slash-commands#responding_to_commands](https://api.slack.com/interactivity/slash-commands#responding_to_commands)
5. Use `respond()` (backed by `response_url`) for follow-up messages after `ack()`. The `response_url` is valid for 30 minutes and supports up to 5 responses. Each call can set `replace_original`, `delete_original`, or `response_type`. [api.slack.com/interactivity/responding](https://api.slack.com/interactivity/responding)
6. Use `trigger_id` from the command payload to open modals with `client.views.open()`. The trigger ID expires in 3 seconds, so call `ack()` and `client.views.open()` early in the handler. [api.slack.com/surfaces/modals#opening](https://api.slack.com/surfaces/modals#opening)
7. Use `say()` to post a visible message to the channel where the command was invoked. Unlike `respond()`, messages from `say()` are always visible to everyone and appear as normal bot messages (not ephemeral). [slack.dev/bolt-js/concepts/commands](https://slack.dev/bolt-js/concepts/commands)
8. Parse the `command.text` string yourself for sub-commands or arguments. Bolt does not provide built-in argument parsing. Use `text.split(/\s+/)` or a command-parsing library for complex argument structures. [api.slack.com/interactivity/slash-commands](https://api.slack.com/interactivity/slash-commands)
9. Slash commands require the `commands` scope in the bot's OAuth configuration. Each command must be registered in the Slack app dashboard under "Slash Commands" with a request URL pointing to your app's endpoint. [api.slack.com/interactivity/slash-commands#creating_commands](https://api.slack.com/interactivity/slash-commands#creating_commands)
10. Commands invoked in DMs with the bot have `channel_id` set to the DM channel and `channel_name` set to `"directmessage"`. Always handle both channel and DM contexts in your command logic. [api.slack.com/interactivity/slash-commands](https://api.slack.com/interactivity/slash-commands)

## patterns

### Basic command with ephemeral ack and in-channel follow-up

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

app.command("/status", async ({ ack, command, respond }) => {
  // Immediate ephemeral acknowledgement
  await ack("Checking status...");

  // Simulate async lookup
  const status = await getSystemStatus();

  // Follow-up visible to entire channel
  await respond({
    response_type: "in_channel",
    text: `System status: ${status.summary}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*System Status* (requested by <@${command.user_id}>)`,
        },
      },
      { type: "divider" },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*API:* ${status.api}` },
          { type: "mrkdwn", text: `*Database:* ${status.db}` },
          { type: "mrkdwn", text: `*Queue:* ${status.queue}` },
          { type: "mrkdwn", text: `*Uptime:* ${status.uptime}` },
        ],
      },
    ],
  });
});

async function getSystemStatus() {
  return {
    summary: "All systems operational",
    api: ":white_check_mark: Healthy",
    db: ":white_check_mark: Healthy",
    queue: ":warning: Degraded",
    uptime: "14d 6h",
  };
}
```

### Command that opens a modal using trigger_id

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

app.command("/ticket", async ({ ack, command, client }) => {
  // ack with no visible response -- modal provides the UI
  await ack();

  // Open a modal using the trigger_id (must happen within 3 seconds)
  await client.views.open({
    trigger_id: command.trigger_id,
    view: {
      type: "modal",
      callback_id: "ticket_create_modal",
      title: { type: "plain_text", text: "Create Ticket" },
      submit: { type: "plain_text", text: "Create" },
      close: { type: "plain_text", text: "Cancel" },
      // Pre-fill with command text if provided
      private_metadata: JSON.stringify({ channel: command.channel_id }),
      blocks: [
        {
          type: "input",
          block_id: "title_block",
          label: { type: "plain_text", text: "Title" },
          element: {
            type: "plain_text_input",
            action_id: "title_input",
            initial_value: command.text || "",
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
              { text: { type: "plain_text", text: "Medium" }, value: "medium" },
              { text: { type: "plain_text", text: "Low" }, value: "low" },
            ],
          },
        },
      ],
    },
  });
});

// Handle the modal submission
app.view("ticket_create_modal", async ({ ack, view, client }) => {
  const vals = view.state.values;
  const title = vals.title_block.title_input.value!;
  const priority = vals.priority_block.priority_select.selected_option!.value;
  const meta = JSON.parse(view.private_metadata || "{}");

  if (title.length < 3) {
    await ack({
      response_action: "errors",
      errors: { title_block: "Title must be at least 3 characters." },
    });
    return;
  }

  await ack();

  await client.chat.postMessage({
    channel: meta.channel || "#tickets",
    text: `New ticket: ${title} [${priority}]`,
  });
});
```

### Command with sub-command argument parsing

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

app.command("/config", async ({ ack, command, respond }) => {
  await ack();

  const args = command.text.trim().split(/\s+/);
  const subCommand = args[0]?.toLowerCase();

  switch (subCommand) {
    case "get": {
      const key = args[1];
      if (!key) {
        await respond("Usage: `/config get <key>`");
        return;
      }
      const value = await getConfigValue(key);
      await respond(`\`${key}\` = \`${value ?? "not set"}\``);
      break;
    }
    case "set": {
      const key = args[1];
      const value = args.slice(2).join(" ");
      if (!key || !value) {
        await respond("Usage: `/config set <key> <value>`");
        return;
      }
      await setConfigValue(key, value);
      await respond({
        response_type: "in_channel",
        text: `Configuration updated: \`${key}\` = \`${value}\``,
      });
      break;
    }
    case "list": {
      const all = await listConfigValues();
      const formatted = all.map((c) => `\`${c.key}\` = \`${c.value}\``).join("\n");
      await respond(formatted || "No configuration values set.");
      break;
    }
    default:
      await respond("Unknown sub-command. Available: `get`, `set`, `list`");
  }
});

async function getConfigValue(key: string): Promise<string | null> {
  return "example-value";
}
async function setConfigValue(key: string, value: string): Promise<void> {}
async function listConfigValues(): Promise<{ key: string; value: string }[]> {
  return [{ key: "region", value: "us-east-1" }];
}
```

## pitfalls

- **Forgetting `await ack()`**: Every command handler must acknowledge. Missing it causes a "This command didn't work" error for the user after 3 seconds.
- **Doing slow work before `ack()`**: API calls, database queries, or any I/O before `ack()` risks the 3-second timeout. Always ack first.
- **Assuming `command.text` is non-empty**: Users can invoke `/command` with no arguments. Always handle the empty string case for `command.text`.
- **Ephemeral vs in-channel confusion**: The default `ack(text)` response and `respond()` responses are ephemeral. Users often expect channel-visible responses. Explicitly set `response_type: "in_channel"` when the response should be public.
- **`response_url` expiry**: The URL from `command.response_url` expires after 30 minutes and supports at most 5 responses. For longer-lived interactions, switch to `client.chat.postMessage()`.
- **Stale `trigger_id`**: If you ack, then do 2+ seconds of work, then try `client.views.open()`, the trigger_id may have expired. Open modals immediately after ack.
- **Command not registered in dashboard**: `app.command('/foo')` in code does nothing if `/foo` is not configured in the Slack app's "Slash Commands" settings. Both code and dashboard must agree.
- **Missing `commands` scope**: The bot must have the `commands` OAuth scope or slash command registration fails silently.

## references

- https://api.slack.com/interactivity/slash-commands
- https://api.slack.com/interactivity/slash-commands#creating_commands
- https://api.slack.com/interactivity/slash-commands#responding_to_commands
- https://api.slack.com/interactivity/responding
- https://api.slack.com/surfaces/modals#opening
- https://slack.dev/bolt-js/concepts/commands
- https://slack.dev/bolt-js/concepts/acknowledge
- https://github.com/slackapi/bolt-js

## instructions

This expert covers Slack slash command implementation in Bolt TypeScript. Use it when you need to: register command handlers with app.command(); understand the command payload properties (text, trigger_id, response_url, user_id, channel_id); implement ack() with immediate ephemeral responses; choose between ephemeral and in-channel response types; use respond() for follow-up messages via response_url; open modals from commands using trigger_id and client.views.open(); parse command arguments and implement sub-commands; and understand the dashboard configuration requirements for slash commands. Pair with `runtime.ack-rules-ts.md` for command ack timing, and `ui.block-kit-ts.md` when commands open modals or send Block Kit messages.

## research

Deep Research prompt:

"Write a micro expert on Slack slash commands in Bolt TypeScript. Cover app.command() registration, the command payload shape (text, trigger_id, response_url, user_id, channel_id), ack() with text/blocks, ephemeral vs in_channel response_type, respond() usage and limitations, opening modals from commands, sub-command argument parsing, and dashboard configuration requirements. Provide 2-3 canonical TypeScript examples."
