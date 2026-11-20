---
name: flowstudio-power-apps-canvas-read
description: >-
  Inspect, audit and diagnose Power Apps canvas apps through FlowStudio MCP:
  control trees, formulas, data sources and their columns, formula checks, a
  quality score, version diffs, and what the published app actually contains.
  Load this skill when asked to: find the formula or control behind a
  behavior, check formulas for errors, list data sources and columns, score an
  app's quality, compare versions, find when something broke, or confirm what
  users are running. Requires a FlowStudio MCP subscription; see https://mcp.flowstudio.app
---

# Reading and Diagnosing Power Apps Canvas Apps with FlowStudio MCP

A read-only process for finding out what a canvas app contains, what is wrong
with it, and what changed between versions. Nothing in this skill stages or
pushes anything.

**Prerequisite**: The `flowstudio-power-apps-canvas-mcp` skill (sessions, draft versus
live, timeouts). Connection setup is in the `flowstudio-power-automate-mcp` skill.
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

## Order of Calls

1. `list_canvas_apps`: find the app id.
2. `get_canvas_app`: screens, data sources, package sizes, App Checker
   findings, and the session.
3. `list_canvas_controls`: the control tree, names and types only. Cheap.
   - `under: "<screen or control>"` narrows to one subtree.
   - `search: "<text>"` matches names and types in the app and the catalog.
4. `describe_canvas_control` with `name`: every formula on that control, its
   parent, and the package file it lives in. `depth: "all"` returns the
   subtree up to 400 controls, the fastest way to read a screen. If the reply
   says `truncated: true`, describe its containers one at a time.
5. `get_canvas_app_sources`: data sources with columns. Pass `dataSource` for
   one source in full.
6. `check_canvas_formula` with no `formula`: compiles every formula in the
   app in one call.
7. `score_canvas_app`: quality score and ranked fixes.

`describe_canvas_control` returns the formulas the app actually uses, already
resolved. You do not need to read the package JSON to find a property's value.

---

## What `get_canvas_app` Tells You

- `screens`, `screenCount`, `dataSources`, `sizes`.
- `hasUnpublishedDraft`: someone pushed or saved without publishing.
- `appChecker`: Microsoft's App Checker findings **from the last Power Apps
  Studio save**. Tool edits do not refresh it, so it can name screens that no
  longer exist, and on a real app 13 compile errors showed as zero findings
  here. Treat it as history, not current state.
- `readOnlyView`: present when you asked for a `version` or `definition`
  other than the one your session is based on. You are viewing that state,
  but edits apply to `session.basedOnVersion`.

---

## Data Sources

`get_canvas_app_sources` returns, per source:

- the name to use in formulas (a Dataverse table shows its display name, for
  example `Contacts` for the `contact` table);
- column names and types, choice values for choice columns, the key column;
- for SharePoint: whether it can filter or sort, the filter functions it
  supports, and `serverPagingOnly`;
- which connection feeds it.

A Dataverse table also brings one entry per choice column (`OptionSetInfo`)
and a views entry, so the catalog can run to dozens of rows for one table.
Flows and connectors (`ServiceInfo`) carry no columns.

The schema comes from the app package as last saved. If a SharePoint list or
Dataverse table has gained columns since, `refreshDataSource` (see
`flowstudio-power-apps-canvas-edit`) re-reads it.

---

## Checking Formulas

`check_canvas_formula` runs Microsoft's Power Fx compiler. Pass
`environmentName` and `app` so the scope is built from the app's real controls
and columns. Add `screen` to narrow the scope to one screen, and `control` to
put `Self` and `Parent` in scope. With neither `formula` nor `formulas` it
checks every formula in the app.

It reliably caught, in testing:

- a missing closing bracket, with the character position;
- a misspelled column in a SharePoint list or Dataverse table;
- a control that had since been renamed;
- an output property the control does not have (for example `.Value` on the
  new modern text input, which outputs `.Text`).

SharePoint choice columns (`Status.Value`), person columns and
`Patch(list, Defaults(list), {...})` check clean on 2026-11-20 (earlier
versions of the checker flagged them).

It reports these as problems when they are not:

- connector calls such as `Office365Users.MyProfileV2()` and flow calls such
  as `'Greeting-Flow'.Run(...)` ("unknown or unsupported function");
- a reference to a control on another screen, even in a whole-app check
  (Power Apps allows it);
- `TriggerOutput.Keypress` and similar enum values the checker was not given;
  every new modern text input has one;
- typed functions on a collection column, such as
  `Text(ThisItem.Amount, "$0.00")`, because collection columns are not in the
  package;
- `Value`, the output column of `Distinct` in current apps: it says `Value`
  is "not recognised". (It also rejects `Result`, which is right in a current
  app; older apps, where `Result` is the name, were not tested.)

It misses these, or reports them only vaguely:

- `Navigate(...)` in a screen's `OnVisible`. The checker does not know which
  property a formula is for, and a dry run `setProperty` gives no warning
  either; Studio reported it as an error on a real app.
- A column named in quotes, as in `Sort(Distinct(list, Origin), "Result")`. A
  quoted name is a text constant, so nothing is sorted. The checker shows only
  a general "Arguments were rejected" line that does not name the column.
  That line usually follows another finding; when it is the only one and an
  argument holds a quoted column name, suspect this mistake.

`check_canvas_formula` findings are warnings and never block an edit. Judge
each one. (`update_canvas_app` does refuse one kind of formula: unbalanced
brackets or quotes; see `flowstudio-power-apps-canvas-edit`.)

`check_canvas_formula` with `layout: true` lists layout suggestions instead,
mostly from Microsoft's layout guidance and some from FlowStudio's own
measurements. Each names its source.

---

## Scoring

`score_canvas_app` scores the app 0-10 across function, data, feedback,
errors and recovery, layout, scrolling, responsiveness, navigation, forms,
accessibility, copy, first use, typography, color, consistency, performance,
and trust and privacy. `toImprove` ranks fixes by score gain. `screen`
narrows the findings list; the score stays the whole app's. It always scores
the current state (staged edits included) and takes no `version`. Every push
and publish response also carries the score.

`certainty: "heuristic"` findings can be wrong for a given app. `"certain"`
ones come from the app's structure, but on 2026-11-20 it marked the column
controls of a new `Table` as zero-size, and whether they really were was not
checked. Check before deleting or resizing anything.

---

## Versions and Diffs

- `list_canvas_app_versions`: `isLive: true` is what users run. Drafts are
  versioned too. `top` defaults to 20; if no returned row has `isLive: true`,
  call again with a larger `top` (the reply's `count` is the total).
- `get_canvas_app`, `list_canvas_controls`, `describe_canvas_control`,
  `get_canvas_app_sources`, `get_canvas_app_files` and `check_canvas_formula`
  take `version` (an id from that list) or
  `definition: "published" | "draft" | "latest"`. Reading an old version does
  not disturb the session.
- **With no `definition`, or `definition: "latest"`, a read shows your
  session's base plus your staged edits.** With nothing staged that is the
  head (the newest saved version, whatever its state); after a push the head
  is your draft, so it shows unpublished work as if users had it. If the app
  was saved after you staged something, it still shows your old base: read
  the head by its `version` id. Pass `definition: "published"` for what users
  run. `"draft"` is the newest version marked `Draft` only, so it skips Studio
  autosaves and publishes.
- `lifeCycleId: "Published"` on an app in `list_canvas_apps` describes the app
  record, not a version. Only `isLive` in the versions list says what users
  run.
- `diff_canvas_app` takes `from` and `to`: a version id, or `published`,
  `draft`, `session` (your staged edits) or `base` (the version your session
  started from). `name` limits it to one screen.
  - `base` to `session` is what you are about to push.
  - `base` to the head's version id (the newest row in
    `list_canvas_app_versions`, or the `liveHead` a refusal gives you) is what
    moved under you. `base` to `draft` misses Studio autosaves and publishes.

Reading a diff: trust the per-control changes more than the summary.

- `screens[].propertiesChanged` gives control, property, `from` and `to`.
- A renamed screen shows as one screen removed and one added, and its file can
  appear in both `files.added` and `files.removed`.
