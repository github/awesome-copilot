---
name: logicapps-appinsights-query
description: 'Query Application Insights telemetry from an Azure Logic Apps Standard app to troubleshoot workflows. Use when asked about failed or slow runs, failed actions and their errors, trigger failures, retries, one run''s timeline, a run by client tracking ID, failed outgoing calls, exceptions, agent loops, or host restarts for a Logic Apps Standard app (Microsoft.Web/sites, kind workflowapp). Detects the telemetry mode first (v2, v2 with PreserveIncomingOperationId, or v1), picks a tested query from the cookbook, and runs it read-only through a helper script, az rest, az monitor app-insights query, or az monitor log-analytics query. Do not use for Consumption logic apps (Microsoft.Logic/workflows).'
compatibility: 'Requires Azure CLI signed in with az login and Reader access to the Application Insights resource. The helper script needs PowerShell 7 or Windows PowerShell 5.1; az rest works without PowerShell.'
---

# Logic Apps Standard Application Insights Queries

Answer questions such as "list the failed runs from app xyz in the last hour" with KQL
against the app's Application Insights data. The Logic Apps Standard runtime writes to the
`requests`, `traces`, `dependencies`, and `exceptions` tables. This skill knows what each
row means in each telemetry mode and how to read it.

Every step is read-only. Do not change app settings, `host.json`, or workflows unless the
user asks.

## Files

| File | Use |
|------|-----|
| [scripts/Invoke-LogicAppInsightsQuery.ps1](scripts/Invoke-LogicAppInsightsQuery.ps1) | Resolves the Application Insights resource, runs KQL, and detects the telemetry mode |
| [references/query-cookbook.md](references/query-cookbook.md) | Tested queries for common questions |
| [references/telemetry-schema.md](references/telemetry-schema.md) | What the runtime writes to each table in each mode |
| [references/query-execution.md](references/query-execution.md) | The helper script, `az rest`, `az monitor` paths, time windows, and permissions |

Paths below are relative to this skill's folder.

## Prerequisites

