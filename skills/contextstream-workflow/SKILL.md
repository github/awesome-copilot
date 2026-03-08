---
name: contextstream-workflow
description: "Manage persistent AI memory across sessions using ContextStream MCP. Covers session lifecycle, plans, tasks, decisions, lessons, knowledge graph, todos, diagrams, docs, preferences, reminders, integrations, media, and the full taxonomy of event types and node types."
---

# ContextStream Workflow Skill

> **Source of truth**: https://github.com/contextstream/mcp-server
> **ContextStream docs**: https://contextstream.io/docs/mcp/tools

## Purpose

ContextStream is persistent memory that survives across AI sessions. Use it to track plans, tasks, decisions, lessons, knowledge, todos, diagrams, docs, preferences, reminders, and integrations so future sessions don't start from scratch.

**Maximize usage** — ContextStream is not just a note-taking tool. It is a knowledge graph. Use ALL event types, ALL node types, and ALL persistence features (docs, diagrams, todos, reminders) to build a fully connected context that enables informed decision-making across sessions.

## Domain Tool Architecture

ContextStream uses **consolidated domain tools** — each domain is a single tool with an `action` parameter:

| Tool | Purpose |
|------|---------|
| `init` | Initialize session, load relevant context |
| `context` | Get smart context for each user message (**call before every response**) |
| `session` | Session management: capture events, lessons, plans, recall, search |
| `search` | Search workspace memory and knowledge |
| `memory` | CRUD for events, nodes, tasks, todos, diagrams, docs, transcripts |
| `graph` | Code graph analysis: dependencies, impact, call paths |
| `project` | Project management and indexing |
| `workspace` | Workspace management |
| `reminder` | Time-based reminders that surface automatically |
| `integration` | Slack, GitHub, and Notion integrations |
| `media` | Video/audio/image indexing and search |
| `help` | Utility: list tools, auth, version, editor rules |
| `generate_rules` | Generate AI editor rules for the workspace |

## Complete Taxonomy

### Event Types

Events are temporal records. The `session(action="capture")` tool accepts these **exact enum values** for `event_type`:

| Event Type | Enum Value | When to Use |
|------------|-----------|-------------|
| Conversation | `conversation` | General conversation capture, meeting notes |
| Decision | `decision` | Architecture choice, technology selection, pattern adoption |
| Insight | `insight` | Analysis result, review summary, pattern discovery |
| Preference | `preference` | User convention expressed during session |
| Note | `note` | General-purpose note |
| Implementation | `implementation` | Code delivered, feature complete, refactor done |
| Task | `task` | Task status update or work item |
| Bug | `bug` | Bug discovered, defect report |
| Feature | `feature` | Feature request or proposal |
| Plan | `plan` | Auto-created by `capture_plan` — do not create manually |
| Correction | `correction` | User corrected the AI's approach |
| Lesson | `lesson` | Extracted lesson from correction |
| Warning | `warning` | Critical issue, security bug, proactive reminder |
| Frustration | `frustration` | User expressed frustration (auto-triggers lesson capture) |
| Session Snapshot | `session_snapshot` | Pre-compaction state capture (used by `capture_smart`) |

> **Note**: `memory(action="create_event")` accepts **any string** for `event_type` — it's more flexible than session capture. Use the standard values above for consistency.

**Usage via session tool**:
```
mcp_contextstream_session(
  action="capture",
  event_type="warning",
  title="Security: endpoint missing auth check",
  content="The delete endpoint does not verify resource ownership before deletion.",
  importance="critical",
  code_refs=[{"file_path": "src/endpoints/resource.ts"}],
  provenance={"branch": "main", "commit_sha": "abc1234"}
)
```

**Usage via memory tool** (supports provenance for git linking):
```
mcp_contextstream_memory(
  action="create_event",
  event_type="implementation",
  title="Database migration complete",
  content="Migrated all tables to new schema. 15 files updated.",
  metadata={"files_changed": 15},
  provenance={"branch": "feat/db-migration", "commit_sha": "def5678"}
)
```

