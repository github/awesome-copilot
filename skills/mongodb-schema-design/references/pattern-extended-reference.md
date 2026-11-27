---
title: Use Extended Reference Pattern
impact: MEDIUM
impactDescription: "Reduces repeated `$lookup` on hot paths by caching selected referenced fields"
tags: schema, patterns, extended-reference, denormalization, caching
---

## Use Extended Reference Pattern

**Copy frequently-accessed fields from referenced documents into the parent.** If you always display author name with articles, embed it. This eliminates $lookup for common queries while keeping the full data normalized—best of both worlds.

**Incorrect (always $lookup for display data):**

```javascript
// Order references customer by ID only
{
  _id: "order123",
  customerId: "cust456",  // Customer reference by ID only
  items: [...],
  total: 299.99
}

// Every order list/display requires $lookup
db.orders.aggregate([
  { $match: { status: "pending" } },
  { $lookup: {
    from: "customers",
    localField: "customerId",
    foreignField: "_id",
    as: "customer"
  }},
  { $unwind: "$customer" }
])
// Repeated joins add avoidable work for a common list view
```

**Correct (extended reference):**

Embed frequently-needed customer fields directly in the order document: include a `customer` subdocument with `_id` (kept as a reference for full lookups), `name`, and `email`. The order list query returns customer display data without `$lookup`. Full customer data is still available via a targeted read to the `customers` collection when needed.

**Keeping cached data in sync:**

When the source field changes (e.g. customer name), update the source collection first, then update cached copies in the orders collection using `updateMany` on the embedded reference `_id`. This can be done synchronously or asynchronously via Change Streams / background jobs. For data that changes more often, add a `cachedAt` timestamp to the embedded subdocument so the application can refresh on read when the cache exceeds a staleness threshold.

**What to cache (extend):**

| Cache | Don't Cache |
|-------|-------------|
| Display name, avatar | Full bio, description |
| Status, type | Sensitive PII |
| Slowly-changing data | Real-time values (balance, inventory) |
| Fields used in sorting/filtering | Large binary data |

**Alternative: Hybrid pattern with cache expiry:**

Keep both a bare reference (`customerId`) and an optional cache subdocument (`customerCache`) with `name`, `email`, and `cachedAt`. On read, if the cache is missing or older than a threshold (e.g. one day), refresh it from the `customers` collection and write the updated cache back to the order.

**When NOT to use this pattern:**

- **Frequently-changing data**: If customer name changes daily, update overhead exceeds $lookup cost.
- **Large cached payloads**: Don't embed 50KB of author bio in every article.
- **Sensitive data segregation**: Don't copy PII into collections with different access controls.
- **Writes >> Reads**: If writes greatly outnumber reads, caching adds overhead.

## Verify with

Find lookup-heavy aggregations. See how often lookups hit the same collection. High count = candidate for extended reference

For Atlas M10+ use $queryStats. See [Query Stats](references/source-query-stats.md) and [Slow query logs](references/source-slow-query-logs.md)
Use codebase if available, ask the user.

Reference: [Reduce $lookup Operations](https://mongodb.com/docs/manual/data-modeling/design-antipatterns/reduce-lookup-operations/?utm_source=agent-skills)
