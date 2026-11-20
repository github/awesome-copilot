# Logic Apps Standard Telemetry Schema

This file describes what the Logic Apps Standard runtime writes to Application Insights.
Runtime build 1.194.47.0 produced the shapes below, and a live app confirmed them. Check
them against current data before you rely on an exact field.

Before you query, find the telemetry mode with
`Invoke-LogicAppInsightsQuery.ps1 -DetectTelemetryMode`. Each mode writes different
shapes.

## Telemetry Modes

| Mode | How the app gets it | What sets the mode apart |
|------|---------------------|---------------------|
| `v2` | The default for new apps | Category is `Workflow.Operations.*`. `operation_Id` equals the run ID. |
| `v2-preserve` | v2 with `Runtime.ApplicationInsights.PreserveIncomingOperationId=true` | v2 shape, but `operation_Id` is the caller's W3C trace ID (32 hex characters). |
| `v1` | `Runtime.ApplicationInsightTelemetryVersion=v1`, or an app first created on v1 | Requests are named `{workflow}.{action}.ActionInvocation`. Traces use Category `Host.Triggers.Workflows`. |

Configure these settings in host.json under `extensions.workflow.settings`:

```json
{
  "extensions": {
    "workflow": {
      "settings": {
        "Runtime.ApplicationInsightTelemetryVersion": "v2",
        "Runtime.ApplicationInsights.PreserveIncomingOperationId": "true"
      }
    }
  }
}
```

### Version precedence

The runtime takes the version in this order: the setting, then the version stored in the
app's storage, then `v2`. When the chosen version differs from the stored one, the runtime
saves the chosen version. As a result:

- An app stays on v1 after you remove a v1 setting.
- An app returns to v2 only when you set `v2` explicitly. That change also overwrites the stored value.
- Apps that use SQL storage skip the stored value.

Settings alone do not tell you the mode. Use the live rows. An app that changed modes keeps
older rows in the old shape, so read `ModeChangedInWindow` and set the query window to
cover only the current mode.

## Run ID In Every Mode

```kusto
| extend runId = coalesce(
    tostring(parse_json(tostring(customDimensions.resource)).runId),
    tostring(customDimensions.prop__flowRunSequenceId))
```

- In v2 and preserve mode, `customDimensions.resource` is a JSON string. Parse it twice, as shown above.
- In v1, traces carry `prop__flowRunSequenceId`. v1 requests carry no run ID, so join them to traces on `operation_Id`.

## v2 Shapes

### requests

| Row | `name` | Category | `resultCode` | Notes |
|-----|--------|----------|--------------|-------|
| Action run | Action name | `Workflow.Operations.Actions` | `Succeeded`, `Failed`, and so on | `success` matches the status. Each foreach iteration is a separate row. Skipped actions write no row. |
| Trigger run | Trigger name, such as `manual` or `Poll_Http` | `Workflow.Operations.Triggers` | Status | **Known bug:** a failed polling trigger writes `Succeeded`. Use the trigger exception or the dependency instead. |
| HTTP request trigger call | Workflow name | `Workflow.Operations.Triggers` | HTTP code, such as `202` | Has a random `operation_Id` and no run ID. |
| Host webhook | `POST Host/ExtensionWebHookHandler [...]` | `Workflow.Operations.Triggers` | HTTP code | Has no run ID. `operation_Name` is empty. |

Action and trigger request `customDimensions`:

| Key | Content |
|-----|---------|
| `Category` | `Workflow.Operations.Actions` or `Workflow.Operations.Triggers` |
| `resource` | JSON string: `workflowId`, `workflowName`, `runId`, `actionName` or `triggerName` |
| `correlation` | JSON string: `actionTrackingId`, `clientTrackingId`, `activityId` |
| `actionType` / `triggerType` | Such as `Http`, `Compose`, `Foreach`, or `Request` |
| `trackedProperties` | JSON string. An empty value is the literal `"\"\""`. |
| `retryHistory` | JSON array of `{startTime, endTime, code, clientRequestId}`. Present only when the runtime retried. |
| `LogLevel` | `Error` for failed actions, `Information` otherwise |

`operation_Name` is the workflow name. `duration` is the action's run time in milliseconds,
including retries.

Some action types write more than one row:

| Action | Rows |
|--------|------|
| Agent (`actionType` `Agent`) | One row per agent loop iteration, each with its own `actionTrackingId`. Each tool action, such as a Compose inside a tool, writes its own row under the same run ID. |
| Call a child workflow (`actionType` `Workflow`) | Two rows with the same `id`: one with `resultCode` `0` and one with the final status. Keep the latest with `summarize arg_max(timestamp, *) by id`. |

### traces

| Category | EventName (EventId) | Use |
|----------|---------------------|-----|
| `Workflow.Operations.Runs` | `WorkflowRunStart` (201), `WorkflowRunEnd` (202) | Run start and end. The end row holds the final run status. |
| `Workflow.Host` | `ServiceStarting` (10), `ServiceStarted` (11), `ServiceStopping` (12), `ServiceStopped` (13) | Host lifecycle. Use these to find restarts. |

