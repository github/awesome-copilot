---
name: mongodb-schema-design
description: MongoDB schema design patterns and anti-patterns. Use when designing data models, reviewing schemas, migrating from SQL, or troubleshooting performance issues caused by schema problems. Triggers on "design schema", "embed vs reference", "MongoDB data model", "schema review", "unbounded arrays", "one-to-many", "tree structure", "16MB limit", "schema validation", "JSON Schema", "time series", "schema migration", "polymorphic", "TTL", "data lifecycle", "archive", "index explosion", "unnecessary indexes", "approximation pattern", "document versioning".
license: Apache-2.0
metadata:
  version: "1.1.0"
  labelText: "Design better data models. Get help with schema best-practices, tuning for your use case, and avoiding antipatterns."
---

# MongoDB Schema Design

Data modeling patterns and anti-patterns for MongoDB, maintained by MongoDB. Bad schema is the root cause of most MongoDB performance and cost issues—queries and indexes cannot fix a fundamentally wrong model.

## When to Apply

Reference these guidelines when:
- Designing a new MongoDB schema from scratch
- Migrating from SQL/relational databases to MongoDB
- Reviewing existing data models for performance issues
- Troubleshooting slow queries or growing document sizes
- Deciding between embedding and referencing
- Modeling relationships (one-to-one, one-to-many, many-to-many)
- Implementing tree/hierarchical structures
- Seeing Atlas Schema Suggestions or Performance Advisor warnings
- Hitting the 16MB document limit
- Adding schema validation to existing collections

## Quick Reference

### 1. Schema Anti-Patterns - 3 rules

- [antipattern-unnecessary-collections](references/antipattern-unnecessary-collections.md) - Splitting homogeneous data into multiple collections is often an anti-pattern; consult this reference to validate whether this is the case.
- [antipattern-excessive-lookups](references/antipattern-excessive-lookups.md) - When encountering overly normalized collections that reference each other or frequent and possibly slow $lookup operations, consult this reference to validate whether this is problematic and how to fix it.
- [antipattern-unnecessary-indexes](references/antipattern-unnecessary-indexes.md) - Consult this reference when indexes overlap or are not used by queries, to identify and remove unnecessary indexes that add overhead without benefit.

### 2. Schema Fundamentals - 4 rules

- [fundamental-embed-vs-reference](references/fundamental-embed-vs-reference.md) - Consult this reference for approaches to modeling different types of relationships (1:1, 1:few, 1:many, many:many, tree/hierarchical data) and how to decide between embedding and referencing based on access patterns.
- [fundamental-document-model](references/fundamental-document-model.md) - Fundamentals of the document model. Consult this reference when migrating from SQL or other normalized data to a document database like MongoDB.
- [fundamental-schema-validation](references/fundamental-schema-validation.md) - Consult this reference when creating new collections, or adding validation to existing collections, for example in response to finding inconsistent document structures or data quality issues.
- [fundamental-document-size](references/fundamental-document-size.md) - Consult this reference when documents hit the hard 16MB limit, or when accesses are slower than expected as a result of large documents.

### 3. Design Patterns - 11 rules

- [pattern-approximation](references/pattern-approximation.md) - Use approximate values for high-frequency counters
- [pattern-archive](references/pattern-archive.md) - Move historical data to separate/cold storage for performance
- [pattern-attribute](references/pattern-attribute.md) - Collapse many optional fields into key-value attributes
- [pattern-bucket](references/pattern-bucket.md) - Group time-series or IoT data into buckets
- [pattern-computed](references/pattern-computed.md) - Pre-calculate expensive aggregations
- [pattern-document-versioning](references/pattern-document-versioning.md) - Track document changes to enable historical queries and audit trails
- [pattern-extended-reference](references/pattern-extended-reference.md) - Cache frequently-accessed data from related entities
- [pattern-outlier](references/pattern-outlier.md) - Handle collections in which a small subset of documents are much larger than the rest, to prevent outliers from dominating memory and index costs
- [pattern-polymorphic](references/pattern-polymorphic.md) - Store different types of entities in the same collection, often when they are different types of the same base entity (e.g. different types of users or different types of products)
- [pattern-schema-versioning](references/pattern-schema-versioning.md) - Schema evolution, preventing drift, and safe online migrations. Consult when encountering inconsistent document structures, or when planning a schema change that cannot be applied atomically.
- [pattern-time-series-collections](references/pattern-time-series-collections.md) - Use native time series collections for high-frequency time series data

