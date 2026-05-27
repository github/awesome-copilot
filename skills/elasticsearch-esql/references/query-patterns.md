# ES|QL Query Patterns

Common patterns for generating ES|QL queries from natural language requests.

## Table of Contents

- [Pattern Recognition Guide](#pattern-recognition-guide)
- [Time-Based Queries](#time-based-queries)
- [Aggregation Patterns](#aggregation-patterns)
- [Filtering Patterns](#filtering-patterns)
- [Transformation Patterns](#transformation-patterns)
- [Log Parsing Patterns](#log-parsing-patterns)
- [Advanced Patterns](#advanced-patterns)
- [Newer Feature Patterns](#newer-feature-patterns)
- [ML and Analytics Patterns](#ml-and-analytics-patterns)
- [Common Mistakes to Avoid](#common-mistakes-to-avoid)

## Pattern Recognition Guide

When translating natural language to ES|QL, identify these key elements:

| User Says                              | ES\|QL Element                                 |
| -------------------------------------- | ---------------------------------------------- |
| "show," "list," "get," "find"          | `FROM` + `KEEP` (select fields)                |
| "from," "in" (index)                   | `FROM index-pattern`                           |
| "where," "with," "that have," "filter" | `WHERE condition`                              |
| "last X hours/days," "since"           | `WHERE @timestamp > NOW() - X time`            |
| "between date X and date Y"            | `WHERE @timestamp >= "X" AND @timestamp < "Y"` |
| "count," "how many"                    | `STATS count = COUNT(*)`                       |
| "average," "mean"                      | `STATS avg = AVG(field)`                       |
| "total," "sum"                         | `STATS total = SUM(field)`                     |
| "maximum," "highest," "top value"      | `STATS max = MAX(field)`                       |
| "minimum," "lowest"                    | `STATS min = MIN(field)`                       |
| "by," "per," "grouped by," "for each"  | `... BY field`                                 |
| "top N," "first N," "limit"            | `LIMIT N`                                      |
| "sorted by," "order by"                | `SORT field [DESC/ASC]`                        |
| "unique," "distinct"                   | `STATS COUNT_DISTINCT(field)`                  |
| "contains," "includes"                 | `WHERE field LIKE "*value*"` or `MATCH()`      |
| "starts with"                          | `WHERE STARTS_WITH(field, "prefix")`           |
| "ends with"                            | `WHERE ENDS_WITH(field, "suffix")`             |
| "change point," "spike," "dip"         | `CHANGE_POINT value ON key`                    |
| "categorize logs," "group messages"    | `STATS ... BY category = CATEGORIZE(message)`  |

---

## Time-Based Queries

### Recent Data

```text
"show errors from the last hour"
→
FROM logs-*
| WHERE @timestamp > NOW() - 1 hour
| WHERE level == "error"
| SORT @timestamp DESC
| LIMIT 100
```

### Time Range

```text
"events between January 1 and January 15, 2024"
→
FROM events-*
| WHERE @timestamp >= "2024-01-01" AND @timestamp < "2024-01-16"
```

### Time Bucketing

```text
"count events per hour for today"
→
FROM events-*
| WHERE @timestamp > NOW() - 24 hours
| STATS count = COUNT(*) BY bucket = DATE_TRUNC(1 hour, @timestamp)
| SORT bucket DESC
```

### Time Comparisons

```text
"requests slower than 5 seconds"
→
FROM api-logs
| WHERE response_time > 5000
| SORT response_time DESC
| LIMIT 100
```

---

## Aggregation Patterns

### Simple Count

```text
"how many errors are there"
→
FROM logs-*
| WHERE level == "error"
| STATS total_errors = COUNT(*)
```

### Count by Category

```text
"count of events by status code"
→
FROM web-logs
| STATS count = COUNT(*) BY status_code
| SORT count DESC
```

### Multiple Aggregations

```text
"show min, max, and average response time"
→
FROM api-logs
| STATS
    min_time = MIN(response_time),
    max_time = MAX(response_time),
    avg_time = AVG(response_time)
```

### Grouped Multiple Aggregations

```text
"average and max CPU per host"
→
FROM metrics-*
| STATS
    avg_cpu = AVG(system.cpu.percent),
    max_cpu = MAX(system.cpu.percent)
  BY host.name
| SORT avg_cpu DESC
```

### Top N Pattern

```text
"top 10 hosts by error count"
→
FROM logs-*
| WHERE level == "error"
| STATS error_count = COUNT(*) BY host.name
| SORT error_count DESC
| LIMIT 10
```

### Percentiles

```text
"p50, p95, p99 response times by endpoint"
→
FROM api-logs
| STATS
    p50 = PERCENTILE(response_time, 50),
    p95 = PERCENTILE(response_time, 95),
    p99 = PERCENTILE(response_time, 99)
  BY endpoint
| SORT p99 DESC
```

### Unique Counts

```text
"count of unique users per day"
→
FROM user-events
| STATS unique_users = COUNT_DISTINCT(user_id) BY day = DATE_TRUNC(1 day, @timestamp)
| SORT day DESC
```

---

## Filtering Patterns

### Exact Match

```text
"errors from production"
→
FROM logs-*
| WHERE level == "error" AND environment == "production"
```

### Multiple Values (IN)

```text
"events with status 400, 401, or 403"
→
FROM web-logs
| WHERE status_code IN (400, 401, 403)
```

### Pattern Matching

```text
"requests to /api endpoints"
→
FROM web-logs
| WHERE url LIKE "/api/*"
```

### Full-Text Search (8.17+)

```text
"documents containing 'connection timeout'"
→
FROM logs-* METADATA _score
| WHERE MATCH(message, "connection timeout")
| SORT _score DESC
| LIMIT 100
```

### Null Handling

```text
"records where error field exists"
→
FROM logs-*
| WHERE error IS NOT NULL
```

### Negation

**Warning:** ES|QL uses three-valued logic. `!=` excludes rows where the field is `NULL` (missing). Include an explicit
`IS NULL` check to avoid silent false negatives.

```text
"all events except from test environment"
→
FROM events-*
| WHERE environment != "test" OR environment IS NULL
```

---

## Transformation Patterns

### Computed Fields

```text
"show response time in seconds"
→
FROM api-logs
| EVAL response_time_sec = response_time_ms / 1000
| KEEP endpoint, response_time_sec
```

### String Manipulation

```text
"extract domain from email addresses"
→
FROM users
| EVAL domain = SUBSTRING(email, LOCATE("@", email) + 1, LENGTH(email))
| KEEP email, domain
```

### Conditional Values

```text
"categorize response times as fast/medium/slow"
→
FROM api-logs
| EVAL speed_category = CASE(
    response_time < 100, "fast",
    response_time < 500, "medium",
    "slow"
  )
| STATS count = COUNT(*) BY speed_category
```

### Rate Calculation

```text
"error rate percentage by service"
→
FROM logs-*
| STATS
    total = COUNT(*),
    errors = COUNT(CASE(level == "error", 1, null))
  BY service.name
| EVAL error_rate = ROUND(errors * 100.0 / total, 2)
| SORT error_rate DESC
```

**Simpler with per-aggregation WHERE (8.16+):**

```text
FROM logs-*
| STATS
    total = COUNT(*),
    errors = COUNT(*) WHERE level == "error"
  BY service.name
| EVAL error_rate = ROUND(errors * 100.0 / total, 2)
| SORT error_rate DESC
```

---

## Log Parsing Patterns

### GROK for Structured Extraction

```text
"parse Apache access logs"
→
FROM raw-logs
| GROK message "%{IP:client_ip} - - \\[%{HTTPDATE:timestamp}\\] \"%{WORD:method} %{URIPATHPARAM:path} HTTP/%{NUMBER:http_version}\" %{NUMBER:status:int} %{NUMBER:bytes:int}"
| KEEP client_ip, method, path, status, bytes
```

### DISSECT for Simple Patterns

```text
"extract user and action from 'User X performed Y'"
→
FROM audit-logs
| DISSECT message "User %{user} performed %{action}"
| STATS count = COUNT(*) BY user, action
```

---

## Advanced Patterns

### Multi-Index Query

```text
"combine data from logs and metrics"
→
FROM logs-*, metrics-*
| WHERE @timestamp > NOW() - 1 hour
| KEEP @timestamp, host.name, message, cpu.percent
```

### Data Enrichment with LOOKUP JOIN

Prefer `LOOKUP JOIN` over `ENRICH` — no policy setup required, changes reflected immediately.

```text
"add user info to logs"
→
FROM logs-*
| LOOKUP JOIN users ON user.id
| KEEP @timestamp, message, user.name, user.department
| SORT @timestamp DESC
| LIMIT 100
```

```text
"enrich security events with threat intelligence"
→
FROM security-events
| LOOKUP JOIN threat_intel ON source.ip
| WHERE threat_level IS NOT NULL
| KEEP @timestamp, source.ip, threat_level, threat_type
| SORT @timestamp DESC
```

### Data Enrichment with ENRICH

Use `ENRICH` when a pre-configured enrich policy already exists (e.g., GeoIP) or on versions prior to LOOKUP JOIN.

```text
"add geo info to IP addresses"
→
FROM web-logs
| ENRICH geoip-policy ON client.ip WITH country_name, city_name
| STATS requests = COUNT(*) BY country_name
| SORT requests DESC
```

### Multivalue Handling

```text
"count occurrences of each tag"
→
FROM documents
| MV_EXPAND tags
| STATS count = COUNT(*) BY tags
| SORT count DESC
```

### Chained Aggregations

```text
"average daily count per week"
→
FROM events
| STATS daily_count = COUNT(*) BY day = DATE_TRUNC(1 day, @timestamp)
| STATS avg_daily = AVG(daily_count) BY week = DATE_TRUNC(1 week, day)
| SORT week DESC
```

---

## Newer Feature Patterns

### Per-Aggregation WHERE Filters (8.16+)

```text
"count of successful, failed, and total requests by endpoint"
→
FROM web-logs
| STATS
    total = COUNT(*),
    success = COUNT(*) WHERE status_code >= 200 AND status_code < 300,
    errors = COUNT(*) WHERE status_code >= 400
  BY endpoint
| EVAL error_rate = ROUND(errors * 100.0 / total, 2)
| SORT error_rate DESC
```

### INLINE STATS (9.2+)

```text
"show each employee's salary compared to their department average"
→
FROM employees
| INLINE STATS dept_avg = AVG(salary) BY department
| EVAL diff_from_avg = ROUND(salary - dept_avg, 2)
| KEEP name, department, salary, dept_avg, diff_from_avg
| SORT diff_from_avg DESC
```

```text
"find flights longer than the average distance for their destination"
→
FROM flights
| INLINE STATS avg_dist = AVG(distance) BY destination
| WHERE distance > avg_dist
| KEEP flight_id, destination, distance, avg_dist
```

### MATCH_PHRASE (8.19/9.1+)

```text
"find documents with the exact phrase 'out of memory'"
→
FROM logs-* METADATA _score
| WHERE MATCH_PHRASE(message, "out of memory")
| SORT _score DESC
| LIMIT 50
```

---

## ML and Analytics Patterns

### Change Point Detection

Use when the user wants to find when a metric spiked, dipped, or changed trend. Requires a time-ordered series (e.g.
hourly/daily counts).

```text
"when did request rate spike in the last 24 hours"
→
FROM logs-*
| WHERE @timestamp > NOW() - 24 hours
| STATS c = COUNT(*) BY t = BUCKET(@timestamp, 30 seconds)
| SORT t
| CHANGE_POINT c ON t
| WHERE type IS NOT NULL
```

### Log Categorization (CATEGORIZE)

Use when the user wants to group log messages by similar format or see "types" of log lines.

```text
"group similar log messages" / "what types of errors do we have"
→
FROM logs-*
| WHERE @timestamp > NOW() - 24 hours
| STATS count = COUNT() BY category = CATEGORIZE(message)
| SORT count DESC
| LIMIT 20
```

### Change Points in Category Counts

Use when the user wants to find when counts per log category spiked or changed over time. Combines CATEGORIZE with time
bucketing and CHANGE_POINT.

```text
"when did each log category spike" / "change points in category counts"
→
FROM logs-*
| STATS c = COUNT(*) BY category = CATEGORIZE(message), bucket = BUCKET(@timestamp, 1 minute)
| SORT category, bucket
| CHANGE_POINT c ON bucket
```

---

## Common Mistakes to Avoid

- **Forgetting LIMIT** - Always add `LIMIT` to prevent returning too many rows
- **Wrong time field** - Common names: `@timestamp`, `timestamp`, `time`, `date`
- **Case sensitivity** - Field names are case-sensitive: `host.Name` ≠ `host.name`
- **String vs Keyword** - Use `.keyword` suffix for exact matches on text fields: `WHERE status.keyword == "active"`
- **Type mismatches** - Convert types when needed: `EVAL num = TO_INTEGER(string_field)`
- **STATS without aggregation** - STATS requires aggregate functions (`STATS count = COUNT(*) BY host`, not
  `STATS BY host`)
- **Missing FROM or TS** - Every query must start with a source command
- **Pipe placement** - Each command needs a pipe before it (except FROM)
- **NULL exclusion in negation** - `!=` silently excludes rows where the field is `NULL` (missing). This is the most
  common source of silent false negatives.
- **CATEGORIZE grouping order** - `CATEGORIZE(field)` must be the first grouping in `STATS ... BY`. You cannot do
  `BY host.name, category = CATEGORIZE(message)`.
- **CHANGE_POINT needs ordered input** - You may need to sort the sequence on the key.
- **LOOKUP JOIN must precede STATS** - Fields from a joined index are discarded after aggregation. Always join first,
  then aggregate:

  ```esql
  // Wrong: JOIN after STATS loses joined fields
  FROM events
  | STATS total = COUNT(*) BY category_id
  | LOOKUP JOIN categories ON category_id

  // Correct: JOIN first, then aggregate
  FROM events
  | LOOKUP JOIN categories ON category_id
  | STATS total = COUNT(*) BY category_name
  ```

- **DATE_EXTRACT parameter order** - The date part string comes first, the date expression second:

  ```esql
  // Wrong: DATE_EXTRACT(@timestamp, "HOUR_OF_DAY")
  // Correct:
  | EVAL hour = DATE_EXTRACT("HOUR_OF_DAY", @timestamp)
  ```

- **Datetime subtraction** - ES|QL does not support direct datetime arithmetic. Use `DATE_DIFF` to compute intervals:

  ```esql
  // Wrong: end_time - start_time
  // Correct:
  | EVAL duration_hours = DATE_DIFF("hour", start_time, end_time)
  ```

- **STD_DEV, not STDDEV** - The standard deviation function is `STD_DEV` (with underscore):

  ```esql
  // Wrong: STDDEV(field)
  // Correct:
  | STATS sd = STD_DEV(latency_ms) BY endpoint
  ```