### Node Types (Knowledge Graph)

Nodes are persistent knowledge entries captured via `memory(action="create_node")`. The `node_type` field accepts **any string** — use descriptive types for discoverability.

**Recommended node types**:

| Node Type | When to Use | Category Examples |
|-----------|------------|-------------------|
| `fact` | Verified truth about the codebase, API, or system | `"architecture"`, `"sdk-pattern"`, `"dependency"` |
| `preference` | User convention, coding standard, workflow rule | `"code-style"`, `"workflow"`, `"tooling"` |
| `constraint` | Hard rule that must not be violated | `"architecture"`, `"tier-rules"`, `"security"` |
| `decision` | Resolved choice (node form for standing rules) | `"architecture"`, `"technology"` |
| `finding` | Discovery from analysis, review, or investigation | `"cross-cutting"`, `"review"`, `"debt"` |
| `hypothesis` | Unverified theory, proposed improvement | `"improvement"`, `"refactor"`, `"experiment"` |
| `bug` | Known defect, broken behavior, security vulnerability | `"security"`, `"compilation"`, `"test-failure"` |
| `lesson` | Learned pattern from mistake or correction | `"anti-pattern"`, `"tooling"`, `"workflow"` |
| `habit` | Recurring user behavior pattern to optimize for | `"workflow"`, `"preference"` |
| `code` | Code snippet, pattern, or template worth preserving | `"pattern"`, `"template"`, `"example"` |
| `insight` | Analytical observation | `"review"`, `"analysis"` |
| `commit` | Notable commit worth referencing | `"milestone"`, `"breaking-change"` |
| `doc` | Reference documentation or spec (node form) | `"api"`, `"architecture"` |
| `pr` | Pull request context or review notes | `"review"`, `"merge"` |
| `ticket` | Issue tracker reference | `"feature"`, `"bug"`, `"enhancement"` |
| `conversation` | Important discussion worth preserving | `"design"`, `"requirements"` |
| `meeting` | Meeting notes or outcomes | `"standup"`, `"planning"` |
| `general` | Generic node that doesn't fit other types | — |

**Usage**:
```
mcp_contextstream_memory(
  action="create_node",
  node_type="finding",
  title="Unused Dependencies Across Monorepo",
  content="12 of 19 packages declare dependencies in their manifest that are never imported in source code."
)
```

### Choosing Between Events and Nodes

| Use Case | Use Event | Use Node |
|----------|-----------|----------|
| Something happened at a point in time | ✅ Event (temporal) | — |
| A standing truth or rule | — | ✅ Node (persistent) |
| Architecture decision | ✅ Decision event (when made) | ✅ Decision node (as standing rule) |
| Bug discovered during review | ✅ Warning event (to alert) | ✅ Bug node (to track) |
| Cross-cutting pattern found | ✅ Insight event (in review) | ✅ Finding node (as reference) |
| User coding convention | — | ✅ Preference node |
| Something to investigate later | — | ✅ Hypothesis node |

**Best practice**: For important discoveries, capture **both** an event (temporal record) and a node (persistent knowledge). Events answer "what happened when?" — nodes answer "what do we know?"

## Session Lifecycle

### 1. Session Start

Always call `init` first to load relevant context:

```
mcp_contextstream_init(
  context_hint="<user's first message>"
)
```

Returns: workspace info, recent memory, decisions, lessons, active plans/tasks, ingest_recommendation. The `context_hint` triggers semantic search for relevant past context.

For subsequent messages in the same session, call `context` **before every response**:

```
mcp_contextstream_context(
  user_message="<current user message>"
)
```

Returns compact context (~200 tokens) with decisions, preferences, memory, and context pressure indicator.

**Context parameters**:
- `format`: `"minified"` (default, ~200 tokens), `"readable"`, `"structured"`
- `mode`: `"standard"` or `"pack"` (includes code context + distillation)
- `max_tokens`: Maximum tokens for context (default: 800)
- `session_tokens`: Cumulative session token count for pressure calculation
- `context_threshold`: Custom context window threshold (default: 70k)

