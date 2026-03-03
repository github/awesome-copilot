# Data Lake Storage Gen2 — Python SDK Quick Reference

> Condensed from **azure-storage-file-datalake-py**. Full patterns (ACL management,
> async client, directory operations, range downloads)
> in the **azure-storage-file-datalake-py** plugin skill if installed.

## Install
pip install azure-storage-file-datalake azure-identity

## Quick Start

> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../auth-best-practices.md) for production patterns.

```python
from azure.storage.filedatalake import DataLakeServiceClient
from azure.identity import DefaultAzureCredential
service_client = DataLakeServiceClient("https://<account>.dfs.core.windows.net", DefaultAzureCredential())
```

## Best Practices
- Use hierarchical namespace for file system semantics
- Use `append_data` + `flush_data` for large file uploads
- Set ACLs at directory level and inherit to children
- Use async client for high-throughput scenarios
- Use `get_paths` with `recursive=True` for full directory listing
- Set metadata for custom file attributes
- Consider Blob API for simple object storage use cases

## Non-Obvious Patterns
```python
# Large file upload requires append + flush
offset = 0
for chunk in chunks:
	file_client.append_data(data=chunk, offset=offset, length=len(chunk))
	offset += len(chunk)
file_client.flush_data(offset)
```
