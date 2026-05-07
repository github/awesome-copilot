# Efficiency Reporting and Follow-Up Review

Load this reference when the user asks what changed, wants a before/after report, or asks for another pass over remaining expensive jobs.

## Reporting Rules

- Separate expected savings from measured savings.
- Do not claim exact time or cost savings without before/after run data.
- Call out confounders such as cache warm-up, changed matrix breadth, runner changes, or unusually small PRs.

Use this phrasing when data is incomplete:

`I can report the efficiency mechanisms that changed, but I cannot honestly claim exact minutes saved without comparing before/after GitHub Actions runs.`

## What To Measure

Gather:

1. A baseline sample before the change
2. A post-change sample after caches warm
3. Per-workflow or per-job duration comparisons
4. Avoided runs, skipped jobs, or avoided matrix legs

Always separate:

- PR wall-clock time
- Total runner time across jobs
- Work avoided entirely

These answer different questions. A change can reduce runner spend without materially improving the fastest feedback path.

## Follow-Up Review Pass

After the first round of fixes is validated, inspect the remaining expensive jobs:

- Compare setup time versus execution time
- Identify heavyweight wrapper actions and confirm what they really enforce
- Review whether each matrix dimension still serves an active decision
- Recheck after caches warm
- Break down the dominant slow step before proposing further changes

Keep the follow-up compact. Report the next few highest-value opportunities, not a long wishlist.
