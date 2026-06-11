# FreeCAD Parametric Objects

Reference guide for creating FeaturePython objects, scripted objects, properties, view providers, and serialization.

## Official Wiki References

- [Creating parametric objects](https://wiki.freecad.org/Manual:Creating_parametric_objects)
- [Create a FeaturePython object part I](https://wiki.freecad.org/Create_a_FeaturePython_object_part_I)
- [Create a FeaturePython object part II](https://wiki.freecad.org/Create_a_FeaturePython_object_part_II)
- [Scripted objects](https://wiki.freecad.org/Scripted_objects)
- [Scripted objects saving attributes](https://wiki.freecad.org/Scripted_objects_saving_attributes)
- [Scripted objects migration](https://wiki.freecad.org/Scripted_objects_migration)
- [Scripted objects with attachment](https://wiki.freecad.org/Scripted_objects_with_attachment)
- [Viewprovider](https://wiki.freecad.org/Viewprovider)
- [Custom icon in tree view](https://wiki.freecad.org/Custom_icon_in_tree_view)
- [Properties](https://wiki.freecad.org/Property)
- [PropertyLink: InList and OutList](https://wiki.freecad.org/PropertyLink:_InList_and_OutList)
- [FeaturePython methods](https://wiki.freecad.org/FeaturePython_methods)

## FeaturePython Object — Complete Template

```python
import FreeCAD
import Part

class MyParametricObject:
    """Proxy class for a custom parametric object."""

    def __init__(self, obj):
        """Initialize and add properties."""
        obj.Proxy = self
        self.Type = "MyParametricObject"

        # Add custom properties
        obj.addProperty("App::PropertyLength", "Length", "Dimensions",
                         "The length of the object").Length = 10.0
        obj.addProperty("App::PropertyLength", "Width", "Dimensions",
                         "The width of the object").Width = 10.0
        obj.addProperty("App::PropertyLength", "Height", "Dimensions",
                         "The height of the object").Height = 5.0
        obj.addProperty("App::PropertyBool", "Chamfered", "Options",
                         "Apply chamfer to edges").Chamfered = False
        obj.addProperty("App::PropertyLength", "ChamferSize", "Options",
                         "Size of chamfer").ChamferSize = 1.0

    def execute(self, obj):
        """Called when the document is recomputed. Build the shape here."""
        shape = Part.makeBox(obj.Length, obj.Width, obj.Height)
        if obj.Chamfered and obj.ChamferSize > 0:
            shape = shape.makeChamfer(obj.ChamferSize, shape.Edges)
        obj.Shape = shape

    def onChanged(self, obj, prop):
        """Called when any property changes."""
        if prop == "Chamfered":
            # Show/hide ChamferSize based on Chamfered toggle
            if obj.Chamfered:
                obj.setPropertyStatus("ChamferSize", "-Hidden")
            else:
                obj.setPropertyStatus("ChamferSize", "Hidden")

    def onDocumentRestored(self, obj):
        """Called when the document is loaded. Re-initialize if needed."""
        self.Type = "MyParametricObject"

    def __getstate__(self):
        """Serialize the proxy (for saving .FCStd)."""
        return {"Type": self.Type}

    def __setstate__(self, state):
        """Deserialize the proxy (for loading .FCStd)."""
        if state:
            self.Type = state.get("Type", "MyParametricObject")
```

## ViewProvider — Complete Template

```python
import FreeCADGui
from pivy import coin

class ViewProviderMyObject:
    """Controls how the object appears in the 3D view and tree."""

    def __init__(self, vobj):
        vobj.Proxy = self
        # Add view properties if needed
        # vobj.addProperty("App::PropertyColor", "Color", "Display", "Object color")

    def attach(self, vobj):
        """Called when the view provider is attached to the view object."""
        self.Object = vobj.Object
        self.standard = coin.SoGroup()
        vobj.addDisplayMode(self.standard, "Standard")

    def getDisplayModes(self, vobj):
        """Return available display modes."""
        return ["Standard"]

    def getDefaultDisplayMode(self):
        """Return the default display mode."""
        return "Standard"

    def setDisplayMode(self, mode):
        return mode

    def getIcon(self):
        """Return the icon path for the tree view."""
        return ":/icons/Part_Box.svg"
        # Or return an XPM string, or path to a .svg/.png file

    def updateData(self, obj, prop):
        """Called when the model object's data changes."""
        pass

    def onChanged(self, vobj, prop):
        """Called when a view property changes."""
        pass

    def doubleClicked(self, vobj):
        """Called on double-click in the tree."""
        # Open a task panel, for example
        return True

    def setupContextMenu(self, vobj, menu):
        """Add items to the right-click context menu."""
        action = menu.addAction("My Action")
        action.triggered.connect(lambda: self._myAction(vobj))

    def _myAction(self, vobj):
        FreeCAD.Console.PrintMessage("Context menu action triggered\n")

    def claimChildren(self):
        """Return list of child objects to show in tree hierarchy."""
        # return [self.Object.BaseFeature] if hasattr(self.Object, "BaseFeature") else []
        return []

    def __getstate__(self):
        return None

    def __setstate__(self, state):
        return None
```

## Creating the Object

```python
def makeMyObject(name="MyObject"):
    """Factory function to create the parametric object."""
    doc = FreeCAD.ActiveDocument
    if doc is None:
        doc = FreeCAD.newDocument()

    obj = doc.addObject("Part::FeaturePython", name)
    MyParametricObject(obj)

    if FreeCAD.GuiUp:
        ViewProviderMyObject(obj.ViewObject)

    doc.recompute()
    return obj

# Usage
obj = makeMyObject("ChamferedBlock")
obj.Length = 20.0
obj.Chamfered = True
FreeCAD.ActiveDocument.recompute()
```

## Complete Property Type Reference

### Numeric Properties

| Type | Python | Notes |
|---|---|---|
| `App::PropertyInteger` | `int` | Standard integer |
| `App::PropertyFloat` | `float` | Standard float |
| `App::PropertyLength` | `float` | Length with units (mm) |
| `App::PropertyDistance` | `float` | Distance (can be negative) |
| `App::PropertyAngle` | `float` | Angle in degrees |
| `App::PropertyArea` | `float` | Area with units |
| `App::PropertyVolume` | `float` | Volume with units |
| `App::PropertySpeed` | `float` | Speed with units |
| `App::PropertyAcceleration` | `float` | Acceleration |
| `App::PropertyForce` | `float` | Force |
| `App::PropertyPressure` | `float` | Pressure |
| `App::PropertyPercent` | `int` | 0-100 integer |
| `App::PropertyQuantity` | `Quantity` | Generic unit-aware value |
| `App::PropertyIntegerConstraint` | `(val,min,max,step)` | Bounded integer |
| `App::PropertyFloatConstraint` | `(val,min,max,step)` | Bounded float |

### String/Path Properties

| Type | Python | Notes |
|---|---|---|
| `App::PropertyString` | `str` | Text string |
| `App::PropertyFont` | `str` | Font name |
| `App::PropertyFile` | `str` | File path |
| `App::PropertyFileIncluded` | `str` | Embedded file |
| `App::PropertyPath` | `str` | Directory path |

### Boolean and Enumeration

| Type | Python | Notes |
|---|---|---|
| `App::PropertyBool` | `bool` | True/False |
| `App::PropertyEnumeration` | `list`/`str` | Dropdown; set list then value |

```python
# Enumeration usage
obj.addProperty("App::PropertyEnumeration", "Style", "Options", "Style choice")
obj.Style = ["Solid", "Wireframe", "Points"]  # set choices FIRST
obj.Style = "Solid"                              # then set value
```

### Geometric Properties

| Type | Python | Notes |
|---|---|---|
| `App::PropertyVector` | `FreeCAD.Vector` | 3D vector |
| `App::PropertyVectorList` | `[Vector,...]` | List of vectors |
| `App::PropertyPlacement` | `Placement` | Position + rotation |
| `App::PropertyMatrix` | `Matrix` | 4x4 matrix |
| `App::PropertyVectorDistance` | `Vector` | Vector with units |
| `App::PropertyPosition` | `Vector` | Position with units |
| `App::PropertyDirection` | `Vector` | Direction vector |

### Link Properties

| Type | Python | Notes |
|---|---|---|
| `App::PropertyLink` | obj ref | Link to one object |
| `App::PropertyLinkList` | `[obj,...]` | Link to multiple objects |
| `App::PropertyLinkSub` | `(obj, [subs])` | Link with sub-elements |
| `App::PropertyLinkSubList` | `[(obj,[subs]),...]` | Multiple link+subs |
| `App::PropertyLinkChild` | obj ref | Claimed child link |
| `App::PropertyLinkListChild` | `[obj,...]` | Multiple claimed children |

### Shape and Material

| Type | Python | Notes |
|---|---|---|
| `Part::PropertyPartShape` | `Part.Shape` | Full shape |
| `App::PropertyColor` | `(r,g,b)` | Color (0.0-1.0) |
| `App::PropertyColorList` | `[(r,g,b),...]` | Color per element |
| `App::PropertyMaterial` | `Material` | Material definition |

### Container Properties

| Type | Python | Notes |
|---|---|---|
| `App::PropertyPythonObject` | any | Serializable Python object |
| `App::PropertyIntegerList` | `[int,...]` | List of integers |
| `App::PropertyFloatList` | `[float,...]` | List of floats |
| `App::PropertyStringList` | `[str,...]` | List of strings |
| `App::PropertyBoolList` | `[bool,...]` | List of booleans |
| `App::PropertyMap` | `{str:str}` | String dictionary |

## Object Dependency Tracking

```python
# InList: objects that reference this object
obj.InList          # [objects referencing obj]
obj.InListRecursive # all ancestors

# OutList: objects this object references
obj.OutList         # [objects obj references]
obj.OutListRecursive # all descendants
```

## Migration Between Versions

```python
class MyParametricObject:
    # ... existing code ...

    def onDocumentRestored(self, obj):
        """Handle version migration when document loads."""
        # Add properties that didn't exist in older versions
        if not hasattr(obj, "NewProp"):
            obj.addProperty("App::PropertyFloat", "NewProp", "Group", "Tip")
            obj.NewProp = default_value

        # Rename properties (copy value, remove old)
        if hasattr(obj, "OldPropName"):
            if not hasattr(obj, "NewPropName"):
                obj.addProperty("App::PropertyFloat", "NewPropName", "Group", "Tip")
                obj.NewPropName = obj.OldPropName
            obj.removeProperty("OldPropName")
```

## Attachment Support

```python
import Part

class MyAttachableObject:
    def __init__(self, obj):
        obj.Proxy = self
        obj.addExtension("Part::AttachExtensionPython")

    def execute(self, obj):
        # The attachment sets the Placement automatically
        if not obj.MapPathParameter:
            obj.positionBySupport()
        # Build your shape at the origin; Placement handles positioning
        obj.Shape = Part.makeBox(10, 10, 10)
```
