# Pipeline Patterns Reference

**Official examples repo**: https://github.com/mongodb/ASP_example (quickstarts, example processors, Terraform examples). Start with example_processors/README.md for the full pattern catalog.
Always consult the official repo for the latest validated patterns before creating processors.

## Stage Quick-Reference

| Stage | Purpose | Category |
|-------|---------|----------|
| `$source` | Data ingress (Kafka, Cluster, Kinesis, Sample) | Source (required, first) |
| `$match` | Filter documents | Stateless |
| `$project` | Select/reshape fields | Stateless |
| `$addFields` | Add computed fields | Stateless |
| `$unset` | Remove fields | Stateless |
| `$unwind` | Explode arrays into documents | Stateless |
| `$replaceRoot` | Promote nested document to root | Stateless |
| `$redact` | Field-level access control | Stateless |
| `$validate` | Schema enforcement (route invalid to DLQ) | Validation |
| `$lookup` | Enrich from Atlas collection | Enrichment |
| `$https` | Enrich from HTTP API | Enrichment |
| `$externalFunction` | Invoke Lambda (mid-pipeline, NOT terminal) | Enrichment |
| `$tumblingWindow` | Fixed-size non-overlapping windows | Stateful |
| `$hoppingWindow` | Fixed-size overlapping windows | Stateful |
| `$sessionWindow` | Gap-based per-key windows | Stateful |
| `$function` | JavaScript UDF (requires SP30+) | Custom Code |
| `$group` | Aggregate (inside windows) | Stateful |
| `$merge` | Write to Atlas collection | Output (required, last) |
| `$emit` | Write to Kafka, Kinesis, or S3 | Output (required, last) |
| `$iceberg` | Append to or update an Iceberg table registered in a catalog (SP10+) | Output (required, last) |

| Category | Stages | Rules |
|----------|--------|-------|
| **Source** (1, required) | `$source` | Must be first. One per pipeline. |
| **Stateless Processing** | `$match`, `$project`, `$addFields`, `$unset`, `$unwind`, `$replaceRoot`, `$redact` | No state or memory overhead. Place `$match` first to reduce volume. |
| **Enrichment** | `$lookup`, `$https`, `$externalFunction` (sync/async) | I/O-bound. Use `parallelism` for throughput. `$https` and `$externalFunction` can be mid-pipeline enrichment OR terminal sink. For sinks: `$https` sends to webhooks/APIs, `$externalFunction` requires `execution: "async"`. |
| **Validation** | `$validate` | Schema enforcement. Place early to catch bad data before expensive stages. |
| **Stateful/Window** | `$tumblingWindow`, `$hoppingWindow`, `$sessionWindow` | Accumulates state in memory. Monitor `memoryUsageBytes`. |
| **Custom Code** | `$function` | JavaScript UDFs. Requires SP30+. |
| **Output** (1+, required) | `$merge`, `$emit`, `$iceberg`, `$https`, `$externalFunction` (async only) | Must be last. Required for deployed processors. |

## Invalid Constructs

Do NOT use these in streaming pipelines:
- `$$NOW`, `$$CURRENT` — not available in stream processing
- HTTPS connections as `$source` — HTTPS is for `$https` enrichment only
- Kafka `$source` without `topic` — topic field is required
- Pipelines without a sink — `$merge`/`$emit`/`$iceberg` required for deployed processors (sinkless only works via `sp.process()`)
- Lambda connections with `$emit` — Lambda uses `$externalFunction` (can be mid-pipeline or terminal sink with async execution), not `$emit`

## Source Patterns

### MongoDB Change Stream
```json
{"$source": {"connectionName": "my-cluster"}}
```

With full document and pushdown pipeline:
```json
{"$source": {
  "connectionName": "my-cluster",
  "db": "mydb", "coll": "mycoll",
  "fullDocument": "updateLookup",
  "fullDocumentBeforeChange": "whenAvailable",
  "pipeline": [{"$match": {"operationType": "insert"}}]
}}
```

### Kafka (topic is REQUIRED)
```json
{"$source": {
  "connectionName": "my-kafka",
  "topic": "my-topic",
  "auto_offset_reset": "earliest",
  "partitionIdleTimeout": {"size": 30, "unit": "second"}
}}
```

