---
name: myvibe
description: 'Use this skill when the user gives a one-line command to start a new project, such as "build me a kanban board", "scaffold a SaaS dashboard", "make a portfolio site", "create an inventory tracker", "vibe code", or "use myVibe". Runs a one-shot intake that collects every project decision in a single round, then plans, scaffolds, builds, tests, and ships a complete localhost-running project. Do not trigger for edits to existing projects, single-file requests, bug fixes, or pure questions — this skill is for new project creation only.'
license: MIT
compatibility: 'Cross-platform. Works on Windows, macOS, and Linux. No runtime dependencies beyond the toolchain the chosen stack needs.'
metadata:
  version: "1.0"
  enhancements:
    - One-shot intake collects every decision upfront in a single round
    - Ralph-style feature loop with spec, failing test, implement, retry-with-budget
    - Binary quality gate (lint, types, tests, build all green or not done)
    - Localhost-first by design — deployment is explicitly out of scope
    - Vendor-neutral protocol that works across Copilot, Claude Code, Codex CLI, Cursor, Windsurf
---

# myVibe

A deterministic operating system for shipping professional software projects from a single one-line command. Vendor-neutral: the same protocol works the same way on any coding agent.

## When to invoke this skill

The user gives a one-line project command. Examples:

- "Build me a kanban board with drag-and-drop"
- "Make a SaaS billing dashboard"
- "Scaffold an inventory tracker"
- "Create a portfolio site with scroll animations"
- "I want a meal-planner app"
- "Use myVibe to build X"

Do **not** invoke for: edits to existing projects, single-file requests, debugging existing code, or pure Q&A. This skill is for new project creation end-to-end.

## The protocol

The kit lives at `https://github.com/Mohamed201389/myVibe`. After install, the kit folder is on disk and the agent follows files in this order.

### Step 1 — Intake (ONE round)

1. Read `INTAKE.md` in the kit folder.
2. Fill the 18-section intake form with sensible defaults derived from the user's one-line command.
3. Send the filled form to the user in a single message; ask them to override any line or reply "go".
4. After "go", write the final form to `INTAKE.md` at the new project root and commit it as `chore: lock project intake`.
5. Do not ask further questions until the project is shipped. If something is ambiguous mid-build, pick a sensible default and note it in `CHANGELOG.md`.

### Step 2 — Orchestrate

Read `00-START-HERE.md` and follow Phases 2 through 7 in order. At each phase boundary, re-read the relevant per-stage file:

- `01-plan.md` for planning
- `03-scaffolding.md` for stack and bootstrap
- `05-frontend.md` / `06-backend.md` / `07-database.md` for the foundation
- `04-features.md` for each feature spec
- `08-testing.md` for test strategy
- `09-checkpoint.md` at every checkpoint
- `10-changelog.md` for changelog discipline
- `11-localhost.md` for env, ports, dev DX
- `12-code-style.md` for code quality
- `13-debugging.md` when something breaks
- `14-quality-gates.md` before declaring done

### Step 3 — Ralph-style feature loop

For each feature in `PLAN.md`, run the tight inner loop from Phase 5 of `00-START-HERE.md`: spec → failing test → implement → run → on-fail debug-and-retry → on-pass checkpoint → next feature. Maximum 3 retry passes before escalating to the user.

### Step 4 — Quality gate

Before claiming done, every check in `14-quality-gates.md` must pass. If any fails, fix and re-run.

## Rules of engagement

- **Localhost-first.** No deployment, no cloud, no production paths in v1.
- **Latest stable library versions.** No "for compatibility" downgrades.
- **One feature at a time.** No parallel half-builds.
- **No emojis** in code, commits, or terminal-facing docs.
- **Read before edit.** Never modify a file you have not read in the current session.
- **Specific over clever.** Prefer explicit, boring code that a junior can read at 2 a.m.

## What this skill addresses

Frontier models can write code well but freelance when given vague briefs: they pick random stacks, skip tests, ask interrogation questions mid-build, and stop halfway. myVibe replaces freestyle with a deterministic intake-plan-build-test-ship loop that closes those gaps without limiting model creativity inside each phase.

## Compatibility

The same protocol is published in three vendor-specific files so any agent that reads its own configuration picks it up automatically:

- GitHub Copilot reads `.github/copilot-instructions.md`
- Claude Code reads `CLAUDE.md` or `~/.claude/skills/myvibe/SKILL.md`
- Codex CLI, Cursor, Windsurf, Aider read `AGENTS.md`

Source repo: https://github.com/Mohamed201389/myVibe (MIT, no telemetry).
