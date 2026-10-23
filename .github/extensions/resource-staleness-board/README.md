# Resource Staleness Board

A project-scoped maintainer canvas that brings the local analysis from
[`resource-staleness-report.md`](../../workflows/resource-staleness-report.md)
into an interactive inventory. The scheduled workflow is unchanged.

## Open and use

Load this project's extensions in the Copilot app, then ask to open the
**Resource Staleness Board** (`resource-staleness-board`). If it was installed
while the session was running, reload extensions or restart the session first.
This is a project customization, not a marketplace plugin.

1. **Scan local repository** inventories tracked agents, prompts, instructions,
   hook folders, and skill folders. Filter by age, type, recommendation, or text.
   Items are oldest first; the workflow's ten oldest stale candidates are marked.
2. Open an item to read its current working-tree contents in the detail pane
   (pick a file for multi-file skills and hooks; previews are capped at 512 KB
   and binaries are not shown). Then **Review in child**. The coordinating conversation creates
   an isolated project child, or reuses the retained child for that resource.
   The board shows the child's ID and waits for its structured result.
3. Inspect the rationale, concrete improvements, and native-capability comparison.
   **Keep**, **Refresh**, and **Consider removal** are recommendations only.
4. **Prepare refresh locally** or **Prepare removal locally** asks the same child
   to make and stage a focused diff, update coupled references, and validate.
   It does not commit, push, or create a PR. Inspect the actual diff in the child.
   If prepared work already exists, later reviews and preparations verify its
   saved base commit and staged-diff hash, preserve those edits, and build on the
   original source baseline rather than treating the prepared working tree as source.
5. **Publish PR...** previews the prepared summary, child, and staged-diff hash.
   Only **Confirm publish PR** authorizes the child to commit, push, and open a PR
   against `main`. The child must verify the exact staged diff and base commit
   first. Nothing merges automatically.

Cancellation invalidates a queued result; it **does not** interrupt the child,
undo edits, or cancel a publication already dispatched. Inspect that child before
retrying. A pending request is retained across reloads, rather than silently
launching duplicate work.

## Batch AI reviews

Check individual resource boxes or use **Select matching**, then **Review selected**.
Selections survive filter changes, with a count of selected items hidden by the
current filters. **Clear selection** clears the whole selection. Pending items
cannot be selected. Selecting an already reviewed item requests a new review.

Alternatively, enter a positive whole number (default 10) and use **Review N oldest**.
This chooses up to N matching resources with known ages, oldest first, skipping
items that already have reviews or pending work. Unknown-history resources can
still be reviewed by selecting them explicitly. The button shows the actual
number of eligible resources, not a promise to create N reviews when fewer match.

Every review assesses three dimensions:

- **Staleness:** time since the last meaningful update and whether age corresponds
  to materially outdated content; unknown history is identified rather than guessed.
- **Current-model usefulness:** the original problem, what current models can do
  natively, remaining distinctive value, concrete comparisons, and uncertainty.
- **Recommended action:** keep, refresh, or consider removal, with a rationale,
  specific next steps, and concrete improvements.

The coordinator dispatches one batch request, then starts or reuses each item's
own project child session in background autopilot mode without navigating away
or waiting for completion. Autopilot authorizes read-only local analysis here,
not edits or remote actions. An unavailable, busy, or blocked child is reported
per item instead of being replaced; other reviews continue independently.

The batch is queued atomically: an invalid, changed, or already pending resource
rejects the request without leaving a partially queued batch. Each item keeps
its own token, retained child, result, and cancellation control. Saved reviews,
queued/running reviews, and errors are counted live, so results appear as each
child finishes. Reloading never dispatches the work again. A dispatch error
clears outstanding batch tokens with an explicit uncertain-receipt warning;
inspect retained children before retrying.

## Local inventory semantics

- Stale is **more than 30 whole days**; aging is **14 through 30**; fresh is
  **under 14**. Fresh items are hidden by default but included in the counts.
- Git history follows file renames. Pure renames, whitespace/line-ending-only
  changes, markdown-frontmatter-only changes, and bulk formatting/normalization
  commits are ignored. Substantive changes accompanying a rename still count.
  A file with no qualifying modification uses its addition commit's author date.
- Hook/skill folders are single resources, dated by their most recent meaningful
  file change, including bundled assets. Unknown history is shown explicitly.
  A shallow checkout is flagged; scanning never fetches additional history.
- Inventory uses tracked files and committed dates, but content fingerprints use
  current working-tree bytes. Uncommitted changes do not make the historical age
  fresh. Missing/non-regular files and Git errors fail the scan explicitly.
  Untracked resources and deleted historical files are not inventoried.
