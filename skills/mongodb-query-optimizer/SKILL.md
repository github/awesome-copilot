---
name: mongodb-query-optimizer
description: >-
  Help with MongoDB query optimization and indexing. Use only when the user asks for optimization or performance: "How do I optimize this query?", "How do I index this?", "Why is this query slow?", "Can you fix my slow queries?", "What are the slow queries on my cluster?", etc. Do not invoke for general MongoDB query writing unless user asks for performance or index help. Prefer indexing as optimization strategy. Use MongoDB MCP when available.
compatibility: >-
  Best with MongoDB MCP server. Uses collection-indexes and explain when the connection string works; uses Atlas Performance Advisor when Atlas API is configured. Without either, suggest indexes from query shape only. User creates indexes in Atlas or migrations unless tooling allows otherwise.
license: Apache-2.0
metadata:
  version: "1.1.0"
  labelText: "Help with query optimization and indexing. Not for general query writing."
---

# MongoDB Query Optimizer

## When this skill is invoked

Invoke **only** when the user wants:

- Query/index **optimization** or **performance** help  
- **Why** a query is slow or **how to speed it up**  
- **Slow queries** on their cluster and/or **how to optimize them**

Do **not** invoke for routine query authoring unless the user has requested help with optimization, slow queries, or indexing.

## High Level Workflow

### General Performance Help

If the user wants to examine slow queries, or is looking for general performance suggestions (not regarding any particular query):

- Use MongoDB MCP server **atlas-get-performance-advisor** tool to fetch slow query logs and performance advisor output  
- Make suggestions based on this information

If Atlas MCP Server for Atlas is not configured or you don’t have enough information to run **atlas-get-performance-advisor** against the correct cluster, tell the user that general performance analysis requires Atlas MCP Server configuration with API credentials, and suggest they configure it or ask about a specific query instead.

### Help with a Specific Query

If the user is asking about a particular query:

- Use **collection-indexes**, **explain**, and **find** MCP tools to get existing indexes on the collection, explain() output for the query, and a sample document from the collection  
- Use **atlas-get-performance-advisor MCP** tool to fetch slow query logs and performance advisor output

Then make an optimization suggestion based on collected information and MongoDB best practices and examples from reference files. Prefer creating an index that fully covers the query if possible. If you cannot use MongoDB MCP Server then still try to make a suggestion.

## MCP: available tools

