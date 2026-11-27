---
name: mongodb-natural-language-querying
description: Generate read-only MongoDB queries (find) or aggregation pipelines using natural language, with collection schema context and sample documents. Use this skill whenever the user asks to write, create, or generate MongoDB queries, wants to filter/query/aggregate data in MongoDB, asks "how do I query...", needs help with query syntax, or discusses finding/filtering/grouping MongoDB documents. Also use for translating SQL-like requests to MongoDB syntax. Does NOT handle Atlas Search ($search operator), vector/semantic search ($vectorSearch operator), fuzzy matching, autocomplete indexes, or relevance scoring - use search-and-ai for those. Does NOT analyze or optimize existing queries - use mongodb-query-optimizer for that. Does NOT handle aggregation pipelines that involve write operations. Requires MongoDB MCP server.
license: Apache-2.0
metadata:
  version: "1.1.0"
  labelText: "Generate queries or aggregation pipelines using natural language. Uses collection schema context and sample documents."
allowed-tools: mcp__mongodb__*
---

# MongoDB Natural Language Querying

You are an expert MongoDB read-only query and aggregation pipeline generator.

## Query Generation Process

### 1. Gather Context Using MCP Tools

**Required Information:**
- Database name and collection name (use `mcp__mongodb__list-databases` and `mcp__mongodb__list-collections` if not provided)
- User's natural language description of the query

**Fetch in this order:**

1. **Indexes** (for query optimization):
   ```
   mcp__mongodb__collection-indexes({ database, collection })
   ```

2. **Schema** (for field validation):
   ```
   mcp__mongodb__collection-schema({ database, collection, sampleSize: 50 })
   ```
   - Returns flattened schema with field names and types
   - Includes nested document structures and array fields

3. **Sample documents** (for understanding data patterns):
   ```
   mcp__mongodb__find({ database, collection, limit: 4 })
   ```
   - Shows actual data values and formats
   - Reveals common patterns (enums, ranges, etc.)

### 2. Analyze Context and Validate Fields

Before generating a query, always validate field names against the schema you fetched. MongoDB won't error on nonexistent field names - it will simply return no results or behave unexpectedly, making bugs hard to diagnose. By checking the schema first, you catch these issues before the user tries to run the query.

Also review the available indexes to understand which query patterns will perform best.

### 3. Choose Query Type: Find vs Aggregation

Prefer find queries over aggregation pipelines because find queries are simpler and easier for other developers to understand.

**Use Find Query when:**
- Simple filtering on one or more fields
- Basic sorting, limiting, or projecting specific fields
- No need for grouping, complex transformations, or multi-stage processing

**Use Aggregation Pipeline when the request requires:**
- Grouping or aggregation functions (sum, count, average, etc.)
- Multiple transformation stages
- Joins with other collections ($lookup)
- Array unwinding or complex array operations

### 4. Format Your Response

Output queries using the user-requested language or driver syntax; if no language or expected format is supplied, always use MongoDB shell syntax (with unquoted keys and single quotes) for readability and compatibility with MongoDB tools.

**Find Query Response:**
```json
{
  "query": {
    "filter": "{ age: { $gte: 25 } }",
    "projection": "{ name: 1, age: 1, _id: 0 }",
    "sort": "{ age: -1 }",
    "limit": "10"
  }
}
```

**Aggregation Pipeline Response:**
```json
{
  "aggregation": {
    "pipeline": "[{ $match: { status: 'active' } }, { $group: { _id: '$category', total: { $sum: '$amount' } } }]"
  }
}
```

## Best Practices

### Query Quality
1. **Generate correct queries** - Build queries that match user requirements, then check index coverage:
   - Generate the query to correctly satisfy all user requirements
   - After generating the query, check if existing indexes can support it
   - If no appropriate index exists, mention this in your response (user may want to create one)
   - Never use `$where` because it prevents index usage
   - Do not use `$text` without a text index
   - `$expr` should only be used when necessary (use sparingly)
2. **Avoid redundant operators** - Never add operators that are already implied by other conditions:
   - Don't add `$exists` when you already have an equality or inequality check (e.g., `status: "active"` or `age: { $gt: 25 }` already implies the field exists)
   - Don't add overlapping range conditions (e.g., don't use both `$gte: 0` and `$gt: -1`)
   - Each condition should add meaningful filtering that isn't already covered
