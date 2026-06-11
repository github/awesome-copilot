# Game Engine Core Design Principles

A comprehensive reference on the fundamental architecture and design principles behind building a game engine. Covers modularity, separation of concerns, core subsystems, and practical implementation guidance.

Source: https://www.gamedev.net/articles/programming/general-and-gameplay-programming/making-a-game-engine-core-design-principles-r3210/

---

## Why Build a Game Engine

A game engine is a reusable software framework that abstracts the common systems needed to build games. Rather than writing rendering, physics, input, and audio code from scratch for every project, a well-designed engine provides these as modular, configurable subsystems.

Key motivations:
- **Reusability** -- Use the same codebase across multiple game projects.
- **Separation of engine code from game code** -- Engine developers and game designers can work independently.
- **Maintainability** -- Well-structured code is easier to debug, extend, and optimize.
- **Scalability** -- Add new features or platforms without rewriting existing systems.

---

## Core Design Principles

### Modularity

Every major system in the engine should be an independent module with a well-defined interface. Modules should communicate through clean APIs rather than reaching into each other's internals.

**Why it matters:**
- Swap implementations without affecting other systems (e.g., replace OpenGL renderer with Vulkan).
- Test individual systems in isolation.
- Allow teams to work on different modules in parallel.

**Example structure:**

```
engine/
  core/           -- Memory, logging, math, utilities
  platform/       -- OS abstraction, windowing, file I/O
  renderer/       -- Graphics API, shaders, materials
  physics/        -- Collision, rigid body dynamics
  audio/          -- Sound playback, mixing, spatial audio
  input/          -- Keyboard, mouse, gamepad, touch
  scripting/      -- Scripting language bindings
  scene/          -- Scene graph, entity management
  resources/      -- Asset loading, caching, streaming
```

### Separation of Concerns

Each system should have a single, clearly defined responsibility. Avoid mixing rendering logic with physics, or input handling with game state management.

**Practical guidelines:**
- The renderer should not know about game mechanics.
- The physics engine should not know how entities are rendered.
- Input processing should translate raw device events into abstract actions that game code can consume.
- The game logic layer sits on top of the engine and uses engine services without modifying them.

### Data-Driven Design

Wherever possible, behavior should be controlled by data rather than hard-coded logic. This allows designers and artists to modify game behavior without recompiling code.

**Examples of data-driven approaches:**
- Level layouts defined in data files (JSON, XML, binary) rather than code.
- Entity properties and behaviors configured through component data.
- Shader parameters exposed as material properties editable in tools.
- Animation state machines defined in configuration rather than imperative code.

### Minimize Dependencies

Each module should depend on as few other modules as possible. The dependency graph should be a clean hierarchy, not a tangled web.

```
Game Code
    |
    v
Engine High-Level Systems (Scene, Entity, Scripting)
    |
    v
Engine Low-Level Systems (Renderer, Physics, Audio, Input)
    |
    v
Engine Core (Memory, Math, Logging, Platform Abstraction)
    |
    v
Operating System / Hardware
```

Circular dependencies between modules are a sign of poor architecture and should be eliminated.

---

## The Entity-Component-System (ECS) Pattern

ECS is a widely adopted architectural pattern in modern game engines that favors composition over inheritance.

### Core Concepts

- **Entity** -- A unique identifier (often just an integer ID) that represents a game object. An entity has no behavior or data of its own.
- **Component** -- A plain data container attached to an entity. Each component type stores one aspect of an entity's state (position, velocity, sprite, health, etc.).
- **System** -- A function or object that processes all entities with a specific set of components. Systems contain the logic; components contain the data.

### Why ECS Over Inheritance

Traditional object-oriented inheritance creates rigid, deep hierarchies:

```
GameObject
  -> MovableObject
    -> Character
      -> Player
      -> Enemy
        -> FlyingEnemy
        -> GroundEnemy
```