- Controls inside an added screen are not counted in `summary.controlsAdded`;
  look at `screensAdded[].controls`. Controls inside a removed screen may be
  missing from the counts the same way.
- `identical: true` covers control trees only. Check `files` for data sources,
  settings (`Properties.json`) and connections (`References/*`). A warning
  about unreadable screens means the diff is incomplete.
- For `base` to `session`, the byte counts under `files.changed` are not
  reliable. Use them only between two saved versions.

To find when something broke, read the property at successive versions with
`describe_canvas_control` and `version`.

---

## Confirming What Is Live

Users run the last published version. A Studio tab's editor and its preview
(Play, F5) run the copy that tab loaded. To state what users see:

1. `list_canvas_app_versions` and take the `isLive: true` version, or pass
   `definition: "published"`.
2. `describe_canvas_control` on the control at that version.

If a screenshot disagrees with your read, ask where it came from. A Studio tab
opened before your last push shows an old copy. Publishing takes a few seconds
to reach users, and an app someone already has open may need a reload.

---

## Package Files

`get_canvas_app_files` with no `paths` lists every file; with `paths` it
returns content (text inline, images as base64). `offset` and `length` are in
bytes and apply to every path in the call, so read large files one at a time.
A window can end in the middle of a multi-byte character (a dash or curly
quote), which shows as `�`; that is the window, not damage.

| File | Holds |
|---|---|
| `Controls/<n>.json` | one screen's control tree: what the app runs |
| one `Controls/<n>.json`, usually `1.json` | the App object: `OnStart`, `Formulas`, `StartScreen`; edit with `update_canvas_app`, screen and control `App` |
| `Src/<Screen>.pa.yaml` | a YAML copy of the same controls. The app does not run from it, but Studio parses it when it opens the app |
| `References/DataSources.json` | data sources and their cached schema |
| `References/Resources.json` | images and other media the app can use by name |
| `Properties.json` | app settings: design size, scale to fit, and `DefaultConnectedDataSourceMaxGetRowsCount` |

**The YAML matters to Studio.** The player runs `Controls/*.json`, and the
server's replies call the YAML a copy regenerated from it. But Studio parses
`Src/*.pa.yaml` when it opens an app. On a real app (August 2026) one YAML
syntax error stopped Studio opening the app (`ErrOpeningDocument_UnknownError`)
while the player ran it fine, and a Studio that cannot open the app cannot
save it to repair the file. Two ways the YAML falls out of step, both seen on
2026-11-20:

- After a `renameScreen` edit, that screen's `Src/<Screen>.pa.yaml` was
  rewritten with only the screen name and no controls, and later edits did not
  rebuild it. What Studio does with that file has not been checked.
- A YAML file written with `update_canvas_app_files` is pushed as written while
  the controls keep their old values.

Read controls with `describe_canvas_control`, not the YAML. Check the YAML
when someone says Studio will not open an app.

---

## Worth Reporting to the Person

- The head is `Autosaved` with far fewer controls than the live version:
  someone saved a near-empty app. Do not push, publish, overwrite or replay
  edits; see `flowstudio-power-apps-canvas-ship`.
- `baseMovedBy` above 0: someone else changed the app since you opened it.
- A screen nothing navigates to, or controls with zero size (from the score).
- "Records are missing": read `DefaultConnectedDataSourceMaxGetRowsCount` in
  `Properties.json` (500 by default) and look for a `ClearCollect`, or a
  `Filter` or `Sort` the data source cannot run itself, over a large list.
  Such reads stop at that many rows with no error. On a real app admins saw
  500 of 521 rows this way. Neither the checker nor the score flags it.
- An app that calls flows: every push reply carries `checkFlowConnections`,
  warning that an import can break the app's link to a flow. Only Power Apps
  Studio shows it ("Not connected"); `list_live_connections` cannot.

---

## Related Skills

- `flowstudio-power-apps-canvas-mcp`: sessions, draft versus live, timeouts and costs
- `flowstudio-power-apps-canvas-edit`: change what you found
- `flowstudio-power-apps-canvas-ship`: push and publish, recover a damaged head
- `flowstudio-power-automate-debug`: diagnose a flow the app calls
