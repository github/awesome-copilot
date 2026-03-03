# Azure Service Bus

Enterprise messaging with queues and pub/sub topics.

## When to Use

- Reliable message delivery
- Pub/sub messaging patterns
- Message ordering requirements
- Dead-letter handling
- Transaction support
- Enterprise integration

## Required Supporting Resources

| Resource | Purpose |
|----------|---------|
| None required | Service Bus is self-contained |
| Key Vault | Store connection strings (legacy) |

## SKU Selection

| SKU | Features | Use Case |
|-----|----------|----------|
| Basic | Queues only, 256KB messages | Simple messaging |
| Standard | Topics, 256KB messages | Pub/sub patterns |
| Premium | 100MB messages, VNET, zones | Enterprise, high throughput |

## Environment Variables

### Managed Identity (Recommended)

| Variable | Value |
|----------|-------|
| `SERVICEBUS__fullyQualifiedNamespace` | `<namespace>.servicebus.windows.net` |
| `SERVICEBUS_NAMESPACE` | Namespace name (for SDK) |
| `SERVICEBUS_QUEUE` | Queue name |

**Required RBAC roles:**
- `Azure Service Bus Data Sender` (69a216fc-b8fb-44d8-bc22-1f3c2cd27a39) - for sending
- `Azure Service Bus Data Receiver` (4f6d3b9b-027b-4f4c-9142-0e5a2a2247e0) - for receiving

### Connection String (Legacy)

| Variable | Value |
|----------|-------|
| `SERVICEBUS_CONNECTION_STRING` | Connection string (Key Vault) |
| `SERVICEBUS_NAMESPACE` | Namespace name |
| `SERVICEBUS_QUEUE` | Queue name |

## References

- [Bicep Patterns](bicep.md)
- [Messaging Patterns](patterns.md)
