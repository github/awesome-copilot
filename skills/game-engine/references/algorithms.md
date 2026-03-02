# Game Development Algorithms

A comprehensive reference covering essential algorithms for game development, including
line drawing, raycasting, collision detection, physics simulation, and vector mathematics.

---

## Bresenham's Line Algorithm -- Raycasting, Line of Sight, and Pathfinding

> Source: https://deepnight.net/tutorial/bresenham-magic-raycasting-line-of-sight-pathfinding/

### What It Is

Bresenham's line algorithm is an efficient method for determining which cells in a grid
lie along a straight line between two points. Originally developed for plotting pixels on
raster displays, it has become a foundational tool in game development for raycasting,
line-of-sight checks, and grid-based pathfinding. The algorithm uses only integer
arithmetic (additions, subtractions, and bit shifts), making it extremely fast.

### Mathematical / Algorithmic Concepts

The core idea is to walk along the major axis (the axis with the greater distance) one
cell at a time, accumulating an error term that tracks how far the true line deviates
from the current minor-axis position. When the error exceeds a threshold, the minor-axis
coordinate is incremented.

Key properties:
- **Integer-only arithmetic**: No floating-point division or multiplication required.
- **Incremental error accumulation**: The fractional slope is tracked via an integer error
  term, avoiding drift.
- **Symmetry**: The algorithm works identically regardless of line direction by adjusting
  step signs.

Given two grid points `(x0, y0)` and `(x1, y1)`:

```
dx = abs(x1 - x0)
dy = abs(y1 - y0)
```

The error term is initialized and updated each step. When it crosses zero, the secondary
axis is stepped.

### Pseudocode

```
function bresenham(x0, y0, x1, y1):
    dx = abs(x1 - x0)
    dy = abs(y1 - y0)
    sx = sign(x1 - x0)   // -1 or +1
    sy = sign(y1 - y0)   // -1 or +1
    err = dx - dy

    while true:
        visit(x0, y0)          // process or record this cell

        if x0 == x1 AND y0 == y1:
            break

        e2 = 2 * err

        if e2 > -dy:
            err = err - dy
            x0  = x0 + sx

        if e2 < dx:
            err = err + dx
            y0  = y0 + sy
```

### Haxe Implementation (from source)

```haxe
public function hasLineOfSight(x0:Int, y0:Int, x1:Int, y1:Int):Bool {
    var dx = hxd.Math.iabs(x1 - x0);
    var dy = hxd.Math.iabs(y1 - y0);
    var sx = (x0 < x1) ? 1 : -1;
    var sy = (y0 < y1) ? 1 : -1;
    var err = dx - dy;

    while (true) {
        if (isBlocking(x0, y0))
            return false;

        if (x0 == x1 && y0 == y1)
            return true;

        var e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x0 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y0 += sy;
        }
    }
}
```

### Practical Game Development Applications

- **Line of Sight (LOS)**: Walk the Bresenham line from an entity to a target; if any
  cell along the path is a wall or obstacle, line of sight is blocked.
- **Raycasting on grids**: Cast rays from a source in multiple directions to compute
  visibility maps or field-of-view cones.
- **Grid-based pathfinding validation**: After computing a path (e.g., via A*), verify
  that straight-line shortcuts between waypoints are unobstructed using Bresenham checks.
- **Projectile tracing**: Determine which tiles a bullet or projectile passes through in
  a tile-based game.
- **Lighting and shadow casting**: Trace rays from a light source to compute lit vs
  shadowed cells on a 2D grid.

---

## Collision Detection and Response Systems

> Source: https://medium.com/@erikkubiak/dev-log-1-custom-engine-writing-my-collision-system-2a97856f9a93

### What It Is

A collision system is responsible for detecting when game objects overlap or intersect
and then resolving those overlaps so that objects respond physically (bouncing, stopping,
sliding). Building a custom collision system involves choosing appropriate bounding
shapes, implementing overlap tests, and designing a resolution strategy.

### Mathematical / Algorithmic Concepts

#### Bounding Shapes

- **AABB (Axis-Aligned Bounding Box)**: A rectangle whose sides are aligned with the
  coordinate axes. Defined by a position (center or top-left corner) and half-widths.
  Fast overlap tests but imprecise for rotated or irregular shapes.
