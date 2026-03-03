# Blob Storage — Python SDK Quick Reference

> Condensed from **azure-storage-blob-py**. Full patterns (SAS tokens,
> async client, performance tuning, blob properties/metadata)
> in the **azure-storage-blob-py** plugin skill if installed.

## Install
pip install azure-storage-blob azure-identity

## Quick Start
```python
from azure.storage.blob import BlobServiceClient
from azure.identity import DefaultAzureCredential
blob_service_client = BlobServiceClient("https://<account>.blob.core.windows.net", DefaultAzureCredential())
```

## Best Practices
- Use DefaultAzureCredential for **local development only** — in production, use ManagedIdentityCredential. See [auth-best-practices.md](../auth-best-practices.md)
- Use context managers for async clients
- Set `overwrite=True` explicitly when re-uploading
- Use `max_concurrency` for large file transfers
- Prefer `readinto()` over `readall()` for memory efficiency
- Use `walk_blobs()` for hierarchical listing
- Set appropriate content types for web-served blobs
