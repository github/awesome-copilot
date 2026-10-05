# Adobe Illustrator Scripting: extended guide

Sections moved verbatim from [SKILL.md](../SKILL.md) to keep it under 500 lines.

## Measurement Units and Coordinates

### Units

All scripting API values use **points** (72 points = 1 inch). Convert other units:

| Unit | Conversion |
|---|---|
| Inches | multiply by 72 |
| Centimeters | multiply by 28.346 |
| Millimeters | multiply by 2.834645 |
| Picas | multiply by 12 |

Kerning, tracking, and `aki` properties use **em units** (thousandths of an em, proportional to font size).

### Coordinate System

- For **scripted documents**, the origin `(0,0)` is at the **bottom-left** of the artboard
- X increases left to right; Y increases bottom to top
- The `position` property of a page item is the **top-left corner** of its bounding box as `[x, y]`
- Maximum page item width/height: 16348 points

### Art Item Bounds

Every page item has three bounding rectangles:

- `geometricBounds`: Excludes stroke width `[left, top, right, bottom]`
- `visibleBounds`: Includes stroke width
- `controlBounds`: Includes control/direction points

## Working with Paths and Shapes

### Built-in Shape Methods

The `pathItems` collection provides convenience methods for common shapes:

```javascript
var doc = app.activeDocument;
var layer = doc.activeLayer;

// Rectangle: rectangle(top, left, width, height)
var rect = layer.pathItems.rectangle(500, 100, 200, 150);

// Rounded rectangle: roundedRectangle(top, left, width, height, hRadius, vRadius)
var rrect = layer.pathItems.roundedRectangle(500, 100, 200, 150, 20, 20);

// Ellipse: ellipse(top, left, width, height)
var oval = layer.pathItems.ellipse(400, 200, 100, 100);

// Polygon: polygon(centerX, centerY, radius, sides)
var hex = layer.pathItems.polygon(300, 300, 50, 6);

// Star: star(centerX, centerY, radius, innerRadius, points)
var star = layer.pathItems.star(300, 300, 50, 25, 5);
```

### Freeform Paths Using Coordinate Arrays

```javascript
var doc = app.activeDocument;
var path = doc.pathItems.add();
path.setEntirePath([[100, 100], [200, 200], [300, 100]]);
path.closed = false;
path.stroked = true;
path.strokeWidth = 2;
```

### Freeform Paths Using PathPoint Objects

```javascript
var doc = app.activeDocument;
var path = doc.pathItems.add();

var point1 = path.pathPoints.add();
point1.anchor = [100, 100];
point1.leftDirection = [100, 100];
point1.rightDirection = [150, 150];
point1.pointType = PointType.SMOOTH;

var point2 = path.pathPoints.add();
point2.anchor = [300, 100];
point2.leftDirection = [250, 150];
point2.rightDirection = [300, 100];
point2.pointType = PointType.SMOOTH;

path.closed = false;
```

### Path Properties

```javascript
var item = doc.pathItems[0];
item.filled = true;
item.stroked = true;
item.strokeWidth = 1.5;
item.strokeCap = StrokeCap.ROUNDENDCAP;
item.strokeJoin = StrokeJoin.ROUNDENDJOIN;
item.opacity = 80;
item.closed = true;
```

## Working with Text

### Text Frame Types

```javascript
var doc = app.activeDocument;

// Point text
var pointText = doc.textFrames.add();
pointText.contents = "Hello World!";
pointText.position = [100, 500];

// Area text (text inside a path)
var rectPath = doc.pathItems.rectangle(500, 100, 200, 100);
var areaText = doc.textFrames.areaText(rectPath);
areaText.contents = "Text inside a rectangle shape.";

// Path text (text along a path)
var curvePath = doc.pathItems.add();
curvePath.setEntirePath([[50, 300], [150, 400], [250, 300]]);
var pathText = doc.textFrames.pathText(curvePath);
pathText.contents = "Text on a path";
```

### Character and Paragraph Formatting

