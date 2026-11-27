# Vector Search - Indexing and Querying

**Scope**: This guide covers configuring MongoDB Vector Search indexes and constructing queries for semantic similarity search where the user **brings their own pre-generated embeddings**. For hybrid search (combining lexical and vector search), see `hybrid-search.md`. If the user wants MongoDB to generate and manage embeddings automatically (no embedding code), see `automated-embedding.md` instead.

## Table of Contents

- [Vector Search Index Definition](#vector-search-index-definition)
- [Index Configuration Parameters](#index-configuration-parameters)
- [Filter Fields](#filter-fields)
- [Query Construction](#query-construction)
- [Query Optimization](#query-optimization)

---

## Vector Search Index Definition

### Syntax

MongoDB Vector Search index definitions have the following structure:

```javascript
{
  "fields": [
    {
      "type": "vector",
      "path": "<field-to-index>",
      "numDimensions": <number-of-dimensions>,
      "similarity": "euclidean | cosine | dotProduct",
      "quantization": "none | scalar | binary",  // Optional
      "hnswOptions": {  // Optional (Preview feature)
        "maxEdges": <number-of-connected-neighbors>,
        "numEdgeCandidates": <number-of-nearest-neighbors>
      }
    },
    {
      "type": "filter",  // Optional: for pre-filtering
      "path": "<field-to-index>"
    }
  ]
}
```

**Note**: The exact syntax for creating indexes varies by driver/interface. The above shows the core index definition structure that applies across all methods.

### Basic Definition

Most vector search indexes only need the vector field:

```javascript
{
  "fields": [
    {
      "type": "vector",
      "path": "<embedding-field>",
      "numDimensions": <number>,
      "similarity": "<similarity-function>"
    }
  ]
}
```

---

## Index Configuration Parameters

### Required: numDimensions

**Definition**: Number of dimensions in your vector embeddings. MongoDB enforces this at both index-time and query-time.

**Constraints**:
- Must be less than or equal to 8192
- For int1 (binary) vectors: MUST be a multiple of 8
- For int8 vectors: 1 to 8192
- For float32 vectors: 1 to 8192

**How to Determine**:
- The embedding model determines this value
- It MUST match the actual dimension count of your vectors
- Cannot be changed after index creation (requires dropping and recreating index)

**Example - Voyage AI Models**:
- voyage-3-large: 2048 dimensions
- voyage-4: Configurable output dimensions (256, 512, 1024, 2048, 4096)

---

### Required: similarity

**Definition**: The similarity function used to compare vectors and rank results.

**Available Options**:

| Similarity | Score Formula | Score Range | Best For | Requirements |
|-----------|---------------|-------------|----------|--------------|
| `cosine` | `(1 + cosine(v1,v2)) / 2` | [0, 1] | Most embedding models, normalized vectors | Cannot use zero-magnitude vectors |
| `dotProduct` | `(1 + dotProduct(v1,v2)) / 2` | [0, 1] | **Most efficient** - angle + magnitude | Vectors MUST be normalized to unit length |
| `euclidean` | `1 / (1 + euclidean(v1,v2))` | [0, 1] | Spatial/geometric similarity | **REQUIRED** for int1 (binary) quantized vectors |

**Decision Process**:
1. Check your embedding model documentation for recommended similarity function
2. If model produces normalized vectors -> use `dotProduct` (fastest)
3. If model does NOT normalize vectors -> use `cosine`
4. If using binary quantization (int1) -> MUST use `euclidean`
5. When uncertain -> start with `dotProduct` and normalize your vectors

**Notes**:
- All functions return scores in range [0, 1] where 1 = most similar
- `dotProduct` is most efficient but requires normalized vectors
- Check embedding model documentation for recommendations

---

### Optional: quantization

**Definition**: Automatic vector compression to reduce storage and improve query speed at the cost of some accuracy.

**Syntax**:
```javascript
{
  "type": "vector",
  "path": "<field>",
  "numDimensions": <number>,
  "similarity": "<function>",
  "quantization": "none | scalar | binary"
}
```

**Options**:

| Type | Compression | Accuracy | Storage | Use Case |
|------|-------------|----------|---------|----------|
| `none` | 1x (no compression) | Highest | Full size | Maximum accuracy needed, small datasets (less than 1M vectors) |
| `scalar` | 4x | High | 4x smaller | Good balance for most cases (1M-10M+ vectors) |
| `binary` | 4-8x | Good | Maximum compression | Large datasets (10M+ vectors), speed priority |

**Important Rules**:
- `none`: Default if omitted. Use for pre-quantized vectors (int1, int8)
- `scalar`: Transforms float32/double values to 1-byte integers
- `binary`: Transforms values to single bit. numDimensions MUST be multiple of 8
- Binary quantization REQUIRES `euclidean` similarity
- Only use with float32 or double vectors (NOT with pre-quantized int1/int8)

**Example**:
```javascript
{
  "type": "vector",
  "path": "plot_embedding",
  "numDimensions": 1536,
  "similarity": "cosine",
  "quantization": "scalar"
}
```

---

### Optional: hnswOptions (Preview Feature)

**Definition**: Parameters for the Hierarchical Navigable Small Worlds graph construction algorithm.

**Warning**: Modifying default values might negatively impact your index and queries. Use with caution.

**Syntax**:
```javascript
{
  "type": "vector",
  "path": "<field>",
  "numDimensions": <number>,
  "similarity": "<function>",
  "hnswOptions": {
    "maxEdges": <16-64>,  // Default: 16
    "numEdgeCandidates": <100-3200>  // Default: 100
  }
}
```

**Parameters**:

**maxEdges** (16-64, default: 16):
- Maximum number of connections per node in the graph
- Higher values:
  - Better recall (finds more relevant results)
  - Slower queries (more neighbors to evaluate)
  - More memory usage (more connections stored)
  - Slower indexing (more neighbors to adjust)

**numEdgeCandidates** (100-3200, default: 100):
- Maximum nodes evaluated to find best connections for new nodes
- Higher values:
  - Better graph quality (improves search accuracy)
  - Can negatively affect query latency

**Recommendation**: Leave at defaults unless you have specific performance requirements and understand the trade-offs.

---

## Filter Fields

**Performance**: Filtering before similarity computation is much faster than post-filtering with `$match`.

**Recommendation**: Use pre-filtering whenever possible for best performance. Reserve post-filtering for complex or ad-hoc queries.

### Important Notes for Pre-filtering

**Definition**: Additional fields indexed to enable pre-filtering before vector similarity computation. This narrows the search scope and improves performance.
**Use Case**: You have multi-tenant data that needs isolation or you need to filter by specific criteria (e.g., category, date range, user ID), by exact values (category = "Action"), or by range (year >= 2020) BEFORE computing vector similarity.
**Supported Field Types**: boolean, date, objectId, numeric (int32, int64, double), string, UUID, and arrays of these types.
**Requirements**: You must add fields as type "filter" in your index definition to use them in the filter option. Fields not indexed cannot be used for pre-filtering.
**Supported Filter Operators**: $eq, $ne, $gt, $lt, $gte, $lte, $in, $nin, $exists, $and, $or, $not, $nor
**Pre-filtering does NOT affect scores**: The vectorSearchScore returned for documents is based only on vector similarity, not on how well they matched the filter criteria.

---

### Syntax

```javascript
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1024,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "category"  // String field for filtering
    },
    {
      "type": "filter",
      "path": "year"  // Numeric field for filtering
    }
  ]
}
```

---

### Pre-Filter Examples

**Index with filter fields**:
```javascript
{
  "fields": [
    {
      "type": "vector",
      "path": "plot_embedding",
      "numDimensions": 2048,
      "similarity": "dotProduct"
    },
    {
      "type": "filter",
      "path": "genres"  // String or array of strings
    },
    {
      "type": "filter",
      "path": "year"  // Numeric field
    }
  ]
}
```

**Query with single filter**:
```javascript
{
  $vectorSearch: {
    queryVector: [<array-of-numbers>],
    path: "plot_embedding",
    filter: {
      genres: { $eq: "Action" }
    },
    numCandidates: 150,
    limit: 10
  }
}
```

**Query with multiple filters using $and**:
```javascript
{
  $vectorSearch: {
    queryVector: [<array-of-numbers>],
    path: "plot_embedding",
    filter: {
      $and: [
        { genres: "Action" },
        { year: { $gte: 2020 } }
      ]
    },
    numCandidates: 150,
    limit: 10
  }
}
```

**Short form of $eq** (recommended):
```javascript
{
  $vectorSearch: {
    queryVector: [<array-of-numbers>],
    path: "plot_embedding",
    filter: {
      genres: "Action",  // Equivalent to { genres: { $eq: "Action" } }
      year: { $gte: 2020 }
    },
    numCandidates: 150,
    limit: 10
  }
}
```

---

### Important Notes for Post-Filtering

**Definition**: Filtering after vector similarity computation. 
**Use Case**: Use post-filtering when you need to filter by criteria that are not known until query time, or when you need to combine vector search with other aggregation stages. No need to index fields.
**Advantages**: More flexible, can combine with other aggregation stages, no need to index fields.
**Performance**: Slower than pre-filtering, computes similarity for all candidates first.

---

### Post-Filter Examples

**Post-filtering with $match**

For ad-hoc filters or complex logic not indexed as filter fields, use `$match` after `$vectorSearch`:

```javascript
db.collection.aggregate([
  {
    $vectorSearch: {
      index: "vector_index",
      path: "plot_embedding",
      queryVector: [<array>],
      numCandidates: 150,
      limit: 50  // Get more candidates for post-filtering
    }
  },
  {
    $match: {
      category: "Electronics",
      "reviews.rating": { $gte: 4.5 }  // Complex nested field
    }
  },
  { $limit: 10 }
])
```

---

## Query Construction

### $vectorSearch Stage

**Definition**: The `$vectorSearch` stage performs semantic search for a query vector on indexed vector fields. It must be the first stage in an aggregation pipeline.

**Requirements**:
- Atlas cluster running MongoDB v6.0.11, v7.0.2, or later
- A vector search index on the collection with vector-type fields
- `$vectorSearch` MUST be the first stage in the pipeline

---

### Basic Query Syntax

```javascript
{
  "$vectorSearch": {
    "index": "<index-name>",
    "path": "<field-to-search>",
    "queryVector": [<array-of-numbers>],
    "numCandidates": <number-of-candidates>,
    "limit": <number-of-results>,
    "filter": {<filter-specification>},  // Optional
    "exact": true | false  // Optional
  }
}
```

---

### Required Fields

**index** (String, Required):
- Name of the MongoDB Vector Search index to use
- MongoDB returns no results if the index name is misspelled or doesn't exist
- Must match the name specified when creating the index

**path** (String, Required):
- Name of the indexed vector field to search
- Must be a field indexed as type "vector" in your index definition
- Use dot notation for nested fields (e.g., "metadata.embedding")

**queryVector** (Array of Numbers, Required):
- Array of numbers representing your query vector
- Can be float32, BSON BinData float32, or BSON BinData int1/int8
- Array size MUST match numDimensions specified in the index
- You must use the same embedding model that generated the indexed vectors

**limit** (Integer, Required):
- Number of documents to return in results
- Must be an integer value
- Cannot exceed numCandidates if numCandidates is specified

---

### Conditional Fields

**numCandidates** (Integer, Conditional):
- Number of nearest neighbors to use during ANN search
- Required if `exact` is false or omitted
- Must be less than or equal to 10000
- Cannot be less than `limit`
- Recommended: Set to at least 20x the `limit` value for good recall

**Example**:
```javascript
{
  $vectorSearch: {
    queryVector: [<array>],
    path: "embedding",
    numCandidates: 150,  // 15x the limit
    limit: 10
  }
}
```

---

### Optional Fields

**filter** (Object, Optional): See Filter Fields section for details and examples

**exact** (Boolean, Optional):
- Set to `true` for ENN (Exact Nearest Neighbor) search
- Set to `false` or omit for ANN (Approximate Nearest Neighbor) search
- Default: false

**ENN vs ANN**:
- **ANN (default)**: Faster, uses HNSW algorithm, good for large datasets, 90-95% recall
- **ENN**: Exhaustive search, guaranteed exact matches, slower, use for small datasets (less than 10K docs) or measuring accuracy baseline

---

### Complete Query Examples

**Basic ANN query**:
```javascript
db.collection.aggregate([
  {
    $vectorSearch: {
      index: "vector_index",
      path: "plot_embedding",
      queryVector: [<1536-dimension-array>],
      numCandidates: 150,
      limit: 10
    }
  },
  {
    $project: {
      _id: 0,
      title: 1,
      plot: 1,
      score: { $meta: "vectorSearchScore" }
    }
  }
])
```

**ANN query with pre-filtering**:
```javascript
db.collection.aggregate([
  {
    $vectorSearch: {
      index: "vector_index",
      path: "plot_embedding",
      queryVector: [<2048-dimension-array>],
      filter: {
        $and: [
          { year: { $gte: 1955 } },
          { year: { $lt: 1975 } }
        ]
      },
      numCandidates: 150,
      limit: 10
    }
  },
  {
    $project: {
      _id: 0,
      title: 1,
      year: 1,
      score: { $meta: "vectorSearchScore" }
    }
  }
])
```

**ENN query (exact search)**:
```javascript
db.collection.aggregate([
  {
    $vectorSearch: {
      index: "vector_index",
      path: "plot_embedding",
      queryVector: [<2048-dimension-array>],
      exact: true,
      limit: 10
    }
  },
  {
    $project: {
      _id: 0,
      title: 1,
      score: { $meta: "vectorSearchScore" }
    }
  }
])
```

---

### Retrieving Vector Search Scores

Use `$meta: "vectorSearchScore"` in a `$project` stage to include similarity scores:

```javascript
{
  $project: {
    title: 1,
    score: { $meta: "vectorSearchScore" }
  }
}
```

**Important**:
- Scores are in range [0, 1] where 1 = most similar
- You can ONLY use `vectorSearchScore` after a `$vectorSearch` stage

## Query Optimization

### numCandidates Tuning

**Definition**: The `numCandidates` parameter controls the trade-off between recall (finding relevant results) and query performance in ANN searches.

**Rule of Thumb**: A good starting point is 20x your `limit` value. You can adjust between 10-20x (or higher) based on your recall and performance requirements.

**Example**:
```javascript
{
  $vectorSearch: {
    queryVector: [<array>],
    path: "embedding",
    numCandidates: 200,  // 20x the limit — good starting point; tune between 10-50x based on recall and latency requirements
    limit: 10
  }
}
```

---

### When to Adjust numCandidates

**Increase when**:
- Search results miss relevant documents
- Large dataset (millions of vectors)
- Using quantized vectors (int8 or int1)
- Heavy pre-filtering is applied

**Decrease when**:
- Queries are too slow and results are already good
- Small dataset (thousands of vectors)
- Speed is more important than perfect recall

**Note on low limit values**: A very low limit (e.g., 5) may need proportionally higher numCandidates (e.g., 40x) to maintain recall.

### Test and Measure

- Start with 20x limit and run sample queries
- Check result quality and query latency
- Adjust up or down based on your accuracy vs performance requirements

---

### ANN vs ENN Search

**ANN (Approximate Nearest Neighbor)**:
- Default search method
- Uses HNSW algorithm for fast approximate search
- Typically 90-95% recall (finds 90-95% of exact matches)
- Much faster than ENN for large datasets
- Requires `numCandidates` parameter

**Use ANN when**:
- You have production queries
- Dataset is large (more than 10K documents)
- 90-95% recall is acceptable
- Query speed is important

**ENN (Exact Nearest Neighbor)**:
- Exhaustive search of all indexed vectors
- Guaranteed to find exact best matches
- Much slower than ANN
- Set `exact: true` in query
- Does NOT require `numCandidates` parameter
- Uses full-fidelity vectors even when quantization is enabled

**Use ENN when**:
- Measuring accuracy baseline (ground truth for testing)
- Collection has less than 10K documents
- Very selective filters (less than 5% of data matches)
- You need guaranteed best matches

### Parallel Query Execution

MongoDB Vector Search parallelizes query execution across segments when running on dedicated search nodes, which can improve response time for queries on large datasets.

**Notes**:
- Works automatically on dedicated search nodes
- High-CPU systems provide more performance improvement
- Not guaranteed for every query (e.g., when too many concurrent queries are queued)
- May cause slight inconsistencies in results for successive identical queries

**If you see inconsistent results**: Increase `numCandidates` to improve consistency.

---

### Best Practices Summary

1. **Start with numCandidates = 20x limit**: Provides good balance of recall and performance
2. **Use pre-filtering when possible**: Index filter fields for known filtering criteria
3. **Choose appropriate similarity function**: Match your embedding model's recommendations
4. **Consider quantization for large datasets**: Use scalar or binary quantization for 10M+ vectors
5. **Use ANN for production**: Reserve ENN for testing/small datasets
6. **Test with your data**: Run sample queries and measure recall vs latency
7. **Monitor and adjust**: Use query performance metrics to tune numCandidates
8. **Match query vectors to index**: Use the same embedding model and dimensions

---

## Vector Search on Views

Version requirements, supported stages, limitations, and troubleshooting are identical to Atlas Search on Views — see `lexical-search-indexing.md`. The difference is using a `vectorSearch`-type index and querying with `$vectorSearch`.

**Example: partial index (exclude documents without embeddings)**
```javascript
db.createView("moviesWithEmbeddings", "embedded_movies", [
  {
    $match: {
      $expr: { $ne: [{ $type: "$plot_embedding_voyage_3_large" }, "missing"] }
    }
  }
])

db.moviesWithEmbeddings.createSearchIndex(
  "embeddingsIndex",
  "vectorSearch",
  {
    "fields": [
      {
        "type": "vector",
        "numDimensions": 2048,
        "path": "plot_embedding_voyage_3_large",
        "similarity": "cosine"
      }
    ]
  }
)

// 8.1+: query view directly; 8.0: query source collection using index name
db.moviesWithEmbeddings.aggregate([
  {
    $vectorSearch: {
      index: "embeddingsIndex",
      path: "plot_embedding_voyage_3_large",
      queryVector: [<query-vector-2048-dimensions>],
      numCandidates: 100,
      limit: 10
    }
  }
])
```

---
