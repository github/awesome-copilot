# workflow.composable-platform-ts

## purpose

Architectural guide for building a composable, reusable workflow operating layer inside Teams — the five-element framework (trigger, state, logic, intelligence, visibility) as a platform pattern, not a point solution.

## rules

1. **Every workflow follows the same five-element lifecycle.** (1) Trigger — how it starts, (2) State — where records live, (3) Logic — how decisions and automation execute, (4) Intelligence — how AI is layered over state, (5) Visibility — how records remain embedded in channels. Design every workflow as an instantiation of this lifecycle.
2. **Define workflows as configuration, not code.** A workflow definition specifies: trigger type + parameters, list schema (columns and types), routing rules (approval chain, auto-assign), query functions (NL schemas), and card templates (active/completed/error). The runtime consumes these definitions generically.
3. **Use a `WorkflowDefinition` interface as the core abstraction.** This interface describes the workflow's schema, triggers, routing, and card templates. The runtime registers handlers dynamically from definitions. New workflows require a new definition object, not new handler code.
4. **Template workflows are reference implementations.** Provide polished, out-of-the-box definitions for common scenarios: time-off requests, equipment booking, daily standup, account health. These serve as both usable workflows and examples for customization.
5. **The runtime is a generic workflow engine.** A single set of handlers (message, `card.action`, proactive, webhooks) dispatch to the correct workflow based on the verb/command prefix in the message or action data. The engine creates records, processes actions, and renders cards for any registered workflow.
6. **SharePoint Lists are the default state backend.** Each workflow definition maps to a SharePoint list. The engine creates lists on first use, following the schema in the definition. For enterprise needs, swap to Dataverse without changing the workflow definition.
7. **Card templates are parameterized, not hardcoded.** Define card templates as functions that take a record and return an Adaptive Card. The workflow definition includes templates for: `activeCard`, `completedCard`, `listCard`, and `formCard`. The engine calls the right template based on record state.
8. **Query functions are auto-generated from the schema.** Given a workflow definition's column schema, generate AI function-calling schemas automatically: each filterable column becomes a parameter. This eliminates writing per-workflow query functions manually.
9. **Extensibility points for ecosystem partners.** The composable platform should expose: (a) custom trigger types (plugin new event sources), (b) custom logic steps (plugin business rules), (c) custom card templates (brand and layout), (d) custom state backends (plugin storage). Each point has a defined interface.
10. **Cross-workflow queries are first-class.** The engine registers a `queryAnyWorkflow` function that searches across all registered workflow lists. Users ask "what's overdue?" and get results from PTO, equipment, and standup workflows combined.
11. **Power Automate integration is optional, not required.** The composable platform can execute logic in-bot (state machine) or delegate to Power Automate flows. Workflow definitions specify `executionMode: "bot" | "powerAutomate" | "hybrid"`. Bot mode is the default for SMB; Power Automate mode for enterprise.

## patterns

### WorkflowDefinition interface

```typescript
interface WorkflowDefinition {
  id: string;                          // Unique workflow identifier
  name: string;                        // Display name
  description: string;                 // Used in command suggestions and AI descriptions
  commandPrefix: string;               // e.g., "/pto", "/book", "/standup"

  // Schema
  columns: ColumnDefinition[];         // Maps to SharePoint List columns
  statusField: string;                 // Which column tracks lifecycle state
  statusValues: {
    active: string[];                  // e.g., ["Pending", "InProgress"]
    completed: string[];               // e.g., ["Approved", "Rejected", "Done"]
  };

  // Triggers
  triggers: TriggerConfig[];

  // Routing
  routing?: {
    type: "none" | "single" | "sequential" | "parallel-any" | "parallel-all";
    approverSource: "fixed" | "manager" | "field";  // Where to find the approver
    approverField?: string;            // Column name if approverSource is "field"
    escalationTimeoutMs?: number;
  };

  // Cards
  cards: {
    active: (record: any) => object;
    completed: (record: any) => object;
    list: (records: any[]) => object;
    form?: () => object;               // For message extension action trigger
  };

  // AI
  queryDescription: string;            // Describes when AI should call the query function
  filterableColumns: string[];         // Columns exposed as AI function parameters
}

interface ColumnDefinition {
  name: string;
  type: "text" | "number" | "dateTime" | "choice" | "personOrGroup" | "boolean";
  choices?: string[];                  // For choice columns
  required?: boolean;
}

interface TriggerConfig {
  type: "command" | "messageExtension" | "scheduled" | "stateChange";
  config: Record<string, any>;         // Trigger-specific configuration
}
```

