# Error Handling & Debugging Reference

> How to handle, track, and debug MCP errors encountered during ContextStream usage.

## Error Investigation Protocol

When a ContextStream MCP call returns an unexpected error:

### Step 1: Check Parameters

- Verify all **required fields** are present
- Verify **UUID format** — always use full UUIDs, never truncated
- Verify **enum values** — see [Known Enum Values](#known-enum-values) below
- Verify **string types** — some fields that look like they accept any string actually enforce enums

### Step 2: Check Session State

- Many tools require `init` to have been called first
- If you get `workspace_id is required`, `init` was not called or session expired
- Re-call `init` and retry

### Step 3: Check ID Validity

- Use **full UUIDs** from API responses, not truncated ones
- IDs from conversation summaries may have wrong suffixes — always re-fetch from `get_plan` or `list_tasks`
- `NOT_FOUND` errors almost always mean truncated/wrong UUID

### Step 4: Determine Fault

| Symptom | Likely Cause |
|---------|-------------|
| `Invalid enum value` | Wrong enum — check [Known Enum Values](#known-enum-values) |
| `NOT_FOUND` | Truncated UUID or wrong ID from stale context |
| `workspace_id is required` | `init` not called or session expired |
| `TypeError: fetch failed` | MCP server connectivity issue — retry |
| `Internal server error` on valid call | MCP server bug — report upstream |
| Inconsistent behavior | MCP server bug — report upstream |

### Step 5: Report MCP Bugs

If it's a server-side bug (valid call, internal error):

1. **Search existing issues first** — check https://github.com/contextstream/mcp-server/issues for duplicates. Search by error message, affected tool name, or symptom keywords.
2. **Check open pull requests** — verify no fix is already in progress.
3. **Only create a new issue** if no existing issue or PR covers the problem. Include: tool name, parameters sent, full error response, and reproduction steps.
4. **Sanitize all report content** — replace any project-specific data (workspace IDs, plan IDs, internal names, business logic, API keys, real UUIDs) with generic placeholders before submitting. Never include dev or production data in upstream reports.

> **Do NOT spam the upstream repository.** Always verify no duplicate exists before opening a new issue.

## Known Enum Values

> These values have been verified through usage. Enums differ across tool domains.

### Task Priority

```
low | medium | high | urgent
```

**NOT** `normal` — using `normal` causes `Invalid enum value` error.

### Plan Status

```
draft | active | completed | archived | abandoned
```

**NOT** `cancelled` — using `cancelled` causes `Invalid enum value` error.

### Task Status

```
pending | in_progress | completed | blocked | cancelled
```

> `blocked` status accepts an optional `blocked_reason` parameter.

### Reminder Priority

```
low | normal | high | urgent
```

> Reminder priority **does** accept `normal` — unlike task priority which uses `medium` instead.

### Lesson Severity

```
low | medium | high | critical
```

### Lesson Category

```
workflow | code_quality | verification | communication | project_specific
```

### Event Importance

```
low | medium | high | critical
```

### Doc Type

```
spec | roadmap | general
```

### Diagram Type

```
flowchart | sequence | class | er | gantt | mindmap | pie | other
```

> **NOT** `state` — use `other` for state diagrams and anything not covered by specific types.

### Reminder Recurrence

```
daily | weekly | monthly
```

### Reminder Status

```
pending | completed | dismissed | snoozed
```

### Help Action

```
tools | auth | version | editor_rules | enable_bundle | team_status
```

**NOT** `tool_help` — there is no per-tool help action. Use `tools` for a summary of all tools and their actions.

### Session Action

```
capture | capture_lesson | get_lessons | recall | remember | user_context
| summary | compress | delta | smart_search | decision_trace
| capture_plan | get_plan | update_plan | list_plans
| restore_context | team_decisions | team_lessons | team_plans
| list_suggested_rules | suggested_rule_action | suggested_rules_stats
```

### Session Event Type

```
decision | preference | insight | note | implementation | task | bug
| feature | plan | correction | lesson | warning | frustration
| conversation | session_snapshot
```

### Session Rule Action

```
accept | reject | modify
```

### Plan Step Estimated Effort

```
small | medium | large
```

### Memory Action

```
create_event | get_event | update_event | delete_event | list_events | distill_event
| create_node | get_node | update_node | delete_node | list_nodes | supersede_node
| search | decisions | timeline | summary | import_batch
| create_task | get_task | update_task | delete_task | list_tasks | reorder_tasks
| create_todo | list_todos | get_todo | update_todo | delete_todo | complete_todo
| create_diagram | list_diagrams | get_diagram | update_diagram | delete_diagram
| create_doc | list_docs | get_doc | update_doc | delete_doc
| create_roadmap | list_transcripts | get_transcript | search_transcripts | delete_transcript
| team_tasks | team_todos | team_diagrams | team_docs
```

### Graph Action

```
dependencies | impact | call_path | related | path | decisions
| ingest | circular_dependencies | unused_code | contradictions | usages
```

### Project Action

```
list | get | create | update | delete | index | overview | statistics
| files | index_status | index_history | ingest_local | team_projects | recent_changes
```

### Workspace Action

```
list | get | create | delete | associate | bootstrap | team_members | index_settings
```
