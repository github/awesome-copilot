# File Shares — Python SDK Quick Reference

> Condensed from **azure-storage-file-share-py**. Full patterns (async client,
> snapshots, range operations, copy, SAS tokens)
> in the **azure-storage-file-share-py** plugin skill if installed.

## Install
pip install azure-storage-file-share azure-identity

## Quick Start

> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../auth-best-practices.md) for production patterns.

```python
from azure.storage.fileshare import ShareServiceClient
from azure.identity import DefaultAzureCredential
service = ShareServiceClient("https://<account>.file.core.windows.net", DefaultAzureCredential())
```

## Best Practices
- Use connection string for simplest setup
- Use Entra ID for production with RBAC
- Stream large files using chunks() to avoid memory issues
- Create snapshots before major changes
- Set quotas to prevent unexpected storage costs
- Use ranges for partial file updates
- Close async clients explicitly
