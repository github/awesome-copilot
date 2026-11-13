---
name: adobe-after-effects-scripting
description: 'Automate Adobe After Effects and write, edit, debug or review its scripts and expressions. Covers ExtendScript (.jsx, .jsxbin) and its ECMAScript 3 limits, the object model (app, project, items, folders, compositions, layers, properties, keyframes, effects, text), undo groups, the render queue and the hand-off to Adobe Media Encoder, ScriptUI panels, the Scripts, ScriptUI Panels, Startup and Shutdown folders, running a script from outside with AfterFX.exe -r and -s or AppleScript DoScriptFile, rendering with aerender, and expressions on both expression engines. Use for any code that After Effects itself runs. For CEP or UXP panels, C++ SDK plugins, or an MCP server or other bridge that drives After Effects from another process, use adobe-after-effects-integrations instead; the ExtendScript such a component sends into After Effects is still this skill.'
---

# Adobe After Effects Scripting

Write the scripts After Effects runs, and the expressions it evaluates, so they
work the first time on the version that is installed.

## Scope

| This skill | adobe-after-effects-integrations |
| --- | --- |
| ExtendScript `.jsx` and `.jsxbin` that After Effects runs | CEP and UXP panels, and how they call into After Effects |
| The object model: project, items, layers, properties, render queue | C++ effect, AEGP and AEIO plugins built on the SDK |
| ScriptUI panels in the `ScriptUI Panels` folder | MCP servers and other bridges that drive After Effects from another process |
| `AfterFX.exe -r` and `-s`, AppleScript `DoScriptFile`, `aerender` | Packaging, signing and installing extensions and plugins |
| Expressions, and scripts that write them | |

An MCP server's tools belong to the integrations skill. The ExtendScript those
tools send into After Effects belongs here.

## Before writing a script

1. **Know the version.** `app.version` is a string, so compare it with
   `parseFloat(app.version)`. Since After Effects 2022 the major version
   matches the year: 2026 is 26.x. Every attribute in the scripting guide
   lists the version that added it; check before using anything recent.
2. **Know how it will run.** By hand from `File > Scripts > Run Script File`,
   as a docked panel, at startup, or unattended from the command line. An
   unattended script must never open a dialog: a modal dialog blocks every
   script after it.
