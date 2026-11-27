---
title: Keep Documents Small
impact: CRITICAL
impactDescription: "Hard 16MB BSON limit; oversized documents fail writes and degrade performance long before that"
tags: schema, fundamentals, document-size, 16mb, bson-limit, arrays, anti-pattern, performance, indexing, subset-pattern, working-set, hot-data, cold-data, atlas-suggestion
---

## Keep Documents Small

**MongoDB documents cannot exceed 16 megabytes.** This is a hard BSON limit, not a guideline — writes fail once a document reaches it.

However, practical documents should be **much smaller than 16MB**. As a rule of thumb, aim for documents **under 1MB**. Smaller documents mean:

- **Better working-set efficiency** — more documents fit in the WiredTiger cache.
- **Faster reads and writes** — less data copied, serialized, and transferred per operation.
- **Lower replication overhead** — smaller oplog entries replicate faster.
- **Room to grow** — a document well under the limit won't surprise you after a year of appended data.

The 16MB ceiling is a safety net, not a design target.

### How documents get too large

1. **Unbounded arrays** — e.g. an `activityLog` array receiving entries on every user action: 100,000 events × ~150 bytes ≈ 15MB, growing until writes are rejected.
2. **Large bounded arrays** — even a bounded comments array (5,000 items × ~500 bytes = 2.5MB) is expensive: each `$push` rewrites the growing document, and a multikey index fans out to one entry per element.
3. **Bloated documents with cold fields** — MongoDB reads full documents, even when queries only need a few fields. A product document carrying name and price (~18 bytes, frequently needed) alongside description (~5KB), full specs (~10KB), base64 images (~500KB), reviews (~100KB), and price history (~50KB) can reach ~665KB. Hot-path queries still load the entire document into cache, reducing working-set density. Even projecting a small field set (e.g. `db.products.find({}, {name: 1, price: 1})`) still reads the full document from storage.
4. **Large embedded binary** — a `BinData` PDF attachment of 10MB+; additional attachments push the document past the limit.
5. **Deeply nested objects** — a configuration document with 100+ nesting levels where metadata and keys alone approach 16MB.

### Solution 1: move unbounded or large data to a separate collection

Keep the parent document small. Store children in their own collection with a reference field and a compound index for efficient queries.

```javascript
// Parent stays lean
{ _id: "user123", name: "Alice", activityCount: 48210, lastActivity: ISODate("...") }

// Children in separate collection with efficient index
// Index: { userId: 1, ts: -1 }
{ userId: "user123", action: "login", ts: ISODate("...") }
```

For large binary blobs, use GridFS for in-database storage, or — often more efficient — store them in external object storage and keep only a reference in MongoDB.

### Solution 2: split hot and cold fields (Subset Pattern)

Keep frequently-accessed (hot) data in the main document; store rarely-accessed (cold) data in a separate collection. This dramatically improves cache density for hot-path queries.

**Incorrect (all data in one document):** A movie document with all 10,000 reviews embedded (~1MB of cold data alongside ~1KB of hot data like title, rating, plot) means every page load pulls ~1MB into RAM. Most page views only need title + rating + plot, so this reduces how many movies fit in cache (e.g. 1GB RAM ≈ 1,000 movies instead of ~1,000,000 if only hot data were loaded).

**Correct (subset pattern):** The movie document (~2KB) contains only hot fields: `title`, `year`, `rating`, `plot`, `reviewStats` (count, avgRating, distribution), and a bounded `featuredReviews` array (top 5 only, ~500 bytes). Full reviews live in a separate `reviews` collection with `movieId` reference, loaded only when the user clicks "Show all reviews."

Similarly, a product document should keep only hot fields in the main document (~500 bytes): name, price, thumbnail URL, avgRating, reviewCount, inStock. Move cold data to separate collections — `products_details` (description, fullSpecs), `products_images` (images array), `products_reviews` (paginated reviews).

**How to identify hot vs cold data:**

| Hot Data (embed) | Cold Data (separate) |
|------------------|----------------------|
| Displayed on every page load | Only on user action (click, scroll) |
| Used for filtering/sorting | Historical/archival |
| Small relative size | Large relative size |
| Bounded small subsets | Large or unbounded sets |
| Changes rarely | Changes frequently |

**Maintaining an embedded subset:**

```javascript
// When a new review is added:
// 1. Insert full review into reviews collection
db.reviews.insertOne({ movieId: "movie123", user: "newUser", rating: 5, text: "Amazing!", date: new Date(), helpful: 0 })

// 2. Update movie stats
db.movies.updateOne(
  { _id: "movie123" },
  { $inc: { "reviewStats.count": 1, "reviewStats.distribution.5": 1 } }
)

// 3. Periodically refresh featured reviews (background job)
const topReviews = db.reviews.find({ movieId: "movie123" }).sort({ helpful: -1 }).limit(5).toArray()
db.movies.updateOne({ _id: "movie123" }, { $set: { featuredReviews: topReviews } })
```

