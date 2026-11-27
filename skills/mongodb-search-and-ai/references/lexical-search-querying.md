# Lexical Search - Querying

This guide covers query patterns and optimization techniques for MongoDB Atlas Search.

## Table of Contents

- [$search vs $searchMeta](#search-vs-searchmeta)
- [Query Patterns](#query-patterns)
- [Query Optimization](#query-optimization)
- [Query Performance Analysis](#query-performance-analysis)

---

## $search vs $searchMeta

Both stages must be the **first stage** in an aggregation pipeline.

| Stage | Use When |
|---|---|
| `$search` | You need matching documents, with or without metadata |
| `$searchMeta` | You only need metadata (count, facets) — no documents returned |

`$searchMeta` shares the following fields with `$search`: `index`, all operator names (e.g. `text`, `range`, `compound`), `concurrent` (parallelizes search across segments on dedicated search nodes only — ignored otherwise), and `returnStoredSource`.

---

## Query Patterns

### Operator Reference

| Operator | Description |
|---|---|
| `autocomplete` | Search-as-you-type from incomplete input |
| `compound` | Combines multiple operators into a single query |
| `embeddedDocument` | Queries fields inside arrays of objects |
| `equals` | Exact match on boolean, date, number, objectId, token, uuid |
| `exists` | Tests for presence of a field |
| `geoShape` | Queries shapes by spatial relation (geo type, indexShapes: true) |
| `geoWithin` | Queries points within a region (geo type) |
| `hasAncestor` | Queries ancestor-level fields when using `returnScope` |
| `hasRoot` | Queries root-level fields when using `returnScope` |
| `in` | Queries single values or arrays of values |
| `moreLikeThis` | Finds documents similar to a given document |
| `near` | Queries values near a number, date, or geo point |
| `phrase` | Searches for terms in a specific order |
| `queryString` | Boolean/field-specific query syntax |
| `range` | Queries values within a numeric, date, string, or objectId range |
| `regex` | Regular expression matching on string fields |
| `text` | Full-text analyzed search on string fields |
| `vectorSearch` | Semantic search with lexical pre-filters (vector type in search index) |
| `wildcard` | Wildcard pattern matching on string fields |

---

### Count Results

Use the `count` option in `$searchMeta` to count matching documents without fetching them. Also works in `$search` via the `$SEARCH_META` aggregation variable when you need both results and count.

```javascript
// Count only (recommended)
db.movies.aggregate([
  {
    $searchMeta: {
      range: { path: "year", gte: 2010, lte: 2015 },
      count: { type: "lowerBound" }  // or "total" for exact count
    }
  }
])
// Returns: { count: { lowerBound: NumberLong(1001) } }
```

```javascript
// Count alongside results using $SEARCH_META
db.movies.aggregate([
  {
    $search: {
      text: { path: "title", query: "<query>" },
      count: { type: "total" }
    }
  },
  { $project: { title: 1, meta: "$SEARCH_META" } },
  { $limit: 10 }
])
```

| type | Behavior |
|---|---|
| `lowerBound` | Approximate. Exact up to `threshold` (default 1000), rough above it. |
| `total` | Exact count. Slower on large result sets. |

**Note:** Count affects performance — use only when needed (e.g., first page of paginated results).

---

### Pagination with searchSequenceToken

Cursor-based pagination using tokens. More efficient than `$skip` alone for deep pagination.

**Step 1 — Get tokens from the initial query:**
```javascript
db.movies.aggregate([
  {
    $search: {
      index: "<index-name>",
      text: { path: "title", query: "summer" },
      sort: { released: 1, _id: 1 }  // Sort on a unique field to prevent tie-ordering issues
    }
  },
  { $limit: 10 },
  {
    $project: {
      title: 1, released: 1,
      paginationToken: { $meta: "searchSequenceToken" }
    }
  }
])
```

**Step 2 — Next page using searchAfter:**
```javascript
db.movies.aggregate([
  {
    $search: {
      index: "<index-name>",
      text: { path: "title", query: "summer" },
      searchAfter: "<token-from-last-document-on-previous-page>",
      sort: { released: 1, _id: 1 }  // maintain the same sort order
    }
  },
  { $limit: 10 },
  { $project: { title: 1, paginationToken: { $meta: "searchSequenceToken" } } }
])
```

Use `searchBefore` with the first document's token on the current page to go to the previous page — results are returned in reverse order. Combine `searchAfter` with `$skip` to jump pages.

**Key constraint:** Query semantics (operator, path, query value, sort) must be identical between the initial query and any `searchAfter`/`searchBefore` query.

---

### Retrieve Arrays of Objects with returnScope

Return each element of an embedded document array as an individually scored document. Works in both `$search` and `$searchMeta`.

**Requirements:**
- Array field indexed as `embeddedDocuments` type with `storedSource` defined on the fields to return
- `returnStoredSource: true` in the query
- All operator paths must be nested under `returnScope.path` (use `hasAncestor` or `hasRoot` to query outside it)

**Index:**
```javascript
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "funding_rounds": {
        "type": "embeddedDocuments",
        "dynamic": true,
        "storedSource": {
          "include": ["round_code", "raised_currency_code", "raised_amount"]
        }
      }
    }
  }
}
```

**Query:**
```javascript
db.companies.aggregate([
  {
    $search: {
      range: { path: "funding_rounds.raised_amount", gte: 5000000, lte: 10000000 },
      returnStoredSource: true,
      returnScope: { path: "funding_rounds" }
    }
  },
  { $limit: 5 }
])
```

Only fields defined in `storedSource` within the embedded document are returned — root-level fields are excluded. When `returnScope` is specified, all query paths must start with `returnScope.path`.

---

### Advanced Query Syntax (queryString)

**Use case:** Complex search with boolean operators, wildcards, and field-specific queries.

**Fields configuration:**
```javascript
// Add to mappings.fields in your index:
{
  "title": { "type": "string" },
  "director": { "type": "string" },
  "year": { "type": "number" }
}
```

**Query patterns:**
```javascript
// Boolean operators
db.collection.aggregate([
  {
    $search: {
      index: "search_index",
      queryString: {
        defaultPath: "title",
        query: "detective AND (noir OR thriller) NOT comedy"
      }
    }
  }
])

// Field-specific searches
db.collection.aggregate([
  {
    $search: {
      index: "search_index",
      queryString: {
        defaultPath: "title",
        query: "title:inception AND director:nolan"
      }
    }
  }
])

// Wildcards and ranges
db.collection.aggregate([
  {
    $search: {
      index: "search_index",
      queryString: {
        defaultPath: "title",
        query: "star* AND year:[2010 TO 2020]"
      }
    }
  }
])
```

**Supported syntax:**
- Boolean: `AND`, `OR`, `NOT`
- Grouping: `(term1 OR term2)`
- Wildcards: `*` (0+ chars), `?` (single char)
- Ranges: `[min TO max]` for numbers/dates
- Field-specific: `fieldName:value`

**Key considerations:**
- Great for building search UIs with advanced options
- Users can construct complex queries without API changes
- Validate/sanitize user input to prevent injection

---

### Searching Nested Arrays (embeddedDocument)

**Use case:** Search within arrays of objects where element-wise comparisons are required (similar to $elemMatch), or each element must be scored independently.

**Fields configuration:**
```javascript
// Add to mappings.fields in your index:
{
  "title": { "type": "string" },
  "reviews": {
    "type": "embeddedDocuments",  // Required for array search
    "fields": {
      "author": { "type": "string" },
      "text": { "type": "string" },
      "rating": { "type": "number" }
    }
  }
}
```

**Query pattern:**
```javascript
db.collection.aggregate([
  {
    $search: {
      index: "search_index",
      embeddedDocument: {
        path: "reviews",
        operator: {
          compound: {
            must: [
              { text: { query: "excellent", path: "reviews.text" } }
            ],
            filter: [
              { range: { path: "reviews.rating", gte: 4 } }
            ]
          }
        },
        score: { embedded: { aggregate: "maximum" } }  // or sum, minimum, mean
      }
    }
  }
])
```

**Score aggregation options:**
- `sum`: Add scores from all matching array elements
- `maximum`: Use highest score from array elements
- `minimum`: Use lowest score from array elements
- `mean`: Average scores from array elements

**Key considerations:**
- Each array element is indexed as a separate document
- Use `embeddedDocuments` field type, not regular `document`
- Score aggregation controls how array matches affect overall document score
- Performance can be degraded due to complexity of parent-child joins

---

### Search Highlighting

**Use case:** Show users which parts of documents matched their query.

**Fields configuration:**
```javascript
// Add to mappings.fields in your index:
{
  "title": { "type": "string" },
  "plot": { "type": "string" }
}
```

**Query pattern:**
```javascript
db.collection.aggregate([
  {
    $search: {
      index: "search_index",
      text: {
        query: "detective noir",
        path: "plot"
      },
      highlight: {
        path: "plot",
        maxCharsToExamine: 500000,  // Default
        maxNumPassages: 5            // Number of snippets
      }
    }
  },
  {
    $project: {
      title: 1,
      plot: 1,
      highlights: { $meta: "searchHighlights" },
      score: { $meta: "searchScore" }
    }
  }
])
```

**Highlight result structure:**
```javascript
{
  "highlights": [
    {
      "path": "plot",
      "texts": [
        { "value": "A ", "type": "text" },
        { "value": "detective", "type": "hit" },
        { "value": " investigates a murder in ", "type": "text" },
        { "value": "noir", "type": "hit" },
        { "value": " Los Angeles", "type": "text" }
      ],
      "score": 1.23
    }
  ]
}
```

**Key considerations:**
- `type: "hit"` indicates matched terms
- `type: "text"` is surrounding context
- Multiple passages returned for long documents
- Use in search results UI to show match context

---

### Compound Queries

**Compound queries** combine multiple operators efficiently:

```javascript
db.collection.aggregate([
  {
    $search: {
      index: "search_index",
      compound: {
        must: [
          { text: { query: "detective", path: "plot" } }  // Required, affects score
        ],
        should: [
          { text: { query: "mystery", path: "genre" } }   // Optional, boosts score
        ],
        filter: [
          { range: { path: "year", gte: 2000 } }          // Required, no score impact
        ],
        mustNot: [
          { text: { query: "comedy", path: "genre" } }    // Excludes results
        ]
      }
    }
  }
])
```

**Clause types:**
- `must`: Required matches that affect scoring
- `should`: Optional matches that boost scores
- `filter`: Required matches that don't affect scoring (faster)
- `mustNot`: Exclusions

**Performance tips:**
- Use `filter` instead of `must` for criteria that shouldn't affect scoring (faster)
- Put most selective criteria in `must` or `filter` first
- Limit `should` clauses to 3-5 for best performance

---

### Query with Synonyms

When your index is configured with synonyms, specify the synonym mapping name in your query:

```javascript
db.collection.aggregate([
  {
    $search: {
      index: "search_index",
      text: {
        query: "car chase",
        path: "description",
        synonyms: "synonym-mapping-name"  // Reference the mapping from your index
      }
    }
  }
])
```

**Note:** When you specify a synonym mapping name, MongoDB Search automatically searches for the query terms AND all their synonyms (e.g., "car" also matches "automobile", "vehicle").

---

### Using Multi Analyzers

Query specific analyzer variants of a field:

```javascript
// Standard fuzzy search
db.collection.aggregate([
  {
    $search: {
      index: "search_index",
      text: {
        query: "Action",
        path: "title"  // Uses default analyzer
      }
    }
  }
])

// Exact match using keyword analyzer
db.collection.aggregate([
  {
    $search: {
      index: "search_index",
      text: {
        query: "Action",
        path: "title.keywordAnalyzer"  // Uses alternate analyzer
      }
    }
  }
])
```

**Use case:** Support both fuzzy and exact matching on the same field without duplicating data.

---

### Autocomplete

Search-as-you-type on fields indexed as `autocomplete` type (see lexical-search-indexing.md).

| Option | Description |
|---|---|
| `query` | String to search |
| `path` | Field indexed as `autocomplete` |
| `tokenOrder` | `any` (tokens in any order; sequential matches score higher) or `sequential` (tokens must be adjacent) |
| `fuzzy` | `{ maxEdits: 1\|2, prefixLength: <n>, maxExpansions: <n> }` |

To score exact matches higher, index the field as both `autocomplete` and `string` types and query using `compound`.

---

### Facet

Groups results into buckets by field values or ranges. Use with `$searchMeta` for metadata only, or with `$search` + `$SEARCH_META` variable for results and metadata.

```javascript
{ "$searchMeta": { "facet": {
    "operator": { <operator> },
    "facets": {
      "<facet-name>": { "type": "string|number|date", "path": "<field>", ...options }
    }
} } }
```

| Facet type | Field index type | Bucket definition |
|---|---|---|
| `string` | `token` | Top N unique string values. `numBuckets` defaults to 10. |
| `number` | `number` | Numeric ranges via `boundaries` array + optional `default` bucket |
| `date` | `date` | Date ranges via `boundaries` array + optional `default` bucket |

---

### geoShape

Query shapes by spatial relation. Field must be indexed as `geo` type with `indexShapes: true`. Required fields: `geometry` (GeoJSON Polygon, MultiPolygon, or LineString), `path`, and `relation`:

| relation | Meaning |
|---|---|
| `contains` | Indexed geometry contains the query geometry |
| `disjoint` | No overlap between geometries |
| `intersects` | Geometries overlap |
| `within` | Indexed geometry is within the query geometry (not supported for LineString or Point) |

---

### geoWithin

Query geographic points within a region. Field must be indexed as `geo` type. Specify one of:
- `box`: `{ bottomLeft: <GeoJSON Point>, topRight: <GeoJSON Point> }`
- `circle`: `{ center: <GeoJSON Point>, radius: <meters> }`
- `geometry`: GeoJSON Polygon or MultiPolygon

**For both geo operators:** longitude must be specified before latitude; longitude range [-180, 180], latitude range [-90, 90].

---

## Query Optimization

### Sorting Search Results

Use the `sort` option inside `$search` to sort at the mongot level (more efficient than a `$sort` stage after). Supports: `boolean`, `date`, `number`, `objectId`, `uuid`, and `string` (must be indexed as `token` type). Cannot sort on `embeddedDocuments` type fields.

```javascript
db.collection.aggregate([
  {
    $search: {
      text: { ... },
      sort: { "fieldName": -1, "title": 1, score: { $meta: "searchScore" } }
    }
  },
  { $limit: 10 }
])
```

**Sort by score:**
```javascript
sort: { score: { $meta: "searchScore", order: 1 } }  // ascending (lowest score first)
sort: { score: { $meta: "searchScore" } }             // descending (default)
```

**Null/missing values:** Appear first in ascending sort by default. Use `noData: "highest"` to push them last:
```javascript
sort: { "field": { order: 1, noData: "highest" } }
```

**Key rules:**
- `sort` inside `$search` only works on indexed fields — use `$sort` after for non-indexed or computed fields
- For `searchSequenceToken` pagination, sort must include a unique field (e.g., `_id`) to avoid tie-ordering
- Arrays: ascending uses smallest element, descending uses largest

### Using Stored Source

Retrieve frequently accessed fields directly from the search index instead of the database:

```javascript
db.collection.aggregate([
  {
    $search: {
      index: "search_index",
      text: { query: "detective", path: "plot" },
      returnStoredSource: true  // Retrieve from mongot, not DB
    }
  },
  { $limit: 20 },
  { $match: { rating: { $gte: 7 } } }  // Filter on stored fields
])
```

**Requirements:**
- Fields must be configured in `storedSource` in your index definition
- Dramatically improves performance by avoiding database lookups
- Especially beneficial when filtering or sorting after $search

---

### $match After $search

Minimize blocking stages after `$search` — prefer encapsulating filter logic inside the `$search` stage itself using `compound.filter`. This avoids additional mongod operations and makes full use of the Atlas Search index.

**Prefer `compound.filter` over `$match`** for fields indexed in the search index (string, token, number, date, boolean, objectId, uuid, geo):

```javascript
// Prefer this
{ $search: { compound: { must: [{ text: { ... } }], filter: [{ range: { path: "year", gte: 2000 } }] } } }

// Avoid this where possible
{ $search: { text: { ... } } },
{ $match: { year: { $gte: 2000 } } }
```

**If you must use `$match`** (e.g., for non-indexed or computed fields), use `storedSource` + `returnStoredSource` to avoid a full document lookup in mongod:

```javascript
{ $search: { text: { ... }, returnStoredSource: true } },
{ $match: { storedField: { $exists: true } } }
```

---

## Query Performance Analysis

Use `explain` to analyze query performance:

```javascript
db.collection.explain("executionStats").aggregate([
  { $search: { /* ... */ } }
])
```

**Important:** Atlas Search explain output differs from standard MongoDB explain. It shows execution on the search engine (mongot) side with Lucene-specific statistics, not standard MongoDB execution plans.
