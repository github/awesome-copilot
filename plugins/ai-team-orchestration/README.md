# AI Team Orchestration

Run a role-separated AI development team with durable handoffs and explicit delivery gates. Producer owns scope and merge status, Dev implements and self-reviews, and QA accepts or blocks the exact PR head before merge.

## What's Included

### Agents

| Agent | Mention | Role | Operating boundary |
|-------|---------|------|--------------------|
| **Producer** (Remy) | `@ai-team-producer` | Planning, status, independent-review commissioning, regular merge | Coordination only; no implementation or test execution |
| **Dev Team** | `@ai-team-dev` | Stack-adaptive implementation, tests, self-review, fixes | Implements but never independently approves or merges its work |
| **QA** (Ivy) | `@ai-team-qa` | PR-head acceptance, test automation, bug verification, smoke checks | May edit tests and QA docs, never application source |

The agents intentionally omit the optional `tools` and `model` fields. They inherit the user's enabled built-in, MCP, and extension tools instead of replacing that configuration with a plugin allowlist, and they leave `model` to the developer so each session can use its best available model. Their operating boundaries are instructions enforced alongside normal trust, authentication, approval, and permission controls.

### Skill

The `ai-team-orchestration` skill provides templates for:
- **PROJECT_BRIEF.md** — 15-section single source of truth across chats
- **Brainstorm format** — multi-agent debate with distinct voices
- **Sprint plans** — prioritized tasks, progress trackers, handoff docs
- **Delivery workflow** — independent review, PR-head QA, merge, and smoke gates
- **Anti-patterns** — lessons from real multi-agent projects

## Quick Start

### 1. Bootstrap a project

```
@ai-team-producer I want to build [describe your project].
Use the ai-team-orchestration skill to bootstrap this project.
Start with a brainstorm, then create PROJECT_BRIEF.md with ALL sections (1-15).
```

### 2. Plan a sprint

```
@ai-team-producer Create Sprint 1 plan. Scope: [what to build].
Run a team consilium to validate the plan.
```

### 3. Execute (separate VS Code window)

```
@ai-team-dev Read PROJECT_BRIEF.md, then docs/sprint-1/plan.md. Execute Sprint 1.
Implement, test, self-review, then open the PR and hand off its exact head SHA.
```

### 4. Run the independent review gate

```
@ai-team-producer Review Sprint 1 PR #[number]. Confirm Dev self-review, then commission a fresh non-author reviewer against the exact PR head SHA.
```

### 5. Run QA acceptance before merge (another VS Code window)

```
@ai-team-qa Test Sprint 1 PR #[number] at head SHA [sha] or its immutable preview. Record the environment, file bugs, verify fixes on each new head, and post Ready for merge or Blocked.
```

### 6. Merge and smoke-check

```
@ai-team-producer Confirm independent review and QA acceptance apply to the current PR head, regular-merge it, then send the merge/deploy SHA to QA for a smoke check and archive the evidence through a docs-only closeout PR.
```

## How It Works

The human acts as the message bus between parallel chats. Each team works in a separate VS Code window with its own repo clone:

- **@ai-team-producer** — edits coordination docs, commissions independent analysis, and merges; never implements or runs tests
- **@ai-team-qa** — edits tests and QA docs, accepts the exact PR head, and never fixes application source
- **@ai-team-dev** — builds with Nova, Sage, and Milo perspectives adapted to the discovered stack

If more than 128 tools are enabled, reduce the selection in the VS Code tool picker or configure `github.copilot.chat.virtualTools.threshold` so VS Code manages the large tool set through virtual tools.

## Origin

Codifies the workflow that shipped [Arcade After Dark](https://github.com/denis-a-evdokimov/guess-and-get) — a 30-game birthday gift app built entirely by 7 AI agents in 5 days.
