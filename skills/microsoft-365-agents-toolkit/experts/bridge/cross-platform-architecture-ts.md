# cross-platform-architecture-ts

## purpose

Architecture patterns for hosting both a Slack bot (Bolt.js) and a Teams bot (Bot Framework / Teams SDK) in a single TypeScript server — shared Express instance, separate receiver pipelines, shared business logic layer, and deployment considerations.

## rules

1. **Use a single Express server as the HTTP foundation.** Both Slack (HTTP receiver) and Teams (webhook POST) can share one Express app on one port. Mount Slack routes at `/slack/events` and Teams routes at `/api/messages`.
2. **Keep bot SDKs in separate modules.** Initialize Bolt's `ExpressReceiver` and Teams' `CloudAdapter` independently. Neither should know about the other. Share only the business logic layer.
3. **Extract business logic into a platform-agnostic service layer.** Functions like `processUserMessage(text, userId, context)` should return platform-neutral results (text, structured data). Platform adapters convert to Block Kit or Adaptive Cards.
4. **Use Bolt's `ExpressReceiver` (not the default `HTTPReceiver`) for shared Express.** Create the Express app yourself, pass it to `ExpressReceiver` via the `app` option, and also mount Teams routes on the same instance.
5. **For Socket Mode Slack + HTTP Teams, run both receivers.** Start `SocketModeReceiver` for Slack (WebSocket, no HTTP needed) and Express for Teams webhook. This is simpler than sharing Express — Slack doesn't need an HTTP endpoint at all.
6. **Normalize user identity across platforms.** Map Slack user IDs (`U...`) and Teams AAD object IDs to a common identity. Store mappings in a shared database keyed by email or external ID.
7. **Normalize conversation context.** Create a `ConversationContext` type with `platform: "slack" | "teams"`, `channelId`, `threadId`, `userId`, and `replyFn`. Each platform adapter populates this from its native event.
8. **Handle media differences in the adapter layer.** Slack uses Block Kit (`mrkdwn`, `blocks[]`). Teams uses Adaptive Cards (JSON schema, `AdaptiveCard`). The service layer should return structured data that each adapter renders into the platform's format.
9. **Share environment config but separate credentials.** Use a single `.env` or config file with prefixed keys: `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `TEAMS_APP_ID`, `TEAMS_APP_PASSWORD`, `TEAMS_TENANT_ID`.
10. **Deploy as a single container or serverless function.** Both bots run in the same Node.js process. Use health checks for both: Slack via Socket Mode ping/pong, Teams via a health probe endpoint.

## patterns

### Shared Express with ExpressReceiver (Slack HTTP) + Teams webhook

```typescript
import express from "express";
import { App, ExpressReceiver } from "@slack/bolt";
import { CloudAdapter, ConfigurationServiceClientCredentialFactory, createBotFrameworkAuthenticationFromConfiguration } from "botbuilder";

// 1. Create shared Express app
const expressApp = express();

// 2. Initialize Slack with ExpressReceiver
const slackReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  app: expressApp,            // share the Express instance
  endpoints: "/slack/events",  // Slack events endpoint
});

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  receiver: slackReceiver,
});

// 3. Initialize Teams on the same Express app
const credFactory = new ConfigurationServiceClientCredentialFactory({
  MicrosoftAppId: process.env.TEAMS_APP_ID!,
  MicrosoftAppPassword: process.env.TEAMS_APP_PASSWORD!,
  MicrosoftAppTenantId: process.env.TEAMS_TENANT_ID!,
});
const auth = createBotFrameworkAuthenticationFromConfiguration(null, credFactory);
const adapter = new CloudAdapter(auth);

expressApp.post("/api/messages", async (req, res) => {
  await adapter.process(req, res, (context) => teamsBot.run(context));
});

// 4. Health check
expressApp.get("/health", (_req, res) => res.json({ slack: "ok", teams: "ok" }));

// 5. Start
expressApp.listen(3000, () => console.log("Dual bot running on :3000"));
```

### Socket Mode Slack + HTTP Teams (simpler)

```typescript
import { App } from "@slack/bolt";
import express from "express";

