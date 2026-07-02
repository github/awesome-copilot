# ui-block-kit-adaptive-cards-ts

## purpose

Bridges Slack Block Kit and Teams Adaptive Card UI structures for cross-platform bots targeting Slack, Teams, or both.

## rules

1. Target Adaptive Cards schema version `1.5` for Teams desktop/mobile compatibility (learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-format).
2. Every Slack `action_id` must become a key inside the Adaptive Card `Action.Submit.data` object so the bot can route by `data.action` (adaptivecards.io/explorer/Action.Submit.html).
3. Slack `block_id` has no direct equivalent -- encode it in `Action.Submit.data.blockId` if you need round-trip tracing.
4. Slack mrkdwn uses `*bold*` and `_italic_`; Adaptive Cards use standard Markdown (`**bold**`, `_italic_`) inside `TextBlock.text` with `"style": "default"` (adaptivecards.io/explorer/TextBlock.html).
5. Slack `image_url` fields map to `Image.url`; always set `Image.altText` (required for accessibility in Teams).
6. Slack modals (`views.open` / `views.push`) map to Teams task modules invoked via `task/fetch` and rendered with an Adaptive Card; submission maps to `task/submit` (learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/task-modules/task-modules-bots).
7. Slack `view_submission` payload fields map: `view.state.values[block_id][action_id].value` becomes the flat `data` object returned by `task/submit`, keyed by each input's `id`.
8. Slack `static_select` maps to `Input.ChoiceSet` with `"style": "compact"`. Slack `multi_static_select` maps to `Input.ChoiceSet` with `"isMultiSelect": true` (adaptivecards.io/explorer/Input.ChoiceSet.html).
9. Slack `overflow` menu has no Adaptive Card equivalent -- redesign as `ActionSet` with multiple `Action.Submit` buttons or a single `Input.ChoiceSet` dropdown.
10. Teams Adaptive Cards support `ColumnSet`/`Column` and `FactSet` which have no Block Kit equivalent -- use them to improve layout density during migration.

## strategy

The core principle: **map the blocks mechanically, then redesign the layout and interaction model to be native Teams rather than ported Slack.** A 1:1 block-to-element swap produces a functional card that looks like Slack awkwardly wearing a Teams suit. Follow these four phases in order.

### Phase 1: Map for correctness

Get every block producing the correct output using the mapping table below. This is mechanical work:
- `header` → `TextBlock` Large/Bolder
- `section` fields → `FactSet`
- `button` → `Action.Submit` with `data.verb`
- Convert `*bold*` mrkdwn to `**bold**` standard Markdown
- Replace `:emoji_shortcodes:` with Unicode equivalents (Teams does not render Slack shortcodes)
- Replace `<@U12345>` mentions with display names (Slack mention syntax does not work in Adaptive Cards)
- Swap button styles: `"primary"` → `"positive"`, `"danger"` → `"destructive"`
- Add explicit submit buttons wherever Slack had instant-fire selects

### Phase 2: Upgrade the layout

Once correct, leverage Adaptive Card strengths that have no Block Kit equivalent:
- Replace flat block lists with `ColumnSet`/`Container` for denser, structured layouts
- Use semantic container styles (`"attention"` = red, `"good"` = green, `"warning"` = yellow) instead of faking status with emoji
- Add client-side validation (`isRequired`, `errorMessage`, `regex`, `min`/`max`) instead of relying entirely on server-side checks
- Use `Input.ChoiceSet` with `"style": "filtered"` for typeahead search to replace `external_select` server-side handlers
- Use `FactSet` for clean key/value pairs instead of manual mrkdwn formatting in `section.fields`

### Phase 3: Rethink the interaction model

This is the biggest behavioral shift. Slack's model is **event-per-interaction** -- every select and button fires immediately. Teams' model is **form-then-submit**.
- Group related inputs together and submit them as a batch with a single `Action.Submit`
- Accept fewer round trips -- the UX feels different, so lean into it rather than fighting it
- Use `Action.Execute` with the card `refresh` property if you genuinely need per-interaction updates or per-user card views
- Slack ephemeral messages for per-user content → Universal Actions (`Action.Execute`) for per-user card states from the same message

### Phase 4: Handle what doesn't convert

