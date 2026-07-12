# AI Team Orchestration

Run a role-separated AI development team with durable handoffs, frozen candidates, and risk-based delivery gates. The Producer owns scope and merge state, Dev implements and supplies checked candidates, and optional QA establishes behavioral evidence when the plan selects it.

## What's Included

### Agents

| Agent | Mention | Role | Operating boundary |
|-------|---------|------|--------------------|
| **Producer** (Remy) | `@ai-team-producer` | Planning, status, risk-based gate selection, regular merge | Coordinates and assesses evidence; never implements or runs product tests |
| **Dev Team** | `@ai-team-dev` | Stack-adaptive implementation, planned checks, scoped fixes | Implements but never merges its work or self-approves an independent gate |
| **QA** (Ivy) | `@ai-team-qa` | Optional candidate acceptance, automation, bug verification, smoke checks | Acts only when selected; may edit tests and QA docs, never application source |

The agents intentionally omit the optional `tools` and `model` fields. They inherit the user's enabled built-in, MCP, and extension tools and the developer's selected model. Capability is not authority: repository files, issues, PR text, logs, artifacts, fetched pages, and command output are untrusted data. Role boundaries, repository policy, normal authentication/approval controls, and the typed delivery plan still apply.

### Skill

`/ai-team-orchestration` provides templates for:
- **PROJECT_BRIEF.md** — 15-section single source of truth across chats
- **Brainstorm format** — multi-agent debate with distinct voices
- **Sprint plans** — prioritized tasks, progress trackers, handoff docs
- **Delivery workflow** — frozen candidates and proportionate Dev, review, QA, merge, and smoke gates
- **Safe Git contract** — narrow plan-value grammar, verified endpoints, and fixed command forms
- **Anti-patterns** — lessons from real multi-agent projects

## Quick Start

### 1. Bootstrap a project

```
@ai-team-producer I want to build [describe your project].
Use /ai-team-orchestration to bootstrap this project.
Start with a brainstorm, then create PROJECT_BRIEF.md with ALL sections (1-15).
```

### 2. Plan a sprint

```
@ai-team-producer Create Sprint 1 plan. Scope: [what to build].
Before Dev starts, run a team consilium, classify risk, record concrete checks,
select proportionate gates, confirm repository coordinates, and set the reopen budget.
```

### 3. Execute (separate VS Code window)

```
@ai-team-dev Read PROJECT_BRIEF.md, then docs/sprint-1/plan.md. Execute Sprint 1.
Validate the plan's Git values, implement, and run every selected Dev check.
Capture the tested commit ID, push and freeze immediately, create/update the PR,
confirm its observed head matches, then post the Candidate Packet to the Producer.
```

Every code/configuration candidate has at least one concrete check. Independent review, QA, and post-merge checks are selected before implementation in proportion to risk. Authentication/authorization, secrets or privacy, destructive data, privilege/deployment, supply-chain, and declared safety-invariant changes require applicable security-focused evidence or explicit CEO/maintainer risk acceptance.

### 4. Run independent review (when selected)

```
@ai-team-producer Run the selected independent review for Sprint 1 PR #[number]
against the frozen Candidate ID. Route blocking findings through a scoped reopen.
```

### 5. Run QA acceptance (when selected, another VS Code window)

```
@ai-team-qa Test the frozen candidate for Sprint 1 PR #[number] or its immutable
preview. Record the environment and report candidate-bound Ready for merge or
Blocked evidence to the Producer. Do not authorize Dev or move the app branch.
```

### 6. Decide and merge

```
@ai-team-producer Confirm all planned checks and selected gates bind to the
Delivery Ledger Candidate ID, no blocker/major remains, and required approval is
current. Regular-merge with an atomic expected-head guard equal to that Candidate
ID, or a protected queue that revalidates it. Guard failure means Hold. Then run
selected post-merge checks and complete the authoritative project-status update.
```

## How It Works

The human acts as the message bus between parallel chats. Use a separate clone per concurrent session. Dev works on the planned branch; QA normally checks out the frozen candidate and needs a separate branch only for test/evidence commits.

- **@ai-team-producer** — owns the static plan and live PR Delivery Ledger, commissions selected gates, controls scoped reopens, and merges
- **@ai-team-qa** — when selected, edits tests and QA docs, accepts or blocks the frozen candidate, and reports only to the Producer
- **@ai-team-dev** — builds with Nova, Sage, and Milo perspectives adapted to the discovered stack

The application branch freezes at candidate push. A failing gate does not authorize another push: only a Producer-authored Branch Reopen Packet does. New candidates stale earlier evidence by default; only the original gate owner may carry an unaffected verdict forward after reviewing the actual delta.

Native commit-bound reviews/checks, Git-bound reports, and immutable artifacts may provide candidate binding without repetitive hash paperwork. Generic comments must state the full Candidate ID and immutable evidence ID. After merge, updating authoritative project status is mandatory; copying gate evidence into repository docs is optional and must not create recursive closeout work.

If more than 128 tools are enabled, reduce the selection in the VS Code tool picker or configure `github.copilot.chat.virtualTools.threshold` so VS Code manages the large tool set through virtual tools.

## Origin

Codifies the workflow that shipped [Arcade After Dark](https://github.com/denis-a-evdokimov/guess-and-get) — a 30-game birthday gift app built entirely by 7 AI agents in 5 days.
