# workflow.sharepoint-lists-ts

## purpose

Integrate SharePoint Lists as the structured state store for message-native workflows in Teams bots, covering CRUD via Graph API, inline card rendering, and bidirectional sync between threads and list rows.

## rules

1. **Use Microsoft Graph REST API for all List operations.** Access SharePoint Lists via `https://graph.microsoft.com/v1.0/sites/{site-id}/lists/{list-id}/items`. Requires `Sites.ReadWrite.All` or `Sites.Manage.All` delegated/application permissions. [learn.microsoft.com -- Lists API](https://learn.microsoft.com/en-us/graph/api/resources/list)
2. **Prefer app-only tokens for bot-initiated List operations.** Bot workflows typically run without user context. Use client credentials flow (`ConfidentialClientApplication`) to get app-only tokens. This avoids per-user consent and works for background automation. [learn.microsoft.com -- App-only access](https://learn.microsoft.com/en-us/graph/auth-v2-service)
3. **Create lists programmatically with column definitions.** Define list schemas in code for reproducible deployment. Use `POST /sites/{site-id}/lists` with `columns` array specifying `text`, `number`, `dateTime`, `choice`, `personOrGroup`, and `boolean` column types. [learn.microsoft.com -- Create list](https://learn.microsoft.com/en-us/graph/api/list-create)
4. **Map workflow fields to list columns explicitly.** Each workflow record type (PTO request, equipment booking, account status) should have a corresponding list with typed columns. Use `personOrGroup` for requester/approver, `dateTime` for timestamps, `choice` for status enums (pending/approved/rejected).
5. **Store the thread activity ID on the list item.** Add a `ThreadActivityId` text column to every workflow list. When a workflow record is created from a message, store the originating `activity.id` and `conversation.id`. This enables bidirectional linking: card-to-record and record-to-thread.
6. **Use `$filter` and `$orderby` for querying.** Graph supports OData filtering on list items: `GET /sites/{site-id}/lists/{list-id}/items?$filter=fields/Status eq 'pending'&$orderby=fields/Created desc&$expand=fields`. Always `$expand=fields` to get column values. [learn.microsoft.com -- Query items](https://learn.microsoft.com/en-us/graph/api/listitem-list)
7. **Batch multiple list operations with JSON batching.** When a workflow step creates/updates multiple records, use Graph JSON batching (`POST /$batch`) to send up to 20 requests in one call. Reduces latency and avoids per-request throttling. [learn.microsoft.com -- Batching](https://learn.microsoft.com/en-us/graph/json-batching)
8. **Subscribe to list changes via Graph webhooks.** Use `POST /subscriptions` with `changeType: "updated,created"` on `/sites/{site-id}/lists/{list-id}/items` to receive notifications when records change outside the bot (e.g., direct list edits). Post updates back to the originating thread. [learn.microsoft.com -- Webhooks](https://learn.microsoft.com/en-us/graph/webhooks)
9. **Handle throttling with retry-after headers.** Graph API returns 429 with `Retry-After` header when throttled. Implement exponential backoff. SharePoint-specific limits: 600 requests per minute per app per tenant for app-only; tighter per-user limits for delegated. [learn.microsoft.com -- Throttling](https://learn.microsoft.com/en-us/graph/throttling)
10. **Use Lists for SMB/Frontline; Dataverse for enterprise.** Lists are included in M365 licensing with no extra cost. Dataverse requires Power Platform premium licensing. For the message-native workflow vision targeting SMB (2.6% adoption) and Frontline (0.5%), Lists are the right default.
11. **Render list records as Adaptive Cards, not raw text.** Every query result should return a structured Adaptive Card with field labels, values, and action buttons (edit, approve, archive). This makes records first-class message objects per the message-native vision.

## patterns

### Create a workflow list programmatically

```typescript
import { Client } from "@microsoft/microsoft-graph-client";

async function createWorkflowList(graphClient: Client, siteId: string) {
  const list = await graphClient.api(`/sites/${siteId}/lists`).post({
    displayName: "PTO Requests",
    list: { template: "genericList" },
    columns: [
      { name: "Requester", personOrGroup: {} },
      { name: "StartDate", dateTime: { format: "dateOnly" } },
      { name: "EndDate", dateTime: { format: "dateOnly" } },
      { name: "Status", choice: { choices: ["Pending", "Approved", "Rejected"] } },
      { name: "ApprovedBy", personOrGroup: {} },
      { name: "ThreadActivityId", text: {} },
      { name: "ConversationId", text: {} },
      { name: "HoursRequested", number: {} },
    ],
  });
  return list.id;
}
```

### Create a list item from a message handler

```typescript
app.message(/^\/pto\s+(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})$/i, async (ctx) => {
  const [, startDate, endDate] = ctx.activity.text!.match(
    /\/pto\s+(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/i
  )!;

  const item = await graphClient
    .api(`/sites/${siteId}/lists/${listId}/items`)
    .post({
      fields: {
        Title: `PTO - ${ctx.activity.from?.name}`,
        StartDate: startDate,
        EndDate: endDate,
        Status: "Pending",
        RequesterId: ctx.activity.from?.aadObjectId,
        ThreadActivityId: ctx.activity.id,
        ConversationId: ctx.activity.conversation?.id,
      },
    });

  await ctx.send({
    attachments: [{
      contentType: "application/vnd.microsoft.card.adaptive",
      content: buildPtoCard(item.fields, item.id),
    }],
  });
});
```

### Query list items and render as cards

```typescript
async function queryPendingRequests(graphClient: Client, siteId: string, listId: string) {
  const response = await graphClient
    .api(`/sites/${siteId}/lists/${listId}/items`)
    .filter("fields/Status eq 'Pending'")
    .orderby("fields/Created desc")
    .expand("fields")
    .top(10)
    .get();

  return response.value.map((item: any) => ({
    id: item.id,
    ...item.fields,
  }));
}
```

### Subscribe to list changes

```typescript
async function subscribeToListChanges(graphClient: Client, siteId: string, listId: string, webhookUrl: string) {
  await graphClient.api("/subscriptions").post({
    changeType: "created,updated",
    notificationUrl: webhookUrl,
    resource: `/sites/${siteId}/lists/${listId}/items`,
    expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days max
    clientState: "workflow-list-subscription",
  });
}
```

## pitfalls

- **`$expand=fields` is mandatory.** Without it, list item responses contain only metadata (id, createdDateTime) — no column values. Every query must include `$expand=fields`.
- **Column internal names differ from display names.** SharePoint generates internal names by removing spaces and special characters. `"Start Date"` becomes `StartDate` on creation, but existing lists may have `Start_x0020_Date`. Always verify internal names via `GET /sites/{site-id}/lists/{list-id}/columns`.
- **PersonOrGroup columns store IDs, not names.** You must resolve display names separately via Graph user lookups. Store the AAD object ID and resolve at render time.
- **List item limit: 30 million items per list.** Sufficient for most SMB workflows, but high-volume frontline operations (break logs across thousands of stores) may approach this. Archive completed records periodically.
- **Graph webhook subscriptions expire.** Maximum lifetime is 30 days for list items. Implement a renewal timer that refreshes subscriptions before expiry.
- **Delegated vs app-only permissions differ.** App-only tokens cannot use `$filter` on certain column types (personOrGroup) in some tenants. Test thoroughly with your permission model.

## references

- https://learn.microsoft.com/en-us/graph/api/resources/list
- https://learn.microsoft.com/en-us/graph/api/listitem-list
- https://learn.microsoft.com/en-us/graph/api/list-create
- https://learn.microsoft.com/en-us/graph/json-batching
- https://learn.microsoft.com/en-us/graph/webhooks
- https://learn.microsoft.com/en-us/graph/throttling
- https://learn.microsoft.com/en-us/graph/auth-v2-service

## instructions

Use this expert when building Teams bot workflows that persist structured state to SharePoint Lists. Covers list creation, CRUD operations via Graph, querying with OData filters, webhook subscriptions for change notifications, and rendering records as Adaptive Cards. Pair with `workflow.message-native-records-ts.md` for card-as-record patterns, `workflow.approvals-inline-ts.md` for approval state persistence, and `ai.conversational-query-ts.md` for NL querying over list data.

## research

Deep Research prompt:

"Write a micro expert on SharePoint Lists integration from Microsoft Teams bots using Graph API (TypeScript). Cover: list creation with typed columns, CRUD operations on list items, OData filtering and sorting, Graph JSON batching, webhook subscriptions for change notifications, app-only vs delegated permissions, throttling and retry patterns, and rendering list records as Adaptive Cards. Include canonical patterns for PTO request and equipment tracking workflows."
