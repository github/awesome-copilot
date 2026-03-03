# Azure Monitor Ingestion — Python SDK Quick Reference

> Condensed from **azure-monitor-ingestion-py**. Full patterns (async upload,
> sovereign clouds, error callbacks, JSON file upload)
> in the **azure-monitor-ingestion-py** plugin skill if installed.

## Install
pip install azure-monitor-ingestion azure-identity

## Quick Start
> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../auth-best-practices.md) for production patterns.

```python
from azure.monitor.ingestion import LogsIngestionClient
from azure.identity import DefaultAzureCredential
client = LogsIngestionClient(endpoint=DCE_ENDPOINT, credential=DefaultAzureCredential())
client.upload(rule_id=DCR_RULE_ID, stream_name=STREAM_NAME, logs=logs)
```

## Best Practices
- Use DefaultAzureCredential for **local development only**. In production, use ManagedIdentityCredential — see [auth-best-practices.md](../auth-best-practices.md)
- Handle errors gracefully with on_error callback for partial failures
- Include TimeGenerated field — required for all logs
- Match DCR schema — log fields must match DCR column definitions
- Use async client for high-throughput scenarios
- SDK handles batching automatically (1MB chunks, gzip, parallel)
- Monitor ingestion status in Log Analytics
- Use context manager for proper client cleanup

## Non-Obvious Patterns
- DCE endpoint: `https://<name>.<region>.ingest.monitor.azure.com`
- Stream names: `Custom-<TableName>_CL` (custom) or `Microsoft-<TableName>` (built-in)