```javascript
var tf = doc.textFrames[0];
var textRange = tf.textRange;

// Character attributes
var charAttr = textRange.characterAttributes;
charAttr.size = 24;           // Font size in points
charAttr.textFont = app.textFonts.getByName("ArialMT");
charAttr.fillColor = red;
charAttr.tracking = 50;       // Em units
charAttr.horizontalScale = 100;
charAttr.verticalScale = 100;
charAttr.baselineShift = 0;

// Paragraph attributes
var paraAttr = textRange.paragraphAttributes;
paraAttr.justification = Justification.CENTER;
paraAttr.firstLineIndent = 0;
paraAttr.leftIndent = 0;
paraAttr.spaceBefore = 0;
paraAttr.spaceAfter = 0;
```

### Accessing Text Content

```javascript
var tf = doc.textFrames[0];

// Access sub-ranges
var firstChar = tf.characters[0];
var firstWord = tf.words[0];
var firstPara = tf.paragraphs[0];
var firstLine = tf.lines[0];

// Modify specific ranges
tf.words[0].characterAttributes.size = 36;
tf.paragraphs[0].paragraphAttributes.justification = Justification.LEFT;
```

### Threading Text Frames

```javascript
var frame1 = doc.textFrames.areaText(path1);
var frame2 = doc.textFrames.areaText(path2);

// Link frames so text flows from frame1 to frame2
frame1.nextFrame = frame2;

// Stories represent the full text across threaded frames
var storyCount = doc.stories.length;
var fullText = doc.stories[0].textRange.contents;
```

## Transformations

```javascript
var item = doc.pathItems[0];

// Rotate 45 degrees around center
item.rotate(45);

// Scale to 50% width, 75% height
item.resize(50, 75);

// Translate (move) by 100 points right and 50 points up
item.translate(100, 50);

// Using a transformation matrix
var matrix = app.getIdentityMatrix();
matrix = app.concatenateRotationMatrix(matrix, 30);
matrix = app.concatenateScaleMatrix(matrix, 150, 150);
item.transform(matrix);
```

## External Invocation & Argument Passing

Illustrator scripts are routinely launched from outside the application —
shell scripts, schedulers, build pipelines, ExtendScript Toolkit, or
`BridgeTalk` messages from other Creative Cloud apps. The execution
environment under those launchers differs from the in-application *File >
Scripts* path in several ways that frequently break otherwise-correct code.

### `arguments[]` Is Unreliable Under External Launchers

ExtendScript Toolkit's `-run` invocation and `BridgeTalk.send()` do not
forward arbitrary launcher arguments into the script's top-level
`arguments[]` array. In many configurations the array contains a single
`[object BridgeTalk]` element instead of the values the caller passed, as
demonstrated below:

```javascript
// At top of script
var passed = (typeof arguments !== "undefined") ? arguments : [];
for (var i = 0; i < passed.length; i++) {
    $.writeln("arg[" + i + "] = " + passed[i]);
    // Often prints: arg[0] = [object BridgeTalk]
}
```

**Do not rely on `arguments[]` for required inputs when the script is
launched externally.** Use one of the following more reliable channels.

### Sidecar File for Parameters

When a script fails under an external launcher and the source of the error
is not obvious, fall back to a sidecar file: have the caller write a small
text file at a known absolute path, and read it on startup. This works
regardless of launcher quirks and is easy to inspect after a failed run.

```javascript
var SIDECAR_PATH = "C:/Users/userName/job.args.txt";

function readSidecar(path) {
    var f = new File(path);
    if (!f.exists || !f.open("r")) return null;
    var lines = [];
    while (!f.eof) {
        var ln = f.readln();
        if (ln && !/^\s*$/.test(ln)) lines.push(ln);
    }
    f.close();
    return {
        input:  lines[0],
        output: lines[1],
        mode:   lines[2]
    };
}
```

A `key=value` format is equally workable and avoids positional fragility:

```text
input=C:/path/to/input.ai
output=C:/path/to/output.pdf
mode=preview
```

### Environment Variables

`$.getenv("NAME")` returns environment variables visible to **Illustrator's
process**, not the launcher's. If the launcher needs Illustrator to see a
value, it must set the variable system-wide or in Illustrator's parent
environment before launching. For per-invocation values, prefer a sidecar
file.

### `$.fileName` and `File($.fileName).parent`

