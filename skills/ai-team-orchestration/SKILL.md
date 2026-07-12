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
| Producer | **Remy** | Sprint planning, coordination, risk-based gate selection, merging PRs | Scope control, status, handoffs, issue triage |
| Product Designer | **Kira** | UX, mechanics, user experience | Fun factor, user flows, feature design |
| Visual/Experience Director | **Milo** | Presentation, interaction, visual identity | Design consistency, polish, accessibility |
| Client/Interaction Engineer | **Nova** | User-facing and client-side behavior | State, components, interaction logic |
| Core/Service Engineer | **Sage** | Domain logic, services, data, security | Contracts, integrations, infrastructure |
| DevOps Engineer | **Dash** | CI/CD, packaging, deployment, operations | Pipelines, environments, observability |
| QA Engineer | **Ivy** | Optional behavioral tests, automation, exploratory testing | Evidence, bug filing, acceptance when selected |

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
│          │ │frozen   /│ │planned │
│ <working-│ │candidate/│ │branch  │
│ branch>  │ │immutable│ └────────┘
│          │ │preview  │
└──────────┘
```

Dev works on the plan's `<working-branch>`. QA normally evaluates the frozen Candidate ID or its immutable preview and creates a separate branch only for test/evidence commits.

Each concurrent session works in a **separate VS Code window** with its own clone. Only roles that write files need their own branch; QA normally checks out the frozen candidate unless it creates test/evidence commits:
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
15. **Delivery Checks & Gates** — role ownership, evidence, and capability fallback

### 2. Run a Brainstorm

Use the [brainstorm format](./references/brainstorm-format.md) to produce real debate. Key: name each agent explicitly with distinct personality and perspective. Require at least 2 genuine disagreements to prevent groupthink.

### 3. Create Sprint Plans

Use the [sprint plan template](./references/sprint-plan-template.md). Every sprint gets:
- `docs/sprint-N/plan.md` — prioritized tasks, success criteria
- `docs/sprint-N/progress.md` — live tracker, enables recovery
- `docs/sprint-N/done.md` — pre-freeze implementation handoff

### 4. Deliver Through Selected PR Gates

The [Delivery Workflow](./references/delivery-workflow.md) is canonical:

**Plan → Implement and Dev-check → Freeze candidate → Selected gates → Fix/re-freeze loop → Producer/CEO merge decision → regular merge → Selected post-merge checks → Authoritative status update**

The CEO/maintainer sets acceptable risk; the Producer records proportionate checks and gates before implementation. Every code/config candidate has at least one concrete check. High-risk surfaces receive applicable security-focused evidence unless the CEO/maintainer explicitly accepts the risk. Dev captures the tested commit ID before push, freezes the application branch at push, and posts a Candidate Packet only after the observed PR head matches. The Producer owns a live Delivery Ledger on the PR. A blocking gate reports only to the Producer; Dev acts only after a Producer-authored Branch Reopen Packet. The Producer verifies every required evidence binding, then uses an atomic expected-head merge guard or protected queue that revalidates the Candidate ID; a separate check followed by an unguarded merge is not sufficient.

Evidence may be bound automatically through PR reviews/checks, Git ancestry on a separate evidence branch, or an immutable build/preview; manually copying a commit hash is required only when no such association exists. Every role detects its available mutation capabilities and hands off exact payloads rather than claiming unavailable actions.

## Context Recovery

Before the session approaches its context limit, save state and start fresh. If Dev is open or reopened, commit the implementation recovery files before freezing. If the candidate is already frozen, do not edit the application branch; update the live PR artifact owned by the current role instead.

**Before closing:**
1. While Dev may push, update `docs/sprint-N/progress.md` with implementation status
2. Before candidate freeze, write or update `docs/sprint-N/done.md` with implementation handoff information
3. Propose any `PROJECT_BRIEF.md` sections 7+8 changes to the Producer

Keep candidate identity and live gate evidence in durable PR/check metadata, Git ancestry, immutable artifacts, or explicit commit IDs as appropriate. Do not change the frozen application branch merely to append a report. The Producer owns authoritative sprint status and chooses the project's normal documentation workflow; a separate docs-only archive PR is optional.

**Cold start prompt:**
```
Read PROJECT_BRIEF.md and docs/sprint-N/progress.md.
If the candidate is frozen, also read the Producer-owned Delivery Ledger on the PR. Continue only from its current owner and next action.
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
- **Freeze the candidate during selected gates** — file issues → Producer reopens for fixes → re-freeze affected evidence → merge
- **Run team consiliums** before major sprints — each agent reviews the plan from their perspective
- **Save lessons to durable repository files** after every milestone
