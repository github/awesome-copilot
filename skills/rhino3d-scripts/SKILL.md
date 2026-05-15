---
name: rhino3d-scripts
description: 'Authoring and debugging scripts for Rhinoceros 3D (Rhino 8 and later). Use when asked to write RhinoScript (VBScript / .rvb / .vbs), RhinoPython, or RhinoCommon-based scripts; automate Rhino modeling tasks; build command macros; manipulate Rhino geometry, layers, blocks, or document objects; pick objects from the viewport; control redraw and undo; or load and run scripts from the Rhino Script Editor. Covers `rhinoscriptsyntax`, `scriptcontext`, the `Rhino.*` RhinoCommon namespaces (`Rhino.Geometry`, `Rhino.DocObjects`, `Rhino.Input`, `Rhino.UI`, `Rhino.Display`, `Rhino.FileIO`), and the Rhino 8 unified Script Editor.'
---

# Rhino 3D Scripting Skill

Write production-quality scripts for Rhinoceros 3D. Covers the three scripting surfaces (RhinoScript/VBScript, RhinoPython, direct RhinoCommon .NET) and the Rhino 8+ Script Editor.

## When to Use This Skill

- User asks to write, edit, or debug a `.rvb`, `.vbs`, or `.py` Rhino script
- User wants a Rhino **command macro** or wants to automate a sequence of Rhino commands
- User wants to manipulate geometry, layers, blocks, materials, viewports, or annotations from code
- User mentions `rhinoscriptsyntax`, `scriptcontext`, `RhinoCommon`, `Rhino.Geometry`, `RhinoDoc`, or the Script Editor
- User wants to pick objects, prompt for input, or build a small UI inside Rhino
- User asks how to load, run, or distribute a script (startup scripts, aliases, toolbar buttons)

## Choosing a Scripting Surface

Pick the surface based on the task, not preference. Recommend Python by default for new work.

