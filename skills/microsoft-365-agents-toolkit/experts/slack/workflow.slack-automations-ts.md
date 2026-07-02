# workflow.slack-automations-ts

## purpose

Cover the Slack next-gen automation platform (Workflow Builder, custom functions, triggers, datastores) for understanding the competitive baseline and supporting cross-platform workflow design.

## rules

1. **Slack's next-gen platform is function-based.** Workflows are composed of steps, and each step is a function. Functions can be built-in (send message, create channel) or custom (developer-defined). Custom functions are defined in the app manifest and implemented as event handlers. [api.slack.com -- Functions](https://api.slack.com/automation/functions)
2. **Workflows are defined declaratively in `manifest.ts`.** Use `DefineWorkflow` to compose steps from functions. Each step specifies inputs (from trigger outputs, previous step outputs, or literals) and produces outputs for downstream steps. [api.slack.com -- Workflows](https://api.slack.com/automation/workflows)
3. **Triggers start workflows.** Four trigger types: (a) **Link triggers** — URL click, (b) **Shortcut triggers** — from channel compose menu, (c) **Event triggers** — fire on Slack events (message posted, reaction added, member joined), (d) **Scheduled triggers** — cron-like recurring execution. [api.slack.com -- Triggers](https://api.slack.com/automation/triggers)
4. **Custom functions run on Slack's hosted infrastructure (Deno).** The next-gen platform runs functions on Slack's infrastructure using Deno. No external hosting needed. Functions receive `inputs` and return `outputs` defined by their schema. `slack deploy` pushes code to Slack's runtime.
5. **Datastores provide built-in persistence.** `DefineDatastore` creates a schematized key-value store on Slack's platform. Functions can CRUD datastore records. No external database needed for simple workflows. Limited to 50,000 records per datastore. [api.slack.com -- Datastores](https://api.slack.com/automation/datastores)
6. **Forms collect structured input in-channel.** The `OpenForm` built-in function opens a modal form in the channel context. Form fields map to workflow inputs. This is Slack's equivalent of Teams' task module / message extension action.
7. **Workflow Builder provides no-code authoring.** Non-technical users can create workflows visually in Slack's Workflow Builder UI — selecting triggers, adding steps, mapping variables between steps. This is the key UX advantage over Teams' Power Automate.
8. **Slack workflows are channel-scoped, not cross-app.** Each workflow runs within the app that defines it. There's no cross-app orchestration or marketplace of reusable steps. This limits ecosystem extensibility compared to Power Automate's connector model.
9. **No operational integrations (presence, shifts, call queues).** Slack lacks APIs for presence-driven triggers, shift management, or call queue operations. Workflow triggers are limited to messaging events, schedules, and webhooks. This is Teams' primary competitive advantage for frontline workflows.
10. **Interactivity through Block Kit, not Universal Actions.** Slack workflow steps can send Block Kit messages with interactive elements (buttons, selects, overflow menus). Interactions route back to the workflow, but there's no card-refresh-in-place pattern — interactions typically open modals or send new messages.
11. **`workflow_step_execute` is legacy.** The older `workflow_step_execute` event pattern (Bolt v3) is being replaced by the function-based model. New development should use `DefineFunction` + `DefineWorkflow` on the next-gen platform.

## patterns

### Define a custom function

```typescript
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";

export const CreatePtoRequestFn = DefineFunction({
  callback_id: "create_pto_request",
  title: "Create PTO Request",
  source_file: "functions/create_pto_request.ts",
  input_parameters: {
    properties: {
      requester: { type: Schema.slack.types.user_id },
      start_date: { type: "string" },
      end_date: { type: "string" },
      reason: { type: "string" },
    },
    required: ["requester", "start_date", "end_date"],
  },
  output_parameters: {
    properties: {
      request_id: { type: "string" },
      status: { type: "string" },
    },
    required: ["request_id", "status"],
  },
});

export default SlackFunction(CreatePtoRequestFn, async ({ inputs, client }) => {
  // Store in datastore
  const result = await client.apps.datastore.put({
    datastore: "pto_requests",
    item: {
      id: crypto.randomUUID(),
      requester: inputs.requester,
      start_date: inputs.start_date,
      end_date: inputs.end_date,
      reason: inputs.reason || "",
      status: "pending",
      created_at: new Date().toISOString(),
    },
  });

  return {
    outputs: {
      request_id: result.item.id,
      status: "pending",
    },
  };
});
```

### Define a workflow with triggers

```typescript
import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { CreatePtoRequestFn } from "../functions/create_pto_request.ts";

export const PtoWorkflow = DefineWorkflow({
  callback_id: "pto_workflow",
  title: "Request Time Off",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
      channel: { type: Schema.slack.types.channel_id },
    },
    required: ["interactivity"],
  },
});

// Step 1: Collect input via form
const formStep = PtoWorkflow.addStep(Schema.slack.functions.OpenForm, {
  title: "Request Time Off",
  interactivity: PtoWorkflow.inputs.interactivity,
  submit_label: "Submit Request",
  fields: {
    elements: [
      { name: "start_date", title: "Start Date", type: Schema.types.string },
      { name: "end_date", title: "End Date", type: Schema.types.string },
      { name: "reason", title: "Reason (optional)", type: Schema.types.string, long: true },
    ],
    required: ["start_date", "end_date"],
  },
});

// Step 2: Create the PTO record
const createStep = PtoWorkflow.addStep(CreatePtoRequestFn, {
  requester: PtoWorkflow.inputs.interactivity.interactor.id,
  start_date: formStep.outputs.fields.start_date,
  end_date: formStep.outputs.fields.end_date,
  reason: formStep.outputs.fields.reason,
});

// Step 3: Post confirmation to channel
PtoWorkflow.addStep(Schema.slack.functions.SendMessage, {
  channel_id: PtoWorkflow.inputs.channel,
  message: `PTO request submitted by <@${PtoWorkflow.inputs.interactivity.interactor.id}>: ${formStep.outputs.fields.start_date} to ${formStep.outputs.fields.end_date} (Status: ${createStep.outputs.status})`,
});
```

### Define a datastore

```typescript
import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";

export const PtoDatastore = DefineDatastore({
  name: "pto_requests",
  primary_key: "id",
  attributes: {
    id: { type: Schema.types.string },
    requester: { type: Schema.slack.types.user_id },
    start_date: { type: Schema.types.string },
    end_date: { type: Schema.types.string },
    reason: { type: Schema.types.string },
    status: { type: Schema.types.string },
    created_at: { type: Schema.types.string },
  },
});
```

### Competitive comparison matrix

| Capability | Slack Next-Gen Platform | Teams Message-Native Vision |
|---|---|---|
| No-code authoring | Workflow Builder GUI | Power Automate (external) |
| In-channel initiation | Shortcut triggers, link triggers | Bot commands, message extensions |
| Structured input | OpenForm built-in function | Task modules / Adaptive Card forms |
| State persistence | Datastores (50K record limit) | SharePoint Lists (30M record limit) |
| Operational triggers | Messaging events only | Presence, Shifts, call queues, Graph |
| Card interactivity | Block Kit (new message on action) | Adaptive Cards (in-place refresh) |
| NL querying | Not built-in | AI function calling over structured state |
| Execution runtime | Slack-hosted Deno | Bot hosting (any cloud) or Power Automate |
| Ecosystem | Single-app scoped | Power Platform connectors, Graph API |
| Frontline integration | None | Shifts, presence, call queues |

## pitfalls

- **Deno runtime is Slack-only.** Code written for the next-gen platform doesn't run outside Slack's infrastructure. No local hosting, no Azure/AWS deployment. This limits portability.
- **50,000 record datastore limit.** For high-volume workflows, Slack datastores hit their limit quickly. No built-in archival or pagination beyond simple queries.
- **No card refresh pattern.** Slack has no equivalent to Teams' `Action.Execute` → card replacement. Interactive elements send new messages or open modals. This creates message sprawl for multi-step workflows.
- **Workflow Builder workflows are not version-controlled.** Workflows created in the GUI exist only in Slack's cloud. No git, no code review, no rollback. Code-defined workflows (manifest.ts) don't have this problem.
- **Limited event trigger types.** Event triggers cover message events and membership changes, but not presence, file events, or external system state. Webhook triggers partially fill this gap but require external orchestration.

## references

- https://api.slack.com/automation/functions
- https://api.slack.com/automation/workflows
- https://api.slack.com/automation/triggers
- https://api.slack.com/automation/datastores
- https://api.slack.com/automation/functions/custom

## instructions

Use this expert for understanding the Slack next-gen automation platform when doing competitive analysis or cross-platform workflow design. Covers custom functions, declarative workflows, trigger types, datastores, Workflow Builder, and the competitive gap analysis against Teams' message-native vision. Pair with `../bridge/workflow.composable-platform-ts.md` for the Teams architectural response, and `../bridge/workflows-automation-ts.md` for migration patterns between platforms.

## research

Deep Research prompt:

"Write a micro expert on the Slack next-gen automation platform (TypeScript/Deno). Cover: DefineFunction for custom functions, DefineWorkflow for declarative step composition, trigger types (link, shortcut, event, scheduled), DefineDatastore for built-in persistence, OpenForm for structured input collection, Workflow Builder no-code authoring, and limitations vs Teams (no presence/Shifts triggers, no card refresh, 50K datastore limit). Include a competitive comparison matrix against Teams message-native workflow capabilities."
