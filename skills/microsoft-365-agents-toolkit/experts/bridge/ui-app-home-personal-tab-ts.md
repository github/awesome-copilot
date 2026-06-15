# ui-app-home-personal-tab-ts

## purpose

Bridges Slack App Home and Teams personal tab / bot welcome card for cross-platform bots targeting Slack, Teams, or both.

## rules

1. Slack's App Home is a dedicated per-user tab in the Slack app sidebar, rendered by the bot via `views.publish`. Teams has no direct equivalent of a bot-rendered home tab. The closest alternatives are: (a) a personal bot conversation with a welcome Adaptive Card, (b) a static personal tab (web page in iframe), or (c) a bot-powered tab using `tab.fetch`/`tab.submit` handlers.
2. Slack `app.event(AppHomeOpenedEvent)` fires when a user navigates to the bot's Home tab. In Teams, the equivalent trigger for a personal bot conversation is `app.on('install.add')` (first install) or `app.on('conversationUpdate')` with `membersAdded` (bot added to 1:1 chat). There is no "user opened the chat" event — the bot sends its home card proactively at install time.
3. Slack `views.publish(user_id, view)` publishes a view to a specific user's Home tab. In Teams, send an Adaptive Card to the user's 1:1 conversation using `send()` in the install handler or via proactive messaging. The card serves as the "home" experience.
4. Slack's Home tab Block Kit JSON maps to an Adaptive Card. Convert using the block-kit-to-adaptive-cards mapping table. The card replaces the full home view — use `Container` and `ColumnSet` for layout density.
5. Slack Home tab dynamic updates (re-calling `views.publish` with new content) map to sending a new card or updating the existing card via `updateActivity` in Teams. Store the original activity ID to update it later.
6. Slack's `view.hash` for race condition protection (only update if the hash matches) has no Teams equivalent. Teams card updates via `updateActivity` always overwrite. If concurrent updates are a concern, implement application-level versioning in the card's `Action.Submit.data`.
7. For a richer home experience equivalent to Slack's App Home, consider a **static tab** — a web page declared in the Teams manifest (`staticTabs` array) that loads in an iframe. This supports full HTML/JS and is closer to Slack's App Home flexibility, but requires hosting a web page.
8. Teams SDK v2 supports `tab.fetch` and `tab.submit` handlers for Adaptive Card-based tabs (no iframe needed). The bot returns an Adaptive Card in response to `tab.fetch`, and handles form submissions via `tab.submit`. This is the closest behavioral match to Slack's `views.publish` pattern.
9. When migrating App Home with action buttons, remember that Slack Home tab actions fire `blockAction` events. In Teams, Adaptive Card buttons in 1:1 chat fire `adaptiveCards.actionSubmit` handlers. The routing mechanism changes but the concept is the same.
10. Slack App Home can show different content per user based on `event.user`. In Teams 1:1 chat, the bot always talks to one user, so personalization is inherent. For tab-based approaches, use `tab.fetch` which receives user context in the activity.
11. **Reverse direction (Teams → Slack):** For Teams → Slack, map `tab.fetch` to `app_home_opened` event with `views.publish` for dynamic content. The Adaptive Card tab content maps to Block Kit views. `tab.submit` actions map to `view_submission` or `block_actions` events. The `install.add` welcome card maps to a `views.publish` call triggered by `app_home_opened`.

## patterns

### Option A: Welcome card on install (simplest)

**Slack (before):**

```kotlin
app.event(AppHomeOpenedEvent::class.java) { e, ctx ->
    val res = ctx.client().viewsPublish {
        it.userId(e.event.user)
            .viewAsString(homeViewJson)
            .hash(e.event.view?.hash)
    }
    ctx.ack()
}
```

**Teams (after):**

```typescript
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common';

const app = new App({
  logger: new ConsoleLogger('home-bot'),
});

// Send a "home" card when the bot is installed (replaces AppHomeOpenedEvent)
app.on('install.add', async ({ send }) => {
  await send({
    type: 'message',
    attachments: [{
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: {
        type: 'AdaptiveCard',
        version: '1.5',
        body: [
          {
            type: 'TextBlock',
            text: 'Welcome to the App!',
            size: 'Large',
            weight: 'Bolder',
          },
          {
            type: 'TextBlock',
            text: `Last updated: ${new Date().toISOString()}`,
            isSubtle: true,
            wrap: true,
          },
        ],
        actions: [
          {
            type: 'Action.Submit',
            title: 'Action A',
            data: { verb: 'actionA' },
          },
          {
            type: 'Action.Submit',
            title: 'Action B',
            data: { verb: 'actionB' },
          },
        ],
      },
    }],
  });
});

// Handle button clicks on the home card
app.on('adaptiveCards.actionSubmit' as any, async ({ activity, send }) => {
  const verb = activity.value?.verb;
  if (verb === 'actionA') {
    await send('You clicked Action A!');
  } else if (verb === 'actionB') {
    await send('You clicked Action B!');
  }
});

app.start(3978);
```

