# PROJECT_BRIEF.md Template

Copy this template to your project root and fill in every applicable section. **Do not abbreviate sections 12-15** — they define context survival and delivery safety.

---

# PROJECT_BRIEF.md — [Project Name]

> Last updated: [date] | Sprint [N] | Status: [In Progress / Complete]

## 1. Project Overview

[3-4 sentences describing what the project is, who it's for, and the core goal.]

## 2. Concept / Product Description

[Detailed description of the product — user flows, key features, narrative if applicable.]

## 3. Tech Stack

> Bootstrap agent: document only verified project layers. Omit non-applicable rows instead of inventing a UI, service, database, hosting platform, or deployment pipeline.

| Concern | Actual choice | Why / constraints |
|---|---|---|
| Languages and runtimes | [value] | [reason] |
| User-facing surfaces | [value, if any] | [reason] |
| Core/domain or service layer | [value, if any] | [reason] |
| Data and external integrations | [value, if any] | [reason] |
| Build and dependency tooling | [value] | [reason] |
| Tests and quality checks | [value] | [reason] |
| Packaging, runtime, and delivery | [value, if any] | [reason] |

## 4. Architecture

[Draw the actual component, process, package, and external-system boundaries. Show direction of calls or data flow. Omit layers that do not exist.]

```text
[Entry surface or caller]
          │ [protocol or call]
          ▼
[Core component / package] ──► [integration, data store, or runtime dependency]
```

## 5. Key Files Map

| Area | Path | Contents |
|------|------|----------|
| Entry point(s) | `[verified path]` | [startup or public entry] |
| Primary implementation | `[verified path]` | [responsibility] |
| Configuration | `[verified path]` | [non-secret configuration] |
| Tests | `[verified path]` | [test scope] |
| Build / delivery | `[verified path, if any]` | [automation purpose] |
| Sprint docs | `docs/sprint-N/` | Plans, progress, done |

## 6. Team Roles

Keep these default perspectives, but tailor responsibilities to the actual project. Merge or omit non-applicable perspectives; do not invent work to preserve the table.

| Agent | Name | Role |
|-------|------|------|
| Producer | Remy | Plans, coordination, authoritative status, review commissioning, merging |
| Client/Interaction | Nova | User-facing behavior and client-side concerns, when present |
| Core/Service | Sage | Domain logic, services, data, integrations, and security, when present |
| Visual/Experience | Milo | Presentation, interaction quality, accessibility, and polish, when present |
| QA | Ivy | Behavioral testing, evidence, bug filing, and acceptance |
| Product | Kira | User needs, workflows, mechanics, and feature specifications, when needed |
| Delivery | Dash | Build, CI/CD, packaging, deployment, and operations, when needed |

## 7. Sprint Status

> Producer-owned authoritative status. Dev may propose a change in its handoff; only the Producer marks gate or merge completion in the post-merge closeout PR.

| Sprint | Name | Status | Scope |
|--------|------|--------|-------|
| 0 | Architecture | ✅ Done | Tech stack, project structure, design guide |
| 1 | Core Features | 🔨 In Progress | [scope description] |

## 8. Current State (rewrite every sprint)

> Producer-owned authoritative state, updated in a docs-only closeout PR after delivery gates, merge, and smoke from verified evidence.

**What works:**
- [List of working features]

**What doesn't work yet:**
- [Known issues]

**What's next:**
- [Next sprint goals]

## 9. Security Rules

1. Secrets live in environment variables only — never in code or git.
2. Evidence uses redacted or synthetic data; never copy real secrets or end-user identifying information into docs, issues, fixtures, screenshots, or logs.
3. [Verified trust boundaries, validation rules, auth approach, or state that the item is not applicable.]
4. [Project-specific security and privacy rules.]

## 10. How to Run Locally

> Record exact commands confirmed for this repository. Omit absent steps and never invent a package manager, service, or environment file.

```text
Prerequisites: [tools and supported versions]
Setup:         [dependency/bootstrap command, if any]
Configuration: [required variable names and safe example-file step; no values]
Build:         [command, if any]
Run:           [command and expected endpoint/output]
Test:          [commands by test level]
```

## 11. How to Deploy

[Describe the verified artifact, target environment, trigger or command, configuration location, rollback path, and smoke check. If this project is not deployed, state that directly and omit deployment layers.]

## 12. Cross-Chat Handoff Protocol

Before an implementation session finishes, Dev must:

1. Update `docs/sprint-N/progress.md` with task, bug, decision, branch, PR, checks, and links to live gate evidence.
2. Write or update `docs/sprint-N/done.md` as the implementation handoff, including incomplete work and manual setup.
3. Commit those context-only files before the final candidate commit. They must not claim their own SHA.
4. After the final commit is pushed, put the handoff packet on the PR with: owner/from/to, sprint/task, branch, exact commit SHA, PR/issues, checks/evidence, decisions, blockers, and next action.
5. Propose any Sections 7 and 8 changes without claiming final sprint, gate, or merge state.

Exact-SHA independent review and QA acceptance live in PR reviews, comments, or checks before merge. After regular merge and smoke, the Producer opens a docs-only closeout PR from updated `main` to archive QA/gate evidence, update authoritative Sections 7 and 8, and record the application PR and merge SHA. Repository files plus linked PR/issue artifacts—not chat memory—are the durable handoff.

## 13. Bug & Fix Tracking

Bugs are tracked as GitHub Issues on the repo. Single source of truth for all teams.

**For QA:** File bugs with labels (`bug`, `severity:blocker/major/minor`) and include component, exact tested SHA/environment, steps, expected vs actual, and redacted evidence. QA verifies fixes on the updated PR head and records the result; QA does not close the issue.

**For Dev Team:** Check issues before starting. Fix blockers and majors on the same feature branch, reference the issue in commits and the PR, and return the new SHA for affected review and QA checks. Use `Refs #42` before verification. An authorized actor closes the issue after QA records verification; do not imply closure from an unverified commit.

**For Producer or authorized maintainer:** Close an issue only after QA verification is recorded.

**For DevOps:** File infrastructure issues with label `infra`.

**For feature ideas:** add to `docs/ideas-backlog.md`.

## 14. Multi-Repo Setup

Use a separate clone per concurrent team/session to isolate working state and simplify handoffs. Everyone works on a feature or evidence branch and uses PRs; no direct changes to `main`.

**Teams:**
- Producer in a coordination clone (planning, gates, status, and merge)
- Dev Team on `feature/sprint-N`
- QA checks out the PR head or immutable preview; use `feature/qa-N` only for test/docs changes
- Delivery role on `feature/delivery-N` only when needed

**Setup:**
```text
git clone <repo> <folder-name>
cd <folder-name>
git status --short
git fetch --prune origin
git switch --no-track --create <branch-name> origin/main
[run the verified project setup command, if any]
```

If the branch already exists, switch to it and verify its expected upstream and base instead of recreating it. On first push, run `git push --set-upstream origin <branch-name>`. Stop when the worktree is not clean; preserve unknown work and resolve it before branching.

**Branch strategy:** Stable feature branch → PR → independent review → QA on PR head → regular merge to `main`. This coordinated workflow avoids squash, rebase, and force-push because rewritten or collapsed history complicates multi-session handoffs and audit evidence.

## 15. Delivery & Review Gates

The bundled skill's **Delivery Workflow** reference is canonical:

**Plan → Implement → Dev self-review → Independent review gate → QA acceptance on PR head → Fix/re-verify loop → regular merge → post-merge smoke check**

- Dev self-review is required but never counts as independent review.
- The Producer commissions a reviewer who was not an author, using a fresh reviewer/subagent when available or a human/separate independent session otherwise. Self-attestation is not accepted.
- QA tests the exact PR head SHA or immutable preview before merge and records the environment. Post-merge smoke confirms integration; it is not first acceptance.
- Every PR-head change invalidates both SHA-bound gates. Blocker or major findings return to Dev on the same branch; independent review and QA issue fresh evidence for the new head, unless a new head-specific docs-only/trivial exemption is explicitly recorded.
- No merge occurs before independent review and QA acceptance except an explicitly documented docs-only/trivial exemption with reason, risk, and checks.
- Before promising an issue, PR, edit, command, push, or merge mutation, each role detects the required GitHub, edit, terminal, and authentication capability. If unavailable, provide the exact target, payload/instructions, required actor, and expected evidence, then explicitly hand off; never claim it happened.
- Pre-merge exact-SHA evidence lives on the PR. After merge and smoke, a separate docs-only closeout PR archives that evidence and updates Sections 7 and 8; it records an explicit trivial-change exemption.