Under in-application execution, `$.fileName` is the absolute path of the
running script and `File($.fileName).parent` yields the script's folder.
Under some external launchers (notably ESTK `-run`) `$.fileName` can be
empty, causing relative path resolution to silently fail.

```javascript
// Fragile: returns null under some launchers
var here = $.fileName ? File($.fileName).parent : null;
var sidecar = here ? new File(here.fsName + "/job.args.txt") : null;

// Robust: hardcode a known absolute path or fall back to a stable location
var sidecar = new File("C:/Users/userName/job.args.txt");
if (!sidecar.exists) sidecar = new File(Folder.temp.fsName + "/job.args.txt");
```

### Diagnostic Logging to an Absolute Path

Silent failures are common because dialogs are suppressed and the launcher
may not surface `$.writeln` output. Write a plain-text log to a known
absolute path so a run can be inspected after the fact. Create the parent
folder on demand so the first call cannot fail for a missing directory.

```javascript
var LOG_PATH = "C:/Users/userName/logs/job.log";

function log(msg) {
    try {
        var f = new File(LOG_PATH);
        try { if (!f.parent.exists) f.parent.create(); } catch (eDir) {}
        if (f.open("a")) {
            f.writeln("[" + new Date() + "] " + msg);
            f.close();
        }
    } catch (e) {}
}
```

### Wrap the Entry Point in `try { ... } catch`

Externally launched scripts often fail without any visible indication. A
top-level `try`/`catch` that writes the error to the log file converts
silent failures into a single inspectable line.

```javascript
try {
    main();
} catch (err) {
    log("FATAL: " + err + (err && err.line ? " line=" + err.line : ""));
}
```

### Suppress User Interaction

External callers cannot answer dialogs. Disable them before any DOM work
and avoid `alert()` / `confirm()` / `prompt()` entirely in scripts that may
be launched headlessly.

```javascript
app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
```

### Save Explicitly

Closing or letting Illustrator return to its idle state does not save the
working file. After all DOM edits, call `doc.saveAs(...)` (or `doc.save()`)
explicitly and log whether it succeeded.

```javascript
var opts = new IllustratorSaveOptions();
opts.compatibility = Compatibility.ILLUSTRATOR17;
doc.saveAs(new File(doc.fullName.fsName), opts);
```

## Common Patterns

### Iterate All Page Items in a Document

```javascript
function processAllItems(doc) {
    for (var i = 0; i < doc.pageItems.length; i++) {
        var item = doc.pageItems[i];
        // Process based on type
        switch (item.typename) {
            case "PathItem":
                // handle path
                break;
            case "TextFrame":
                // handle text
                break;
            case "GroupItem":
                // handle group (may contain nested items)
                break;
        }
    }
}
```

### Recursively Unlock Layers and Groups Before Editing

A locked layer or any locked ancestor (parent group, clip group, sublayer)
will cause edits to throw `Error: Target layer cannot be modified`. Walk the
full hierarchy and clear `locked` / `hidden` flags before performing DOM
modifications.

```javascript
function unlockAll(doc) {
    function visitLayers(layers) {
        for (var i = 0; i < layers.length; i++) {
            var lyr = layers[i];
            try { lyr.locked = false; lyr.visible = true; } catch (e) {}
            visitItems(lyr);
            if (lyr.layers && lyr.layers.length) visitLayers(lyr.layers);
        }
    }
    function visitItems(container) {
        var items = container.pageItems;
        for (var j = 0; j < items.length; j++) {
            var it = items[j];
            try { it.locked = false; it.hidden = false; } catch (e) {}
            if (it.typename === "GroupItem") visitItems(it);
        }
    }
    visitLayers(doc.layers);
}
```

### Replacing the File Behind a Linked Image (Relink)

`PlacedItem.file = newFile` replaces a linked image while preserving the
parent, stacking order, and (after re-applying) the bounds. **`RasterItem`
does not expose a writable `file` property**, so when a placeholder is a
raster you must add a fresh `PlacedItem` in the same parent, copy the bounds,
then remove the original.

