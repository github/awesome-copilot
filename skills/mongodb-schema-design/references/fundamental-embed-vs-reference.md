---
title: Embed vs Reference Decision Framework
impact: HIGH
impactDescription: "Determines long-term query and update paths in your application data model"
tags: schema, embedding, referencing, relationships, fundamentals, one-to-one, one-to-few, one-to-many, many-to-many, tree, hierarchy
---

## Embed vs Reference Decision Framework

**This is one of the most important schema decisions you'll make.** Choose embedding or referencing based on access patterns, not just entity relationships.

**Embed when:**
- Data is always accessed together (1:1 or 1:few relationships)
- Child data doesn't make sense without parent
- Updates to both happen atomically
- Child array is clearly bounded by product constraints

**Reference when:**
- Data is accessed independently
- Many-to-many relationships exist
- Child data is large relative to the parent or array growth is unbounded
- Different update frequencies

**Decision Matrix:**

| Relationship | Cardinality | Access Pattern | Bounded? | Decision |
|--------------|-------------|----------------|----------|----------|
| User → Profile | 1:1 | Always together | Yes | **Embed** |
| User → Addresses | 1:few (1-5) | Usually together | Yes | **Embed array** |
| Order → Line Items | 1:few (1-50) | Always together | Yes | **Embed array** |
| Publisher → Books | 1:many (1000+) | Often separate | No | **Reference** |
| Post → Comments | 1:many (unbounded) | Separate adds | No | **Reference** |
| Students ↔ Classes | Many-to-many | Both directions | Moderate | **Reference both ways** |
| Product ↔ Category | Many-to-many | Either way | Moderate | **Embed refs in primary direction** |

---

### One-to-One: embed in the parent document

**Embed one-to-one related data directly in the parent when it is consistently co-accessed.** Keeping it in one document eliminates a round-trip and guarantees atomicity.

**Incorrect (separate collections for 1:1 data):** Storing user accounts and profiles in separate collections when they are always accessed together requires two queries per lookup, two index lookups, and risks orphaned records.

**Correct (embedded):**

```javascript
{
  _id: "user123",
  email: "alice@example.com",
  createdAt: ISODate("2024-01-01"),
  profile: {
    name: "Alice Smith",
    avatar: "https://cdn.example.com/alice.jpg",
    bio: "Developer building cool things"
  }
}

// Single query, atomic updates
db.users.updateOne(
  { _id: "user123" },
  { $set: { "profile.name": "Alice Johnson" } }
)
```

Use subdocuments to logically group related fields — e.g. `auth` (passwordHash, lastLogin), `profile` (name, avatar), `settings` (theme, notifications) — all 1:1 data, logically organized without separate collections.

**Common 1:1 relationships to embed:** User/Profile, Country/Capital, Building/Address, Order/ShippingAddress, Product/Dimensions.

**When NOT to embed 1:1:**
- Data accessed independently (profile page separate from auth operations)
- Different security requirements (auth vs profile)
- Extreme size difference (embedded doc >10KB, parent <1KB)
- Different update frequencies (profile hourly, auth rarely)

---

### One-to-Few: embed bounded arrays

**Embed bounded, small arrays directly in the parent document.** When a parent has a limited number of children usually accessed together, embedding keeps data in one read path.

**Incorrect (separate collection for few items):**

```javascript
// Addresses in separate collection — user typically has 1-3
{ userId: "user123", type: "home", street: "123 Main", city: "Boston" }
// Requires $lookup for ~2 addresses, orphan risk on user delete
```

**Correct (embedded array):**

```javascript
{
  _id: "user123",
  name: "Alice Smith",
  addresses: [
    { type: "home", street: "123 Main St", city: "Boston", state: "MA", zip: "02101" },
    { type: "work", street: "456 Oak Ave", city: "Boston", state: "MA", zip: "02102" }
  ]
}

// Add address atomically
db.users.updateOne(
  { _id: "user123" },
  { $push: { addresses: { type: "vacation", street: "789 Beach", city: "Miami" } } }
)

// Update specific address
db.users.updateOne(
  { _id: "user123", "addresses.type": "home" },
  { $set: { "addresses.$.city": "Cambridge" } }
)
```

**Common one-to-few:** User/Addresses (1-5), User/PhoneNumbers (1-3), Product/Variants (3-10), Author/PenNames (1-3), Order/LineItems (1-50).

**Enforce bounds with schema validation:**

```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      properties: {
        addresses: {
          bsonType: "array",
          maxItems: 10,
          items: {
            bsonType: "object",
            required: ["city"],
            properties: {
              type: { enum: ["home", "work", "billing", "shipping"] },
              city: { bsonType: "string" }
            }
          }
        }
      }
    }
  }
})
```

(See fundamental-schema-validation.md for full validation guidance).

**When NOT to embed arrays:**
- Unbounded growth (comments, orders, events) — use separate collection
- Independent access (addresses queried without user context)
- Large child documents relative to parent
- Steadily growing array size approaching unbounded behavior

---

### One-to-Many: reference in child documents

