---
name: azure-observability
description: "Azure Observability Services including Azure Monitor, Application Insights, Log Analytics, Alerts, and Workbooks. Provides metrics, APM, distributed tracing, KQL queries, and interactive reports. USE FOR: Azure Monitor, Application Insights, Log Analytics, Alerts, Workbooks, metrics, APM, distributed tracing, KQL queries, interactive reports, observability, monitoring dashboards. DO NOT USE FOR: instrumenting apps with App Insights SDK (use appinsights-instrumentation), querying Kusto/ADX clusters (use azure-kusto), cost analysis (use azure-cost-optimization)."
license: MIT
metadata:
  author: Microsoft
  version: "1.0.0"
---

# Azure Observability Services

## Services

| Service | Use When | MCP Tools | CLI |
|---------|----------|-----------|-----|
| Azure Monitor | Metrics, alerts, dashboards | `azure__monitor` | `az monitor` |
| Application Insights | APM, distributed tracing | `azure__applicationinsights` | `az monitor app-insights` |
| Log Analytics | Log queries, KQL | `azure__kusto` | `az monitor log-analytics` |
| Alerts | Notifications, actions | - | `az monitor alert` |
| Workbooks | Interactive reports | `azure__workbooks` | - |

## MCP Server (Preferred)

When Azure MCP is enabled:

### Monitor
- `azure__monitor` with command `monitor_metrics_query` - Query metrics
- `azure__monitor` with command `monitor_logs_query` - Query logs with KQL

### Application Insights
- `azure__applicationinsights` with command `applicationinsights_component_list` - List App Insights resources

### Log Analytics
- `azure__kusto` with command `kusto_cluster_list` - List clusters
- `azure__kusto` with command `kusto_query` - Execute KQL queries

**If Azure MCP is not enabled:** Run `/azure:setup` or enable via `/mcp`.

## CLI Reference

```bash
# List Log Analytics workspaces
az monitor log-analytics workspace list --output table

# Query logs with KQL
az monitor log-analytics query \
  --workspace WORKSPACE_ID \
  --analytics-query "AzureActivity | take 10"

# List Application Insights
az monitor app-insights component list --output table

# List alerts
az monitor alert list --output table

# Query metrics
az monitor metrics list \
  --resource RESOURCE_ID \
  --metric "Percentage CPU"
```

## Common KQL Queries

```kql
// Recent errors
AppExceptions
| where TimeGenerated > ago(1h)
| project TimeGenerated, Message, StackTrace
| order by TimeGenerated desc

// Request performance
AppRequests
| where TimeGenerated > ago(1h)
| summarize avg(DurationMs), count() by Name
| order by avg_DurationMs desc

// Resource usage
AzureMetrics
| where TimeGenerated > ago(1h)
| where MetricName == "Percentage CPU"
| summarize avg(Average) by Resource
```

## Monitoring Strategy

| What to Monitor | Service | Metric/Log |
|-----------------|---------|------------|
| Application errors | App Insights | Exceptions, failed requests |
| Performance | App Insights | Response time, dependencies |
| Infrastructure | Azure Monitor | CPU, memory, disk |
| Security | Log Analytics | Sign-ins, audit logs |
| Costs | Cost Management | Budget alerts |

## SDK Quick References

For programmatic access to monitoring services, see the condensed SDK guides:

- **OpenTelemetry**: [Python](references/sdk/azure-monitor-opentelemetry-py.md) | [TypeScript](references/sdk/azure-monitor-opentelemetry-ts.md) | [Python Exporter](references/sdk/azure-monitor-opentelemetry-exporter-py.md)
- **Monitor Query**: [Python](references/sdk/azure-monitor-query-py.md) | [Java](references/sdk/azure-monitor-query-java.md)
- **Log Ingestion**: [Python](references/sdk/azure-monitor-ingestion-py.md) | [Java](references/sdk/azure-monitor-ingestion-java.md)
- **App Insights Mgmt**: [.NET](references/sdk/azure-mgmt-applicationinsights-dotnet.md)

## Service Details

For deep documentation on specific services:

- Application Insights setup -> `appinsights-instrumentation` skill
- KQL query patterns -> [Log Analytics KQL documentation](https://learn.microsoft.com/azure/azure-monitor/logs/log-query-overview)
- Alert configuration -> [Azure Monitor alerts documentation](https://learn.microsoft.com/azure/azure-monitor/alerts/alerts-overview)
