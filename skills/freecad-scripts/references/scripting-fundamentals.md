# FreeCAD Scripting Fundamentals

Reference guide for FreeCAD Python scripting basics: the document model, the console, objects, selection, and the Python environment.

## Official Wiki References

- [A gentle introduction](https://wiki.freecad.org/Manual:A_gentle_introduction)
- [Introduction to Python](https://wiki.freecad.org/Introduction_to_Python)
- [Python scripting tutorial](https://wiki.freecad.org/Python_scripting_tutorial)
- [FreeCAD Scripting Basics](https://wiki.freecad.org/FreeCAD_Scripting_Basics)
- [Scripting and macros](https://wiki.freecad.org/Scripting_and_macros)
- [Working with macros](https://wiki.freecad.org/Macros)
- [Code snippets](https://wiki.freecad.org/Code_snippets)
- [Debugging](https://wiki.freecad.org/Debugging)
- [Profiling](https://wiki.freecad.org/Profiling)
- [Python development environment](https://wiki.freecad.org/Python_Development_Environment)
- [Extra python modules](https://wiki.freecad.org/Extra_python_modules)
- [FreeCAD vector math library](https://wiki.freecad.org/FreeCAD_vector_math_library)
- [Embedding FreeCAD](https://wiki.freecad.org/Embedding_FreeCAD)
- [Embedding FreeCADGui](https://wiki.freecad.org/Embedding_FreeCADGui)
- [Macro at startup](https://wiki.freecad.org/Macro_at_Startup)
- [How to install macros](https://wiki.freecad.org/How_to_install_macros)
- [IPython notebook integration](https://wiki.freecad.org/IPython_notebook_integration)
- [Quantity](https://wiki.freecad.org/Quantity)

## The FreeCAD Module Hierarchy

```
FreeCAD (App)          — Core application, documents, objects, properties
├── FreeCAD.Vector     — 3D vector
├── FreeCAD.Rotation   — Quaternion rotation
├── FreeCAD.Placement  — Position + rotation
├── FreeCAD.Matrix     — 4x4 transformation matrix
├── FreeCAD.Units      — Unit conversion and quantities
├── FreeCAD.Console    — Message output
└── FreeCAD.Base       — Base types

FreeCADGui (Gui)       — GUI module (only when GUI is active)
├── Selection          — Selection management
├── Control            — Task panel management
├── ActiveDocument     — GUI document wrapper
└── getMainWindow()    — Qt main window
```

## Document Operations

```python
import FreeCAD

# Document lifecycle
doc = FreeCAD.newDocument("DocName")
doc = FreeCAD.openDocument("/path/to/file.FCStd")
doc = FreeCAD.ActiveDocument
FreeCAD.setActiveDocument("DocName")
doc.save()
doc.saveAs("/path/to/newfile.FCStd")
FreeCAD.closeDocument("DocName")

# Object management
obj = doc.addObject("Part::Feature", "ObjectName")
obj = doc.addObject("Part::FeaturePython", "CustomObj")
obj = doc.addObject("App::DocumentObjectGroup", "Group")
doc.removeObject("ObjectName")

# Object access
obj = doc.getObject("ObjectName")
obj = doc.ObjectName                # attribute syntax
all_objs = doc.Objects              # all objects in document
names = doc.findObjects("Part::Feature")  # by type

# Recompute
doc.recompute()                     # recompute all
doc.recompute([obj1, obj2])         # recompute specific objects
obj.touch()                         # mark as needing recompute
```

## Selection API

```python
import FreeCADGui

# Get selection
sel = FreeCADGui.Selection.getSelection()          # [obj, ...]
sel = FreeCADGui.Selection.getSelection("DocName") # from specific doc
sel_ex = FreeCADGui.Selection.getSelectionEx()      # extended info

# Extended selection details
for s in sel_ex:
    print(s.Object.Name)           # parent object
    print(s.SubElementNames)       # ("Face1", "Edge3", ...)
    print(s.SubObjects)            # actual sub-shapes
    for pt in s.PickedPoints:
        print(pt)                  # 3D pick point

# Set selection
FreeCADGui.Selection.addSelection(obj)
FreeCADGui.Selection.addSelection(obj, "Face1")
FreeCADGui.Selection.removeSelection(obj)
FreeCADGui.Selection.clearSelection()

# Selection observer
class MySelectionObserver:
    def addSelection(self, doc, obj, sub, pos):
        print(f"Selected: {obj}.{sub} at {pos}")
    def removeSelection(self, doc, obj, sub):
        print(f"Deselected: {obj}.{sub}")
    def setSelection(self, doc):
        print(f"Selection set changed in {doc}")
    def clearSelection(self, doc):
        print(f"Selection cleared in {doc}")

obs = MySelectionObserver()
FreeCADGui.Selection.addObserver(obs)
# Later: FreeCADGui.Selection.removeObserver(obs)
```

## Console and Logging

```python
FreeCAD.Console.PrintMessage("Normal message\n")   # blue/default
FreeCAD.Console.PrintWarning("Warning\n")           # orange
FreeCAD.Console.PrintError("Error\n")               # red
FreeCAD.Console.PrintLog("Debug info\n")            # log only

# Console message observer
class MyLogger:
    def __init__(self):
        FreeCAD.Console.PrintMessage("Logger started\n")
    def receive(self, msg):
        # process msg
        pass
```

## Units and Quantities

```python
from FreeCAD import Units

# Create quantities
q = Units.Quantity("10 mm")
q = Units.Quantity("1 in")
q = Units.Quantity(25.4, Units.Unit("mm"))
q = Units.parseQuantity("3.14 rad")

# Convert
value_mm = float(q)                    # internal unit (mm for length)
value_in = q.getValueAs("in")          # convert to other unit
value_m = q.getValueAs("m")

# Available unit schemes: mm/kg/s (FreeCAD default), SI, Imperial, etc.
# Common units: mm, m, in, ft, deg, rad, kg, g, lb, s, min, hr
```

## Property System

```python
# Add properties to any DocumentObject
obj.addProperty("App::PropertyFloat", "MyProp", "GroupName", "Tooltip")
obj.MyProp = 42.0

# Check property existence
if hasattr(obj, "MyProp"):
    print(obj.MyProp)

# Property metadata
obj.getPropertyByName("MyProp")
obj.getTypeOfProperty("MyProp")        # returns list: ["App::PropertyFloat"]
obj.getDocumentationOfProperty("MyProp")
obj.getGroupOfProperty("MyProp")

# Set property as read-only, hidden, etc.
obj.setPropertyStatus("MyProp", "ReadOnly")
obj.setPropertyStatus("MyProp", "Hidden")
obj.setPropertyStatus("MyProp", "-ReadOnly")   # remove status
# Statuses: ReadOnly, Hidden, Transient, Output, NoRecompute
```