Have an explicit plan for each gap:
- `overflow` menu → redesign as `Input.ChoiceSet` dropdown or an `ActionSet` with multiple buttons
- Stacked modals (`views.push`) → flatten into multi-step cards or sequential task modules (Teams task modules do not stack)
- `dispatch_action` live updates → accept the batch-submit model, or use `Action.Execute` refresh for critical cases
- `private_metadata` → embed hidden state in `Action.Submit.data` fields or use bot conversation state
- `view_submission` with field-level errors keeping the modal open → no equivalent in Teams; validate client-side with `isRequired`/`regex`, or close the task module and send an error message
- Action count overflow (Slack allows 25 per block, Teams allows 6 per `ActionSet`) → paginate into multiple cards or consolidate into dropdowns

## patterns

### mapping-table

| Slack Block Kit           | Adaptive Card Element         | Notes                                              |
|---------------------------|-------------------------------|----------------------------------------------------|
| `section` (text)          | `TextBlock`                   | Set `wrap: true`; convert mrkdwn to standard MD    |
| `section` (text+accessory)| `ColumnSet` with 2 `Column`s  | Col 1 = TextBlock, Col 2 = accessory element       |
| `section` (fields)        | `FactSet`                     | Each field becomes a `Fact { title, value }`        |
| `actions`                 | `ActionSet`                   | Contains `Action.Submit` / `Action.OpenUrl`         |
| `divider`                 | `TextBlock` with `separator`  | `{ "type": "TextBlock", "text": " ", "separator": true }` |
| `header`                  | `TextBlock` size `Large`      | `{ "type": "TextBlock", "size": "Large", "weight": "Bolder" }` |
| `image`                   | `Image`                       | Set `url`, `altText`, optional `size`               |
| `context`                 | `TextBlock` size `Small`      | `{ "type": "TextBlock", "size": "Small", "isSubtle": true }` |
| `input` (plain_text)      | `Input.Text`                  | `id` = action_id, `label` maps to `Input.Text.label` |
| `input` (static_select)   | `Input.ChoiceSet`             | `style: "compact"` for dropdown                     |
| `input` (multi_select)    | `Input.ChoiceSet` multiSelect | `"isMultiSelect": true`                             |
| `input` (datepicker)      | `Input.Date`                  | Format: `YYYY-MM-DD`                                |
| `input` (timepicker)      | `Input.Time`                  | Format: `HH:mm`                                     |
| `input` (checkboxes)      | `Input.ChoiceSet` expanded    | `"style": "expanded", "isMultiSelect": true`        |
| `input` (radio_buttons)   | `Input.ChoiceSet` expanded    | `"style": "expanded", "isMultiSelect": false`       |
| `rich_text`               | `TextBlock` + `RichTextBlock` | RichTextBlock available in schema 1.5+              |

### actions-mapping

| Slack Element        | Adaptive Card Action       | Key Differences                                    |
|----------------------|----------------------------|----------------------------------------------------|
| `button`             | `Action.Submit`            | `value` moves into `data`; `style: "danger"` maps to `style: "destructive"` |
| `button` (url)       | `Action.OpenUrl`           | `url` field is identical                           |
| `overflow`           | *No equivalent*            | Redesign as `ActionSet` or `Input.ChoiceSet`       |
| `static_select`      | `Input.ChoiceSet` + Submit | Slack fires on select; Teams needs explicit submit  |
| `external_select`    | `Input.ChoiceSet` + `Action.Submit` with `data.query` | Implement typeahead via `Input.ChoiceSet` with `"style": "filtered"` (schema 1.5) |
| `multi_static_select`| `Input.ChoiceSet` multi    | Teams returns comma-separated string of values      |

### reverse-direction (Teams → Slack)

