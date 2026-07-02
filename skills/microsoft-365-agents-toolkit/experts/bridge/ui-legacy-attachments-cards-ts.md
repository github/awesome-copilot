# ui-legacy-attachments-cards-ts

## purpose

Bridges pre-Block Kit Slack legacy attachments and Teams Adaptive Cards for cross-platform bots targeting Slack, Teams, or both.

## rules

1. Slack legacy attachments (`message.attachments[]`) predate Block Kit and use a flat JSON structure with `text`, `fallback`, `color`, `callback_id`, and `actions[]`. These map to a single Adaptive Card with `TextBlock` body elements and `Action.Submit` actions.
2. Slack `app.attachmentAction(callback_id)` handles button clicks on legacy attachments. In Teams, this maps to `app.on('adaptiveCards.actionSubmit')` or `app.adaptiveCards.actionSubmit(verb, handler)` where `verb` is embedded in `Action.Submit.data`.
3. Slack legacy attachment `color` (hex string like `"#3AA3E3"` or named like `"good"`, `"warning"`, `"danger"`) maps to Adaptive Card `Container` with `style` property: `"good"` → `"good"`, `"warning"` → `"warning"`, `"danger"` → `"attention"`. For custom hex colors, wrap the card content in a `Container` with `"style": "emphasis"` (no arbitrary hex colors in Adaptive Cards).
4. Slack legacy attachment `fallback` (plain-text fallback for notifications) maps to the `fallback` property on the Adaptive Card's `content` object (e.g., `{ ..., "fallback": "Fallback text for notifications" }`). Always provide this for accessibility.
5. Slack legacy attachment `actions[]` with `type: "button"` map to Adaptive Card `Action.Submit` buttons. The button `name` and `value` become keys in `Action.Submit.data`. The `callback_id` becomes the `verb` routing key.
6. Slack legacy `confirm` objects (confirmation dialogs on buttons) have no direct Adaptive Card equivalent. Redesign as: (a) an `Action.ShowCard` that reveals a confirmation sub-card with Confirm/Cancel buttons, or (b) a two-step flow where the first click sends a confirmation card and the second click executes the action.
7. Slack `attachment_type: "default"` has no Adaptive Card equivalent — it was a Slack internal marker. Remove it during migration.
8. Slack legacy attachment `actions[]` with `type: "select"` (dropdown menus) map to Adaptive Card `Input.ChoiceSet` with `style: "compact"`. Remember that Adaptive Card selects require an explicit `Action.Submit` button — they do not fire on selection like Slack.
9. Slack `respond({ replace_original: true })` (replacing the original message after an attachment action) maps to Teams `updateActivity()` with the original activity ID and a new Adaptive Card attachment.
10. Messages mixing legacy attachments AND Block Kit blocks should be bridged to a single Adaptive Card. The attachment text becomes header/body `TextBlock` elements and the Block Kit portion follows the standard block-kit-to-adaptive-cards mapping.
11. **Reverse direction (Teams → Slack):** While not recommended (Block Kit is preferred), Adaptive Cards can be mapped to legacy attachment format if targeting very old Slack integrations. Map `TextBlock` to `attachments[].text`, `Container` style to `color`, and `Action.Submit` to `actions[].type: "button"`. Prefer converting to Block Kit instead of legacy attachments for new Slack integrations.

## patterns

### Legacy attachment with buttons → Adaptive Card

**Slack (before):**

```kotlin
// --- Slack legacy attachment JSON ---
val message = """
{
  "text": "Would you like to play a game?",
  "attachments": [
    {
      "text": "Choose a game to play",
      "fallback": "You are unable to choose a game",
      "callback_id": "wopr_game",
      "color": "#3AA3E3",
      "attachment_type": "default",
      "actions": [
        { "name": "game", "text": "Chess", "type": "button", "value": "chess" },
        { "name": "game", "text": "Falken's Maze", "type": "button", "value": "maze" },
        {
          "name": "game",
          "text": "Thermonuclear War",
          "style": "danger",
          "type": "button",
          "value": "war",
          "confirm": {
            "title": "Are you sure?",
            "text": "Wouldn't you prefer a good game of chess?",
            "ok_text": "Yes",
            "dismiss_text": "No"
          }
        }
      ]
    }
  ]
}
"""

app.attachmentAction("wopr_game") { req, ctx ->
    ctx.respond(secondMessage)
    ctx.ack()
}
```

**Teams (after):**

```typescript
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common';

const app = new App({
  logger: new ConsoleLogger('game-bot'),
});

// The game selection card (replaces legacy attachment)
const gameCard = {
  type: 'AdaptiveCard' as const,
  version: '1.5',
  fallback: 'You are unable to choose a game',
  body: [
    {
      type: 'TextBlock',
      text: 'Would you like to play a game?',
      size: 'Medium',
      weight: 'Bolder',
    },
    {
      type: 'TextBlock',
      text: 'Choose a game to play',
      wrap: true,
    },
  ],
  actions: [
    {
      type: 'Action.Submit',
      title: 'Chess',
      data: { verb: 'wopr_game', game: 'chess' },
    },
    {
      type: 'Action.Submit',
      title: "Falken's Maze",
      data: { verb: 'wopr_game', game: 'maze' },
    },
    {
      // Dangerous action — use Action.ShowCard for confirmation
      type: 'Action.ShowCard',
      title: 'Thermonuclear War',
      card: {
        type: 'AdaptiveCard',
        body: [
          {
            type: 'TextBlock',
            text: "Are you sure? Wouldn't you prefer a good game of chess?",
            wrap: true,
            color: 'Attention',
          },
        ],
        actions: [
          {
            type: 'Action.Submit',
            title: 'Yes',
            style: 'destructive',
            data: { verb: 'wopr_game', game: 'war' },
          },
          // "No" simply collapses the ShowCard — no action needed
        ],
      },
    },
  ],
};

// Send the game card when the user says "play"
app.on('message', async ({ activity, send }) => {
  if (activity.text?.match(/play/i)) {
    await send({
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: gameCard,
      }],
    });
  }
});

// Handle game selection (replaces app.attachmentAction("wopr_game"))
// TODO: Replace with app.adaptiveCards.actionSubmit if using teams-ai SDK
app.on('adaptiveCards.actionSubmit' as any, async ({ activity, send }) => {
  const data = activity.value;
  if (data?.verb === 'wopr_game') {
    const game = data.game;
    await send(`You chose: ${game}. Let's play!`);
    // TODO: Send the follow-up card (replaces secondMessage / replace_original)
  }
});

