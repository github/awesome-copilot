# workflows-automation-ts

## purpose

Bridges Slack Workflow Builder and Teams Power Automate / bot-driven orchestration for cross-platform bots targeting Slack, Teams, or both.

## rules

1. **Slack Workflow Builder → Power Automate flows (manual rebuild required).** There is no automated migration tool. Slack workflows are drag-and-drop automations with triggers and steps. Power Automate flows serve the same purpose but with a completely different builder, trigger system, and step library. Each workflow must be manually recreated. [learn.microsoft.com -- Power Automate](https://learn.microsoft.com/en-us/power-automate/getting-started)
2. **Slack workflow triggers → Power Automate triggers.** Slack triggers include: webhook, shortcut, new channel message, emoji reaction, user joins channel. Power Automate equivalents: HTTP request (webhook), Teams message trigger, approval trigger, Recurrence (scheduled), and 400+ connectors. Map each trigger individually. [learn.microsoft.com -- Triggers](https://learn.microsoft.com/en-us/power-automate/triggers-introduction)
3. **Slack custom steps (`workflow_step_execute`) → Power Automate custom connectors.** Slack bots can register custom workflow steps that appear in the Workflow Builder. In Power Automate, the equivalent is a custom connector wrapping your bot's REST API. The connector defines actions, inputs, and outputs that appear in the flow designer. [learn.microsoft.com -- Custom connectors](https://learn.microsoft.com/en-us/connectors/custom-connectors/)
4. **Slack approval workflows → Power Automate Approvals connector (built-in).** Slack workflows that collect approvals via emoji reactions or form submissions map to Power Automate's native Approvals connector. It provides: approval request creation, approval/rejection actions, parallel/sequential approvals, and approval history. No custom code needed. [learn.microsoft.com -- Approvals](https://learn.microsoft.com/en-us/power-automate/get-started-approvals)
5. **Teams "Workflows" app provides simple in-Teams automations.** For basic workflows (post to channel on schedule, notify on form submission), the Workflows app in Teams provides templates without leaving Teams. It's powered by Power Automate under the hood but has a simplified UI. [learn.microsoft.com -- Workflows app](https://learn.microsoft.com/en-us/microsoftteams/platform/m365-apps/publish-app#workflows)
6. **Bot-driven workflow alternative: state machine + Adaptive Card buttons.** For workflows that don't fit Power Automate's model (complex branching, dynamic participants, long-running multi-step processes), implement a state machine in the bot. Each step sends an Adaptive Card with action buttons; button clicks advance the state. Store workflow state in Cosmos DB or similar. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
7. **Slack `workflow_step` event lifecycle → custom connector action lifecycle.** Slack's workflow step has `edit` (configure step), `save` (persist config), `execute` (run step). Power Automate custom connectors define: action schema (inputs/outputs in OpenAPI), and the runtime HTTP call. There is no separate "edit" flow — the connector schema defines the UI. [learn.microsoft.com -- Connector actions](https://learn.microsoft.com/en-us/connectors/custom-connectors/define-blank#define-the-action)
8. **Slack workflow variables → Power Automate dynamic content.** Slack workflows pass data between steps via variables set in earlier steps. Power Automate uses "dynamic content" — outputs from previous steps that can be referenced in later steps. The data flow model is similar but the syntax is completely different. [learn.microsoft.com -- Dynamic content](https://learn.microsoft.com/en-us/power-automate/use-expressions-in-conditions)
9. **Power Automate flows can call Bot Framework via HTTP.** To integrate your Teams bot into a Power Automate flow, expose REST endpoints on your bot's server and call them from Power Automate's HTTP action. The bot can then send proactive messages based on flow triggers. [learn.microsoft.com -- HTTP connector](https://learn.microsoft.com/en-us/connectors/custom-connectors/)
10. **Slack Workflow Builder is free; Power Automate has licensing tiers.** Slack Workflow Builder is included in all plans. Power Automate has a free tier (limited runs) and premium tiers. Custom connectors require a premium license. Factor licensing into migration planning. [learn.microsoft.com -- Power Automate licensing](https://learn.microsoft.com/en-us/power-platform/admin/pricing-billing-skus)
11. **Reverse direction (Teams → Slack):** For Teams → Slack, Power Automate flows can be mapped to Slack Workflow Builder steps or custom `workflow_step_execute` handlers. Power Automate Approvals map to Slack approval workflows using emoji reactions or interactive message buttons. Power Automate custom connectors map to Slack custom workflow steps registered via `workflow_step` events. Power Automate Recurrence triggers map to Slack Workflow Builder scheduled triggers.

## patterns

### Approval workflow → Power Automate Approvals

**Slack Workflow Builder (before):**

The Slack workflow is configured in the GUI:
1. Trigger: User submits a form (custom step)
2. Step 1: Send form data to `#approvals` channel
3. Step 2: Wait for `:white_check_mark:` reaction from approver
4. Step 3: Post result to `#completed` channel

**Bot code for custom approval step:**

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

// Custom workflow step execution
app.event("workflow_step_execute", async ({ event, client }) => {
  const { workflow_step } = event;
  const inputs = workflow_step.inputs;

  // Post approval request
  const msg = await client.chat.postMessage({
    channel: "#approvals",
    text: `Approval needed: ${inputs.request_text.value}`,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*Approval Request*\n${inputs.request_text.value}` },
      },
      { type: "section", text: { type: "mrkdwn", text: "React with :white_check_mark: to approve or :x: to reject." } },
    ],
  });

  // Watch for reaction (simplified — real implementation uses reaction_added event)
});
```

**Teams (after) — Power Automate flow (described as JSON definition):**

```json
{
  "definition": {
    "triggers": {
      "manual": {
        "type": "Request",
        "kind": "Button",
        "inputs": {
          "schema": {
            "type": "object",
            "properties": {
              "requestText": { "type": "string", "title": "Request details" },
              "requesterEmail": { "type": "string", "title": "Requester email" }
            }
          }
        }
      }
    },
    "actions": {
      "Start_approval": {
        "type": "OpenApiConnection",
        "inputs": {
          "host": { "connectionName": "shared_approvals" },
          "operationId": "StartAndWaitForAnApproval",
          "parameters": {
            "approvalType": "Basic",
            "ApprovalCreationInput/title": "Approval: @{triggerBody()?['requestText']}",
            "ApprovalCreationInput/assignedTo": "approver@company.com",
            "ApprovalCreationInput/details": "@{triggerBody()?['requestText']}"
          }
        }
      },
      "Post_result_to_Teams": {
        "type": "OpenApiConnection",
        "inputs": {
          "host": { "connectionName": "shared_teams" },
          "operationId": "PostMessageToConversation",
          "parameters": {
            "poster": "Flow bot",
            "location": "Channel",
            "body/recipient": "completed-channel-id",
            "body/messageBody": "Request @{outputs('Start_approval')?['body/title']} was @{outputs('Start_approval')?['body/outcome']}"
          }
        },
        "runAfter": { "Start_approval": ["Succeeded"] }
      }
    }
  }
}
```

**Bot-driven alternative (for complex approval logic):**

```typescript
import { App } from "@microsoft/teams.apps";
import { ConsoleLogger } from "@microsoft/teams.common";

const app = new App({
  logger: new ConsoleLogger("my-bot", { level: "info" }),
});

// Approval state machine
interface ApprovalRequest {
  id: string;
  text: string;
  requester: string;
  status: "pending" | "approved" | "rejected";
  activityId?: string;
}

const approvals = new Map<string, ApprovalRequest>();

// Create approval request
app.message(/^\/?approve (.+)$/i, async ({ send, activity }) => {
  const text = activity.text?.replace(/^\/?approve\s+/i, "") ?? "";
  const id = `apr_${Date.now()}`;
  const approval: ApprovalRequest = {
    id,
    text,
    requester: activity.from?.name ?? "Unknown",
    status: "pending",
  };
  approvals.set(id, approval);

  const response = await send({
    attachments: [{
      contentType: "application/vnd.microsoft.card.adaptive",
      content: {
        type: "AdaptiveCard",
        version: "1.5",
        body: [
          { type: "TextBlock", text: "Approval Request", weight: "Bolder", size: "Medium" },
          { type: "TextBlock", text: `**From:** ${approval.requester}`, wrap: true },
          { type: "TextBlock", text: approval.text, wrap: true },
        ],
        actions: [
          { type: "Action.Execute", title: "Approve", verb: "approveAction", data: { approvalId: id } },
          { type: "Action.Execute", title: "Reject", verb: "rejectAction", data: { approvalId: id } },
        ],
      },
    }],
  });
});

// Handle approval/rejection buttons
app.on("card.action" as any, async ({ activity }) => {
  const data = activity.value?.action?.data ?? activity.value;
  const approval = approvals.get(data?.approvalId);

  if (!approval) return { status: 200, body: {} };

  const isApprove = data?.verb === "approveAction";
  approval.status = isApprove ? "approved" : "rejected";
  const reviewer = activity.from?.name ?? "Someone";

  // Return updated card (replaces original)
  return {
    status: 200,
    body: {
      type: "AdaptiveCard",
      version: "1.5",
      body: [
        { type: "TextBlock", text: "Approval Request", weight: "Bolder", size: "Medium" },
        { type: "TextBlock", text: approval.text, wrap: true },
        {
          type: "TextBlock",
          text: `**${approval.status.toUpperCase()}** by ${reviewer}`,
          color: isApprove ? "Good" : "Attention",
          weight: "Bolder",
        },
      ],
      // No actions — card is now read-only
    },
  };
});

app.start(3978);
```

### Migration approach comparison

| Slack Workflow Feature | Power Automate | Bot-Driven | Teams Workflows App |
|---|---|---|---|
| Visual builder | Yes (full designer) | No (code) | Yes (simplified) |
| Custom steps | Custom connectors | Handler code | No |
| Approval flows | Built-in Approvals | Card buttons + state | No |
| Scheduled triggers | Recurrence trigger | Timer + proactive | Yes (basic) |
| Complex branching | Yes (conditions, loops) | State machine | No |
| License cost | Free tier + Premium | Bot hosting cost | Free |
| Developer skill needed | Low-code | TypeScript | None |

## pitfalls

- **No automated migration**: Every Slack workflow must be manually recreated in Power Automate or bot code. There is no import/export compatibility. Plan for significant manual effort on large workflow portfolios.
- **Reaction-based approvals break completely**: Slack workflows commonly use emoji reactions as approval signals. Teams has no equivalent pattern in Power Automate. Use the built-in Approvals connector or Action.Execute card buttons.
- **Custom connector licensing**: Power Automate custom connectors (needed to replace Slack custom workflow steps) require a Premium license. The free tier does not support custom connectors.
- **Slack workflow variables vs Power Automate dynamic content**: The data passing model is similar in concept but completely different in syntax. Slack uses `{{variable_name}}`; Power Automate uses `@{outputs('step_name')?['property']}`. This is a manual translation.
- **Bot-driven workflows require state persistence**: Unlike Power Automate which manages state internally, bot-driven approval workflows need external state storage (Cosmos DB, SQL). Without it, workflow state is lost on bot restart.
- **Power Automate flow limits**: Free tier is limited to 750 runs/month. Standard is 10,000/month. High-volume workflows (processing hundreds of requests daily) may require premium plans.

## references

- https://learn.microsoft.com/en-us/power-automate/getting-started
- https://learn.microsoft.com/en-us/power-automate/get-started-approvals
- https://learn.microsoft.com/en-us/connectors/custom-connectors/
- https://learn.microsoft.com/en-us/power-automate/triggers-introduction
- https://learn.microsoft.com/en-us/power-automate/use-expressions-in-conditions
- https://learn.microsoft.com/en-us/power-platform/admin/pricing-billing-skus
- https://github.com/microsoft/teams.ts
- https://api.slack.com/workflows — Slack Workflow Builder
- https://api.slack.com/workflows/steps — Slack custom workflow steps

## instructions

Use this expert when adding cross-platform support in either direction for workflow automation. It covers: Slack Workflow Builder bridged to Power Automate flows, custom workflow steps bridged to Power Automate custom connectors, approval workflows bridged to the Approvals connector, the Teams Workflows app for simple automations, bot-driven workflow alternatives using state machines + Adaptive Cards, and reverse mapping from Power Automate flows back to Slack Workflow Builder steps and custom workflow_step_execute handlers. Pair with `../teams/ui.adaptive-cards-ts.md` for card construction in bot-driven workflows, `../teams/runtime.proactive-messaging-ts.md` for flow-triggered bot messages, and `slack-interactive-responses-to-teams-ts.md` for card replacement patterns in approval flows.

## research

Deep Research prompt:

"Write a micro expert for bridging Slack Workflow Builder and Microsoft Teams Power Automate / bot-driven orchestration in either direction. Cover: Power Automate as the Teams-side replacement, custom connector creation for Slack custom workflow steps, the built-in Approvals connector for approval flows, the Teams Workflows app for simple automations, bot-driven state machine alternative with Adaptive Card buttons, workflow trigger mapping, variable/dynamic content translation, licensing considerations, and reverse mapping from Power Automate flows back to Slack Workflow Builder steps. Include code examples for bot-driven approvals and a comparison table."
