# Game Development Techniques

A comprehensive reference covering essential techniques for building web-based games, compiled from MDN Web Docs.

---

## Async Scripts

**Source:** [MDN - Async Scripts for asm.js](https://developer.mozilla.org/en-US/docs/Games/Techniques/Async_scripts)

### What It Is

Async compilation allows JavaScript engines to compile asm.js code off the main thread during game loading and cache the generated machine code. This prevents recompilation on subsequent loads and gives the browser maximum flexibility to optimize the compilation process.

### How It Works

When a script is loaded asynchronously, the browser can compile it on a background thread while the main thread continues handling rendering and user interaction. The compiled code is cached so future visits skip recompilation entirely.

### When to Use It

- Medium or large games that compile asm.js code.
- Any game where startup performance matters (which is virtually all games).
- When you want the browser to cache compiled machine code across sessions.

### Code Examples

**HTML attribute approach:**

```html
<script async src="file.js"></script>
```

**JavaScript dynamic creation (defaults to async):**

```javascript
const script = document.createElement("script");
script.src = "file.js";
document.body.appendChild(script);
```

**Important:** Inline scripts are never async, even with the `async` attribute. They compile and run immediately:

```html
<!-- This is NOT async despite the attribute -->
<script async>
  // Inline JavaScript code
</script>
```

**Using Blob URLs for async compilation of string-based code:**

```javascript
const blob = new Blob([codeString]);
const script = document.createElement("script");
const url = URL.createObjectURL(blob);
script.onload = script.onerror = () => URL.revokeObjectURL(url);
script.src = url;
document.body.appendChild(script);
```

The key insight is that setting `src` (rather than `innerHTML` or `textContent`) triggers async compilation.

---

## Optimizing Startup Performance

**Source:** [MDN - Optimizing Startup Performance](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Optimizing_startup_performance)

### What It Is

A collection of strategies for improving how quickly web applications and games start up and become responsive, preventing the app, browser, or device from appearing frozen to users.

### How It Works

The core principle is avoiding blocking the main thread during startup. Work is offloaded to background threads (Web Workers), startup code is broken into small micro-tasks, and the main thread is kept free for user events and rendering. The event loop must keep cycling continuously.

### When to Use It

- Always -- this is a universal concern for all web applications and games.
- Critical for new apps since it is easier to build asynchronously from the start.
- Essential when porting native apps that expect synchronous loading and need refactoring.

### Key Techniques

**1. Script Loading with `defer` and `async`**

Prevent blocking HTML parsing:

```html
<script defer src="app.js"></script>
<script async src="helper.js"></script>
```

**2. Web Workers for Heavy Processing**

Move data fetching, decoding, and calculations to workers. This frees the main thread for UI and user events.

**3. Data Processing**

- Use browser-provided decoders (image, video) instead of custom implementations.
- Process data in parallel whenever possible, not sequentially.
- Offload asset decoding (e.g., JPEG to raw texture data) to workers.

**4. Resource Loading**

- Do not include scripts or stylesheets outside the critical rendering path in the startup HTML -- load them only when needed.
- Use resource hints: `preconnect`, `preload`.

**5. Code Size and Compression**

- Minify JavaScript files.
- Use Gzip or Brotli compression.
- Optimize and compress data files.

**6. Perceived Performance**

- Display splash screens to keep users engaged.
- Show progress indicators for heavy sites.
- Make time feel faster even if absolute duration stays the same.

**7. Emscripten Main Loop Blockers (for ported apps)**

```javascript
emscripten_push_main_loop_blocker();
// Establish functions to execute before main thread continues
// Create queue of functions called in sequence
```

### Performance Targets

| Metric | Target |
|---|---|
| Initial content appearance | 1-2 seconds |
| User-perceptible delay | 50ms or less |
| Sluggish threshold | Greater than 200ms |

Users on older or slower devices experience longer delays than developers -- always optimize accordingly.

---

## WebRTC Data Channels

**Source:** [MDN - WebRTC Data Channels](https://developer.mozilla.org/en-US/docs/Games/Techniques/WebRTC_data_channels)

### What It Is

WebRTC data channels let you send text or binary data over an active connection to a peer. In the context of games, this enables players to send data to each other for text chat or game state synchronization, without routing through a central server.

### How It Works

WebRTC establishes a peer-to-peer connection between two browsers. Once established, a data channel can be opened on that connection. Data channels come in two flavors:

**Reliable Channels:**
- Guarantee that messages arrive at the peer.
- Maintain message order -- messages arrive in the same sequence they were sent.
- Analogous to TCP sockets.

**Unreliable Channels:**
- Make no guarantees about message delivery.
- Messages may not arrive in any particular order.
- Messages may not arrive at all.
- Analogous to UDP sockets.

### When to Use It

- **Reliable channels:** Turn-based games, chat, or any scenario where every message must arrive in order.
- **Unreliable channels:** Real-time action games where low latency matters more than guaranteed delivery (e.g., position updates where stale data is worse than missing data).

### Use Cases in Games

- Player-to-player text chat communication.
- Game status information exchange between players.
- Real-time game state synchronization.
- Peer-to-peer multiplayer without a dedicated game server.

### Implementation Notes

- The WebRTC API is primarily known for audio and video communication but includes robust peer-to-peer data channel capabilities.
- Libraries are recommended to simplify implementation and work around browser differences.
- Full WebRTC documentation is available at [MDN WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API).

---

## Audio for Web Games

**Source:** [MDN - Audio for Web Games](https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games)

### What It Is

Audio provides feedback and atmosphere in web games. This technique covers implementing audio across desktop and mobile platforms, addressing browser differences and optimization strategies.

### How It Works

Two primary APIs are available:

1. **HTMLMediaElement** -- The standard `<audio>` element for basic audio playback.
2. **Web Audio API** -- An advanced API for dynamic audio manipulation, positioning, and precise timing.

### When to Use It

- Use `<audio>` elements for simple, linear playback (background music without complex control).
- Use the Web Audio API for dynamic music, 3D spatial audio, precise timing, and real-time manipulation.
- Use audio sprites when targeting mobile or when you have many short sound effects.

### Key Challenges on Mobile

- **Autoplay policy:** Browsers restrict autoplay with sound. Playback must be user-initiated via click or tap.
- **Volume control:** Mobile browsers may disable programmatic volume control to preserve OS-level user control.
- **Buffering/preloading:** Mobile browsers often disable buffering before playback initiation to reduce data usage.

### Technique 1: Audio Sprites

Combines multiple audio clips into a single file, playing specific sections by timestamp, borrowed from the CSS sprites concept.

**HTML:**

```html
<audio id="myAudio" src="mysprite.mp3"></audio>
<button data-start="18" data-stop="19">0</button>
<button data-start="16" data-stop="17">1</button>
<button data-start="14" data-stop="15">2</button>
<button data-start="12" data-stop="13">3</button>
<button data-start="10" data-stop="11">4</button>
<button data-start="8" data-stop="9">5</button>
<button data-start="6" data-stop="7">6</button>
<button data-start="4" data-stop="5">7</button>
<button data-start="2" data-stop="3">8</button>
<button data-start="0" data-stop="1">9</button>
```

**JavaScript:**

```javascript
const myAudio = document.getElementById("myAudio");
const buttons = document.getElementsByTagName("button");
let stopTime = 0;

for (const button of buttons) {
  button.addEventListener("click", () => {
    myAudio.currentTime = button.dataset.start;
    stopTime = Number(button.dataset.stop);
    myAudio.play();
  });
}

myAudio.addEventListener("timeupdate", () => {
  if (myAudio.currentTime > stopTime) {
    myAudio.pause();
  }
});
```

**Priming audio for mobile (trigger on first user interaction):**

```javascript
const myAudio = document.createElement("audio");
myAudio.src = "my-sprite.mp3";
myAudio.play();
myAudio.pause();
```

### Technique 2: Web Audio API Multi-Track Music

Load and synchronize separate audio tracks with precise timing.

**Create audio context and load files:**

```javascript
const audioCtx = new AudioContext();

async function getFile(filepath) {
  const response = await fetch(filepath);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  return audioBuffer;
}
```

**Track playback with synchronization:**

```javascript
let offset = 0;

function playTrack(audioBuffer) {
  const trackSource = audioCtx.createBufferSource();
  trackSource.buffer = audioBuffer;
  trackSource.connect(audioCtx.destination);

  if (offset === 0) {
    trackSource.start();
    offset = audioCtx.currentTime;
  } else {
    trackSource.start(0, audioCtx.currentTime - offset);
  }

  return trackSource;
}
```

**Handle autoplay policy in playback handlers:**

```javascript
playButton.addEventListener("click", () => {
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  playTrack(track);
  playButton.dataset.playing = true;
});
```

### Technique 3: Beat-Synchronized Track Playback

For seamless transitions, sync new tracks to beat boundaries:

```javascript
const tempo = 3.074074076; // Time in seconds of your beat/bar

if (offset === 0) {
  source.start();
  offset = context.currentTime;
} else {
  const relativeTime = context.currentTime - offset;
  const beats = relativeTime / tempo;
  const remainder = beats - Math.floor(beats);
  const delay = tempo - remainder * tempo;
  source.start(context.currentTime + delay, relativeTime + delay);
}
```

### Technique 4: Positional Audio (3D Spatialization)

Use the `PannerNode` to position audio in 3D space:

- Position objects in game world space.
- Set direction and movement of audio sources.
- Apply environmental effects (cave reverb, underwater muffling, etc.).

Particularly useful for WebGL 3D games to tie audio to visual objects and the player's viewpoint.

### Decision Matrix

| Technique | Use When | Pros | Cons |
|---|---|---|---|
| Audio Sprites | Many short sounds, mobile | Reduces HTTP requests, mobile-friendly | Seeking accuracy reduced at low bitrates |
| Basic `<audio>` | Simple linear playback | Broad support | Limited control, autoplay restrictions |
| Web Audio API | Dynamic music, 3D positioning, precise timing | Full control, real-time manipulation, sync | More complex code |
| Positional Audio | 3D immersive games | Realism, player immersion | Requires WebGL context awareness |

---

## 2D Collision Detection

**Source:** [MDN - 2D Collision Detection](https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection)

### What It Is

2D collision detection algorithms determine when game entities overlap or intersect based on their shape types (rectangle-to-rectangle, rectangle-to-circle, circle-to-circle, etc.). Rather than pixel-perfect detection, games typically use simple generic shapes called "hitboxes" that cover entities, balancing visual accuracy with performance.

### How It Works

Each algorithm checks the geometric relationship between two shapes. If any overlap is detected, a collision is reported. The approach varies by shape type.

### When to Use It

- Use AABB for simple rectangular entities without rotation.
- Use circle collision for round entities or when you need fast, simple checks.
- Use the Separating Axis Theorem (SAT) for complex convex polygons.
- Use broad-phase narrowing (quad trees, spatial hashmaps) when you have many entities.

### Algorithm 1: Axis-Aligned Bounding Box (AABB)

Collision detection between two axis-aligned rectangles (no rotation). Detects collision by ensuring there is no gap between any of the 4 sides of the rectangles.

```javascript
class BoxEntity extends BaseEntity {
  width = 20;
  height = 20;

  isCollidingWith(other) {
    return (
      this.position.x < other.position.x + other.width &&
      this.position.x + this.width > other.position.x &&
      this.position.y < other.position.y + other.height &&
      this.position.y + this.height > other.position.y
    );
  }
}
```

### Algorithm 2: Circle Collision

Collision detection between two circles. Takes the center points of two circles and checks whether the distance between them is less than the sum of their radii.

```javascript
class CircleEntity extends BaseEntity {
  radius = 10;

  isCollidingWith(other) {
    const dx =
      this.position.x + this.radius - (other.position.x + other.radius);
    const dy =
      this.position.y + this.radius - (other.position.y + other.radius);
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < this.radius + other.radius;
  }
}
```

Note: The circle's `x` and `y` coordinates refer to their top-left corner, so you must add the radius to compare their actual centers.

### Algorithm 3: Separating Axis Theorem (SAT)

A collision algorithm that detects collisions between any two convex polygons. It works by projecting each polygon onto every possible axis and checking for overlap. If any axis shows a gap, the polygons are not colliding.

SAT is more complex to implement but handles arbitrary convex polygon shapes.

### Collision Performance: Broad Phase and Narrow Phase

Testing every entity against every other entity is computationally expensive (O(n^2)). Games split collision detection into two phases:

**Broad Phase** -- Uses spatial data structures to quickly identify which entities could be colliding:
- Quad Trees
- R-Trees
- Spatial Hashmaps

**Narrow Phase** -- Applies precise collision algorithms (AABB, Circle, SAT) only to the small list of candidates from the broad phase.

### Base Engine Code

**CSS for collision visualization:**

```css
.entity {
  display: inline-block;
  position: absolute;
  height: 20px;
  width: 20px;
  background-color: blue;
}

.movable {
  left: 50px;
  top: 50px;
  background-color: red;
}

.collision-state {
  background-color: green !important;
}
```

**JavaScript collision checker and entity system:**

```javascript
const collider = {
  moveableEntity: null,
  staticEntities: [],
  checkCollision() {
    const isColliding = this.staticEntities.some((staticEntity) =>
      this.moveableEntity.isCollidingWith(staticEntity),
    );
    this.moveableEntity.setCollisionState(isColliding);
  },
};

const container = document.getElementById("container");

class BaseEntity {
  ref;
  position;
  constructor(position) {
    this.position = position;
    this.ref = document.createElement("div");
    this.ref.classList.add("entity");
    this.ref.style.left = `${this.position.x}px`;
    this.ref.style.top = `${this.position.y}px`;
    container.appendChild(this.ref);
  }
  shiftPosition(dx, dy) {
    this.position.x += dx;
    this.position.y += dy;
    this.redraw();
  }
  redraw() {
    this.ref.style.left = `${this.position.x}px`;
    this.ref.style.top = `${this.position.y}px`;
  }
  setCollisionState(isColliding) {
    if (isColliding && !this.ref.classList.contains("collision-state")) {
      this.ref.classList.add("collision-state");
    } else if (!isColliding) {
      this.ref.classList.remove("collision-state");
    }
  }
  isCollidingWith(other) {
    throw new Error("isCollidingWith must be implemented in subclasses");
  }
}

document.addEventListener("keydown", (e) => {
  e.preventDefault();
  switch (e.key) {
    case "ArrowLeft":
      collider.moveableEntity.shiftPosition(-5, 0);
      break;
    case "ArrowUp":
      collider.moveableEntity.shiftPosition(0, -5);
      break;
    case "ArrowRight":
      collider.moveableEntity.shiftPosition(5, 0);
      break;
    case "ArrowDown":
      collider.moveableEntity.shiftPosition(0, 5);
      break;
  }
  collider.checkCollision();
});
```

---

## Tilemaps

**Source:** [MDN - Tilemaps](https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps)

### What It Is

Tilemaps are a fundamental technique in 2D game development that constructs game worlds using small, regular-shaped images called tiles. Instead of storing large monolithic level images, the game world is assembled from a grid of reusable tile graphics, providing significant performance and memory benefits.

### How It Works

**Core structure:**

1. **Tile Atlas (Spritesheet):** All tile images stored in a single atlas file. Each tile is assigned an index used as its identifier.
2. **Tilemap Data Object:** Contains tile size (pixel dimensions), image atlas reference, map dimensions (in tiles or pixels), a visual grid (array of tile indices), and an optional logic grid (collision, pathfinding, spawn data).

Special values (negative numbers, 0, or null) represent empty tiles.

### When to Use It

- Building 2D game worlds of any kind (platformers, RPGs, strategy games, puzzle games).
- Games inspired by classics like Super Mario Bros, Pacman, Zelda, Starcraft, or Sim City.
- Any scenario where a grid-based world offers logical advantages for pathfinding, collision, or level editing.

### Rendering Static Tilemaps

For maps fitting entirely on screen:

```javascript
for (let column = 0; column < map.columns; column++) {
  for (let row = 0; row < map.rows; row++) {
    const tile = map.getTile(column, row);
    const x = column * map.tileSize;
    const y = row * map.tileSize;
    drawTile(tile, x, y);
  }
}
```

### Scrolling Tilemaps with Camera

Convert between world coordinates (level position) and screen coordinates (rendered position):

```javascript
// These functions assume camera points to top-left corner

function worldToScreen(x, y) {
  return { x: x - camera.x, y: y - camera.y };
}

function screenToWorld(x, y) {
  return { x: x + camera.x, y: y + camera.y };
}
```

Key principle: Only render visible tiles to optimize performance. Apply the camera offset transformation during rendering.

### Tilemap Types

**Square Tiles (most common):**
- Top-down view for RPGs and strategy games (Warcraft 2, Final Fantasy).
- Side view for platformers (Super Mario Bros).

**Isometric Tilemaps:**
- Creates the illusion of a 3D environment.
- Popular in simulation and strategy games (SimCity 2000, Pharaoh, Final Fantasy Tactics).

### Layers

Multiple visual layers enable:
- Reusing tiles across different background types.
- Characters appearing behind or in front of terrain (walking behind trees).
- Richer worlds with fewer tile variations.

Example: A rock tile rendered on a separate layer over grass, sand, or brick backgrounds.

### Logic Grid

A separate grid for non-visual game logic:
- **Collision detection:** Mark walkable vs. blocked tiles.
- **Character spawning:** Define spawn point locations.
- **Pathfinding:** Create navigation graphs.
- **Tile combinations:** Detect valid patterns (Tetris, Bejeweled).

### Performance Optimization

1. **Only render visible tiles** -- Skip off-screen tiles entirely.
2. **Pre-render to canvas** -- Render the map to an off-screen canvas element and blit as a single operation.
3. **Offcanvas buffering** -- Draw a section larger than the visible area (2x2 tiles bigger) to reduce redraws during scrolling.
4. **Chunking** -- Divide large tilemaps into sections (e.g., 10x10 tile chunks), pre-render each as a "big tile."

---

## Controls: Gamepad API

**Source:** [MDN - Controls Gamepad API](https://developer.mozilla.org/en-US/docs/Games/Techniques/Controls_Gamepad_API)

### What It Is

The Gamepad API provides an interface for detecting and using gamepad controllers in web browsers without plugins. It exposes button presses and axis changes through JavaScript, allowing console-like control of browser-based games.

### How It Works

Two fundamental events handle the controller lifecycle:

- `gamepadconnected` -- fired when a gamepad is connected.
- `gamepaddisconnected` -- fired when disconnected (physically or due to inactivity).

Security note: User interaction with the controller is required while the page is visible for the event to fire (prevents fingerprinting).

**Gamepad object properties:**

| Property | Description |
|---|---|
| `id` | String containing controller information |
| `index` | Unique identifier for the connected device |
| `connected` | Boolean indicating connection status |
| `mapping` | Layout type ("standard" is the common option) |
| `axes` | Array of floats (-1 to 1) representing analog stick positions |
| `buttons` | Array of GamepadButton objects with `pressed` and `value` properties |

### When to Use It

- When building games that should work with console controllers.
- When supporting Xbox 360, Xbox One, PS3, or PS4 controllers on Windows and macOS.
- When you want dual input support (keyboard + gamepad).

### Code Examples

**Basic setup structure:**

```javascript
const gamepadAPI = {
  controller: {},
  turbo: false,
  connect() {},
  disconnect() {},
  update() {},
  buttonPressed() {},
  buttons: [],
  buttonsCache: [],
  buttonsStatus: [],
  axesStatus: [],
};
```

**Button layout (Xbox 360):**

```javascript
const gamepadAPI = {
  buttons: [
    "DPad-Up", "DPad-Down", "DPad-Left", "DPad-Right",
    "Start", "Back", "Axis-Left", "Axis-Right",
    "LB", "RB", "Power", "A", "B", "X", "Y",
  ],
};
```

**Event listeners:**

```javascript
window.addEventListener("gamepadconnected", gamepadAPI.connect);
window.addEventListener("gamepaddisconnected", gamepadAPI.disconnect);
```

**Connection and disconnection handlers:**

```javascript
connect(evt) {
  gamepadAPI.controller = evt.gamepad;
  gamepadAPI.turbo = true;
  console.log("Gamepad connected.");
},

disconnect(evt) {
  gamepadAPI.turbo = false;
  delete gamepadAPI.controller;
  console.log("Gamepad disconnected.");
},
```

**Update method (called every frame):**

```javascript
update() {
  // Clear the buttons cache
  gamepadAPI.buttonsCache = [];

  // Move the buttons status from the previous frame to the cache
  for (let k = 0; k < gamepadAPI.buttonsStatus.length; k++) {
    gamepadAPI.buttonsCache[k] = gamepadAPI.buttonsStatus[k];
  }

  // Clear the buttons status
  gamepadAPI.buttonsStatus = [];

  // Get the gamepad object
  const c = gamepadAPI.controller || {};

  // Loop through buttons and push the pressed ones to the array
  const pressed = [];
  if (c.buttons) {
    for (let b = 0; b < c.buttons.length; b++) {
      if (c.buttons[b].pressed) {
        pressed.push(gamepadAPI.buttons[b]);
      }
    }
  }

  // Loop through axes and push their values to the array
  const axes = [];
  if (c.axes) {
    for (const ax of c.axes) {
      axes.push(ax.toFixed(2));
    }
  }

  // Assign received values
  gamepadAPI.axesStatus = axes;
  gamepadAPI.buttonsStatus = pressed;

  return pressed;
},
```

**Button detection with hold support:**

```javascript
buttonPressed(button, hold) {
  let newPress = false;
  if (gamepadAPI.buttonsStatus.includes(button)) {
    newPress = true;
  }
  if (!hold && gamepadAPI.buttonsCache.includes(button)) {
    newPress = false;
  }
  return newPress;
},
```

Parameters:
- `button` -- the button name to listen for.
- `hold` -- if true, holding the button counts as continuous action; if false, only new presses register.

**Usage in a game loop:**

```javascript
if (gamepadAPI.turbo) {
  if (gamepadAPI.buttonPressed("A", "hold")) {
    this.turbo_fire();
  }
  if (gamepadAPI.buttonPressed("B")) {
    this.managePause();
  }
}
```

**Analog stick input with threshold (prevent stick drift):**

```javascript
if (gamepadAPI.axesStatus[0].x > 0.5) {
  this.player.angle += 3;
  this.turret.angle += 3;
}
```

**Getting all connected gamepads:**

```javascript
const gamepads = navigator.getGamepads();
// Returns an array where unavailable/disconnected slots contain null
// Example with one device at index 1: [null, [object Gamepad]]
```

---

## Crisp Pixel Art Look

**Source:** [MDN - Crisp Pixel Art Look](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look)

### What It Is

A technique for rendering pixel art without blurriness on high-resolution displays by mapping individual image pixels to blocks of screen pixels without smoothing interpolation. Retro pixel art requires preserving hard edges during scaling, but modern browsers default to smoothing algorithms that blend colors and create blur.

### How It Works

The CSS `image-rendering` property controls how browsers scale images. Setting it to `pixelated` enforces nearest-neighbor scaling, which preserves the crisp, blocky look of pixel art instead of applying bilinear or bicubic smoothing.

**Key CSS values:**
- `pixelated` -- preserves crisp edges for pixel art.
- `crisp-edges` -- alternative supported on some browsers.

### When to Use It

- Retro-style games with pixel art assets.
- Any game where you want a deliberately blocky, pixelated visual style.
- When scaling small sprite images to larger display sizes.

### Technique 1: Scaling `<img>` Elements with CSS

```html
<img
  src="character.png"
  alt="pixel art character, upscaled with CSS, appearing crisp" />
```

```css
img {
  width: 48px;
  height: 136px;
  image-rendering: pixelated;
}
```

### Technique 2: Crisp Pixel Art in Canvas

Set the canvas `width`/`height` attributes to the original pixel art resolution, then use CSS `width`/`height` for scaling (e.g., 4x scale: 128 pixels to 512px CSS width).

```html
<canvas id="game" width="128" height="128">A cat</canvas>
```

```css
canvas {
  width: 512px;
  height: 512px;
  image-rendering: pixelated;
}
```

```javascript
const ctx = document.getElementById("game").getContext("2d");

const image = new Image();
image.onload = () => {
  ctx.drawImage(image, 0, 0);
};
image.src = "cat.png";
```

### Technique 3: Arbitrary Canvas Scaling with Correction

For non-integer scale factors, image pixels must align to canvas pixels at integer multiples:

```javascript
const ctx = document.getElementById("game").getContext("2d");
ctx.scale(0.8, 0.8);

const image = new Image();
image.onload = () => {
  // Correct formula: dWidth = sWidth / xScale * n (where n is an integer)
  ctx.drawImage(image, 0, 0, 128, 128, 0, 0, 128 / 0.8, 128 / 0.8);
};
image.src = "cat.png";
```

When using `drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)`:
- `dWidth` must equal `sWidth / xScale * n`
- `dHeight` must equal `sHeight / yScale * m`
- Where `n` and `m` are positive integers (1, 2, 3, etc.)

### Known Limitations

**devicePixelRatio misalignment:** When `devicePixelRatio` is not an integer (e.g., at 110% browser zoom), pixels may render unevenly because CSS pixels cannot perfectly map to device pixels. This creates a non-uniform appearance without an easy solution.

### Best Practices

1. Use integer scale factors (2x, 3x, 4x) whenever possible.
2. Preserve the aspect ratio -- scale width and height equally.
3. Test across different browser zoom levels.
4. Avoid fractional canvas scale factors or drawImage dimensions.
5. Include descriptive `aria-label` attributes on canvas elements for accessibility.