### Access Pattern Analysis

Do not immediately recommend a pattern or schema change without understanding the broader context. Together with the user, analyze access patterns to identify pain points and opportunities for optimization.

#### Workflow

**Step 1: Assess the environment**
Ask the user:
  - Is this a new design or is there a production database with existing access patterns to analyze?
  - If there is production data, is it on Atlas? If yes, what tier? (M0/M2/M5 vs M10+)

**Step 2: Determine workload type**
Is the workload read-heavy, write-heavy, or balanced? This will influence which diagnostic sources are most relevant.
Ask the user:
- What's the primary workload for these collections — read-heavy (analytics, reports, searches), write-heavy (logging, IoT ingestion, frequent updates), or balanced?

Verify with `db.serverStatus().opcounters`.

**Step 3: Work with the user to choose the best source(s)**
  Recommend the best source(s) for their situation, explaining the tradeoffs. For schema design decisions, we often need to combine multiple sources for a complete picture.

**Step 4: Proceed with analysis**
  Only after source selection, fetch data or guide the user through analysis.

#### Sources

- [Query statistics](references/source-query-stats.md) - Returns runtime statistics for recorded queries showing query shapes and frequency. **Limitation**: Currently only captures read operations (pair with other sources for write patterns). Requires Atlas M10+ tier.
- [Atlas Slow Query Logs](references/source-slow-query-logs.md) - Review slow queries (actual queries, not shapes) to identify performance bottlenecks. Captures all reads and writes. Requires Atlas M10+ tier.
- Codebase - Examine actual queries in application code to understand access patterns, especially for new applications or with changing workloads. Can be used in conjunction with query stats for a more complete picture.
- Natural language input - Ask the user to describe their typical queries and access patterns in natural language. Can be used as the only source or to supplement and validate other sources - the user might have contextual knowledge that is not reflected in the data or codebase.

**Combining Query Stats and Slow Query Logs:**

Use both together for comprehensive analysis:
1. Query Stats → identify frequent access patterns (which queries run most often)
2. Slow Query Logs → identify performance bottlenecks (which queries are slow)
3. Focus schema optimization on queries that are both frequent AND slow (highest impact)

## Key Principle

> **"Data that is accessed together should be stored together."**

This is MongoDB's core philosophy. Embedding related data eliminates joins, reduces round trips, and enables atomic updates. Reference only when you must.

A core way to implement this philosophy is the fact that MongoDB exposes **flexible schemas**. This means you can have different fields in different documents, and even different structures. This allows you to model data in the way that best fits your access patterns, without being constrained by a rigid schema. For example, if different documents have different sets of fields, that is perfectly fine as long as it serves your application's needs. You can also use schema validation to enforce certain rules while still allowing for flexibility.

Another implication of the key principle is that information about the expected read and write workload becomes very relevant to schema design. If pieces of information from different entities are often queried or updated together, that means that prioritizing co-location of that data in the same document can lead to significant performance benefits. On the other hand, if certain pieces of information are rarely accessed together, it may make sense to store them separately to avoid loading more data than necessary.

#### Schema Fundamentals Summary

