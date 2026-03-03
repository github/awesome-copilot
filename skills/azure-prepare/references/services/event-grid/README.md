# Azure Event Grid

Serverless event routing for event-driven architectures.

## When to Use

- Event-driven architectures
- Reactive programming patterns
- Decoupled event routing
- Near real-time event delivery
- Fan-out to multiple subscribers

## Required Supporting Resources

| Resource | Purpose |
|----------|---------|
| None required | Event Grid is serverless |
| Key Vault | Store topic keys |

## Event Sources

| Type | Description |
|------|-------------|
| System Topics | Azure resource events (Storage, Key Vault, etc.) |
| Custom Topics | Your application events |
| Event Domains | Multi-tenant event management |

## Event Schemas

| Schema | Use Case |
|--------|----------|
| Event Grid Schema | Azure native format |
| CloudEvents 1.0 | CNCF standard, cross-platform |

## Environment Variables

| Variable | Value |
|----------|-------|
| `EVENTGRID_TOPIC_ENDPOINT` | Topic endpoint URL |
| `EVENTGRID_TOPIC_KEY` | Topic access key (Key Vault) |

## References

- [Bicep Patterns](bicep.md)
- [Subscriptions](subscriptions.md)