### 2. Planning Work

Create a **plan** with steps:

```
mcp_contextstream_session(
  action="capture_plan",
  title="Implement user authentication flow",
  description="Add OAuth2 login with JWT tokens and session management",
  goals=["OAuth2 integration", "JWT token handling", "Session persistence"],
  steps=[
    {"id": "1", "title": "Research OAuth2 provider options", "order": 1, "estimated_effort": "small"},
    {"id": "2", "title": "Implement auth middleware", "order": 2, "estimated_effort": "medium"},
    {"id": "3", "title": "Add session management", "order": 3, "estimated_effort": "medium"}
  ]
)
```

Then create **tasks** linked to the plan:

```
mcp_contextstream_memory(
  action="create_task",
  title="Implement auth middleware",
  plan_id="<plan_id>",
  plan_step_id="2",
  priority="high"
)
```

### 3. During Work

**When starting a task**:
```
mcp_contextstream_memory(action="update_task", task_id="<id>", status="in_progress")
```

**When making a decision**:
```
mcp_contextstream_session(
  action="capture", event_type="decision",
  title="Use JWT with refresh tokens over session cookies",
  content="Chose JWT with short-lived access + refresh tokens for stateless auth.",
  code_refs=[{"file_path": "src/middleware/auth.ts"}]
)
```

**When completing a task**:
```
mcp_contextstream_memory(action="update_task", task_id="<id>", status="completed")
```

### 4. Capturing Lessons

```
mcp_contextstream_session(
  action="capture_lesson",
  title="Always validate JWT expiry before refresh",
  trigger="Accepted expired JWT without checking exp claim",
  impact="Security vulnerability — stale tokens accepted",
  prevention="Always check exp claim before processing any JWT",
  severity="high",
  category="code_quality"
)
```

Categories: `workflow`, `code_quality`, `verification`, `communication`, `project_specific`.

### 5. Pre-Compaction Snapshot

When context pressure is high, save state before compaction:

```
mcp_contextstream_session(
  action="capture_smart",
  conversation_summary="Implementing OAuth2 authentication flow...",
  current_goal="Write tests for auth middleware",
  active_files=["src/middleware/auth.ts", "src/routes/login.ts"],
  recent_decisions=[{"title": "Use JWT with refresh tokens", "rationale": "Stateless auth needed for horizontal scaling"}],
  unfinished_work=[{"task": "Write auth middleware tests", "status": "in_progress"}]
)
```

After compaction, restore with:
```
mcp_contextstream_session(action="restore_context")
```

### 6. Completing Work

```
mcp_contextstream_session(action="update_plan", plan_id="<id>", status="completed")
```

Create a summary event:
```
mcp_contextstream_memory(
  action="create_event",
  event_type="implementation",
  title="OAuth2 authentication flow complete",
  content="Implemented: OAuth2 login, JWT middleware, refresh tokens, session management, 24 tests.",
  provenance={"branch": "feat/auth", "commit_sha": "abc1234"}
)
```

## Search

The `search` tool supports multiple modes:

| Mode | Description |
|------|-------------|
| `auto` | **(recommended)** Let ContextStream choose the best mode |
| `semantic` | Meaning-based vector search |
| `hybrid` | Legacy alias for `auto` |
| `keyword` | Exact match search |
| `pattern` | Regex/pattern search |
| `exhaustive` | All matches like grep |
| `refactor` | Word-boundary matching for symbol renaming |
| `team` | Cross-project team search (team plans only) |

**Output formats** (for token optimization):

| Format | Description | Token Savings |
|--------|-------------|---------------|
| `full` | Default — includes content | baseline |
| `paths` | File paths only | ~80% |
| `minimal` | Compact format | ~60% |
| `count` | Match counts only | ~90% |

```
mcp_contextstream_search(
  mode="semantic",
  query="authentication middleware patterns",
  limit=5,
  output_format="full"
)
```

