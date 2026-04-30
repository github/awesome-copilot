---
name: freecad-scripts
description: 'Expert skill for writing FreeCAD Python scripts, macros, and automation. Use when asked to create FreeCAD models, parametric objects, Part/Mesh/Sketcher scripts, workbench tools, GUI dialogs with PySide, Coin3D scenegraph manipulation, or any FreeCAD Python API task. Covers FreeCAD scripting basics, geometry creation, FeaturePython objects, interface tools, and macro development.'
---

# FreeCAD Scripts

Expert skill for generating production-quality Python scripts for the FreeCAD CAD application. Interprets shorthand, quasi-code, and natural language descriptions of 3D modeling tasks and translates them into correct FreeCAD Python API calls.

## When to Use This Skill

- Writing Python scripts for FreeCAD's built-in console or macro system
- Creating or manipulating 3D geometry (Part, Mesh, Sketcher, Path, FEM)
- Building parametric FeaturePython objects with custom properties
- Developing GUI tools using PySide/Qt within FreeCAD
- Manipulating the Coin3D scenegraph via Pivy
- Creating custom workbenches or Gui Commands
- Automating repetitive CAD operations with macros
- Converting between mesh and solid representations
- Scripting FEM analyses, raytracing, or drawing exports

## Prerequisites

- FreeCAD installed (0.19+ recommended; 0.21+/1.0+ for latest API)
- Python 3.x (bundled with FreeCAD)
- For GUI work: PySide2 (bundled with FreeCAD)
- For scenegraph: Pivy (bundled with FreeCAD)

## FreeCAD Python Environment

FreeCAD embeds a Python interpreter. Scripts run in an environment where these key modules are available:

```python
import FreeCAD          # Core module (also aliased as 'App')
import FreeCADGui       # GUI module (also aliased as 'Gui') — only in GUI mode
import Part             # Part workbench — BRep/OpenCASCADE shapes
import Mesh             # Mesh workbench — triangulated meshes
import Sketcher         # Sketcher workbench — 2D constrained sketches
import Draft            # Draft workbench — 2D drawing tools
import Arch             # Arch/BIM workbench
import Path             # Path/CAM workbench
import FEM              # FEM workbench
import TechDraw         # TechDraw workbench (replaces Drawing)
import BOPTools         # Boolean operations
import CompoundTools    # Compound shape utilities
```

### The FreeCAD Document Model

```python
# Create or access a document
doc = FreeCAD.newDocument("MyDoc")
doc = FreeCAD.ActiveDocument

# Add objects
box = doc.addObject("Part::Box", "MyBox")
box.Length = 10.0
box.Width = 10.0
box.Height = 10.0

# Recompute
doc.recompute()

# Access objects
obj = doc.getObject("MyBox")
obj = doc.MyBox  # Attribute access also works

# Remove objects
doc.removeObject("MyBox")
```

## Core Concepts

### Vectors and Placements

```python
import FreeCAD

# Vectors
v1 = FreeCAD.Vector(1, 0, 0)
v2 = FreeCAD.Vector(0, 1, 0)
v3 = v1.cross(v2)          # Cross product
d = v1.dot(v2)              # Dot product
v4 = v1 + v2                # Addition
length = v1.Length           # Magnitude
v_norm = FreeCAD.Vector(v1)
v_norm.normalize()           # In-place normalize

# Rotations
rot = FreeCAD.Rotation(FreeCAD.Vector(0, 0, 1), 45)  # axis, angle(deg)
rot = FreeCAD.Rotation(0, 0, 45)                       # Euler angles (yaw, pitch, roll)

# Placements (position + orientation)
placement = FreeCAD.Placement(
    FreeCAD.Vector(10, 20, 0),    # translation
    FreeCAD.Rotation(0, 0, 45),   # rotation
    FreeCAD.Vector(0, 0, 0)       # center of rotation
)
obj.Placement = placement

# Matrix (4x4 transformation)
import math
mat = FreeCAD.Matrix()
mat.move(FreeCAD.Vector(10, 0, 0))
mat.rotateZ(math.radians(45))
```

### Creating and Manipulating Geometry (Part Module)

The Part module wraps OpenCASCADE and provides BRep solid modeling:

```python
import FreeCAD
import Part

# --- Primitive Shapes ---
box = Part.makeBox(10, 10, 10)               # length, width, height
cyl = Part.makeCylinder(5, 20)               # radius, height
sphere = Part.makeSphere(10)                  # radius
cone = Part.makeCone(5, 2, 10)               # r1, r2, height
torus = Part.makeTorus(10, 2)                 # major_r, minor_r

# --- Wires and Edges ---
edge1 = Part.makeLine((0, 0, 0), (10, 0, 0))
edge2 = Part.makeLine((10, 0, 0), (10, 10, 0))
edge3 = Part.makeLine((10, 10, 0), (0, 0, 0))
wire = Part.Wire([edge1, edge2, edge3])

# Circles and arcs
circle = Part.makeCircle(5)                   # radius
arc = Part.makeCircle(5, FreeCAD.Vector(0, 0, 0),
                       FreeCAD.Vector(0, 0, 1), 0, 180)  # start/end angle

# --- Faces ---
face = Part.Face(wire)                        # From a closed wire

# --- Solids from Faces/Wires ---
extrusion = face.extrude(FreeCAD.Vector(0, 0, 10))       # Extrude
revolved = face.revolve(FreeCAD.Vector(0, 0, 0),
                         FreeCAD.Vector(0, 0, 1), 360)    # Revolve

# --- Boolean Operations ---
fused = box.fuse(cyl)           # Union
cut = box.cut(cyl)              # Subtraction
common = box.common(cyl)        # Intersection
fused_clean = fused.removeSplitter()  # Clean up seams

# --- Fillets and Chamfers ---
filleted = box.makeFillet(1.0, box.Edges)          # radius, edges
chamfered = box.makeChamfer(1.0, box.Edges)        # dist, edges

# --- Loft and Sweep ---
loft = Part.makeLoft([wire1, wire2], True)          # wires, solid
swept = Part.Wire([path_edge]).makePipeShell([profile_wire],
                                              True, False)  # solid, frenet

# --- BSpline Curves ---
from FreeCAD import Vector
points = [Vector(0,0,0), Vector(1,2,0), Vector(3,1,0), Vector(4,3,0)]
bspline = Part.BSplineCurve()
bspline.interpolate(points)
edge = bspline.toShape()

# --- Show in document ---
Part.show(box, "MyBox")    # Quick display (adds to active doc)
# Or explicitly:
doc = FreeCAD.ActiveDocument or FreeCAD.newDocument()
obj = doc.addObject("Part::Feature", "MyShape")
obj.Shape = box
doc.recompute()
```

### Topological Exploration

```python
shape = obj.Shape

# Access sub-elements
shape.Vertexes    # List of Vertex objects
shape.Edges       # List of Edge objects
shape.Wires       # List of Wire objects
shape.Faces       # List of Face objects
shape.Shells      # List of Shell objects
shape.Solids      # List of Solid objects

# Bounding box
bb = shape.BoundBox
print(bb.XMin, bb.XMax, bb.YMin, bb.YMax, bb.ZMin, bb.ZMax)
print(bb.Center)

# Properties
shape.Volume
shape.Area
shape.Length       # For edges/wires
face.Surface       # Underlying geometric surface
edge.Curve         # Underlying geometric curve

# Shape type
shape.ShapeType    # "Solid", "Shell", "Face", "Wire", "Edge", "Vertex", "Compound"
```

### Mesh Module

```python
import Mesh

# Create mesh from vertices and facets
mesh = Mesh.Mesh()
mesh.addFacet(
    0.0, 0.0, 0.0,   # vertex 1
    1.0, 0.0, 0.0,   # vertex 2
    0.0, 1.0, 0.0    # vertex 3
)

# Import/Export
mesh = Mesh.Mesh("/path/to/file.stl")
mesh.write("/path/to/output.stl")

# Convert Part shape to Mesh
import Part
import MeshPart
shape = Part.makeBox(1, 1, 1)
mesh = MeshPart.meshFromShape(Shape=shape, LinearDeflection=0.1,
                                AngularDeflection=0.5)

# Convert Mesh to Part shape
shape = Part.Shape()
shape.makeShapeFromMesh(mesh.Topology, 0.05)  # tolerance
solid = Part.makeSolid(shape)
```

### Sketcher Module

# Create a sketch on XY plane
sketch = doc.addObject("Sketcher::SketchObject", "MySketch")
sketch.Placement = FreeCAD.Placement(
    FreeCAD.Vector(0, 0, 0),
    FreeCAD.Rotation(0, 0, 0, 1)
)

# Add geometry (returns geometry index)
idx_line = sketch.addGeometry(Part.LineSegment(
    FreeCAD.Vector(0, 0, 0), FreeCAD.Vector(10, 0, 0)))
idx_circle = sketch.addGeometry(Part.Circle(
    FreeCAD.Vector(5, 5, 0), FreeCAD.Vector(0, 0, 1), 3))