// Slack: Socket Mode (no HTTP needed)
const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  appToken: process.env.SLACK_APP_TOKEN!,
  socketMode: true,
});

// Teams: Express webhook
const expressApp = express();
// ... mount Teams adapter on expressApp ...

await slackApp.start();                    // WebSocket
expressApp.listen(3978, () => {});         // HTTP for Teams
```

### Platform-agnostic service layer

```typescript
// service/message-handler.ts — no platform imports
export interface BotResponse {
  text: string;
  structured?: {
    title: string;
    body: string;
    actions?: { label: string; id: string }[];
  };
}

export async function handleUserMessage(
  text: string,
  userId: string,
  platform: "slack" | "teams"
): Promise<BotResponse> {
  // Business logic, AI calls, database queries — platform-agnostic
  return {
    text: `You said: ${text}`,
    structured: { title: "Echo", body: text },
  };
}

// adapters/slack-adapter.ts
import { handleUserMessage } from "../service/message-handler.js";

slackApp.message(/.*/, async ({ message, say }) => {
  const response = await handleUserMessage(
    (message as any).text ?? "",
    (message as any).user ?? "",
    "slack"
  );
  await say(response.text); // or convert response.structured to Block Kit
});

// adapters/teams-adapter.ts
import { handleUserMessage } from "../service/message-handler.js";

class TeamsBot extends ActivityHandler {
  constructor() {
    super();
    this.onMessage(async (context, next) => {
      const response = await handleUserMessage(
        context.activity.text ?? "",
        context.activity.from?.id ?? "",
        "teams"
      );
      await context.sendActivity(response.text); // or convert to Adaptive Card
      await next();
    });
  }
}
```

## pitfalls

- **Express body parsing conflicts.** Slack needs raw body parsing for signature verification. Teams needs `express.json()`. Order middleware carefully — apply `express.json()` only to Teams routes, and let `ExpressReceiver` handle Slack routes' body parsing.
- **Port conflicts in development.** If Slack's `ExpressReceiver` and your Teams server both try to listen on the same port, one will fail. Share a single `listen()` call, or use Socket Mode for Slack.
- **Credential leakage between adapters.** Keep Slack and Teams clients in separate modules. A bug that passes the Slack token to a Teams API call (or vice versa) is hard to debug and a security risk.
- **Adaptive Cards and Block Kit are not interchangeable.** Don't try to build a "universal card format" — the data models are fundamentally different. Keep a thin adapter that transforms structured data to each format.
- **Tunneling for local development.** You need two tunnel endpoints (one for Slack, one for Teams) or route both through the same tunnel with path-based routing. ngrok or Cloudflare Tunnel work for both.

## references

- Bolt.js `ExpressReceiver`: https://slack.dev/bolt-js/concepts/custom-routes
- Bot Framework `CloudAdapter`: https://learn.microsoft.com/en-us/javascript/api/botbuilder/cloudadapter
- Express 5: https://expressjs.com/en/5x/api.html

## instructions

Use this expert when designing a server that hosts both Slack and Teams bots, or when deciding on a deployment architecture for multi-platform bot support. This is the foundational architecture expert for the slack-plus-teams project's core use case.

Pair with: `runtime.bolt-foundations-ts.md` (Slack setup), `../teams/runtime.app-init-ts.md` (Teams setup), `identity-oauth-bridge-ts.md` (cross-platform identity), `ui-block-kit-adaptive-cards-ts.md` (UI adapter patterns).

## research

Deep Research prompt:

"Document architecture patterns for hosting both a Slack Bolt.js bot and a Microsoft Teams Bot Framework bot in a single Node.js/TypeScript server. Cover: shared Express server with route separation, ExpressReceiver for Slack HTTP mode, Socket Mode for Slack + separate HTTP for Teams, CloudAdapter integration on shared Express, platform-agnostic service layer design, Block Kit vs Adaptive Card adapter pattern, identity normalization across platforms, credential separation, environment configuration, health monitoring for both platforms, deployment as single container, and body parsing middleware ordering for signature verification compatibility."
