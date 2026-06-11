# Web APIs for Game Development

A comprehensive reference covering the web platform APIs most relevant to building browser-based games. Each section describes what the API is, why it matters for games, its key interfaces and methods, and provides brief code examples where applicable.

---

## asm.js

### What It Is

asm.js is a strict, highly optimizable subset of JavaScript designed for near-native performance. It restricts JavaScript to a narrow set of constructs -- integers, floats, arithmetic, simple functions, and heap accesses -- and disallows objects, strings, closures, and anything requiring heap allocation. The result is completely valid JavaScript that any engine can run, but that supporting engines can compile aggressively ahead of time.

### Why It Matters for Games

- **Near-native speed**: Emscripten-compiled C/C++ game engines run with near-native performance across browsers.
- **Predictable performance**: The restricted feature set yields highly consistent frame rates.
- **C/C++ portability**: Existing native game engines can be compiled to asm.js with Emscripten and deployed on the web.
- **No plugins required**: Runs as standard JavaScript in every modern browser.

### Key Concepts

| Concept | Description |
|---------|-------------|
| Allowed constructs | `while`, `if`, numbers (strict int/float), top-level named functions, arithmetic, function calls, heap accesses |
| Disallowed constructs | Objects, strings, closures, dynamic type coercion, heap-allocating constructs |
| Compiler toolchain | Emscripten compiles C/C++ to asm.js |
| Engine recognition | Browsers detect the `"use asm"` directive and apply ahead-of-time compilation |

### Deprecation Notice

asm.js is deprecated. **WebAssembly (Wasm)** is the modern successor and offers better performance, broader tooling, and wider industry support. New projects should target WebAssembly instead.

### Code Example

```javascript
// asm.js module pattern (simplified)
function MyModule(stdlib, foreign, heap) {
  "use asm";

  var sqrt = stdlib.Math.sqrt;
  var HEAP32 = new stdlib.Int32Array(heap);

  function distance(x1, y1, x2, y2) {
    x1 = +x1; y1 = +y1; x2 = +x2; y2 = +y2;
    var dx = 0.0, dy = 0.0;
    dx = +(x2 - x1);
    dy = +(y2 - y1);
    return +sqrt(dx * dx + dy * dy);
  }

  return { distance: distance };
}
```

---

## Canvas API

### What It Is

The Canvas API provides a means for drawing 2D graphics via JavaScript and the HTML `<canvas>` element. It is one of the primary rendering surfaces for browser-based games, supporting game graphics, animation, image manipulation, and real-time video processing.

### Why It Matters for Games

- **2D rendering surface**: The standard way to draw sprites, tilemaps, particles, and HUD elements in browser games.
- **Pixel-level control**: Direct access to pixel data via `ImageData` for custom effects, collision maps, and procedural generation.
- **High performance**: Hardware-accelerated in modern browsers, suitable for 60 fps game loops.
- **Broad ecosystem**: Libraries like Phaser, Konva.js, EaselJS, and p5.js build on Canvas for game development.

### Key Interfaces

| Interface | Purpose |
|-----------|---------|
| `HTMLCanvasElement` | The `<canvas>` HTML element |
| `CanvasRenderingContext2D` | The main 2D drawing interface |
| `ImageData` | Raw pixel data for direct manipulation |
| `ImageBitmap` | Bitmap image data for efficient drawing |
| `Path2D` | Reusable path objects |
| `OffscreenCanvas` | Offscreen rendering, usable in Web Workers |
| `CanvasPattern` | Repeating image patterns |
| `CanvasGradient` | Color gradients |
| `TextMetrics` | Text measurement data |

### Key Methods (CanvasRenderingContext2D)

- `fillRect()`, `strokeRect()`, `clearRect()` -- rectangle operations
- `drawImage()` -- draw images, sprites, or other canvases
- `beginPath()`, `arc()`, `lineTo()`, `fill()`, `stroke()` -- path drawing
- `getImageData()`, `putImageData()` -- pixel manipulation
- `save()`, `restore()` -- state management
- `translate()`, `rotate()`, `scale()`, `transform()` -- transformations

### Code Example

```html
<canvas id="game" width="800" height="600"></canvas>
```

```javascript
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Clear the frame
ctx.clearRect(0, 0, canvas.width, canvas.height);

// Draw a filled rectangle (e.g., a platform)
ctx.fillStyle = "green";
ctx.fillRect(100, 400, 200, 20);

// Draw a sprite
const sprite = new Image();
sprite.src = "player.png";
sprite.onload = () => {
  ctx.drawImage(sprite, playerX, playerY, 32, 32);
};

// Game loop
function gameLoop(timestamp) {
  update(timestamp);
  render(ctx);
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
```

---

## CSS (Cascading Style Sheets)

### What It Is

CSS is the language used to describe the presentation of web documents. In the context of game development, CSS handles styling of UI overlays, HUD elements, menus, transitions, animations, and visual effects that sit on top of or alongside the game canvas.

### Why It Matters for Games

- **UI and HUD styling**: Style health bars, score displays, inventory panels, dialog boxes, and menus without touching the game canvas.
- **CSS Animations and Transitions**: Hardware-accelerated animations for UI elements (fade-ins, slide-outs, pulsing effects) with minimal JavaScript.
- **CSS Transforms**: Translate, rotate, scale, and skew DOM elements for visual effects and UI positioning.
- **Flexbox and Grid**: Lay out complex game UIs (settings panels, leaderboards, lobby screens) responsively.
- **Custom Properties (CSS Variables)**: Theme game UIs dynamically by changing variable values at runtime.
- **Pointer and cursor control**: Customize or hide cursors, control pointer events on overlay elements.
- **Media queries**: Adapt game UI across screen sizes and device types.

### Key Properties for Games