# Add constraints
sketch.addConstraint(Sketcher.Constraint("Coincident", 0, 2, 1, 1))
sketch.addConstraint(Sketcher.Constraint("Horizontal", 0))
sketch.addConstraint(Sketcher.Constraint("DistanceX", 0, 1, 0, 2, 10.0))
sketch.addConstraint(Sketcher.Constraint("Radius", 1, 3.0))
sketch.addConstraint(Sketcher.Constraint("Fixed", 0, 1))
# Constraint types: Coincident, Horizontal, Vertical, Parallel, Perpendicular,
#   Tangent, Equal, Symmetric, Distance, DistanceX, DistanceY, Radius, Angle,
#   Fixed (Block), InternalAlignment

doc.recompute()
```

### Draft Module

```python
import Draft
import FreeCAD

# 2D shapes
line = Draft.makeLine(FreeCAD.Vector(0,0,0), FreeCAD.Vector(10,0,0))
circle = Draft.makeCircle(5)
rect = Draft.makeRectangle(10, 5)
poly = Draft.makePolygon(6, radius=5)   # hexagon

# Operations
moved = Draft.move(obj, FreeCAD.Vector(10, 0, 0), copy=True)
rotated = Draft.rotate(obj, 45, FreeCAD.Vector(0,0,0),
                        axis=FreeCAD.Vector(0,0,1), copy=True)
scaled = Draft.scale(obj, FreeCAD.Vector(2,2,2), center=FreeCAD.Vector(0,0,0),
                      copy=True)
offset = Draft.offset(obj, FreeCAD.Vector(1,0,0))
array = Draft.makeArray(obj, FreeCAD.Vector(15,0,0),
                         FreeCAD.Vector(0,15,0), 3, 3)
```

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

## Creating GUI Tools

### Gui Commands

```python
import FreeCAD
import FreeCADGui

class MyCommand:
    """A custom toolbar/menu command."""

    def GetResources(self):
        return {
            "Pixmap": ":/icons/Part_Box.svg",
            "MenuText": "My Custom Command",
            "ToolTip": "Creates a custom box",
            "Accel": "Ctrl+Shift+B"
        }

    def IsActive(self):
        return FreeCAD.ActiveDocument is not None

    def Activated(self):
        # Command logic here
        FreeCAD.Console.PrintMessage("Command activated\n")

FreeCADGui.addCommand("My_CustomCommand", MyCommand())
```

### PySide Dialogs

```python
from PySide2 import QtWidgets, QtCore, QtGui

class MyDialog(QtWidgets.QDialog):
    def __init__(self, parent=None):
        super().__init__(parent or FreeCADGui.getMainWindow())
        self.setWindowTitle("My Tool")
        self.setMinimumWidth(300)

        layout = QtWidgets.QVBoxLayout(self)

        # Input fields
        self.label = QtWidgets.QLabel("Length:")
        self.spinbox = QtWidgets.QDoubleSpinBox()
        self.spinbox.setRange(0.1, 1000.0)
        self.spinbox.setValue(10.0)
        self.spinbox.setSuffix(" mm")

        form = QtWidgets.QFormLayout()
        form.addRow(self.label, self.spinbox)
        layout.addLayout(form)

        # Buttons
        btn_layout = QtWidgets.QHBoxLayout()
        self.btn_ok = QtWidgets.QPushButton("OK")
        self.btn_cancel = QtWidgets.QPushButton("Cancel")
        btn_layout.addWidget(self.btn_ok)
        btn_layout.addWidget(self.btn_cancel)
        layout.addLayout(btn_layout)

        self.btn_ok.clicked.connect(self.accept)
        self.btn_cancel.clicked.connect(self.reject)

# Usage
dialog = MyDialog()
if dialog.exec_() == QtWidgets.QDialog.Accepted:
    length = dialog.spinbox.value()
    FreeCAD.Console.PrintMessage(f"Length: {length}\n")
```

### Task Panel (Recommended for FreeCAD integration)

```python
class MyTaskPanel:
    """Task panel shown in the left sidebar."""

    def __init__(self):
        self.form = QtWidgets.QWidget()
        layout = QtWidgets.QVBoxLayout(self.form)
        self.spinbox = QtWidgets.QDoubleSpinBox()
        self.spinbox.setValue(10.0)
        layout.addWidget(QtWidgets.QLabel("Length:"))
        layout.addWidget(self.spinbox)

    def accept(self):
        # Called when user clicks OK
        length = self.spinbox.value()
        FreeCAD.Console.PrintMessage(f"Accepted: {length}\n")
        FreeCADGui.Control.closeDialog()
        return True

    def reject(self):
        FreeCADGui.Control.closeDialog()
        return True

    def getStandardButtons(self):
        return int(QtWidgets.QDialogButtonBox.Ok |
                   QtWidgets.QDialogButtonBox.Cancel)

