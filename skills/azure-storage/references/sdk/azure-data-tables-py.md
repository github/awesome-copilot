# Tables — Python SDK Quick Reference

> Condensed from **azure-data-tables-py**. Full patterns (batch operations,
> async client, typed entities, query parameters)
> in the **azure-data-tables-py** plugin skill if installed.

## Install
pip install azure-data-tables azure-identity

## Quick Start

> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../auth-best-practices.md) for production patterns.

```python
from azure.data.tables import TableClient
from azure.identity import DefaultAzureCredential
table_client = TableClient("https://<account>.table.core.windows.net", "mytable", DefaultAzureCredential())
```

## Best Practices
- Design partition keys for query patterns and even distribution
- Query within partitions whenever possible (cross-partition is expensive)
- Use batch operations for multiple entities in same partition
- Use `upsert_entity` for idempotent writes
- Use parameterized queries to prevent injection
- Keep entities small — max 1MB per entity
- Use async client for high-throughput scenarios
