# Hybrid Search

**Scope**: This guide covers hybrid search patterns in MongoDB Atlas: combining vector and lexical search using `$rankFusion` and `$scoreFusion`, and using lexical prefilters with the `vectorSearch` operator inside `$search`. For pure vector search indexes and `$vectorSearch` query construction, see `vector-search.md`. For lexical index definitions and query patterns, see `lexical-search-indexing.md` and `lexical-search-querying.md`. For automated embedding (`autoEmbed`) index and query syntax used inside a hybrid pipeline, see `automated-embedding.md`.

## Table of Contents

- [Overview](#overview)
- [Choosing the Right Approach](#choosing-the-right-approach)
- [Indexing for Hybrid Search](#indexing-for-hybrid-search)
- [$rankFusion](#rankfusion)
- [$scoreFusion](#scorefusion)
- [Lexical Prefilters (vectorSearch Operator)](#lexical-prefilters-vectorsearch-operator)
- [Best Practices and Limitations](#best-practices-and-limitations)

---

## Overview

Hybrid search combines multiple search methods on the same collection and merges the results into a single ranked or scored list.

**Three patterns covered in this guide:**

| Pattern | Stage / Operator | Use When |
|---|---|---|
| Rank-based fusion | `$rankFusion` | Document position matters; use RRF algorithm |
| Score-based fusion | `$scoreFusion` | Score magnitude matters; need custom math or normalization |
| Lexical prefilter | `$search` + `vectorSearch` operator | Need fuzzy/phrase/wildcard/compound pre-filtering before vector search |

**$rankFusion vs $scoreFusion:**
- `$rankFusion` ranks by position in each input pipeline using the Reciprocal Rank Fusion (RRF) algorithm. A document ranked #1 in multiple pipelines scores much higher than one ranked #1 in only one. Weights influence how much each pipeline's rank contributes.
- `$scoreFusion` ranks by the actual score values from each pipeline. Supports normalization (sigmoid, minMaxScaler) and custom combination expressions. Use when score magnitude, not just ordering, matters.

---

## Choosing the Right Approach

| Scenario | Recommended Approach |
|---|---|
| Combine lexical + vector, rank by position | `$rankFusion` |
| Combine lexical + vector, control score math or normalization | `$scoreFusion` |
| Multiple query vectors or embedding models on same collection | `$rankFusion` with multiple `$vectorSearch` pipelines |
| Pre-filter vector search with fuzzy, phrase, wildcard, or compound | `$search` + `vectorSearch` operator |
| Pre-filter vector search with simple equality or range | `filter` fields in `$vectorSearch` (see vector-search.md) |
| Cross-collection hybrid search | `$unionWith` + `$vectorSearch` (not `$rankFusion`/`$scoreFusion`) |
| Combine lexical + semantic search without writing embedding code | `$rankFusion` or `$scoreFusion` with an `autoEmbed`-type `$vectorSearch` pipeline (see automated-embedding.md) |

**Version requirements**: `$rankFusion` requires MongoDB 8.0+. `$scoreFusion` requires MongoDB 8.3+. Only proceed with this guide if the use case is lexical prefilters, or if the cluster meets the version requirement for the fusion stage of interest. Otherwise do not proceed — inform the user the feature is unavailable and suggest upgrading, and offer to help them build the individual lexical or vector search components separately in the meantime.

---

## Indexing for Hybrid Search

### For $rankFusion and $scoreFusion

You need two separate indexes on the collection:

**1. A vectorSearch-type index** for the `$vectorSearch` input pipeline:
```javascript
db.collection.createSearchIndex(
  "<vector-index-name>",
  "vectorSearch",
  {
    "fields": [
      {
        "type": "vector",
        "path": "<embedding-field>",
        "numDimensions": <number>,
        "similarity": "dotProduct"
      }
    ]
  }
)
```

**2. A search-type index** for the `$search` input pipeline:
```javascript
db.collection.createSearchIndex(
  "<search-index-name>",
  {
    "mappings": { "dynamic": true }
  }
)
```

**Using automated embedding instead:** If you want MongoDB to generate and manage the embeddings rather than supplying your own, create an `autoEmbed`-type vectorSearch index instead of the `vector`-type index shown above. See `automated-embedding.md` for the index definition and query syntax — the fusion-stage rules below apply the same way regardless of which index type backs the vector pipeline.

---

### For Lexical Prefilters (vectorSearch Operator)

The `vectorSearch` operator runs inside `$search`, so you need a **single search-type index** that includes a `vector` field type. This is different from a vectorSearch-type index — you cannot use the `$vectorSearch` stage to query fields indexed this way.

```javascript
db.collection.createSearchIndex(
  "<search-index-name>",
  {
    "mappings": {
      "dynamic": true,
      "fields": {
        "<embedding-field>": {
          "type": "vector",
          "numDimensions": <number>,
          "similarity": "dotProduct",
          "quantization": "scalar"  // Optional
        }
      }
    }
  }
)
```

**Note**: `storedSource: true` is not supported on indexes that contain a `vector` field type. Use `include` or `exclude` to specify stored fields explicitly.

---

## Common Rules for Fusion Stages

The following rules apply to both `$rankFusion` and `$scoreFusion`.

**Pipeline naming restrictions**: Pipeline names must not be empty, start with `$`, contain the null character `\0`, or contain `.`

**Not allowed inside input pipelines**: `$project` or `storedSource` fields. Apply modifications (`$project`, `$addFields`, `$set`) in stages after the fusion stage.

---

## $rankFusion

`$rankFusion` executes all input pipelines independently, de-duplicates results, and ranks them using the Reciprocal Rank Fusion (RRF) algorithm. Documents appearing highly ranked in multiple pipelines score highest.

### Syntax

```javascript
{
  $rankFusion: {
    input: {
      pipelines: {
        <pipelineName1>: [ <stages> ],
        <pipelineName2>: [ <stages> ],
        ...
      }
    },
    combination: {
      weights: {
        <pipelineName1>: <number>,
        <pipelineName2>: <number>
      }
    },
    scoreDetails: <boolean>  // Default: false
  }
}
```

### Fields

| Field | Type | Description |
|---|---|---|
| `input.pipelines` | Object | Map of pipeline names to aggregation stages. At least one required. |
| `combination.weights` | Object | Optional. Per-pipeline weights (non-negative numbers). Default weight is 1. |
| `scoreDetails` | Boolean | Optional. If true, populates `$meta: "scoreDetails"` per document. Default false. |

### RRF Formula

For each document, the RRF score is:

```
RRFscore(d) = sum over all pipelines of: weight * (1 / (60 + rank_of_d_in_pipeline))
```

The constant 60 is a sensitivity parameter set by MongoDB and cannot be changed. Documents not present in a pipeline do not contribute a term for that pipeline.

### Input Pipeline Restrictions

See [Common Rules](#common-rules-for-fusion-stages) for naming and modification restrictions. Allowed stages: `$search`, `$vectorSearch`, `$match`, `$geoNear`, `$sample`, `$sort`, `$skip`, `$limit`.

The ordering requirement is satisfied if the pipeline begins with `$search`, `$vectorSearch`, or `$geoNear`, or contains an explicit `$sort`.

---

### Example 1: Basic Hybrid (Vector + Lexical, Equal Weights)

```javascript
db.embedded_movies.aggregate([
  {
    $rankFusion: {
      input: {
        pipelines: {
          vectorPipeline: [
            {
              $vectorSearch: {
                index: "<vector-index-name>",
                path: "plot_embedding",
                queryVector: [<query-vector-2048-dimensions>],
                numCandidates: 100,
                limit: 20
              }
            }
          ],
          textPipeline: [
            {
              $search: {
                index: "<search-index-name>",
                text: {
                  query: "<query-term>",
                  path: "title"
                }
              }
            },
            { $limit: 20 }
          ]
        }
      }
    }
  },
  { $limit: 10 }
])
```

**Note**: `$search` does not auto-limit results — always add `$limit` inside the `$search` input pipeline.

---

### Example 2: Weighted Hybrid (Boosting One Pipeline)

Assign higher weight to the pipeline whose ranking should contribute more to the final score:

```javascript
db.embedded_movies.aggregate([
  {
    $rankFusion: {
      input: {
        pipelines: {
          vectorPipeline: [
            {
              $vectorSearch: {
                index: "<vector-index-name>",
                path: "plot_embedding",
                queryVector: [<query-vector-2048-dimensions>],
                numCandidates: 100,
                limit: 20
              }
            }
          ],
          textPipeline: [
            {
              $search: {
                index: "<search-index-name>",
                phrase: {
                  query: "<query-term>",
                  path: "title"
                }
              }
            },
            { $limit: 20 }
          ]
        }
      },
      combination: {
        weights: {
          vectorPipeline: 0.7,
          textPipeline: 0.3
        }
      }
    }
  },
  { $limit: 10 }
])
```

**Recommendation**: Set weights per-query based on which method is more appropriate for that query, rather than using static weights for all queries.

---

### Example 3: Multiple $vectorSearch Pipelines

Use multiple vector pipelines to search different fields, different query vectors, or different embedding models:

```javascript
db.embedded_movies.aggregate([
  {
    $rankFusion: {
      input: {
        pipelines: {
          plotPipeline: [
            {
              $vectorSearch: {
                index: "<vector-index-name>",
                path: "plot_embedding_voyage",
                queryVector: [<query-vector-2048-dimensions>],
                numCandidates: 200,
                limit: 50
              }
            }
          ],
          titlePipeline: [
            {
              $vectorSearch: {
                index: "<vector-index-name>",
                path: "title_embedding_voyage",
                queryVector: [<query-vector-2048-dimensions>],
                numCandidates: 200,
                limit: 50
              }
            }
          ]
        }
      },
      combination: {
        weights: {
          plotPipeline: 0.5,
          titlePipeline: 0.5
        }
      }
    }
  },
  { $limit: 20 }
])
```

---

### Example 4: Automated Embedding (autoEmbed) + Lexical Search

If the vector pipeline targets an `autoEmbed`-type index, pass plain text via `query` instead of a numeric array via `queryVector` — MongoDB generates the embedding automatically:

```javascript
db.movies.aggregate([
  {
    $rankFusion: {
      input: {
        pipelines: {
          semanticPipeline: [
            {
              $vectorSearch: {
                index: "<autoembed-index-name>",
                path: "<text-field>",
                query: "<query-text>",    // Plain text — no embedding vector needed
                numCandidates: 100,
                limit: 20
              }
            }
          ],
          textPipeline: [
            {
              $search: {
                index: "<search-index-name>",
                text: {
                  query: "<query-term>",
                  path: "<text-field>"
                }
              }
            },
            { $limit: 20 }
          ]
        }
      },
      combination: {
        weights: {
          semanticPipeline: 0.7,
          textPipeline: 0.3
        }
      }
    }
  },
  { $limit: 10 }
])
```

The only difference from Example 2 is the vector pipeline's `query` field: it takes a text string instead of a `queryVector` array. Weighting, the `$limit` inside `$search`, and RRF scoring all work identically. See `automated-embedding.md` for model selection and index setup.

---

### Surfacing scoreDetails

Set `scoreDetails: true` on the stage, then project via `$meta: "scoreDetails"`. The output includes a `value` (final RRF score), `description`, and a `details` array — one entry per input pipeline — containing `inputPipelineName`, `rank`, `weight`, and optionally `value` (raw pipeline score). See the `$scoreFusion` scoreDetails section below for a concrete structure example; `$rankFusion` follows the same pattern with `rank` instead of `inputPipelineRawScore`.

---

## $scoreFusion

`$scoreFusion` executes all input pipelines independently, de-duplicates results, and combines them using the actual score values from each pipeline. Supports normalization and custom combination expressions for fine-grained control over how scores are merged.

### Syntax

```javascript
{
  $scoreFusion: {
    input: {
      pipelines: {
        <pipelineName1>: [ <stages> ],
        <pipelineName2>: [ <stages> ],
        ...
      },
      normalization: "none | sigmoid | minMaxScaler"
    },
    combination: {
      weights: {
        <pipelineName1>: <number>,
        <pipelineName2>: <number>
      },
      method: "avg | expression",
      expression: <arithmetic-expression>
    },
    scoreDetails: <boolean>
  }
}
```

### Fields

| Field | Type | Description |
|---|---|---|
| `input.pipelines` | Object | Map of pipeline names to aggregation stages. At least one required. |
| `input.normalization` | String | Normalize scores before combining: `none` (no normalization), `sigmoid`, or `minMaxScaler`. |
| `combination.weights` | Object | Optional. Per-pipeline weights applied to normalized scores. Default is 1. Mutually exclusive with `combination.expression`. |
| `combination.method` | String | `avg` (default) or `expression`. |
| `combination.expression` | Expression | Custom arithmetic expression. Use pipeline names as variables representing each pipeline's score. Mutually exclusive with `combination.weights`. |
| `scoreDetails` | Boolean | Optional. If true, populates `$meta: "scoreDetails"` per document. Default false. |

### Normalization Options

| Option | Effect |
|---|---|
| `none` | No normalization — raw scores combined as-is |
| `sigmoid` | Applies the sigmoid expression, mapping scores to (0, 1) |
| `minMaxScaler` | Applies the minMaxScaler window operator, scaling scores to [0, 1] |

### Input Pipeline Restrictions

See [Common Rules](#common-rules-for-fusion-stages) for naming and modification restrictions. Allowed stages: `$search`, `$vectorSearch`, `$match`, `$geoNear`, `$sort`, `$skip`, `$limit`. Note: unlike `$rankFusion`, `$sample` is not permitted.

The scoring requirement is satisfied if the pipeline begins with `$search`, `$vectorSearch`, `$match` with legacy text search, or `$geoNear`. Otherwise, include an explicit `$score` stage.

---

### Example 1: avg Method with Weights

```javascript
db.embedded_movies.aggregate([
  {
    $scoreFusion: {
      input: {
        pipelines: {
          vectorPipeline: [
            {
              $vectorSearch: {
                index: "<vector-index-name>",
                path: "plot_embedding",
                queryVector: [<query-vector-2048-dimensions>],
                numCandidates: 100,
                limit: 20
              }
            }
          ],
          textPipeline: [
            {
              $search: {
                index: "<search-index-name>",
                text: {
                  query: "<query-term>",
                  path: "title"
                }
              }
            },
            { $limit: 20 }
          ]
        },
        normalization: "sigmoid"
      },
      combination: {
        method: "avg",
        weights: {
          vectorPipeline: 2,
          textPipeline: 1
        }
      }
    }
  },
  { $limit: 10 }
])
```

---

### Example 2: expression Method with Custom Score Math

Use `expression` when you need full control over how pipeline scores are combined. Reference pipeline names as variables in the expression:

```javascript
db.embedded_movies.aggregate([
  {
    $scoreFusion: {
      input: {
        pipelines: {
          searchOne: [
            {
              $vectorSearch: {
                index: "<vector-index-name>",
                path: "plot_embedding",
                queryVector: [<query-vector-2048-dimensions>],
                numCandidates: 100,
                limit: 20
              }
            }
          ],
          searchTwo: [
            {
              $search: {
                index: "<search-index-name>",
                text: {
                  query: "<query-term>",
                  path: "title"
                }
              }
            },
            { $limit: 20 }
          ]
        },
        normalization: "sigmoid"
      },
      combination: {
        method: "expression",
        expression: {
          $sum: [
            { $multiply: ["$searchOne", 10] },
            "$searchTwo"
          ]
        }
      },
      scoreDetails: true
    }
  },
  {
    $project: {
      _id: 1,
      title: 1,
      plot: 1,
      scoreDetails: { $meta: "scoreDetails" }
    }
  },
  { $limit: 10 }
])
```

**Note**: `combination.expression` and `combination.weights` are mutually exclusive. When using `expression`, embed weights directly via `$multiply` as shown above.

---

**Using autoEmbed pipelines:** As with `$rankFusion`, pass `query` (text) instead of `queryVector` (array) in the `$vectorSearch` stage when it targets an `autoEmbed`-type index — see [Example 4 under $rankFusion](#example-4-automated-embedding-autoembed--lexical-search) and `automated-embedding.md` for the full syntax.

---

### Surfacing scoreDetails

Set `scoreDetails: true`, then use `$meta: "scoreDetails"` in `$project`, `$addFields`, or `$set`:

```javascript
{
  $project: {
    title: 1,
    scoreDetails: { $meta: "scoreDetails" }
  }
}
```

**scoreDetails structure:**
```javascript
{
  value: 7.847,
  description: "the value calculated by combining the scores...",
  normalization: "sigmoid",
  combination: {
    method: "custom expression",
    expression: "{ $sum: [{ $multiply: ['$searchOne', 10] }, '$searchTwo'] }"
  },
  details: [
    {
      inputPipelineName: "searchOne",
      inputPipelineRawScore: 0.798,
      weight: 1,
      value: 0.689,
      details: []
    },
    {
      inputPipelineName: "searchTwo",
      inputPipelineRawScore: 2.962,
      weight: 1,
      value: 0.950,
      details: []
    }
  ]
}
```

---

## Lexical Prefilters (vectorSearch Operator)

The `vectorSearch` operator runs inside a `$search` stage and performs ANN or ENN vector search with the ability to pre-filter using any Atlas Search operator — including `text` with fuzzy matching, `phrase`, `wildcard`, `queryString`, and `compound`. This is more expressive than the MQL-only `filter` option in the `$vectorSearch` stage.

**Requires**: A `search`-type index (not vectorSearch-type) with the embedding field configured as `vector` type. See [Indexing for Hybrid Search](#indexing-for-hybrid-search).

**Cannot be used**: Inside `embeddedDocument`, `compound`, or `facet` operators.

### Syntax

```javascript
{
  $search: {
    index: "<search-index-name>",
    vectorSearch: {
      path: "<vector-field>",
      queryVector: [<array-of-numbers>],
      limit: <number>,
      numCandidates: <number>,       // Required for ANN (exact: false)
      exact: true | false,           // Optional, default false
      filter: { <search-operator> }, // Optional
      score: { <score-options> }     // Optional
    },
    concurrent: true  // Optional, dedicated search nodes only
  }
}
```

### Key Fields

| Field | Required | Description |
|---|---|---|
| `path` | Yes | The field indexed as `vector` type in the search index |
| `queryVector` | Yes | Array of numbers matching `numDimensions` in the index |
| `limit` | Yes | Number of results to return |
| `numCandidates` | Conditional | Required if `exact` is false or omitted. Max 10000. Recommend 20x `limit`. |
| `exact` | No | `true` for ENN, `false`/omit for ANN |
| `filter` | No | Any Atlas Search operator to pre-filter documents |
| `concurrent` | No | Parallelizes search across segments on dedicated search nodes. Ignored if no dedicated search nodes. |

---

### Example 1: compound Prefilter (queryString + range)

Filter by text match OR date range before running vector search:

```javascript
db.embedded_movies.aggregate([
  {
    $search: {
      index: "<search-index-name>",
      vectorSearch: {
        path: "plot_embedding",
        queryVector: [<query-vector-2048-dimensions>],
        limit: 10,
        exact: true,
        filter: {
          compound: {
            should: [
              {
                queryString: {
                  defaultPath: "fullplot",
                  query: "plot:courtroom OR lawyer"
                }
              },
              {
                range: {
                  path: "year",
                  gte: 2000,
                  lte: 2015
                }
              }
            ]
          }
        }
      },
      concurrent: true
    }
  },
  {
    $project: {
      _id: 0,
      title: 1,
      plot: 1,
      score: { $meta: "searchScore" }
    }
  }
])
```

---

### Example 2: text Prefilter with Fuzzy Matching

Filter by fuzzy text match before running ANN vector search:

```javascript
db.embedded_movies.aggregate([
  {
    $search: {
      index: "<search-index-name>",
      vectorSearch: {
        path: "plot_embedding",
        queryVector: [<query-vector-2048-dimensions>],
        limit: 10,
        numCandidates: 200,
        filter: {
          text: {
            path: "fullplot",
            query: "charming animal",
            fuzzy: {}
          }
        }
      },
      concurrent: true
    }
  },
  {
    $project: {
      _id: 0,
      title: 1,
      plot: 1,
      score: { $meta: "searchScore" }
    }
  }
])
```

---

## Best Practices and Limitations

### Best Practices

**Set limits inside $search sub-pipelines**: `$search` does not limit results by default. Always add `$limit` inside the input pipeline, or `$rankFusion`/`$scoreFusion` evaluates all search results.

```javascript
textPipeline: [
  { $search: { ... } },
  { $limit: 20 }  // Required
]
```

**Set weights per-query**: Tune weights based on which search method is most appropriate for a given query rather than using fixed weights for all queries. This improves relevance and resource utilization.

**Handle disjoint results**: If most results come from one pipeline and not the other, the two methods are returning largely different documents. Increase per-pipeline limits to improve overlap.

**Use `$match` for non-search filtering**: To filter on specific fields without a search pipeline (e.g., boost on a flag field), add a `$match` pipeline inside `input.pipelines`. It must contain an explicit `$sort` to qualify as a ranked pipeline.

### Limitations

**Single collection only**: `$rankFusion` and `$scoreFusion` cannot span multiple collections. For cross-collection hybrid search, use `$unionWith` with `$vectorSearch`.

**Pipelines run serially**: Input pipelines do not execute in parallel.

**No pagination inside sub-pipelines**: `$rankFusion` and `$scoreFusion` do not support pagination within input pipelines.

**vectorSearch operator restrictions**: Cannot be used inside `embeddedDocument`, `compound`, or `facet` operators. Cannot use `highlight`, `sort`, or `searchSequenceToken` with the `vectorSearch` operator — use `$skip` and `$limit` after `$search` instead.
