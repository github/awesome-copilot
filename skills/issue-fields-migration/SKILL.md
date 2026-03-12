---
name: issue-fields-migration
description: 'Migrate field values from GitHub Project V2 fields to org-level issue fields. Use this skill when users need to bulk-copy metadata (priority, status, dates, text, numbers) from project fields to issue fields after adopting issue fields, or when they ask about migrating, transferring, or copying project field data to issue fields.'
---

# Issue Fields Migration

Bulk-copy field values from Project V2 fields to org-level issue fields. This skill guides you through discovering field mappings, previewing changes, and executing the migration with progress reporting.

## When to Use

- User added org-level issue fields that overlap with existing project fields
- User wants to copy values from project fields to issue fields before deleting the old project fields
- User asks about "migrating", "transferring", or "copying" project field data to issue fields

## Prerequisites

- The target org must have issue fields enabled
- The issue fields must already exist at the org level and be added to the project
- The user must have write access to the repos and project
- `gh` CLI must be authenticated with appropriate scopes

## Available Tools

### MCP Tools (read operations)

| Tool | Purpose |
|------|---------|
| `mcp__github__projects_list` | List project fields (`list_project_fields`), list project items with values (`list_project_items`) |
| `mcp__github__projects_get` | Get details of a specific project field or item |

### CLI / REST API

| Operation | Command |
|-----------|---------|
| List org issue fields | `gh api /orgs/{org}/issue-fields -H "X-GitHub-Api-Version: 2026-03-10"` |
| Read issue field values | `gh api /repos/{owner}/{repo}/issues/{number}/issue-field-values -H "X-GitHub-Api-Version: 2026-03-10"` |
| Write issue field values | `gh api /repositories/{repo_id}/issues/{number}/issue-field-values -X POST -H "X-GitHub-Api-Version: 2026-03-10" --input -` |
| Get repository ID | `gh api /repos/{owner}/{repo} --jq .id` |

See [references/issue-fields-api.md](references/issue-fields-api.md) and [references/projects-api.md](references/projects-api.md) for full API details.

## Workflow

Follow these five phases in order. Always preview before executing.

### Phase 1: Input & Discovery

1. Ask the user for: **org name** and **project number** (or project URL).
2. Fetch project fields:

```bash
# Use MCP tool
mcp__github__projects_list(project_owner: "{org}", project_number: {n}, action: "list_project_fields")
```

3. Fetch org issue fields:

```bash
gh api /orgs/{org}/issue-fields \
  -H "X-GitHub-Api-Version: 2026-03-10" \
  --jq '.[] | {id, name, content_type, options: [.options[]?.name]}'
```

4. Auto-match fields by name (case-insensitive) with compatible types:

| Project Field Type | Issue Field Type | Compatible? |
|-------------------|-----------------|-------------|
| TEXT | text | Yes, direct copy |
| SINGLE_SELECT | single_select | Yes, option mapping needed |
| NUMBER | number | Yes, direct copy |
| DATE | date | Yes, direct copy |
| ITERATION | (none) | No equivalent; skip with warning |

5. Present the proposed field mappings as a table. Let the user confirm, adjust, or skip fields.

**Example output:**

```
Found 3 potential field mappings:

| # | Project Field      | Type          | Issue Field        | Status     |
|---|-------------------|---------------|--------------------|------------|
| 1 | Priority (renamed) | SINGLE_SELECT | Priority           | Auto-match |
| 2 | Due Date           | DATE          | Due Date           | Auto-match |
| 3 | Sprint             | ITERATION     | (no equivalent)    | Skipped    |

Proceed with fields 1 and 2? You can also add manual mappings.
```

### Phase 2: Option Mapping (single-select fields only)

For each matched single-select pair:

1. Compare option names between the project field and issue field (case-insensitive).
2. Auto-match options with identical names.
3. For any unmapped project field options, ask the user which issue field option to map to (or skip).
4. Show the final option mapping table for confirmation.

**Example output:**

```
Option mapping for "Priority":

| Project Option | Issue Field Option | Status     |
|---------------|-------------------|------------|
| P0 - Critical | Critical          | Manual map |
| P1 - High     | High              | Auto-match |
| P2 - Medium   | Medium            | Auto-match |
| P3 - Low      | Low               | Auto-match |

Items with "P0 - Critical" will be set to "Critical". Confirm?
```

### Phase 3: Data Scan

1. Fetch all project items (paginated) using MCP:

