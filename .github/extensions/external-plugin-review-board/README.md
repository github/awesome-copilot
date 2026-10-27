# External Plugin Review Board

A maintainer-only Copilot canvas extension for triaging active `external-plugin` submissions in
github/awesome-copilot.

Open it by asking Copilot to "open the plugin review board" (canvas id `external-plugin-review-board`).

## Features

- **Kanban board** with buckets: Unreviewed → Reviewing → Straight reject / Probably reject / Needs review /
  Accept → Actioned. Drag cards between buckets (or use the *Bucket* dropdown in the details panel).
  Dragging a card back to *Unreviewed* clears its AI review so it's picked up by the next review
  once intake is ready.
  Cards in each bucket are sorted oldest to newest by creation date.
- **Perform review** asks the agent to review every intake-ready item without an AI review, using
  [`review-guidance.md`](./review-guidance.md) and the decisions you've made from the board. Results are
  recorded with the `record_review` canvas action and move cards into their recommended bucket.
- **Re-review** (in the details panel) takes optional guidance on what to focus on, then has the agent
  spin up a separate sub-session to re-assess that one submission. The sub-session reports its result
  back and it's recorded on the card along with your guidance.
- **Refresh** fetches open `external-plugin` issues in `ready-for-review`, `awaiting-review`, or
  `requires-submitter-fixes` states. Pending intake cards stay on the board so their AI reviews,
  manual buckets, queued re-reviews, and fast-track dismissal state are preserved. Approval and
  first-party fast-track are unavailable until intake is ready.
  The same read-only refresh runs automatically every 15 minutes while the canvas is open;
  concurrent fetches are shared and closing the canvas stops its timer. Selection, staged feedback,
  reviews, queue tokens, and local decisions remain intact for submissions still on the board.
  Polling never starts AI reviews or writes to GitHub. Failures show an error without clearing
  the board; the next scheduled or manual refresh can retry.
- **Blocked intake status** keeps submissions visible in their existing buckets with a
  *Blocked by intake* badge and a reason (submitter fixes required, automated intake pending, or
  missing `ready-for-review`). The toolbar shows how many submissions can actually be queued and
  how many are blocked, regardless of search. AI review, re-review, and approval are unavailable
  until `ready-for-review` is present and both pending intake labels are absent; rejection and
  manual bucket moves remain available. The details panel explains the block on every tab.
  Check intake feedback on the issue and refresh after intake completes; moving a card does not
  bypass intake. `get_board` exposes eligibility and reasons, and an empty `start_review` result
  explains when submissions are blocked rather than implying that visible cards were reviewed.
- **First-party fast-track**: cards labelled `first party` (repository owned by a Microsoft/GitHub
  organization) skip AI review and go straight to *Accept* with a suggested `/approve`. Only submissions
  that passed automated intake can use fast-track or be approved; pending submissions remain visible on the board.
  Fast-track never overrides an existing review or a bucket you chose; drag a card to *Unreviewed* to opt it
  out and have it reviewed normally. Cards show *First party* / *Third party* pills from the intake labels.
- **Details panel** shows the AI review, the rendered issue body, and all comments.
  Successful refreshes invalidate cached issue details and reload the selected body/comments
  tab without changing staged feedback.
  When detail requests overlap, only the latest request for each issue can update its
  cache, so an older poll cannot overwrite comments loaded after posting feedback.
  Clicking outside the panel or successfully submitting an item action closes it;
  failed actions leave it open so you can correct or retry them.
- **Quick actions** post `/approve` (with an optional note) or `/reject <reason>` straight to the issue
  after a confirm click. The reject reason is prefilled from the AI's suggested comment.
- **Comment** (footer, next to Approve and Reject) posts the shared comment box as a free-form
  comment, for example a question for the submitter, without changing the board state. The comment
  must be non-empty and needs a second *Confirm comment* click. Comments starting with `/` are
  rejected so they can't trigger the command router; use the dedicated actions for commands. After
  posting, the panel stays open on the *Comments* tab and reloads it from GitHub.
- **Request fixes** (footer) posts `/request-fixes <reason>` from the comment box after a confirm
  click. The command router moves the issue to `requires-submitter-fixes` and lists the requested
  fixes for the submitter. A reason is required, and the button is disabled once the issue already
  awaits fixes.
- **Column actions** approve, reject, or re-review every eligible item in a column, including
  cards hidden by search. Confirmation previews each staged comment; rejection requires a reason
  for every item. Drawer edits remain staged when switching cards in the current browser session.
  Queued reviews, pending decisions, and completed actions are excluded. Failures are reported per
  item without automatically retrying posted commands.

## State

Board state lives in
`<session.workspacePath>/extensions/external-plugin-review-board/state/board.json`.
This is Copilot's session-state workspace, not the repository checkout. It stores the synced issue
metadata, AI reviews, manual bucket overrides, and a history of decisions made from the board.
State survives extension reloads and resuming the same session; a new session has its own board.
Infinite sessions must be enabled to provide the workspace. Keeping writes outside the extension
folder avoids invalidating its safety fingerprint. State previously stored in the extension folder is
not imported; boards start fresh.

## Requirements

- The GitHub CLI (`gh`) on `PATH`, authenticated as a maintainer with write access (needed for
  `/approve` and `/reject` to be honoured by the command router workflow).

## Agent actions

`get_board`, `refresh`, `start_review`, `start_rereview`, `record_review`, `move_item`, `get_issue`.

## Regression tests

Run `node --experimental-vm-modules --test eng/board-periodic-refresh.test.mjs` to check
automatic refresh cadence, concurrent/manual refreshes, state preservation, errors, and disposal.
Run `node --test eng/board-column-order.test.mjs` to check oldest-first column ordering.
Run `node --experimental-vm-modules --test eng/board-state-storage.test.mjs` from the repository root
to check both canvases' session-scoped persistence without accessing GitHub.
Run `node --test eng/board-bulk-actions.test.mjs` to check column confirmation, staged feedback,
queue exclusions, and partial failures using in-process fakes.
Run `node --test eng/board-preview.test.mjs` to check preview dismissal, in-flight actions, and the
free-form comment confirm/post flow.
Run `node --test .github/extensions/external-plugin-review-board/lib/github.test.mjs` to check board
feed filtering and free-form comment validation.
Run `node --test eng/external-plugin-review-board-state.test.mjs eng/external-plugin-review-board-ui.test.mjs`
to check intake-blocked reasons, eligibility transitions, visible status, and unavailable controls.