### Register a workflow from a definition

```typescript
function registerWorkflow(app: any, engine: WorkflowEngine, definition: WorkflowDefinition) {
  // Command trigger
  const commandTrigger = definition.triggers.find((t) => t.type === "command");
  if (commandTrigger) {
    const regex = new RegExp(`^\\${definition.commandPrefix}\\s*(.*)$`, "i");
    app.message(regex, async (ctx: any) => {
      await engine.handleCommand(ctx, definition);
    });
  }

  // Scheduled trigger
  const scheduledTrigger = definition.triggers.find((t) => t.type === "scheduled");
  if (scheduledTrigger) {
    cron.schedule(scheduledTrigger.config.cron, async () => {
      await engine.handleScheduled(definition);
    });
  }

  // Register AI query function
  engine.registerQueryFunction(definition);
}
```

### Generic workflow engine

```typescript
class WorkflowEngine {
  private definitions = new Map<string, WorkflowDefinition>();
  private graphClient: Client;
  private siteId: string;
  private lists = new Map<string, string>(); // workflowId -> listId

  async handleCommand(ctx: any, def: WorkflowDefinition) {
    const params = parseCommandParams(ctx.activity.text!, def);
    const record = await this.createRecord(def, {
      ...params,
      requesterId: ctx.activity.from?.aadObjectId,
      requesterName: ctx.activity.from?.name,
      conversationId: ctx.activity.conversation?.id,
      serviceUrl: ctx.activity.serviceUrl,
    });

    const card = def.cards.active(record);
    const response = await ctx.send({
      attachments: [{
        contentType: "application/vnd.microsoft.card.adaptive",
        content: card,
      }],
    });

    // Store activity ID for future updates
    await this.updateRecordField(def, record.id, "CardActivityId", response.id);

    // Start escalation timer if routing is configured
    if (def.routing?.escalationTimeoutMs) {
      this.startEscalation(def, record);
    }
  }

  async handleAction(ctx: any, verb: string, data: any) {
    const def = this.definitions.get(data.workflowId);
    if (!def) return;

    const record = await this.getRecord(def, data.recordId);

    if (verb === "approve" || verb === "reject") {
      return this.processApproval(ctx, def, record, verb, data.comment);
    }

    if (verb.startsWith("refresh")) {
      const card = record.status === "completed"
        ? def.cards.completed(record)
        : def.cards.active(record);
      return {
        status: 200,
        body: {
          statusCode: 200,
          type: "application/vnd.microsoft.card.adaptive",
          value: card,
        },
      };
    }
  }

  registerQueryFunction(def: WorkflowDefinition) {
    // Auto-generate AI function schema from definition
    const parameters: Record<string, any> = {};
    for (const col of def.filterableColumns) {
      const colDef = def.columns.find((c) => c.name === col);
      if (!colDef) continue;

      switch (colDef.type) {
        case "choice":
          parameters[col] = { type: "string", enum: colDef.choices };
          break;
        case "dateTime":
          parameters[col] = { type: "string", description: `Filter by ${col} (ISO date)` };
          break;
        case "personOrGroup":
          parameters[col] = { type: "string", description: `Filter by ${col} name` };
          break;
        default:
          parameters[col] = { type: "string" };
      }
    }

    return {
      name: `query_${def.id}`,
      description: def.queryDescription,
      parameters: { type: "object", properties: parameters },
    };
  }

  private async createRecord(def: WorkflowDefinition, fields: Record<string, any>) {
    const listId = await this.ensureList(def);
    const item = await this.graphClient
      .api(`/sites/${this.siteId}/lists/${listId}/items`)
      .post({ fields });
    return { id: item.id, ...item.fields };
  }

  private async ensureList(def: WorkflowDefinition): Promise<string> {
    if (this.lists.has(def.id)) return this.lists.get(def.id)!;

    // Check if list exists, create if not
    try {
      const existing = await this.graphClient
        .api(`/sites/${this.siteId}/lists`)
        .filter(`displayName eq '${def.name}'`)
        .get();

      if (existing.value.length > 0) {
        this.lists.set(def.id, existing.value[0].id);
        return existing.value[0].id;
      }
    } catch { /* List doesn't exist */ }

    const list = await this.graphClient
      .api(`/sites/${this.siteId}/lists`)
      .post({
        displayName: def.name,
        list: { template: "genericList" },
        columns: def.columns.map(colDefToGraphColumn),
      });

    this.lists.set(def.id, list.id);
    return list.id;
  }
}
```