- **Circle / Sphere colliders**: Defined by center and radius. Overlap test is a simple
  distance comparison.
- **OBB (Oriented Bounding Box)**: A rotated rectangle. Uses the Separating Axis Theorem
  for overlap tests.

#### AABB vs AABB Overlap Test

Two axis-aligned bounding boxes overlap if and only if they overlap on every axis:

```
overlapX = (a.x - a.halfW < b.x + b.halfW) AND (a.x + a.halfW > b.x - b.halfW)
overlapY = (a.y - a.halfH < b.y + b.halfH) AND (a.y + a.halfH > b.y - b.halfH)
collision = overlapX AND overlapY
```

#### Circle vs Circle Overlap Test

```
dx = a.x - b.x
dy = a.y - b.y
distSquared = dx * dx + dy * dy
collision = distSquared < (a.radius + b.radius) ^ 2
```

Comparing squared distances avoids a costly square root operation.

#### Separating Axis Theorem (SAT)

Two convex shapes do NOT collide if there exists at least one axis along which their
projections do not overlap. For rectangles, test the edge normals of both rectangles.
If all projections overlap, the shapes are colliding.

#### Sweep and Prune (Broad Phase)

Rather than testing every pair of objects (O(n^2)), sort objects along one axis by
their minimum extent. Objects that do not overlap on that axis cannot collide and are
pruned from detailed checks.

### Pseudocode -- Collision Detection and Resolution

```
// Broad phase: spatial hash or sweep-and-prune
candidates = broadPhase(allObjects)

for each pair (a, b) in candidates:
    overlap = narrowPhaseTest(a, b)

    if overlap:
        // Compute penetration vector
        penetration = computePenetration(a, b)

        // Resolve: push objects apart along the minimum penetration axis
        if a.isStatic:
            b.position += penetration
        else if b.isStatic:
            a.position -= penetration
        else:
            a.position -= penetration * 0.5
            b.position += penetration * 0.5

        // Optional: apply impulse for velocity response
        relativeVelocity = a.velocity - b.velocity
        impulse = computeImpulse(relativeVelocity, penetration.normal, a.mass, b.mass)
        a.velocity -= impulse / a.mass
        b.velocity += impulse / b.mass
```

#### Minimum Penetration Vector (for AABBs)

```
function computePenetration(a, b):
    overlapX_left  = (a.x + a.halfW) - (b.x - b.halfW)
    overlapX_right = (b.x + b.halfW) - (a.x - a.halfW)
    overlapY_top   = (a.y + a.halfH) - (b.y - b.halfH)
    overlapY_bot   = (b.y + b.halfH) - (a.y - a.halfH)

    minOverlapX = min(overlapX_left, overlapX_right)
    minOverlapY = min(overlapY_top, overlapY_bot)

    if minOverlapX < minOverlapY:
        return Vector(sign * minOverlapX, 0)
    else:
        return Vector(0, sign * minOverlapY)
```

### Spatial Partitioning Strategies

| Strategy | Best For | Description |
|---|---|---|
| **Uniform Grid** | Evenly distributed objects | Divide world into fixed cells; objects register in their cell(s). |
| **Quadtree** | Non-uniform distribution | Recursively subdivide space into 4 quadrants. Efficient for sparse scenes. |
| **Spatial Hash** | Dynamic scenes | Hash object positions to buckets. O(1) lookup for neighbors. |
| **Sweep and Prune** | Many moving objects | Sort by axis; only test overlapping intervals. |

### Practical Game Development Applications

- **Platformer physics**: Resolve player-vs-terrain collisions so the character lands on
  platforms and cannot walk through walls.
- **Projectile hit detection**: Determine when a projectile (often a small AABB or circle)
  contacts an enemy or obstacle.
- **Trigger zones**: Detect when a player enters a region (overlap test without physical
  resolution) to trigger events.
- **Entity stacking**: Handle objects piled on top of each other using iterative
  resolution with multiple passes.

---

## Velocity and Speed

> Source: https://www.gamedev.net/tutorials/programming/math-and-physics/a-quick-lesson-in-velocity-and-speed-r6109/

