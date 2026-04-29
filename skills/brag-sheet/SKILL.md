---
name: brag-sheet
description: >
  Turn vague "what did I do?" into evidence-backed impact statements for performance
  reviews, self-reviews, promotion packets, and weekly updates. Uniquely mines Copilot
  CLI session logs to reconstruct forgotten work, plus git commits and GitHub PRs.
  Enforces a 3-part impact contract (action → result → evidence). Works standalone
  with zero dependencies. Trigger for: "brag", "log work", "what did I do",
  "backfill my work history", "performance review", "self-review", "self assessment",
  "write impact statement", "review prep", "promo packet", "promotion case",
  "weekly update", "status report", "accomplishments", "what did I ship",
  "I forgot to log my work", "summarize my work", "track my wins",
  "what should I highlight", "end of half", "career growth", "work journal",
  or any request to document, summarize, or organize work accomplishments.
license: MIT
compatibility: 'Cross-platform (Windows, macOS, Linux). Works with any GitHub Copilot CLI session. Optional: git, gh CLI.'
metadata:
  version: "1.1"
argument-hint: 'Optional: time range ("last 2 weeks", "this half"), category ("infrastructure"), "backfill", or "review prep"'
---

# Brag Sheet — Work Impact Writer

Turn engineering work into evidence-backed impact statements for performance reviews, self-reviews, promotion packets, and weekly updates. Uniquely mines Copilot CLI session logs, git history, and PRs to reconstruct forgotten work.

USE FOR: "brag", "log work", "what did I do", "backfill", "performance review", "self-review", "promo packet", "weekly update", "status report", "write impact statement", "what did I ship", "I forgot to log my work", "review prep", "accomplishments"
DO NOT USE FOR: project management, sprint planning, time tracking, ticket creation

## Quick Start

| User wants... | Mode | Output |
|---------------|------|--------|
| Log one accomplishment | **Capture** | 1 impact-first entry |
| "What did I do last week?" | **Backfill** | Entries grouped by week, mined from git/PRs/sessions |
| Prep for review or promo | **Review Pack** | Entries grouped by impact theme + STAR narratives |

## Agent Behavior Rules

1. **DO** confirm the time range and scope before scanning sources. Don't assume "last week" — ask.
2. **DO** check which tools are available (`save_to_brag_sheet`, `git`, `gh`) before choosing a workflow.
3. **DO** always include all three parts: action → result → evidence. If evidence is missing, write `(evidence needed)` — never silently omit.
4. **DO** show drafted entries to the user before saving. Never auto-save without confirmation.
5. **DO** group related commits into a single entry. Ten commits on the same feature = one entry.
6. **DO** preserve the user's voice. Reframe for impact, but don't invent accomplishments or inflate scope.
7. **DO NOT** fabricate metrics, team sizes, or impact numbers. If the user doesn't provide a number, don't invent one.
8. **DO NOT** write entries for work the user only described verbally without verifying. Ask: "Did this ship? Is there a PR or doc I can reference?"
9. **DO NOT** skip the backfill scan steps or draft entries before scanning is complete.
10. **DO NOT** pad weak periods with trivial entries. An honest gap is better than inflated fluff.

## Entry Format

Every entry uses impact-first framing with three required parts:

```
Did [action] → [result/impact] → [evidence]
```

**Do not output an entry unless it includes all three parts.** If evidence is missing, ask for it or mark as "(evidence needed)".

### Anti-Patterns

| ❌ Don't | ✅ Do instead |
|---------|--------------|
| "Fixed a bug in auth" | "Fixed token refresh race condition → eliminated 401s affecting 12% of API calls → PR #247" |
| "Worked on dashboards" | "Built latency dashboard in Grafana → on-call detects P95 spikes in <2min → deployed to prod" |
| Invent a metric: "saved 40% of eng time" | Ask: "Do you have a rough estimate, or should I keep this qualitative?" |
| One entry per commit | Group related commits into one entry with highest-impact framing |
| Passive voice: "The pipeline was improved" | Active voice: "Built CI matrix → caught Windows-only bug before release" |
| List technologies used | State the outcome: "Migrated 4 services to IaC → deploy time 45min → 8min" |
| Silently drop weak entries | Mark `(evidence needed)` and present for user to fill in |

## Evidence Ladder

Not every entry needs a metric. Use the strongest evidence available:

| Strength | Evidence type | Example |
|----------|--------------|---------|
| 🥇 Best | Quantified metric | "Reduced P95 latency from 800ms to 120ms" |
| 🥈 Strong | PR, commit, or doc link | "PR #312, design doc in wiki" |
| 🥉 Good | Observable outcome | "Unblocked Team X", "Resolved Sev2 incident Y" |
| ✅ Acceptable | Qualitative + context | "Reduced toil for on-call rotation — see updated runbook" |
| ⚠️ Weak | Activity only | "Worked on auth" — reframe or mark `(evidence needed)` |

