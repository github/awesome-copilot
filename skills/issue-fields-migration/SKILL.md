---
name: issue-fields-migration
description: 'Migrate field values from GitHub Project V2 fields or repo labels to org-level issue fields. Use this skill when users need to bulk-copy metadata (priority, status, dates, text, numbers) from project fields or labels to issue fields, or when they ask about migrating, transferring, or copying project field data or labels to issue fields.'
---

# Issue Fields Migration

Bulk-copy field values from Project V2 fields or repo labels to org-level issue fields. This skill guides you through discovering field mappings, previewing changes, and executing the migration with progress reporting. Supports two migration sources: project fields (single project) and repo labels (one or more repos).

## When to Use

- User added org-level issue fields that overlap with existing project fields
- User wants to copy values from project fields to issue fields before deleting the old project fields
- User asks about "migrating", "transferring", or "copying" project field data to issue fields
- User wants to convert repo labels (e.g., p0, p1, p2, p3) into issue field values (e.g., Priority field)
- User asks about replacing labels with issue fields or cleaning up labels after adopting issue fields

## Prerequisites

- The target org must have issue fields enabled
- The issue fields must already exist at the org level
- For project field migration: issue fields must be added to the project
- For label migration: labels must exist on the target repo(s)
- The user must have write access to the repos (and project, if migrating project fields)
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
| List repo labels | `gh label list -R {owner}/{repo} --limit 1000 --json name,color,description` |
| List issues by label | `gh issue list -R {owner}/{repo} --label "{name}" --state all --json number,title,labels --limit 1000` |
| Remove label from issue | `gh api /repos/{owner}/{repo}/issues/{number}/labels/{label_name} -X DELETE` |

See [references/issue-fields-api.md](references/issue-fields-api.md), [references/projects-api.md](references/projects-api.md), and [references/labels-api.md](references/labels-api.md) for full API details.

## Workflow

### Step 0: Migration Source

Ask the user what they are migrating:

