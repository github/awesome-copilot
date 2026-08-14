# 🪨 Cairn — Signals Dashboard

A live GitHub Copilot CLI **canvas extension** that shows the pulse of every
desk in your Workshop. It reads the agent signals your desks emit and renders
them as a compact, always-current dashboard in a side panel — so you can direct
the work instead of polling each desk by hand.

It replaces the old Blazor **WorkshopRoom** dashboard (`src/WorkshopRoom/`) with
a native canvas that runs inside GHCP, with no separate web app to launch.

## What it is

Each desk in the Workshop leaves signals behind — small stones on the trail —
by writing JSON files into its `.signals/` folder. Cairn scans those folders,
picks the most recent signal per desk, and renders:

- **Score bars** for the desk's self-assessment (intent, confidence, accuracy,
  completeness).
- **Patterns** the desk reported: what worked ✓, what was hard △, and skill
  gaps ✗.
- **Escalations** — desks that raised their hand, with what they're blocked on
  and their recommendation, pinned to the top and pulsing red.

## How to open it

The dashboard is registered as the **🪨 Cairn** canvas (`signals-dashboard`).
Ask Copilot to open it and pass your workshop root as `workshopDir`:

> Open the 🪨 Cairn canvas with `workshopDir` set to the folder that contains
> my `desks/` directory.

`workshopDir` must be the **absolute path to the workshop root** — the folder
that holds `desks/` (and optionally `classroom/`). If omitted, it falls back to
the current working directory.

## Features

- **Signal scanning** — walks `desks/*/.signals/` and `classroom/*/.signals/`,
  reading the newest `*.json` per desk (mirrors `SignalReader.cs`).
- **Score bars** — color-coded intent / confidence / accuracy / completeness,
  scored out of 5.
- **Escalation alerts** — escalation signals sort to the very top, render with a
  pulsing red border, and surface the blocker + recommendation.
- **Active desks first** — sorted escalations → recent signals → desks with no
  signal yet, then by recency.
- **Stash / restore** — pause a workstream by stashing its desk. Stashed desks
  drop off the active view and auto-expire after a **48-hour TTL**; restore any
  time before then. Stash state lives in `.desk-stash.json` at the workshop
  root.
- **Auto-refresh** — the panel refreshes every 5 seconds using a background
  fetch (no full page reload), so scores and escalations stay current smoothly.
- **Summary bar** — desk count, how many are reporting vs. awaiting, an
  escalation badge, and average scores across the room.
- **Cost-aware desk launch** — **open** starts a repo-profile desk that keeps the
  verified Workshop root available while suppressing ambient plugin MCPs.
  **connected** preserves every configured MCP for work that needs external
  systems. Agency remains the preferred wrapper when installed.
- **Local Delegation** — orthogonal off/on control. When available and on, the
  frontier desk may use the installed [`local-agent-delegation`](https://github.com/jennyf19/sealed-delegation)
  skill for bounded, independently gated read/evidence work. Fail-closed: no
  skill or no qualified route receipt means the toggle cannot take effect, and
  no local-savings credit is awarded.

## Agent actions

The canvas also exposes actions Copilot can invoke directly:

- `refresh` — force a rescan and return current signal data as JSON.
- `stash` — stash a desk by `deskName`.
- `restore` — restore a stashed desk by `deskName`.
- `open_desk` — open a desk with optional `profile: "repo" | "connected"` and
  optional `localDelegation: "off" | "on"`.

## Desk launch profiles

`repo` is the default. At launch, Cairn asks Copilot for the enabled
plugin-scoped MCP inventory and disables those ambient servers for the topic
desk. User-, workspace-, organization-, and built-in resources are left alone.
If discovery fails, Copilot plugin MCP suppression fails open; Agency repo mode
still omits Agency's own default MCPs.

When Agency is installed, Cairn keeps the existing `agency copilot` launch and
adds Agency's `--no-default-mcps` in repo mode. Outside Agency, the same profile
is applied directly to Copilot CLI.

Both profiles pass `--add-dir <workshop-root>` so a desk can intentionally read
another desk's journal or artifact without receiving access outside the room.

Set `WORKSHOP_DESK_PROFILE=connected` to retain the historical default for the
main **open** button. The separate **connected** button is always available when
repo mode is the default.

## Local Delegation

Local Delegation is **not** a third desk profile and does not replace the frontier
model. It is a separate permission bit:

```text
repo / connected        = which MCPs and tools the frontier desk can see
Local Delegation off/on = whether the frontier desk may invoke a bounded local worker
```

Availability is fail-closed. Cairn enables the lane only when:

1. the `local-agent-delegation` skill is installed, and
2. a qualified route is declared via `WORKSHOP_LOCAL_DELEGATION_ROUTE_ID` or a
   receipt at `~/.copilot/local-agent-runs/qualified-route.json`
   (`status: "qualified"`, safe `route_id`).

Operator preference is stored **user-locally** under
`~/.copilot/workshop-local-delegation/` (keyed by the canonical workshop path),
never in the cloned workshop — a repo cannot ship `preference: on`.
When the preference is on but availability fails, opens still launch as frontier
desks and surface the reason — they never silently fall back with savings credit.

When effective, Cairn sets `WORKSHOP_LOCAL_DELEGATION=enabled` on the launched
process, shows an open toast/badge (`Local Delegation effective · route …`), and
may append one short ASCII line to `-i` (`Local Delegation env is enabled.`) when
that combined prompt stays quote-free and under the length guard. Full policy
still lives in the env flag plus the installed `local-agent-delegation` skill —
never a long multi-sentence `-i` appendix (Windows Terminal reparse).
The runtime, launcher, and gates remain owned by
[Sealed Delegation](https://github.com/jennyf19/sealed-delegation).

## Signal shape

Cairn reads the agent-signals protocol used across the Workshop:

```json
{
  "signal_type": "execution",
  "agent_name": "desk-name",
  "self_assessment": { "intent": 5, "confidence": 4, "accuracy": 4, "completeness": 3 },
  "patterns": { "what_worked": "...", "what_was_hard": "...", "skill_gap": "..." },
  "escalation": { "reason": "...", "blocked_on": "...", "recommendation": "..." }
}
```

`escalation` is only present on `signal_type: "escalation"` signals.

## Replaces the Blazor WorkshopRoom

This canvas supersedes the standalone Blazor dashboard in `src/WorkshopRoom/`.
The data is the truth and the UI is just a view — Cairn renders the same signal
data natively inside GHCP, so there's no separate server to run.