## Session Actions Reference

| Action | Parameters | Description |
|--------|-----------|-------------|
| `capture` | `event_type`, `title`, `content`, `importance?`, `tags?`, `code_refs?`, `provenance?` | Save event to memory |
| `capture_lesson` | `title`, `trigger`, `impact`, `prevention`, `severity`, `category`, `keywords?` | Save lesson from mistake |
| `get_lessons` | `query?`, `category?`, `severity?`, `limit?` | Retrieve lessons |
| `recall` | `query` | Natural language recall |
| `remember` | `content`, `importance?` | Quick save to memory |
| `smart_search` | `query`, `include_related?`, `include_decisions?` | Context-enriched search |
| `decision_trace` | `query`, `include_impact?`, `limit?` | Trace decisions to provenance and code |
| `user_context` | — | Get user preferences |
| `summary` | `max_tokens?` | Compact workspace summary |
| `compress` | `content` | Extract & store key info from chat history |
| `delta` | `since` (ISO timestamp), `limit?` | Changes since timestamp |
| `capture_plan` | `title`, `description?`, `goals?`, `steps?` | Create implementation plan |
| `get_plan` | `plan_id` | Retrieve plan with tasks |
| `update_plan` | `plan_id`, `status?` | Update plan status |
| `list_plans` | — | List all plans |
| `restore_context` | `snapshot_id?` | Restore after compaction |

## Memory Actions Reference

### Event CRUD

| Action | Parameters |
|--------|-----------|
| `create_event` | `event_type`, `title`, `content`, `metadata?`, `provenance?`, `code_refs?` |
| `get_event` | `event_id` |
| `update_event` | `event_id`, `title?`, `content?`, `metadata?` |
| `delete_event` | `event_id` |
| `list_events` | `limit?` |
| `distill_event` | `event_id` — extract key insights |
| `import_batch` | `events` (array) — bulk import |

### Node CRUD

| Action | Parameters |
|--------|-----------|
| `create_node` | `node_type`, `title`, `content`, `relations?` |
| `get_node` | `node_id` |
| `update_node` | `node_id`, `title?`, `content?` |
| `delete_node` | `node_id` |
| `list_nodes` | `limit?` |
| `supersede_node` | `node_id` — replace with updated version |

### Query Actions

| Action | Parameters |
|--------|-----------|
| `search` | `query`, `limit?` |
| `decisions` | `category?`, `limit?` |
| `timeline` | — |
| `summary` | — |

### Task Actions

| Action | Parameters |
|--------|-----------|
| `create_task` | `title`, `content?`, `plan_id?`, `plan_step_id?`, `priority?`, `tags?` |
| `get_task` | `task_id` |
| `update_task` | `task_id`, `status?`, `title?`, `content?`, `plan_id?` |
| `delete_task` | `task_id` |
| `list_tasks` | `plan_id?`, `status?`, `limit?` |
| `reorder_tasks` | — |

### Todo Actions

| Action | Parameters |
|--------|-----------|
| `create_todo` | `title`, `content?`, `priority?`, `tags?` |
| `get_todo` | `todo_id` |
| `update_todo` | `todo_id`, `status?`, `title?`, `content?` |
| `delete_todo` | `todo_id` |
| `list_todos` | — |
| `complete_todo` | `todo_id` |

### Diagram Actions

| Action | Parameters |
|--------|-----------|
| `create_diagram` | `title`, `diagram_type`, `content` (Mermaid) |
| `get_diagram` | `diagram_id` |
| `update_diagram` | `diagram_id`, `title?`, `content?` |
| `delete_diagram` | `diagram_id` |
| `list_diagrams` | — |

Diagram types: `flowchart`, `sequence`, `class`, `state`, `er`, `gantt`, `pie`, `mindmap`.

### Doc Actions