- Azure CLI, signed in with `az login`.
- PowerShell 7 or Windows PowerShell 5.1 for the helper script. Without PowerShell, use
  [`az rest`](references/query-execution.md#az-rest).
- Reader access on the Application Insights resource. Resolving it from the Logic App
  name also needs rights to list the app's settings. See
  [Permissions](references/query-execution.md#permissions).
- For the `az monitor` paths, install the extensions first:
  `az extension add --name application-insights` or `--name log-analytics`. In a
  non-interactive shell, `az` cannot prompt to install them and fails.

## Workflow

### 1. Resolve the target

Ask for whatever is missing:

- The Logic App name and resource group, or the Application Insights application ID.
- The subscription, when it differs from the active `az` subscription.
- The time window. Default to the last hour when the user does not say.
- The workflow name, when the question is about one workflow.

Confirm that the app is Logic Apps Standard. A Consumption logic app does not write this
telemetry.

```powershell
.\scripts\Invoke-LogicAppInsightsQuery.ps1 -LogicAppName <app> -ResourceGroup <rg> -ResolveOnly
```

If the app has no `APPLICATIONINSIGHTS_CONNECTION_STRING` setting, it does not send
telemetry to Application Insights. Tell the user; do not guess another resource.

### 2. Detect the telemetry mode

Run this once per app and session, before any query about runs:

```powershell
.\scripts\Invoke-LogicAppInsightsQuery.ps1 -LogicAppName <app> -ResourceGroup <rg> -DetectTelemetryMode
```

| `Mode` | What to do |
|--------|-----------|
| `v2` | Use any cookbook query. `operation_Id` equals the run ID. |
| `v2-preserve` | Use the cookbook queries as written. Group and filter runs by the run ID expression, never by `operation_Id`. |
| `v2-mixed` | Same as `v2-preserve`. Mention that the mode changed in the window. |
| `v1` | Use the queries marked **All modes** or the `### v1` variants. Requests carry no run ID and `success` is unreliable, so read run and action status from traces. |
| `Unknown` | No workflow requests in the window. Raise `-LookbackHours`, or ask the user to trigger a run, then wait 2 to 5 minutes for ingestion. |

When `ModeChangedInWindow` is `True`, older rows have the other shape. Prefer **All
modes** queries, or narrow the window to the current mode. Trust live rows over
`ConfiguredSettings`: an app that once ran v1 keeps emitting v1 until v2 is set
explicitly. See [Telemetry Modes](references/telemetry-schema.md#telemetry-modes).

### 3. Pick a query

Start from the cookbook. Change only the `let` parameters at the top.

| Question | Cookbook entry |
|----------|----------------|
| Which runs failed? | [1. Failed runs](references/query-cookbook.md#1-failed-runs) |
| How many runs ran or failed, and how long did they take? | [2. Run counts and durations](references/query-cookbook.md#2-run-counts-and-durations) |
| Which action failed, and why? | [3. Failed actions with errors](references/query-cookbook.md#3-failed-actions-with-errors) |
| What happened in run X? | [4. One run's timeline](references/query-cookbook.md#4-one-runs-timeline) |
| Find the run with client tracking ID X | [5. Lookup by client tracking ID](references/query-cookbook.md#5-lookup-by-client-tracking-id) |
| Which actions retried? | [6. Retries](references/query-cookbook.md#6-retries) |
| Why did the trigger fail or not fire? | [7. Trigger failures](references/query-cookbook.md#7-trigger-failures) |
| Which actions are slow? | [8. Slow actions](references/query-cookbook.md#8-slow-actions) |
| Which outgoing HTTP calls failed? | [9. Failed outgoing calls](references/query-cookbook.md#9-failed-outgoing-calls) |
| What exceptions occurred? | [10. Exception summary](references/query-cookbook.md#10-exception-summary) |
| Did the host restart or recycle? | [11. Host restarts](references/query-cookbook.md#11-host-restarts) |
| What did the latest runs return? | [12. Recent runs](references/query-cookbook.md#12-recent-runs) |
| Which child runs did run X start? | [13. Parent and child runs](references/query-cookbook.md#13-parent-and-child-runs) |
| What did the agent do, and how many tokens did it use? | [14. Agent loops](references/query-cookbook.md#14-agent-loops) |

Chain entries to go deeper. A common path: entry 1 finds failed runs, entry 3 names the
failed action and its error, and entry 4 shows the full run.

For a question the cookbook does not cover, write new KQL from
[telemetry-schema.md](references/telemetry-schema.md). Reuse the
[shared expressions](references/query-cookbook.md#shared-expressions) for status,
workflow name, run ID, and client tracking ID so the query works in every mode. Filter run
events on `customDimensions.EventName`, not on `Category`.

### 4. Run the query

Save multi-line KQL to a file, then run it:

```powershell
.\scripts\Invoke-LogicAppInsightsQuery.ps1 -LogicAppName <app> -ResourceGroup <rg> -QueryFile .\query.kql |
    Format-Table -AutoSize
```

Pass `-AppId` instead of the app name after the first call to skip resolution. For other
paths, follow [query-execution.md](references/query-execution.md). With
`az monitor app-insights query`, always pass `--offset` to match the KQL window: the
command applies a one-hour window by default and silently drops older rows. With
`az monitor log-analytics query`, filter on the component, because one workspace can hold
data from many apps.

If the API rejects the query, read the error. It usually names the bad column or syntax.
Fix the query and run it again.

### 5. Report

Lead with the answer, then the evidence:

- The telemetry mode, the time window in UTC, and the row count.
- A table of the rows that answer the question: time, workflow, run ID, status, and the
  error code and message.
- The KQL you ran, so the user can rerun it in the portal's **Logs** blade.
- Next steps, such as the cookbook entry that goes one level deeper.

When the query returns nothing, say so and give the likely reason: the window is too short,
ingestion lags 2 to 5 minutes, the workflow name is wrong, or the mode does not match the
query.

## Safety Rules

- Never select `dependencies.data` or `customDimensions.prop__targetUri`. They can hold
  URLs with SAS tokens or signatures. Use `name`, `target`, and `resultCode`.
- Never print a callback URL, a connection string, or an instrumentation key.
- Only run queries. Do not change settings to "turn on" telemetry unless the user asks, and
  then explain the change and its cost first.
- Treat workflow inputs and outputs in traces as customer data. Show only what answers the
  question.

## Known Gaps

These runtime behaviors can mislead an answer. Account for them:

| Behavior | How to handle it |
|----------|------------------|
| A failed polling trigger's request row shows `success` `True`. | Use `TriggerFailedException` in `exceptions`, or the `WorkflowTriggerEnd` trace in v1. See [entry 7](references/query-cookbook.md#7-trigger-failures). |
| A run stopped by a Terminate action ends `Failed` with `statusCode` `Terminated`, while the Terminate action shows `Succeeded`. | Report terminated runs apart from real failures. |
| Failed runs are logged at Information severity. | Do not filter on `severityLevel`. Filter on status. |
| A failed HTTP action's exception carries only the status, such as `InternalServerError`. Older runtimes write the same bare status for a failed HTTP polling trigger; newer runtimes write `Trigger 'Poll_Http' failed with HTTP status code '503' (ServiceUnavailable).` In v1, `prop__error` is empty for failed HTTP actions and HTTP polling triggers; only `prop__statusCode` is set. | Read the status from `problemId`, `dependencies.resultCode`, or the v1 HTTP traces. |
| The runtime tracks dependencies by default, but built-in service-provider connectors and child workflow calls write no dependency row. | Use action requests and exceptions for those steps. Link child runs with [entry 13](references/query-cookbook.md#13-parent-and-child-runs). |
| On older runtimes, a trigger exception's `operation_ParentId` matches no row, so it is not parented to the trigger request. In preserve mode it also has a different `operation_Id`. Newer runtimes set it to the trigger request `id`. Action exceptions always link to their request. v1 writes no workflow exceptions. | Join on `operation_ParentId == requests.id` first. If a trigger exception finds no match, fall back to the workflow and trigger names in `resource` and time. See [entry 7](references/query-cookbook.md#7-trigger-failures). |
| In v2, agent model calls in `dependencies` have `operation_Name` `WorkflowDispatcher`, an `operation_Id` that is the trigger's trace ID, and an `operation_ParentId` that matches no row. | Join model calls to the agent action request that holds the call's `operation_Id` as its trace ID and whose time window contains the call. Plain v2 puts the trace ID in the request's `operation_ParentId` traceparent; with PreserveIncomingOperationId the request's `operation_Id` is the trace ID. If overlapping agent actions share the trace, say the match is ambiguous. See [entry 14](references/query-cookbook.md#14-agent-loops). |
| Older v2 runtimes write no token counts. Newer v2 runtimes write the agent loop trace (event 213) under category `Workflow.Operations.Actions`. Its `operation_ParentId` matches no row in either version. | Join event 213 to the agent action on the run ID (`prop__flowRunSequenceId`) and `prop__actionName`, not on parent ID. If the query returns no rows in v2, say the runtime does not write token counts yet. |
| A child workflow call action writes two request rows with the same `id`. | Keep the latest row per `id` with `arg_max`. |
| `JobExecutionResultException` rows from `WorkflowDispatcher` carry no `resource` dimension. | In v2, join `operation_ParentId` to the action request `id` for the run ID. In v1, correlate on `operation_Id` with the run traces. |
| In v2, `customDimensions.status` is JSON-quoted, such as `"Failed"`. | Use the shared status expression, which trims the quotes. |
| v1 requests carry no run ID, and their `success` value does not reflect the action status. | Read status from v1 traces. Join requests to traces on `operation_Id`. |

If a question needs data the runtime does not write, tell the user what is missing rather
than inferring it.
