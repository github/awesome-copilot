# Query Stats

## When to use

Analyzes query access patterns with minimal performance overhead. Use for identifying co-accessed fields, collection relationships, and query frequencies. Only supports `find`, `aggregate`, and `distinct` operations.

## Requirements

Atlas M10+ tier.

## How to use

Aggregate on the admin database.

With mcp-server, use the `mcp__mongodb__aggregateDB` tool with database set to `admin`.

```javascript
db.getSiblingDB("admin").aggregate([{ $queryStats: {} }])
```

**Example 1: Find collections frequently queried together with others (embedding candidates)**
```javascript
db.aggregate([
  { $queryStats: {} },
  {
    $match: {
      "key.queryShape.cmdNs.db": "databaseName",
      "key.queryShape.command": "aggregate",
      "key.queryShape.pipeline.$lookup": { $exists: true }
    }
  },
  { $unwind: "$key.queryShape.pipeline" },
  { 
    $match: { "key.queryShape.pipeline.$lookup": { $exists: true } } 
  },
  { 
    $set: { 
      stageKeyValue: { 
        $first: { $objectToArray: "$key.queryShape.pipeline" } 
      } 
    }
  },
  { 
    $group: {
      _id: { 
        source: "$key.queryShape.cmdNs.coll",
        target: "$stageKeyValue.v.from"
      },
      totalLookupHits: { $sum: "$metrics.execCount" },
      avgPipelineMs: {
        $avg: { $divide: [
          { $divide: ["$metrics.totalExecMicros.sum", 1000] },
          "$metrics.execCount"
        ]}
      }
    }
  },
  { $sort: { totalLookupHits: -1 } }
])

// High totalLookupHits = frequently joined 
// High avgPipelineMS = lookup is part of slow queries (does not automatically mean that the $lookup is slow, could be the whole pipeline - see the full query shapes)
// High scores on both - consider embedding to avoid $lookup 
```

**Example 1.1: Find query shapes that use $lookup on specific collections**
```javascript
db.aggregate([
  { $queryStats: {} },
  {
    $match: {
      "key.queryShape.cmdNs.db": "databaseName",
      "key.queryShape.command": "aggregate",
      "key.queryShape.cmdNs.coll": "sourceCollectionName",
      "key.queryShape.pipeline.$lookup.from": "targetCollectionName"
    }
  },
  {
    $project: {
      database: "$key.queryShape.cmdNs.db",
      collection: "$key.queryShape.cmdNs.coll",
      pipeline: "$key.queryShape.pipeline",
      execCount: "$metrics.execCount",
      avgMs: {
          $divide: [
            { $divide: ["$metrics.totalExecMicros.sum", 1000] },
            "$metrics.execCount"
          ]
      }
    },
  },
  { $sort: { execCount: -1 } },
  { $limit: 10 }
])
```

**Example 2: Find top most frequent query shapes (optimize hot paths)**
```javascript
db.getSiblingDB("admin").aggregate([
  { $queryStats: {} },
  { $sort: { "metrics.execCount": -1 } },
  { $limit: 10 },
  {
    $project: {
      command: "$key.queryShape.command",
      database: "$key.queryShape.cmdNs.db",
      collection: "$key.queryShape.cmdNs.coll",
      queryShape: "$key.queryShape",
      execCount: "$metrics.execCount",
      avgMs: {
        $divide: [
          { $divide: ["$metrics.totalExecMicros.sum", 1000] },
          "$metrics.execCount"
        ]
      }
    }
  }
])

// High execCount = hot path → design your schema for these queries first
// Cross reference with avgMS or [slow query logs](references/source-slow-query-logs.md) to find queries that are both frequent and slow
// Note: Query stats do not include write patterns (update, insert)
```