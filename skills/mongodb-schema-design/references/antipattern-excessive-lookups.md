---
title: Reduce Excessive $lookup Usage
impact: CRITICAL
impactDescription: "Can reduce query cost on hot paths by avoiding repeated cross-collection joins"
tags: schema, lookup, anti-pattern, joins, denormalization, atlas-suggestion
---

## Reduce Excessive $lookup Usage

**Frequent $lookup operations on hot paths can indicate over-normalization.** `$lookup` is useful, but repeated joins can be slower and more resource-intensive than querying a single collection, especially when supporting indexes or match selectivity are weak. If the same related fields are read together often, consider embedding or extended references.

**Incorrect (constant $lookup for common operations):**

```javascript
// Every product page requires repeated joins across collections
db.products.aggregate([
  { $match: { _id: productId } },
  { $lookup: {
      from: "categories",          // Collection scan #2
      localField: "categoryId",
      foreignField: "_id",
      as: "category"
  }},
  { $lookup: {
      from: "brands",              // Collection scan #3
      localField: "brandId",
      foreignField: "_id",
      as: "brand"
  }},
  { $unwind: "$category" },
  { $unwind: "$brand" }
])
// Multiple join stages add planning/execution overhead on hot paths
```

Join cost depends on cardinality, stage order, index support, and result size. Measure before deciding to embed.

**Correct (denormalize frequently-joined data):**

Embed data that is always displayed alongside the product directly in the product document: include category fields (`_id`, `name`, `path`) and brand fields (`_id`, `name`, `logo`) as subdocuments. A single indexed query returns complete product data without `$lookup`. Listing queries (e.g. by category) also run against a single collection.

**Managing denormalized data updates:**

When category data changes (a rare event), use `updateMany` to update all products matching that category’s `_id` with the new field values. For frequently-changing data, keep both a reference ID (`brandId`) and a cache subdocument (`brandCache`) with a `cachedAt` timestamp; refresh the cache when it exceeds a staleness threshold.

**When NOT to use this pattern:**

- **Data changes frequently and independently**: If brand logos change daily, denormalization creates update overhead.
- **Rarely-accessed data**: Don't embed review details if only a small fraction of product views load reviews.
- **Many-to-many with high cardinality**: Avoid embedding large or fast-growing relationship sets.
- **Analytics queries**: Batch jobs can afford $lookup latency; real-time queries cannot.

## Verify with

####  Find pipelines with $lookup stages 

For Atlas M10+ use $queryStats. See [Query Stats](references/source-query-stats.md)
Use codebase if available, ask the user.

```javascript

// Check if $lookup foreign fields are indexed

// Example A - $indexStats
db.categories.aggregate([
  { $indexStats: {} }
])

// Example B - getIndexes()
db.categories.getIndexes()

// Look for index supporting the query (either a direct index on the foreign field or a compound index that has the foreign field as a prefix, note the collation)

// Measure $lookup impact
db.products.aggregate([
  { $match: { category: "electronics" } },
  { $lookup: { from: "brands", localField: "brandId", foreignField: "_id", as: "brand" } }
]).explain("executionStats")
// Check totalDocsExamined in $lookup stage
```

Atlas Schema Suggestions flags: "Reduce $lookup operations"

Reference: [Reduce Lookup Operations](https://mongodb.com/docs/manual/data-modeling/design-antipatterns/reduce-lookup-operations/?utm_source=agent-skills)