### Template workflow: Time-Off Request

```typescript
const ptoWorkflow: WorkflowDefinition = {
  id: "pto",
  name: "PTO Requests",
  description: "Time-off and vacation request workflow",
  commandPrefix: "/pto",
  columns: [
    { name: "Requester", type: "personOrGroup", required: true },
    { name: "StartDate", type: "dateTime", required: true },
    { name: "EndDate", type: "dateTime", required: true },
    { name: "HoursRequested", type: "number" },
    { name: "Status", type: "choice", choices: ["Pending", "Approved", "Rejected"] },
    { name: "ApprovedBy", type: "personOrGroup" },
    { name: "Reason", type: "text" },
  ],
  statusField: "Status",
  statusValues: {
    active: ["Pending"],
    completed: ["Approved", "Rejected"],
  },
  triggers: [
    { type: "command", config: { pattern: "/pto START to END" } },
    { type: "messageExtension", config: { commandId: "createPto" } },
  ],
  routing: {
    type: "single",
    approverSource: "manager",
    escalationTimeoutMs: 48 * 60 * 60 * 1000, // 48 hours
  },
  cards: {
    active: buildPtoActiveCard,
    completed: buildPtoCompletedCard,
    list: buildPtoListCard,
  },
  queryDescription: "Query PTO/time-off requests. Use when user asks about PTO, vacation, leave, days off.",
  filterableColumns: ["Status", "Requester", "StartDate"],
};

// Register
registerWorkflow(app, engine, ptoWorkflow);
```

## pitfalls

- **Over-abstraction kills velocity.** The composable platform should start with 2-3 template workflows and extract common patterns. Don't build the full generic engine before validating with real workflows.
- **Schema migrations are hard.** Once a SharePoint List is created, adding required columns or changing types is disruptive. Version your schemas and handle missing columns gracefully.
- **Generic engines produce generic cards.** Template card functions should be polished, not auto-generated. The best workflow UX comes from purpose-built card layouts, not generic field renderers.
- **Power Automate hybrid mode adds complexity.** Supporting both bot-native and Power Automate execution means two code paths, two monitoring surfaces, and two failure modes. Default to bot-native for the FHL; add Power Automate later.
- **Ecosystem extensibility requires stable interfaces.** Don't expose extension points until the core patterns stabilize through 3+ real workflow implementations.

## references

- https://learn.microsoft.com/en-us/graph/api/resources/list
- https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/universal-actions-for-adaptive-cards/overview
- https://learn.microsoft.com/en-us/power-automate/getting-started

## instructions

Use this expert when designing the overall composable workflow architecture. Covers the five-element lifecycle framework, WorkflowDefinition interface, generic engine patterns, template workflows, auto-generated AI query schemas, and extensibility points. Pair with `../teams/workflow.sharepoint-lists-ts.md` for state persistence, `../teams/workflow.message-native-records-ts.md` for card-as-record patterns, `../teams/workflow.triggers-compose-ts.md` for trigger unification, `../teams/ai.conversational-query-ts.md` for NL retrieval, and `../teams/workflow.approvals-inline-ts.md` for approval routing.

## research

Deep Research prompt:

"Write a micro expert on designing a composable workflow platform inside Microsoft Teams (TypeScript). Cover: five-element lifecycle framework (trigger, state, logic, intelligence, visibility), WorkflowDefinition configuration interface, generic workflow engine that dispatches from definitions, template/reference workflows (PTO, equipment, standup), auto-generated AI function schemas from column definitions, SharePoint Lists as pluggable state backend, Power Automate hybrid execution mode, and ecosystem extensibility points. Include complete patterns for the definition interface, engine registration, and one template workflow."