# Show the panel
panel = MyTaskPanel()
FreeCADGui.Control.showDialog(panel)
```

## Coin3D Scenegraph (Pivy)

```python
from pivy import coin
import FreeCADGui

# Access the scenegraph root
sg = FreeCADGui.ActiveDocument.ActiveView.getSceneGraph()

# Add a custom separator with a sphere
sep = coin.SoSeparator()
mat = coin.SoMaterial()
mat.diffuseColor.setValue(1.0, 0.0, 0.0)  # Red
trans = coin.SoTranslation()
trans.translation.setValue(10, 10, 10)
sphere = coin.SoSphere()
sphere.radius.setValue(2.0)
sep.addChild(mat)
sep.addChild(trans)
sep.addChild(sphere)
sg.addChild(sep)

# Remove later
sg.removeChild(sep)
```

## Custom Workbench Creation

```python
import FreeCADGui

class MyWorkbench(FreeCADGui.Workbench):
    MenuText = "My Workbench"
    ToolTip = "A custom workbench"
    Icon = ":/icons/freecad.svg"

    def Initialize(self):
        """Called at workbench activation."""
        import MyCommands  # Import your command module
        self.appendToolbar("My Tools", ["My_CustomCommand"])
        self.appendMenu("My Menu", ["My_CustomCommand"])

    def Activated(self):
        pass

    def Deactivated(self):
        pass

    def GetClassName(self):
        return "Gui::PythonWorkbench"

FreeCADGui.addWorkbench(MyWorkbench)
```

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

## Compensation Rules (Quasi-Coder Integration)

When interpreting shorthand or quasi-code for FreeCAD scripts:

1. **Terminology mapping**: "box" → `Part.makeBox()`, "cylinder" → `Part.makeCylinder()`, "sphere" → `Part.makeSphere()`, "merge/combine/join" → `.fuse()`, "subtract/cut/remove" → `.cut()`, "intersect" → `.common()`, "round edges/fillet" → `.makeFillet()`, "bevel/chamfer" → `.makeChamfer()`
2. **Implicit document**: If no document handling is mentioned, wrap in standard `doc = FreeCAD.ActiveDocument or FreeCAD.newDocument()`
3. **Units assumption**: Default to millimeters unless stated otherwise
4. **Recompute**: Always call `doc.recompute()` after modifications
5. **GUI guard**: Wrap GUI-dependent code in `if FreeCAD.GuiUp:` when the script may run headless
6. **Part.show()**: Use `Part.show(shape, "Name")` for quick display, or `doc.addObject("Part::Feature", "Name")` for named persistent objects

## References

### Primary Links

- [Writing Python code](https://wiki.freecad.org/Manual:A_gentle_introduction#Writing_Python_code)
- [Manipulating FreeCAD objects](https://wiki.freecad.org/Manual:A_gentle_introduction#Manipulating_FreeCAD_objects)
- [Vectors and Placements](https://wiki.freecad.org/Manual:A_gentle_introduction#Vectors_and_Placements)
- [Creating and manipulating geometry](https://wiki.freecad.org/Manual:Creating_and_manipulating_geometry)
- [Creating parametric objects](https://wiki.freecad.org/Manual:Creating_parametric_objects)
- [Creating interface tools](https://wiki.freecad.org/Manual:Creating_interface_tools)
- [Python](https://en.wikipedia.org/wiki/Python_%28programming_language%29)
- [Introduction to Python](https://wiki.freecad.org/Introduction_to_Python)
- [Python scripting tutorial](https://wiki.freecad.org/Python_scripting_tutorial)
- [FreeCAD scripting basics](https://wiki.freecad.org/FreeCAD_Scripting_Basics)
- [Gui Command](https://wiki.freecad.org/Gui_Command)

### Bundled Reference Documents

See the [references/](references/) directory for topic-organized guides:

1. [scripting-fundamentals.md](references/scripting-fundamentals.md) — Core scripting, document model, console
2. [geometry-and-shapes.md](references/geometry-and-shapes.md) — Part, Mesh, Sketcher, topology
3. [parametric-objects.md](references/parametric-objects.md) — FeaturePython, properties, scripted objects
4. [gui-and-interface.md](references/gui-and-interface.md) — PySide, dialogs, task panels, Coin3D
5. [workbenches-and-advanced.md](references/workbenches-and-advanced.md) — Workbenches, macros, FEM, Path, recipes
