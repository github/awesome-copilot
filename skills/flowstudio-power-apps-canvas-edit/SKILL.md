---
name: flowstudio-power-apps-canvas-edit
description: >-
  Build and change Power Apps canvas apps through FlowStudio MCP: create apps,
  add and restyle screens and controls, write Power Fx, build galleries, and
  connect Dataverse, SharePoint, connectors and flows, all as named edits the
  server checks. Load this skill when asked to: create an app, add or change a
  screen or control, write or fix a Power Fx formula, add a gallery or table,
  connect a data source or flow, fix a layout, or improve an app's quality
  score. Requires a FlowStudio MCP subscription; see https://mcp.flowstudio.app
---

# Building and Editing Power Apps Canvas Apps with FlowStudio MCP

All edits go through `update_canvas_app` as named operations: set a property,
add a control, rename a screen. The server writes the package files, keeps
control ids unique, rewrites the YAML for most edits (not after
`renameScreen`, see "Renaming screens") and checks every formula. Do not edit
`Controls/*.json` or `Src/*.pa.yaml` by hand.

**Prerequisite**: The `flowstudio-power-apps-canvas-mcp` skill (sessions, timeouts) and,
for finding things, `flowstudio-power-apps-canvas-read`. Pushing and publishing are in
`flowstudio-power-apps-canvas-ship`. Subscribe at https://mcp.flowstudio.app

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

## Workflow

1. **Open.** For an existing app, first ask whether the person has it open in
   Power Apps Studio with unsaved work; they save it and close or reload the
   tab before you start (`flowstudio-power-apps-canvas-ship`, "Power Apps Studio"). Then
   `get_canvas_app`. If `session.pendingEdits` is above 0 and you did not
   stage them, `diff_canvas_app` from `base` to `session` shows what they
   are; ask the person before `discard_canvas_app_session` drops them.
2. **Get real names.** `list_canvas_controls` for control names,
   `describe_canvas_control` for a control's property names and current
   formulas, or for a type's properties (`name: "modernButton"`).
3. **Read the data first.** `get_canvas_app_sources` before any formula that
   touches a table, so column names are real.
4. **Check formulas before writing them.** `check_canvas_formula` with
   `formulas`, `screen` and `control`. `flowstudio-power-apps-canvas-read` lists what it
   gets wrong.
5. **Dry run.** `update_canvas_app` with `dryRun: true`. It reports `from` and
   `to` per edit and lists edits that match nothing.
6. **Stage.** The same call without `dryRun`. Read `notMatched`, `hints`,
   `defaults` and `layoutSuggestions` in the reply.
7. **Read back.** `describe_canvas_control` on what you changed.
8. **Check the whole app.** `check_canvas_formula` with no formula, then
   `score_canvas_app`. Fix what is worth fixing and repeat.
9. **Ship.** Follow `flowstudio-power-apps-canvas-ship`.

---

## How `update_canvas_app` Applies Edits

- `edits` is an ordered list and **runs in order**. After `renameControl`
  from `Label1` to `lblTitle`, every later edit in the same batch must say
  `lblTitle` (seen with a screen rename on 2026-11-20).
- **A batch is not all-or-nothing.** Edits that fail are listed in
  `notMatched` with a reason; the rest are staged. Fix and re-send only the
  failed ones.
- Formulas are Power Fx without the leading `=`. Text keeps its quotes
  (`"\"Hello\""` in JSON). Colors are `RGBA(0, 120, 212, 1)`.
- App-level formulas (`OnStart`, `Formulas`, `StartScreen`) use
  `screen: "App"` and `control: "App"`. Named formulas go in `Formulas`, for
  example `fxTotal = Sum(colExpenses, Amount);`.
- Most formula problems come back as warnings and the edit is still staged,
  so read the warnings. A formula with unbalanced brackets or quotes is
  refused ("structurally invalid and was NOT staged") and listed in
  `notMatched`; the rest of the batch still applies, and a push in the same
  call goes ahead without it.

