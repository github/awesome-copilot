# Reminders & Progressive Bundles Reference

> Covers `mcp_contextstream_reminder` and notes on progressive tool bundles.

## Progressive Bundles

ContextStream supports **progressive tool loading** via `help(action="enable_bundle")`. Some tools (like `integration` and `media`) are NOT standalone MCP tools — they may be part of bundles that need explicit activation.

### Available Bundles

```
session | memory | search | graph | workspace | project | reminders | integrations
```

> **`integration` and `media`**: These do NOT exist as standalone MCP tools (`mcp_contextstream_integration` and `mcp_contextstream_media` return "tool does not exist"). The `help(action="tools")` output mentions integration providers and media actions, suggesting they may become available via `help(action="enable_bundle", bundle="integrations")`. This has not been verified — test before relying on it.

---

## Reminder Tool

Time-based reminders that surface automatically in `context()` calls when they become due.

### create

```
mcp_contextstream_reminder(
  action="create",
  title="Check SDK upgrade impact",
  content="Review if framework update changes affect sealed classes",
  remind_at="2025-07-15T09:00:00Z",
  priority="high",
  recurrence="weekly",
  keywords=["sdk", "upgrade"]
)
```

| Parameter | Required | Description |
|-----------|----------|------------|
| `title` | ✅ | Reminder title |
| `content` | — | Detailed description |
| `remind_at` | ✅ | ISO 8601 datetime |
| `priority` | — | `"low"`, `"normal"`, `"high"`, `"urgent"` |
| `recurrence` | — | `"daily"`, `"weekly"`, `"monthly"` |
| `keywords` | — | Array of search keywords |

> **Reminder priority** includes `normal` — unlike task priority which uses `low | medium | high | urgent`.

### Other Actions

| Action | Parameters | Description |
|--------|-----------|------------|
| `list` | `status?`, `priority?`, `limit?` | List reminders |
| `active` | `context?`, `limit?` | Get pending/overdue/due-soon |
| `snooze` | `reminder_id`, `until` (ISO datetime) | Snooze until later |
| `complete` | `reminder_id` | Mark as complete |
| `dismiss` | `reminder_id` | Dismiss without completing |

**Status values**: `pending`, `completed`, `dismissed`, `snoozed`.

---

## Notes on Integration & Media

The `help(action="tools")` output references these capabilities:

**Integration providers** (Slack, GitHub, Notion):
- Actions mentioned: `stats`, `channels`, `contributors`, `activity`, `discussions`, `search`, `knowledge`, `summary`
- Notion additions: `create_page`, `search_pages`, `list_databases`, `get_page`, `query_database`, `update_page`

**Media** (video/audio/image):
- Actions mentioned: `index`, `status`, `search`, `get_clip`, `list`, `delete`

> **Status: UNVERIFIED.** These are extracted from `help(tools)` output but may require bundle activation or a paid tier. Do not document as available until tested via `enable_bundle`.