app.start(3978);
```

### Mapping reference table

| Slack Legacy Attachment | Adaptive Card Equivalent | Notes |
|---|---|---|
| `attachments[].text` | `TextBlock` in `body` | Convert mrkdwn to standard Markdown |
| `attachments[].fallback` | Card-level `fallback` property | For notifications and accessibility |
| `attachments[].color` (`"good"`) | `Container` with `style: "good"` | Green styling |
| `attachments[].color` (`"warning"`) | `Container` with `style: "warning"` | Yellow styling |
| `attachments[].color` (`"danger"`) | `Container` with `style: "attention"` | Red styling |
| `attachments[].color` (`"#hex"`) | `Container` with `style: "emphasis"` | No arbitrary hex; use closest semantic style |
| `attachments[].callback_id` | `Action.Submit.data.verb` | Routing key for action handlers |
| `actions[].type: "button"` | `Action.Submit` | `name`/`value` → `data` keys |
| `actions[].style: "danger"` | `Action.Submit` with `style: "destructive"` | |
| `actions[].confirm` | `Action.ShowCard` with confirm sub-card | Or two-step confirmation flow |
| `actions[].type: "select"` | `Input.ChoiceSet` + `Action.Submit` | Requires explicit submit button |
| `attachment_type: "default"` | *(remove)* | No equivalent needed |
| `app.attachmentAction(id)` | `app.adaptiveCards.actionSubmit(verb)` | Or `app.on('adaptiveCards.actionSubmit')` |
| `respond({ replace_original })` | `updateActivity(activityId, card)` | Must store original activity ID |

## pitfalls

- **No arbitrary colors**: Slack attachments support any hex color via the `color` field. Adaptive Cards only support semantic styles (`"good"`, `"warning"`, `"attention"`, `"emphasis"`, `"accent"`, `"default"`). Map to the closest semantic meaning rather than exact color matching.
- **Confirmation dialogs require redesign**: Slack's `confirm` object is a built-in dialog. Adaptive Cards have no equivalent. `Action.ShowCard` is the closest — it reveals an inline sub-card. For a modal confirmation, use a task module flow instead.
- **Select fires differently**: Slack legacy selects fire immediately on selection. Adaptive Card `Input.ChoiceSet` requires a separate `Action.Submit` click. This changes the UX — inform users of the change.
- **Mixed attachments + blocks**: Some Slack messages combine legacy attachments with Block Kit blocks. Merge both into a single Adaptive Card. The attachment text becomes `TextBlock`s at the top, followed by the converted Block Kit elements.
- **`replace_original` requires activity ID**: Slack's `respond({ replace_original: true })` works with just the `response_url`. In Teams, you need the original activity ID to call `updateActivity()`. Store the activity ID when you send the card (returned from `send()`).
- **`callback_id` routing**: Slack routes attachment actions by `callback_id`. Teams routes by the `verb` (or custom key) in `Action.Submit.data`. Ensure every button includes a routing key in its `data` object.

## references

- https://api.slack.com/reference/messaging/attachments — Slack legacy attachments (deprecated but supported)
- https://api.slack.com/legacy/interactive-messages — Legacy interactive messages (attachment actions)
- https://adaptivecards.io/explorer/Action.ShowCard.html — Action.ShowCard (inline reveal)
- https://adaptivecards.io/explorer/Container.html — Container with style property
- https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-reference — Teams card reference
- https://github.com/microsoft/teams.ts — Teams SDK v2

## instructions

Use this expert when adding cross-platform support in either direction for Slack legacy attachments or Teams Adaptive Cards. It covers converting attachment JSON to Adaptive Card JSON and vice versa, mapping `attachmentAction` handlers to `actionSubmit` handlers, redesigning confirmation dialogs, handling message replacement, and dealing with mixed attachment + Block Kit messages. For Teams → Slack, Adaptive Cards can be mapped to legacy attachment format if targeting very old Slack integrations, though Block Kit is preferred. Pair with `ui-block-kit-adaptive-cards-ts.md` if the message also contains Block Kit blocks, and `../teams/ui.adaptive-cards-ts.md` for Adaptive Card construction patterns.

## research

Deep Research prompt:

"Write a micro expert on bridging Slack legacy message attachments (pre-Block Kit) and Teams Adaptive Cards in either direction for cross-platform bots. Cover: attachment text/color/fallback/callback_id/actions mapping, button and select action conversion, confirm dialog redesign with Action.ShowCard, attachmentAction handler bridging to adaptiveCards.actionSubmit, replace_original to updateActivity, mixed attachments + Block Kit messages, color mapping limitations, and reverse-direction notes for Teams → Slack legacy attachment mapping. Include a worked example converting between formats."