| `op` | Does | Seen in testing |
|---|---|---|
| `setProperty` (default) | writes `formula` to `property` | reply shows `from` and `to` |
| `removeProperty` | reverts a property to its default | the way to drop an unwanted formula |
| `addControl` | adds `control` of `type` under `parent` | see "Adding Controls" |
| `moveControl` | changes `parent` and/or position | `after` worked; `before` and `position` are from the tool description |
| `renameControl` | renames and rewrites every formula that uses it | reply gives `formulasRewritten` |
| `deleteControl` | removes a control | refused while formulas use it, listing them; `force: true` overrides |
| `addScreen` | adds an empty screen, last in order | `App.StartScreen` is untouched |
| `renameScreen` | renames and rewrites `Navigate` calls | empties that screen's YAML file; see "Renaming screens" |
| `deleteScreen` | removes a screen | refused while anything navigates to it; `force: true` overrides (fix the `Navigate` calls first) |
| `addDataSource` | Dataverse table, SharePoint list, connector or flow | see "Data Sources" |
| `refreshDataSource` | re-reads a source's schema | worked for all four kinds |
| `removeDataSource` | removes a table or list | refused while formulas use it; `force: true` overrides according to the tool description (not tested); does not handle connectors or flows |
| `addFlow` | same as `addDataSource` with `flow` | seen in a dry run only |

---

## Adding Controls

### Type names

`type` takes the YAML type name. In an app with modern controls (the default
for new apps) the server builds the modern version; `modern: false` gives the
classic one. The table uses the names the reply's `type` field gives:

| `type` | Modern app builds | Classic app builds |
|---|---|---|
| `Label` | `ModernText` (a text label) | `Label` |
| `Text` | **`ModernTextInput` (an input box)** | `Classic/TextInput`, per the server's hint |
| `TextInput` | `ModernTextInput` | `Classic/TextInput` |
| `Button` | `ModernButton` | `Classic/Button` |
| `Gallery` | `Gallery` | not tested |
| `Image` | `Image` (not tested) | not tested |
| `Table` | `Table` (the modern data table) | not tested |
| `Toggle` | not tested | `Classic/Toggle` |
| `Dropdown` | not tested | `Classic/DropDown` |

Galleries and images have one generation, used by modern and classic apps
alike. **`Text` builds an input box, not a label.** Use `Label` for display
text. The reply's `type` field says what was actually built; check it.
`list_canvas_controls` with `in: "catalog"` lists every type you can add.

### New controls can copy formulas from an existing one

When the app already has a control of the same type, `addControl` models the
new one on it (`modelledOn` in the reply). Normally it drops the model's own
settings. Seen on 2026-11-20, it copied them instead:

- a new label got `Size: 20` from the title label (listed in `defaults`);
- two new buttons got the first button's `DisplayMode` formula, which
  disabled them whenever two unrelated text boxes were empty. One of the two
  replies did not mention it.

In both cases the model control sat on a screen whose YAML a `renameScreen`
had emptied; one of the new buttons went on a different screen and still
copied. The server reads the model's own settings from the model's screen
YAML to know what to drop, and with nothing there it keeps everything except
`On...` formulas. So expect copying whenever the model is on such a screen,
wherever the new control goes, and in older apps with no YAML at all (read
from the server code, not tested).

After every `addControl`, `describe_canvas_control` the new control and
`removeProperty` anything it should not have, behavior formulas above all
(`DisplayMode`, `Visible`). Set every property you care about explicitly in
`properties`. `copyFrom` copies a chosen control on purpose.

### Where it goes

- `parent` is the container (or gallery) to put it in; the default is the
  screen.
- In an AutoLayout container, order is reading order. Use `before`, `after`
  or `position`. `X` and `Y` are ignored.
- On a screen or inside a gallery, controls are placed by `X` and `Y`; order
  only decides which paints on top.
- Starting layouts from `create_canvas_app` and their containers:
  - `responsive`: `HeaderContainer1`, `MainContainer1`, `FooterContainer1`
    inside `ScreenContainer1`
  - `sidebar`: `HeaderContainer1`, `SidebarContainer1`, `MainContainer1`
  - `split-screen`: `LeftContainer1`, `RightContainer1`
  - `phone`, `tablet`: an empty screen, controls by `X` and `Y`
- `addScreen` gives an empty screen with no containers, even in a responsive
  app. Place controls by `X` and `Y`.

Act on what the reply says about the new control:

- `hints`, for example a missing `AccessibleLabel`. App Checker flags it on
  modern buttons and icons, data tables, classic text inputs, combo boxes and
  toggles, and galleries, not on labels or classic buttons.
- `layoutSuggestions`, for example `text-height` (a modern text label too
  short for its font shows a scrollbar) and `input-label` (an input with no
  visible label beside it).

### Renaming screens

On 2026-11-20 `renameScreen` left the renamed screen's `Src/<Screen>.pa.yaml`
holding only the screen name, and later edits did not rebuild it. Studio
parses that file when it opens the app (see "Images and Other Package Files"
below, and "Package Files" in `flowstudio-power-apps-canvas-read`), so the app may open
with that screen empty, or not open at all; this was not checked. The model
controls in "New controls can copy formulas from an existing one" sat on that
screen. Until the server is fixed:

