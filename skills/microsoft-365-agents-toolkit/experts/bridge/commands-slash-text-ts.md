# commands-slash-text-ts

## purpose

Bridges Slack slash commands and Teams text commands / message extensions for cross-platform bots targeting Slack, Teams, or both.

## rules

1. Teams bots do **not** have a native slash command system equivalent to Slack's `app.command('/name')`. Slack slash commands must be reimplemented using one of three Teams patterns: text pattern matching, messaging extensions, or manifest command hints. [learn.microsoft.com -- Bots in Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/what-are-bots)
2. The most direct migration path is **text pattern matching** with `app.message(regex)` in the Teams SDK. Map `app.command('/help')` to `app.message(/^\/?help$/i)`. The leading `/?` makes the slash optional so users can type either "help" or "/help". [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
3. Remove all `ack()` calls when migrating to Teams. Teams handlers do not require acknowledgement -- simply process the request and respond. The `ack` concept does not exist in the Teams SDK. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
4. Replace Slack's `respond()` (response_url) and `say()` with the Teams context methods `send()` (new message) and `reply()` (threaded reply). There is no Teams equivalent of Slack's ephemeral response -- all bot messages are visible to participants. [learn.microsoft.com -- Send proactive messages](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
5. Slack's `trigger_id` for opening modals has no direct Teams equivalent. Instead, send an Adaptive Card with form inputs inline, or use a Task Module (dialog) opened via `dialog.open` handler. Task modules do not require a trigger_id -- they are opened by card actions or link unfurling. [learn.microsoft.com -- Task modules](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/what-are-task-modules)
6. For command **discoverability**, add entries to the `commands` array in the manifest's `bots` section. These appear as suggestions when users type in the bot's compose box. They are UI hints only -- the bot still receives the text as a regular message. [learn.microsoft.com -- Bot commands](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/create-a-bot-commands-menu)
7. For a richer command UX, use **messaging extensions** (`composeExtensions` in manifest). Search-based extensions let users query and insert results; action-based extensions open a task module form. These replace complex slash commands that opened modals or returned structured data. [learn.microsoft.com -- Message extensions](https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/what-are-messaging-extensions)
8. Slack's `command.text` (the argument string) maps to parsing `activity.text` in Teams. Strip the bot @mention prefix first (set `activity.mentions.stripText: true` in App options), then parse the remaining text for arguments. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
9. Slack's `command.user_id` maps to `activity.from.aadObjectId` (Azure AD Object ID) in Teams. Slack's `command.channel_id` maps to `activity.conversation.id`. These IDs have completely different formats and are not interchangeable. [learn.microsoft.com -- Activity schema](https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-api-reference)
10. In Teams channels, bots only receive messages when @mentioned (unless configured otherwise via RSC permissions). Slash commands in Slack work without mention. Account for this UX difference by instructing users to @mention the bot or by scoping command bots to personal chat where every message is delivered. [learn.microsoft.com -- Channel conversations](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-and-group-conversations)

## patterns

### Migrating a Slack slash command to Teams text pattern matching

**Slack (before):**

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

app.command("/status", async ({ ack, command, respond }) => {
  await ack("Checking status...");
  const status = await getSystemStatus();
  await respond({
    response_type: "in_channel",
    text: `System status: ${status}`,
  });
});
```

**Teams (after):**

```typescript
import { App } from "@microsoft/teams.apps";
import { ConsoleLogger } from "@microsoft/teams.common";
import { DevtoolsPlugin } from "@microsoft/teams.dev";

const app = new App({
  logger: new ConsoleLogger("my-bot", { level: "info" }),
  plugins: [new DevtoolsPlugin()],
});

// No ack() needed. Regex makes the leading slash optional.
app.message(/^\/?status$/i, async ({ send }) => {
  const status = await getSystemStatus();
  // No ephemeral option -- all messages are visible
  await send(`System status: ${status}`);
});

async function getSystemStatus(): Promise<string> {
  return "All systems operational";
}

app.start(3978);
```

### Migrating a command that opened a modal to a Teams Adaptive Card form

**Slack (before):**

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

app.command("/ticket", async ({ ack, command, client }) => {
  await ack();
  await client.views.open({
    trigger_id: command.trigger_id,
    view: {
      type: "modal",
      callback_id: "ticket_modal",
      title: { type: "plain_text", text: "Create Ticket" },
      submit: { type: "plain_text", text: "Create" },
      blocks: [
        {
          type: "input",
          block_id: "title_block",
          label: { type: "plain_text", text: "Title" },
          element: { type: "plain_text_input", action_id: "title_input" },
        },
      ],
    },
  });
});

app.view("ticket_modal", async ({ ack, view, client }) => {
  const title = view.state.values.title_block.title_input.value!;
  await ack();
  await client.chat.postMessage({
    channel: "#tickets",
    text: `New ticket: ${title}`,
  });
});
```

**Teams (after) -- Adaptive Card inline form replaces modal:**

```typescript
import { App } from "@microsoft/teams.apps";
import { ConsoleLogger } from "@microsoft/teams.common";
import { DevtoolsPlugin } from "@microsoft/teams.dev";

const app = new App({
  logger: new ConsoleLogger("my-bot", { level: "info" }),
  plugins: [new DevtoolsPlugin()],
});

// User types "ticket" or "/ticket" to get the form card
app.message(/^\/?ticket$/i, async ({ send }) => {
  await send({
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
          type: "AdaptiveCard",
          version: "1.5",
          body: [
            { type: "TextBlock", text: "Create Ticket", weight: "Bolder", size: "Large" },
            {
              type: "Input.Text",
              id: "ticketTitle",
              label: "Title",
              placeholder: "Describe the issue",
              isRequired: true,
              errorMessage: "Title is required",
            },
            {
              type: "Input.ChoiceSet",
              id: "ticketPriority",
              label: "Priority",
              value: "medium",
              choices: [
                { title: "High", value: "high" },
                { title: "Medium", value: "medium" },
                { title: "Low", value: "low" },
              ],
            },
          ],
          actions: [
            {
              type: "Action.Submit",
              title: "Create",
              data: { action: "createTicket" },
            },
          ],
        },
      },
    ],
  });
});

// Handle the card form submission (replaces app.view handler)
app.on("card.action", async ({ activity, send }) => {
  const data = activity.value?.action?.data ?? activity.value;
  if (data?.action === "createTicket") {
    const title = data.ticketTitle;
    const priority = data.ticketPriority;
    await send(`Ticket created: ${title} [${priority}]`);
    return { status: 200 };
  }
});

app.start(3978);
```

### Migrating a data-lookup command to a search-based message extension

**Slack (before):**

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

// User types: /lookup serverName
app.command("/lookup", async ({ ack, command, respond }) => {
  await ack();
  const query = command.text;
  const results = await searchServers(query);
  if (results.length === 0) {
    await respond({ response_type: "ephemeral", text: "No results found." });
    return;
  }
  await respond({
    response_type: "ephemeral",
    blocks: results.map((r) => ({
      type: "section",
      text: { type: "mrkdwn", text: `*${r.name}*\nStatus: ${r.status} | IP: ${r.ip}` },
    })),
  });
});
```

**Teams (after) — search-based message extension:**

```typescript
import { App } from "@microsoft/teams.apps";
import { ConsoleLogger } from "@microsoft/teams.common";

const app = new App({
  logger: new ConsoleLogger("my-bot", { level: "info" }),
});

// Search-based message extension replaces /lookup
// Triggered from compose box or command bar in Teams
app.on("message.ext.query" as any, async ({ activity }) => {
  const query = activity.value?.queryOptions?.searchText ?? "";
  const results = await searchServers(query);

  return {
    status: 200,
    body: {
      composeExtension: {
        type: "result",
        attachmentLayout: "list",
        attachments: results.map((r) => ({
          contentType: "application/vnd.microsoft.card.adaptive",
          content: {
            type: "AdaptiveCard",
            version: "1.5",
            body: [
              { type: "TextBlock", text: r.name, weight: "Bolder" },
              { type: "TextBlock", text: `Status: ${r.status} | IP: ${r.ip}`, isSubtle: true },
            ],
          },
          preview: {
            contentType: "application/vnd.microsoft.card.thumbnail",
            content: { title: r.name, text: `${r.status} — ${r.ip}` },
          },
        })),
      },
    },
  };
});

async function searchServers(query: string) {
  return [{ name: "web-prod-01", status: "healthy", ip: "10.0.1.5" }];
}

app.start(3978);
```

**Manifest `composeExtensions` config (required for message extensions):**

```json
{
  "composeExtensions": [
    {
      "botId": "${{BOT_ID}}",
      "commands": [
        {
          "id": "lookupServer",
          "type": "query",
          "title": "Lookup Server",
          "description": "Search for servers by name",
          "initialRun": false,
          "parameters": [
            {
              "name": "searchText",
              "title": "Server name",
              "description": "Search for a server",
              "inputType": "text"
            }
          ]
        }
      ]
    }
  ]
}
```

### Adding manifest commands for discoverability

```json
{
  "bots": [
    {
      "botId": "${{BOT_ID}}",
      "scopes": ["personal", "team", "groupChat"],
      "commands": [
        {
          "title": "status",
          "description": "Check system status"
        },
        {
          "title": "ticket",
          "description": "Create a new support ticket"
        },
        {
          "title": "help",
          "description": "Show available commands"
        }
      ]
    }
  ]
}
```

**Command mapping reference table:**

| Slack Pattern | Teams Equivalent | Notes |
|---|---|---|
| `app.command('/help', ...)` | `app.message(/^\/?help$/i, ...)` | Text matching; no ack needed |
| `ack()` / `ack(text)` | *(remove)* | Teams has no ack concept |
| `respond({ response_type: "in_channel" })` | `send(text)` | All Teams messages are visible |
| `respond({ response_type: "ephemeral" })` | *(no equivalent)* | Redesign as personal chat or card |
| `command.trigger_id` + `views.open()` | Adaptive Card form or `dialog.open` | No trigger_id in Teams |
| `command.text` | `activity.text` (after stripping @mention) | Parse arguments from message text |
| `command.user_id` (U-ID) | `activity.from.aadObjectId` (AAD GUID) | Different ID format |
| `command.channel_id` (C-ID) | `activity.conversation.id` | Different ID format |
| `command.response_url` | `send()` / `reply()` | Direct methods, no URL-based responses |
| Manifest: Slack app dashboard | Manifest: `bots[].commands[]` | JSON file instead of web UI |

### Best practice: text matching + manifest commands together (Y1)

Use **both** text pattern matching and manifest bot commands for the best UX. Manifest commands give discoverability (users see them in the command menu); text matching ensures the bot responds to both `/weather` and `weather` so users migrating from Slack don't retrain muscle memory.

```typescript
// Accept both "/weather" and "weather" — regex makes slash optional
app.message(/^\/?weather$/i, async ({ send }) => {
  const weather = await getWeather();
  await send(`Current weather: ${weather}`);
});
```

**Manifest (add commands for discoverability):**

```json
{
  "bots": [{
    "botId": "${{BOT_ID}}",
    "scopes": ["personal", "team", "groupChat"],
    "commands": [
      { "title": "weather", "description": "Check the current weather" },
      { "title": "status", "description": "Check system status" },
      { "title": "help", "description": "Show available commands" }
    ]
  }]
}
```

**Don't:** Create a message extension for every slash command. Reserve extensions for commands that benefit from rich search results or task module UI.

**Reverse (Teams → Slack):** Register commands via `app.command("/name", handler)` with `await ack()`. Configure in the Slack app dashboard.

### Reverse direction (Teams → Slack)

For Teams → Slack, map `app.message(regex)` to `app.command('/name')`, add `ack()` calls, and convert Adaptive Card forms to Block Kit modals. Key reverse mappings:
- `app.message(/^\/?name$/i, ...)` → `app.command('/name', ...)` with `await ack()` at the top
- `send(text)` → `respond({ response_type: 'in_channel', text })` or `say(text)`
- `reply(text)` → `say({ text, thread_ts: message.ts })`
- Adaptive Card inline form → `views.open(trigger_id, view)` with Block Kit modal
- `app.on('card.action', ...)` with `data.action` routing → `app.view('callback_id', ...)` for modal submissions, `app.action('action_id', ...)` for button clicks
- Manifest `bots[].commands[]` → Slack App Dashboard slash command configuration
- `activity.from.aadObjectId` → `command.user_id` (requires ID mapping table)
- `activity.text` (after stripping @mention) → `command.text` (clean argument string)
- Message extensions (search-based) → slash commands returning ephemeral blocks, or external data source selects
- All visible messages → consider which should be `response_type: 'ephemeral'` for Slack's richer privacy model

## pitfalls

- **Expecting slash command UX in Teams**: Teams users do not get the same discoverable `/command` experience. Set expectations that commands are triggered by typing text or using the bot commands menu.
- **Forgetting to remove `ack()`**: Leaving `ack()` calls in migrated code causes runtime errors since the Teams context object has no `ack` method.
- **Not handling @mention prefix**: In Teams channels, `activity.text` includes the @mention text (e.g., `<at>BotName</at> status`). Set `activity.mentions.stripText: true` in App options or strip manually before matching.
- **Relying on ephemeral responses**: Slack commands can respond ephemerally. Teams has no ephemeral messages. Redesign private responses as personal (1:1) chat messages or use Adaptive Cards that only the acting user sees after refresh.
- **Ignoring the personal vs channel distinction**: In Slack, slash commands work identically in channels and DMs. In Teams, channel bots require @mention. Consider scoping command-heavy bots to personal chat for a smoother UX.
- **Missing manifest commands**: Without `commands` in the manifest, users have no way to discover what the bot supports. Always add command hints for discoverability.
- **Complex argument parsing**: Slack's `command.text` arrives as a clean string after the command name. In Teams, you must parse `activity.text` which may include the bot mention, extra whitespace, and varied formatting.
- **Missing `composeExtensions` in manifest**: Message extensions (search-based or action-based) require a `composeExtensions` entry in the Teams manifest. Without it, the extension never appears in the compose box or command bar. This is the most common reason message extensions silently fail to load.

## references

- https://learn.microsoft.com/en-us/microsoftteams/platform/bots/what-are-bots
- https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/create-a-bot-commands-menu
- https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/what-are-messaging-extensions
- https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/what-are-task-modules
- https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/channel-and-group-conversations
- https://github.com/microsoft/teams.ts
- https://slack.dev/bolt-js/concepts/commands
- https://api.slack.com/interactivity/slash-commands

## instructions

This expert covers bridging Slack slash commands and Teams text commands / message extensions. Use it when adding cross-platform support in either direction: converting `app.command()` handlers to Teams `app.message()` with regex patterns, or converting Teams text handlers back to Slack slash commands with `ack()` calls. It covers the three Teams alternatives to slash commands (text matching, messaging extensions, manifest commands), response pattern bridging (`respond`/`say` ↔ `send`/`reply`), modal/form bridging (`trigger_id` + `views.open` ↔ Adaptive Card forms / Task Modules), command payload property mapping, ephemeral message handling, and manifest command entries. Pair with `../slack/runtime.slash-commands-ts.md` for Slack command patterns, and `../teams/runtime.routing-handlers-ts.md` for Teams `app.message()` patterns.

## research

Deep Research prompt:

"Write a micro expert for bridging Slack slash commands and Teams text commands / message extensions bidirectionally. Cover the three Teams alternatives (text pattern matching with app.message regex, messaging extensions, manifest bot commands), side-by-side code examples for bridging in both directions, payload property mapping (command.text <-> activity.text, trigger_id, response_url <-> send/reply), ack() addition/removal, ephemeral response handling, and manifest configuration. Include a mapping table and common pitfalls for both directions."