**How to invoke.** Call the **MongoDB MCP server** with the **exact tool name** as `toolName` and a single **arguments object** as `arguments`. Do not pass the tool name as an option, query param, or nested key; pass it as the MCP tool name and the parameters as the arguments object. Full MCP Server tool reference: [MongoDB MCP Server Tools](https://www.mongodb.com/docs/mcp-server/tools/?utm_source=agent-skills).

**Database tools** (when the MCP cluster connection works):

| Tool name (exact) | Arguments object |
| :---- | :---- |
| `collection-indexes` | `{ "database": "<db>", "collection": "<coll>" }` — both required strings. |
| `explain` | `{ "database": "<db>", "collection": "<coll>", "method": [ { "name": "find", "arguments": { "filter": {...}, "sort": {...}, "limit": N } } ], "verbosity": "executionStats" }`. `method` is an array of one object: `name` is `"find"`, `"aggregate"`, or `"count"`; `arguments` holds that method's params (e.g. find: `filter`, `sort`, `limit`; aggregate: `pipeline`; count: `query`). Optional `verbosity`: `"queryPlanner"` (default), `"executionStats"`, `"queryPlannerExtended"`, `"allPlansExecution"`. |
| `find` |  `{ "database": "<db>", "collection": "<coll>", "filter": {...}, "projection": {...}, "sort": {...}, "limit": N }` — `database`, `collection`, and `filter` are required. Optional: `projection`, `sort`, `limit`. |

**Atlas tools** (when Atlas API credentials are configured):

| Tool name (exact) | Arguments object |
| :---- | :---- |
| `atlas-list-projects` | `{}` or `{ "orgId": "<24-char hex>" }`. Returns projects with their IDs; use to get `projectId` for Performance Advisor. |
| `atlas-get-performance-advisor` | **Required:** `"projectId"` (24-character hex string), `"clusterName"` (string, 1–64 chars, alphanumeric/underscore/dash). **Optional:** `"operations"` — array of strings from `"suggestedIndexes"`, `"dropIndexSuggestions"`, `"slowQueryLogs"`, `"schemaSuggestions"` (request only what you need); for slowQueryLogs only: `"since"` (ISO 8601 date-time), `"namespaces"` (array of `"db.coll"` strings). |

For a user question, try to fetch information from both the connection string and Atlas API related to the query you are optimizing.

### 1\. DB connection string works for MongoDB MCP

Typical flow: call `collection-indexes` → `explain` → `find` (sample doc).

- **`collection-indexes`** — Use the result's `classicIndexes` (each has `name`, `key`) to see if the query can already use an existing index.
- **`explain`** — Run in `"queryPlanner"` mode first to check for COLLSCAN. If the query uses an index or the collection is very small, run again with `"executionStats"` (10-second timeout) to get docs scanned vs. returned.

### 2\. Atlas API access works for MongoDB MCP

If you need a project ID, call `atlas-list-projects` first. Then call `atlas-get-performance-advisor` with only the `operations` you need:

| Operation value | Use when |
| :---- | :---- |
| `slowQueryLogs` | Fetching slow queries—**prioritize by slowest and most frequent**. Optional: `namespaces` to scope to a collection; `since` for a time window. |
| `suggestedIndexes` | Fetching cluster index recommendations |
| `dropIndexSuggestions` | User asks what to remove or reduce index overhead |
| `schemaSuggestions` | User asks for schema/query-structure advice alongside indexes |

Do not pass the MCP tool name as an `operations` value—`operations` is a separate argument listing what data to fetch.

## Example workflow 1 (help with specific query)

**User:** "Why is this query slow? `db.orders.find({status: 'shipped', region: 'US'}).sort({date: -1})`"

**If MCP db connection is configured and the database + collection names are known**, run steps 1–3. Otherwise skip to step 4.

1. **Check existing collection indexes:**
   - Call `collection-indexes` with database=`store`, collection=`orders`
   - Result shows: `{_id: 1}`, `{status: 1}`, `{date: -1}`

2. **Run explain:**
   - Call `explain` with method=`find`, filter=`{status: 'shipped', region: 'US'}`, sort=`{date: -1}`, verbosity=`queryPlanner` and `executionStats`
   - Result: Uses `{status: 1}` index, then in-memory SORT, `totalKeysExamined: 50000`, `nReturned: 100`

3. **Run find:**
   - Call `find` with limit=1 to fetch a sample document to impute the schema.

**If MCP Atlas connection is configured**, run step 4. Otherwise skip to step 5.

4. **Run atlas-get-performance-advisor:**
   - Try to get the cluster name from the MCP connection string, or ask the user for projectId/clusterName
   - Use slowQueryLogs to fetch slow query logs from database=`store`, collection=`orders` in the past 24 hours
   - Use suggestedIndexes to check for index suggestions for the query

5. **Diagnose:** Based on explain output and slow query logs, this query targets 100 docs but scans 50K index entries (poor selectivity: 0.002). In-memory sort adds overhead. Index doesn't support both filter fields or sort.

6. **Recommend:** Create compound index `{status: 1, region: 1, date: -1}` following ESR (two equality fields, then sort). This eliminates in-memory sort and improves selectivity by filtering on both status and region.

If the MongoDB MCP server is not set up, follow best indexing practices.

## Example workflow 2 (general database performance help)

**User:** "Can you help with optimizing slow queries on my cluster?”

1. **Run atlas-get-performance-advisor:**  
   - Try to get the cluster name from the connection string and deduce the project name you need in atlas-list-projects; if you are not sure, then ask the user for cluster name and project id.
   - Use slowQueryLogs to fetch slow query logs from the past 24 hours  
   - Use suggestedIndexes  
   - Use dropIndexSuggestions  
   - Use schemaSuggestions  
2. **Diagnose and Recommend:** Based on slow query logs and performance advisor advice, you can create the compound index `{status: 1, region: 1, date: -1}` on the `db.orders` collection to optimize queries such as `find({status: 'shipped', region: 'US'}).sort({date: -1})`

Examine all performance advisor output as well as slow query logs. Provide information on what is being improved and why, and focus on suggestions that have the potential for greatest impact (e.g., indexes that affect the most queries, or queries that have the worst performance).

## Load references

Before beginning diagnosis and recommendation, load reference files.

Always load:

- `references/core-indexing-principles.md`
- `references/antipattern-examples.md`

Conditionally load these files:

- **If diagnosing aggregation pipelines** → `references/aggregation-optimization.md`
- **If diagnosing queries that change docs such as replaceOne, findOneAndUpdate, etc.** → `references/update-query-examples.md` for oplog-efficient updates and common update anti-patterns

## Output

- Keep answers short and clear: a few sentences on index and optimization suggestions, and reasoning behind them (e.g. general indexing principles, observing slow query logs in the cluster, or seeing advice in Performance Advisor)
- Focus on highest impact indexes or optimizations - if you've omitted some optimizations let the user know and present them if asked.
- Do not use strong language, such as saying “You should create these indexes and they will definitely improve application performance” \-  Explain they are suggestions for certain queries, and give the reasoning behind them.
- Consider how many indexes already exist on the collection (if known) \- there shouldn’t generally be more than 20
- Suggest removing indexes only if the suggestion comes from Atlas Performance Advisor
- Do not create indexes directly via MCP unless the user gives approval