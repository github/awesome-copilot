# 3D Web Games

A comprehensive reference for building 3D games on the web, covering foundational theory, major frameworks, shader programming, collision detection, and immersive WebXR experiences.

Sources: [MDN Web Docs -- Games Techniques: 3D on the web](https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_on_the_web)

---

## 3D Theory and Fundamentals

Understanding the core concepts behind 3D rendering is essential before working with any framework.

### Coordinate System

WebGL uses the **right-hand coordinate system**:

- **X-axis** -- points to the right
- **Y-axis** -- points up
- **Z-axis** -- points out of the screen toward the viewer

All 3D objects are positioned relative to this coordinate system.

### Vertices, Edges, Faces, and Meshes

- **Vertex** -- a point in 3D space defined by `(x, y, z)` with additional attributes: color (RGBA, values 0.0-1.0), normal (direction the vertex faces, used for lighting), and texture coordinates.
- **Edge** -- a line connecting two vertices.
- **Face** -- a flat surface bounded by edges (e.g., a triangle connecting three vertices).
- **Geometry** -- the structural shape built from vertices, edges, and faces.
- **Material** -- the surface appearance, combining color, texture, roughness, metalness, etc.
- **Mesh** -- geometry combined with a material to produce a renderable 3D object.

### The Rendering Pipeline

The pipeline transforms 3D objects into 2D pixels on screen, in four major stages:

**1. Vertex Processing**

Combines individual vertex data into primitives (triangles, lines, points) and applies transformations:

- **Model transformation** -- positions and orients objects in world space.
- **View transformation** -- positions and orients the virtual camera.
- **Projection transformation** -- defines the camera's field of view (FOV), aspect ratio, near plane, and far plane.
- **Viewport transformation** -- maps the result to the screen viewport.

**2. Rasterization**

Converts 3D primitives into 2D fragments aligned to the pixel grid.

**3. Fragment Processing**

Determines the final color of each fragment using textures and lighting:

- **Textures**: 2D images mapped onto 3D surfaces. Individual texture elements are called *texels*. Texture wrapping repeats images around geometry; texture filtering handles minification and magnification when displayed resolution differs from texture resolution.
- **Lighting (Phong model)**: Four types of light interaction -- **diffuse** (distant directional light like the sun), **specular** (point source highlights like a flashlight), **ambient** (constant global illumination), and **emissive** (light emitted by the object itself).

**4. Output Merging**

Converts 3D fragments into the final 2D pixel grid. Off-screen and occluded objects are culled for efficiency.

### Camera

The camera defines what is visible:

- **Position** -- location in 3D space.
- **Direction** -- where the camera points.
- **Orientation** -- rotation around the viewing axis.

### Practical Tips

- Size and position values in WebGL are unitless; you decide whether they represent millimeters, meters, feet, or anything else.
- Understand the pipeline conceptually before diving into code; the vertex and fragment processing stages are programmable via shaders.
- Every framework (Three.js, Babylon.js, A-Frame, PlayCanvas) abstracts this pipeline, but the fundamentals remain the same.

---

## Frameworks

### Three.js

Three.js is one of the most popular 3D engines for the web. It provides a high-level API over WebGL with a large ecosystem of plugins, examples, and community support.

#### Setup

```html
<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="utf-8" />
    <title>Three.js Demo</title>
    <style>
      html, body, canvas {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        font-size: 0;
      }
    </style>
  </head>
  <body>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r79/three.min.js"></script>
    <script>
      const WIDTH = window.innerWidth;
      const HEIGHT = window.innerHeight;
      /* all code goes here */
    </script>
  </body>
</html>
```

Or install via npm:

```bash
npm install --save three
npm install --save-dev vite
npx vite
```

#### Core Components

**Renderer** -- displays the scene in the browser:

```javascript
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(WIDTH, HEIGHT);
renderer.setClearColor(0xdddddd, 1);
document.body.appendChild(renderer.domElement);
```

**Scene** -- container for all 3D objects, lights, and the camera:

```javascript
const scene = new THREE.Scene();
```

