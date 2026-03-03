# Azure Event Hubs SDK — .NET (C#)

Package: `Azure.Messaging.EventHubs` | [README](https://github.com/Azure/azure-sdk-for-net/blob/main/sdk/eventhub/Azure.Messaging.EventHubs/) | [Full Troubleshooting Guide](https://github.com/Azure/azure-sdk-for-net/blob/main/sdk/eventhub/Azure.Messaging.EventHubs/TROUBLESHOOTING.md)

## Common Errors

| Exception | Reason | Fix |
|-----------|--------|-----|
| `EventHubsException` (ServiceTimeout) | Service didn't respond in time | Transient — retried automatically. Verify state if persists |
| `EventHubsException` (QuotaExceeded) | Too many active readers per consumer group | Reduce concurrent receivers or upgrade tier |
| `EventHubsException` (ConsumerDisconnected) | Higher priority consumer took ownership | Expected during load balancing; check if scaling |
| `EventHubsException` (MessageSizeExceeded) | Event too large | Reduce event payload; unlikely in practice since the client caps at the service link limit |
| `UnauthorizedAccessException` | Bad credentials | Verify connection string, SAS token, or RBAC roles |

## Exception Filtering

```csharp
try { /* receive events */ }
catch (EventHubsException ex) when (ex.Reason == EventHubsException.FailureReason.ConsumerDisconnected)
{
    // Handle consumer disconnection
}
```

## Retry Configuration

Configure via `EventHubsRetryOptions` when creating the client. See [Configuring retry thresholds sample](https://github.com/Azure/azure-sdk-for-net/blob/main/sdk/eventhub/Azure.Messaging.EventHubs/samples).

## Key Issues

- **Socket exhaustion**: Treat clients as singletons. Share `EventHubConnection` across clients if needed. Always call `CloseAsync` or `DisposeAsync`.
- **HTTP 412/409 from storage**: Normal during checkpoint store operations — not an error.
- **Partitions closing frequently**: Expected when scaling. If persists >5 min without scaling, investigate. See [Troubleshooting Guide](https://github.com/Azure/azure-sdk-for-net/blob/main/sdk/eventhub/Azure.Messaging.EventHubs/TROUBLESHOOTING.md) for detailed diagnostics.
- **High CPU**: Limit to 1.5–3 partitions per CPU core and test at scale thoroughly if above that threshold.
- **Azure Functions**: After upgrading to v5.0+ extensions, update binding types. Reduce logging noise by filtering `Azure.Messaging.EventHubs` to Warning.
- **WebSockets**: Use `EventHubsTransportType.AmqpWebSockets` to connect over port 443 when AMQP ports (5761, 5762) are blocked.

## Checkpointing (BlobCheckpointStore)

Package: `Azure.Messaging.EventHubs.Processor` (includes `EventProcessorClient` + blob checkpoint store)

> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../auth-best-practices.md) for production patterns.

```csharp
var credential = new DefaultAzureCredential();

var storageClient = new BlobContainerClient(
    new Uri("https://<storage-account>.blob.core.windows.net/<checkpoint-container>"),
    credential);

var processor = new EventProcessorClient(
    storageClient,
    "$Default",
    "<your-namespace>.servicebus.windows.net",
    "<your-eventhub>",
    credential);

processor.ProcessEventAsync += async (args) =>
{
    // process event
    await args.UpdateCheckpointAsync();
};
```

**Common issues:**
- **Soft delete / blob versioning**: Disable both on the storage account — they cause delays during load balancing.
- **HTTP 412/409 from storage**: Normal during partition ownership negotiation; not an error.
- **Checkpoint frequency**: Call `UpdateCheckpointAsync()` per batch, not per event, to reduce storage calls.
