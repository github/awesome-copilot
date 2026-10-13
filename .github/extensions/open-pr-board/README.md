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
  PRs with submitted feedback or requested changes return to Unreviewed after new
  commits; the previous action remains in history.
- **Re-review** — ask for a fresh pass on one PR with optional focus guidance.
- **Column actions** — approve + auto-merge, request changes (close in the Close column), or
  re-review every eligible PR, including cards hidden by search. Confirmation previews the exact
  staged comments; requests for changes and bulk closes require feedback on every PR.
  Drawer edits remain staged when switching cards in the current browser session. Queued and
  actioned PRs are excluded; individual errors and partial-success warnings are surfaced without
  automatic retries.
- **Labels** — GitHub labels render on every card in their own colours, blended toward
  the app theme so they stay readable in both light and dark mode.
- **Detail drawer** — AI review, description, conversation, changed files, and checks.
  Keyboard focus stays inside the modal drawer and returns to its card on close.
  Use Left/Right arrows or Home/End to switch detail tabs.
- **GitHub actions** — submit feedback, request changes, close a PR, or approve it and
  enable auto-merge with a merge commit. Each action needs two clicks to confirm and
  is also recorded in local board history. Approval is pinned to the board's commit
  SHA, and auto-merge requires that same head commit. If the head changes, refresh
  and review the new commit before approving again.
  Only one GitHub action can run per PR at a time.
- **Reset board** — after a second click to confirm, clear every local AI review,
  queued review, manual move, recorded action, and history entry, then reload open PRs.
  Reset never undoes or changes anything on GitHub.

## Requirements

The [`gh` CLI](https://cli.github.com) must be installed and authenticated with access
to the repository. Everything the board reads — listing, detail, checks — goes through
`gh`. Confirmed drawer actions use the same authenticated account to submit reviews,
close pull requests, and enable auto-merge. Your GitHub permissions and repository
branch-protection rules still apply.

## State

Board state lives in
`<session.workspacePath>/extensions/open-pr-board/state/<owner>__<repo>.json`, one
file per repository. This is Copilot's session-state workspace, not the repository
checkout. State survives extension reloads and resuming the same session; a new
session has its own board. Infinite sessions must be enabled to provide the workspace.
Keeping writes outside the extension folder avoids invalidating its safety fingerprint.
State previously stored in the extension folder is not imported; boards start fresh.
Use **Reset board** (or the `reset_board` action) to clear reviews and history without
touching GitHub.

## Agent actions

| Action           | Purpose                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| `get_board`      | Current buckets, counts, and per-PR state.                              |
| `refresh`        | Re-fetch open pull requests from GitHub.                                |
| `start_review`   | Queue a review pass and return the review instructions.                 |
| `start_rereview` | Queue a re-review of one PR with optional guidance.                     |
| `record_review`  | Record structured review results (used by the agent, not by hand).      |
| `move_item`      | Move a PR to a different bucket.                                        |
| `reset_board`    | Clear local reviews, actions, and history, then reload open PRs.        |
| `get_pr`         | Full detail for one PR: body, comments, reviews, files.                 |

## Review rules

The agent reads [`review-guidance.md`](./review-guidance.md), which layers PR-specific
procedure on top of `.github/skills/code-review/SKILL.md` and
`.github/copilot-instructions.md`. AI evidence gathering is read-only: the agent never
edits files or runs write commands against the PR. Only an explicitly confirmed drawer or column
action writes to GitHub.

Review results require the exact queue token from the current review request.
Results arriving after a manual move, reset, or replacement review are rejected.

## Regression tests

Run `node --test eng/open-pr-board.test.mjs` from the repository root. GitHub writes
are tested with injected in-process fakes, never the authenticated CLI.
Run `node --test eng/board-bulk-actions.test.mjs` to check column confirmation, staged feedback,
queue exclusions, and partial failures using in-process fakes.
Run `node --experimental-vm-modules --test eng/board-state-storage.test.mjs` to check
both canvases' session-scoped persistence without accessing GitHub.
