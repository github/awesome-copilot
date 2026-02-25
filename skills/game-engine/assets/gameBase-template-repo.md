# GameBase Template Repository

A feature-rich, opinionated starter template for 2D game projects built with **Haxe** and the **Heaps** game engine. Created and maintained by **Sebastien Benard** (deepnight), the lead developer behind *Dead Cells*. GameBase provides a production-tested foundation with entity management, level integration via LDtk, rendering pipeline, and a game loop architecture -- all designed to let developers skip boilerplate and jump straight into game-specific logic.

**Repository:** [github.com/deepnight/gameBase](https://github.com/deepnight/gameBase)
**Author:** [Sebastien Benard / deepnight](https://deepnight.net)
**Technology:** Haxe + Heaps (HashLink or JS targets)
**Level editor integration:** [LDtk](https://ldtk.io)

---

## Purpose

GameBase exists to solve the "blank project" problem. Instead of setting up rendering, entity systems, camera controls, debug overlays, and level loading from scratch, developers clone this repository and begin implementing game-specific mechanics immediately. It reflects patterns refined through commercial game development, particularly from the development of *Dead Cells*.

Key benefits:
- Pre-built entity system with grid-based positioning and sub-pixel precision
- LDtk level editor integration for visual level design
- Built-in debug tools and overlays
- Frame-rate independent game loop with fixed-step updates
- Camera system with follow, shake, zoom, and clamp
- Configurable Controller/input management
- Scalable rendering pipeline with Heaps

---

## Repository Structure

```
gameBase/
  src/
    game/
      App.hx              -- Application entry point and initialization
      Game.hx             -- Main game process, holds level and entities
      Entity.hx           -- Base entity class with grid coords, velocity, animation
      Level.hx            -- Level loading and collision map from LDtk
      Camera.hx           -- Camera follow, shake, zoom, clamping
      Fx.hx               -- Visual effects (particles, flashes, etc.)
      Types.hx            -- Enums, typedefs, and constants
      en/
        Hero.hx            -- Player entity (example implementation)
        Mob.hx             -- Enemy entity (example implementation)
    import.hx             -- Global imports (available everywhere)
  res/
    atlas/                 -- Sprite sheets and texture atlases
    levels/                -- LDtk level project files
    fonts/                 -- Bitmap fonts
  .ldtk                   -- LDtk project file (root)
  build.hxml              -- Haxe compiler configuration
  Makefile                -- Build/run shortcuts
  README.md
```

---

## Key Files and Their Roles

### `src/game/App.hx` -- Application Entry Point

The main application class that extends `dn.Process`. Handles:
- Window/display initialization
- Scene management (root scene graph)
- Global input controller setup
- Debug toggle and console

```haxe
class App extends dn.Process {
  public static var ME : App;

  override function init() {
    ME = this;
    // Initialize rendering, controller, assets
    new Game();
  }
}
```

### `src/game/Game.hx` -- Game Process

Manages the active game session:
- Holds reference to the current `Level`
- Manages all active `Entity` instances (via a global linked list)
- Handles pause, game-over, and restart logic
- Coordinates camera and effects

```haxe
class Game extends dn.Process {
  public var level : Level;
  public var hero : en.Hero;
  public var fx : Fx;
  public var camera : Camera;

  public function new() {
    super(App.ME);
    level = new Level();
    fx = new Fx();
    camera = new Camera();
    hero = new en.Hero();
  }
}
```

### `src/game/Entity.hx` -- Base Entity

The core entity class featuring:
- **Grid-based positioning:** `cx`, `cy` (integer cell coordinates) plus `xr`, `yr` (sub-cell ratio 0.0 to 1.0) for smooth sub-pixel movement
- **Velocity and friction:** `dx`, `dy` (velocity) with configurable `frictX`, `frictY`
- **Gravity:** Optional per-entity gravity
- **Sprite management:** Animated sprite via Heaps `h2d.Anim` or `dn.heaps.HSprite`
- **Lifecycle:** `update()`, `fixedUpdate()`, `postUpdate()`, `dispose()`
- **Collision helpers:** `hasCollision(cx, cy)` check against the level collision map

```haxe
class Entity {
  // Grid position
  public var cx : Int = 0;   // Cell X
  public var cy : Int = 0;   // Cell Y
  public var xr : Float = 0.5; // X ratio within cell (0..1)
  public var yr : Float = 1.0; // Y ratio within cell (0..1)

  // Velocity
  public var dx : Float = 0;
  public var dy : Float = 0;

  // Pixel position (computed)
  public var attachX(get,never) : Float;
  inline function get_attachX() return (cx + xr) * Const.GRID;
  public var attachY(get,never) : Float;
  inline function get_attachY() return (cy + yr) * Const.GRID;

  // Physics step
  public function fixedUpdate() {
    xr += dx;
    dx *= frictX;

    // X collision
    if (xr > 1) { cx++; xr--; }
    if (xr < 0) { cx--; xr++; }

    yr += dy;
    dy *= frictY;

    // Y collision
    if (yr > 1) { cy++; yr--; }
    if (yr < 0) { cy--; yr++; }
  }
}
```

### `src/game/Level.hx` -- Level Management

Loads and manages level data from LDtk project files:
- Parses tile layers, entity layers, and int grid layers
- Builds a collision grid (`hasCollision(cx, cy)`)
- Provides helper methods to query the level structure

```haxe
class Level {
  var data : ldtk.Level;
  var collisions : Map<Int, Bool>;

  public function new(ldtkLevel) {
    data = ldtkLevel;
    // Parse IntGrid layer for collision marks
    for (cy in 0...data.l_Collisions.cHei)
      for (cx in 0...data.l_Collisions.cWid)
        if (data.l_Collisions.getInt(cx, cy) == 1)
          collisions.set(coordId(cx, cy), true);
  }

  public inline function hasCollision(cx:Int, cy:Int) : Bool {
    return collisions.exists(coordId(cx, cy));
  }
}
```

### `src/game/Camera.hx` -- Camera System

Provides:
- **Target tracking:** Follow an entity smoothly with configurable dead zones
- **Shake:** Screen shake with decay
- **Zoom:** Dynamic zoom in/out
- **Clamping:** Keep the camera within level bounds

### `src/game/Fx.hx` -- Effects System

Particle and visual effect management:
- Particle pools
- Screen flash
- Slow-motion helpers
- Color overlay effects

---

## Technology Stack

### Haxe

A cross-platform, high-level programming language that compiles to multiple targets:
- **HashLink (HL):** Native bytecode VM for desktop (primary dev target)
- **JavaScript (JS):** Browser/web target
- **C/C++:** Via HXCPP for native builds

### Heaps (Heaps.io)

A high-performance, cross-platform 2D/3D game engine:
- GPU-accelerated rendering via OpenGL/DirectX/WebGL
- Scene graph architecture with `h2d.Object` hierarchy
- Sprite batching and texture atlases
- Bitmap font rendering
- Input abstraction

### LDtk

A modern, open-source 2D level editor created by Sebastien Benard:
- Visual, tile-based level design
- IntGrid layers for collision and metadata
- Entity layers for game object placement
- Auto-tiling rules
- Haxe API auto-generated from the project file

---

## Setup Instructions

### Prerequisites

1. **Install Haxe** (4.0+): [haxe.org](https://haxe.org/download/)
2. **Install HashLink** (for desktop target): [hashlink.haxe.org](https://hashlink.haxe.org/)
3. **Install LDtk** (for level editing): [ldtk.io](https://ldtk.io/)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/deepnight/gameBase.git my-game
cd my-game

# Install Haxe dependencies
haxelib install heaps
haxelib install deepnightLibs
haxelib install ldtk-haxe-api

# Build and run (HashLink target)
haxe build.hxml
hl bin/client.hl

# Or use the Makefile (if available)
make run
```

### Using as a Starting Point

1. **Clone or use the template** -- Do not fork; clone into a new directory with your game's name.
2. **Rename the package** -- Update `src/game/` package declarations and project references to match your game.
3. **Edit `build.hxml`** -- Adjust the main class, output path, and target as needed.
4. **Design levels in LDtk** -- Open the `.ldtk` file, define your layers and entities, and export.
5. **Implement entities** -- Create new entity classes in `src/game/en/` extending `Entity`.
6. **Iterate** -- Use the debug console (toggle in-game) for live inspection and tuning.

---

## Build Targets

| Target | Command | Output | Use Case |
|--------|---------|--------|----------|
| HashLink | `haxe build.hxml` | `bin/client.hl` | Development, desktop release |
| JavaScript | `haxe build.js.hxml` | `bin/client.js` | Web/browser builds |
| DirectX/OpenGL | Via HL native | Native executable | Production desktop release |

---

## Debug Features

GameBase includes built-in debug tooling:
- **Debug overlay:** Toggle with a key to show entity bounds, grid, velocities, collision map
- **Console:** In-game command console for toggling flags, teleporting, spawning entities
- **FPS counter:** Visible frame-rate and update-rate monitor
- **Process inspector:** View active processes and their hierarchy

---

## Game Loop Architecture

GameBase uses a fixed-timestep game loop pattern:

```
Each frame:
  1. preUpdate()    -- Input polling, pre-frame logic
  2. fixedUpdate()  -- Physics, movement, collisions (fixed timestep)
     - May run 0-N times per frame to catch up
  3. update()       -- General per-frame logic
  4. postUpdate()   -- Sprite position sync, camera update, rendering prep
```

This ensures physics behavior is consistent regardless of frame rate, while rendering and visual updates remain smooth.

---

## Entity Lifecycle

```
Constructor  -->  init()  -->  [game loop: fixedUpdate/update/postUpdate]  -->  dispose()
```

- **Constructor:** Set initial position, create sprite, register in global entity list
- **fixedUpdate():** Physics step (velocity, friction, gravity, collision)
- **update():** AI, state machine, animation triggers
- **postUpdate():** Sync sprite position to grid coordinates, apply visual effects
- **dispose():** Remove from entity list, destroy sprite, clean up references
