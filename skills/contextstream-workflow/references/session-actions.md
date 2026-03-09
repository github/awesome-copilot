# Session Actions Reference

> All actions available on `mcp_contextstream_session(action="...")` and related lifecycle tools.

## Session Lifecycle

### 1. Init (first message only)

```
mcp_contextstream_init(context_hint="<user's first message>")
```

Returns: workspace info, recent memory, decisions, lessons, active plans/tasks, ingest_recommendation.

### 2. Context (every subsequent message)

```
mcp_contextstream_context(user_message="<current user message>")
```

Returns compact context (~200 tokens) with decisions, preferences, memory, and context pressure indicator.

**Parameters**:

| Parameter | Default | Options |
|-----------|---------|--------|
| `format` | `"minified"` | `"minified"` (~200 tokens), `"readable"`, `"structured"` |
| `mode` | `"standard"` | `"standard"`, `"pack"` (includes code context + distillation) |
| `max_tokens` | 800 | Maximum tokens for context |
| `session_tokens` | — | Cumulative session token count for pressure calculation |
| `context_threshold` | 70000 | Custom context window threshold |

## Which Search to Use

Multiple search mechanisms exist — pick the right one:

| Mechanism | Tool | Best For |
|-----------|------|----------|
| `search` (standalone) | `mcp_contextstream_search(mode="auto")` | **Default choice** — smart mode selection, supports semantic/keyword/pattern/exhaustive |
| `recall` | `session(action="recall")` | Natural language recall — "what did we decide about X?" |
| `smart_search` | `session(action="smart_search")` | Context-enriched search — includes related nodes and decisions |
| `memory.search` | `memory(action="search")` | Direct memory search — simpler, lower-level |
| `decision_trace` | `session(action="decision_trace")` | Trace decisions to provenance and code refs |

> **Rule of thumb**: Use `search(mode="auto")` for general queries. Use `recall` when you want narrative context. Use `smart_search` when you need related knowledge included. Use `decision_trace` when tracing rationale.

---

## Session Actions

### capture

Save an event to memory.

```
mcp_contextstream_session(
  action="capture",
  event_type="decision",
  title="Use connection pooling for database queries",
  content="Chose connection pool over per-request connections to handle concurrent load.",
  importance="high",
  code_refs=[{"file_path": "src/database/connection_pool.ts"}],
  provenance={"branch": "feat/db-pooling", "commit_sha": "abc1234"}
)
```

| Parameter | Required | Description |
|-----------|----------|------------|
| `event_type` | ✅ | See [taxonomy.md](taxonomy.md) for valid enum values |
| `title` | ✅ | Short descriptive title |
| `content` | ✅ | Detailed content |
| `importance` | — | `"low"`, `"medium"`, `"high"`, `"critical"` |
| `tags` | — | Array of string tags |
| `code_refs` | — | Array of `{"file_path": "..."}` objects |
| `provenance` | — | `{"branch": "...", "commit_sha": "..."}` |

### capture_lesson

Save a lesson from a mistake or correction.

```
mcp_contextstream_session(
  action="capture_lesson",
  title="Task priority enum does not include 'normal'",
  trigger="Used priority='normal' when creating a task",
  impact="Validation error — task creation failed",
  prevention="Use low|medium|high|urgent for task priority",
  severity="medium",
  category="workflow"
)
```

| Parameter | Required | Description |
|-----------|----------|------------|
| `title` | ✅ | What was learned |
| `trigger` | ✅ | What caused the mistake |
| `impact` | ✅ | What went wrong |
| `prevention` | ✅ | How to avoid it |
| `severity` | — | `"low"`, `"medium"`, `"high"`, `"critical"` |
| `category` | — | `"workflow"`, `"code_quality"`, `"verification"`, `"communication"`, `"project_specific"` |
| `keywords` | — | Array of search keywords |

### get_lessons

> **⚠️ BROKEN (v0.4.64)**: Returns empty despite lesson events existing. Lessons are stored as `manual_note` with `original_type: "lesson"` — this action doesn't query that field. **Workaround**: Lessons still auto-surface as `[LESSONS_WARNING]` in `context()` responses.

Retrieve past lessons.

| Parameter | Required | Description |
|-----------|----------|------------|
| `query` | — | Natural language search |
| `category` | — | Filter by category |
| `severity` | — | Filter by severity |
| `limit` | — | Max results |

### recall

Natural language recall from memory.

```
mcp_contextstream_session(action="recall", query="database migration decisions")
```

### remember

Quick-save content to memory without full event structure.

```
mcp_contextstream_session(action="remember", content="Node.js 22 changes EventEmitter behavior", importance="high")
```

### smart_search

Context-enriched search that includes related knowledge.

