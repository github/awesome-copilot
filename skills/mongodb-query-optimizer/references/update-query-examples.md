# Update Query Examples

## replaceOne vs. updateOne with $replaceWith

**Bad** — Full document replacement generates a large oplog entry:

```javascript
db.coll.replaceOne({ _id: X }, entireNewDocument)
```

**Good** — Use aggregation-based update to generate smaller oplog deltas:

```javascript
db.coll.updateOne({ _id: X }, [{ $replaceWith: { $literal: entireNewDocument } }])
```

**Why:** `replaceOne` writes the full document to the oplog. The aggregation update syntax lets MongoDB compute deltas, resulting in smaller oplog entries when only a few fields are changed.

## findOneAndUpdate Misuse vs. updateOne

**Bad** — Using `findOneAndUpdate` when you don't need the document returned:

```javascript
db.coll.findOneAndUpdate(
  { _id: X },
  { $set: { status: "processed" } }
)
```

**Good** — Use `updateOne` when you don't need the result document:

```javascript
db.coll.updateOne(
  { _id: X },
  { $set: { status: "processed" } }
)
```

**Why:** `findOneAndUpdate` writes a copy of the pre-change document to a side collection for retryable writes. This overhead is unnecessary if you don't need the returned document.