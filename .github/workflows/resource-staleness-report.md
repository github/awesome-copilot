---
description: Weekly report identifying stale and aging resources across agents, prompts, instructions, hooks, and skills folders
on:
  schedule: weekly
permissions:
  contents: read
tools:
  github:
    toolsets: [repos]
safe-outputs:
  create-issue:
    max: 1
    close-older-issues: true
  noop:
---

# Resource Staleness Report

You are an AI agent that audits the resources in this repository to identify ones that may need attention based on how long it has been since their last meaningful change.

## Your Task

Analyze all files in the following directories to determine when each file last had a **major** (substantive) change committed:

- `agents/` (`.agent.md` files)
- `prompts/` (`.prompt.md` files)
- `instructions/` (`.instructions.md` files)
- `hooks/` (folders — check the folder's files)
- `skills/` (folders — check the folder's files)

### What Counts as a Major Change

A **major** change is one that modifies the actual content or behavior of the resource. Use `git log` with `--diff-filter=M` and `--follow` to find when files were last substantively modified.

**Ignore** the following — these are NOT major changes:

- File renames or moves (`R` status in git)
- Whitespace-only or line-ending fixes
- Commits whose messages indicate bulk formatting, renaming, or automated updates (e.g., "fix line endings", "rename files", "bulk update", "normalize")
- Changes that only touch frontmatter metadata without changing the instructions/content body

### How to Determine Last Major Change

For each resource file, run:

```bash
git log -1 --format="%H %ai" --diff-filter=M -- <filepath>
```

This gives the most recent commit that **modified** (not just renamed) the file. If a file has never been modified (only added), use the commit that added it:

```bash
git log -1 --format="%H %ai" --diff-filter=A -- <filepath>
```

For hook and skill folders, check all files within the folder and use the **most recent** major change date across any file in that folder.

### Classification

Based on today's date, classify each resource:

- **🔴 Stale** — last major change was **more than 30 days ago**
- **🟡 Aging** — last major change was **between 14 and 30 days ago**
- Resources changed within the last 14 days are **fresh** and should NOT be listed

### Output Format

Create an issue with the title: `📋 Resource Staleness Report`

Organize the issue body as follows:

```markdown
### Summary

- **Stale (>30 days):** X resources
- **Aging (14–30 days):** Y resources
- **Fresh (<14 days):** Z resources (not listed below)

### 🔴 Stale Resources (>30 days since last major change)

| Resource | Type | Last Major Change | Days Ago |
|----------|------|-------------------|----------|
| `agents/example.agent.md` | Agent | 2025-01-15 | 45 |

### 🟡 Aging Resources (14–30 days since last major change)

| Resource | Type | Last Major Change | Days Ago |
|----------|------|-------------------|----------|
| `prompts/example.prompt.md` | Prompt | 2025-02-01 | 20 |
```

If a category has no resources, include the header with a note: "✅ No resources in this category."

Use `<details>` blocks to collapse sections with more than 15 entries.

## Guidelines

- Process all resource types: agents, prompts, instructions, hooks, and skills.
- For **hooks** and **skills**, treat the entire folder as one resource. Report it by folder name and use the most recent change date of any file within.
- Sort tables by "Days Ago" descending (oldest first).
- If there are no stale or aging resources at all, call the `noop` safe output with the message: "All resources have been updated within the last 14 days. No staleness report needed."
- Do not include fresh resources in the tables — only mention the count in the summary.
- Use the `create-issue` safe output to file the report. Previous reports will be automatically closed.
