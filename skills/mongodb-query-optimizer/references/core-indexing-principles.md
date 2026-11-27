# Core Index Principles

### Compound Index Guidelines

The first field of the index should be in the query's filter or sort condition.

**Equality → Sort → Range** order is most often preferred:

- **Equality** fields first (e.g. `{field: value}`, `{$in: [...]}` with \<= 200 elements, `{field: {$eq: value}}`)
- **Sort** fields next  
- **Range** fields last (e.g. `$gt`, `$lt`, `$gte`, `$lte`, `{$in: [...]}` with \> 200 elements in the array, `$ne`, anchored case-sensitive `$regex`)

If equality is not very selective and range is, then ERS may perform better than ESR.

### Sort direction

Index `{a:1, b:1}` supports `sort({a:1, b:1})` and reverse `sort({a:-1, b:-1})`, but NOT mixed directions like `sort({a:1, b:-1})`. For mixed sorts, create index matching exact pattern.

### Collation Match

**Before** — Query collation differs from index collation, so the index cannot be used:

```javascript
db.users.createIndex({ name: 1 })
db.users.find({ name: "José" }).collation({ locale: "es", strength: 2 })
// Index cannot be used for query
```

**After** — Create the index with the same collation the query uses:

```javascript
db.users.createIndex({ name: 1 }, { collation: { locale: "es", strength: 2 } })
db.users.find({ name: "José" }).collation({ locale: "es", strength: 2 })
// Index can be used for query
```

**Why:** Collation must match between index and query.

# Covered Queries

A covered query retrieves data directly from the index, never accessing the actual documents. This is extremely fast and preferable when possible.

## Requirements

1. **All query fields** are in the index  
2. **All returned fields** are in the index (includes sort fields)  
3. **Inclusion projection required** \- you must use an inclusion projection (e.g., `{ field: 1 }`) that requests only indexed fields, plus `_id: 0` if `_id` is not in the index. Exclusion projections cannot produce covered queries.  
4. **No `$exists` or null equality checks** \- queries using `$exists` or querying for null/missing values cannot usually be covered by an index
5. **Multikey index constraints** \- multikey indexes can cover queries under certain conditions, such as when the array field itself is not included in the projection and operators like `$elemMatch` are not used. If the array field must be projected, covering is not possible.

## Building a covered query

**Step 1:** Identify your query pattern

```javascript
db.products.find(
  { category: "electronics", inStock: true },
  { category: 1, inStock: 1, price: 1, _id: 0 }
).sort({ price: 1 })
```

**Step 2:** Create index with all accessed fields

Following ESR (Equality-Sort-Range):

```javascript
db.products.createIndex({
  category: 1,    // Equality
  inStock: 1,     // Equality
  price: 1        // Sort
})
```

**Step 3:** Project only indexed fields

- Include indexed fields in projection  
- **Exclude \_id** unless \_id is in the index (use `_id: 0`)  
- Don't request fields not in the index

## Common mistakes

### Forgetting to explicitly exclude  \_id

```javascript
// NOT COVERED - _id not in index but included in result
db.products.find(
  { category: "electronics" },
  { category: 1, price: 1 }  // _id included by default!
)
```

**Fix:** Explicitly exclude \_id

```javascript
db.products.find(
  { category: "electronics" },
  { category: 1, price: 1, _id: 0 }  // Now covered
)
```

### Requesting non-indexed fields

```javascript
// NOT COVERED - description not in index
db.products.find(
  { category: "electronics" },
  { category: 1, price: 1, description: 1, _id: 0 }
)
```

**Fix:** Only project indexed fields, or add description to index

### Array fields (multikey indexes)

```javascript
// NOT COVERED - tags is an array field and is included in projection
db.products.createIndex({ tags: 1, price: 1 })
db.products.find(
  { tags: "sale" },
  { tags: 1, price: 1, _id: 0 }
)
```

**Fix:** If the array field is not needed in the result, remove it from the projection:

```javascript
// COVERED - array field (tags) used in query but not projected
db.products.find(
  { tags: "sale" },
  { price: 1, _id: 0 }
)
```

Multikey indexes can cover queries when the array field itself is not projected and operators like `$elemMatch` are not used. If you must return the array field, the query cannot be covered.