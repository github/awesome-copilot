# RhinoCommon Namespace Map

Use this to decide which `Rhino.*` namespace to import for a task. All of these are accessible from Python with `import Rhino`.

## Document & Object Model

| Need | Namespace | Key types |
|---|---|---|
| The active document, units, tolerances, undo | `Rhino` | `RhinoDoc`, `RhinoApp` |
| Reading/writing objects in the doc | `Rhino.DocObjects` | `RhinoObject`, `ObjectAttributes`, `Layer`, `ObjectType` |
| Tables (layers, materials, blocks, dim styles) | `Rhino.DocObjects.Tables` | `LayerTable`, `InstanceDefinitionTable`, `MaterialTable` |
| Custom per-object user data | `Rhino.DocObjects.Custom` | `UserData` |
| File I/O (.3dm, import/export) | `Rhino.FileIO` | `File3dm`, `File3dmObject` |

## Geometry

| Need | Namespace | Key types |
|---|---|---|
| Points, vectors, transforms | `Rhino.Geometry` | `Point3d`, `Vector3d`, `Transform`, `Plane`, `BoundingBox` |
| Curves | `Rhino.Geometry` | `Curve`, `NurbsCurve`, `PolylineCurve`, `LineCurve`, `ArcCurve` |
| Surfaces & breps | `Rhino.Geometry` | `Surface`, `NurbsSurface`, `Brep`, `BrepFace`, `Extrusion` |
| Meshes | `Rhino.Geometry` | `Mesh`, `MeshFace`, `MeshNgon` |
| SubD | `Rhino.Geometry` | `SubD`, `SubDFace`, `SubDEdge` |
| Geometry collections (vertices, edges, faces lists) | `Rhino.Geometry.Collections` | `MeshVertexList`, `BrepEdgeList` |
| Intersections | `Rhino.Geometry.Intersect` | `Intersection`, `CurveIntersections` |
| Mesh refinement | `Rhino.Geometry.MeshRefinements` | |
| Space morphs (bend, twist, etc.) | `Rhino.Geometry.Morphs` | `BendSpaceMorph`, `TwistSpaceMorph` |

## User Interaction

| Need | Namespace | Key types |
|---|---|---|
| Prompts, getters, command results | `Rhino.Input` / `Rhino.Input.Custom` | `RhinoGet`, `GetObject`, `GetPoint`, `GetOption` |
| Commands (when building a plugin) | `Rhino.Commands` | `Command`, `Result` |
| Forms, dialogs, panels | `Rhino.UI` | `Dialog`, `Panels`, `RhinoEtoExtensions` |
| UI controls / data sources | `Rhino.UI.Controls` | |
| Gumball | `Rhino.UI.Gumball` | |

## Display & Rendering

| Need | Namespace | Key types |
|---|---|---|
| Viewports, display conduits, draw overlays | `Rhino.Display` | `DisplayPipeline`, `DisplayConduit`, `RhinoViewport` |
| Render content (materials, environments) | `Rhino.Render` | `RenderContent`, `RenderMaterial`, `RenderTexture` |
| Render mesh customization | `Rhino.Render.CustomRenderMeshes` | |
| Post effects | `Rhino.Render.PostEffects` | |

## Runtime & Plugins

| Need | Namespace | Key types |
|---|---|---|
| Plugin lifecycle, settings | `Rhino.PlugIns` | `PlugIn`, `FileImportPlugIn`, `FileExportPlugIn` |
| In-process Rhino (run Rhino from external .NET) | `Rhino.Runtime.InProcess` | `RhinoCore` |
| Native interop (pointers, marshalling) | `Rhino.Runtime.InteropWrappers` | |
| User notifications (toasts) | `Rhino.Runtime.Notifications` | |

## Common Patterns

```python
import Rhino
import scriptcontext as sc
import System.Drawing

doc = sc.doc                                          # Rhino.RhinoDoc
tol = doc.ModelAbsoluteTolerance                      # float
view = doc.Views.ActiveView                           # Rhino.Display.RhinoView
layer_index = doc.Layers.Add("MyLayer", System.Drawing.Color.Red)

# Find a Rhino object from a rhinoscriptsyntax GUID
rhobj = doc.Objects.Find(guid)                        # Rhino.DocObjects.RhinoObject
geom  = rhobj.Geometry                                # Rhino.Geometry.GeometryBase

# Add geometry with attributes
attrs = Rhino.DocObjects.ObjectAttributes()
attrs.LayerIndex = layer_index
attrs.Name = "example"
new_id = doc.Objects.AddCurve(curve, attrs)
```

## Undo

```python
undo_serial = doc.BeginUndoRecord("Batch Op")
try:
    # ... many doc.Objects.* calls ...
    pass
finally:
    doc.EndUndoRecord(undo_serial)
    doc.Views.Redraw()
```
