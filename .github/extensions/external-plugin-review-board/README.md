# External Plugin Review Board

A maintainer-only Copilot canvas extension for triaging `external-plugin` submissions that are
`ready-for-review` in github/awesome-copilot.

Open it by asking Copilot to "open the plugin review board" (canvas id `external-plugin-review-board`).

## Features

- **Kanban board** with buckets: Unreviewed → Reviewing → Straight reject / Probably reject / Needs review /
  Accept → Actioned. Drag cards between buckets (or use the *Bucket* dropdown in the details panel).
  Dragging a card back to *Unreviewed* clears its AI review so it's picked up by the next review.
- **Perform review** asks the agent to review every item without an AI review, using
  [`review-guidance.md`](./review-guidance.md) and the decisions you've made from the board. Results are
  recorded with the `record_review` canvas action and move cards into their recommended bucket.
- **Re-review** (in the details panel) takes optional guidance on what to focus on, then has the agent
  spin up a separate sub-session to re-assess that one submission. The sub-session reports its result
  back and it's recorded on the card along with your guidance.
- **Refresh** fetches open `external-plugin` + `ready-for-review` issues, adds new ones, and removes any
  that are closed or no longer ready for review.
- **Details panel** shows the AI review, the rendered issue body, and all comments.
- **Quick actions** post `/approve` (with an optional note) or `/reject <reason>` straight to the issue
  after a confirm click. The reject reason is prefilled from the AI's suggested comment.

## State

Board state lives in `state/board.json` next to this file and is gitignored. It stores the synced issue
metadata, AI reviews, manual bucket overrides, and a history of decisions made from the board.

## Requirements

- The GitHub CLI (`gh`) on `PATH`, authenticated as a maintainer with write access (needed for
  `/approve` and `/reject` to be honoured by the command router workflow).

## Agent actions

`get_board`, `refresh`, `start_review`, `start_rereview`, `record_review`, `move_item`, `get_issue`.