### Kinesis
```json
{"$source": {
  "connectionName": "my-kinesis",
  "stream": "my-stream",
  "config": {"initialPosition": "TRIM_HORIZON"},
  "shardIdleTimeout": {"size": 30, "unit": "second"},
  "consumerARN": "arn:aws:kinesis:us-east-1:123456789:stream/my-stream/consumer/my-consumer:123"
}}
```

`stream` (required): Kinesis stream name. `config.initialPosition`: `TRIM_HORIZON` (oldest, default) or `LATEST`. `shardIdleTimeout`: unblocks windows when shards go idle (like Kafka `partitionIdleTimeout`). `consumerARN` (optional): enables enhanced fan-out for dedicated throughput.

### Inline Documents (ephemeral testing only)
```json
{"$source": {"documents": [{"device_id": "sensor-1", "temp": 72.5}]}}
```

## Sink Patterns

### $merge to Atlas
```json
{"$merge": {"into": {"connectionName": "my-atlas", "db": "mydb", "coll": "mycoll"}}}
```

With match behavior and parallelism:
```json
{"$merge": {
  "into": {"connectionName": "my-atlas", "db": "mydb", "coll": "mycoll"},
  "on": "_id", "whenMatched": "replace", "whenNotMatched": "insert",
  "parallelism": 4
}}
```

`whenMatched`: `replace`, `merge`, `delete` (via `$cond`). `whenNotMatched`: `insert`.

Additive merge (append to arrays):
```json
{"$merge": {
  "into": {"connectionName": "my-atlas", "db": "mydb", "coll": "mycoll"},
  "on": "device_id",
  "whenMatched": [{"$addFields": {"readings": {"$concatArrays": ["$readings", "$$new.readings"]}}}],
  "whenNotMatched": "insert"
}}
```

Dynamic routing:
```json
{"$merge": {"into": {
  "connectionName": "my-atlas", "db": "mydb",
  "coll": {"$cond": {"if": {"$eq": ["$priority", "high"]}, "then": "alerts", "else": "events"}}
}}}
```

### $emit to Kafka
```json
{"$emit": {
  "connectionName": "my-kafka", "topic": "output-topic",
  "key": {"field": "device_id", "format": "string"}
}}
```

Key formats: `string`, `json`, `int`, `long`, `binData`. Tombstone support: `"tombstoneWhen": {"$expr": {"$eq": ["$status", "deleted"]}}`.