### Option B: Adaptive Card tab (closest to App Home)

```typescript
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common';

const app = new App({
  logger: new ConsoleLogger('tab-bot'),
});

// tab.fetch replaces AppHomeOpenedEvent — fires when user opens the tab
app.on('tab.fetch' as any, async ({ activity }) => {
  const userId = activity.from?.id;
  return {
    status: 200,
    body: {
      tab: {
        type: 'continue',
        value: {
          cards: [{
            card: {
              contentType: 'application/vnd.microsoft.card.adaptive',
              content: {
                type: 'AdaptiveCard',
                version: '1.5',
                body: [
                  {
                    type: 'TextBlock',
                    text: 'Home',
                    size: 'Large',
                    weight: 'Bolder',
                  },
                  {
                    type: 'TextBlock',
                    text: `Hello, user ${userId}! Updated: ${new Date().toISOString()}`,
                    wrap: true,
                  },
                  {
                    type: 'ActionSet',
                    actions: [
                      {
                        type: 'Action.Submit',
                        title: 'Refresh',
                        data: { verb: 'refresh' },
                      },
                    ],
                  },
                ],
              },
            },
          }],
        },
      },
    },
  };
});

// tab.submit handles actions within the tab
app.on('tab.submit' as any, async ({ activity }) => {
  const verb = activity.value?.data?.verb;
  if (verb === 'refresh') {
    // Return updated tab content
    return {
      status: 200,
      body: {
        tab: {
          type: 'continue',
          value: {
            cards: [{
              card: {
                contentType: 'application/vnd.microsoft.card.adaptive',
                content: {
                  type: 'AdaptiveCard',
                  version: '1.5',
                  body: [{
                    type: 'TextBlock',
                    text: `Refreshed at ${new Date().toISOString()}`,
                  }],
                },
              },
            }],
          },
        },
      },
    };
  }
  return { status: 200, body: {} };
});

app.start(3978);
```

### Option C: Static tab with hosted web page (most flexible)

**Manifest `staticTabs` entry:**

```json
{
  "staticTabs": [
    {
      "entityId": "homeTab",
      "name": "Home",
      "contentUrl": "https://your-app.azurewebsites.net/tab/home",
      "scopes": ["personal"]
    }
  ],
  "validDomains": [
    "your-app.azurewebsites.net"
  ]
}
```

**Express route serving the tab page:**

```typescript
import express from 'express';
import path from 'path';

const webApp = express();

// Serve static assets
webApp.use('/tab/assets', express.static(path.join(__dirname, 'public')));

// Tab page route — returns HTML that initializes the Teams JS SDK
webApp.get('/tab/home', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Home</title>
  <script src="https://res.cdn.office.net/teams-js/2.24.0/js/MicrosoftTeams.min.js"></script>
  <style>
    body { font-family: Segoe UI, sans-serif; margin: 20px; }
    .card { background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 8px 0; }
  </style>
</head>
<body>
  <div id="app">Loading...</div>
  <script>
    // Teams JS SDK initialization is REQUIRED for tabs
    microsoftTeams.app.initialize().then(() => {
      return microsoftTeams.app.getContext();
    }).then((context) => {
      const userId = context.user?.id;
      const userName = context.user?.displayName ?? 'User';
      document.getElementById('app').innerHTML =
        '<h1>Welcome, ' + userName + '</h1>' +
        '<div class="card"><h3>Quick Actions</h3>' +
        '<button onclick="doAction(\\'refresh\\')">Refresh Data</button> ' +
        '<button onclick="doAction(\\'settings\\')">Settings</button></div>';
    });

    function doAction(verb) {
      // Use Teams JS SDK to communicate or fetch data
      fetch('/tab/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verb, timestamp: Date.now() }),
      }).then(r => r.json()).then(data => {
        console.log('Action result:', data);
      });
    }
  </script>
</body>
</html>`);
});

// API endpoint for tab actions
webApp.post('/tab/api/action', express.json(), (req, res) => {
  const { verb } = req.body;
  res.json({ status: 'ok', verb, processedAt: new Date().toISOString() });
});

