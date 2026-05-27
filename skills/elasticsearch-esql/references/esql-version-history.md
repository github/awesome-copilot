# ES|QL Version History and Feature Availability

This document tracks ES|QL language features, commands, and functions across Elasticsearch versions. Use this to
determine compatibility when writing queries for specific Elasticsearch deployments.

> **Paired releases:** Certain minor versions shipped simultaneously with nearly identical feature sets. When a feature
> appears in one, assume it is in both unless explicitly noted otherwise. Paired versions: **8.18 / 9.0**, **8.19 /
> 9.1**.
>
> **Serverless:** Elastic Cloud Serverless reports a forward-moving `version.number` from `GET /` (aligned with the next
> minor from main), so clients that only semver-compare often behave as if the cluster is “latest.” **Do not** rely on
> that for feature gating: check `build_flavor` — if it is `"serverless"`, all GA and preview features are available and
> you should skip version-based gates. For snapshot builds (e.g., `9.4.0-SNAPSHOT`), strip the `-SNAPSHOT` suffix and
> use the major.minor for version checks.

## Table of Contents

- [Version Timeline Overview](#version-timeline-overview)
- [Feature Availability by Version](#feature-availability-by-version)
- [Major Limitations](#major-limitations)
- [Cross-Cluster Query Support](#cross-cluster-query-support)
- [Output Formats](#output-formats)
- [API Endpoints](#api-endpoints)
- [Performance Tips by Version](#performance-tips-by-version)
- [Version Detection](#version-detection)
- [References](#references)

## Version Timeline Overview

| Version | Release  | Status       | Key Additions                                                                                    |
| ------- | -------- | ------------ | ------------------------------------------------------------------------------------------------ |
| 8.11    | Nov 2023 | Tech Preview | Initial ES\|QL release                                                                           |
| 8.12    | Jan 2024 | Tech Preview | Spatial types, PROFILE                                                                           |
| 8.13    | Mar 2024 | Tech Preview | Async queries, cross-cluster ENRICH                                                              |
| 8.14    | May 2024 | **GA**       | Spatial functions, regex optimization                                                            |
| 8.15    | Aug 2024 | GA           | Type casting (`::`), Arrow output                                                                |
| 8.16    | Oct 2024 | GA           | Per-aggregation WHERE, new math/string functions                                                 |
| 8.17    | Dec 2024 | GA           | MATCH, QSTR full-text functions                                                                  |
| 8.18    | Feb 2025 | GA           | LOOKUP JOIN (preview), scoring, KQL                                                              |
| 8.19    | Apr 2025 | GA           | MATCH_PHRASE, FORK, CHANGE_POINT (preview)                                                       |
| 9.0     | Feb 2025 | GA           | Released with 8.18 features                                                                      |
| 9.1     | Jun 2025 | GA           | Full-text functions GA, FORK (preview)                                                           |
| 9.2     | Oct 2025 | GA           | Multi-field joins, TS, INLINE STATS (preview), CHANGE_POINT GA, FUSE (preview), RERANK (preview) |
| 9.3     | Jan 2026 | GA           | INLINE STATS GA, SET directive (preview), Lucene-pushable JOIN predicates                        |

## Feature Availability by Version

### Commands

| Command        | Introduced | GA       | Notes                                       |
| -------------- | ---------- | -------- | ------------------------------------------- |
| `FROM`         | 8.11       | 8.14     | Source command                              |
| `WHERE`        | 8.11       | 8.14     | Filtering                                   |
| `EVAL`         | 8.11       | 8.14     | Computed columns                            |
| `STATS ... BY` | 8.11       | 8.14     | Aggregations with grouping                  |
| `SORT`         | 8.11       | 8.14     | Ordering results                            |
| `LIMIT`        | 8.11       | 8.14     | Result set size                             |
| `KEEP`         | 8.11       | 8.14     | Column selection                            |
| `DROP`         | 8.11       | 8.14     | Column removal                              |
| `RENAME`       | 8.11       | 8.14     | Column renaming                             |
| `DISSECT`      | 8.11       | 8.14     | Pattern extraction                          |
| `GROK`         | 8.11       | 8.14     | Log parsing                                 |
| `ENRICH`       | 8.11       | 8.14     | Data enrichment                             |
| `MV_EXPAND`    | 8.11       | 8.14     | Multi-value expansion                       |
| `SHOW`         | 8.11       | 8.14     | Metadata display                            |
| `ROW`          | 8.11       | 8.14     | Literal row creation                        |
| `LOOKUP JOIN`  | 8.18/9.0   | 8.19/9.1 | SQL-style LEFT JOIN with lookup indices     |
| `INLINE STATS` | 9.2        | 9.3      | Inline aggregations (like window functions) |
| `FORK`         | 8.19/9.1   | Preview  | Multiple execution branches                 |
| `FUSE`         | 9.2        | Preview  | Combine results from FORK branches          |
| `TS`           | 9.2        | 9.2      | Time series mode                            |
| `RERANK`       | 9.2        | Preview  | Re-score results with inference             |
| `COMPLETION`   | 9.2        | 9.2      | LLM text generation                         |
| `SAMPLE`       | 8.19/9.1   | Preview  | Random sampling                             |

### Full-Text Search Functions

| Function                      | Introduced | GA       | Notes                        |
| ----------------------------- | ---------- | -------- | ---------------------------- |
| `MATCH(field, query)`         | 8.17       | 8.19/9.1 | Basic full-text matching     |
| `QSTR(query_string)`          | 8.17       | 8.19/9.1 | Query string syntax (Lucene) |
| `KQL(kql_string)`             | 8.18/9.0   | 8.19/9.1 | Kibana Query Language        |
| `MATCH_PHRASE(field, phrase)` | 8.19/9.1   | 8.19/9.1 | Exact phrase matching        |
| Match operator (`:`)          | 8.17       | 8.19/9.1 | Shorthand for MATCH          |

**Scoring support:**

- `METADATA _score` available from 8.18/9.0
- Must use `SORT _score DESC` to rank by relevance

### Spatial Functions

| Function               | Introduced | Notes                        |
| ---------------------- | ---------- | ---------------------------- |
| `GEO_POINT` type       | 8.12       | Basic spatial type support   |
| `CARTESIAN_POINT` type | 8.12       | Cartesian coordinate support |
| `ST_INTERSECTS`        | 8.14       | Geometry intersection test   |
| `ST_CONTAINS`          | 8.14       | Containment test             |
| `ST_DISJOINT`          | 8.14       | Disjoint test                |
| `ST_WITHIN`            | 8.14       | Within test                  |
| `ST_X`, `ST_Y`         | 8.14       | Coordinate extraction        |
| `ST_DISTANCE`          | 8.15       | Distance calculation         |
| `ST_EXTENT_AGG`        | 8.18/9.0   | Bounding box aggregation     |
| `ST_ENVELOPE`          | 8.18/9.0   | Bounding box for geometry    |

### Date/Time Functions

| Function          | Introduced     | Notes                                |
| ----------------- | -------------- | ------------------------------------ |
| `NOW()`           | 8.11           | Current timestamp                    |
| `DATE_TRUNC`      | 8.11           | Truncate to interval                 |
| `DATE_EXTRACT`    | 8.11           | Extract date parts                   |
| `DATE_FORMAT`     | 8.11           | Format dates (no TZ until 9.3)       |
| `DATE_PARSE`      | 8.11           | Parse date strings (no TZ until 9.3) |
| `DATE_DIFF`       | 8.13           | Difference between dates             |
| `date_nanos` type | 8.17 (preview) | Nanosecond precision timestamps      |
| `TRANGE`          | 9.3 (preview)  | Time range filter on `@timestamp`    |

### String Functions

| Function                    | Introduced | Notes                       |
| --------------------------- | ---------- | --------------------------- |
| `LEFT`, `RIGHT`             | 8.11       | Substring extraction        |
| `SUBSTRING`                 | 8.11       | Position-based extraction   |
| `CONCAT`                    | 8.11       | String concatenation        |
| `TRIM`, `LTRIM`, `RTRIM`    | 8.11       | Whitespace removal          |
| `TO_UPPER`, `TO_LOWER`      | 8.13       | Case conversion             |
| `LOCATE`                    | 8.14       | Find substring position     |
| `SPACE`                     | 8.16       | Generate spaces             |
| `REVERSE`                   | 8.16       | Reverse string              |
| `BIT_LENGTH`, `BYTE_LENGTH` | 8.17       | String length in bits/bytes |
| `STARTS_WITH`, `ENDS_WITH`  | 8.11       | Prefix/suffix matching      |
| `CONTAINS`                  | 9.2        | Substring containment check |

### Multi-Value Functions

| Function                  | Introduced | Notes                  |
| ------------------------- | ---------- | ---------------------- |
| `MV_COUNT`                | 8.11       | Count values           |
| `MV_CONCAT`               | 8.11       | Join values            |
| `MV_FIRST`, `MV_LAST`     | 8.13       | First/last value       |
| `MV_MIN`, `MV_MAX`        | 8.11       | Min/max value          |
| `MV_SUM`, `MV_AVG`        | 8.11       | Sum/average            |
| `MV_MEDIAN`               | 8.11       | Median value           |
| `MV_SORT`                 | 8.14       | Sort multi-values      |
| `MV_SLICE`                | 8.14       | Slice multi-values     |
| `MV_PERCENTILE`           | 8.16       | Percentile calculation |
| `MV_PSERIES_WEIGHTED_SUM` | 8.16       | Weighted sum           |

### Aggregation Functions

| Function                              | Introduced | Notes                           |
| ------------------------------------- | ---------- | ------------------------------- |
| `COUNT`, `COUNT_DISTINCT`             | 8.11       | Counting                        |
| `SUM`, `AVG`                          | 8.11       | Basic aggregations              |
| `MIN`, `MAX`                          | 8.11       | Extended to strings/IPs in 8.16 |
| `MEDIAN`, `MEDIAN_ABSOLUTE_DEVIATION` | 8.11       | Statistical                     |
| `PERCENTILE`                          | 8.11       | Percentile calculation          |
| `TOP`                                 | 8.15       | Top N values                    |
| `VALUES`                              | 8.14       | Collect unique values           |
| `ST_EXTENT_AGG`                       | 8.18/9.0   | Spatial bounding box            |
| `WEIGHTED_AVG`                        | 8.16       | Weighted average                |
| `STD_DEV`                             | 8.18/9.0   | Standard deviation              |
| `VARIANCE`                            | 8.18/9.0   | Variance                        |

### Grouping Functions

| Function     | Introduced    | Notes                                             |
| ------------ | ------------- | ------------------------------------------------- |
| `BUCKET`     | 8.11          | Numeric/date bucketing in `BY` clause             |
| `CATEGORIZE` | 8.18/9.0      | Auto-categorization of text in `BY` clause        |
| `TBUCKET`    | 9.2 (preview) | Time bucketing from `@timestamp`; preferred in TS |

### Per-Aggregation WHERE

Available since 8.16. Allows filtering individual aggregations without affecting others:

```esql
| STATS total = COUNT(*), errors = COUNT(*) WHERE level == "error" BY service.name
```

### IP Functions

| Function     | Introduced | Notes                          |
| ------------ | ---------- | ------------------------------ |
| `CIDR_MATCH` | 8.11       | Check IP against CIDR ranges   |
| `IP_PREFIX`  | 8.14       | Extract network prefix from IP |
| `TO_IP`      | 8.11       | Convert string to IP type      |

### Time Series Aggregation Functions

Available under `TS ... | STATS`. See [time-series-queries.md](time-series-queries.md) for full reference.

| Function                   | Introduced    | Notes                                           |
| -------------------------- | ------------- | ----------------------------------------------- |
| `RATE`                     | 9.2 (preview) | Per-second rate of counter increase             |
| `IRATE`                    | 9.2 (preview) | Instant rate (last two data points)             |
| `INCREASE`                 | 9.2 (preview) | Absolute counter increase in window             |
| `DELTA`                    | 9.2 (preview) | Absolute change of a gauge                      |
| `IDELTA`                   | 9.2 (preview) | Change between last two data points             |
| `AVG_OVER_TIME`            | 9.2 (preview) | Average value over time                         |
| `SUM_OVER_TIME`            | 9.2 (preview) | Sum of values over time                         |
| `MIN_OVER_TIME`            | 9.2 (preview) | Minimum value over time                         |
| `MAX_OVER_TIME`            | 9.2 (preview) | Maximum value over time                         |
| `FIRST_OVER_TIME`          | 9.2 (preview) | Earliest value by `@timestamp`                  |
| `LAST_OVER_TIME`           | 9.2 (preview) | Latest value by `@timestamp` (implicit default) |
| `COUNT_OVER_TIME`          | 9.2 (preview) | Count of values over time                       |
| `COUNT_DISTINCT_OVER_TIME` | 9.2 (preview) | Count of distinct values over time              |
| `PRESENT_OVER_TIME`        | 9.2 (preview) | `true` if field has values in window            |
| `ABSENT_OVER_TIME`         | 9.2 (preview) | `true` if field has no values in window         |
| `DERIV`                    | 9.3 (preview) | Derivative via linear regression                |
| `PERCENTILE_OVER_TIME`     | 9.3 (preview) | Percentile of values over time                  |
| `STDDEV_OVER_TIME`         | 9.3 (preview) | Population standard deviation over time         |
| `VARIANCE_OVER_TIME`       | 9.3 (preview) | Population variance over time                   |

Sliding window parameter (second argument) available since 9.3 preview.

### Conditional Functions

| Function    | Introduced    | Notes                              |
| ----------- | ------------- | ---------------------------------- |
| `CLAMP`     | 9.3 (preview) | Clamp values to `[min, max]` range |
| `CLAMP_MIN` | 9.3 (preview) | Set lower bound for values         |
| `CLAMP_MAX` | 9.3 (preview) | Set upper bound for values         |

### Type Casting

| Syntax          | Introduced | Notes                  |
| --------------- | ---------- | ---------------------- |
| `TO_STRING(x)`  | 8.11       | Function-based casting |
| `TO_INTEGER(x)` | 8.11       | Function-based casting |
| `TO_DOUBLE(x)`  | 8.11       | Function-based casting |
| `x::string`     | 8.15       | Operator-based casting |
| `x::integer`    | 8.15       | Operator-based casting |

## Major Limitations

### Pagination (Not Supported)

ES|QL **does not support cursor-based pagination** like the Search API's `search_after` or `scroll`.

**Current behavior:**

- Default: 1,000 rows returned
- Maximum: 10,000 rows (configurable via `esql.query.result_truncation_max_size`)
- No cursor or continuation token
- GitHub tracking issue: [#100000](https://github.com/elastic/elasticsearch/issues/100000)

**Workarounds:**

- Use `WHERE` to filter to relevant subset
- Use `STATS` to aggregate at query time
- For exports, use Search API with `search_after` instead

### Time Zone Support (Limited)

ES|QL has **limited timezone support**.

**Current limitations:**

- `DATE_FORMAT` and `DATE_PARSE` do not support timezone parameters
- All dates processed in UTC internally
- Kibana charts may show timezone inconsistencies
- GitHub tracking issue: [#107560](https://github.com/elastic/elasticsearch/issues/107560)

**Workarounds:**

- Store timezone offset in a separate field
- Convert to UTC before querying
- Use `EVAL` to add/subtract hours manually:

  ```esql
  | EVAL local_time = timestamp + 1 hour
  ```

### Nested Fields (Not Supported)

ES|QL **cannot query nested field types**. Unlike other unsupported types (which return `null`), nested fields are **not
returned at all** — they are silently omitted from results.

- Cannot use nested paths like `nested_field.sub_field`
- Must flatten data at index time for ES|QL access

### Unsupported Field Types

These field types are not supported or have limitations:

| Type           | Status                       |
| -------------- | ---------------------------- |
| `nested`       | Not supported - returns null |
| `flattened`    | Not supported                |
| `join`         | Not supported                |
| `date_range`   | Not supported                |
| `binary`       | Not supported                |
| `completion`   | Not supported                |
| `rank_feature` | Not supported                |
| `histogram`    | Not supported                |

### JOIN Limitations

`LOOKUP JOIN` (8.18/9.0+):

- Only LEFT OUTER JOIN behavior
- Lookup index must use `index.mode: lookup` setting
- Lookup index limited to single shard (max 2B docs)
- Cross-cluster joins require lookup index on all clusters
- Only supports equality joins before 9.2

`LOOKUP JOIN` improvements in 9.2 (tech preview):

- Multi-field joins supported
- Complex join predicates with `<`, `>`, `<=`, `>=`
- Expression-based join conditions

`LOOKUP JOIN` improvements in 9.3 (tech preview):

- Lucene-pushable predicates: `MATCH`, `QSTR`, `KQL`, `CIDR_MATCH` in join conditions
- Further performance gains for filtered joins

### No Subqueries

ES|QL does not support:

- Subqueries in WHERE clauses
- Nested SELECT statements
- CTEs (Common Table Expressions)

Use `INLINE STATS` (9.2+) for some subquery-like patterns.

## Cross-Cluster Query Support

| Feature                   | Version | Notes                                     |
| ------------------------- | ------- | ----------------------------------------- |
| Basic CCS                 | 8.13    | Query remote clusters                     |
| Cross-cluster ENRICH      | 8.13    | Enrich with remote data                   |
| Cross-cluster LOOKUP JOIN | 9.2     | Join with remote lookup indices           |
| `skip_unavailable`        | 8.17    | Graceful handling of unavailable clusters |

## Output Formats

| Format | Version | Notes                   |
| ------ | ------- | ----------------------- |
| JSON   | 8.11    | Default format          |
| CSV    | 8.11    | Tabular output          |
| TSV    | 8.11    | Tab-separated           |
| Arrow  | 8.15    | Apache Arrow IPC format |

## API Endpoints

| Endpoint                    | Version | Notes                   |
| --------------------------- | ------- | ----------------------- |
| `POST /_query`              | 8.11    | Synchronous query       |
| `POST /_query/async`        | 8.13    | Async query submission  |
| `GET /_query/async/{id}`    | 8.13    | Get async query results |
| `DELETE /_query/async/{id}` | 8.13    | Cancel async query      |

## Performance Tips by Version

### 8.14+

- Regex patterns are optimized
- Enrich supports text fields

### 8.15+

- Use `::` casting instead of `TO_*` functions (cleaner syntax)
- Arrow format for analytics tool integration

### 8.17+

- Use `MATCH`/`QSTR` instead of `LIKE`/`RLIKE` for text search (50-1000x faster)
- Full-text functions use Lucene optimizations

### 9.1+

- Use `INLINE STATS` to avoid multiple queries
- Full-text functions are GA and stable

### 9.2+

- Use `TS` with `RATE`, `AVG_OVER_TIME`, etc. for time series metrics aggregations
- Use `TBUCKET` for time bucketing in TS queries
- Multi-field `LOOKUP JOIN` for complex correlations
- `FUSE` for hybrid search scoring

### 9.3+

- Use `TRANGE` instead of manual `WHERE @timestamp` filters
- Sliding window parameter for time series functions (e.g. `RATE(field, 10m)`)
- `CLAMP`, `CLAMP_MIN`, `CLAMP_MAX` for bounding metric values

## Version Detection

To check ES|QL availability and version:

```bash
# Check Elasticsearch version and build flavor (use build_flavor to detect Serverless)
curl -s localhost:9200 | jq '.version | {number, build_flavor}'

# Test ES|QL availability
curl -X POST localhost:9200/_query \
  -H "Content-Type: application/json" \
  -d '{"query": "ROW x = 1"}'
```

## References

- [ES|QL Timeline of Improvements](https://www.elastic.co/search-labs/blog/esql-timeline-of-improvements)
- [ES|QL Limitations](https://www.elastic.co/docs/reference/query-languages/esql/limitations)
- [Elasticsearch Release Notes](https://www.elastic.co/docs/release-notes/elasticsearch)
- [ES|QL for Search](https://www.elastic.co/docs/solutions/search/esql-for-search)
- [LOOKUP JOIN Documentation](https://www.elastic.co/docs/reference/query-languages/esql/esql-lookup-join)
