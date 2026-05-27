# ES|QL Complete Reference

ES|QL (Elasticsearch Query Language) is a piped query language for filtering, transforming, and analyzing data in
Elasticsearch. It uses pipes (`|`) to chain commands together.

> **Serverless vs Self-Managed:** Version annotations in this document (e.g., "9.2+") apply to self-managed
> Elasticsearch. Detect cluster type via `build_flavor` in the `GET /` response: `"serverless"` means all GA and preview
> features are available — **do not** gate on `version.number` for Serverless (it tracks the next minor from main;
> semver-only checks may treat it as “latest”). For self-managed, use `version.number` (strip any `-SNAPSHOT` suffix)
> for feature checks.

## Table of Contents

- [Query Structure](#query-structure)
- [Query Directives](#query-directives)
- [Source Commands](#source-commands)
- [Processing Commands](#processing-commands)
- [Aggregate Functions](#aggregate-functions)
- [Time Series Aggregation Functions](#time-series-aggregation-functions)
- [String Functions](#string-functions)
- [Math Functions](#math-functions)
- [Date/Time Functions](#datetime-functions)
- [Type Conversion Functions](#type-conversion-functions)
- [IP Functions](#ip-functions)
- [Spatial Functions](#spatial-functions)
- [Dense Vector Functions](#dense-vector-functions)
- [Multivalue Functions](#multivalue-functions)
- [Conditional Functions](#conditional-functions)
- [Full-Text Search Functions](#full-text-search-functions)
- [Operators](#operators)
- [Syntax Details](#syntax-details)
- [Metadata Fields](#metadata-fields)
- [Best Practices](#best-practices)
- [Example Queries](#example-queries)

## Query Structure

```esql
source-command
| processing-command1
| processing-command2
| ...
```

An ES|QL query starts with a **source command** followed by zero or more **processing commands** separated by pipes.

---

## Query Directives

Query directives modify the behavior of an ES|QL query. They appear before the source command.

### SET (9.3+, tech preview)

Controls query-level settings.

**Syntax:**

```esql
SET setting = value; [SET settingN = valueN;]
source-command
| processing-commands
```

**`unmapped_fields`** (9.3+ preview) -- controls how unmapped fields are treated:

- `FAIL` (default) -- the query fails if it references unmapped fields
- `NULLIFY` -- treats unmapped fields as null values

**`time_zone`** (Serverless GA; self-managed planned) -- sets the default timezone for the query, overriding UTC
default.

**Examples:**

```esql
SET unmapped_fields = "nullify";
FROM employees
| KEEP emp_no, foo
| SORT emp_no
| LIMIT 1

SET time_zone = "+05:00";
TS k8s
| WHERE @timestamp == "2024-05-10T00:04:49.000Z"
| STATS BY @timestamp, bucket = TBUCKET(3 hours)
```

> **When to use:** `unmapped_fields` is useful when querying across multiple indices where some indices may not have all
> fields mapped. `time_zone` shifts date functions and display to a non-UTC zone.

---

## Source Commands

Source commands produce tables, typically from Elasticsearch data.

### FROM

Retrieves data from indices, data streams, or aliases.

**Syntax:**

```esql
FROM index_pattern [METADATA fields]
```

**Examples:**

```esql
// Basic usage
FROM logs-*

// Multiple indices
FROM employees-00001, other-employees-*

// With metadata
FROM logs-* METADATA _id, _index

// Date math
FROM <logs-{now/d}>

// Cross-cluster search
FROM cluster_one:logs-*, cluster_two:logs-*
```

**Note:** Without explicit `LIMIT`, queries default to 1000 rows (or whatever the cluster setting
esql.query.result_truncation_default_size is set to).

### ROW

Creates a row with literal values. Useful for testing.

**Syntax:**

```esql
ROW column1 = value1 [, column2 = value2, ...]
```

**Examples:**

```esql
ROW a = 1, b = "two", c = null
ROW x = [1, 2, 3]
ROW greeting = "hello", pi = 3.14159
```

### TS

Retrieves data from time series data streams (TSDS). Similar to `FROM` but enables time series aggregation functions in
`STATS` and targets only time series indices. Available since 9.2.

**Syntax:**

```esql
TS index_pattern [METADATA fields]
```

**Key behavior:**

- Enables time series aggregation functions (`RATE`, `AVG_OVER_TIME`, etc.) in the first `STATS` command
- Time series functions are evaluated per time series first, then aggregated by group using an outer function
- If no inner time series function is specified, `LAST_OVER_TIME()` is assumed implicitly
- Cannot be combined with `FORK` before `STATS` is applied

**Examples:**

```esql
// Rate of search requests per host per hour
TS metrics
| WHERE @timestamp >= NOW() - 1 hour
| STATS SUM(RATE(search_requests)) BY TBUCKET(1 hour), host

// Average of last memory usage values per time series (implicit LAST_OVER_TIME)
TS metrics
| STATS AVG(memory_usage)

// Average of per-time-series averages (explicit inner function)
TS metrics
| STATS AVG(AVG_OVER_TIME(memory_usage))
```

**Best practices:**

- Add a time range filter on `@timestamp` to limit data volume
- Use `TS` instead of `FROM` for aggregations on time series data
- Avoid aggregating metrics with different dimensional cardinalities in the same query

### SHOW

Returns information about the deployment.

**Syntax:**

```esql
SHOW INFO
```

---

## Processing Commands

Processing commands transform the input table.

### WHERE

Filters rows based on a boolean condition.

**Syntax:**

```esql
WHERE condition
```

**Examples:**

```esql
FROM employees
| WHERE salary > 50000

FROM logs-*
| WHERE status_code >= 400 AND status_code < 500

FROM events
| WHERE message LIKE "*error*"

FROM users
| WHERE name RLIKE "J.*n"

FROM data
| WHERE field IS NOT NULL
```

**NULL handling (three-valued logic):** ES|QL follows SQL-style three-valued logic. Comparisons involving `NULL`
evaluate to _unknown_, not `true` or `false`. This means `WHERE field != "value"` silently excludes rows where `field`
is `NULL` (missing). This differs from DSL, KQL, EQL, and Splunk, where negation typically includes missing fields.

To include `NULL` rows in negation filters, add an explicit `IS NULL` check:

```esql
// WRONG: silently drops rows where user.name is NULL
FROM logs-*
| WHERE user.name != "admin"

// CORRECT: includes rows where user.name is missing
FROM logs-*
| WHERE user.name != "admin" OR user.name IS NULL
```

### EVAL

Adds or replaces columns with calculated values.

**Syntax:**

```esql
EVAL column1 = expression1 [, column2 = expression2, ...]
```

**Examples:**

```esql
FROM employees
| EVAL annual_salary = monthly_salary * 12

FROM logs
| EVAL duration_ms = end_time - start_time
| EVAL duration_sec = duration_ms / 1000

FROM data
| EVAL full_name = CONCAT(first_name, " ", last_name)
| EVAL is_adult = age >= 18
```

### STATS ... BY

Aggregates data, optionally grouped by columns.

**Syntax:**

```esql
STATS aggregation1 [WHERE filter1] [, aggregation2 [WHERE filter2], ...] [BY grouping1, grouping2, ...]
```

**Examples:**

```esql
// Simple count
FROM logs-*
| STATS count = COUNT(*)

// Multiple aggregations
FROM sales
| STATS
    total = SUM(amount),
    avg_amount = AVG(amount),
    max_amount = MAX(amount)

// Grouped aggregation
FROM logs-*
| STATS count = COUNT(*) BY status_code

// Multiple groupings
FROM sales
| STATS total = SUM(amount) BY region, product_category

// Time-based grouping
FROM logs-*
| STATS count = COUNT(*) BY bucket = DATE_TRUNC(1 hour, @timestamp)

// Per-aggregation WHERE filters (8.16+) — conditional metrics in a single pass
FROM logs-*
| STATS
    total = COUNT(*),
    errors = COUNT(*) WHERE level == "error",
    warnings = COUNT(*) WHERE level == "warning"
  BY service.name

// Cluster semi-structured text into categories of similar format (requires Platinum license)
FROM logs-*
| STATS count = COUNT(*) BY category = CATEGORIZE(message)

// Control the clustering threshold: (1-100): Lower -> less clusters, default=70
FROM logs-*
| STATS count = COUNT(*) BY category = CATEGORIZE(message, {"similarity_threshold": 85})

// Use token output format and a custom analyzer
FROM logs-*
| STATS count = COUNT(*) BY category = CATEGORIZE(message, {"output_format": "tokens", "analyzer": "standard"})
```

### INLINE STATS ... BY

Aggregates data like `STATS`, but preserves all original columns and appends the aggregated values as new columns. The
output has the same number of rows as the input. Tech preview in 9.2, GA in 9.3.

**Syntax:**

```esql
INLINE STATS aggregation1 [WHERE filter1] [, aggregation2 [WHERE filter2], ...] [BY grouping1, grouping2, ...]
```

**Key differences from STATS:**

- `STATS` replaces the input table with aggregation results (fewer rows)
- `INLINE STATS` keeps every input row and adds the aggregated values as new columns

**Examples:**

```esql
// Add each employee's group max salary alongside their own salary
FROM employees
| KEEP emp_no, languages, salary
| INLINE STATS max_salary = MAX(salary) BY languages

// Add a global aggregation to every row (no BY clause)
FROM employees
| KEEP emp_no, salary
| INLINE STATS avg_salary = AVG(salary)
| WHERE salary > avg_salary

// Filter rows per aggregation with WHERE
FROM employees
| KEEP emp_no, salary
| INLINE STATS
    avg_low = ROUND(AVG(salary)) WHERE salary < 50000,
    avg_high = ROUND(AVG(salary)) WHERE salary >= 50000
```

**Use cases:**

- Compare individual values against group averages or totals
- Calculate percentages of group totals without a separate query
- Replaces some patterns that would require subqueries in SQL

**Limitations:**

- Cannot use `FORK` or `LIMIT` before `INLINE STATS`
- `CATEGORIZE` grouping function is not supported

### KEEP

Keeps only specified columns.

**Syntax:**

```esql
KEEP column1 [, column2, ...]
```

**Examples:**

```esql
FROM employees
| KEEP first_name, last_name, salary

// With wildcards
FROM logs-*
| KEEP @timestamp, message, error.*
```

### DROP

Removes specified columns.

**Syntax:**

```esql
DROP column1 [, column2, ...]
```

**Examples:**

```esql
FROM employees
| DROP internal_id, temp_field

// With wildcards
FROM data
| DROP temp_*, debug_*
```

### RENAME

Renames columns.

**Syntax:**

```esql
RENAME old_name AS new_name [, old_name2 AS new_name2, ...]
```

**Examples:**

```esql
FROM employees
| RENAME emp_id AS employee_id

FROM data
| RENAME col1 AS column_one, col2 AS column_two
```

### SORT

Sorts the table.

**Syntax:**

```esql
SORT column1 [ASC/DESC] [NULLS FIRST/LAST] [, column2 ...]
```

**Examples:**

```esql
FROM employees
| SORT salary DESC

FROM logs-*
| SORT @timestamp DESC, severity ASC

FROM data
| SORT value ASC NULLS LAST
```

### LIMIT

Limits the number of rows returned.

**Syntax:**

```esql
LIMIT number
```

**Examples:**

```esql
FROM logs-*
| SORT @timestamp DESC
| LIMIT 100
```

### DISSECT

Extracts structured fields from a string using a pattern.

**Syntax:**

```esql
DISSECT field "%{pattern}"
```

**Examples:**

```esql
FROM logs
| DISSECT message "%{clientip} - - [%{timestamp}] \"%{method} %{path}\""

FROM apache_logs
| DISSECT message "%{ip} %{} %{} [%{timestamp}] \"%{request}\" %{status} %{bytes}"
```

**Cookbook — Common DISSECT Patterns:**

```esql
// Extract email domain
FROM customers
| DISSECT email "%{local}@%{domain}"
| STATS count = COUNT(*) BY domain

// Parse HTTP method and path from log messages like "GET /api/users HTTP/1.1"
FROM logs
| DISSECT message "%{method} %{path} %{protocol}"
| WHERE method IS NOT NULL
| KEEP @timestamp, method, path

// Extract key-value pairs from structured strings like "user=admin action=login"
FROM audit_logs
| DISSECT message "%{key1}=%{val1} %{key2}=%{val2}"
```

**Limitations:** DISSECT does not support
[reference keys](https://www.elastic.co/docs/reference/query-languages/esql/esql-process-data-with-dissect-grok#esql-dissect-limitations)
(e.g., `%{*key}` / `%{&key}` for dynamic key-value extraction).

### GROK

Extracts fields using grok patterns (regex-based).

**Syntax:**

```esql
GROK field "%{PATTERN:field_name}"
```

**Common Patterns:**

- `%{IP:ip}` - IP address
- `%{NUMBER:num}` - Number
- `%{WORD:word}` - Word
- `%{DATA:data}` - Any data (non-greedy)
- `%{GREEDYDATA:text}` - Any data (greedy)
- `%{TIMESTAMP_ISO8601:ts}` - ISO timestamp

**Examples:**

```esql
FROM logs
| GROK message "%{IP:client_ip} %{WORD:method} %{NUMBER:status:int}"

FROM web_logs
| GROK agent "%{WORD:browser}/%{NUMBER:version}"
```

**Limitations:** ES|QL GROK does not support
[custom patterns](https://www.elastic.co/docs/reference/query-languages/esql/esql-process-data-with-dissect-grok#esql-custom-patterns)
or [multiple pattern matching](https://www.elastic.co/docs/reference/enrich-processor/grok-processor#trace-match). Only
built-in grok patterns are available.

### LOOKUP JOIN

Joins data from a lookup index onto the current results. The preferred way to enrich query results with data from
another index. GA in 8.19/9.1.

**Syntax:**

```esql
LOOKUP JOIN lookup_index ON join_field
```

**Key behavior:**

- Performs a LEFT OUTER JOIN — all rows from the source are preserved; unmatched rows get `NULL` for lookup fields
- The lookup index must use `index.mode: lookup` (single shard, max 2B docs)
- Supports multi-field joins (9.2+) and mixed numeric types
- Updates to the lookup index are reflected immediately in subsequent queries
- **Name collisions:** If a lookup field has the same name as an existing source column, the lookup value overwrites it.
  Use `RENAME` before the join to preserve the original column when needed.

**Examples:**

```esql
// Enrich logs with user metadata
FROM logs-*
| LOOKUP JOIN users ON user.id

// Add product details to order data
FROM orders
| LOOKUP JOIN products ON product_id
| STATS revenue = SUM(price * quantity) BY product_name

// Enrich security events with threat intelligence
FROM security-events
| LOOKUP JOIN threat_intel ON source.ip
| WHERE threat_level == "high"
```

**Multi-field joins (9.2+):**

```esql
// Join on multiple fields — match service, environment, and version
FROM application_logs
| LOOKUP JOIN service_registry ON service_name, environment, version
```

**Complex join predicates with expressions (9.2+ tech preview):**

```esql
// Range-based join — find the SLA threshold for each service's response time
FROM app_metrics
| LOOKUP JOIN sla_thresholds ON service == service_name AND response_time_ms >= threshold_min

// Date-range join — find the pricing policy active at measurement time
FROM meter_readings
| LOOKUP JOIN customers ON customer_id
| LOOKUP JOIN pricing_policies ON region_id == region AND measurement_date >= valid_from AND measurement_date < valid_to
| EVAL due_amount = usage * price_per_unit
```

**Lucene-pushable predicates in joins (9.3+ tech preview):**

Full-text functions and other Lucene-pushable predicates (`MATCH`, `QSTR`, `KQL`, `LIKE`, `STARTS_WITH`) can be applied
to lookup index fields in the `ON` clause, enabling search-style joins.

```esql
// Full-text search against lookup index fields
FROM support_tickets
| LOOKUP JOIN knowledge_base ON MATCH(article_content, issue_description) AND product == product_name

// Combine text search with equality join
FROM error_logs
| LOOKUP JOIN runbooks ON QSTR("title:timeout OR title:connection") AND service == service_name
```

### ENRICH

Enriches data using a pre-configured enrich policy. On clusters with 8.18+, prefer `LOOKUP JOIN` — it requires no policy
setup and reflects changes immediately. On clusters **before 8.18**, `ENRICH` is the only option for data enrichment. If
no enrich policy exists, suggest the user create one (see [Generation Tips](generation-tips.md#lookup-join-and-enrich)
for setup steps).

**Syntax:**

```esql
ENRICH policy_name ON match_field [WITH new_field1, new_field2, ...]
```

**Examples:**

```esql
FROM logs
| ENRICH geo_policy ON client_ip WITH country, city

FROM sales
| ENRICH products_policy ON product_id WITH product_name, category
```

### CHANGE_POINT

Detects spikes, dips, and change points in a metric. Requires a Platinum license. Tech preview in 8.19/9.1, GA in 9.2.

**Syntax:**

```esql
CHANGE_POINT value ON key [AS type_name, pvalue_name]
```

- `value` -- the metric field to analyze for change points
- `key` -- the field to order by (typically a date or sequence)
- `type_name` -- output column for the type of change (`step_change`, `distribution_change`, `trend_change`, `dip`,
  `spike`, `non_stationary`, `stationary`, `no_change`)
- `pvalue_name` -- output column for the p-value (statistical significance)

**Examples:**

```esql
// Detect change points in error rates over time
FROM logs-*
| STATS error_count = COUNT(*) WHERE level == "error" BY hour = DATE_TRUNC(1 hour, @timestamp)
| SORT hour
| CHANGE_POINT error_count ON hour AS change_type, p_value

// Find significant changes in response times
FROM metrics
| STATS avg_latency = AVG(response_time) BY minute = DATE_TRUNC(1 minute, @timestamp)
| SORT minute
| CHANGE_POINT avg_latency ON minute
```

### FORK

Creates multiple execution branches that operate on the same input data and combines results into a single output table.
A `_fork` column identifies which branch each row came from. Tech preview in 9.1.

**Syntax:**

```esql
FORK ( processing_commands ) ( processing_commands ) [... ( processing_commands )]
```

**Constraints:**

- Maximum 8 branches
- Each branch defaults to `LIMIT 1000` if no LIMIT is specified
- Columns with the same name must have the same type across branches; missing columns are filled with null
- Cannot use remote cluster references with FORK
- Only one FORK per query

**Examples:**

```esql
// Run different aggregations on the same data
FROM logs-*
| FORK
    ( WHERE level == "error" | STATS errors = COUNT(*) BY service.name )
    ( WHERE level == "warning" | STATS warnings = COUNT(*) BY service.name )

// Compare different time windows
FROM metrics
| FORK
    ( WHERE @timestamp > NOW() - 1 hour | STATS recent_avg = AVG(cpu) )
    ( WHERE @timestamp > NOW() - 24 hours | STATS daily_avg = AVG(cpu) )
| SORT _fork

// Search with multiple strategies — combine full-text and keyword matches
FROM articles METADATA _score
| FORK
    ( WHERE MATCH(content, "elasticsearch performance") | SORT _score DESC | LIMIT 10 )
    ( WHERE MATCH_PHRASE(title, "search optimization") | SORT _score DESC | LIMIT 10 )
    ( WHERE category == "guides" AND tags : "elasticsearch" | SORT published_date DESC | LIMIT 10 )
| KEEP _fork, title, _score, published_date
```

### FUSE

Merges rows from multiple result sets (typically from FORK branches) and assigns new relevance scores. Tech preview in
9.2.

**Syntax:**

```esql
FUSE method SCORE BY score_column GROUP BY group_column KEY BY key_columns [WITH options]
```

**Methods:**

- `rrf` — Reciprocal Rank Fusion. Combines ranked lists by reciprocal rank; no score normalization needed.
- `linear` — Linear combination of scores. Supports `normalizer` and per-branch `weights`.

**LINEAR options:**

| Option       | Type    | Default | Description                                              |
| ------------ | ------- | ------- | -------------------------------------------------------- |
| `normalizer` | keyword | —       | Score normalization method; `minmax` maps scores to 0–1  |
| `weights`    | object  | equal   | Per-branch weights (e.g. `{"fork1": 0.7, "fork2": 0.3}`) |

**Examples:**

```esql
// RRF fusion (default)
FROM articles METADATA _score
| FORK
    ( WHERE MATCH(content, "elasticsearch") | SORT _score DESC | LIMIT 50 )
    ( WHERE MATCH(title, "search guide") | SORT _score DESC | LIMIT 50 )
| FUSE rrf SCORE BY _score KEY BY _id
| LIMIT 10

// LINEAR fusion with minmax normalization and custom weights
FROM articles METADATA _id, _index, _score
| FORK
    ( WHERE MATCH(content, "elasticsearch") | SORT _score DESC | LIMIT 50 )
    ( WHERE semantic_content : "how does elasticsearch work" | SORT _score DESC | LIMIT 50 )
| FUSE linear WITH { "normalizer": "minmax", "weights": { "fork1": 0.7, "fork2": 0.3 } }
| SORT _score DESC
| LIMIT 10
```

### RERANK

Uses an inference model to re-score an initial set of documents. Tech preview in 9.2 (GA on Serverless). Since 9.3,
defaults to 1000 rows; configurable via `esql.command.rerank.limit` and `esql.command.rerank.enabled` cluster settings.

**Syntax:**

```esql
RERANK [column =] query ON field [, field, ...] [WITH { "inference_id": "endpoint" }]
```

**Example:**

```esql
FROM articles METADATA _score
| WHERE MATCH(content, "elasticsearch performance")
| SORT _score DESC
| LIMIT 100
| RERANK "how to improve elasticsearch performance" ON content WITH { "inference_id": "my-rerank-model" }
| LIMIT 10
```

### COMPLETION

Sends prompts and context to a Large Language Model (LLM) using a `completion` inference endpoint. Tech preview in
8.19/9.1, requires Platinum license.

**Syntax:**

```esql
[column =] COMPLETION prompt WITH inference_endpoint
```

**Example:**

```esql
FROM support_tickets
| WHERE status == "open"
| EVAL prompt = CONCAT("Summarize this ticket: ", description)
| COMPLETION summary = prompt WITH my_llm_endpoint
| KEEP ticket_id, summary
```

### SAMPLE

Samples a random fraction of rows from the input table. Tech preview in 8.19/9.1.

**Syntax:**

```esql
SAMPLE probability
```

- `probability` -- value between 0 and 1 (exclusive), the chance each row is included

**Example:**

```esql
// Sample ~10% of rows for exploratory analysis
FROM logs-*
| SAMPLE 0.1
| STATS avg_duration = AVG(duration) BY service.name
```

### MV_EXPAND

Expands multivalued fields into separate rows.

**Syntax:**

```esql
MV_EXPAND field
```

**Examples:**

```esql
FROM data
| MV_EXPAND tags
| STATS count = COUNT(*) BY tags
```

### URI_PARTS (Planned)

Parses a URI string and extracts its components (domain, path, port, query, scheme, etc.) into new columns. Not yet
released.

**Syntax:**

```esql
URI_PARTS prefix = expression
```

**Example:**

```esql
FROM web_logs
| URI_PARTS url_parts = request_url
| KEEP url_parts.domain, url_parts.path, url_parts.query
```

---

## Aggregate Functions

Used with STATS command.

| Function                           | Description                                       | Example                                          |
| ---------------------------------- | ------------------------------------------------- | ------------------------------------------------ |
| `COUNT(*)`                         | Count all rows                                    | `STATS n = COUNT(*)`                             |
| `COUNT(field)`                     | Count non-null values                             | `STATS n = COUNT(status)`                        |
| `COUNT_DISTINCT(field)`            | Count unique values                               | `STATS unique = COUNT_DISTINCT(user_id)`         |
| `SUM(field)`                       | Sum of values                                     | `STATS total = SUM(amount)`                      |
| `AVG(field)`                       | Average                                           | `STATS avg_price = AVG(price)`                   |
| `MIN(field)`                       | Minimum value                                     | `STATS min_temp = MIN(temperature)`              |
| `MAX(field)`                       | Maximum value                                     | `STATS max_score = MAX(score)`                   |
| `MEDIAN(field)`                    | Median value                                      | `STATS med = MEDIAN(response_time)`              |
| `PERCENTILE(field, p)`             | Percentile                                        | `STATS p95 = PERCENTILE(latency, 95)`            |
| `STD_DEV(field)`                   | Standard deviation                                | `STATS sd = STD_DEV(values)`                     |
| `VARIANCE(field)`                  | Variance                                          | `STATS var = VARIANCE(values)`                   |
| `VALUES(field)`                    | Collect all values                                | `STATS all_tags = VALUES(tag)`                   |
| `TOP(field, n, order)`             | Top N values                                      | `STATS top3 = TOP(score, 3, "desc")`             |
| `WEIGHTED_AVG(val, weight)`        | Weighted average                                  | `STATS wavg = WEIGHTED_AVG(score, weight)`       |
| `MEDIAN_ABSOLUTE_DEVIATION(field)` | Robust variability measure                        | `STATS mad = MEDIAN_ABSOLUTE_DEVIATION(latency)` |
| `ABSENT(field)`                    | True if no non-null values (9.2+)                 | `STATS is_absent = ABSENT(error_code)`           |
| `PRESENT(field)`                   | True if any non-null values (9.2+)                | `STATS has_data = PRESENT(metric)`               |
| `SAMPLE(field, n)`                 | Collect n sample values (8.19/9.1+)               | `STATS examples = SAMPLE(message, 5)`            |
| `FIRST(field, sort_field)`         | Earliest value by sort field (Serverless preview) | `STATS earliest = FIRST(message, @timestamp)`    |
| `LAST(field, sort_field)`          | Latest value by sort field (Serverless preview)   | `STATS latest = LAST(message, @timestamp)`       |
| `ST_CENTROID_AGG(field)`           | Spatial centroid of points                        | `STATS center = ST_CENTROID_AGG(location)`       |
| `ST_EXTENT_AGG(field)`             | Bounding box of geometries (8.18/9.0+, preview)   | `STATS bbox = ST_EXTENT_AGG(location)`           |

### Grouping Functions

Used in the `BY` clause of `STATS` and `INLINE STATS` to create dynamic groups.

| Function              | Description                                       | Example                                               |
| --------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| `BUCKET(field, size)` | Create fixed-size buckets for numbers or dates    | `STATS count = COUNT(*) BY b = BUCKET(price, 10)`     |
| `TBUCKET(interval)`   | Time-based bucketing (9.2+, for use with `TS`)    | `STATS SUM(RATE(reqs)) BY TBUCKET(1 hour)`            |
| `CATEGORIZE(field)`   | Auto-categorize text values (8.18/9.0+, Platinum) | `STATS count = COUNT(*) BY cat = CATEGORIZE(message)` |

**CATEGORIZE options (9.2+):**

| Option                 | Type    | Default | Description                                                       |
| ---------------------- | ------- | ------- | ----------------------------------------------------------------- |
| `similarity_threshold` | integer | `70`    | Clustering sensitivity (1–100); lower = fewer clusters            |
| `output_format`        | keyword | `regex` | Output as `regex` patterns or space-separated `tokens`            |
| `analyzer`             | keyword | field's | Override the analyzer used to tokenize text before categorization |

**BUCKET examples:**

```esql
// Numeric buckets — group prices into ranges of 50
FROM products
| STATS count = COUNT(*) BY price_range = BUCKET(price, 50)
| SORT price_range

// Date buckets — group events into 1-hour intervals
FROM logs-*
| WHERE @timestamp > NOW() - 24 hours
| STATS count = COUNT(*) BY hour = BUCKET(@timestamp, 1 hour)
| SORT hour

// Auto-sized buckets — let ES pick bucket size (target ~20 buckets)
FROM logs-*
| WHERE @timestamp > NOW() - 7 days
| STATS count = COUNT(*) BY bucket = BUCKET(@timestamp, 20, "2025-01-01", "2025-01-08")
```

---

## Time Series Aggregation Functions

Used with the `STATS` command after a `TS` source command. These functions evaluate per time series first, then
aggregate by group using an outer function (e.g., `SUM`, `AVG`). An optional second argument specifies a sliding time
window. Available since 9.2.

| Function                            | Description                    | Metric Types   |
| ----------------------------------- | ------------------------------ | -------------- |
| `RATE(field [, window])`            | Per-second rate of change      | counter        |
| `IRATE(field [, window])`           | Instantaneous rate of change   | counter        |
| `INCREASE(field [, window])`        | Total increase                 | counter        |
| `AVG_OVER_TIME(field [, window])`   | Average over time              | gauge, counter |
| `SUM_OVER_TIME(field [, window])`   | Sum over time                  | gauge          |
| `MIN_OVER_TIME(field [, window])`   | Minimum over time              | gauge          |
| `MAX_OVER_TIME(field [, window])`   | Maximum over time              | gauge          |
| `LAST_OVER_TIME(field [, window])`  | Last value over time           | gauge, counter |
| `FIRST_OVER_TIME(field [, window])` | First value over time          | gauge, counter |
| `COUNT_OVER_TIME(field [, window])` | Count of values over time      | gauge, counter |
| `COUNT_DISTINCT_OVER_TIME(field)`   | Distinct count over time       | gauge, counter |
| `PERCENTILE_OVER_TIME(field, p)`    | Percentile over time           | gauge          |
| `VARIANCE_OVER_TIME(field)`         | Variance over time             | gauge          |
| `STDDEV_OVER_TIME(field)`           | Standard deviation over time   | gauge          |
| `DELTA(field [, window])`           | Change in value                | gauge          |
| `IDELTA(field [, window])`          | Instantaneous change           | gauge          |
| `DERIV(field [, window])`           | Rate of change for gauges      | gauge          |
| `PRESENT_OVER_TIME(field)`          | Whether time series has data   | gauge, counter |
| `ABSENT_OVER_TIME(field)`           | Whether time series lacks data | gauge, counter |

**Grouping helpers for time series:**

- `TBUCKET(interval)` — groups results into time buckets (used in `BY` clause)
- `TRANGE(duration)` — filters to a time range (used in `WHERE` clause)

**Examples:**

```esql
// Sum of per-time-series rates, grouped by host and hour
TS metrics
| WHERE @timestamp >= NOW() - 1 hour
| STATS SUM(RATE(search_requests)) BY TBUCKET(1 hour), host

// Average rate with a 10-minute sliding window, bucketed per minute
TS metrics
| WHERE TRANGE(1 hour)
| STATS AVG(RATE(requests, 10 minutes)) BY TBUCKET(1 minute), host
```

---

## String Functions

| Function                    | Description                                         | Example                                                              |
| --------------------------- | --------------------------------------------------- | -------------------------------------------------------------------- |
| `LENGTH(s)`                 | String length                                       | `EVAL len = LENGTH(name)`                                            |
| `CONCAT(s1, s2, ...)`       | Concatenate strings                                 | `EVAL full = CONCAT(first, " ", last)`                               |
| `SUBSTRING(s, start, len)`  | Extract substring                                   | `EVAL sub = SUBSTRING(text, 1, 10)`                                  |
| `LEFT(s, n)`                | Left n characters                                   | `EVAL l = LEFT(text, 5)`                                             |
| `RIGHT(s, n)`               | Right n characters                                  | `EVAL r = RIGHT(text, 5)`                                            |
| `TRIM(s)`                   | Remove whitespace                                   | `EVAL clean = TRIM(input)`                                           |
| `LTRIM(s)`                  | Trim left                                           | `EVAL clean = LTRIM(input)`                                          |
| `RTRIM(s)`                  | Trim right                                          | `EVAL clean = RTRIM(input)`                                          |
| `TO_UPPER(s)`               | Uppercase                                           | `EVAL upper = TO_UPPER(name)`                                        |
| `TO_LOWER(s)`               | Lowercase                                           | `EVAL lower = TO_LOWER(name)`                                        |
| `REPLACE(s, old, new)`      | Replace text                                        | `EVAL fixed = REPLACE(msg, "err", "error")`                          |
| `SPLIT(s, delim)`           | Split into array                                    | `EVAL parts = SPLIT(path, "/")`                                      |
| `STARTS_WITH(s, prefix)`    | Check prefix                                        | `WHERE STARTS_WITH(url, "https")`                                    |
| `ENDS_WITH(s, suffix)`      | Check suffix                                        | `WHERE ENDS_WITH(file, ".log")`                                      |
| `CONTAINS(s, substr)`       | Check contains                                      | `WHERE CONTAINS(message, "error")`                                   |
| `LOCATE(substr, s)`         | Find position                                       | `EVAL pos = LOCATE("@", email)`                                      |
| `REVERSE(s)`                | Reverse string                                      | `EVAL rev = REVERSE(text)`                                           |
| `REPEAT(s, n)`              | Repeat string                                       | `EVAL sep = REPEAT("-", 10)`                                         |
| `SPACE(n)`                  | N spaces                                            | `EVAL spaces = SPACE(5)`                                             |
| `BIT_LENGTH(s)`             | Bit length (8.17+)                                  | `EVAL bits = BIT_LENGTH(name)`                                       |
| `BYTE_LENGTH(s)`            | Byte length (8.17+)                                 | `EVAL bytes = BYTE_LENGTH(name)`                                     |
| `CHUNK(field, settings)`    | Split text into chunks (9.3+, preview)              | `EVAL chunks = CHUNK(body, {"strategy":"word","max_chunk_size":50})` |
| `HASH(alg, s)`              | Hash string (8.18/9.0+)                             | `EVAL h = HASH("SHA-256", msg)`                                      |
| `MD5(s)`                    | MD5 hash (8.18/9.0+)                                | `EVAL h = MD5(content)`                                              |
| `SHA1(s)`                   | SHA-1 hash (8.18/9.0+)                              | `EVAL h = SHA1(content)`                                             |
| `SHA256(s)`                 | SHA-256 hash (8.18/9.0+)                            | `EVAL h = SHA256(content)`                                           |
| `FROM_BASE64(s)`            | Decode base64                                       | `EVAL decoded = FROM_BASE64(encoded)`                                |
| `TO_BASE64(s)`              | Encode to base64                                    | `EVAL encoded = TO_BASE64(data)`                                     |
| `URL_DECODE(s)`             | URL-decode (9.2+)                                   | `EVAL decoded = URL_DECODE(url)`                                     |
| `URL_ENCODE(s)`             | URL-encode (9.2+)                                   | `EVAL encoded = URL_ENCODE(text)`                                    |
| `URL_ENCODE_COMPONENT(s)`   | URL-encode for URI components (9.2+)                | `EVAL encoded = URL_ENCODE_COMPONENT(text)`                          |
| `JSON_EXTRACT(field, path)` | Extract value from JSON string (Serverless preview) | `EVAL name = JSON_EXTRACT(raw, "$.user.name")`                       |

---

## Math Functions

| Function                        | Description                       | Example                                  |
| ------------------------------- | --------------------------------- | ---------------------------------------- |
| `ABS(n)`                        | Absolute value                    | `EVAL abs_val = ABS(diff)`               |
| `ROUND(n, decimals)`            | Round                             | `EVAL rounded = ROUND(price, 2)`         |
| `FLOOR(n)`                      | Round down                        | `EVAL floored = FLOOR(value)`            |
| `CEIL(n)`                       | Round up                          | `EVAL ceiled = CEIL(value)`              |
| `SQRT(n)`                       | Square root                       | `EVAL root = SQRT(area)`                 |
| `POW(base, exp)`                | Power                             | `EVAL squared = POW(x, 2)`               |
| `EXP(n)`                        | e^n                               | `EVAL e_power = EXP(x)`                  |
| `LOG(n)`                        | Natural log                       | `EVAL ln = LOG(value)`                   |
| `LOG10(n)`                      | Log base 10                       | `EVAL log = LOG10(value)`                |
| `SIN(n)`, `COS(n)`, `TAN(n)`    | Trig functions                    | `EVAL sine = SIN(angle)`                 |
| `ASIN(n)`, `ACOS(n)`, `ATAN(n)` | Inverse trig                      | `EVAL angle = ASIN(ratio)`               |
| `PI()`                          | Pi constant                       | `EVAL circumference = 2 * PI() * radius` |
| `E()`                           | Euler's number                    | `EVAL e = E()`                           |
| `SIGNUM(n)`                     | Sign (-1, 0, 1)                   | `EVAL sign = SIGNUM(value)`              |
| `GREATEST(a, b, ...)`           | Maximum of values                 | `EVAL max = GREATEST(a, b, c)`           |
| `LEAST(a, b, ...)`              | Minimum of values                 | `EVAL min = LEAST(a, b, c)`              |
| `ATAN2(y, x)`                   | Two-argument arctangent           | `EVAL angle = ATAN2(y, x)`               |
| `CBRT(n)`                       | Cube root                         | `EVAL root = CBRT(volume)`               |
| `COSH(n)`                       | Hyperbolic cosine                 | `EVAL ch = COSH(x)`                      |
| `SINH(n)`                       | Hyperbolic sine                   | `EVAL sh = SINH(x)`                      |
| `TANH(n)`                       | Hyperbolic tangent                | `EVAL th = TANH(x)`                      |
| `HYPOT(a, b)`                   | Hypotenuse                        | `EVAL h = HYPOT(x, y)`                   |
| `TAU()`                         | Tau (2\*Pi)                       | `EVAL t = TAU()`                         |
| `COPY_SIGN(mag, sign)`          | Copy sign (8.19/9.1+)             | `EVAL v = COPY_SIGN(mag, sign)`          |
| `SCALB(d, scaleFactor)`         | Scale by power of 2 (8.19/9.1+)   | `EVAL v = SCALB(d, 3)`                   |
| `ROUND_TO(n, v1, v2, ...)`      | Round to fixed points (8.19/9.1+) | `EVAL r = ROUND_TO(val, 0, 10, 50, 100)` |

---

## Date/Time Functions

| Function                     | Description              | Example                                      |
| ---------------------------- | ------------------------ | -------------------------------------------- |
| `NOW()`                      | Current timestamp        | `WHERE @timestamp > NOW() - 1 hour`          |
| `DATE_TRUNC(interval, date)` | Truncate to interval     | `EVAL hour = DATE_TRUNC(1 hour, @timestamp)` |
| `DATE_EXTRACT(part, date)`   | Extract part             | `EVAL month = DATE_EXTRACT(month, date)`     |
| `DATE_FORMAT(pattern, date)` | Format date              | `EVAL str = DATE_FORMAT("yyyy-MM-dd", date)` |
| `DATE_PARSE(pattern, str)`   | Parse date string        | `EVAL dt = DATE_PARSE("yyyy-MM-dd", str)`    |
| `DATE_DIFF(unit, d1, d2)`    | Difference               | `EVAL days = DATE_DIFF("day", start, end)`   |
| `DAY_NAME(date)`             | Weekday name (9.2+)      | `EVAL day = DAY_NAME(@timestamp)`            |
| `MONTH_NAME(date)`           | Month name (9.2+)        | `EVAL month = MONTH_NAME(@timestamp)`        |
| `TRANGE(duration)`           | Time range filter (9.3+) | `WHERE TRANGE(1 hour)`                       |

**Time units:** `millisecond`, `second`, `minute`, `hour`, `day`, `week`, `month`, `year`

**Timespan literals:** `1 day`, `2 hours`, `30 minutes`, `1 week`

---

## Type Conversion Functions

| Function                        | Description                                        | Example                                      |
| ------------------------------- | -------------------------------------------------- | -------------------------------------------- |
| `TO_STRING(v)`                  | Convert to string                                  | `EVAL str = TO_STRING(num)`                  |
| `TO_INTEGER(v)`                 | Convert to integer                                 | `EVAL int = TO_INTEGER(str)`                 |
| `TO_LONG(v)`                    | Convert to long                                    | `EVAL lng = TO_LONG(str)`                    |
| `TO_DOUBLE(v)`                  | Convert to double                                  | `EVAL dbl = TO_DOUBLE(str)`                  |
| `TO_BOOLEAN(v)`                 | Convert to boolean                                 | `EVAL bool = TO_BOOLEAN(str)`                |
| `TO_DATETIME(v)`                | Convert to datetime                                | `EVAL dt = TO_DATETIME(str)`                 |
| `TO_IP(v)`                      | Convert to IP                                      | `EVAL ip = TO_IP(str)`                       |
| `TO_VERSION(v)`                 | Convert to version                                 | `EVAL ver = TO_VERSION(str)`                 |
| `TO_UNSIGNED_LONG(v)`           | Convert to unsigned long                           | `EVAL ul = TO_UNSIGNED_LONG(str)`            |
| `TO_DATEPERIOD(v)`              | Convert to date period (8.16+)                     | `EVAL dp = TO_DATEPERIOD("1 day")`           |
| `TO_TIMEDURATION(v)`            | Convert to time duration (8.16+)                   | `EVAL td = TO_TIMEDURATION("1h")`            |
| `TO_DATE_NANOS(v)`              | Convert to nanosecond date (8.18/9.0+)             | `EVAL ns = TO_DATE_NANOS(str)`               |
| `TO_DEGREES(n)`                 | Radians to degrees                                 | `EVAL deg = TO_DEGREES(rad)`                 |
| `TO_RADIANS(n)`                 | Degrees to radians                                 | `EVAL rad = TO_RADIANS(deg)`                 |
| `TO_GEOPOINT(v)`                | Convert to geo_point                               | `EVAL pt = TO_GEOPOINT(str)`                 |
| `TO_GEOSHAPE(v)`                | Convert to geo_shape                               | `EVAL shape = TO_GEOSHAPE(wkt)`              |
| `TO_CARTESIANPOINT(v)`          | Convert to cartesian_point                         | `EVAL pt = TO_CARTESIANPOINT(str)`           |
| `TO_CARTESIANSHAPE(v)`          | Convert to cartesian_shape                         | `EVAL shape = TO_CARTESIANSHAPE(str)`        |
| `TO_AGGREGATE_METRIC_DOUBLE(v)` | Convert to aggregate_metric_double (9.2+, preview) | `EVAL amd = TO_AGGREGATE_METRIC_DOUBLE(val)` |
| `TO_DENSE_VECTOR(v)`            | Convert to dense_vector (9.2+, preview)            | `EVAL vec = TO_DENSE_VECTOR(arr)`            |
| `TO_GEOHASH(v)`                 | Convert to geohash (9.2+, preview)                 | `EVAL hash = TO_GEOHASH(str)`                |
| `TO_GEOHEX(v)`                  | Convert to geohex (9.2+, preview)                  | `EVAL hex = TO_GEOHEX(str)`                  |
| `TO_GEOTILE(v)`                 | Convert to geotile (9.2+, preview)                 | `EVAL tile = TO_GEOTILE(str)`                |

---

## IP Functions

| Function                      | Description                        | Example                                     |
| ----------------------------- | ---------------------------------- | ------------------------------------------- |
| `CIDR_MATCH(ip, block1, ...)` | Test if IP is in one or more CIDRs | `WHERE CIDR_MATCH(source.ip, "10.0.0.0/8")` |
| `IP_PREFIX(ip, v4len, v6len)` | Get the network prefix of an IP    | `EVAL prefix = IP_PREFIX(ip, 24, 64)`       |
| `TO_IP(v)`                    | Convert to IP type                 | `EVAL ip = TO_IP(ip_string)`                |

**Examples:**

```esql
// Filter to private network ranges
FROM logs-*
| WHERE CIDR_MATCH(source.ip, "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16")

// Group traffic by /24 subnet
FROM network_logs
| STATS bytes = SUM(bytes_transferred) BY subnet = IP_PREFIX(source.ip, 24, 64)
| SORT bytes DESC
```

---

## Spatial Functions

| Function                  | Description                   | Example                                                   |
| ------------------------- | ----------------------------- | --------------------------------------------------------- |
| `ST_DISTANCE(p1, p2)`     | Distance between points       | `EVAL dist = ST_DISTANCE(loc, TO_GEOPOINT("POINT(0 0)"))` |
| `ST_INTERSECTS(g1, g2)`   | Geometries intersect          | `WHERE ST_INTERSECTS(geo, boundary)`                      |
| `ST_DISJOINT(g1, g2)`     | Geometries don't intersect    | `WHERE ST_DISJOINT(geo, zone)`                            |
| `ST_CONTAINS(g1, g2)`     | g1 contains g2                | `WHERE ST_CONTAINS(region, point)`                        |
| `ST_WITHIN(g1, g2)`       | g1 within g2                  | `WHERE ST_WITHIN(point, region)`                          |
| `ST_X(point)`             | X coordinate / longitude      | `EVAL lon = ST_X(location)`                               |
| `ST_Y(point)`             | Y coordinate / latitude       | `EVAL lat = ST_Y(location)`                               |
| `ST_ENVELOPE(geo)`        | Bounding box (8.18/9.0+)      | `EVAL bbox = ST_ENVELOPE(shape)`                          |
| `ST_XMAX(geo)`            | Max X / longitude (8.18/9.0+) | `EVAL max_lon = ST_XMAX(shape)`                           |
| `ST_XMIN(geo)`            | Min X / longitude (8.18/9.0+) | `EVAL min_lon = ST_XMIN(shape)`                           |
| `ST_YMAX(geo)`            | Max Y / latitude (8.18/9.0+)  | `EVAL max_lat = ST_YMAX(shape)`                           |
| `ST_YMIN(geo)`            | Min Y / latitude (8.18/9.0+)  | `EVAL min_lat = ST_YMIN(shape)`                           |
| `ST_GEOHASH(point, prec)` | Encode as geohash (9.2+)      | `EVAL hash = ST_GEOHASH(location, 5)`                     |
| `ST_GEOHEX(point, prec)`  | Encode as geohex (9.2+)       | `EVAL hex = ST_GEOHEX(location, 5)`                       |
| `ST_GEOTILE(point, prec)` | Encode as geotile (9.2+)      | `EVAL tile = ST_GEOTILE(location, 10)`                    |
| `ST_NPOINTS(geo)`         | Number of points              | `EVAL n = ST_NPOINTS(shape)`                              |
| `ST_SIMPLIFY(geo, tol)`   | Simplify geometry             | `EVAL simple = ST_SIMPLIFY(shape, 100)`                   |

---

## Dense Vector Functions

For vector search and similarity operations on `dense_vector` and `semantic_text` fields.

| Function                         | Description                      | Example                                       |
| -------------------------------- | -------------------------------- | --------------------------------------------- |
| `KNN(field, k, query_vec)`       | K-nearest neighbor search (9.2+) | `WHERE KNN(embedding, 10, query_vector)`      |
| `TEXT_EMBEDDING(endpoint, text)` | Generate embeddings (9.3+)       | `EVAL vec = TEXT_EMBEDDING("my-model", text)` |
| `V_COSINE(v1, v2)`               | Cosine similarity (9.3+)         | `EVAL sim = V_COSINE(vec1, vec2)`             |
| `V_DOT_PRODUCT(v1, v2)`          | Dot product (9.3+)               | `EVAL dot = V_DOT_PRODUCT(vec1, vec2)`        |
| `V_L1_NORM(v1, v2)`              | L1 / Manhattan distance (9.3+)   | `EVAL l1 = V_L1_NORM(vec1, vec2)`             |
| `V_L2_NORM(v1, v2)`              | L2 / Euclidean distance (9.3+)   | `EVAL l2 = V_L2_NORM(vec1, vec2)`             |
| `V_HAMMING(v1, v2)`              | Hamming distance (9.3+)          | `EVAL h = V_HAMMING(vec1, vec2)`              |

---

## Multivalue Functions

For handling fields with multiple values.

| Function                              | Description                                                  | Example                                         |
| ------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------- |
| `MV_COUNT(field)`                     | Count values                                                 | `EVAL n = MV_COUNT(tags)`                       |
| `MV_FIRST(field)`                     | First value                                                  | `EVAL first_val = MV_FIRST(values)`             |
| `MV_LAST(field)`                      | Last value                                                   | `EVAL last_val = MV_LAST(values)`               |
| `MV_MIN(field)`                       | Minimum                                                      | `EVAL min = MV_MIN(scores)`                     |
| `MV_MAX(field)`                       | Maximum                                                      | `EVAL max = MV_MAX(scores)`                     |
| `MV_SUM(field)`                       | Sum                                                          | `EVAL total = MV_SUM(amounts)`                  |
| `MV_AVG(field)`                       | Average                                                      | `EVAL avg = MV_AVG(scores)`                     |
| `MV_MEDIAN(field)`                    | Median                                                       | `EVAL med = MV_MEDIAN(values)`                  |
| `MV_CONCAT(field, delim)`             | Join to string                                               | `EVAL str = MV_CONCAT(tags, ", ")`              |
| `MV_DEDUPE(field)`                    | Remove duplicates                                            | `EVAL unique = MV_DEDUPE(tags)`                 |
| `MV_SORT(field)`                      | Sort values                                                  | `EVAL sorted = MV_SORT(values)`                 |
| `MV_SLICE(field, start, end)`         | Slice array                                                  | `EVAL slice = MV_SLICE(arr, 0, 3)`              |
| `MV_ZIP(f1, f2)`                      | Zip arrays (both must be keyword/text)                       | `EVAL zipped = MV_ZIP(keys, values)`            |
| `MV_APPEND(f1, f2)`                   | Concatenate MVs                                              | `EVAL all = MV_APPEND(tags1, tags2)`            |
| `MV_CONTAINS(f1, f2)`                 | All values in f2 present in f1 (9.2+)                        | `EVAL has = MV_CONTAINS(perms, required)`       |
| `MV_INTERSECTION(f1, f2)`             | Values present in both (9.3+)                                | `EVAL common = MV_INTERSECTION(a, b)`           |
| `MV_INTERSECTS(f1, f2)`               | Any value in f2 present in f1 (Serverless; self-managed 9.4) | `EVAL overlap = MV_INTERSECTS(a, b)`            |
| `MV_UNION(f1, f2)`                    | Deduplicated union (Serverless; self-managed 9.4)            | `EVAL merged = MV_UNION(a, b)`                  |
| `MV_PERCENTILE(field, p)`             | Percentile of MV                                             | `EVAL p95 = MV_PERCENTILE(vals, 95)`            |
| `MV_PSERIES_WEIGHTED_SUM(field, p)`   | P-series weighted sum (both args must be double)             | `EVAL ws = MV_PSERIES_WEIGHTED_SUM(vals, 2.0)`  |
| `MV_MEDIAN_ABSOLUTE_DEVIATION(field)` | MAD of MV                                                    | `EVAL mad = MV_MEDIAN_ABSOLUTE_DEVIATION(vals)` |

---

## Conditional Functions

| Function                          | Description              | Example                                                    |
| --------------------------------- | ------------------------ | ---------------------------------------------------------- |
| `CASE(cond1, val1, ..., default)` | Conditional              | `EVAL level = CASE(score > 90, "A", score > 80, "B", "C")` |
| `COALESCE(v1, v2, ...)`           | First non-null           | `EVAL name = COALESCE(nickname, full_name, "Unknown")`     |
| `field IS NULL`                   | Check null               | `WHERE error IS NULL`                                      |
| `field IS NOT NULL`               | Check not null           | `WHERE response IS NOT NULL`                               |
| `CLAMP(val, min, max)`            | Clamp to range (9.3+)    | `EVAL clamped = CLAMP(score, 0, 100)`                      |
| `CLAMP_MIN(val, min)`             | Clamp lower bound (9.3+) | `EVAL v = CLAMP_MIN(score, 0)`                             |
| `CLAMP_MAX(val, max)`             | Clamp upper bound (9.3+) | `EVAL v = CLAMP_MAX(score, 100)`                           |

---

## Full-Text Search Functions

For text search with analyzer support (available since 8.17+).

### MATCH

Basic text search.

```esql
FROM articles
| WHERE MATCH(content, "elasticsearch query")

// With options
FROM docs
| WHERE MATCH(title, "search", {"operator": "AND"})
```

### MATCH (colon operator)

Shorthand for MATCH.

```esql
FROM logs
| WHERE message : "error"
```

### MATCH_PHRASE

Exact phrase matching. Returns documents where the field contains the exact phrase in order. GA in 8.19/9.1.

```esql
FROM articles
| WHERE MATCH_PHRASE(title, "quick brown fox")

// With slop to allow words between phrase terms
FROM articles
| WHERE MATCH_PHRASE(content, "elasticsearch query", slop=2)
```

### QSTR (Query String)

Complex queries using query string syntax.

```esql
FROM logs
| WHERE QSTR("status:error AND (type:critical OR type:warning)")
```

### KQL

Kibana Query Language support.

```esql
FROM logs
| WHERE KQL("message: error and host.name: server*")
```

### DECAY

Distance-based scoring that decays from an origin point. Works with numeric, date, and geo fields (9.2+).

```esql
FROM events METADATA _score
| EVAL decay_score = DECAY("gauss", @timestamp, origin=NOW(), scale="7 days")
```

### SCORE

Returns the relevance score for a row (9.3+).

```esql
FROM articles
| WHERE MATCH(content, "elasticsearch")
| EVAL relevance = SCORE()
| SORT relevance DESC
```

### TOP_SNIPPETS

Extracts best matching snippets from text fields (9.3+).

```esql
FROM articles
| WHERE MATCH(content, "elasticsearch query")
| EVAL snippet = TOP_SNIPPETS(content, "elasticsearch query")
```

### Relevance Scoring

```esql
FROM articles METADATA _score
| WHERE MATCH(content, "elasticsearch")
| SORT _score DESC
| LIMIT 10
```

---

## Operators

### Comparison Operators

- `==` Equal
- `!=` Not equal
- `<`, `<=`, `>`, `>=` Comparison
- `IS NULL`, `IS NOT NULL` Null checks

### Logical Operators

- `AND` Logical AND
- `OR` Logical OR
- `NOT` Logical NOT

### Pattern Matching

- `LIKE` Wildcard pattern (`*` zero or more chars, `?` single char)
- `RLIKE` Regular expression
- `IN` Value in list

**Examples:**

```esql
WHERE name LIKE "John*"
WHERE email RLIKE ".*@example\\.com"
WHERE status IN ("active", "pending")
WHERE NOT (status == "deleted")
```

### Arithmetic Operators

- `+`, `-`, `*`, `/`, `%` (modulo)

---

## Syntax Details

### Comments

```esql
// Single line comment

/* Multi-line
   comment */

FROM logs  // inline comment
| WHERE status == 200
```

### String Literals

```esql
// Standard strings — use backslash escapes
ROW msg = "line1\nline2", path = "C:\\Users\\data"

// Triple-quoted strings — no escaping needed, can contain single quotes
ROW pattern = """field "with quotes" and \backslashes"""
```

### Numeric Literals

```esql
// Integer, decimal, scientific notation
ROW a = 123, b = 0.23, c = 2E3, d = 1.2e-3
```

### Identifiers and Escaping

Field names that don't start with a letter, `_`, or `@` must be enclosed in backticks. A literal backtick inside a
backtick-quoted identifier is escaped by doubling it.

```esql
// Backtick-quoted identifiers for special field names
FROM index | EVAL val = `1.field`

// Escaping backticks within identifiers
FROM index | EVAL val = `field``name`
```

### Timespan Literals

Supported units: `millisecond` (`ms`), `second` (`s`), `minute` (`min`), `hour` (`h`), `day` (`d`), `week` (`w`),
`month` (`mo`), `quarter` (`q`), `year` (`yr`). Plural `s` is always accepted. Whitespace between number and unit is
optional.

```esql
// Timespans are used in expressions, not as standalone values
FROM logs-*
| WHERE @timestamp > NOW() - 1 day
| STATS hourly = COUNT(*) BY bucket = DATE_TRUNC(30 minutes, @timestamp)
```

---

## Metadata Fields

Access document metadata with the `METADATA` directive on the `FROM` command. Once enabled, metadata fields behave like
regular index fields.

| Field         | Type    | Description                                                     |
| ------------- | ------- | --------------------------------------------------------------- |
| `_id`         | keyword | Unique document ID                                              |
| `_index`      | keyword | Index name                                                      |
| `_version`    | long    | Document version number                                         |
| `_score`      | float   | Query relevance score (updated by full-text search functions)   |
| `_ignored`    | keyword | Fields that were ignored when the document was indexed          |
| `_index_mode` | keyword | Index mode (`standard`, `lookup`, `logsdb`, `time_series` etc.) |
| `_source`     | special | Original JSON document body (not supported by functions)        |

```esql
FROM logs METADATA _id, _index, _version
| KEEP _id, message

// Use _score for relevance-ranked search
FROM articles METADATA _score
| WHERE MATCH(content, "elasticsearch")
| SORT _score DESC
| LIMIT 10
```

---

## Best Practices

1. **Always use LIMIT** to avoid returning too many rows
2. **Filter early** with WHERE to reduce data processed
3. **Use KEEP** to select only needed columns
4. **Use appropriate data types** for comparisons
5. **Use STATS for aggregations** instead of returning all rows
6. **Use DATE_TRUNC for time-based grouping**
7. **Leverage full-text functions** (MATCH, QSTR) for text search - much faster than LIKE/RLIKE

---

## Example Queries

### Log Analysis

```esql
FROM logs-*
| WHERE @timestamp > NOW() - 24 hours
| WHERE status_code >= 400
| STATS error_count = COUNT(*) BY status_code, host.name
| SORT error_count DESC
| LIMIT 20
```

### User Activity

```esql
FROM user_events
| WHERE event_type == "login"
| EVAL hour = DATE_TRUNC(1 hour, @timestamp)
| STATS logins = COUNT(*), unique_users = COUNT_DISTINCT(user_id) BY hour
| SORT hour DESC
```

### Performance Metrics

```esql
FROM metrics-*
| WHERE @timestamp > NOW() - 1 hour
| STATS
    avg_response = AVG(response_time),
    p95_response = PERCENTILE(response_time, 95),
    max_response = MAX(response_time)
  BY service.name
| SORT avg_response DESC
```

**Time series version (9.2+):** For TSDS indices, use `TS` to access time series aggregation functions:

```esql
TS metrics-*
| WHERE @timestamp > NOW() - 1 hour
| STATS
    SUM(RATE(request_count)) BY service.name, TBUCKET(5 minutes)
| SORT service.name
```

### Text Search with Scoring

```esql
FROM articles METADATA _score
| WHERE MATCH(content, "machine learning")
| KEEP title, author, _score
| SORT _score DESC
| LIMIT 10
```

### Data Transformation

```esql
FROM raw_logs
| GROK message "%{IP:client_ip} - %{WORD:method} %{URIPATHPARAM:path} %{NUMBER:status:int}"
| EVAL is_error = status >= 400
| STATS
    total = COUNT(*),
    errors = COUNT(CASE(is_error, 1, null))
  BY client_ip
| EVAL error_rate = ROUND(errors * 100.0 / total, 2)
| SORT error_rate DESC
```