**Camera** -- defines the viewpoint (PerspectiveCamera is most common):

```javascript
const camera = new THREE.PerspectiveCamera(70, WIDTH / HEIGHT);
camera.position.z = 50;
scene.add(camera);
```

Parameters: field of view (degrees), aspect ratio. Other camera types include Orthographic and Cube.

#### Geometry, Material, and Mesh

```javascript
// Geometry defines the shape
const boxGeometry = new THREE.BoxGeometry(10, 10, 10);
const torusGeometry = new THREE.TorusGeometry(7, 1, 16, 32);
const dodecahedronGeometry = new THREE.DodecahedronGeometry(7);

// Material defines the surface appearance
const basicMaterial = new THREE.MeshBasicMaterial({ color: 0x0095dd });   // No lighting
const phongMaterial = new THREE.MeshPhongMaterial({ color: 0xff9500 });   // Glossy
const lambertMaterial = new THREE.MeshLambertMaterial({ color: 0xeaeff2 }); // Matte

// Mesh combines geometry + material
const cube = new THREE.Mesh(boxGeometry, basicMaterial);
cube.position.set(-25, 0, 0);
cube.rotation.set(0.4, 0.2, 0);
scene.add(cube);
```

#### Lighting

```javascript
const light = new THREE.PointLight(0xffffff);
light.position.set(-10, 15, 50);
scene.add(light);
```

Other light types: Ambient, Directional, Hemisphere, Spot.

Note: `MeshBasicMaterial` does not respond to lighting. Use `MeshPhongMaterial` or `MeshLambertMaterial` for lit surfaces.

#### Animation Loop

```javascript
let t = 0;
function render() {
  t += 0.01;
  requestAnimationFrame(render);

  cube.rotation.y += 0.01;                          // continuous rotation
  torus.scale.y = Math.abs(Math.sin(t));             // pulsing scale
  dodecahedron.position.y = -7 * Math.sin(t * 2);   // bobbing position

  renderer.render(scene, camera);
}
render();
```

#### Practical Tips

