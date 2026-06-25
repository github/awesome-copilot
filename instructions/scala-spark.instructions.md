---
description: 'Best practices for building Apache Spark applications in Scala, covering DataFrames, Datasets, SparkSQL, performance tuning, testing, and production deployment patterns.'
applyTo: '**/*.scala, **/build.sbt, **/build.sc'
---

# Scala + Apache Spark Best Practices

Guidelines for writing efficient, maintainable, and production-ready Apache Spark applications in Scala.

## Dependencies

### SBT

```scala
val sparkVersion = "3.5.1"

libraryDependencies ++= Seq(
  "org.apache.spark" %% "spark-core"   % sparkVersion % "provided",
  "org.apache.spark" %% "spark-sql"    % sparkVersion % "provided",
  "org.apache.spark" %% "spark-mllib"  % sparkVersion % "provided",
  "org.apache.spark" %% "spark-streaming" % sparkVersion % "provided"
)
```

### Maven

```xml
<properties>
    <spark.version>3.5.1</spark.version>
    <scala.binary.version>2.13</scala.binary.version>
</properties>

<dependencies>
    <dependency>
        <groupId>org.apache.spark</groupId>
        <artifactId>spark-core_${scala.binary.version}</artifactId>
        <version>${spark.version}</version>
        <scope>provided</scope>
    </dependency>
    <dependency>
        <groupId>org.apache.spark</groupId>
        <artifactId>spark-sql_${scala.binary.version}</artifactId>
        <version>${spark.version}</version>
        <scope>provided</scope>
    </dependency>
    <dependency>
        <groupId>org.apache.spark</groupId>
        <artifactId>spark-mllib_${scala.binary.version}</artifactId>
        <version>${spark.version}</version>
        <scope>provided</scope>
    </dependency>
    <dependency>
        <groupId>org.apache.spark</groupId>
        <artifactId>spark-streaming_${scala.binary.version}</artifactId>
        <version>${spark.version}</version>
        <scope>provided</scope>
    </dependency>
</dependencies>
```

Mark Spark dependencies as `"provided"` since the cluster supplies them at runtime. Only bundle application-specific libraries in the fat JAR.

## SparkSession Setup

Always use `SparkSession` as the single entry point:

```scala
import org.apache.spark.sql.SparkSession

val spark: SparkSession = SparkSession.builder()
  .appName("MyApplication")
  .config("spark.sql.shuffle.partitions", "200")
  .config("spark.serializer", "org.apache.spark.serializer.KryoSerializer")
  .getOrCreate()

import spark.implicits._
```

- Do **not** create multiple `SparkSession` instances in the same JVM.
- Avoid hardcoding `master` in application code; set it at submit time via `--master`.

## DataFrames vs Datasets vs RDDs

Prefer the **DataFrame API** (untyped `Dataset[Row]`) for most workloads. Use **Datasets** (typed) when compile-time type safety justifies the serialization overhead. Avoid raw **RDDs** unless you need low-level control.

```scala
import org.apache.spark.sql.{DataFrame, Dataset}

// Preferred — DataFrame API
val df: DataFrame = spark.read.parquet("data/events")
val result = df
  .filter($"status" === "active")
  .groupBy($"region")
  .agg(count("*").as("total"))

// Typed Dataset — use when schema safety matters
case class Event(id: Long, status: String, region: String)
val ds: Dataset[Event] = df.as[Event]
val active = ds.filter(_.status == "active")
```

## Schema Management

Always define schemas explicitly when reading semi-structured data instead of relying on schema inference:

```scala
import org.apache.spark.sql.types._

val schema = StructType(Seq(
  StructField("id", LongType, nullable = false),
  StructField("name", StringType, nullable = true),
  StructField("timestamp", TimestampType, nullable = false),
  StructField("amount", DecimalType(18, 2), nullable = true),
  StructField("tags", ArrayType(StringType), nullable = true)
))

val df = spark.read
  .schema(schema)
  .json("data/events/*.json")
```

- Schema inference (`inferSchema=true`) reads the entire data source and is expensive for large files.
- For Parquet and Delta, the schema is embedded — explicit definition is unnecessary.

## Column Expressions

Prefer `col()` or `$""` over string column names in transformations for early error detection:

