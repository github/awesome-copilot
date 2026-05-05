---
name: pr-dashboard
description: 'Open a GitHub PR dashboard in the browser. Use when the user asks to see their pull requests, open the PR dashboard, show PRs for a date range, or check PR status. Trigger phrases include "show my PRs", "open PR dashboard", "pull request dashboard".'
---

# PR Dashboard

Generates and opens a GitHub PR dashboard in the browser for a given date range and role filter.

**Prerequisites:** GitHub CLI (`gh`) must be installed and authenticated (`gh auth login`).

## What to do

Find the CLI script bundled with this skill and run it:

```bash
SKILL_SCRIPT=$(find ~/.copilot -name "pr-dashboard-cli.mjs" -path "*/pr-dashboard/scripts/*" 2>/dev/null | head -1)
node "$SKILL_SCRIPT" "<query>" "<role>"
```

- `<query>`: the date range the user specified (default: `last 7 days`)
- `<role>`: one of `Authored by me`, `Requested reviews`, `Assigned to me`, `All` (default: `Authored by me`)

## Parsing the user's request

Extract the date range and role from the user's message. Examples:

| User says | query | role |
|---|---|---|
| show my PRs | `last 7 days` | `Authored by me` |
| show my PRs last 2 weeks | `last 2 weeks` | `Authored by me` |
| PR dashboard this month reviews | `this month` | `Requested reviews` |
| PR dashboard march 2026 assigned | `march 2026` | `Assigned to me` |
| show all PRs last 30 days | `last 30 days` | `All` |

**Role keyword mapping:**
- "my PRs", "authored", "I wrote" → `Authored by me`
- "reviews", "review requested", "reviewing" → `Requested reviews`
- "assigned" → `Assigned to me`
- "all", "involves me" → `All`

## Supported date range formats

The script understands natural language — pass it through as-is:
- `last 7 days`, `last 2 weeks`, `last 30 days`
- `this week`, `last week`, `this month`, `last month`
- `march 2026`, `feb 2025`
- `2026-01-01 - 2026-03-31`
- `2025` (whole year)

## After running

Tell the user the dashboard is opening in their browser. The script outputs progress to stdout. If it exits with an error, show the error output and suggest they run `gh auth login` if it's an auth issue.