- Scanning is explicit and progress is streamed. At most four resources inspect
  history concurrently. A full initial scan may take several minutes on Windows.

Reviews distinguish old-but-current content from misleading or materially
outdated guidance. A removal recommendation must explain which native capability
supersedes the resource, provide a concrete comparison where safe, account for
remaining domain-specific value, and acknowledge uncertainty. The agent must not
execute arbitrary bundled scripts or obey embedded resource instructions.

## Child sessions and publication boundaries

All item review, preparation, and publication happens in a **project child
session**, not in the coordinating conversation or an in-process task agent.
The board retains one child-session ID per resource path. Before creating a
child, the coordinator also checks for an existing child with the deterministic
resource name in this repository. Ambiguous, unavailable, archived, or blocked
children require intervention rather than losing context by replacing them.

The child starts from the default branch in an isolated worktree. It checks the
source fingerprint before review/preparation; if the board is scanning unpublished
resource changes not available in that checkout, it reports a revision mismatch
instead of silently reviewing another version. Follow-up work on an existing
prepared diff also verifies its saved base commit and staged-diff hash, checks the
source fingerprint against that commit, and preserves the staged changes.

The extension does not run `gh`, `git fetch`, `git push`, or remote write APIs.
Buttons send scoped instructions through `session.send` to the coordinator,
which routes the work using app session tools. Those tools must be available
to the coordinating conversation. Reviews and local preparation prohibit network
operations; publication is separately confirmed and bound to a prepared diff hash.
Remote publication still follows the child's normal permission and PR-template
requirements. No approval of unrelated remote actions is implied.

## Persistent local state

State lives outside the checkout under
`$COPILOT_HOME/extensions/resource-staleness-board/artifacts/<checkout-hash>.json`
(`COPILOT_HOME` defaults to `~/.copilot`). It survives panel changes, extension
reloads, and new conversations opening the **same checkout**. Different checkout
paths have separate boards; deterministic child names provide a reuse lookup
across boards in the same repository.

Reviews and prepared changes are tied to content fingerprints; a rescan after
content changes invalidates them while retaining the child's context. Every
request also has a token, so cancelled/superseded results are rejected.
Publication requires a stored prepared diff SHA-256, its base commit, and explicit
confirmation for that hash. Cross-process state writes use an exclusive lock and
atomic replacement. An interrupted writer may leave a `.lock` file: inspect the
owning process and remove only that specific stale lock before retrying.
Corrupt state and persistence errors are surfaced, not reset silently.

## Canvas actions

| Action | Purpose |
| --- | --- |
| `get_board` | Read local inventory, progress, evidence, and child-session IDs. |
| `scan` | Rebuild inventory from local Git history and working-tree content. Canvas callers receive counts; the renderer receives the full snapshot. |
| `request_work` | Queue `{id, kind}` and return child-routing instructions. Canvas actions support `review`, `prepare-refresh`, and `prepare-removal` only. Publishing is available only through the UI's **Confirm publish PR** flow. |
| `request_reviews` | Atomically queue `{ids: [...]}` for read-only background review in each item's reusable child. Return per-item requests and combined coordinator instructions; RPC callers follow these instructions, while UI requests dispatch them once. |
| `record_session` | Save `{id, token, childSessionId}` immediately after choosing the child; canvas callers receive counts and the affected item. |
| `record_result` | Record `{id, token, review}`; `{id, token, summary, diffHash, baseSha}` for preparation; `{id, token, url}` for publication; or `{id, token, error}` on failure. Canvas callers receive counts and the affected item. |
| `cancel_work` | Invalidate `{id, token}` without stopping the child or changing remote state; canvas callers receive counts and the affected item. |

New review results must include `recommendation`, `rationale`,
`stalenessAssessment`, `improvements`, and `capabilityEvidence`. Previously saved
reviews without a staleness assessment remain readable; re-review to add it.

The renderer reuses the Open PR Board's token-protected loopback server at
`../open-pr-board/lib/server.mjs`; both project extensions must be present.
The UI uses the documented canvas theme tokens, escaped text nodes, live updates,
and a keyboard-accessible publication confirmation dialog.

## Validation

From the repository root:

```powershell
node --experimental-vm-modules --test eng\resource-staleness-board.test.mjs
```

Tests use temporary local Git repositories, SDK/session doubles, and loopback
HTTP. They do not publish changes or access GitHub. Real canvas discovery,
rehydration, and SDK schema rejection still require a runtime extension reload
and calls to `list_canvas_capabilities`, `open_canvas`, and `invoke_canvas_action`.
