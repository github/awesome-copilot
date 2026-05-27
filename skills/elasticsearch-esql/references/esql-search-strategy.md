# ES|QL Relevance Search Strategy

This guide teaches an agent how to perform high-quality relevance search on content indices using ES|QL.

## Table of Contents

- [Scope](#scope)
- [Quick Strategy Rules](#quick-strategy-rules)
- [Standard Workflow](#standard-workflow)
- [Multi-Stage Retrieval Pattern](#multi-stage-retrieval-pattern)
- [Retrieval Strategies](#retrieval-strategies)
  - [Lexical Retrieval](#lexical-retrieval)
  - [Semantic Retrieval](#semantic-retrieval)
  - [Vector Retrieval](#vector-retrieval)
  - [Hybrid Retrieval](#hybrid-retrieval)
- [Semantic Intent Without Semantic Field](#semantic-intent-without-semantic-field)
- [Reranking Stage](#reranking-stage)
  - [Semantic Reranking](#semantic-reranking)
  - [Embedding Similarity Rescore](#embedding-similarity-rescore)
- [Phrase Search](#phrase-search)
- [Multi-Index Search](#multi-index-search)
- [Weak Result Recovery](#weak-result-recovery)
- [Mandatory Rules](#mandatory-rules)
- [Final Decision Process](#final-decision-process)

## Scope

This guidance is designed for:

- document search
- knowledge bases
- articles
- documentation
- product content

It is **not** intended for logs or observability datasets.

Agents should always follow a **multi-stage retrieval pattern**:

```text
retrieve → (optional fuse) → rerank
```

Start with inexpensive retrieval and apply expensive ranking only to a limited candidate set.

## Quick Strategy Rules

| Situation                             | Strategy                            |
| ------------------------------------- | ----------------------------------- |
| `semantic_text` field exists          | semantic `MATCH`                    |
| only `text` fields exist              | lexical `MATCH`                     |
| `dense_vector` field exists           | `KNN` retrieval                     |
| lexical + semantic fields exist       | hybrid retrieval                    |
| semantic intent but no semantic field | lexical → `RERANK`                  |
| exact wording required                | `MATCH_PHRASE`                      |
| multiple indices                      | branch search using `FORK` + `FUSE` |

## Standard Workflow

### 1. Identify Indices

Use the narrowest index pattern that satisfies the request.

```esql
// Single index
FROM knowledge-base

// Multiple indices
FROM docs-*,articles-*
```

### 2. Inspect Mappings

Before writing queries, identify searchable fields.

Preferred fields for content search:

```text
title
name
subject
summary
body
content
description
text
```

### Field Types

| Field type      | Purpose            |
| --------------- | ------------------ |
| `semantic_text` | semantic retrieval |
| `text`          | lexical retrieval  |
| `dense_vector`  | vector retrieval   |
| `keyword`       | filtering only     |

**Never** use `keyword` fields for natural language search.

### Preferred Field Ranking

1. `title`
2. `summary`
3. `body` / `content`
4. `description`
5. `text`

Short fields provide **precision**. Long fields provide **recall**.

### 3. Choose Retrieval Strategy

Use the [Quick Strategy Rules](#quick-strategy-rules) table to select the right approach based on the available field
types. Then follow the matching retrieval pattern below.

## Multi-Stage Retrieval Pattern

Always follow this structure:

1. retrieve candidate documents
2. optionally combine retrieval strategies
3. rerank candidates

Typical candidate size: **50–200 documents**. Use smaller sets when fields are strong. Use larger sets when recall is
important.

## Retrieval Strategies

### Lexical Retrieval

Use when only `text` fields exist.

```esql
FROM my-index METADATA _score
| WHERE MATCH(title, ?query) OR MATCH(body, ?query)
| SORT _score DESC
| LIMIT 100
```

Guidelines:

- **one field per `MATCH`** — the first argument is a **single mapped field** (`title`, `content`), not a quoted
  pseudo-field like `"title,content"` and not two identifiers before the query (`MATCH(title, body, "q")` is invalid);
  use `MATCH(a, ?query) OR MATCH(b, ?query)` or `QSTR` / `KQL` for multi-field search
- a single `MATCH` on the main content field is often sufficient
- add additional fields (title, summary) only when recall is poor or the user explicitly asks for broader search
- title fields provide precision, body fields provide recall
- prefer `MATCH` over `LIKE` or `RLIKE`

### Semantic Retrieval

Use when a `semantic_text` field exists. `MATCH` is **required** for `semantic_text` fields — it automatically performs
vector-based semantic search. No separate function is needed.

```esql
FROM my-index METADATA _score
| WHERE MATCH(semantic_body, ?query)
| SORT _score DESC
| LIMIT 100
```

Prefer the semantic field representing the **main document body**.

### Vector Retrieval

> **Version:** `KNN` is 9.2+ (preview). `TEXT_EMBEDDING` is 9.3+. Verify cluster version via `esql-version-history.md`
> before using these functions. For clusters below 9.2, use semantic retrieval with `semantic_text` + `MATCH` instead.

Use when embeddings are stored as `dense_vector`. `KNN` can also target `semantic_text` fields.

```esql
FROM my-index METADATA _score
| WHERE KNN(content_embedding, TEXT_EMBEDDING(?query, "embedding_endpoint"))
| SORT _score DESC
| LIMIT 100
```

Rules:

- the query embedding model must match the document embeddings
- always retrieve a bounded candidate set
- avoid embedding operations across the full index

### Hybrid Retrieval

> **Version:** `FORK` is 8.19/9.1+ (preview). `FUSE` is 9.2+ (preview). On clusters below 9.2, use lexical retrieval
> followed by `RERANK` as a fallback. On clusters below 8.19/9.1, use a single-branch `MATCH` with `RERANK`.

Use when both lexical and semantic fields exist.

```esql
FROM my-index METADATA _id, _index, _score
| FORK
    (
        WHERE MATCH(title, ?query) OR MATCH(body, ?query)
        | SORT _score DESC
        | LIMIT 100
    )
    (
        WHERE MATCH(semantic_body, ?query)
        | SORT _score DESC
        | LIMIT 100
    )
| FUSE
| SORT _score DESC
| LIMIT 100
```

Hybrid retrieval improves both **recall and precision**.

Pipeline:

```text
retrieve lexically
retrieve semantically
fuse
rerank
```

## Semantic Intent Without Semantic Field

If semantic search is requested but the index lacks `semantic_text`:

1. retrieve candidates lexically
2. rerank results semantically

```esql
FROM my-index METADATA _score
| WHERE MATCH(title, ?query) OR MATCH(body, ?query) OR MATCH(summary, ?query)
| SORT _score DESC
| LIMIT 100
```

**Never** stop at "semantic search unavailable" without attempting lexical retrieval.

## Reranking Stage

> **Version:** `RERANK` is 9.2+ (preview). On clusters below 9.2, skip the reranking stage and rely on initial retrieval
> scoring. For clusters below 9.2, sorting by `_score DESC` after `MATCH` provides BM25 or vector-based ordering.

Always rerank a bounded candidate set.

### Semantic Reranking

```esql
FROM my-index METADATA _score
| WHERE MATCH(body, ?query)
| SORT _score DESC
| LIMIT 100
| RERANK body ON ?query
| SORT _score DESC
| LIMIT 20
```

Use when:

- lexical retrieval produced good candidates
- semantic ranking improves ordering

### Embedding Similarity Rescore

> **Version:** `V_COSINE` and other vector similarity functions are 9.3+ (preview). Verify cluster version via
> `esql-version-history.md` before using these functions.

Use when document embeddings exist.

```esql
FROM my-index METADATA _score
| WHERE MATCH(body, ?query)
| SORT _score DESC
| LIMIT 100
| EVAL q = TEXT_EMBEDDING(?query, "embedding_endpoint")
| EVAL semantic_score = V_COSINE(content_embedding, q)
| SORT semantic_score DESC
| LIMIT 20
```

Rules:

- compute the query embedding once
- compare only against candidate documents
- avoid vector scans across entire indices

## Phrase Search

Use when exact wording matters.

```esql
FROM my-index METADATA _score
| WHERE MATCH_PHRASE(body, ?phrase)
| SORT _score DESC
| LIMIT 20
```

Typical cases:

- product names
- quoted text
- error messages
- legal phrases

## Multi-Index Search

When querying multiple indices:

1. inspect mappings
2. confirm compatible fields
3. branch queries when schemas differ
4. fuse results
5. rerank candidates

> **`_index` is not implicit:** You may use `_index` in queries (for example `WHERE _index LIKE "docs-%"`) **only** if
> the `FROM` clause requests it via `METADATA _index` (typically `METADATA _id, _index, _score` for `FORK`/`FUSE`). If
> `_index` is omitted from `METADATA`, the column does not exist in the pipeline — the query fails with an unknown-field
> error. Prefer the [compatible-schemas](#compatible-schemas) pattern when you do not need per-index branching.

### Compatible Schemas

```esql
FROM docs-*,articles-* METADATA _score
| WHERE MATCH(title, ?query) OR MATCH(body, ?query)
| SORT _score DESC
| LIMIT 20
```

### Different Schemas

```esql
FROM docs-*,support-* METADATA _id, _index, _score
| FORK
    (
        WHERE _index LIKE "docs-%"
        | WHERE MATCH(body, ?query)
        | SORT _score DESC
        | LIMIT 100
    )
    (
        WHERE _index LIKE "support-%"
        | WHERE MATCH(content, ?query)
        | SORT _score DESC
        | LIMIT 100
    )
| FUSE
| SORT _score DESC
| LIMIT 20
```

Always keep the pattern simple:

```text
retrieve per index family → fuse → rerank
```

## Weak Result Recovery

If results are weak:

1. search additional content fields
2. increase candidate size
3. apply semantic reranking
4. switch to hybrid retrieval
5. inspect mappings for stronger fields
6. split multi-index search by index family

Avoid jumping directly to expensive ranking.

## Mandatory Rules

**Always:**

- inspect mappings first
- retrieve candidates before reranking
- limit candidate sets to ~50–200
- use `_score` for ranking
- prefer content fields over metadata
- follow retrieve → fuse → rerank

**Never:**

- search natural language in `keyword` fields
- run embedding operations across entire indices
- skip the retrieval stage
- use `LIKE` for relevance search
- dump full mappings unless necessary

## Default Query Patterns

Use the examples from [Retrieval Strategies](#retrieval-strategies) as starting templates:

- **Lexical** — see [Lexical Retrieval](#lexical-retrieval)
- **Semantic** — see [Semantic Retrieval](#semantic-retrieval)
- **Hybrid** — see [Hybrid Retrieval](#hybrid-retrieval), then add a [Reranking Stage](#reranking-stage)

Use the hybrid pattern when both lexical and semantic fields exist.

## Final Decision Process

Follow this order:

1. inspect mappings
2. choose best retrieval field family
3. retrieve candidates
4. fuse if necessary
5. rerank
6. return results

Mental model:

```text
retrieve → fuse → rerank
```