### What It Is

Velocity and speed are fundamental concepts for moving objects in games. **Speed** is a
scalar (magnitude only), while **velocity** is a vector (magnitude and direction).
Understanding the distinction is critical for implementing correct movement, physics,
and AI steering behaviors.

### Mathematical / Algorithmic Concepts

#### Definitions

- **Speed**: A scalar quantity representing how fast an object moves, regardless of
  direction.
  ```
  speed = |velocity| = sqrt(vx^2 + vy^2)
  ```

- **Velocity**: A vector quantity representing both speed and direction.
  ```
  velocity = (vx, vy)
  ```

- **Acceleration**: The rate of change of velocity over time.
  ```
  acceleration = (ax, ay)
  velocity += acceleration * deltaTime
  ```

#### Updating Position with Velocity

Each frame, an object's position is updated by its velocity, scaled by the time step:

```
position.x += velocity.x * deltaTime
position.y += velocity.y * deltaTime
```

This is **Euler integration**, the simplest (first-order) integration method.

#### Normalizing Direction

To move at a fixed speed in a given direction, normalize the direction vector and
multiply by the desired speed:

```
direction = target - current
length = sqrt(direction.x^2 + direction.y^2)
if length > 0:
    direction.x /= length
    direction.y /= length
velocity = direction * speed
```

This prevents the "diagonal movement problem" where moving diagonally at full speed
on both axes results in ~1.414x the intended speed.

#### Frame-Rate Independence

Without `deltaTime`, movement speed depends on the frame rate:

```
// WRONG: frame-rate dependent
position += velocity

// CORRECT: frame-rate independent
position += velocity * deltaTime
```

`deltaTime` is the elapsed time (in seconds) since the last frame update.

### Pseudocode -- Complete Movement Update

```
function update(entity, deltaTime):
    // Apply acceleration (gravity, thrust, friction, etc.)
    entity.velocity.x += entity.acceleration.x * deltaTime
    entity.velocity.y += entity.acceleration.y * deltaTime

    // Clamp speed to a maximum
    currentSpeed = magnitude(entity.velocity)
    if currentSpeed > entity.maxSpeed:
        entity.velocity = normalize(entity.velocity) * entity.maxSpeed

    // Apply friction / drag
    entity.velocity.x *= (1 - entity.friction * deltaTime)
    entity.velocity.y *= (1 - entity.friction * deltaTime)

    // Update position
    entity.position.x += entity.velocity.x * deltaTime
    entity.position.y += entity.velocity.y * deltaTime
```

### Practical Game Development Applications

- **Character movement**: Apply velocity each frame to move the player smoothly,
  clamping to a max speed for consistent feel.
- **Projectiles**: Give bullets or arrows an initial velocity vector; update position
  each frame.
- **Gravity**: Apply a constant downward acceleration to velocity each frame to simulate
  falling.
- **Friction and drag**: Reduce velocity over time by multiplying by a damping factor
  to simulate surface friction or air resistance.
- **AI steering**: Compute a desired velocity toward a target, then smoothly adjust the
  current velocity toward it (seek, flee, arrive behaviors).

---

## Physics Engine Fundamentals

> Source: https://winter.dev/articles/physics-engine

### What It Is

A physics engine simulates real-world physical behaviors -- gravity, collisions, rigid
body dynamics -- so that game objects move and interact realistically. The core loop of a
physics engine consists of: applying forces, integrating motion, detecting collisions,
and resolving collisions.

### Mathematical / Algorithmic Concepts

#### The Physics Loop

A physics engine runs a fixed-timestep update loop:

```
accumulator = 0
fixedDeltaTime = 1 / 60  // 60 Hz physics

function physicsUpdate(frameDeltaTime):
    accumulator += frameDeltaTime

    while accumulator >= fixedDeltaTime:
        step(fixedDeltaTime)
        accumulator -= fixedDeltaTime
```

Using a fixed timestep ensures deterministic, stable simulation regardless of rendering
frame rate.

#### Integration Methods

**Semi-Implicit Euler** (symplectic Euler) -- the standard for game physics:

```
velocity += acceleration * dt
position += velocity * dt
```

