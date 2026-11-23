# Query Cookbook

Ready-to-run KQL for Logic Apps Standard telemetry in Application Insights. Each query
starts with `let` parameters. Change their values and leave the rest as written. An empty
`workflowName` matches every workflow.

Read [telemetry-schema.md](telemetry-schema.md) for what each field means. Read
[query-execution.md](query-execution.md) for how to run a query.

## Shared Expressions

The runtime writes different fields in each telemetry mode. These expressions return the
same value in v2, in v2 with `PreserveIncomingOperationId`, and in v1. Queries marked
**All modes** use them.

| Value | Expression |
|---|---|
| Run status | `coalesce(trim('"', tostring(customDimensions.status)), tostring(customDimensions.prop__status))` |
| Workflow name | `coalesce(tostring(parse_json(tostring(customDimensions.resource)).workflowName), tostring(parse_json(tostring(customDimensions.prop__properties)).resource.workflowName))` |
| Run ID | `coalesce(tostring(parse_json(tostring(customDimensions.resource)).runId), tostring(customDimensions.prop__flowRunSequenceId))` |
| Client tracking ID | `coalesce(tostring(parse_json(tostring(customDimensions.correlation)).clientTrackingId), tostring(customDimensions.prop__clientTrackingId))` |

Filter run and host events on `customDimensions.EventName`, not on `Category`. The
category differs between v2 and v1; the event name does not.

Never select the `dependencies.data` column or `customDimensions.prop__targetUri`. They can
hold URLs with SAS tokens or signatures. Never print a callback URL.

## Index