Never invent a metric to fill the gap. Qualitative evidence with context beats fabricated numbers.

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

3. **Otherwise** → guided interview: "What did you work on?", "Who benefited?", "What's the evidence?"

For each entry, walk through: **What** (the deliverable) → **Why** (who benefits) → **Evidence** (PR, metric, link). Output formatted markdown the user can paste into a review doc.

## Backfill Workflow

When the user asks "what did I do last week" or "backfill my history":

**Follow these steps in order. Do not draft entries until scanning is complete.**

### Step 1: Scan available sources

Check what's available, then mine each source:
```bash
git --version 2>/dev/null         # for commit mining
gh --version 2>/dev/null          # for PR mining
ls ~/.copilot/session-state/ 2>/dev/null  # Copilot session logs
```

**Git commits** — recent commits by the user in the current repo:
```bash
git log --author="$(git config user.email)" --since="2 weeks ago" \
  --pretty=format:'%h|%ad|%s' --date=short --no-merges
```

**PR history** — merged PRs across repos:
```bash
gh pr list --author @me --state merged --limit 20 \
  --json number,title,repository,mergedAt
```

**Copilot session history** (unique to this skill):
- Path: `~/.copilot/session-state/<session-id>/workspace.yaml`
- Read fields: `summary`, `cwd`, `repository`, `branch`
- Skip sessions without a `summary` field
- Note: this directory may not exist on all machines

If none of these sources are available, fall back to the guided interview.

### Step 2: Group related work

Cluster related signals into one entry:
- Same PR + its commits → 1 entry
- Multiple commits on the same file/feature within 3 days → 1 entry
- Copilot sessions referencing the same repo + branch → merge into PR entry if one exists

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

When the user is preparing for a performance review (Connect, annual review, etc.):

### Structure

1. **Gather** — collect entries from the work log (or backfill using the workflow above)
2. **Select** — pick the top 3–5 highest-impact items
3. **Rewrite** each item with three parts:
   - **What I did** — the specific action
   - **Why it mattered** — who benefited, what changed
   - **Proof** — PR number, metric delta, dashboard link, customer outcome
4. **Organize** by impact theme (not chronologically):
   - Delivering results / operational excellence
   - Customer / team impact
   - Collaboration / mentoring / leadership
   - Growth / learning
5. **Ask for gaps** — if evidence is missing, prompt the user: "What metric changed?", "Who was unblocked?", "What's the PR or incident ID?"

### Strong vs weak entries

| ✅ Strong | ❌ Weak |
|----------|--------|
| Outcome-first, quantified | Activity list ("worked on X") |
| Tied to customer/team impact | No beneficiary mentioned |
| Includes evidence (PR, metric) | No measurable result |
| Shows ownership or leadership | Pure task completion |

### Narrative format

For longer narrative sections, use STAR: **S**ituation → **T**ask → **A**ction → **R**esult.

For Microsoft employees using the Connect preset, frame entries around Core Priorities: delivering results, customer obsession, teamwork, and growth mindset.

## Output Contract

Before finishing, ensure:
1. Every entry has action → result → evidence (mark `(evidence needed)` if missing)
2. No fabricated metrics — only user-provided or source-verified data
3. Entries shown to user before saving
4. Time range explicitly stated
5. Output is pasteable markdown with categories assigned

## Gotchas

### No recent commits in the current repo
The user may work across multiple repos. Before concluding there's nothing to backfill:
1. Ask if they want to scan a different repo or branch
2. Check `gh pr list --author @me --state merged` for cross-repo PRs
3. Fall back to the guided interview — not all impactful work leaves git traces (design docs, incident response, mentoring)

### Review period doesn't match git history
Performance reviews often cover 6–12 months. Explicitly set the date range:
```bash
git log --author="$(git config user.name)" --since="2024-07-01" --until="2025-01-01" --oneline
```
PR history (`gh pr list --state merged`) is more reliable for long time ranges than commit logs.

### User can't quantify impact
Not every entry needs a number. See the Evidence Ladder above. Acceptable evidence includes PR links, "unblocked Team X", or qualitative outcomes with context. Never invent a metric to fill the gap.

### Copilot session directory doesn't exist
`~/.copilot/session-state/` only exists if the user has run Copilot CLI sessions. Don't error — silently skip and note: "No Copilot session history found; scanning git and PRs only."

### "brag" might mean something else
The user might say "brag about this feature to my team" (a launch announcement, not a work entry). Confirm intent if ambiguous.

### Pair programming or co-authored commits
If multiple authors appear on the same commits, ask: "Should I credit this as your work, shared work, or skip it?"

## Automatic Session Tracking (Optional)

For automatic background tracking of every Copilot CLI session (files edited, PRs created, git actions), install the [copilot-brag-sheet](https://github.com/microsoft/copilot-brag-sheet) extension. It adds `save_to_brag_sheet`, `review_brag_sheet`, and `generate_work_log` tools to every session.
