---
name: adobe-illustrator-scripting
description: 'Write, debug, and optimize Adobe Illustrator automation scripts using ExtendScript (JavaScript/JSX). Use when creating or modifying scripts that manipulate documents, layers, paths, text frames, colors, symbols, artboards, or any Illustrator DOM objects. Covers the complete JavaScript object model, coordinate system, measurement units, export workflows, and scripting best practices.'
---

# Adobe Illustrator Scripting

Expert guidance for automating Adobe Illustrator through ExtendScript (JavaScript/JSX). This skill covers the Illustrator scripting object model, all major API objects, code patterns, and best practices for writing production-quality `.jsx` scripts.

## Bundled Assets

- [`references/object-model-quick-reference.md`](references/object-model-quick-reference.md): Use this as a quick lookup for the Illustrator scripting object model, common document and page item types, and related DOM concepts while writing or debugging scripts.
- `scripts/`: Contains example Illustrator automation scripts you can use as starting points or implementation patterns for common tasks such as document manipulation, exports, batch processing, and DOM usage. Review and adapt these examples when you need working JSX patterns or want to compare behavior while debugging.
## When to Use This Skill

- Writing new Illustrator automation scripts (`.jsx` or `.js` files)
- Debugging or fixing existing Illustrator ExtendScript code
- Manipulating documents, layers, page items, paths, text, or colors programmatically
- Batch-processing Illustrator files or generating artwork from data
- Exporting documents to various formats (PDF, SVG, PNG, EPS, etc.)
- Working with the Illustrator DOM (Application, Document, Layer, PathItem, TextFrame, etc.)
- Creating data-driven graphics using variables and datasets
- Automating print workflows with scripted print options

## Prerequisites

- Adobe Illustrator CC or later installed
- Basic JavaScript knowledge (ExtendScript is ES3-based with Adobe extensions)
- Scripts are executed via File > Scripts > Other Scripts, the Scripts menu, or placed in the Startup Scripts folder
- The ExtendScript Toolkit (ESTK) or any text editor can be used to write `.jsx` files

## Scripting Environment

### Language and File Extensions

| Language | Extension | Platform |
|---|---|---|
| ExtendScript/JavaScript | `.jsx`, `.js` | Windows, macOS |
| AppleScript | `.scpt` | macOS only |
| VBScript | `.vbs` | Windows only |

**This skill focuses on ExtendScript/JavaScript** as the cross-platform, most widely used option.

### Executing Scripts