This is more stable than explicit Euler (which updates position first) because velocity
is updated before being used to update position.

**Verlet Integration** -- an alternative that does not store velocity explicitly:

```
newPosition = 2 * position - oldPosition + acceleration * dt * dt
oldPosition = position
position = newPosition
```

Verlet is particularly useful for constraints (cloth, ragdoll) because positions can
be directly manipulated while preserving momentum.

#### Rigid Body Properties

Each rigid body has:

| Property | Description |
|---|---|
| `position` | Center of mass in world space |
| `velocity` | Linear velocity vector |
| `acceleration` | Sum of all forces / mass |
| `mass` | Resistance to linear acceleration |
| `inverseMass` | `1 / mass` (0 for static objects) |
| `angle` | Rotation angle |
| `angularVelocity` | Rate of rotation |
| `inertia` | Resistance to angular acceleration |
| `restitution` | Bounciness (0 = no bounce, 1 = perfectly elastic) |
| `friction` | Surface friction coefficient |

#### Force Accumulation

Forces are accumulated each frame, then converted to acceleration:

```
function applyForce(body, force):
    body.forceAccumulator += force

function integrate(body, dt):
    body.acceleration = body.forceAccumulator * body.inverseMass
    body.velocity += body.acceleration * dt
    body.position += body.velocity * dt
    body.forceAccumulator = (0, 0)  // reset
```

#### Collision Detection Pipeline

The detection phase is split into two stages:

1. **Broad Phase**: Quickly eliminate pairs that cannot possibly collide using bounding
   volumes (AABBs) and spatial structures (grids, BVH trees, sweep-and-prune).

2. **Narrow Phase**: For candidate pairs, perform precise shape-vs-shape tests to
   determine if they actually overlap and compute contact information (collision normal,
   penetration depth, contact points).

#### Collision Resolution with Impulses

When two bodies collide, an impulse is applied along the collision normal to separate
them and adjust their velocities:

```
function resolveCollision(a, b, normal, penetration):
    // Relative velocity at the contact point
    relVel = b.velocity - a.velocity
    velAlongNormal = dot(relVel, normal)

    // Do not resolve if objects are separating
    if velAlongNormal > 0:
        return

    // Coefficient of restitution (take minimum)
    e = min(a.restitution, b.restitution)

    // Impulse magnitude
    j = -(1 + e) * velAlongNormal
    j /= a.inverseMass + b.inverseMass

    // Apply impulse
    impulse = j * normal
    a.velocity -= impulse * a.inverseMass
    b.velocity += impulse * b.inverseMass

    // Positional correction (prevent sinking)
    correction = max(penetration - slop, 0) / (a.inverseMass + b.inverseMass) * percent
    a.position -= correction * a.inverseMass * normal
    b.position += correction * b.inverseMass * normal
```

Key constants:
- `slop`: A small tolerance (e.g., 0.01) to prevent jitter from micro-penetrations.
- `percent`: Typically 0.2 to 0.8; controls how aggressively positional correction is
  applied.

#### Rotational Dynamics

For 2D rotation, torque is the rotational equivalent of force:

```
torque = cross(contactPoint - centerOfMass, impulse)
angularAcceleration = torque * inverseInertia
angularVelocity += angularAcceleration * dt
angle += angularVelocity * dt
```

The moment of inertia depends on the shape:
- **Circle**: `I = 0.5 * m * r^2`
- **Rectangle**: `I = (1/12) * m * (w^2 + h^2)`

### Pseudocode -- Complete Physics Step

```
function step(dt):
    // 1. Apply external forces (gravity, player input, etc.)
    for each body in world.bodies:
        if not body.isStatic:
            body.applyForce(gravity * body.mass)

    // 2. Integrate velocities and positions
    for each body in world.bodies:
        if not body.isStatic:
            body.velocity += (body.forceAccumulator * body.inverseMass) * dt
            body.position += body.velocity * dt
            body.angularVelocity += body.torque * body.inverseInertia * dt
            body.angle += body.angularVelocity * dt
            body.forceAccumulator = (0, 0)
            body.torque = 0

    // 3. Broad-phase collision detection
    pairs = broadPhase(world.bodies)

    // 4. Narrow-phase collision detection
    contacts = []
    for each (a, b) in pairs:
        contact = narrowPhase(a, b)
        if contact:
            contacts.append(contact)

    // 5. Resolve collisions (iterative solver)
    for i in range(solverIterations):   // typically 4-10 iterations
        for each contact in contacts:
            resolveCollision(contact.a, contact.b,
                             contact.normal, contact.penetration)
```

