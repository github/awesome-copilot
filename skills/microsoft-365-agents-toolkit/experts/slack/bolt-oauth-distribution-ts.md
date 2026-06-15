# bolt-oauth-distribution-ts

## purpose

OAuth and multi-workspace app distribution for Slack Bolt.js — `InstallProvider` configuration, `InstallationStore` interface, OAuth flow, `authorize` callback, scope management, state verification, and receiver OAuth route setup.

## rules

1. **Provide `clientId`, `clientSecret`, and `stateSecret` for OAuth apps.** These enable the built-in OAuth flow with install page and callback handling. The `stateSecret` must be at least 16 characters for CSRF protection. Without all three, Bolt uses single-workspace mode. [slack.dev/bolt-js/concepts/authenticating-oauth](https://slack.dev/bolt-js/concepts/authenticating-oauth)
2. **Implement `InstallationStore` for production.** The default `MemoryInstallationStore` loses data on restart. Implement `storeInstallation`, `fetchInstallation`, and `deleteInstallation` with database persistence. [slack.dev/bolt-js/concepts/authenticating-oauth](https://slack.dev/bolt-js/concepts/authenticating-oauth)
3. **Handle both team-level and enterprise-level installations.** Check `installation.isEnterpriseInstall`: if true, key by `enterprise.id`; if false, key by `team.id`. Enterprise Grid org-wide installs have `team` undefined. [slack.dev/bolt-js/concepts/authenticating-oauth](https://slack.dev/bolt-js/concepts/authenticating-oauth)
4. **`scopes` defines bot token permissions.** Pass an array of scope strings (e.g., `["chat:write", "commands", "channels:history"]`) at the App or receiver level. These determine what the bot token can do. [api.slack.com/scopes](https://api.slack.com/scopes)
5. **`installerOptions.userScopes` defines user token permissions.** User scopes grant permissions on behalf of the installing user. The resulting `installation.user.token` (xoxp-...) is separate from the bot token (xoxb-...). [api.slack.com/scopes](https://api.slack.com/scopes)
6. **`fetchInstallation` is called for every incoming event.** The built-in `authorize` function queries your `InstallationStore` for each event to resolve the bot token. Keep this lookup fast — use caching or an indexed database. [slack.dev/bolt-js/concepts/authorization](https://slack.dev/bolt-js/concepts/authorization)
7. **Use custom `authorize` for advanced token resolution.** Instead of `InstallationStore`, pass an `authorize` function that receives `{ teamId, enterpriseId, userId, isEnterpriseInstall }` and returns `{ botToken, botId, botUserId }`. [slack.dev/bolt-js/concepts/authorization](https://slack.dev/bolt-js/concepts/authorization)
8. **Don't mix `token` with OAuth.** Single-workspace apps use `token` directly. OAuth/multi-workspace apps use `clientId` + `clientSecret` + `installationStore`. Providing both causes undefined behavior. [slack.dev/bolt-js/concepts/authenticating-oauth](https://slack.dev/bolt-js/concepts/authenticating-oauth)
9. **OAuth routes are registered automatically.** `HTTPReceiver` and `ExpressReceiver` create `GET /slack/install` (Add to Slack page) and `GET /slack/oauth_redirect` (callback). Customize paths via `installerOptions.installPath` and `installerOptions.redirectUriPath`. [slack.dev/bolt-js/concepts/authenticating-oauth](https://slack.dev/bolt-js/concepts/authenticating-oauth)
10. **Handle `tokens_revoked` and `app_uninstalled` events.** Subscribe to these events and call `installationStore.deleteInstallation()` to clean up. Without this, revoked tokens cause auth errors on every event from that workspace. [api.slack.com/events/tokens_revoked](https://api.slack.com/events/tokens_revoked)

## patterns

### Multi-workspace OAuth app with database-backed store

```typescript
import { App, type Installation, type InstallationQuery } from "@slack/bolt";

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  clientId: process.env.SLACK_CLIENT_ID!,
  clientSecret: process.env.SLACK_CLIENT_SECRET!,
  stateSecret: process.env.SLACK_STATE_SECRET!,
  scopes: ["chat:write", "commands", "channels:history", "app_mentions:read"],
  installationStore: {
    storeInstallation: async (installation: Installation) => {
      if (installation.isEnterpriseInstall && installation.enterprise) {
        await db.set(`install:${installation.enterprise.id}`, installation);
        return;
      }
      if (installation.team) {
        await db.set(`install:${installation.team.id}`, installation);
        return;
      }
      throw new Error("Failed saving installation: no team or enterprise ID");
    },

    fetchInstallation: async (query: InstallationQuery<boolean>) => {
      if (query.isEnterpriseInstall && query.enterpriseId) {
        return await db.get(`install:${query.enterpriseId}`);
      }
      if (query.teamId) {
        return await db.get(`install:${query.teamId}`);
      }
      throw new Error("Failed fetching installation");
    },

    deleteInstallation: async (query: InstallationQuery<boolean>) => {
      if (query.isEnterpriseInstall && query.enterpriseId) {
        await db.delete(`install:${query.enterpriseId}`);
        return;
      }
      if (query.teamId) {
        await db.delete(`install:${query.teamId}`);
        return;
      }
      throw new Error("Failed deleting installation");
    },
  },
});

// Clean up on uninstall
app.event("app_uninstalled", async ({ context, body }) => {
  const teamId = body.team_id;
  const enterpriseId = body.enterprise_id;
  console.log(`App uninstalled from team ${teamId}`);
  // deleteInstallation is called automatically by the built-in authorize
});

// Clean up on token revocation
app.event("tokens_revoked", async ({ event, context }) => {
  console.log(`Tokens revoked: ${JSON.stringify(event.tokens)}`);
});

(async () => {
  await app.start(3000);
  console.log("OAuth app running — visit http://localhost:3000/slack/install");
})();
```

### Custom authorize function (alternative to InstallationStore)

```typescript
import { App, type AuthorizeResult } from "@slack/bolt";

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  authorize: async ({ teamId, enterpriseId, isEnterpriseInstall }): Promise<AuthorizeResult> => {
    const key = isEnterpriseInstall ? enterpriseId : teamId;
    const installation = await db.get(`install:${key}`);

    if (!installation) {
      throw new Error(`No installation found for ${key}`);
    }

    return {
      botToken: installation.bot.token,
      botId: installation.bot.id,
      botUserId: installation.bot.userId,
      teamId,
      enterpriseId,
    };
  },
});
```

### ExpressReceiver with custom OAuth routes and additional endpoints

```typescript
import { App, ExpressReceiver } from "@slack/bolt";

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  clientId: process.env.SLACK_CLIENT_ID!,
  clientSecret: process.env.SLACK_CLIENT_SECRET!,
  stateSecret: process.env.SLACK_STATE_SECRET!,
  scopes: ["chat:write", "commands"],
  installerOptions: {
    installPath: "/slack/install",
    redirectUriPath: "/slack/oauth_redirect",
    directInstall: false,       // show Add to Slack page (vs redirect immediately)
    userScopes: ["chat:write"], // optional user token scopes
  },
  installationStore: myDatabaseStore,
});

// Add custom routes on the same Express app
receiver.router.get("/health", (_req, res) => res.send("OK"));
receiver.router.get("/api/installations", async (_req, res) => {
  const count = await db.count("installations");
  res.json({ count });
});

const app = new App({ receiver });

(async () => {
  await app.start(3000);
  console.log("App with OAuth running on :3000");
})();
```

## pitfalls

- **`MemoryInstallationStore` loses data on restart**: The default store is in-memory only. Every restart requires users to re-install your app. Always implement a persistent `installationStore` for production.
- **Missing `stateSecret` with OAuth**: If you provide `clientId` and `clientSecret` but forget `stateSecret` (and don't set `stateVerification: false`), the app throws on startup. Always provide a `stateSecret` of at least 16 characters.
- **Enterprise Grid keying**: Org-wide Enterprise Grid installs have `installation.team` as `undefined`. If you only key by `team.id`, enterprise installs fail. Always check `isEnterpriseInstall` first.
- **Slow `fetchInstallation` blocks event processing**: Since `fetchInstallation` runs for every incoming event, a slow database query adds latency to all interactions. Index your lookup key and consider caching.
- **Not handling `tokens_revoked`**: When a user revokes your app's tokens, Slack sends this event. If you don't delete the installation, subsequent events fail with invalid token errors. Subscribe to `tokens_revoked` and `app_uninstalled`.
- **Mixing `token` with `clientId`/`clientSecret`**: Single-workspace mode (`token`) and OAuth mode (`clientId`/`clientSecret`) are mutually exclusive. Using both causes Bolt to use the OAuth path but may ignore your `token`.
- **`redirectUri` mismatch**: The redirect URI in your code must exactly match the one registered in the Slack app settings (including trailing slashes). Mismatches cause OAuth to fail with a cryptic error.
- **State cookie domain issues**: In development with tunneling tools (ngrok, Cloudflare Tunnel), the state cookie may not be sent back if the domain changes between install and callback. Test OAuth flow end-to-end in your tunneling setup.

## references

- https://slack.dev/bolt-js/concepts/authenticating-oauth
- https://slack.dev/bolt-js/concepts/authorization
- https://api.slack.com/authentication/oauth-v2
- https://api.slack.com/scopes
- https://api.slack.com/events/app_uninstalled
- https://api.slack.com/events/tokens_revoked
- https://github.com/slackapi/bolt-js
- https://github.com/slackapi/node-slack-sdk/tree/main/packages/oauth

## instructions

This expert covers Slack OAuth and multi-workspace app distribution in Bolt.js TypeScript. Use it when you need to: set up OAuth with InstallProvider for distributing your app to multiple workspaces; implement a persistent InstallationStore with database backing; configure bot and user scopes; handle the authorize callback for custom token resolution; set up OAuth routes on HTTPReceiver or ExpressReceiver; manage app uninstalls and token revocations; and handle Enterprise Grid org-wide installations. Pair with `runtime.bolt-foundations-ts.md` for general App setup and `runtime.ack-rules-ts.md` for how token resolution affects handler execution.

## research

Deep Research prompt:

"Write a micro expert on Slack OAuth and multi-workspace app distribution in Bolt.js TypeScript. Cover: InstallProvider configuration (clientId, clientSecret, stateSecret), InstallationStore interface (storeInstallation, fetchInstallation, deleteInstallation), OAuth flow (authorize URL, callback, token exchange), authorize callback for custom token resolution, bot scopes vs user scopes, HTTPReceiver and ExpressReceiver OAuth route setup, state verification (stateSecret, stateStore), Enterprise Grid org-wide installs, token revocation handling, and production deployment considerations. Provide 2-3 canonical TypeScript examples."
