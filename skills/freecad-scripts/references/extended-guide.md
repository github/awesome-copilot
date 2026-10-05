# FreeCAD Scripts: extended guide

Sections moved verbatim from [SKILL.md](../SKILL.md) to keep it under 500 lines.

## Creating Parametric Objects (FeaturePython)

FeaturePython objects are custom parametric objects with properties that trigger recomputation:

```python
import FreeCAD
import Part

class MyBox:
    """A custom parametric box."""

    def __init__(self, obj):
        obj.Proxy = self
        obj.addProperty("App::PropertyLength", "Length", "Dimensions",
                         "Box length").Length = 10.0
        obj.addProperty("App::PropertyLength", "Width", "Dimensions",
                         "Box width").Width = 10.0
        obj.addProperty("App::PropertyLength", "Height", "Dimensions",
                         "Box height").Height = 10.0

    def execute(self, obj):
        """Called on document recompute."""
        obj.Shape = Part.makeBox(obj.Length, obj.Width, obj.Height)

    def onChanged(self, obj, prop):
        """Called when a property changes."""
        pass

    def __getstate__(self):
        return None

    def __setstate__(self, state):
        return None


class ViewProviderMyBox:
    """View provider for custom icon and display settings."""

    def __init__(self, vobj):
        vobj.Proxy = self

    def getIcon(self):
        return ":/icons/Part_Box.svg"

    def attach(self, vobj):
        self.Object = vobj.Object

    def updateData(self, obj, prop):
        pass

    def onChanged(self, vobj, prop):
        pass

    def __getstate__(self):
        return None

    def __setstate__(self, state):
        return None


# --- Usage ---
doc = FreeCAD.ActiveDocument or FreeCAD.newDocument("Test")
obj = doc.addObject("Part::FeaturePython", "CustomBox")
MyBox(obj)
ViewProviderMyBox(obj.ViewObject)
doc.recompute()
```

### Common Property Types

| Property Type | Python Type | Description |
|---|---|---|
| `App::PropertyBool` | `bool` | Boolean |
| `App::PropertyInteger` | `int` | Integer |
| `App::PropertyFloat` | `float` | Float |
| `App::PropertyString` | `str` | String |
| `App::PropertyLength` | `float` (units) | Length with units |
| `App::PropertyAngle` | `float` (deg) | Angle in degrees |
| `App::PropertyVector` | `FreeCAD.Vector` | 3D vector |
| `App::PropertyPlacement` | `FreeCAD.Placement` | Position + rotation |
| `App::PropertyLink` | object ref | Link to another object |
| `App::PropertyLinkList` | list of refs | Links to multiple objects |
| `App::PropertyEnumeration` | `list`/`str` | Dropdown selection |
| `App::PropertyFile` | `str` | File path |
| `App::PropertyColor` | `tuple` | RGB color (0.0-1.0) |
| `App::PropertyPythonObject` | any | Serializable Python object |

## Macro Best Practices

```python
# Standard macro header
# -*- coding: utf-8 -*-
# FreeCAD Macro: MyMacro
# Description: Brief description of what the macro does
# Author: YourName
# Version: 1.0
# Date: 2026-04-07

import FreeCAD
import Part
from FreeCAD import Base

# Guard for GUI availability
if FreeCAD.GuiUp:
    import FreeCADGui
    from PySide2 import QtWidgets, QtCore

def main():
    doc = FreeCAD.ActiveDocument
    if doc is None:
        FreeCAD.Console.PrintError("No active document\n")
        return

    if FreeCAD.GuiUp:
        sel = FreeCADGui.Selection.getSelection()
        if not sel:
            FreeCAD.Console.PrintWarning("No objects selected\n")

    # ... macro logic ...

    doc.recompute()
    FreeCAD.Console.PrintMessage("Macro completed\n")

if __name__ == "__main__":
    main()
```

### Selection Handling

```python
# Get selected objects
sel = FreeCADGui.Selection.getSelection()           # List of objects
sel_ex = FreeCADGui.Selection.getSelectionEx()       # Extended (sub-elements)

for selobj in sel_ex:
    obj = selobj.Object
    for sub in selobj.SubElementNames:
        print(f"{obj.Name}.{sub}")
        shape = obj.getSubObject(sub)  # Get sub-shape

# Select programmatically
FreeCADGui.Selection.addSelection(doc.MyBox)
FreeCADGui.Selection.addSelection(doc.MyBox, "Face1")
FreeCADGui.Selection.clearSelection()
```

### Console Output

```python
FreeCAD.Console.PrintMessage("Info message\n")
FreeCAD.Console.PrintWarning("Warning message\n")
FreeCAD.Console.PrintError("Error message\n")
FreeCAD.Console.PrintLog("Debug/log message\n")
```

## Common Patterns

### Parametric Pad from Sketch

```python
doc = FreeCAD.ActiveDocument

# Create sketch
sketch = doc.addObject("Sketcher::SketchObject", "Sketch")
sketch.addGeometry(Part.LineSegment(FreeCAD.Vector(0,0,0), FreeCAD.Vector(10,0,0)))
sketch.addGeometry(Part.LineSegment(FreeCAD.Vector(10,0,0), FreeCAD.Vector(10,10,0)))
sketch.addGeometry(Part.LineSegment(FreeCAD.Vector(10,10,0), FreeCAD.Vector(0,10,0)))
sketch.addGeometry(Part.LineSegment(FreeCAD.Vector(0,10,0), FreeCAD.Vector(0,0,0)))
# Close with coincident constraints
for i in range(3):
    sketch.addConstraint(Sketcher.Constraint("Coincident", i, 2, i+1, 1))
sketch.addConstraint(Sketcher.Constraint("Coincident", 3, 2, 0, 1))

# Pad (PartDesign)
pad = doc.addObject("PartDesign::Pad", "Pad")
pad.Profile = sketch
pad.Length = 5.0
sketch.Visibility = False
doc.recompute()
```

### Export Shapes

```python
# STEP export
Part.export([doc.MyBox], "/path/to/output.step")

# STL export (mesh)
import Mesh
Mesh.export([doc.MyBox], "/path/to/output.stl")

# IGES export
Part.export([doc.MyBox], "/path/to/output.iges")

# Multiple formats via importlib
import importlib
importlib.import_module("importOBJ").export([doc.MyBox], "/path/to/output.obj")
```

### Units and Quantities

```python
# FreeCAD uses mm internally
q = FreeCAD.Units.Quantity("10 mm")
q_inch = FreeCAD.Units.Quantity("1 in")
print(q_inch.getValueAs("mm"))  # 25.4

# Parse user input with units
q = FreeCAD.Units.parseQuantity("2.5 in")
value_mm = float(q)  # Value in mm (internal unit)
```
