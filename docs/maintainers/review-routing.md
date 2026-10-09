# Review routing, ownership, and SLAs

This page describes how pull requests in Awesome Copilot are assigned to reviewers, how quickly a first review is expected, and what happens when that target is missed. It covers Phase 1 of [github/awesome-copilot#4184](https://github.com/github/awesome-copilot/issues/4184).

## Ownership (`CODEOWNERS`)

The root [`CODEOWNERS`](../../CODEOWNERS) file assigns every path to a team, not to an individual.

| Path | Owning team |
|---|---|
| `*` (default) | `@github/awesome-copilot-core-maintainers` |
| `/extensions/` | `@github/awesome-copilot-canvas-reviewers` |
| `/plugins/` | `@github/awesome-copilot-plugin-reviewers` |
| `/agents/`, `/instructions/`, `/skills/`, `/hooks/`, `/workflows/` | `@github/awesome-copilot-content-reviewers` |
| `/.github/` (including GitHub Actions workflows), `/eng/` | `@github/awesome-copilot-core-maintainers` |
| Copilot workshop content under `/website/` | `@github/awesome-copilot-workshop-reviewers` |

GitHub applies the **last** matching rule, so the workshop entries at the bottom of the file override the default team for their paths. When you edit `CODEOWNERS` by hand:

- Keep the `*` rule and the domain team block at the top of the file.
- Never add an individual user to the `*` rule.
- Add more-specific path owners after the broader rules they override.

## Reviewer pools (`.github/review-routing.yml`)

[`.github/review-routing.yml`](../../.github/review-routing.yml) is the single source of truth for automatic review requests. Workflows never hard-code reviewer handles.

| Key | Purpose |
|---|---|
| `dry_run` | When `true`, workflows log their planned actions to the job summary but make no changes. |
| `sla.first_review_business_days` | Business days after routing until a first review is due (default `2`). |
| `sla.escalation_business_days` | Business days after routing until escalation to the core pool (default `4`). |
| `sla.holidays` | Optional list of `YYYY-MM-DD` UTC dates excluded from business-day math. |
| `labels` | Names of the labels the routing workflows manage. |
| `pools.<name>.team` | Team in `<org>/<team-slug>` form. It is requested when no individual is available, and the escalation pool's team is always requested on escalation. |
| `pools.<name>.reviewers` | Individual GitHub logins that routing chooses from. |
| `pools.<name>.backup` | Individuals requested when a review is overdue. |
| `routes` | Ordered list mapping intent labels to pools. The first route whose label is on the PR wins. |
| `default_pool` | Pool used when no route matches, for example a docs-only PR. |
| `escalation_pool` | Pool that receives escalations and serves as the last-resort fallback. |
| `unavailable` | Logins that are temporarily away. They are never selected. |
| `skip_authors`, `skip_labels` | PRs by these authors, or with these labels, are not routed or escalated. |

Current routes, in priority order:

| Intent label | Pool |
|---|---|
| `workshops` | `workshops` |
| `canvas-extension` | `canvas` |
| `external-plugin`, `plugin` | `plugin` |
| `skills`, `agent`, `instructions`, `workflow`, `hooks` | `content` |
| `website-update` | `core-maintainers` |

Intent labels are applied by `.github/workflows/label-pr-intent.yml` and `label-pr-intent-writer.yml`.

### Updating the pools

1. Edit `.github/review-routing.yml`. Keep at least three reviewers per pool, with coverage across time zones.
2. Validate the file with `node eng/review-routing.mjs validate`, then run the unit tests with `node --test eng/review-routing.test.mjs`.
3. Open a PR. The file is owned by the core-maintainer team.

To take a reviewer out of rotation temporarily, add their login to `unavailable` instead of removing them from every pool.

## Routing

The **Review Routing** workflow (`.github/workflows/review-routing.yml`) runs when:

- **Label PR Intent** finishes for a PR. Routing uses that run's intent labels even if they have not been applied yet.
- A person adds the `needs-reviewer` label. The read-only **Review Routing Request** workflow records the request, and Review Routing acts on it.
- It is dispatched with a `pr_number` input. Automation such as the `/request-review` command uses this path because labels added with `GITHUB_TOKEN` do not trigger other workflows.
- The hourly schedule runs, or it is dispatched without a `pr_number`. This sweep evaluates every open, non-draft PR. It routes PRs that are unrouted, that have the `needs-reviewer` label, or whose pool is not covered. Each routed PR is handled in its own job.

For each eligible PR, routing does the following:

1. Picks the pool using `routes`, falling back to `default_pool`. For runs triggered by **Label PR Intent**, that run's intent labels replace the PR's current intent labels, so stale labels can't pick the wrong pool.
2. Checks whether the pool is already **covered**. A pool is covered when one of its reviewers or backups, or a core maintainer, is already requested or has already reviewed the PR. If the pool isn't covered, routing requests one individual from the pool, excluding the PR author, reviewers already requested, bots, and anyone listed in `unavailable`. A pending request for someone in `unavailable` doesn't count as coverage, but a review they already submitted does. It prefers the reviewer with the **fewest open review requests** across all open PRs. Ties rotate by PR number.
3. If the pool has no eligible individual, routing tries the pool's `backup` list, then the escalation pool's reviewers, and finally requests the pool team.
4. Adds a `review-due:YYYY-MM-DD` label. The date is the routing day plus `first_review_business_days`, in UTC. The time the label was added marks the start of the SLA cycle.
5. If `needs-reviewer` triggered the run, routing always requests a new reviewer: someone who is not already requested and has not already reviewed the PR. It removes `needs-reviewer`, `review-overdue`, and `review-escalated`, then removes and re-adds the due label to restart the SLA. If no new reviewer or team can be requested, routing changes nothing, so `needs-reviewer` and the current due date stay, and the hourly sweep tries again.

A PR that is already routed is checked again whenever a new commit changes its intent labels. If the new target pool isn't covered, for example because a skills PR now also touches a workflow, routing requests a reviewer from that pool. The existing due date stays the same.

Routing skips drafts, closed PRs, and unrouted PRs that already have a human review, unless `needs-reviewer` is present. Draft PRs are routed when they are marked ready for review.

### Failures and concurrency

- Routing requests reviewers before it changes any labels. If GitHub rejects the request, for example because a team is missing or the token lacks access, routing leaves the labels alone and fails the job. Nothing is marked as routed, so the next run or sweep tries again.
- Each workflow first runs a read-only `plan` job that picks the target PRs. It then handles each PR in a job that uses the `review-routing-pr-<number>` concurrency group. Review Routing and Review Escalation share that group, so their read, plan, and apply steps never overlap for the same PR. Within one run, the per-PR jobs run one at a time, and each job re-reads reviewer load before it picks someone.
- Load balancing across separate runs is best-effort. Two runs that route different PRs at the same moment can read the same load and pick the same reviewer. A repository-wide lock would avoid this, but GitHub cancels pending runs that wait on the same concurrency group, so routing requests could be lost. The next routing run sees the updated load.
- A GitHub Actions matrix can hold at most 256 jobs. If a sweep finds more PRs than that, it handles the first 256, logs a warning, and leaves the rest for the next scheduled run. Planning is idempotent, so no PR is skipped permanently.

## SLA and escalation

The **Review Escalation** workflow (`.github/workflows/review-escalation.yml`) runs at 14:00 UTC on weekdays and can also be dispatched manually. It checks every routed PR, meaning every PR with a `review-due:` label.

| Condition | Action |
|---|---|
| A human review arrives after the due label was added | Removes `review-due:*`, `review-overdue`, and `review-escalated` |
| No review by the end of the due date | Requests a backup from the pool's `backup` list, then from the escalation pool. If no individual is available, it requests the pool team and then the escalation team, unless they are already requested. Adds `review-overdue` and posts a comment that says who, if anyone, was requested. |
| No review `escalation_business_days` after routing | Requests the escalation pool team and one core maintainer; adds `review-escalated`; posts a comment |

Business days are Monday through Friday in UTC, minus `sla.holidays`. A PR routed on Monday is due Wednesday, becomes overdue Thursday, and escalates Friday, four business days after routing. A PR routed on Wednesday is due Friday, becomes overdue Monday, and escalates Tuesday. Reviews from the author or from bots, including Copilot code review, don't count as a first review. Only reviews submitted after the current due label was added count. Each action happens once per SLA cycle because the labels record the state. If a reviewer request fails, the labels and comment are skipped so the next run retries.

The workflow also deletes `review-due:*` labels whose dates are more than 14 days in the past and that are no longer on any open PR.

## Labels

| Label | Meaning |
|---|---|
| `needs-reviewer` | Asks routing to (re)assign a reviewer. Routing removes it after it runs. |
| `review-due:YYYY-MM-DD` | Date by which the first review is expected. |
| `review-overdue` | The first review is late, and a backup reviewer was requested. |
| `review-escalated` | The review was escalated to the core-maintainer pool. |

The **Setup Repository Labels** workflow creates `needs-reviewer`, `review-overdue`, and `review-escalated`. Routing creates each `review-due:` label when it first uses it.

## Security model

- Workflows triggered by pull requests (**Label PR Intent** and **Review Routing Request**) run with read-only permissions and only upload a small JSON artifact.
- **Review Routing** runs from `workflow_run`, `workflow_dispatch`, or `schedule`. It checks out only the default branch, validates the artifact against the triggering run, and never checks out or runs PR code. This is the same approach as `label-pr-intent-writer.yml`.
- In both Review Routing and Review Escalation, the `plan` job has read-only permissions. Only the per-PR jobs can write to issues and pull requests.
- All reviewer logic lives in `eng/review-routing.mjs` and is covered by `eng/review-routing.test.mjs`.

## Enabling routing

The routing workflows ship with `dry_run: true` and empty reviewer lists. To turn them on:

1. Create every team referenced in `CODEOWNERS` and in the `pools` of `.github/review-routing.yml`, each with at least three members, and give each team access to the repository.
2. Add the team members to the matching `reviewers` and `backup` lists in `.github/review-routing.yml`.
3. Run **Setup Repository Labels**.
4. Set `dry_run: false`.
5. Once the teams and coverage are in place, enable **Require review from Code Owners** in the `main` ruleset.
