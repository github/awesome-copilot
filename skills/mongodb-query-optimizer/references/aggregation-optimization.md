# Principles

Aggregation pipelines process documents through sequential stages. Focus on:

- Reducing documents early in the pipeline
- Minimizing data moved between stages
- Leveraging indexes where possible
- Managing memory usage

## Memory limits and disk spilling

Blocking stages (such as in-memory `$sort` and `$group`) have a 100MB memory limit per stage. Default behavior when this limit is exceeded is to spill to disk automatically (`allowDiskUse` defaults to `true`).

**Better solutions:**

- Filter more aggressively early in pipeline
- Add indexes to enable `$sort` to use index order
- Use `$limit` with `$sort` to reduce the amount of data the sort must process in memory for unindexed sorts
- Consider materialized views for repeated aggregations

# Optimization Examples

These examples are not exhaustive but representative of some common optimization patterns.

## Unindexed $lookup vs. Indexed $lookup

**Bad** — No index on the foreign collection's join field:

```javascript
db.orders.aggregate([
  { $lookup: {
      from: "products",
      localField: "productId",
      foreignField: "sku",   // no index on products.sku!
      as: "product"
  }}
])
```

**Good** — Index on `foreignField` in the foreign collection:

```javascript
db.products.createIndex({ sku: 1 })

db.orders.aggregate([
  { $lookup: {
      from: "products",
      localField: "productId",
      foreignField: "sku",
      as: "product"
  }}
])
```

**Why:** Each `$lookup` executes a find on the `from` collection. Without an index on `foreignField`, every join does a full collection scan. This is the single most critical $lookup optimization.

## Early $project Defeating Optimization vs. Late $project

**Bad** — Early `$project` prevents the optimizer from pruning unused fields, forgets to exclude `_id` which is unneeded, and includes `name` which is not used:

```javascript
db.collection.aggregate([
  { $project: { name: 1, status: 1, amount: 1 } },
  { $match: { status: "active" } },
  { $group: { _id: "$status", total: { $sum: "$amount" } } }
])
```

**Good** — Let the optimizer handle field pruning; use `$project` only at the end for reshaping:

```javascript
db.collection.aggregate([
  { $match: { status: "active" } },
  { $group: { _id: "$status", total: { $sum: "$amount" } } },
  { $project: { _id: 0, status: "$_id", total: 1 } }  // reshape at the end
])
```

**Why:** MongoDB's pipeline optimizer automatically analyzes which fields are used and avoids fetching unused ones. An early `$project` defeats this optimization, and can inadvertently request the wrong fields.

## $facet for Divergent Processing vs. $unionWith

**Bad** — `$facet` sends all documents to every branch, even if branches need very different subsets:

```javascript
db.collection.aggregate([
  { $facet: {
      "top10": [{ $sort: { score: -1 } }, { $limit: 10 }],
      "totalCount": [{ $count: "n" }]  // gets ALL docs even though it's just counting
  }}
])
```

**Good** — Separate pipelines via `$unionWith` let each branch optimize independently:

```javascript
db.collection.aggregate([
  { $sort: { score: -1 } }, { $limit: 10 },
  { $unionWith: {
      coll: "collection",
      pipeline: [{ $count: "n" }]
  }}
])
```

**Why:** `$facet` funnels every document into every branch. `$unionWith` runs independent pipelines that each benefit from their own index usage and optimization.

## $sort \+ $limit as Separate Concerns vs. Top-N Sort

**Bad** — Large sort, then limit (MongoDB may sort entire dataset):

```javascript
db.collection.aggregate([
  { $group: { _id: "$category", total: { $sum: "$amount" } } },
  { $sort: { total: -1 } },
  // ... many stages later ...
  { $limit: 10 }
])
```

**Good** — Place `$limit` immediately after `$sort`:

```javascript
db.collection.aggregate([
  { $group: { _id: "$category", total: { $sum: "$amount" } } },
  { $sort: { total: -1 } },
  { $limit: 10 }
])
```

**Why:** When `$sort` is immediately followed by `$limit`, MongoDB performs a *top-N sort* — it only tracks the top N values instead of sorting the full dataset. Far less memory.

## $unwind Best Practices

**When $unwind is needed**, filter before unwinding so that the $match stage allows index usage:

```javascript
[
  { $match: { "items.category": "electronics" } },  // Reduce documents first
  { $unwind: "$items" },  // Then unwind
  { $match: { "items.category": "electronics" } }  // Filter unwound elements
]
```

**Never $unwind to re-group by `_id`:** If you are using `$unwind` followed by `$group` with `_id:` you can replace it with an array operator like `$filter`, `$map` or `$reduce` to match or transform array elements without unwinding.

## Optimize $lookup operations

`$lookup` performs collection joins and can be expensive. Strategies to improve performance:

1. **Filter before lookup** to reduce left-side documents
2. **Use indexed fields** in the lookup `localField`/`foreignField`
3. **Add $match in the lookup pipeline** to reduce right-side documents early
4. **Add $project last in the lookup pipeline** to keep only the fields you need
5. **$unwind immediately after lookup** when you need `as` result flattened

```javascript
[
  { $match: { active: true } },  // Reduce left side
  { $lookup: {
      from: "inventory",
      localField: "product_id",
      foreignField: "_id",  // _id is always indexed
      pipeline: [
        { $match: { inStock: true } },  // Reduce right side
        { $project: { _id: 0, name: 1, price: 1 } }
      ],
      as: "product"
  }},
  { $unwind: "$product" }
]
```

**Schema consideration:** Excessive `$lookup` usage may indicate over-normalization. Consider embedding frequently-joined data.

## $group efficiency

Group operations require accumulating result documents in memory. Keys to efficiency:

1. **Include only needed fields within the $group stage** \- reference only the fields you need in accumulators
2. **Be mindful of unbounded accumulators** \- `$push` and `$addToSet` grow as group size increases and can cause memory issues

**Bad** \- do not add $project before $group to "reduce fields":

```javascript
[
  { $match: { date: { $gte: ISODate("2024-01-01") } } },
  { $project: { category: 1, amount: 1 } },
  { $group: {
      _id: "$category",
      total: { $sum: "$amount" },
      count: { $sum: 1 }
  }}
]
```

**Good** \- reference only needed fields directly in $group:

```javascript
[
  { $match: { date: { $gte: ISODate("2024-01-01") } } },
  { $group: {
      _id: "$category",
      total: { $sum: "$amount" },
      count: { $sum: 1 }
  }}
]
```

**Why:** The $group stage only processes the fields referenced in its expressions. Adding a $project before it does not save memory.