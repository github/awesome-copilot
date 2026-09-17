# Fork Automation Plan — Oracle-to-PostgreSQL Migration Expert

> **Fork-only.** Nothing in this document, or anything under `.github/fork-only/` or `.github/workflows/fork-*`, is ever proposed upstream to `github/awesome-copilot`. Only the custom agent (`agents/oracle-to-postgres-migration-expert.agent.md`), its plugin (`plugins/oracle-to-postgres-migration-expert/`), and the skills its manifest references (`skills/*oracle-to-postgres*/`) are promoted.

This file records **design decisions and their rationale**. Operating instructions are in [README.md](README.md).

## Context

- Fork: `PrimedPaul/awesome-copilot` (`isFork: true`, parent `github/awesome-copilot`)
- Default branch on both sides: `main`
- Upstream contribution rules that shape the design (`CONTRIBUTING.md`, `AGENTS.md`):
  - Branch from `main`, PR against `main` (not `staged`)
  - AI-authored PR titles end with `🤖🤖🤖` for fast-track review
  - Run `npm run build` and `bash eng/fix-line-endings.sh` before submitting
  - Plugins carry a semver `version` in `plugin.json`
- The agent already exists upstream (PRs #950, #2284, #2566). Every prior PR touched the agent file, the plugin, several `skills/*oracle-to-postgres*` folders, `docs/README.*.md`, and `.github/plugin/marketplace.json`.

## Platform constraints

- `schedule` and `workflow_dispatch` only fire from the workflow file on the **default branch**. Fork tooling therefore lives on `main`.
- Workflow YAML must be under `.github/workflows/`; fork files coexist with ~40 upstream workflows, distinguished by a `fork-` prefix.
- `GITHUB_TOKEN` is scoped to the repository running the workflow. It cannot open a PR against upstream, and PRs it creates do **not** trigger `pull_request` workflows. Both need a user PAT.
- Fine-grained PATs can only be granted on repositories you own. Opening a PR against `github/awesome-copilot` requires a **classic** PAT; `public_repo` is the minimum scope.
- Any push that creates or updates a file under `.github/workflows/` is rejected unless the token has the `workflow` scope — and `GITHUB_TOKEN` can never do it. Mirroring `upstream/main` almost always touches workflow files, so the PAT must also carry `workflow`.
- gh-aw's `create-pull-request` safe output bundles *agent commits*. It is the wrong tool for mirroring `upstream/main`, so the sync is a deterministic job and the agent only comments.
- The repo's own live gh-aw workflows are `.github/workflows/<name>.md` + `.lock.yml`; the top-level `workflows/` is the contribution catalog. Fork gh-aw sources follow the former.

## Decisions

| # | Decision | Alternatives rejected | Why |
|---|---|---|---|
| D1 | **Automation proposes, human merges.** Watchdog and bundler open PRs; nothing pushes to `main`. | Direct push with `contents: write` | Ruleset on `main` requires PRs; keeps an audit trail; matches the least-privilege pattern. |
| D2 | **Stateless.** Unmerged upstream = `origin/main..upstream/main`. Unpromoted delta = `git diff upstream/main origin/main -- <paths>`. | JSON state files with "last seen"/"last promoted" SHAs | A second source of truth that could drift; the original draft's `lastPromotedSHA` pointed at a branch off upstream, making the next range nonsensical. |
| D3 | **Single squashed diff** onto `upstream/main`, `git apply --index`, fail hard. | Cherry-picking fork commits, `--abort` and continue on conflict | Cherry-pick silently shipped partial change sets; upstream squash-merges anyway; the diff from `upstream/main` always applies. |
| D4 | **Promotion scope = `plugin.json`'s `skills` array + agent file + plugin dir**, computed at run time. | Hard-coded two paths | Prior upstream PRs touched eight skill folders; hard-coding drifts when skills are added. |
| D5 | **Bundler runs `npm run build` + `fix-line-endings.sh`** and commits the output. | Leave to the human | Upstream CI (`validate-readme`, `validate-plugins`) fails otherwise; CONTRIBUTING requires it. |
| D6 | **Version bump enforced twice**: `version_check` job on fork PRs (early signal) and a hard fail in the bundler (last line of defence). Orchestrator checklist reminds the human. | Trust the developer | Cheap, deterministic, catches the most common promotion rejection. |
| D7 | **Watchdog and reviewer are gh-aw**; bundler is plain YAML. | All plain YAML / all gh-aw | gh-aw adds value where an LLM summarises or reviews; the bundler is pure git plumbing. gh-aw also pins actions and containers by SHA/digest and sandboxes the agent. |
| D8 | **Dropped the custom lint.** | Keep a frontmatter grep | Upstream's `skill-check` (vally) already lints `agents/**` and `plugins/**` on every PR and checks more than the custom script did. |
| D9 | **Reviewer may `REQUEST_CHANGES` but never `APPROVE`**; `supersede-older-reviews: true`. | `COMMENT` only | A blocking review for factual domain errors is useful signal; approval must stay human. |
| D10 | **SHA-pin every `uses:`** and enable *Require actions to be pinned to a full-length commit SHA*. | Mutable tags | Supply-chain: tags can be retargeted (tj-actions/changed-files, March 2025). gh-aw lock files and upstream already pin. Dependabot (`github-actions` ecosystem, inherited from upstream) keeps pins fresh. |
| D11 | **Inputs and event data reach `run:` via `env:`**, never `${{ }}` interpolation inside bash. | Inline `${{ inputs.title }}` | Script-injection vector: a PR title or input containing `"; curl …` would execute. |
| D12 | **`concurrency:` groups on all three** (watchdog and bundler non-cancelling; reviewer cancels superseded runs per PR). | None | Manual + scheduled runs racing on the same branch; stale reviews on rapid pushes. |
| D13 | **Job-level `permissions:`** with top-level `permissions: {}` in the bundler; gh-aw agent jobs get `contents: read` only, write scopes live in the deterministic jobs. | Workflow-wide `write` | Least privilege; the PAT and write tokens are never in the agent's environment. |
| D14 | **Sync PRs merged with a merge commit**; linear-history rule removed. | Squash/rebase sync | Squash destroys shared ancestry and causes conflicts on every subsequent sync. |
| D15 | **Fork `main` ruleset: PR required, 0 approvals, no bypass.** | 1 approval (original) | Solo maintainer cannot approve own PR; 1 approval made `main` un-mergeable. |
| D16 | **`dry_run` input on the bundler.** | None | Lets the maintainer inspect the promotion diff before touching upstream. |
| D17 | **Idempotent PR handling**: watchdog reuses an open sync PR; bundler force-pushes a fixed promotion branch and reuses its open upstream PR. | New branch/PR per run | Avoids PR spam; makes re-runs safe. |
| D18 | **PAT carries `public_repo` + `workflow`**; the watchdog's push step detects the missing-scope refusal and emits a targeted `::error::`. | Pre-flight scope probe via `X-OAuth-Scopes` header; filtering workflow files out of the sync | First run failed on exactly this. A pre-flight only works for classic PATs and adds a request per run; filtering files would make the mirror branch diverge from `upstream/main`, breaking D2/D14. |
| D19 | **Watchdog recommends Keep / Disable / Integrate per new upstream workflow**, using the README keep-list policy embedded in its prompt, and flags modified workflows. It only advises; disabling stays a manual UI action. | Bare list of new files (original); auto-disable via the Actions REST API | A bare list pushed the triage work onto the maintainer every week. Auto-disable needs `actions: write` in the agent's environment and would act on an LLM judgement without review — violates D1/D13. |

## Not done / deferred

- **Auto-merge of sync PRs** (`gh pr merge --auto`) — wait until several cycles have been observed by hand.
- **Disabling upstream workflows** in the fork is a manual, per-workflow UI action; documented in README. The watchdog recommends a verdict per new file (D19) but does not act on it.
- **`require_extra_approval_for_unattributed_changes`** in the ruleset — recommended off; automation commits use the `github-actions[bot]` identity.
- **gh-aw fuzzy schedule** (`weekly on friday`) — compiler suggests it to spread load; kept the explicit cron per maintainer preference.

## File organisation

```
.github/
  workflows/
    fork-sync-watchdog.md            # gh-aw source
    fork-sync-watchdog.lock.yml      # compiled — commit both
    fork-agent-reviewer.md           # gh-aw source
    fork-agent-reviewer.lock.yml     # compiled — commit both
    fork-bundle-upstream-pr.yml      # plain YAML
  fork-only/
    README.md                        # how to operate
    PLAN.md                          # this file — why it is built this way
    agents/
      dev-orchestrator.agent.md
      plan-skeptic.agent.md
```

## Verification log

| Date | Check | Result |
|---|---|---|
| 2026-09-17 | `npm run build`, `npm run plugin:validate` with fork-only files present | Pass; no leakage into README/marketplace/docs |
| 2026-09-17 | `gh aw compile --validate` both gh-aw workflows | Pass (expected "new restricted secret" note for `FORK_AUTOMATION_PAT`) |
| 2026-09-17 | `actionlint` on `fork-bundle-upstream-pr.yml` | Pass (lock-file findings are actionlint schema lag on `copilot-requests` / `concurrency.queue`, identical in upstream lock files) |
| 2026-09-17 | Repo settings via REST: Actions enabled, GitHub-owned actions allowed, SHA pinning required, ruleset shape | Confirmed |
| 2026-09-17 | Watchdog first run | **Failed** at `Push upstream mirror branch`: PAT lacked `workflow` scope (D18). Scope added; re-run pending |
| — | First real run of each workflow | **Pending** — see README first-run checklist |