| Property / Feature | Use Case |
|--------------------|----------|
| `transform` | Rotate, scale, translate UI elements |
| `transition` | Smooth property changes (e.g., health bar width) |
| `animation` / `@keyframes` | Looping or triggered UI animations |
| `opacity` | Fade effects for overlays and modals |
| `pointer-events` | Let clicks pass through overlay layers to the canvas |
| `cursor` | Set custom cursors or hide the cursor (`cursor: none`) |
| `z-index` | Layer UI above the game canvas |
| `position: fixed / absolute` | Anchor HUD elements to viewport |
| `display: flex / grid` | Responsive layout for menus and panels |
| `filter` | Blur, brightness, contrast effects on DOM elements |
| `mix-blend-mode` | Blend overlay effects with the canvas |
| `will-change` | Hint the browser to optimize animated properties |

### Code Example

```css
/* Game HUD overlay */
.hud {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  padding: 10px;
  pointer-events: none;       /* clicks pass through to canvas */
  z-index: 10;
  font-family: "Press Start 2P", monospace;
  color: white;
  text-shadow: 2px 2px 0 black;
}

/* Health bar with smooth transitions */
.health-bar {
  width: 200px;
  height: 20px;
  background: #333;
  border: 2px solid white;
}
.health-bar-fill {
  height: 100%;
  background: limegreen;
  transition: width 0.3s ease;
  will-change: width;
}

/* Pulsing damage indicator */
@keyframes damage-flash {
  0%, 100% { opacity: 0; }
  50% { opacity: 0.4; }
}
.damage-overlay {
  position: fixed;
  inset: 0;
  background: red;
  animation: damage-flash 0.3s ease;
  pointer-events: none;
}
```

---

## Fullscreen API

### What It Is

The Fullscreen API provides methods to present a specific element (and its descendants) in fullscreen mode, removing all browser chrome and UI elements. It allows entering and exiting fullscreen programmatically and reports the current fullscreen state.

### Why It Matters for Games

- **Immersive experience**: Fullscreen removes all browser distractions, providing a console-like gaming experience.
- **Maximum screen real estate**: The entire display is available for the game viewport.
- **Games are a primary use case**: The MDN documentation explicitly lists online games as a target application.

### Key Interfaces and Methods

| API | Description |
|-----|-------------|
| `Element.requestFullscreen()` | Enters fullscreen mode. Returns a `Promise`. |
| `Document.exitFullscreen()` | Exits fullscreen mode. Returns a `Promise`. |
| `Document.fullscreenElement` | The element currently in fullscreen, or `null`. |
| `Document.fullscreenEnabled` | Boolean indicating whether fullscreen is available. |
| `fullscreenchange` event | Fired when fullscreen state changes. |
| `fullscreenerror` event | Fired if entering/exiting fullscreen fails. |

### Code Example

```javascript
const gameContainer = document.getElementById("game-container");

// Enter fullscreen on button click
document.getElementById("fullscreenBtn").addEventListener("click", () => {
  if (document.fullscreenEnabled) {
    gameContainer.requestFullscreen().catch(err => {
      console.error("Fullscreen request failed:", err);
    });
  }
});

// Toggle fullscreen with a key press
document.addEventListener("keydown", (e) => {
  if (e.key === "F11") {
    e.preventDefault();
    if (!document.fullscreenElement) {
      gameContainer.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }
});

// Respond to fullscreen changes (resize canvas, adjust UI)
document.addEventListener("fullscreenchange", () => {
  if (document.fullscreenElement) {
    resizeCanvasToFullscreen();
  } else {
    resizeCanvasToWindowed();
  }
});
```

### Notes

- Fullscreen can only be requested in response to a user gesture (click, key press).
- Users can always exit via the Escape key or F11.
- For embedded games in iframes, the `allowfullscreen` attribute is required.
- Check `Document.fullscreenEnabled` before offering the feature in your UI.

---

## Gamepad API

### What It Is

The Gamepad API provides a standardized interface for detecting and reading input from gamepads and game controllers. It exposes button presses, analog stick positions, and controller connection events, enabling console-style controls in browser games.

### Why It Matters for Games

- **Console-quality input**: Support Xbox, PlayStation, and generic controllers in browser games.
- **Multiple controllers**: Detect and handle several gamepads simultaneously for local multiplayer.
- **Analog input**: Read analog stick axes and pressure-sensitive triggers for nuanced control.
- **Haptic feedback**: Experimental support for vibration via `GamepadHapticActuator`.

### Key Interfaces

| Interface | Description |
|-----------|-------------|
| `Gamepad` | Represents a connected controller with buttons, axes, and metadata |
| `GamepadButton` | Represents a single button -- `pressed` (boolean) and `value` (pressure 0..1) |
| `GamepadEvent` | Event object for `gamepadconnected` and `gamepaddisconnected` events |
| `GamepadHapticActuator` | Hardware interface for haptic feedback (experimental) |

### Key Methods and Events

| API | Description |
|-----|-------------|
| `navigator.getGamepads()` | Returns an array of `Gamepad` objects for all connected controllers |
| `gamepadconnected` event | Fired on `window` when a controller is connected |
| `gamepaddisconnected` event | Fired on `window` when a controller is disconnected |

### Code Example

```javascript
// Detect controller connections
window.addEventListener("gamepadconnected", (e) => {
  console.log(`Gamepad connected: ${e.gamepad.id}`);
});

window.addEventListener("gamepaddisconnected", (e) => {
  console.log(`Gamepad disconnected: ${e.gamepad.id}`);
});

// Poll gamepad state each frame
function pollGamepads() {
  const gamepads = navigator.getGamepads();
  for (const gp of gamepads) {
    if (!gp) continue;

    // Read analog sticks (axes)
    const leftStickX = gp.axes[0]; // -1 (left) to 1 (right)
    const leftStickY = gp.axes[1]; // -1 (up) to 1 (down)

    // Read buttons
    if (gp.buttons[0].pressed) {
      // A button / Cross -- jump
      player.jump();
    }
    if (gp.buttons[7].value > 0.1) {
      // Right trigger -- accelerate (analog pressure)
      player.accelerate(gp.buttons[7].value);
    }
  }
  requestAnimationFrame(pollGamepads);
}
requestAnimationFrame(pollGamepads);
```

---

## IndexedDB API

### What It Is

IndexedDB is a low-level, asynchronous, transactional, client-side database built into the browser. It stores significant amounts of structured data (including files and blobs) using key-indexed object stores, and supports indexes for high-performance queries.