Problems with this approach:
- Adding a new entity type that combines traits from multiple branches requires restructuring the hierarchy or using multiple inheritance.
- Deep hierarchies are fragile; changes to base classes ripple through all descendants.
- Classes accumulate unused behavior over time.

ECS solves these problems through composition:

```javascript
// An entity is just an ID
const player = world.createEntity();

// Attach components to define what it is
world.addComponent(player, new Position(100, 200));
world.addComponent(player, new Velocity(0, 0));
world.addComponent(player, new Sprite("player.png"));
world.addComponent(player, new Health(100));
world.addComponent(player, new PlayerInput());

// A "flying enemy" is just a different combination of components
const flyingEnemy = world.createEntity();
world.addComponent(flyingEnemy, new Position(400, 50));
world.addComponent(flyingEnemy, new Velocity(0, 0));
world.addComponent(flyingEnemy, new Sprite("bat.png"));
world.addComponent(flyingEnemy, new Health(30));
world.addComponent(flyingEnemy, new AIBehavior("patrol_fly"));
world.addComponent(flyingEnemy, new Flying());
```

### Systems Process Components

```javascript
// Movement system: processes all entities with Position + Velocity
function movementSystem(world, deltaTime) {
  for (const [entity, pos, vel] of world.query(Position, Velocity)) {
    pos.x += vel.x * deltaTime;
    pos.y += vel.y * deltaTime;
  }
}

// Render system: processes all entities with Position + Sprite
function renderSystem(world, context) {
  for (const [entity, pos, sprite] of world.query(Position, Sprite)) {
    context.drawImage(sprite.image, pos.x, pos.y);
  }
}

// Gravity system: only affects entities with Velocity but NOT Flying
function gravitySystem(world, deltaTime) {
  for (const [entity, vel] of world.query(Velocity).without(Flying)) {
    vel.y += 9.8 * deltaTime;
  }
}
```

### Benefits of ECS

- **Flexible composition** -- Create any entity type by mixing components without modifying code.
- **Cache-friendly data layout** -- Storing components contiguously in memory improves CPU cache performance.
- **Parallelism** -- Systems that operate on different component sets can run in parallel.
- **Easy serialization** -- Components are plain data, making save/load straightforward.

---

## Core Engine Subsystems

### Memory Management

Custom memory management is critical for game engine performance. The default allocator (malloc/new) is general-purpose and not optimized for game workloads.

**Common allocation strategies:**

- **Stack Allocator** -- Fast LIFO allocations for temporary, frame-scoped data. Reset the stack pointer at the end of each frame.
- **Pool Allocator** -- Fixed-size block allocation for objects of the same type (entities, components, particles). Zero fragmentation.
- **Frame Allocator** -- A linear allocator that resets every frame. Ideal for per-frame temporary data.
- **Double-Buffered Allocator** -- Two frame allocators that alternate each frame, allowing data from the previous frame to persist.

```cpp
// Conceptual frame allocator
class FrameAllocator {
    char* buffer;
    size_t offset;
    size_t capacity;

public:
    void* allocate(size_t size) {
        void* ptr = buffer + offset;
        offset += size;
        return ptr;
    }

    void reset() {
        offset = 0;  // All allocations freed instantly
    }
};
```

### Resource Management

The resource manager handles loading, caching, and lifetime management of game assets.

**Key responsibilities:**
- **Asynchronous loading** -- Load assets in background threads to avoid stalling the game loop.
- **Reference counting** -- Track how many systems use an asset; unload when no longer referenced.
- **Caching** -- Keep recently used assets in memory to avoid redundant disk reads.
- **Hot reloading** -- Detect asset changes on disk and reload them at runtime during development.
- **Resource handles** -- Use handles (IDs or smart pointers) rather than raw pointers to reference assets.

