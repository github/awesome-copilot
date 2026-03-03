# Azure Cosmos DB

Globally distributed, multi-model database for low-latency data at scale.

## When to Use

- Global distribution requirements
- Multi-model data (document, graph, key-value)
- Variable and unpredictable throughput
- Low-latency reads/writes at scale
- Flexible schema requirements

## Required Supporting Resources

| Resource | Purpose |
|----------|---------|
| None required | Cosmos DB is fully managed |
| Key Vault | Store connection strings (recommended) |

## Capacity Modes

| Mode | Use Case | Billing |
|------|----------|---------|
| **Serverless** | Variable/low traffic, dev/test | Per request |
| **Provisioned** | Predictable workloads | Per RU/s |
| **Autoscale** | Variable but predictable peaks | Per max RU/s |

## Consistency Levels

| Level | Latency | Consistency |
|-------|---------|-------------|
| Strong | Highest | Linearizable |
| Bounded Staleness | High | Bounded |
| Session | Medium | Session-scoped |
| Consistent Prefix | Low | Prefix ordering |
| Eventual | Lowest | Eventually consistent |

Recommendation: Use **Session** for most applications.

## Environment Variables

| Variable | Value |
|----------|-------|
| `COSMOS_CONNECTION_STRING` | Primary connection string (Key Vault reference) |
| `COSMOS_ENDPOINT` | Account endpoint URL |
| `COSMOS_DATABASE` | Database name |

## References

- [Bicep Patterns](bicep.md)
- [Partition Key Selection](partitioning.md)
- [SDK Connection Patterns](sdk.md)