### Why It Matters for Games

- **Save game state**: Persist player progress, inventory, character stats, and level completion across sessions.
- **Cache assets locally**: Store textures, audio files, level data, and other assets to reduce network requests and enable offline play.
- **Large storage capacity**: Handles far more data than `localStorage` (which caps at ~5 MB).
- **Non-blocking**: Asynchronous operations keep the game loop running smoothly during save/load operations.
- **Transactional**: Atomic read/write operations prevent data corruption during saves.

### Key Interfaces

| Interface | Purpose | Game Use Case |
|-----------|---------|---------------|
| `indexedDB.open()` | Open or create a database | Initialize the game database on startup |
| `IDBDatabase` | Database connection | Manage the connection lifetime |
| `IDBTransaction` | Scope and access control for reads/writes | Atomic save-game operations |
| `IDBObjectStore` | Primary data container | Store player profiles, level data, settings |
| `IDBIndex` | Secondary lookup keys | Query items by type, rarity, or other properties |
| `IDBCursor` | Iterate over records | Batch operations on game data |
| `IDBKeyRange` | Define key ranges for queries | Fetch scores within a range, recent save slots |
| `IDBRequest` | Async operation handle | Manage callbacks for all database operations |

### Code Example

```javascript
// Open (or create) the game database
const request = indexedDB.open("MyGameDB", 1);

request.onupgradeneeded = (event) => {
  const db = event.target.result;
  // Create an object store for save data
  const saveStore = db.createObjectStore("saves", { keyPath: "slotId" });
  saveStore.createIndex("timestamp", "timestamp");
};

request.onsuccess = (event) => {
  const db = event.target.result;

  // Save game state
  function saveGame(slot, gameState) {
    const tx = db.transaction("saves", "readwrite");
    const store = tx.objectStore("saves");
    store.put({
      slotId: slot,
      timestamp: Date.now(),
      playerHealth: gameState.health,
      playerPosition: gameState.position,
      inventory: gameState.inventory,
    });
  }

  // Load game state
  function loadGame(slot) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction("saves", "readonly");
      const store = tx.objectStore("saves");
      const req = store.get(slot);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
};
```

---

## JavaScript

### What It Is

JavaScript is a lightweight, dynamically typed, prototype-based programming language with first-class functions. It is the scripting language of the web and the foundational language for all browser-based game logic, supporting imperative, functional, and object-oriented paradigms.

### Why It Matters for Games

- **Runtime environment**: JavaScript is the language in which browser game logic executes.
- **Event-driven architecture**: Native event handling supports input, timers, and async resource loading.
- **First-class functions**: Callbacks and closures enable patterns like game loops, event handlers, behavior trees, and state machines.
- **Dynamic objects**: Runtime object creation and modification supports entity-component systems and data-driven designs.
- **Modern class syntax**: ES6+ classes provide clean inheritance hierarchies for game entities.
- **Async/await**: Clean asynchronous control flow for asset loading, server communication, and scene transitions.
- **Garbage collection**: Automatic memory management (though awareness of GC pauses is important for smooth frame rates).

### Key Language Features for Games

| Feature | Game Application |
|---------|------------------|
| Classes and inheritance | Entity hierarchies (GameObject, Player, Enemy) |
| Closures | Encapsulated state in callbacks and event handlers |
| `requestAnimationFrame` | The core game loop driver |
| Promises / async-await | Asset loading, server calls, scene transitions |
| Destructuring and spread | Clean configuration and state passing |
| `Map` and `Set` | Entity lookup tables, unique ID tracking, collision sets |
| Template literals | Debug output, dynamic text rendering |
| Modules (import/export) | Organize game code into systems and components |

### Code Example

```javascript
// ES6+ game entity pattern
class GameObject {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.active = true;
  }
  update(dt) { /* override in subclasses */ }
  render(ctx) { /* override in subclasses */ }
}

class Player extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.health = 100;
    this.speed = 200;
  }
  update(dt) {
    if (input.left) this.x -= this.speed * dt;
    if (input.right) this.x += this.speed * dt;
  }
  render(ctx) {
    ctx.fillStyle = "blue";
    ctx.fillRect(this.x, this.y, 32, 32);
  }
}

// Game loop using requestAnimationFrame
let lastTime = 0;
function gameLoop(timestamp) {
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  for (const entity of entities) {
    entity.update(dt);
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const entity of entities) {
    entity.render(ctx);
  }
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
```

---

## Pointer Lock API

### What It Is

The Pointer Lock API (formerly Mouse Lock API) provides access to raw mouse movement deltas rather than absolute cursor positions. It locks mouse events to a single element, removes cursor movement boundaries, and hides the cursor -- essential for first-person camera controls and similar mechanics.

### Why It Matters for Games

- **First-person camera control**: Move the camera by physically moving the mouse with no screen-edge limits.
- **No cursor distraction**: The cursor is hidden, creating immersion.
- **Persistent lock**: Once engaged, movement data flows continuously regardless of mouse button state.
- **Raw input option**: The `unadjustedMovement` flag disables OS-level mouse acceleration for consistent aim in competitive games.
- **Frees mouse buttons**: With movement handled by deltas alone, clicks can be mapped to game actions (shoot, interact).

### Key Interfaces and Methods

| API | Description |
|-----|-------------|
| `element.requestPointerLock(options?)` | Locks the pointer to the element. Returns a `Promise`. |
| `document.exitPointerLock()` | Releases the pointer lock. |
| `document.pointerLockElement` | The element currently holding the lock, or `null`. |
| `MouseEvent.movementX` | Horizontal delta since the last `mousemove` event. |
| `MouseEvent.movementY` | Vertical delta since the last `mousemove` event. |
| `pointerlockchange` event | Fired when lock state changes. |
| `pointerlockerror` event | Fired if locking or unlocking fails. |

### Code Example

