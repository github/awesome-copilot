# Workflow Scenarios

Message-native workflow patterns for Teams bots. These scenarios demonstrate how collaborative business workflows can be initiated, executed, persisted, queried, and displayed entirely within the message surface — no external tools or navigation required.

Each scenario follows the same five-element lifecycle:

| Element | What It Does | Teams API |
|---|---|---|
| **Trigger** | How the workflow starts | Bot commands, message extensions, `node-cron`, Graph change notifications |
| **State** | Where records live | SharePoint Lists via Graph API (or Dataverse for enterprise) |
| **Logic** | How decisions execute | Bot state machine, `Action.Execute` handlers, escalation timers |
| **Intelligence** | How AI is layered over state | Azure OpenAI function calling for NL queries over list data |
| **Visibility** | How records stay in-channel | Adaptive Cards with `Action.Execute` → in-place refresh |

All scenarios are implementable today with a standard Teams bot. No new platform features required.

**Example implementation:** [`examples/message-native-workflow/`](../examples/message-native-workflow/) — Daily Standup with all five pillars.

**Experts:** The `teams/workflow.*` and `bridge/workflow.composable-platform-ts.md` experts provide implementation guidance for each pillar.

---

## Scenario 1: Daily Standup

**Audience:** SMB teams, engineering teams, any recurring check-in cadence.

### User Flow

1. Bot posts a standup prompt card at 9 AM (scheduled trigger) or on `/standup` (command trigger)
2. Each team member fills in yesterday / today / blockers in the card's input fields
3. On submit, `Action.Execute` replaces the prompt with a completed record card in-place
4. Record persisted to SharePoint List with thread link
5. Manager types "show blockers" or "summarize last week" — AI queries the list and renders results

### Five Elements

| Element | Implementation |
|---|---|
| Trigger | `node-cron` scheduled at `STANDUP_CRON` + `/standup` bot command |
| State | SharePoint List: Respondent, Date, Yesterday, Today, Blockers, HasBlockers, ThreadActivityId |
| Logic | Card form submission → record creation. Edit/save state machine via `Action.Execute` |
| Intelligence | `queryStandups(date?, respondent?)`, `queryBlockers(currentOnly?)`, `summarizeStandups(date)` |
| Visibility | Prompt card → record card (in-place). Summary card. Blockers card with per-person breakdown |

### Key Cards

- **Standup prompt** — `Input.Text` fields for yesterday/today/blockers + Submit button
- **Record card** — FactSet showing the response + Edit button
- **Summary card** — response count, blocker count, respondent list
- **Blockers card** — ColumnSet list of all current blockers by person

### Why It Validates the Vision

Exercises structured input (form), durable state (list), in-place updates (Action.Execute), and NL retrieval (AI function calling). This is FHL Option A from the source document.

---

## Scenario 2: Time-Off Requests (PTO)

**Audience:** SMB, any team with leave management.

### User Flow

1. Employee types `/pto 2024-03-15 to 2024-03-22` or uses the "New PTO Request" compose extension
2. Bot creates a PTO record card in the thread with request details + Approve/Reject buttons
3. Manager sees the card with `refresh.userIds` showing action buttons only to them
4. Manager clicks Approve — card refreshes in-place to show "Approved by [Manager]" (read-only)
5. Employee receives a proactive notification in the thread
6. Anyone in the channel can type "show PTO for March" — AI queries and renders results

### Five Elements

| Element | Implementation |
|---|---|
| Trigger | Bot command (`/pto START to END`), message extension action (form with date pickers) |
| State | SharePoint List: Requester, StartDate, EndDate, HoursRequested, Status, ApprovedBy, ThreadActivityId |
| Logic | Single-approver routing. Manager lookup via `GET /users/{id}/manager`. Escalation timer (48h) |
| Intelligence | `queryPtoRequests(status?, requester?, month?)` — "Who has PTO next week?", "Show pending requests" |
| Visibility | Request card (pending, with Approve/Reject) → Approved card (read-only). PTO list card for queries |

### Approval Routing

| Pattern | Behavior |
|---|---|
| Single | One approver (direct manager), one decision |
| Sequential | Manager → Director. Director only sees the card after manager approves |
| Parallel-all | HR + Manager must both approve |

### Role-Specific Card Views

The `refresh` property on the Adaptive Card targets `refresh.userIds` = the current approver's AAD ID. The approver sees Approve/Reject buttons. Everyone else sees a read-only status card. When the approver acts, the card refreshes for all viewers.

---

## Scenario 3: Equipment / Asset Reservation

**Audience:** SMB operations, facilities, shared resource management.

### User Flow

