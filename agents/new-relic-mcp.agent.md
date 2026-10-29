---
name: "newrelic-mcp"
description: >
  Use this skill whenever the user wants to query, debug, monitor, or analyze
  anything in New Relic — including logs, metrics, traces, APM data, alerts,
  incidents, dashboards, or infrastructure. Triggers on phrases like "check New Relic",
  "query NRQL", "look at alerts", "analyze performance", "what's happening in production",
  "check error rate", "find slow transactions", "investigate incident", or any request
  to pull observability or monitoring data. Also triggers when the user mentions APM,
  distributed tracing, golden signals, Errors Inbox, or synthetic monitors. Always use
  this skill rather than guessing — it contains the tool list, NRQL syntax, and
  multi-step workflows needed to do it right.
---

# New Relic MCP

> **Note:** The New Relic MCP server is currently in **preview**.
> Before starting, let the user know and point them to the [setup docs](https://docs.newrelic.com/docs/agentic-ai/mcp/overview/) if they haven't connected yet.

---

## MCP Server Setup

**Server URL:** `https://mcp.newrelic.com/mcp/`
**Auth:** OAuth (User API Key — not Ingest key)
**Account ID:** Required for most calls — ask the user if not provided.

```json
{
  "mcpServers": {
    "newrelic-mcp-server": {
      "url": "https://mcp.newrelic.com/mcp/",
      "oauth": {
        "authorizationUrl": "https://login.newrelic.com/oauth2/authorize",
        "tokenUrl": "https://login.newrelic.com/oauth2/token",
        "scopes": ["openid", "profile", "mcp:access"],
        "usePKCE": true
      }
    }
  }
}
```

---

## Tool Reference (30+ tools across 6 categories)

### Discovery
| Tool | What it does |
|------|-------------|
| `get_entity` | Find entity by GUID or name pattern |
| `list_related_entities` | Entities 1 hop away from a given GUID |
| `search_entity_with_tag` | Find entities by tag key/value |
| `list_entity_types` | Full catalog of entity domain/types |
| `list_available_new_relic_accounts` | All accessible account IDs |
| `list_dashboards` | All dashboards for an account |
| `get_dashboard` | Details for a specific dashboard |
| `convert_time_period_to_epoch_ms` | Convert relative time → epoch ms |

### Data Access
| Tool | What it does |
|------|-------------|
| `execute_nrql_query` | Run any NRQL query against NRDB |
| `natural_language_to_nrql_query` | Convert plain English → NRQL, execute, return results |

### Alerting
| Tool | What it does |
|------|-------------|
| `list_recent_issues` | All currently open issues |
| `search_incident` | Filter alert events (open/closed, priority, state) |
| `list_alert_policies` | Alert policies, optionally filtered by name |
| `list_alert_conditions` | Alert conditions for a specific policy |
| `list_synthetic_monitors` | Automated synthetic availability tests |

### Incident Response
| Tool | What it does |
|------|-------------|
| `generate_alert_insights_report` | Deep analysis report for a specific issue |
| `generate_user_impact_report` | End-user impact analysis for an issue |
| `analyze_deployment_impact` | Performance delta before/after a deployment |
| `list_entity_error_groups` | Error groups from Errors Inbox |
| `list_change_events` | Deployment/config change history for an entity |

### Performance Analytics
| Tool | What it does |
|------|-------------|
| `analyze_golden_metrics` | Throughput, latency, error rate, saturation |
| `analyze_transactions` | Slow and error-prone transaction breakdown |
| `analyze_entity_logs` | Error patterns, anomalies, recurring issues |
| `list_recent_logs` | Raw recent logs for an entity |
| `analyze_threads` | Thread state, CPU, memory |
| `list_garbage_collection_metrics` | JVM GC and memory metrics |
| `analyze_kafka_metrics` | Consumer lag, producer throughput, latency, partition balance |

---

## Decision: Which Tool First?

```
User asks about...
├── "what services do I have?" / "find X service"  →  get_entity
├── "any alerts / incidents / issues?"             →  list_recent_issues → search_incident
├── "how is X performing?"                         →  analyze_golden_metrics
├── "what errors are happening?"                   →  list_entity_error_groups → execute_nrql_query
├── "slow transactions"                            →  analyze_transactions
├── "check logs"                                   →  analyze_entity_logs / list_recent_logs
├── "did deploy cause this?"                       →  analyze_deployment_impact
└── anything else / complex                        →  natural_language_to_nrql_query
```

---

## Common Workflows

### Workflow 1: Production Error Investigation
```
1. get_entity           → find the service GUID
2. analyze_golden_metrics → health snapshot
3. list_entity_error_groups → error patterns
4. analyze_entity_logs  → log anomalies
5. list_change_events   → recent deployments
6. execute_nrql_query   → drill into specific errors
```

**NRQL for step 6:**
```nrql
SELECT count(*), error.class, error.message
FROM TransactionError
WHERE entity.guid = '<guid>'
FACET error.class, error.message
SINCE 1 hour ago
LIMIT 20
```

---

### Workflow 2: Performance Degradation
```
1. get_entity              → find the service GUID
2. analyze_transactions    → slow/error-prone endpoints
3. analyze_golden_metrics  → latency trend
4. list_garbage_collection_metrics → JVM health (if Java)
5. analyze_threads         → thread contention
6. analyze_deployment_impact → correlate with a deploy
```

---

### Workflow 3: Alert Investigation
```
1. list_recent_issues             → open issues
2. generate_alert_insights_report → root cause analysis
3. generate_user_impact_report    → customer blast radius
4. get_entity                     → affected service
5. list_related_entities          → upstream/downstream impact
6. analyze_entity_logs            → logs during alert window
7. list_change_events             → correlated changes
```

---

### Workflow 4: Natural Language (Quickest Path)
When the user's request is clear but the right NRQL isn't obvious, use:
```
natural_language_to_nrql_query(request="<user's question verbatim>")
```
This generates + executes NRQL automatically. Best for one-off queries.

---

## NRQL Quick Reference

### Structure
```nrql
SELECT <functions/attributes>
FROM <event_type>
WHERE <filters>
FACET <grouping>
SINCE <time>
LIMIT <n>
TIMESERIES AUTO   -- optional, for trend charts
```

### Key Event Types
- `Transaction` — APM spans
- `TransactionError` — app errors
- `Span` — distributed trace spans
- `Log` — log events
- `Metric` — dimensional metrics
- `SystemSample` — host infrastructure
- `ProcessSample` — process metrics

### Golden Signal Queries

**Latency (p95/p99):**
```nrql
SELECT percentile(duration, 95, 99) FROM Transaction SINCE 1 hour ago TIMESERIES AUTO
```

**Error rate:**
```nrql
SELECT percentage(count(*), WHERE error IS true) FROM Transaction SINCE 1 hour ago
```

**Throughput:**
```nrql
SELECT rate(count(*), 1 minute) FROM Transaction TIMESERIES AUTO SINCE 1 hour ago
```

**Saturation:**
```nrql
SELECT average(cpuPercent), average(memoryUsedPercent) FROM SystemSample SINCE 1 hour ago
```

### Time Ranges
- `SINCE 30 minutes ago`
- `SINCE 1 hour ago UNTIL 5 minutes ago`
- `SINCE '2024-03-01 00:00:00'`
- `SINCE today`

---

## NRQL Rules (Always Follow)

✅ **Do:**
- Always include `SINCE` — be explicit even though default is 1 hour
- Use `LIMIT` to cap results
- Use `FACET` to group by service/error/host
- Use `percentile()` not `average()` for latency (p95/p99 is what matters)
- Filter by `appName`, `service.name`, or `entity.guid` to scope to one service
- Use `TIMESERIES AUTO` when you want to show a trend

❌ **Don't:**
- `SELECT *` without `LIMIT` (can return huge data)
- Query without any `WHERE` clause across a whole account
- Use long time ranges with raw event queries (use aggregations instead)
- Use vague `LIKE '%..%'` patterns on high-cardinality fields

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| No results | Filters too strict or wrong event type | Widen time range, remove a WHERE clause, check attribute name casing |
| Query timeout | Too complex / time range too large | Add WHERE filters, narrow SINCE, reduce FACET cardinality |
| Missing attribute | Not instrumented or wrong name | Use Data Explorer in NR UI to check available attributes |
| Incomplete traces | Distributed tracing not enabled | Verify tracing config + context propagation across services |

---

## For Deeper Reference

See `references/nrql-patterns.md` for:
- Full aggregation function list
- Advanced FACET patterns
- Subquery and nested aggregation examples
- Infrastructure and Kafka-specific query patterns
