---
name: flowstudio-power-apps-canvas-ship
description: >-
  Push and publish Power Apps canvas app changes through FlowStudio MCP, and
  get out of trouble: refused pushes, apps that call flows, damaged drafts and
  Power Apps Studio saving over your work. Load this skill when asked to: push
  or publish canvas app changes, recover from a push refused because the app
  moved, fix a push that fails on a deleted flow, spot a damaged draft or
  restore a good version, or work alongside an open Power Apps Studio session.
  Requires a FlowStudio MCP subscription; see https://mcp.flowstudio.app
---

# Shipping Power Apps Canvas App Changes with FlowStudio MCP

The last mile: getting a checked change live, and getting out of trouble when
a push is refused or a draft is damaged.

**Prerequisite**: The `flowstudio-power-apps-canvas-mcp` skill (sessions, draft versus
live) and `flowstudio-power-apps-canvas-edit` (how the edits were staged).
Subscribe at https://mcp.flowstudio.app

---

## Source of Truth

> **Always call `tool_search` with `"skill:canvas-app"` first** to confirm tool
> names and parameter schemas. They change between server versions.
> This skill covers behavior the schemas cannot tell you. Tool behavior was
> checked on the production server on 2026-11-20; lines marked "on a real app"
> come from customer apps built between August and November 2026. If what a
> response shows actually happened disagrees with this file, the response
> wins. The server's general guidance text does not override the warnings
> here.

---

## Every Step, Every Time

A change is not shipped until every step passes.

1. **Preview.** `diff_canvas_app` from `base` to `session` shows what the push
   will import, control by control. Read the per-control changes, not the
   summary counts ("Versions and Diffs" in `flowstudio-power-apps-canvas-read`).
   `check_canvas_formula` with no formula should show only findings you have
   judged. Also diff `published` to `session`: the base can already hold
   someone else's unpublished work, and step 3 releases that too. If it shows
   changes that are not yours, ask the person before publishing.
   - After a `renameScreen`, that screen's `Src/<Screen>.pa.yaml` will hold
     only the screen name. Push the rename on its own, then stop before
     publishing and ask the person to open the app in Studio and check that
     screen ("Renaming screens" in `flowstudio-power-apps-canvas-edit`).
   - If Microsoft's canvas authoring MCP server is also connected, its
     `compile_canvas` parses `Src/*.pa.yaml` without Studio and reports the
     YAML errors that stop Studio opening an app. Use it with care: authoring
     and validation sessions can hold the app's edit lease, and one saved a
     near-empty app as the head on a real app
     ([refusal-recovery.md](references/refusal-recovery.md)). Afterwards check
     `list_canvas_app_versions` for an unexpected `Autosaved` version, and ask
     the person to close the tool when you are done.
2. **Push.** `update_canvas_app` with `push: true` and a short
   `commitMessage` (FlowStudio appends ` #flowstudio-mcp`). You can send the
   last edits and `push: true` in the same call, but then step 1 never saw
   them; do that only for edits you have already dry-run. Check:
   - `pushed: true` and `landedAs: "draft"`;
   - no `notMatched`. Anything listed there is **not** in the draft, even
     though the push went ahead: fix it and push again before publishing;
   - no `laterVersionWarning`. If it is there, a version saved after your
     push differs from it: do not publish. Diff `landedAsVersion` to
     `laterVersion` and treat it as a base-moved case;
   - `landedAsVersion`: note it;
   - `files` (`replaced`, `added`, `deleted`) matches the size of your change.
3. **Publish**, only when the person asked for it or approves it.
   `publish_canvas_app` takes no version: it publishes the app's
   newest version, whoever saved it. First check that the newest row of
   `list_canvas_app_versions` is your `landedAsVersion`. Then publish and
   check `published: true`. Publishing is asynchronous; the old version can
   serve for a few seconds, and people with the app open must reload it.
   Publish makes the draft live in place: the version keeps its id and commit
   message (also seen on a real app), and it cannot add a note.
4. **Read back.** `list_canvas_app_versions` should show your version with
   `isLive: true` (if `isPublishing` is still `true`, wait a few seconds and
   list again). Then `describe_canvas_control` with
   `definition: "published"` on every control you changed, and compare.
5. **Report** the live version id, what changed, and what the person should
   open to see it. No canvas tool returns a play link: ask them to open the
   app from make.powerapps.com, Apps, Play. (The link usually has the form
   `https://apps.powerapps.com/play/e/<environment id>/a/<app id>`; not
   checked here.)

If the person asked only to push or save a draft, stop after step 2 and
report `landedAsVersion` as a draft that users do not see yet. Otherwise
never report done from the push alone: a push creates a draft that nobody runs.