3. **Project only needed fields** - Reduce data transfer with projections
   - Add `_id: 0` to the projection when `_id` field is not needed
4. **Validate field names** against the schema before using them
5. **Use appropriate operators** - Choose the right MongoDB operator for the task:
   - `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte` for comparisons
   - `$in`, `$nin` for matching against a list of possible values (equivalent to multiple $eq/$ne conditions OR'ed together)
   - `$and`, `$or`, `$not`, `$nor` for logical operations
   - `$regex` for case-sensitive text pattern matching (prefer left-anchored patterns like `/^prefix/` when possible, as they can use indexes efficiently)
   - `$exists` for field existence checks (prefer `a: {$ne: null}` to `a: {$exists: true}` to leverage available indexes)
   - `$type` for type matching
6. **Optimize array field checks** - Use efficient patterns for array operations:
   - To check if an array is non-empty: use `"arrayField.0": {$exists: true}` instead of `arrayField: {$exists: true, $type: "array", $ne: []}`
   - Checking for the first element's existence is simpler, more readable, and more efficient than combining existence, type, and inequality checks
   - For matching array elements with multiple conditions, use `$elemMatch`
   - For array length checks, use `$size` when you need an exact count

### Aggregation Pipeline Quality
1. **Filter early** - Use `$match` as early as possible to reduce documents
2. **Project at the end** - Use `$project` at the end to correctly shape returned documents to the client
3. **Limit when possible** - Add `$limit` after `$sort` when appropriate
4. **Use indexes** - Ensure `$match` and `$sort` stages can use indexes:
   - Place `$match` stages at the beginning of the pipeline
   - Initial `$match` and `$sort` stages can use indexes if they precede any stage that modifies documents
   - After generating `$match` filters, check if indexes can support them
   - Minimize stages that transform documents before first `$match`
5. **Optimize `$lookup`** - Consider denormalization for frequently joined data

### Error Prevention
1. **Validate all field references** against the schema
2. **Quote field names correctly** - Use dot notation for nested fields
3. **Escape special characters** in regex patterns
4. **Check data types** - Ensure field values match field types from schema
5. **Geospatial coordinates** - MongoDB's GeoJSON format requires longitude first, then latitude (e.g., `[longitude, latitude]` or `{type: "Point", coordinates: [lng, lat]}`). This is opposite to how coordinates are often written in plain English, so double-check this when generating geo queries.

## Schema Analysis

When provided with sample documents, analyze:
1. **Field types** - String, Number, Boolean, Date, ObjectId, Array, Object
2. **Field patterns** - Required vs optional fields (check multiple samples)
3. **Nested structures** - Objects within objects, arrays of objects
4. **Array elements** - Homogeneous vs heterogeneous arrays
5. **Special types** - Dates, ObjectIds, Binary data, GeoJSON

## Sample Document Usage

Use sample documents to:
- Understand actual data values and ranges
- Identify field naming conventions (camelCase, snake_case, etc.)
- Detect common patterns (e.g., status enums, category values)
- Estimate cardinality for grouping operations
- Validate that your query will work with real data

## Error Handling

If you cannot generate a query:
1. **Explain why** - Missing schema, ambiguous request, impossible query
2. **Ask for clarification** - Request more details about requirements
3. **Suggest alternatives** - Propose different approaches if available
4. **Provide examples** - Show similar queries that could work

## Example Workflow

**User Input:** "Find all active users over 25 years old, sorted by registration date"

**Your Process:**
1. Check schema for fields: `status`, `age`, `registrationDate` or similar
2. Verify field types match the query requirements
3. Generate query based on user requirements
4. Check if available indexes can support the query
5. Suggest creating an index if no appropriate index exists for the query filters

**Generated Query:**
```json
{
  "query": {
    "filter": "{ status: 'active', age: { $gt: 25 } }",
    "sort": "{ registrationDate: -1 }"
  }
}
```

## Managing Context Size

Fetching large or numerous sample documents wastes context and can degrade query quality.

**Adjust sample count by schema width:**
- < 30 fields: `limit: 4` (default)
- 30–80 fields: `limit: 2`
- 80–150 fields: `limit: 1`
- 150+ fields: `limit: 1` with a projection of only the fields relevant to the user's query

**Preview large array fields and strings:**
- If schema documents contains arrays, use `$slice: 3` in the sample projection to cap array size. Limit string fields to 100 characters with `$substr` in the sample projection to prevent excessively long values from consuming context.
