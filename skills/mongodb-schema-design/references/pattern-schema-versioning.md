---
title: Schema Evolution and Preventing Drift
impact: CRITICAL
impactDescription: "Prevents application errors from inconsistent schemas and enables safe online migrations"
tags: schema, patterns, versioning, migration, evolution, backward-compatibility, backfill, anti-pattern, validation, consistency, data-quality, atlas-suggestion
---

## Schema Evolution and Preventing Drift

**Schema changes are inevitable, but uncontrolled changes cause schema drift** — documents in the same collection with inconsistent structures, leading to application errors and query failures. Use `schemaVersion` fields for safe migration and schema validation to prevent unexpected drift.

### The problem: schema drift

MongoDB's flexibility is a feature, but undisciplined field additions lead to code that must handle many document shapes.

**Incorrect (uncontrolled drift over time):**

```javascript
// Over time, different versions of "user" documents accumulate
{ _id: 1, name: "Alice", email: "alice@ex.com" }                  // 2021
{ _id: 3, firstName: "Carol", lastName: "Smith", email: "carol@ex.com" }  // 2022 - restructured name
{ _id: 4, firstName: "Dave", lastName: "Jones", emails: ["dave@ex.com"] } // 2023 - email → emails

// Application code becomes defensive nightmare
function getUserEmail(user) {
  if (user.email) return user.email
  if (user.emails) return user.emails[0]
  throw new Error("No email found")
}

// Queries fail silently
db.users.find({ email: "test@ex.com" })  // Misses users with emails[] array
```

### Solution: versioned documents with migration path

Add a `schemaVersion` field to every document. Application code checks version and handles both formats. This allows old and new documents to coexist, new code to deploy before data migration, gradual migration during low-traffic periods, and easy rollback.

**Correct (versioned with validation):**

```javascript
// Define and enforce consistent schema
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["emails", "profile", "schemaVersion"],
      properties: {
        emails: {
          bsonType: "array",
          items: {
            bsonType: "string",
            pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
          }
        },
        profile: {
          bsonType: "object",
          required: ["firstName", "lastName"],
          properties: {
            firstName: { bsonType: "string", minLength: 1 },
            lastName: { bsonType: "string", minLength: 1 }
          }
        },
        schemaVersion: {
          bsonType: "int",
          enum: [1, 2]  // Accept both during migration
        }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
})
```

### Online migration strategies

```javascript
// Strategy 1: Background batch migration
// Best for: Large collections, can tolerate mixed versions temporarily

function migrateToV2(batchSize = 1000) {
  let migrated = 0
  let cursor = db.users.find({ schemaVersion: { $lt: 2 } }).limit(batchSize)

  for (const doc of cursor) {
    const [firstName, ...rest] = (doc.name || "").split(" ")
    const lastName = rest.join(" ") || "Unknown"

    db.users.updateOne(
      { _id: doc._id, schemaVersion: { $lt: 2 } },  // Prevent double-migration
      {
        $set: {
          schemaVersion: 2,
          profile: { firstName, lastName },
          emails: doc.emails || (doc.email ? [doc.email] : []),
        },
        $unset: { name: "", email: "" }
      }
    )
    migrated++
  }
  return migrated
}

// Run in batches during off-peak hours
while (migrateToV2(1000) > 0) {
  sleep(100)  // Throttle to reduce load
}


// Strategy 2: Aggregation pipeline update (MongoDB 4.2+)
// Best for: Simple transformations, moderate collection sizes

db.users.updateMany(
  { schemaVersion: { $lt: 2 } },
  [
    {
      $set: {
        schemaVersion: 2,
        profile: {
          $cond: {
            if: { $eq: [{ $type: "$name" }, "string"] },
            then: {
              firstName: { $arrayElemAt: [{ $split: ["$name", " "] }, 0] },
              lastName: { $ifNull: [
                { $arrayElemAt: [{ $split: ["$name", " "] }, 1] },
                "Unknown"
              ]}
            },
            else: "$profile"
          }
        },
        emails: {
          $cond: {
            if: { $eq: [{ $type: "$email" }, "string"] },
            then: ["$email"],
            else: { $ifNull: ["$emails", []] }
          }
        },
      }
    },
    { $unset: ["name", "email"] }
  ]
)


// Strategy 3: Read-time migration (lazy migration)
// Best for: Low-traffic documents, immediate consistency needed

function getUser(userId) {
  const user = db.users.findOne({ _id: userId })

  if (user && user.schemaVersion < 2) {
    const migrated = migrateUserToV2(user)
    db.users.replaceOne({ _id: userId }, migrated)
    return migrated
  }

  return user
}
```