| Action | Parameters |
|--------|-----------|
| `create_doc` | `title`, `doc_type`, `content`, `tags?` |
| `get_doc` | `doc_id` |
| `update_doc` | `doc_id`, `title?`, `content?` |
| `delete_doc` | `doc_id` |
| `list_docs` | — |
| `create_roadmap` | `title`, `milestones` |

Doc types: `spec` (architecture/design), `roadmap` (milestones/planning), `general` (other).

### Transcript Actions

| Action | Parameters |
|--------|-----------|
| `list_transcripts` | `session_id?`, `client_name?`, `started_after?`, `started_before?` |
| `get_transcript` | `transcript_id` |
| `search_transcripts` | `query`, `limit?` |
| `delete_transcript` | `transcript_id` |

## Graph Actions Reference

| Action | Parameters | Description |
|--------|-----------|-------------|
| `dependencies` | `target: {type, id}`, `max_depth?`, `include_transitive?` | Module dependency graph |
| `impact` | `target: {type, id}`, `max_depth?` | Change impact analysis |
| `call_path` | `source: {type, id}`, `target: {type, id}`, `max_depth?` | Function call path |
| `related` | `node_id`, `limit?` | Find related knowledge nodes |
| `path` | `source_id`, `target_id` | Path between two nodes |
| `decisions` | `limit?` | Decision history in graph |
| `ingest` | `project_id?`, `wait?` | Build code dependency graph |
| `circular_dependencies` | `project_id?` | Detect circular deps |
| `unused_code` | `project_id?` | Detect unused code |
| `contradictions` | `node_id` | Find contradicting knowledge |

Target types for `dependencies`/`impact`: `module` (aliases: file, path), `function` (alias: method), `type` (aliases: struct, enum, trait, class), `variable` (aliases: data, const, constant).

## Reminders

Time-based reminders that surface automatically in `context()` calls when due.

```
mcp_contextstream_reminder(
  action="create",
  title="Review dependency audit results",
  content="Check if the new dependency version resolves the security advisory",
  remind_at="2025-07-15T09:00:00Z",
  priority="high",
  recurrence="weekly",
  keywords=["security", "dependencies", "audit"]
)
```

| Action | Parameters |
|--------|-----------|
| `list` | `status?` (`pending`/`completed`/`dismissed`/`snoozed`), `priority?`, `limit?` |
| `active` | `context?`, `limit?` — get pending/overdue/due-soon |
| `create` | `title`, `content?`, `remind_at`, `priority?`, `recurrence?`, `keywords?` |
| `snooze` | `reminder_id`, `until` (ISO datetime) |
| `complete` | `reminder_id` |
| `dismiss` | `reminder_id` |

Priorities: `low`, `normal`, `high`, `urgent`.
Recurrence: `daily`, `weekly`, `monthly`.

## Integrations

Access Slack, GitHub, and Notion data through the `integration` tool.

```
mcp_contextstream_integration(
  provider="github",
  action="search",
  query="authentication middleware"
)
```

| Provider | Actions |
|----------|---------|
| `slack` | `stats`, `channels`, `contributors`, `activity`, `discussions`, `search`, `knowledge`, `summary` |
| `github` | `stats`, `repos`, `contributors`, `activity`, `issues`, `search`, `knowledge`, `summary` |
| `notion` | `create_page`, `search_pages`, `list_databases`, `get_page`, `query_database`, `update_page`, `stats`, `activity`, `knowledge`, `summary` |
| (cross) | `search` (all sources), `summary` (all sources), `knowledge` (all sources) |

## Quick Reference — When to Use What