```javascript
const canvas = document.getElementById("game");

// Request pointer lock on click (user gesture required)
canvas.addEventListener("click", async () => {
  if (!document.pointerLockElement) {
    await canvas.requestPointerLock({
      unadjustedMovement: true, // raw input, no OS acceleration
    });
  }
});

// Respond to lock state changes
document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement === canvas) {
    document.addEventListener("mousemove", handleMouseMove);
  } else {
    document.removeEventListener("mousemove", handleMouseMove);
  }
});

// Use movement deltas for camera rotation
const sensitivity = 0.002;
function handleMouseMove(e) {
  camera.yaw   += e.movementX * sensitivity;
  camera.pitch  += e.movementY * sensitivity;
  camera.pitch   = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.pitch));
}
```

### Notes

- Pointer lock can only be requested in response to a user gesture (click, key press).
- Users can exit at any time with the Escape key.
- Sandboxed iframes need the `allow-pointer-lock` attribute.

---

## SVG (Scalable Vector Graphics)

### What It Is

SVG is an XML-based markup language for describing two-dimensional vector graphics. Unlike raster formats (PNG, JPEG), SVG images scale to any resolution without quality loss. SVG integrates with CSS, the DOM, and JavaScript, making elements scriptable and interactive.

### Why It Matters for Games

- **Resolution independence**: A single SVG asset looks crisp on any screen size or pixel density -- ideal for responsive game UIs.
- **Lightweight**: Text-based and compressible, reducing download sizes for UI art and icons.
- **Scriptable via the DOM**: SVG elements can be created, modified, and animated with JavaScript in real time.
- **CSS styling**: SVG shapes accept CSS rules for fill, stroke, opacity, transforms, filters, and animations.
- **Built-in animation**: SMIL animation elements (`<animate>`, `<animateTransform>`, `<animateMotion>`) for declarative motion.
- **Filters and effects**: Gaussian blur, drop shadows, color matrices, and blend modes through SVG filter primitives.

### Key Elements

| Element | Game Use Case |
|---------|---------------|
| `<rect>` | Health bars, UI panels, platforms |
| `<circle>`, `<ellipse>` | Targets, particles, indicators |
| `<path>` | Complex vector art, custom shapes |
| `<polygon>`, `<polyline>` | Grid overlays, wireframe elements |
| `<g>` | Group elements for collective transforms |
| `<defs>`, `<use>`, `<symbol>` | Reusable sprite definitions |
| `<text>`, `<tspan>` | Score displays, labels, dialog |
| `<filter>` | Blur, shadow, and color effects |
| `<clipPath>`, `<mask>` | Viewport clipping, reveal effects |
| `<linearGradient>`, `<radialGradient>` | Shading and depth effects |
| `<animate>`, `<animateTransform>` | Declarative UI animations |

### Code Example

```html
<!-- A simple SVG health bar -->
<svg width="220" height="30" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="healthGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="limegreen" />
      <stop offset="100%" stop-color="green" />
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect x="1" y="1" width="218" height="28" rx="5" fill="#333" stroke="#fff" stroke-width="1" />
  <!-- Health fill (width controlled via JS) -->
  <rect id="health-fill" x="3" y="3" width="160" height="24" rx="4" fill="url(#healthGrad)">
    <animate attributeName="width" from="214" to="60" dur="3s" fill="freeze" />
  </rect>
</svg>
```

```javascript
// Update health bar programmatically
function setHealth(percent) {
  const maxWidth = 214;
  document.getElementById("health-fill")
    .setAttribute("width", maxWidth * (percent / 100));
}
```

---

## Typed Arrays

### What They Are

Typed Arrays are array-like views over raw binary data buffers (`ArrayBuffer`). Unlike regular JavaScript arrays, each typed array has a fixed element type and size, providing predictable memory layout and efficient data access. There is no single `TypedArray` constructor; instead, specific constructors like `Float32Array`, `Uint8Array`, and `Uint16Array` are used.

### Why They Matter for Games

- **WebGL vertex and index buffers**: WebGL methods accept typed arrays directly for positions, normals, texture coordinates, colors, and indices.
- **Web Audio buffers**: Audio sample data is stored and manipulated as `Float32Array`.
- **Binary asset loading**: Parse binary file formats (models, textures, level data) directly.
- **Memory-efficient**: Fixed-size elements with no boxing overhead.
- **WebAssembly interop**: Share memory between JavaScript and Wasm modules via `SharedArrayBuffer` and typed array views.
- **Network serialization**: Efficiently pack game state for multiplayer transmission.

### Key Types

| Type | Bytes | Range | Game Use Case |
|------|-------|-------|---------------|
| `Float32Array` | 4 | ~3.4e38 | Vertex positions, normals, UVs, physics values |
| `Float64Array` | 8 | ~1.8e308 | High-precision calculations, simulation |
| `Uint8Array` | 1 | 0 -- 255 | Texture/pixel data, color channels |
| `Uint8ClampedArray` | 1 | 0 -- 255 (clamped) | `ImageData` pixel manipulation |
| `Uint16Array` | 2 | 0 -- 65535 | Index buffers (small meshes) |
| `Uint32Array` | 4 | 0 -- ~4.3 billion | Index buffers (large meshes), IDs |
| `Int16Array` | 2 | -32768 -- 32767 | Audio samples, quantized normals |
| `Int32Array` | 4 | ~-2.1 billion -- ~2.1 billion | Integer game data |

### Key Properties and Methods

```javascript
const verts = new Float32Array([0, 0, 0,  1, 0, 0,  0, 1, 0]);

verts.buffer;             // The underlying ArrayBuffer
verts.byteLength;         // Total size in bytes
verts.byteOffset;         // Byte offset into the buffer
verts.length;             // Number of elements
verts.BYTES_PER_ELEMENT;  // 4 for Float32Array

// Write data
verts.set([1, 2, 3], 0);            // Copy values at offset
verts.copyWithin(6, 0, 3);          // Duplicate first vertex to third slot

// Read sub-views (no copy)
const firstTriangle = verts.subarray(0, 9);

// Functional methods
const scaled = verts.map(v => v * 2);
const max = verts.reduce((a, v) => Math.max(a, v), -Infinity);
```

### Code Example

