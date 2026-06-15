# compat.botbuilder-interop-ts

## purpose

Backward compatibility with legacy BotBuilder/Bot Framework bots using `@microsoft/teams.botbuilder`, migration patterns, and interop decisions.

## rules

1. The `@microsoft/teams.botbuilder` package provides a backward-compatibility layer between legacy BotBuilder bots (using `TeamsActivityHandler` from `botbuilder`) and the Teams SDK v2 (`@microsoft/teams.apps`). Use it only when you have an existing BotBuilder codebase that cannot be fully rewritten immediately. [github.com/microsoft/teams.ts -- botbuilder](https://github.com/microsoft/teams.ts/tree/main/packages/botbuilder)
2. For new projects, always use `@microsoft/teams.apps` directly. The compat layer adds overhead and limits access to newer SDK v2 features (plugin system, streaming, DevTools, MCP, A2A). Only use `@microsoft/teams.botbuilder` for incremental migration of existing bots. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
3. Legacy BotBuilder bots use `TeamsActivityHandler` with method overrides (`onMessage()`, `onMembersAdded()`, `onTeamsChannelCreated()`, etc.) and the `TurnContext` object. Teams SDK v2 uses `App` with `app.on()` route handlers and a destructured activity context. The compat layer bridges these two models. [github.com/microsoft/teams.ts -- botbuilder](https://github.com/microsoft/teams.ts/tree/main/packages/botbuilder)
4. The migration path from BotBuilder to SDK v2 follows: (a) install `@microsoft/teams.botbuilder` alongside existing `botbuilder` packages, (b) wrap the existing handler with the compat layer, (c) incrementally move handlers from `TeamsActivityHandler` overrides to `app.on()` routes, (d) once all handlers are migrated, remove the compat layer and `botbuilder` dependencies entirely. [github.com/microsoft/teams.ts -- botbuilder](https://github.com/microsoft/teams.ts/tree/main/packages/botbuilder)
5. Key API differences between BotBuilder and SDK v2: BotBuilder uses `TurnContext.sendActivity()` while SDK v2 uses `ctx.send()` / `ctx.reply()`; BotBuilder uses `CardFactory.adaptiveCard()` while SDK v2 sends raw attachment objects; BotBuilder uses `ActivityHandler.run()` in an Express middleware while SDK v2 uses `app.start(port)`. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
6. BotBuilder's state management (`ConversationState`, `UserState`, `MemoryStorage`) does not carry over. SDK v2 uses `IStorage` from `@microsoft/teams.common` and `LocalMemory` from `@microsoft/teams.ai`. Migrate state stores as part of the transition. [github.com/microsoft/teams.ts -- common](https://github.com/microsoft/teams.ts/tree/main/packages/common)
7. BotBuilder's dialog system (`ComponentDialog`, `WaterfallDialog`) is not available in SDK v2. Replace with SDK v2 `dialog.open` / `dialog.submit` invoke routes and Adaptive Card-based task modules, or use AI-driven conversation flows with `ChatPrompt`. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
8. Authentication patterns differ: BotBuilder uses `OAuthPrompt` and `TokenResponseEventHandler`, while SDK v2 uses `oauth` in `AppOptions` with `ctx.isSignedIn`, `ctx.signin()`, and `ctx.userGraph`. Migrate OAuth configuration to the App constructor. [github.com/microsoft/teams.ts -- apps](https://github.com/microsoft/teams.ts/tree/main/packages/apps)
9. The `@examples/botbuilder` example in the Teams SDK v2 repository demonstrates the compat layer usage. Reference it for concrete interop patterns. [github.com/microsoft/teams.ts -- examples/botbuilder](https://github.com/microsoft/teams.ts/tree/main/examples/botbuilder)
10. Before starting migration, audit the existing bot's feature set: message handlers, card actions, dialogs, proactive messaging, authentication, and any Bot Framework middleware. Map each feature to its SDK v2 equivalent. Features without direct equivalents (BotBuilder dialogs, custom middleware adapters) require the most rework. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)

## interview

### Q1 — Migration Strategy
```
question: "Your project has an existing BotBuilder bot. Do you want to use the compatibility layer for incremental migration, or do a full rewrite to SDK v2?"
header: "Strategy"
options:
  - label: "Full rewrite (Recommended)"
    description: "Rewrite all handlers directly in Teams SDK v2. Cleaner result, full access to streaming/plugins/MCP/A2A. Best for bots with <15 routes or when starting fresh."
  - label: "Compat layer (incremental)"
    description: "Use @microsoft/teams.botbuilder to run old and new handlers side by side. Migrate one handler at a time. Best for large bots (15+ routes) or tight timelines."
  - label: "You Decide Everything"
    description: "Accept recommended defaults for all decisions and skip remaining questions."
multiSelect: false
```

### Q2 — Dialog Migration
```
question: "Does your existing bot use BotBuilder dialogs (WaterfallDialog, ComponentDialog)?"
header: "Dialogs"
options:
  - label: "No dialogs"
    description: "Bot uses simple message handlers only. No dialog migration needed."
  - label: "Yes — replace with Adaptive Cards (Recommended)"
    description: "Replace dialog flows with Adaptive Card forms + dialog.open/submit routes. Modern Teams pattern."
  - label: "Yes — replace with AI conversation"
    description: "Replace dialog flows with ChatPrompt-driven AI conversation. Best for open-ended inputs."
multiSelect: false
```

### Q3 — State Migration
```
question: "How is your existing bot managing state (ConversationState, UserState)?"
header: "State"
options:
  - label: "MemoryStorage (dev only)"
    description: "In-memory storage — no migration needed, just switch to SDK v2 IStorage."
  - label: "Azure Blob/Cosmos (Recommended)"
    description: "Persistent storage — migrate connection config to SDK v2 IStorage adapter. Data format is compatible."
  - label: "Custom storage provider"
    description: "Custom IStorage implementation — will need to be adapted to SDK v2's IStorage interface."
multiSelect: false
```

### defaults table

| Question | Default |
|---|---|
| Q1 | Full rewrite |
| Q2 | No dialogs |
| Q3 | MemoryStorage |

## patterns

### BotBuilder handler vs SDK v2 equivalent

```typescript
// --- BEFORE: Legacy BotBuilder pattern ---
// Uses TeamsActivityHandler, TurnContext, and method overrides

import { TeamsActivityHandler, TurnContext, MessageFactory } from 'botbuilder';

class LegacyBot extends TeamsActivityHandler {
  async onMessage(context: TurnContext): Promise<void> {
    const text = context.activity.text?.trim();
    if (text === '/help') {
      await context.sendActivity(MessageFactory.text('Here is how I can help...'));
    } else {
      await context.sendActivity(MessageFactory.text(`You said: "${text}"`));
    }
  }

  async onMembersAdded(context: TurnContext): Promise<void> {
    for (const member of context.activity.membersAdded || []) {
      if (member.id !== context.activity.recipient.id) {
        await context.sendActivity('Welcome!');
      }
    }
  }
}

// --- AFTER: Teams SDK v2 pattern ---
// Uses App, app.on(), app.message(), destructured context

import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';

const app = new App({
  logger: new ConsoleLogger('migrated-bot', { level: 'debug' }),
  plugins: [new DevtoolsPlugin()],
});

app.message('/help', async ({ send }) => {
  await send('Here is how I can help...');
});

app.on('message', async ({ send, activity }) => {
  await send(`You said: "${activity.text}"`);
});

app.on('install.add', async ({ send }) => {
  await send('Welcome!');
});

app.start(3978);
```

### Migration decision checklist

```typescript
// When to use the compat layer (@microsoft/teams.botbuilder):
//
// 1. Existing BotBuilder bot with many handlers that cannot be rewritten at once
// 2. Dependencies on BotBuilder-specific libraries or middleware
// 3. Need to run old and new handlers side by side during transition
// 4. Legacy dialog flows (WaterfallDialog) that need time to redesign
//
// When to do a full rewrite (skip the compat layer):
//
// 1. Small bot with few handlers (< 10 routes)
// 2. Starting a new project (always use @microsoft/teams.apps directly)
// 3. Want access to SDK v2-only features:
//    - DevtoolsPlugin for debugging
//    - Plugin system (MCP, A2A, custom plugins)
//    - Streaming responses with stream.emit()
//    - Built-in OAuth with ctx.isSignedIn / ctx.signin()
//    - app.send() for proactive messaging
//    - ChatPrompt for AI integration
// 4. The existing bot has no complex dialog flows
//
// Feature mapping:
//   BotBuilder TeamsActivityHandler.onMessage()     -> app.on('message')
//   BotBuilder TeamsActivityHandler.onMembersAdded() -> app.on('install.add')
//   BotBuilder TurnContext.sendActivity()            -> ctx.send() / ctx.reply()
//   BotBuilder CardFactory.adaptiveCard()            -> raw attachment object
//   BotBuilder OAuthPrompt                           -> oauth in AppOptions + ctx.signin()
//   BotBuilder ConversationState / UserState          -> IStorage + LocalStorage
//   BotBuilder WaterfallDialog                       -> dialog.open/submit + Adaptive Cards
//   BotBuilder ActivityHandler.run() + Express        -> app.start(port)
//   BotBuilder proactiveMessage via ConversationRef   -> app.send(conversationId, message)
```

### Incremental migration with compat layer

```typescript
// Step 1: Install the compat package alongside existing botbuilder
//   npm install @microsoft/teams.botbuilder @microsoft/teams.apps

// Step 2: Wrap existing handler with compat layer
//   (Specific API depends on @microsoft/teams.botbuilder version --
//    refer to the package README for exact usage)

// Step 3: Incrementally move handlers to SDK v2 patterns
//   Move one handler at a time from the legacy class to app.on() / app.message()
//   Test each migration step independently

// Step 4: Remove compat layer when all handlers are migrated
//   Remove @microsoft/teams.botbuilder and botbuilder from package.json
//   Your final code should look like a standard SDK v2 app:

import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';

const app = new App({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,
  logger: new ConsoleLogger('fully-migrated-bot', { level: 'debug' }),
  plugins: [new DevtoolsPlugin()],
});

// All handlers now use SDK v2 patterns
app.on('message', async ({ send, activity }) => {
  await send(`Echo: ${activity.text}`);
});

app.on('install.add', async ({ send }) => {
  await send('Welcome! Bot has been installed.');
});

app.on('card.action', async ({ activity, send }) => {
  const data = activity.value;
  await send(`Action received: ${JSON.stringify(data)}`);
});

app.start(process.env.PORT || 3978).catch(console.error);
```

## pitfalls

- **Using the compat layer for new projects**: The compat layer exists solely for migration. New projects should always use `@microsoft/teams.apps` directly for full SDK v2 feature access.
- **Trying to use BotBuilder dialogs in SDK v2**: `WaterfallDialog`, `ComponentDialog`, and the BotBuilder dialog stack do not exist in SDK v2. Replace them with `dialog.open`/`dialog.submit` invoke routes and Adaptive Card forms.
- **Mixing `TurnContext` and SDK v2 context**: During migration, do not pass BotBuilder's `TurnContext` into SDK v2 handlers or vice versa. They are incompatible objects with different method signatures.
- **Forgetting to migrate state stores**: BotBuilder's `ConversationState`/`UserState` backed by `MemoryStorage` does not work in SDK v2. Migrate to `IStorage`/`LocalStorage` from `@microsoft/teams.common`.
- **Keeping `botbuilder` dependency after full migration**: Once all handlers are moved to SDK v2 patterns, remove `botbuilder`, `botbuilder-dialogs`, and `@microsoft/teams.botbuilder` from `package.json` to reduce bundle size.
- **Expecting identical behavior**: SDK v2 handles some activities differently than BotBuilder (e.g., `@mention` text stripping, conversation update events). Test each migrated handler against real Teams clients.
- **Not referencing the botbuilder example**: The `@examples/botbuilder` directory in the teams.ts repository contains a working compat layer demo. Always check it before starting migration.

## references

- [Teams SDK v2 -- @microsoft/teams.botbuilder](https://github.com/microsoft/teams.ts/tree/main/packages/botbuilder)
- [Teams SDK v2 -- botbuilder example](https://github.com/microsoft/teams.ts/tree/main/examples/botbuilder)
- [Teams SDK v2 GitHub repository](https://github.com/microsoft/teams.ts)
- [Bot Framework SDK for JavaScript](https://github.com/microsoft/botframework-sdk)
- [BotBuilder documentation](https://learn.microsoft.com/en-us/azure/bot-service/bot-builder-basics)
- [Teams: Migrate from BotBuilder](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/what-are-bots)

## instructions

This expert covers backward compatibility and migration from legacy BotBuilder/Bot Framework bots to Teams SDK v2 using `@microsoft/teams.botbuilder`. Use it when you need to:

- Decide whether to use the compat layer or do a full rewrite
- Map BotBuilder concepts to SDK v2 equivalents (TeamsActivityHandler -> App, TurnContext -> ctx, OAuthPrompt -> oauth config, WaterfallDialog -> dialog.open/submit)
- Plan an incremental migration strategy (install compat, migrate handlers one by one, remove compat)
- Understand which BotBuilder features have no direct SDK v2 equivalent
- Migrate state management from ConversationState/UserState to IStorage
- Migrate authentication from OAuthPrompt to App oauth config

Pair with `runtime.app-init-ts.md` for SDK v2 App initialization and `runtime.routing-handlers-ts.md` for the SDK v2 route handler equivalents of BotBuilder method overrides. Pair with `runtime.app-init-ts.md` for the target SDK v2 App patterns, and `runtime.routing-handlers-ts.md` for mapping TeamsActivityHandler methods to SDK v2 routes.

## research

Deep Research prompt:

"Write a micro expert on interoperability and migration between legacy BotBuilder (botbuilder npm package, TeamsActivityHandler) and Teams SDK v2 (@microsoft/teams.apps) in TypeScript. Cover the @microsoft/teams.botbuilder compat layer, when to use it vs full rewrite, feature mapping (onMessage -> app.on('message'), onMembersAdded -> install.add, TurnContext.sendActivity -> ctx.send, CardFactory -> raw attachments, OAuthPrompt -> oauth config, ConversationState -> IStorage, WaterfallDialog -> dialog.open/submit), incremental migration steps, the @examples/botbuilder reference, and common pitfalls. Include a side-by-side BotBuilder vs SDK v2 code comparison and a migration decision checklist."
