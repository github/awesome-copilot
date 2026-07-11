---
name: ai-team-orchestration
description: 'Bootstrap and run a multi-agent AI development team. Use when: starting a new software project with AI agents, setting up parallel dev/QA teams, creating sprint plans, writing brainstorm prompts with distinct agent voices, recovering a project workflow, or planning sprints. Based on a proven template that shipped a 30-game arcade app in 5 days.'
---

# AI Team Orchestration

## When to Use
- Starting a new project that needs planning, implementation, testing, and delivery
- Setting up parallel AI agent teams (Producer, Dev, QA, and optional specialists)
- Writing brainstorm prompts that produce real debate (not generic output)
- Creating sprint plans with cross-chat context survival
- Recovering from context overflow mid-sprint

## Team Roles and Perspectives

| Role/perspective | Name | Role | Focus |
|-------|------|------|-------|
| Producer | **Remy** | Sprint planning, coordination, review gates, merging PRs | Scope control, status, handoffs, issue triage |
| Product Designer | **Kira** | UX, mechanics, user experience | Fun factor, user flows, feature design |
| Visual/Experience Director | **Milo** | Presentation, interaction, visual identity | Design consistency, polish, accessibility |
| Client/Interaction Engineer | **Nova** | User-facing and client-side behavior | State, components, interaction logic |
| Core/Service Engineer | **Sage** | Domain logic, services, data, security | Contracts, integrations, infrastructure |
| Delivery Engineer | **Dash** | CI/CD, packaging, deployment, operations | Pipelines, environments, observability |
| QA Engineer | **Ivy** | Behavioral tests, automation, exploratory testing | Evidence, bug filing, acceptance |

The plugin bundles three real custom agents: Producer, Dev Team, and QA. Nova, Sage, and Milo are perspectives inside the Dev agent; Kira and Dash are optional planning perspectives, not separate bundled sessions. Customize perspectives for the project and omit those that do not apply.

## Chat Architecture

The human (CEO) is the message bus between parallel chats:

```
┌────────────────────────────────────────┐
│ @ai-team-producer — plans and merges   │
│ NEVER writes application code          │
└────────────────┬───────────────────────┘
                 │ Human carries messages
      ┌──────────┼──────────┐
      ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌────────┐
│@ai-team  │ │@ai-team  │ │DevOps  │
│-dev      │ │-qa       │ │(on     │
│          │ │          │ │demand) │
│ Nova     │ │ Ivy      │ │        │
│ Sage     │ │          │ │        │
│ Milo     │ │          │ │        │
│          │ │PR head / │ │feature/│
│ feature/ │ │preview   │ │delivery│
│ sprint-N │ └──────────┘ └────────┘
└──────────┘
```

Each team works in a **separate VS Code window** with its own clone:
```bash
git clone <repo> project-dev    # Dev team
git clone <repo> project-qa     # QA
git clone <repo> project-devops # DevOps (only when needed)
```

## Project Bootstrap

### 1. Create PROJECT_BRIEF.md

The single source of truth across all chats. See [project brief template](./references/project-brief-template.md).

**Required sections (do not abbreviate):**
1. Project Overview
2. Concept / Product Description
3. Tech Stack
4. Architecture (ASCII diagram)
5. Key Files Map
6. Team Roles
7. Sprint Status (updated every sprint)
8. Current State (rewritten every sprint)
9. Security Rules
10. How to Run Locally
11. How to Deploy
12. **Cross-Chat Handoff Protocol** — how context survives between chats
13. **Bug & Fix Tracking** — GitHub Issues as single source of truth
14. **Multi-Repo Setup** — separate clones, branch strategy, merge rules
15. **Delivery & Review Gates** — role ownership, evidence, and capability fallback

### 2. Run a Brainstorm

Use the [brainstorm format](./references/brainstorm-format.md) to produce real debate. Key: name each agent explicitly with distinct personality and perspective. Require at least 2 genuine disagreements to prevent groupthink.

### 3. Create Sprint Plans

Use the [sprint plan template](./references/sprint-plan-template.md). Every sprint gets:
- `docs/sprint-N/plan.md` — prioritized tasks, success criteria
- `docs/sprint-N/progress.md` — live tracker, enables recovery
- `docs/sprint-N/done.md` — handoff doc written at sprint end

### 4. Deliver Through PR Gates

The [Delivery Workflow](./references/delivery-workflow.md) is canonical:

**Plan → Implement → Dev self-review → Independent review gate → QA acceptance on PR head → Fix/re-verify loop → regular merge → post-merge smoke check**

Dev creates a clean feature branch from the agreed remote base, implements and tests, commits context-only handoff files, then records the final candidate SHA in the PR handoff. The Producer commissions a reviewer who is independent of the authors. QA tests that exact PR head or immutable preview and records acceptance on the PR. Every new head invalidates both SHA-bound gates. Only the Producer merges after both gates; a docs-only/trivial exemption must be explicit. After merge and smoke, a docs-only closeout PR archives evidence and updates authoritative status. Every role detects its available mutation capabilities and hands off exact payloads rather than claiming unavailable actions.

## Context Recovery

Before the session approaches its context limit, save state and start fresh:

**Before closing:**
1. Update `docs/sprint-N/progress.md` with current status
2. Write or update `docs/sprint-N/done.md` with context-only implementation handoff information
3. Propose any `PROJECT_BRIEF.md` sections 7+8 changes to the Producer

Record exact candidate SHA and live gate evidence on the PR so committing a handoff file cannot invalidate itself. The Producer owns authoritative sprint status and current-state updates through a post-merge docs-only closeout PR.

**Cold start prompt:**
```
Read PROJECT_BRIEF.md and docs/sprint-N/progress.md.
Continue from where it left off.
```

## Anti-Patterns

See [anti-patterns reference](./references/anti-patterns.md) for the full list. Top 5:

| Don't | Do Instead |
|-------|------------|
| Rewrite shared feature history | Keep the coordinated branch stable and use a regular merge |
| Producer writes code | Producer only plans, merges, files issues |
| Batch "fix everything" commits | One commit per fix with issue reference |
| Vague brainstorm prompts | Name each agent with distinct perspective |
| Keep bugs only in chat | File GitHub Issues (chat context dies) |

## Tips for Better Results

- **"Take your time, do it right"** in prompts → better output than rushing
- **Test the exact PR head before merge** — file issues → dev fixes → re-verify → merge
- **Run team consiliums** before major sprints — each agent reviews the plan from their perspective
- **Save lessons to durable repository files** after every milestone