For Teams → Slack, reverse the mapping table. Adaptive Card elements map back to Block Kit blocks:
- `TextBlock` Large/Bolder → `header`
- `FactSet` → `section` with `fields`
- `Action.Submit` with `data.verb` → `button` with `value`
- Convert `**bold**` standard Markdown to `*bold*` mrkdwn
- Replace Unicode emoji with `:emoji_shortcodes:` where Slack supports them
- Swap button styles: `"positive"` → `"primary"`, `"destructive"` → `"danger"`
- `ColumnSet`/`Container` layouts → flatten to linear `section` blocks (Block Kit has no grid)
- `Input.ChoiceSet` with `style: "filtered"` → `external_select` with server-side options handler
- `Input.ChoiceSet` + `Action.Submit` → `static_select` in `actions` block (fires immediately on select)
- `Action.Execute` per-user refresh → ephemeral messages for per-user content
- Client-side validation (`isRequired`, `regex`) → server-side validation in `view_submission` handler
- Semantic container styles (`"attention"`, `"good"`) → emoji-based status indicators or colored attachment sidebars

Key behavioral shift (Teams → Slack): The Adaptive Card **form-then-submit** model must be decomposed into Slack's **event-per-interaction** model. Each input that previously submitted as part of a batch may need its own `block_actions` handler if the Slack UX expects instant-fire behavior.

### worked-example-1: button workflow

Slack Block Kit message with approve/reject buttons converted to Adaptive Card.

```typescript
// --- Slack Block Kit (original) ---
import type { KnownBlock } from "@slack/types";

const slackBlocks: KnownBlock[] = [
  {
    type: "section",
    block_id: "request_info",
    text: { type: "mrkdwn", text: "*Expense Report #1042*\nAmount: $350.00" },
  },
  {
    type: "actions",
    block_id: "approval_actions",
    elements: [
      {
        type: "button",
        action_id: "approve_expense",
        text: { type: "plain_text", text: "Approve" },
        style: "primary",
        value: "1042",
      },
      {
        type: "button",
        action_id: "reject_expense",
        text: { type: "plain_text", text: "Reject" },
        style: "danger",
        value: "1042",
      },
    ],
  },
];

// --- Adaptive Card (converted) ---
interface AdaptiveCard {
  type: "AdaptiveCard";
  $schema: string;
  version: string;
  body: Record<string, unknown>[];
  actions?: Record<string, unknown>[];
}

const adaptiveCard: AdaptiveCard = {
  type: "AdaptiveCard",
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  version: "1.5",
  body: [
    {
      type: "TextBlock",
      text: "**Expense Report #1042**\nAmount: $350.00",
      wrap: true,
    },
  ],
  actions: [
    {
      type: "Action.Submit",
      title: "Approve",
      style: "positive",
      data: {
        action: "approve_expense",
        blockId: "approval_actions",
        value: "1042",
      },
    },
    {
      type: "Action.Submit",
      title: "Reject",
      style: "destructive",
      data: {
        action: "reject_expense",
        blockId: "approval_actions",
        value: "1042",
      },
    },
  ],
};
```

Handler comparison:

```typescript
// --- Slack handler (Bolt) ---
// app.action("approve_expense", async ({ action, ack, respond }) => {
//   await ack();
//   const expenseId = action.value; // "1042"
//   await respond({ text: `Expense ${expenseId} approved.` });
// });

// --- Teams handler (Teams AI SDK) ---
import { App, TurnState } from "@microsoft/teams-ai";
import { CardFactory } from "botbuilder";

export function registerExpenseHandlers(app: App<TurnState>): void {
  app.adaptiveCards.actionSubmit("approve_expense", async (ctx, _state, data) => {
    const expenseId = (data as Record<string, string>).value; // "1042"
    const reply = CardFactory.adaptiveCard({
      type: "AdaptiveCard",
      version: "1.5",
      body: [{ type: "TextBlock", text: `Expense ${expenseId} approved.` }],
    });
    await ctx.updateActivity({
      type: "message",
      id: ctx.activity.replyToId,
      attachments: [reply],
    });
    return undefined;
  });
}
```

### worked-example-2: modal form

Slack modal with text input and select converted to Teams task module with Adaptive Card form.