For arrays, atomic `$slice` keeps the embedded subset bounded without a background job:

```javascript
db.posts.updateOne(
  { _id: "post123" },
  {
    $push: {
      recentComments: {
        $each: [newComment],
        $slice: -20,
        $sort: { ts: -1 }
      }
    },
    $inc: { commentCount: 1 }
  }
)
// Also insert into overflow comments collection
db.comments.insertOne({ postId: "post123", ...newComment })
```

### Solution 3: projection (when you can't refactor)

```javascript
// Only transfers ~500 bytes instead of 665KB over the network
db.products.find(
  { category: "electronics" },
  { name: 1, price: 1, thumbnail: 1 }
)
```

Projection reduces network transfer but still loads full documents into memory unless the query is fully covered by an index. For real working-set reduction, split hot and cold data into separate collections.

### Prevention strategies

```javascript
// 1. Schema validation with array limits
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      properties: {
        addresses: { maxItems: 10 },
        tags: { maxItems: 100 }
      }
    }
  }
})
// (See fundamental-schema-validation.md for full validation guidance).

// 2. Application-level checks before write
const doc = await db.users.findOne({ _id: userId })
const currentSize = BSON.calculateObjectSize(doc)
if (currentSize > 200 * 1024) {  // 200KB warning — well before trouble
  logger.warn("Document size exceeding recommended threshold")
}

// 3. Use $slice to cap arrays
db.users.updateOne(
  { _id: userId },
  {
    $push: {
      activityLog: {
        $each: [newActivity],
        $slice: -1000  // Keep only last 1000
      }
    }
  }
)
```

### Workload signals

| Signal | Action |
|--------|--------|
| Array cardinality keeps growing | Cap with `$slice` or move to separate collection |
| Array field is heavily indexed | Review multikey fan-out; move cold data out |
| Reads only need recent subset | Embed recent N, reference full history |
| Updates slow as array grows | Switch to referenced write path |
| Documents routinely exceed ~200KB | Reassess schema — consider splitting hot/cold |
| WiredTiger cache pressure is high | Check for bloated documents; split candidates |

### When keeping data together is fine

- **Small, bounded arrays** — tags (max 20), roles (max 5), addresses (max 10) with a hard limit.
- **Write-once arrays** — built once and never modified; size still affects working set.
- **Arrays of primitives** — `tags: ["a", "b", "c"]` is much cheaper than arrays of objects.
- **Small collections that fit in RAM** — if your entire collection is <1GB, document size matters less.
- **Always need all data** — if every access pattern truly needs the full document, splitting adds overhead.

## Verify with

```javascript
// Find largest documents in collection
db.collection.aggregate([
  { $project: { size: { $bsonSize: "$$ROOT" } } },
  { $sort: { size: -1 } },
  { $limit: 10 }
])

// Check specific field sizes to find bloat
db.collection.aggregate([
  { $project: {
    total: { $bsonSize: "$$ROOT" },
    activitySize: { $bsonSize: { $ifNull: ["$activityLog", []] } },
    profileSize: { $bsonSize: { $ifNull: ["$profile", {}] } }
  }}
])

// Find documents with large arrays
db.collection.aggregate([
  { $project: {
    size: { $bsonSize: "$$ROOT" },
    arrayLen: { $size: { $ifNull: ["$myArray", []] } }
  }},
  { $match: { arrayLen: { $gt: 100 } } },
  { $sort: { arrayLen: -1 } },
  { $limit: 10 }
])

// Find documents with hot/cold imbalance
db.collection.aggregate([
  { $project: {
    totalSize: { $bsonSize: "$$ROOT" },
    coldSize: { $bsonSize: { $ifNull: ["$reviews", []] } },
    hotSize: { $subtract: [
      { $bsonSize: "$$ROOT" },
      { $bsonSize: { $ifNull: ["$reviews", []] } }
    ]}
  }},
  { $match: {
    $expr: { $gt: ["$coldSize", { $multiply: ["$hotSize", 10] }] }
  }},
  { $limit: 10 }
])

// Check working set vs RAM
db.serverStatus().wiredTiger.cache
// "bytes currently in the cache" vs "maximum bytes configured"
```

Atlas Schema Suggestions flags: "Array field may grow without bound", "Document size exceeds recommended limit"

References:
- [BSON Document Size Limit](https://mongodb.com/docs/manual/reference/limits/?utm_source=agent-skills#std-label-limit-bson-document-size)
- [Avoid Unbounded Arrays](https://mongodb.com/docs/manual/data-modeling/design-antipatterns/unbounded-arrays/?utm_source=agent-skills)
- [Reduce Bloated Documents](https://mongodb.com/docs/manual/data-modeling/design-antipatterns/bloated-documents/?utm_source=agent-skills)