```scala
import org.apache.spark.sql.functions._

// Good — type-checked column references
df.select(col("name"), $"amount" * 1.1 as "adjusted_amount")

// Avoid — string-only references delay errors to runtime
df.select("name", "amount")
```

## Joins

### Broadcast Joins

Broadcast the smaller side of a join when it fits in executor memory (typically < 100 MB):

```scala
import org.apache.spark.sql.functions.broadcast

val enriched = largeDF.join(
  broadcast(smallLookupDF),
  Seq("key"),
  "left"
)
```

### Avoiding Cartesian Products

Never use cross joins unless intentional. Enable the safeguard:

```scala
spark.conf.set("spark.sql.crossJoin.enabled", "false")
```

### Skew Handling

For joins on skewed keys, salt the key to distribute load:

```scala
import org.apache.spark.sql.functions._

val saltBuckets = 10
val saltedLeft = leftDF.withColumn("salt", (rand() * saltBuckets).cast("int"))
val saltedRight = rightDF
  .crossJoin((0 until saltBuckets).toDF("salt"))

val result = saltedLeft
  .join(saltedRight, Seq("join_key", "salt"))
  .drop("salt")
```

The tradeoff is that the right side grows by 10×, so this only works when the right side is reasonably small or the skew is severe enough to justify it. For Spark 3.x+, AQE's built-in skew join handling (`spark.sql.adaptive.skewJoin.enabled = true`) can do this automatically without manual salting.

## Partitioning and Bucketing

### Write Partitioning

Partition output by high-cardinality filter columns (e.g., date):

```scala
df.write
  .partitionBy("year", "month")
  .mode("overwrite")
  .parquet("output/events")
```

- Avoid partitioning on high-cardinality columns (e.g., user ID) which creates millions of small files.

### Shuffle Partitions

Tune `spark.sql.shuffle.partitions` based on data volume:

```scala
// Default is 200; adjust based on data size
// Rule of thumb: target 128 MB per partition
spark.conf.set("spark.sql.shuffle.partitions", "400")
```

### Repartition vs Coalesce

```scala
// Repartition — full shuffle, use to increase or evenly distribute partitions
df.repartition(100, $"key")

// Coalesce — no shuffle, use only to reduce partition count
df.coalesce(10)
```

Never use `coalesce(1)` on large datasets — it forces all data through a single task.

## Caching and Persistence

Cache only when a DataFrame is reused multiple times:

```scala
import org.apache.spark.storage.StorageLevel

val cached = expensiveDF.persist(StorageLevel.MEMORY_AND_DISK)
cached.count() // materialize the cache

// Use cached DF multiple times
val summary = cached.groupBy("region").count()
val filtered = cached.filter($"amount" > 1000)

// Always unpersist when done
cached.unpersist()
```

- Prefer `MEMORY_AND_DISK` over `MEMORY_ONLY` to avoid recomputation on eviction.
- Never cache DataFrames that are only used once.

## UDFs — Use Sparingly

Prefer built-in Spark SQL functions over UDFs. UDFs disable Catalyst optimizations and require serialization:

```scala
import org.apache.spark.sql.functions._

// Good — use built-in functions
df.withColumn("upper_name", upper($"name"))
  .withColumn("name_length", length($"name"))

// Avoid — UDF for something built-in functions handle
val upperUdf = udf((s: String) => s.toUpperCase)
df.withColumn("upper_name", upperUdf($"name"))
```

When a UDF is unavoidable, prefer `spark.udf.register` for SparkSQL compatibility, and handle nulls explicitly:

```scala
val parseStatus = udf((raw: String) => {
  Option(raw).map(_.trim.toLowerCase) match {
    case Some("active") | Some("enabled")  => "ACTIVE"
    case Some("inactive") | Some("disabled") => "INACTIVE"
    case _                                   => "UNKNOWN"
  }
})
```

## Window Functions

Use window functions for ranking, running totals, and lag/lead calculations:

```scala
import org.apache.spark.sql.expressions.Window

val windowSpec = Window
  .partitionBy("department")
  .orderBy($"salary".desc)

val ranked = df
  .withColumn("rank", rank().over(windowSpec))
  .withColumn("dense_rank", dense_rank().over(windowSpec))
  .withColumn("row_number", row_number().over(windowSpec))
  .withColumn("running_total", sum($"salary").over(
    Window.partitionBy("department").orderBy("hire_date")
      .rowsBetween(Window.unboundedPreceding, Window.currentRow)
  ))
```

