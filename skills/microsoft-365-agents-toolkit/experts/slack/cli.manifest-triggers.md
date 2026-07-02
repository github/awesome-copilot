# cli.manifest-triggers

## purpose

App manifest management (`slack manifest`), workflow trigger CRUD (`slack trigger`), and custom function distribution (`slack function`) via the Slack CLI.

## rules

1. **The manifest defines the entire app surface.** It declares functions, workflows, triggers, datastores, bot user, OAuth scopes, slash commands, shortcuts, and outgoing domains. Written in TypeScript (`manifest.ts` for Deno) or JSON (`slack.json` for Node/Python).
2. **`slack manifest validate` checks the manifest against Slack's schema.** Catches missing fields, invalid types, scope conflicts, and structural errors. Run early and often during development.
3. **`slack manifest info` shows the remote manifest.** Displays the manifest as stored on Slack's servers for the deployed app. Useful for comparing local vs remote state.
4. **Triggers connect workflows to user actions.** A trigger defines how users invoke a workflow — via shortcut, slash command, event, schedule, or webhook. Without triggers, deployed workflows are unreachable.
5. **`slack trigger create` registers a new trigger.** Accepts a `--trigger-def` flag pointing to a trigger definition file (TypeScript or JSON). The definition specifies the trigger type, linked workflow, and inputs.
6. **Trigger types: shortcut, event, scheduled, webhook.** Shortcut triggers appear in the Slack UI shortcuts menu. Event triggers fire on platform events. Scheduled triggers run on a cron or at a specific time. Webhook triggers expose an HTTP URL.
7. **`slack trigger list` shows all triggers for the app.** Displays trigger IDs, types, names, and linked workflows. Use `--team` to filter by workspace.
8. **`slack trigger update` modifies an existing trigger.** Use `--trigger-id` to target and `--trigger-def` to provide the updated definition. The trigger ID is preserved.
9. **`slack trigger delete` removes a trigger.** Requires `--trigger-id`. The linked workflow remains deployed — only the entry point is removed.
10. **`slack trigger info` shows trigger details.** Displays the full trigger configuration including inputs, workflow reference, and access permissions.
11. **`slack trigger access` controls who can invoke a trigger.** Set access to everyone in the workspace, specific users, specific channels, or specific orgs. Default varies by trigger type.
12. **`slack function distribute` shares custom functions.** Makes functions from your app available to other apps and Workflow Builder. Distributed functions appear in the workspace's function catalog.
13. **Trigger definitions are separate files.** Store in a `triggers/` directory. Each file exports a trigger definition object with `type`, `name`, `workflow`, and `inputs` fields.

## patterns

### Pattern 1: Manifest structure (Deno TypeScript)

```typescript
// manifest.ts — Deno Slack app manifest
import { Manifest } from "deno-slack-sdk/mod.ts";
import { GreetingWorkflow } from "./workflows/greeting.ts";
import { GreetingFunction } from "./functions/greeting.ts";
import { UsersDatastore } from "./datastores/users.ts";

export default Manifest({
  name: "my-bot",
  description: "A helpful Slack bot",
  icon: "assets/icon.png",
  functions: [GreetingFunction],
  workflows: [GreetingWorkflow],
  datastores: [UsersDatastore],
  outgoingDomains: ["api.example.com"],  // External API allowlist
  botScopes: [
    "commands",
    "chat:write",
    "chat:write.public",
    "channels:read",
    "datastore:read",
    "datastore:write",
  ],
});
```

### Pattern 2: Trigger CRUD workflow

```bash
# Create a trigger from a definition file
slack trigger create --trigger-def triggers/greeting_trigger.ts
# Output: ⚡ Trigger created
#   Trigger ID:   Ft0123456789
#   Type:         shortcut
#   Name:         Send Greeting
#   Shortcut URL: https://slack.com/shortcuts/Ft0123456789/...

# List all triggers for the app
slack trigger list
# Shows table of: ID, Type, Name, Workflow

# Get details on a specific trigger
slack trigger info --trigger-id Ft0123456789

# Update a trigger definition
slack trigger update --trigger-id Ft0123456789 \
  --trigger-def triggers/greeting_trigger_v2.ts

# Set trigger access permissions
slack trigger access --trigger-id Ft0123456789 \
  --everyone                          # All workspace members
# Or: --users U001,U002              # Specific users
# Or: --channels C001,C002           # Specific channels

# Delete a trigger
slack trigger delete --trigger-id Ft0123456789
```

### Pattern 3: Trigger definition files

```typescript
// triggers/greeting_trigger.ts — shortcut trigger
import { Trigger } from "deno-slack-api/types.ts";
import { GreetingWorkflow } from "../workflows/greeting.ts";
import { TriggerTypes, TriggerContextData } from "deno-slack-api/mod.ts";

const greetingTrigger: Trigger<typeof GreetingWorkflow.definition> = {
  type: TriggerTypes.Shortcut,
  name: "Send Greeting",
  description: "Send a greeting to a channel",
  workflow: `#/workflows/${GreetingWorkflow.definition.callback_id}`,
  inputs: {
    // Map trigger context to workflow inputs
    interactivity: { value: TriggerContextData.Shortcut.interactivity },
    channel: { value: TriggerContextData.Shortcut.channel_id },
    user: { value: TriggerContextData.Shortcut.user_id },
  },
};

