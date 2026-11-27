# Atlas Slow Query Logs

## When to use

Retrieves log lines for slow queries as determined by the Performance Advisor. Use to identify slow queries and performance bottlenecks. Provides actual query examples (not shapes) with execution times. Captures all operation types including writes, unlike Query Stats which currently only covers find/aggregate/distinct.

## Requirements

- Atlas M10+ cluster
- Atlas API credentials configured
- Performance Advisor enabled (enabled by default on M10+)

If the API call returns auth or access errors, see the [Performance Advisor docs](https://www.mongodb.com/docs/atlas/performance-advisor/?utm_source=agent-skills).

## How to use

Atlas Admin API endpoint ([query parameters reference](https://www.mongodb.com/docs/ops-manager/current/reference/api/performance-advisor/get-slow-queries/?utm_source=agent-skills#request-query-parameters)):
```
GET /groups/{PROJECT-ID}/hosts/{HOST-ID}/performanceAdvisor/slowQueryLogs
```

With MongoDB MCP server:
```javascript
mcp__plugin_mongodb_mongodb__atlas-get-performance-advisor({
  projectId: "507f1f77bcf86cd799439011",
  clusterName: "MyCluster",
  operations: ["slowQueryLogs"]
})
```

Performance Advisor analyzes up to 200,000 of the cluster's most recent log lines.

**Example response structure:**
```javascript
{
  "slowQueries": [
    {
      "line": "2026-05-06T10:23:45.447+0000 I COMMAND [conn10614] command mydb.orders appName: \"MongoDB Shell\" command: find { find: \"orders\", filter: { status: \"pending\", customerId: 12345 }, sort: { createdAt: -1 } } planSummary: COLLSCAN keysExamined:0 docsExamined:50000 nreturned:100 executionTimeMillis:1247 ...",
      "namespace": "mydb.orders"
    }
  ]
}
```

The response contains raw log lines. Parse the log line to extract:
- Timestamp (beginning of line)
- Operation type (command: find, aggregate, update, etc.)
- Query details (filter, pipeline, etc.)
- Execution metrics (executionTimeMillis, docsExamined, planSummary, etc.)

## What to Look For

When analyzing slow query logs, focus on:

**Slow $lookup operations:**
- Look for `$lookup` in the log line
- Consider embedding to reduce slow $lookup operations
- Cross-reference with Query Stats to identify frequent lookups
- High executionTimeMillis + high frequency = urgent schema redesign

**Other slow aggregations:**
- Consider the Computed Pattern to avoid slow aggregations