### Practical Game Development Applications

- **Platformers**: Gravity, ground contact, jumping arcs, and moving platforms.
- **Top-down games**: Sliding along walls, knockback from attacks.
- **Ragdoll physics**: Chain of rigid bodies connected by constraints.
- **Vehicle simulation**: Suspension springs, tire friction, engine force.
- **Destruction**: Breaking objects into debris with individual physics bodies.

---

## Vector Mathematics for Game Development

> Source: https://www.gamedev.net/tutorials/programming/math-and-physics/vector-maths-for-game-dev-beginners-r5442/

### What It Is

Vectors are the mathematical building blocks of game development. A vector represents
a quantity with both magnitude and direction. In 2D games, vectors are pairs `(x, y)`;
in 3D, triples `(x, y, z)`. Nearly every game system -- movement, physics, rendering,
AI -- relies on vector operations.

### Mathematical / Algorithmic Concepts

#### Vector Representation

A 2D vector:
```
v = (x, y)
```

A 3D vector:
```
v = (x, y, z)
```

Vectors can represent positions, directions, velocities, forces, or any quantity with
magnitude and direction.

#### Vector Addition

Component-wise addition. Used to apply velocity to position, combine forces, etc.

```
a + b = (a.x + b.x, a.y + b.y)
```

**Example**: Moving a character by its velocity:
```
position = position + velocity * deltaTime
```

#### Vector Subtraction

Component-wise subtraction. Used to find the direction and distance from one point to
another.

```
a - b = (a.x - b.x, a.y - b.y)
```

**Example**: Direction from enemy to player:
```
directionToPlayer = player.position - enemy.position
```

#### Scalar Multiplication

Scales a vector's magnitude without changing its direction:

```
s * v = (s * v.x, s * v.y)
```

**Example**: Setting movement speed:
```
velocity = normalizedDirection * speed
```

#### Magnitude (Length)

The length of a vector, computed via the Pythagorean theorem:

```
|v| = sqrt(v.x^2 + v.y^2)
```

In 3D:
```
|v| = sqrt(v.x^2 + v.y^2 + v.z^2)
```

**Optimization**: When only comparing distances (not needing the actual value), use
squared magnitude to avoid the expensive square root:

```
|v|^2 = v.x^2 + v.y^2
```

#### Normalization

Produces a unit vector (length 1) pointing in the same direction:

```
normalize(v) = v / |v| = (v.x / |v|, v.y / |v|)
```

A normalized vector represents pure direction. Always check that `|v| > 0` before
dividing to avoid division by zero.

**Example**: Get the direction an entity is facing:
```
facing = normalize(target - self.position)
```

#### Dot Product

A scalar result that encodes the angular relationship between two vectors:

```
a . b = a.x * b.x + a.y * b.y
```

In 3D:
```
a . b = a.x * b.x + a.y * b.y + a.z * b.z
```

Geometric interpretation:
```
a . b = |a| * |b| * cos(theta)
```

Where `theta` is the angle between the vectors. For unit vectors:
```
a . b = cos(theta)
```

Key properties:
- `a . b > 0`: Vectors point in roughly the same direction (angle < 90 degrees).
- `a . b == 0`: Vectors are perpendicular (angle = 90 degrees).
- `a . b < 0`: Vectors point in roughly opposite directions (angle > 90 degrees).

**Game dev uses**:
- Field-of-view checks: Is the player in front of the enemy?
- Lighting: Compute diffuse light intensity (`max(0, dot(normal, lightDir))`).
- Projection: Project one vector onto another.

#### Cross Product (3D)

Produces a vector perpendicular to both input vectors:

```
a x b = (
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x
)
```

The magnitude of the cross product equals:
```
|a x b| = |a| * |b| * sin(theta)
```

In 2D, the "cross product" is a scalar (the z-component of the 3D cross product):
```
a x b = a.x * b.y - a.y * b.x
```

