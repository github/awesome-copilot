---
name: contextstream-workflow
description: "Manage persistent AI memory across sessions using ContextStream MCP. Covers session lifecycle, plans, tasks, decisions, lessons, knowledge graph, todos, diagrams, docs, preferences, reminders, integrations, media, and the full taxonomy of event types and node types."
mcp_package: "@contextstream/mcp-server@0.4.64"
---

# ContextStream Workflow Skill

> **Source of truth**: https://contextstream.io/docs/mcp/tools
> **Last synced**: 2026-03-08 (v0.4.x consolidated domain tools)

## Purpose

ContextStream is persistent memory that survives across AI sessions. Use it to track plans, tasks, decisions, lessons, knowledge, todos, diagrams, docs, preferences, reminders, and integrations so future sessions don't start from scratch.

**Maximize usage** — it is a knowledge graph. Use ALL event types, ALL node types, and ALL persistence features to build fully connected context that enables informed decision-making across sessions.

> **Auto-distillation**: ContextStream automatically distills captured events into knowledge graph nodes. Every `capture()`, `capture_lesson()`, and `create_event()` call feeds the graph — you don't need to manually `create_node` for every piece of knowledge. The graph grows organically as you work. Manual `create_node` is for standing rules (constraints, preferences) that aren't tied to a specific event.

## Domain Tool Architecture (v0.4.x)

Each domain is a single tool with an `action` parameter:

| Tool | Purpose | Reference |
|------|---------|----------|
| `init` | Initialize session, load relevant context | [session-actions.md](references/session-actions.md) |
| `context` | Get smart context for each user message | [session-actions.md](references/session-actions.md) |
| `session` | Capture events, lessons, plans, recall, search | [session-actions.md](references/session-actions.md) |
| `search` | Search workspace memory and knowledge | [session-actions.md](references/session-actions.md) |
| `memory` | CRUD for events, nodes, tasks, todos, diagrams, docs, transcripts | [memory-actions.md](references/memory-actions.md) |
| `graph` | Knowledge graph queries (related, contradictions, decisions, path) + code graph analysis | [graph-actions.md](references/graph-actions.md) |
| `project` | Project management and indexing | [indexing.md](references/indexing.md) |
| `workspace` | Workspace management | — |
| `reminder` | Time-based reminders that surface automatically | [integrations.md](references/integrations.md) |
| `instruct` | Hot context instructions (aliases: `flash`, `ram`, `mem`) | — |
| `help` | Utility: list tools, auth, version, editor rules, bundles | — |
| `generate_rules` | Generate AI editor rules for the workspace | — |

## References

Deep reference documentation split by domain:

| File | Content |
|------|--------|
| [taxonomy.md](references/taxonomy.md) | Event types, node types, choosing between events/nodes, dual capture pattern, what to store, anti-patterns |
| [session-actions.md](references/session-actions.md) | All session tool actions with parameters, plan management, search modes, context parameters |
| [memory-actions.md](references/memory-actions.md) | CRUD for events, nodes, tasks, todos, diagrams, docs, transcripts |
| [graph-actions.md](references/graph-actions.md) | Graph tool actions, target types, code quality analysis |
| [integrations.md](references/integrations.md) | Reminder tool actions, integration/media notes |
| [indexing.md](references/indexing.md) | File extensions, ignored dirs/files, size limits, custom ignore, knowledge graph indexing |
| [error-handling.md](references/error-handling.md) | MCP error investigation, known enum values, debugging checklist |

## Session Lifecycle (Quick Reference)

### 1. Session Start

```
mcp_contextstream_init(context_hint="<user's first message>")
```

### 2. Every Subsequent Message

```
mcp_contextstream_context(user_message="<current user message>")
```

### 3. Before Planning — Check Existing Knowledge

> **⚠️ Note (v0.4.64)**: `graph(decisions)` is currently broken (returns empty). Use `recall(query="...")` for semantic search instead.

```
mcp_contextstream_session(action="recall", query="previous decisions about <topic>")
```

Review past decisions for consistency before creating a new plan.

### 4. Planning Work