### $emit to Kafka with Schema Registry (Avro)
```json
{"$emit": {
  "connectionName": "my-kafka", "topic": "output-topic",
  "schemaRegistry": {
    "connectionName": "my-schema-registry",
    "valueSchema": {
      "type": "avro",
      "schema": {
        "type": "record", "name": "SensorReading",
        "fields": [
          {"name": "device_id", "type": "string"},
          {"name": "temp", "type": "double"},
          {"name": "timestamp", "type": "long"}
        ]
      },
      "options": {
        "subjectNameStrategy": "TopicNameStrategy",
        "autoRegisterSchemas": true
      }
    }
  }
}}
```
Requires a `SchemaRegistry` connection (see [connection-configs.md](connection-configs.md#schemaregistry)). `valueSchema.type` must be lowercase `avro` (case-sensitive). `valueSchema.schema` is always required, even with `autoRegisterSchemas: true`.

### $emit to Kinesis
```json
{"$emit": {"connectionName": "my-kinesis", "stream": "out", "partitionKey": "$device_id"}}
```

### $emit to S3
```json
{"$emit": {
  "connectionName": "my-s3", "bucket": "my-bucket",
  "path": {"$concat": ["data/", {"$dateToString": {"format": "%Y/%m/%d", "date": "$timestamp"}}]},
  "config": {"outputFormat": "relaxedJson"}
}}
```
Fields: `connectionName` (required), `bucket` (required), `path` (required — key prefix string or expression), `region` (optional), `config` (optional — `outputFormat`, `writeOptions`, `delimiter`, `compression`).

### $iceberg to S3 or Azure Blob
`$iceberg` is its own terminal stage (not `$emit`) and requires tier SP10 or higher. `connectionName` is the **storage** connection (S3 or Azure Blob), not the catalog.

```json
{"$iceberg": {
  "connectionName": "my-s3",
  "bucket": "my-bucket",
  "path": "warehouse/iceberg",
  "databaseName": "my_db",
  "tableName": {"$meta": "stream.source.ns.coll"},
  "mode": "insert",
  "catalog": {"type": "unity", "connectionName": "my-unity", "warehouse": "my_unity_catalog"}
}}
```
Fields: `connectionName`, `path` (no trailing `/`), `databaseName`, `tableName` (string or expression) are required. `mode` is `cdc` (default; applies inserts, updates and deletes from `stream.source.operationType`) or `insert` (appends every document as a new row, ignoring operation type). `catalog` is optional.
- **Unity does not support `cdc` mode**. With `catalog.type: "unity"`, set `mode: "insert"`. Horizon, Hadoop and Glue support `cdc`.
- **S3:** use `bucket`. `region` is required only when the workspace is not on AWS.
- **Azure Blob Storage:** use `container` instead of `bucket`; `region` is not supported.

**`catalog` by type:**

| `type` | Extra fields | Notes |
|--------|--------------|-------|
| `hadoop` | none | Built-in; type only |
| `glue` | none | Built-in; S3 only; type only |
| `unity` | `connectionName`, `warehouse` | `connectionName` is a DataCatalog connection; `warehouse` is the Unity catalog name |
| `horizon` | `connectionName`, `warehouse` | `connectionName` is a DataCatalog connection; `warehouse` is the Snowflake database |

`warehouse` and `databaseName` together identify where the table is created:
- **`unity`:** `warehouse` is the Unity catalog name; `databaseName` is the schema within that catalog.
- **`horizon`:** `warehouse` is the Snowflake database; `databaseName` is the schema within that database.

**Azure Blob Storage with a catalog:** `unity` and `horizon` work with an Azure Blob storage connection; `hadoop` is also available.
- The connection's service principal needs Storage Blob Data Contributor on the container.
- **Horizon:** create the Snowflake external volume on the Data Lake endpoint (`azure://<account>.dfs.core.windows.net/...`), not the Blob endpoint.
- **Horizon:** Snowflake's Azure app needs Storage Blob Data Contributor on the container and Storage Blob Delegator on the storage account. The Horizon connection role needs USAGE on the database and schema and CREATE ICEBERG TABLE on the schema.

Common mistakes:
- ❌ `$emit` for Iceberg → use `$iceberg`
- ❌ Unity catalog with `mode: "cdc"` (or omitting `mode`, which defaults to `cdc`) → set `mode: "insert"`
- ❌ Omitting `warehouse` for `unity`/`horizon` → rejected
- ❌ Adding `connectionName`/`warehouse` to `hadoop`/`glue` → rejected; use `type` alone
- ❌ Pointing `$iceberg.connectionName` at the DataCatalog connection → it is the S3/Azure storage connection; the DataCatalog goes in `catalog.connectionName`

Create the DataCatalog connection first (see [connection-configs.md](connection-configs.md#datacatalog)).

### $https as Sink (webhook/API)
```json
{"$https": {
  "connectionName": "my-webhook",
  "path": "/events",
  "method": "POST",
  "onError": "dlq"
}}
```

When used as a **final sink stage**, `$https` sends processed documents to an external HTTP endpoint. Unlike mid-pipeline usage (which enriches documents with API responses), sink usage doesn't expect a response to merge back into the document. Useful for:
- Sending data to webhooks
- Posting to external APIs
- Triggering external systems

### $externalFunction as Sink (Lambda async)
```json
{"$externalFunction": {
  "connectionName": "my-lambda",
  "functionName": "arn:aws:lambda:us-west-1:123456789:function:my-function",
  "execution": "async",
  "onError": "dlq"
}}
```

**Important**: When used as a **final sink stage**, `$externalFunction` MUST use `execution: "async"`. This fires off the Lambda function without waiting for a response, useful for:
- Triggering downstream AWS applications or analytics
- Notifying external systems
- Firing off alerts or billing logic
- Propagating data to external workflows

Unlike mid-pipeline usage (where `execution: "sync"` is allowed for enrichment), sink usage requires async execution only. The pipeline still needs this as the terminal stage — you cannot use `$emit` to invoke Lambda.

## Window Patterns

### Tumbling
```json
{"$tumblingWindow": {
  "interval": {"size": 5, "unit": "minute"},
  "pipeline": [{"$group": {"_id": "$deviceId", "avg": {"$avg": "$temp"}, "count": {"$sum": 1}}}]
}}
```

### Hopping (with allowedLateness)
```json
{"$hoppingWindow": {
  "interval": {"size": 5, "unit": "minute"},
  "hopSize": {"size": 1, "unit": "minute"},
  "allowedLateness": {"size": 15, "unit": "second"},
  "pipeline": [{"$group": {"_id": "$region", "total": {"$sum": "$amount"}}}]
}}
```

### Session
```json
{"$sessionWindow": {
  "gap": {"size": 5, "unit": "minute"}, "key": "$userId",
  "pipeline": [{"$group": {"_id": "$userId", "actions": {"$push": "$action"}, "count": {"$sum": 1}}}]
}}
```

### Late data
```json
{"$tumblingWindow": {
  "interval": {"size": 1, "unit": "minute"},
  "allowedLateness": {"size": 30, "unit": "second"},
  "boundaryType": "eventTime",
  "pipeline": [{"$group": {"_id": "$sensorId", "max": {"$max": "$value"}}}]
}}
```

`boundaryType`: `eventTime` (document timestamp) or `processTime` (wall clock, default).

## Windowing Rules
- Windows require `$group` inside the window pipeline
- Idle Kafka partitions block windows — use `partitionIdleTimeout`
- `allowedLateness` lets late docs update closed windows

## Enrichment Patterns

### $https
```json
{"$https": {
  "connectionName": "my-api",
  "path": {"$concat": ["/users/", "$userId"]},
  "method": "GET", "as": "userInfo", "onError": "dlq"
}}
```

`onError`: `dlq` (recommended), `ignore`, `fail`. Store auth in connection settings, not pipeline. Place `$https` after windows to batch requests.

### $lookup
```json
{"$lookup": {
  "connectionName": "my-atlas",
  "from": {"db": "mydb", "coll": "users"},
  "localField": "userId", "foreignField": "_id", "as": "user",
  "parallelism": 2
}}
```

### $externalFunction (Lambda - Mid-Pipeline Enrichment)
```json
{"$externalFunction": {
  "connectionName": "my-lambda",
  "functionName": "my-function-name",
  "execution": "sync",
  "as": "lambdaResult",
  "onError": "dlq",
  "payload": [
    {"$project": {"userId": 1, "data": 1}}
  ]
}}
```

**Mid-pipeline usage:**
- `execution`: `sync` (waits for Lambda result, stores in `as` field) or `async` (non-blocking)
- `as`: Field name to store Lambda response (required for `sync`, ignored for `async`)
- `payload`: Optional inner pipeline to customize request body sent to Lambda
- Use for enriching/transforming documents before downstream stages

**Sink usage:** See the Sink Patterns section. When used as final stage, MUST use `execution: "async"` only.

### $validate (Schema Validation)
```json
{"$validate": {
  "validator": {"$jsonSchema": {
    "required": ["device_id", "timestamp", "reading"],
    "properties": {
      "device_id": {"bsonType": "string"},
      "reading": {"bsonType": "double"}
    }
  }},
  "validationAction": "dlq"
}}
```

`validationAction`: `"dlq"` (recommended), `"discard"`, `"error"` (crashes processor — avoid in production). Place early to catch bad data before expensive stages.

### $function (JavaScript UDF)
```json
{"$addFields": {
  "boostedWatts": {"$function": {
    "body": "function(watts) { return watts * 1.2; }",
    "args": ["$watts"],
    "lang": "js"
  }}
}}
```

Requires **SP30+ tier**. `body`: JavaScript function as string. `args`: array of field references. `lang`: always `"js"`.

## Common Pipeline Patterns

### Array Normalization
```json
[
  {"$source": {"connectionName": "my-kafka", "topic": "orders"}},
  {"$unwind": "$items"},
  {"$replaceRoot": {"newRoot": {"$mergeObjects": ["$items", {"orderId": "$orderId", "ts": "$timestamp"}]}}},
  {"$merge": {"into": {"connectionName": "my-atlas", "db": "mydb", "coll": "line_items"}}}
]
```

### Dynamic Kafka Topic Routing
```json
{"$emit": {
  "connectionName": "my-kafka",
  "topic": {"$switch": {
    "branches": [
      {"case": {"$eq": ["$severity", "critical"]}, "then": "alerts-critical"},
      {"case": {"$eq": ["$severity", "warning"]}, "then": "alerts-warning"}
    ],
    "default": "alerts-info"
  }}
}}
```

### Complex Event Processing (Fraud Detection)
```json
[
  {"$source": {"connectionName": "my-kafka", "topic": "transactions"}},
  {"$tumblingWindow": {
    "interval": {"size": 5, "unit": "minute"},
    "pipeline": [
      {"$group": {
        "_id": "$userId",
        "txnCount": {"$sum": 1},
        "totalAmount": {"$sum": "$amount"},
        "uniqueLocations": {"$addToSet": "$location"}
      }},
      {"$addFields": {
        "suspiciousLocations": {"$gt": [{"$size": "$uniqueLocations"}, 3]},
        "highVelocity": {"$gt": ["$txnCount", 10]}
      }},
      {"$match": {"$or": [{"suspiciousLocations": true}, {"highVelocity": true}]}}
    ]
  }},
  {"$merge": {"into": {"connectionName": "my-atlas", "db": "fraud", "coll": "alerts"}}}
]
```

### Graceful Degradation with $ifNull
```json
{"$addFields": {
  "userName": {"$ifNull": ["$userInfo.name", "unknown"]},
  "userTier": {"$ifNull": ["$userInfo.tier", "standard"]},
  "enrichmentSucceeded": {"$ne": [{"$type": "$userInfo"}, "missing"]}
}}
```

## Window Metadata

Inside window pipelines, `_stream_meta.window.start` and `_stream_meta.window.end` provide boundary timestamps:
```json
{"$group": {
  "_id": "$deviceId",
  "windowStart": {"$first": "$_stream_meta.window.start"},
  "windowEnd": {"$first": "$_stream_meta.window.end"},
  "avg": {"$avg": "$temp"}
}}
```

## Checkpoint Resume Constraints

With `resumeFromCheckpoint: true` (default), you CANNOT change: window type, interval, remove windows, or modify `$source`. Set `false` to make these changes (restarts from beginning).

## DLQ Configuration
```json
{"dlq": {"connectionName": "my-atlas", "db": "streams_dlq", "coll": "failed_documents"}}
```
DLQ documents include: original document, error message, stage info, timestamp.

## Sample Stream Formats

| Format | Data type |
|--------|-----------|
| `sample_stream_solar` | Solar panel IoT readings (default) |
| `samplestock` | Stock market tick data |
| `sampleweather` | Weather station readings |
| `sampleiot` | Generic IoT sensor data |
| `samplelog` | Application log events |
| `samplecommerce` | E-commerce transaction data |

## Chained Processors (Multi-Sink Pattern)

**CRITICAL: A single pipeline can only have ONE terminal sink** (`$merge`, `$emit`, or `$iceberg`). You CANNOT have more than one terminal sink stage. When a user requests multiple output destinations (e.g., "write to Atlas AND emit to Kafka" or "archive to S3 AND send to Lambda"), you MUST:

1. **Acknowledge** the single-sink constraint explicitly in your response
2. **Propose chained processors**: Processor A reads source → enriches → writes to intermediate via `$merge` (Atlas) or `$emit` (Kafka). Processor B reads from that intermediate (change stream or Kafka topic) → emits to second destination. Kafka-as-intermediate is lower latency; Atlas-as-intermediate is simpler to inspect.
3. **Show both processor pipelines** including any `$lookup` enrichment stages with `parallelism` settings.

Note: `$externalFunction` (Lambda) can be used mid-pipeline OR as a terminal sink (with `execution: "async"`). A pipeline with mid-pipeline `$externalFunction` AND a terminal `$merge`/`$emit`/`$iceberg` is a valid single-sink pattern (Lambda enriches, then the result is written to the sink).

## Required Field Examples by Stage

### $source (Kinesis)
Use `stream` (NOT `streamName` or `topic`) for the Kinesis stream name.
```json
{"$source": {"connectionName": "my-kinesis", "stream": "my-stream"}}
```

### $source (change stream)
Include `fullDocument: "updateLookup"` to get the full document content.

### $emit (Kinesis)
MUST include `partitionKey`.
```json
{"$emit": {"connectionName": "my-kinesis", "stream": "my-stream", "partitionKey": "$fieldName"}}
```

### $emit (S3)
Use `path` (NOT `prefix`).
```json
{"$emit": {"connectionName": "my-s3", "bucket": "my-bucket", "path": "data/year={$year}", "config": {"outputFormat": {"name": "json"}}}}
```
