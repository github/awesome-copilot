# runtime.app-init-ts

## purpose

Teams SDK v2 App initialization, constructor options, plugins, logger setup, storage config, OAuth, activity context, and startup lifecycle.

## rules

1. Always import `App` from `@microsoft/teams.apps`, `ConsoleLogger` from `@microsoft/teams.common`, and `DevtoolsPlugin` from `@microsoft/teams.dev` as the minimum bootstrap triple. These three packages are always present in `dependencies`. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
2. Pass `clientId`, `clientSecret`, and `tenantId` to the `App` constructor when the bot requires Azure Bot registration credentials. All three come from environment variables (`CLIENT_ID`, `CLIENT_SECRET`, `TENANT_ID`). Omit them only for local-only development with `skipAuth: true`. [learn.microsoft.com -- Bot registration](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/authentication/bot-sso-register-aad)
3. Configure logging with `new ConsoleLogger(name, { level })` where `level` is one of `'error' | 'warn' | 'info' | 'debug' | 'trace'`. Use `pattern: '-azure/msal-node'` to suppress noisy child loggers. Child loggers inherit settings via `logger.child('sub-name')` and prefix output as `[parent/child]`. [github.com/microsoft/teams.ts -- common](https://github.com/microsoft/teams.ts/tree/main/packages/common)
4. Register plugins via the `plugins` array in the constructor or dynamically with `app.plugin(instance)`. Every development project should include `DevtoolsPlugin`. Plugin lifecycle follows: register -> `onInit()` -> `onStart({ port })` -> activity loop (`onActivity()` / `onActivitySent()`) -> `onStop()`. [github.com/microsoft/teams.ts -- dev](https://github.com/microsoft/teams.ts/tree/main/packages/dev)
5. Configure OAuth by adding `oauth: { defaultConnectionName: 'graph' }` to `AppOptions`. This enables `ctx.isSignedIn`, `ctx.signin()`, `ctx.signout()`, and `ctx.userGraph` on every handler context. Requires `clientId`, `clientSecret`, and `tenantId` to also be set. [github.com/microsoft/teams.ts -- apps](https://github.com/microsoft/teams.ts/tree/main/packages/apps)
6. Storage defaults to in-memory. Pass a custom `IStorage` implementation to the `storage` option for persistence across restarts. Use `LocalStorage` from `@microsoft/teams.common` for development with optional LRU eviction via `{ max: N }`. [github.com/microsoft/teams.ts -- common](https://github.com/microsoft/teams.ts/tree/main/packages/common)
7. Call `app.start(port)` (default `3978`) as the final step. It returns a `Promise` -- always attach `.catch(console.error)` or use `await`. The bot endpoint is `http://localhost:{port}/api/messages` and DevTools UI runs on `{port + 1}`. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
8. Set `skipAuth: true` only during local development without Azure credentials. This disables JWT validation on inbound activities. Never use this in production. [github.com/microsoft/teams.ts -- apps](https://github.com/microsoft/teams.ts/tree/main/packages/apps)
9. The full `AppOptions` reference includes: `clientId`, `clientSecret`, `tenantId`, `token` (custom token factory), `managedIdentityClientId` (`'system'` or string), `client` (custom HTTP client), `logger` (`ILogger`), `storage` (`IStorage`), `plugins` (`IPlugin[]`), `oauth` (`OAuthSettings`), `manifest` (`Partial<Manifest>`), `skipAuth` (boolean), and `activity.mentions.stripText` (boolean). [github.com/microsoft/teams.ts -- apps](https://github.com/microsoft/teams.ts/tree/main/packages/apps)
10. Use `app.event('start', ...)` for post-listen setup, `app.event('error', ...)` for global error handling, `app.event('signin', ...)` for post-authentication logic, and `app.event('activity', ...)`/`app.event('activity.sent', ...)` for observing all inbound/outbound activities. These are lifecycle events, not activity route handlers. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)

## patterns

### Minimal App with DevTools and logger

```typescript
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';

const app = new App({
  logger: new ConsoleLogger('echo-bot', { level: 'debug' }),
  plugins: [new DevtoolsPlugin()],
});

app.on('message', async ({ reply, activity }) => {
  await reply({ type: 'typing' });
  await reply(`You said: "${activity.text}"`);
});

app.start(3978);
```

### Full production App with credentials, OAuth, and storage

```typescript
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger, LocalStorage } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';

interface AppState {
  conversationIds: string[];
}

const app = new App({
  // Azure Bot registration credentials
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,

  // Custom logger with noise filtering
  logger: new ConsoleLogger('prod-bot', {
    level: 'info',
    pattern: '-azure/msal-node',
  }),

  // Persistent storage (in-memory with LRU for dev)
  storage: new LocalStorage<AppState>({}, { max: 1000 }),

  // OAuth for Microsoft Graph
  oauth: { defaultConnectionName: 'graph' },

  // Plugins
  plugins: [new DevtoolsPlugin()],
});

// Lifecycle events
app.event('start', (logger) => {
  logger.info('Bot is running');
});

app.event('error', ({ error, log }) => {
  log.error('Unhandled error:', error);
});

app.event('signin', async ({ send, userGraph }) => {
  // Fired after successful OAuth sign-in
  await send('You are now signed in.');
});

app.event('activity', ({ activity }) => {
  // Fired for every inbound activity
});

app.event('activity.sent', ({ activity }) => {
  // Fired after every outbound activity
});

app.start(process.env.PORT || 3978).catch(console.error);
```

### Activity context usage in a handler

```typescript
app.on('message', async (ctx) => {
  // --- Properties ---
  ctx.appId;          // Bot app ID
  ctx.activity;       // The inbound Activity object
  ctx.ref;            // ConversationReference for proactive messaging
  ctx.log;            // Scoped logger
  ctx.api;            // Teams API client
  ctx.appGraph;       // Graph client (app credentials)
  ctx.userGraph;      // Graph client (user credentials, after signin)
  ctx.storage;        // Persistent storage
  ctx.stream;         // Streaming response helper
  ctx.isSignedIn;     // Whether user has authenticated
  ctx.userToken;      // User's OAuth access token
  ctx.connectionName; // OAuth connection name

  // --- Methods ---
  await ctx.send('Hello!');           // Send a new message
  await ctx.reply('Reply to this');   // Reply to the current message
  await ctx.signin();                 // Trigger OAuth sign-in flow
  await ctx.signout();                // Sign the user out
  ctx.next();                         // Pass to next middleware/handler
});
```

## pitfalls

- **Missing `.catch()` on `app.start()`**: The method returns a Promise. Unhandled rejections crash the process in Node 20+. Always add `.catch(console.error)` or wrap in an async IIFE with try/catch.
- **Using `skipAuth: true` in production**: This disables JWT validation entirely. Any HTTP client can send fake activities to your bot endpoint. Only use it for local DevTools testing.
- **Forgetting `DevtoolsPlugin` during development**: Without it, there is no DevTools UI at `localhost:3979/devtools` and no WebSocket-based activity inspection. Always include it in the `plugins` array for local dev.
- **Setting OAuth without credentials**: Adding `oauth: { defaultConnectionName: 'graph' }` without `clientId`/`clientSecret`/`tenantId` causes silent auth failures. All four options must be present together.
- **Calling `app.start()` before registering handlers**: Handlers registered after `start()` may miss early activities. Register all `app.on()`, `app.message()`, and `app.use()` calls before calling `app.start()`.
- **Logger level too verbose in production**: Using `'debug'` or `'trace'` floods logs with internal SDK chatter. Use `'info'` or `'warn'` for deployed bots.
- **Hardcoding the port**: Always read from `process.env.PORT` with a fallback (`process.env.PORT || 3978`). Azure App Service and container hosts set `PORT` dynamically.
- **Confusing `app.on()` with `app.event()`**: `app.on()` registers activity route handlers (message, card.action, etc.). `app.event()` registers app lifecycle hooks (start, error, signin). Mixing them up causes handlers that never fire.

## references

- [Teams SDK v2 GitHub repository](https://github.com/microsoft/teams.ts)
- [Teams SDK v2 -- @microsoft/teams.apps](https://github.com/microsoft/teams.ts/tree/main/packages/apps)
- [Teams SDK v2 -- @microsoft/teams.common](https://github.com/microsoft/teams.ts/tree/main/packages/common)
- [Teams SDK v2 -- @microsoft/teams.dev (DevtoolsPlugin)](https://github.com/microsoft/teams.ts/tree/main/packages/dev)
- [Azure Bot Service documentation](https://learn.microsoft.com/en-us/azure/bot-service/)
- [Teams platform: Build bots](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/what-are-bots)

## instructions

This expert covers the foundational `App` class from `@microsoft/teams.apps` -- the entry point for every Teams SDK v2 bot. Use it when you need to:

- Initialize a new `App` instance with the correct constructor options
- Configure credentials (`clientId`, `clientSecret`, `tenantId`) for Azure Bot registration
- Set up logging with `ConsoleLogger`, child loggers, and noise filtering
- Register plugins (especially `DevtoolsPlugin`) and understand plugin lifecycle
- Configure OAuth for Microsoft Graph access
- Set up storage backends for persistent state
- Understand the activity context object (`ctx`) and its full set of properties/methods
- Handle app lifecycle events (`start`, `error`, `activity`, `activity.sent`, `signin`)
- Start the server with `app.start()` and understand the default endpoints

Pair with `runtime.routing-handlers-ts.md` for route registration patterns and `project.scaffold-files-ts.md` for full project setup including package.json and tsconfig. Pair with `project.scaffold-files-ts.md` for package.json and project structure, and `dev.debug-test-ts.md` for local development setup.

## research

Deep Research prompt:

"Write a micro expert on Teams SDK v2 App initialization in TypeScript. Cover the App constructor from @microsoft/teams.apps, all AppOptions fields (clientId, clientSecret, tenantId, logger, storage, plugins, oauth, skipAuth, manifest, token, managedIdentityClientId, client, activity.mentions.stripText), ConsoleLogger configuration with levels and pattern filtering, DevtoolsPlugin setup and lifecycle hooks (onInit, onStart, onActivity, onActivitySent, onStop), activity context properties and methods (send, reply, signin, signout, next, stream, isSignedIn, appGraph, userGraph, ref, api, storage, log), app.start() lifecycle, and app.event() hooks (start, error, signin, activity, activity.sent). Include 2-3 initialization patterns from minimal to production-ready."