---

## Push Outcomes

| Outcome | What you see | Do |
|---|---|---|
| Pushed | `pushed: true` | check `notMatched` and `laterVersionWarning` (step 2), then publish when ready |
| Refused | `pushed: false` and a `refused` object | read `reason` and `howToProceed` |
| Still importing | `importing`, or `session.import.state: "running"` | resume with `push: true` and no new edits; if it stays running, follow "Long Calls and Timeouts" in `flowstudio-power-apps-canvas-mcp` |
| Long call | `taskId` with `status: "working"` | poll `get_task` every `pollIntervalMs` |
| Error | the call fails | read the message; staged edits are kept |

Pushes took 13-28 seconds for small apps and 31-47 seconds for an app that
calls a flow. On a real app, one with 14 SharePoint sources and no flow took
44 seconds. Time grows with flows and data sources. Most of it is Power
Platform exporting and importing the app; the reply's `stages` shows where the
time went.

A push with nothing staged builds nothing, unless it carries a
`commitMessage`. According to the server code, that re-imports the head as a
new version carrying the note (a way to add a note, since publish cannot), and
sending the same note again answers "Already saved". This was not tested.

Two more things that can stop a push:

- **An old session.** Before you stage anything, follow the session rule in
  "The Session" in `flowstudio-power-apps-canvas-mcp`: staged edits you did not make need
  a diff and the person's say-so before you discard them.
- **Your own safety checks.** On a real app, an edit that changed who can do
  what (the list of admin emails in `App.OnStart`) was stopped by the agent's
  own permission check as a permission grant. Expect it to need the person's
  approval, and tell them before you stage it.

---

## Guards

- `expectedAppVersion` makes any `update_canvas_app` call (staging, dry run or
  push) fail unless your session is based on the version you name. It checks
  the session's base, not the live app; a version saved after your session
  started is caught by the base-moved refusal instead. Pass
  `session.basedOnVersion` (`20261120T002715Z`) or the same version's
  `appVersion` from `list_canvas_app_versions` (`2026-11-20T00:27:15Z`); both
  forms are accepted. Do not take it from `list_canvas_apps`: its
  `appVersion` is the published version, which differs from your base
  whenever there is a draft. A mismatch comes back as an **error**, not a
  refusal: `App changed since you read it (expected ..., base is ...)`.
- `editLease` in the reply (`held`, `takenOver`) says whether FlowStudio held
  Studio's edit lease during the import. `takeOverLease: true` takes it from
  an open Studio tab, which turns that tab read-only until reloaded. With no
  Studio tab open it changes nothing (`takenOver: false`). Taking over from a
  live tab was not tested. Reloading a read-only tab loses anything unsaved in
  it, so set `takeOverLease` only when the person has said their tab has no
  unsaved work and agreed to it going read-only. Without it the push still
  runs, and `editLease` reports who holds the lease.

---

## When the App Moved: Base-Moved Refusals

When someone else saves a version after your session started
(`session.baseMovedBy` above 0), the push is refused with
`reason: "base-moved"`. Nothing is written and your staged edits are kept.
(If the newer versions change nothing in the app, the push goes on top
instead and the reply says `savedOverNoChange`.) The refusal lists
`sessionBasedOn`, `liveHead`, the `newerVersions` with their commit messages,
`yourStagedFiles`, and `stagedFilesVsHead`, which names any file both sides
changed. `liveHead` is the head (the newest saved version), not the published
one; pass the refusal's value, not the `isLive` id.