## Error Handling

### Corrupt Record Handling

```scala
val df = spark.read
  .option("mode", "PERMISSIVE")            // default: keeps corrupt rows
  .option("columnNameOfCorruptRecord", "_corrupt_record")
  .schema(schema)
  .json("data/events")

val clean = df.filter($"_corrupt_record".isNull).drop("_corrupt_record")
val bad   = df.filter($"_corrupt_record".isNotNull)
bad.write.json("data/quarantine")
```

### Accumulator-Based Error Counting

```scala
val parseErrors = spark.sparkContext.longAccumulator("parseErrors")

val parsed = df.map { row =>
  try {
    parseRow(row)
  } catch {
    case _: Exception =>
      parseErrors.add(1)
      null
  }
}.filter(_ != null)

println(s"Parse errors: ${parseErrors.value}")
```

> **Caveat:** Accumulators are only guaranteed accurate inside actions (`count`, `collect`, `write`). If tasks are retried due to failures, accumulators can over-count. For exact error tracking, prefer the quarantine pattern above; use accumulators for operational monitoring only.

## Streaming (Structured Streaming)

```scala
val stream = spark.readStream
  .format("kafka")
  .option("kafka.bootstrap.servers", "broker:9092")
  .option("subscribe", "events")
  .option("startingOffsets", "latest")
  .load()

val parsed = stream
  .selectExpr("CAST(value AS STRING) as json")
  .select(from_json($"json", schema).as("data"))
  .select("data.*")

val query = parsed.writeStream
  .format("delta")
  .option("checkpointLocation", "/checkpoints/events")
  .outputMode("append")
  .trigger(Trigger.ProcessingTime("30 seconds"))
  .start("output/events")

query.awaitTermination()
```

- Always set a checkpoint location for fault tolerance.
- Use `Trigger.ProcessingTime` or `Trigger.AvailableNow` — avoid `Trigger.Once` in production (use `AvailableNow` instead).

## Delta Lake Integration

```scala
import io.delta.tables.DeltaTable

// Upsert / merge
val target = DeltaTable.forPath(spark, "data/customers")

target.as("t")
  .merge(updatesDF.as("s"), "t.id = s.id")
  .whenMatched.updateAll()
  .whenNotMatched.insertAll()
  .execute()

// Time travel
val yesterday = spark.read
  .format("delta")
  .option("timestampAsOf", "2025-01-15")
  .load("data/customers")

// Optimize and vacuum
target.optimize().executeCompaction()
target.vacuum(168) // retain 7 days
```

## Performance Tuning Checklist

1. **Minimize shuffles** — use `broadcast` joins, pre-partition data, avoid unnecessary `groupBy`.
2. **Avoid `collect()` on large DataFrames** — it pulls all data to the driver.
3. **Prefer `explain(true)`** to inspect physical plans before running expensive jobs.
4. **Enable Adaptive Query Execution (AQE)**:
   ```scala
   spark.conf.set("spark.sql.adaptive.enabled", "true")
   spark.conf.set("spark.sql.adaptive.coalescePartitions.enabled", "true")
   spark.conf.set("spark.sql.adaptive.skewJoin.enabled", "true")
   ```
5. **Use columnar formats** (Parquet, Delta, ORC) over CSV/JSON for analytical workloads.
6. **Predicate pushdown** — filter early in the query plan; place filters before joins.
7. **Column pruning** — `select` only needed columns instead of `select("*")`.
8. **Avoid `distinct()` before `groupBy`** — the aggregation already deduplicates.

## Testing

### Unit Testing Transformations

Test pure transformation functions without a SparkSession when possible:

```scala
import org.scalatest.funsuite.AnyFunSuite

class TransformationsTest extends AnyFunSuite {
  test("parseStatus maps known values correctly") {
    assert(parseStatus("active") == "ACTIVE")
    assert(parseStatus("DISABLED") == "INACTIVE")
    assert(parseStatus(null) == "UNKNOWN")
  }
}
```

### Integration Testing with SparkSession

Use a shared `SparkSession` for DataFrame-level tests:

