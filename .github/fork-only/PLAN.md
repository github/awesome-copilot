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

## Implementation status

**Complete** ✓ — All components deployed and tested.

- [x] Create `.github/fork-only/agents/dev-orchestrator.agent.md`
- [x] Create `.github/fork-only/agents/plan-skeptic.agent.md`
- [x] Create `.github/workflows/fork-sync-watchdog.yml`
- [x] Create `.github/workflows/fork-agent-reviewer.yml`
- [x] Create `.github/workflows/fork-bundle-upstream-pr.yml`
- [x] Walk through fine-grained PAT creation and store as fork secret (`UPSTREAM_PAT`)
- [x] Confirm weekly cadence: **Friday 10:00 AM UTC** (cron: `0 10 * * 5`)
- [x] Add upstream git remote: `git remote add upstream https://github.com/github/awesome-copilot.git`
- [x] Create state tracking files:
  - [x] `.github/fork-only/state/contrib-watch.json` — initialized with current SHAs
  - [x] `.github/fork-only/state/upstream-promotion.json` — initialized with baseline state
- [x] Create `.github/fork-only/README.md` — comprehensive setup, usage, and troubleshooting

## Deployed components

### Workflows (in `.github/workflows/`)

1. **fork-sync-watchdog.yml**
   - Schedule: Weekly, Friday 10:00 AM UTC
   - Actions:
     - Merge `upstream/main` → `fork/main`
     - Diff `CONTRIBUTING.md` and `AGENTS.md` against stored SHAs
     - Alert if changes detected
     - Update state file
   - Permissions: `contents: write`, `pull-requests: write`

2. **fork-agent-reviewer.yml**
   - Trigger: Pull request into `main`
   - Scopes: 
     - `agents/oracle-to-postgres-migration-expert.agent.md`
     - `plugins/oracle-to-postgres-migration-expert/**`
     - `.github/fork-only/agents/**`
   - Checks:
     - Lint: YAML frontmatter, required fields (description, name, model, tools)
     - AI review: domain-specific Oracle-to-Postgres migration safety and accuracy
   - Comment-only, non-blocking advisory feedback
   - Permissions: `pull-requests: write`, `contents: read`

3. **fork-bundle-upstream-pr.yml**
   - Trigger: Manual (`workflow_dispatch`)
   - Optional inputs: PR title, PR description
   - Actions:
     - Identify commits to promotable paths since last promotion
     - Create branch from `upstream/main`
     - Cherry-pick promotable commits
     - Open draft PR against `github/awesome-copilot`/`main`
     - Record promotion state
   - Authentication: Fine-grained PAT (`UPSTREAM_PAT`) for cross-repo auth
   - Permissions: `contents: write`, `pull-requests: write`

### Custom Agents (in `.github/fork-only/agents/`)

1. **dev-orchestrator.agent.md**
   - Five-phase workflow:
     1. Read & grill (challenge requirements)
     2. Plan (concrete implementation strategy)
     3. Skeptical review (dispatch to plan-skeptic)
     4. Implement (after approval via plan-mode gating)
     5. Pre-PR self-review (domain-aware code review)
   - Invoked manually by user in Copilot CLI
   - Model: `claude-sonnet-5`

2. **plan-skeptic.agent.md**
   - Adversarial persona
   - Critiques dev-orchestrator's plans
   - Reports on: assumptions, scope, edge cases, backwards compatibility, simplicity, correctness, testability, user burden
   - Produces severity-ranked Skeptic's Report
   - Model: `claude-sonnet-5`

### State Tracking (in `.github/fork-only/state/`)

1. **contrib-watch.json**
   - Tracks: `CONTRIBUTING.md` and `AGENTS.md` SHAs from upstream
   - Used by: fork-sync-watchdog
   - Updated on every sync run

2. **upstream-promotion.json**
   - Tracks: promotion history (timestamps, commit SHAs, branch names, PR URLs)
   - Used by: fork-bundle-upstream-pr
   - Stores: `lastPromotedSHA` for next bundler run

### Documentation (in `.github/fork-only/`)

1. **README.md**
   - Architecture overview
   - Fine-grained PAT creation step-by-step
   - Workflow usage guide
   - Typical development flow
   - Troubleshooting

2. **PLAN.md** (this file)
   - Design decisions and rationale
   - Platform constraints and workarounds
   - File organization
   - Component descriptions

## Next steps for you

1. **Test the sync watchdog** (optional)
   - Go to Actions → Fork Sync Watchdog
   - Click "Run workflow" to test the merge and state update

2. **Test the PR reviewer** (optional)
   - Create a test PR to fork main touching an agent file
   - Verify lint and AI review comments appear

3. **Create your first issue** in the fork and:
   - Launch dev-orchestrator
   - Grill, plan, get skeptic feedback, approve, implement, review
   - Open PR to fork, merge

4. **Promote to upstream** when ready:
   - Go to Actions → Fork Bundle Upstream PR
   - Click "Run workflow"
   - Review the draft PR in upstream
   - Iterate with maintainers, merge
