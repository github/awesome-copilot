# Lexical Search - Indexing

This guide covers how to configure MongoDB Atlas Search indexes. Use this reference to build index definitions with proper field types, analyzers, mappings, and optimization settings.

## Table of Contents

- [Atlas Search Index Definition](#atlas-search-index-definition)
- [Analyzer Selection](#analyzer-selection)
- [Field Types](#field-types)
- [Dynamic vs Explicit Mappings](#dynamic-vs-explicit-mappings)
- [Stored Source](#stored-source)
- [Synonyms](#synonyms)

---

## Atlas Search Index Definition

### Syntax

```javascript
{
  "analyzer": "<analyzer-for-index>",
  "searchAnalyzer": "<analyzer-for-query>",
  "mappings": {
    "dynamic": <boolean> | {
      "typeSet": "<typeSet-name>"
    },
    "fields": {
      <field-definition>
    }
  },
  "numPartitions": <integer>,
  "analyzers": [ <custom-analyzer> ],
  "storedSource": <boolean> | {
    <stored-source-definition>
  },
  "synonyms": [
    {
      <synonym-mapping-definition>
    }
  ],
  "typeSets": [
    {
      "types": [
        {<field-types-definition>}
      ]
    }
  ]
}
```

### Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `analyzer` | String | Optional | Specifies the analyzer to apply to string fields when indexing. If set only at the top level and not specified for individual fields, applies to all fields. If omitted, defaults to Standard Analyzer. |
| `searchAnalyzer` | String | Optional | Specifies the analyzer to apply to query text before searching. If omitted, defaults to the `analyzer` option. If both omitted, defaults to Standard Analyzer. |
| `mappings` | Object | Required | Specifies how to index fields at different paths for this index. |
| `mappings.dynamic` | Boolean or Object | Optional | Enables dynamic mapping of field types or configures fields individually. Set to `true` to recursively index all indexable field types, `false` to only index fields specified in `mappings.fields`, or specify a `typeSet` for configurable dynamic indexing. If omitted, defaults to `false`. **Note:** Dynamic indexing automatically and recursively indexes all nested documents unless explicitly disabled. |
| `mappings.dynamic.typeSet` | String | Optional | References the name of the `typeSets` object that contains the list of field types to automatically and recursively index. Mutually exclusive with `mappings.dynamic` boolean flag. |
| `mappings.fields` | Object | Conditional | Specifies the fields that you want to index. Required only if `dynamic` is `false`. You can't index fields that contain the dollar ($) sign at the start of the field name. |
| `numPartitions` | Integer | Optional | Specifies the number of sub-indexes to create if the document count exceeds two billion. Valid values: 1, 2, 4. If omitted, defaults to 1. Requires search nodes deployed in your cluster. |
| `analyzers` | Array of Custom Analyzers | Optional | Specifies the custom analyzers to use in this index. Reference by name in `analyzer`, `searchAnalyzer`, or field-level analyzer options. |
| `storedSource` | Boolean or Object | Optional | Specifies fields in documents to store for query-time look-ups using `returnStoredSource`. Can be `true` (store all fields), `false` (store no fields), or an object specifying fields to include/exclude. Available on clusters running MongoDB 7.0+. If omitted, defaults to `false`. |
| `synonyms` | Array of Synonym Mapping Definition | Optional | Specifies synonym mappings to use in your index. An index definition can have only one synonym mapping. |
| `typeSets` | Array of Objects | Optional | Specifies the typeSets to use for dynamic mappings. |
| `typeSets.[n].name` | String | Required | Specifies the name of the typeSet configuration. |
| `typeSets.[n].types` | Array of Objects | Required | Specifies the field types to index automatically using dynamic mappings. |
| `typeSets.[n].types.[n].type` | String | Required | Specifies the field type to automatically index (e.g., "string", "number", "date"). |

### Basic Definition

Most indexes only need the mappings configuration:

```javascript
{
  "mappings": {
    "dynamic": <boolean> | { <typeSet-definition> },
    "fields": { <field-definition> }
  }
}
```

---

## Analyzer Selection

The analyzer determines how text is processed for indexing and searching.

**Default behavior:** Most queries don't specify an analyzer and use MongoDB's default **standard analyzer**, which:
- Divides text into terms based on word boundaries (language-neutral)
- Converts terms to lowercase and removes punctuation
- Recognizes email addresses, acronyms, CJK characters, alphanumerics, and more

**Common built-in analyzers:**

| Analyzer | Use Case | Example |
|----------|----------|---------|
| `lucene.standard` | General text search (default) | "The quick brown fox" → ["quick", "brown", "fox"] |
| `lucene.simple` | Lowercase, no special chars | "Hello-World!" → ["hello", "world"] |
| `lucene.keyword` | Exact matching, facets | "Action" → ["Action"] |
| `lucene.whitespace` | Split on spaces only | "first-class" → ["first-class"] |
| Language-specific | Stemming, stop words | `lucene.english`, `lucene.spanish` |

---

### Index Analyzer (Applied at Index Time)

Specify per-field or top-level for all fields:

```javascript
// Field-level (add to mappings.fields):
{
  "title": {
    "type": "string",
    "analyzer": "lucene.standard"  // Or omit to use default
  },
  "category": {
    "type": "token"   // Exact matching — use token, not string with lucene.keyword
  }
}

// Top-level (applies to all fields unless overridden):
{
  "analyzer": "lucene.standard",
  "mappings": {
    "fields": {
      "title": { "type": "string" }  // Uses top-level analyzer
    }
  }
}
```

---

### Search Analyzer (Applied at Query Time)

Apply different analysis to queries than to indexed content:

```javascript
// Top-level searchAnalyzer:
{
  "searchAnalyzer": "lucene.simple",  // Query-time analyzer
  "mappings": {
    "fields": {
      "description": {
        "type": "string",
        "analyzer": "lucene.standard"  // Index-time analyzer
      }
    }
  }
}
```

**Use case:** Index with standard analysis, but search with simpler/synonym-aware analyzer.

If omitted, uses the index `analyzer`. If both omitted, defaults to `lucene.standard`.

---

### Multi Analyzer (Alternate Analyzers for Same Field)

Index the same field with multiple analyzers:

```javascript
// Field configuration (add to mappings.fields):
{
  "title": {
    "type": "string",
    "analyzer": "lucene.standard",  // Default analyzer
    "multi": {
      "keywordAnalyzer": {
        "type": "string",
        "analyzer": "lucene.keyword"  // Alternate analyzer
      }
    }
  }
}
```

**Use case:** Support both fuzzy matching and exact matching on the same field.

To query using the alternate analyzer, specify the path as `fieldName.alternateAnalyzerName` (e.g., `title.keywordAnalyzer`).

---

### Custom Analyzers

Define custom tokenization and filtering:

```javascript
// Index definition with custom analyzer:
{
  "analyzers": [
    {
      "name": "customAnalyzer",
      "tokenizer": {
        "type": "standard"
      },
      "charFilters": [],
      "tokenFilters": [
        { "type": "lowercase" },
        { "type": "stop", "tokens": ["the", "a", "an"] }
      ]
    }
  ],
  "mappings": {
    "fields": {
      "content": {
        "type": "string",
        "analyzer": "customAnalyzer"  // Reference custom analyzer
      }
    }
  }
}
```

**Use case:** Need specific tokenization or filtering not provided by built-in analyzers.

---

### Normalizers (Token Type Only)

Normalizers produce a single token (used with `token` field type):

```javascript
// Field configuration (add to mappings.fields):
{
  "username": {
    "type": "token",
    "normalizer": "lowercase"  // Options: "lowercase", "none"
  }
}
```

**Normalizers:**
- `lowercase`: Transforms to lowercase, creates single token
- `none`: No transformation, creates single token

**Use case:** Exact matching with case normalization for token fields.

---

### Decision Guide

- **lucene.standard** (or omit): Default for most text fields
- **lucene.keyword**: Categories, tags
- **Language-specific**: When you know the content language
- **searchAnalyzer**: Different analysis for queries vs indexed content (e.g., synonyms)
- **multi**: Support multiple search patterns on same field
- **Custom**: Need specific tokenization/filtering logic
- **Normalizers**: Token fields requiring case normalization

---

## Field Types

**Dynamic mapping includes:** boolean, date, number, objectId, string, uuid
**Must configure explicitly:** autocomplete, token, geo, embeddedDocuments, vector

### Quick Reference

| Type | When to Use | Required Fields | Optional Fields (with valid values) | Notes |
|------|-------------|-----------------|-------------------------------------|-------|
| **string** | Full-text search, phrase matching, fuzzy search | type | analyzer, searchAnalyzer, indexOptions: "docs" or "freqs" or "positions" or "offsets", store: true or false, multi | Default for text. For sorting use token instead. |
| **token** | Sort/facet on text, exact matching | type | normalizer: "lowercase" or "none" (default: "none") | Required for sorting or faceting strings. Max 8181 chars. |
| **autocomplete** | Search-as-you-type, typeahead, partial or substring matching | type | analyzer, tokenization: "edgeGram" or "rightEdgeGram" or "nGram" (default: "edgeGram"), minGrams (default: 2), maxGrams (default: 15), foldDiacritics: true or false | Not included in "dynamic: true". Recommend maxGrams ≤ 15. |
| **boolean** | True/false filters | type | None | Included in "dynamic: true". |
| **date** | Date ranges, timestamps | type | None | Included in "dynamic: true". |
| **number** | Numeric queries, ranges, sorting | type | representation: "int64" or "double" (default: "double"), indexIntegers: true or false, indexDoubles: true or false | Included in "dynamic: true". Use int64 for large integers. |
| **objectId** | Query by _id | type | None | Included in "dynamic: true". Standard MongoDB ObjectIds. |
| **uuid** | UUID identifiers | type | None | Included in "dynamic: true". BSON Binary Subtype 4. |
| **geo** | Location search, geographic queries | type | indexShapes: true or false (default: false) | Included in "dynamic: true". Requires GeoJSON. Set indexShapes=true for polygons. |
| **embeddedDocuments** | Search in arrays of objects, independent scoring | type | dynamic: true or false or {typeSet: "name"} (default: false), fields, storedSource: true or false or {include/exclude} | Not included in "dynamic: true". Max 5 nesting levels. Each nested document counts toward 2.1B limit. |
| **vector** | Lexical prefilters for semantic search | type, numDimensions (1-8192), similarity: "cosine" or "dotProduct" or "euclidean" | quantization: "none" or "scalar" or "binary" (default: "none"), hnswOptions.maxEdges: 16-64, hnswOptions.numEdgeCandidates: 100-3200 | Not included in "dynamic: true". For hybrid search. See vector-search.md and hybrid-search.md. |

**Field definition structure:**
```javascript
{
  "mappings": {
    "fields": {
      "<field-name>": {
        "type": "<field-type>",
        // type-specific options here
      }
    }
  }
}
```

**Multiple types on same field:**
```javascript
"<field-name>": [
  { "type": "string" },
  { "type": "token", "normalizer": "lowercase" }
]
```

**Arrays:** MongoDB Search automatically flattens arrays during indexing. Specify only the element type, not that it's an array.

---

## Dynamic vs Explicit Mappings

**Choose based on user's needs:**

**Use dynamic (true)** when:
- User is prototyping or exploring data with unknown schema
- Need to get started quickly without defining all fields
- All or most fields need to be searchable
- Accept larger index size and slower performance for convenience

**Use explicit (dynamic: false)** (recommended for production) when:
- User has completed early stages of prototyping and knows exactly which fields to search
- Performance and index size are priorities
- Schema is stable and well-defined
- Only a subset of fields need to be searchable

**Use typeSets (recommended for production)** when:
- User wants automatic indexing but with control over which types
- Document schema is dynamic and new fields need to be indexed automatically without an index rebuild
- Want different indexing strategies for different nested documents
- Balance between convenience and performance is important

---

**Dynamic mappings** automatically index all fields:
```javascript
{
  "mappings": {
    "dynamic": true  // Index everything
  }
}
```
- **Pros**: Quick setup, works immediately
- **Cons**: Larger index, slower queries, wastes resources on unused fields

**Explicit mappings** define exactly what to index:
```javascript
{
  "mappings": {
    "dynamic": false,  // Only index specified fields
    "fields": {
      "title": { "type": "string" },
      "genre": { "type": "token" }
    }
  }
}
```
- **Pros**: Smaller index, faster queries, precise control
- **Cons**: Requires knowing your schema

**Configurable dynamic with typeSets** (recommended middle ground):
```javascript
{
  "mappings": {
    "dynamic": {
      "typeSet": "customTypes"
    },
    "fields": {
      "metadata": {
        "type": "document",
        "dynamic": {
          "typeSet": "metadataTypes"
        }
      }
    }
  },
  "typeSets": [
    {
      "name": "customTypes",
      "types": [
        { "type": "string" },
        { "type": "number" }
      ]
    },
    {
      "name": "metadataTypes",
      "types": [
        {
          "type": "string",
          "analyzer": "lucene.standard"
        }
      ]
    }
  ]
}
```
- **Pros**: Automatically indexes specified field types, more control than full dynamic, can configure different typeSets for sub-documents
- **Cons**: Still indexes all fields of specified types

**Recommendation:** Use static mappings or a dynamic typeSet (within a specific path, not at the root document level) in production for optimized index size and performance.

---

## Stored Source

Store frequently accessed fields directly in the search index (mongot) to avoid full document lookups from the database. This dramatically improves query performance, especially when filtering or sorting.

**Requirements:**
- Available on clusters running MongoDB 7.0+
- Stored fields must still be indexed separately to query them
- Retrieve stored fields at query time using returnStoredSource: true (see lexical-search-querying.md)

**Syntax:**
```javascript
{
  "storedSource": true | false | {
    "include" | "exclude": ["<field-name>", ...]
  }
}
```

**Options:**

true - Store all fields in documents. Not supported if index contains vector type field. Can significantly impact performance.

false - Don't store any fields (default behavior).

{ "include": [...] } - Store only specified fields. MongoDB Search also stores _id by default. List field names or dot-separated paths.

{ "exclude": [...] } - Store all fields except specified ones.

**Examples:**

**Store specific fields:**
```javascript
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": { "type": "string" },
      "genre": { "type": "token" },
      "year": { "type": "number" },
      "rating": { "type": "number" }
    }
  },
  "storedSource": {
    "include": ["title", "genre", "year", "rating"]
  }
}
```

**Exclude specific fields:**
```javascript
{
  "storedSource": {
    "exclude": ["largeTextField", "unusedField"]
  }
}
```

**Store all fields:**
```javascript
{
  "storedSource": true
}
```

**When to use:**
- Fields used for filtering, sorting, or projection after $search
- Frequently accessed fields in search results
- When avoiding database lookups is critical for performance

**When NOT to use:**
- Very large text fields (increases index size significantly)
- Fields rarely used in queries
- When index size is a concern

**Note:** For using stored source at query time, see lexical-search-querying.md. For vector field storage considerations, see vector-search.md.

---

## Synonyms

Use when user wants query expansion with equivalent terms (e.g., "car" also finds "automobile", "vehicle").

**Agent Workflow:**

1. **Ask user to create synonym collection** in the same database as their indexed collection.

2. **Provide synonym document format** based on user's needs:

**For bidirectional synonyms** (all terms interchangeable):
```javascript
db.synonyms.insertMany([
  {
    "mappingType": "equivalent",
    "synonyms": ["car", "vehicle", "automobile"]
  },
  {
    "mappingType": "equivalent",
    "synonyms": ["happy", "joyful", "glad"]
  }
])
```

**For one-way synonyms** (input maps to synonyms only):
```javascript
db.synonyms.insertMany([
  {
    "mappingType": "explicit",
    "input": ["pants"],
    "synonyms": ["trousers", "slacks"]
  }
])
```

3. **Add synonym mapping to index definition:**

```javascript
{
  "mappings": {
    "fields": {
      "<field-name>": {
        "type": "string",
        "analyzer": "lucene.standard"  // Note the analyzer
      }
    }
  },
  "synonyms": [
    {
      "name": "<synonym-mapping-name>",
      "analyzer": "lucene.standard",  // Must match field analyzer
      "source": {
        "collection": "<synonym-collection-name>"
      }
    }
  ]
}
```

**Critical Rules:**
- Synonym mapping analyzer MUST match the field analyzer being queried
- Only one synonym mapping allowed per index
- Changes to synonym collection auto-update (no reindex needed)
- Works only with text and phrase operators

**Example:**
If user wants "car" to also find "vehicle" and "automobile":
1. Tell user to create collection: db.synonyms.insertOne({ "mappingType": "equivalent", "synonyms": ["car", "vehicle", "automobile"] })
2. Add to index with analyzer matching the field being searched
3. Queries automatically expand (user searches "car", MongoDB Search searches: car OR vehicle OR automobile)

---

## Searching on Views

**Requires MongoDB 8.0+.** Create Atlas Search indexes on Views to partially index a collection, transform documents, or support incompatible data types.

**Note**: Programmatic index creation via `mongosh`/driver methods requires **8.1+**. On 8.0, also note that queries must run against the **source collection** referencing the view's index name. On 8.1+, you can query the view directly.

**Supported view stages**: `$addFields`, `$set`, `$match` with `$expr` only.

**Key limitations**:
- Index names must be unique across source collection and all its views
- No operators producing dynamic results (e.g., `$USER_ROLES`, `$rand`)
- Queries return original source documents. Use `storedSource` to retrieve transformed fields

**Example: partial index (filter documents)**
```javascript
db.createView("movies_After2000", "movies", [
  { $match: { $expr: { $gt: ["$released", ISODate("2000-01-01")] } } }
])

db.movies_After2000.createSearchIndex(
  "after2000Index",
  { "mappings": { "dynamic": true } }
)

// 8.1+: query view directly; 8.0: query source collection using index name
db.movies_After2000.aggregate([
  { $search: { index: "after2000Index", text: { path: "title", query: "<query>" } } }
])
```

**Editing a view**: Use `collMod`. MongoDB Search auto-reindexes on view definition changes with no downtime.

**Performance**: Complex transformations slow performance. For heavy transformations consider a materialized view, or query the source collection directly.

**Troubleshooting**:
- Index goes **FAILED**: view is incompatible with Search, or source collection was removed/changed
- Index goes **STALE**: view's pipeline fails on a document. Index remains queryable while STALE; returns to READY after fixing the document or view definition
- **`$search is only valid as first stage`** error: you're on MongoDB 8.0 querying the view directly. Query the source collection instead, or upgrade to 8.1+
