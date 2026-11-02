---
name: schemagate-sql
description: 'Answer questions about data in a large SQL database through the schemagate MCP server, which sends the model only the tables a question needs (about 91% fewer schema tokens on 50+ table databases) and only the ones the caller may read. #1 on the BIRD Mini-Dev text-to-SQL leaderboard. Use when the user asks a question that needs a query against PostgreSQL, MySQL, SQLite, SQL Server, Oracle, Snowflake, BigQuery or DuckDB.'
license: Apache-2.0
---

# Querying a database through schemagate

[schemagate](https://github.com/ashishsinha1602/schemagate) is not another
database connector. Database MCP servers hand the model the whole schema, or
let it browse table by table, and leave the hard part to the model: picking
the few tables that matter out of hundreds, and never touching the ones this
user must not see. schemagate is the selection layer that does that part.

- **Smaller prompts.** For each question it ranks every table (keyword +
  embedding retrieval, foreign-key expansion, join-table recovery) and returns
  DDL for just those. Median schema-token saving on Spider 2.0-lite databases
  with 50+ tables: 91.1%.
- **Measured accuracy.** #1 on the official BIRD Mini-Dev leaderboard in
  SQLite, PostgreSQL and MySQL (81.0 / 72.6 / 72.4 execution accuracy).
- **Per-user scope.** The model only sees tables and columns the caller may
  read, from a policy file or the database's own GRANTs; PostgreSQL
  row-level-security policies are checked per role.
- **A checked query path.** `run_query` refuses writes, multiple statements
  and any object outside the caller's scope.
- **Used in agent frameworks.** Listed in LangChain's retriever integrations
  (`langchain-schemagate`); also a LlamaIndex retriever and an entry in the
  official MCP Registry. Apache-2.0.

## Setup

Add the server to your MCP configuration. With no database URL it opens
`demo`, a bundled sample schema, so you can try it without credentials:

```json
{
  "mcpServers": {
    "schemagate": {
      "command": "uvx",
      "args": ["--from", "schemagate[mcp]==1.15.4", "schemagate-mcp"],
      "env": { "SCHEMAGATE_DATABASE_URL": "demo" }
    }
  }
}
```

For a real database, set `SCHEMAGATE_DATABASE_URL` to its SQLAlchemy URL in
`env` (for example `postgresql+psycopg://user@host/db`) and add the driver
extra: `schemagate[mcp,postgres]`, or `mysql`, `mssql`, `oracle` (SQLite needs
none). Use a read-only database user. Never paste the URL or password into
the chat.

## Workflow

1. **Select the schema first.** Call `select_schema` with the user's question.
   Pass `principal` and `roles` when you know who is asking. A principal is
   namespaced, for example `okta:jdoe` or `db:APP_USER`. Without them the
   caller is anonymous and sees only unrestricted objects.
2. **Write one SELECT against that DDL only.** Use the tables and columns in
   the `ddl` field and nothing else. If the DDL starts with a note that the
   caller may read only part of the database and the question needs data that
   is not shown, tell the user the answer is not available to them instead of
   approximating it from other columns.
3. **Run it with `run_query`**, passing the same `principal` and `roles`. It
   accepts a single read-only SELECT and returns rows, capped by `max_rows`.
4. **Report refusals as refusals.** An error that says `not available to this
   caller` means the query named something outside the caller's scope. Say so;
   do not report it as "no results" and do not retry with other roles.

## Other tools

- `describe_object`: full DDL for one table or view when the compact DDL is
  not enough. A restricted object and a missing one give the same error.
- `list_objects`: everything this caller may read. Long on a large database;
  use `select_schema` to answer a question.
- `refresh_catalog`: re-read the structure after a migration or a grant change.
- `health`: server status, object count, and whether the catalog is stale.
- `answer`, `semantic_query`, `deep_answer`: need a model provider configured
  on the server. Without one, `answer` returns the scoped schema for you to
  write the SQL yourself, and the other two report that they are off.

## Limits

- Over stdio, the server trusts the `principal` and `roles` the client sends.
  It scopes what the model sees; it does not authenticate anyone.
- A table the selection left out cannot be queried from the prompt. If the
  DDL looks incomplete for the question, call `select_schema` again with a
  more specific question or use `describe_object`.