1. Employee types `/book Projector Room-A tomorrow 2pm-4pm`
2. Bot checks for conflicts by querying the list for overlapping reservations
3. If available, bot creates the booking and posts a confirmation card
4. If conflict detected, bot posts a card showing the conflict and suggesting alternatives
5. Late-return alert: if the booking end time passes without a return confirmation, bot sends a reminder
6. Manager types "show all bookings this week" — AI renders a calendar-style summary

### Five Elements

| Element | Implementation |
|---|---|
| Trigger | Bot command (`/book ITEM LOCATION DATE TIME`), message extension search for availability lookup |
| State | SharePoint List: Item, Location, BookedBy, StartTime, EndTime, Status (Active/Returned/Overdue), ThreadActivityId |
| Logic | Conflict detection via `$filter` on overlapping date ranges. Return confirmation via `Action.Execute`. Overdue timer → proactive reminder |
| Intelligence | `queryEquipmentBookings(item?, status?, dateRange?)` — "Is the projector available Friday?", "Show overdue items" |
| Visibility | Booking confirmation card. Conflict card with alternatives. Overdue alert card. Weekly summary card |

### Conflict Detection Query

```
fields/Item eq 'Projector' and fields/Location eq 'Room-A'
  and fields/StartTime lt '2024-03-16T16:00:00Z'
  and fields/EndTime gt '2024-03-16T14:00:00Z'
  and fields/Status eq 'Active'
```

If results > 0, there's a conflict. The bot renders the conflicting bookings and suggests the next available slot.

---

## Scenario 4: Account Health Monitoring (CRM)

**Audience:** Sales teams, account managers, customer success.

### User Flow

1. Weekly scheduled prompt posts to the sales channel: "Time for account health check-ins"
2. Each account owner fills in: Account name, health status (Green/Yellow/Red), notes, next meeting date
3. Responses aggregate into a durable account health list
4. Stale accounts flagged: if no update in 30 days, bot sends a dormant account alert
5. Before a meeting, manager types "summarize Acme Corp" — AI pulls the last 4 check-ins and renders a trend card

### Five Elements

| Element | Implementation |
|---|---|
| Trigger | Weekly cron schedule. Dormant-account check (daily timer queries for last-update > 30 days) |
| State | SharePoint List: AccountName, Owner, HealthStatus (Green/Yellow/Red), Notes, NextMeeting, LastUpdated |
| Logic | Staleness detection: daily timer queries `fields/LastUpdated lt '{30-days-ago}'`. Proactive alert to owner |
| Intelligence | `queryAccountHealth(account?, status?, owner?)` — "Show all red accounts", "Summarize Acme Corp history" |
| Visibility | Check-in prompt card. Account status card (color-coded). Dormant account alert. Trend summary card |

### Trend Analysis

The AI function returns the last N check-ins for an account. The LLM summarizes:

> *"Acme Corp: 4 check-ins over the last month. Trend: Yellow → Yellow → Red → Red. Key issue: delayed contract renewal (first flagged March 1). Next meeting: March 15."*

This is the "intelligence layered over structured state" pattern — the primary differentiation opportunity called out in the source document.

---

## Scenario 5: Frontline Break Management

**Audience:** Frontline workers, call centers (e.g., T-Mobile scenario from source document).

### User Flow

1. Agent changes presence to "Away" (auto-detected via Graph presence subscription)
2. Bot removes agent from call queue and starts break timer
3. At 15 minutes, bot sends a reminder card to the agent and their manager
4. At 20 minutes, bot escalates — posts an alert card in the manager channel
5. Agent changes presence to "Available" — bot re-adds to queue, records break duration
6. Manager types "who is on break?" or "average break duration today" — AI queries and responds

### Five Elements

| Element | Implementation |
|---|---|
| Trigger | Graph change notification subscription on `/communications/presences/{userId}` |
| State | SharePoint List: EmployeeName, BreakStart, BreakEnd, DurationMinutes, Status (Active/Ended/Escalated) |
| Logic | Timer-based escalation (15 min reminder, 20 min escalate). Call queue add/remove via Teams admin APIs. Break record created on "Away", updated on "Available" |
| Intelligence | `queryBreakStatus(currentOnly?)` — "Who is on break right now?", "Average break duration this week" |
| Visibility | Break started card (in manager channel). Reminder card (to agent). Escalation alert card. Break summary card |

### Why This Is Teams-Native

This scenario depends on three capabilities Slack cannot replicate:

| Capability | Teams | Slack |
|---|---|---|
| Presence change subscriptions | Graph `/communications/presences` | Not available |
| Shift schedule integration | Shifts API | Not available |
| Call queue management | Teams admin APIs + Graph | Not available |

### Technical Requirements

