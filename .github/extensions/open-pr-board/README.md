# Open PR Board

A canvas for triaging the repository's open pull requests, modelled on the
External Plugin Review Board. It pulls open PRs with the `gh` CLI, lets the agent
review them against this repo's own review rules, sorts them into recommendation
buckets, and applies confirmed review, close, and merge actions through the
authenticated `gh` CLI.

## What it does

- **Buckets** — `Unreviewed`, `Reviewing`, `Close`, `Request changes`,
  `Needs insight`, `Approve`, `Actioned`. The AI recommendation picks the bucket;
  dragging a card overrides it.
- **AI reviews** — "Review pending" asks the agent to review every PR that has never
  been reviewed or whose review is stale. The agent records structured results
  (rationale, repo fit, compliance, differentiation, risks, validation, confidence,
  suggested comment) through a canvas action.
- **State tracking** — each PR remembers whether it has been reviewed, when, what the
  agent concluded, any manual move, and any decision you recorded. A PR updated after
  its review is flagged `PR changed` and is picked up by the next review pass.
- **Re-review** — ask for a fresh pass on one PR with optional focus guidance.
- **Labels** — GitHub labels render on every card in their own colours, blended toward
  the app theme so they stay readable in both light and dark mode.
- **Detail drawer** — AI review, description, conversation, changed files, and checks.
- **GitHub actions** — submit feedback, request changes, close a PR, or approve it and
  enable auto-merge with a merge commit. Each action needs two clicks to confirm and
  is also recorded in local board history.

## Requirements

The [`gh` CLI](https://cli.github.com) must be installed and authenticated with access
to the repository. Everything the board reads — listing, detail, checks — goes through
`gh`. Confirmed drawer actions use the same authenticated account to submit reviews,
close pull requests, and enable auto-merge. Your GitHub permissions and repository
branch-protection rules still apply.

## State

Board state lives in `.github/extensions/open-pr-board/state/<owner>__<repo>.json`, one
file per repository, and is git-ignored. Deleting it resets reviews and history but
touches nothing on GitHub.

## Agent actions

| Action           | Purpose                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| `get_board`      | Current buckets, counts, and per-PR state.                              |
| `refresh`        | Re-fetch open pull requests from GitHub.                                |
| `start_review`   | Queue a review pass and return the review instructions.                 |
| `start_rereview` | Queue a re-review of one PR with optional guidance.                     |
| `record_review`  | Record structured review results (used by the agent, not by hand).      |
| `move_item`      | Move a PR to a different bucket.                                        |
| `get_pr`         | Full detail for one PR: body, comments, reviews, files.                 |

## Review rules

The agent reads [`review-guidance.md`](./review-guidance.md), which layers PR-specific
procedure on top of `.github/skills/code-review/SKILL.md` and
`.github/copilot-instructions.md`. AI evidence gathering is read-only: the agent never
edits files or runs write commands against the PR. Only an explicitly confirmed drawer
action writes to GitHub.
