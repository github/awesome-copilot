---
name: msgraph-sdk
description: 'Integrate Microsoft Graph SDK into any project — .NET, TypeScript/JavaScript, or Python. Covers auth patterns (client credentials, OBO, managed identity), SDK setup, calling Graph APIs, batching, delta queries, change notifications, throttling, and permission scopes. Use when accessing Microsoft 365 data (users, mail, calendar, Teams, files, SharePoint) from any application type.'
---

# Microsoft Graph SDK

Use this skill when integrating Microsoft Graph into an application to access Microsoft 365 data and services.

Always ground implementation in the current Microsoft Graph SDK documentation and SDK version for the target language rather than relying on memory alone.

## Determine the target language first

1. Use the **.NET** workflow when the project contains `.cs`, `.csproj`, or `.sln` files, or when the user asks for C# guidance. Follow [references/dotnet.md](references/dotnet.md).
2. Use the **TypeScript / JavaScript** workflow when the project contains `package.json`, `.ts`, or `.js` files, or when the user asks for Node.js / browser guidance. Follow [references/typescript.md](references/typescript.md).
3. Use the **Python** workflow when the project contains `.py`, `pyproject.toml`, or `requirements.txt`, or when the user asks for Python guidance. Follow [references/python.md](references/python.md).
4. If multiple languages are present, match the language of the files being edited or ask the user.

## Always consult live documentation

- Microsoft Graph overview: <https://learn.microsoft.com/graph/overview>
- Graph Explorer (try calls live): <https://developer.microsoft.com/graph/graph-explorer>
- Graph permissions reference: <https://learn.microsoft.com/graph/permissions-reference>
- Use Microsoft Docs MCP tooling when available to fetch current API shapes and SDK samples.

## Authentication — choose the right pattern

Selecting the wrong auth flow is the most common Graph integration mistake. Apply this decision tree before writing any auth code:

| Scenario | Flow to use |
|---|---|
| Background service / daemon with no user | **Client credentials** (app-only) |
| Agent or API acting on behalf of a signed-in user | **On-Behalf-Of (OBO)** |
| App running in Azure (Function, Container App, VM) | **Managed Identity** (preferred over secrets) |
| CLI tool or local dev script | **Device code** or **interactive browser** |
| Single-page app (browser only) | **Authorization code + PKCE** |

- Never use client credentials when a user context is required — Graph enforces this at the permission level (application vs. delegated).
- Prefer `DefaultAzureCredential` in Azure-hosted apps; it tries managed identity first and falls back gracefully for local dev.
- Never hardcode secrets. Use environment variables, Azure Key Vault, or the Secret Manager.

## Core SDK usage patterns

### Building the client

Always construct `GraphServiceClient` once and reuse it (it manages token caching internally).

Pass a credential from the Azure Identity library — never build raw HTTP clients manually.

### Making calls

- Use the fluent builder API: `client.Users[userId].Messages.GetAsync(...)`.
- Always `await` async calls.
- Specify `$select` to limit returned fields — Graph returns large default payloads.
- Use `$filter` server-side rather than filtering returned collections in memory.
- Use `$expand` to fetch related resources in a single call when relationships are small.

### Pagination

Graph paginates collections. Never assume all items arrive in one response:
- Check for an `@odata.nextLink` on the response.
- Use the SDK's `PageIterator` helper (available in all three SDKs) to walk pages automatically.
- Set `$top` to control page size (max varies by resource, typically 999).

## Advanced patterns

### Batch requests

Combine up to 20 independent Graph calls into a single HTTP request using the `$batch` endpoint. Use batching when:
- Initializing data for a dashboard or agent that needs multiple resources upfront.
- Reducing latency in high-call-count operations.

Batch responses arrive out of order — match them by the `id` field you assigned each request.

### Delta queries

Use delta queries to sync changes incrementally instead of polling full collections:
- First call: `GET /users/delta` returns all items + a `@odata.deltaLink`.
- Subsequent calls: use the `deltaLink` to receive only what changed since the last sync.
- Supported on: users, groups, messages, calendar events, Teams channels, and more.
- Store the `deltaLink` durably (database, blob) between sync runs.

### Change notifications (webhooks)

Subscribe to resource changes with `POST /subscriptions`:
- Graph delivers change events to your HTTPS notification URL.
- Subscriptions expire — renew them before `expirationDateTime` (max varies by resource; typically 1–3 days for mail/calendar, up to 4230 minutes for users/groups).
- Validate the subscription handshake: Graph sends a `validationToken` query parameter on creation — echo it back as plain text with HTTP 200.
- Use lifecycle notifications (`notificationUrl` + `lifecycleNotificationUrl`) to handle missed events and reauthorization.
- For high-volume scenarios prefer **change notifications with resource data** (requires additional encryption setup).

### Throttling

Graph throttles aggressively. Always handle HTTP 429:
- Read the `Retry-After` header — it specifies exact seconds to wait, not a fixed backoff.
- The SDK's built-in retry middleware handles 429 automatically when configured; enable it explicitly.
- Avoid fan-out patterns that hit Graph with hundreds of parallel requests; use batching or queuing instead.

## Permissions

Get permissions right before writing auth code — wrong scopes result in 403 errors that are hard to debug later.

- Application permissions run without a user (daemon / service). Require admin consent.
- Delegated permissions run in the context of a signed-in user. Some require admin consent.
- Request the **minimum permissions** needed. Graph's permission reference lists least-privilege options for every operation.
- Use the Graph Explorer to test which permissions a call actually requires before coding.
- In Azure app registrations: grant API permissions → Microsoft Graph → select type (Application or Delegated) → grant admin consent where required.

## Common Graph resources — quick reference

| Goal | Resource path |
|---|---|
| Get signed-in user's profile | `GET /me` |
| List user's mailbox messages | `GET /me/messages` |
| Send an email | `POST /me/sendMail` |
| List calendar events | `GET /me/events` |
| Get user's OneDrive root | `GET /me/drive/root/children` |
| List Teams the user is in | `GET /me/joinedTeams` |
| Post a Teams channel message | `POST /teams/{id}/channels/{id}/messages` |
| List SharePoint site lists | `GET /sites/{siteId}/lists` |
| Search across M365 | `POST /search/query` |
| List all users in tenant (app-only) | `GET /users` |
| Get group members | `GET /groups/{id}/members` |

In similar fashion, use the SDK's fluent API to navigate to these resources in code.

## Workflow

1. Determine the target language and read the matching reference file.
2. Identify the auth scenario and choose the correct flow from the table above.
3. Fetch current SDK docs and Graph Explorer examples before making implementation choices.
4. Apply least-privilege permissions — confirm in the Graph permissions reference.
5. Implement pagination from the start — don't assume single-page responses.
6. Enable retry middleware for throttling from day one.
7. For syncing scenarios, prefer delta queries over polling.
8. Use the language-specific package names, auth provider setup, and code patterns from the chosen reference file.

## Completion criteria

- Auth flow matches the scenario (not defaulting to client credentials for user-context calls).
- `GraphServiceClient` is constructed once and reused.
- All collection reads handle pagination.
- Throttling (429) is handled via retry middleware or explicit `Retry-After` logic.
- Permissions are scoped to the minimum required.
- No secrets or credentials are hardcoded.
- Code matches current SDK version patterns for the selected language.
