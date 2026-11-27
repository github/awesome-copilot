---
title: Use Polymorphic Pattern for Heterogeneous Documents
impact: MEDIUM
impactDescription: "Keeps related entities in one collection while preserving type-specific fields"
tags: schema, patterns, polymorphic, discriminator, flexible-schema, indexing, single-collection
---

## Use Polymorphic Pattern for Heterogeneous Documents

**Store related but different document shapes in one collection with a type discriminator.** This keeps shared queries and indexes simple while allowing type-specific fields. Common use cases: product catalogs with different product types, content management systems, event stores, and any domain with inheritance.

**Incorrect (separate collections per subtype):**

Using a separate collection per product type (e.g. `products_books`, `products_electronics`, `products_clothing`) means querying across all products requires multiple calls or `$unionWith`, shared indexes must be duplicated, adding new types requires new collections, and application code must branch on collection names.

**Correct (single collection using optional fields):**

Store all product types in one `products` collection. All documents share common fields (`name`, `price`, `inStock`); each type adds its own specific fields (books: `author`, `isbn`, `pages`; electronics: `brand`, `wattage`, `batteryHours`, `warranty`; clothing: `size`, `color`, `material`). If the categories are always fully disjoint, use a `type` discriminator field (e.g. `"book"`, `"electronics"`, `"clothing"`). Cross-type queries use shared fields; type-specific queries filter by `type` plus type-specific fields. If there is potential overlap (e.g. between different categories of users), you can omit this field and rely entirely on optional fields.

**Index strategies for polymorphic collections:**

```javascript
// Strategy 1: Compound index with type first
// Best for: Queries that always filter by type
db.products.createIndex({ type: 1, price: 1 })
db.products.createIndex({ type: 1, name: 1 })

// Query uses index efficiently:
db.products.find({ type: "book", price: { $lt: 50 } })

// Strategy 2: Compound index with type second
// Best for: Queries that rarely filter by type
db.products.createIndex({ price: 1, type: 1 })

// Query across all types uses index:
db.products.find({ price: { $lt: 50 } })

// Strategy 3: Partial indexes for type-specific fields
// Best for: Fields that only exist on some types
db.products.createIndex(
  { author: 1 },
  { partialFilterExpression: { type: "book" } }
)

db.products.createIndex(
  { brand: 1, wattage: 1 },
  { partialFilterExpression: { type: "electronics" } }
)

// Strategy 4: Wildcard index for varying fields
// Best for: Many type-specific fields, ad-hoc queries
db.products.createIndex({ "specs.$**": 1 })

// Documents store type-specific data in specs:
{ type: "book", specs: { author: "...", isbn: "..." } }
{ type: "electronics", specs: { brand: "...", wattage: 20 } }
```

**Query patterns across types:**

```javascript
// Pattern 1: Query all types with shared fields
db.products.find({ price: { $lt: 100 }, inStock: true })
  .sort({ price: 1 })

// Pattern 2: Query specific type with type-specific fields
db.products.find({
  type: "book",
  pages: { $gt: 300 },
  author: /bradshaw/i
})

// Pattern 3: Aggregation across types with type-specific handling
db.products.aggregate([
  { $match: { inStock: true } },
  { $group: {
      _id: "$type",
      count: { $sum: 1 },
      avgPrice: { $avg: "$price" }
    }
  }
])

// Pattern 4: Faceted search with type breakdown
db.products.aggregate([
  { $match: { price: { $lt: 100 } } },
  { $facet: {
      byType: [{ $group: { _id: "$type", count: { $sum: 1 } } }],
      priceRanges: [
        { $bucket: {
            groupBy: "$price",
            boundaries: [0, 25, 50, 100],
            default: "100+"
          }
        }
      ]
    }
  }
])
```

**Validation per type:**

```javascript
// Use JSON Schema with discriminator-based validation
db.runCommand({
  collMod: "products",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["type", "name", "price"],
      properties: {
        type: { enum: ["book", "electronics", "clothing"] },
        name: { bsonType: "string" },
        price: { bsonType: "number", minimum: 0 }
      },
      oneOf: [
        {
          properties: { type: { enum: ["book"] } },
          required: ["author", "isbn"]
        },
        {
          properties: { type: { enum: ["electronics"] } },
          required: ["brand"]
        },
        {
          properties: { type: { enum: ["clothing"] } },
          required: ["size", "color"]
        }
      ]
    }
  },
  validationLevel: "moderate"
})
```

**Adding new types:**

The polymorphic pattern makes adding types straightforward — no schema migration needed. Insert documents with the new `type` value and any type-specific fields. Add partial indexes for type-specific queries as needed, and update schema validation to include the new type if using strict validation.

**When NOT to use polymorphic pattern:**

- **Completely different access patterns**: If each type is queried independently with no cross-type queries, separate collections may be cleaner.
- **Conflicting index requirements**: If types need many different indexes, the index overhead may outweigh benefits.
- **Strict type separation required**: Regulatory or security requirements may mandate separate collections.
- **Vastly different document sizes**: If one type has 100-byte docs and another has 100KB docs, working set suffers.
- **Type-specific sharding needs**: Different types may need different shard keys.

## Verify with

```javascript
// Get type distribution
db.products.aggregate([
  { $group: {
      _id: "$type",
      count: { $sum: 1 },
      avgSize: { $avg: { $bsonSize: "$$ROOT" } }
    }
  },
  { $sort: { count: -1 } }
])

// Check for missing type field
db.products.countDocuments({ type: { $exists: false } })
```

Reference: [Polymorphic Schema Pattern](https://mongodb.com/docs/manual/data-modeling/design-patterns/polymorphic-data/polymorphic-schema-pattern/?utm_source=agent-skills)
