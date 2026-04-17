---
name: brag-sheet
description: >
  Write impact-first work entries for performance reviews. Backfill from git history,
  Copilot session logs, and PRs. Categories: pr, bugfix, infrastructure, investigation,
  collaboration, tooling, oncall, design, documentation.
---

# Brag Sheet — Work Impact Writer

Help users write, organize, and backfill work accomplishments for performance reviews.

USE FOR: "brag", "log work", "what did I do", "backfill my work history", "prep for performance review", "write impact statement", "Connect prep"
DO NOT USE FOR: project management, sprint planning, time tracking, ticket creation

## Entry Format

Every entry uses impact-first framing:

```
Did X for Y → Result Z → Evidence
```

Transform vague descriptions into impact statements:

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

## Writing Entries

Guide users through 3 questions:

1. **What did you do?** — the specific change or deliverable
2. **Why does it matter?** — who benefits, what problem it solves
3. **What's the evidence?** — PR link, metrics, before/after

Output as markdown:

```markdown
### 🏗️ Infrastructure
- **Built latency dashboard in Grafana** → on-call detects P95 spikes in <2min → deployed to prod
```

## Backfill from Sources

When the user asks "what did I do last week" or "backfill my history":

### Git commits
```bash
git log --oneline --after="2 weeks ago" --author="$(git config user.name)" --no-merges
```
Group related commits into single entries. Bug fixes → `bugfix`, infra → `infrastructure`.

### Copilot CLI session history
Scan `~/.copilot/session-state/` for recent sessions:
```bash
find ~/.copilot/session-state/ -name "workspace.yaml" -mtime -14 -type f 2>/dev/null
```
Read each `workspace.yaml` for `summary`, `cwd`, `repository`, `branch` fields. Compose entries from significant sessions.

### PR history
```bash
gh pr list --state merged --author @me --limit 20
```

### Workflow
1. **Scan** sources above
2. **Group** related work into entries
3. **Draft** impact-first summaries
4. **Present** to user for review
5. **Output** as formatted markdown

## Performance Review Prep

When prepping for a review, organize entries by impact theme (not chronologically):
- Reliability / operational excellence
- Feature delivery / velocity
- Collaboration / mentoring
- Technical leadership

For narrative sections, use STAR format: Situation → Task → Action → Result.

## Full Automatic Tracking

For automatic session tracking (files edited, PRs created, git actions captured in the background), install the [copilot-brag-sheet](https://github.com/microsoft/copilot-brag-sheet) extension:

```bash
curl -sL https://raw.githubusercontent.com/microsoft/copilot-brag-sheet/main/install.sh | bash
```

The extension adds `save_to_brag_sheet`, `review_brag_sheet`, and `generate_work_log` tools to every session.
