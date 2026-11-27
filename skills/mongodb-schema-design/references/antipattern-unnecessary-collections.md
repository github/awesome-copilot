---
title: Reduce Unnecessary Collections
impact: CRITICAL
impactDescription: "Reduces avoidable joins when related data is repeatedly queried together"
tags: schema, collections, anti-pattern, embedding, normalization, atlas-suggestion
---

## Reduce Unnecessary Collections

**Collection count alone is not the anti-pattern.** The anti-pattern is using collections as a substitute for indexes — creating one collection per category, time period, or partition key instead of indexing a single collection. Every collection carries a default `_id` index that consumes storage and strains the replica set, and cross-collection queries require `$lookup` or `$unionWith`, adding complexity and overhead.

**Incorrect (one collection per day as partitioning strategy):**

Creating one collection per time period (e.g. `temperatures_2024_05_10`, `temperatures_2024_05_11`, …) means each collection carries its own default `_id` index (365 collections/year = 365 extra indexes), cross-day queries require `$unionWith` across many collections, schema validation / indexes / TTL must be duplicated on every collection, and application code must dynamically resolve the collection name for each query.

**Correct (single collection with an index):**

```javascript
// All readings in one collection — the index does the partitioning work
{ _id: ObjectId(), timestamp: ISODate("2024-05-10T10:00:00Z"), temperature: 60 }
{ _id: ObjectId(), timestamp: ISODate("2024-05-10T11:00:00Z"), temperature: 61 }
{ _id: ObjectId(), timestamp: ISODate("2024-05-11T10:00:00Z"), temperature: 68 }

db.temperatures.createIndex({ timestamp: 1 })

// Efficient range query — one collection, one index
db.temperatures.find({
  timestamp: { $gte: ISODate("2024-05-10"), $lt: ISODate("2024-05-11") }
})

// Optional TTL for automatic expiry (e.g. 90 days)
db.temperatures.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 })
```

**Even better (bucket pattern or time series collection):**

For high-volume time-stamped data, group readings into buckets or use a native time series collection, which is optimized for this workload:

```javascript
// Bucket pattern — one document per day
{
  _id: ISODate("2024-05-10T00:00:00Z"),
  readings: [
    { timestamp: ISODate("2024-05-10T10:00:00Z"), temperature: 60 },
    { timestamp: ISODate("2024-05-10T11:00:00Z"), temperature: 61 },
    { timestamp: ISODate("2024-05-10T12:00:00Z"), temperature: 64 }
  ]
}

// In this particular case, a native time series collection
// is also a good option to consider
db.createCollection("temperatures", {
  timeseries: { timeField: "timestamp", granularity: "hours" }
})
```

**When to use separate collections:**

| Scenario | Separate Collection | Why |
|----------|--------------------|----|
| Data accessed independently | Yes | Different query patterns |
| Unbounded relationships | Yes | Prevents document growth |
| Many-to-many | Yes | Students ↔ Courses |
| 1:1 always together | No (embed) | User and profile |

**When NOT to use this pattern:**

- **Data is genuinely independent**: Products exist separately from orders; don't embed full product catalog in every order.
- **Frequent independent updates**: If customer email changes shouldn't update all historical orders (it shouldn't).
- **Data is accessed in different contexts**: Same address entity used for shipping, billing, user profile—keep it separate.
- **Regulatory requirements**: Some industries require normalized data for audit trails.

## Verify with

```javascript
// Count your collections
for (const d of db.adminCommand({ listDatabases: 1 }).databases) {
  const colls = db.getSiblingDB(d.name).getCollectionNames().length
  print(`${d.name}: ${colls} collections`)
}
// Count alone is not sufficient: combine with access and index/storage evidence
```

### Check if collections are always accessed together.

For Atlas M10+ use $queryStats. See [Query Stats](references/source-query-stats.md)
Use codebase if available, ask the user.

Atlas Schema Suggestions flags: "Reduce number of collections"

Reference: [Reduce the Number of Collections](https://mongodb.com/docs/manual/data-modeling/design-antipatterns/reduce-collections/?utm_source=agent-skills)
