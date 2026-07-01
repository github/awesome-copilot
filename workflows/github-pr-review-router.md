---
name: 'GitHub PR Review Router'
description: 'Builds a pull request routing report that classifies open PRs by real blocking state and recommends the next owner and action.'
labels: ['triage', 'pull-requests', 'reporting']
on:
  schedule:
    - cron: "0 14 * * 1-5"
  workflow_dispatch:
    inputs:
      repository:
        description: 'Optional owner/repo override. Defaults to the current repository.'
        required: false
        type: string
      pr_limit:
        description: 'Maximum number of open PRs to review.'
        required: false
        type: string
      stale_days:
        description: 'PRs older than this many days since last activity move to the stale backlog.'
        required: false
        type: string

permissions:
  contents: read
  pull-requests: read
  issues: read
  checks: read

engine: copilot

tools:
  github:
    toolsets:
      - repos
      - pull_requests
      - issues
  bash: true

safe-outputs:
  create-issue:
    max: 1
    title-prefix: "[PR Review Router] "

timeout-minutes: 45
---

# GitHub PR Review Router

Turn open pull requests into a clear review queue with evidence-backed next
actions.

## Step 1 - Resolve Scope

- Default `REPOSITORY` to `inputs.repository` when provided.
- Otherwise, use the current repository from `GITHUB_REPOSITORY`.
- Default `PR_LIMIT` to `30` when `inputs.pr_limit` is empty.
- Default `STALE_DAYS` to `3` when `inputs.stale_days` is empty.
- Fail with a clear message only if the repository cannot be resolved safely.

## Step 2 - Gather Open Pull Requests

List up to `PR_LIMIT` open pull requests for `REPOSITORY`.

For each PR, gather:

- number, title, URL, author, draft status
- labels
- requested reviewers and assignees when available
- review decision and latest meaningful review signals
- unresolved review threads when available
- overall check status and failing or pending checks when available
- mergeability and conflict state
- created time, updated time, branch age, and last activity
- a short `About` summary

Prefer GitHub as the source of truth. If one signal cannot be read, mark it as
missing instead of guessing.

## Step 3 - Classify Each Pull Request

Assign exactly one primary state to each PR using this order:

1. `blocked by conflicts`
   Use this when the PR has merge conflicts or is otherwise not mergeable due
   to branch divergence that clearly requires author action.
2. `blocked by CI`
   Use this when required checks are failing, the latest run failed, or the PR
   is clearly waiting on broken CI.
3. `needs author response`
   Use this when the latest strong signal is changes requested, unresolved
   review feedback that the author has not addressed, or the PR is still a
   draft awaiting author follow-up.
4. `needs reviewer`
   Use this when the PR is ready for review, requested reviewers have not yet
   responded, or the PR has no blocking author or CI signal but still needs a
   human review decision.
5. `ready for maintainer`
   Use this when reviews and checks look complete enough for merge or final
   maintainer decision.
6. `waiting on external dependency`
   Use this only when the PR itself makes that dependency explicit, for example
   another PR, release, migration window, or upstream change.
7. `stale or abandoned`
   Use this when the PR has had no meaningful activity for more than
   `STALE_DAYS` and no higher-priority blocking state applies.
8. `informational only`
   Use this for PRs that are open but do not currently require action.

Guardrails:

- Do not treat a draft PR as ready for maintainer review unless the author has
  clearly asked for review.
- Do not mark a PR ready for maintainer review when checks, conflicts, or
  unresolved review threads cannot be read confidently.
- Do not invent missing evidence.

## Step 4 - Choose the Next Owner and Action

For every PR, recommend:

- one next owner: `author`, `reviewer`, `maintainer`, or a named role when the
  repository makes ownership obvious
- one smallest useful next action

Examples:

- `author` -> rebase and resolve conflicts
- `author` -> address requested changes in auth tests
- `reviewer` -> review latest revision after CI passes
- `maintainer` -> merge or decide whether to close
- `maintainer` -> confirm whether external blocker is still valid

Keep the action factual and short.

## Step 5 - Build the Routing Report

Create a markdown report with this structure:

```markdown
# GitHub PR Review Router

Run time:
Repository scope:
PR scope:

## Quick Read
- Needs maintainer now:
- Needs author now:
- Needs reviewer now:
- Blocked by CI:
- Stale backlog:

## Active Queue
| PR | About | State | Owner | Next action |
|---|---|---|---|---|

## Stale Backlog
```

Formatting rules:

- Lead with the PRs that need immediate action.
- Include a short `About` summary for every listed PR.
- Keep `State` labels short.
- Use the `Next action` column for the concrete recommendation.
- Put stale PRs in a compact backlog section instead of giving them equal
  visual weight.
- If a section would be empty, omit it.

## Step 6 - Deliver the Report

Create one issue in `REPOSITORY` with:

- title: `[PR Review Router] <REPOSITORY> - <YYYY-MM-DD>`
- body: the full markdown routing report

If issue creation is unavailable, render the report as the final output instead
of mutating any pull request metadata.

## Hard Constraints

- Do not approve, request changes, merge, close, retarget, mark ready for
  review, request reviewers, or relabel pull requests.
- Do not post repeated nudges if a near-identical recent routing issue already
  exists. Instead, update the new report text to mention that a prior report
  already covered unchanged stale items.
- Do not run an unbounded cross-repository review.
