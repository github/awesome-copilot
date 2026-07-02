# workflow.message-native-records-ts

## purpose

Implement the "structured records as message objects" pattern where workflow state renders inline as durable, updatable Adaptive Cards tied to backing store rows and anchored in threads.

## rules

1. **Every workflow record is an Adaptive Card backed by a store row.** The card is the visual representation; the list/dataverse row is the source of truth. Card actions read from and write to the store, then refresh the card to reflect current state.
2. **Use `Action.Execute` with `verb` for all record mutations.** `Action.Execute` triggers a server-side `adaptiveCard/action` invoke, allowing the bot to update the backing store and return a refreshed card in one round-trip. Never use `Action.Submit` for records — it doesn't support card refresh. [adaptivecards.io -- Action.Execute](https://adaptivecards.io/explorer/Action.Execute.html)
3. **Return the updated card from the invoke response.** The `adaptiveCard/action` invoke handler must return `{ status: 200, body: { statusCode: 200, type: "application/vnd.microsoft.card.adaptive", value: <updated-card> } }` (Teams SDK v2 contract). Teams replaces the original card in-place — no new message needed.
4. **Store the record ID in `Action.Execute.data`.** Every action button must include the backing store record ID (e.g., `{ verb: "approve", recordId: "item-123" }`) so the handler can look up and mutate the correct row.
5. **Embed record metadata in the card body.** Display the record's key fields (status, requester, timestamps) directly in the card using `TextBlock` and `FactSet`. Users should see the full record state without clicking or navigating.
6. **Use `refresh` property for user-specific views.** Adaptive Cards support a `refresh` block that triggers an automatic `adaptiveCard/action` invoke when specific users view the card. Use this to show role-specific actions (approver sees approve/reject; requester sees cancel). [learn.microsoft.com -- Universal Actions](https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/universal-actions-for-adaptive-cards/overview)
7. **Anchor records to threads, not top-level messages.** When a workflow creates a record, send the card as a reply to the originating message. This keeps the record contextually linked to the conversation that triggered it. Store the reply `activityId` on the backing row for future updates.
8. **Update existing cards via `activity.updateActivity()`.** When the backing store changes (webhook, timer, external update), look up the stored `activityId` and `conversationId`, then call `updateActivity()` to refresh the card in-place. This keeps the thread's record card always current.
9. **Design cards for three lifecycle states.** Every record card should have variants for: (a) **Active** — shows current data + action buttons, (b) **Completed** — shows final state, no action buttons, (c) **Error** — shows what went wrong + retry button. Map these to the backing store's status field.
10. **Keep cards self-contained.** A record card should display enough information that users never need to open the SharePoint list or external system. The card IS the workflow interface.
11. **Use `ColumnSet` for compact record layouts.** For list views (multiple records in one message), use `ColumnSet` with `Column` elements to create table-like layouts. Each row is a record summary with an inline action button.

## patterns

### Record card with Action.Execute

```typescript
function buildRecordCard(record: WorkflowRecord): object {
  const isActive = record.status === "Pending";

  return {
    type: "AdaptiveCard",
    version: "1.5",
    refresh: {
      action: {
        type: "Action.Execute",
        verb: "refreshRecord",
        data: { recordId: record.id },
      },
      userIds: [record.approverId], // Only approver gets auto-refresh
    },
    body: [
      {
        type: "TextBlock",
        text: record.title,
        weight: "Bolder",
        size: "Medium",
      },
      {
        type: "FactSet",
        facts: [
          { title: "Requester", value: record.requesterName },
          { title: "Status", value: record.status },
          { title: "Created", value: new Date(record.created).toLocaleDateString() },
          ...(record.resolvedBy
            ? [{ title: "Resolved by", value: record.resolvedBy }]
            : []),
        ],
      },
      { type: "TextBlock", text: record.description, wrap: true },
    ],
    actions: isActive
      ? [
          {
            type: "Action.Execute",
            title: "Approve",
            verb: "approve",
            data: { recordId: record.id },
            style: "positive",
          },
          {
            type: "Action.Execute",
            title: "Reject",
            verb: "reject",
            data: { recordId: record.id },
            style: "destructive",
          },
        ]
      : [], // No actions on completed/rejected records
  };
}
```

### Handle Action.Execute invoke and refresh card

