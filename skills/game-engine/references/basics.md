# Game Development Basics

A comprehensive reference covering web game development technologies, game architecture, and the anatomy of a game loop.

Sources:
- https://developer.mozilla.org/en-US/docs/Games/Introduction
- https://developer.mozilla.org/en-US/docs/Games/Anatomy

---

## Web Technologies for Game Development

### Graphics and Rendering

- **WebGL** -- Hardware-accelerated 2D and 3D graphics based on OpenGL ES 2.0. Provides direct GPU access for high-performance rendering.
- **Canvas API** -- 2D drawing surface via the `<canvas>` element. Suitable for 2D games, sprite rendering, and pixel manipulation.
- **SVG** -- Scalable Vector Graphics for resolution-independent visuals. Useful for UI elements and simple vector-based games.
- **HTML/CSS** -- Standard web technologies for building game UI, menus, HUDs, and overlays.

### Audio

- **Web Audio API** -- Advanced audio engine supporting real-time playback, synthesis, spatial audio, effects processing, and dynamic mixing.
- **HTML Audio Element** -- Simple sound playback for background music and basic sound effects.

### Input and Controls

- **Gamepad API** -- Support for game controllers and gamepads, including button mapping and analog stick input.
- **Touch Events API** -- Multi-touch input handling for mobile devices.
- **Pointer Lock API** -- Locks the mouse cursor within the game area and provides raw coordinate deltas for precise camera/aiming control.
- **Device Sensors** -- Accelerometer and gyroscope access for motion-based input.
- **Full Screen API** -- Enables immersive full-screen game experiences.

### Networking and Multiplayer

- **WebSockets API** -- Persistent, bidirectional communication channel for real-time multiplayer, chat, and live updates.
- **WebRTC API** -- Peer-to-peer connections for low-latency multiplayer, voice chat, and data channels.
- **Fetch API** -- HTTP requests for downloading game assets, loading level data, and transmitting non-real-time game state.

### Data Storage and Performance

- **IndexedDB API** -- Client-side structured storage for save games, cached assets, and offline play support.
- **Typed Arrays** -- Direct access to raw binary data buffers for GL textures, audio samples, and compact game data.
- **Web Workers API** -- Background thread execution for offloading heavy computations (physics, pathfinding, AI) without blocking the main thread.

### Languages and Compilation

- **JavaScript** -- The primary language for web game development.
- **C/C++ via Emscripten** -- Compile existing native game code to JavaScript or WebAssembly for web deployment.
- **WebAssembly (Wasm)** -- Near-native execution speed for performance-critical game code.

---

## Types of Games You Can Build

The modern web platform supports a full range of game types:

- 3D action games and shooters
- Role-playing games (RPGs)
- 2D platformers and side-scrollers
- Puzzle and strategy games
- Card and board games
- Casual and mobile-friendly games
- Multiplayer experiences with real-time networking

---

## Advantages of Web-Based Game Development

1. **Universal reach** -- Games run on smartphones, tablets, PCs, and Smart TVs through the browser.
2. **No app store dependency** -- Deploy directly on the web without store approval processes.
3. **Full revenue control** -- No mandatory revenue share; use any payment processing system.
4. **Instant updates** -- Push updates immediately without waiting for store review.
5. **Own your analytics** -- Collect your own data or choose any analytics provider.
6. **Direct player relationships** -- Engage players without intermediaries.
7. **Inherent shareability** -- Games are linkable and discoverable via standard web mechanisms.

---

## Anatomy of a Game Loop

Every game operates through a continuous cycle of steps:

1. **Present** -- Display the current game state to the player.
2. **Accept** -- Receive user input (keyboard, mouse, gamepad, touch).
3. **Interpret** -- Process raw input into meaningful game actions.
4. **Calculate** -- Update the game state based on actions, physics, AI, and time.
5. **Repeat** -- Loop back to present the updated state.

Games may be **event-driven** (turn-based, waiting for player action) or **per-frame** (continuously updating via a main loop).

---

## Building a Game Loop with requestAnimationFrame

### Basic Main Loop

```javascript
window.main = () => {
  window.requestAnimationFrame(main);

  // Your game logic here: update state, render frame
};

main(); // Start the cycle
```

Key points:
- `requestAnimationFrame()` synchronizes callbacks to the browser's repaint schedule (typically 60 Hz).
- Schedule the next frame **before** performing loop work to maximize available computation time.

### Self-Contained Main Loop (IIFE)

```javascript
;(() => {
  function main() {
    window.requestAnimationFrame(main);

    // Game logic here
  }

  main();
})();
```

### Stoppable Main Loop

```javascript
;(() => {
  function main() {
    MyGame.stopMain = window.requestAnimationFrame(main);

    // Game logic here
  }

  main();
})();

// To stop the loop:
window.cancelAnimationFrame(MyGame.stopMain);
```

---

## Timing and Frame Rate

### DOMHighResTimeStamp

`requestAnimationFrame` passes a `DOMHighResTimeStamp` to your callback, providing timing precision to 1/1000th of a millisecond.

```javascript
;(() => {
  function main(tFrame) {
    MyGame.stopMain = window.requestAnimationFrame(main);

    // tFrame is a high-resolution timestamp in milliseconds
    // Use it for delta-time calculations
  }

  main();
})();
```

### Frame Time Budget

At 60 Hz, each frame has approximately **16.67ms** of available processing time. The browser's frame cycle is:

1. Start new frame (previous frame displayed to screen)
2. Execute `requestAnimationFrame` callbacks
3. Perform garbage collection and per-frame browser tasks
4. Sleep until VSync, then repeat

---

## Simple Update and Render Pattern

The simplest approach when your game can sustain the target frame rate:

```javascript
;(() => {
  function main(tFrame) {
    MyGame.stopMain = window.requestAnimationFrame(main);

    update(tFrame); // Process game logic
    render();       // Draw the frame
  }

  main();
})();
```

Assumptions:
- Each frame can process input and update state within the time budget.
- The simulation runs at the same rate as the display refresh (typically ~60 FPS).
- No frame interpolation is needed.

---

## Decoupled Update and Render with Fixed Timestep

For robust handling of variable refresh rates and consistent simulation behavior:

```javascript
;(() => {
  function main(tFrame) {
    MyGame.stopMain = window.requestAnimationFrame(main);
    const nextTick = MyGame.lastTick + MyGame.tickLength;
    let numTicks = 0;

    // Calculate how many simulation updates are needed
    if (tFrame > nextTick) {
      const timeSinceTick = tFrame - MyGame.lastTick;
      numTicks = Math.floor(timeSinceTick / MyGame.tickLength);
    }

    queueUpdates(numTicks);
    render(tFrame);
    MyGame.lastRender = tFrame;
  }

  function queueUpdates(numTicks) {
    for (let i = 0; i < numTicks; i++) {
      MyGame.lastTick += MyGame.tickLength;
      update(MyGame.lastTick);
    }
  }

  MyGame.lastTick = performance.now();
  MyGame.lastRender = MyGame.lastTick;
  MyGame.tickLength = 50; // 20 Hz simulation rate (50ms per tick)

  setInitialState();
  main(performance.now());
})();
```

Benefits:
- **Deterministic simulation** -- Game logic runs at a fixed frequency regardless of display refresh rate.
- **Smooth rendering** -- Rendering can interpolate between simulation states for visual smoothness.
- **Portable behavior** -- Game behaves the same on 60 Hz, 120 Hz, and 144 Hz displays.

---

## Alternative Architecture Patterns

### Separate setInterval for Updates

```javascript
// Game logic updates at a fixed rate
setInterval(() => {
  update();
}, 50); // 20 Hz

// Rendering synchronized to display
requestAnimationFrame(function render(tFrame) {
  requestAnimationFrame(render);
  draw();
});
```

Drawback: `setInterval` continues running even when the tab is not visible, wasting resources.

### Web Worker for Updates

```javascript
// Heavy game logic runs in a background thread
const updateWorker = new Worker('game-update-worker.js');

requestAnimationFrame(function render(tFrame) {
  requestAnimationFrame(render);
  updateWorker.postMessage({ ticks: numTicksNeeded });
  draw();
});
```

Benefits: Does not block the main thread. Ideal for physics-heavy or AI-intensive games.
Drawback: Communication overhead between worker and main thread.

### requestAnimationFrame Driving a Web Worker

```javascript
;(() => {
  function main(tFrame) {
    MyGame.stopMain = window.requestAnimationFrame(main);

    // Signal worker to compute updates
    updateWorker.postMessage({
      lastTick: MyGame.lastTick,
      numTicks: calculatedNumTicks
    });

    render(tFrame);
  }

  main();
})();
```

Benefits: No reliance on legacy timers. Worker performs computation in parallel.

---

## Handling Tab Focus Loss

When a browser tab loses focus, `requestAnimationFrame` slows down or stops entirely. Strategies:

| Strategy | Description | Best For |
|---|---|---|
| Treat gap as pause | Skip elapsed time; do not update | Single-player games |
| Simulate the gap | Run all missed updates on regain | Simple simulations |
| Sync from server/peer | Fetch authoritative state | Multiplayer games |

Monitor the `numTicks` value after a focus-regain event. A very large value indicates the game was suspended and may need special handling rather than trying to simulate all missed frames.

---

## Comparison of Timing Approaches

| Approach | Pros | Cons |
|---|---|---|
| Simple update/render per frame | Easy to implement, responsive | Breaks on slow/fast hardware |
| Fixed timestep + interpolation | Consistent simulation, smooth visuals | More complex to implement |
| Quality scaling | Maintains frame rate dynamically | Requires adaptive quality systems |

---

## Performance Best Practices

- **Detach non-frame-critical code** from the main loop. Use events and callbacks for UI, network responses, and other asynchronous operations.
- **Use Web Workers** for computationally expensive tasks like physics, pathfinding, and AI.
- **Leverage GPU acceleration** through WebGL for rendering.
- **Stay within the frame budget** -- monitor your update + render time to keep it under 16.67ms for 60 FPS.
- **Throttle garbage collection pressure** by reusing objects and avoiding per-frame allocations.
- **Plan your timing strategy early** -- changing the game loop architecture mid-development is difficult and error-prone.

---

## Popular 3D Frameworks and Libraries

- **Three.js** -- General-purpose 3D library with a large ecosystem.
- **Babylon.js** -- Full-featured 3D game engine with physics, audio, and scene management.
- **A-Frame** -- Declarative 3D/VR framework built on Three.js.
- **PlayCanvas** -- Cloud-hosted 3D game engine with a visual editor.
- **Phaser** -- Popular 2D game framework with physics and input handling.