**Use references when the "many" side is unbounded or frequently accessed independently.** Store the parent's ID in each child document with an index on that field.

**Incorrect (embedding unbounded arrays):** Embedding all 10,000+ books inside a publisher document means adding one book rewrites the entire large document, eventually exceeding 16MB.

**Correct (reference in children):**

```javascript
// Publisher stays small and fixed-size
{ _id: "oreilly", name: "O'Reilly Media", founded: 1978, bookCount: 3500 }

// Each book references publisher; index on { publisherId: 1 }
{ _id: "book001", title: "New MongoDB Book", publisherId: "oreilly" }

// Efficient indexed queries
db.books.find({ publisherId: "oreilly" })

// $lookup when you need details from both sides
db.books.aggregate([
  { $match: { publisherId: "oreilly" } },
  { $lookup: {
    from: "publishers",
    localField: "publisherId",
    foreignField: "_id",
    as: "publisher"
  }},
  { $unwind: "$publisher" }
])
```

**Hybrid with subset:** Embed a bounded subset (e.g. top 5 featured books with `_id`, `title`, `isbn`) in the publisher for display without `$lookup`. "View all books" queries the books collection.

**Keep denormalized counts in sync:**

```javascript
db.books.insertOne({ title: "New Book", publisherId: "oreilly" })
db.publishers.updateOne({ _id: "oreilly" }, { $inc: { bookCount: 1 } })
```

**When to reference:** Unbounded children (Publisher→Books), large child documents (User→Orders), independent queries (Department→Employees), different lifecycles (Author→Articles).