```javascript
// Build a quad for WebGL rendering
const positions = new Float32Array([
  -0.5, -0.5, 0,   // bottom-left
   0.5, -0.5, 0,   // bottom-right
   0.5,  0.5, 0,   // top-right
  -0.5,  0.5, 0,   // top-left
]);

const indices = new Uint16Array([
  0, 1, 2,  // first triangle
  0, 2, 3,  // second triangle
]);

// Upload to WebGL
const posBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

const idxBuf = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

// Generate a 440 Hz sine wave for Web Audio
const sampleRate = 44100;
const audioBuffer = new Float32Array(sampleRate); // 1 second
for (let i = 0; i < sampleRate; i++) {
  audioBuffer[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate);
}
```

---

## Web Audio API

### What It Is

The Web Audio API is a high-level system for controlling audio on the web. It uses a modular routing graph where audio sources are connected through effect nodes to a destination (speakers). It provides high-precision timing, low latency, and built-in 3D spatial audio based on a source-listener model.

### Why It Matters for Games

- **Low-latency playback**: Sound effects respond to game events with minimal delay.
- **3D spatial audio**: Position sounds in 3D space relative to the player/listener for directional and distance-based audio.
- **Modular effects pipeline**: Chain gain, reverb, filters, compression, and distortion nodes for dynamic soundscapes.
- **Precise scheduling**: Schedule sounds to exact sample-accurate times for rhythm games, sequenced music, and timed events.
- **Real-time analysis**: `AnalyserNode` provides frequency and waveform data for audio-reactive visuals.
- **Procedural audio**: `OscillatorNode` generates waveforms for synthesized sound effects and UI tones.

### Key Interfaces

| Interface | Purpose |
|-----------|---------|
| `AudioContext` | The main audio-processing graph; must be created first |
| `AudioBufferSourceNode` | Plays pre-loaded audio (SFX, music) from an `AudioBuffer` |
| `OscillatorNode` | Generates waveforms (sine, square, triangle, sawtooth) |
| `GainNode` | Controls volume / amplitude |
| `BiquadFilterNode` | Low-pass, high-pass, band-pass filters |
| `ConvolverNode` | Convolution reverb using impulse responses |
| `DelayNode` | Delay-line effect (echo, chorus) |
| `DynamicsCompressorNode` | Prevents clipping when mixing many sounds |
| `PannerNode` | Positions a sound source in 3D space |
| `AudioListener` | Represents the player's ears in 3D space |
| `StereoPannerNode` | Simple left/right panning |
| `AnalyserNode` | Real-time frequency and time-domain analysis |
| `AudioWorkletNode` | Custom audio processing off the main thread |

### Common Routing Patterns

| Use Case | Routing Graph |
|----------|---------------|
| Background music | `BufferSource` -> `GainNode` -> `Destination` |
| Positional SFX | `BufferSource` -> `PannerNode` -> `GainNode` -> `Destination` |
| Reverb environment | `BufferSource` -> `ConvolverNode` -> `GainNode` -> `Destination` |
| UI feedback tone | `OscillatorNode` -> `GainNode` -> `Destination` |
| Master mix | Multiple sources -> individual `GainNode` -> `DynamicsCompressorNode` -> `Destination` |

### Code Example

```javascript
const audioCtx = new AudioContext();

// Load and play a sound effect
async function playSFX(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;

  // Add gain control
  const gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.8;

  // Connect: source -> gain -> speakers
  source.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  source.start(0);
}

// 3D positional audio
function playPositionalSound(buffer, x, y, z) {
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;

  const panner = audioCtx.createPanner();
  panner.panningModel = "HRTF";
  panner.distanceModel = "inverse";
  panner.refDistance = 1;
  panner.maxDistance = 100;
  panner.positionX.value = x;
  panner.positionY.value = y;
  panner.positionZ.value = z;

  source.connect(panner);
  panner.connect(audioCtx.destination);
  source.start(0);
}

// Update listener position each frame (matches camera/player)
function updateListener(playerPos, playerForward, playerUp) {
  const listener = audioCtx.listener;
  listener.positionX.value = playerPos.x;
  listener.positionY.value = playerPos.y;
  listener.positionZ.value = playerPos.z;
  listener.forwardX.value = playerForward.x;
  listener.forwardY.value = playerForward.y;
  listener.forwardZ.value = playerForward.z;
  listener.upX.value = playerUp.x;
  listener.upY.value = playerUp.y;
  listener.upZ.value = playerUp.z;
}
```

---

## WebGL API

### What It Is

WebGL (Web Graphics Library) is a JavaScript API for rendering hardware-accelerated 2D and 3D graphics within the browser. It implements a profile conforming to OpenGL ES 2.0 (WebGL 1) and OpenGL ES 3.0 (WebGL 2), operating through the HTML `<canvas>` element and using the device GPU for rendering.

### Why It Matters for Games

- **GPU-accelerated rendering**: Real-time 3D graphics at high frame rates using the device GPU.
- **Shader programming**: Vertex and fragment shaders in GLSL enable custom visual effects, lighting, shadows, and post-processing.
- **3D and 2D**: Suitable for both full 3D games and high-performance 2D rendering.
- **No plugins**: Runs natively in all modern browsers.
- **Rich ecosystem**: Libraries like three.js, Babylon.js, PlayCanvas, and Pixi.js simplify WebGL game development.

### Key Interfaces

| Interface | Purpose |
|-----------|---------|
| `WebGLRenderingContext` | WebGL 1 rendering context (OpenGL ES 2.0) |
| `WebGL2RenderingContext` | WebGL 2 rendering context (OpenGL ES 3.0) |
| `WebGLProgram` | Linked vertex + fragment shader program |
| `WebGLShader` | Individual vertex or fragment shader |
| `WebGLBuffer` | GPU memory buffer (vertices, indices) |
| `WebGLTexture` | Texture data for surfaces |
| `WebGLFramebuffer` | Off-screen render target (shadow maps, post-processing) |
| `WebGLRenderbuffer` | Non-texture render buffer (depth, stencil) |
| `WebGLVertexArrayObject` | Cached vertex attribute configuration (WebGL 2) |
| `WebGLUniformLocation` | Reference to a shader uniform variable |
| `WebGLSampler` | Texture sampling parameters (WebGL 2) |
| `WebGLTransformFeedback` | GPU-to-GPU data streaming (WebGL 2) |