| Parameter | Required | Description |
|-----------|----------|------------|
| `query` | ✅ | Search query |
| `include_related` | — | Include related nodes |
| `include_decisions` | — | Include decision history |

### decision_trace

> **⚠️ BROKEN (v0.4.64)**: Always returns empty `decisions` array. Same classification mismatch as `get_lessons` — queries `event_type` instead of `metadata.original_type`. **Workaround**: Use `recall(query="decision about X")` for semantic search instead.

Trace decisions back to provenance and code.

| Parameter | Required | Description |
|-----------|----------|------------|
| `query` | ✅ | Decision topic to trace |
| `include_impact` | — | Include impact analysis |
| `limit` | — | Max results |

### user_context

Get stored user preferences and conventions. No parameters.

### summary

> **⚠️ PARTIAL (v0.4.64)**: Returns 0 counts (decision_count=0, memory_count=0). May be session-scoped rather than global. For global counts, use `memory(action="summary")` instead.

Get compact workspace summary.

| Parameter | Required | Description |
|-----------|----------|------------|
| `max_tokens` | — | Maximum tokens for summary |

### compress

Extract and store key information from chat history.

| Parameter | Required | Description |
|-----------|----------|------------|
| `content` | ✅ | Chat content to compress |

### delta

> **⚠️ BROKEN (v0.4.64)**: Returns 0 items despite recent events. Root cause unknown.

Get changes since a specific timestamp.

| Parameter | Required | Description |
|-----------|----------|------------|
| `since` | ✅ | ISO 8601 timestamp |
| `limit` | — | Max results |

## Plan Management (via session tool)

### capture_plan

Create an implementation plan with ordered steps.

> **Steps are a blueprint, NOT trackable work items.** Steps define the plan's outline but have no status or lifecycle. After creating the plan, you must create **tasks** via `memory.create_task` with `plan_id` and `plan_step_id` to get trackable, status-bearing work items. See [memory-actions.md — Task CRUD](memory-actions.md#task-crud).

```
mcp_contextstream_session(
  action="capture_plan",
  title="Implement user authentication system",
  description="Add JWT-based authentication with refresh tokens",
  goals=["Auth endpoint", "Token management", "Session handling"],
  steps=[
    {"id": "1", "title": "Research JWT best practices", "order": 1, "estimated_effort": "small"},
    {"id": "2", "title": "Implement auth middleware", "order": 2, "estimated_effort": "medium"}
  ]
)
```

| Step Field | Required | Description |
|-----------|----------|------------|
| `id` | ✅ | String identifier (e.g. `"1"`, `"2"`) |
| `title` | ✅ | Step description |
| `order` | ✅ | Numeric sort order (0-based or 1-based) |
| `estimated_effort` | ✅ | `"small"`, `"medium"`, `"large"` |

### get_plan

Retrieve a plan with its tasks.

| Parameter | Required | Description |
|-----------|----------|------------|
| `plan_id` | ✅ | Full UUID of the plan |

### update_plan

Update plan status.

| Parameter | Required | Description |
|-----------|----------|------------|
| `plan_id` | ✅ | Full UUID of the plan |
| `status` | — | `"draft"`, `"active"`, `"completed"`, `"archived"`, `"abandoned"` |

### list_plans

List all plans. No parameters.

### restore_context

Restore session state after compaction.

| Parameter | Required | Description |
|-----------|----------|------------|
| `snapshot_id` | — | Specific snapshot to restore (latest if omitted) |

## Pre-Compaction Snapshot

When context pressure is high, save state before compaction:

```
mcp_contextstream_session(
  action="capture_smart",
  conversation_summary="Working on user authentication implementation...",
  current_goal="Write tests for auth middleware",
  active_files=["src/auth/middleware.ts"],
  recent_decisions=[{"title": "Use refresh token rotation", "rationale": "Enhanced security"}],
  unfinished_work=[{"task": "Write auth middleware tests", "status": "in_progress"}]
)
```

After compaction, restore with `restore_context`.

## Search Tool

The `search` tool is a standalone tool (not a session action):

```
mcp_contextstream_search(mode="auto", query="authentication middleware pattern", limit=5, output_format="full")
```

| Mode | Description |
|------|------------|
| `auto` | **(recommended)** Let ContextStream choose the best mode |
| `semantic` | Meaning-based vector search |
| `hybrid` | Legacy alias for `auto` |
| `keyword` | Exact match search |
| `pattern` | Regex/pattern search |
| `exhaustive` | All matches like grep |
| `refactor` | Word-boundary matching for symbol renaming |
| `team` | Cross-project team search (team plans only) |

**Output formats** (for token optimization):

| Format | Token Savings |
|--------|---------------|
| `full` | Baseline — includes content |
| `paths` | ~80% — file paths only |
| `minimal` | ~60% — compact format |
| `count` | ~90% — match counts only |
