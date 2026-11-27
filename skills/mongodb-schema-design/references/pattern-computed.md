---
title: Use Computed Pattern for Expensive Calculations
impact: MEDIUM
impactDescription: "Improves read latency by pre-computing frequently-requested aggregations"
tags: schema, patterns, computed, aggregation, performance, denormalization
---

## Use Computed Pattern for Expensive Calculations

**Pre-calculate and store frequently-accessed computed values.** If you're running the same aggregation on every page load, you're wasting CPU cycles. Store the result in the document and update it on write or via background job—trades write complexity for read speed.

**Incorrect (calculate on every read):**

```javascript
// Movie with all screenings in separate collection
{ _id: "movie1", title: "The Matrix" }

// Screenings collection - thousands of records
{ movieId: "movie1", date: ISODate("..."), viewers: 344, revenue: 3440 }
{ movieId: "movie1", date: ISODate("..."), viewers: 256, revenue: 2560 }
// ... 10,000 screenings

// Movie page aggregates every time
db.screenings.aggregate([
  { $match: { movieId: "movie1" } },
  { $group: {
    _id: "$movieId",
    totalViewers: { $sum: "$viewers" },
    totalRevenue: { $sum: "$revenue" },
    screeningCount: { $sum: 1 }
  }}
])
// Repeated scans can add substantial read latency and CPU overhead
// 1M page views/day = 1M expensive aggregations
```

**Correct (pre-computed values):**

Store computed stats directly in the movie document: `stats.totalViewers`, `stats.totalRevenue`, `stats.screeningCount`, `stats.avgViewersPerScreening`, and `stats.computedAt`. The movie page reads a single document with no aggregation needed on the hot path.

**Update strategies:**

```javascript
// Strategy 1: Update on write (low write volume)
// When new screening is added
db.screenings.insertOne({
  movieId: "movie1",
  viewers: 400,
  revenue: 4000
})

// Immediately update computed values
db.movies.updateOne(
  { _id: "movie1" },
  {
    $inc: {
      "stats.totalViewers": 400,
      "stats.totalRevenue": 4000,
      "stats.screeningCount": 1
    },
    $set: { "stats.computedAt": new Date() }
  }
)

// Strategy 2: Background job (high write volume)
// Run hourly/daily aggregation job
db.screenings.aggregate([
  { $group: {
    _id: "$movieId",
    totalViewers: { $sum: "$viewers" },
    totalRevenue: { $sum: "$revenue" },
    count: { $sum: 1 }
  }},
  { $merge: {
    into: "movies",
    on: "_id",
    whenMatched: [{
      $set: {
        "stats.totalViewers": "$$new.totalViewers",
        "stats.totalRevenue": "$$new.totalRevenue",
        "stats.screeningCount": "$$new.count",
        "stats.computedAt": "$$NOW"
      }
    }]
  }}
])
```

**Common computed values:**

| Source Data | Computed Value | Update Strategy |
|-------------|----------------|-----------------|
| Order line items | Order total | On write (single doc) |
| Product reviews | Avg rating, review count | Background job |
| User activity | Engagement score | Background job |
| Transaction history | Account balance | On write |
| Page views | View count, trending score | Batched updates |

**Handling staleness:**

Include a `computedAt` timestamp alongside the stats. Application code compares this timestamp against a freshness threshold (e.g. one hour) and triggers a refresh if the values are stale. Alternatively, surface the timestamp to users (e.g. “1,840,000 viewers — updated 1 hour ago”).

**Windowed computations:**

```javascript
// Compute for time windows (rolling 30 days)
{
  _id: "movie1",
  stats: {
    allTime: { viewers: 1840000, revenue: 25880000 },
    last30Days: { viewers: 45000, revenue: 630000 },
    last7Days: { viewers: 12000, revenue: 168000 }
  }
}

// Background job updates rolling windows
db.screenings.aggregate([
  { $match: {
    movieId: "movie1",
    date: { $gte: thirtyDaysAgo }
  }},
  { $group: {
    _id: null,
    viewers: { $sum: "$viewers" },
    revenue: { $sum: "$revenue" }
  }}
])
// Then update movie.stats.last30Days
```

**Consider on-demand materialized views:**

When the computed results are best stored in a separate collection rather than embedded in the source documents, MongoDB's [on-demand materialized views](https://www.mongodb.com/docs/manual/core/materialized-views/?utm_source=agent-skills) formalize this approach. An on-demand materialized view is an aggregation pipeline whose output is written to a separate collection using `$merge` or `$out`—the same mechanism shown in Strategy 2 above. The difference is conceptual: instead of updating a field on existing documents, you maintain a dedicated read-optimized collection that can be independently indexed. This is especially useful when:

- The computed data has a different shape or granularity than the source (e.g. monthly summaries from daily records).
- Multiple consumers need the pre-aggregated data, and a shared collection is cleaner than duplicating fields across documents.
- You want to index the computed results independently of the source collection.

On-demand materialized views are not automatically refreshed—you control when to re-run the pipeline, which gives you the same staleness trade-offs described above.

**When NOT to use this pattern:**

- **Rarely accessed calculations**: If stat is viewed once/day, compute on demand.
- **High write frequency**: If source data changes every second, update overhead may exceed read savings.
- **Complex multi-collection joins**: Some computations are too complex to maintain incrementally.
- **Strong consistency required**: Computed values may be slightly stale.

## Verify with

### Find expensive aggregations that should be pre-computed

For Atlas M10+ use slow query logs to find the slowest aggregations. See [Slow query logs](references/source-slow-query-logs.md). 
Use codebase if available, ask the user.

### Check if same aggregation runs repeatedly

For Atlas M10+ use $queryStats. See [Query Stats](references/source-query-stats.md)
Use codebase if available, ask the user.

High count + high avgMs on an aggregation that computes a result = candidate for computed pattern

Reference: [Computed Schema Pattern](https://mongodb.com/docs/manual/data-modeling/design-patterns/computed-values/computed-schema-pattern/?utm_source=agent-skills)