| Question | Entry |
|---|---|
| Which runs failed? | [1. Failed runs](#1-failed-runs) |
| How many runs ran, failed, or took how long? | [2. Run counts and durations](#2-run-counts-and-durations) |
| Which action failed and why? | [3. Failed actions with errors](#3-failed-actions-with-errors) |
| What happened in one run? | [4. One run's timeline](#4-one-runs-timeline) |
| Find a run by client tracking ID | [5. Lookup by client tracking ID](#5-lookup-by-client-tracking-id) |
| Which actions retried? | [6. Retries](#6-retries) |
| Why did a trigger fail? | [7. Trigger failures](#7-trigger-failures) |
| Which actions are slow? | [8. Slow actions](#8-slow-actions) |
| Which outgoing calls failed? | [9. Failed outgoing calls](#9-failed-outgoing-calls) |
| What exceptions occurred? | [10. Exception summary](#10-exception-summary) |
| Did the host restart? | [11. Host restarts](#11-host-restarts) |
| What did recent runs return? | [12. Recent runs](#12-recent-runs) |
| Which child runs did a parent start? | [13. Parent and child runs](#13-parent-and-child-runs) |
| What did an agent do, and how many tokens did it use? | [14. Agent loops](#14-agent-loops) |

## 1. Failed runs

**All modes.** Lists runs that ended in failure, with the error code and message. A run
stopped by a Terminate action shows `statusCode` `Terminated` and the custom code from the
action in `errorCode`.

```kusto
let lookback = 1h;
let workflowName = "";
traces
| where timestamp > ago(lookback)
| where customDimensions.EventName == "WorkflowRunEnd"
| extend status = coalesce(trim('"', tostring(customDimensions.status)), tostring(customDimensions.prop__status))
| where status == "Failed"
| extend workflow = coalesce(tostring(parse_json(tostring(customDimensions.resource)).workflowName), tostring(parse_json(tostring(customDimensions.prop__properties)).resource.workflowName))
| where isempty(workflowName) or workflow =~ workflowName
| extend runId = coalesce(tostring(parse_json(tostring(customDimensions.resource)).runId), tostring(customDimensions.prop__flowRunSequenceId))
| extend error = parse_json(tostring(customDimensions.prop__error))
| project timestamp, workflow, runId,
    statusCode = tostring(customDimensions.prop__statusCode),
    errorCode = tostring(error.code),
    errorMessage = tostring(error.message),
    clientTrackingId = tostring(customDimensions.prop__clientTrackingId),
    durationMs = toint(customDimensions.prop__durationInMilliseconds)
| order by timestamp desc
```

`errorMessage` names the failure class, such as "An action failed. No dependent actions
succeeded." Use [entry 3](#3-failed-actions-with-errors) to find the action that failed.

## 2. Run counts and durations

**All modes.** Counts runs by workflow and status, with duration percentiles in
milliseconds. Cancelled runs appear as their own status.

```kusto
let lookback = 24h;
let workflowName = "";
traces
| where timestamp > ago(lookback)
| where customDimensions.EventName == "WorkflowRunEnd"
| extend workflow = coalesce(tostring(parse_json(tostring(customDimensions.resource)).workflowName), tostring(parse_json(tostring(customDimensions.prop__properties)).resource.workflowName))
| where isempty(workflowName) or workflow =~ workflowName
| extend status = coalesce(trim('"', tostring(customDimensions.status)), tostring(customDimensions.prop__status))
| extend durationMs = toint(customDimensions.prop__durationInMilliseconds)
| summarize runs = count(), p50Ms = percentile(durationMs, 50), p95Ms = percentile(durationMs, 95), maxMs = max(durationMs) by workflow, status
| order by workflow asc, status asc
```

For a trend, replace the `summarize` line with
`| summarize runs = count() by bin(timestamp, 15m), status` and add `| render timechart`.

## 3. Failed actions with errors

The error text lives in different places in each mode. Run the [mode check](query-execution.md#detect-the-telemetry-mode)
first, then use the matching query.

### v2 and preserve mode

Failed action rows in `requests` carry no error text. The matching `ActionFailedException`
holds it in `outerMessage`. This query joins the two on run ID and action name.

```kusto
let lookback = 1h;
let workflowName = "";
let failedActions = requests
| where timestamp > ago(lookback)
| where customDimensions.Category == "Workflow.Operations.Actions" and success == false
| extend resource = parse_json(tostring(customDimensions.resource))
| extend workflow = tostring(resource.workflowName), runId = tostring(resource.runId), actionName = tostring(resource.actionName)
| where isempty(workflowName) or workflow =~ workflowName
| project timestamp, workflow, runId, actionName,
    actionType = tostring(customDimensions.actionType),
    durationMs = duration,
    retries = array_length(parse_json(tostring(customDimensions.retryHistory)));
let actionErrors = exceptions
| where timestamp > ago(lookback)
| where type == "Microsoft.Azure.Workflows.Common.Logging.ActionFailedException"
| extend resource = parse_json(tostring(customDimensions.resource))
| summarize errorMessage = take_any(outerMessage) by runId = tostring(resource.runId), actionName = tostring(resource.actionName);
failedActions
| join kind=leftouter actionErrors on runId, actionName
| project-away runId1, actionName1
| order by timestamp desc
```

For an HTTP action, `errorMessage` holds only the status, such as `InternalServerError`.
Use [entry 9](#9-failed-outgoing-calls) for the call details. A scope or condition that
failed because a child action failed shows "An action failed. No dependent actions
succeeded." Look for the child action in the same run.

If `exceptions` has no `ActionFailedException` rows for the run, the action may have
failed in an expression before it ran. Check `WorkflowDispatcher` exceptions:

```kusto
let lookback = 1h;
exceptions
| where timestamp > ago(lookback)
| where operation_Name == "WorkflowDispatcher"
| project timestamp, type, outerMessage, innermostMessage
| order by timestamp desc
```

These rows carry no run ID. Match them to a run by time.

### v1

The `WorkflowActionEnd` trace carries the error and its cause.

```kusto
let lookback = 1h;
let workflowName = "";
traces
| where timestamp > ago(lookback)
| where customDimensions.EventName == "WorkflowActionEnd" and customDimensions.prop__status == "Failed"
| extend workflow = tostring(parse_json(tostring(customDimensions.prop__properties)).resource.workflowName)
| where isempty(workflowName) or workflow =~ workflowName
| extend error = parse_json(tostring(customDimensions.prop__error))
| project timestamp, workflow,
    runId = tostring(customDimensions.prop__flowRunSequenceId),
    actionName = tostring(customDimensions.prop__actionName),
    actionType = tostring(customDimensions.prop__actionType),
    statusCode = tostring(customDimensions.prop__statusCode),
    errorCode = tostring(error.code),
    errorMessage = tostring(error.message),
    failureCause = tostring(customDimensions.prop__failureCause),
    durationMs = toint(customDimensions.prop__durationInMilliseconds)
| order by timestamp desc
```

## 4. One run's timeline

**All modes.** Shows every trigger, action, run event, exception, and workflow call for a
run, in time order. Set `runId` to the run ID from [entry 1](#1-failed-runs) or
[entry 12](#12-recent-runs).

```kusto
let runIdValue = "08584065660916678987979386505CU00";
let lookback = 7d;
union
    (requests | extend rowKind = "request", name = name, result = resultCode, durationMs = duration, detail = ""),
    (traces | extend rowKind = "trace", name = tostring(customDimensions.EventName),
        result = coalesce(trim('"', tostring(customDimensions.status)), tostring(customDimensions.prop__status)),
        durationMs = todouble(customDimensions.prop__durationInMilliseconds),
        detail = coalesce(tostring(customDimensions.prop__actionName), tostring(customDimensions.prop__triggerName), tostring(customDimensions.prop__error))),
    (exceptions | extend rowKind = "exception", name = type, result = "", durationMs = real(null), detail = outerMessage),
    (dependencies
        | where tostring(customDimensions.Category) startswith "Workflow."
        | extend rowKind = "dependency", name = name, result = resultCode, durationMs = duration, detail = target)
| where timestamp > ago(lookback)
| extend runId = coalesce(tostring(parse_json(tostring(customDimensions.resource)).runId), tostring(customDimensions.prop__flowRunSequenceId))
| where runId == runIdValue
| project timestamp, rowKind, name, result, durationMs, detail
| order by timestamp asc
```

The dependency `target` is the host name, not the full URL. In preserve mode, group by run
ID as shown here, not by `operation_Id`.

## 5. Lookup by client tracking ID

**All modes.** Finds runs by the client tracking ID that a caller sent in the
`x-ms-client-tracking-id` header, or that the trigger set.

```kusto
let lookback = 24h;
let clientTrackingIdValue = "order-12345";
traces
| where timestamp > ago(lookback)
| where customDimensions.EventName == "WorkflowRunEnd"
| where tostring(customDimensions.prop__clientTrackingId) == clientTrackingIdValue
| project timestamp,
    workflow = coalesce(tostring(parse_json(tostring(customDimensions.resource)).workflowName), tostring(parse_json(tostring(customDimensions.prop__properties)).resource.workflowName)),
    runId = coalesce(tostring(parse_json(tostring(customDimensions.resource)).runId), tostring(customDimensions.prop__flowRunSequenceId)),
    status = coalesce(trim('"', tostring(customDimensions.status)), tostring(customDimensions.prop__status)),
    statusCode = tostring(customDimensions.prop__statusCode)
```

If the run has not ended, search the start event instead: replace `WorkflowRunEnd` with
`WorkflowRunStart`.

## 6. Retries

Lists actions that retried, with each attempt's result code.

### v2 and preserve mode

```kusto
let lookback = 24h;
let workflowName = "";
requests
| where timestamp > ago(lookback)
| where customDimensions.Category == "Workflow.Operations.Actions" and isnotempty(customDimensions.retryHistory)
| extend resource = parse_json(tostring(customDimensions.resource))
| where isempty(workflowName) or tostring(resource.workflowName) =~ workflowName
| mv-expand attempt = parse_json(tostring(customDimensions.retryHistory))
| project timestamp,
    workflow = tostring(resource.workflowName),
    runId = tostring(resource.runId),
    actionName = tostring(resource.actionName),
    finalResult = resultCode,
    attemptStart = todatetime(attempt.startTime),
    attemptCode = tostring(attempt.code)
| order by timestamp desc, attemptStart asc
```

### v1

```kusto
let lookback = 24h;
traces
| where timestamp > ago(lookback)
| where customDimensions.EventName == "WorkflowActionEnd" and isnotempty(customDimensions.prop__retryHistory)
| mv-expand attempt = parse_json(tostring(customDimensions.prop__retryHistory))
| project timestamp,
    workflow = tostring(parse_json(tostring(customDimensions.prop__properties)).resource.workflowName),
    runId = tostring(customDimensions.prop__flowRunSequenceId),
    actionName = tostring(customDimensions.prop__actionName),
    finalStatus = tostring(customDimensions.prop__status),
    attemptStart = todatetime(attempt.startTime),
    attemptCode = tostring(attempt.code)
| order by timestamp desc, attemptStart asc
```

An action's `duration` includes the time spent in retries.

## 7. Trigger failures

**All modes.** In v2, a failed polling trigger still writes a `requests` row with
`success` true. Do not use `requests` to find failed triggers. This query reads
`TriggerFailedException` in v2 and the `WorkflowTriggerEnd` trace in v1.

```kusto
let lookback = 24h;
let workflowName = "";
union
    (exceptions
        | where type == "Microsoft.Azure.Workflows.Common.Logging.TriggerFailedException"
        | extend resource = parse_json(tostring(customDimensions.resource))
        | extend workflow = tostring(resource.workflowName), triggerName = tostring(resource.triggerName), errorMessage = outerMessage, mode = "v2"),
    (traces
        | where customDimensions.EventName == "WorkflowTriggerEnd" and customDimensions.prop__status == "Failed"
        | extend workflow = tostring(parse_json(tostring(customDimensions.prop__properties)).resource.workflowName),
            triggerName = tostring(customDimensions.prop__triggerName),
            errorMessage = coalesce(tostring(parse_json(tostring(customDimensions.prop__error)).message), tostring(customDimensions.prop__failureCause)),
            mode = "v1")
| where timestamp > ago(lookback)
| where isempty(workflowName) or workflow =~ workflowName
| summarize failures = count(), firstSeen = min(timestamp), lastSeen = max(timestamp), sampleError = take_any(errorMessage) by workflow, triggerName, mode
| order by failures desc
```

A failed polling trigger does not start a run, so there is no run to inspect.

To find the trigger request behind each v2 exception, join on `operation_ParentId == id`.
Newer runtimes set the parent to the trigger request. On older runtimes the join finds no
match; fall back to workflow name, trigger name, and time.

```kusto
let lookback = 24h;
exceptions
| where timestamp > ago(lookback)
| where type == "Microsoft.Azure.Workflows.Common.Logging.TriggerFailedException"
| project exceptionTime = timestamp, operation_ParentId, problemId, outerMessage
| join kind=leftouter (
    requests
    | where timestamp > ago(lookback)
    | project triggerRequestId = id, triggerRequest = name, requestTime = timestamp, resultCode
  ) on $left.operation_ParentId == $right.triggerRequestId
| project exceptionTime, triggerRequest, triggerRequestId, problemId, outerMessage
| order by exceptionTime desc
```

On newer runtimes, `outerMessage` for an HTTP trigger reads `Trigger 'Poll_Http' failed with
HTTP status code '503' (ServiceUnavailable).` and `problemId` holds the status.

## 8. Slow actions

Lists the slowest action types by 95th percentile duration, in milliseconds.

### v2 and preserve mode

```kusto
let lookback = 24h;
let workflowName = "";
requests
| where timestamp > ago(lookback)
| where customDimensions.Category == "Workflow.Operations.Actions"
| extend resource = parse_json(tostring(customDimensions.resource))
| where isempty(workflowName) or tostring(resource.workflowName) =~ workflowName
| summarize runs = count(), p50Ms = percentile(duration, 50), p95Ms = percentile(duration, 95), maxMs = max(duration)
    by workflow = tostring(resource.workflowName), actionName = tostring(resource.actionName), actionType = tostring(customDimensions.actionType)
| top 20 by p95Ms desc
```

### v1

```kusto
let lookback = 24h;
traces
| where timestamp > ago(lookback)
| where customDimensions.EventName == "WorkflowActionEnd"
| extend durationMs = toint(customDimensions.prop__durationInMilliseconds)
| summarize runs = count(), p50Ms = percentile(durationMs, 50), p95Ms = percentile(durationMs, 95), maxMs = max(durationMs)
    by workflow = tostring(parse_json(tostring(customDimensions.prop__properties)).resource.workflowName),
        actionName = tostring(customDimensions.prop__actionName),
        actionType = tostring(customDimensions.prop__actionType)
| top 20 by p95Ms desc
```

## 9. Failed outgoing calls

### v2 and preserve mode

The runtime writes a `dependencies` row for each outgoing HTTP call from an HTTP action or
polling trigger. Dependency tracking is on by default. A dependency's `operation_ParentId`
equals the `id` of its action or trigger row in `requests`.

```kusto
let lookback = 24h;
let workflowName = "";
dependencies
| where timestamp > ago(lookback)
| where tostring(customDimensions.Category) startswith "Workflow." and success == false
| extend resource = parse_json(tostring(customDimensions.resource))
| where isempty(workflowName) or tostring(resource.workflowName) =~ workflowName
| project timestamp,
    workflow = tostring(resource.workflowName),
    runId = tostring(resource.runId),
    step = coalesce(tostring(resource.actionName), tostring(resource.triggerName)),
    target, resultCode, durationMs = duration, operation_ParentId
| order by timestamp desc
```

The query filters on `Workflow.` categories because the host's own storage calls also land
in `dependencies`. Failed storage calls from `WorkflowDispatcher`, such as conflicts, are
normal and do not mean a run failed.

### v1

v1 writes outgoing HTTP failures as traces.

```kusto
let lookback = 24h;
traces
| where timestamp > ago(lookback)
| where customDimensions.EventName == "HttpOutgoingRequestEndWithServerFailure"
| project timestamp,
    operation = tostring(customDimensions.prop__operationName),
    method = tostring(customDimensions.prop__httpMethod),
    statusCode = toint(customDimensions.prop__httpStatusCode),
    durationMs = toint(customDimensions.prop__durationInMilliseconds),
    clientRequestId = tostring(customDimensions.prop__clientRequestId)
| order by timestamp desc
```

## 10. Exception summary

**All modes.** Groups exceptions by type and workflow, with a sample message.

```kusto
let lookback = 24h;
exceptions
| where timestamp > ago(lookback)
| extend workflow = coalesce(tostring(parse_json(tostring(customDimensions.resource)).workflowName), operation_Name)
| summarize count = count(), firstSeen = min(timestamp), lastSeen = max(timestamp), sampleMessage = take_any(coalesce(innermostMessage, outerMessage))
    by type, workflow
| order by count desc
```

| Type | Meaning |
|---|---|
| `ActionFailedException` | An action failed. See [entry 3](#3-failed-actions-with-errors). |
| `TriggerFailedException` | A trigger failed. See [entry 7](#7-trigger-failures). |
| `FunctionInvocationException` with `innermostType` `JobExecutionResultException` | The Functions host logged an action that ended with a set result, often Failed from an input expression error. In v2, join `operation_ParentId` to the action request `id` for the run ID, as below. In v1, correlate on `operation_Id` with the run traces. |

```kusto
let lookback = 24h;
exceptions
| where timestamp > ago(lookback)
| where innermostType endswith "JobExecutionResultException"
| project timestamp, operation_ParentId, message = innermostMessage
| join kind=leftouter (
    requests
    | where timestamp > ago(lookback)
    | extend res = parse_json(tostring(customDimensions.resource))
    | project id, workflow = tostring(res.workflowName), action = tostring(res.actionName), runId = tostring(res.runId))
    on $left.operation_ParentId == $right.id
| project timestamp, workflow, action, runId, message
| order by timestamp desc
```

## 11. Host restarts

**All modes.** Lists host start and stop events. Restarts during an incident can explain
gaps, retries, or duplicate runs.

```kusto
let lookback = 24h;
traces
| where timestamp > ago(lookback)
| where customDimensions.EventName in ("ServiceStarting", "ServiceStarted", "ServiceStopping", "ServiceStopped")
| project timestamp, event = tostring(customDimensions.EventName), instance = cloud_RoleInstance
| order by timestamp desc
```

## 12. Recent runs

**All modes.** Lists the latest runs of a workflow with their status, newest first.

```kusto
let lookback = 1h;
let workflowName = "";
traces
| where timestamp > ago(lookback)
| where customDimensions.EventName == "WorkflowRunEnd"
| extend workflow = coalesce(tostring(parse_json(tostring(customDimensions.resource)).workflowName), tostring(parse_json(tostring(customDimensions.prop__properties)).resource.workflowName))
| where isempty(workflowName) or workflow =~ workflowName
| project timestamp, workflow,
    runId = coalesce(tostring(parse_json(tostring(customDimensions.resource)).runId), tostring(customDimensions.prop__flowRunSequenceId)),
    status = coalesce(trim('"', tostring(customDimensions.status)), tostring(customDimensions.prop__status)),
    statusCode = tostring(customDimensions.prop__statusCode),
    durationMs = toint(customDimensions.prop__durationInMilliseconds),
    clientTrackingId = tostring(customDimensions.prop__clientTrackingId)
| order by timestamp desc
| take 50
```

Runs that are still in progress have a `WorkflowRunStart` row but no `WorkflowRunEnd` row.
To find them, compare the run IDs of the two events.

## 13. Parent and child runs

Pairs each **Call a workflow** action with the child run it started. No mode writes a
dependency row for this call, so the queries join the parent action to the child trigger.

### v2 and preserve mode

```kusto
let lookback = 24h;
let workflowName = "";
let calls = requests
| where timestamp > ago(lookback)
| where customDimensions.Category == "Workflow.Operations.Actions" and customDimensions.actionType == "Workflow"
| summarize timestamp = max(timestamp),
    callStatus = take_anyif(resultCode, resultCode != "0"),
    resource = take_any(tostring(customDimensions.resource)),
    correlation = take_any(tostring(customDimensions.correlation))
    by id
| extend resource = parse_json(resource), correlation = parse_json(correlation)
| where isempty(workflowName) or tostring(resource.workflowName) =~ workflowName
| project timestamp,
    parentWorkflow = tostring(resource.workflowName),
    parentRunId = tostring(resource.runId),
    callAction = tostring(resource.actionName),
    callStatus,
    actionTrackingId = tostring(correlation.actionTrackingId);
let children = requests
| where timestamp > ago(lookback)
| where customDimensions.Category == "Workflow.Operations.Triggers"
| extend resource = parse_json(tostring(customDimensions.resource)), correlation = parse_json(tostring(customDimensions.correlation))
| where isnotempty(tostring(resource.runId))
| project childWorkflow = tostring(resource.workflowName),
    childRunId = tostring(resource.runId),
    actionTrackingId = tostring(correlation.actionTrackingId);
calls
| join kind=inner children on actionTrackingId
| project timestamp, parentWorkflow, parentRunId, callAction, callStatus, childWorkflow, childRunId
| order by timestamp desc
```

The call action writes two rows with the same `id`: one with `resultCode` `"0"` when it
starts and one with the final status. The `summarize` keeps the final status.

### v1

```kusto
let lookback = 24h;
let workflowName = "";
let calls = traces
| where timestamp > ago(lookback)
| where customDimensions.EventName == "WorkflowActionEnd" and customDimensions.prop__actionType == "Workflow"
| extend parentWorkflow = tostring(parse_json(tostring(customDimensions.prop__properties)).resource.workflowName)
| where isempty(workflowName) or parentWorkflow =~ workflowName
| project timestamp, operation_Id, parentWorkflow,
    parentRunId = tostring(customDimensions.prop__flowRunSequenceId),
    callAction = tostring(customDimensions.prop__actionName),
    callStatus = tostring(customDimensions.prop__status);
let starts = traces
| where timestamp > ago(lookback)
| where customDimensions.EventName == "WorkflowRunStart" and customDimensions.Category == "Host.Triggers.Workflows"
| project operation_Id,
    childWorkflow = tostring(parse_json(tostring(customDimensions.prop__properties)).resource.workflowName),
    childRunId = tostring(customDimensions.prop__flowRunSequenceId);
calls
| join kind=inner starts on operation_Id
| where childRunId != parentRunId
| project timestamp, parentWorkflow, parentRunId, callAction, callStatus, childWorkflow, childRunId
| order by timestamp desc
```

In v1 the child run shares the parent's `operation_Id`, so the join pairs them directly.

## 14. Agent loops

Shows each agent run step by step, the model calls behind it, and token usage.

### Iterations and tool actions (v2 and preserve mode)

```kusto
let lookback = 24h;
let workflowName = "";
let agentRuns = requests
| where timestamp > ago(lookback)
| where customDimensions.actionType == "Agent"
| extend resource = parse_json(tostring(customDimensions.resource))
| where isempty(workflowName) or tostring(resource.workflowName) =~ workflowName
| distinct runId = tostring(resource.runId);
requests
| where timestamp > ago(lookback)
| where customDimensions.Category == "Workflow.Operations.Actions"
| extend resource = parse_json(tostring(customDimensions.resource))
| extend runId = tostring(resource.runId)
| where runId in (agentRuns)
| project timestamp,
    workflow = tostring(resource.workflowName),
    runId,
    action = tostring(resource.actionName),
    actionType = tostring(customDimensions.actionType),
    status = resultCode,
    durationMs = duration
| order by runId, timestamp asc
```

The agent action writes one row per loop iteration. Tool actions appear between those rows
with their own action type.

### Model calls (all modes)

```kusto
let lookback = 24h;
dependencies
| where timestamp > ago(lookback)
| where name has "chat/completions"
| project timestamp, operation_Name, operation_Id, name, target, resultCode, success, durationMs = duration
| order by timestamp desc
```

In v1, `operation_Name` is `<workflow>.<agentAction>.ActionInvocation`, `operation_Id`
matches the run, and `operation_ParentId` is the agent action request `id`. In v2,
`operation_Name` is `WorkflowDispatcher`, `operation_Id` is the trace ID of the trigger
request, and `operation_ParentId` matches no row. Use the next query to find the run.

### Model calls mapped to agent actions (v2)

The model call's `operation_Id` is the trigger's trace ID. Where the agent action request
holds that trace ID depends on the mode:

| Mode | Agent request `operation_Id` | Agent request `operation_ParentId` | Trace ID |
|------|------------------------------|------------------------------------|----------|
| v2 | Run ID | W3C traceparent, `00-<traceId>-<spanId>-00` | Second segment of `operation_ParentId` |
| v2 with PreserveIncomingOperationId | Trace ID | `id` of the trigger request | `operation_Id` |

In both modes the model call's `operation_ParentId` matches no row. This query handles both
modes: it reads the trace ID from the traceparent when present and from `operation_Id`
otherwise, joins on it, and keeps the agent request whose time window contains the call.

```kusto
let lookback = 24h;
let agentRequests = requests
| where timestamp > ago(lookback)
| where tostring(customDimensions.actionType) == "Agent"
| extend traceId = iff(operation_ParentId startswith "00-",
    tostring(split(operation_ParentId, "-")[1]), operation_Id)
| extend runId = tostring(parse_json(tostring(customDimensions.resource)).runId)
| project agentRequestId = id, runId, agentAction = name, traceId,
    requestStart = timestamp, requestEnd = timestamp + duration * 1ms;
dependencies
| where timestamp > ago(lookback)
| where type == "HTTP" and name has "chat/completions"
| where tostring(customDimensions.Category) == "Function.WorkflowDispatcher"
| project callId = id, traceId = operation_Id, callStart = timestamp, model = name,
    resultCode, success, durationMs = duration
| join kind=inner agentRequests on traceId
| where callStart between (requestStart .. requestEnd)
| project callStart, callId, model, resultCode, success, durationMs, runId, agentAction,
    agentRequestId
| order by callStart asc
```

The trace ID comes from the incoming trigger request, so every run that request starts shares
it. With PreserveIncomingOperationId, every run started with the same caller `traceparent`
also shares it. If two agent actions with that trace ID overlap in time, a call can match more
than one agent request; say the match is ambiguous. A call that matches no row drops out of the inner join.
Look for it with the model calls query above.

### Token usage (v1, and v2 on newer runtimes)

```kusto
let lookback = 24h;
let workflowName = "";
traces
| where timestamp > ago(lookback)
| where customDimensions.EventName == "WorkflowAgentLoopExecutionCompleted"
| extend workflow = tostring(parse_json(tostring(customDimensions.prop__properties)).resource.workflowName)
| where isempty(workflowName) or workflow =~ workflowName
| project timestamp, workflow,
    runId = tostring(customDimensions.prop__flowRunSequenceId),
    agentAction = tostring(customDimensions.prop__actionName),
    promptTokens = toint(customDimensions.prop__promptTokenCount),
    completionTokens = toint(customDimensions.prop__completionTokenCount),
    toolCalls = toint(customDimensions.prop__toolCount)
| order by timestamp desc
```

v1 always writes this event. Newer v2 runtimes also write it, in both plain and preserve
mode; older v2 runtimes do not, so they have no token counts. If v2 returns no rows, say so.
The event's `prop__durationInMilliseconds` is always `-1`, and a `-1` token count means the
model returned no usage. Its `operation_ParentId` matches no row, so link it to the agent
action request on run ID and action name:

```kusto
let lookback = 24h;
traces
| where timestamp > ago(lookback)
| where customDimensions.EventName == "WorkflowAgentLoopExecutionCompleted"
| extend runId = tostring(customDimensions.prop__flowRunSequenceId),
    agentAction = tostring(customDimensions.prop__actionName)
| summarize promptTokens = sum(toint(customDimensions.prop__promptTokenCount)),
    completionTokens = sum(toint(customDimensions.prop__completionTokenCount)),
    iterations = count() by runId, agentAction
| join kind=leftouter (
    requests
    | where timestamp > ago(lookback)
    | where tostring(customDimensions.actionType) == "Agent"
    | extend resource = parse_json(tostring(customDimensions.resource))
    | summarize agentRequestId = take_any(id), lastStatus = take_any(resultCode)
        by runId = tostring(resource.runId), agentAction = tostring(resource.actionName)
  ) on runId, agentAction
| project runId, agentAction, iterations, promptTokens, completionTokens, agentRequestId, lastStatus
```

The `requests` side is v2 only; v1 requests carry no run ID, so `agentRequestId` stays empty
in v1.