| Moment | Tool | Action | Type |
|--------|------|--------|------|
| Session start | `init` | Load context | — |
| Subsequent messages | `context` | Get relevant context | — |
| Multi-step work begins | `session` | `capture_plan` | Plan |
| Each step starts | `memory` | `update_task` → `in_progress` | — |
| Design choice made | `session` | `capture` | `decision` |
| Critical issue found | `session` | `capture` | `warning` |
| Analysis complete | `session` | `capture` | `insight` |
| Feature shipped | `memory` | `create_event` | `implementation` |
| Bug discovered | `session` | `capture` | `bug` |
| User corrects us | `session` | `capture_lesson` | Lesson |
| Step completed | `memory` | `update_task` → `completed` | — |
| All work done | `session` | `update_plan` → `completed` | — |
| New pattern discovered | `memory` | `create_node` type=`fact` | Fact node |
| Cross-cutting finding | `memory` | `create_node` type=`finding` | Finding node |
| Known defect | `memory` | `create_node` type=`bug` | Bug node |
| Hard architectural rule | `memory` | `create_node` type=`constraint` | Constraint node |
| User convention | `memory` | `create_node` type=`preference` | Preference node |
| Improvement theory | `memory` | `create_node` type=`hypothesis` | Hypothesis node |
| Code pattern to reuse | `memory` | `create_node` type=`code` | Code node |
| Quick reminder | `memory` | `create_todo` | — |
| Time-based reminder | `reminder` | `create` | — |
| Architecture diagram | `memory` | `create_diagram` | — |
| Persistent spec/roadmap | `memory` | `create_doc` | — |
| Need past context | `session` | `recall` | — |
| Trace decision history | `session` | `decision_trace` | — |
| Retrieve preferences | `session` | `user_context` | — |
| Before compaction | `session` | `capture_smart` | Snapshot |
| After compaction | `session` | `restore_context` | — |

## Dual Capture Pattern

For important discoveries, capture **both** forms:

1. **Event** (temporal — "when did we learn this?"):
```
mcp_contextstream_session(
  action="capture", event_type="warning",
  title="Security: endpoint missing ownership verification",
  content="The delete handler does not check resource ownership..."
)
```

2. **Node** (persistent knowledge — "what do we know?"):
```
mcp_contextstream_memory(
  action="create_node", node_type="bug",
  title="Delete endpoint allows unauthorized resource deletion",
  content="Any authenticated user can delete any resource — missing ownership check..."
)
```

## Relationship to VS Code Todo List

Use **both** systems:
- **VS Code `manage_todo_list`**: Visible in-session progress tracking (UI feedback)
- **ContextStream plans/tasks**: Persistent across sessions, queryable, linked to decisions

Mirror plan steps in VS Code todo list. Update both as work progresses.

## File Indexing Rules

ContextStream indexes workspace files for semantic search and code graph analysis. Understanding what gets indexed is critical for effective search.

### Supported File Extensions

Only files with these extensions are indexed:

| Category | Extensions |
|----------|-----------|
| Rust | `rs` |
| TypeScript/JavaScript | `ts`, `tsx`, `js`, `jsx`, `mjs`, `cjs` |
| Python | `py`, `pyi` |
| Go | `go` |
| Java/Kotlin | `java`, `kt`, `kts` |
| C/C++ | `c`, `h`, `cpp`, `hpp`, `cc`, `cxx` |
| C# | `cs` |
| Ruby | `rb` |
| PHP | `php` |
| Swift | `swift` |
| Scala | `scala` |
| Shell | `sh`, `bash`, `zsh` |
| Config/Data | `json`, `yaml`, `yml`, `toml`, `xml` |
| SQL | `sql` |
| Docs | `md`, `markdown`, `rst`, `txt` |
| Web | `html`, `htm`, `css`, `scss`, `sass`, `less` |
| Other | `graphql`, `proto`, `dockerfile` |