```scala
import org.apache.spark.sql.SparkSession
import org.scalatest.BeforeAndAfterAll
import org.scalatest.funsuite.AnyFunSuite

trait SparkTestBase extends AnyFunSuite with BeforeAndAfterAll {
  lazy val spark: SparkSession = SparkSession.builder()
    .master("local[2]")
    .appName("test")
    .config("spark.sql.shuffle.partitions", "2")
    .getOrCreate()

  override def afterAll(): Unit = {
    spark.stop()
    super.afterAll()
  }
}

class EventPipelineTest extends SparkTestBase {
  import spark.implicits._

  test("pipeline filters inactive events") {
    val input = Seq(
      Event(1L, "active", "US"),
      Event(2L, "inactive", "EU")
    ).toDS()

    val result = filterActive(input)
    assert(result.count() == 1)
    assert(result.collect().head.status == "active")
  }
}
```

## Application Packaging

### Fat JAR with sbt-assembly

```scala
// project/plugins.sbt
addSbtPlugin("com.eed3si9n" % "sbt-assembly" % "2.1.5")

// build.sbt
assembly / assemblyMergeStrategy := {
  case PathList("META-INF", _*) => MergeStrategy.discard
  case _                        => MergeStrategy.first
}
```

### Spark Submit

```bash
spark-submit \
  --class com.example.MainApp \
  --master yarn \
  --deploy-mode cluster \
  --num-executors 10 \
  --executor-memory 8g \
  --executor-cores 4 \
  --conf spark.sql.adaptive.enabled=true \
  --conf spark.serializer=org.apache.spark.serializer.KryoSerializer \
  target/scala-2.13/my-app-assembly-1.0.jar \
  --input s3://bucket/input \
  --output s3://bucket/output
```

## Common Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|---|---|---|
| `collect()` on large data | OOM on driver | Use `take(n)`, `show()`, or write to storage |
| `count()` inside loops | Triggers full DAG evaluation each time | Cache and count once |
| UDF for built-in operations | Disables Catalyst optimizer | Use `org.apache.spark.sql.functions._` |
| `var` for DataFrames | Mutable references cause confusion | Chain transformations or use `val` |
| Schema inference on CSV/JSON | Reads entire source, fragile | Define `StructType` explicitly |
| `coalesce(1)` on large data | Single-task bottleneck | Use `repartition` with reasonable count |
| Nested `map` on RDDs | Quadratic complexity | Use `join` or `broadcast` |
| Ignoring data skew | Straggler tasks, OOM | Salt keys or use AQE skew handling |

## Dynamic Allocation

Enable dynamic allocation to let Spark scale executors up and down based on workload demand. This is essential for shared clusters where fixed executor counts waste resources during idle stages:

```scala
spark.conf.set("spark.dynamicAllocation.enabled", "true")
spark.conf.set("spark.dynamicAllocation.minExecutors", "2")
spark.conf.set("spark.dynamicAllocation.maxExecutors", "50")
spark.conf.set("spark.dynamicAllocation.initialExecutors", "5")
spark.conf.set("spark.dynamicAllocation.executorIdleTimeout", "60s")
spark.conf.set("spark.dynamicAllocation.schedulerBacklogTimeout", "1s")
```

Or via `spark-submit`:

```bash
spark-submit \
  --conf spark.dynamicAllocation.enabled=true \
  --conf spark.dynamicAllocation.minExecutors=2 \
  --conf spark.dynamicAllocation.maxExecutors=50 \
  --conf spark.shuffle.service.enabled=true \
  ...
```

Key settings:

| Setting | Purpose |
|---|---|
| `minExecutors` | Floor — always keep at least this many executors running |
| `maxExecutors` | Ceiling — cap to prevent monopolizing the cluster |
| `initialExecutors` | Starting count before auto-scaling kicks in |
| `executorIdleTimeout` | Remove idle executors after this duration (default 60s) |
| `schedulerBacklogTimeout` | Request new executors when tasks have been pending this long |

- **Requires `spark.shuffle.service.enabled=true`** on YARN/Mesos — an external shuffle service preserves shuffle files after executors are removed. Without it, removed executors lose their shuffle data, forcing costly recomputation.
- On **Kubernetes**, use `spark.dynamicAllocation.shuffleTracking.enabled=true` instead (no external shuffle service needed).
- **Do not combine** `--num-executors` with dynamic allocation — they conflict. Remove `--num-executors` when enabling dynamic allocation.
