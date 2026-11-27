---
title: Embrace the Document Model
impact: HIGH
impactDescription: "Aligns schema to aggregate access patterns and minimizes avoidable cross-collection joins"
tags: schema, document-model, fundamentals, sql-migration
---

## Embrace the Document Model

**Don't recreate SQL tables one-to-one in MongoDB.** The document model is designed to store related data together when it is read and updated together. Naively copying relational boundaries often increases application-side joins and coordination logic.

**Incorrect (SQL patterns in MongoDB):**

Mirroring a relational schema 1:1 — e.g. separate `customers`, `addresses`, `phones`, and `preferences` collections linked by `customerId` — requires four queries and four index lookups to load one customer profile, plus application-side joining. Updates may require cross-collection coordination or transactions.

**Correct (rich document model):**

```javascript
// Customer document contains everything about the customer
// All data retrieved in single read, updated atomically
{
  _id: "cust123",
  name: "Alice Smith",
  email: "alice@example.com",
  addresses: [
    { type: "home", street: "123 Main", city: "Boston", zip: "02101" },
    { type: "work", street: "456 Oak", city: "Boston", zip: "02102" }
  ],
  phones: [
    { type: "mobile", number: "555-1234" },
    { type: "work", number: "555-5678" }
  ],
  preferences: {
    newsletter: true,
    theme: "dark",
    language: "en"
  },
  createdAt: ISODate("2024-01-01")
}

// Single query loads complete customer - 1 round-trip
db.customers.findOne({ _id: "cust123" })

// Atomic update - no transaction needed
db.customers.updateOne(
  { _id: "cust123" },
  { $push: { addresses: newAddress }, $set: { "preferences.theme": "light" } }
)
```

**Common tradeoffs:**

| Aspect | SQL-style mapping in MongoDB | Document-first mapping |
|--------|----------------------------|------------------------|
| Queries per aggregate view | Often multiple collection reads or `$lookup` | Often one collection read for hot paths |
| Atomicity for related fields | May require multi-document transaction | Single-document writes are atomic |
| Schema evolution | More migration/coordination between collections | Often localized changes per document shape |
| Application logic | More join/merge logic in app | Simpler read model for common operations |

**When migrating from SQL:**

1. Don't convert tables 1:1 to collections
2. Identify which tables are always joined together
3. Denormalize those joins into single documents
4. Keep separate only what's accessed separately

**When NOT to use this pattern:**

- **Genuinely independent data**: If addresses are shared across users or accessed independently, keep them separate.
- **Unbounded relationships**: User with 10,000 orders should NOT embed all orders.
- **Regulatory requirements**: Some compliance rules require normalized audit trails.

## Verify with

```javascript
// Count your collections vs expected entities
for (const d of db.adminCommand({ listDatabases: 1 }).databases) {
  const colls = db.getSiblingDB(d.name).getCollectionNames().length
  print(`${d.name}: ${colls} collections`)
}
// Collection count alone is not enough evidence; inspect query/access patterns too

// Check for SQL-style foreign key patterns
db.addresses.aggregate([
  { $group: { _id: "$customerId", count: { $sum: 1 } } },
  { $match: { count: { $gt: 0 } } }
]).itcount()
// If addresses always belong to customers, they should be embedded
```

Reference: [Schema Design Process](https://mongodb.com/docs/manual/data-modeling/schema-design-process/?utm_source=agent-skills)