> **Note**: Some languages (e.g., Dart, Elixir, Haskell, Lua) are **not** currently supported. If your project uses a language not listed above, semantic search over source code files will not work — use local workspace search tools instead. Config/doc files (`.yaml`, `.json`, `.md`) from any project are still indexed. See [feature request #15](https://github.com/contextstream/mcp-server/issues/15) to track language support expansion.

### Always-Ignored Directories

These directories are hardcoded as ignored:

```
node_modules, .git, .svn, .hg, target, dist, build, out,
.next, .nuxt, __pycache__, .pytest_cache, .mypy_cache,
venv, .venv, env, .env, vendor, coverage, .coverage,
.idea, .vscode, .vs
```

### Always-Ignored Files

```
.DS_Store, Thumbs.db, .gitignore, .gitattributes,
package-lock.json, yarn.lock, pnpm-lock.yaml,
Cargo.lock, poetry.lock, Gemfile.lock, composer.lock
```

### Size Limits

| Limit | Value | Purpose |
|-------|-------|---------|
| Max file size | **5 MB** | Files larger than this are skipped entirely |
| Large file threshold | **2 MB** | Files above this are batched individually |
| Max batch bytes | **10 MB** | Total bytes per indexing batch |
| Max files per batch | **200** | Soft limit on files per batch |

### Custom Ignore Patterns

Create `.contextstream/ignore` in the project root to exclude additional paths. Uses **gitignore syntax**.

```gitignore
# .contextstream/ignore — Additional exclusions from ContextStream indexing

# Sensitive data
**/customer-data/
**/secrets/
**/*.pem
**/*.key

# Large generated files
**/generated/
**/*.min.js

# Vendor code
**/third-party/
```

The default ignore patterns are always applied **in addition** to any user patterns.

### Git Metadata

When indexing from a git repository, ContextStream captures per-file metadata:
- `git_branch` — current branch name
- `git_default_branch` — repository default branch
- `is_default_branch` — whether indexing from default branch
- `git_commit_sha` — last commit SHA that modified the file
- `git_commit_timestamp` — timestamp of that commit
- `machine_id` — stable hash of hostname (for multi-machine sync)

### Content Hash Manifest

ContextStream stores SHA-256 hashes per file at `~/.contextstream/file-hashes/{projectId}.json` to enable **incremental indexing** — unchanged files are skipped on re-index.

## MCP Error Investigation Protocol

When a ContextStream MCP call returns an unexpected error:

1. **Check parameters first** — verify required fields, UUID format, valid enum values
2. **Check session state** — many tools require `init` to have been called first
3. **Check ID validity** — use full UUIDs, not truncated ones
4. **Determine fault**:
   - **Our fault**: wrong params, missing required fields, invalid enum value, stale IDs
   - **MCP server bug**: valid call that returns internal error, inconsistent behavior, docs/source mismatch
5. **If MCP bug**: report at https://github.com/contextstream/mcp-server/issues

**Common error patterns**:
- `NOT_FOUND` on task/plan IDs → usually truncated UUID; fetch full ID from plan
- `workspace_id is required` → `init` not called or session expired
- `TypeError: fetch failed` → MCP server connectivity issue (retry or use fallback)

## What NOT to Store

- Trivial file reads or searches (noise)
- Intermediate tool outputs (ephemeral)
- Things already in git history (redundant)
- Per-line code changes (too granular — summarize instead)

## What to ALWAYS Store

- Architecture decisions (Decision event + Decision/Preference node)
- Critical bugs and security issues (Warning event + Bug node)
- Cross-cutting patterns from reviews (Insight event + Finding node)
- User conventions and rules (Preference node)
- Hard architectural constraints (Constraint node)
- Improvement theories to evaluate later (Hypothesis node)
- Implementation completions with provenance (Implementation event)
- Lessons from mistakes (capture_lesson)
- Review summaries (Insight event)
- Dependency diagrams (Diagram)
- Architecture specs and roadmaps (Doc)

## Anti-Patterns Learned

1. **Using only `insight` events for everything** — use the proper event type
2. **Embedding decisions inside review prose** — extract each as its own Decision event
3. **Skipping node creation** — events record when, nodes make it findable. Create both.
4. **Not creating diagrams** — Mermaid diagrams persist across sessions
5. **Not updating docs** — stale docs mislead future sessions
6. **Ignoring preferences** — they surface in `context()`. Capture them.
7. **Truncating UUIDs** — always use full UUID from API responses
8. **Not calling `context()` each message** — context pressure and relevant decisions are missed