```javascript
function relinkOrRebuild(item, newFile) {
    var bounds = item.geometricBounds.slice();
    var parent = item.parent;
    var name   = item.name;

    if (item.typename === "PlacedItem") {
        item.file = newFile;
        item.geometricBounds = bounds;
        return item;
    }

    // RasterItem path: rebuild as a linked PlacedItem in the same parent.
    var fresh = parent.placedItems.add();
    fresh.file = newFile;
    fresh.geometricBounds = bounds;
    if (name) try { fresh.name = name; } catch (e) {}
    fresh.move(item, ElementPlacement.PLACEBEFORE);
    item.remove();
    return fresh;
}
```

### Placing SVG Content (Copy/Paste Pattern)

`PlacedItem.file` accepts raster formats and AI/PDF, **but not SVG**. Setting
it to an `.svg` File throws `Unable to set placed item's file, is the file
path provided valid?`. The reliable way to bring SVG artwork into a document
is to open the SVG as a separate document, select all, copy, close, and paste
into the working document.

```javascript
function placeSVG(targetDoc, svgFile, targetLayer) {
    var donor = app.open(svgFile);
    app.executeMenuCommand("selectall");
    app.executeMenuCommand("copy");
    donor.close(SaveOptions.DONOTSAVECHANGES);

    app.activeDocument = targetDoc;
    targetDoc.activeLayer = targetLayer;
    app.executeMenuCommand("pasteFront");

    var sel = targetDoc.selection;
    if (!sel || sel.length === 0) return null;
    if (sel.length === 1) return sel[0];

    // Multiple pasted items: group them so callers get a single handle.
    var group = targetLayer.groupItems.add();
    for (var i = sel.length - 1; i >= 0; i--) {
        sel[i].move(group, ElementPlacement.PLACEATBEGINNING);
    }
    return group;
}
```

### Finding a Clipping Path Inside a Mask Group

Clip groups expose their clipping shape as a child `PathItem` (or, less
commonly, a child of a `CompoundPathItem`) with `clipping === true`. The
clip's `geometricBounds` give the visible frame to size or center content
against.

```javascript
function findClipPath(group) {
    var items = group.pageItems;
    for (var i = 0; i < items.length; i++) {
        var it = items[i];
        try {
            if (it.typename === "PathItem" && it.clipping) return it;
            if (it.typename === "CompoundPathItem") {
                for (var j = 0; j < it.pathItems.length; j++) {
                    if (it.pathItems[j].clipping) return it;
                }
            }
        } catch (e) {}
    }
    return null;
}
```

### Cover-Fit and Contain-Fit Sizing

To make an image fully cover a rectangle (any overflow hidden by a mask), use
the larger of the width/height ratios. To make it fit entirely inside, use
the smaller. A bleed factor (e.g. `1.10`) lets a cover image extend slightly
past the clip edge.

```javascript
function fitItemToRect(item, rect, mode, bleed) {
    // rect = [L, T, R, B] (Illustrator: T > B)
    var rw = rect[2] - rect[0];
    var rh = rect[1] - rect[3];
    var ib = item.geometricBounds;
    var iw = ib[2] - ib[0];
    var ih = ib[1] - ib[3];
    if (iw <= 0 || ih <= 0) return;

    var sx = rw / iw;
    var sy = rh / ih;
    var s  = (mode === "cover" ? Math.max(sx, sy) : Math.min(sx, sy))
           * (bleed || 1);
    item.resize(s * 100, s * 100);

    var cx = (rect[0] + rect[2]) / 2;
    var cy = (rect[1] + rect[3]) / 2;
    var b  = item.geometricBounds;
    var w  = b[2] - b[0];
    var h  = b[1] - b[3];
    item.position = [cx - w / 2, cy + h / 2];
}
```



### Batch Process Files in a Folder

```javascript
var folder = Folder.selectDialog("Select folder of .ai files");
if (folder) {
    var files = folder.getFiles("*.ai");
    for (var i = 0; i < files.length; i++) {
        var doc = app.open(files[i]);
        // Process each document...
        doc.close(SaveOptions.DONOTSAVECHANGES);
    }
}
```

### Error Handling

```javascript
try {
    var doc = app.activeDocument;
    var layer = doc.layers.getByName("NonExistentLayer");
} catch (e) {
    alert("Error: " + e.message);
    // e.message, e.line, e.fileName available
}
```