```typescript
app.on("card.action", async (ctx) => {
  const { verb, recordId } = ctx.activity.value?.action?.data ?? {};

  if (verb === "approve" || verb === "reject") {
    // Update backing store
    const newStatus = verb === "approve" ? "Approved" : "Rejected";
    await graphClient
      .api(`/sites/${siteId}/lists/${listId}/items/${recordId}/fields`)
      .patch({
        Status: newStatus,
        ApprovedBy: ctx.activity.from?.name,
        ResolvedDate: new Date().toISOString(),
      });

    // Fetch updated record
    const updated = await graphClient
      .api(`/sites/${siteId}/lists/${listId}/items/${recordId}`)
      .expand("fields")
      .get();

    // Return refreshed card (replaces original in-place)
    return {
      status: 200,
      body: {
        statusCode: 200,
        type: "application/vnd.microsoft.card.adaptive",
        value: buildRecordCard(mapListItemToRecord(updated)),
      },
    };
  }

  if (verb === "refreshRecord") {
    const item = await graphClient
      .api(`/sites/${siteId}/lists/${listId}/items/${recordId}`)
      .expand("fields")
      .get();

    return {
      status: 200,
      body: {
        statusCode: 200,
        type: "application/vnd.microsoft.card.adaptive",
        value: buildRecordCard(mapListItemToRecord(item)),
      },
    };
  }
});
```

### Update a card in-place when backing store changes

```typescript
async function updateRecordCardInThread(
  adapter: any,
  record: WorkflowRecord
) {
  const conversationRef = {
    channelId: "msteams",
    conversation: { id: record.conversationId },
    serviceUrl: record.serviceUrl,
  };

  await adapter.continueConversation(conversationRef, async (turnContext: any) => {
    const updatedCard = buildRecordCard(record);
    const activity = {
      id: record.cardActivityId, // stored when card was first sent
      type: "message",
      attachments: [{
        contentType: "application/vnd.microsoft.card.adaptive",
        content: updatedCard,
      }],
    };
    await turnContext.updateActivity(activity);
  });
}
```

### Multi-record list view

```typescript
function buildRecordListCard(records: WorkflowRecord[]): object {
  return {
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      {
        type: "TextBlock",
        text: `Pending Requests (${records.length})`,
        weight: "Bolder",
        size: "Medium",
      },
      ...records.map((r) => ({
        type: "ColumnSet",
        columns: [
          {
            type: "Column",
            width: "stretch",
            items: [
              { type: "TextBlock", text: r.title, weight: "Bolder" },
              { type: "TextBlock", text: `${r.requesterName} - ${r.status}`, isSubtle: true, spacing: "None" },
            ],
          },
          {
            type: "Column",
            width: "auto",
            items: [
              {
                type: "ActionSet",
                actions: [{
                  type: "Action.Execute",
                  title: "View",
                  verb: "viewRecord",
                  data: { recordId: r.id },
                }],
              },
            ],
          },
        ],
      })),
    ],
  };
}
```

## pitfalls

- **`Action.Submit` does not refresh cards.** Only `Action.Execute` returns an updated card via invoke response. Using `Action.Submit` sends a regular message activity — the original card stays unchanged.
- **`refresh.userIds` is limited to 60 users.** Cards with more than 60 users in the refresh list will not auto-refresh for anyone beyond the limit. For high-traffic channels, use explicit update calls instead of refresh.
- **Card update requires the original `activityId`.** You must store the `activityId` returned when the card was first sent. Without it, you cannot update the card in-place. Store it on the backing row immediately after sending.
- **Card size limit: 40 KB.** Adaptive Cards cannot exceed 40 KB. Multi-record list views must paginate. Show 5-10 records per card with "Show more" action.
- **Thread replies require `replyToId`.** To anchor a record card in a thread, set `activity.replyToId` to the parent message's `activityId`. Without this, the card posts as a new top-level message.
- **Universal Actions require bot registration.** `Action.Execute` only works when the card is sent by a registered bot. Cards sent via connectors or webhooks cannot use `Action.Execute`.

## references

- https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/universal-actions-for-adaptive-cards/overview
- https://adaptivecards.io/explorer/Action.Execute.html
- https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/update-and-delete-bot-messages
- https://learn.microsoft.com/en-us/adaptive-cards/authoring-cards/universal-action-model

## instructions

Use this expert when implementing the card-as-record pattern: Adaptive Cards that represent durable workflow records, update in-place via Action.Execute, and stay anchored in threads. Pair with `workflow.sharepoint-lists-ts.md` for the backing store, `workflow.approvals-inline-ts.md` for approval-specific record flows, and `ui.adaptive-cards-ts.md` for general card construction patterns.

## research

Deep Research prompt:

"Write a micro expert on implementing structured records as message objects in Microsoft Teams using Adaptive Cards with Action.Execute (TypeScript). Cover: card-as-record pattern with backing store sync, Action.Execute invoke handling with card refresh, user-specific refresh views, in-place card updates via updateActivity, thread anchoring with replyToId, multi-record list views, and lifecycle state management (active/completed/error). Include canonical patterns for approval records and query result rendering."
