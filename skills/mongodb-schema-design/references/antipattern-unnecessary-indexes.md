---
title: "Avoid Unnecessary Indexes"
impact: CRITICAL
impactDescription: "Reduces write overhead and WiredTiger cache pressure from unused or redundant indexes"
tags: schema, antipattern, indexes, performance, atlas-suggestion
---

## Avoid Unnecessary Indexes

**Every index has a write cost.** On insert, update, and delete, MongoDB must update ALL indexes on the collection. Unused or redundant indexes slow down writes with no query benefit, and consume RAM in the WiredTiger cache competing with working set data. Atlas Performance Advisor specifically flags "Redundant Index" and "Unused Index".

**Incorrect (indexes created "just in case"):**

```javascript
// Creating indexes speculatively without query evidence
db.orders.createIndex({ status: 1 })          // never queried by status alone
db.orders.createIndex({ status: 1, date: 1 }) // already have {status:1,date:1,amount:1}
db.orders.createIndex({ region: 1 })           // added during development, never used

// Problems:
// 1. Every insert/update/delete must update ALL indexes
// 2. Redundant {status: 1} is fully covered by {status: 1, date: 1, amount: 1}
// 3. Unused indexes waste RAM in WiredTiger cache
// 4. Atlas Performance Advisor flags these but they're never cleaned up
```

**Correct (audit-driven index management):**

```javascript
// Only create indexes that serve real query patterns
// Audit before adding new indexes:
db.orders.aggregate([{ $indexStats: {} }])

// Review index list regularly
db.orders.getIndexes()

// A compound index {a: 1, b: 1} makes a single-field index {a: 1} redundant
// — the compound index serves all queries that {a: 1} alone serves
db.col.createIndex({ a: 1 })         // drop this — redundant
db.col.createIndex({ a: 1, b: 1 })   // keep this

// NOTE: Different leading field is NOT redundant
db.col.createIndex({ a: 1, b: 1 })
db.col.createIndex({ b: 1 })         // NOT covered by above — keep
```

**Safe removal process (hide → monitor → drop):**

```javascript
// Never drop an index directly in production

// Step 1: Hide the index (invisible to query planner but stays on disk)
db.orders.hideIndex("status_1")

// Step 2: Monitor for a full workload cycle (days/weeks)
// If queries degrade, unhide immediately:
// db.orders.unhideIndex("status_1")

// Step 3: Once confident, permanently drop
db.orders.dropIndexes(["status_1"])
```

Atlas automatically flags:
- **"Redundant Index"** — a prefix of an existing compound index
- **"Unused Index"** — zero query usage in the observed window

**When NOT to use this pattern:**

- **New collections with planned queries**: If you know queries are coming, pre-creating indexes is fine.
- **Indexes for rare but critical operations**: A backup or compliance query that runs monthly may show low usage but is still needed.
- **TTL indexes**: These serve data lifecycle purposes even if not used for queries.

## Verify with

```javascript
// Find indexes with zero query usage since last restart
db.orders.aggregate([{ $indexStats: {} }])
// Look for: accesses.ops: 0
// Example output:
// { name: "status_1", accesses: { ops: 0, since: ISODate("...") }, ... }
// An accesses.ops: 0 after a representative workload period means the index
// is never used by any query

// Check total index count and sizes
db.orders.stats().indexSizes
// Large number of indexes or large total index size signals audit opportunity

// Find redundant indexes (prefix subsets)
for (const idx of db.orders.getIndexes()) {
  print(`${idx.name}: ${JSON.stringify(idx.key)}`)
}
// Compare index key prefixes — if {a:1} exists alongside {a:1,b:1}, the former is redundant
```

Reference: [Remove Unnecessary Indexes](https://mongodb.com/docs/manual/data-modeling/design-antipatterns/unnecessary-indexes/?utm_source=agent-skills)