- Use `Math.abs()` when animating scale with `Math.sin()` to avoid negative scale values.
- The render loop uses `requestAnimationFrame` for smooth, browser-optimized frame updates.
- Consult [Three.js documentation](https://threejs.org/docs/) for the full API.

---

### Babylon.js

Babylon.js is a full-featured 3D engine with a built-in math library, physics support, and extensive documentation.

#### Setup

```html
<script src="https://cdn.babylonjs.com/v7.34.1/babylon.js"></script>
<canvas id="render-canvas"></canvas>
```

#### Engine, Scene, and Render Loop

```javascript
const canvas = document.getElementById("render-canvas");
const engine = new BABYLON.Engine(canvas);

const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color3(0.8, 0.8, 0.8);

function renderLoop() {
  scene.render();
}
engine.runRenderLoop(renderLoop);
```

#### Camera and Lighting

```javascript
const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 0, -10), scene);
const light = new BABYLON.PointLight("light", new BABYLON.Vector3(10, 10, 0), scene);
```

#### Creating Meshes

```javascript
const box = BABYLON.Mesh.CreateBox("box", 2, scene);       // name, size, scene
const torus = BABYLON.Mesh.CreateTorus("torus", 2, 0.5, 15, scene); // name, diameter, thickness, tessellation, scene
const cylinder = BABYLON.Mesh.CreateCylinder("cylinder", 2, 2, 2, 12, 1, scene);
// name, height, topDiameter, bottomDiameter, tessellation, heightSubdivisions, scene
```

#### Materials

```javascript
const boxMaterial = new BABYLON.StandardMaterial("material", scene);
boxMaterial.emissiveColor = new BABYLON.Color3(0, 0.58, 0.86);
box.material = boxMaterial;
```

#### Transforms and Animation

```javascript
box.position.x = 5;
box.rotation.x = -0.2;
box.scaling.x = 1.5;

// Animation inside render loop
let t = 0;
function renderLoop() {
  scene.render();
  t -= 0.01;
  box.rotation.y = t * 2;
  torus.scaling.z = Math.abs(Math.sin(t * 2)) + 0.5;
  cylinder.position.y = Math.sin(t * 3);
}
engine.runRenderLoop(renderLoop);
```

#### Practical Tips

- The `BABYLON` global object contains all framework functions.
- `BABYLON.Vector3` and `BABYLON.Color3` are used extensively for positioning and coloring.
- Babylon.js includes a built-in math library for vectors, colors, and matrices.
- Consult [Babylon.js documentation](https://doc.babylonjs.com/) for advanced features like physics, particles, and post-processing.

---

### A-Frame

A-Frame is Mozilla's declarative, HTML-based framework for building VR/AR experiences on the web. It uses an entity-component system and runs on WebGL under the hood.

#### Setup

```html
<!doctype html>
<html lang="en-US">
  <head>
    <meta charset="utf-8" />
    <title>A-Frame Demo</title>
    <script src="https://aframe.io/releases/1.6.0/aframe.min.js"></script>
    <style>
      body { margin: 0; padding: 0; width: 100%; height: 100%; font-size: 0; }
    </style>
  </head>
  <body>
    <a-scene>
      <!-- entities go here -->
    </a-scene>
  </body>
</html>
```

The `<a-scene>` element is the root container. A-Frame auto-includes a default camera, lighting, and input controls.

#### Primitives and Entities

```html
<!-- Built-in primitive shapes -->
<a-box position="0 1 -3" rotation="0 10 0" color="#4CC3D9"></a-box>
<a-sky color="#DDDDDD"></a-sky>

<!-- Generic entity with explicit geometry and material -->
<a-entity
  geometry="primitive: torus; radius: 1; radiusTubular: 0.1; segmentsTubular: 12;"
  material="color: #EAEFF2; roughness: 0.1; metalness: 0.5;"
  rotation="10 0 0"
  position="-3 1 0">
</a-entity>
```

#### Creating Entities with JavaScript

```javascript
const scene = document.querySelector("a-scene");
const cylinder = document.createElement("a-cylinder");
cylinder.setAttribute("color", "#FF9500");
cylinder.setAttribute("height", "2");
cylinder.setAttribute("radius", "0.75");
cylinder.setAttribute("position", "3 1 0");
scene.appendChild(cylinder);
```

#### Camera and Lighting

```html
<a-camera position="0 1 4" cursor-visible="true" cursor-color="#0095DD" cursor-opacity="0.5">
</a-camera>

<a-light type="directional" color="white" intensity="0.5" position="-1 1 2"></a-light>
<a-light type="ambient" color="white"></a-light>
```

Default controls: WASD keys for movement, mouse for looking around. A VR mode button appears in the bottom-right corner.

#### Animation

Declarative animation via HTML attributes:

```html
<a-box
  color="#0095DD"
  rotation="20 40 0"
  position="0 1 0"
  animation="property: rotation; from: 20 0 0; to: 20 360 0;
    dir: alternate; loop: true; dur: 4000; easing: easeInOutQuad;">
</a-box>
```

Animation properties: `property` (attribute to animate), `from`/`to` (start/end values), `dir` (alternate or normal), `loop` (boolean), `dur` (milliseconds), `easing` (easing function).

Dynamic animation via JavaScript:

```javascript
let t = 0;
function render() {
  t += 0.01;
  requestAnimationFrame(render);
  cylinder.setAttribute("position", `3 ${Math.sin(t * 2) + 1} 0`);
}
render();
```

#### Practical Tips

- A-Frame is ideal for rapid VR/AR prototyping using familiar HTML syntax.
- The entity-component architecture makes it extensible; community plugins add physics, gamepad controls, and more.
- Use `<a-sky>` for background colors or 360-degree images.
- A-Frame supports desktop, mobile (iOS/Android), and VR headsets (Meta Quest, HTC Vive).

---

### PlayCanvas

PlayCanvas is a WebGL game engine with two workflow options:

1. **Engine approach** -- include the PlayCanvas JavaScript library directly in HTML and code from scratch.
2. **Editor approach** -- use the online drag-and-drop visual editor for scene composition.

#### Key Features

- Entity-component system architecture
- Built-in physics engine powered by [ammo.js](https://github.com/kripken/ammo.js/)
- Collision detection
- Audio support
- Input handling (keyboard, mouse, touch, gamepads)
- Resource/asset management

#### Practical Tips

- PlayCanvas excels for team-based game development thanks to its online editor with real-time collaboration.
- The engine-only approach is lightweight and can be embedded in any web page.
- Consult the [PlayCanvas developer documentation](https://developer.playcanvas.com/) for tutorials on entities, components, cameras, lights, materials, and animations.

---

## GLSL Shaders

GLSL (OpenGL Shading Language) is a C-like language that runs directly on the GPU, enabling custom control over the rendering pipeline's vertex and fragment processing stages.

### What Shaders Are

Shaders are small programs that execute on the GPU instead of the CPU. They are strongly typed and rely heavily on vector and matrix mathematics. There are two types relevant to WebGL:

- **Vertex shader** -- runs once per vertex, transforms 3D positions into screen coordinates.
- **Fragment shader** (pixel shader) -- runs once per pixel, determines the final RGBA color.

### Vertex Shader

The vertex shader's job is to set `gl_Position`, a built-in GLSL variable storing the vertex's transformed position:

```glsl
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x, position.y, position.z, 1.0);
}
```

- `projectionMatrix` -- handles perspective or orthographic projection (provided by Three.js).
- `modelViewMatrix` -- combines model and view transformations (provided by Three.js).
- `vec4(x, y, z, w)` -- a 4-component vector; `w` defaults to 1.0 for positional vertices.

You can manipulate vertices directly:

```glsl
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x + 10.0, position.y, position.z + 5.0, 1.0);
}
```

### Fragment Shader

The fragment shader's job is to set `gl_FragColor`, a built-in GLSL variable holding the RGBA color:

```glsl
void main() {
  gl_FragColor = vec4(0.0, 0.58, 0.86, 1.0);
}
```

RGBA components are floats from 0.0 to 1.0. Alpha 0.0 is fully transparent; 1.0 is fully opaque.

### Using Shaders in HTML and Three.js

Embed shader source in script tags with custom type attributes:

```html
<script id="vertexShader" type="x-shader/x-vertex">
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
</script>

<script id="fragmentShader" type="x-shader/x-fragment">
  void main() {
    gl_FragColor = vec4(0.0, 0.58, 0.86, 1.0);
  }
</script>
```

Apply them with `ShaderMaterial`:

```javascript
const shaderMaterial = new THREE.ShaderMaterial({
  vertexShader: document.getElementById("vertexShader").textContent,
  fragmentShader: document.getElementById("fragmentShader").textContent,
});

const cube = new THREE.Mesh(boxGeometry, shaderMaterial);
```

### The Shader Pipeline

1. **Vertex shader** processes each vertex and outputs `gl_Position`.
2. **Rasterization** maps 3D coordinates to 2D screen pixels.
3. **Fragment shader** processes each pixel and outputs `gl_FragColor`.

### Key Concepts

- **Uniforms** -- values passed from JavaScript to the shader, constant across all vertices/fragments in a single draw call (e.g., light position, time).
- **Attributes** -- per-vertex data passed to the vertex shader (e.g., position, normal, UV coordinates).
- **Varyings** -- values passed from the vertex shader to the fragment shader, interpolated across the surface.

### Practical Tips

- Shaders run on the GPU and offload computation from the CPU, which is critical for real-time performance.
- Three.js, Babylon.js, and other frameworks abstract much of the shader setup; pure WebGL requires significantly more boilerplate.
- [ShaderToy](https://www.shadertoy.com/) is an excellent resource for shader examples and inspiration.
- GLSL requires explicit type declarations; always use `1.0` instead of `1` for floats.

---

## Collision Detection

Collision detection determines when 3D objects intersect, which is fundamental for game physics, interaction, and gameplay logic.

### Axis-Aligned Bounding Boxes (AABB)

An AABB wraps an object in a non-rotated rectangular box aligned to the coordinate axes. It is the fastest common collision test because it uses only logical comparisons (no trigonometry).

**Limitation**: AABBs do not rotate with the object. For rotating entities, either resize the bounding box each frame or use bounding spheres instead.

#### Point vs. AABB

Check whether a point lies inside a box by testing all three axes:

```javascript
function isPointInsideAABB(point, box) {
  return (
    point.x >= box.minX &&
    point.x <= box.maxX &&
    point.y >= box.minY &&
    point.y <= box.maxY &&
    point.z >= box.minZ &&
    point.z <= box.maxZ
  );
}
```

#### AABB vs. AABB

Check whether two boxes overlap on all three axes:

```javascript
function intersect(a, b) {
  return (
    a.minX <= b.maxX &&
    a.maxX >= b.minX &&
    a.minY <= b.maxY &&
    a.maxY >= b.minY &&
    a.minZ <= b.maxZ &&
    a.maxZ >= b.minZ
  );
}
```

### Bounding Spheres

Bounding spheres are invariant to rotation (the sphere stays the same regardless of how the object spins), which makes them ideal for rotating entities. However, they fit poorly on non-spherical shapes and cause more false positives.

#### Point vs. Sphere

Check whether the distance from the point to the sphere center is less than the radius:

```javascript
function isPointInsideSphere(point, sphere) {
  const distance = Math.sqrt(
    (point.x - sphere.x) ** 2 +
    (point.y - sphere.y) ** 2 +
    (point.z - sphere.z) ** 2
  );
  return distance < sphere.radius;
}
```

**Performance optimization**: avoid the square root by comparing squared distances:

```javascript
const distanceSqr =
  (point.x - sphere.x) ** 2 +
  (point.y - sphere.y) ** 2 +
  (point.z - sphere.z) ** 2;
return distanceSqr < sphere.radius * sphere.radius;
```

#### Sphere vs. Sphere

Check whether the distance between centers is less than the sum of radii:

```javascript
function intersect(sphere, other) {
  const distance = Math.sqrt(
    (sphere.x - other.x) ** 2 +
    (sphere.y - other.y) ** 2 +
    (sphere.z - other.z) ** 2
  );
  return distance < sphere.radius + other.radius;
}
```

#### Sphere vs. AABB

Find the point on the AABB closest to the sphere center by clamping, then check the distance:

```javascript
function intersect(sphere, box) {
  const x = Math.max(box.minX, Math.min(sphere.x, box.maxX));
  const y = Math.max(box.minY, Math.min(sphere.y, box.maxY));
  const z = Math.max(box.minZ, Math.min(sphere.z, box.maxZ));

  const distance = Math.sqrt(
    (x - sphere.x) ** 2 +
    (y - sphere.y) ** 2 +
    (z - sphere.z) ** 2
  );

  return distance < sphere.radius;
}
```

### Collision Detection with Three.js

Three.js provides built-in `Box3` and `Sphere` objects plus visual helpers for bounding volume collision detection.

#### Creating Bounding Volumes

```javascript
// Box3 from an object (recommended -- accounts for transforms and children)
const knotBBox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
knotBBox.setFromObject(knot);

// Sphere from geometry
const knotBSphere = new THREE.Sphere(
  knot.position,
  knot.geometry.boundingSphere.radius
);
```

**Important**: `setFromObject()` accounts for position, rotation, scale, and child meshes. The geometry's `boundingBox` property does not.

#### Intersection Tests

```javascript
// Point inside box or sphere
knotBBox.containsPoint(point);
knotBSphere.containsPoint(point);

// Box vs. box
knotBBox.intersectsBox(otherBox);

// Sphere vs. sphere
knotBSphere.intersectsSphere(otherSphere);
```

Note: `containsBox()` checks if one box fully encloses another, which is different from `intersectsBox()`.

#### Sphere vs. Box3 (Custom Patch)

Three.js does not natively provide sphere-vs-box testing. Add it manually:

```javascript
THREE.Sphere.__closest = new THREE.Vector3();
THREE.Sphere.prototype.intersectsBox = function (box) {
  THREE.Sphere.__closest.set(this.center.x, this.center.y, this.center.z);
  THREE.Sphere.__closest.clamp(box.min, box.max);
  const distance = this.center.distanceToSquared(THREE.Sphere.__closest);
  return distance < this.radius * this.radius;
};
```

#### BoxHelper for Visual Debugging

`BoxHelper` creates a visible wireframe bounding box around any mesh and simplifies updates:

```javascript
const knotBoxHelper = new THREE.BoxHelper(knot, 0x00ff00);
scene.add(knotBoxHelper);

// After moving or rotating the mesh, update the helper
knot.position.set(-3, 2, 1);
knot.rotation.x = -Math.PI / 4;
knotBoxHelper.update();

// Convert to Box3 for intersection tests
const box3 = new THREE.Box3();
box3.setFromObject(knotBoxHelper);
box3.intersectsBox(otherBox3);
```

Advantages of BoxHelper: auto-resizes with `update()`, includes child meshes, provides visual debugging. Limitation: box volumes only (no sphere helpers).

### Physics Engines

For more sophisticated collision detection and response, use a physics engine:

- **Cannon.js** -- open-source 3D physics engine for JavaScript.
- **ammo.js** -- JavaScript port of the Bullet physics library (used by PlayCanvas).

Physics engines create a *physical body* attached to the visual mesh, with properties like velocity, position, rotation, and torque. A *physical shape* (box, sphere, convex hull) is used for collision calculations.

### Practical Tips

- Use AABBs for axis-aligned, non-rotating objects -- they are the fastest option.
- Use bounding spheres for rotating objects -- the sphere is invariant to rotation.
- For complex shapes, consider compound bounding volumes (multiple primitives combined).
- Avoid `Math.sqrt()` in tight loops; compare squared distances instead.
- For production games, integrate a physics engine rather than writing collision detection from scratch.

---

## WebXR

WebXR is the modern web API for building virtual reality (VR) and augmented reality (AR) experiences in the browser. It replaces the deprecated WebVR API.

### What WebXR Is

The WebXR Device API provides access to XR hardware (headsets, controllers) and enables stereoscopic rendering. It captures real-time data including:

- Headset position and orientation
- Controller position, orientation, velocity, and acceleration
- Input events from XR controllers

### Supported Devices

- Meta Quest
- Valve Index
- PlayStation VR (PSVR2)
- Any device with a WebXR-compatible browser

### Core Concepts

Every WebXR experience requires two things:

1. **Real-time positional data** -- the application continuously receives headset and controller positions in 3D space.
2. **Real-time stereoscopic rendering** -- the application renders two slightly offset views (one for each eye) to the headset's display.

### Framework Support

All major 3D web frameworks support WebXR:

- **A-Frame** -- built-in VR mode button; declarative HTML-based scenes automatically work in VR.
- **Three.js** -- provides WebXR integration via `renderer.xr`. See [Three.js VR documentation](https://threejs.org/docs/#manual/en/introduction/How-to-create-VR-content).
- **Babylon.js** -- built-in WebXR support via the XR Experience Helper.

### Related APIs

- **Gamepad API** -- for non-XR controller inputs (gamepads, joysticks).
- **Device Orientation API** -- for detecting device rotation on mobile devices.

### Design Principles

- Prioritize **immersion** over raw graphics quality or gameplay complexity.
- Users must feel like they are *part of the experience*.
- Basic shapes rendered at high, stable frame rates can be more compelling in VR than detailed graphics at unstable frame rates.
- Experimentation is essential; test frequently on actual hardware.

### Practical Tips

- Start with A-Frame for rapid VR prototyping -- its declarative HTML approach gets you to a working VR scene in minutes.
- Use Three.js or Babylon.js when you need more control over rendering and performance.
- Always test on real headsets; the experience is vastly different from desktop preview.
- Maintain a stable, high frame rate (72-90+ FPS) to prevent motion sickness.
- Consult [MDN WebXR Device API](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API) for the full API reference.
