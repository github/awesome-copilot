---
title: Use Archive Pattern for Historical Data
impact: MEDIUM
impactDescription: "Reduces active collection size, improves query performance, lowers storage costs"
tags: schema, patterns, archive, data-lifecycle, merge, ttl, online-archive
---

## Use Archive Pattern for Historical Data

**Storing old data alongside recent data degrades performance.** As collections grow with historical data that's rarely accessed, queries slow down, indexes bloat, and working set exceeds RAM. The archive pattern moves old data to separate storage while keeping your active collection fast.

**Incorrect (all data in one collection):**

A sales collection with 5 years of data (50M documents) where only the recent 6 months are actively queried suffers from: indexes covering the full 50M documents when only ~1M are relevant, working set including old data pages, backups including rarely-accessed history, and hot-tier storage costs for data that could be cold.

**Correct (archive old data separately):**

```javascript
// Step 1: Define archive threshold (older than 6 months)
const sixMonthsAgo = new Date()
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

// Step 2: Move old data to archive collection using $merge
db.sales.aggregate([
  { $match: { date: { $lt: sixMonthsAgo } } },
  { $merge: {
      into: "sales_archive",
      on: "_id",
      whenMatched: "keepExisting",  // Don't overwrite if re-run
      whenNotMatched: "insert"
    }
  }
])

// Step 3: Delete archived data from active collection
db.sales.deleteMany({ date: { $lt: sixMonthsAgo } })

// Result:
// - sales: Recent data, fast queries, small indexes
// - sales_archive: Historical data, rarely queried
```

**Archive storage options (best to worst for cost/performance):**

1. **External file storage (S3, cloud object storage)** — Best for compliance and long-term retention at lowest cost. Export to JSON/BSON, store in S3, query via Atlas Data Federation when needed.
2. **Separate, cheaper cluster** — Best for occasional historical queries. Replicate to a lower-tier Atlas cluster at reduced cost.
3. **Separate collection on same cluster** — Best for simple implementation with frequent historical access. As shown above with `sales_archive`, but still uses the same storage tier.
4. **Atlas Online Archive (Atlas only)** — MongoDB manages automatic movement to cloud object storage; query via Federated Database Instance.

**Design tips for archivable schemas:**

```javascript
// TIP 1: Use embedded data model for archives
// Archived data must be self-contained

// BAD: References that may be deleted
{
  _id: "order123",
  customerId: "cust456",  // Customer may be deleted
  productIds: ["prod1", "prod2"]  // Products may change
}

// GOOD: Embedded snapshot of related data
{
  _id: "order123",
  customer: {
    _id: "cust456",
    name: "Jane Doe",
    email: "jane@example.com"
  },
  products: [
    { _id: "prod1", name: "Widget", price: 29.99 },
    { _id: "prod2", name: "Gadget", price: 49.99 }
  ],
  date: ISODate("2020-01-15")
}

// TIP 2: Store age in a single, indexable field
// Makes archive queries efficient
{
  date: ISODate("2020-01-15"),  // Single field for age
  // NOT: { year: 2020, month: 1, day: 15 }
}

// TIP 3: Handle "never expire" documents
{
  date: ISODate("2025-01-15"),
  retentionPolicy: "permanent"  // Or use far-future date
}

// Archive query excludes permanent records:
db.sales.aggregate([
  { $match: {
      date: { $lt: fiveYearsAgo },
      retentionPolicy: { $ne: "permanent" }
    }
  },
  { $merge: { into: "sales_archive" } }
])
```

**Automated archival with scheduling:**

Create a script (run via cron, Atlas Triggers, or an application scheduler) that:

1. Counts documents older than the cutoff date (excluding those with `retentionPolicy: "permanent"`).
2. Processes in batches (e.g. 10,000 IDs at a time) to avoid long-running operations: fetch a batch of `_id` values, pipe them through an aggregation with `$match` and `$merge` into the archive collection, then `deleteMany` the batch from the active collection.
3. Logs progress after each batch.

This reuses the same `$merge`-based archival shown above but throttles work to avoid overloading the cluster.

**Atlas Online Archive (Atlas only):**

Atlas Online Archive automatically tiers data to MongoDB-managed cloud object storage based on a date-field rule (e.g. archive after 365 days). Archived data is queried transparently via a Federated Database Instance — slightly slower but much cheaper. No application code changes are required.

**When NOT to use archive pattern:**

- **Small datasets**: If total data fits comfortably in RAM, archiving adds complexity without benefit.
- **Uniform access patterns**: If old and new data are queried equally.
- **Compliance requires instant access**: If regulations require sub-second queries on all historical data.
- **Already using TTL**: If data should be deleted, not archived, use TTL indexes.

## Verify with

```javascript
// Analyze archive candidates
const cutoff = new Date()
cutoff.setFullYear(cutoff.getFullYear() - 5)

db.sales.aggregate([
  { $facet: {
      total: [{ $count: "count" }],
      old: [
        { $match: { date: { $lt: cutoff } } },
        { $count: "count" }
      ]
    }
  }
])
// If old documents are >30% of total, archiving can improve performance
```

Reference: [Archive Pattern](https://mongodb.com/docs/manual/data-modeling/design-patterns/archive/?utm_source=agent-skills)