```typescript
// --- Slack modal (original, opened via views.open) ---
import type { View } from "@slack/types";

const slackModal: View = {
  type: "modal",
  callback_id: "create_ticket",
  title: { type: "plain_text", text: "Create Ticket" },
  submit: { type: "plain_text", text: "Submit" },
  blocks: [
    {
      type: "input",
      block_id: "title_block",
      label: { type: "plain_text", text: "Title" },
      element: {
        type: "plain_text_input",
        action_id: "ticket_title",
        placeholder: { type: "plain_text", text: "Enter title..." },
      },
    },
    {
      type: "input",
      block_id: "priority_block",
      label: { type: "plain_text", text: "Priority" },
      element: {
        type: "static_select",
        action_id: "ticket_priority",
        options: [
          { text: { type: "plain_text", text: "High" }, value: "high" },
          { text: { type: "plain_text", text: "Medium" }, value: "medium" },
          { text: { type: "plain_text", text: "Low" }, value: "low" },
        ],
      },
    },
  ],
};

// --- Adaptive Card for Teams task module (converted) ---
const taskModuleCard = {
  type: "AdaptiveCard" as const,
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  version: "1.5",
  body: [
    {
      type: "TextBlock",
      text: "Create Ticket",
      size: "Large",
      weight: "Bolder",
    },
    {
      type: "Input.Text",
      id: "ticket_title",
      label: "Title",
      placeholder: "Enter title...",
      isRequired: true,
    },
    {
      type: "Input.ChoiceSet",
      id: "ticket_priority",
      label: "Priority",
      style: "compact",
      isRequired: true,
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
      title: "Submit",
      data: { action: "create_ticket" },
    },
  ],
};
```

Task module invocation and submission handler:

```typescript
import {
  TeamsActivityHandler,
  TurnContext,
  TaskModuleResponse,
  CardFactory,
} from "botbuilder";

class TicketBot extends TeamsActivityHandler {
  // Replaces Slack's views.open -- triggered by messaging extension or Action.Submit
  async handleTeamsTaskModuleFetch(
    context: TurnContext
  ): Promise<TaskModuleResponse> {
    return {
      task: {
        type: "continue",
        value: {
          title: "Create Ticket",
          width: "medium",
          height: "medium",
          card: CardFactory.adaptiveCard(taskModuleCard),
        },
      },
    };
  }

  // Replaces Slack's view_submission handler
  async handleTeamsTaskModuleSubmit(
    context: TurnContext
  ): Promise<TaskModuleResponse | void> {
    const formData = context.activity.value?.data as {
      action: string;
      ticket_title: string;
      ticket_priority: string;
    };

    // Slack: view.state.values.title_block.ticket_title.value
    const title = formData.ticket_title;
    // Slack: view.state.values.priority_block.ticket_priority.selected_option.value
    const priority = formData.ticket_priority;

    await context.sendActivity(`Ticket created: "${title}" [${priority}]`);

    // Return void to close the task module (like no response_action in Slack)
    return undefined;
  }
}
```

### Confirmation dialog pattern (Y14)

Use `Action.ShowCard` for inline confirmation — the Teams equivalent of Slack's native `confirm` object on buttons.

```typescript
// Slack: button with confirm dialog
const slackButton = {
  type: "button",
  text: { type: "plain_text", text: "Delete" },
  style: "danger",
  action_id: "delete_item",
  value: "42",
  confirm: {
    title: { type: "plain_text", text: "Are you sure?" },
    text: { type: "mrkdwn", text: "This action cannot be undone." },
    confirm: { type: "plain_text", text: "Yes, delete" },
    deny: { type: "plain_text", text: "Cancel" },
  },
};

// Teams: Action.ShowCard inline confirmation
const teamsConfirmAction = {
  type: "Action.ShowCard",
  title: "Delete",
  card: {
    type: "AdaptiveCard",
    body: [
      {
        type: "TextBlock",
        text: "Are you sure? This action cannot be undone.",
        weight: "Bolder",
        color: "Attention",
      },
    ],
    actions: [
      {
        type: "Action.Submit",
        title: "Yes, delete",
        style: "destructive",
        data: { action: "confirm_delete", itemId: "42" },
      },
      {
        type: "Action.Submit",
        title: "Cancel",
        data: { action: "cancel_delete" },
      },
    ],
  },
};
```

**Why `Action.ShowCard`:** Expands inline without leaving the current context — closest to Slack's native `confirm` popup. No task module overhead.

**Don't:** Open a full task module dialog for a simple yes/no confirmation. It's too heavy for the interaction.

**Reverse (Teams → Slack):** Add a `confirm` object directly to the button element. Platform-rendered popup with zero effort.

