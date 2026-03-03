# Azure Event Hubs SDK — Java

Package: `azure-messaging-eventhubs` | [README](https://github.com/Azure/azure-sdk-for-java/blob/main/sdk/eventhubs/azure-messaging-eventhubs/) | [Full Troubleshooting Guide](https://github.com/Azure/azure-sdk-for-java/blob/main/sdk/eventhubs/azure-messaging-eventhubs/TROUBLESHOOTING.md)

> ⚠️ **Note:** The detailed Java troubleshooting guide has moved to [Microsoft Learn](https://learn.microsoft.com/azure/developer/java/sdk/troubleshooting-messaging-event-hubs-overview).

## Common Errors

| Exception | Cause | Fix |
|-----------|-------|-----|
| `AmqpException` (connection:forced) | Idle connection disconnected | Auto-recovers; no action needed |
| `AmqpException` (unauthorized-access) | Bad credentials or missing permissions | Verify connection string, SAS, or RBAC roles |
| `AmqpException` (resource-limit-exceeded) | Too many concurrent receivers | Reduce receiver count or upgrade tier |
| `OperationTimeoutException` | Network issue or throttling | Check firewall, try AMQP over WebSockets (port 443) |

## Enable Logging

Configure via SLF4J. Add `logback-classic` dependency and set level for `com.azure.messaging.eventhubs`:

```xml
<logger name="com.azure.messaging.eventhubs" level="DEBUG"/>
```

For AMQP frame tracing:
```xml
<logger name="com.azure.core.amqp" level="DEBUG"/>
```

See [Java SDK logging docs](https://learn.microsoft.com/azure/developer/java/sdk/troubleshooting-messaging-event-hubs-overview) for details.

## Key Issues

- **High CPU / partition imbalance**: Limit to 1.5–3 partitions per CPU core.
- **Consumer disconnected**: Higher priority consumer took ownership. Expected during load balancing. Persistent issues without scaling indicate a problem.
- **Connection sharing**: Reuse `EventHubClientBuilder` connections; avoid creating new clients per operation.

## Checkpointing (BlobCheckpointStore)

Package: `azure-messaging-eventhubs-checkpointstore-blob`

> **Auth:** `DefaultAzureCredential` is for local development. See [auth-best-practices.md](../auth-best-practices.md) for production patterns.

```java
TokenCredential credential = new DefaultAzureCredentialBuilder().build();

BlobContainerAsyncClient blobClient = new BlobContainerClientBuilder()
    .endpoint("https://<storage-account>.blob.core.windows.net/<checkpoint-container>")
    .credential(credential)
    .buildAsyncClient();

EventProcessorClient processor = new EventProcessorClientBuilder()
    .credential("<your-namespace>.servicebus.windows.net", "<your-eventhub>", credential)
    .consumerGroup("$Default")
    .checkpointStore(new BlobCheckpointStore(blobClient))
    .processEvent(eventContext -> {
        // process event
        eventContext.updateCheckpoint();
    })
    .buildEventProcessorClient();
```

**Common issues:**
- **Soft delete / blob versioning**: Disable both on the storage account — they cause delays during load balancing.
- **HTTP 412/409 from storage**: Normal during partition ownership negotiation; not an error.
- **Checkpoint frequency**: Call `updateCheckpoint()` per batch, not per event, to reduce storage calls.

## Filing Issues

Include: partition count, machine specs, instance count, max heap (`-Xmx`), average `EventData` size, traffic pattern, and DEBUG-level logs (±10 min from issue).
