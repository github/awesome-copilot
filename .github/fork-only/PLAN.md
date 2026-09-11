# Fork Automation Plan — Oracle-to-PostgreSQL Migration Expert

> **Fork-only.** Nothing in this document, or anything it describes under
> `.github/fork-only/` or with a `fork-` prefix, is ever proposed upstream to
> `github/awesome-copilot`. Only changes to the custom agent itself
> (`agents/oracle-to-postgres-migration-expert.agent.md` and its companion
> `plugins/oracle-to-postgres-migration-expert/` content) get bundled into an
> upstream PR.

## Context

- Fork: `PrimedPaul/awesome-copilot` (confirmed via `gh repo view` — `isFork: true`)
- Upstream (parent): `github/awesome-copilot`
- Default branch on both sides: `main`
- Upstream contribution rules (`CONTRIBUTING.md`):
  - Branches must be created from `main`, not `staged`.
  - PRs must target upstream `main`.
  - AI-authored PR titles should end with `🤖🤖🤖` to fast-track review.
  - Run `npm run build` before submitting so README/marketplace stay in sync.

## Platform constraints that shaped this plan

- `schedule` and `workflow_dispatch` (and similar events) **only** trigger using
  the workflow file version present on the repo's **default branch**. There is
  no way around this — confirmed against GitHub's own docs. This is why fork
  tooling must live on `main` rather than a separate branch.
- `pull_request`-triggered workflows are not restricted to the default branch,
  but since our PR-gate reviewer needs to run on *every* PR into `main` anyway,
  it lives there too.
- GitHub Actions only discovers workflow YAML under `.github/workflows/` — that
  path can't be relocated. Fork-only workflow files therefore coexist with this
  repo's ~42 upstream workflow files in that same directory, distinguished only
  by a `fork-` naming prefix.
- `GITHUB_TOKEN` is scoped to the repo the workflow runs in; it cannot open or
  update a PR against a different repository (upstream). Opening the upstream
  PR automatically requires a fine-grained PAT belonging to the user's own
  GitHub identity.

## File organization

```
.github/
  workflows/
    fork-sync-watchdog.yml          # weekly: sync + contribution-instructions check
    fork-bundle-upstream-pr.yml     # on-demand: assemble + open/update upstream PR
    fork-agent-reviewer.yml         # pull_request: lint + AI review of agent changes
    ...                            # (existing upstream workflows, untouched)
  fork-only/
    PLAN.md                         # this file
    agents/
      dev-orchestrator.agent.md     # drives issue -> plan -> implement -> review
      plan-skeptic.agent.md         # adversarial reviewer of the orchestrator's plan
    state/
      contrib-watch.json            # last-seen SHAs for CONTRIBUTING.md / AGENTS.md
      upstream-promotion.json       # last-promoted commit/state for bundling
    scripts/
      (helper scripts for sync / bundling, as needed)
```

(gh-aw workflow *sources*, if used instead of hand-written YAML, follow this
repo's existing convention of living under top-level `workflows/` and
compiling to `.github/workflows/*.lock.yml` — in that case use
`workflows/fork-*.md` for the sources.)

## 1. Fork topology & sync

- `main` stays the default branch and permanently carries both the mirrored
  upstream content and the fork-only tooling above.
- `fork-sync-watchdog` runs weekly (`schedule`):
  1. Fetches `github/awesome-copilot` `main`.
  2. Merges it into the fork's `main` and pushes (should always be a clean
     merge since fork-only files don't overlap with upstream paths). If a
     conflict ever occurs, open an issue instead of failing silently.
  3. Diffs `CONTRIBUTING.md` and `AGENTS.md` against the last-seen SHAs stored
     in `.github/fork-only/state/contrib-watch.json`.
  4. If either changed, opens a GitHub issue flagging it — a signal the
     contribution/automation strategy may need revisiting.

## 2. Custom-agent development workflow

- You file a GitHub issue describing the feature/change for the agent.
- You invoke the fork-only `dev-orchestrator` agent explicitly (not the
  session default) in an interactive Copilot CLI session:
  1. Reads the issue.
  2. Grills/plans using the `grilling` skill.
  3. Dispatches the `plan-skeptic` persona as a sub-agent to critique the plan
     before it's presented to you.
  4. Presents the plan for your approval via native plan-mode gating.
  5. Once approved, implements the change.
  6. Dispatches a domain-aware code-review sub-agent (same Oracle/Postgres
     criteria as the PR-gate reviewer, see below) as a pre-PR self-check.
- You are the sole approver/merger of the resulting PR into the fork's `main`.

## 3. PR-gate reviewer (`fork-agent-reviewer`)

- Trigger: `pull_request` into fork `main`, path-scoped strictly to the
  agent's files (`agents/oracle-to-postgres-migration-expert.agent.md`,
  `plugins/oracle-to-postgres-migration-expert/**`).
- Deterministic lint (can be a required/blocking check): front matter
  completeness (`description`, `name`, `model`, `tools`), file naming, and the
  repo's own "Agent file guide" checklist.
- AI review (comment-only, non-blocking): imports the existing
  `skills/ai-prompt-engineering-safety-review` skill for structural/safety/bias
  diligence, layered with bespoke Oracle-to-PostgreSQL domain-accuracy checks.
  Bounded with a timeout since domain review is more expensive.
- Uses gh-aw's `submit-pull-request-review` with
  `allowed-events: [COMMENT, REQUEST_CHANGES]` (the default `GITHUB_TOKEN` can
  never `APPROVE`).

## 4. Upstream promotion (`fork-bundle-upstream-pr`)

- Trigger: `workflow_dispatch` only, run by you when ready.
- Assembles every merged-but-not-yet-promoted change to the agent's files
  since the last promotion (tracked in
  `.github/fork-only/state/upstream-promotion.json`), strictly scoped to those
  paths.
- Builds a clean branch containing only that diff, opens or updates a PR
  against `github/awesome-copilot` `main`.
- PR title includes the `🤖🤖🤖` fast-track marker per `CONTRIBUTING.md`.
- Authenticates with a fine-grained PAT (repo-scoped to `github/awesome-copilot`,
  `pull requests: write` + `contents: write` on your fork) stored as a secret —
  setup instructions to follow during implementation.
- You alone decide when to mark the upstream PR "Ready for review."

## Open implementation tasks

- [ ] Create `.github/fork-only/agents/dev-orchestrator.agent.md`
- [ ] Create `.github/fork-only/agents/plan-skeptic.agent.md`
- [ ] Create `.github/workflows/fork-sync-watchdog.yml`
- [ ] Create `.github/workflows/fork-agent-reviewer.yml`
- [ ] Create `.github/workflows/fork-bundle-upstream-pr.yml`
- [ ] Walk through fine-grained PAT creation and store as a fork secret
- [ ] Decide exact weekly cadence (day/time) for `fork-sync-watchdog`
- [ ] Add an `upstream` git remote locally (optional convenience)
