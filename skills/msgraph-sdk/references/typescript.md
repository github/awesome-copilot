# Microsoft Graph SDK for TypeScript / JavaScript

Use this reference when the target project uses TypeScript or JavaScript (Node.js or browser).

## Authoritative sources

- SDK repository: <https://github.com/microsoftgraph/msgraph-sdk-javascript>
- Samples: <https://github.com/microsoftgraph/msgraph-training-typescript>
- SDK changelog: <https://github.com/microsoftgraph/msgraph-sdk-javascript/blob/main/CHANGELOG.md>

## Packages

```bash
npm install @microsoft/microsoft-graph-client @azure/identity
npm install -D @microsoft/microsoft-graph-types   # TypeScript type definitions
```

For Node.js environments, also install the fetch polyfill:

```bash
npm install node-fetch
```

## Client setup

### Managed Identity (Azure-hosted apps — preferred)

```typescript
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js";
import { DefaultAzureCredential } from "@azure/identity";

const credential = new DefaultAzureCredential();
const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ["https://graph.microsoft.com/.default"],
});

const graphClient = Client.initWithMiddleware({ authProvider });
```

### Client credentials (app-only / daemon)

```typescript
import { ClientSecretCredential } from "@azure/identity";

const credential = new ClientSecretCredential(
  process.env.AZURE_TENANT_ID!,
  process.env.AZURE_CLIENT_ID!,
  process.env.AZURE_CLIENT_SECRET!
);

const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ["https://graph.microsoft.com/.default"],
});

const graphClient = Client.initWithMiddleware({ authProvider });
```

### On-Behalf-Of (OBO) — agent / API acting as the signed-in user

```typescript
import { OnBehalfOfCredential } from "@azure/identity";

// incomingToken is the bearer token received from the caller (e.g. from req.headers.authorization)
const credential = new OnBehalfOfCredential({
  tenantId: process.env.AZURE_TENANT_ID!,
  clientId: process.env.AZURE_CLIENT_ID!,
  clientSecret: process.env.AZURE_CLIENT_SECRET!,
  userAssertionToken: incomingToken,
});

const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ["https://graph.microsoft.com/.default"],
});

const graphClient = Client.initWithMiddleware({ authProvider });
```

For OBO, create a new client per request (credential is user-scoped, not singleton-safe).

### Interactive (local dev / CLI — Node.js)

Use `InteractiveBrowserCredential` when a browser is available. Use `DeviceCodeCredential` for headless environments (SSH, CI-adjacent, WSL):

```typescript
import { InteractiveBrowserCredential, DeviceCodeCredential } from "@azure/identity";

// Opens a browser tab — requires redirect URI http://localhost in app registration
const credential = new InteractiveBrowserCredential({
  tenantId: process.env.AZURE_TENANT_ID!,
  clientId: process.env.AZURE_CLIENT_ID!,
});

// Prints a device code to the terminal — works in any environment
const credential = new DeviceCodeCredential({
  tenantId: process.env.AZURE_TENANT_ID!,
  clientId: process.env.AZURE_CLIENT_ID!,
  userPromptCallback: (info) => console.log(info.message),
});
```

Both require the app registration platform to be **"Mobile and desktop applications"**. Neither uses a client secret.

## Common call patterns

### Get a resource with field selection

```typescript
import { User } from "@microsoft/microsoft-graph-types";

const user: User = await graphClient
  .api("/me")
  .select("displayName,mail,jobTitle")
  .get();
```

### List with filter, select, and ordering

```typescript
const result = await graphClient
  .api("/me/messages")
  .filter("isRead eq false")
  .select("subject,from,receivedDateTime")
  .top(25)
  .orderby("receivedDateTime desc")
  .get();
```

### Pagination with PageIterator

```typescript
import { PageIterator } from "@microsoft/microsoft-graph-client";
import { Message } from "@microsoft/microsoft-graph-types";

const firstPage = await graphClient.api("/me/messages").top(25).get();

const allMessages: Message[] = [];

const pageIterator = new PageIterator(
  graphClient,
  firstPage,
  (message: Message) => {
    allMessages.push(message);
    return true; // return false to stop early
  }
);

await pageIterator.iterate();
```

### Send an email

```typescript
await graphClient.api("/me/sendMail").post({
  message: {
    subject: "Hello from Graph",
    body: { contentType: "Text", content: "Test message" },
    toRecipients: [{ emailAddress: { address: "user@contoso.com" } }],
  },
});
```

### Post a Teams channel message

```typescript
await graphClient.api(`/teams/${teamId}/channels/${channelId}/messages`).post({
  body: { contentType: "html", content: "<b>Hello from Graph!</b>" },
});
```

### Upload a file to OneDrive (small files ≤ 4 MB)

```typescript
const content = Buffer.from("file contents");
await graphClient
  .api(`/me/drive/root:/${fileName}:/content`)
  .putStream(content);
```

For files > 4 MB, use an upload session (`createUploadSession`).

## Batch requests

```typescript
const batchRequestBody = {
  requests: [
    { id: "1", method: "GET", url: "/me" },
    { id: "2", method: "GET", url: "/me/messages?$top=5&$select=subject" },
  ],
};

const batchResponse = await graphClient.api("/$batch").post(batchRequestBody);

const meResponse = batchResponse.responses.find((r: any) => r.id === "1");
const messagesResponse = batchResponse.responses.find((r: any) => r.id === "2");
```

## Delta queries

```typescript
// First sync
let response = await graphClient.api("/users/delta").get();
const users: any[] = [];

while (response["@odata.nextLink"]) {
  users.push(...response.value);
  response = await graphClient.api(response["@odata.nextLink"]).get();
}
users.push(...response.value);

const deltaLink: string = response["@odata.deltaLink"];
// Store deltaLink durably for next sync run

// Next sync — only changes
const changesResponse = await graphClient.api(deltaLink).get();
```

## Throttling / retry middleware

The SDK includes retry middleware by default. For explicit configuration:

```typescript
import {
  Client,
  RetryHandlerOptions,
  RetryHandler,
  MiddlewareFactory,
} from "@microsoft/microsoft-graph-client";

const retryOptions = new RetryHandlerOptions({ maxRetries: 5 });
const middleware = MiddlewareFactory.getDefaultMiddlewareChain(authProvider);

const graphClient = Client.initWithMiddleware({ middleware });
```

Always honour the `Retry-After` header value — do not use fixed backoff when Graph specifies a wait time.

## TypeScript-specific guidance

- Import types from `@microsoft/microsoft-graph-types` for full IntelliSense on Graph resources.
- The `.api()` chain returns `any` — cast to the appropriate type from `@microsoft/microsoft-graph-types`.
- For ESM projects, use the `/index.js` path suffix on deep imports (e.g., `azureTokenCredentials/index.js`).
- Use `async`/`await` consistently — all Graph calls return Promises.
- Singleton the `graphClient` in application-level code (e.g., Express app init); for OBO flows, construct per-request.
- In Node.js 18+, `fetch` is available natively — no polyfill needed.

```typescript
// Type-safe response example
import { MessageCollectionResponse } from "@microsoft/microsoft-graph-types";

const response: MessageCollectionResponse = await graphClient
  .api("/me/messages")
  .select("subject,from")
  .get();

const messages = response.value ?? [];
```
