# Duplicate Review Board

A repository-local maintainer canvas for turning the weekly
[Duplicate Resource Detector](../../workflows/duplicate-resource-detector.md)
reports into actionable, local triage. It is not an installable marketplace plugin.

## Workflow

1. Open canvas `duplicate-review-board`. **Find reports** lists the 100 most recent
   open and closed `duplicate-review` issues in `github/awesome-copilot`.
   Select a report and **Import / refresh from GitHub**. Opening the canvas alone
   does not fetch reports or change GitHub.
2. Search groups and resources; drag cards or use their accessible decision
   selector to choose **Unreviewed**, **Keep separate**, **Consolidate**, or
   **Needs insight**. Open a card to read each resource's contents from `main`
   directly in the canvas (tabbed or side by side), plus detector evidence, private
   notes, and an editable consolidation-issue draft. Save edits locally.
3. **Compare in background** starts a native background agent using
   `session.rpc.tasks.startAgent`, never `session.send` or a foreground review.
   It compares source files read-only and returns a recommendation with evidence.
   Optional guidance focuses a re-review. AI results never change your decision
   or issue draft. Runtimes without background-task support report an error;
   there is no foreground fallback.
4. **Preview GitHub action** shows the exact destination and complete payload.
   A separate **Confirm and publish** click is required:
   - **Keep separate** checks only this group's `Reviewed` checkbox in an open
     report, preserving the rest of the Markdown byte-for-byte. The detector can
     subsequently use these acceptances to exclude known intentional overlap.
   - **Consolidate** creates a tracking issue containing the saved draft and a
     stable group marker. It never edits, deletes, or merges resource files.
     Private notes are not posted unless you put them into the issue draft.

Background workers with canvas tools record their own results. If a worker does
not have those tools, it returns the exact result JSON for the parent agent to
record through `record_review` or `fail_review` on completion. It should not run
another comparison in the parent. The stored agent ID identifies the task.
**Cancel queued review** invalidates its local token; it does not stop an already
running read-only worker. Late results are rejected.

## State and refresh

State is atomically saved under
`<session.workspacePath>/extensions/duplicate-review-board/state/board.json`,
outside the checkout and extension directory. Multiple panels share the same
session's reports and live updates; reloading the extension or resuming the session
preserves decisions. A new conversation has separate state.

Reports are keyed by issue number; groups by a hash of their sorted resource
paths, not display numbers or panel IDs. Renumbering a group preserves its local
state. Changed titles, descriptions, or similarity evidence invalidate reviews
and decisions while preserving notes and publication receipts. Removed groups
with publication records remain accessible for recovery; other removed groups
disappear when the report is imported again. Other imported reports
remain available. A report format the parser cannot safely understand is rejected
explicitly, without changing the saved state.

Saving or moving a queued group cancels its local token. Failed background
dispatch clears the queue and records the error. Failed or cancelled comparisons
can be requested again.

Edits carry the group's loaded revision. A concurrent edit or changed report
rejects a stale save instead of overwriting newer triage.

## Remote safeguards and recovery

The authenticated `gh` CLI is required for GitHub reads and confirmed writes.
The board is intentionally restricted to this repository. GitHub permissions
still apply. No write is exposed as an agent-callable canvas action.

Previews expire after five minutes, are single-use, and are invalidated by local
edits or a changed source report. The report is re-read immediately before a write.
GitHub issue-body updates do not provide transactional compare-and-swap; avoid
simultaneous manual editing while publishing an acceptance.

A publication intent is persisted **before** the remote write. Published and
unconfirmed groups are locked against editing and repeat publication. Consolidation
records lock the same resource group across every imported report, including
removed recovery entries. Network
failures or a lost response never trigger an automatic retry. **Reconcile with
GitHub** verifies the acceptance checkbox or searches all repository issues for
the stable consolidation marker, then saves a local receipt without writing to
GitHub. The marker prevents a later weekly report creating another tracking
issue for the same paths. If no unique result is found, the error remains visible:
inspect GitHub and the saved state manually rather than retrying blindly.

## Agent actions

| Action | Purpose |
| --- | --- |
| `get_board` | Read the local report, groups, queue tokens, and receipts. |
| `list_reports` | Discover report issues, read-only. |
| `import_report` | Import or refresh a report from GitHub. |
| `select_report` | Switch between imported local reports. |
| `read_resource` | Read a listed resource from `main` inside the canvas. |
| `update_group` | Save a local decision, note, and issue draft with `expectedRevision`. |
| `start_review` | Dispatch one native background comparison. |
| `record_review` | Record a result matching the current queue token. |
| `fail_review` | Record a failure matching the current queue token. |
| `cancel_review` | Invalidate the local token; reject late results. |

The loopback UI reuses the Open PR Board's authenticated HTTP/SSE server, has
searchable kanban cards, native modal focus management, keyboard-operable decision
selectors, app theme tokens, and explicit errors. All report and AI content is
rendered as text, not executable HTML.

## Regression tests

From the repository root:

```sh
node --experimental-vm-modules --test eng/duplicate-review-board*.test.mjs
```

Tests use fake GitHub clients and SDK modules; they never write to GitHub or start
real background reviews.
