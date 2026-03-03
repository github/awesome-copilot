# Azure Event Hubs SDK — JavaScript

Package: `@azure/event-hubs` | [README](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/eventhub/event-hubs/) | [Full Troubleshooting Guide](https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/eventhub/event-hubs/TROUBLESHOOTING.md)

## Common Errors

| Error | Code | Fix |
|-------|------|-----|
| `MessagingError` (connection:forced) | Idle disconnect | Auto-recovers; no action needed |
| `MessagingError` (Unauthorized) | Bad credentials | Verify connection string, SAS, or RBAC roles |
| `MessagingError` (retryable: true) | Transient issue | Auto-retried per `RetryOptions`. If surfaced, all retries exhausted |

`MessagingError` fields: `name`, `code`, `retryable`, `info`, `address`, `errno`, `port`, `syscall`.

## Enable Logging

```bash
# All SDK logs
export AZURE_LOG_LEVEL=verbose

# Or use DEBUG for granular control
export DEBUG=azure*,rhea*

# Errors only
export DEBUG=azure:*:(error|warning),rhea-promise:error,rhea:events,rhea:frames,rhea:io,rhea:flow
```

Browser:
```javascript
localStorage.debug = "azure:*:info";
```

## Key Issues

- **Socket exhaustion**: Treat clients as singletons. Each new client creates a new AMQP connection/socket. Always call `close()`.
- **412 precondition failures**: Normal during subscription partition ownership negotiation.
- **Partition ownership churn**: Expected when scaling instances. Should stabilize within minutes.
- **High CPU**: Limit to 1.5–3 partitions per CPU core.
- **Subscription stops receiving**: Often a symptom of an underlying race condition during error recovery. File a GitHub issue with DEBUG logs.
- **WebSockets**: Pass `webSocketOptions` to client constructor to connect over port 443.

## Checkpointing (BlobCheckpointStore)

Package: `@azure/eventhubs-checkpointstore-blob`

```javascript
const { BlobCheckpointStore } = require("@azure/eventhubs-checkpointstore-blob");
const { BlobServiceClient } = require("@azure/storage-blob");

const containerClient = new BlobServiceClient(storageEndpoint, credential)
  .getContainerClient("checkpointstore");
const checkpointStore = new BlobCheckpointStore(containerClient);

const consumerClient = new EventHubConsumerClient(
  consumerGroup, fullyQualifiedNamespace, eventHubName, credential, checkpointStore
);
```

**Common issues:**
- **Soft delete / blob versioning**: Disable both on the storage account — they cause delays during load balancing.
- **412 precondition failures**: Normal during partition ownership negotiation; not an error.
- **Checkpoint frequency**: Call `updateCheckpoint()` per batch, not per event, to reduce storage calls.
