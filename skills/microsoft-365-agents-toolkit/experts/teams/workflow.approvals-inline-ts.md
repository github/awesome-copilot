# workflow.approvals-inline-ts

## purpose

Implement in-channel approval workflows that stay embedded in threads as interactive Adaptive Cards with state persistence, routing logic, and escalation — the bot-native alternative to Power Automate Approvals.

## rules

1. **Approvals are a state machine: Pending -> Approved|Rejected|Escalated.** Model every approval as an explicit state machine. Store the current state, assignee, and history on the backing record. Never rely on card UI state alone — the backing store is the source of truth.
2. **Use `Action.Execute` for approve/reject actions.** Each approval card has Approve and Reject buttons as `Action.Execute` with `verb: "approve"` / `verb: "reject"` and the record ID in `data`. The invoke handler updates the backing store and returns a refreshed read-only card.
3. **Support three routing patterns: single, sequential, parallel.** (a) **Single**: one approver, one decision. (b) **Sequential (chain)**: approver 1 must approve before approver 2 sees the request. (c) **Parallel**: all approvers see the request simultaneously; configurable as "any" (first response wins) or "all" (unanimous required).
4. **Use `refresh.userIds` for approver-specific card views.** Only the assigned approver should see action buttons. Other viewers see a read-only status card. Set `refresh.userIds` to the current approver's AAD ID. The refresh invoke returns the appropriate card variant.
5. **Persist approval history as an array on the record.** Store `[{ approver, action, timestamp, comment }]` on the backing row. This provides a complete audit trail rendered in the card's history section.
6. **Send the approval card as a thread reply.** Anchor the approval to the request's originating message via `replyToId`. This keeps the approval decision visible in context, not lost in the channel timeline.
7. **Implement escalation timers.** When an approval has been pending for a configurable duration (e.g., 24 hours), either send a reminder to the current approver or auto-escalate to their manager. Look up the manager via Graph: `GET /users/{userId}/manager`.
8. **Update the card in-place on every state transition.** After approve, reject, escalate, or reassign, call `updateActivity()` with the refreshed card. The thread always shows the current state without duplicate messages.
9. **Support optional comments on approve/reject.** Add an `Input.Text` field that appears alongside approve/reject buttons. The `Action.Execute.data` includes the comment, which is stored in the approval history.
10. **Notify the requester on resolution.** When the approval is finalized (approved or rejected), send a proactive message or @mention the requester in the thread with the outcome.

## patterns

### Approval record type

```typescript
interface ApprovalRecord {
  id: string;
  title: string;
  description: string;
  requesterId: string;
  requesterName: string;
  status: "Pending" | "Approved" | "Rejected" | "Escalated";
  routingType: "single" | "sequential" | "parallel-any" | "parallel-all";
  approvers: ApproverEntry[];
  history: ApprovalHistoryEntry[];
  conversationId: string;
  cardActivityId: string;
  serviceUrl: string;
  createdAt: string;
  resolvedAt?: string;
}

interface ApproverEntry {
  userId: string;
  displayName: string;
  order: number; // For sequential routing
  decision?: "approved" | "rejected";
  decidedAt?: string;
}

interface ApprovalHistoryEntry {
  actor: string;
  action: string;
  comment?: string;
  timestamp: string;
}
```

### Build approval card with role-specific actions

```typescript
function buildApprovalCard(record: ApprovalRecord, viewerUserId: string): object {
  const isApprover = record.approvers.some(
    (a) => a.userId === viewerUserId && !a.decision
  );
  const isPending = record.status === "Pending";

  return {
    type: "AdaptiveCard",
    version: "1.5",
    refresh: {
      action: {
        type: "Action.Execute",
        verb: "refreshApproval",
        data: { recordId: record.id },
      },
      userIds: record.approvers
        .filter((a) => !a.decision)
        .map((a) => a.userId),
    },
    body: [
      { type: "TextBlock", text: "Approval Request", weight: "Bolder", size: "Medium" },
      {
        type: "FactSet",
        facts: [
          { title: "From", value: record.requesterName },
          { title: "Status", value: record.status },
          { title: "Type", value: record.routingType },
          { title: "Created", value: new Date(record.createdAt).toLocaleString() },
        ],
      },
      { type: "TextBlock", text: record.description, wrap: true },
      // Approval history
      ...(record.history.length > 0
        ? [
            { type: "TextBlock", text: "History", weight: "Bolder", spacing: "Medium" },
            ...record.history.map((h) => ({
              type: "TextBlock",
              text: `${h.actor}: ${h.action}${h.comment ? ` - "${h.comment}"` : ""} (${new Date(h.timestamp).toLocaleString()})`,
              isSubtle: true,
              wrap: true,
              spacing: "None",
            })),
          ]
        : []),
      // Comment input (only for pending approvers)
      ...(isApprover && isPending
        ? [{
            type: "Input.Text",
            id: "comment",
            placeholder: "Optional comment...",
            isMultiline: false,
          }]
        : []),
    ],
    actions:
      isApprover && isPending
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
        : [],
  };
}
```

### Handle approval action with routing logic