```
mcp_contextstream_session(action="capture_plan", title="...", steps=[...])
mcp_contextstream_memory(action="create_task", title="...", plan_id="<id>", plan_step_id="1", priority="high")
```

> **Steps ≠ Tasks.** `capture_plan` creates a plan with steps (the blueprint/outline). Steps are NOT trackable work items — they have no status, priority, or lifecycle. After creating the plan, you MUST create **tasks** via `create_task` and link them back using `plan_id` + `plan_step_id`. Tasks are the independently trackable entities with `pending → in_progress → completed` lifecycle.

### 5. During Work

```
mcp_contextstream_memory(action="update_task", task_id="<id>", status="in_progress")
mcp_contextstream_graph(action="related", node_id="<relevant_node>")  // check existing knowledge
mcp_contextstream_session(action="capture", event_type="decision", title="...", content="...")
mcp_contextstream_graph(action="contradictions", node_id="<new_node>")  // validate no conflicts
mcp_contextstream_memory(action="update_task", task_id="<id>", status="completed")
```

> **Capture before completing.** Never mark a task `completed` until you have persisted its outputs (insights, decisions, findings) via `capture()`. Checklist: **1) Capture knowledge → 2) Mark task complete → 3) Update VS Code todo list.**

> **Graph-assisted decisions.** Before making a decision, use `graph(related)` to check what we already know about the topic. After capturing a decision, use `graph(contradictions)` to verify it doesn't conflict with existing knowledge.

### 6. Capturing Lessons

```
mcp_contextstream_session(action="capture_lesson", title="...", trigger="...", impact="...", prevention="...", severity="medium", category="workflow")
```

### 7. Completing Work

```
mcp_contextstream_session(action="recall", query="decisions made during this plan")  // verify decision coherence
mcp_contextstream_session(action="update_plan", plan_id="<id>", status="completed")
```

> Full parameter details in [session-actions.md](references/session-actions.md).

## Quick Reference — When to Use What

| Moment | Tool | Action | Type |
|--------|------|--------|------|
| Session start | `init` | Load context | — |
| Subsequent messages | `context` | Get relevant context | — |
| Multi-step work begins | `session` | `capture_plan` | Plan |
| Each step starts | `memory` | `update_task` → `in_progress` | — |
| Check existing knowledge | `graph` | `related` (node_id) | — |
| Review past decisions | `session` | `recall` (query) | ⚠️ `graph(decisions)` broken in v0.4.64 |
| Design choice made | `session` | `capture` | `decision` |
| Validate no conflicts | `graph` | `contradictions` (node_id) | — |
| Critical issue found | `session` | `capture` | `warning` |
| Feature shipped | `memory` | `create_event` | `implementation` |
| User corrects us | `session` | `capture_lesson` | Lesson |
| Step completed | `memory` | `capture()` **then** `update_task` → `completed` | — |
| All work done | `session` | Verify all tasks complete, **then** `update_plan` → `completed` | — |
| New pattern discovered | `memory` | `create_node` type=`fact` | Fact node |
| Hard architectural rule | `memory` | `create_node` type=`constraint` | Constraint node |
| User convention | `memory` | `create_node` type=`preference` | Preference node |
| Quick reminder | `memory` | `create_todo` | — |
| Time-based reminder | `reminder` | `create` | — |
| Architecture diagram | `memory` | `create_diagram` | — |
| Persistent spec/roadmap | `memory` | `create_doc` | — |
| Trace decision rationale | `graph` | `path` (source_id, target_id) | — |
| Need past context | `session` | `recall` | — |
| Before compaction | `session` | `capture_smart` | Snapshot |

> Full taxonomy in [taxonomy.md](references/taxonomy.md). Full enum values in [error-handling.md](references/error-handling.md).

## Relationship to VS Code Todo List

Use **both** systems:
- **VS Code `manage_todo_list`**: Visible in-session progress tracking (UI feedback)
- **ContextStream plans/tasks**: Persistent across sessions, queryable, linked to decisions

Mirror plan steps in VS Code todo list. Update both as work progresses.