### WebGL 2 Features Important for Games

- **3D Textures**: Volumetric rendering, lookup tables.
- **Instanced Rendering**: `drawArraysInstanced()` / `drawElementsInstanced()` for drawing thousands of identical objects efficiently.
- **Multiple Render Targets**: `drawBuffers()` for deferred rendering pipelines.
- **Uniform Buffer Objects**: Efficient sharing of shader data across draw calls.
- **Transform Feedback**: Capture vertex shader output for GPU-driven particle systems and simulations.
- **Vertex Array Objects**: Cache vertex state to reduce per-draw setup overhead.

### Context Management Events

| Event | Description |
|-------|-------------|
| `webglcontextlost` | GPU context lost (device disconnect, resource limits). Games must handle this gracefully. |
| `webglcontextrestored` | GPU context recovered. Games should reload GPU resources. |
| `webglcontextcreationerror` | Context initialization failed. |

### Code Example

```javascript
const canvas = document.getElementById("game");
const gl = canvas.getContext("webgl2");

// Vertex shader
const vsSource = `#version 300 es
  in vec4 aPosition;
  uniform mat4 uModelViewProjection;
  void main() {
    gl_Position = uModelViewProjection * aPosition;
  }
`;

// Fragment shader
const fsSource = `#version 300 es
  precision mediump float;
  out vec4 fragColor;
  void main() {
    fragColor = vec4(1.0, 0.5, 0.2, 1.0);
  }
`;

function compileShader(gl, source, type) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

const vs = compileShader(gl, vsSource, gl.VERTEX_SHADER);
const fs = compileShader(gl, fsSource, gl.FRAGMENT_SHADER);

const program = gl.createProgram();
gl.attachShader(program, vs);
gl.attachShader(program, fs);
gl.linkProgram(program);
gl.useProgram(program);

// Upload vertex data
const positions = new Float32Array([0, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0]);
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

const aPos = gl.getAttribLocation(program, "aPosition");
gl.enableVertexAttribArray(aPos);
gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

// Render
gl.clearColor(0, 0, 0, 1);
gl.clear(gl.COLOR_BUFFER_BIT);
gl.drawArrays(gl.TRIANGLES, 0, 3);
```

### Recommended Libraries

| Library | Description |
|---------|-------------|
| three.js | Full-featured 3D engine |
| Babylon.js | Complete game engine with physics, audio, and networking |
| PlayCanvas | Cloud-based game engine |
| Pixi.js | Lightweight 2D renderer |
| glMatrix | Matrix and vector math library |

---

## WebRTC API

### What It Is

WebRTC (Web Real-Time Communication) enables peer-to-peer communication between browsers for audio, video, and arbitrary data exchange -- without requiring plugins or intermediary relay servers (though signaling servers and STUN/TURN are used for connection setup and NAT traversal).

### Why It Matters for Games

- **Peer-to-peer multiplayer**: Establish direct connections between players, reducing latency and eliminating dedicated game servers for small-scale games.
- **Low-latency data channels**: `RTCDataChannel` sends binary game state updates with minimal overhead, supporting both reliable and unreliable delivery modes.
- **Voice chat**: Built-in audio/video streaming enables in-game voice communication.
- **Reduced server costs**: Direct peer connections offload bandwidth and processing from centralized servers.

### Key Interfaces

| Interface | Purpose |
|-----------|---------|
| `RTCPeerConnection` | Manages the connection between two peers, including media streams and data channels |
| `RTCDataChannel` | Bi-directional channel for arbitrary data (game state, commands, chat) |
| `RTCSessionDescription` | Session negotiation via SDP (offer/answer model) |
| `RTCIceCandidate` | Connectivity candidate for NAT/firewall traversal |
| `RTCRtpSender` / `RTCRtpReceiver` | Manage audio/video encoding and transmission |
| `RTCStatsReport` | Connection statistics (latency, packet loss, bandwidth) for optimization |

### Key Events

| Event | Description |
|-------|-------------|
| `datachannel` | Remote peer opened a data channel |
| `connectionstatechange` | Peer connection state changed |
| `icecandidate` | New ICE candidate available |
| `track` | Incoming media track (audio/video) |

### Connection Lifecycle

1. Create `RTCPeerConnection` on each peer.
2. Exchange SDP offers/answers via a signaling server (typically WebSocket).
3. Exchange ICE candidates for NAT traversal.
4. Peers connect directly.
5. Open `RTCDataChannel` for game data and/or add media tracks for voice.
6. Monitor performance with `RTCStatsReport`.
7. Close channels and connection when the session ends.

### Code Example

```javascript
// Peer A: Create connection and data channel
const peerA = new RTCPeerConnection({
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
});

const gameChannel = peerA.createDataChannel("game", {
  ordered: false,       // Allow out-of-order delivery (lower latency)
  maxRetransmits: 0,    // Unreliable mode (like UDP)
});

gameChannel.onopen = () => {
  // Send game state updates
  gameChannel.send(JSON.stringify({ type: "move", x: 10, y: 20 }));
};

gameChannel.onmessage = (event) => {
  const data = JSON.parse(event.data);
  applyRemoteGameState(data);
};

// Peer B: Receive the data channel
const peerB = new RTCPeerConnection({
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
});

peerB.ondatachannel = (event) => {
  const channel = event.channel;
  channel.onmessage = (e) => {
    const data = JSON.parse(e.data);
    applyRemoteGameState(data);
  };
};

// Signaling (offer/answer exchange via your signaling server)
async function connect() {
  const offer = await peerA.createOffer();
  await peerA.setLocalDescription(offer);
  // Send offer to Peer B via signaling server...

  // Peer B receives offer, sets remote description, creates answer
  await peerB.setRemoteDescription(offer);
  const answer = await peerB.createAnswer();
  await peerB.setLocalDescription(answer);
  // Send answer back to Peer A via signaling server...

  await peerA.setRemoteDescription(answer);
}
```

---

## WebSockets API

### What It Is

