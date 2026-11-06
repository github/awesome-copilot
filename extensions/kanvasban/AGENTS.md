# Kanvasban agent workflow

Use the shared Kanvasban canvas to coordinate implementation work with humans
and other agents. Do not maintain a separate backlog or overwrite its JSON file.

This guide accompanies the Kanvasban plugin; it is not a global instruction
file. All repositories using the same Copilot home share one personal board.
Choose the appropriate project explicitly rather than assuming the active
workspace or human-selected project determines action scope.

1. Discover `kanvasban` with `list_canvas_capabilities`.
2. Open it with `open_canvas` and a stable instance ID for your session. It takes no input.
3. Call `listProjects` using `invoke_canvas_action`, then
   `listStories` with `{ "projectId": "<project UUID>" }` before choosing work.
   Omitting projectId lists all projects, not just the human's selected project.
   Use `createProject` with `name` and optional `description`, or `updateProject`
   with `id`, `name`, and optional `description`. Project deletion is not exposed.
4. Use `addStory` for new work (title, description, acceptanceCriteria, priority,
   type, parentFeatureId, projectId). `type` is `feature` or `user-story` (default).
   User stories may optionally reference a Feature's full UUID in
   `parentFeatureId`; standalone stories are valid. Features cannot have parents.
   Always include projectId from listProjects; it is required when multiple
   projects exist. Parent Features must belong to the same project.
   Item projectId is immutable. `listStories` returns both item types. The action names remain compatible.
5. Use `updateStory` with the full story UUID to mark work `in-progress` before
   implementing it and `done` only after verification. Status values are
   `backlog`, `ready`, `in-progress`, `done`, and `cancelled`; priorities are
   `low`, `medium`, and `high`. Ready is between Backlog and In progress;
   the far-right Cancel column uses `cancelled`.
   Use `parentFeatureId: null` to unlink a story. Cancelling a Feature does not
   cancel its children; coordinate those decisions explicitly.
6. Re-read `listStories` at task boundaries to see human and other agent changes.
   Do not take over an in-progress story without coordination. These actions do
   not implement exclusive assignment or automatic task claiming.
7. Normally use `updateStory` with `status: "cancelled"` instead of deletion.
   Use `deleteStory` only when explicitly requested or to remove your own test data.
   A Feature with children cannot be deleted or converted to a user story until
   the children are unlinked or reassigned.
8. `listStories` returns shared manual order (filter by status for column order).
   Use `reorderStory` with `id`, `beforeId` (another item in the destination
   column, or null for the bottom), optional `status`, and optional `actor`.
   Reordering and column changes are atomic and recorded in history.
   Do not rewrite the full array or use priority to simulate ordering.
   Human Group by None/Feature is view-only: Features and stories can mix in
   None, while Feature nests linked stories in their own status columns.
   Reordering does not change parent links or move a Feature's children.
   Reorder targets must belong to the same project as the moved item.

Humans see action changes automatically through the board's live stream.
Use `changeComment` with item `id`, `operation` (`add`, `edit`, `delete`),
`body` for add/edit, and `commentId` for edit/delete. Supply `actor` to identify
your agent; canvas actions default to `Agent`, browser comments to `Human`.
These are editable display labels, not authenticated identities or permissions.
`listStories` includes comments and read-only history. Item creation, actual field
changes and comment changes are recorded automatically; no-op updates are not.
Comment deletion is soft deletion; previous text remains visible in history.
Legacy items start with empty activity: past changes cannot be reconstructed. Agents
get current state when calling `listStories`; canvas updates do not automatically
wake agents or inject new messages into their conversations.

The canonical, versioned data is
`extension-data/kanvasban/backlog.json` under Copilot home: use nonempty
`COPILOT_HOME` exactly as provided, otherwise `~/.copilot`. Canvas instances and
repositories using that home are views of the same personal file, not separate
boards. Code is shipped separately by the Kanvasban plugin.
If the store is missing, first use creates a Hello world project, one Feature,
and one linked user story. Existing stores are never reseeded; invalid or
unreadable stores produce errors instead of being overwritten.
Format `kanvasban`, version 2 stores `projects` and project-scoped `stories`.
Archived items remain in action results and snapshots with an `archivedAt`
timestamp but are hidden on the board. Use `updateStory` with `archived: true`
to archive or `archived: false` to restore. Archiving is not deletion and does
not change status or archive a Feature's children.
Copilot hosts must
support SDK canvas extensions to use these tools. If the canvas is
unavailable, report that limitation rather than claiming a board update succeeded.