```typescript
app.on("card.action", async (ctx) => {
  const { verb, recordId } = ctx.activity.value?.action?.data ?? {};
  const comment = ctx.activity.value?.action?.data?.comment;
  const actorId = ctx.activity.from?.aadObjectId!;
  const actorName = ctx.activity.from?.name ?? "Unknown";

  if (verb !== "approve" && verb !== "reject" && verb !== "refreshApproval") return;

  const record = await getApprovalRecord(recordId);
  if (!record) return { status: 200, body: { statusCode: 200, type: "application/vnd.microsoft.card.adaptive", value: {} } };

  if (verb === "refreshApproval") {
    return {
      status: 200,
      body: {
        statusCode: 200,
        type: "application/vnd.microsoft.card.adaptive",
        value: buildApprovalCard(record, actorId),
      },
    };
  }

  // Record the decision
  const approver = record.approvers.find((a) => a.userId === actorId && !a.decision);
  if (!approver) {
    return { status: 200, body: { statusCode: 200, type: "application/vnd.microsoft.card.adaptive", value: buildApprovalCard(record, actorId) } };
  }

  approver.decision = verb === "approve" ? "approved" : "rejected";
  approver.decidedAt = new Date().toISOString();
  record.history.push({
    actor: actorName,
    action: verb === "approve" ? "Approved" : "Rejected",
    comment,
    timestamp: new Date().toISOString(),
  });

  // Evaluate routing
  record.status = evaluateApprovalStatus(record);

  // If sequential and approved, notify next approver
  if (record.status === "Pending" && record.routingType === "sequential") {
    const nextApprover = record.approvers.find((a) => !a.decision);
    if (nextApprover) {
      // Proactive notify next approver
      await notifyApprover(nextApprover, record);
    }
  }

  // Persist
  await updateApprovalRecord(record);

  // Notify requester on resolution
  if (record.status === "Approved" || record.status === "Rejected") {
    record.resolvedAt = new Date().toISOString();
    await notifyRequester(record);
  }

  return {
    status: 200,
    body: {
      statusCode: 200,
      type: "application/vnd.microsoft.card.adaptive",
      value: buildApprovalCard(record, actorId),
    },
  };
});

function evaluateApprovalStatus(record: ApprovalRecord): ApprovalRecord["status"] {
  const decisions = record.approvers.filter((a) => a.decision);

  switch (record.routingType) {
    case "single":
      return decisions[0]?.decision === "approved" ? "Approved" : "Rejected";

    case "sequential":
      if (decisions.some((d) => d.decision === "rejected")) return "Rejected";
      if (decisions.length === record.approvers.length) return "Approved";
      return "Pending";

    case "parallel-any":
      if (decisions.some((d) => d.decision === "approved")) return "Approved";
      if (decisions.length === record.approvers.length) return "Rejected";
      return "Pending";

    case "parallel-all":
      if (decisions.some((d) => d.decision === "rejected")) return "Rejected";
      if (decisions.length === record.approvers.length) return "Approved";
      return "Pending";

    default:
      return "Pending";
  }
}
```

### Escalation timer

```typescript
async function startEscalationTimer(record: ApprovalRecord, timeoutMs: number = 24 * 60 * 60 * 1000) {
  setTimeout(async () => {
    const current = await getApprovalRecord(record.id);
    if (current?.status !== "Pending") return; // Already resolved

    // Look up manager
    const pendingApprover = current.approvers.find((a) => !a.decision);
    if (!pendingApprover) return;

    const manager = await graphClient
      .api(`/users/${pendingApprover.userId}/manager`)
      .get();

    current.status = "Escalated";
    current.history.push({
      actor: "System",
      action: `Escalated to ${manager.displayName} (timeout after ${timeoutMs / 3600000}h)`,
      timestamp: new Date().toISOString(),
    });

    // Replace approver with manager
    pendingApprover.userId = manager.id;
    pendingApprover.displayName = manager.displayName;
    current.status = "Pending"; // Reset to pending for new approver

    await updateApprovalRecord(current);
    await updateRecordCardInThread(adapter, current);
  }, timeoutMs);
}
```

## pitfalls

- **`refresh.userIds` max 60 users.** Parallel approvals with more than 60 approvers won't auto-refresh. For large groups, send individual proactive messages instead of relying on card refresh.
- **Race condition on parallel approvals.** Two approvers clicking simultaneously can both read "Pending" and both write. Use optimistic concurrency (etag on the list item) or a queue to serialize decision processing.
- **Comment input value location varies.** In `Action.Execute`, input values may be in `ctx.activity.value.action.data` (merged with action data) or `ctx.activity.value.data` depending on the Teams client version. Check both locations.
- **Escalation timers don't survive restarts.** For production, persist escalation deadlines to the backing store and use a polling reconciliation loop or Azure Durable Functions.
- **Sequential chain can stall.** If an approver in a sequential chain is unavailable, the entire workflow blocks. Implement auto-escalation timeouts for each step, not just the final deadline.
- **Card replacement removes input state.** When the card refreshes after an action, any text the user typed in other input fields is lost. Keep input fields minimal on approval cards.

## references

- https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/universal-actions-for-adaptive-cards/overview
- https://learn.microsoft.com/en-us/graph/api/user-list-manager
- https://adaptivecards.io/explorer/Action.Execute.html

## instructions

Use this expert when building in-channel approval workflows. Covers approval state machine, single/sequential/parallel routing, role-specific card views with refresh, approval history, optional comments, escalation timers, and requester notification. Pair with `workflow.message-native-records-ts.md` for the card-as-record pattern, `workflow.sharepoint-lists-ts.md` for persisting approval records, and `runtime.proactive-messaging-ts.md` for notifications.

## research

Deep Research prompt:

"Write a micro expert on in-channel approval workflows in Microsoft Teams using Adaptive Cards with Action.Execute (TypeScript). Cover: approval state machine, single/sequential/parallel routing patterns, role-specific card views with refresh.userIds, approval history tracking, optional comments, escalation timers with manager lookup via Graph, requester notification on resolution, and optimistic concurrency for parallel decisions. Include complete patterns for the approval record type, card builder, action handler with routing evaluation, and escalation timer."
