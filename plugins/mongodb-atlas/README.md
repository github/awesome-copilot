# MongoDB Atlas (Managed MCP)

Connects your agent to **MongoDB Atlas** clusters through MongoDB's hosted Atlas MCP server (`https://mcp.mongodb.com/`) over OAuth — sign in with your Atlas account and skip the local setup and connection strings entirely. From there, your agent can explore databases and collections, run queries and aggregations, manage indexes, and manage Atlas resources such as clusters, projects, database users, and network access.

Running a deployment you manage yourself — Community, Enterprise Advanced, self-hosted? Use the [`mongodb` plugin](https://github.com/mongodb/agent-skills/blob/main/plugins/mongodb/README.md) instead.

For installation steps on each client, see the [repository README](https://github.com/mongodb/agent-skills#readme).

## Prerequisites

- A MongoDB Atlas account.
- AI client access enabled for your Atlas organization. An Organization Owner turns it on in **Organization Settings → App Connections** and chooses the access mode (**Read** or **Read and write**). See [Manage AI Client Access to Your Organization](https://www.mongodb.com/docs/mcp-server/remote-mcp/manage-ai-client-access/).
- One of these Atlas roles to connect to cluster data: `ORG_OWNER`, `GROUP_OWNER`, `GROUP_DATA_ACCESS_ADMIN`, `GROUP_DATA_ACCESS_READ_WRITE`, `GROUP_DATA_ACCESS_READ_ONLY`, or `GROUP_STREAM_PROCESSING_OWNER`.

The agent's access is the more restrictive of your Atlas role and your organization's access mode. In **Read** mode, write tools aren't available to the agent.

## Authentication

The first time your agent uses the server, you sign in to MongoDB Atlas in your browser and approve the connection. Access ends after 7 days of inactivity or 30 days after you first grant it, whichever comes first; sign in again to reconnect. You can revoke the connection at any time in the Atlas UI. See [Atlas App Connections](https://www.mongodb.com/docs/atlas/app-connections/).

## Skills

These skills come bundled with the plugin and activate automatically when relevant:

- **`mongodb-connection`** — Reviews and tunes client connection configuration (pools, timeouts, patterns) across driver languages.
- **`mongodb-natural-language-querying`** — Turns natural-language requests into read-only `find` queries and aggregation pipelines.
- **`mongodb-qe-size-estimation`** — Estimates the storage and memory impact of encrypting fields in collections with Queryable Encryption (QE) enabled. Doesn't apply to collections that use Client-Side Field Level Encryption (CSFLE).
- **`mongodb-query-optimizer`** — Diagnoses slow queries and recommends indexes to fix them.
- **`mongodb-schema-design`** — Applies MongoDB schema design patterns and steers you clear of common anti-patterns, whether modeling from scratch or migrating from SQL.
- **`mongodb-search-and-ai`** — Helps build Atlas Search (full-text), Vector Search (semantic), and hybrid search implementations.
- **`mongodb-atlas-stream-processing`** — Manages Atlas Stream Processing workspaces, connections, and processors for streaming workloads.