```javascript
class ResourceManager {
  constructor() {
    this.cache = new Map();
    this.loading = new Map();
  }

  async load(path) {
    // Return cached resource if available
    if (this.cache.has(path)) {
      return this.cache.get(path);
    }

    // Avoid duplicate loads
    if (this.loading.has(path)) {
      return this.loading.get(path);
    }

    // Start async load
    const promise = this._loadFromDisk(path).then(resource => {
      this.cache.set(path, resource);
      this.loading.delete(path);
      return resource;
    });

    this.loading.set(path, promise);
    return promise;
  }

  unload(path) {
    this.cache.delete(path);
  }
}
```

### Rendering Pipeline

The rendering subsystem translates the game's visual state into pixels on screen.

**Typical rendering pipeline stages:**

1. **Scene traversal** -- Walk the scene graph or query ECS for renderable entities.
2. **Frustum culling** -- Discard objects outside the camera's view.
3. **Occlusion culling** -- Discard objects hidden behind other geometry.
4. **Sorting** -- Order objects by material, depth, or transparency requirements.
5. **Batching** -- Group objects with the same material to minimize draw calls and state changes.
6. **Vertex processing** -- Transform vertices from model space to screen space (vertex shader).
7. **Rasterization** -- Convert triangles to fragments (pixels).
8. **Fragment processing** -- Compute final pixel color using lighting, textures, and effects (fragment shader).
9. **Post-processing** -- Apply screen-space effects like bloom, tone mapping, and anti-aliasing.

**Render command pattern:**

Rather than making draw calls directly, build a list of render commands that can be sorted and batched before submission:

```javascript
class RenderCommand {
  constructor(mesh, material, transform, sortKey) {
    this.mesh = mesh;
    this.material = material;
    this.transform = transform;
    this.sortKey = sortKey;
  }
}

class Renderer {
  constructor() {
    this.commandQueue = [];
  }

  submit(command) {
    this.commandQueue.push(command);
  }

  flush(context) {
    // Sort by material to minimize state changes
    this.commandQueue.sort((a, b) => a.sortKey - b.sortKey);

    for (const cmd of this.commandQueue) {
      this._bindMaterial(cmd.material);
      this._setTransform(cmd.transform);
      this._drawMesh(cmd.mesh, context);
    }

    this.commandQueue.length = 0;
  }
}
```

### Physics Integration

The physics subsystem simulates physical behavior and detects collisions.

**Key design considerations:**

- **Fixed timestep** -- Physics should update at a fixed rate (e.g., 50 Hz) independent of the rendering frame rate. This ensures deterministic simulation behavior.
- **Collision phases** -- Use a broad phase (spatial partitioning, bounding volume hierarchies) to quickly eliminate non-colliding pairs, followed by a narrow phase for precise intersection testing.
- **Physics world separation** -- The physics world should maintain its own representation of objects (physics bodies) separate from game entities. A synchronization step maps between them.

```javascript
class PhysicsWorld {
  constructor(fixedTimestep = 1 / 50) {
    this.fixedTimestep = fixedTimestep;
    this.accumulator = 0;
    this.bodies = [];
  }

  update(deltaTime) {
    this.accumulator += deltaTime;

    while (this.accumulator >= this.fixedTimestep) {
      this.step(this.fixedTimestep);
      this.accumulator -= this.fixedTimestep;
    }
  }

  step(dt) {
    // Integrate velocities
    for (const body of this.bodies) {
      body.velocity.y += body.gravity * dt;
      body.position.x += body.velocity.x * dt;
      body.position.y += body.velocity.y * dt;
    }

    // Detect and resolve collisions
    this.broadPhase();
    this.narrowPhase();
    this.resolveCollisions();
  }
}
```

### Input System

The input system translates raw hardware events into game-meaningful actions.

**Layered design:**

1. **Hardware Layer** -- Receives raw events from the OS (key pressed, mouse moved, button down).
2. **Mapping Layer** -- Translates raw inputs into named actions via configurable bindings (e.g., "Space" maps to "Jump", "W" maps to "MoveForward").
3. **Action Layer** -- Exposes abstract actions that game code queries, completely decoupled from specific hardware inputs.

