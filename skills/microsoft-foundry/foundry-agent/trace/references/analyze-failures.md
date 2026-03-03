# Analyze Failures — Find and Cluster Failing Traces

Identify failing agent traces, group them by root cause, and produce a prioritized action table.

## Step 1 — Find Failing Traces

```kql
dependencies
| where timestamp > ago(24h)
| where success == false or toint(resultCode) >= 400
| extend
    operation = tostring(customDimensions["gen_ai.operation.name"]),
    errorType = tostring(customDimensions["error.type"]),
    model = tostring(customDimensions["gen_ai.request.model"]),
    agentName = tostring(customDimensions["gen_ai.agent.name"]),
    conversationId = tostring(customDimensions["gen_ai.conversation.id"])
| project timestamp, name, duration, resultCode, errorType, operation, model,
    agentName, conversationId, operation_Id, id
| order by timestamp desc
| take 100
```

## Step 2 — Cluster by Error Type

```kql
dependencies
| where timestamp > ago(24h)
| where success == false or toint(resultCode) >= 400
| extend
    errorType = tostring(customDimensions["error.type"]),
    operation = tostring(customDimensions["gen_ai.operation.name"])
| summarize
    count = count(),
    firstSeen = min(timestamp),
    lastSeen = max(timestamp),
    avgDuration = avg(duration),
    sampleOperationId = take_any(operation_Id)
  by errorType, operation, resultCode
| order by count desc
```

## Step 3 — Prioritized Action Table

Present results as:

| Priority | Error Type | Operation | Count | Result Code | Suggested Action |
|----------|-----------|-----------|-------|-------------|-----------------|
| P0 | timeout | invoke_agent | 15 | 504 | Check agent container health, increase timeout |
| P1 | rate_limited | chat | 8 | 429 | Check quota, add retry logic |
| P2 | content_filter | chat | 5 | 400 | Review prompt for policy violations |
| P3 | tool_error | execute_tool | 3 | 500 | Check tool implementation and permissions |

**Prioritization:** P0 = highest count or most severe (5xx), then by count × recency.

## Step 4 — Drill Into Specific Failure

When the user selects a cluster, show individual failing traces:

```kql
dependencies
| where timestamp > ago(24h)
| where success == false
| where customDimensions["error.type"] == "<selected_error_type>"
| where customDimensions["gen_ai.operation.name"] == "<selected_operation>"
| project timestamp, name, duration, resultCode,
    conversationId = tostring(customDimensions["gen_ai.conversation.id"]),
    responseId = tostring(customDimensions["gen_ai.response.id"]),
    operation_Id
| order by timestamp desc
| take 20
```

Also check `exceptions` table for stack traces:

```kql
exceptions
| where timestamp > ago(24h)
| where operation_Id in ("<operation_id_1>", "<operation_id_2>")
| project timestamp, type, message, outerMessage, details, operation_Id
| order by timestamp desc
```

Offer to view the full conversation for any trace via [Conversation Detail](conversation-detail.md).
