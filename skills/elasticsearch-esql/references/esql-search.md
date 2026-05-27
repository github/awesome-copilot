# ES|QL Full-Text Search Reference

Full-text search in ES|QL uses analyzer-aware functions for fast, relevance-ranked text retrieval. Use these instead of
`LIKE`/`RLIKE` for searching natural language content — they are significantly faster on large datasets.

> **Version:** `MATCH` and `QSTR` were introduced in 8.17 (preview) and became GA in 8.19/9.1. `KQL` and scoring via
> `METADATA _score` were added in 8.18/9.0 (GA in 8.19/9.1). `MATCH_PHRASE` is 8.19/9.1+. See the version column in the
> [Functions Overview](#functions-overview) table and [esql-version-history.md](esql-version-history.md) for
> per-function availability.

## Table of Contents

- [When to Use Full-Text Search](#when-to-use-full-text-search)
- [Functions Overview](#functions-overview)
- [MATCH](#match)
- [Colon Operator (`:`)](#colon-operator-)
- [MATCH_PHRASE](#match_phrase)
- [QSTR (Query String)](#qstr-query-string)
- [KQL (Kibana Query Language)](#kql-kibana-query-language)
- [Relevance Scoring](#relevance-scoring)
- [Semantic Search](#semantic-search)
- [FORK / FUSE (Hybrid Search)](#fork--fuse-hybrid-search)
- [LOOKUP JOIN](#lookup-join)
- [Parameters in ES|QL](#parameters-in-esql)
- [Advanced Search Functions (Preview)](#advanced-search-functions-preview)
- [Placement Rules](#placement-rules)
- [Common Patterns](#common-patterns)
- [Full-Text Search vs Pattern Matching](#full-text-search-vs-pattern-matching)
- [Interaction with Text Analyzers](#interaction-with-text-analyzers)

---

## When to Use Full-Text Search

Use full-text search functions (`MATCH`, `QSTR`, `KQL`, `MATCH_PHRASE`) when:

- Searching natural-language text (log messages, descriptions, titles, comments)
- Relevance ranking matters (most relevant results first)
- You need analyzer features on `text` fields: case-insensitive matching, stemming, synonyms, fuzzy matching (note:
  analyzer features do **not** apply to `semantic_text` fields)
- Searching multivalued text fields
- Performance matters on large datasets

Use `LIKE`/`RLIKE` instead when:

- Pattern-matching on exact (keyword) values: file paths, URLs, status codes
- You need structural regex matching not covered by query string syntax
- Working on small datasets where analyzer support is unnecessary

---

## Functions Overview

| Function                      | Use Case                              | Version (GA) |
| ----------------------------- | ------------------------------------- | ------------ |
| `MATCH(field, query)`         | Single-field text search              | 9.1          |
| `field : "query"`             | Shorthand for MATCH (no options)      | 9.1          |
| `MATCH_PHRASE(field, phrase)` | Exact phrase matching (word order)    | 9.1          |
| `QSTR(query_string)`          | Multi-field search with Lucene syntax | 9.1          |
| `KQL(kql_string)`             | Kibana Query Language queries         | 9.1          |

---

## MATCH

Single-field text search. Equivalent to the Query DSL `match` query.

### Syntax

```esql
MATCH(field, query)
MATCH(field, query, {"option": value})
```

> **One field per `MATCH`:** The first argument must be a **single field from the index mapping** (an identifier such as
> `title` or `content`), not a string literal and not a comma-separated list. **`MATCH("title,content", "q")` is
> invalid** — that is not a real field name. To search several text fields, use separate calls combined with `OR` (for
> example `MATCH(title, "q") OR MATCH(body, "q")`) or use `QSTR` / `KQL` for a multi-field query string.
> **`MATCH(title, body, "phrase")` is invalid** — the second argument is the query text; the optional third is the
> options map, not another field.

### Basic Examples

```esql
// Simple text search
FROM logs-* METADATA _score
| WHERE MATCH(message, "connection timeout")
| SORT _score DESC
| LIMIT 100

// Search with AND operator (all terms must match)
FROM articles METADATA _score
| WHERE MATCH(title, "elasticsearch query language", {"operator": "AND"})
| SORT _score DESC
| LIMIT 20

// Fuzzy matching for typo tolerance
FROM docs METADATA _score
| WHERE MATCH(content, "authentcation error", {"fuzziness": "AUTO"})
| SORT _score DESC
| LIMIT 50
```

### Named Parameters

All parameters are optional. Analyzer-related parameters (`analyzer`, `fuzziness`,
`auto_generate_synonyms_phrase_query`) only apply to `text` fields — they have no effect on `semantic_text` fields.

| Parameter                             | Type    | Default | Description                                           |
| ------------------------------------- | ------- | ------- | ----------------------------------------------------- |
| `operator`                            | keyword | `"OR"`  | Boolean logic between terms: `"OR"` or `"AND"`        |
| `fuzziness`                           | varies  | none    | Edit distance: `"AUTO"`, `0`, `1`, `2`                |
| `analyzer`                            | keyword | field's | Override the query-time analyzer (`text` fields only) |
| `boost`                               | float   | `1.0`   | Relevance score multiplier                            |
| `minimum_should_match`                | varies  | none    | Min terms that must match (number or percentage)      |
| `fuzzy_transpositions`                | boolean | `true`  | Allow ab→ba swaps in fuzzy matching                   |
| `max_expansions`                      | integer | —       | Max terms for fuzzy/prefix expansion                  |
| `fuzzy_rewrite`                       | keyword | —       | Rewrite method for fuzzy queries                      |
| `prefix_length`                       | integer | —       | Leading chars unchanged in fuzzy matching             |
| `lenient`                             | boolean | `false` | Ignore format errors (text query on numeric field)    |
| `zero_terms_query`                    | keyword | —       | Behavior when analyzer removes all tokens             |
| `auto_generate_synonyms_phrase_query` | boolean | `true`  | Auto-create phrase queries for multi-term synonyms    |

### Supported Field Types

`text`, `semantic_text`, `keyword`, `boolean`, `date`, `date_nanos`, `double`, `integer`, `long`, `unsigned_long`, `ip`,
`version`.

> **Semantic search:** `MATCH` is **required** for searching `semantic_text` fields — it automatically performs semantic
> (vector) search instead of lexical search. No syntax change needed. Other full-text functions (`QSTR`, `KQL`,
> `MATCH_PHRASE`) do **not** support `semantic_text`.

---

## Colon Operator (`:`)

Shorthand for `MATCH()` with default parameters. Use for concise, simple searches.

### Syntax

```esql
field : "query"
```

### Examples

```esql
// Simple search
FROM logs-*
| WHERE message : "error"

// With scoring
FROM articles METADATA _score
| WHERE content : "machine learning"
| SORT _score DESC
| LIMIT 10

// Semantic search on semantic_text field
FROM knowledge_base METADATA _score
| WHERE semantic_content : "how to configure authentication"
| SORT _score DESC
| LIMIT 5
```

> **Limitation:** The colon operator does not support named parameters. Use `MATCH()` when you need `fuzziness`,
> `operator`, `analyzer`, or other options.

---

## MATCH_PHRASE

Matches documents where words appear in exact order. Equivalent to the Query DSL `match_phrase` query.

### Syntax

```esql
MATCH_PHRASE(field, phrase)
MATCH_PHRASE(field, phrase, {"option": value})
```

### Examples

```esql
// Exact phrase match
FROM articles METADATA _score
| WHERE MATCH_PHRASE(content, "machine learning pipeline")
| SORT _score DESC
| LIMIT 20

// With slop (allow N positions between words)
FROM docs METADATA _score
| WHERE MATCH_PHRASE(body, "connection refused", {"slop": 1})
| SORT _score DESC
| LIMIT 50
```

### Named Parameters

| Parameter          | Type    | Default | Description                                   |
| ------------------ | ------- | ------- | --------------------------------------------- |
| `slop`             | integer | `0`     | Max positions allowed between matching tokens |
| `analyzer`         | keyword | field's | Override the query-time analyzer              |
| `boost`            | float   | `1.0`   | Relevance score multiplier                    |
| `zero_terms_query` | keyword | —       | Behavior when analyzer removes all tokens     |

### Supported Field Types

`text`, `keyword`. Does **not** support `semantic_text` or numeric types.

### MATCH vs MATCH_PHRASE

| Query                                              | "machine learning pipeline" | "learning machine" | "machine and learning" |
| -------------------------------------------------- | --------------------------- | ------------------ | ---------------------- |
| `MATCH(f, "machine learning")`                     | Yes                         | Yes                | Yes                    |
| `MATCH(f, "machine learning", {"operator":"AND"})` | Yes                         | Yes                | Yes                    |
| `MATCH_PHRASE(f, "machine learning")`              | Yes                         | No                 | No                     |
| `MATCH_PHRASE(f, "machine learning", {"slop":1})`  | Yes                         | No                 | Yes                    |

---

## QSTR (Query String)

Multi-field search using Lucene query string syntax. Equivalent to the Query DSL `query_string` query. Use when you need
complex boolean logic, wildcards, or field-specific searches in a single expression.

### Syntax

```esql
QSTR(query_string)
QSTR(query_string, {"option": value})
```

### Query String Mini-Language

| Syntax                   | Meaning                              | Example                             |
| ------------------------ | ------------------------------------ | ----------------------------------- |
| `term`                   | Match single term                    | `error`                             |
| `"phrase"`               | Exact phrase                         | `"connection refused"`              |
| `field:term`             | Search specific field                | `status:error`                      |
| `field:"phrase"`         | Phrase on specific field             | `message:"disk full"`               |
| `term1 AND term2`        | Both must match                      | `error AND timeout`                 |
| `term1 OR term2`         | Either matches                       | `warning OR error`                  |
| `-term`                  | Exclude term                         | `error -test`                       |
| `term*`                  | Wildcard prefix                      | `connect*`                          |
| `term~N`                 | Fuzzy match (edit distance N)        | `errror~1`                          |
| `"phrase"~N`             | Proximity (words within N positions) | `"connection error"~3`              |
| `(group)`                | Grouping                             | `(error OR warning) AND production` |
| `field:(term1 OR term2)` | Multi-value on one field             | `level:(error OR critical)`         |

### Examples

```esql
// Multi-field boolean search
FROM logs-* METADATA _score
| WHERE QSTR("message:timeout AND level:error AND NOT host.name:test*")
| SORT _score DESC
| LIMIT 100

// Wildcard and proximity
FROM docs METADATA _score
| WHERE QSTR("title:elast* AND description:\"query language\"~2")
| SORT _score DESC
| LIMIT 20

// With default field and lenient mode
FROM logs-*
| WHERE QSTR("connection lost", {"default_field": "message", "lenient": true})
| LIMIT 100
```

### Named Parameters

| Parameter                | Type    | Default | Description                                       |
| ------------------------ | ------- | ------- | ------------------------------------------------- |
| `default_field`          | keyword | —       | Default field when none specified in query string |
| `allow_leading_wildcard` | boolean | `true`  | Allow `*` or `?` as first character               |
| `lenient`                | boolean | `false` | Ignore format-based errors                        |
| `fuzziness`              | varies  | —       | Edit distance for fuzzy matching                  |
| `boost`                  | float   | `1.0`   | Relevance score multiplier                        |

---

## KQL (Kibana Query Language)

Run KQL queries within ES|QL. Useful for migrating existing Kibana search bar queries without rewriting them.

### Syntax

```esql
KQL(kql_string)
KQL(kql_string, {"option": value})
```

### Examples

```esql
// Basic KQL query
FROM logs-*
| WHERE KQL("message: error and host.name: server*")
| LIMIT 100

// KQL with multiple conditions
FROM web-logs METADATA _score
| WHERE KQL("http.request.method: GET and http.response.status_code >= 400")
| SORT _score DESC
| LIMIT 50

// Case-insensitive keyword matching (9.3+)
FROM logs-*
| WHERE KQL("level: Error", {"case_insensitive": true})
| LIMIT 100
```

### Named Parameters (9.3+)

| Parameter          | Type    | Default | Description                                    |
| ------------------ | ------- | ------- | ---------------------------------------------- |
| `boost`            | float   | `1.0`   | Relevance score multiplier                     |
| `time_zone`        | keyword | —       | UTC offset or IANA time zone for date literals |
| `case_insensitive` | boolean | `false` | Case-insensitive matching for keyword fields   |
| `default_field`    | keyword | —       | Default field when none provided               |

---

## Relevance Scoring

Full-text functions produce relevance scores. For lexical search on `text` fields, scoring uses BM25. For semantic
search on `semantic_text` fields, scoring is based on vector similarity. For hybrid search via `FUSE`, scores are
combined using the selected fusion method (RRF or linear). Scoring must be explicitly requested.

### Enabling Scores

Add `METADATA _score` to the `FROM` clause:

```esql
FROM index METADATA _score
| WHERE MATCH(field, "query")
| SORT _score DESC
| LIMIT 10
```

Without `METADATA _score`, full-text functions still filter documents but no ranking is applied.

### Score Boosting

Boost specific fields or queries by combining multiple MATCH calls with different boost values:

```esql
FROM articles METADATA _score
| WHERE MATCH(title, "elasticsearch", {"boost": 2.0})
    OR MATCH(content, "elasticsearch")
| SORT _score DESC
| LIMIT 20
```

### Score Thresholds

Filter out low-relevance results:

```esql
FROM docs METADATA _score
| WHERE MATCH(content, "query optimization")
| WHERE _score > 2.0
| SORT _score DESC
| LIMIT 50
```

### Custom Scoring

Combine `_score` with other fields in `EVAL`:

```esql
FROM products METADATA _score
| WHERE MATCH(description, "wireless headphones")
| EVAL custom_score = _score + rating / 5.0
| SORT custom_score DESC
| LIMIT 20
```

---

## Semantic Search

Search `semantic_text` fields using `MATCH` or `:` for vector-based semantic matching. No separate function is needed —
MATCH automatically performs semantic search on `semantic_text` fields.

```esql
// Semantic search via colon operator
FROM knowledge_base METADATA _score
| WHERE semantic_content : "how do I reset my password"
| SORT _score DESC
| LIMIT 10

// Semantic search via MATCH
FROM knowledge_base METADATA _score
| WHERE MATCH(semantic_content, "configure two-factor authentication")
| SORT _score DESC
| LIMIT 10
```

---

## FORK / FUSE (Hybrid Search)

Combines multiple search strategies in parallel and merges results with relevance scoring.

```esql
FROM index METADATA _id, _index, _score
| FORK
    (WHERE MATCH(text_field, "keyword query") | SORT _score DESC | EVAL branch = "lexical")
    (WHERE MATCH(semantic_field, "semantic query") | SORT _score DESC | EVAL branch = "semantic")
| FUSE
| SORT _score DESC
| LIMIT 25
```

**Rules:**

1. `METADATA _id, _index, _score` must be in the `FROM` clause — FUSE requires all three. The same `METADATA _index`
   declaration is required **before** you filter on `_index` inside a branch (for example `WHERE _index LIKE "logs-*"`).
   Without `METADATA _index`, `_index` is not a valid column.
2. Each branch uses `WHERE MATCH(...)` inside parentheses — not a bare `MATCH` command
3. Each branch should `SORT _score DESC` to feed ranked results into FUSE
4. FUSE supports two methods: `rrf` (Reciprocal Rank Fusion, default) and `linear` (weighted linear combination with
   optional `minmax` score normalization and per-branch `weights`)
5. The `_fork` column in results indicates which branch(es) matched each document
6. A maximum of 8 forks are allowed

### Examples

```esql
// Hybrid lexical + semantic search (RRF, default)
FROM articles METADATA _id, _index, _score
| FORK
    (WHERE MATCH(title, "elasticsearch performance") | SORT _score DESC | LIMIT 10)
    (WHERE semantic_content : "how to make elasticsearch faster" | SORT _score DESC | LIMIT 10)
| FUSE
| SORT _score DESC
| LIMIT 10

// LINEAR fusion with minmax normalization and custom weights
FROM articles METADATA _id, _index, _score
| FORK
    (WHERE MATCH(title, "elasticsearch performance") | SORT _score DESC | LIMIT 50)
    (WHERE semantic_content : "how to make elasticsearch faster" | SORT _score DESC | LIMIT 50)
| FUSE linear WITH { "normalizer": "minmax", "weights": { "fork1": 0.6, "fork2": 0.4 } }
| SORT _score DESC
| LIMIT 10

// Three-way hybrid: lexical, semantic, and KNN
FROM docs METADATA _id, _index, _score
| FORK
    (WHERE MATCH(content, "query optimization") | SORT _score DESC | LIMIT 20)
    (WHERE semantic_content : "how to speed up database queries" | SORT _score DESC | LIMIT 20)
    (WHERE KNN(embedding, TEXT_EMBEDDING("query optimization", "my-endpoint")) | SORT _score DESC | LIMIT 20)
| DROP embedding
| FUSE
| SORT _score DESC
| LIMIT 10
```

---

## LOOKUP JOIN

Joins search results with a pre-built lookup index to enrich them with additional fields.

```esql
FROM source-index
| STATS count = COUNT(*) BY join_key_field
| LOOKUP JOIN lookup-index-name ON join_key_field
| KEEP join_key_field, count, enriched_field_from_lookup
| LIMIT 10
```

**Constraints:**

- Target must be a **separate, pre-built lookup index** — self-joins are not valid
- The lookup index must be in lookup mode (`index.mode: lookup`)
- After `STATS`, only aggregated columns exist — original source fields are gone
- Parameters (`?param`) cannot be used as field names

### Examples

```esql
// Enrich search results with category labels
FROM logs-* METADATA _score
| WHERE MATCH(message, "authentication error")
| STATS error_count = COUNT(*) BY host.name
| LOOKUP JOIN host-metadata ON host.name
| KEEP host.name, error_count, environment, team
| SORT error_count DESC
| LIMIT 20

// Enrich aggregated results with user info
FROM audit-logs
| WHERE MATCH(message, "permission denied")
| STATS denied_count = COUNT(*) BY user.id
| LOOKUP JOIN users-lookup ON user.id
| KEEP user.id, denied_count, user.name, department
| SORT denied_count DESC
| LIMIT 10
```

---

## Parameters in ES|QL

Use `?param_name` syntax for agent-controlled dynamic values:

```esql
FROM orders-*
| WHERE region == ?region AND @timestamp >= NOW() - ?days::integer * 1d
| STATS total = SUM(amount) BY product_category
| SORT total DESC
| LIMIT ?limit
```

**Parameter types:** `keyword`, `text`, `integer`, `long`, `double`, `boolean`, `date`

**Gotchas:**

- Parameters are **values only** — `?field_name` cannot be used as a dynamic column reference
- Duration syntax (`30d`) cannot be a parameter directly — use `?days::integer * 1d` instead
- Optional parameters should have defaults to prevent null-breaking query syntax

---

## Advanced Search Functions (Preview)

These functions are available in recent versions as tech preview.

### KNN — Dense Vector Search (9.2+, preview)

```esql
FROM index METADATA _score
| WHERE KNN(vector_field, [0.5, 0.8, 0.3])
| SORT _score DESC
| LIMIT 10

// With text embedding
FROM index METADATA _score
| WHERE KNN(embedding_field, TEXT_EMBEDDING("search query", "my-inference-endpoint"))
| SORT _score DESC
| LIMIT 10
```

### TOP_SNIPPETS — Search Result Highlights (9.3+, preview)

Extract the best-matching text snippets from a field:

```esql
FROM articles METADATA _score
| WHERE MATCH(content, "elasticsearch performance")
| EVAL snippets = TOP_SNIPPETS(content, "elasticsearch performance", {"num_snippets": 3, "num_words": 50})
| KEEP title, snippets, _score
| SORT _score DESC
| LIMIT 10
```

Options: `num_snippets` (number of snippets to return), `num_words` (max words per snippet).

### DECAY — Distance-Based Scoring (9.3+, preview)

Score based on distance from an origin (date, number, or geo point):

```esql
FROM events METADATA _score
| WHERE MATCH(title, "conference")
| EVAL recency_score = DECAY("gauss", @timestamp, NOW(), "7d", "30d")
| SORT recency_score DESC
| LIMIT 20
```

---

## Placement Rules

Full-text search functions (`MATCH`, `QSTR`, `KQL`, `MATCH_PHRASE`) must appear in a `WHERE` clause **before** any
processing command has modified the column set. In practice this means they must be placed in the `WHERE` immediately
after `FROM` (or after another `WHERE`). They can also appear in per-aggregation `STATS ... WHERE` filters.

They **cannot** be used after any of these commands: `EVAL`, `GROK`, `DISSECT`, `KEEP`, `DROP`, `RENAME`, `MV_EXPAND`,
`STATS`, `LIMIT`, `SHOW`, `ROW`.

```esql
// CORRECT — MATCH directly after FROM
FROM logs-* METADATA _score
| WHERE MATCH(message, "timeout")
| SORT _score DESC
| LIMIT 50

// WRONG — MATCH after EVAL will fail
FROM logs-*
| EVAL lower_msg = TO_LOWER(message)
| WHERE MATCH(message, "timeout")
```

**Important:** Full-text functions require indexed fields. They cannot operate on runtime-computed values, `ROW`
literals, or fields created by `EVAL`.

---

## Common Patterns

### Search Logs for Error Messages

```esql
FROM logs-* METADATA _score
| WHERE @timestamp > NOW() - 1 hour
| WHERE MATCH(message, "connection refused timeout")
| KEEP @timestamp, host.name, message, _score
| SORT _score DESC
| LIMIT 100
```

### Find Documents by Exact Phrase

```esql
FROM docs METADATA _score
| WHERE MATCH_PHRASE(content, "null pointer exception")
| KEEP title, content, _score
| SORT _score DESC
| LIMIT 20
```

### Multi-Criteria Search with QSTR

```esql
FROM logs-* METADATA _score
| WHERE @timestamp > NOW() - 24 hours
| WHERE QSTR("message:(timeout OR refused) AND level:error AND NOT host.name:staging*")
| KEEP @timestamp, host.name, level, message, _score
| SORT _score DESC
| LIMIT 100
```

### Aggregate Search Results

```esql
FROM logs-*
| WHERE MATCH(message, "authentication failure")
| WHERE @timestamp > NOW() - 24 hours
| STATS failure_count = COUNT(*) BY host.name
| SORT failure_count DESC
| LIMIT 20
```

### Migrate KQL from Kibana Search Bar

```esql
// Original KQL in Kibana: message: error and host.name: prod-*
FROM logs-*
| WHERE KQL("message: error and host.name: prod-*")
| SORT @timestamp DESC
| LIMIT 100
```

### Combine Text Search with Aggregation

```esql
FROM logs-*
| WHERE MATCH(message, "disk space")
| WHERE @timestamp > NOW() - 7 days
| STATS
    count = COUNT(*),
    hosts_affected = COUNT_DISTINCT(host.name)
  BY day = DATE_TRUNC(1 day, @timestamp)
| SORT day DESC
```

---

## Full-Text Search vs Pattern Matching

| Capability                | Full-Text (`MATCH`, `QSTR`) | Pattern (`LIKE`, `RLIKE`)   |
| ------------------------- | --------------------------- | --------------------------- |
| Uses inverted index       | Yes (fast)                  | No (scans values)           |
| Analyzer support          | Yes (stemming, synonyms)    | No                          |
| Relevance scoring         | Yes (`_score`)              | No                          |
| Case-insensitive          | Yes (via analyzer)          | Manual (`TO_LOWER` + match) |
| Fuzzy matching            | Yes (`fuzziness` option)    | Manual (complex regex)      |
| Wildcard patterns         | Limited (`*` in QSTR)       | Full regex support          |
| Works on keyword fields   | Yes                         | Yes                         |
| Works on computed values  | No (index fields only)      | Yes                         |
| Performance on large data | Excellent                   | Poor                        |

---

## Interaction with Text Analyzers

Full-text search functions automatically use the field's configured analyzer at both index time and query time. **These
analyzer features apply to `text` fields only — they do not apply to `semantic_text` fields**, which use vector-based
similarity instead of token analysis.

**Analyzer-powered capabilities (text fields only):**

- **Case-insensitive matching** — analyzers typically lowercase tokens
- **Stemming** — "running" matches "run", "runs", "ran"
- **Stopword removal** — common words like "the", "a" are excluded
- **Synonyms** — configured synonym mappings are applied
- **ASCII folding** — "café" matches "cafe"

**Override the analyzer** at query time using the `analyzer` parameter (text fields only):

```esql
FROM logs-*
| WHERE MATCH(message, "query text", {"analyzer": "my_custom_analyzer"})
```

**Contrast with `LIKE`/`RLIKE`:** These operators work on exact stored values and bypass all analyzer processing.
