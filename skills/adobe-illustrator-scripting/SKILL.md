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

## Extended guide

These sections are in [`references/extended-guide.md`](references/extended-guide.md); read the relevant one when the task needs it:

- [Measurement Units and Coordinates](references/extended-guide.md#measurement-units-and-coordinates)
- [Working with Paths and Shapes](references/extended-guide.md#working-with-paths-and-shapes)
- [Working with Text](references/extended-guide.md#working-with-text)
- [Transformations](references/extended-guide.md#transformations)
- [External Invocation & Argument Passing](references/extended-guide.md#external-invocation--argument-passing)
- [Common Patterns](references/extended-guide.md#common-patterns)

## References

- [Changelog](https://ai-scripting.docsforadobe.dev/introduction/changelog/) - Recent scripting API changes (CC 2020 added `Document.getPageItemFromUuid` and `PageItem.uuid`; CC 2017 added `Application.getIsFileOpen`)
- [Illustrator Scripting Guide](https://ai-scripting.docsforadobe.dev/) - Full community-maintained documentation