- **Embed vs Reference**: Choose embedding or referencing based on access patterns: embed when data is always accessed together (1:1, 1:few, bounded arrays, atomic updates needed); reference when data is accessed independently, relationships are many-to-many, or arrays can grow without bound.
- **Data accessed together stored together**: MongoDB's core principle: design schemas around queries, not entities. Embed related data to eliminate cross-collection joins and reduce round trips. Identify your API endpoints/pages, list the data each returns, then shape documents to match those queries.
- **Embrace the document model**: Don't recreate SQL tables 1:1 as MongoDB collections. Instead, denormalize joined tables into rich documents for single-query reads and atomic updates. When migrating from SQL, identify tables that are always joined together and merge them into single documents.
- **Schema validation**: Use MongoDB's built-in `$jsonSchema` validator to catch invalid data at the database level (type checks, required fields, enum constraints, array size limits). Start with `validationLevel: "moderate"` and `validationAction: "warn"` on existing collections, then tighten to `strict`/`error`.
- **16MB document limit**: MongoDB documents cannot exceed 16MB—this is a hard limit, not a guideline. Common causes: unbounded arrays, large embedded binaries, deeply nested objects. Mitigate by moving unbounded data to separate collections and monitoring document sizes with `$bsonSize`.

## Embed/Reference Decision Framework

| Relationship | Cardinality | Access Pattern | Recommendation |
|-------------|-------------|----------------|----------------|
| One-to-One | 1:1 | Always together | Embed |
| One-to-Few | 1:N (N < 100) | Usually together | Embed array |
| One-to-Many | 1:N (N > 100) | Often separate | Reference |
| Many-to-Many | M:N | Varies | Two-way reference |

This is a **rough** guideline, and whether to embed or reference depends on your specific access patterns, data size, and read/write frequencies. Always verify with your actual workload.

## How to Use

Each reference file listed above contains detailed explanations and code examples. Use the descriptions in the Quick Reference to identify which files are relevant to your current task.

Each reference file contains:
- Brief explanation of why it matters
- Incorrect code example with explanation
- Correct code example with explanation
- "When NOT to use" exceptions
- Performance impact and metrics
- Verification diagnostics

---

## How These Rules Work

### MongoDB MCP Integration

For automatic verification, connect the [MongoDB MCP Server](https://github.com/mongodb-js/mongodb-mcp-server).

If the MCP server is running and connected, I can automatically run verification commands to check your actual schema, document sizes, array lengths, index usage, slow query logs, and more. This allows me to provide tailored recommendations based on your real data, not just code patterns.

**⚠️ Security**: Use `--readOnly` for safety. Remove only if you need write operations.

When connected, I can automatically:
- Infer schema via `mcp__mongodb__collection-schema`
- Measure document/array sizes via `mcp__mongodb__aggregate`
- Check collection statistics via `mcp__mongodb__db-stats`

### ⚠️ Action Policy

**I will NEVER execute write operations without your explicit approval.**

Before any write or destructive operation via MCP, I will: (1) summarize the exact operation (collection, index/validator, estimated number of docs affected), and (2) ask for explicit confirmation (yes/no). I will not proceed on partial or ambiguous approvals.

| Operation Type | MCP Tools | Action |
|---------------|-----------|--------|
| **Read (Safe)** | `find`, `aggregate`, `collection-schema`, `db-stats`, `count` | I may run automatically to verify |
| **Write (Requires Approval)** | `update-many`, `insert-many`, `create-collection` | I will show the command and wait for your "yes" |
| **Destructive (Requires Approval)** | `delete-many`, `drop-collection`, `drop-database` | I will warn you and require explicit confirmation |

When I recommend schema changes or data modifications:
1. I'll explain **what** I want to do and **why**
2. I'll show you the **exact command**
3. I'll **wait for your approval** before executing
4. If you say "go ahead" or "yes", only then will I run it

**Your database, your decision.** I'm here to advise, not to act unilaterally.

### Working Together

If you're not sure about a recommendation:
1. Run the verification commands I provide
2. Share the output with me
3. I'll adjust my recommendation based on your actual data

We're a team—let's get this right together.