Run trace `customDimensions`:

| Key | Content |
|-----|---------|
| `status` | JSON-quoted, such as `"\"Failed\""`. Read it with `trim('"', tostring(customDimensions.status))`. |
| `resource` | JSON string with `runId` and `workflowName` |
| `correlation` | JSON string with `clientTrackingId` |
| `prop__clientTrackingId`, `prop__durationInMilliseconds` | Plain strings. Duration is `-1` on the start row. |
| `prop__statusCode`, `prop__error` | On a failed end row: the code, such as `ActionFailed` or `Terminated`, and the error JSON |
| `prop__properties` | JSON string with `startTime`, `endTime`, `status`, `actionCount` |
| `prop__kind` | `Stateful` or `Stateless` |

`severityLevel` is 1 (Information) even when the run failed. Filter on the status, never on severity.

v2 writes no agent loop trace, so it has no token counts. Read agent iterations from the
`Agent` action requests, and model calls from `dependencies`.

A Terminate action with status `Failed` ends the run as `Failed` with `prop__statusCode`
`Terminated`. The Terminate action's own request row shows `Succeeded`.

### exceptions

| `type` | Category | Meaning |
|--------|----------|---------|
| `Microsoft.Azure.Workflows.Common.Logging.ActionFailedException` | `Workflow.Operations.Actions` | An action failed. `outerMessage` holds the error message. For an HTTP action it holds only the status, such as `InternalServerError`. |
| `Microsoft.Azure.Workflows.Common.Logging.TriggerFailedException` | `Workflow.Operations.Triggers` | A trigger failed. This is the reliable signal for failed polling triggers. |

Exception rows carry the same `resource` dimension as their request, so read the action or
trigger name from `resource`. `severityLevel` is empty. Failed action requests carry no
error text, so join them to these rows for the message.

An action exception's `operation_ParentId` equals the `id` of its action request, so join on
that. A trigger exception's `operation_ParentId` matches no row in any table, so join it on
the workflow and trigger names from `resource` and on time:

| Exception | v2 | Preserve mode |
|-----------|----|---------------|
| `ActionFailedException` | Same `operation_Id` as the run; `operation_ParentId` equals the action request `id`. | Same as v2. |
| `TriggerFailedException` | Same `operation_Id` as the trigger request, but `operation_ParentId` points to a span that is never written. | A different `operation_Id` from the trigger request, and an orphaned `operation_ParentId`. |

A failed polling trigger starts no run, so its exception has no run ID. Join it to the
trigger request on workflow name, trigger name, and time.

Host and Functions exceptions can also appear. The main one has `type`
`FunctionInvocationException`, `innermostType` `JobExecutionResultException`, and
`operation_Name` `WorkflowDispatcher`. The runtime throws `JobExecutionResultException` to end
an action job with a result it has already set, such as Failed for an input expression error.
Each action runs inside a `WorkflowDispatcher` function call, so the Functions host logs the
throw even though the job ends normally. `innermostMessage` holds the action error. Skips from
`runAfter` or conditions happen before that call and write no row. In v2 the row's
`operation_ParentId` equals the action request `id`, which carries the run ID. In v1 there is
no request row: the row's `operation_ParentId` matches the `FunctionStarted` trace of the call,
so correlate on `operation_Id` with the run's `WorkflowActionEnd` traces.

### dependencies

The runtime tracks dependencies by default in v2 and v1. No `host.json` setting turns it
off. Each outgoing HTTP call from an HTTP action or polling trigger writes one row of `type`
`HTTP`. Its `name` is `{method} {path}`, `resultCode` is the HTTP status, and `target` is
the host name. A retried call writes one row per attempt. A dependency's
`operation_ParentId` equals the `id` of its action or trigger request, and it carries the
same `resource` dimension.

The host also writes storage calls, such as `GET <account>/flow...flowaccesskeys`, with
Category `Function.<workflow>`. Exclude them with `where type == "HTTP"` and a `target`
filter when you want only workflow calls.

**Never select the dependency `data` column.** It holds the full URL, which can include
SAS tokens or other secrets. Use `name`, `target`, and `resultCode`.

Rows that need care:

| Call | Shape |
|------|-------|
| Agent model call | `name` is `POST /openai/deployments/{model}/chat/completions`, one row per model call. In v2 its `operation_Name` is `WorkflowDispatcher`, its `operation_Id` is the HTTP trigger's trace ID, not the run ID, and its `operation_ParentId` matches no row. Join it to the agent action request that holds that trace ID and whose time window contains the call. Plain v2 puts the trace ID in the request's `operation_ParentId` traceparent; with PreserveIncomingOperationId the request's `operation_Id` is the trace ID. See [entry 14](query-cookbook.md#14-agent-loops). In v1 it shares the run's `operation_Id`, has `operation_Name` `{workflow}.{agent}.ActionInvocation`, and its `operation_ParentId` is that request's `id`. |
| Child workflow call | Writes no dependency row in either mode. See [Child Workflow Correlation](#child-workflow-correlation). |
| Built-in service-provider connectors | Write no dependency row. |

## Child Workflow Correlation

A Call-a-workflow action starts a child run with its own run ID. Link the two runs this way:

| Mode | Join |
|------|------|
| v2 | The child trigger request's `correlation.actionTrackingId` equals the parent call action's `correlation.actionTrackingId`. The child has its own `operation_Id`. `clientTrackingId` also passes from parent to child. |
| Preserve mode | Same as v2. |
| v1 | The child's rows share the parent's `operation_Id`. The child trigger request's parent is the call action request. |

See [cookbook entry 13](query-cookbook.md#13-parent-and-child-runs).

## Preserve-Mode Shapes

The rows match v2 except for the operation fields:

- `operation_Id` is the trace ID from the caller's `traceparent` header. Every run started with the same trace ID shares it.
- `operation_ParentId` is the caller's span ID.
- A run started without a `traceparent` gets a new random trace ID, not its run ID.

Group and look up runs by the run ID expression only. Use `operation_Id` to follow one
end-to-end transaction across services.

## v1 Shapes

| Table | Shape |
|-------|-------|
| requests | `name` is `{workflow}.{action}.ActionInvocation` or `{workflow}.{trigger}.TriggerInvocation`. `resultCode` is `0`, and the row carries no run ID. `success` does not show the action status, so do not use it. |
| traces | Category `Host.Triggers.Workflows`. `EventName` is `WorkflowRunStart` (201), `WorkflowRunEnd` (202), `WorkflowTriggerStart` (203), `WorkflowTriggerEnd` (204), `WorkflowActionStart` (205), `WorkflowActionEnd` (206), or `WorkflowAgentLoopExecutionCompleted` (213). |
| traces, agent | Event 213 is written once per agent loop iteration. It carries `prop__actionName`, `prop__promptTokenCount`, `prop__completionTokenCount`, `prop__toolCount`, and `prop__toolResults`. Its `prop__durationInMilliseconds` is `-1`. v2 does not write this event. |
| exceptions | v1 writes no workflow exception rows. Read errors from the end-event traces. |
| traces, HTTP | `HttpOutgoingRequestEndWithServerFailure` (36) and related events record outgoing HTTP calls. Use `prop__httpMethod`, `prop__httpStatusCode`, `prop__durationInMilliseconds`, and `prop__clientRequestId`. `prop__targetUri` can hold secrets, so do not select it. |

v1 trace `customDimensions` are flat strings:

| Key | Content |
|-----|---------|
| `prop__flowRunSequenceId` | Run ID |
| `prop__status`, `prop__statusCode` | Status on end events (202, 204, 206) |
| `prop__error` | Error JSON on failed end events, when present |
| `prop__actionName`, `prop__actionType` | Action events |
| `prop__triggerName`, `prop__triggerType`, `prop__failureCause` | Trigger events |
| `prop__clientTrackingId`, `prop__durationInMilliseconds` | Correlation and duration |
| `prop__retryHistory` | Retry attempts on action end events, when the runtime retried |
| `prop__properties` | JSON string with `resource.workflowName`, `runId`, and `trackedProperties` |

v1 has no `prop__flowName` key. The `message` text also holds `flowName='...'` and the
other values as `key='value'` pairs.

v1 requests use Category `Host.Results`. A failed polling trigger writes a
`WorkflowTriggerEnd` trace with `prop__status` `Failed`, `prop__statusCode`, and
`prop__failureCause`, but no run ID, because no run starts. Its `operation_Name` is a job
name, such as `HttpTriggerJob`.

On the `WorkflowRunEnd` row, `operation_Name` is `FlowRunLastJob`, not the workflow name.
Read the workflow name from `prop__properties` with
`tostring(parse_json(tostring(customDimensions.prop__properties)).resource.workflowName)`.

## Common Columns

| Column | Meaning |
|--------|---------|
| `cloud_RoleName` | The Logic App name |
| `cloud_RoleInstance` | The worker instance. Use it to spread work or find a bad instance. |
| `operation_Name` | The workflow name in v2. In v1 it varies by row. |
| `timestamp` | Event time in UTC |

## Workspace-Based Tables

When you query the Log Analytics workspace directly instead of the Application Insights
resource, use these names:

| Classic | Workspace | Column changes |
|---------|-----------|----------------|
| `requests` | `AppRequests` | `customDimensions` → `Properties`, `name` → `Name`, `success` → `Success`, `resultCode` → `ResultCode`, `duration` → `DurationMs` |
| `traces` | `AppTraces` | `message` → `Message`, `severityLevel` → `SeverityLevel` |
| `exceptions` | `AppExceptions` | `type` → `ExceptionType`, `outerMessage` → `OuterMessage` |
| `dependencies` | `AppDependencies` | `data` → `Data` (never select it) |
| all | all | `timestamp` → `TimeGenerated`, `operation_Id` → `OperationId`, `operation_Name` → `OperationName`, `cloud_RoleName` → `AppRoleName` |

The Application Insights query API accepts the classic names even for workspace-based
resources. Use classic names unless you query the workspace itself.

## Ingestion Delay

New rows take about 2 to 5 minutes to appear. When you check a run that just finished,
wait before you conclude that a row is missing.