### Handling multiple version jumps

```javascript
// v1 → v2 → v3: define transformation functions for each step
const migrations = {
  1: (doc) => ({
    ...doc,
    schemaVersion: 2,
    profile: {
      firstName: doc.name.split(" ")[0],
      lastName: doc.name.split(" ").slice(1).join(" ") || "Unknown"
    },
    emails: doc.email ? [doc.email] : []
  }),
  2: (doc) => ({
    ...doc,
    schemaVersion: 3,
    profile: {
      ...doc.profile,
      displayName: `${doc.profile.firstName} ${doc.profile.lastName}`
    }
  })
}

function migrateToLatest(doc, targetVersion = 3) {
  let current = doc
  while (current.schemaVersion < targetVersion) {
    const migrator = migrations[current.schemaVersion]
    if (!migrator) throw new Error(`No migration from v${current.schemaVersion}`)
    current = migrator(current)
  }
  return current
}
```

### When a version bump is (and isn't) needed

**No version bump needed (backward-compatible):**
- Adding new optional fields (old code ignores them)
- Adding new indexes (transparent to application)
- Relaxing validation (making a required field optional)

**Version bump required (breaking):**
- Renaming fields (`address` → `shippingAddress`)
- Changing field types (`price: "19.99"` → `price: 19.99`)
- Restructuring (flat `firstName`/`lastName` → nested `name: { first, last }`)
- Removing fields that old code reads

### Detecting existing schema drift

```javascript
// Find all unique field combinations
db.users.aggregate([
  { $project: { fields: { $objectToArray: "$$ROOT" } } },
  { $project: { keys: "$fields.k" } },
  { $group: { _id: "$keys", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
// Multiple distinct key-sets = schema drift exists

// Find documents missing required fields
db.users.find({
  $or: [
    { emails: { $exists: false } },
    { profile: { $exists: false } },
    { "profile.firstName": { $exists: false } }
  ]
})

// Find documents with wrong field types
db.users.find({
  emails: { $not: { $type: "array" } }
})
```

### When NOT to strictly enforce schema or use versioning

- **Truly polymorphic data**: Event logs with different event types may need flexible schemas — use `pattern-polymorphic` instead.
- **Early prototyping**: Skip validation during exploration, add before production.
- **User-defined fields**: Some applications allow custom metadata fields.
- **Small datasets with downtime window**: If you can migrate all data in minutes during maintenance.
- **Additive-only changes**: If you only add optional fields, versioning is overkill.

## Verify with

```javascript
// Track version distribution
db.users.aggregate([
  { $group: { _id: "$schemaVersion", count: { $sum: 1 } } },
  { $sort: { _id: 1 } }
])

// Check for missing version field (implicit v1 documents)
db.users.countDocuments({ schemaVersion: { $exists: false } })

// Check if validation exists on the collection
const collInfo = db.getCollectionInfos({ name: "users" })[0]
const validator = collInfo?.options?.validator
// Missing validator = higher schema drift risk

// Find documents that don't match current validator
if (validator) {
  db.users.find({ $nor: [validator] }).limit(20)
  db.users.countDocuments({ $nor: [validator] })
}
```

References:
- [Schema Versioning Pattern](https://mongodb.com/docs/manual/data-modeling/design-patterns/data-versioning/schema-versioning/?utm_source=agent-skills)
- [Schema Validation](https://mongodb.com/docs/manual/core/schema-validation/?utm_source=agent-skills)