```bash
mcp__github__projects_list(project_owner: "{org}", project_number: {n}, action: "list_project_items")
```

2. For each item:
   - Skip if it is a draft item (not a real issue).
   - Extract the source project field value.
   - Skip if the source value is empty.
   - Check if the issue already has a value for the target issue field:

```bash
gh api /repos/{owner}/{repo}/issues/{number}/issue-field-values \
  -H "X-GitHub-Api-Version: 2026-03-10"
```

   - If the issue field already has a value, skip it (preserve existing data).

3. Classify each item into one of:
   - **Migrate**: has source value, no existing target value
   - **Skip (already set)**: target issue field already has a value
   - **Skip (no source)**: project field is empty for this item
   - **Skip (draft)**: item is a draft, not a real issue
   - **Skip (unmapped option)**: single-select value was not mapped

### Phase 4: Preview / Dry-Run

Present a summary before any writes.

**If user requested dry-run**: show the full detailed report (every issue, its current value, proposed new value, and skip reason) and stop. Do not execute.

**Otherwise (preview mode)**: show summary counts and a sample of changes, then ask for confirmation.

**Example preview:**

```
Migration Preview for Project #42

Fields to migrate: Priority, Due Date

| Category               | Count |
|------------------------|-------|
| Items to migrate       |   847 |
| Already set (skip)     |    23 |
| No source value (skip) |   130 |
| Draft items (skip)     |    12 |
| Total project items    | 1,012 |

Sample changes (first 5):
  github/repo-a#101: Priority → "High"
  github/repo-a#203: Priority → "Medium", Due Date → "2025-03-15"
  github/repo-b#44:  Priority → "Low"
  github/repo-a#310: Due Date → "2025-04-01"
  github/repo-c#7:   Priority → "Critical"

Proceed with migration? This will update 847 issues across 3 repositories.
```

### Phase 5: Execution

1. Look up `repository_id` for each unique repository (cache per-repo):

```bash
gh api /repos/{owner}/{repo} --jq .id
```

2. For each item to migrate, write the issue field value:

```bash
echo '[{"field_id": "FIELD_ID", "value": "VALUE"}]' | \
  gh api /repositories/{repo_id}/issues/{number}/issue-field-values \
    -X POST \
    -H "X-GitHub-Api-Version: 2026-03-10" \
    --input -
```

3. **Pacing**: add a 100ms delay between API calls. On HTTP 429 responses, use exponential backoff (1s, 2s, 4s, up to 30s).
4. **Progress**: report status every 50 items (e.g., "Migrated 150/847 items...").
5. **Error handling**: log failures but continue processing remaining items.
6. **Final summary**:

```
Migration Complete

| Result  | Count |
|---------|-------|
| Success |   842 |
| Skipped |   165 |
| Failed  |     5 |

Failed items:
  github/repo-a#501: 403 Forbidden (insufficient permissions)
  github/repo-b#88:  422 Validation failed (field not available on repo)
  ...
```

## Important Notes

- **Write endpoint quirk**: the REST API for writing issue field values uses `repository_id` (integer), not `owner/repo`. Always look up the repo ID first with `gh api /repos/{owner}/{repo} --jq .id`.
- **Single-select values**: the REST API accepts option **names** as strings (not option IDs). This makes mapping straightforward.
- **API version header**: all issue fields endpoints require `X-GitHub-Api-Version: 2026-03-10`.
- **Cross-repo items**: a project can contain issues from multiple repositories. Cache the repo ID per-repository to avoid redundant lookups.
- **Preserve existing values**: never overwrite an issue field value that is already set. Skip those items.
- **Iteration fields**: have no issue field equivalent. Always warn the user and skip.
- **Draft items**: project items that are not linked to real issues cannot have issue field values. Skip with a note.

## Examples

### Example 1: Full Migration

**User**: "I need to migrate Priority values from our project to the new org Priority issue field"

**Action**: Follow Phases 1-5. Discover fields, map options, scan items, preview, execute.

### Example 2: Dry-Run Only

**User**: "Show me what would happen if I migrated fields from project #42, but don't actually do it"

**Action**: Follow Phases 1-4 only. Present the full dry-run report with every item listed. Do not execute.

### Example 3: Multiple Fields

**User**: "Migrate Priority and Due Date from project #15 to issue fields"

**Action**: Same workflow, but process both fields in a single pass. During the data scan, collect values for all mapped fields per item. Write all field values in a single API call per issue.
