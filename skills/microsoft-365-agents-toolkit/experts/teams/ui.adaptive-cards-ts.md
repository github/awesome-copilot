# ui.adaptive-cards-ts

## purpose

Adaptive Cards construction, sending as attachments, handling Action.Submit via card.action handlers, and Teams-specific constraints.

## rules

1. Always set `"type": "AdaptiveCard"` and `"$schema": "http://adaptivecards.io/schemas/adaptive-card.json"` at the card root; Teams requires `"version": "1.5"` or lower (1.6+ features are silently ignored). [adaptivecards.io/designer](https://adaptivecards.io/designer)
2. Wrap every card in a `CardFactory.adaptiveCard(cardJson)` attachment -- never send raw JSON as message text. The attachment `contentType` is `"application/vnd.microsoft.card.adaptive"`. [learn.microsoft.com -- Cards reference](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-reference#adaptive-card)
3. Register card action handlers with `app.adaptiveCards.actionSubmit(actionVerb, handler)` where `actionVerb` matches the `data.verb` (or `data.action`) string you embed in the card's `Action.Submit`. The handler receives `(ctx, state, data)` where `data` is the merged `activity.value` object. [github.com/microsoft/teams-ai](https://github.com/microsoft/teams-ai)
4. Every `Action.Submit` must include a `data` object with a routing identifier (e.g., `{ "verb": "approve", ...inputValues }`). Without it, Teams merges only input field values into `activity.value` and there is no way to distinguish which button was pressed.
5. Input element `id` values become keys in `activity.value`. For example, `Input.Text` with `"id": "comment"` yields `activity.value.comment`. Keep IDs short and unique within a card.
6. To update an existing message (e.g., replacing a card after action), return an updated card from the handler or call `await ctx.updateActivity({ ...activity, attachments: [newCard] })`. To send a new message instead, call `await ctx.sendActivity(MessageFactory.attachment(newCard))`.
7. Teams Adaptive Cards do NOT support `Action.Http`, `Action.ToggleVisibility` (partial -- works for simple show/hide but not nested), `backgroundImage` on mobile, `Media` element playback, or `hostConfig` overrides. Always test on desktop + mobile. [learn.microsoft.com -- Cards reference](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-reference#adaptive-card)
8. Card payload size must be under 28 KB (after JSON serialization). Larger cards are rejected silently. [learn.microsoft.com -- Card size limit](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-reference#card-size-limit)
9. For `Action.Execute` (Universal Actions), the handler is `app.adaptiveCards.actionExecute(verb, handler)` and the return must be an Adaptive Card (used for automatic card refresh / user-specific views). Prefer `Action.Submit` for standard form flows; use `Action.Execute` only when you need per-user card refresh. [learn.microsoft.com -- Universal Actions](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/universal-actions-for-adaptive-cards/overview)
10. Always validate `activity.value` server-side -- clients can tamper with the JSON payload. Use a schema validator (e.g., zod) before trusting input data.

## patterns

### Confirm / Cancel card with action routing

```typescript
import { App, TurnState } from "@microsoft/teams-ai";
import { CardFactory, MessageFactory } from "botbuilder";

// -- Card JSON ---------------------------------------------------------------
const confirmCard = {
  type: "AdaptiveCard",
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  version: "1.5",
  body: [
    {
      type: "TextBlock",
      text: "Delete this item?",
      weight: "Bolder",
      size: "Medium",
    },
    {
      type: "TextBlock",
      text: "This action cannot be undone.",
      wrap: true,
      isSubtle: true,
    },
  ],
  actions: [
    {
      type: "Action.Submit",
      title: "Confirm",
      style: "destructive",
      data: { verb: "deleteConfirm", itemId: "abc-123" },
    },
    {
      type: "Action.Submit",
      title: "Cancel",
      data: { verb: "deleteCancel", itemId: "abc-123" },
    },
  ],
};

// -- Handlers ----------------------------------------------------------------
export function registerConfirmHandlers(app: App<TurnState>): void {
  app.adaptiveCards.actionSubmit("deleteConfirm", async (ctx, _state, data) => {
    const itemId = (data as Record<string, string>).itemId;
    // ... perform deletion logic ...
    // Replace the card with a confirmation message
    const doneCard = CardFactory.adaptiveCard({
      type: "AdaptiveCard",
      version: "1.5",
      body: [{ type: "TextBlock", text: `Item ${itemId} deleted.` }],
    });
    await ctx.updateActivity({
      type: "message",
      id: ctx.activity.replyToId,
      attachments: [doneCard],
    });
    return undefined;
  });

  app.adaptiveCards.actionSubmit("deleteCancel", async (ctx) => {
    const cancelCard = CardFactory.adaptiveCard({
      type: "AdaptiveCard",
      version: "1.5",
      body: [{ type: "TextBlock", text: "Deletion cancelled." }],
    });
    await ctx.updateActivity({
      type: "message",
      id: ctx.activity.replyToId,
      attachments: [cancelCard],
    });
    return undefined;
  });
}
```

### Form submission with input extraction

```typescript
import { App, TurnState } from "@microsoft/teams-ai";
import { CardFactory, MessageFactory } from "botbuilder";

const feedbackFormCard = {
  type: "AdaptiveCard",
  $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
  version: "1.5",
  body: [
    { type: "TextBlock", text: "Submit Feedback", weight: "Bolder", size: "Large" },
    {
      type: "Input.Text",
      id: "userName",
      label: "Your name",
      isRequired: true,
      errorMessage: "Name is required",
    },
    {
      type: "Input.ChoiceSet",
      id: "rating",
      label: "Rating",
      style: "compact",
      value: "3",
      choices: [
        { title: "1 - Poor", value: "1" },
        { title: "2 - Fair", value: "2" },
        { title: "3 - Good", value: "3" },
        { title: "4 - Great", value: "4" },
        { title: "5 - Excellent", value: "5" },
      ],
    },
    {
      type: "Input.Text",
      id: "comments",
      label: "Comments",
      isMultiline: true,
      placeholder: "Tell us more...",
    },
    {
      type: "Input.Toggle",
      id: "followUp",
      title: "Contact me for follow-up",
      value: "false",
      valueOn: "true",
      valueOff: "false",
    },
  ],
  actions: [
    {
      type: "Action.Submit",
      title: "Submit",
      data: { verb: "submitFeedback" },
    },
  ],
};

interface FeedbackData {
  verb: string;
  userName: string;
  rating: string;
  comments?: string;
  followUp: string;
}

export function registerFeedbackHandlers(app: App<TurnState>): void {
  app.adaptiveCards.actionSubmit("submitFeedback", async (ctx, _state, data) => {
    const fd = data as FeedbackData;
    // Input values are merged into activity.value alongside the data object
    const msg = `Thanks ${fd.userName}! Rating: ${fd.rating}/5.`;
    await ctx.sendActivity(MessageFactory.text(msg));
    return undefined;
  });
}

// -- Sending the card --------------------------------------------------------
// Inside any handler or proactive flow:
// await ctx.sendActivity(MessageFactory.attachment(
//   CardFactory.adaptiveCard(feedbackFormCard)
// ));
```

### Dynamic choices via Action.Execute refresh

```typescript
import { App, TurnState } from "@microsoft/teams-ai";
import { CardFactory } from "botbuilder";

// Card with Action.Execute for per-user refresh (Universal Actions)
function buildTicketCard(tickets: { id: string; title: string }[]): object {
  return {
    type: "AdaptiveCard",
    version: "1.4",
    refresh: {
      action: {
        type: "Action.Execute",
        title: "Refresh",
        verb: "refreshTickets",
      },
      userIds: [], // empty = refresh for all users
    },
    body: [
      { type: "TextBlock", text: "Open Tickets", weight: "Bolder" },
      {
        type: "Input.ChoiceSet",
        id: "selectedTicket",
        label: "Pick a ticket",
        choices: tickets.map((t) => ({ title: t.title, value: t.id })),
      },
    ],
    actions: [
      {
        type: "Action.Execute",
        title: "Claim",
        verb: "claimTicket",
        data: {},
      },
    ],
  };
}

export function registerTicketHandlers(app: App<TurnState>): void {
  // Action.Execute handler -- must return an Adaptive Card
  app.adaptiveCards.actionExecute("refreshTickets", async (_ctx, _state) => {
    const tickets = [
      { id: "T-1", title: "Login page broken" },
      { id: "T-2", title: "Report export fails" },
    ]; // replace with real DB call
    return CardFactory.adaptiveCard(buildTicketCard(tickets));
  });

  app.adaptiveCards.actionExecute("claimTicket", async (ctx, _state, data) => {
    const ticketId = (data as Record<string, string>).selectedTicket;
    // ... assign ticket ...
    return CardFactory.adaptiveCard({
      type: "AdaptiveCard",
      version: "1.4",
      body: [{ type: "TextBlock", text: `Ticket ${ticketId} claimed by you.` }],
    });
  });
}
```

## pitfalls

- **Missing `verb` in data**: If `Action.Submit` has no `data` object (or no routing key), the `actionSubmit` handler cannot route by verb. Always include `{ verb: "myAction" }` in the `data` property.
- **Input IDs collide with data keys**: If an `Input.Text` has `id: "verb"`, it overwrites the `data.verb` routing key when merged into `activity.value`. Use prefixes (e.g., `input_name`) or avoid reserved keys.
- **Updating the wrong activity**: `ctx.activity.replyToId` is the ID of the message containing the card. Use this for `updateActivity`. Using `ctx.activity.id` targets the invoke activity itself, not the card message.
- **Card version too high**: Teams desktop/mobile silently drops elements from schema versions above what the client supports. Stick to version `"1.5"` for broadest compatibility. Test version `"1.6"` features explicitly before shipping.
- **`Action.Execute` vs `Action.Submit`**: `Action.Execute` requires the handler to return a card (for automatic replacement). `Action.Submit` handlers are fire-and-forget from the card's perspective. Mixing them up causes silent failures or empty card replacements.
- **Card not rendering**: Forgetting `CardFactory.adaptiveCard()` and instead passing raw JSON to `attachments` results in a blank message. Always wrap with `CardFactory`.
- **ChoiceSet value types**: All `Input.ChoiceSet` values arrive as strings in `activity.value`, even if they look numeric. Parse explicitly with `parseInt()` or a validation library.
- **28 KB limit**: Large dynamically generated cards (e.g., long lists) can exceed the Teams payload limit. Paginate or truncate before serializing.

## references

- [Adaptive Cards Schema Explorer](https://adaptivecards.io/explorer/)
- [Adaptive Cards Designer](https://adaptivecards.io/designer/)
- [Teams: Cards and card actions](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-actions)
- [Teams: Adaptive Card for bots](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-reference#adaptive-card)
- [Teams: Universal Actions for Adaptive Cards](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/universal-actions-for-adaptive-cards/overview)
- [Teams AI SDK GitHub -- samples](https://github.com/microsoft/teams-ai/tree/main/js/samples)
- [Teams: Format cards](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-format)
- [Teams: Card size limits](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-reference#card-size-limit)

## instructions

This expert covers building, sending, and handling Adaptive Cards in Microsoft Teams bots using the Teams AI SDK v2 (`@microsoft/teams-ai`) in TypeScript. Use it when you need to:

- Construct an Adaptive Card JSON payload (body elements, inputs, actions)
- Send a card as a bot attachment via `CardFactory.adaptiveCard()` + `MessageFactory.attachment()`
- Handle `Action.Submit` button presses with `app.adaptiveCards.actionSubmit(verb, handler)`
- Handle `Action.Execute` (Universal Actions) with `app.adaptiveCards.actionExecute(verb, handler)`
- Extract user input from `activity.value` (merged input IDs + action data)
- Update an existing card message vs. sending a new reply
- Avoid Teams-specific limitations (version caps, unsupported elements, size limits)

Pair with `ui.dialogs-task-modules-ts.md` for modal/dialog card flows and `runtime.routing-handlers-ts.md` for broader handler registration context.

## research

Deep Research prompt:

"Write a micro expert on Adaptive Cards in Teams (TypeScript). Cover card anatomy, input elements, Action.Submit payloads, sending attachments, handling app.on('card.action'), extracting action identifiers from activity.value, updating messages vs sending new, and Teams-specific card limitations. Include 2-3 canonical card patterns (confirm/cancel, form submit, dynamic choices)."
