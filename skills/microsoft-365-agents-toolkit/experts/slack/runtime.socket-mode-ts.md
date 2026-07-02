# runtime.socket-mode-ts

## purpose

Socket Mode setup, connection lifecycle, and production patterns for Slack Bolt TypeScript apps using `@slack/socket-mode`.

## rules

1. Enable Socket Mode by setting `socketMode: true` and providing `appToken` in the `App` constructor. The app token must be an **app-level token** (prefix `xapp-`) with the `connections:write` scope, not a bot token. [api.slack.com/apis/connections/socket](https://api.slack.com/apis/connections/socket)
2. Socket Mode uses WebSocket connections instead of HTTP endpoints. No public URL, no `signingSecret`, and no request signature verification are needed. This makes it ideal for local development and firewall-restricted environments. [slack.dev/bolt-js/concepts/socket-mode](https://slack.dev/bolt-js/concepts/socket-mode)
3. Install `@slack/socket-mode` as a dependency alongside `@slack/bolt`. Bolt's `SocketModeReceiver` wraps the `SocketModeClient` from this package. [github.com/slackapi/node-slack-sdk](https://github.com/slackapi/node-slack-sdk)
4. Call `await app.start()` to open the WebSocket connection. Unlike HTTP mode, `start()` returns an `AppsConnectionsOpenResponse` object, not an HTTP server. [slack.dev/bolt-js/concepts/socket-mode](https://slack.dev/bolt-js/concepts/socket-mode)
5. Auto-reconnect is enabled by default. The `SocketModeClient` handles connection drops, ping/pong heartbeats, and reconnection automatically. Override with `autoReconnectEnabled: false` only for testing. [github.com/slackapi/node-slack-sdk/tree/main/packages/socket-mode](https://github.com/slackapi/node-slack-sdk/tree/main/packages/socket-mode)
6. To add OAuth install routes or custom HTTP endpoints alongside Socket Mode, pass `customRoutes` to the `SocketModeReceiver`. This spins up an HTTP server on port 3000 (default) in addition to the WebSocket connection. [slack.dev/bolt-js/concepts/custom-routes](https://slack.dev/bolt-js/concepts/custom-routes)
7. For multi-workspace apps using Socket Mode with OAuth, provide `clientId`, `clientSecret`, `stateSecret`, and `installationStore` in the receiver options. The receiver creates an HTTP server for OAuth flows while using WebSocket for events. [slack.dev/bolt-js/concepts/authenticating-oauth](https://slack.dev/bolt-js/concepts/authenticating-oauth)
8. Use `processEventErrorHandler` on the receiver to control retry behavior. Return `true` to acknowledge the event (stops Slack retries). Return `false` to let Slack retry. `AuthorizationError` returns `true` by default (retrying won't fix bad tokens). [bolt-js source: SocketModeReceiver.ts](https://github.com/slackapi/bolt-js/blob/main/src/receivers/SocketModeReceiver.ts)
9. Access the underlying `SocketModeClient` via `receiver.client` to listen for low-level events like `connected`, `connecting`, `disconnected`, and `unable_to_socket_mode_start`. [github.com/slackapi/node-slack-sdk/tree/main/packages/socket-mode](https://github.com/slackapi/node-slack-sdk/tree/main/packages/socket-mode)
10. Generate the app-level token in the Slack app dashboard under **Settings → Basic Information → App-Level Tokens**. Create a token with the `connections:write` scope. Store it as `SLACK_APP_TOKEN` in your environment. [api.slack.com/apis/connections/socket#token](https://api.slack.com/apis/connections/socket#token)
11. Socket Mode supports all Bolt listener types — `app.message()`, `app.command()`, `app.action()`, `app.shortcut()`, `app.view()`, `app.event()`, and `app.options()` — with no code changes versus HTTP mode. The transport is transparent to handlers. [slack.dev/bolt-js/concepts/socket-mode](https://slack.dev/bolt-js/concepts/socket-mode)
12. Do not set `signingSecret` when using Socket Mode with `socketMode: true`. Bolt will throw if both are set with conflicting receiver configurations. If you need to switch between Socket Mode (dev) and HTTP (prod), use environment variables to toggle the `App` constructor options. [bolt-js source: App.ts](https://github.com/slackapi/bolt-js/blob/main/src/App.ts)

## patterns

### Minimal Socket Mode setup

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  appToken: process.env.SLACK_APP_TOKEN!,
  socketMode: true,
});

app.message("hello", async ({ message, say }) => {
  await say(`Hey there <@${message.user}>!`);
});

(async () => {
  await app.start();
  console.log("⚡️ Bolt app is running in Socket Mode");
})();
```

### Environment-based transport switching (dev vs prod)

```typescript
import { App } from "@slack/bolt";

const useSocketMode = process.env.SOCKET_MODE === "true";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  // Socket Mode options — only when enabled
  ...(useSocketMode && {
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN!,
  }),
  // HTTP options — only when Socket Mode is disabled
  ...(!useSocketMode && {
    signingSecret: process.env.SLACK_SIGNING_SECRET!,
  }),
});

(async () => {
  const port = useSocketMode ? undefined : Number(process.env.PORT || 3000);
  await app.start(port!);
  console.log(
    `⚡️ Bolt app running in ${useSocketMode ? "Socket" : "HTTP"} mode`
  );
})();
```

### Socket Mode with OAuth and custom routes

```typescript
import { App } from "@slack/bolt";
import { FileInstallationStore } from "@slack/oauth";

const app = new App({
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN!,
  clientId: process.env.SLACK_CLIENT_ID!,
  clientSecret: process.env.SLACK_CLIENT_SECRET!,
  stateSecret: process.env.SLACK_STATE_SECRET!,
  installationStore: new FileInstallationStore(),
  scopes: ["chat:write", "commands", "app_mentions:read"],
  customRoutes: [
    {
      path: "/health",
      method: "GET",
      handler: (_req, res) => {
        res.writeHead(200);
        res.end("OK");
      },
    },
  ],
});

(async () => {
  await app.start(3000);
  // WebSocket for events + HTTP on :3000 for OAuth and /health
  console.log("⚡️ App running: Socket Mode + OAuth on port 3000");
})();
```

### Monitoring connection state

```typescript
import { App, SocketModeReceiver } from "@slack/bolt";

const receiver = new SocketModeReceiver({
  appToken: process.env.SLACK_APP_TOKEN!,
  clientPingTimeout: 30_000,
  serverPingTimeout: 30_000,
  pingPongLoggingEnabled: true,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  receiver,
});

// Access the underlying SocketModeClient for lifecycle events
receiver.client.on("connected", () => {
  console.log("Socket Mode connected");
});

receiver.client.on("disconnected", () => {
  console.warn("Socket Mode disconnected — auto-reconnect will retry");
});

receiver.client.on("unable_to_socket_mode_start", (error) => {
  console.error("Socket Mode failed to start:", error);
});

(async () => {
  await app.start();
})();
```

## pitfalls

- **Using `signingSecret` with Socket Mode**: Setting both `socketMode: true` and `signingSecret` creates conflicting receiver configurations. Socket Mode does not use HTTP request verification. Remove `signingSecret` when using Socket Mode.
- **Wrong token type for `appToken`**: The `appToken` must be an **app-level token** (`xapp-` prefix) with `connections:write` scope, not a bot token (`xoxb-`) or user token (`xoxp-`). Using the wrong token gives a cryptic connection error.
- **Assuming HTTP endpoints exist**: In pure Socket Mode (no `customRoutes`, no OAuth), there is no HTTP server. Health check endpoints, webhook receivers, and OAuth callback URLs will not work unless you explicitly configure `customRoutes` or OAuth options.
- **Port conflicts with OAuth**: When Socket Mode is used with OAuth, the receiver starts an HTTP server on port 3000 by default. If another service uses that port, pass a different port to `app.start(port)`.
- **Missing `@slack/socket-mode` dependency**: `@slack/bolt` does not bundle `@slack/socket-mode`. You must install it separately: `npm install @slack/socket-mode`. Bolt will throw at startup if the package is missing.

## references

- https://api.slack.com/apis/connections/socket
- https://slack.dev/bolt-js/concepts/socket-mode
- https://slack.dev/bolt-js/concepts/custom-routes
- https://github.com/slackapi/bolt-js/blob/main/src/receivers/SocketModeReceiver.ts
- https://github.com/slackapi/node-slack-sdk/tree/main/packages/socket-mode

## instructions

This expert covers Socket Mode transport for Slack Bolt TypeScript apps. Use it when: setting up local development without a public URL; configuring `socketMode: true` and `appToken`; switching between Socket Mode (dev) and HTTP (prod); adding OAuth or custom HTTP routes alongside Socket Mode; monitoring WebSocket connection lifecycle events; or troubleshooting Socket Mode connection issues.

Pair with: `runtime.bolt-foundations-ts.md` for App constructor basics. `bolt-oauth-distribution-ts.md` for multi-workspace OAuth configuration alongside Socket Mode.

## research

Deep Research prompt:

"Write a micro expert on Slack Bolt Socket Mode in TypeScript. Cover SocketModeReceiver configuration (appToken, socketMode flag, auto-reconnect, ping/pong), app-level token generation (connections:write scope, xapp- prefix), connection lifecycle events (connected, disconnected, unable_to_socket_mode_start), environment-based transport switching (Socket Mode for dev vs HTTP for prod), combining Socket Mode with OAuth install flows and custom HTTP routes, processEventErrorHandler for retry control, and common pitfalls (signingSecret conflicts, missing @slack/socket-mode package, wrong token type). Source from @slack/bolt SocketModeReceiver.ts, @slack/socket-mode SocketModeClient, and Slack API docs."
