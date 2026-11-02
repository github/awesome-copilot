# Open PR Board

Handled errors also offer an optional **Send to agent** action. It requests a child
session to investigate the error; retry and recovery controls stay unchanged.
Creation is only confirmed after the parent agent reports the actual child ID.
See [canvas error handoff](../../../docs/maintainers/canvas-evidence-and-metrics.md#optional-error-handoff)
for privacy, pending-state and failure behavior.

A canvas for triaging the repository's open pull requests, modelled on the
External Plugin Review Board. It pulls open PRs with the `gh` CLI, lets the agent
review them against this repo's own review rules, sorts them into recommendation
buckets, and applies confirmed review, close, and merge actions through the
authenticated `gh` CLI.

## What it does

- **Automatic refresh** — fetches open PRs every 15 minutes while the canvas is open,
  using the same read-only path as manual Refresh. Concurrent fetches are shared;
  closing the canvas stops its timer. Existing reviews, queue tokens, manual buckets,
  decisions, selection, and staged feedback are retained for PRs still on the board.
  Refresh does not start AI reviews or write to GitHub. Failures show an error without
  clearing the board, and the next scheduled or manual refresh can retry.
- **Buckets** — `Unreviewed`, `Reviewing`, `Close`, `Request changes`,
  `Needs insight`, `Approve`, `Actioned`. The AI recommendation picks the bucket;
  dragging a card overrides it. Cards in each bucket are sorted oldest to newest
  by creation date.
- **AI reviews** — "Review pending" asks the agent to review every PR that has never
  been reviewed or whose review is stale. The prompt tells the session to fan the work
  out to background agents (one per PR, or small batches) so the main conversation
  stays free. The agents record structured results
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
  Clicking outside the drawer or successfully submitting an item action closes it;
  failed actions leave it open so you can correct or retry them.
- **Approve and run checks** — cards identify fork workflow runs awaiting execution
  approval. Open **Checks**, inspect the linked workflow and contributor code, then
  explicitly confirm **Approve and run checks** for a specific run, attempt, and
  commit. This uses GitHub's fork workflow approval endpoint, not a PR approving
  review, re-run, auto-merge, or required-check bypass. The board refreshes after
  success and records workflow execution approval in history without changing the
  PR's triage bucket, review queue, or staged feedback. Execution events do not
  calibrate AI review strictness.
  `ACTION_REQUIRED` checks are shown as needing attention, not test failures:
  submission gates can require PR reviews rather than execution approval.
  Queued/running checks, actual failures, deployment/environment approvals, private
  forks, and non-fork runs are not eligible. Only the latest run for each workflow
  associated with this PR at the current fork head is offered; runs associated only
  with another PR do not displace it. Discovery errors remain visible as a fixed
  failure indicator, without retaining raw tool errors; refresh to retry.
  Unassociated fork runs are matched by repository IDs, branch, and exact SHA.
  The authenticated `gh` account needs repository write access and token access to
  Actions; GitHub enforces final eligibility and permissions. Errors are surfaced,
  never automatically retried. After an unconfirmed write, inspect the run on GitHub
  before retrying. Run state and PR head are checked again immediately before the
  write, but GitHub's approval API provides no atomic SHA/attempt precondition.
- **GitHub actions** — submit feedback, request changes, close a PR, or approve it and
  enable auto-merge with a merge commit. Each action needs two clicks to confirm and
  is also recorded in local board history. Approval is pinned to the board's commit
  SHA displayed by the client, and auto-merge requires that same head commit.
  A changed head automatically reloads an open preview; approval is unavailable until
  that preview has loaded. Bulk approval skips stale AI reviews. If the head changes,
  review the new commit before approving again.
  Queued reviews and manual approval moves retain their original commit SHA, so a
  refresh cannot carry those approval choices onto newer commits. Legacy reviews or
  approval moves without a recorded SHA must be reviewed or explicitly moved again.
  Moves carry the client's displayed SHA even if polling updates the board before the
  request arrives. Delayed feedback actions retain their original SHA so new commits
  still return to Unreviewed. A successful refresh retries a failed open preview.
  Feedback completed for an older head is recorded only in history, preserving any
  review queue, completed review, or manual bucket already created for the newer head.
  Any retained review, queue, or manual bucket belonging to the older head is cleared.
  Feedback requests also carry the displayed SHA and are rejected if polling has
  already discovered a newer head before dispatch.
  Only one GitHub action can run per PR at a time.
- **Reset board** — after a second click to confirm, clear every local AI review,
  queued review, manual move, recorded action, and history entry, then reload open PRs.
  Reset never undoes or changes anything on GitHub.

## Requirements

The [`gh` CLI](https://cli.github.com) must be installed and authenticated with access
to the repository. Everything the board reads — listing, detail, checks — goes through
`gh`; the bulk PR list uses paginated REST, while per-PR checks and review metadata are
fetched separately. Confirmed drawer actions use the same authenticated account to
submit reviews, close pull requests, and enable auto-merge. Your GitHub permissions and
repository branch-protection rules still apply.

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
| `get_board`      | Current buckets, counts, per-PR commit SHA, and approval staleness.     |
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

Run `node --experimental-vm-modules --test eng/board-periodic-refresh.test.mjs` to check
automatic refresh cadence, concurrent/manual refreshes, state preservation, errors, and disposal.
Run `node --test eng/board-column-order.test.mjs` to check oldest-first column ordering.
Run `node --test eng/open-pr-board.test.mjs` from the repository root. GitHub writes
are tested with injected in-process fakes, never the authenticated CLI.
Run `node --test eng/open-pr-board-workflow-approval.test.mjs` to check fork workflow
discovery, explicit confirmation, stale state and permission guards, shared action
locking, success, and errors without remote mutations.
Run `node --test eng/open-pr-board-prompt-security.test.mjs` to check bounded,
untrusted prompt metadata, safe discovery-error persistence, and calibration that
excludes workflow execution events.
Run `node --test eng/board-bulk-actions.test.mjs` to check column confirmation, staged feedback,
queue exclusions, and partial failures using in-process fakes.
Run `node --test eng/board-preview.test.mjs` to check preview dismissal and in-flight actions.
Run `node --test eng/open-pr-board-drag.test.mjs` to check native card dragging and transfer data.
Run `node --experimental-vm-modules --test eng/board-state-storage.test.mjs` to check
both canvases' session-scoped persistence without accessing GitHub.
