# External Plugin Re-review Board

A repository-local maintainer canvas for the
[six-month external-plugin review queue](../../workflows/external-plugin-rereview.yml).
This is not an installable marketplace plugin.
The canvas uses the generated transparent PNG at `assets/icon.png`, registered
through the host-local `icon` path on `createCanvas`.

## Workflow

1. Open canvas `external-plugin-rereview-board`. Choose **Reports**, then **Find
   reports**, select a report, and **Import / refresh from GitHub**, or enter its issue number directly
   (for example, `6487`). Opening the canvas does not access GitHub. Discovery lists
   up to 100 recent open `re-review-due` issues and filters for the report marker.
2. The board imports the report, original submissions and their complete paginated
   discussion, and the current `plugins/external.json` from `main`. Cards can be
   searched or dragged between **Unreviewed**, **Keep**, **Needs changes**, and
   **Remove**. Open a card with a click, Enter, or Space to use its **Bucket**
   selector and **Save locally** instead. The toolbar, colored columns, status pills,
   and right-side details drawer follow the PR and plugin review boards.
   Tabs separate **AI review**, **Plugin**, **Issue**, **Comments**, **Notes**, and
   **Activity**; arrow keys, Home, and End navigate the tabs. Details show the current
   catalog entry (which may have changed since submission), original issue, and
   discussion as inert text. Blocked cards explain stale dates, missing listings,
   missing labels, and identity mismatches instead of guessing destinations.
3. Save **private notes** from the Notes tab, a **local decision**, and an optional
   **public reason** from the drawer footer.
   Needs-changes and removal require a reason. Notes and staged reasons are omitted
   from agent snapshots and AI prompts. Public reasons cannot contain slash-command
   lines. Nothing is posted when a card is moved or saved. Unsaved drafts survive
   closing and reopening cards within the current page; they are not persisted
   across a page or extension reload until saved. The footer distinguishes unsaved
   changes from saved triage, and disables publication until changes are saved.
4. Optionally select **Review in background**, with review guidance, or **Review
   pending** in the toolbar to queue every eligible plugin without an AI review,
   including cards hidden by the filter. Queued, blocked, removed, and actioned
   cards are excluded; individual dispatch failures are reported without retrying.
   Cards appear automatically in **In review** while queued or running. Completed
   reviews are grouped by their AI recommendation unless you have saved a decision;
   saved decisions take precedence. Failed or cancelled reviews return to their
   saved bucket (or an existing recommendation). Grouping is not a saved decision:
   choose a bucket and **Save locally** before previewing a GitHub command.
   This column cannot be selected as a decision or used as a drop target.
   Import/refresh also collects read-only upstream GitHub API evidence: the latest
   published stable release and bounded release notes, plugin manifests at the
   listed plugin-root path on that release and the default branch, and comparisons
   from the catalog's pin (SHA takes precedence over ref). The **Plugin** tab shows
   the results, source links, changed paths, truncation notices, and API errors.
   No stable release is distinct from an access failure. Root and legacy manifest
   locations follow the shared external-plugin validator. Repository-wide release
   tags are not assumed to be a monorepo plugin's version, and differing version
   strings are not automatically considered newer.
   Reviews must compare listed, released, and potentially unreleased code, explain
   whether upstream fixes address findings, and give a material reason for any
   requested catalog update. A newer release alone is not grounds for rejection.
   Upstream errors remain explicit uncertainty, not eligibility blockers. Changed
   upstream evidence invalidates old reviews/decisions on refresh just like other
   changed evidence; private notes and receipts remain. Existing reviews must be
   refreshed and rerun to incorporate the new evidence.
   **Request listing update upstream** opens an editable GitHub issue draft in the
   listed plugin's source repository, asking its maintainer to submit a catalog
   update to Awesome Copilot. The draft includes only public listing and
   release/HEAD manifest metadata and links to the PR update instructions, never
   private notes, staged public reasons, review guidance, or AI rationale. It does
   not assume that a differing release tag is a newer plugin version.
   **Check existing requests** searches upstream issues for Awesome Copilot before
   submitting. Review and submit the draft on GitHub; opening it does not create an
   issue, change the board decision, or mark the request as posted. Requests are
   unavailable for removed, blocked, or unverified listings.
   A native
   `session.rpc.tasks.startAgent` worker inspects the original approval context,
   current listing, and public pinned source read-only. Its cited recommendation
   never changes your decision or reason. No foreground fallback is used.
   Review results use the exact queued token. Without canvas tools, workers return
   the action/input JSON for the parent to record once. Cancel invalidates the
   token, not an already running read-only worker. Saving or moving also cancels it.