**When NOT to reference:** Bounded small arrays (User's 3 addresses), always accessed together (Order→LineItems), never queried without parent.

---

### Many-to-Many: choose a primary query direction

**Many-to-many relationships require choosing a primary query direction.** Unlike SQL's join tables, MongoDB favors denormalization toward your most common query pattern.

**Incorrect (SQL-style junction table):**

```javascript
// 3 collections, always need joins
// students: { _id, name }  /  classes: { _id, name }  /  enrollments: { studentId, classId }
// Every query requires aggregation with $lookup
```

**Correct (embed in primary query direction):**

Embed references on the side you query most. If you primarily query "which classes is this student in," embed class summaries in the student. For the reverse, embed student summaries in the class.

**Bidirectional embedding (when both directions are common):**

```javascript
// Book with author summaries
{
  _id: "book001",
  title: "Cell Biology",
  authors: [
    { authorId: "author124", name: "Ellie Smith" },
    { authorId: "author381", name: "John Palmer" }
  ]
}

// Author with book summaries
{
  _id: "author124",
  name: "Ellie Smith",
  books: [
    { bookId: "book001", title: "Cell Biology" },
    { bookId: "book042", title: "Molecular Biology" }
  ]
}
// Trade-off: data duplication, but fast queries in both directions
```

**Reference-only (for large cardinality):**

```javascript
// Product stores category IDs (small array per product)
{ _id: "prod123", name: "Laptop", categoryIds: ["cat1", "cat2", "cat3"] }
// Category has no back-reference array (avoid huge arrays)
{ _id: "cat1", name: "Electronics" }
// Products in a category: db.products.find({ categoryIds: "cat1" })
```

**Choosing strategy:**

| Query Pattern | Cardinality | Strategy |
|---------------|-------------|----------|
| Students → Classes | Few classes per student | Embed in student |
| Classes → Students | Many students per class | Reference only |
| Both directions common | Moderate both sides | Bidirectional embed |
| High cardinality both | Large/growing both sides | Reference-only + `$lookup` |

**Maintaining bidirectional data — use transactions for atomicity:**

```javascript
const session = client.startSession()
session.withTransaction(async () => {
  await db.students.updateOne(
    { _id: "student1" },
    { $push: { classes: { classId: "class101", name: "Database Systems" } } },
    { session }
  )
  await db.classes.updateOne(
    { _id: "class101" },
    { $push: { students: { studentId: "student1", name: "Alice Smith" } } },
    { session }
  )
})
```

---

### Tree and hierarchical data

**Hierarchical data requires choosing a tree pattern based on your primary operations.** MongoDB offers multiple patterns, each with different tradeoffs.

**Common hierarchical data:** Category trees, org charts, file/folder structures, comment threads, geographic hierarchies.

#### Pattern 1: Parent References

**Best for:** Finding parent, updating parent, simple child listing.

```javascript
{ _id: "MongoDB", parent: "Databases" }
{ _id: "Databases", parent: "Programming" }
{ _id: "Programming", parent: null }

db.categories.createIndex({ parent: 1 })
db.categories.find({ parent: "Databases" })  // immediate children
```

Con: Finding all descendants requires recursive queries or `$graphLookup`.

#### Pattern 2: Child References

**Best for:** Finding children, graph-like structures.

```javascript
{ _id: "Databases", children: ["MongoDB", "PostgreSQL", "MySQL"] }
```

Con: Finding ancestors requires recursion; array updates on every child add/remove.

#### Pattern 3: Array of Ancestors

**Best for:** Breadcrumb navigation, ancestor and descendant lookups.

```javascript
{ _id: "MongoDB", parent: "Databases", ancestors: ["Programming", "Databases"] }
{ _id: "Atlas", parent: "MongoDB", ancestors: ["Programming", "Databases", "MongoDB"] }

db.categories.createIndex({ ancestors: 1 })
db.categories.find({ ancestors: "Databases" })  // all descendants
```

Including a `parent` field enables `$graphLookup` traversal without application-side recursion.

#### Pattern 4: Materialized Paths

**Best for:** Subtree queries, regex-based lookups, hierarchy sorting.

```javascript
{ _id: "MongoDB", path: ",Programming,Databases,MongoDB," }
{ _id: "Atlas", path: ",Programming,Databases,MongoDB,Atlas," }

db.categories.createIndex({ path: 1 })
db.categories.find({ path: /^,Programming,Databases,MongoDB,/ })  // all descendants
db.categories.find({}).sort({ path: 1 })  // hierarchy display order
```

#### Tree pattern comparison

| Pattern | Parent | Children | Descendants | Ancestors | Update Cost |
|---------|--------|----------|-------------|-----------|-------------|
| Parent Refs | Direct | Indexed | Recursive/`$graphLookup` | Recursive | Low |
| Child Refs | Membership query | Direct | Recursive/`$graphLookup` | Recursive | Low–moderate |
| Array of Ancestors | Via `parent` | Via `parent` | Fast (indexed) | Direct (stored) | Moderate |
| Materialized Paths | Via path/`parent` | Prefix query | Regex/prefix | From stored path | Moderate |

**Recommended by use case:** Category breadcrumbs → Array of Ancestors. File browser → Parent References. Org chart reporting → Materialized Paths. Comment threads → Parent References.

---

### When NOT to embed (summary)

- **Unbounded growth**: Comments, logs, events — separate collection.
- **Large child documents**: If each child is large relative to the parent, references are usually safer.
- **Independent access**: If you ever query child without parent, reference.
- **Different lifecycles**: If child data is archived/deleted separately.
- **Graph-like data**: Multiple parents → use `$graphLookup` or a graph database.

## Verify with

```javascript
// Check document sizes for embedded collections
db.collection.aggregate([
  { $project: {
    size: { $bsonSize: "$$ROOT" },
    arrayLen: { $size: { $ifNull: ["$items", []] } }
  }},
  { $match: { size: { $gt: 1000000 } } }
])
// Large documents may indicate embedding that should be referencing

// Check embedded array sizes (one-to-few validation)
db.users.aggregate([
  { $project: { addressCount: { $size: { $ifNull: ["$addresses", []] } } } },
  { $group: { _id: null, avg: { $avg: "$addressCount" }, max: { $max: "$addressCount" } } }
])
// If max keeps growing, consider a separate collection

// Check for orphaned references (1:1 that should be embedded)
db.profiles.aggregate([
  { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user" } },
  { $match: { user: { $size: 0 } } }
])
// Orphans suggest 1:1 data should be embedded

// Check for missing indexes on reference fields
db.books.getIndexes()
// Must have index on publisherId for efficient child lookups

// Verify bidirectional many-to-many consistency
db.students.aggregate([
  { $unwind: "$classes" },
  { $lookup: {
    from: "classes",
    let: { sid: "$_id", cid: "$classes.classId" },
    pipeline: [
      { $match: { $expr: { $eq: ["$_id", "$$cid"] } } },
      { $match: { $expr: { $in: ["$$sid", "$students.studentId"] } } }
    ],
    as: "match"
  }},
  { $match: { match: { $size: 0 } } }
])
// Mismatches indicate inconsistent bidirectional data

// Check tree consistency (no orphaned nodes)
db.categories.aggregate([
  { $match: { parent: { $ne: null } } },
  { $lookup: { from: "categories", localField: "parent", foreignField: "_id", as: "parentDoc" } },
  { $match: { parentDoc: { $size: 0 } } },
  { $count: "orphanedNodes" }
])
```

References:
- [Embedding vs Referencing](https://mongodb.com/docs/manual/data-modeling/concepts/embedding-vs-references/?utm_source=agent-skills)
- [Model One-to-One Relationships](https://mongodb.com/docs/manual/tutorial/model-embedded-one-to-one-relationships-between-documents/?utm_source=agent-skills)
- [Model One-to-Many Relationships with Embedded Documents](https://mongodb.com/docs/manual/tutorial/model-embedded-one-to-many-relationships-between-documents/?utm_source=agent-skills)
- [Model One-to-Many Relationships with References](https://mongodb.com/docs/manual/tutorial/model-referenced-one-to-many-relationships-between-documents/?utm_source=agent-skills)
- [Model Many-to-Many Relationships](https://mongodb.com/docs/manual/tutorial/model-embedded-many-to-many-relationships-between-documents/?utm_source=agent-skills)
- [Model Tree Structures](https://mongodb.com/docs/manual/applications/data-models-tree-structures/?utm_source=agent-skills)
