# Azure Monitor Query — Python SDK Quick Reference

> Condensed from **azure-monitor-query-py**. Full patterns (batch queries,
> DataFrame conversion, async clients, dimension filters)
> in the **azure-monitor-query-py** plugin skill if installed.

## Install
pip install azure-monitor-query azure-identity

## Quick Start
> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../auth-best-practices.md) for production patterns.

```python
from azure.monitor.query import LogsQueryClient, MetricsQueryClient
from azure.identity import DefaultAzureCredential
client = LogsQueryClient(DefaultAzureCredential())
```

## Best Practices
- Use timedelta for relative time ranges
- Handle partial results for large queries (check LogsQueryStatus.PARTIAL)
- Use batch queries when running multiple queries
- Set appropriate granularity for metrics to reduce data points
- Convert to DataFrame for easier data analysis
- Use aggregations to summarize metric data
- Filter by dimensions to narrow metric results
