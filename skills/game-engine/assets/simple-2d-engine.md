# Simple 2D Platformer Engine Template

A grid-based 2D platformer engine tutorial by **Sebastien Benard** (deepnight), the lead developer behind *Dead Cells*. This template covers the fundamental architecture for a performant platformer: a dual-coordinate positioning system that blends integer grid cells with sub-pixel precision, velocity and friction mechanics, gravity, and a robust collision detection and response system. The approach is language-agnostic but examples use Haxe.

**Source references:**
- [Part 1 - Basics](https://deepnight.net/tutorial/a-simple-platformer-engine-part-1-basics/)
- [Part 2 - Collisions](https://deepnight.net/tutorial/a-simple-platformer-engine-part-2-collisions/)

**Author:** [Sebastien Benard / deepnight](https://deepnight.net)

---

## Engine Architecture Overview

The engine is built around a grid-based world where each cell has a fixed pixel size (e.g., 16x16). Entities exist within this grid using a **dual-coordinate system**: integer cell coordinates for coarse position and floating-point ratios for sub-pixel precision within each cell. This design enables pixel-perfect collision detection against the grid while maintaining smooth, fluid movement.

### Core Principles

1. **Grid is truth:** The world is a 2D grid of cells. Collision data lives in the grid.
2. **Entities straddle cells:** An entity's position is defined by which cell it occupies (`cx`, `cy`) plus how far into that cell it is (`xr`, `yr`).
3. **Velocity is in grid-ratio units:** Movement deltas (`dx`, `dy`) represent fractions of a cell per step, not raw pixels.
4. **Collisions are grid lookups:** Instead of testing sprite bounds against geometry, the engine checks the grid cells an entity is about to enter.

---

## Part 1: Basics

### The Grid

The level is a 2D array where each cell is either empty or solid. A constant defines the cell size in pixels:

```haxe
static inline var GRID = 16;
```

Collision data is stored as a simple 2D boolean or integer map:

```haxe
// Check if a grid cell is solid
function hasCollision(cx:Int, cy:Int):Bool {
  // Look up cell value in the level data
  return level.getCollision(cx, cy) != 0;
}
```

### Entity Positioning: Dual Coordinates

Every entity tracks its position using four values:

| Variable | Type | Description |
|----------|------|-------------|
| `cx` | Int | Cell X coordinate (which column the entity is in) |
| `cy` | Int | Cell Y coordinate (which row the entity is in) |
| `xr` | Float | X ratio within the cell, range 0.0 to 1.0 |
| `yr` | Float | Y ratio within the cell, range 0.0 to 1.0 |

An entity at `cx=5, cy=3, xr=0.5, yr=1.0` is horizontally centered in cell (5,3) and sitting on the bottom edge.

### Converting to Pixel Coordinates

To render the entity, convert grid coordinates to pixel positions:

```haxe
// Pixel position for rendering
var pixelX : Float = (cx + xr) * GRID;
var pixelY : Float = (cy + yr) * GRID;
```

This produces smooth, sub-pixel-precise positions for rendering even though the collision system operates on discrete grid cells.

### Velocity and Movement

Velocity is expressed in **cell-ratio units per fixed-step** (not pixels per frame):

```haxe
var dx : Float = 0; // Horizontal velocity (cells per step)
var dy : Float = 0; // Vertical velocity (cells per step)
```

Each fixed-step update, velocity is added to the ratio:

```haxe
// Apply horizontal movement
xr += dx;

// Apply vertical movement
yr += dy;
```

### Cell Overflow

When the ratio exceeds the 0..1 range, the entity has moved into an adjacent cell:

```haxe
// X overflow
while (xr > 1) { xr--; cx++; }
while (xr < 0) { xr++; cx--; }

// Y overflow
while (yr > 1) { yr--; cy++; }
while (yr < 0) { yr++; cy--; }
```

### Friction

Friction is applied as a multiplier each step, decaying velocity toward zero:

```haxe
var frictX : Float = 0.82; // Horizontal friction (0 = instant stop, 1 = no friction)
var frictY : Float = 0.82; // Vertical friction

// Applied each step after movement
dx *= frictX;
dy *= frictY;

// Clamp very small values to zero
if (Math.abs(dx) < 0.0005) dx = 0;
if (Math.abs(dy) < 0.0005) dy = 0;
```

Typical friction values:
- `0.82` -- Standard ground friction (responsive, quick stop)
- `0.94` -- Ice or slippery surface (slow deceleration)
- `0.96` -- Air friction (very slow horizontal deceleration)

### Gravity

Gravity is a constant added to `dy` each step:

```haxe
static inline var GRAVITY = 0.05; // In cell-ratio units per step^2

// In fixedUpdate:
dy += GRAVITY;
```

Since `dy` accumulates and friction is applied, the entity reaches a natural terminal velocity.

### Rendering / Sprite Sync

After the physics step, the sprite is placed at the computed pixel position:

```haxe
// In postUpdate, after physics is done:
sprite.x = (cx + xr) * GRID;
sprite.y = (cy + yr) * GRID;
```

For a platformer character, the anchor point is typically at the bottom-center of the sprite. With `yr = 1.0` representing the bottom of the current cell, the sprite's feet align with the floor.

### Basic Entity Template

```haxe
class Entity {
  // Grid coordinates
  var cx : Int = 0;
  var cy : Int = 0;
  var xr : Float = 0.5;
  var yr : Float = 1.0;

  // Velocity
  var dx : Float = 0;
  var dy : Float = 0;

  // Friction
  var frictX : Float = 0.82;
  var frictY : Float = 0.82;

  // Gravity
  static inline var GRAVITY = 0.05;

  // Grid size
  static inline var GRID = 16;

  // Pixel position (computed)
  public var attachX(get, never) : Float;
  inline function get_attachX() return (cx + xr) * GRID;

  public var attachY(get, never) : Float;
  inline function get_attachY() return (cy + yr) * GRID;

  public function fixedUpdate() {
    // Gravity
    dy += GRAVITY;

    // Apply velocity
    xr += dx;
    yr += dy;

    // Apply friction
    dx *= frictX;
    dy *= frictY;

    // Clamp small values
    if (Math.abs(dx) < 0.0005) dx = 0;
    if (Math.abs(dy) < 0.0005) dy = 0;

    // Cell overflow
    while (xr > 1) { xr--; cx++; }
    while (xr < 0) { xr++; cx--; }
    while (yr > 1) { yr--; cy++; }
    while (yr < 0) { yr++; cy--; }
  }

  public function postUpdate() {
    sprite.x = attachX;
    sprite.y = attachY;
  }
}
```

---

## Part 2: Collisions

### Collision Philosophy

Instead of using bounding-box-to-bounding-box collision detection (which becomes complex with slopes, one-way platforms, and edge cases), this engine checks grid cells directly. Since the entity's position is already expressed in grid terms, collision detection becomes a series of simple integer lookups.

### The Core Idea

Before allowing the entity to move into a neighboring cell, check if that cell is solid. If it is, clamp the entity's ratio and zero out its velocity on that axis.

### Axis Separation

Collisions are handled **per axis** -- first X, then Y (or vice versa). This simplifies the logic and avoids corner-case tunneling issues.

### X-Axis Collision

After applying `dx` to `xr`, before doing the cell-overflow step, check for collisions:

```haxe
// Apply X movement
xr += dx;

// Check collision to the RIGHT
if (dx > 0 && hasCollision(cx + 1, cy) && xr >= 0.7) {
  xr = 0.7;   // Clamp: stop before entering the solid cell
  dx = 0;     // Kill horizontal velocity
}

// Check collision to the LEFT
if (dx < 0 && hasCollision(cx - 1, cy) && xr <= 0.3) {
  xr = 0.3;   // Clamp: stop before entering the solid cell
  dx = 0;     // Kill horizontal velocity
}

// Cell overflow (after collision check)
while (xr > 1) { xr--; cx++; }
while (xr < 0) { xr++; cx--; }
```

**Why 0.7 and 0.3?** These thresholds represent the entity's collision radius within a cell. An entity centered at `xr = 0.5` with a half-width of 0.3 cells would collide at `xr = 0.7` on the right side and `xr = 0.3` on the left side. Adjust these values based on entity width.

### Y-Axis Collision

Similarly, after applying `dy` to `yr`:

```haxe
// Apply Y movement
yr += dy;

// Check collision BELOW (floor)
if (dy > 0 && hasCollision(cx, cy + 1) && yr >= 1.0) {
  yr = 1.0;   // Clamp: land on top of the solid cell
  dy = 0;     // Kill vertical velocity
}

// Check collision ABOVE (ceiling)
if (dy < 0 && hasCollision(cx, cy - 1) && yr <= 0.3) {
  yr = 0.3;   // Clamp: stop before entering ceiling cell
  dy = 0;     // Kill vertical velocity
}

// Cell overflow
while (yr > 1) { yr--; cy++; }
while (yr < 0) { yr++; cy--; }
```

For floor collisions, `yr = 1.0` means the entity sits exactly on the bottom edge of its current cell, which is the top edge of the cell below it. This is the natural "standing on ground" position.

### On-Ground Detection

To determine if the entity is standing on solid ground (for jump logic, animations, etc.):

```haxe
function isOnGround() : Bool {
  return hasCollision(cx, cy + 1) && yr >= 0.98;
}
```

The threshold `0.98` instead of `1.0` allows for minor floating-point imprecision.

### Complete Entity with Collisions

```haxe
class Entity {
  var cx : Int = 0;
  var cy : Int = 0;
  var xr : Float = 0.5;
  var yr : Float = 1.0;
  var dx : Float = 0;
  var dy : Float = 0;
  var frictX : Float = 0.82;
  var frictY : Float = 0.82;

  static inline var GRID = 16;
  static inline var GRAVITY = 0.05;

  // Collision radius (half-width in cell-ratio units)
  var collRadius : Float = 0.3;

  function hasCollision(testCx:Int, testCy:Int):Bool {
    return level.isCollision(testCx, testCy);
  }

  function isOnGround():Bool {
    return hasCollision(cx, cy + 1) && yr >= 0.98;
  }

  public function fixedUpdate() {
    // --- Gravity ---
    dy += GRAVITY;

    // --- X Axis ---
    xr += dx;

    // Right collision
    if (dx > 0 && hasCollision(cx + 1, cy) && xr >= 1.0 - collRadius) {
      xr = 1.0 - collRadius;
      dx = 0;
    }

    // Left collision
    if (dx < 0 && hasCollision(cx - 1, cy) && xr <= collRadius) {
      xr = collRadius;
      dx = 0;
    }

    // X cell overflow
    while (xr > 1) { xr--; cx++; }
    while (xr < 0) { xr++; cx--; }

    // --- Y Axis ---
    yr += dy;

    // Floor collision
    if (dy > 0 && hasCollision(cx, cy + 1) && yr >= 1.0) {
      yr = 1.0;
      dy = 0;
    }

    // Ceiling collision
    if (dy < 0 && hasCollision(cx, cy - 1) && yr <= collRadius) {
      yr = collRadius;
      dy = 0;
    }

    // Y cell overflow
    while (yr > 1) { yr--; cy++; }
    while (yr < 0) { yr++; cy--; }

    // --- Friction ---
    dx *= frictX;
    dy *= frictY;

    if (Math.abs(dx) < 0.0005) dx = 0;
    if (Math.abs(dy) < 0.0005) dy = 0;
  }

  public function postUpdate() {
    sprite.x = (cx + xr) * GRID;
    sprite.y = (cy + yr) * GRID;
  }
}
```

---

## Collision Edge Cases and Solutions

### Diagonal Movement / Corner Clipping

Because collisions are checked per-axis in sequence, an entity moving diagonally into a corner naturally resolves against one axis first. This prevents the entity from getting stuck in corners and eliminates the need for complex diagonal collision logic.

### High-Speed Tunneling

If `dx` or `dy` is large enough to skip an entire cell in one step, the entity could "tunnel" through walls. Solutions:

1. **Cap velocity:** Clamp `dx` and `dy` to a maximum of 0.5 (half a cell per step)
2. **Subdivide steps:** If velocity exceeds the threshold, run the collision check in smaller increments
3. **Ray-march the grid:** Check every cell along the movement path

```haxe
// Simple velocity cap
if (dx > 0.5) dx = 0.5;
if (dx < -0.5) dx = -0.5;
if (dy > 0.5) dy = 0.5;
if (dy < -0.5) dy = -0.5;
```

### One-Way Platforms

Platforms the entity can jump up through but land on from above:

```haxe
// In Y collision, check for one-way platform
if (dy > 0 && isOneWayPlatform(cx, cy + 1) && yr >= 1.0 && prevYr < 1.0) {
  yr = 1.0;
  dy = 0;
}
```

Key: Only collide when the entity is moving downward (`dy > 0`) and was previously above the platform (`prevYr < 1.0`).

### Slopes

For basic slope support, instead of a binary collision check, query the slope height at the entity's x-position within the cell:

```haxe
// Pseudocode for slope collision
var slopeHeight = getSlopeHeight(cx, cy + 1, xr);
if (yr >= slopeHeight) {
  yr = slopeHeight;
  dy = 0;
}
```

---

## Jumping

Jumping is simply a negative `dy` impulse:

```haxe
function jump() {
  if (isOnGround()) {
    dy = -0.5; // Jump impulse (in cell-ratio units)
  }
}
```

Gravity naturally decelerates the upward motion, creating a parabolic arc. To allow variable-height jumps (holding the button longer = higher jump):

```haxe
// On jump button release, reduce upward velocity
function onJumpRelease() {
  if (dy < 0) {
    dy *= 0.5; // Cut remaining upward velocity
  }
}
```

---

## Coordinate System Diagram

```
  Cell (cx, cy)           Next Cell (cx+1, cy)
  +-------------------+   +-------------------+
  |                   |   |                   |
  |  xr=0.0    xr=1.0 --> |  xr=0.0           |
  |                   |   |                   |
  |         *         |   |                   |
  |     (xr=0.5,      |   |                   |
  |      yr=0.5)      |   |                   |
  |                   |   |                   |
  +-------------------+   +-------------------+
  yr=0.0      yr=1.0 = top of cell below

  Pixel position = (cx + xr) * GRID, (cy + yr) * GRID
```

---

## Update Order Summary

```
fixedUpdate():
  1. Apply gravity          dy += GRAVITY
  2. Apply X velocity       xr += dx
  3. Check X collisions     Clamp xr, zero dx if colliding
  4. Handle X cell overflow cx/xr normalization
  5. Apply Y velocity       yr += dy
  6. Check Y collisions     Clamp yr, zero dy if colliding
  7. Handle Y cell overflow cy/yr normalization
  8. Apply friction         dx *= frictX, dy *= frictY
  9. Zero out tiny values   Threshold check

postUpdate():
  1. Sync sprite position   sprite.x/y = pixel coords
  2. Update animation       Based on state/velocity
  3. Camera follow          Track entity
```

---

## Design Advantages

| Feature | Benefit |
|---------|---------|
| Grid-based collision | O(1) lookup per check, no broad-phase needed |
| Dual coordinates | Sub-pixel smooth rendering with integer collision |
| Per-axis collision | Simple logic, naturally handles corners |
| Ratio-based velocity | Resolution-independent movement |
| Friction multiplier | Tunable feel per surface type |
| Cell overflow while-loops | Handles multi-cell movement safely |
