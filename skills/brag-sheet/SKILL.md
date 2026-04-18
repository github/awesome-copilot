---
name: brag-sheet
description: >
  Write impact-first work entries for performance reviews. Backfill from git history,
  Copilot session logs, and PRs. Works standalone or with the copilot-brag-sheet extension.
license: MIT
compatibility: 'Cross-platform (Windows, macOS, Linux). Works with any GitHub Copilot CLI session.'
metadata:
  version: "1.0"
argument-hint: 'Optional: time range ("last 2 weeks"), category ("infrastructure"), or "backfill"'
---

# Brag Sheet — Work Impact Writer

Help users write, organize, and backfill work accomplishments for performance reviews.

USE FOR: "brag", "log work", "what did I do", "backfill my work history", "prep for performance review", "write impact statement", "review prep"
DO NOT USE FOR: project management, sprint planning, time tracking, ticket creation

## Entry Format

Every entry uses impact-first framing with three required parts:

```
Did [action] → [result/impact] → [evidence]
```

**Do not output an entry unless it includes all three parts.** If evidence is missing, ask for it or mark as "(evidence needed)".

### Examples

| ❌ Vague | ✅ Impact-first |
|---------|----------------|
| "Fixed a bug in auth" | "Fixed token refresh race condition → eliminated 401s affecting 12% of API calls → PR #247" |
| "Worked on dashboards" | "Built latency dashboard in Grafana → on-call detects P95 spikes in <2min → deployed to prod" |
| "Did code review" | "Reviewed and unblocked 8 PRs across 3 repos → team shipped migration on schedule" |

## Categories

| ID | Emoji | Use for |
|----|-------|---------|
| `pr` | 🚀 | Merged PRs, shipped features |
| `bugfix` | 🐛 | Bug fixes, incident patches |
| `infrastructure` | 🏗️ | Infra, deployments, migrations |
| `investigation` | 🔍 | Root cause analysis, debugging |
| `collaboration` | 🤝 | Reviews, mentoring, design discussions |
| `tooling` | 🔧 | Dev tools, scripts, automation |
| `oncall` | 🚨 | Incident response, on-call wins |
| `design` | 📐 | Design docs, architecture decisions |
| `documentation` | 📝 | Docs, runbooks, guides |

## How to Help the User

Follow this decision tree:

1. **If `save_to_brag_sheet` tool is available** → use extension tools directly (`save_to_brag_sheet`, `review_brag_sheet`, `generate_work_log`). Do not reference or attempt to call these tools unless they are confirmed available.

2. **If git or gh CLI is available** → backfill from commits and PRs (see Backfill section below)

3. **Otherwise** → run a guided interview:
   - "What did you work on recently?"
   - "Who benefited and how?"
   - "What's the evidence? (PR number, metric, link)"
   - Draft entries from answers

In all cases, output formatted markdown the user can save.

## Writing Entries

Guide users through 3 questions:

1. **What did you do?** — the specific change or deliverable
2. **Why does it matter?** — who benefits, what problem it solves
3. **What's the evidence?** — PR link, metrics, before/after comparison

Output as markdown:

```markdown
### 🏗️ Infrastructure
- **Built latency dashboard in Grafana** → on-call detects P95 spikes in <2min → deployed to prod
```

## Backfill Workflow

When the user asks "what did I do last week" or "backfill my history":

**Follow these steps in order. Do not draft entries until scanning is complete.**

### Step 1: Scan available sources

**Git commits** — Look at recent commit history in the current repo:
- Use `git log` to find recent commits by the user
- Group related commits by theme (same files, related messages)

**PR history** — Check for merged PRs:
- Use `gh pr list` if available, or ask the user for PR links

**Copilot session history** — If `~/.copilot/session-state/` exists, scan for recent sessions:
- Each subdirectory is a session with a `workspace.yaml` containing `summary`, `cwd`, `repository`, `branch`
- Skip sessions without summaries
- Note: this directory may not exist on all machines

If none of these sources are available, fall back to the guided interview.

### Step 2: Group related work

Cluster related commits/PRs/sessions into logical entries. Multiple small commits on the same feature → one entry.

### Step 3: Draft entries

Write impact-first entries for each group. Assign categories.

### Step 4: Present and refine

Show all drafted entries to the user. Adjust based on feedback.

### Step 5: Output

Format as markdown grouped by week:

```markdown
## Week of 2025-04-14

### 🚀 PRs & Features
- **Migrated auth service to managed identity** → eliminated 3 secret rotation incidents/quarter → PR #312

### 🏗️ Infrastructure
- **Built CI pipeline for copilot-brag-sheet** → 107 tests across 3 OSes × 3 Node versions → shipped v1.0.0
```

## Performance Review Prep

When the user is preparing for a review, organize entries by impact theme (not chronologically):
- Reliability / operational excellence
- Feature delivery / velocity
- Collaboration / mentoring
- Technical leadership

For narrative sections, use STAR format: **S**ituation → **T**ask → **A**ction → **R**esult.

## Automatic Session Tracking (Optional)

For automatic background tracking of every Copilot CLI session (files edited, PRs created, git actions), install the [copilot-brag-sheet](https://github.com/microsoft/copilot-brag-sheet) extension. It adds `save_to_brag_sheet`, `review_brag_sheet`, and `generate_work_log` tools to every session.
