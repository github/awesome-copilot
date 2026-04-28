---
name: ai-team-orchestration
description: 'Bootstrap and run a multi-agent AI development team. Use when: starting a new software project with AI agents, setting up parallel dev/QA teams, creating sprint plans, writing brainstorm prompts with distinct agent voices, recovering a project workflow, or planning sprints.'
---

# AI Team Orchestration

## When to Use
- Starting a new project that needs planning, development, testing, and deployment
- Setting up parallel AI agent teams (dev, QA, DevOps)
- Writing brainstorm prompts that produce real debate (not generic output)
- Creating sprint plans with cross-chat context survival
- Recovering from context overflow mid-sprint

## Team Roles

| Agent | Name | Role | Focus |
|-------|------|------|-------|
| Producer | **Remy** | Sprint planning, coordination, merging PRs | Scope control, handoffs, issue triage |
| Product Designer | **Kira** | UX, mechanics, user experience | Fun factor, user flows, feature design |
| Visual/Art Director | **Milo** | CSS, animations, visual identity | Design system, polish, accessibility |
| Frontend Engineer | **Nova** | UI framework, state management, components | React/Vue/Svelte, client-side logic |
| Backend Engineer | **Sage** | API, database, auth, security | Server-side logic, infrastructure |
| DevOps Engineer | **Dash** | CI/CD, cloud deployment, pipelines | GitHub Actions, Azure/AWS/GCP |
| QA Engineer | **Ivy** | E2E tests, automation, playtesting | Playwright/Cypress, bug filing, sign-off |

Customize names and roles for your project. Not every project needs all roles.

## Chat Architecture

The human (CEO) is the message bus between parallel chats:

```
┌────────────────────────────────────────┐
│  @ai-team-producer — Plans, merges     │
│  NEVER writes code                     │
└────────────────┬───────────────────────┘
                 │ Human carries messages
      ┌──────────┼──────────┐
      ▼          ▼          ▼
┌──────────┐ ┌────────┐ ┌────────┐
│@ai-team  │ │@ai-team│ │DevOps  │
│-dev      │ │-qa     │ │(on     │
│          │ │        │ │demand) │
│ Nova     │ │ Ivy    │ │        │
│ Sage     │ │        │ │        │
│ Milo     │ │        │ │        │
│          │ │feature/│ │feature/│
│ feature/ │ │qa-N    │ │devops-N│
│ sprint-N │ └────────┘ └────────┘
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

The single source of truth across all chats. See the [project brief template](./references/project-brief-template.md).

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

### 2. Run a Brainstorm

See the [brainstorm format](./references/brainstorm-format.md). Key: name each agent explicitly with distinct personality and perspective. Require at least 2 genuine disagreements to prevent groupthink.

### 3. Create Sprint Plans

See the [sprint plan template](./references/sprint-plan-template.md). Every sprint gets:
- `docs/sprint-N/plan.md` — prioritized tasks, success criteria
- `docs/sprint-N/progress.md` — live tracker, enables recovery
- `docs/sprint-N/done.md` — handoff doc written at sprint end

### 4. Execute Sprints

```
Read PROJECT_BRIEF.md, then read docs/sprint-N/plan.md. Execute Sprint N.

First: git pull origin main && git checkout -b feature/sprint-N

Close GitHub Issues in commits: "fix: description (Fixes #NN)"
Update docs/sprint-N/progress.md after each phase.
When done, push and create PR: git push origin feature/sprint-N
Follow Sections 12-14 of PROJECT_BRIEF.md.
```

### 5. QA Sign-off

After dev merges, QA does a full playthrough:
```
Read PROJECT_BRIEF.md. You are Ivy (QA).
Sprint N is merged to main. Do full playthrough.
File bugs as GitHub Issues. Write docs/qa/sprint-N-signoff.md.
```

## Context Recovery

When a chat gets long (>100 messages), save state and start fresh:

**Before closing:**
1. Update `docs/sprint-N/progress.md` with current status
2. Update `PROJECT_BRIEF.md` sections 7+8
3. Write `docs/sprint-N/done.md`

**Cold start prompt:**
```
Read PROJECT_BRIEF.md and docs/sprint-N/progress.md.
Continue from where it left off.
```

## Anti-Patterns

See [anti-patterns reference](./references/anti-patterns.md) for the full list. Top 5:

| Don't | Do Instead |
|-------|------------|
| Rebase feature branches | Merge (rebase loses commits) |
| Producer writes code | Producer only plans, merges, files issues |
| Batch "fix everything" commits | One commit per fix with issue reference |
| Vague brainstorm prompts | Name each agent with distinct perspective |
| Keep bugs only in chat | File GitHub Issues (chat context dies) |

## Tips for Better Results

- **"Take your time, do it right"** in prompts produces better output than rushing
- **Test before merge** — you playtest, file issues, dev fixes, then merge
- **Run team consiliums** before major sprints — each agent reviews the plan from their perspective
- **Save lessons to memory** after every milestone