- Name screens when you create them with `addScreen` rather than renaming.
  For the first screen `create_canvas_app` makes, keep its name (`Screen1`).
  In a `phone` or `tablet` app you can instead add a named screen, set
  `App.StartScreen` to it, and delete the first (not tested). In a
  `responsive`, `sidebar` or `split-screen` app that loses the starting
  containers, so keep `Screen1` there.
- If a screen must be renamed, push the rename on its own, tell the person,
  and ask them to open the app in Studio and check that screen before you
  publish.

---

## Control Generations

There are three generations with different property names. The new modern
text input outputs `.Text`; the older Fluent one outputs `.Value`. Writing the
wrong one compiles as an error. Check the control's type with
`describe_canvas_control` and read
[control-dialects.md](references/control-dialects.md) before touching text,
color, font weight, alignment or input values.

---

## Galleries

- Add the gallery, then add its row controls with `parent` set to the gallery.
- Inside, read the row with `ThisItem.<column>` and size against
  `Parent.TemplateWidth` and `Parent.TemplateHeight`. `TemplateSize` sets the
  row height.
- A new gallery comes with a template whose `OnSelect` is
  `UpdateContext({ itemSelected: true, CurrentItem: ThisItem })`.
- `fields` on `addControl` (the columns to show, in order) does not work on a
  gallery yet; it is refused with a clear message. It is accepted on a
  `Table`, but on 2026-11-20 the score then marked the column controls it
  built as zero-size; whether they really were was not checked. Look at the
  table in the published app before relying on it.
- The layout check suggests one AutoLayout container per row so the row
  reflows on narrow screens. Wrapping existing row controls in a container
  changes their `Parent`: on a real app, a `Select(Parent)` in them then
  selected the container, not the row, and Studio showed errors. Change those
  to `Select(<GalleryName>)`.
- Add a label whose `Visible` is `IsEmpty(<items>)` so an empty list says what
  to do; the score marks galleries without one.

---

## Data Sources

Call `get_canvas_app_sources` after adding any source, and use the names it
returns.

| Source | Edit | Name in formulas |
|---|---|---|
| Dataverse table | `{"op": "addDataSource", "table": "contact"}` (logical name) | display name, for example `Contacts` |
| SharePoint list | `"connector": "sharepoint"`, `"dataset": "<site URL>"`, `"table": "<list title>"` | the list title, for example `'Grocery Price Catalog'` |
| Connector | `"connector": "shared_office365users"` | for example `Office365Users` |
| Flow | `"flow": "<flow id>"` | the flow's name with spaces removed, in single quotes if it still has hyphens or other symbols: `'Greeting-Flow'.Run(...)` |

- With more than one connection for a connector, the edit is refused with the
  list of connections; pass `connection`.
- A flow must start with a Power Apps trigger to be callable (tested with
  `PowerAppV2`). `list_live_flows` gives the id.
- `refreshDataSource` after a list or table gains columns, or after a flow's
  inputs or outputs change.
- `removeDataSource` removes tables and lists only. There is no edit that
  removes a connector or flow from an app.
- **Row limit.** Reads the data source cannot filter itself (a `ClearCollect`
  of a whole list, a `Filter` it cannot run on the server) stop at
  `DefaultConnectedDataSourceMaxGetRowsCount` rows, 500 by default, with no
  error. On a real app the newest rows were the ones that went missing. The
  setting is in `Properties.json`. There is no edit for it, and patching that
  file with `update_canvas_app_files` was not tested, so filter on the server
  or tell the person to raise it in Studio (the maximum is 2,000).

---

## Power Fx Traps

The checker misses these, or reports them only vaguely:

- `Select(btnSave)` does not wait. Formulas after it in the same `OnSelect`
  run before `btnSave`'s `OnSelect` finishes. On a real app this stamped
  records with the previous person's name. Write the follow-up
  into `btnSave`'s own `OnSelect`, or repeat the logic, instead of relying on
  `Select` to finish first.
- `Navigate` in a screen's `OnVisible` checks clean, but Studio reported it as
  an error on a real app.
- A column named in quotes is a text constant: `Sort(Distinct(list, Origin),
  "Result")` sorts nothing. Use `Value`, unquoted, in current apps (`Result`
  in older ones). The checker shows only a vague "Arguments were rejected" for
  the quoted form, and wrongly says `Value` is "not recognised" (2026-11-20).
  Ignore that warning.

