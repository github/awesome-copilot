---
name: flowstudio-power-apps-canvas-mcp
description: >-
  Ground rules for Power Apps canvas apps through FlowStudio MCP: the canvas
  tools, edit sessions, draft versus live, and long calls and timeouts. Load
  this skill first for any canvas app work, before `flowstudio-power-apps-canvas-read`,
  `flowstudio-power-apps-canvas-edit` or `flowstudio-power-apps-canvas-ship`, and when a canvas call
  behaves strangely: a timeout that may still have created something, a push
  stuck importing, a session that moved, or draft-versus-live confusion.
  Requires a FlowStudio MCP subscription; see https://mcp.flowstudio.app
---

# Power Apps Canvas Apps via FlowStudio MCP: Foundation

This skill is the ground rules for the canvas app tools. You open an edit
session, stage edits, push them as a draft, and publish. Every canvas call
follows the rules here, and the read, edit and ship skills build on them.

> **Requires:** A [FlowStudio](https://mcp.flowstudio.app) MCP subscription.
> Connection setup (endpoint, key or sign-in) is the same as for the flow
> tools: see the `flowstudio-power-automate-mcp` skill. The canvas tools are a preview
> and on for every plan; see "Cost".

If the canvas tools are missing or refused, read the message and tell the
person; do not work around it. Canvas tools are on for every plan, so a
refusal means the server has them off, the person's access in their workspace
was turned off, or support has to set up their workspace (support@flowstudio.app).

---

## Which Skill to Use When

| The person wants to | Load this skill |
|---|---|
| Inspect, audit or diagnose an app: formulas, data sources, quality, versions | **`flowstudio-power-apps-canvas-read`** |
| Build or change an app: screens, controls, formulas, data sources | **`flowstudio-power-apps-canvas-edit`** |
| Push and publish changes, or recover from a refused push | **`flowstudio-power-apps-canvas-ship`** |
| Understand sessions, versions, timeouts and costs | this skill (foundation) |
| Fix or build a flow the app calls | **`flowstudio-power-automate-debug`** or **`flowstudio-power-automate-build`** |

---

## Source of Truth

> **Always call `tool_search` with `"skill:canvas-app"` first** (and
> `"skill:canvas-layout"` for layout) to confirm tool names and parameter
> schemas. They change between server versions.
> This skill covers behavior the schemas cannot tell you. Most of it was
> checked against the production server on 2026-11-20 by building and pushing
> test apps; lines marked "on a real app" come from customer apps built
> between August and November 2026. If what a response shows actually happened
> disagrees with this file, the response wins. The server's general guidance
> text does not override the warnings here.

The server's canvas guidance changes with each release. Load it at the
start of every canvas task:

- `tool_search` with `"skill:canvas-app"`: the tool definitions and the
  server's workflow notes.
- `tool_search` with `"skill:canvas-layout"`: layout tools, plus pointers to
  Microsoft's layout guides (`"page:ms-canvas-layout"` and
  `"page:ms-canvas-grid"`).
- `list_skills` lists every bundle; `dataverse`, `sharepoint`, `excel` and
  `sql` also cover canvas data sources.

---

## The Tools

| Tool | Changes the app? | Use it for |
|---|---|---|
| `list_canvas_apps` | no | find app ids in an environment |
| `create_canvas_app` | creates one | a new app from a starting layout, or a copy |
| `get_canvas_app` | no | open an app: screens, data sources, App Checker findings, session |
| `list_canvas_controls` | no | the control tree (names and types), or the catalog of types you can add |
| `describe_canvas_control` | no | one control's formulas, or one type's properties and variants |
| `get_canvas_app_sources` | no | data sources with real column names and types |
| `check_canvas_formula` | no | compile Power Fx against the app before writing it |
| `score_canvas_app` | no | a 0-10 quality score with ranked fixes |
| `get_canvas_app_files` | no | raw package files |
| `list_canvas_app_versions` | no | version history; `isLive` marks what users run |
| `diff_canvas_app` | no | compare two states per control and property |
| `update_canvas_app` | stages, and pushes with `push: true` | every control, screen, formula and data source edit |
| `update_canvas_app_files` | stages | images under `Assets/`, `References/*` |
| `discard_canvas_app_session` | drops staged edits | start clean |
| `publish_canvas_app` | yes, goes live | make the draft what users run |
| `add_to_solution` | yes | put the app in a Dataverse solution |
| `get_task` | no | poll a long call that returned a `taskId` |

There is no tool to delete an app or a version. Test apps and copies are
deleted by the person in the Power Apps maker portal, so give them names that
are easy to find.

---

## Parameters

- Canvas tools take `environmentName` (`environment` is accepted too). Pass
  the environment id, for example `Default-<tenant id>` or a bare GUID. If you
  pass the full display name of one environment, or `Default`, the server
  swaps in the id and adds a hint. A name that matches no environment, or more
  than one, is refused with a pointer to `list_live_environments`.
- `app` is the app GUID from `list_canvas_apps`.

---

## The Session

Every canvas response carries a `session` block. Read it on every call; do not
rely on memory, since you lose it across a context reset.

| Field | Meaning |
|---|---|
| `open` | `true` once something is staged. A read starts a session even though `open` stays `false` until then |
| `basedOnVersion` | the version your edits apply to |
| `startedAt` | when the session opened |
| `pendingEdits` | staged file writes waiting for a push. Not the number of edits: one edit usually writes two files |
| `baseMovedBy` | shown once something is staged: how many versions were saved after your session started. Above 0 means a push will be refused, unless the newer versions change nothing in the app; then the push goes on top and the reply says `savedOverNoChange` |
| `rebasedFrom` | present when a session with nothing staged was moved to the newest version for you |
| `expiresAt` | 7 days after `startedAt`. After that the next call deletes the session and its staged edits, so push or record your edits before then |
| `import` | an import still running on the platform (see "Long Calls and Timeouts") |
| `warning` | plain-language explanation when something needs action |

