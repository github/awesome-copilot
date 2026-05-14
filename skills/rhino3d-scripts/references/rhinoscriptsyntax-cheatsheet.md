# `rhinoscriptsyntax` Cheatsheet

```python
import rhinoscriptsyntax as rs
```

## User Input

| Function | Returns |
|---|---|
| `rs.GetObject(message, filter, preselect, select)` | GUID or `None` |
| `rs.GetObjects(message, filter)` | list of GUIDs |
| `rs.GetPoint(message, base_point)` | `Point3d` or `None` |
| `rs.GetString(message, default, strings)` | str |
| `rs.GetInteger`, `rs.GetReal` | int / float |
| `rs.GetBoolean(message, items, defaults)` | list of bools |

Common `rs.filter.*` flags (OR them together):

```
point=1, point_cloud=2, curve=4, surface=8, polysurface=16,
mesh=32, light=256, annotation=512, instance_reference=4096,
text_dot=8192, grip=16384, detail=32768, hatch=65536,
morph_control=131072, sub_d=262144
```

## Creating Geometry

| Function | Notes |
|---|---|
| `rs.AddPoint(point)` | |
| `rs.AddLine(start, end)` | |
| `rs.AddPolyline(points)` | `points` is a list of 3-tuples |
| `rs.AddCircle(plane_or_center, radius)` | |
| `rs.AddArc(plane, radius, angle_deg)` | angle in **degrees** |
| `rs.AddCurve(points, degree=3)` | NURBS through control points |
| `rs.AddInterpCurve(points, degree=3)` | NURBS through points |
| `rs.AddSphere(center, radius)` | |
| `rs.AddBox(corners)` | `corners` = 8 points |
| `rs.AddPlanarSrf(curves)` | returns list |
| `rs.AddLoftSrf(curves, ...)` | returns list of GUIDs |
| `rs.AddExtrusion(profile, path)` / `rs.ExtrudeCurveStraight` | |

## Object Properties

| Function | Purpose |
|---|---|
| `rs.ObjectLayer(id [, layer])` | get/set |
| `rs.ObjectColor(id [, color])` | RGB tuple |
| `rs.ObjectName(id [, name])` | |
| `rs.ObjectType(id)` | int matching `rs.filter.*` |
| `rs.IsCurve / IsSurface / IsBrep / IsMesh / IsPoint(id)` | |
| `rs.DeleteObject(id)` / `rs.DeleteObjects(ids)` | |
| `rs.CopyObject(id, translation)` | |
| `rs.MoveObject(id, translation)` | |
| `rs.RotateObject(id, center, angle, axis=None, copy=False)` | angle in degrees |
| `rs.ScaleObject(id, origin, scale)` | scale is a 3-tuple |

## Curves

| Function | |
|---|---|
| `rs.CurveLength(id)` | |
| `rs.CurveDomain(id)` | `(t0, t1)` |
| `rs.EvaluateCurve(id, t)` | `Point3d` |
| `rs.CurveStartPoint / CurveEndPoint(id)` | |
| `rs.CurveClosestPoint(id, point)` | parameter `t` |
| `rs.DivideCurve(id, segments, create_points=False, return_points=True)` | |
| `rs.IsCurveClosed / IsCurvePlanar(id)` | |

## Layers

| Function | |
|---|---|
| `rs.AddLayer(name, color=None, visible=True, locked=False, parent=None)` | |
| `rs.CurrentLayer([layer])` | |
| `rs.LayerNames()` | list |
| `rs.LayerVisible(name [, visible])` | |
| `rs.DeleteLayer(name)` | |
| `rs.ObjectsByLayer(name)` | list of GUIDs |

## Document & View

| Function | |
|---|---|
| `rs.UnitAbsoluteTolerance()` | |
| `rs.UnitSystem()` | int (`rs.unit_system_*`) |
| `rs.EnableRedraw(enable)` | **toggle this around bulk ops** |
| `rs.Redraw()` | force one redraw |
| `rs.ViewNames()` / `rs.CurrentView([name])` | |
| `rs.ZoomExtents(view=None, all=False)` | |

## Selection

| Function | |
|---|---|
| `rs.SelectedObjects()` | list |
| `rs.SelectObject(id)` / `rs.SelectObjects(ids)` | |
| `rs.UnselectAllObjects()` | |
| `rs.InvertSelectedObjects()` | |

## Macros from Script

`rs.Command(command_string, echo=True)` runs a macro exactly as if typed at the command line. Always prefix `!` (cancel) and `-` (no dialog):

```python
rs.Command("! _-Line 0,0,0 10,0,0", echo=False)
```
