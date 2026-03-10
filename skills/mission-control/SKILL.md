---
name: mission-control
description: 'Customizable always-on status line for Copilot CLI sessions. Monitors git safety, blast radius, context health, cost rate, task drift, and more with color-coded alerts.'
---

# Mission Control

A configurable always-on status dashboard for Copilot CLI. After every response, Mission Control appends a compact status line showing the session metrics you care about. Modules change state to grab your attention only when something needs it.

## Activation

When the user invokes this skill, check whether a saved configuration exists from a previous session. If one exists, load it and display the status line immediately. If not, run the Setup Flow.

After activation, respond with:

> **Mission Control is online.** Your status line will appear after every response. Say "reconfigure mission control" to change modules, or "add [module]" / "remove [module]" to adjust on the fly.

Then append the status line to every subsequent response for the rest of the session.

---

## Setup Flow

Present the module menu and let the user select which modules they want. Offer presets for quick setup.

```
Welcome to Mission Control. Pick the modules for your status line
(you can change these anytime by saying "reconfigure mission control"):

SAFETY & RISK
  [ ] Safety Net — git status, time since last commit, unstaged changes
  [ ] Blast Radius — files and lines changed or deleted this session
  [ ] Cascade Risk — whether current file is imported by other files
  [ ] Verify Status — how many session changes have been tested

AWARENESS
  [ ] Context Health — how well you understand the user's codebase
  [ ] Drift Detector — whether the user is still on their original task
  [ ] Complexity — difficulty rating of the current task
  [ ] Branch Info — current branch, open PR status, ahead/behind

COST & EFFICIENCY
  [ ] Cost Rate — current model's premium request multiplier
  [ ] Savings Jar — cumulative PRUs saved by efficient model choices
  [ ] Quota Forecast — monthly pace projection as a weather icon
  [ ] Range — estimated remaining quota (user provides their quota)

PRODUCTIVITY
  [ ] Session Clock — how long this session has been active
  [ ] Todo Progress — plan mode task completion status
  [ ] Momentum — tasks completed vs. blocked this session
  [ ] Turns — interaction count this session

INFRASTRUCTURE
  [ ] MCP Health — connected MCP servers and their status
  [ ] Model — which model is currently active (full name)
  [ ] Context Window — token usage as a percentage of the limit

Or pick a preset:

  Safety First — safety net, blast radius, verify, cascade
  Budget Hawk — cost rate, savings jar, quota forecast, range
  Productivity — momentum, todos, drift, session clock
  Full Ops — all modules enabled
  Recommended — safety net, blast radius, context health, cost rate,
                 drift detector, session clock
```

If the user picks "Recommended" or doesn't express a preference, enable: Safety Net, Blast Radius, Context Health, Cost Rate, Drift Detector, and Session Clock.

After setup, confirm the configuration and show the initial status line.

---

## Status Line Format

The status line appears after every response, separated from the main content by a blank line. Format:

```
mission control │ [module] │ [module] │ [module] │ ...
```

Keep it to one line when possible. If the user has selected more than 8 modules, use two lines.

---

## Module Specifications

Each module reports a severity level (for example: informational, normal, warning, or critical) and may use its own display labels for those levels. Map each module's labels onto these severity levels so you can drive consistent color and visual treatment across the status line. Warning and critical severities should be visually distinct so the user notices them through peripheral vision.

### Safety Net

Tracks git status and time since last commit.

| State | Display | Trigger |
|---|---|---|
| Normal | `git:clean 4m` | Working tree is clean, recent commit |
| Warning | `git: 3 unstaged 22m` | Unstaged changes exist or no commit in 20+ min |
| Critical | `git: 8 unstaged 1h+` | Many unstaged changes or no commit in 60+ min |

Data source: Run `git status --porcelain` and parse the two status columns to count only unstaged changes (where the worktree column is not a space), treating untracked files (`??`) as unstaged. Use `git log -1 --format=%ct` to get the last-commit timestamp in epoch seconds and compute minutes since that commit from the numeric value.

### Blast Radius

Tracks how many files and lines the agent has changed this session.

| State | Display | Trigger |
|---|---|---|
| Light | `2F/8L` | Fewer than 5 files, fewer than 50 lines |
| Heavy | `11F/342L` | 5+ files or 50+ lines, no deletions |
| Critical | `11F/342L/2D` | Any files deleted (append D count) |

Data source: Maintain an internal count of files edited, lines changed, and files deleted during the session. Increment these counters each time you use the edit, create, or delete tools. Format: `[Files]F/[Lines]L` with `/[Deleted]D` appended only if deletions have occurred.

### Cascade Risk

Shows how many other files depend on the file currently being edited.

| State | Display | Trigger |
|---|---|---|
| Safe | `leaf (0 dep)` | No other files import/require the current file |
| Moderate | `4 dependents` | 1-5 files depend on the current file |
| Risky | `12 dep` | 6+ files depend on the current file |