```javascript
class InputManager {
  constructor() {
    this.bindings = new Map();
    this.actionStates = new Map();
  }

  bind(action, key) {
    this.bindings.set(key, action);
  }

  handleKeyDown(event) {
    const action = this.bindings.get(event.code);
    if (action) {
      this.actionStates.set(action, true);
    }
  }

  handleKeyUp(event) {
    const action = this.bindings.get(event.code);
    if (action) {
      this.actionStates.set(action, false);
    }
  }

  isActionActive(action) {
    return this.actionStates.get(action) || false;
  }
}

// Usage
const input = new InputManager();
input.bind("Jump", "Space");
input.bind("MoveLeft", "KeyA");
input.bind("MoveRight", "KeyD");

// In game update:
if (input.isActionActive("Jump")) {
  player.jump();
}
```

### Event System

An event system enables decoupled communication between engine subsystems and game code without direct references.

**Publish-subscribe pattern:**

```javascript
class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  off(eventType, callback) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) callbacks.splice(index, 1);
    }
  }

  emit(eventType, data) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(data);
      }
    }
  }
}

// Usage
const events = new EventBus();

events.on("collision", (data) => {
  console.log(`${data.entityA} collided with ${data.entityB}`);
});

events.on("entityDestroyed", (data) => {
  spawnExplosion(data.position);
  addScore(data.points);
});

// Emit from physics system
events.emit("collision", { entityA: player, entityB: wall });
```

**Deferred events:**

For performance and determinism, events can be queued during a frame and dispatched at a specific point in the update cycle:

```javascript
class DeferredEventBus extends EventBus {
  constructor() {
    super();
    this.eventQueue = [];
  }

  queue(eventType, data) {
    this.eventQueue.push({ type: eventType, data });
  }

  dispatchQueued() {
    for (const event of this.eventQueue) {
      this.emit(event.type, event.data);
    }
    this.eventQueue.length = 0;
  }
}
```

### Scene Management

The scene manager organizes game content into logical groups and manages transitions between different game states.

**Common patterns:**

- **Scene graph** -- A hierarchical tree of nodes where child transforms are relative to parent transforms. Moving a parent moves all children.
- **Scene stack** -- Scenes can be pushed and popped. A pause menu pushes on top of gameplay; dismissing it pops back to gameplay.
- **Scene loading** -- Scenes define which assets and entities to load. The scene manager coordinates loading, initialization, and cleanup.

```javascript
class SceneManager {
  constructor() {
    this.scenes = new Map();
    this.activeScene = null;
  }

  register(name, scene) {
    this.scenes.set(name, scene);
  }

  async switchTo(name) {
    if (this.activeScene) {
      this.activeScene.onExit();
      this.activeScene.unloadResources();
    }

    this.activeScene = this.scenes.get(name);
    await this.activeScene.loadResources();
    this.activeScene.onEnter();
  }

  update(deltaTime) {
    if (this.activeScene) {
      this.activeScene.update(deltaTime);
    }
  }

  render(context) {
    if (this.activeScene) {
      this.activeScene.render(context);
    }
  }
}
```

---

## Platform Abstraction

A well-designed engine abstracts platform-specific code behind a uniform interface. This enables the engine to run on multiple operating systems, graphics APIs, and hardware configurations.

**Areas requiring abstraction:**

| Concern | Examples |
|---|---|
| Windowing | Win32, X11, Cocoa, SDL, GLFW |
| Graphics API | OpenGL, Vulkan, DirectX, Metal, WebGL |
| File I/O | POSIX, Win32, virtual file systems |
| Threading | pthreads, Win32 threads, Web Workers |
| Audio output | WASAPI, CoreAudio, ALSA, Web Audio |
| Input devices | DirectInput, XInput, evdev, Gamepad API |

```javascript
// Abstract file system interface
class FileSystem {
  async readFile(path) { throw new Error("Not implemented"); }
  async writeFile(path, data) { throw new Error("Not implemented"); }
  async exists(path) { throw new Error("Not implemented"); }
}

// Web implementation
class WebFileSystem extends FileSystem {
  async readFile(path) {
    const response = await fetch(path);
    return response.arrayBuffer();
  }
}

// Node.js implementation
class NodeFileSystem extends FileSystem {
  async readFile(path) {
    const fs = require("fs").promises;
    return fs.readFile(path);
  }
}
```

