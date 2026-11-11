# After Effects Object Model Reference

Signatures as the After Effects Scripting Guide gives them
(<https://ae-scripting.docsforadobe.dev/>). Square brackets mark optional
arguments. Check the guide for the version that added anything not listed
here.

## Application (`app`)

| Member | Notes |
| --- | --- |
| `app.project` | The open project. Always present; `app.project.file` is `null` until it is saved. |
| `app.version` | String. Compare with `parseFloat`. |
| `app.newProject()` | Returns a `Project`, or `null`. Prompts to save a changed project, so close it first. |
| `app.open([file])` | Returns a `Project`, or `null` when cancelled. |
| `app.beginUndoGroup(undoString)` / `app.endUndoGroup()` | `endUndoGroup` without a begin is an error. |
| `app.beginSuppressDialogs()` / `app.endSuppressDialogs(alert)` | Holds back script error dialogs. |
| `app.scheduleTask(stringToExecute, delay, repeat)` | `delay` in milliseconds. Returns an integer ID for `app.cancelTask(taskID)`. |
| `app.executeCommand(id)` / `app.findMenuCommandId(name)` | `findMenuCommandId` is not reliable across language versions. |
| `app.purge(target)` | Replicates `Edit > Purge`, for example `PurgeTarget.ALL_CACHES`. |
| `app.effects` | 0-based array of `{ displayName, category, matchName, version }`. |
| `app.exitCode` | Returned on the command line on Windows, and as the `DoScript` result on macOS. |
| `app.exitAfterLaunchAndEval` | Windows command-line runs only. |
| `app.isRenderEngine` | True when After Effects runs as a render engine. |
| `app.quit()` | Quits After Effects. |
| `system.callSystem(cmd)` | Runs a command and returns its output. On Windows wrap it as `cmd.exe /c "..."`. |

## Project (`app.project`)

| Member | Notes |
| --- | --- |
| `item(index)`, `numItems` | 1-based. |
| `itemByID(id)` | From 13.0. |
| `activeItem` | The item selected in the Project panel, or `null`. |
| `rootFolder` | The top `FolderItem`. |
| `importFile(importOptions)` | Returns a `FootageItem`. `new ImportOptions()` or `new ImportOptions(file)`. |
| `save([file])` | |
| `close(closeOptions)` | `CloseOptions.DO_NOT_SAVE_CHANGES`, `PROMPT_TO_SAVE_CHANGES` or `SAVE_CHANGES`. |
| `renderQueue` | See [Render queue](#render-queue). |
| `expressionEngine` | `"javascript-1.0"` or `"extendscript"`. From 16.0. |

## ItemCollection (`app.project.items`)

| Member | Notes |
| --- | --- |
| `addComp(name, width, height, pixelAspect, duration, frameRate)` | Width and height 4 to 30000; pixel aspect 0.01 to 100.0; duration 0.0 to 10800.0 seconds; frame rate 1.0 to 99.0. Returns a `CompItem`. |
| `addFolder(name)` | Returns a `FolderItem`. |

Every item has `name`, `id` and a read/write `parentFolder`.

## CompItem

| Member | Notes |
| --- | --- |
| `layer(index)`, `numLayers` | 1-based; `layer(1)` is the top. |
| `layers` | The `LayerCollection`. |
| `selectedLayers` | 0-based JavaScript array. |
| `width`, `height`, `duration`, `frameRate`, `frameDuration` | Duration in seconds. |
| `workAreaStart`, `workAreaDuration` | Seconds, read/write. |
| `time` | The current time indicator, in seconds. |

## LayerCollection (`comp.layers`)

| Member | Notes |
| --- | --- |
| `add(item[, duration])` | Placement follows the **Create Layers at Composition Start Time** preference. |
| `addSolid(color, name, width, height, pixelAspect[, duration])` | `color` is `[r, g, b]`, each 0.0 to 1.0. |
| `addText([sourceText])` | A string or a `TextDocument`. Returns a `TextLayer`. |
| `byName(name)` | The first (topmost) layer with that name. |

## Layer and AVLayer

| Member | Notes |
| --- | --- |
| `moveToBeginning()`, `moveToEnd()`, `moveBefore(layer)`, `moveAfter(layer)` | Top, bottom, or next to another layer. |
| `stretch` | Percent of duration, -9900.0 to 9900.0. 100 is unchanged and 200 lasts twice as long. Values between 0 and 1 become 1, and values between -1 and 0 become -1. |
| `inPoint`, `outPoint`, `startTime` | Seconds. |
| `source` | The item an AVLayer shows; `source.duration` for footage. |
| `sourceRectAtTime(timeT, extents)` | Returns `{ top, left, width, height }`. |
| `audioEnabled` | Read/write; the Timeline audio switch. |
| `hasAudio`, `audioActive` | Read-only. |
| `property(nameOrMatchName)` | See below. |

`instanceof` matches only the most specific class: `TextLayer`, `ShapeLayer`,
`CameraLayer`, `LightLayer` or `AVLayer`.

## Property and PropertyGroup

| Member | Notes |
| --- | --- |
| `value` | The value at the current time. |
| `setValue(newValue)` | Throws when the property has keyframes. |
| `setValueAtTime(time, newValue)` | Adds or replaces a keyframe. |
| `setValuesAtTimes(times, newValues)` | Arrays of the same length. |
| `numKeys`, `keyValue(keyIndex)` | `keyValue` also takes a marker comment for marker properties. |
| `canSetExpression`, `expression`, `expressionEnabled`, `expressionError` | Assigning an invalid expression does not throw (checked in 26.0, on both engines), and `expressionEnabled` stays true; read `expressionError`, which is `""` when there is none. |
| `propertyIndex` | Use it to fetch a property again after its group changed. |
| `PropertyGroup.addProperty(nameOrMatchName)` | Invalidates existing references into that group. |

### Match names

| Match name | Display name |
| --- | --- |
| `ADBE Transform Group` | Transform |
| `ADBE Anchor Point` | Anchor Point |
| `ADBE Position` | Position |
| `ADBE Scale` | Scale |
| `ADBE Rotate Z` | Rotation |
| `ADBE Opacity` | Opacity |
| `ADBE Effect Parade` | Effects |
| `ADBE Text Properties` | Text |
| `ADBE Text Document` | Source Text |

Effect match names come from `app.effects`.

## Render queue

| Member | Notes |
| --- | --- |
| `app.project.renderQueue.items.add(comp)` | Returns a `RenderQueueItem`. |
| `RenderQueue.render()` | Returns only when rendering is complete. |
| `RenderQueue.queueInAME(render_immediately_in_AME)` | `false` only queues in Media Encoder; `true` also starts its queue. From 14.0; needs Media Encoder 11.0 or later. Media Encoder applies its most recently used preset. |
| `RenderQueue.canQueueInAME` | Read-only; only queued items can go to Media Encoder. |
| `RenderQueueItem.outputModule(index)` | 1 to `numOutputModules`. |
| `RenderQueueItem.applyTemplate(name)` | A render settings template; must be in `templates`. |
| `RenderQueueItem.templates` | Names of the render settings templates installed. |
| `OutputModule.applyTemplate(templateName)` | An output module template; must be in `templates`. |
| `OutputModule.templates` | Names of the output module templates installed. |
| `OutputModule.file` | ExtendScript `File`, read/write. |
| `OutputModule.getSettings()` / `setSettings(...)` | From 13.0. The object can be invalidated after a settings change; fetch it again. |
| `OutputModule.saveAsTemplate(name)` | |

## File and Folder

From the JavaScript Tools Guide (<https://extendscript.docsforadobe.dev/>):

| Member | Notes |
| --- | --- |
| `new File(path)`, `new Folder(path)` | `~` is the user's home folder. |
| `file.exists`, `file.fsName`, `file.fullName` | `fsName` is the platform path; `fullName` is URI notation. |
| `file.encoding` | Set `"UTF-8"` before reading or writing text. |
| `file.open(mode)` | `"r"`, `"w"` (erases an existing file), `"a"`, `"e"`. |
| `file.write(...)`, `file.writeln(...)`, `file.read()`, `file.close()` | `close()` returns a Boolean. |
| `Folder.temp`, `Folder.desktop`, `Folder.myDocuments` | Standard folders. |
| `$.evalFile(path[, timeout])` | Runs another script file. |
| `$.writeln(text)` | To the debugger's console. |
| `$.os` | The operating system. |
| `$.level` | Set to 1 for breakpoints inside callbacks. |
