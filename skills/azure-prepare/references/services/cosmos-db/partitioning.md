# Cosmos DB Partition Key Selection

## Good Partition Keys

A good partition key should have:

- **High cardinality** - Many distinct values
- **Even data distribution** - No hot partitions
- **Even request distribution** - Balanced workload
- **Used in most queries** - Enables efficient routing

## Examples by Scenario

| Scenario | Partition Key | Reason |
|----------|---------------|--------|
| User-centric data | `/userId` | Queries typically filter by user |
| Multi-tenant apps | `/tenantId` | Isolates tenant data |
| E-commerce orders | `/customerId` | Orders queried by customer |
| IoT telemetry | `/deviceId` | High cardinality, even distribution |

## Hierarchical Partition Keys

For complex scenarios, use hierarchical keys:

```bicep
partitionKey: {
  paths: ['/tenantId', '/userId']
  kind: 'MultiHash'
}
```

## Anti-Patterns

Avoid these partition key choices:

| Bad Choice | Problem |
|------------|---------|
| Timestamp | Creates hot partitions |
| Boolean values | Only 2 partitions |
| Low cardinality enums | Uneven distribution |
| Random GUID | Can't query efficiently |