Data source: When editing a file, run a quick grep for import/require statements referencing that file's name across the project. Count unique files.

### Verify Status

Tracks how many changed files have been validated by running tests.

| State | Display | Trigger |
|---|---|---|
| Good | `5/5 verified` | All changed files have been tested |
| Gaps | `3/5 untested` | Some changed files lack test coverage |
| None | `0/5 run tests?` | No tests have been run this session |

Data source: Track which files have been edited and whether tests covering those files have been executed during the session.

### Context Health

Indicates how well you understand the user's codebase based on files examined.

| State | Display | Trigger |
|---|---|---|
| Strong | `strong` | You have read 8+ files, tests exist, types/docs found |
| Moderate | `moderate` | You have read 3-7 files, partial understanding |
| Thin | `thin` | First visit to this repo, fewer than 3 files examined |

Data source: Count the number of distinct files you have read or searched during the session. Check whether test files and documentation exist in the project.

### Drift Detector

Monitors whether the conversation has wandered from the original task.

| State | Display | Trigger |
|---|---|---|
| On task | `auth-refactor` | Current work aligns with the initial request |
| Drifting | `drifting` | Current work is in unrelated files or topics |
| Ready | `ready` | No task established yet |

Data source: Record the user's first substantive request as the mission objective (use a short label, 2-3 words). As the session progresses, compare current file edits and conversation topics against that objective. If the current work involves files or topics unrelated to the original request, flag as drifting.

### Complexity

Rates the difficulty of the current task.

| State | Display | Trigger |
|---|---|---|
| Low | `low` | Single file, straightforward edit, high confidence |
| Medium | `medium` | Multiple files, moderate logic changes |
| High | `high` | Cross-cutting changes, architectural impact |

Data source: Assess based on number of files involved, whether changes span multiple modules or layers, and whether the task requires reasoning about system-wide behavior.

### Branch Info

Shows the current git branch and related context.

| State | Display | Trigger |
|---|---|---|
| Clean | `feature/auth` | On a feature branch, up to date |
| Behind | `feat/auth 3 behind` | Branch is behind its upstream |
| PR open | `feat/auth PR #42` | An open PR exists for this branch |
| No upstream | `feat/auth (local)` | Branch has no upstream configured |
| Detached | `detached @ a1b2c3d` | HEAD is in detached state |

Data source: Run `git branch --show-current` for branch name. First, check whether the current HEAD has an upstream and is not in a detached state (for example, with `git rev-parse --abbrev-ref --symbolic-full-name @{u}` and treating failures as "no upstream" / "detached"). Only if an upstream exists, run `git rev-list --count HEAD..@{u}` for the behind count; otherwise, surface a dedicated "no upstream" or "detached" state instead of the raw git error. Use GitHub MCP tools to check for open PRs on the current branch if available.

### Cost Rate

Shows the premium request multiplier for the current model.

| State | Display | Trigger |
|---|---|---|
| Low | `0.25x` | Low-cost model (e.g., Haiku, GPT-5 mini, Gemini Flash) |
| Standard | `1x` | Standard multiplier (e.g., Sonnet, GPT-5, Gemini Pro) |
| Premium | `4x` | High multiplier (e.g., Opus) |

Data source: Identify the current model from session context. Apply the published multiplier table:
- Claude Haiku 4.5: 0.25x (effectively free for most quota purposes)
- Claude Sonnet 4 / 4.5: 1x
- Claude Opus 4.6: 4x
- GPT-5 mini: 0.25x
- GPT-5: 1x
- GPT-5.1 / 5.2: 1x
- Gemini 2.0 Flash: 0.25x
- Gemini 2.5 Pro: 1x

Note: These multipliers change over time. Use the most current published values from GitHub's documentation.

### Savings Jar

Tracks cumulative PRUs saved by using efficient models when a cheaper model could handle the task.

| State | Display | Trigger |
|---|---|---|
| Building | `+6 saved` | Some savings accumulated |
| Big day | `+22 saved` | Significant savings in this session |

Data source: When a task is simple enough that a cheaper model could have handled it but a more expensive model was used, calculate the difference. When the user switches to a cheaper model on your recommendation, add the difference to the jar. This is an estimate based on the multiplier difference.

### Quota Forecast

Projects whether the user will hit their monthly quota at the current pace.

| State | Icon | Trigger |
|---|---|---|
| Clear | Clear skies | On pace to use less than 60% of monthly quota |
| Cloudy | Partly cloudy | On pace to use 60-85% of monthly quota |
| Stormy | Storm | On pace to exceed quota before month end |

Data source: Requires the user to provide their monthly quota (e.g., 1,000 PRUs for Pro, 5,000 for Pro+). Track session PRU usage and extrapolate based on days remaining in the billing cycle. This is a rough projection, not a billing statement.

### Range

Shows estimated remaining quota as a visual bar.

