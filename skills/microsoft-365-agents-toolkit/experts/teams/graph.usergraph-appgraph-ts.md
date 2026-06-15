# graph.usergraph-appgraph-ts

## purpose

Microsoft Graph API access via userGraph (delegated) and appGraph (app-level) clients with typed endpoint imports.

## rules

1. Import Graph endpoints from `@microsoft/teams.graph-endpoints` for v1.0 APIs and `@microsoft/teams.graph-endpoints-beta` for beta APIs. These are auto-generated typed functions, not raw URL strings. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
2. Use `userGraph` for operations that act on behalf of the signed-in user (delegated permissions). This requires the user to have completed the OAuth sign-in flow (`isSignedIn === true`). [learn.microsoft.com -- Delegated permissions](https://learn.microsoft.com/en-us/graph/permissions-overview#delegated-permissions)
3. Use `appGraph` for operations that run under the application's own identity (application permissions). This does not require user sign-in but requires admin consent for the target tenant. [learn.microsoft.com -- Application permissions](https://learn.microsoft.com/en-us/graph/permissions-overview#application-permissions)
4. Call endpoints with `graph.call(endpoints.{resource}.{action}, params)` where `params` is an object containing path parameters, query parameters, and the request body. Path parameters use kebab-case keys matching the Graph URL template (e.g., `'chat-id'`). [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
5. Use OData query parameters (`$top`, `$filter`, `$select`, `$orderby`, `$expand`) as top-level keys in the params object to control response shape and size. Always set `$top` on list endpoints to avoid unbounded result sets. [learn.microsoft.com -- OData query params](https://learn.microsoft.com/en-us/graph/query-parameters)
6. Endpoint names follow a consistent pattern: `endpoints.{resource}.get` for single-item GET, `endpoints.{resource}.list` for collection GET, `endpoints.{resource}.create` for POST, `endpoints.{resource}.update` for PATCH, `endpoints.{resource}.delete` for DELETE. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
7. Always wrap Graph calls in try/catch. Failed calls throw errors with HTTP status codes and Graph error details. Check for 401 (token expired), 403 (insufficient permissions), and 429 (throttled). [learn.microsoft.com -- Error responses](https://learn.microsoft.com/en-us/graph/errors)
8. For nested resources, endpoints chain with dot notation: `endpoints.chats.messages.list`, `endpoints.chats.messages.create`. Pass the parent resource ID as a path parameter (e.g., `'chat-id': chatId`). [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)
9. Prefer `$select` to retrieve only the fields you need. This reduces payload size and avoids retrieving sensitive data. For example, `$select: 'displayName,mail'` on a user query. [learn.microsoft.com -- Select parameter](https://learn.microsoft.com/en-us/graph/query-parameters#select-parameter)
10. Never call `userGraph` without first verifying `isSignedIn`. Calling `userGraph.call()` without a valid delegated token throws an authentication error. Gate all `userGraph` usage behind the sign-in guard pattern. [github.com/microsoft/teams.ts](https://github.com/microsoft/teams.ts)

## patterns

### Delegated user profile lookup

```typescript
import { App } from '@microsoft/teams.apps';
import * as endpoints from '@microsoft/teams.graph-endpoints';

const app = new App({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,
  oauth: { defaultConnectionName: 'graph' },
});

app.on('message', async ({ isSignedIn, signin, userGraph, send }) => {
  if (!isSignedIn) {
    await signin({ signInButtonText: 'Sign In' });
    return;
  }

  // GET /me -- delegated call using the signed-in user's token
  const me = await userGraph.call(endpoints.me.get);
  await send(`Hello ${me.displayName}! Your email is ${me.mail}.`);
});

app.start(3978);
```

### App-level user listing with query parameters

```typescript
import { App } from '@microsoft/teams.apps';
import * as endpoints from '@microsoft/teams.graph-endpoints';

const app = new App({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,
});

app.on('message', async ({ appGraph, send, activity }) => {
  // GET /users -- app-level call, no user sign-in required
  // Requires Application permission: User.Read.All with admin consent
  const users = await appGraph.call(endpoints.users.list, {
    $top: 10,
    $filter: "department eq 'Engineering'",
    $select: 'displayName,mail,department',
  });

  const names = users.value.map((u: any) => u.displayName).join(', ');
  await send(`Engineering team: ${names}`);
});

app.start(3978);
```

### Sending a chat message via Graph

```typescript
import { App } from '@microsoft/teams.apps';
import * as endpoints from '@microsoft/teams.graph-endpoints';

const app = new App({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  tenantId: process.env.TENANT_ID,
});

app.on('message', async ({ appGraph, send, activity }) => {
  const chatId = activity.conversation.id;

  try {
    // POST /chats/{chat-id}/messages -- send a message to a chat
    await appGraph.call(endpoints.chats.messages.create, {
      'chat-id': chatId,
      body: { content: 'Hello from the bot via Graph!' },
    });
    await send('Message sent via Graph API.');
  } catch (err: any) {
    if (err.status === 403) {
      await send('Insufficient permissions to send chat messages.');
    } else if (err.status === 429) {
      await send('Throttled by Graph API. Please try again later.');
    } else {
      throw err;
    }
  }
});

app.start(3978);
```

## pitfalls

- **Calling `userGraph` without sign-in guard**: `userGraph.call()` throws if `isSignedIn` is `false`. Always check `isSignedIn` first and call `signin()` if needed.
- **Missing admin consent for app permissions**: `appGraph` calls with application permissions (e.g., `User.Read.All`) require an Azure AD admin to grant consent. Without it, calls return 403.
- **Unbounded list queries**: Calling `endpoints.users.list` without `$top` returns a default page size but may trigger pagination. Always set `$top` to control result size.
- **Wrong path parameter key names**: Graph endpoint path parameters use kebab-case (e.g., `'chat-id'`, `'user-id'`), not camelCase. A wrong key silently omits the parameter, producing a malformed URL.
- **Confusing v1.0 and beta endpoints**: Importing from `@microsoft/teams.graph-endpoints` gives v1.0 stable APIs. Beta endpoints from `@microsoft/teams.graph-endpoints-beta` may change without notice and should not be used in production.
- **Not handling throttling (429)**: Graph API enforces rate limits. A 429 response includes a `Retry-After` header. Ignoring it causes cascading failures.
- **Over-fetching data**: Not using `$select` retrieves all properties, including potentially sensitive fields. Always scope queries to needed fields.
- **Using `appGraph` for user-specific data**: `appGraph` has no user context. Calling `endpoints.me.get` with `appGraph` fails because `/me` requires delegated permissions.

## references

- [Microsoft Graph API overview](https://learn.microsoft.com/en-us/graph/overview)
- [Graph permissions overview](https://learn.microsoft.com/en-us/graph/permissions-overview)
- [Graph OData query parameters](https://learn.microsoft.com/en-us/graph/query-parameters)
- [Graph error responses](https://learn.microsoft.com/en-us/graph/errors)
- [Graph API rate limiting](https://learn.microsoft.com/en-us/graph/throttling)
- [Teams AI Library v2 -- GitHub](https://github.com/microsoft/teams.ts)
- [@microsoft/teams.graph-endpoints npm](https://www.npmjs.com/package/@microsoft/teams.graph-endpoints)

## instructions

This expert covers Microsoft Graph API access in Teams bots built with the Teams AI Library v2 (`@microsoft/teams.ts`) in TypeScript. Use it when you need to:

- Call Graph endpoints using `userGraph` (delegated, on behalf of a signed-in user) or `appGraph` (application-level, service-to-service)
- Import and use typed endpoints from `@microsoft/teams.graph-endpoints` or `@microsoft/teams.graph-endpoints-beta`
- Understand the endpoint naming pattern (`endpoints.{resource}.{action}`)
- Pass path parameters, query parameters (`$top`, `$filter`, `$select`), and request bodies
- Handle Graph API errors (401, 403, 429) gracefully

Pair with `auth.oauth-sso-ts.md` for sign-in flow setup before using `userGraph`, and `runtime.app-init-ts.md` for App constructor configuration. Pair with `auth.oauth-sso-ts.md` for the sign-in flow that enables userGraph, and `runtime.app-init-ts.md` for App credential configuration.

## research

Deep Research prompt:

"Write a micro expert on Microsoft Graph usage in Teams SDK v2 (TypeScript). Explain appGraph vs userGraph, required permissions/consent, calling generated endpoints from @microsoft/teams.graph-endpoints, OData query parameters, common endpoints (me, users, chats, messages), error handling patterns, and beta endpoint usage. Include 2-3 TypeScript code examples."