- **Graph subscription for presence** requires `Presence.Read.All` application permission and encrypted rich notifications (public/private key pair for notification decryption)
- **Presence subscriptions expire in 60 minutes** — aggressive renewal required (55-minute interval)
- **Webhook must respond in 3 seconds** — process notifications asynchronously
- **In-memory timers don't survive restarts** — use Azure Durable Functions or a Redis-backed job queue for production

---

## Scenario 6: Incident Response

**Audience:** IT operations, DevOps, on-call teams.

### User Flow

1. On-call engineer types `/incident P1 Production database connection pool exhausted`
2. Bot creates an incident record, posts a structured incident card, and creates a dedicated incident thread
3. Bot proactively notifies the on-call rotation (looked up from a Shifts schedule or list)
4. Team members post updates in the thread — bot captures tagged updates (`/update Database restarted, monitoring`)
5. Engineer types `/resolve` — bot closes the incident, calculates MTTR, and posts a resolution summary
6. Post-incident: manager types "show P1 incidents this month" — AI generates a summary with MTTR trends

### Five Elements

| Element | Implementation |
|---|---|
| Trigger | `/incident PRIORITY DESCRIPTION` bot command |
| State | SharePoint List: IncidentId, Priority (P1-P4), Description, Status (Open/Investigating/Resolved), AssignedTo, CreatedAt, ResolvedAt, MTTR, Updates[] |
| Logic | Auto-assign from on-call rotation. Status transitions: Open → Investigating → Resolved. MTTR calculation on resolve. Thread-based update capture |
| Intelligence | `queryIncidents(priority?, status?, dateRange?)` — "Show open incidents", "MTTR trend for P1s this quarter" |
| Visibility | Incident card (color-coded by priority). Update timeline in thread. Resolution summary card with MTTR |

---

## Composable Platform Pattern

All six scenarios follow the same lifecycle. The composable platform approach (see `bridge/workflow.composable-platform-ts.md`) defines workflows as configuration:

```typescript
interface WorkflowDefinition {
  id: string;                   // "pto", "standup", "equipment"
  commandPrefix: string;        // "/pto", "/standup", "/book"
  columns: ColumnDefinition[];  // SharePoint List schema
  statusField: string;          // Which column tracks lifecycle
  routing?: RoutingConfig;      // Approval chain config
  cards: CardTemplates;         // Active, completed, list, form
  queryDescription: string;     // AI function calling description
  filterableColumns: string[];  // Columns exposed to NL queries
}
```

A single workflow engine registers handlers from definitions. New workflows require a new `WorkflowDefinition` object, not new handler code. Template workflows (standup, PTO, equipment) serve as reference implementations.

### Scenario Comparison

| Scenario | Trigger Types | Approval | State-Driven | NL Queries | Competitive Edge |
|---|---|---|---|---|---|
| Daily Standup | Scheduled, command | No | No | Blockers, summaries | Structured check-ins as durable records |
| PTO Requests | Command, extension | Yes (single/chain) | No | Status, date range, person | Approval routing + NL retrieval |
| Equipment Booking | Command, search | No | No | Availability, overdue | Conflict detection + alternatives |
| Account Health | Scheduled | No | Timer (staleness) | Trends, status, owner | Trend analysis over time |
| Break Management | Presence change | No | Yes (presence) | Current status, averages | Teams-only: presence + Shifts + call queues |
| Incident Response | Command | No | No | Priority, MTTR, status | Thread-based update capture + MTTR |

---

## Platform Comparison: Teams vs Slack

| Capability | Slack | Teams | Gap |
|---|---|---|---|
| In-channel workflow creation | Workflow Builder GUI | Power Automate (external) | Teams gap: no in-channel builder |
| Structured input forms | `OpenForm` built-in function | Adaptive Card forms (bot) or task modules | Parity |
| State persistence | Datastores (50K limit, Slack-hosted) | SharePoint Lists (30M limit, tenant-owned) | Teams advantage |
| Card interactivity | Block Kit (new message on action) | Action.Execute (in-place refresh) | Teams advantage |
| NL querying over state | Not built-in | AI function calling + structured data | Teams advantage |
| Presence/Shifts triggers | Not available | Graph subscriptions | Teams advantage |
| Call queue integration | Not available | Teams admin APIs | Teams advantage |
| No-code authoring | Workflow Builder | Power Automate | Slack advantage (simpler UX) |
| Hosting model | Slack-hosted (Deno) | Self-hosted or Azure | Trade-off |

The core thesis: if Teams unifies its existing primitives at the message layer (which a bot can do today), it moves beyond parity — especially for operational and frontline workflows where Slack lacks system-level integration.