---

## Initialization and Shutdown Order

Engine subsystems must be initialized in dependency order and shut down in reverse order.

**Typical initialization sequence:**

1. Core systems (logging, memory, configuration)
2. Platform layer (window creation, input devices)
3. Rendering system (graphics context, default resources)
4. Audio system
5. Physics system
6. Resource manager (load default/shared assets)
7. Scene manager
8. Scripting system
9. Game-specific initialization

**Shutdown reverses this order** to ensure systems are cleaned up before the systems they depend on.

```javascript
class Engine {
  async initialize() {
    this.logger = new Logger();
    this.config = new Config("engine.json");
    this.platform = new Platform();
    await this.platform.createWindow(this.config.window);

    this.renderer = new Renderer(this.platform.canvas);
    this.audio = new AudioSystem();
    this.physics = new PhysicsWorld();
    this.resources = new ResourceManager();
    this.input = new InputManager(this.platform.window);
    this.events = new EventBus();
    this.scenes = new SceneManager();

    this.logger.info("Engine initialized");
  }

  shutdown() {
    this.scenes.cleanup();
    this.resources.unloadAll();
    this.input.cleanup();
    this.physics.cleanup();
    this.audio.cleanup();
    this.renderer.cleanup();
    this.platform.cleanup();
    this.logger.info("Engine shutdown complete");
  }

  run() {
    let lastTime = performance.now();

    const loop = (currentTime) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      this.input.poll();
      this.physics.update(deltaTime);
      this.scenes.update(deltaTime);
      this.events.dispatchQueued();
      this.scenes.render(this.renderer);
      this.renderer.present();

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}
```

---

## Performance Principles

### Avoid Premature Abstraction

While modularity is important, over-engineering interfaces before understanding real requirements leads to unnecessary complexity. Start with simple, concrete implementations and refactor toward abstraction when actual use cases demand it.

### Profile Before Optimizing

Measure actual performance bottlenecks using profiling tools before spending time on optimization. Intuition about where time is spent is frequently wrong.

### Data-Oriented Design

Organize data by how it is accessed rather than by object-oriented abstractions. Storing components of the same type contiguously in memory (Structure of Arrays rather than Array of Structures) dramatically improves CPU cache hit rates.

```javascript
// Array of Structures (cache-unfriendly for position-only iteration)
const entities = [
  { position: {x: 0, y: 0}, sprite: "hero.png", health: 100 },
  { position: {x: 5, y: 3}, sprite: "bat.png", health: 30 },
];

// Structure of Arrays (cache-friendly for position-only iteration)
const positions = { x: [0, 5], y: [0, 3] };
const sprites = ["hero.png", "bat.png"];
const healths = [100, 30];
```

### Minimize Allocations in Hot Paths

Avoid creating new objects or allocating memory during per-frame updates. Pre-allocate buffers, use object pools, and reuse temporary objects.

### Batch Operations

Group similar operations together to reduce overhead from context switching, draw call setup, and cache misses. Process all entities of a given type before moving to the next type.

---

## Summary of Key Principles

| Principle | Description |
|---|---|
| Modularity | Independent subsystems with clean interfaces |
| Separation of concerns | Each system has a single responsibility |
| Data-driven design | Behavior controlled by data, not hard-coded logic |
| Composition over inheritance | ECS pattern for flexible entity construction |
| Minimal dependencies | Clean, hierarchical dependency graph |
| Platform abstraction | Uniform interfaces over platform-specific code |
| Fixed timestep physics | Deterministic simulation independent of frame rate |
| Event-driven communication | Decoupled interaction through publish-subscribe |
| Data-oriented performance | Optimize memory layout for access patterns |
| Measure before optimizing | Profile to identify actual bottlenecks |