**Game dev uses**:
- Determine winding order (clockwise vs counter-clockwise).
- Compute surface normals for lighting.
- Determine if a point is to the left or right of a line.

#### Perpendicular Vector (2D)

To get a vector perpendicular to `(x, y)`:
```
perp = (-y, x)    // 90 degrees counter-clockwise
perp = (y, -x)    // 90 degrees clockwise
```

Useful for computing normals of 2D edges and walls.

#### Projection

Project vector `a` onto vector `b`:

```
proj_b(a) = (a . b / b . b) * b
```

If `b` is already a unit vector:
```
proj_b(a) = (a . b) * b
```

**Game dev uses**:
- Determine velocity component along a surface normal (for bounce/reflection).
- Sliding along a wall: Subtract the normal component from velocity.

#### Reflection

Reflect vector `v` across a surface with normal `n` (where `n` is a unit vector):

```
reflected = v - 2 * (v . n) * n
```

**Game dev uses**:
- Ball bouncing off a wall.
- Light reflection calculations.
- Ricochet trajectories.

### Pseudocode -- Vector2D Class

```
class Vector2D:
    x, y

    function add(other):
        return Vector2D(x + other.x, y + other.y)

    function subtract(other):
        return Vector2D(x - other.x, y - other.y)

    function scale(scalar):
        return Vector2D(x * scalar, y * scalar)

    function magnitude():
        return sqrt(x * x + y * y)

    function magnitudeSquared():
        return x * x + y * y

    function normalize():
        mag = magnitude()
        if mag > 0:
            return Vector2D(x / mag, y / mag)
        return Vector2D(0, 0)

    function dot(other):
        return x * other.x + y * other.y

    function cross(other):
        return x * other.y - y * other.x

    function perpendicular():
        return Vector2D(-y, x)

    function reflect(normal):
        d = dot(normal)
        return Vector2D(x - 2 * d * normal.x, y - 2 * d * normal.y)

    function angleTo(other):
        return acos(normalize().dot(other.normalize()))

    function distanceTo(other):
        return subtract(other).magnitude()

    function lerp(other, t):
        return Vector2D(
            x + (other.x - x) * t,
            y + (other.y - y) * t
        )
```

### Practical Game Development Applications

- **Movement and steering**: Add velocity vectors to position; normalize direction
  vectors and multiply by speed for consistent movement.
- **Distance checks**: Use squared magnitude for performance-friendly radius checks
  (e.g., "is this enemy within range?").
- **Field-of-view**: Use the dot product between an entity's forward vector and the
  direction to a target to determine if the target is within a vision cone.
- **Wall sliding**: Project the velocity onto the wall's tangent (perpendicular to the
  normal) to allow smooth sliding along surfaces.
- **Reflections and bouncing**: Use the reflection formula when a projectile or ball
  hits a surface.
- **Interpolation**: Use `lerp` (linear interpolation) between two vectors for smooth
  movement, camera tracking, and animations.
- **Rotation**: Rotate a vector by an angle using trigonometry:
  ```
  rotated.x = v.x * cos(angle) - v.y * sin(angle)
  rotated.y = v.x * sin(angle) + v.y * cos(angle)
  ```

---

## Quick Reference Table

| Algorithm / Concept | Primary Use Case | Complexity |
|---|---|---|
| Bresenham's Line | Grid raycasting, line of sight | O(max(dx, dy)) per ray |
| AABB Overlap | Fast collision detection | O(1) per pair |
| Circle Overlap | Round collider detection | O(1) per pair |
| Separating Axis Theorem | Convex polygon collision | O(n) per pair (n = edges) |
| Spatial Hashing | Broad-phase collision culling | O(1) average lookup |
| Euler Integration | Simple physics stepping | O(1) per body per step |
| Verlet Integration | Constraint-based physics | O(1) per body per step |
| Impulse Resolution | Collision response | O(iterations * contacts) |
| Vector Normalization | Direction extraction | O(1) |
| Dot Product | Angle/projection queries | O(1) |
| Cross Product | Perpendicularity / winding | O(1) |
| Reflection | Bounce / ricochet | O(1) |
