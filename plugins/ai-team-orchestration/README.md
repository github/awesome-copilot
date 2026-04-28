# AI Team Orchestration

Bootstrap and run a multi-agent AI development team with named roles (Producer, Dev Team, QA). Plan sprints, run brainstorms with distinct agent voices, coordinate parallel dev/QA workflows, and survive context overflows with structured handoff templates.

## What's Included

### Agents

| Agent | Mention | Role | Tool Access |
|-------|---------|------|-------------|
| **Producer** (Remy) | `@ai-team-producer` | Sprint planning, coordination, PR merging | Read-only (no code editing) |
| **Dev Team** (Nova, Sage, Milo) | `@ai-team-dev` | Frontend, backend, and visual implementation | Full coding tools |
| **QA** (Ivy) | `@ai-team-qa` | Testing, bug filing, sign-off | Read + test (no source editing) |

### Skill

`/ai-team-orchestration` provides templates for:
- **PROJECT_BRIEF.md** — 14-section single source of truth across chats
- **Brainstorm format** — multi-agent debate with distinct voices
- **Sprint plans** — prioritized tasks, progress trackers, handoff docs
- **Anti-patterns** — 19 documented pitfalls from real multi-agent projects

## Quick Start

### 1. Bootstrap a project

```
@ai-team-producer I want to build [describe your project].
Use /ai-team-orchestration to bootstrap this project.
Start with a brainstorm, then create PROJECT_BRIEF.md with ALL sections (1-14).
```

### 2. Plan a sprint

```
@ai-team-producer Create Sprint 1 plan. Scope: [what to build].
Run a team consilium to validate the plan.
```

### 3. Execute (separate VS Code window)

```
@ai-team-dev Read PROJECT_BRIEF.md, then docs/sprint-1/plan.md. Execute Sprint 1.
```

### 4. Test (another VS Code window)

```
@ai-team-qa Sprint 1 is merged to main. Do full playthrough.
File bugs as GitHub Issues. Write docs/qa/sprint-1-signoff.md.
```

## How It Works

The human acts as the message bus between parallel chats. Each team works in a separate VS Code window with its own repo clone:

- **@ai-team-producer** — cannot edit code (enforced by tool restrictions)
- **@ai-team-qa** — cannot edit source files, only reads/tests/files bugs
- **@ai-team-dev** — full tools, builds as Nova (frontend), Sage (backend), Milo (design)

## Origin

Codifies the workflow that shipped [Arcade After Dark](https://github.com/denis-a-evdokimov/guess-and-get) — a 30-game birthday gift app built entirely by 7 AI agents in 5 days.
