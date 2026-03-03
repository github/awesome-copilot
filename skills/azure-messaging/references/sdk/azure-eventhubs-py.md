# Azure Event Hubs SDK — Python

Package: `azure-eventhub` | [README](https://github.com/Azure/azure-sdk-for-python/blob/main/sdk/eventhub/azure-eventhub) | [Full Troubleshooting Guide](https://github.com/Azure/azure-sdk-for-python/blob/main/sdk/eventhub/azure-eventhub/TROUBLESHOOTING.md)

## Common Errors

| Exception | Cause | Fix |
|-----------|-------|-----|
| `EventHubError` | Base exception wrapping AMQP errors | Check `message`, `error`, `details` fields |
| `ConnectionLostError` | Idle connection disconnected | Auto-recovers on next operation; no action needed |
| `AuthenticationError` | Bad credentials or expired SAS | Regenerate key, check RBAC roles, verify connection string |
| `OperationTimeoutError` | Network or throttling | Check firewall, try WebSockets (port 443), increase timeout |

## Retry Configuration

> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../auth-best-practices.md) for production patterns.

```python
from azure.eventhub import EventHubProducerClient
from azure.identity import DefaultAzureCredential

client = EventHubProducerClient(
    fully_qualified_namespace="<your-namespace>.servicebus.windows.net",
    eventhub_name="<your-eventhub>",
    credential=DefaultAzureCredential(),
    retry_total=3,
    retry_backoff_factor=0.8,
    retry_backoff_max=120,
    retry_mode='exponential'
)
```

## Enable Logging

```python
import logging, sys

handler = logging.StreamHandler(stream=sys.stdout)
handler.setFormatter(logging.Formatter("%(asctime)s | %(threadName)s | %(levelname)s | %(name)s | %(message)s"))
logger = logging.getLogger('azure.eventhub')
logger.setLevel(logging.DEBUG)
logger.addHandler(handler)

# Enable AMQP frame tracing
client = EventHubProducerClient(..., logging_enable=True)
```

## Key Issues

- **Buffered producer not sending**: Ensure enough `ThreadPoolExecutor` workers (one per partition). Use `buffer_concurrency` kwarg.
- **Blocking calls in async**: Run CPU-bound code in an executor; blocking the event loop impacts load balancing and checkpointing.
- **Consumer disconnected**: Expected during load balancing. If persistent with no scaling, file an issue.
- **Soft delete on checkpoint store**: Disable "soft delete" and "blob versioning" on the storage account used for checkpointing.
- **Always close clients**: Use `with` statement or call `close()` to avoid socket/connection leaks.

## Checkpointing (BlobCheckpointStore)

Package: `azure-eventhub-checkpointstoreblob` (sync) / `azure-eventhub-checkpointstoreblob-aio` (async)

> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../auth-best-practices.md) for production patterns.

```python
from azure.eventhub import EventHubConsumerClient
from azure.eventhub.extensions.checkpointstoreblob import BlobCheckpointStore
from azure.identity import DefaultAzureCredential

credential = DefaultAzureCredential()
checkpoint_store = BlobCheckpointStore(
    blob_account_url="https://<storage-account>.blob.core.windows.net",
    container_name="<checkpoint-container>",
    credential=credential
)
client = EventHubConsumerClient(
    fully_qualified_namespace="<your-namespace>.servicebus.windows.net",
    eventhub_name="<your-eventhub>",
    consumer_group="$Default",
    credential=credential,
    checkpoint_store=checkpoint_store
)
```

**Common issues:**
- **Soft delete / blob versioning**: Disable both on the storage account — they cause large delays during load balancing.
- **HTTP 412/409 from storage**: Normal during partition ownership negotiation; not an error.
- **Checkpoint frequency**: Checkpoint after processing each batch, not each event, to avoid storage throttling.