## pitfalls

- **mrkdwn vs Markdown**: Slack uses `*bold*` and `~strike~`; Adaptive Cards expect `**bold**` and `~~strike~~`. Failing to convert produces literal asterisks in Teams.
- **Instant-fire selects**: Slack `static_select` inside an `actions` block fires `block_actions` immediately on selection. Adaptive Card `Input.ChoiceSet` does nothing until an `Action.Submit` is clicked -- you must add an explicit submit button.
- **Button style names differ**: Slack `"primary"` = green, `"danger"` = red. Adaptive Cards use `"positive"` and `"destructive"`. Using Slack names silently falls back to default styling.
- **Action count limit**: Teams Adaptive Cards support a maximum of 6 actions per `ActionSet`. Slack allows up to 25 elements in an `actions` block. Redesign dense action rows into paginated cards or dropdowns.
- **`overflow` menu**: No Adaptive Card equivalent exists. Replace with an `Input.ChoiceSet` dropdown or multiple `Action.Submit` buttons.
- **`multi_static_select` return format**: Slack returns `selected_options` as an array of objects. `Input.ChoiceSet` with `isMultiSelect` returns a single comma-separated string (e.g., `"a,b,c"`). Split server-side.
- **No `dispatch_action` equivalent**: Slack inputs can set `dispatch_action: true` to fire events on every keystroke. Adaptive Cards only submit on explicit `Action.Submit`.
- **Image sizing**: Slack `image` uses `alt_text` (underscore); Adaptive Card `Image` uses `altText` (camelCase). Slack fills width by default; set Adaptive Card `"size": "stretch"` to match.
- **`private_metadata`**: Slack modals carry `private_metadata` for state. In Teams task modules, embed hidden state inside `Action.Submit.data` fields or use bot conversation state.
- **Schema version**: Using features above 1.5 (e.g., `Action.Execute` for Universal Actions) requires verifying Teams client support. Stick to 1.5 for broadest compatibility.
- **Card replacement**: Slack `respond({ replace_original: true })` replaces the message. In Teams, use `context.updateActivity()` with the original activity ID, or return an `adaptiveCard/action` invoke response.

## references

- https://api.slack.com/reference/block-kit/blocks -- Slack Block Kit block type reference
- https://api.slack.com/reference/block-kit/block-elements -- Slack interactive element reference
- https://api.slack.com/surfaces/modals -- Slack modal (views.open) documentation
- https://adaptivecards.io/explorer/ -- Adaptive Cards schema explorer (all element types)
- https://adaptivecards.io/explorer/Action.Submit.html -- Action.Submit schema and data field
- https://adaptivecards.io/explorer/Input.ChoiceSet.html -- Input.ChoiceSet (select/multi-select)
- https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-reference -- Teams Adaptive Card support
- https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/task-modules/task-modules-bots -- Task modules from bots
- https://learn.microsoft.com/en-us/adaptive-cards/authoring-cards/universal-action-model -- Universal Actions

## instructions

This expert covers bridging Slack Block Kit and Teams Adaptive Card UI structures in TypeScript. Use it when adding cross-platform support in either direction: (1) bridging a Slack Bolt app to also target Teams, (2) bridging a Teams bot to also target Slack, (3) converting Block Kit JSON payloads to Adaptive Card JSON or vice versa, (4) redesigning modal workflows into task modules or task modules into modals, or (5) mapping interactive action handlers between platforms. Start with the strategy section to understand the four-phase approach (map for correctness → upgrade layout → rethink interactions → handle gaps), consult the mapping table and reverse-direction section for specific element types, and adapt the worked examples to your use case. Pair with `../slack/ui.block-kit-ts.md` for Slack Block Kit patterns, and `../teams/ui.adaptive-cards-ts.md` for Teams Adaptive Card patterns and constraints.

## research

Deep Research prompt:

"Write a micro expert for bridging Slack Block Kit and Teams Adaptive Cards bidirectionally. Include: mapping table (Block Kit blocks <-> card elements) in both directions, interactive actions mapping (action_id <-> data.action), selects/inputs mapping, modal/task-module workflow redesign in both directions, unsupported features and redesign recommendations for each platform, and 2 worked examples (a button workflow and a modal form)."