3. **Know what it touches.** Writing files, reading them outside the project,
   or using `Socket` needs the preference **Allow Scripts To Write Files And
   Access Network** (see [Running scripts](#running-scripts)).
4. **Write ES3**, or compile down to it (see [The language](#the-language)).

## The language

ExtendScript implements ECMAScript 3 plus E4X. It is not the JavaScript engine
expressions use.

- **Not available:** `let`, `const`, arrow functions, template literals,
  classes, default parameters, destructuring, `Array.prototype.forEach`,
  `map`, `filter` and `indexOf`, `Object.keys`, `String.prototype.trim`.
  Write `var` and plain `for` loops.
- **No `JSON` object.** ExtendScript has never had one natively. A `JSON` you
  happen to find was polyfilled by something else (the Libraries panel does
  this) and can vanish. Bring `json2.js` with `#include` or `$.evalFile`, or
  use `extendscript-es5-shim`.
- **One global namespace** is shared by every script for the whole session.
  Wrap each script in a function, and give any global you mean to keep a
  name nothing else will use.
- **Files** are UTF-8 `.jsx`. `#include "lib.jsxinc"` (or `//@include`) and
  `#includepath` pull in other files; a missing include is a run-time error.
  `$.evalFile(path[, timeout])` runs another file. `.jsxbin` is a compiled
  form that "may not be usable with all of the scripting integration
  features".
- `$.os` names the operating system; `system.osName` is blank on Windows.
- Use `generateRandomNumber()` rather than `Math.random()` for values a
  script sets.

## The object model

```text
app
 └ project                       always present; project.file is null until saved
    ├ item(i), numItems          1-based: CompItem, FootageItem, FolderItem
    ├ activeItem                 the item selected in the Project panel, or null
    ├ rootFolder
    └ renderQueue                item(i) → RenderQueueItem → outputModule(i)
CompItem
 ├ layer(i), numLayers           1-based; layer(1) is the top of the stack
 └ width, height, duration, frameRate, frameDuration, workAreaStart, workAreaDuration
Layer, AVLayer, TextLayer, ...
 └ property(matchName)           PropertyGroup → ... → Property
```

- **Collections start at 1.** `RenderQueue.item` is documented as
  `[0..numItems]`; treat it as 1-based like every other collection. Remove
  items while counting down, not up.
- **`instanceof` matches only the most specific class.** A text layer is
  `instanceof TextLayer` but not `instanceof AVLayer`. `item instanceof
  CompItem` is the usual test before treating `activeItem` as a comp.
- **Reach properties by match name**, never by display name, which changes
  with the language After Effects runs in:
  `layer.property("ADBE Transform Group").property("ADBE Position")`.
- **Time is in seconds.** A frame is `frame * comp.frameDuration`.
- **Units:** Position and Anchor Point in pixels, `[x, y]` on a 2D layer and
  `[x, y, z]` on a 3D one; Scale in percent per axis; Rotation in degrees;
  Opacity 0 to 100; colours from 0 to 1.
- **Colours:** a colour property (`PropertyValueType.COLOR`: shape fills and
  strokes, Color Control, effect colours) holds `[r, g, b, a]`. `setValue`
  also accepts `[r, g, b]` there (alpha becomes 1), but an expression on it
  must return four values ("expression result must be of dimension 4, not
  3"). `addSolid` and `TextDocument.fillColor` take `[r, g, b]`.
- **`setValue` throws on a property that has keyframes.** Use
  `setValueAtTime` or `setValuesAtTimes` there.
- **Adding to an indexed group invalidates references into it.** After
  `addProperty` on `"ADBE Effect Parade"`, every effect or parameter you
  already held is stale. Keep `propertyIndex` values and fetch again.

Signatures, ranges and match names are in
[references/object-model.md](references/object-model.md).

## Patterns

All examples are ES3 and use placeholder names.

### Undo group and errors

```jsx
(function acmeBuildDemo() {
    app.beginUndoGroup("Acme: Build Demo");
    try {
        buildDemo();
    } catch (err) {
        alert("Build Demo failed on line " + err.line + ": " + err.message);
    } finally {
        app.endUndoGroup();
    }
})();
```

`endUndoGroup()` without a matching `beginUndoGroup()` is an error, so keep
the pair in `try` and `finally`. An unattended script logs instead of calling
`alert`.

### Find or create

```jsx
function findItem(name, type) {
    for (var i = 1; i <= app.project.numItems; i++) {
        var item = app.project.item(i);
        if (item.name === name && (!type || item instanceof type)) {
            return item;
        }
    }
    return null;
}

function findOrCreateFolder(name) {
    return findItem(name, FolderItem) || app.project.items.addFolder(name);
}
```

### Build a composition from footage

```jsx
function buildDemo() {
    var file = new File("~/Desktop/sample-clip.mov");
    if (!file.exists) {
        throw new Error("Footage not found: " + file.fsName);
    }
    var footage = app.project.importFile(new ImportOptions(file));
    footage.parentFolder = findOrCreateFolder("Source Footage");

    /* name, width, height, pixel aspect, duration (s), frame rate */
    var comp = app.project.items.addComp("Demo Comp", 1080, 1080, 1, 10, 30);
    var layer = comp.layers.add(footage);
    centerLayer(comp, layer);
    return comp;
}
```

### Center or align a layer

```jsx
/* Set x and y on the current value, so a 3D layer keeps its z. */
function setXY(prop, x, y) {
    var value = prop.value;
    value[0] = x;
    value[1] = y;
    prop.setValue(value);
}

/* setValue throws on a keyframed property, and on Position once its
   dimensions are separated; a parented layer's Position is in its parent's
   space. The helpers leave all of these layers alone. */
function canSetTransform(layer) {
    var transform = layer.property("ADBE Transform Group");
    var position = transform.property("ADBE Position");
    return !layer.parent && transform.property("ADBE Anchor Point").numKeys === 0 &&
        position.numKeys === 0 && !position.dimensionsSeparated;
}

function centerAnchor(layer) {
    var rect = layer.sourceRectAtTime(0, false);
    setXY(layer.property("ADBE Transform Group").property("ADBE Anchor Point"),
        rect.left + rect.width / 2, rect.top + rect.height / 2);
}

/* Returns false, changing nothing, when the transform cannot be set. */
function centerLayer(comp, layer) {
    if (!canSetTransform(layer)) { return false; }
    centerAnchor(layer);
    setXY(layer.property("ADBE Transform Group").property("ADBE Position"),
        comp.width / 2, comp.height / 2);
    return true;
}

/* Top-right corner, `margin` pixels in, at the layer's current scale.
   Math.abs keeps a flipped (negative-scale) layer inside the margin. It
   declines 3D layers (away from z 0 the camera's perspective moves them off
   the margin) and rotated layers (their corners stick out). */
function alignTopRight(comp, layer, margin) {
    if (!canSetTransform(layer) || layer.threeDLayer) { return false; }
    var transform = layer.property("ADBE Transform Group");
    if (transform.property("ADBE Rotate Z").value !== 0) { return false; }
    var rect = layer.sourceRectAtTime(0, false);
    var scale = transform.property("ADBE Scale").value;
    var w = rect.width * Math.abs(scale[0]) / 100;
    var h = rect.height * Math.abs(scale[1]) / 100;
    centerAnchor(layer);
    setXY(transform.property("ADBE Position"), comp.width - margin - w / 2, margin + h / 2);
    return true;
}
```

A two-value `setValue` on a 3D layer's Anchor Point or Position sets z to 0
(checked in 26.0), so `setXY` changes only x and y. To move a keyframed layer,
write a keyframe at the current time with `setValueAtTime(comp.time, value)`;
these helpers skip it instead of changing an animation.

Stacking order: `moveToBeginning()` (top), `moveToEnd()` (bottom),
`moveBefore(other)`, `moveAfter(other)`.

### Fit footage to a length

`stretch` is a percentage of the layer's duration, not its speed: 100 is
unchanged, 200 lasts twice as long and plays at half speed.

```jsx
function fitToLength(comp, layer, seconds) {
    var natural = layer.source.duration;
    if (natural > seconds) {
        layer.stretch = seconds / natural * 100;
    } else {
        comp.workAreaStart = layer.inPoint;
        comp.workAreaDuration = natural;
    }
}
```

### Keyframes and expressions

```jsx
var transform = layer.property("ADBE Transform Group");
transform.property("ADBE Opacity").setValuesAtTimes([0, 1], [0, 100]);

var rotation = transform.property("ADBE Rotate Z");
if (rotation.canSetExpression) {
    rotation.expression = "time * 90";
    if (rotation.expressionError !== "") {
        /* 26.0 does not throw for an invalid expression, and expressionEnabled
           stays true; expressionError holds the message. */
        $.writeln("Expression rejected: " + rotation.expressionError);
    }
}
```

### Effects

```jsx
var parade = layer.property("ADBE Effect Parade");
var blurMatchName = "ADBE Gaussian Blur 2";
if (parade.canAddProperty(blurMatchName)) {
    var blur = parade.addProperty(blurMatchName);
    blur.property(1).setValue(12);
} else {
    $.writeln("Effect unavailable: " + blurMatchName);
}
```

`app.effects` is an ordinary 0-based array of `{ displayName, category,
matchName, version }`. Apply effects by `matchName`, which does not change
between versions or languages. Never look an effect up by `displayName` in a
script: display names follow the user interface language, so the lookup finds
nothing on a localized installation. To find a match name while writing the
script, apply the effect once and read it back
(`layer.property("ADBE Effect Parade").property(1).matchName`).

### Text

```jsx
var text = comp.layers.addText("Hello, World");
var sourceText = text.property("ADBE Text Properties").property("ADBE Text Document");
var doc = sourceText.value;
doc.fontSize = 72;
sourceText.setValue(doc);
```

### Render

```jsx
var rqItem = app.project.renderQueue.items.add(comp);
var om = rqItem.outputModule(1);
om.applyTemplate("High Quality");      /* must be one of om.templates */
om = rqItem.outputModule(1);           /* fetch again after any settings change */
om.file = new File("~/Desktop/demo-comp.mov");

app.project.renderQueue.render();      /* blocks until the render finishes */
```

- `om.templates` lists the output module templates this installation has,
  and `rqItem.templates` the render settings templates;
  names differ between versions and languages, so check before applying one.
- `RenderQueueItem.applyTemplate()` applies a **render settings** template;
  `OutputModule.applyTemplate()` applies an **output module** template.
- The output module object can go stale after its settings change. Fetch it
  again with `outputModule(i)` before the next use.
- The output folder must exist: `render()` throws "Directory does not exist"
  otherwise, so create it first with `new Folder(path).create()`.
- Nothing about a render queue item can change while a render runs or is
  paused.
- `layer.audioEnabled = false` silences one layer; whether a file gets an
  audio track at all is the output module's setting.

**Adobe Media Encoder** instead of the internal renderer:

```jsx
if (app.project.renderQueue.canQueueInAME) {
    app.project.renderQueue.queueInAME(false);   /* true also starts the AME queue */
}
```

Only items whose status is queued are sent. Media Encoder applies **its most
recently used encoding preset**, not the output module template, so set the
format in Media Encoder. Requires After Effects 14.0 and Media Encoder 11.0 or
later.

### Save and close

```jsx
app.project.save(new File("~/Desktop/demo-project.aep"));
app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);   /* before app.newProject() */
```

`app.newProject()` prompts to save a changed project unless it is closed
first.

## Running scripts

- **By hand:** `File > Scripts > Run Script File`. A script copied into the
  Scripts folder appears under `File > Scripts` after After Effects restarts.
- **Folders.** Windows: `C:\Program Files\Adobe\Adobe After Effects <year>\Support Files\Scripts\`.
  macOS: `/Applications/Adobe After Effects <year>/Scripts/`. Inside it:
  - `ScriptUI Panels\`: scripts listed at the bottom of the Window menu, which
    can dock.
  - `Startup\` and `Shutdown\`: run in alphabetical order when After Effects
    starts and quits.
- **File and network access:** **Allow Scripts To Write Files And Access
  Network**. Windows: `Edit > Preferences > Scripting & Expressions`. macOS:
  `After Effects > Settings > Scripting & Expressions`. It moved there from
  General in 16.1. After Effects 26.0 regrouped the Preferences dialog, so
  search for the label if the pane is not where you expect.
- **From outside After Effects:** `AfterFX.exe -r <file>` runs a script in
  the instance that is already running, `-s "<code>"` runs a string, and
  macOS uses AppleScript `DoScriptFile` or `DoScript`. Scripts take no
  arguments and print nothing to the caller. Pass values by setting globals
  with `-s` and then `$.evalFile`, and hand results back in a file. Details
  are in [references/command-line.md](references/command-line.md).
- **Unattended runs:** no `alert`, `confirm` or `prompt`. Bracket the work
  with `app.beginSuppressDialogs()` and `app.endSuppressDialogs(false)` to
  hold back script error dialogs, and write a log into `Folder.temp`.
- **Rendering without the user interface:** `aerender`, also in
  [references/command-line.md](references/command-line.md).

## ScriptUI panels

The guide's dockable panel pattern, which works both from the ScriptUI Panels
folder and from `Run Script File`:

```jsx
(function acmeToolsPanel(thisObj) {
    function buildUI(host) {
        var panel = (host instanceof Panel)
            ? host
            : new Window("palette", "Acme Tools", undefined, { resizeable: true });
        var button = panel.add("button", undefined, "Center Selected Layers");
        button.onClick = function () {
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) { return; }
            app.beginUndoGroup("Acme: Center Layers");
            try {
                var skipped = 0;
                for (var i = 0; i < comp.selectedLayers.length; i++) {
                    var layer = comp.selectedLayers[i];
                    /* Cameras and lights have no sourceRectAtTime; text and shape
                       layers are not instanceof AVLayer, so name all three. */
                    var supported = layer instanceof AVLayer || layer instanceof TextLayer ||
                        layer instanceof ShapeLayer;
                    if (!supported || !centerLayer(comp, layer)) {
                        skipped++;
                    }
                }
                if (skipped) {
                    writeLn("Acme: skipped " + skipped + " camera, light, parented, or animated layer(s).");
                }
            } finally {
                app.endUndoGroup();
            }
        };
        panel.layout.layout(true);
        return panel;
    }

    var ui = buildUI(thisObj);
    if (ui instanceof Window) {
        ui.center();
        ui.show();
    }
})(this);
```

Pass `this` in from the top level: inside a function, `this` is not the panel.
`centerLayer` is the helper from [Center or align a layer](#center-or-align-a-layer).
It calls `sourceRectAtTime`, which camera and light layers lack, and returns
`false` without changing anything when a layer is parented or its Anchor Point
or Position is keyframed or has separated dimensions. Without these checks, a
camera, light, or animated layer in the selection throws and the rest of the
selection is never reached, and a parented layer moves in its parent's space.
`writeLn` reports the skipped layers in the Info panel.

## Expressions

- **Two engines, chosen per project** in `File > Project Settings >
  Expressions`: the **JavaScript** engine (ECMAScript 2018 based, added in
  16.0) and **Legacy ExtendScript** (ECMAScript 3). Projects saved before
  16.0 open on Legacy. A script reads or sets it with
  `app.project.expressionEngine`, `"javascript-1.0"` or `"extendscript"`.
- The engine setting affects expressions only. Scripts always run in
  ExtendScript.
- **Common vocabulary:** `time`, `value`, `thisComp`, `thisLayer`,
  `comp("Name")`, `effect("Slider Control")("Slider")`, `wiggle(freq, amp)`,
  `loopOut("cycle")`, `linear(t, tMin, tMax, value1, value2)`, `ease(...)`,
  `valueAtTime(t)`, `posterizeTime(framesPerSecond)`.
- Some newer methods exist only on the JavaScript engine. Check the
  expression reference's changelog before relying on one.
- Expressions run for every frame they are sampled at. Keep them cheap, and
  bake them to keyframes (`Animation > Keyframe Assistant > Convert
  Expression to Keyframes`) when a project gets slow.
- From a script, check `canSetExpression` first, and read `expressionError`
  after assigning: `""` for a valid expression, the message for an invalid
  one. In 26.0 an invalid expression does not throw on either engine, and
  `expressionEnabled` stays true.

## Debugging and tooling

- **Debugger:** Visual Studio Code with Adobe's **ExtendScript Debugger**
  extension is the supported way. ExtendScript Toolkit is deprecated and does
  not run on current macOS. In After Effects, breakpoints inside callbacks
  need `$.level = 1` set in the script.
- **Output:** `$.writeln()` writes to the debugger's console, `writeLn()`
  writes to After Effects' Info panel, and `alert()` opens a modal dialog.
- **Types:** the npm package `types-for-adobe` has After Effects typings per
  version, used with `/// <reference types="types-for-adobe/AfterEffects/<version>"/>`
  and a `tsconfig.json` with `"module": "none"` and `"noLib": true`.
- **Shims:** `extendscript-es5-shim` adds ES5 `Array`, `String`, `Function`,
  `Object`, `Date` and `JSON` methods. Its `Object` descriptor functions are
  only mocks.

## Pitfalls

- [ ] Loops run from 1 to `numItems` or `numLayers`, and count down when
      removing.
- [ ] `app.project.activeItem` can be null or something other than a comp.
- [ ] Code that walks selected layers skips cameras and lights before it
      calls `sourceRectAtTime`.
- [ ] Anchor Point and Position are set without dropping z on 3D layers, and
      keyframed, separated, or parented transforms are skipped or keyed, not
      `setValue`d.
- [ ] Properties are reached by match name.
- [ ] Every reference into an effect group is fetched again after
      `addProperty`.
- [ ] The output module is fetched again after `applyTemplate` or
      `setSettings`.
- [ ] Keyframed properties use `setValueAtTime`.
- [ ] After setting an expression, `expressionError` is checked; an invalid
      one does not throw.
- [ ] `app.findMenuCommandId` depends on the user interface language, so
      prefer a known command ID.
- [ ] Windows paths in `File` use forward slashes, or `File.fsName` when
      handing a path to the operating system.
- [ ] Inside an `-s` string, the script's own strings use single quotes.
- [ ] `LayerCollection.add` places a layer at the composition start or the
      current time, according to the **Create Layers at Composition Start
      Time** preference, and a still image's length follows the Import
      preferences.

## Sources

- After Effects Scripting Guide: <https://ae-scripting.docsforadobe.dev/>
- After Effects Expression Reference: <https://ae-expressions.docsforadobe.dev/>
- JavaScript Tools Guide (File, Folder, `$`, ScriptUI): <https://extendscript.docsforadobe.dev/>
- Adobe Media Encoder Scripting Guide: <https://ame-scripting.docsforadobe.dev/>
- Adobe Help Center, automated rendering and network rendering (`aerender`):
  <https://helpx.adobe.com/after-effects/using/automated-rendering-network-rendering.html>
