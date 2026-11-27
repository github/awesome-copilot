---
title: "Approximation Pattern"
impact: MEDIUM
impactDescription: "Reduces write load by storing approximate values when exact real-time counts are not required"
tags: schema, patterns, approximation, computed, write-optimization
---

## Approximation Pattern

**Intentionally store approximate values to reduce write load when exact real-time counts are not required.** High-frequency counters (page views, trending scores, social media counters) that increment by +1 per event can create expensive per-event writes. The approximation pattern batches these increments, trading staleness for dramatically lower write volume.

**Incorrect (write to database on every event):**

```javascript
// Page view counter - writes to MongoDB on every single view
function recordPageView(articleId) {
  db.articles.updateOne(
    { _id: articleId },
    {
      $inc: { viewCount: 1 },
      $set: { lastViewedAt: new Date() }
    }
  )
}
// 1M page views/day = 1M database writes/day
// High write load for a counter that doesn't need real-time accuracy
```

**Correct (batch writes with threshold):**

The document stores an approximate count plus a sync timestamp. The application tracks counts in local memory (e.g. a `Map` keyed by article ID) and writes to the database only when the local counter crosses a threshold (e.g. every 100 views). At threshold=100 this yields ~100× fewer database writes.

The document includes `viewCount` (approximate — may lag by up to one threshold) and `lastSyncedAt`. When the local counter reaches the threshold, the application issues a single `$inc` by the threshold amount and updates `lastSyncedAt`. Unsynced local increments are lost on application restart.

**Tradeoffs:**

| Concern | Impact |
|---------|--------|
| Write reduction | ~100x fewer DB writes (at threshold=100) |
| Staleness | Up to `threshold` events behind |
| Accuracy | Approximate — never exact real-time |
| Crash safety | Unsynced local increments lost on restart |

**Difference from Computed Pattern:**

- **Computed Pattern**: pre-computes expensive aggregations, stores exact results
- **Approximation Pattern**: intentionally stores inexact values to reduce write frequency

Use Approximation when staleness is acceptable. Use Computed when exact values are needed but recalculating each time is too expensive.

**When NOT to use this pattern:**

- **Financial amounts, inventory counts**: Exact values required — approximation is unacceptable.
- **Low-frequency updates**: If counter changes rarely, approximation adds complexity without benefit.
- **Regulatory/audit requirements**: When exact counts are mandated.

## Verify with

### Check write frequency on counter fields

Use codebase if available, ask the user.

High count relative to read count on a specific field suggests approximation would help

```javascript
// Compare counter staleness
db.articles.aggregate([
  { $sort: { lastSyncedAt: 1 } },
  { $limit: 10 },
  { $project: {
    title: 1,
    viewCount: 1,
    lastSyncedAt: 1,
    staleness: { $subtract: ["$$NOW", "$lastSyncedAt"] }
  }}
])
// Verify staleness is within acceptable bounds for your use case
```

Reference: [Use the Approximation Pattern](https://mongodb.com/docs/manual/data-modeling/design-patterns/computed-values/approximation-schema-pattern/?utm_source=agent-skills)
