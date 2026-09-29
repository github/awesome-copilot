# Canvas review evidence, safe auto-merge, and review metrics

This guide covers phase 3 ("safe acceleration") of [#4184](https://github.com/github/awesome-copilot/issues/4184):

1. [Canvas review evidence](#canvas-review-evidence): the `canvas-smoke-test` check.
2. [Safe auto-merge](#safe-auto-merge): `.github/auto-merge.yml` and `.github/workflows/auto-merge.yml`.
3. [Weekly operating metrics](#weekly-operating-metrics): `.github/review-metrics.yml` and `.github/workflows/review-metrics.yml`.
4. [Portability to MOS3](#portability-to-mos3).

Phase 1 owns reviewer routing (CODEOWNERS, `.github/review-routing.yml`, reviewer labels). Phase 2 owns the `submission-gate` check, `merge-risk:*` tiers, and state labels. This phase consumes those signals and falls back gracefully when they do not exist yet.

## Canvas review evidence

### What runs

`.github/workflows/validate-canvas-extensions.yml` runs on every PR to `main`. Its `canvas-smoke-test` job always reports a result, so `submission-gate` and rulesets can depend on it:

- **Skipped (success)** when no `extensions/**` path or extension-bearing `plugins/**` path changed.
- **Pass (removal accepted)** when an extension directory and its plugin were both deleted. Deleting only `extension.mjs`, or leaving a plugin that still references or was the direct plugin for a deleted extension, fails.
- **Pass or fail** otherwise, from `eng/canvas-smoke-test.mjs`.

For each affected extension, the checker:

| Area | Checks |
|---|---|
| Module graph | Parses `extension.mjs` and every reachable local module **without executing it** (`vm.SourceTextModule` / `vm.compileFunction`). Reachability follows static imports, literal dynamic `import()` calls, and literal CommonJS `require()` calls. Every reachable reference must resolve to a file inside the extension, a Node.js built-in, the host-provided `@github/copilot-sdk`, or a runtime dependency (`dependencies`, `optionalDependencies`, `peerDependencies`). Remote (`http:`/`https:`), absolute, `..`, missing, `devDependencies`-only, and undeclared references fail. Modules not reachable from `extension.mjs` (often browser assets for the canvas webview) produce warnings instead. |
| Files | Missing referenced files, unsafe paths (`..`, absolute paths, `file:` URLs), symlinks, committed `node_modules`, native binaries (ELF, PE, Mach-O, `.node`, `.dll`, `.so`, WebAssembly), executable git modes, and files over 5 MB fail. Shell, batch, PowerShell, Python, Ruby, and Perl scripts, shebang files, and unrecognized binaries are reported as warnings for the reviewer. |
| Preview | `assets/preview.png` must exist, decode as a real PNG (signature, chunk CRCs, `IHDR`, palette, `IEND`, inflated image data and filter bytes), be at most 5 MB, decode to at most 256 MiB of image data (checked before decompression), and meet the minimum dimensions. |
| Plugin | Materializes the plugin with `eng/materialize-plugins.mjs` in a temporary copy, validates the served `plugin.json` against the Agent Plugins schema, and confirms `com.github.copilot/extensions/<id>/extension.mjs` exists. |
| Install | Installs the materialized plugin with the GitHub Copilot CLI from an ephemeral local marketplace, in an isolated `COPILOT_HOME` with all tokens removed, and verifies it with `copilot plugin list --json`. CI uses `--install require`. |
| Capabilities | Summarizes what an extension uses (for example filesystem, child processes, network, `process.env`, dynamic code) so reviewers can compare it with the stated purpose. |

Preview minimum dimensions default to **400 × 160 px**. Every existing preview meets this; the smallest are 475 × 440, 720 × 165, 544 × 306, and 657 × 270. Change the minimum with the repository variables `CANVAS_PREVIEW_MIN_WIDTH` and `CANVAS_PREVIEW_MIN_HEIGHT`, or with `--min-preview-width` and `--min-preview-height` locally.

### Review artifact

The job writes a concise report to the job summary and uploads the `canvas-smoke-test-results` artifact (7-day retention) with `report.md`, `results.json`, and the preview images. The report includes plugin and extension metadata, changed files, capabilities, the preview, and every validation and smoke-test result.

`.github/workflows/canvas-smoke-test-comment.yml` follows the repository's reader/writer split. The reader runs untrusted PR content with a read-only token and no secrets. The writer runs from `main` on `workflow_run` and binds the artifact to the triggering run before writing: the PR must target this repository, its head repository, branch, and SHA must match the run, and it must appear in `workflow_run.pull_requests` or be the only open PR with that head. It also neutralizes `@` mentions, and upserts one PR comment marked `<!-- canvas-smoke-test -->`. It does not comment on skipped PRs that never had a report.

### Running locally

```bash
node eng/canvas-smoke-test.mjs --all --install never          # every extension, no CLI install
node eng/canvas-smoke-test.mjs --changed-files changed.txt   # only what a diff touches
node --test eng/canvas-smoke-test.test.mjs
```

Exit codes: `0` pass or skipped, `1` contribution problems, `2` infrastructure error.

## Safe auto-merge

### Policy

`.github/workflows/auto-merge.yml` arms GitHub auto-merge (`enablePullRequestAutoMerge`, squash by default) only when **all** of these hold:

| Condition | Source |
|---|---|
| PR is open, not a draft, and targets `main` | PR metadata |
| Every `required_checks` entry (default `submission-gate`) succeeded on the head SHA, published by its `trusted_checks` source when one is configured | Check runs (with `externalId`) and commit statuses |
| Every `required_labels` entry (default `merge-risk:low`) is present | Phase 2 risk tier |
| No `blocking_labels` entry is present | Configurable list |
| At least `min_approvals` approvals from users with write access, excluding the author and bots, and no outstanding "changes requested" | Latest reviews and review decision |
| All review threads are resolved | Review threads |
| The branch contains the latest `main` commit and has no conflicts | Compare API and merge state |

The PR must also match an **eligibility rule** (the initial allowlist):

- **Generated output**: the author is a configured automation account (`github-actions`, `allcontributors`) and every changed file matches the generated paths (`README.md`, `docs/README.*.md`, `.all-contributorsrc`, `.github/plugin/marketplace.json`, `plugins/external.json`).
- **Established resource owner**: the author only modifies (no additions, deletions, or renames) files of existing resources they own, has at least one merged PR, and touches nothing under `excluded_paths` (`plugins/external.json`, `.github/**`, `eng/**`, `CODEOWNERS`). Ownership comes from a CODEOWNERS rule for the path (the catch-all `*` rule does not count) or from the resource's recorded author. CODEOWNERS users match by login; CODEOWNERS teams match when the author is an active team member, which needs a token that can read organization team membership (`members: read`), and any lookup failure counts as "not an owner". Recorded authors are read from the `main` checkout, so a PR cannot add its own author: front matter `author`/`authors` entries with a `github` login, a github.com URL, or an `@login` (agents, instructions, `skills/*/SKILL.md`, `hooks/*/README.md`); `plugin.json` `author.url` or `author.name` for plugins and extensions; and the author of the oldest commit on `main` that touches the resource. Regenerated files (`README.md`, `docs/README.*.md`, `.github/plugin/marketplace.json`) may accompany the update.

### Disarming

Every evaluation can also disarm auto-merge:

- Auto-merge armed by the automation (tracked with the `auto-merge-armed` label) is disarmed as soon as any condition or eligibility rule stops holding, for example after a new push with pending checks, a new blocking label, or a dismissed approval.
- Auto-merge that a maintainer enabled manually is left alone, except that a blocking label disarms it when `disarm_manual_on_blocking_label` is `true`.

When auto-merge is armed or disarmed, one status comment (`<!-- auto-merge-status -->`) is created or updated with the condition table. Add `do-not-merge` at any time to stop auto-merge.

### Configuration

`.github/auto-merge.yml` holds the whole policy. It ships with `enabled: false`: the workflow still evaluates PRs and writes a dry-run table to the job summary, but it never arms, disarms, labels, or comments. Set it to `true` after phase 2's `submission-gate` check and `merge-risk:*` labels are live.

| Key | Default | Meaning |
|---|---|---|
| `enabled` | `false` | Must be exactly `true` to act. |
| `base_branch` | `main` | Only PRs to this branch are considered. |
| `merge_method` | `squash` | `squash`, `merge`, or `rebase`. |
| `required_checks` | `[submission-gate]` | Check runs or statuses that must succeed on the head SHA. |
| `trusted_checks` | `submission-gate: {external_id: submission-gate-writer}` | Pins a required check to its publisher. Phase 2's trusted `Submission Gate Writer` publishes `submission-gate` through the Checks API with this `external_id`. If any other check run or status with that name is on the head SHA, arming is blocked, because a PR's own `pull_request` workflow could otherwise publish a passing job with the same name. Set it to `{}` to disable. |
| `required_labels` | `[merge-risk:low]` | All must be present. |
| `blocking_labels` | `do-not-merge`, `requires-submitter-fixes`, `awaiting-automation`, `merge-risk:medium`, `merge-risk:high`, `needs-discussion`, `rejected` | Any one blocks arming. |
| `min_approvals` | `1` | Approvals from write-access, non-author, non-bot reviewers. |
| `require_resolved_threads` | `true` | All review threads resolved. |
| `require_up_to_date` | `true` | Head contains the latest base commit. |
| `armed_label` | `auto-merge-armed` | Records that the automation armed auto-merge. |
| `disarm_manual_on_blocking_label` | `true` | Blocking labels also disarm manually enabled auto-merge. |
| `comment` | `true` | Post a status comment when arming or disarming. |
| `eligibility.generated_output` | See the file | Automation authors and generated paths. |
| `eligibility.resource_owner` | See the file | Owner sources, resource roots, generated and excluded paths, `min_merged_prs`. |

### Triggers and security

The workflow runs on `pull_request_target` (open, push, draft, and label changes), on completion of the Phase 2 `Submission Gate Writer` workflow (when `merge-risk:*` and state labels are final; this triggers a sweep because the event does not identify a PR), every 30 minutes as a sweep, and on `workflow_dispatch` (optional PR numbers and dry run). The sweep picks up approvals, resolved threads, base-branch updates, and label changes made by other workflows with `GITHUB_TOKEN`, which do not trigger workflows. Review events are intentionally not used because they run the PR's copy of the workflow, and `check_run` is not used because GitHub does not trigger workflows for check runs created by GitHub Actions. Every evaluation re-checks the latest `submission-gate` result on the head SHA, so a writer run that fires before the gate finishes cannot arm anything. The gate check stays `in_progress` while other checks are pending and only succeeds in the `approved` state.

The workflow checks out only the base branch, never PR code, and evaluates everything from API metadata. It uses the `AUTO_MERGE_TOKEN` secret when present and `GITHUB_TOKEN` otherwise. Merges made with `GITHUB_TOKEN` do not trigger other workflows (for example `publish.yml` on push to `main`), so a GitHub App or fine-grained token with contents, pull requests, and issues write access is recommended. GitHub refuses to arm auto-merge on a PR that is already mergeable ("clean status"); only in that case does the script merge directly at the evaluated head SHA, as `gh pr merge --auto` does. Any other refusal, such as "unstable status" (required checks pending or failing), is reported as an error and nothing is merged.

### Running locally

Without `GITHUB_TOKEN`, the scripts call the API through your authenticated `gh` CLI. Dry runs are read-only:

```bash
node eng/auto-merge.mjs --repo github/awesome-copilot --pr 1234 --dry-run
node eng/auto-merge.mjs --repo github/awesome-copilot --all --dry-run
node --test eng/auto-merge.test.mjs
```

## Weekly operating metrics

`.github/workflows/review-metrics.yml` runs every Monday at 14:00 UTC and on demand. `eng/review-metrics.mjs` collects read-only data and then:

- writes the report to the job summary and uploads the `review-metrics` artifact (`metrics.json` and `report.md`, 90-day retention);
- updates the body of the tracking issue labeled `review-metrics`, creating and pinning it the first time;
- adds the week's report to that issue as a comment so trends stay visible.

### Definitions

All times are UTC. The window is the previous `window_days` (default 7) days. PRs authored by bots are excluded from contribution counts and review timings. A **maintainer review** is a submitted review from a user with write access who is not the PR author and not a bot.

| Metric | Definition |
|---|---|
| Open contributions by state | Open, non-draft contribution PRs to `main`, grouped by phase 2 state label; PRs without one are `unlabeled`. Open `external-plugin` issues are grouped by their state labels. |
| Open contributions by risk tier | The same PRs grouped by `merge-risk:*`; PRs without one are `unclassified`. |
| Time to first review | For PRs whose first maintainer review landed in the window: first review time minus the later of creation and the last ready-for-review event. Reviews submitted before that start (for example before a PR went back to draft) are ignored. Median and p90 (linear interpolation), in wall-clock hours or days. |
| Time to merge | For PRs merged in the window: merge time minus creation time. Median and p90. |
| Reviews per maintainer | Maintainer reviews submitted in the window, and the distinct PRs each maintainer reviewed. |
| Reviewer concentration | Based on distinct PRs reviewed per maintainer. **Top-reviewer share** is the busiest maintainer's share. **HHI** (Herfindahl-Hirschman index) is the sum of squared shares × 10,000: 10,000 means one reviewer did everything, and above 2,500 is highly concentrated. **Effective reviewers** is 1 divided by the unscaled HHI. |
| Items past 2 and 4 business days | Items waiting on a maintainer longer than each target: open, non-draft PRs without a maintainer review since the clock started and without `requires-submitter-fixes` (the clock starts at creation or the last ready-for-review event), and `external-plugin` issues labeled `ready-for-review` or `awaiting-approval` (the clock starts when that label was last added). Business days count Monday through Friday only, with partial days counted fractionally. |
| Automation failure rate | For the configured `automation_workflows`: runs created in the window with conclusion `failure`, `timed_out`, or `startup_failure`, divided by completed runs excluding `cancelled`, `skipped`, `neutral`, `action_required`, and `stale`. Workflows that do not exist yet are listed as "not found". |

`.github/review-metrics.yml` configures the window, targets, label sets, workflows, and tracking issue. Missing labels never cause errors.

### Running locally

```bash
node eng/review-metrics.mjs --repo github/awesome-copilot --dry-run --output-dir ./metrics
node --test eng/review-metrics.test.mjs
```

## Portability to MOS3

The #4184 automation is driven by repository-local configuration and self-contained scripts, so another repository such as MOS3 can adopt it by copying files and editing configuration rather than code.

| Artifact | Phase | How to port | Repository-specific settings |
|---|---|---|---|
| `CODEOWNERS` with team owners | 1 | Copy the structure | Team names and path patterns |
| `.github/review-routing.yml` | 1 | Copy and edit | Reviewer pools, targets, escalation |
| `.github/risk-tiers.yml` | 2 | Copy and edit | Path and risk classification rules |
| `submission-gate` check | 2 | Copy the workflow and script | Required checks per tier; include `canvas-smoke-test` only where canvas extensions exist |
| `canvas-smoke-test` (`eng/canvas-smoke-test.mjs`, `validate-canvas-extensions.yml`, `canvas-smoke-test-comment.yml`) | 3 | Copy as-is where the repository ships canvas extensions and `eng/materialize-plugins.mjs` | `CANVAS_PREVIEW_MIN_WIDTH` and `CANVAS_PREVIEW_MIN_HEIGHT` variables |
| `.github/auto-merge.yml`, `eng/auto-merge.mjs`, `.github/workflows/auto-merge.yml` | 3 | Copy as-is | Base branch, required checks and labels, blocking labels, eligibility paths, automation authors |
| `.github/review-metrics.yml`, `eng/review-metrics.mjs`, `.github/workflows/review-metrics.yml` | 3 | Copy as-is | State and risk labels, automation workflow list, tracking issue title |
| `eng/lib/review-automation-github.mjs` | 3 | Copy as-is | None (uses `GITHUB_TOKEN` or the `gh` CLI) |

The phase 3 scripts depend only on Node.js 22 and `js-yaml`. Workflows gate automatic runs on `github.repository_owner == 'github'`; update that condition when porting. `.github/workflows/setup-labels.yml` creates the `do-not-merge`, `auto-merge-armed`, and `review-metrics` labels.

### Other marketplaces: `microsoft/azure-dev-tools`

[`microsoft/azure-dev-tools`](https://github.com/microsoft/azure-dev-tools) is another Copilot plugin marketplace (`copilot plugin marketplace add microsoft/azure-dev-tools`, marketplace ID `azure-dev-tools`). It ships canvas plugins such as `azure-functions-hosted-skills`, `azure-resources-query`, `azure-cost-health-check`, and `azure-sre-agent`, plus the skill-only `canvas-authoring` plugin. It can reuse the same review model: CODEOWNERS teams, `review-routing.yml`, risk tiers, `submission-gate`, `canvas-smoke-test`, `auto-merge.yml`, and the metrics workflow.

- **Maps directly:**
  - Canvas smoke-test and preview evidence: module graph, capability summary, unsafe paths, binaries, and `assets/preview.png` checks.
  - Risk tiers and `submission-gate` rules.
  - Weekly metrics.
  - Label-driven auto-merge config.
- **Differences:**
  - The plugins are first-party and Microsoft-owned, so resource ownership comes from CODEOWNERS teams more than contributor front matter. The `min_merged_prs` history check matters less there.
  - Releases are pinned to immutable per-plugin tags, while awesome-copilot materializes plugins from the default branch. Point the smoke test's install step at the plugin source for the release tag. Treat release-tag or version bumps as their own risk tier, and don't auto-merge them without maintainer review.
  - Plugins with no canvas extension, such as `canvas-authoring`, report `canvas-smoke-test` as skipped. The check's layout detection (`extensions/<id>/` plus a matching `plugins/<id>/plugin.json`) may need adjusting to that repository's structure.