First, `diff_canvas_app` with `from: "base"` and `to` set to the refusal's
`liveHead` value, to see what they changed. If most of the app's controls are
gone, stop: that is the danger case below. If it shows your own earlier pushed
changes undone, a Studio tab saved an old copy over them (see "Power Apps
Studio"); include those edits again when you replay.

If the newer versions are Studio saves (no ` #flowstudio-mcp` in the commit
message, or `Autosaved`), that tab is still open. Ask the person to save
anything they want to keep in it, then close it, or reload it after you
publish. Once you push, the tab holds an older copy and its next save,
automatic or not, reverts your push.

The refusal's `howToProceed` describes the overwrite route. These skills
still prefer replay unless `stagedFilesVsHead` names no file. Two ways
forward:

1. **Replay (preferred).** `discard_canvas_app_session`, `get_canvas_app` to
   open a session on the head, and send your `edits` again. Edits are
   property-level, so changes to different properties both survive. If the
   other writer changed a property you also set, the replay replaces their
   value: diff `base` to the head's version id first and ask the person about
   any property you both changed. Keep your edit list so a replay is one call.
2. **Overwrite.** `update_canvas_app` with `push: true` and
   `overwrite: "<liveHead>"`. Your staged files are applied on top of the
   head, so files you did not touch keep the newer content. **A file both
   sides changed takes your copy whole.** On 2026-11-20 another writer changed
   a label on a screen the push had also edited, and the overwrite push
   dropped their change without a further warning. Only overwrite when
   `stagedFilesVsHead` names no file, or the diff shows nothing in those files
   you need to keep.

**Danger case: a near-empty head.** If the head is `Autosaved` and the diff
shows most of the app's controls removed, someone saved a broken app. Do not
overwrite, replay, push or publish: any session opened on this head builds on
the broken app, an overwrite takes every file you did not stage from it, and
publish would make the broken version live. The live app is not affected;
check `isLive`. Restore the last good version first
([refusal-recovery.md](references/refusal-recovery.md)).

---

## Apps That Call Flows

- The push has a step that checks every flow the app calls still exists, but
  on 2026-11-20 it did not catch a deleted flow (below). Flows are imported as
  `Existing`, so the flows themselves are not changed (`flowsPreserved`).
  `connectionReferencesRestored` lists connections (flows, SharePoint, Office
  365 Users) the server wrote back into the app record so Studio does not show
  them as not connected; it is information, not a problem.
- **A deleted flow fails the push with a raw error**:
  `exportPackage returned 200 with no operation Location: : The provided flow '<id>' has been deleted.`
  It is not a `stale-flow-reference` refusal and carries no
  `connectionReferences` to recover with. `removeDataSource` cannot remove a
  flow either. Restore the flow (`restore_live_flow` with the id), then push
  again with no edits; your staged edits are kept.
- `checkFlowConnections` in the reply warns that an import can break the app's
  link to a flow: Studio then shows it as "Not connected" and calls fail with
  "Connection not configured for this service". Only Studio's Power Automate
  pane shows this; `list_live_connections` does not. Ask the person to check
  after any push whose reply carries `checkFlowConnections`. Whether later
  pushes keep the link was not tested.
- A refusal with `reason: "stale-flow-reference"` means the app record points
  at a flow that no longer exists. Push again with the `connectionReferences`
  value the refusal gives you. This comes from the tool description; testing
  with a deleted flow produced the raw error above instead.

---

## Copies and Solutions

- `saveAsNewApp: "<name>"` with `push: true` saves the session as a new app.
  The source is untouched apart from closing its session. **The new app is
  created published.** The reply's `appId` is the source; the new app is
  `newApp.appId`. A `fromApp` copy uses the same live lists and flows as its
  source (on a real app); expect the same from `saveAsNewApp`. See "Creating
  Apps" in `flowstudio-power-apps-canvas-edit`.
- `add_to_solution` with `app` and `solution` (unique name or id) puts the app
  in a Dataverse solution. An app outside any solution is made
  solution-aware first (`method: "makeSolutionAware"`). It counts toward the
  person's credits even during the canvas preview.

---

## Power Apps Studio

An open Studio tab is a second writer. Its saves write Studio's whole
in-memory copy of the app as the new version, which reverts pushes the tab
never saw. Studio also saves on its own (`Autosaved` versions), so not
pressing Save is not enough.

- The one hard rule: a Studio tab opened before your pushes must be reloaded
  or closed before anyone works in it. First ask whether the person has
  unsaved work there; if so, they save it before you open your session.
- A tab opened after your last push is safe until you push again. Its saves
  move the head, and your next push is refused with base-moved. Deal with the
  tab before you replay (see "When the App Moved: Base-Moved Refusals"), and
  check in the diff that your earlier pushes are still there.
- Version restores need Studio closed (it holds the edit lease).
- Judge results in the published app (its play link) after a hard reload. A
  Studio tab's editor and its preview (Play, F5) run the copy that tab loaded,
  so use them only in a tab opened after your last push.

Details and case studies are in
[studio-coexistence.md](references/studio-coexistence.md).

---

## Reference Files

- [refusal-recovery.md](references/refusal-recovery.md): restoring a good version after a broken head
- [studio-coexistence.md](references/studio-coexistence.md): how Power Apps Studio saves, the edit lease, and judging results

## Related Skills

- `flowstudio-power-apps-canvas-mcp`: sessions, draft versus live, timeouts and costs
- `flowstudio-power-apps-canvas-edit`: stage the edits you ship
- `flowstudio-power-apps-canvas-read`: diffs, versions and what is live
- `flowstudio-power-automate-debug`: diagnose a flow the app calls
