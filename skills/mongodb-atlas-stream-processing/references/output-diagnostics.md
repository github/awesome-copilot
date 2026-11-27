# Processor Output Diagnostics Reference

## The Problem

A user says "my processor isn't outputting anything" or "output seems low." Before assuming something is broken, you must **classify the processor type** — low output may be perfectly normal.

## Processor Type Classification

### Category 1: Alert / Anomaly Detection

**Expected output:** Low or zero most of the time. Spikes during anomalous events.

Examples:
- Fraud detection (flags suspicious transactions)
- Threshold alerting (temperature > 100, latency > 500ms)
- Error monitoring (filters for error-level events)
- Security alerting (unusual login patterns)

**Green flags (healthy):**
- Zero output during normal conditions
- Occasional bursts during genuine anomalies
- DLQ is empty or near-empty

**Red flags (problem):**
- Zero output during a *known* anomaly event
- DLQ filling up with errors
- Processor state is FAILED

### Category 2: Data Transformation / Ingestion

**Expected output:** Roughly 1:1 with input volume. Output should be proportional to source.

Examples:
- Format conversion (Kafka → Atlas)
- Data enrichment (add fields, lookup)
- Schema normalization
- Archive pipelines (collection → collection)

**Green flags (healthy):**
- Output volume roughly matches input volume
- Consistent throughput over time

**Red flags (problem):**
- Output is zero while source has data
- Output is much lower than expected source volume
- Growing backlog (source advancing but output not keeping up)
- DLQ accumulating documents

### Category 3: Filter / Quality Gate

**Expected output:** Variable — depends on match rate of filter criteria.

Examples:
- Quality filtering (`$match` for valid records)
- Data routing (priority-based splitting)
- Deduplication
- Sampling

**Green flags (healthy):**
- Output is a consistent percentage of input
- Percentage aligns with expected data quality/match rate

**Red flags (problem):**
- Output drops to zero when source has data
- Sudden change in output ratio without a data source change
- DLQ filling up (filter errors, not just filtered-out data)

## Diagnostic Workflow

### Step 1: Classify the processor

Ask the user what the processor does, or inspect the pipeline:
- `atlas-streams-discover` → `inspect-processor` — read the pipeline stages

**Classification heuristics from pipeline:**
- Has `$match` with narrow conditions (e.g., `severity > 8`) → likely **Alert**
- Pipeline is mostly `$addFields`/`$project`/`$merge` → likely **Transformation**
- `$match` filters broadly (e.g., `status: "active"`) → likely **Filter**
- Has `$tumblingWindow` with `$match` inside → likely **Alert** (windowed anomaly detection)
- Has `$tumblingWindow` with `$group` only → likely **Transformation** (aggregation)

### Step 2: Check processor state

- `atlas-streams-discover` → `diagnose-processor`
- If state is FAILED → the problem is not low output, it's a crash. See debugging trees in [development-workflow.md](development-workflow.md).

### Step 3: Check operational logs

- For detailed logs, direct the user to the Atlas UI: **Atlas → Stream Processing → Workspace → Processor → Logs tab**
- Operational logs contain runtime errors: Kafka producer/consumer failures, schema serialization issues, OOM events, connection timeouts

### Step 4: Check DLQ

- Use MongoDB `count` tool on the DLQ collection
- If DLQ has documents → use MongoDB `find` tool to inspect error messages
- Growing DLQ means documents are being *rejected*, not that nothing is flowing

### Step 5: Check output collection

- Use MongoDB `count` tool on the output collection
- Use MongoDB `find` tool with `sort: {"_id": -1}` and `limit: 5` to see most recent documents
- Check timestamps — are documents recent?

### Step 6: Interpret based on processor type

| Processor type | Zero output | Low output | Action |
|---------------|-------------|------------|--------|
| **Alert** | Probably normal | Probably normal | Verify a known test event triggers output |
| **Transformation** | Problem — check connections, DLQ | Problem — check filters, DLQ | Debug pipeline and connections |
| **Filter** | Could be normal if no data matches | Could be normal | Verify filter criteria against actual source data |

## Common Diagnostic Patterns

After running `diagnose-processor`, match the symptoms to these patterns:

| Symptom | Root Cause | Fix |
|---------|------------|-----|
| **Error 419 + "no partitions found"** | Kafka topic doesn't exist or is misspelled | Verify topic name with Kafka broker; check connection config |
| **State: FAILED + multiple restarts** | Connection-level error (bypasses DLQ) | Check operational logs for repeated error; fix connection config or pipeline |
| **State: STARTED + zero output + windowed pipeline** | Idle Kafka partitions blocking window closure | Add `partitionIdleTimeout` to Kafka `$source` (e.g., `{"size": 30, "unit": "second"}`) |
| **State: STARTED + zero output + non-windowed** | Source has no data or filter too strict | Check if source (Kafka topic, collection) has data; review `$match` filters |
| **High memoryUsageBytes approaching tier limit** | OOM risk — window state or pipeline too large | Upgrade to higher tier (see sizing-and-parallelism.md) |
| **DLQ count increasing** | Per-document processing errors | Use MongoDB `find` on DLQ collection to inspect failed documents and error messages |

**When providing fix steps:**
- Commit to a specific root cause based on the evidence
- Do NOT present a list of hypothetical scenarios
- Provide concrete, ordered steps (e.g., "stop → modify pipeline to add partitionIdleTimeout → restart with resumeFromCheckpoint: false")

## Contextual Factors

Before concluding there's a problem, consider:

- **Time of day:** Business-hours-only data sources produce nothing at night
- **Seasonality:** Holiday periods, end-of-month spikes, etc.
- **Source health:** Is the source (Kafka topic, collection) actually receiving data?
- **Window timing:** Windowed processors only emit when the window closes — a 5-minute tumbling window outputs nothing for up to 5 minutes after start
- **Idle partitions:** Kafka windows won't close if a partition has no data — check `partitionIdleTimeout`

## Best Practice: Document Expected Behavior

When creating processors, encourage users to use descriptive names that indicate the processor type:

| Name pattern | Type indication |
|-------------|-----------------|
| `fraud-detector` | Alert — low output expected |
| `order-enricher` | Transformation — 1:1 output expected |
| `quality-filter` | Filter — variable output expected |
| `iot-5min-rollup` | Transformation — output every 5 min |
| `error-monitor` | Alert — low output expected |