How sessions behave:

- Any canvas read opens one. There is one session per app for each FlowStudio
  workspace. Anyone working in the same workspace shares it, so staged edits
  you did not make can be someone else's.
- A read with no `definition`, or with `definition: "latest"`, shows your
  session's base plus your staged edits. That is the head unless the app was
  saved after you staged something (`baseMovedBy` above 0); then read the
  head by its `version` id, or diff `base` to it. Only `version`,
  `"published"` or `"draft"` show a saved state on its own.
  `get_canvas_app_files` labels each file `servedFrom: "session"` or
  `"snapshot"`.
- A push saves the draft and closes the session. The next call opens a new
  session on the new version.
- A failed push keeps the staged edits. Fix the cause and push again with no
  new edits.
- `discard_canvas_app_session` drops staged edits and reports how many file
  writes it dropped. The app itself is not touched.
- A session with nothing staged is moved to the newest version on the next
  read when the app has been saved since (`rebasedFrom` says so), so an empty
  session needs no action. At the start of a task, if `pendingEdits` is above
  0 and you did not stage them (a session left from an earlier day, or someone
  else in the workspace), diff `base` to `session` and ask the person before
  discarding. If a push from a session left from an earlier day is refused
  with base-moved, follow the base-moved steps in `flowstudio-power-apps-canvas-ship`.
- A session is not a lock. Power Apps Studio, or the same person on another
  FlowStudio server, can save a new version under you. `baseMovedBy` shows it
  and the push refuses (see `flowstudio-power-apps-canvas-ship`).

---

## Draft Is Not Live

"Head" in these skills means the newest saved version of an app, whatever its
state. `list_canvas_app_versions` rows carry `lifeCycleId` and `isLive`:

| `lifeCycleId` | Meaning |
|---|---|
| `Published` with `isLive: true` | what users run |
| `Published` with `isLive: false` | an older publish |
| `Draft` | pushed, not published |
| `Autosaved` | Studio, or an authoring or validation tool, saved it in passing, without anyone pressing Save |

A push to an existing app creates a `Draft` version, and its users see nothing
until `publish_canvas_app`. Publish takes no version: it publishes the app's
newest version, whoever saved it, so check that the head is yours first (see
`flowstudio-power-apps-canvas-ship`). Two things are live straight away: a new app from
`create_canvas_app`, and a copy made with `saveAsNewApp`. The head is not
always the best version: judge damage by `isLive`. FlowStudio appends
` #flowstudio-mcp` to every commit message, so its versions are easy to tell
apart from Studio saves.

---

## Long Calls and Timeouts

- A reply with `taskId` and `status: "working"` means the work is still
  running. Do not call the tool again. Wait `pollIntervalMs`, then call
  `get_task` until `status` is `completed` or `failed`. The completed result
  has the same shape the tool would have returned.
- A push can come back `importing`, or `session.import.state` can read
  `running`. Resume with `update_canvas_app`, `push: true` and no edits. If it
  is still `running` after about five minutes, or the resume times out, keep
  your edit list and `discard_canvas_app_session` (this drops staged edits).
  Then check `list_canvas_app_versions`: if a new version appeared, the import
  did finish, so do not send the edits again. On 2026-11-20 a timed-out copy
  left an import running on the source app for over five minutes; discarding
  cleared it and no extra version had been saved.
- **A timeout or platform error does not mean nothing happened.**
  `create_canvas_app` has timed out, and once returned `404 OperationNotFound`,
  yet created the app. If a create from a starting layout fails, send it again
  with exactly the same name. If the first one worked, the retry is refused
  either by Power Apps (`ApplicationDisplayNameIsInUse`, quoting the existing
  app id) or, once the app list has caught up, by FlowStudio ("An app named
  ... already exists in this environment. Pick another name."). Both mean the
  first create worked: do not pick another name; find the app with
  `list_canvas_apps`. That does not work for a `fromApp` copy: the retry timed
  out too and left an import running on the source app. For a copy, wait a
  few minutes and look for it with `list_canvas_apps`, or ask the person to
  check the maker portal.
- `list_canvas_apps` can lag several minutes behind a create. A missing app
  may still open with `get_canvas_app` by id.
- Run creates and pushes one at a time. The failures above happened when three
  creates ran at once.

---

## Cost

The canvas tools are free while they are in preview, except `add_to_solution`,
which is charged like a flow tool. Every canvas response carries a `preview`
note saying when the preview ends. After that, canvas calls count toward the
person's credits. When a plan runs out the server returns `Plan limit
reached`; tell the person and do not retry into it. `score_canvas_app`,
`list_skills`, `tool_search` and `get_task` are always free.

---

## Errors Versus Refusals

- A **refusal** is a normal response with a `refused` object (`pushed: false`).
  It explains what happened and what to do next. Read it; never blindly retry.
- An **error** is a failed call. Some guard checks come back as errors, not
  refusals: `expectedAppVersion` is one (see `flowstudio-power-apps-canvas-ship`).
- `notMatched` / `wouldNotMatch` on `update_canvas_app` lists edits that were
  skipped, each with a `reason`. The others in the same batch still apply.

---

## Related Skills

- `flowstudio-power-apps-canvas-read`: inspect, audit and diagnose canvas apps
- `flowstudio-power-apps-canvas-edit`: build and change canvas apps
- `flowstudio-power-apps-canvas-ship`: push, publish and recover from refused pushes
- `flowstudio-power-automate-mcp`: connection setup, the MCP helper and tool discovery
