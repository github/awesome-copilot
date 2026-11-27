---
title: Use Bucket Pattern to Group Related Data
impact: MEDIUM
impactDescription: "Reduces document count and can align storage with application access patterns like pagination"
tags: schema, patterns, bucket, grouping, pagination, arrays
---

## Use Bucket Pattern to Group Related Data

**Group a series of related items into bounded arrays within a single document.** The bucket pattern separates long series of data into distinct objects, reducing document count and aligning storage with how data is actually consumed. This is especially useful when an application accesses data in fixed-size groups (e.g. pages).

> **For time-series data**, prefer [Time Series Collections](https://www.mongodb.com/docs/manual/core/timeseries-collections/?utm_source=agent-skills), which apply bucketing automatically with built-in compression and indexing optimizations.

**Incorrect (one document per event):**

Storing one document per stock trade (e.g. `{ ticker, customerId, type, quantity, date }`) means the application pages through trades using skip/limit, which degrades as offset grows. Each trade is a separate document and index entry.

**Correct (bucket pattern - group by customer, bounded per page):**

Each document holds up to N trades for one customer (e.g. 10 trades = one page). The `_id` encodes customer ID and the first trade’s epoch seconds (e.g. `"123_1698349623"`), with a `count` field and a `history` array of trade objects. One bucket equals one page of data — a regex on `_id` uses the default `_id` index with no extra index needed, and document count drops by up to the bucket-size factor.

**Insert with atomic upsert:**

```javascript
// Insert a new trade into the correct bucket
db.trades.findOneAndUpdate(
  {
    "_id": /^123_/,            // Match buckets for this customer
    "count": { $lt: 10 }       // Only if bucket isn't full
  },
  {
    $push: {
      history: {
        type: "buy",
        ticker: "MSFT",
        qty: 42,
        date: ISODate("2023-11-02T11:43:10Z")
      }
    },
    $inc: { count: 1 },
    $setOnInsert: {
      _id: "123_1698939791",   // New bucket ID if upsert fires
      customerId: 123
    }
  },
  { upsert: true, sort: { _id: -1 } }
)
// If a bucket with room exists, the trade is pushed into it
// Otherwise a new bucket document is created
// Array is bounded — never exceeds 10 elements
```

**Query patterns:**

```javascript
// Page 1 of trades for customer 123
db.trades.find({ _id: /^123_/ }).sort({ _id: 1 }).limit(1)

// Page N (e.g. page 10)
db.trades.find({ _id: /^123_/ }).sort({ _id: 1 }).skip(9).limit(1)

// Each returned document IS a page — no per-trade skip/limit needed
```

**Choosing bucket boundaries:**

| Bucketing Strategy | Good For | Example |
|-------------------|----------|---------|
| Fixed count (N items) | Pagination, evenly-sized pages | 10 trades per bucket |
| Time window | Log/event grouping (when not using Time Series Collections) | 1 hour of events per bucket |
| Logical grouping | Domain-driven partitioning | All line items in one order |

**When NOT to use this pattern:**

- **Time-series workloads**: Use [Time Series Collections](https://www.mongodb.com/docs/manual/core/timeseries-collections/?utm_source=agent-skills) instead — they handle bucketing, compression, and indexing automatically.
- **Random single-item access**: If you frequently query individual items by their own ID, buckets add unnecessary indirection.
- **Low volume**: If the total series per entity is small, the added complexity isn't worth it.
- **Highly variable item sizes**: Bucketing works best when items are roughly uniform in size so bucket documents stay predictable.

## Verify with

```javascript
// Check that bucket size matches expectations
db.trades.aggregate([
  { $group: {
    _id: null,
    avgCount: { $avg: "$count" },
    maxCount: { $max: "$count" },
    totalBuckets: { $sum: 1 }
  }}
])
// avgCount should approach your target bucket size
// maxCount should not exceed it

// Check average document size
db.trades.aggregate([
  { $project: { size: { $bsonSize: "$$ROOT" } } },
  { $group: { _id: null, avgSize: { $avg: "$size" } } }
])
```

Reference: [Group Data with the Bucket Pattern](https://www.mongodb.com/docs/manual/data-modeling/design-patterns/group-data/bucket-pattern/?utm_source=agent-skills)
