# Automated Embedding

**Scope**: This guide covers configuring MongoDB Vector Search to automatically generate and manage vector embeddings — no embedding code or model infrastructure required (queries still run through a `$vectorSearch` aggregation pipeline). It documents the `autoEmbed` index type and text-query `$vectorSearch` syntax. For manual vector search (bring your own embeddings), see `vector-search.md`. For combining with lexical search, see `hybrid-search.md`.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Model Selection](#model-selection)
- [Index Definition](#index-definition)
- [Query Construction](#query-construction)
- [Item-to-Item Similarity](#item-to-item-similarity)
- [How It Works Internally](#how-it-works-internally)
- [Billing and Free Tokens](#billing-and-free-tokens)
- [Rate Limits](#rate-limits)
- [Management and Monitoring](#management-and-monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Verify these prerequisites before creating an `autoEmbed` index or query. Tier and auto-scaling prerequisites can change across Atlas releases — confirm the current requirements in the official docs before acting.

### Atlas Clusters

Automated Embedding is supported on **all Atlas cluster tiers**: M0 (free), Flex, and M10+ dedicated.

**M10+ dedicated clusters require storage auto-scaling to be enabled.** If the user is on M10+ without storage auto-scaling, explain how to enable it in Atlas and wait for confirmation before proceeding to index creation.

### Self-Managed Deployments

Requires:
1. MongoDB 8.3+ with `mongot`
2. A Voyage AI API key for indexing
3. A Voyage AI API key for querying (recommended to use separate keys)
4. Keys configured in `mongot` during deployment

If the user is on a self-managed deployment without Voyage AI configured, offer an alternative: "You can still do semantic search by generating embeddings yourself and storing them in your documents — this works on any deployment. Want to go that route instead?" If yes, proceed with manual Vector Search using `vector-search.md`.

## Model Selection

All models use Voyage AI, hosted and managed by MongoDB (multi-tenant, US region, Google Cloud). Context window is **32,000 tokens** for all models. Text exceeding this is truncated at index time; queries exceeding it return a `context-limit-exceeded` error. (Pricing and rate limits can change—confirm current values in Atlas or official MongoDB documentation.)

| Model | Best For | Per 1K Tokens | Per 1M Tokens |
|---|---|---|---|
| `voyage-4-lite` | High-volume, cost-sensitive applications | $0.00002 | $0.02 |
| `voyage-4` | **(Recommended)** General text search, balanced performance | $0.00006 | $0.06 |
| `voyage-4-large` | Maximum accuracy, complex semantic relationships | $0.00012 | $0.12 |
| `voyage-code-4` | **(Recommended for code)** Code search, technical documentation | $0.00012 | $0.12 |
| `voyage-code-3` | Legacy code model — use `voyage-code-4` instead | $0.00018 | $0.18 |

**Decision guide:**
- Default / unknown use case → `voyage-4`
- Large collection, cost is a concern → `voyage-4-lite`
- High-stakes retrieval where accuracy matters most → `voyage-4-large`
- Codebase or technical docs search → `voyage-code-4`

**`voyage-code-4` requires an Atlas deployment.** On self-managed deployments, use `voyage-code-3` for code and technical documentation.

**Free tokens:** 200 million tokens per model, one-time, shared across the entire Atlas organization. Does not refresh. See [Billing and Free Tokens](#billing-and-free-tokens) below for how consumption and invoicing work.

## Index Definition

### Syntax

```javascript
{
  "fields": [
    {
      "type": "autoEmbed",
      "modality": "text",
      "path": "<text-field-to-embed>",
      "model": "<embedding-model>"
    },
    {
      "type": "filter",    // Optional: index one or more fields as filters to enable pre-filtering / scoped search
      "path": "<field-to-filter-on>"
    }
  ]
}
```

### Fields

The embedding field (`type: "autoEmbed"`) is required. To pre-filter queries, add one or more optional `filter` fields (each with its own `type` and `path`):

| Field | Required | Description |
|---|---|---|
| `type` | Yes | `"autoEmbed"` for the embedding field, or `"filter"` for an optional filter field |
| `modality` | Yes (autoEmbed) | Must be `"text"` (only text is supported currently) |
| `path` | Yes | For an `autoEmbed` field, the document field containing the text to embed; for a `filter` field, the field to filter on |
| `model` | Yes (autoEmbed) | The Voyage AI embedding model to use |

### Examples

**Minimal index (no filters):**
```javascript
{
  "fields": [
    {
      "type": "autoEmbed",
      "modality": "text",
      "path": "description",
      "model": "voyage-4"
    }
  ]
}
```

**With filter fields (recommended for scoped search):**
```javascript
{
  "fields": [
    {
      "type": "autoEmbed",
      "modality": "text",
      "path": "description",
      "model": "voyage-4"
    },
    {
      "type": "filter",
      "path": "category"
    },
    {
      "type": "filter",
      "path": "year"
    }
  ]
}
```

### Creating the Index (mongosh)

```javascript
db.movies.createSearchIndex(
  "<index-name>",
  "vectorSearch",
  {
    "fields": [
      {
        "type": "autoEmbed",
        "modality": "text",
        "path": "<text-field>",
        "model": "voyage-4"
      }
    ]
  }
)
```

**Note:** After creation, MongoDB performs an initial sync — generating embeddings for all existing documents. This can take several hours for large collections. Monitor progress via Atlas → Search & Vector Search.

## Query Construction

### Key Difference from Manual Vector Search

With Automated Embedding, you use **`query`** (a text string) instead of **`queryVector`** (an array of numbers). MongoDB generates the query embedding automatically.

### Basic Query Syntax

```javascript
db.collection.aggregate([
  {
    $vectorSearch: {
      index: "<index-name>",
      path: "<text-field>",
      query: "<your search text>",    // Plain text — no vector needed
      numCandidates: 100,
      limit: 10
    }
  },
  {
    $project: {
      _id: 0,
      description: 1,
      score: { $meta: "vectorSearchScore" }
    }
  }
])
```

### Query with Pre-filtering

```javascript
db.collection.aggregate([
  {
    $vectorSearch: {
      index: "<index-name>",
      path: "<text-field>",
      query: "your search text",
      filter: {
        $and: [
          { category: { $eq: "electronics" } },
          { year: { $gte: 2022 } }
        ]
      },
      numCandidates: 150,
      limit: 10
    }
  },
  {
    $project: {
      _id: 0,
      description: 1,
      category: 1,
      score: { $meta: "vectorSearchScore" }
    }
  }
])
```

### Optional: Override the Query Model

You can specify a different (but compatible) embedding model at query time:

```javascript
{
  $vectorSearch: {
    index: "<index-name>",
    path: "<text-field>",
    query: "your search text",
    model: "voyage-4-lite",    // Must be compatible with the index model
    numCandidates: 100,
    limit: 10
  }
}
```

### Item-to-Item Similarity

For "given item A, find similar items" requests (e.g. "more movies like The Firm"), remember that `query` accepts **only a plain text string** — there is no raw-vector read path to reuse an existing document's stored embedding for an `autoEmbed` index.

Resolve the source item to its indexed text field first, then pass that text as the query:

```javascript
// 1. Fetch the source item's text (the same field indexed as autoEmbed)
const source = db.movies.findOne(
  { title: "The Firm" },
  { projection: { plot: 1 } }
);

// 2. Use that text as the query
db.movies.aggregate([
  {
    $vectorSearch: {
      index: "<index-name>",
      path: "plot",
      query: source.plot,           // the source item's text, not its title
      filter: { _id: { $ne: source._id } },   // exclude the item itself
      numCandidates: 100,
      limit: 10
    }
  }
])
```

Filter fields must generally be indexed as `type: "filter"` (see the index definition above). `_id` is the one exception — it is implicitly filterable on every `autoEmbed` index, so the self-exclusion `filter` above works without declaring `_id` as a filter field.

Passing the item's name (e.g. `query: "The Firm"`) searches for text semantically near that string, not near the item's actual content — pass the content field instead.

### Query Parameters Reference

| Parameter | Required | Description |
|---|---|---|
| `index` | Yes | Name of the autoEmbed vector search index |
| `path` | Yes | The field indexed as `autoEmbed` |
| `query` | Yes (with autoEmbed) | Plain text query string |
| `numCandidates` | Yes (for ANN) | Candidates to evaluate; recommend 20x `limit` |
| `limit` | Yes | Number of results to return |
| `filter` | No | MQL pre-filter; field must be indexed as `filter` type (except `_id`, which is always filterable) |
| `model` | No | Override query embedding model (must be compatible) |
| `exact` | No | `true` for ENN (exact search), omit for ANN |

**Note:** Each query call counts against your Automated Embedding rate limits because it triggers an embedding API call.

## How It Works Internally

### Initial Sync
1. MongoDB scans all documents in the collection for the indexed text field
2. Sends text to the Voyage AI model in batches (uses Flex inference tier — no standard rate limits)
3. Stores embeddings in an internal reserved database: `__mdb_internal_search`
4. Builds the vector index from the stored embeddings

### Ongoing Updates (via Change Streams)
- **Insert**: New doc detected → embedding generated → stored → index updated
- **Update**: Changed field detected → new embedding generated → old one replaced → index updated
- **Delete**: Doc deleted → embeddings removed → index updated
- Updates to non-indexed fields do **not** trigger embedding regeneration

### Embeddings Storage
Stored in `__mdb_internal_search` (internal namespace — **do not modify this database**).

Each stored document has:
```javascript
{
  _id: <same as source document>,
  <filter-field>: <copied from source>,
  _autoEmbed: {
    "<fieldPath>": [<embedding vector>]
  }
}
```

## Billing and Free Tokens

**Token consumption occurs during:**
- Index creation (initial sync)
- Document inserts and updates
- Every query (embedding generated per query)

**Free allocation:** 200M tokens per model, per organization. One-time, does not refresh. Shared across all projects and clusters. See [Model Selection](#model-selection) above for per-model pricing after free tokens are used.

**View usage:** Atlas → Search & Vector Search → Automated Embedding → Usage

**View invoices:** Atlas → Billing → Invoices (broken down by model)

**M0 clusters:** When free tokens run out, MongoDB automatically invoices for additional usage — index builds and queries do not stop. M0 users can add a payment method without upgrading their cluster: Atlas → Billing → Payment Method. Charges are for embedding model usage only.

## Rate Limits

Rate limits are enforced at the **cluster level**, shared across all autoEmbed indexes on that cluster. They are applied **separately** for queries, index inserts/updates, and initial builds.

### Initial Index Build
No standard rate limits — uses a separate inference tier optimized for throughput, with dynamic scaling up to available GPU capacity, fair resource sharing between competing index builds, and safe ramp-up from low concurrency.

**Best practice:** create the index on a prepopulated collection rather than an empty one — the initial sync benefits from this unbounded throughput, while steady-state inserts/updates afterward are subject to the rate limits below.

### Index Insert/Update Rate Limits (all tiers)

| Model | RPM | TPM |
|---|---|---|
| `voyage-4-large` | 2,000 | 3,000,000 |
| `voyage-4` | 2,000 | 8,000,000 |
| `voyage-4-lite` | 2,000 | 16,000,000 |
| `voyage-code-4` | 2,000 | 3,000,000 |
| `voyage-code-3` | 2,000 | 3,000,000 |

**Best practice:** space out bulk insert/update operations rather than sending them all at once — batching avoids hitting these per-minute limits.

### Query Rate Limits

**Free cluster (M0 without a payment method) — all models:**

| Model | RPM | TPM |
|---|---|---|
| `voyage-4-large` | 3 | 2,000 |
| `voyage-4` | 3 | 2,000 |
| `voyage-4-lite` | 3 | 2,000 |
| `voyage-code-4` | 3 | 2,000 |
| `voyage-code-3` | 3 | 2,000 |

**Paid cluster (M0 with a payment method, Flex, or M10+ dedicated):**

| Model | RPM | TPM |
|---|---|---|
| `voyage-4-large` | 2,000 | 3,000,000 |
| `voyage-4` | 2,000 | 8,000,000 |
| `voyage-4-lite` | 2,000 | 16,000,000 |
| `voyage-code-4` | 2,000 | 3,000,000 |
| `voyage-code-3` | 2,000 | 3,000,000 |

Paid-tier limits increase automatically as usage grows over time — no action needed to benefit from that growth.

**If rate limits are hit:**
- Inserts/updates: queued and retried automatically with exponential backoff
- Queries: return an error — application must handle and retry
- Free cluster hitting the 3 RPM ceiling: add a payment method to upgrade to paid-tier limits (Atlas → Billing → Payment Method) — this alone raises the ceiling from 3 to 2,000 RPM (~667x), with a correspondingly higher TPM allowance
- Paid tier still hitting limits: contact MongoDB Support for a limit increase

## Management and Monitoring

### View Usage (Atlas)
Atlas → Search & Vector Search page → Automated Embedding → Usage

Shows:
- Total tokens used and remaining free tokens
- Usage breakdown by model
- Usage breakdown by operation (indexing vs querying)

### View Rate Limits (Atlas)
Atlas → Search & Vector Search page → Automated Embedding → Rate Limits

### View Organization-Level Usage
Atlas → Organization level → AI Models → Usage

### Disable Automated Embedding (Organization Policy)
Use Atlas Resource Policies with Cedar syntax.

**Disable entirely:**
```
forbid (
  principal,
  action == ResourcePolicy::Action::"search.index.modify",
  resource
) when {
  context.search.index.isAutoEmbed
};
```

**Disable with project-level exceptions** (replace `<project-id-1>`/`<project-id-2>` with actual project IDs):
```
forbid (
  principal,
  action == ResourcePolicy::Action::"search.index.modify",
  resource
) when {
  context.search.index.isAutoEmbed
} unless {
  resource in ResourcePolicy::Project::"<project-id-1>" ||
  resource in ResourcePolicy::Project::"<project-id-2>"
};
```

Apply at: Atlas → Organization Settings → Resource Policies → Create policy

**Note:** this policy blocks new `autoEmbed` indexes going forward. Existing `autoEmbed` indexes must be deleted manually to bring a project into compliance.

## Troubleshooting

**Index stuck in Building state / initial sync taking a long time**
- Normal for large collections — initial sync can take hours
- Monitor via Atlas → Search & Vector Search → index status
- Check token consumption hasn't exceeded rate limits

**Query returns `context-limit-exceeded` error**
- Your query text exceeds 32,000 tokens (the model context window)
- Truncate or shorten your query text before passing it to `$vectorSearch`

**Queries return rate limit error**
- You've exceeded your query RPM or TPM
- Free tier users: add a payment method to upgrade to paid limits
- Paid tier users: contact MongoDB Support for a limit increase
- Short term: implement retry with backoff in your application

**No results returned**
- Check the index status is `READY` (not `Building` or `Failed`)
- Verify the `path` in the query matches the `path` in the index definition
- Verify the `index` name matches exactly (typos return no results silently)

**Missing embeddings for some documents**
- Documents inserted before the index was created are synced during initial sync — check if sync is still in progress
- Documents without the indexed text field are skipped (no embedding generated)

**`__mdb_internal_search` database appearing in Data Explorer**
- This is normal — it's the internal storage for generated embeddings
- Do not modify or delete collections in this database