| State | Display | Trigger |
|---|---|---|
| Full | `92%` with full bar | More than 70% remaining |
| Mid | `48%` with half bar | 30-70% remaining |
| Low | `12%` with low bar | Less than 30% remaining |

Data source: Same as Quota Forecast. Requires user-provided quota. Subtract estimated session usage from reported remaining quota.

### Session Clock

Tracks how long the current session has been active.

| State | Display | Trigger |
|---|---|---|
| Active | `18m` or `1h22m` | Always shows elapsed time |

Data source: Record the time when the skill is activated. Calculate elapsed time for each status line update. No warning states — purely informational.

### Todo Progress

Shows completion status of plan mode tasks.

| State | Display | Trigger |
|---|---|---|
| Working | `3/7 done` | Tasks in progress |
| Blocked | `3/7, 1 blocked` | One or more tasks are blocked |
| Complete | `7/7 done` | All tasks finished |

Data source: Query the session's todo tracking (SQL todos table if available, or the plan.md file). Count tasks by status.

### Momentum

Tracks the ratio of completed to blocked tasks.

| State | Display | Trigger |
|---|---|---|
| Rolling | `8 done, 0 blocked` | Work is flowing |
| Stalled | `2 done, 3 blocked` | More blocked than completed |

Data source: Same as Todo Progress. Focus on the ratio of done to blocked tasks.

### Turns

Counts the number of user-agent interactions this session.

| State | Display | Trigger |
|---|---|---|
| Normal | `12 turns` | Always shows the count |

Data source: Increment a counter with each user message. Purely informational.

### MCP Health

Shows the status of connected MCP servers.

| State | Display | Trigger |
|---|---|---|
| All good | `3 MCP ok` | All configured MCP servers responding |
| Issue | `2/3 MCP` | One or more servers not responding |

Data source: Check MCP server connection status from session context.

### Model

Shows the full name of the active model.

| State | Display | Trigger |
|---|---|---|
| Active | `Sonnet 4.5` | Always shows current model name |

Data source: Read the current model from session context. Display the human-readable name.

### Context Window

Shows how full the context window is.

| State | Display | Trigger |
|---|---|---|
| Healthy | `38%` with bar | Less than 60% full |
| Heavy | `82% /compact?` with bar | 60-90% full, suggest compacting |
| Full | `97%` with bar | More than 90% full |

Data source: Use context window information available in the session. Display as a percentage with a visual bar. When above 60%, append a suggestion to run `/compact`.

---

## Runtime Commands

The user can modify their configuration at any time during a session:

| Command | Effect |
|---|---|
| "add [module name]" | Enables a module and adds it to the status line |
| "remove [module name]" | Disables a module and removes it from the status line |
| "reconfigure mission control" | Re-runs the full setup flow |
| "mission control off" | Hides the status line (skill stays loaded) |
| "mission control on" | Shows the status line again |
| "mission control status" | Shows detailed view of all active modules |

The skill should recognize module names in natural language. For example, "add the savings jar" or "remove blast radius" or "turn off the drift detector" should all work.

---

## Detailed Status View

When the user says "mission control status" or asks for more detail, show an expanded view of all active modules with full context:

```
Mission Control — Detailed Status
==================================

Safety Net        git:clean, last commit 4 minutes ago, 0 unstaged changes
Blast Radius      3 files edited, 14 lines changed, 0 files deleted
Context Health    Strong — 12 files examined, tests found, typed codebase
Cost Rate         1x (Claude Sonnet 4.5) — standard premium rate
Drift Detector    On task: "auth-refactor" — current work aligns
Session Clock     18 minutes active, 7 turns

All systems nominal.
```

---

## Persistence

Save the user's module selection to `~/.copilot/mission-control.json` so it persists across sessions. Format:

```json
{
  "modules": ["safety-net", "blast-radius", "context-health", "cost-rate", "drift-detector", "session-clock"],
  "quota": null,
  "preset": "recommended"
}
```

If the user has provided their monthly quota (for the Range and Quota Forecast modules), store it in the `quota` field.

On activation, check for this file first. If it exists, skip setup and load the saved configuration. Tell the user which modules are active and remind them they can reconfigure.

---

## Design Principles

1. **Peripheral vision.** The status line should be ignorable during normal operation. You notice it when something turns yellow or red, not when everything is green.
2. **Earn every character.** The status line is compact. No decoration, no filler. Every element conveys signal.
3. **Actionable alerts.** Warning and critical states should suggest what to do, not just flag a problem. "8 unstaged 1h+ — commit now" is better than just "8 unstaged."
4. **Honest estimates.** Cost and quota modules are estimates based on published multipliers and user-provided data. Never present estimates as exact billing figures. If the user hasn't provided quota info, don't show quota-dependent modules.
5. **No noise.** If a module has nothing useful to report, show its normal state quietly. Don't manufacture warnings for engagement.