5. **Preview GitHub action** displays the exact original submission URL and entire
   command comment. A separate **Confirm and post command** click posts one of the
   existing `/re-review-keep`, `/re-review-needs-changes`, `/re-review-remove`
   commands to that submission, **never to the report**.
   The existing workflow renews the review window, flags follow-up, or opens a
   removal PR against `main`. The board does not merge PRs, remove catalog entries,
   close reports, or duplicate the workflow's implementation.

**Posted means the comment was verified, not that automation completed.** Follow the
receipt link to inspect the workflow result. After a confirmed needs-changes
command and the `re-review-follow-up` label, **Start next follow-up decision**
archives that receipt locally, reloads evidence, and unlocks a new decision.
An unresolved publication must be reconciled first. A later renewed review cycle
uses the original issue's new closure timestamp; an old posted receipt does not
block that cycle.

## State and recovery

State is atomically saved to
`<session.workspacePath>/extensions/external-plugin-rereview-board/state/board.json`,
outside the checkout. Panels share session state and SSE updates; reopening or
reloading preserves it. New sessions have separate state.

Rows are identified by original submission number, not table order. Refresh
preserves unchanged triage; changed report identity, submission discussion, or
catalog evidence resets recommendations and local decisions but preserves notes,
public reasons, and receipts. Removed rows remain for recovery. Unsupported table
formats reject the entire import without changing saved state. Concurrent edits
require the loaded revision. A stale details editor pauses without replacing your
draft. **Reload current card** explicitly discards a stale browser draft and loads
the current evidence; closing alone preserves it. Snapshot sequences reject out-of-order updates.

Publication previews expire after five minutes, are single-use, and are bound to
the saved decision, evidence, and report. Immediately before posting, the board
rechecks the report, current catalog, original submission/discussion, and the
authenticated account's repository write permission. Any change requires
reimporting and a fresh preview.
The upstream release and default-branch snapshots are rechecked as part of this evidence.

A durable **unconfirmed** intent is saved before the remote write. Posted and
unconfirmed commands lock the same submission across imported reports. Lost
responses never trigger automatic retries. **Reconcile with GitHub** reads all
submission comments and requires exactly one exact payload from the recorded
maintainer account, a valid original-issue comment URL, and current write
permission before saving a receipt. If no unique match exists, inspect GitHub and
the saved state manually; the board does not clear the lock or blindly retry.

No mutation is exposed as an agent-callable canvas action. The authenticated
loopback UI uses the existing Open PR Board server and app theme tokens, a native
modal right-side drawer with Escape/outside-click dismissal and focus restoration,
a separate confirmation dialog, toasts, explicit errors, and optional
**Send to agent** error handoff.
UI confirmation is a workflow safeguard, not a credential boundary: processes
running as the same OS user can read the loopback token and invoke `gh` themselves.
Run only trusted code with maintainer credentials. External issue/source text is
untrusted evidence; prompt boundaries are not guaranteed injection protection.
There is no transactional compare-and-swap between GitHub reads and posting.
Avoid simultaneous manual commands while publishing.

## Requirements and agent actions

Requires authenticated `gh` with maintainer write access to
`github/awesome-copilot`, a session workspace, and native background task support
for optional AI reviews.

Agent actions: `get_board`, `list_reports`, `import_report`, `select_report`,
`start_review`, `record_review`, `fail_review`. None posts commands, updates
private notes, moves cards, or starts follow-up decisions.

## Regression tests

From the repository root:

```sh
node --experimental-vm-modules --test .github/scripts/canvas/boards/external-plugin-rereview-board/*.test.mjs
```

Tests use fake GitHub clients and SDK modules; they never post to GitHub or start
real background reviews.
