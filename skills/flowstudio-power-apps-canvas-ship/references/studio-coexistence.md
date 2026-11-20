# FlowStudio MCP: Coexisting with Power Apps Studio

Studio is a second writer with its own copy of the app in memory. A tab
opened after your last push is safe until you push again: its saves move the
head, and your next push is refused with base-moved. Once you push, that same
tab holds an old copy, and if it saves, it reverts the push. So deal with the
tab before replaying ("When the App Moved: Base-Moved Refusals" in
`flowstudio-power-apps-canvas-ship`). The risk is the save, not the open tab.

---

## 1. A Studio Save Replaces the Whole App

Studio holds the entire app in memory from the moment it opens. Its next save
writes all of it as the new version; it does not merge. Studio also saves on
its own (`Autosaved` versions). A tab opened before your pushes that saves
after them silently reverts every one of them. Seen on a real app in
September 2026: a tab opened before three pushes saved and put three buttons'
`AccessibleLabel` back to blank, with no warning. The same week another tab
stayed open through about 20 pushes and cost two refused pushes and two
detours where someone was looking at a stale copy.

What protects a push:

- The base-moved refusal protects pushes from each other and from Studio saves
  made before your push.
- During the import FlowStudio holds the edit lease when it can (`editLease`
  in the push reply). `takeOverLease: true` takes it from an open Studio tab
  so that tab cannot save over the import; the tab goes read-only until it is
  reloaded. Taking over from a live tab was not tested.
- Nothing stops a Studio tab from saving its old copy after your push
  finishes.

**Protocol:** before an editing session, ask whether the person has unsaved
work in Studio. If they do, they save it before you open your session. Then
they close Studio, or reload it after your publish before touching anything.
If a save happens mid-session, treat the head as theirs: diff, then discard,
reopen and replay your edits.

---

## 2. Studio Saves Rewrite the Package

A Studio save reorders the children in the control files while keeping the
visual order in `ZIndex` (confirmed on a real app). Never set `ZIndex` from
the order in the file after a Studio save: that makes the scrambled order
permanent (see autolayout-semantics.md in the `flowstudio-power-apps-canvas-edit`
skill). Earlier work also reported that a save can renumber
`Controls/<n>.json`, re-issue internal control ids and normalize variant names
and layout properties; that part has not been confirmed again. The canvas
tools address controls by name, so none of this breaks your edits, but your
next diff will show noise.

The server's replies say Studio rewrites every `Src/*.pa.yaml` on its next
save, which should repair YAML the tools left out of step (not tested). That
only helps if Studio can open the app: a YAML syntax error has stopped Studio
opening an app, and then there is no save to repair it.

---

## 3. The Edit Lease

Studio tabs and authoring or validation sessions hold a lease on the app.
While any holder is running the lease keeps renewing and can outlive its
documented 15-minute expiry. It blocks platform version operations (restore,
promote) with `409 AppLeaseActive`, naming the user who holds it, not the
application. The person's Studio tab, a browser preview and a local authoring
tool all look the same.

**Diagnosis order:** ask about open Studio tabs first, then local authoring
or validation tools, then retry about every 90 seconds until it lapses.

---

## Judging Results

- Studio's editor draws its own scroll and warning marks regardless of the
  app's settings, and its preview (Play, F5) runs the copy that tab loaded,
  not the head and not the published app.
- The published app (its play link) after a hard reload is the only reliable
  view. When someone reports "not fixed" from inside Studio, first ask where
  the screenshot came from: an old copy shows every bug you already fixed.