webApp.listen(3000, () => console.log('Tab server on :3000'));
```

### Bridging decision table

| Slack App Home Feature | Option A: 1:1 Welcome Card | Option B: Adaptive Card Tab | Option C: Static Tab (iframe) |
|---|---|---|---|
| Trigger on open | `install.add` (once) | `tab.fetch` (every open) | Page load |
| Dynamic content | Proactive message update | Return new card on each fetch | Full web app |
| User actions | `actionSubmit` handlers | `tab.submit` handlers | Web forms/JS |
| Complexity | Low | Medium | High |
| Manifest changes | None | `staticTabs` with `contentBotId` | `staticTabs` with `contentUrl` |
| Best for | Simple welcome/info | Dashboard-like home tabs | Rich interactive UIs |

## pitfalls

- **No "opened" event in 1:1 chat**: Slack fires `AppHomeOpenedEvent` every time the user navigates to the Home tab. Teams has no equivalent for 1:1 bot chat. The bot is notified when installed, not when the user opens the chat. Use `tab.fetch` (Option B) if you need an on-open trigger.
- **views.publish is proactive**: Slack's `views.publish` can be called anytime to update the Home tab for any user. In Teams, updating a 1:1 message requires a stored conversation reference and the original activity ID. Set up proactive messaging infrastructure if you need background updates.
- **Race condition protection gone**: Slack's `view.hash` prevents concurrent updates from clobbering each other. Teams has no equivalent. If multiple processes might update the same card, implement optimistic locking in your application layer.
- **Block Kit → Adaptive Card**: The home view's Block Kit JSON must be converted to an Adaptive Card. The Home tab often uses `actions` blocks with buttons — these become `Action.Submit` buttons in the Adaptive Card. See `ui-block-kit-adaptive-cards-ts.md` for the full mapping.
- **Manifest required for tabs**: Options B and C require a `staticTabs` entry in the Teams manifest. Option A (1:1 chat) does not require manifest changes beyond the base bot registration.
- **Tab card size limits**: Adaptive Card tabs are subject to the same 28 KB card size limit. If the Slack Home tab rendered long lists, paginate or load data on demand.
- **Static tab requires a hosted web page**: Option C (static tab) requires deploying and hosting a web page accessible via HTTPS. This is a separate hosting concern from the bot itself. Use the same Azure App Service or add a route to your existing Express server.
- **`validDomains` must include the tab host**: If the `contentUrl` domain is not listed in the manifest's `validDomains` array, Teams will refuse to load the tab with a blank iframe. This is the most common static tab deployment failure.
- **Teams JS SDK initialization is mandatory**: Every tab page must call `microsoftTeams.app.initialize()` before accessing any Teams context. Without it, the tab loads but `getContext()` returns nothing and deep links fail. The SDK script must be loaded from the official CDN or npm package.

## references

- https://api.slack.com/surfaces/app-home — Slack App Home documentation
- https://api.slack.com/events/app_home_opened — AppHomeOpenedEvent reference
- https://api.slack.com/methods/views.publish — views.publish API
- https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/what-are-tabs — Teams tabs overview
- https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/create-personal-tab — Personal tabs
- https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages — Proactive messaging
- https://github.com/microsoft/teams.ts — Teams SDK v2

## instructions

Use this expert when adding cross-platform support in either direction for Slack App Home or Teams personal tab / bot welcome card. It covers three bridging paths: (A) a welcome Adaptive Card in 1:1 bot chat (simplest), (B) an Adaptive Card-based tab using `tab.fetch`/`tab.submit` (closest to App Home behavior), and (C) a static web tab in an iframe (most flexible). For Teams → Slack, map `tab.fetch` to `app_home_opened` event with `views.publish` for dynamic content. The decision table helps choose the right approach based on requirements. Pair with `ui-block-kit-adaptive-cards-ts.md` for converting between Block Kit and Adaptive Cards, `../teams/ui.adaptive-cards-ts.md` for card construction, and `../teams/runtime.proactive-messaging-ts.md` for background card updates.

## research

Deep Research prompt:

"Write a micro expert on bridging Slack App Home (AppHomeOpenedEvent, views.publish, dynamic home tab with Block Kit) and Microsoft Teams personal tab / bot welcome card in either direction. Cover three approaches: 1:1 bot welcome card, Adaptive Card-based tabs (tab.fetch/tab.submit), and static tabs (iframe). Include reverse-direction notes for Teams → Slack mapping, a decision matrix, side-by-side code examples, and pitfalls around proactive messaging, race conditions, and manifest configuration."
