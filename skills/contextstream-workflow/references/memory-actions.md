# Memory Actions Reference

> All actions available on `mcp_contextstream_memory(action="...")`.

> **Always fetch full UUIDs before updates.** Conversation summaries contain truncated IDs (e.g. `adeaf46a`) that are NOT valid API parameters. Before calling `update_task`, `update_event`, `update_node`, or any action requiring an ID, call the corresponding `list_*` action (`list_tasks`, `list_events`, `list_nodes`) to retrieve the full UUID.

## Event CRUD

### create_event

```
mcp_contextstream_memory(
  action="create_event",
  event_type="implementation",
  title="Database schema migration to v3 complete",
  content="Migrated 15 tables to new normalized schema, updated all queries.",
  metadata={"tables_changed": 15},
  provenance={"branch": "feat/schema-v3", "commit_sha": "c8b79c1"},
  code_refs=[{"file_path": "src/database/migrations/003_normalize.sql"}]
)
```

| Parameter | Required | Description |
|-----------|----------|------------|
| `event_type` | ✅ | See [taxonomy.md](taxonomy.md) for values |
| `title` | ✅ | Short descriptive title |
| `content` | ✅ | Detailed content |
| `metadata` | — | Arbitrary key-value metadata |
| `provenance` | — | `{"branch": "...", "commit_sha": "..."}` |
| `code_refs` | — | Array of `{"file_path": "..."}` |

> `memory.create_event` accepts **any string** for `event_type` (more flexible than `session.capture` which enforces the enum). Use standard values from [taxonomy.md](taxonomy.md) for consistency.

### get_event / update_event / delete_event

| Action | Parameters |
|--------|----------|
| `get_event` | `event_id` (full UUID) |
| `update_event` | `event_id`, `title?`, `content?`, `metadata?` |
| `delete_event` | `event_id` |

### list_events

| Parameter | Required | Description |
|-----------|----------|------------|
| `limit` | — | Max results to return |

### distill_event

Extract key insights from an event.

| Parameter | Required | Description |
|-----------|----------|------------|
| `event_id` | ✅ | UUID of the event to distill |

### import_batch

Bulk import multiple events at once.

| Parameter | Required | Description |
|-----------|----------|------------|
| `events` | ✅ | Array of event objects |

---

## Node CRUD

### create_node

```
mcp_contextstream_memory(
  action="create_node",
  node_type="finding",
  title="Unused Dependencies Across Packages",
  content="12/15 packages declare dependencies in package.json that are never imported.",
  category="cross-cutting",
  relations=[{"target_id": "<node_id>", "relation_type": "related_to"}]
)
```

| Parameter | Required | Description |
|-----------|----------|------------|
| `node_type` | ✅ | See [taxonomy.md](taxonomy.md) for recommended types |
| `title` | ✅ | Short descriptive title |
| `content` | ✅ | Detailed content |
| `category` | — | Categorization string |
| `relations` | — | Array of `{"target_id": "...", "relation_type": "..."}` |

> `node_type` accepts **any string** — use descriptive types for discoverability.

### get_node / update_node / delete_node

| Action | Parameters |
|--------|----------|
| `get_node` | `node_id` (full UUID) |
| `update_node` | `node_id`, `title?`, `content?` |
| `delete_node` | `node_id` |

### list_nodes

> **⚠️ BROKEN (v0.4.64)**: The `node_type` filter parameter is ignored — always returns `fact` nodes regardless of filter value. Use `memory(summary)` for aggregate counts by type.

| Parameter | Required | Description |
|-----------|----------|------------|
| `limit` | — | Max results to return |

### supersede_node

Replace a node with an updated version (marks old as superseded).

| Parameter | Required | Description |
|-----------|----------|------------|
| `node_id` | ✅ | UUID of the node to supersede |

---

## Query Actions

