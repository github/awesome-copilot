# identity-oauth-bridge-ts

## purpose

Bridges Slack and Teams/Azure AD identity systems (user/channel IDs, OAuth, signing) for cross-platform bots targeting Slack, Teams, or both.

## rules

1. Slack uses proprietary ID formats: user IDs start with `U` (e.g., `U01ABCDEF`), channel IDs start with `C` (e.g., `C02GHIJKL`), team/workspace IDs start with `T` (e.g., `T03MNOPQR`), and bot IDs start with `B`. These IDs have no relationship to Teams/Azure AD identifiers and cannot be mapped automatically. [api.slack.com/types](https://api.slack.com/types)
2. Teams identifies users by Azure AD Object ID (a GUID like `00000000-0000-0000-0000-000000000000`), available at `activity.from.aadObjectId`. Conversation IDs are opaque strings like `19:abc123@thread.v2` for channels or `a]concat@...` for personal chats. These formats are fundamentally different from Slack IDs. [learn.microsoft.com -- Activity schema](https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-api-reference)
3. Slack's request verification via `signingSecret` (HMAC-SHA256 of request body) is replaced by **Bot Framework JWT token validation** in Teams. The Teams SDK handles JWT validation automatically -- no manual signing secret check is needed. [learn.microsoft.com -- Bot authentication](https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-authentication)
4. Slack's bot token (`xoxb-...`) used for API calls is replaced by **Azure Bot credentials** (`CLIENT_ID` + `CLIENT_SECRET` + `TENANT_ID`). The Teams SDK uses these to obtain tokens for the Bot Framework service automatically. [learn.microsoft.com -- Register a bot](https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration)
5. Slack OAuth scopes (e.g., `chat:write`, `users:read`, `commands`) map to **Azure AD permissions** for the Microsoft Graph API (e.g., `User.Read`, `ChannelMessage.Send`). Slack scopes are configured in the Slack app dashboard; Azure AD permissions are configured in the Azure Portal under App Registration > API Permissions. [learn.microsoft.com -- Graph permissions](https://learn.microsoft.com/en-us/graph/permissions-reference)
6. Slack user tokens (obtained via OAuth `users:read` or user token grant) map to **Teams SSO / OAuth card flow**. In Teams, configure an OAuth connection in the Azure Bot resource, then use `isSignedIn` / `signin()` / `userGraph` in handlers to access the user's delegated token for Graph API calls. [learn.microsoft.com -- Bot SSO](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/authentication/bot-sso-overview)
7. To resolve user identity across platforms during migration, use a **shared attribute** like email address. Query Slack's `users.info` API for the user's email, then look up the same email in Azure AD via Microsoft Graph `users?$filter=mail eq '...'`. Build a mapping table of Slack user ID to AAD Object ID. [learn.microsoft.com -- Graph users API](https://learn.microsoft.com/en-us/graph/api/user-list)
8. Any data stored with Slack IDs as keys (user preferences, conversation history, permissions) must be **re-keyed** to Teams/AAD IDs. Plan a data migration step that uses the email-based mapping table to translate stored Slack user IDs to AAD Object IDs. [learn.microsoft.com -- Migration planning](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-upload)
9. Slack workspace-level operations (e.g., listing all users via `users.list`, posting to any channel) require bot scopes. In Teams, equivalent operations use Microsoft Graph with **application permissions** (consented by a tenant admin). Use `appGraph` for service-to-service calls and `userGraph` for delegated user calls. [learn.microsoft.com -- Graph auth overview](https://learn.microsoft.com/en-us/graph/auth/auth-concepts)
10. Teams supports **managed identity** as an alternative to client secret for production deployments on Azure. Set `managedIdentityClientId: 'system'` in App options to use Azure Managed Identity instead of storing secrets in environment variables. [learn.microsoft.com -- Managed identity](https://learn.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/overview)

## patterns

### Environment variable mapping between Slack and Teams

**Slack `.env`:**

```env
# Slack Bot Configuration
SLACK_BOT_TOKEN=your-slack-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=your-slack-app-token
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
PORT=3000
```

**Teams `.env`:**

```env
# Azure Bot Registration
CLIENT_ID=00000000-0000-0000-0000-000000000000
CLIENT_SECRET=your-azure-bot-client-secret
TENANT_ID=00000000-0000-0000-0000-000000000000
PORT=3978
```

**Environment variable mapping table:**

| Slack Variable | Teams Variable | Notes |
|---|---|---|
| `SLACK_BOT_TOKEN` (`xoxb-...`) | `CLIENT_ID` + `CLIENT_SECRET` | Teams SDK manages token acquisition automatically |
| `SLACK_SIGNING_SECRET` | *(not needed)* | Bot Framework JWT validation is automatic |
| `SLACK_APP_TOKEN` (`xapp-...`) | *(not needed)* | Socket mode is Slack-only; Teams uses HTTPS |
| `SLACK_CLIENT_ID` | `CLIENT_ID` | Azure Bot App Registration ID (GUID) |
| `SLACK_CLIENT_SECRET` | `CLIENT_SECRET` | Azure Bot App Registration secret |
| *(not applicable)* | `TENANT_ID` | Azure AD tenant ID (new for Teams) |
| `PORT` (default 3000) | `PORT` (default 3978) | Different conventional defaults |

**Identity concept mapping table:**

| Slack Concept | Teams/Azure AD Concept | Format |
|---|---|---|
| User ID (`U01ABCDEF`) | AAD Object ID | GUID (`00000000-...`) |
| Channel ID (`C02GHIJKL`) | Conversation ID | `19:abc@thread.v2` |
| Team/Workspace ID (`T03MNOPQR`) | Tenant ID | GUID |
| Bot ID (`B04STUVWX`) | Bot ID (from App Registration) | GUID |
| DM Channel ID (`D05YZABCD`) | Personal conversation ID | Opaque string |
| Signing Secret | Bot Framework JWT | Automatic validation |
| Bot Token (`xoxb-...`) | Client credentials flow | CLIENT_ID + CLIENT_SECRET |
| User Token (`xoxp-...`) | Delegated OAuth token | SSO / OAuth card flow |
| OAuth scopes (`chat:write`) | Azure AD permissions (`ChannelMessage.Send`) | Configured in Azure Portal |
| Slack App Dashboard | Azure Portal + manifest.json | Config split between portal and file |

### Migrating authentication from Slack OAuth to Teams SSO

**Slack (before) -- Using Slack OAuth for user identity:**

```typescript
import { App } from "@slack/bolt";

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

app.command("/whoami", async ({ ack, command, client }) => {
  await ack();
  // Use the bot token to look up user info
  const userInfo = await client.users.info({ user: command.user_id });
  const email = userInfo.user?.profile?.email ?? "unknown";
  const name = userInfo.user?.real_name ?? "unknown";
  await client.chat.postMessage({
    channel: command.channel_id,
    text: `You are ${name} (${email})`,
  });
});
```

**Teams (after) -- Using Teams SSO and Microsoft Graph:**

```typescript
import { App } from "@microsoft/teams.apps";
import { ConsoleLogger } from "@microsoft/teams.common";
import { DevtoolsPlugin } from "@microsoft/teams.dev";
import * as endpoints from "@microsoft/teams.graph-endpoints";

const app = new App({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,
  logger: new ConsoleLogger("my-bot", { level: "info" }),
  plugins: [new DevtoolsPlugin()],
  oauth: { defaultConnectionName: "graph" },
});

app.message(/^\/?whoami$/i, async ({ isSignedIn, signin, userGraph, send }) => {
  // If user is not signed in, trigger the SSO/OAuth flow
  if (!isSignedIn) {
    await signin({ signInButtonText: "Sign In to continue" });
    return;
  }

  // Use the delegated Graph client to get user profile
  const me = await userGraph.call(endpoints.me.get);
  await send(`You are ${me.displayName} (${me.mail})`);
});

// Handle successful sign-in
app.event("signin", async ({ send, userGraph }) => {
  const me = await userGraph.call(endpoints.me.get);
  await send(`Welcome, ${me.displayName}! You are now signed in.`);
});

app.start(3978);
```

### Building a Slack-to-AAD user ID mapping table

```typescript
import { WebClient } from "@slack/web-api";
import { Client as GraphClient } from "@microsoft/microsoft-graph-client";

interface UserMapping {
  slackUserId: string;
  slackEmail: string;
  aadObjectId: string | null;
  aadDisplayName: string | null;
}

async function buildUserMappingTable(
  slackClient: WebClient,
  graphClient: GraphClient
): Promise<UserMapping[]> {
  const mappings: UserMapping[] = [];

  // Step 1: Fetch all Slack users
  const slackUsers = await slackClient.users.list({});
  const members = slackUsers.members ?? [];

  for (const slackUser of members) {
    if (slackUser.deleted || slackUser.is_bot) continue;

    const email = slackUser.profile?.email;
    if (!email) {
      mappings.push({
        slackUserId: slackUser.id!,
        slackEmail: "",
        aadObjectId: null,
        aadDisplayName: null,
      });
      continue;
    }

    // Step 2: Look up the same email in Azure AD via Graph
    try {
      const result = await graphClient
        .api("/users")
        .filter(`mail eq '${email}' or userPrincipalName eq '${email}'`)
        .select("id,displayName,mail")
        .get();

      const aadUser = result.value?.[0];
      mappings.push({
        slackUserId: slackUser.id!,
        slackEmail: email,
        aadObjectId: aadUser?.id ?? null,
        aadDisplayName: aadUser?.displayName ?? null,
      });
    } catch {
      mappings.push({
        slackUserId: slackUser.id!,
        slackEmail: email,
        aadObjectId: null,
        aadDisplayName: null,
      });
    }
  }

  return mappings;
}

// Step 3: Use the mapping to re-key stored data
async function migrateUserData(
  mappings: UserMapping[],
  oldStore: Map<string, unknown>,
  newStore: Map<string, unknown>
): Promise<void> {
  for (const mapping of mappings) {
    if (!mapping.aadObjectId) continue;
    const data = oldStore.get(mapping.slackUserId);
    if (data) {
      newStore.set(mapping.aadObjectId, data);
    }
  }
}
```

### Converting Slack OAuth implementation code to Teams OAuth

Slack SDKs (especially `java-slack-sdk` and `@slack/bolt`) implement OAuth with explicit services: `InstallationService` for storing tokens, `OAuthStateService` for CSRF, and `OAuthCallbackHandler` for the redirect. Teams replaces ALL of this with declarative config.

**Slack Java SDK OAuth (before):**

```java
// --- Slack Java SDK OAuth implementation ---
// InstallationService — stores bot tokens per workspace
public class FileInstallationService implements InstallationService {
    public void saveInstallerAndBot(Installer installer) { /* persist to DB */ }
    public Installer findInstaller(String enterpriseId, String teamId) { /* lookup */ }
    public Bot findBot(String enterpriseId, String teamId) { /* lookup */ }
    public void deleteBot(Bot bot) { /* remove */ }
    public void deleteInstaller(Installer installer) { /* remove */ }
}

// OAuthStateService — generates and validates CSRF state parameter
public class FileOAuthStateService implements OAuthStateService {
    public String issueNewState(Request req) { /* generate random state */ }
    public boolean isValid(OAuthState state) { /* validate state */ }
    public void consume(OAuthState state) { /* mark used */ }
}

// App configuration with OAuth
App app = new App(AppConfig.builder()
    .clientId(System.getenv("SLACK_CLIENT_ID"))
    .clientSecret(System.getenv("SLACK_CLIENT_SECRET"))
    .signingSecret(System.getenv("SLACK_SIGNING_SECRET"))
    .oAuthInstallPath("/slack/install")
    .oAuthRedirectUriPath("/slack/oauth_redirect")
    .oAuthCompletionUrl("https://example.com/success")
    .oAuthCancellationUrl("https://example.com/cancel")
    .installationService(new FileInstallationService())
    .oauthStateService(new FileOAuthStateService())
    .build());
```

**Teams OAuth (after):**

```typescript
// --- Teams OAuth — all of the above is replaced by config ---
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common';

const app = new App({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,
  logger: new ConsoleLogger('my-bot', { level: 'info' }),

  // This single config block replaces:
  // - InstallationService (token storage is managed by Azure Bot Service)
  // - OAuthStateService (CSRF handled by Bot Framework)
  // - OAuthCallbackHandler (redirect handled by Azure Bot Service)
  // - Token refresh logic (managed by Azure Bot Service)
  oauth: {
    defaultConnectionName: 'graph', // configured in Azure Portal
    // That's it. No custom services needed.
  },
});

// Instead of Slack's multi-step OAuth flow with custom storage:
// 1. Azure Bot Service manages token acquisition, refresh, and storage
// 2. CSRF protection is built into the Bot Framework sign-in flow
// 3. The OAuth connection is configured in Azure Portal (not code)
// 4. Use isSignedIn/signin() in handlers to trigger auth when needed

app.message(/^profile$/i, async ({ isSignedIn, signin, userGraph, send }) => {
  if (!isSignedIn) {
    await signin();
    return;
  }
  const me = await userGraph.call(endpoints.me.get);
  await send(`Signed in as ${me.displayName}`);
});
```

**What gets DELETED during conversion:**

| Slack OAuth Component | Teams Equivalent | Action |
|---|---|---|
| `InstallationService` + DB storage | Azure Bot Service token cache | Delete entirely |
| `OAuthStateService` + CSRF tokens | Bot Framework built-in CSRF | Delete entirely |
| `OAuthCallbackHandler` + redirect routes | Azure Bot Service callbacks | Delete entirely |
| Token refresh / expiry logic | Azure Bot Service auto-refresh | Delete entirely |
| `/slack/install` route | Teams app install flow | Delete entirely |
| `/slack/oauth_redirect` route | Azure Bot Service | Delete entirely |
| Multi-workspace token lookup | Managed identity / tenant config | Delete entirely |
| Slack OAuth scopes in code | Azure Portal API Permissions | Configure in portal |

### Reverse direction (Teams → Slack)

For Teams → Slack, the same mapping table applies in reverse. AAD Object IDs need mapping to Slack user IDs via email lookup. Key reverse mappings:
- `activity.from.aadObjectId` (GUID) → Slack User ID (`U...`) via email-based lookup: query Graph `users/{aadObjectId}` for email, then `users.lookupByEmail` in Slack
- `activity.conversation.id` (`19:abc@thread.v2`) → Slack Channel ID (`C...`) via channel name mapping or a stored lookup table
- `CLIENT_ID` + `CLIENT_SECRET` + `TENANT_ID` → `SLACK_BOT_TOKEN` (`xoxb-...`) + `SLACK_SIGNING_SECRET`
- Azure AD permissions (`ChannelMessage.Send`, `User.Read`) → Slack OAuth scopes (`chat:write`, `users:read`)
- Teams SSO / OAuth card flow → Slack OAuth with `InstallationService` and `OAuthStateService` (Slack requires explicit token storage and refresh logic that Azure Bot Service handles automatically)
- Bot Framework JWT validation (automatic) → Slack signing secret HMAC-SHA256 verification (must add `signingSecret` to Bolt config)
- Azure Managed Identity → no Slack equivalent; use environment variables or secret manager for Slack tokens
- The email-based user mapping table built for Slack → Teams works identically in reverse

## pitfalls

- **Assuming Slack IDs can be reused**: Slack IDs (`U...`, `C...`, `T...`) are completely incompatible with Teams/AAD IDs. Any code that stores or references Slack IDs must be updated to use AAD Object IDs and conversation IDs.
- **Manual signing secret validation**: Developers sometimes port Slack's HMAC verification middleware to Teams. This is unnecessary -- the Bot Framework validates JWT tokens automatically. Remove all signing secret verification code.
- **Expecting ephemeral identity context**: Slack's `user_id` is always present in command and action payloads. In Teams, `activity.from.aadObjectId` may be `undefined` in some contexts (e.g., webhook-originated activities). Always null-check.
- **OAuth scope confusion**: Slack scopes like `chat:write` do not map 1:1 to Azure AD permissions. Audit each Slack scope used and find the equivalent Graph permission. Some Slack capabilities require multiple Graph permissions or a different API approach entirely.
- **Storing tokens insecurely**: Slack bot tokens are long-lived strings. Azure Bot credentials use short-lived JWT tokens managed by the SDK. Never try to cache or store Bot Framework tokens manually.
- **Skipping the user mapping step**: Without building a Slack-to-AAD mapping table, any user-specific data (preferences, history, permissions) stored under Slack IDs becomes inaccessible. Plan this migration step early.
- **Tenant ID confusion**: Slack workspaces have a single team ID. Azure AD tenants can contain multiple Teams organizations. Ensure `TENANT_ID` is set correctly -- use the specific tenant ID for single-tenant apps or `common` for multi-tenant.
- **Forgetting to configure OAuth connection**: Teams SSO requires an OAuth connection configured in the Azure Bot resource (Settings > OAuth Connection Settings). Without it, `signin()` calls fail silently.
- **Porting OAuth implementation code instead of deleting it**: Slack's `InstallationService`, `OAuthStateService`, and `OAuthCallbackHandler` have NO Teams equivalent. Azure Bot Service handles token storage, CSRF, and callbacks automatically. Attempting to port these services wastes effort and introduces bugs. Delete them entirely and use the `oauth: { defaultConnectionName }` config.
- **Custom token refresh logic**: Slack apps often implement manual token refresh with `oauth.v2.access`. Azure Bot Service refreshes tokens automatically. Delete all refresh code.

## references

- https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-authentication
- https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration
- https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/authentication/bot-sso-overview
- https://learn.microsoft.com/en-us/graph/permissions-reference
- https://learn.microsoft.com/en-us/graph/api/user-list
- https://learn.microsoft.com/en-us/graph/auth/auth-concepts
- https://learn.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/overview
- https://api.slack.com/types
- https://api.slack.com/methods/users.info
- https://github.com/microsoft/teams.ts

## instructions

This expert covers bridging Slack and Teams/Azure AD identity and authentication systems. Use it when adding cross-platform support in either direction: understanding the differences between Slack IDs (U/C/T/B prefixed) and Teams IDs (AAD Object IDs, conversation IDs); bridging signing/verification (Slack signing secret ↔ Bot Framework JWT); mapping environment variables (SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET ↔ CLIENT_ID, CLIENT_SECRET, TENANT_ID); converting between Slack OAuth and Teams SSO with Microsoft Graph; building a bidirectional user mapping table using email as the shared attribute; bridging Slack OAuth scopes and Azure AD permissions; and configuring authentication for either platform. Pair with `../teams/auth.oauth-sso-ts.md` for Teams OAuth/SSO flow, and `../teams/graph.usergraph-appgraph-ts.md` for Graph API user lookup during identity mapping.

## research

Deep Research prompt:

"Write a micro expert for bridging Slack and Teams/Azure AD identity systems bidirectionally. Cover Slack ID formats (U/C/T/B IDs) vs Teams IDs (AAD Object IDs, conversation IDs), signing/verification bridging (signing secret <-> Bot Framework JWT), environment variable mapping in both directions, Slack OAuth <-> Teams SSO flow, Slack scopes <-> Azure AD Graph permissions, building a bidirectional user mapping table via email lookup, data re-keying strategies, and managed identity for production. Include mapping tables and TypeScript examples."