---

## Images and Other Package Files

`update_canvas_app_files` stages raw package files.

- Images: `create` `Assets/Images/<name>.png` with `encoding: "base64"`. The
  server registers it, and formulas use it by name (`Image: logo`).
- `patch` changes one exact match in a text file without resending it. It
  refuses when `find` matches nothing, or matches several places and you did
  not pass `occurrence` (1 = first match).
- **Never write `Src/*.pa.yaml`.** The player runs the control JSON, and the
  server warns that a YAML write changes nothing, but it still pushes the file.
  The package then has YAML that disagrees with the app, and Studio parses
  that YAML when it opens the app. On a real app a YAML syntax error stopped
  Studio opening an app the player ran fine.

---

## Creating Apps

- `create_canvas_app` with `start` (`responsive`, `sidebar`, `split-screen`,
  `phone`, `tablet`) and a `name` not used in the environment. `modern`
  defaults to `true`. The app is created published, with one screen.
- `fromApp: "<app id>"` copies an app. It runs as a `saveAsNewApp` push on
  the source app: the reply's top-level `appId` is the **source**, and the
  copy is `newApp.appId`. Use the copy's id for every later call; running the
  test-data steps below on the top-level `appId` changes the original app.
  Staged edits in the source's session go into the copy and are then cleared
  from the source, so check its `session.pendingEdits` first. On a real app a
  copy took 20 seconds. On 2026-11-20 a copy of an app with a flow and three
  data sources, made while two other creates ran, timed out twice and was
  still created the first time. See "Long Calls and Timeouts" in
  `flowstudio-power-apps-canvas-mcp` before retrying a create.
- `update_canvas_app` with `push: true` and `saveAsNewApp: "<name>"` saves
  your session as a new app and leaves the source untouched, apart from
  closing its session. As with `fromApp`, the reply's `appId` is the source
  and `newApp.appId` is the new app. It took 13 seconds for a small app and
  31 seconds on a real app. **The new app is created published**, so it is
  live for anyone it is shared with.
- **A copy uses the same live data.** On a real app, a `fromApp` copy came
  back published and connected to the same SharePoint lists and flows as the
  source, so anything tested in it wrote to the real data. Expect the same
  from `saveAsNewApp` (not checked). To point a copy at test data:
  `removeDataSource` with `force: true` (it refuses while formulas use the
  list), `addDataSource` a test list that ends up with the same name in
  formulas, then `check_canvas_formula` on the whole app. That sequence was
  not tested, and flows cannot be removed. Otherwise test only with data that
  is safe to change.
- There is no tool to delete an app. Test apps and copies have to be deleted
  by the person in the Power Apps maker portal; name them so they are easy to
  find.

---

## Layout

Load `tool_search "skill:canvas-layout"` for Microsoft's layout guidance.
Every staging reply carries `layoutSuggestions`; `check_canvas_formula` with
`layout: true` lists them for the whole app. Common ones:

- a scrolling outer container (`LayoutOverflowY: LayoutOverflow.Scroll`) so
  content taller than the screen can be reached. An inner container that
  should fit its children exactly gets an exact `Height` and
  `LayoutOverflow.Hide` instead (see
  [autolayout-semantics.md](references/autolayout-semantics.md));
- `FillPortions: 0` plus a height for a gallery inside a scrolling container;
- `LayoutWrap` or a width test on `LayoutDirection` for rows that squeeze on a
  phone.

[autolayout-semantics.md](references/autolayout-semantics.md) covers what the
player honors and ignores inside containers.

---

## Quality

`score_canvas_app` returns ranked fixes with their score gain. Work down the
list: empty-state labels, a way to reach every screen, `Notify` after a save
and a busy state on save buttons, a theme instead of literal colors. Re-score
after each round. Push and publish replies carry the score too.

---

## Reference Files

- [control-dialects.md](references/control-dialects.md): classic, Fluent and modern control property names, and what goes wrong between them
- [autolayout-semantics.md](references/autolayout-semantics.md): how the player sizes, scrolls and orders controls inside AutoLayout containers

## Related Skills

- `flowstudio-power-apps-canvas-mcp`: sessions, draft versus live, timeouts and costs
- `flowstudio-power-apps-canvas-read`: find controls, formulas and columns before you edit
- `flowstudio-power-apps-canvas-ship`: push, publish and recover from refused pushes
- `flowstudio-power-automate-build`: build or change a flow the app calls
