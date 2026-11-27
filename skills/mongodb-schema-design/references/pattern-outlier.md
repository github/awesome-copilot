---
title: Use Outlier Pattern for Exceptional Documents
impact: MEDIUM
impactDescription: "Isolates unusually large documents so hot-path queries stay optimized for typical cases"
tags: schema, patterns, outlier, arrays, performance, edge-cases
---

## Use Outlier Pattern for Exceptional Documents

**Isolate atypical documents with large arrays to prevent them from degrading performance for typical queries.** When a small subset of documents is much larger than the rest, those outliers can dominate memory, index, and query costs. Split overflow data into a separate collection and flag the document.

**Problem scenario:**

A typical book might have 50 customers in an embedded array, while a bestseller like Harry Potter accumulates 50,000 (~2.5MB). Queries return the full document, so the outlier dominates memory and network cost. A multikey index on that array produces 50,000 entries for a single document.

**Correct (outlier pattern):**

Typical documents keep their full embedded array and set `hasExtras: false`. Outlier documents cap the embedded array at a threshold (e.g. 50), set `hasExtras: true`, store a denormalized `customerCount`, and overflow remaining items into a separate collection in batched documents (e.g. `{ bookId, customers: [...], batch: 1, count: 950 }`). Application code checks the `hasExtras` flag to decide whether to load overflow batches.

**Implementation with threshold (example; tune per workload):**

```javascript
const CUSTOMER_THRESHOLD = 50

async function addCustomer(bookId, customerId) {
  // Try the normal case first: atomically add to the embedded array only if
  // the current customerCount is below the threshold (treat missing/null as 0).
  const result = await db.books.updateOne(
    {
      _id: bookId,
      $or: [
        { customerCount: { $lt: CUSTOMER_THRESHOLD } },
        { customerCount: { $exists: false } },
        { customerCount: null }
      ]
    },
    {
      $push: { customers: customerId },
      $inc: { customerCount: 1 }
    }
  )

  if (result.matchedCount > 0) {
    // Normal case succeeded - customer added to embedded array
    return
  }

  // Outlier case - add to overflow collection
  const lastBatchDoc = await db.book_customers_extra
    .find({ bookId: bookId })
    .sort({ batch: -1 })
    .limit(1)
    .next()

  const nextBatch = lastBatchDoc ? lastBatchDoc.batch + 1 : 1
  const targetBatch =
    lastBatchDoc && lastBatchDoc.count < 1000
      ? lastBatchDoc.batch
      : nextBatch

  // First, try to append to the intended batch, enforcing the 1000-item cap under concurrency.
  const overflowFilter = { bookId: bookId, batch: targetBatch }
  if (targetBatch !== nextBatch) {
    // Only enforce the count cap when targeting an existing batch.
    overflowFilter.count = { $lt: 1000 }
  }

  const overflowResult = await db.book_customers_extra.updateOne(
    overflowFilter, // Write to the intended batch, respecting the count cap when reusing a batch
    {
      $push: { customers: customerId },
      $inc: { count: 1 },
      $setOnInsert: { bookId: bookId, batch: targetBatch }
    },
    { upsert: targetBatch === nextBatch }
  )

  // If we failed to match when trying to reuse the previous batch (it filled concurrently),
  // fall back to writing into the next batch.
  if (overflowResult.matchedCount === 0 && targetBatch !== nextBatch) {
    await db.book_customers_extra.updateOne(
      { bookId: bookId, batch: nextBatch },
      {
        $push: { customers: customerId },
        $inc: { count: 1 },
        $setOnInsert: { bookId: bookId, batch: nextBatch }
      },
      { upsert: true }
    )
  }

  await db.books.updateOne(
    { _id: bookId },
    {
      $set: { hasExtras: true },
      $inc: { customerCount: 1 }
    }
  )
}
```

**Index strategy:**

```javascript
// Index on main collection - only 50 entries per outlier doc
db.books.createIndex({ "customers": 1 })

// Index on overflow collection
db.book_customers_extra.createIndex({ bookId: 1 })
db.book_customers_extra.createIndex({ customers: 1 })
```

**When to use outlier pattern:**

| Scenario | What to measure | Example |
|----------|-----------------|---------|
| Book customers | Array-size distribution and long tail | Bestsellers vs. typical books |
| Social followers | Growth rate and read-path impact | Celebrities vs. regular users |
| Product reviews | Index fan-out and read locality | Viral products vs. typical |
| Event attendees | Outlier frequency vs. implementation complexity | Major events vs. small meetups |

**When NOT to use this pattern:**

- **Uniform distribution**: If all documents have similar array sizes, no outliers to isolate.
- **Always need full data**: If you always display all 50,000 customers, pattern doesn't help.
- **Write-heavy outliers**: Complex update logic may not be worth the read optimization.
- **Small outliers**: If outliers are 200 vs typical 50, just use larger threshold.

## Verify with

```javascript
// Find outlier documents
db.books.aggregate([
  { $project: {
    title: 1,
    customerCount: { $size: { $ifNull: ["$customers", []] } }
  }},
  { $sort: { customerCount: -1 } },
  { $limit: 20 }
])

// Calculate distribution
db.books.aggregate([
  { $project: { count: { $size: { $ifNull: ["$customers", []] } } } },
  { $bucket: {
    groupBy: "$count",
    boundaries: [0, 50, 100, 500, 1000, 10000, 100000],
    default: "100000+",
    output: { count: { $sum: 1 } }
  }}
])
// Look for a long-tail distribution where a small subset is far above median/p95

// Check index sizes
db.books.stats().indexSizes
// Large multikey index suggests outliers are bloating it
```

Reference: [Outlier Pattern](https://mongodb.com/docs/manual/data-modeling/design-patterns/group-data/outlier-pattern/?utm_source=agent-skills)