The WebSocket API enables persistent, full-duplex communication between a browser and a server over a single TCP connection. Unlike HTTP request-response, a WebSocket connection stays open, allowing the server to push data to the client at any time.

### Why It Matters for Games

- **Real-time multiplayer**: Stream player positions, game events, and world state between clients and servers with minimal latency.
- **Server-push updates**: The server can broadcast game state changes instantly to all connected players without polling.
- **Low overhead**: No repeated HTTP headers on every message; just framed data on a persistent connection.
- **Binary data support**: Send `ArrayBuffer` and `Blob` data for efficient game state serialization.
- **Web Worker compatible**: Run WebSocket communication in a background thread to keep the game loop unblocked.

### Key Interface: WebSocket

| Member | Description |
|--------|-------------|
| `new WebSocket(url, protocols?)` | Opens a connection to the server |
| `send(data)` | Transmit data (string, ArrayBuffer, Blob) |
| `close(code?, reason?)` | Gracefully close the connection |
| `readyState` | Current state: CONNECTING (0), OPEN (1), CLOSING (2), CLOSED (3) |
| `bufferedAmount` | Bytes queued but not yet sent (for flow control) |
| `binaryType` | Set to `"arraybuffer"` or `"blob"` for binary data |

### Events

| Event | Description |
|-------|-------------|
| `open` | Connection established and ready |
| `message` | Data received from server (access via `event.data`) |
| `close` | Connection closed (access code/reason via `CloseEvent`) |
| `error` | An error occurred |

### Code Example

```javascript
// Connect to the game server
const socket = new WebSocket("wss://game.example.com/ws");
socket.binaryType = "arraybuffer";

socket.addEventListener("open", () => {
  // Authenticate and join a game room
  socket.send(JSON.stringify({
    type: "join",
    room: "room-42",
    playerId: "player-1"
  }));
});

socket.addEventListener("message", (event) => {
  if (typeof event.data === "string") {
    const msg = JSON.parse(event.data);
    switch (msg.type) {
      case "state":
        updateWorldState(msg.state);
        break;
      case "playerJoined":
        addRemotePlayer(msg.player);
        break;
      case "playerLeft":
        removeRemotePlayer(msg.playerId);
        break;
    }
  } else {
    // Binary data -- e.g., compressed game state
    const view = new DataView(event.data);
    processRawGameState(view);
  }
});

socket.addEventListener("close", (event) => {
  console.log(`Disconnected: ${event.code} ${event.reason}`);
  showReconnectPrompt();
});

// Send player input to the server each tick
function sendInput(input) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "input",
      keys: input.keys,
      mouseX: input.mouseX,
      mouseY: input.mouseY,
      timestamp: performance.now(),
    }));
  }
}
```

### Notes

- Close the WebSocket connection when the player navigates away to avoid blocking the browser's back-forward cache.
- For games requiring unreliable (UDP-like) delivery, consider WebRTC data channels or the newer WebTransport API.
- Popular server libraries: Socket.IO, ws (Node.js), Gorilla WebSocket (Go), SignalR (.NET).

---

## WebVR API (Deprecated)

### What It Is

The WebVR API provides interfaces for accessing virtual reality devices (head-mounted displays such as Oculus Rift and HTC Vive) from the browser. It exposes display properties, head-tracking pose data, and stereo rendering capabilities for immersive VR experiences.

### Why It Matters for Games

- **Immersive VR gaming**: Render stereoscopic 3D scenes driven by real-time head tracking.
- **Room-scale experiences**: `VRStageParameters` describes the physical play area dimensions.
- **Controller integration**: VR controllers are accessible through the Gamepad API, linking each controller to a `VRDisplay` via `gamepad.displayId`.

### Deprecation Notice

The WebVR API is **deprecated and non-standard**. It was never ratified as a web standard and has been superseded by the **WebXR Device API**, which supports both VR and AR, has broader browser support, and is on track for standardization. All new VR game development should target WebXR.

### Key Interfaces

| Interface | Purpose |
|-----------|---------|
| `VRDisplay` | Represents a VR headset. Core methods: `requestPresent()`, `requestAnimationFrame()`, `getFrameData()`, `submitFrame()`. |
| `VRFrameData` | Pose, view matrices, and projection matrices for the current frame. |
| `VRPose` | Position, orientation, velocity, and acceleration at a given timestamp. |
| `VREyeParameters` | Per-eye field of view and rendering offset. |
| `VRStageParameters` | Room-scale play area dimensions and transform. |
| `VRDisplayCapabilities` | Device capability flags (has position tracking, has external display, etc.). |
| `Navigator.getVRDisplays()` | Returns a promise resolving to an array of connected `VRDisplay` objects. |

### Key Events

| Event | Description |
|-------|-------------|
| `vrdisplayconnect` | A VR headset was connected |
| `vrdisplaydisconnect` | A VR headset was disconnected |
| `vrdisplaypresentchange` | The headset entered or exited presentation mode |
| `vrdisplayactivate` | The headset is ready to present |

### Code Example

```javascript
// Check for WebVR support
if (navigator.getVRDisplays) {
  navigator.getVRDisplays().then(displays => {
    if (displays.length === 0) return;
    const vrDisplay = displays[0];

    // Start presenting to the headset
    vrDisplay.requestPresent([{ source: canvas }]).then(() => {
      const frameData = new VRFrameData();

      function renderLoop() {
        vrDisplay.requestAnimationFrame(renderLoop);
        vrDisplay.getFrameData(frameData);

        // Render left eye
        gl.viewport(0, 0, canvas.width / 2, canvas.height);
        renderScene(frameData.leftProjectionMatrix, frameData.leftViewMatrix);

        // Render right eye
        gl.viewport(canvas.width / 2, 0, canvas.width / 2, canvas.height);
        renderScene(frameData.rightProjectionMatrix, frameData.rightViewMatrix);

        vrDisplay.submitFrame();
      }
      renderLoop();
    });
  });
}
```

### Migration to WebXR

For new projects, use the **WebXR Device API** instead. Frameworks that support WebXR include:

- **A-Frame** -- Declarative entity-component VR framework
- **Babylon.js** -- Full-featured 3D/game engine with WebXR support
- **three.js** -- Lightweight 3D library with WebXR integration
- **WebXR Polyfill** -- Backwards-compatibility layer for older browsers

