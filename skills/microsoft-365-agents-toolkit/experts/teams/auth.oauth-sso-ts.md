# auth.oauth-sso-ts

## purpose

OAuth/SSO sign-in flows, token management, and connection configuration in Teams bots using the Teams AI Library v2.

## rules

1. Always configure OAuth by passing `oauth: { defaultConnectionName: 'graph' }` to the `App` constructor alongside `clientId`, `clientSecret`, and `tenantId`. Without all four properties the sign-in flow will fail silently. [learn.microsoft.com -- Bot SSO](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/authentication/bot-sso-overview)
2. Guard every message handler with an `isSignedIn` check before accessing `userGraph` or `userToken`. If the user is not signed in, call `await signin()` and return immediately -- the handler will re-fire after the sign-in completes. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
3. Pass `oauthCardText` and `signInButtonText` options to `signin()` to customize the sign-in card displayed to the user. These are the only two customization points for the OAuth card. [learn.microsoft.com -- Auth flow](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/authentication/auth-flow-bot)
4. Handle the post-sign-in event with `app.event('signin', handler)` to greet the user or execute first-time logic. The handler receives `{ send, userGraph, token }` and fires after the token exchange completes. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
5. Implement sign-out with a dedicated command (e.g., `app.message('/signout', ...)`) that checks `isSignedIn`, calls `await signout()`, and confirms to the user. Forgetting the `isSignedIn` guard on signout causes confusing errors. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
6. The `userToken` property on the handler context is the raw OAuth access token string. Use it only for direct REST calls outside of the Graph client; prefer `userGraph` for Microsoft Graph calls as it handles token injection automatically. [learn.microsoft.com -- Get token](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/authentication/auth-flow-bot)
7. For app-level (service-to-service) calls, use `appGraph` which authenticates with client credentials and does not require user sign-in. Do not confuse `appGraph` (application permissions) with `userGraph` (delegated permissions). [learn.microsoft.com -- Graph permissions](https://learn.microsoft.com/en-us/graph/permissions-overview)
8. Choose the appropriate credential method: `clientId` + `clientSecret` for standard deployments, `managedIdentityClientId: 'system'` for system-assigned managed identity, a specific identity string for user-assigned managed identity, or `token` for a custom token factory. [learn.microsoft.com -- Managed identity](https://learn.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/overview)
9. The OAuth connection name (e.g., `'graph'`) must exactly match the OAuth connection setting configured in the Azure Bot resource. A mismatch results in a generic "sign-in failed" error with no helpful diagnostics. [learn.microsoft.com -- Add authentication](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/authentication/add-authentication)
10. Never store or log raw tokens. The `userToken` is a bearer credential that grants access to the user's data. If you need to persist auth state, store a flag or user ID, not the token itself. [learn.microsoft.com -- Security best practices](https://learn.microsoft.com/en-us/azure/active-directory/develop/security-best-practices-for-app-registration)

## patterns

### Basic sign-in guard with Graph call

```typescript
import { App } from '@microsoft/teams.apps';
import { ConsoleLogger } from '@microsoft/teams.common';
import { DevtoolsPlugin } from '@microsoft/teams.dev';
import * as endpoints from '@microsoft/teams.graph-endpoints';

const app = new App({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,
  oauth: { defaultConnectionName: 'graph' },
  logger: new ConsoleLogger('auth-bot', { level: 'debug' }),
  plugins: [new DevtoolsPlugin()],
});

app.on('message', async ({ isSignedIn, signin, userGraph, send }) => {
  // Always check isSignedIn before using userGraph
  if (!isSignedIn) {
    await signin({
      oauthCardText: 'Please sign in to continue',
      signInButtonText: 'Sign In',
    });
    return;
  }

  // User is authenticated -- safe to call Graph with delegated token
  const me = await userGraph.call(endpoints.me.get);
  await send(`Hello, ${me.displayName}!`);
});

app.start(3978);
```

### Post-sign-in event and sign-out command

```typescript
import { App } from '@microsoft/teams.apps';
import * as endpoints from '@microsoft/teams.graph-endpoints';

const app = new App({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,
  oauth: { defaultConnectionName: 'graph' },
});

// Fires after successful token exchange
app.event('signin', async ({ send, userGraph }) => {
  const me = await userGraph.call(endpoints.me.get);
  await send(`Welcome, ${me.displayName}! You are now signed in.`);
});

// Dedicated sign-out command
app.message('/signout', async ({ isSignedIn, signout, send }) => {
  if (!isSignedIn) {
    await send('You are not signed in.');
    return;
  }
  await signout();
  await send('You have been signed out.');
});

app.start(3978);
```

### Token types configuration

```typescript
import { App } from '@microsoft/teams.apps';

// Option 1: Client credentials (most common)
const appWithSecret = new App({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,
  oauth: { defaultConnectionName: 'graph' },
});

// Option 2: System-assigned managed identity (Azure deployment)
const appWithSystemMI = new App({
  clientId: process.env.CLIENT_ID,
  tenantId: process.env.TENANT_ID,
  managedIdentityClientId: 'system',
  oauth: { defaultConnectionName: 'graph' },
});

// Option 3: User-assigned managed identity
const appWithUserMI = new App({
  clientId: process.env.CLIENT_ID,
  tenantId: process.env.TENANT_ID,
  managedIdentityClientId: process.env.MANAGED_IDENTITY_CLIENT_ID,
  oauth: { defaultConnectionName: 'graph' },
});

// Option 4: Custom token factory
const appWithFactory = new App({
  clientId: process.env.CLIENT_ID,
  tenantId: process.env.TENANT_ID,
  token: async () => {
    // Return a token string from your custom provider
    return await getTokenFromVault();
  },
  oauth: { defaultConnectionName: 'graph' },
});
```

## pitfalls

- **Missing `oauth` in App options**: Setting `clientId`/`clientSecret`/`tenantId` without `oauth: { defaultConnectionName: 'graph' }` means `isSignedIn` is always `false` and `signin()` does nothing. All four must be present.
- **Calling `userGraph` before sign-in check**: Accessing `userGraph.call()` when `isSignedIn` is `false` throws an error because there is no delegated token. Always gate behind `if (!isSignedIn)`.
- **Connection name mismatch**: The `defaultConnectionName` value must exactly match the OAuth connection setting name in the Azure Bot resource. A typo silently breaks the sign-in flow.
- **Confusing `appGraph` and `userGraph`**: `appGraph` uses application permissions (no user context). `userGraph` uses delegated permissions (user's identity). Using the wrong one leads to permission-denied errors or data leaks.
- **Not returning after `signin()`**: After calling `await signin()`, you must `return` from the handler. Code after `signin()` executes with no user context and will fail.
- **Storing raw tokens**: The `userToken` string is a bearer credential. Logging or persisting it creates a security vulnerability. Store only non-sensitive identifiers.
- **Forgetting the sign-in event handler**: Without `app.event('signin', ...)`, there is no feedback to the user after they complete the OAuth flow. They see the sign-in card but no confirmation.
- **Using `signout()` without `isSignedIn` guard**: Calling `signout()` when the user is not signed in may throw or produce confusing behavior. Always check first.

## references

- [Teams Bot SSO overview](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/authentication/bot-sso-overview)
- [Add authentication to a Teams bot](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/authentication/add-authentication)
- [Bot authentication flow](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/authentication/auth-flow-bot)
- [Teams AI Library v2 -- GitHub](https://github.com/microsoft/teams.ts)
- [Microsoft Graph permissions overview](https://learn.microsoft.com/en-us/graph/permissions-overview)
- [Azure Managed Identities](https://learn.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/overview)

## instructions

This expert covers OAuth/SSO authentication flows in Microsoft Teams bots built with the Teams AI Library v2 (`@microsoft/teams.ts`) in TypeScript. Use it when you need to:

- Configure OAuth settings on the App constructor with `clientId`, `clientSecret`, `tenantId`, and `oauth.defaultConnectionName`
- Implement the sign-in guard pattern (`isSignedIn` check, `signin()` call, early return)
- Handle the post-sign-in event with `app.event('signin', ...)`
- Implement a sign-out command
- Choose between credential types (client secret, managed identity, custom token factory)
- Understand the difference between `userGraph` (delegated) and `appGraph` (app-level) authentication contexts

Pair with `graph.usergraph-appgraph-ts.md` for Graph API call patterns after authentication, and `state.storage-patterns-ts.md` for persisting user session data. Pair with `graph.usergraph-appgraph-ts.md` for calling Graph API after sign-in, and `runtime.app-init-ts.md` for oauth configuration in the App constructor.

## research

Deep Research prompt:

"Write a micro expert on OAuth/SSO authentication in Microsoft Teams bots using the Teams AI Library v2 (TypeScript). Cover App oauth configuration, the isSignedIn/signin/signout flow, the signin event handler, token types (client credentials, managed identity, custom factory), sign-in guard patterns in message handlers, and common authentication pitfalls. Include 2-3 canonical TypeScript code examples."
