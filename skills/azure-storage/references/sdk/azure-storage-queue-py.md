# Queue Storage — Python SDK Quick Reference

> Condensed from **azure-storage-queue-py**. Full patterns (async client,
> base64 encoding, queue properties, message updates)
> in the **azure-storage-queue-py** plugin skill if installed.

## Install
pip install azure-storage-queue azure-identity

## Quick Start

> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../auth-best-practices.md) for production patterns.

```python
from azure.storage.queue import QueueClient
from azure.identity import DefaultAzureCredential
queue_client = QueueClient("https://<account>.queue.core.windows.net", "myqueue", DefaultAzureCredential())
```

## Best Practices
- Delete messages after processing to prevent reprocessing
- Set appropriate visibility timeout based on processing time
- Handle `dequeue_count` for poison message detection
- Use async client for high-throughput scenarios
- Use `peek_messages` for monitoring without affecting queue
- Set `time_to_live` to prevent stale messages
- Consider Service Bus for advanced features (sessions, topics)