| Surface | When to choose | File ext |
|---|---|---|
| **RhinoPython** (`rhinoscriptsyntax` + RhinoCommon) | Default for new scripts. Best ecosystem, readable, full RhinoCommon access. | `.py` |
| **RhinoScript** (VBScript) | Maintaining legacy `.rvb`/`.vbs` files; integrating with VBA/COM. | `.rvb`, `.vbs` |
| **RhinoCommon (C#/.NET) via Script Editor** | Performance-critical loops, complex geometry, leveraging .NET libraries. | `.cs` |
| **Command macro** | Pure sequence of existing Rhino commands; no logic. | toolbar/alias |

A macro is **not** a script — it is a string of command-line input (e.g. `! _-Line 0,0,0 10,0,0 _Enter`). Use a script the moment you need a variable, loop, or conditional.

## Prerequisites

- Rhino 7 or later (Rhino 8 strongly recommended — unified Script Editor supports Python 3, VB, and C# in one window).
- Script Editor: type `_ScriptEditor` (Rhino 8) or `_EditPythonScript` / `_EditScript` (older).
- Run a saved file from the command line with `_-RunPythonScript` or `_LoadScript` + `_RunScript`.

## Core Patterns

### Python: minimal scaffold

```python
import rhinoscriptsyntax as rs
import scriptcontext as sc
import Rhino

def main():
    obj_id = rs.GetObject("Select a curve", filter=rs.filter.curve, preselect=True)
    if not obj_id:
        return
    length = rs.CurveLength(obj_id)
    print("Length: {0:.4f}".format(length))

if __name__ == "__main__":
    main()
```

### Python: working with RhinoCommon directly

```python
import Rhino
import scriptcontext as sc

doc = sc.doc  # Rhino.RhinoDoc.ActiveDoc
tol = doc.ModelAbsoluteTolerance

circle = Rhino.Geometry.Circle(Rhino.Geometry.Point3d(0, 0, 0), 5.0)
curve_id = doc.Objects.AddCircle(circle)
doc.Views.Redraw()
```

### VBScript: minimal scaffold

```vbscript
Option Explicit

Call Main()

Sub Main()
    Dim strObject
    strObject = Rhino.GetObject("Select a curve", 4)  ' 4 = curve filter
    If IsNull(strObject) Then Exit Sub
    Rhino.Print "Length: " & Rhino.CurveLength(strObject)
End Sub
```

### Picking objects with a custom filter (Python, RhinoCommon)

```python
import Rhino
import scriptcontext as sc

go = Rhino.Input.Custom.GetObject()
go.SetCommandPrompt("Select breps")
go.GeometryFilter = Rhino.DocObjects.ObjectType.Brep
go.SubObjectSelect = False
go.GetMultiple(1, 0)
if go.CommandResult() != Rhino.Commands.Result.Success:
    pass
else:
    ids = [go.Object(i).ObjectId for i in range(go.ObjectCount)]
```

## Step-by-Step Workflows

### Bulk-modify many objects fast

1. Disable redraw: `rs.EnableRedraw(False)`.
2. Wrap mutations in a single undo record: `undo = doc.BeginUndoRecord("My Op")` … `doc.EndUndoRecord(undo)`.
3. Use RhinoCommon directly inside the loop (skip `rhinoscriptsyntax` overhead).
4. Re-enable redraw and call `doc.Views.Redraw()` in a `try`/`finally` so a crash never leaves the viewport frozen.

### Distribute a script to a teammate

1. Save the `.py` / `.rvb` somewhere on disk.
2. Add the folder to `Options → Files → Search paths` so Rhino can find it by name.
3. Create a toolbar button or alias whose macro is:
   - Python: `! _-RunPythonScript "MyScript.py"`
   - RhinoScript: `! _-LoadScript "MyScript.rvb" _-RunScript MySubName`
4. The leading `!` cancels any running command; `-` runs the command in script (no-dialog) mode.

### Run code at Rhino startup

1. Place a `.rvb`/`.py` in a search path.
2. `Tools → Options → RhinoScript` (or `Python`) → add to **Startup** list. The file executes once per session.

## Gotchas

- **`rhinoscriptsyntax` returns GUIDs, RhinoCommon returns objects.** Mixing them is fine, but `doc.Objects.Find(guid)` is the bridge from a `rs.*` id to a `RhinoObject`.
- **Coordinates differ by surface.** Python uses `(x, y, z)` tuples *or* `Rhino.Geometry.Point3d`; VBScript uses 3-element `Array(x, y, z)`. Never pass a Python list to a VBScript helper through COM.
- **`Option Explicit` is off by default in VBScript.** Typos silently create new variables. Always add `Option Explicit` at the top of `.rvb` files.
- **VBScript has no block scope.** All `Dim`s inside a `Sub` are hoisted to the top of the procedure. Loop counters leak.
- **`Nothing`, `Empty`, and `Null` are different** in VBScript. Use `IsNull` for `Rhino.GetObject` failure, `IsEmpty` for uninitialized `Variant`, `Is Nothing` for object refs.
- **Parentheses change calling semantics in VBScript.** `Call Foo(a, b)` and `Foo a, b` are valid; `Foo(a, b)` (no `Call`, with parens) is **not** a call to a Sub — it’s a syntax error for multi-arg subs and a forced `ByVal` for single-arg.
- **Tolerance is per-document.** Always read `doc.ModelAbsoluteTolerance` rather than hardcoding `0.001`; users work in mm, m, inches, etc.
- **Long loops should poll `Rhino.RhinoApp.EscapeKeyPressed`** so the user can cancel. Otherwise Rhino appears frozen.
- **GUID strings vs `System.Guid`.** `rhinoscriptsyntax` accepts either; RhinoCommon wants `System.Guid`. Convert with `System.Guid(str_id)` if needed.
- **Don’t call `doc.Views.Redraw()` inside a tight loop.** Toggle redraw once outside the loop.
- **`.rvb` is just `.vbs` renamed** with a Rhino-specific extension so Rhino’s `LoadScript` recognizes it. Same VBScript engine.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `rs.GetObject` returns `None` immediately | The user pressed Escape, or your `filter` excludes everything. Re-check `rs.filter.*` flags. |
| “Unable to find script” when running by name | The folder isn’t in `Options → Files → Search paths`. |
| VBScript `Type mismatch` on coordinates | You passed a 2-element array. Rhino requires 3-element `Array(x, y, z)`. |
| Python `ImportError: No module named Rhino` | You’re running CPython outside Rhino. RhinoCommon is only available in Rhino’s embedded Python (or via `rhino3dm` for read-only file work). |
| Created geometry doesn’t appear | You forgot `doc.Views.Redraw()`, or `rs.EnableRedraw(False)` was never re-enabled. |
| Undo undoes only the last object of a batch | Wrap the batch in `BeginUndoRecord` / `EndUndoRecord`. |
| Script works alone but fails as a startup script | Startup runs before any document is open — return early or skip document-dependent work when `sc.doc is None`. |
| `rs.Command("...")` returns `False` | The macro string is malformed. Prefix with `!` and `-`, end every prompt with `_Enter` or a value. |

## References

- [references/rhinoscriptsyntax-cheatsheet.md](references/rhinoscriptsyntax-cheatsheet.md) — most-used `rs.*` functions by category.
- [references/rhinocommon-map.md](references/rhinocommon-map.md) — which namespace to import for which task.
- [references/macros-and-loading.md](references/macros-and-loading.md) — command-line macro syntax, `LoadScript` / `RunScript`, search paths.
- [references/vbscript-quirks.md](references/vbscript-quirks.md) — VBScript-only traps relevant to RhinoScript.

### Upstream docs

- RhinoScript landing: <https://docs.mcneel.com/rhino/8/help/en-us/information/rhinoscripting.htm>
- Developer hub: <https://developer.rhino3d.com/>
- RhinoCommon API index: <https://mcneel.github.io/rhinocommon-api-docs/api/RhinoCommon/html/R_Project_RhinoCommon.htm>
- Example scripts repo: <https://github.com/mcneel/rhino-developer-samples/tree/8/rhinoscript>
