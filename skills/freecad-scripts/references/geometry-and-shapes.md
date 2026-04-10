# FreeCAD Geometry and Shapes

Reference guide for creating and manipulating geometry in FreeCAD using the Part, Mesh, and Sketcher modules.

## Official Wiki References

- [Creating and manipulating geometry](https://wiki.freecad.org/Manual:Creating_and_manipulating_geometry)
- [Part scripting](https://wiki.freecad.org/Part_scripting)
- [Topological data scripting](https://wiki.freecad.org/Topological_data_scripting)
- [Mesh scripting](https://wiki.freecad.org/Mesh_Scripting)
- [Mesh to Part conversion](https://wiki.freecad.org/Mesh_to_Part)
- [Sketcher scripting](https://wiki.freecad.org/Sketcher_scripting)
- [Drawing API example](https://wiki.freecad.org/Drawing_API_example)
- [Part: Create a ball bearing I](https://wiki.freecad.org/Scripted_Parts:_Ball_Bearing_-_Part_1)
- [Part: Create a ball bearing II](https://wiki.freecad.org/Scripted_Parts:_Ball_Bearing_-_Part_2)
- [Line drawing function](https://wiki.freecad.org/Line_drawing_function)

## Part Module — Shape Hierarchy

OpenCASCADE topology levels (bottom to top):

```
Vertex → Edge → Wire → Face → Shell → Solid → CompSolid → Compound
```

Each level contains the levels below it.

## Primitive Shapes

```python
import Part
import FreeCAD as App

# Boxes
box = Part.makeBox(length, width, height)
box = Part.makeBox(10, 20, 30, App.Vector(0,0,0), App.Vector(0,0,1))

# Cylinders
cyl = Part.makeCylinder(radius, height)
cyl = Part.makeCylinder(5, 20, App.Vector(0,0,0), App.Vector(0,0,1), 360)

# Cones
cone = Part.makeCone(r1, r2, height)

# Spheres
sph = Part.makeSphere(radius)
sph = Part.makeSphere(10, App.Vector(0,0,0), App.Vector(0,0,1), -90, 90, 360)

# Torus
tor = Part.makeTorus(majorR, minorR)

# Planes (infinite → bounded face)
plane = Part.makePlane(length, width)
plane = Part.makePlane(10, 10, App.Vector(0,0,0), App.Vector(0,0,1))

# Helix
helix = Part.makeHelix(pitch, height, radius)

# Wedge
wedge = Part.makeWedge(xmin, ymin, zmin, z2min, x2min,
                        xmax, ymax, zmax, z2max, x2max)
```

## Curves and Edges

```python
# Line segment
line = Part.makeLine((0,0,0), (10,0,0))
line = Part.LineSegment(App.Vector(0,0,0), App.Vector(10,0,0)).toShape()

# Circle (full)
circle = Part.makeCircle(radius)
circle = Part.makeCircle(5, App.Vector(0,0,0), App.Vector(0,0,1))

# Arc (partial circle)
arc = Part.makeCircle(5, App.Vector(0,0,0), App.Vector(0,0,1), 0, 180)

# Arc through 3 points
arc3 = Part.Arc(App.Vector(0,0,0), App.Vector(5,5,0), App.Vector(10,0,0)).toShape()

# Ellipse
ellipse = Part.Ellipse(App.Vector(0,0,0), 10, 5).toShape()

# BSpline curve
points = [App.Vector(0,0,0), App.Vector(2,3,0), App.Vector(5,1,0), App.Vector(8,4,0)]
bspline = Part.BSplineCurve()
bspline.interpolate(points)
edge = bspline.toShape()

# BSpline with control points (approximate)
bspline2 = Part.BSplineCurve()
bspline2.buildFromPoles(points)
edge2 = bspline2.toShape()

# Bezier curve
bezier = Part.BezierCurve()
bezier.setPoles([App.Vector(0,0,0), App.Vector(3,5,0),
                  App.Vector(7,5,0), App.Vector(10,0,0)])
edge3 = bezier.toShape()
```

## Wires, Faces, and Solids

```python
# Wire from edges
wire = Part.Wire([edge1, edge2, edge3])   # edges must connect end-to-end

# Wire by sorting edges
wire = Part.Wire(Part.__sortEdges__([edges_list]))

# Face from wire (must be closed and planar, or a surface)
face = Part.Face(wire)

# Face from multiple wires (first = outer, rest = holes)
face = Part.Face([outer_wire, hole_wire1, hole_wire2])

# Shell from faces
shell = Part.Shell([face1, face2, face3])

# Solid from shell (must be closed)
solid = Part.Solid(shell)

# Compound (group shapes without merging)
compound = Part.Compound([shape1, shape2, shape3])
```

## Shape Operations

```python
# Boolean operations
union = shape1.fuse(shape2)
diff = shape1.cut(shape2)
inter = shape1.common(shape2)

# Multi-fuse / multi-cut
multi_fuse = shape1.multiFuse([shape2, shape3, shape4])

# Clean seam edges after boolean
clean = union.removeSplitter()

# Fillet (round edges)
filleted = solid.makeFillet(radius, solid.Edges)
filleted = solid.makeFillet(radius, [solid.Edges[0], solid.Edges[3]])

# Chamfer
chamfered = solid.makeChamfer(distance, solid.Edges)
chamfered = solid.makeChamfer(dist1, dist2, [solid.Edges[0]])  # asymmetric

# Offset (shell/thicken)
offset = solid.makeOffsetShape(offset_distance, tolerance)
thick = solid.makeThickness([face_to_remove], thickness, tolerance)

# Section (intersection curve of solid with plane)
section = solid.section(Part.makePlane(100, 100, App.Vector(0,0,5)))
```

## Extrude, Revolve, Loft, Sweep

```python
# Extrude face or wire
extruded = face.extrude(App.Vector(0, 0, 10))    # direction vector

# Revolve
revolved = face.revolve(
    App.Vector(0, 0, 0),     # center
    App.Vector(0, 1, 0),     # axis
    360                       # angle (degrees)
)

# Loft between wires/profiles
loft = Part.makeLoft([wire1, wire2, wire3], True)   # solid=True

# Sweep (pipe)
sweep = Part.Wire([path_edge]).makePipe(profile_wire)

# Sweep with Frenet frame
sweep = Part.Wire([path_edge]).makePipeShell(
    [profile_wire],
    True,    # make solid
    False    # use Frenet frame
)
```

## Topological Exploration

```python
shape = obj.Shape

# Sub-element access
shape.Vertexes          # [Vertex, ...]
shape.Edges             # [Edge, ...]
shape.Wires             # [Wire, ...]
shape.Faces             # [Face, ...]
shape.Shells            # [Shell, ...]
shape.Solids            # [Solid, ...]

# Vertex properties
v = shape.Vertexes[0]
v.Point                 # FreeCAD.Vector — the 3D coordinate

# Edge properties
e = shape.Edges[0]
e.Length
e.Curve                 # underlying geometric curve (Line, Circle, BSpline, ...)
e.Vertexes              # start and end vertices
e.firstVertex()         # first Vertex
e.lastVertex()          # last Vertex
e.tangentAt(0.5)        # tangent at parameter
e.valueAt(0.5)          # point at parameter
e.parameterAt(vertex)   # parameter at vertex

# Face properties
f = shape.Faces[0]
f.Area
f.Surface               # underlying geometric surface (Plane, Cylinder, ...)
f.CenterOfMass
f.normalAt(0.5, 0.5)    # normal at (u, v) parameter
f.Wires                 # bounding wires
f.OuterWire             # or Wires[0]

# Bounding box
bb = shape.BoundBox
bb.XMin, bb.XMax, bb.YMin, bb.YMax, bb.ZMin, bb.ZMax
bb.Center, bb.DiagonalLength
bb.XLength, bb.YLength, bb.ZLength

# Shape properties
shape.Volume
shape.Area
shape.CenterOfMass
shape.ShapeType         # "Solid", "Compound", "Face", etc.
shape.isValid()
shape.isClosed()
```

## Sketcher Constraints Reference

| Constraint | Syntax | Description |
|---|---|---|
| Coincident | `("Coincident", geo1, pt1, geo2, pt2)` | Points coincide |
| Horizontal | `("Horizontal", geo)` | Line is horizontal |
| Vertical | `("Vertical", geo)` | Line is vertical |
| Parallel | `("Parallel", geo1, geo2)` | Lines are parallel |
| Perpendicular | `("Perpendicular", geo1, geo2)` | Lines are perpendicular |
| Tangent | `("Tangent", geo1, geo2)` | Curves are tangent |
| Equal | `("Equal", geo1, geo2)` | Equal length/radius |
| Symmetric | `("Symmetric", geo1, pt1, geo2, pt2, geoLine)` | Symmetric about line |
| Distance | `("Distance", geo1, pt1, geo2, pt2, value)` | Distance between points |
| DistanceX | `("DistanceX", geo, pt1, pt2, value)` | Horizontal distance |
| DistanceY | `("DistanceY", geo, pt1, pt2, value)` | Vertical distance |
| Radius | `("Radius", geo, value)` | Circle/arc radius |
| Angle | `("Angle", geo1, geo2, value)` | Angle between lines |
| Fixed | `("Fixed", geo)` | Lock geometry |

Point indices: `1` = start, `2` = end, `3` = center (circles/arcs).
External geometry index: `-1` = X axis, `-2` = Y axis.

## Mesh Operations

```python
import Mesh

# Create from file
mesh = Mesh.Mesh("/path/to/model.stl")

# Create from topology (vertices + facets)
verts = [[0,0,0], [10,0,0], [10,10,0], [0,10,0], [5,5,10]]
facets = [[0,1,4], [1,2,4], [2,3,4], [3,0,4], [0,1,2], [0,2,3]]
mesh = Mesh.Mesh([verts[f[0]] + verts[f[1]] + verts[f[2]] for f in facets])

# Mesh properties
mesh.CountPoints
mesh.CountFacets
mesh.Volume
mesh.Area
mesh.isSolid()

# Mesh operations
mesh.unite(mesh2)       # Boolean union
mesh.intersect(mesh2)   # Boolean intersection
mesh.difference(mesh2)  # Boolean difference
mesh.offset(1.0)        # Offset surface
mesh.smooth()           # Laplacian smoothing

# Export
mesh.write("/path/to/output.stl")
mesh.write("/path/to/output.obj")

# Convert Part → Mesh
import MeshPart
mesh = MeshPart.meshFromShape(
    Shape=part_shape,
    LinearDeflection=0.1,
    AngularDeflection=0.523599,  # ~30 degrees
    Relative=False
)

# Convert Mesh → Part
import Part
tolerance = 0.05
shape = Part.Shape()
shape.makeShapeFromMesh(mesh.Topology, tolerance)
solid = Part.makeSolid(shape)
```