export default greetingTrigger;
```

```typescript
// triggers/scheduled_trigger.ts — scheduled trigger
import { Trigger } from "deno-slack-api/types.ts";
import { DailyReportWorkflow } from "../workflows/daily_report.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";

const scheduledTrigger: Trigger<typeof DailyReportWorkflow.definition> = {
  type: TriggerTypes.Scheduled,
  name: "Daily Report",
  workflow: `#/workflows/${DailyReportWorkflow.definition.callback_id}`,
  inputs: {},
  schedule: {
    // Run every weekday at 9 AM UTC
    start_time: "2024-01-01T09:00:00Z",
    frequency: { type: "weekly", on_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] },
  },
};

export default scheduledTrigger;
```

```typescript
// triggers/webhook_trigger.ts — incoming webhook trigger
import { Trigger } from "deno-slack-api/types.ts";
import { IngestWorkflow } from "../workflows/ingest.ts";
import { TriggerTypes } from "deno-slack-api/mod.ts";

const webhookTrigger: Trigger<typeof IngestWorkflow.definition> = {
  type: TriggerTypes.Webhook,
  name: "External Webhook",
  workflow: `#/workflows/${IngestWorkflow.definition.callback_id}`,
  inputs: {
    // Webhook body fields mapped to workflow inputs
    payload: { value: "{{data.payload}}" },
  },
};

export default webhookTrigger;
```

### Pattern 4: Manifest validation and function distribution

```bash
# Validate manifest before deploying
slack manifest validate
# Output: ✅ Manifest is valid

# View the remote (deployed) manifest
slack manifest info --app A0123456789

# Distribute a custom function to the workspace
slack function distribute --name my_custom_function

# List distributed functions
slack function distribute --list
```

## pitfalls

- **Deploying without creating triggers** — Workflows exist on the platform but are unreachable. Always `slack trigger create` after `slack deploy`.
- **Wrong trigger type for use case** — Shortcut triggers need user interaction. Event triggers need specific event subscriptions. Scheduled triggers need valid cron/schedule. Webhook triggers expose public URLs.
- **Forgetting to update triggers after workflow changes** — If workflow inputs change, existing triggers may break. Update trigger definitions to match.
- **Missing `outgoingDomains` in manifest** — External HTTP calls fail silently without the domain in the allowlist. Add every external API domain.
- **Missing `botScopes`** — The app can't perform actions without the right scopes. `chat:write` for messaging, `datastore:read`/`datastore:write` for datastores, etc.
- **Trigger access too restrictive** — By default, trigger access may be limited. Use `slack trigger access --everyone` for workspace-wide shortcuts.
- **Deleting a trigger doesn't delete the workflow** — Triggers are entry points. Removing a trigger just removes the invocation path. The workflow and its functions remain deployed.
- **Editing remote manifest directly** — Changes to the remote manifest are overwritten on the next `slack deploy`. Always edit the local `manifest.ts` / `slack.json`.

## references

- [App manifest reference](https://tools.slack.dev/cli/guides/creating-an-app-manifest/)
- [Trigger types](https://tools.slack.dev/cli/guides/triggers/)
- [slack trigger reference](https://tools.slack.dev/cli/reference/slack_trigger/)
- [slack manifest validate](https://tools.slack.dev/cli/reference/slack_manifest_validate/)
- [Custom functions](https://tools.slack.dev/cli/guides/creating-custom-functions/)
- [Function distribution](https://tools.slack.dev/cli/reference/slack_function/)

## instructions

Do a web search for:

- "Slack CLI manifest.ts validate trigger create shortcut event scheduled 2025"
- "Slack CLI trigger types definition files workflow inputs"
- "Slack CLI function distribute custom functions Workflow Builder"

Pair with:
- `cli.getting-started.md` — project scaffolding creates the manifest
- `cli.local-dev-deploy.md` — triggers must be created after deploy
- `cli.datastore-env.md` — datastores declared in manifest
- `runtime.bolt-foundations-ts.md` — Bolt SDK patterns for function implementations

## research

Deep Research prompt:

"Write a micro expert on Slack CLI manifest management, triggers, and function distribution. Cover manifest structure (manifest.ts for Deno, slack.json for Node/Python, functions/workflows/datastores/botScopes/outgoingDomains), slack manifest validate/info commands, trigger CRUD (create/list/update/delete/info/access), trigger types (shortcut, event, scheduled, webhook), trigger definition file format, trigger input mapping from context data, function distribution to Workflow Builder. Include canonical patterns for: manifest.ts anatomy, trigger CRUD workflow, trigger definition files for each type, manifest validation."