| Action | Parameters | Description |
|--------|-----------|------------|
| `search` | `query`, `limit?` | Direct memory search (for smarter search, use the standalone `search` tool — see [session-actions.md](session-actions.md#which-search-to-use)) |
| `decisions` | `category?`, `limit?` | **⚠️ BROKEN (v0.4.64)**: Returns empty despite decision events existing. Cause: filters on stored `event_type` (`manual_note`) instead of `metadata.original_type`. Use `memory(summary)` for counts or `recall(query="...")` for search. |
| `timeline` | — | Get event timeline |
| `summary` | `query?` | Aggregate counts: `events`, `nodes`, `decisions`, `facts`, `event_type_counts` (e.g. task:84, decision:41, insight:29). Use this instead of `list_nodes` when you need totals — it's a single call with no pagination. |

---

## Task CRUD

### create_task

```
mcp_contextstream_memory(
  action="create_task",
  title="Implement auth middleware",
  content="Add JWT validation middleware with refresh token support",
  plan_id="<plan_id>",
  plan_step_id="2",
  priority="high",
  tags=["authentication", "security"]
)
```

| Parameter | Required | Description |
|-----------|----------|------------|
| `title` | ✅ | Task title |
| `content` | — | Detailed description |
| `plan_id` | — | Link to a plan (full UUID) |
| `plan_step_id` | — | Which plan step this task maps to |
| `priority` | — | `"low"`, `"medium"`, `"high"`, `"urgent"` |
| `tags` | — | Array of string tags |

> **Priority enum**: `low | medium | high | urgent` — NOT `normal`.

> **Always create tasks after `capture_plan`.** Plan steps are just the outline — they are NOT trackable work items. You must create tasks via `create_task` with `plan_id` + `plan_step_id` to get status tracking (`pending → in_progress → completed`).

### update_task

```
mcp_contextstream_memory(action="update_task", task_id="<full_uuid>", status="in_progress")
```

| Parameter | Required | Description |
|-----------|----------|------------|
| `task_id` | ✅ | Full UUID |
| `status` | — | `"pending"`, `"in_progress"`, `"completed"`, `"blocked"`, `"cancelled"` |
| `title` | — | Updated title |
| `content` | — | Updated content |
| `plan_id` | — | Link/relink to a plan |

> **`blocked` status** accepts an optional `blocked_reason` parameter to explain the blocker.

> **Capture before completing.** Never mark a task `completed` until you have persisted its outputs (insights, decisions, findings) via `capture()`. Checklist: **1) Capture knowledge → 2) Mark task complete → 3) Update VS Code todo list.**

### get_task / delete_task

| Action | Parameters |
|--------|----------|
| `get_task` | `task_id` (full UUID) |
| `delete_task` | `task_id` |

### list_tasks

| Parameter | Required | Description |
|-----------|----------|------------|
| `plan_id` | — | Filter by plan |
| `status` | — | Filter by status (`pending \| in_progress \| completed \| blocked \| cancelled`) |
| `limit` | — | Max results |

### reorder_tasks

Reorder tasks within a plan. No parameters documented.

---

## Todo CRUD

Lightweight cross-session reminders (simpler than tasks — no plan linkage).

### create_todo

| Parameter | Required | Description |
|-----------|----------|------------|
| `title` | ✅ | Todo title |
| `content` | — | Detailed description |
| `priority` | — | Priority level |
| `tags` | — | Array of string tags |

### update_todo / complete_todo / delete_todo

| Action | Parameters |
|--------|----------|
| `get_todo` | `todo_id` |
| `update_todo` | `todo_id`, `status?`, `title?`, `content?` |
| `complete_todo` | `todo_id` |
| `delete_todo` | `todo_id` |

### list_todos

No parameters.

---

## Diagram CRUD

Mermaid diagrams that persist across sessions.

### create_diagram

```
mcp_contextstream_memory(
  action="create_diagram",
  title="Service Dependency Graph",
  diagram_type="flowchart",
  content="graph TD\n  A[auth-service] --> B[user-service]\n  B --> C[database]"
)
```

| Parameter | Required | Description |
|-----------|----------|------------|
| `title` | ✅ | Diagram title |
| `diagram_type` | ✅ | `"flowchart"`, `"sequence"`, `"class"`, `"er"`, `"gantt"`, `"pie"`, `"mindmap"`, `"other"` |
| `content` | ✅ | Mermaid syntax |

### get_diagram / update_diagram / delete_diagram / list_diagrams

| Action | Parameters |
|--------|----------|
| `get_diagram` | `diagram_id` |
| `update_diagram` | `diagram_id`, `title?`, `content?` |
| `delete_diagram` | `diagram_id` |
| `list_diagrams` | — |

---

## Doc CRUD

Persistent specifications, roadmaps, and documentation.

### create_doc

```
mcp_contextstream_memory(
  action="create_doc",
  title="Architecture Overview",
  doc_type="spec",
  content="# System Architecture\n\n...",
  tags=["architecture", "overview"]
)
```

| Parameter | Required | Description |
|-----------|----------|------------|
| `title` | ✅ | Document title |
| `doc_type` | ✅ | `"spec"` (architecture/design), `"roadmap"` (milestones), `"general"` |
| `content` | ✅ | Document content (Markdown) |
| `tags` | — | Array of string tags |

### create_roadmap

Convenience action for creating roadmap docs with milestones.

| Parameter | Required | Description |
|-----------|----------|------------|
| `title` | ✅ | Roadmap title |
| `milestones` | ✅ | Array of milestone objects |

### get_doc / update_doc / delete_doc / list_docs

| Action | Parameters |
|--------|----------|
| `get_doc` | `doc_id` |
| `update_doc` | `doc_id`, `title?`, `content?` |
| `delete_doc` | `doc_id` |
| `list_docs` | — |

---

## Transcript Actions

Access conversation transcripts.

| Action | Parameters | Description |
|--------|-----------|------------|
| `list_transcripts` | `session_id?`, `client_name?`, `started_after?`, `started_before?` | List transcripts with optional filters |
| `get_transcript` | `transcript_id` | Get a specific transcript |
| `search_transcripts` | `query`, `limit?` | Search transcript content |
| `delete_transcript` | `transcript_id` | Delete a transcript |