1. **"Are you migrating labels or project fields?"**
   - **Labels**: proceed to the [Label Migration Flow](#label-migration-flow) below.
   - **Project fields**: proceed to the [Project Field Migration Flow](#project-field-migration-flow) below.

2. If the user says **labels**:
   - Ask: "Which org and repo(s) contain the labels?"
   - Ask: "Which labels do you want to migrate?" (they can name them or say "show me the labels first")

3. If the user says **project fields**:
   - Ask: "Can you share the link to your project or tell me the org name and project number?"
   - Ask: "Which field do you want to migrate?"

---

### Label Migration Flow

Use this flow when the user wants to convert repo labels into issue field values. Labels can only map to `single_select` issue fields (each label name maps to one option value).

#### Phase L1: Input & Label Discovery

1. Ask the user for: **org name** and **repo(s)** to migrate.
2. Fetch labels from each repo:

```bash
gh label list -R {owner}/{repo} --limit 1000 --json name,color,description
```

3. Fetch org issue fields:

```bash
gh api /orgs/{org}/issue-fields \
  -H "X-GitHub-Api-Version: 2026-03-10" \
  --jq '.[] | {id, name, content_type, options: [.options[]?.name]}'
```

4. **Filtering** (for repos with many labels): if the repo has 50+ labels, group by common prefix (e.g., `priority-*`, `team-*`, `type-*`) or color. Let the user filter with "show labels matching priority" or "show blue labels" before mapping. Never dump 100+ labels at once.

5. Ask the user which labels map to which issue field and option. Support these patterns:
   - **Single label to single field**: e.g., label "bug" → Type field, "Bug" option
   - **Multiple labels to one field** (bulk): e.g., labels p0, p1, p2, p3 → Priority field with matching options
   - **Multiple labels to multiple fields**: e.g., p1 → Priority + frontend → Team. Handle as separate mapping groups.

6. **Auto-suggest mappings**: for each label, attempt to match issue field options using these patterns (in order):
   - **Exact match** (case-insensitive): label `Bug` → option `Bug`
   - **Prefix-number** (`{prefix}-{n}` → `{P}{n}`): label `priority-1` → option `P1`
   - **Strip separators** (hyphens, underscores, spaces): label `good_first_issue` → option `Good First Issue`
   - **Substring containment**: label `type: bug` → option `Bug`

   Present all suggestions at once for the user to confirm, correct, or skip.

**Example output:**

```
Labels in github/my-repo (showing relevant ones):
  p0, p1, p2, p3, bug, enhancement, frontend, backend

Org issue fields (single_select):
  Priority: Critical, P0, P1, P2, P3
  Type: Bug, Feature, Task
  Team: Frontend, Backend, Design

Suggested mappings:
  Label "p0" → Priority "P0"
  Label "p1" → Priority "P1"
  Label "p2" → Priority "P2"
  Label "p3" → Priority "P3"
  Label "bug" → Type "Bug"
  Label "frontend" → Team "Frontend"
  Label "backend" → Team "Backend"
  Label "enhancement" → (no auto-match; skip or map manually)

Confirm, adjust, or add more mappings?
```

#### Phase L2: Conflict Detection

After finalizing the label-to-option mappings, check for conflicts. A conflict occurs when an issue has multiple labels that map to the **same** issue field (since single_select fields can hold only one value).

1. Group label mappings by target issue field.
2. For each field with multiple label sources, note the potential for conflicts.
3. Ask the user for a conflict resolution strategy:
   - **First match**: use the first matching label found (by order of label mapping list)
   - **Skip**: skip issues with conflicting labels and report them
   - **Manual**: present each conflict for the user to decide

**Example:**

```
Potential conflict: labels "p0" and "p1" both map to the Priority field.
If an issue has both labels, which value should win?

Options:
  1. First match (use "p0" since it appears first in the mapping)
  2. Skip conflicting issues
  3. I'll decide case by case
```

#### Phase L3: Pre-flight Checks & Data Scan

1. For each repo, verify write access and cache the `repository_id`:

```bash
gh api /repos/{owner}/{repo} --jq '{full_name, id, permissions: .permissions}'
```

2. For each label in the mapping, fetch matching issues:

```bash
gh issue list -R {owner}/{repo} --label "{label_name}" --state all \
  --json number,title,labels,type --limit 1000
```

   **Warning**: `--limit 1000` silently truncates results. If you expect a label may have more than 1000 issues, paginate manually or verify the total count first (e.g., `gh issue list --label "X" --state all --json number | jq length`).

   **PR filtering**: `gh issue list` returns both issues and PRs. Include `type` in the `--json` output and filter for `type == "Issue"` if the user only wants issues migrated.

3. If **all selected labels return 0 issues**, stop and tell the user. Suggest: try different labels, check spelling, or try a different repository. Do not proceed with an empty migration.

4. For multi-repo migrations, repeat across all specified repos.

5. For each issue found:
   - Check if the issue already has a value for the target issue field (skip if set).
   - Detect multi-label conflicts (issue has two labels for the same field).
   - Apply the conflict resolution strategy chosen in Phase L2.
   - Classify: **migrate**, **skip (already set)**, **skip (conflict)**, or **skip (no matching label)**.

#### Phase L4: Preview / Dry-Run

Present a summary before any writes.

**Example preview:**

```
Label Migration Preview

Source: labels in github/my-repo
Target fields: Priority, Type, Team

| Category                | Count |
|-------------------------|-------|
| Issues to migrate       |   156 |
| Already set (skip)      |    12 |
| Conflicting labels (skip)|    3 |
| Total issues with labels|   171 |

Label breakdown:
  "p1" → Priority "P1": 42 issues
  "p2" → Priority "P2": 67 issues
  "p3" → Priority "P3": 38 issues
  "bug" → Type "Bug": 9 issues

Sample changes (first 5):
  github/my-repo#101: Priority → "P1"
  github/my-repo#203: Priority → "P2", Type → "Bug"
  github/my-repo#44:  Priority → "P3"
  github/my-repo#310: Priority → "P1"
  github/my-repo#7:   Type → "Bug"

After migration, do you also want to remove the migrated labels from issues? (optional)

Estimated time: ~24s (156 API calls at 0.15s each)

Proceed?
```

#### Phase L5: Execution

1. For each issue to migrate, write the issue field value (same endpoint as project field migration):

```bash
echo '{"issue_field_values": [{"field_id": FIELD_ID, "value": "OPTION_NAME"}]}' | \
  gh api /repositories/{repo_id}/issues/{number}/issue-field-values \
    -X POST \
    -H "X-GitHub-Api-Version: 2026-03-10" \
    --input -
```

   Replace `FIELD_ID` with the integer field ID (e.g., `1`) and `OPTION_NAME` with the option name string.

2. If the user opted to remove labels, remove each migrated label after successful field write:

```bash
gh api /repos/{owner}/{repo}/issues/{number}/labels/{label_name} -X DELETE
```

   URL-encode label names that contain spaces or special characters.

3. **Pacing**: 100ms delay between calls. Exponential backoff on HTTP 429 (1s, 2s, 4s, up to 30s).
4. **Progress**: report every 25 items (e.g., "Migrated 75/156 issues...").
5. **Error handling**: log failures but continue. Include label removal failures separately.
6. **Final summary**:

```
Label Migration Complete

| Result                | Count |
|-----------------------|-------|
| Fields set            |   153 |
| Labels removed        |   153 |
| Skipped               |    15 |
| Failed (field write)  |     2 |
| Failed (label remove) |     1 |

Failed items:
  github/my-repo#501: 403 Forbidden (insufficient permissions)
  github/my-repo#88:  422 Validation failed (field not available on repo)
  github/my-repo#120: label removal failed (404, label already removed)
```

---

### Project Field Migration Flow

Use this flow when the user wants to copy values from a GitHub Project V2 field to the corresponding org-level issue field.

Follow these six phases in order. Always preview before executing.

#### Phase P1: Input & Discovery

1. Ask the user for: **org name** and **project number** (or project URL).
2. Fetch project fields:

```bash
# Use MCP tool
mcp__github__projects_list(owner: "{org}", project_number: {n}, method: "list_project_fields")
```

3. Fetch org issue fields:

```bash
gh api /orgs/{org}/issue-fields \
  -H "X-GitHub-Api-Version: 2026-03-10" \
  --jq '.[] | {id, name, content_type, options: [.options[]?.name]}'
```

4. **Filter out proxy fields**: after issue fields are enabled on a project, some project fields appear as "proxy" entries with empty `options: []` for single-select types. These mirror the real issue fields and should be ignored. Only match against project fields that have actual option values.

5. Auto-match fields by name (case-insensitive) with compatible types:

| Project Field Type | Issue Field Type | Compatible? |
|-------------------|-----------------|-------------|
| TEXT | text | Yes, direct copy |
| SINGLE_SELECT | single_select | Yes, option mapping needed |
| NUMBER | number | Yes, direct copy |
| DATE | date | Yes, direct copy |
| ITERATION | (none) | No equivalent; skip with warning |

6. Present the proposed field mappings as a table. Let the user confirm, adjust, or skip fields.

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

#### Phase P2: Option Mapping (single-select fields only)

For each matched single-select pair:

1. Compare option names between the project field and issue field (case-insensitive).
2. Auto-match options with identical names.
3. For any unmapped project field options, present **all** unmapped options in a single summary and ask the user to provide mappings for all of them at once. Do not prompt one-by-one; batch them into a single exchange.
4. Show the final option mapping table for confirmation.

**Example output:**

```
Option mapping for "Release - Target":

Auto-matched (case-insensitive):
  "GA" → "GA"
  "Private Preview" → "Private Preview"
  "Public Preview" → "Public Preview"

Unmapped project options (need your input):
  1. "Internal Only" → which issue field option? (or skip)
  2. "Retired" → which issue field option? (or skip)
  3. "Beta" → which issue field option? (or skip)
  4. "Deprecated" → which issue field option? (or skip)

Available issue field options not yet mapped: "Internal", "Sunset", "Beta Testing", "End of Life"

Please provide mappings for all 4 options above (e.g., "1→Internal, 2→Sunset, 3→Beta Testing, 4→skip").
```

#### Phase P3: Pre-flight Checks

Before scanning items, verify write access to each repository that may be touched:

1. From the project items (first page), collect the unique set of `{owner}/{repo}` values.
2. For each unique repo, verify the authenticated user has Issues write permission:

```bash
gh api /repos/{owner}/{repo} --jq '{full_name, permissions: .permissions}'
```

3. If any repo shows `push: false` or `triage: false`, warn the user before proceeding. Items in those repos will fail at write time.
4. Cache the `repository_id` (integer) for each repo now; you will need it in Phase 6:

```bash
gh api /repos/{owner}/{repo} --jq .id
```

#### Phase P4: Data Scan

1. Fetch all project items using MCP. **Important**: for projects with more than ~200 items, `gh api graphql --paginate` is unreliable (it concatenates JSON responses without proper separators and can time out). Use the MCP tool which handles pagination internally, or use explicit cursor-based pagination:

```bash
# Preferred: use MCP tool (handles pagination automatically)
mcp__github__projects_list(owner: "{org}", project_number: {n}, method: "list_project_items")

# Fallback for large projects: manual cursor-based pagination
# Fetch 100 items per page, advancing the cursor each time.
# Process each page before fetching the next to avoid memory issues.
# Save progress (page number or last cursor) so you can resume if interrupted.
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

#### Phase P5: Preview / Dry-Run

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

Estimated time: ~127s (847 API calls at 0.15s each)

Proceed with migration? This will update 847 issues across 3 repositories.
```

#### Phase P6: Execution

1. Use the `repository_id` values cached in Phase 3.

2. For each item to migrate, write the issue field value:

```bash
echo '{"issue_field_values": [{"field_id": FIELD_ID, "value": "VALUE"}]}' | \
  gh api /repositories/{repo_id}/issues/{number}/issue-field-values \
    -X POST \
    -H "X-GitHub-Api-Version: 2026-03-10" \
    --input -
```

   Replace `FIELD_ID` with the integer field ID (e.g., `1`) and `VALUE` with the value string.

3. **Pacing**: add a 100ms delay between API calls. On HTTP 429 responses, use exponential backoff (1s, 2s, 4s, up to 30s).
4. **Progress**: report status every 25 items (e.g., "Migrated 75/847 items...").
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
- **Single-select values**: the REST API accepts option **names** as strings (not option IDs). This makes mapping straightforward for both project fields and labels.
- **Reading values back**: when reading issue field values from the API response, use `.single_select_option.name` for the human-readable value. The `.value` property returns the internal option ID (an integer like `1201`), not the display name.
- **API version header**: all issue fields endpoints require `X-GitHub-Api-Version: 2026-03-10`.
- **Cross-repo items**: a project can contain issues from multiple repositories. Cache the repo ID per-repository to avoid redundant lookups.
- **Preserve existing values**: never overwrite an issue field value that is already set. Skip those items.
- **Iteration fields**: have no issue field equivalent. Always warn the user and skip.
- **Draft items**: project items that are not linked to real issues cannot have issue field values. Skip with a note.
- **Labels are repo-scoped**: unlike project fields, labels exist per-repo. The same label name may exist in multiple repos; migration applies separately to each.
- **Label conflicts**: an issue can have multiple labels that map to the same single_select field. Always detect and resolve these before execution.
- **Label removal is optional**: after migration, the user may want to keep labels as backup or remove them. Always ask before removing.
- **URL-encode label names**: labels with spaces or special characters must be URL-encoded when used in REST API paths (e.g., `good%20first%20issue`).
- **Script generation for scale**: for migrations of 100+ issues, generate a standalone shell script rather than executing API calls one at a time through the agent. This is faster, resumable, and avoids agent timeout issues.
- **Idempotent migrations**: re-running a migration is safe. Issues that already have the target field value set will be skipped. This means you can safely resume a partial migration without duplicating work.
- **`--limit 1000` truncation**: `gh issue list --limit 1000` silently stops at 1000 results. For labels with more issues, paginate with `--jq` and cursor-based pagination or run multiple filtered queries (e.g., by date range).
- **macOS bash version**: macOS ships with bash 3.x, which does not support `declare -A` (associative arrays). Generated scripts should use POSIX-compatible constructs or note the incompatibility and suggest `brew install bash`.
- **Issues vs PRs**: `gh issue list` returns both issues and pull requests. If the migration should only target issues, include `type` in `--json` output and filter for `type == "Issue"`.

## Examples

### Example 1: Full Migration

**User**: "I need to migrate Priority values from our project to the new org Priority issue field"

**Action**: Follow Phases P1-P6. Discover fields, map options, check permissions, scan items, preview, execute.

### Example 2: Dry-Run Only

**User**: "Show me what would happen if I migrated fields from project #42, but don't actually do it"

**Action**: Follow Phases P1-P5 only. Present the full dry-run report with every item listed. Do not execute.

### Example 3: Multiple Fields

**User**: "Migrate Priority and Due Date from project #15 to issue fields"

**Action**: Same workflow, but process both fields in a single pass. During the data scan, collect values for all mapped fields per item. Write all field values in a single API call per issue.

### Example 4: Single Label to Issue Field

**User**: "I want to migrate the 'bug' label to the Type issue field"

**Action**: Route to Label Migration Flow. Ask for org/repo, list labels, confirm mapping: label "bug" → Type field "Bug" option. Scan issues with that label, preview, execute. Ask whether to remove the label after migration.

### Example 5: Multiple Labels to One Field (Bulk)

**User**: "We have p0, p1, p2, p3 labels and want to convert them to the Priority issue field"

**Action**: Route to Label Migration Flow. Map all four labels to Priority field options (p0→P0, p1→P1, p2→P2, p3→P3). Check for conflicts (issues with multiple priority labels). Preview all changes in one summary. Execute in one pass. Optionally remove all four labels from migrated issues.

### Example 6: Cross-Repo Label Migration with Label Removal

**User**: "Migrate the 'frontend' and 'backend' labels to the Team issue field across github/issues, github/memex, and github/mobile, then remove the old labels"

**Action**: Route to Label Migration Flow. Confirm repos and label mappings: "frontend"→Team "Frontend", "backend"→Team "Backend". Scan all three repos for issues with these labels. Detect conflicts (issues with both labels). Preview across repos. Execute field writes, then remove labels from migrated issues. Report per-repo stats.