- **Scripts menu**: File > Scripts lists scripts from the application scripts folder
- **Other Scripts**: File > Scripts > Other Scripts to browse and run any `.jsx` file
- **Startup Scripts**: Place scripts in the Startup Scripts folder to run automatically on launch
- **Target directive**: Begin scripts with `#target illustrator` when running from ESTK or external tools
- **`#targetengine` directive**: Use `#targetengine "session"` to persist variables across script executions
- **External invocation**: Scripts are frequently launched from outside Illustrator — by shell scripts, task runners, CI jobs, ExtendScript Toolkit (`ExtendScript Toolkit.exe -run script.jsx`), or `BridgeTalk` messages from other Adobe apps. See [External Invocation & Argument Passing](#external-invocation--argument-passing).

### Naming Conventions (JavaScript)

- Objects and properties use **camelCase**: `activeDocument`, `pathItems`, `textFrames`
- The `app` global references the `Application` object
- Collection indices are **zero-based**: `documents[0]` is the frontmost document
- Use `typename` property to identify object types at runtime

## Object Model Overview

The Illustrator DOM follows a strict containment hierarchy:

```
Application (app)
├── activeDocument / documents[]
│   ├── layers[]
│   │   ├── pageItems[] (all artwork)
│   │   ├── pathItems[]
│   │   ├── compoundPathItems[]
│   │   ├── textFrames[]
│   │   ├── placedItems[]
│   │   ├── rasterItems[]
│   │   ├── meshItems[]
│   │   ├── pluginItems[]
│   │   ├── graphItems[]
│   │   ├── symbolItems[]
│   │   ├── nonNativeItems[]
│   │   ├── legacyTextItems[]
│   │   └── groupItems[]
│   ├── artboards[]
│   ├── views[]
│   ├── selection (array of selected items)
│   ├── swatches[], spots[], gradients[], patterns[]
│   ├── graphicStyles[], brushes[], symbols[]
│   ├── textFonts[] (via app.textFonts)
│   ├── stories[], characterStyles[], paragraphStyles[]
│   ├── variables[], datasets[]
│   └── inkList[], printOptions
├── preferences
├── printerList[]
└── textFonts[]
```

### Top-Level Objects

- **Application** (`app`): The root object. Provides access to documents, preferences, fonts, and printers. Key properties: `activeDocument`, `documents`, `textFonts`, `printerList`, `userInteractionLevel`, `version`.
- **Document**: Represents an open `.ai` file. Key properties: `layers`, `pageItems`, `selection`, `activeLayer`, `width`, `height`, `rulerOrigin`, `documentColorSpace`. Key methods: `saveAs()`, `exportFile()`, `close()`, `print()`.
- **Layer**: A drawing layer. Key properties: `pageItems`, `pathItems`, `textFrames`, `visible`, `locked`, `opacity`, `name`, `zOrderPosition`, `color`.

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

## Working with Documents

### Creating and Opening

```javascript
// Create a new document
var doc = app.documents.add();

// Create with a preset
var preset = new DocumentPreset();
preset.width = 612;  // 8.5 inches
preset.height = 792; // 11 inches
preset.colorMode = DocumentColorSpace.CMYK;
var doc = app.documents.addDocument("Print", preset);

// Open an existing file
var fileRef = new File("/path/to/file.ai");
var doc = app.open(fileRef);
```

### Saving and Exporting

```javascript
// Save as Illustrator format
var saveOpts = new IllustratorSaveOptions();
saveOpts.compatibility = Compatibility.ILLUSTRATOR17; // CC
doc.saveAs(new File("/path/to/output.ai"), saveOpts);

// Export as PDF
var pdfOpts = new PDFSaveOptions();
pdfOpts.compatibility = PDFCompatibility.ACROBAT7;
pdfOpts.preserveEditability = false;
doc.saveAs(new File("/path/to/output.pdf"), pdfOpts);

// Export as PNG
var pngOpts = new ExportOptionsPNG24();
pngOpts.horizontalScale = 300;
pngOpts.verticalScale = 300;
pngOpts.transparency = true;
doc.exportFile(new File("/path/to/output.png"), ExportType.PNG24, pngOpts);

// Export as SVG
var svgOpts = new ExportOptionsSVG();
svgOpts.fontType = SVGFontType.OUTLINEFONT;
doc.exportFile(new File("/path/to/output.svg"), ExportType.SVG, svgOpts);
```

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

## Working with Colors

### Color Objects

```javascript
// RGB Color (values 0-255)
var red = new RGBColor();
red.red = 255;
red.green = 0;
red.blue = 0;

// CMYK Color (values 0-100)
var cyan = new CMYKColor();
cyan.cyan = 100;
cyan.magenta = 0;
cyan.yellow = 0;
cyan.black = 0;

// Grayscale (0-100, 0 = black)
var gray = new GrayColor();
gray.gray = 50;

// Lab Color
var lab = new LabColor();
lab.l = 50;
lab.a = 20;
lab.b = -30;

// No color (transparent)
var none = new NoColor();
```

### Applying Colors

```javascript
var item = doc.pathItems[0];
item.fillColor = red;
item.strokeColor = cyan;

// Gradient fill
var gradient = doc.gradients.add();
gradient.type = GradientType.LINEAR;
gradient.gradientStops[0].color = red;
gradient.gradientStops[1].color = cyan;

var gradColor = new GradientColor();
gradColor.gradient = gradient;
item.fillColor = gradColor;
```

### Spot Colors and Swatches

```javascript
// Create a spot color
var spot = doc.spots.add();
spot.name = "My Spot Color";
spot.color = red; // Base color definition

var spotColor = new SpotColor();
spotColor.spot = spot;
spotColor.tint = 100;

item.fillColor = spotColor;

// Access a swatch by name
var swatch = doc.swatches.getByName("PANTONE 185 C");
item.fillColor = swatch.color;
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

## Working with Layers

```javascript
var doc = app.activeDocument;

// Create a layer
var newLayer = doc.layers.add();
newLayer.name = "Background";
newLayer.visible = true;
newLayer.locked = false;
newLayer.opacity = 100;

// Access existing layers
var topLayer = doc.layers[0];
var layerByName = doc.layers.getByName("Background");

// Move items between layers
var item = doc.pathItems[0];
item.move(newLayer, ElementPlacement.PLACEATBEGINNING);

// Reorder layers
newLayer.zOrder(ZOrderMethod.SENDTOBACK);
```

## Working with Selections

```javascript
// Get current selection
var sel = app.activeDocument.selection;

// Iterate selected items
for (var i = 0; i < sel.length; i++) {
    var item = sel[i];
    // Check type using typename
    if (item.typename === "PathItem") {
        item.fillColor = red;
    } else if (item.typename === "TextFrame") {
        item.contents = "Modified";
    }
}

// Select an item programmatically
doc.pathItems[0].selected = true;

// Deselect all
doc.selection = null;
```

## Working with Symbols

```javascript
// Place a symbol instance
var sym = doc.symbols.getByName("MySymbol");
var instance = doc.symbolItems.add(sym);
instance.position = [200, 400];

// Access symbol definition
var symDef = instance.symbol;

// Break link to symbol (expand to regular art)
instance.breakLink();
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

## Working with Artboards

```javascript
var doc = app.activeDocument;

// Access artboards
var ab = doc.artboards[0];
var rect = ab.artboardRect; // [left, top, right, bottom]

// Create a new artboard
var newAB = doc.artboards.add([0, 0, 612, 792]); // Letter size
newAB.name = "Page 2";

// Set active artboard
doc.artboards.setActiveArtboardIndex(1);
```

## Data-Driven Graphics (Variables and Datasets)

```javascript
// Variables link document items to data fields
var v = doc.variables.add();
v.kind = VariableKind.TEXTUAL;
v.name = "headline";

// Link a text frame to the variable
var tf = doc.textFrames[0];
tf.contentVariable = v;

// Create datasets for batch content
var ds = doc.dataSets.add();
ds.name = "Version 1";
// Dataset captures current variable bindings

// Switch datasets to swap content
doc.dataSets[0].display();
```

## Printing

```javascript
var doc = app.activeDocument;
var opts = new PrintOptions();

opts.printPreset = "Default";

// Paper options
var paperOpts = new PrintPaperOptions();
paperOpts.name = "Letter";
opts.paperOptions = paperOpts;

// Job options
var jobOpts = new PrintJobOptions();
jobOpts.copies = 1;
jobOpts.designation = PrintArtworkDesignation.VISIBLELAYERS;
opts.jobOptions = jobOpts;

doc.print(opts);
```

## User Interaction Levels

Control whether Illustrator shows dialogs during script execution:

```javascript
// Suppress all dialogs
app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

// Perform operations that might prompt dialogs...
doc.close(SaveOptions.DONOTSAVECHANGES);

// Restore dialog display
app.userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
```

## Working with Methods (JavaScript-Specific)

When calling methods with multiple optional parameters, use `undefined` to skip middle parameters:

```javascript
// rotate(angle, [changePositions], [changeFillPatterns], [changeFillGradients], ...)
item.rotate(30, undefined, undefined, true);
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

## Troubleshooting

- **"undefined is not an object"**: Usually means the collection is empty or the index is out of bounds. Check `.length` before accessing items.
- **Script runs but nothing changes visually**: Call `app.redraw()` to force a screen refresh after modifications.
- **Color mode mismatch**: Document color space (RGB vs CMYK) must match color objects. Use `doc.documentColorSpace` to check.
- **Position seems wrong**: Remember scripted documents use bottom-left origin with Y increasing upward. The `position` property is the top-left of the bounding box.
- **Text not appearing**: Ensure the text frame has a non-zero size. For point text, set `position`; for area text, provide a valid path to `areaText()`.
- **File paths on Windows**: Use forward slashes (`/`) or double backslashes (`\\`) in path strings, or use the `File` object constructor.
- **Dialog boxes interrupting batch scripts**: Set `app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS` before batch operations.
- **Collections use `getByName()`**: Many collection objects support `getByName("name")` which throws an error if not found; wrap in try/catch.
- **"Target layer cannot be modified"**: A locked layer, sublayer, or parent group (often a clip group like `Cover_Mask`) is blocking the edit. Recursively clear `locked` and `hidden` across the document before modifying. See [Recursively Unlock Layers and Groups](#recursively-unlock-layers-and-groups-before-editing).
- **"Unable to set placed item's file, is the file path provided valid?"**: The file exists and the path is correct, but `PlacedItem.file` does not accept the format. SVG is the most common cause — use the [open / copy / paste pattern](#placing-svg-content-copypaste-pattern) instead.
- **`RasterItem.file = newFile` does nothing or throws**: `RasterItem` does not expose a writable `file` property. Add a new `PlacedItem` to the same parent, restore the bounds and name, then `.remove()` the raster.
- **`arguments[0]` is `[object BridgeTalk]`** (or empty): The script was launched through ESTK `-run` or a `BridgeTalk` message; positional arguments are not forwarded. Use a sidecar file at a known absolute path. See [External Invocation & Argument Passing](#external-invocation--argument-passing).
- **`$.fileName` is empty**: Same external-launcher cause. Do not derive resource paths from `$.fileName` in scripts that may be invoked headlessly — use absolute paths or `Folder.temp`.
- **Script appears to do nothing**: Almost always either a locked ancestor, suppressed dialogs swallowing the error, or a missing explicit `saveAs` after edits. Add a top-level `try`/`catch` that logs to an absolute path to confirm execution and capture the error.
- **`item.resize(sx, sy)` recentered the artwork unexpectedly**: `resize` defaults to scaling around the item's center (`Transformation.CENTER`). Pass an explicit `scaleAbout` argument or follow with `translate(dx, dy)` to reposition.

## Scripting Constants Reference

Common enumeration constants used across the API:

| Category | Constants |
|---|---|
| **Color Space** | `DocumentColorSpace.RGB`, `DocumentColorSpace.CMYK` |
| **Justification** | `Justification.LEFT`, `Justification.CENTER`, `Justification.RIGHT`, `Justification.FULLJUSTIFY` |
| **Point Type** | `PointType.SMOOTH`, `PointType.CORNER` |
| **Stroke Cap** | `StrokeCap.BUTTENDCAP`, `StrokeCap.ROUNDENDCAP`, `StrokeCap.PROJECTINGENDCAP` |
| **Stroke Join** | `StrokeJoin.MITERENDJOIN`, `StrokeJoin.ROUNDENDJOIN`, `StrokeJoin.BEVELENDJOIN` |
| **Blend Mode** | `BlendModes.NORMAL`, `BlendModes.MULTIPLY`, `BlendModes.SCREEN`, `BlendModes.OVERLAY` |
| **Save Options** | `SaveOptions.SAVECHANGES`, `SaveOptions.DONOTSAVECHANGES`, `SaveOptions.PROMPTTOSAVECHANGES` |
| **Export Type** | `ExportType.PNG24`, `ExportType.PNG8`, `ExportType.JPEG`, `ExportType.SVG`, `ExportType.TIFF`, `ExportType.PHOTOSHOP`, `ExportType.AUTOCAD`, `ExportType.FLASH` |
| **Element Placement** | `ElementPlacement.PLACEATBEGINNING`, `ElementPlacement.PLACEATEND`, `ElementPlacement.PLACEBEFORE`, `ElementPlacement.PLACEAFTER`, `ElementPlacement.INSIDE` |
| **Z-Order** | `ZOrderMethod.BRINGTOFRONT`, `ZOrderMethod.SENDTOBACK`, `ZOrderMethod.BRINGFORWARD`, `ZOrderMethod.SENDBACKWARD` |
| **Gradient Type** | `GradientType.LINEAR`, `GradientType.RADIAL` |
| **Text Frame Kind** | `TextType.POINTTEXT`, `TextType.AREATEXT`, `TextType.PATHTEXT` |
| **Variable Kind** | `VariableKind.TEXTUAL`, `VariableKind.IMAGE`, `VariableKind.VISIBILITY`, `VariableKind.GRAPH` |
| **User Interaction** | `UserInteractionLevel.DISPLAYALERTS`, `UserInteractionLevel.DONTDISPLAYALERTS` |
| **Compatibility** | `Compatibility.ILLUSTRATOR10` through `Compatibility.ILLUSTRATOR24` |

## JavaScript Object Reference (Complete API Object List)

The Illustrator JavaScript API contains the following objects, grouped by category:

### Core Objects

`Application`, `Document`, `Documents`, `DocumentPreset`, `Layer`, `Layers`, `PageItem`, `PageItems`, `View`, `Views`, `Preferences`

### Path and Shape Objects

`PathItem`, `PathItems`, `PathPoint`, `PathPoints`, `CompoundPathItem`, `CompoundPathItems`, `GroupItem`, `GroupItems`

### Text Objects

`TextFrame`, `TextRange`, `TextRanges`, `TextPath`, `Characters`, `Words`, `Paragraphs`, `Lines`, `InsertionPoint`, `InsertionPoints`, `Story`, `Stories`, `CharacterAttributes`, `ParagraphAttributes`, `CharacterStyle`, `CharacterStyles`, `ParagraphStyle`, `ParagraphStyles`, `TextFont`, `TextFonts`, `TabStopInfo`

### Color Objects

`RGBColor`, `CMYKColor`, `GrayColor`, `LabColor`, `NoColor`, `SpotColor`, `Spot`, `Spots`, `PatternColor`, `GradientColor`, `Color`, `Gradient`, `Gradients`, `GradientStop`, `GradientStops`

### Swatch and Style Objects

`Swatch`, `Swatches`, `SwatchGroup`, `SwatchGroups`, `GraphicStyle`, `GraphicStyles`, `Pattern`, `Patterns`, `Brush`, `Brushes`

### Symbol Objects

`Symbol`, `Symbols`, `SymbolItem`, `SymbolItems`

### Artboard Objects

`Artboard`, `Artboards`

### Placed and Raster Objects

`PlacedItem`, `PlacedItems`, `RasterItem`, `RasterItems`, `MeshItem`, `MeshItems`, `GraphItem`, `GraphItems`, `PluginItem`, `PluginItems`, `NonNativeItem`, `NonNativeItems`, `LegacyTextItem`, `LegacyTextItems`

### Data-Driven Objects

`Variable`, `Variables`, `Dataset`, `Datasets`

### Matrix and Transform Objects

`Matrix`

### Tag Objects

`Tag`, `Tags`

### Tracing Objects

`TracingObject`, `TracingOptions`

### Save and Export Options

`IllustratorSaveOptions`, `EPSSaveOptions`, `PDFSaveOptions`, `FXGSaveOptions`, `ExportOptionsAutoCAD`, `ExportOptionsFlash`, `ExportOptionsGIF`, `ExportOptionsJPEG`, `ExportOptionsPhotoshop`, `ExportOptionsPNG8`, `ExportOptionsPNG24`, `ExportOptionsSVG`, `ExportOptionsTIFF`

### Open Options

`OpenOptions`, `OpenOptionsAutoCAD`, `OpenOptionsFreeHand`, `OpenOptionsPhotoshop`, `PDFFileOptions`, `PhotoshopFileOptions`

### Print Objects

`PrintOptions`, `PrintJobOptions`, `PrintPaperOptions`, `PrintColorManagementOptions`, `PrintColorSeparationOptions`, `PrintCoordinateOptions`, `PrintFlattenerOptions`, `PrintFontOptions`, `PrintPageMarksOptions`, `PrintPostScriptOptions`, `Printer`, `PrinterInfo`, `Paper`, `PaperInfo`, `PPDFile`, `PPDFileInfo`, `Ink`, `InkInfo`, `Screen`, `ScreenInfo`, `ScreenSpotFunction`

### Image and Rasterize Options

`ImageCaptureOptions`, `RasterEffectOptions`, `RasterizeOptions`

## References

- [Changelog](https://ai-scripting.docsforadobe.dev/introduction/changelog/) - Recent scripting API changes (CC 2020 added `Document.getPageItemFromUuid` and `PageItem.uuid`; CC 2017 added `Application.getIsFileOpen`)
- [Illustrator Scripting Guide](https://ai-scripting.docsforadobe.dev/) - Full community-maintained documentation