---

## Web Workers API

### What It Is

The Web Workers API enables running JavaScript in background threads separate from the main thread. Workers operate in their own global scope (`DedicatedWorkerGlobalScope` or `SharedWorkerGlobalScope`), cannot access the DOM directly, and communicate with the main thread via message passing (`postMessage` / `onmessage`).

### Why It Matters for Games

- **Offload heavy computation**: Move physics simulation, pathfinding, AI, procedural generation, and collision detection to background threads so the main thread stays at 60 fps.
- **Parallel asset processing**: Decode images, decompress data, or parse level files without blocking rendering.
- **OffscreenCanvas**: Render to a canvas from within a worker, enabling parallel rendering pipelines.
- **Non-blocking networking**: Perform `fetch()` or XHR calls in a worker to keep the game loop smooth.

### Worker Types

| Type | Description | Game Use Case |
|------|-------------|---------------|
| Dedicated Worker (`Worker`) | Single-owner background thread | Physics, AI, pathfinding for one game instance |
| Shared Worker (`SharedWorker`) | Shared across multiple windows/tabs | Multi-tab or multi-iframe game scenarios |
| Service Worker | Network proxy with offline support | Asset caching, offline play |

### Key Interfaces

| API | Description |
|-----|-------------|
| `new Worker(scriptURL)` | Create a dedicated worker from a script file |
| `worker.postMessage(data)` | Send data to the worker |
| `worker.onmessage` | Receive data from the worker (via `event.data`) |
| `worker.terminate()` | Immediately stop the worker |
| Inside worker: `self.postMessage(data)` | Send data back to the main thread |
| Inside worker: `self.onmessage` | Receive data from the main thread |

### Limitations

- No DOM access from workers.
- No `window` object; limited global scope.
- Data is copied (structured clone) by default; use `Transferable` objects (ArrayBuffer, OffscreenCanvas) for zero-copy transfers.
- Worker scripts must be same-origin.

### Code Example

**Main thread (game.js):**

```javascript
// Create a physics worker
const physicsWorker = new Worker("physics-worker.js");

// Send world state to the worker each frame
function updatePhysics(entities) {
  // Transfer the buffer for zero-copy performance
  const buffer = serializeEntities(entities);
  physicsWorker.postMessage({ type: "step", buffer }, [buffer]);
}

// Receive results from the worker
physicsWorker.onmessage = (event) => {
  const { type, buffer } = event.data;
  if (type === "result") {
    applyPhysicsResults(buffer);
  }
};
```

**Worker thread (physics-worker.js):**

```javascript
self.onmessage = (event) => {
  const { type, buffer } = event.data;
  if (type === "step") {
    const positions = new Float32Array(buffer);

    // Run physics simulation
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] -= 9.8 * (1 / 60); // gravity on Y axis
    }

    // Send results back, transferring the buffer
    self.postMessage({ type: "result", buffer: positions.buffer }, [positions.buffer]);
  }
};
```

---

## XMLHttpRequest

### What It Is

`XMLHttpRequest` (XHR) is a built-in browser API for making HTTP requests to servers without reloading the page. Despite its name, it can retrieve any data type -- JSON, binary (ArrayBuffer, Blob), plain text, XML, and HTML. It has been largely superseded by the Fetch API for new code, but remains widely used and fully supported.

### Why It Matters for Games

- **Asset loading**: Retrieve game assets (images, audio, JSON level data, binary model files) asynchronously without blocking the game loop.
- **Binary data support**: Set `responseType` to `"arraybuffer"` or `"blob"` to load binary assets directly into typed arrays for WebGL or Web Audio.
- **Progress tracking**: The `progress` event reports download progress, enabling loading bars.
- **Server communication**: Submit scores, authenticate players, fetch leaderboards, and synchronize game state with backend services.
- **Web Worker compatible**: XHR can be used inside Web Workers for background asset loading.

### Key Methods

| Method | Description |
|--------|-------------|
| `open(method, url, async?)` | Initialize a request (GET, POST, etc.) |
| `send(body?)` | Send the request; `body` can be string, FormData, ArrayBuffer, Blob |
| `setRequestHeader(name, value)` | Set an HTTP header (call after `open`, before `send`) |
| `abort()` | Cancel an in-progress request |
| `getResponseHeader(name)` | Retrieve a specific response header value |

### Key Properties

| Property | Description |
|----------|-------------|
| `response` | The response body as the type specified by `responseType` |
| `responseType` | Expected response format: `""`, `"text"`, `"json"`, `"arraybuffer"`, `"blob"`, `"document"` |
| `status` | HTTP status code (200, 404, etc.) |
| `readyState` | Request lifecycle state (0 = UNSENT through 4 = DONE) |
| `timeout` | Milliseconds before the request auto-aborts |
| `withCredentials` | Whether to include cookies in cross-origin requests |

### Events

| Event | Description |
|-------|-------------|
| `load` | Request completed successfully |
| `error` | Request failed |
| `progress` | Periodic progress updates during download |
| `abort` | Request was aborted |
| `readystatechange` | `readyState` changed |

### Code Example

```javascript
// Load a JSON level file
function loadLevel(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "json";

    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(xhr.response);
      } else {
        reject(new Error(`Failed to load level: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send();
  });
}

// Load a binary asset with progress tracking
function loadBinaryAsset(url, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "arraybuffer";

    xhr.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded / event.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(xhr.response); // ArrayBuffer
      } else {
        reject(new Error(`Failed to load asset: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send();
  });
}

// Usage
loadLevel("levels/level1.json").then(data => initLevel(data));
loadBinaryAsset("models/tank.bin", pct => updateLoadingBar(pct))
  .then(buf => parseModel(new Float32Array(buf)));
```

### Note on Fetch API

For new projects, the **Fetch API** (`fetch()`) is generally preferred over XHR. It provides a cleaner promise-based interface, supports streaming via `ReadableStream`, and integrates well with async/await. However, XHR remains relevant when you need progress events on uploads or require broader compatibility with legacy codebases.
