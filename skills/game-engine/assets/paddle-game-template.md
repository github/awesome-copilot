# Paddle Game Template (2D Breakout)

A complete step-by-step guide for building a 2D Breakout game with pure JavaScript and the HTML5 Canvas API. This template walks through every stage of development, from setting up the canvas to implementing a lives system and polished game loop.

**What you will build:** A classic breakout/paddle game where the player controls a paddle to bounce a ball and destroy a field of bricks, with score tracking, win/lose conditions, keyboard and mouse controls, and a lives system.

**Prerequisites:** Basic to intermediate JavaScript knowledge and familiarity with HTML.

**Source:** Based on the [MDN 2D Breakout Game Tutorial](https://developer.mozilla.org/en-US/docs/Games/Tutorials/2D_Breakout_game_pure_JavaScript).

---

## Step 1: Create the Canvas and Draw on It

The first step is setting up the HTML document with a `<canvas>` element and learning to draw basic shapes using the 2D rendering context.

### HTML Structure

Create your base HTML file with an embedded canvas element:

```html
<!doctype html>
<html lang="en-US">
  <head>
    <meta charset="utf-8" />
    <title>Gamedev Canvas Workshop</title>
    <style>
      * {
        padding: 0;
        margin: 0;
      }
      canvas {
        background: #eeeeee;
        display: block;
        margin: 0 auto;
      }
    </style>
  </head>
  <body>
    <canvas id="myCanvas" width="480" height="320"></canvas>

    <script>
      // JavaScript code goes here
    </script>
  </body>
</html>
```

### Getting the Canvas Reference and 2D Context

The canvas element provides a drawing surface. You access it through a 2D rendering context:

```javascript
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");
```

- `canvas` is a reference to the HTML `<canvas>` element.
- `ctx` is the 2D rendering context object, which provides all drawing methods.

### Drawing a Filled Rectangle

Use `rect()` to define a rectangle and `fill()` to render it:

```javascript
ctx.beginPath();
ctx.rect(20, 40, 50, 50);
ctx.fillStyle = "red";
ctx.fill();
ctx.closePath();
```

- The first two parameters (`20, 40`) set the top-left corner coordinates.
- The second two parameters (`50, 50`) set the width and height.
- `fillStyle` sets the fill color.
- `fill()` renders the shape as a solid fill.

### Drawing a Circle

Use `arc()` to define a circle:

```javascript
ctx.beginPath();
ctx.arc(240, 160, 20, 0, Math.PI * 2, false);
ctx.fillStyle = "green";
ctx.fill();
ctx.closePath();
```

- `240, 160` -- center x, y coordinates.
- `20` -- radius.
- `0` -- start angle (radians).
- `Math.PI * 2` -- end angle (full circle).
- `false` -- draw clockwise.

### Drawing a Stroked Rectangle (Outline Only)

Use `stroke()` instead of `fill()` for outlines, and `strokeStyle` for outline color:

```javascript
ctx.beginPath();
ctx.rect(160, 10, 100, 40);
ctx.strokeStyle = "rgb(0 0 255 / 50%)";
ctx.stroke();
ctx.closePath();
```

- Uses an RGB color with 50% alpha transparency.
- `stroke()` draws only the outline, not a solid fill.

### Key Methods Reference

| Method | Purpose |
|--------|---------|
| `beginPath()` | Start a new drawing path |
| `closePath()` | Close the current path |
| `rect(x, y, width, height)` | Define a rectangle |
| `arc(x, y, radius, startAngle, endAngle, counterclockwise)` | Define a circle or arc |
| `fillStyle` | Set the fill color |
| `fill()` | Fill the shape with the fill color |
| `strokeStyle` | Set the stroke (outline) color |
| `stroke()` | Draw an outline of the shape |

### Complete Code for Step 1

```html
<canvas id="myCanvas" width="480" height="320"></canvas>

<style>
  * { padding: 0; margin: 0; }
  canvas { background: #eeeeee; display: block; margin: 0 auto; }
</style>

<script>
  const canvas = document.getElementById("myCanvas");
  const ctx = canvas.getContext("2d");

  // Filled red square
  ctx.beginPath();
  ctx.rect(20, 40, 50, 50);
  ctx.fillStyle = "red";
  ctx.fill();
  ctx.closePath();

  // Filled green circle
  ctx.beginPath();
  ctx.arc(240, 160, 20, 0, Math.PI * 2, false);
  ctx.fillStyle = "green";
  ctx.fill();
  ctx.closePath();

  // Stroked blue rectangle (semi-transparent)
  ctx.beginPath();
  ctx.rect(160, 10, 100, 40);
  ctx.strokeStyle = "rgb(0 0 255 / 50%)";
  ctx.stroke();
  ctx.closePath();
</script>
```

---

## Step 2: Move the Ball

Now we animate the ball by creating a game loop that redraws the canvas on each frame and updates the ball position using velocity variables.

### Creating the Draw Loop

Define a `draw()` function that executes repeatedly using `setInterval`:

```javascript
function draw() {
  // drawing code
}
setInterval(draw, 10);
```

`setInterval(draw, 10)` calls the `draw` function every 10 milliseconds, creating approximately 100 frames per second.

### Drawing the Ball

Inside the `draw()` function, draw a ball (circle) at a fixed position:

```javascript
ctx.beginPath();
ctx.arc(50, 50, 10, 0, Math.PI * 2);
ctx.fillStyle = "#0095DD";
ctx.fill();
ctx.closePath();
```

### Adding Position Variables

Instead of hardcoded positions, use variables so we can update them each frame. Place these above the `draw()` function:

```javascript
let x = canvas.width / 2;
let y = canvas.height - 30;
```

This starts the ball at the horizontal center, near the bottom of the canvas.

### Adding Velocity Variables

Define speed and direction for horizontal (`dx`) and vertical (`dy`) movement:

```javascript
let dx = 2;
let dy = -2;
```

- `dx = 2` moves the ball 2 pixels right per frame.
- `dy = -2` moves the ball 2 pixels up per frame (negative y is upward on canvas).

### Updating Position Each Frame

Add position updates at the end of the `draw()` function:

```javascript
x += dx;
y += dy;
```

### Clearing the Canvas

Without clearing, the ball leaves a trail. Add `clearRect()` at the start of each frame:

```javascript
ctx.clearRect(0, 0, canvas.width, canvas.height);
```

### Refactoring Into a Separate drawBall() Function

For clean, maintainable code, separate the ball-drawing logic:

```javascript
function drawBall() {
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fillStyle = "#0095DD";
  ctx.fill();
  ctx.closePath();
}
```

### Complete Code for Step 2

```javascript
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

let x = canvas.width / 2;
let y = canvas.height - 30;
let dx = 2;
let dy = -2;

function drawBall() {
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fillStyle = "#0095DD";
  ctx.fill();
  ctx.closePath();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBall();
  x += dx;
  y += dy;
}

setInterval(draw, 10);
```

**Key concepts:**
- **Animation loop**: `setInterval(draw, 10)` continuously redraws the scene.
- **Position variables**: `x` and `y` track the ball's current location.
- **Velocity variables**: `dx` and `dy` determine movement per frame.
- **Canvas clearing**: `clearRect()` removes the previous frame before drawing the new one.

---

## Step 3: Bounce Off the Walls

We add collision detection so the ball bounces off the canvas edges instead of disappearing.

### Defining the Ball Radius

Extract the ball radius into a named constant for reuse in collision calculations:

```javascript
const ballRadius = 10;
```

Update `drawBall()` to use this variable:

```javascript
function drawBall() {
  ctx.beginPath();
  ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#0095DD";
  ctx.fill();
  ctx.closePath();
}
```

### Basic Wall Collision (Without Radius Adjustment)

The simplest approach checks if the next ball position goes beyond the canvas boundaries:

```javascript
// Left and right walls
if (x + dx > canvas.width || x + dx < 0) {
  dx = -dx;
}

// Top and bottom walls
if (y + dy > canvas.height || y + dy < 0) {
  dy = -dy;
}
```

Reversing `dx` or `dy` (multiplying by -1) changes the ball's direction.

### Improved Collision (Accounting for Ball Radius)

The basic version lets the ball sink halfway into the wall before bouncing. To fix this, account for the ball's radius:

```javascript
// Left and right walls
if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) {
  dx = -dx;
}

// Top and bottom walls
if (y + dy > canvas.height - ballRadius || y + dy < ballRadius) {
  dy = -dy;
}
```

### Collision Detection Conditions

| Wall | Condition | Action |
|------|-----------|--------|
| **Left** | `x + dx < ballRadius` | `dx = -dx` |
| **Right** | `x + dx > canvas.width - ballRadius` | `dx = -dx` |
| **Top** | `y + dy < ballRadius` | `dy = -dy` |
| **Bottom** | `y + dy > canvas.height - ballRadius` | `dy = -dy` |

### Complete Code for Step 3

```javascript
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");
const ballRadius = 10;

let x = canvas.width / 2;
let y = canvas.height - 30;
let dx = 2;
let dy = -2;

function drawBall() {
  ctx.beginPath();
  ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#0095DD";
  ctx.fill();
  ctx.closePath();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBall();

  // Collision detection - left and right walls
  if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) {
    dx = -dx;
  }

  // Collision detection - top and bottom walls
  if (y + dy > canvas.height - ballRadius || y + dy < ballRadius) {
    dy = -dy;
  }

  x += dx;
  y += dy;
}

setInterval(draw, 10);
```

---

## Step 4: Paddle and Keyboard Controls

Now we add a player-controlled paddle at the bottom of the screen and wire up keyboard input (left/right arrow keys).

### Defining Paddle Variables

```javascript
const paddleHeight = 10;
const paddleWidth = 75;
let paddleX = (canvas.width - paddleWidth) / 2;
```

- `paddleHeight` and `paddleWidth` define the paddle dimensions.
- `paddleX` starts the paddle centered horizontally. It is a `let` because it will change as the player moves it.

### Drawing the Paddle

Create a `drawPaddle()` function. The paddle sits at the very bottom of the canvas:

```javascript
function drawPaddle() {
  ctx.beginPath();
  ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
  ctx.fillStyle = "#0095DD";
  ctx.fill();
  ctx.closePath();
}
```

- The y-position is `canvas.height - paddleHeight`, placing it flush with the bottom edge.

### Keyboard State Variables

Track whether arrow keys are currently pressed:

```javascript
let rightPressed = false;
let leftPressed = false;
```

### Event Listeners for Key Presses

Register handlers for `keydown` (key pressed) and `keyup` (key released):

```javascript
document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);
```

### Key Handler Functions

Set the boolean flags based on which key is pressed or released:

```javascript
function keyDownHandler(e) {
  if (e.key === "Right" || e.key === "ArrowRight") {
    rightPressed = true;
  } else if (e.key === "Left" || e.key === "ArrowLeft") {
    leftPressed = true;
  }
}

function keyUpHandler(e) {
  if (e.key === "Right" || e.key === "ArrowRight") {
    rightPressed = false;
  } else if (e.key === "Left" || e.key === "ArrowLeft") {
    leftPressed = false;
  }
}
```

Both `"ArrowRight"` (modern browsers) and `"Right"` (legacy IE/Edge) are checked for compatibility.

### Paddle Movement Logic (With Boundary Checking)

Add this inside the `draw()` function to move the paddle based on key state, while keeping it within canvas bounds:

```javascript
if (rightPressed) {
  paddleX = Math.min(paddleX + 7, canvas.width - paddleWidth);
} else if (leftPressed) {
  paddleX = Math.max(paddleX - 7, 0);
}
```

- The paddle moves 7 pixels per frame.
- `Math.min` prevents the paddle from going past the right edge.
- `Math.max` prevents it from going past the left edge.

### Complete Code for Step 4

```javascript
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");
const ballRadius = 10;

let x = canvas.width / 2;
let y = canvas.height - 30;
let dx = 2;
let dy = -2;

const paddleHeight = 10;
const paddleWidth = 75;
let paddleX = (canvas.width - paddleWidth) / 2;

let rightPressed = false;
let leftPressed = false;

document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);

function keyDownHandler(e) {
  if (e.key === "Right" || e.key === "ArrowRight") {
    rightPressed = true;
  } else if (e.key === "Left" || e.key === "ArrowLeft") {
    leftPressed = true;
  }
}

function keyUpHandler(e) {
  if (e.key === "Right" || e.key === "ArrowRight") {
    rightPressed = false;
  } else if (e.key === "Left" || e.key === "ArrowLeft") {
    leftPressed = false;
  }
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#0095DD";
  ctx.fill();
  ctx.closePath();
}

function drawPaddle() {
  ctx.beginPath();
  ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
  ctx.fillStyle = "#0095DD";
  ctx.fill();
  ctx.closePath();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBall();
  drawPaddle();

  if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) {
    dx = -dx;
  }
  if (y + dy > canvas.height - ballRadius || y + dy < ballRadius) {
    dy = -dy;
  }

  if (rightPressed) {
    paddleX = Math.min(paddleX + 7, canvas.width - paddleWidth);
  } else if (leftPressed) {
    paddleX = Math.max(paddleX - 7, 0);
  }

  x += dx;
  y += dy;
}

setInterval(draw, 10);
```

---

## Step 5: Game Over

We replace the bottom-wall bounce with actual game logic: the ball should bounce off the paddle, but if it misses, it is game over.

### Storing the Interval Reference

To stop the game loop on game over, store the interval ID:

```javascript
let interval = 0;
```

Then assign the return value of `setInterval`:

```javascript
interval = setInterval(draw, 10);
```

### Implementing Game Over and Paddle Collision

Replace the bottom-wall collision check. Instead of bouncing off the bottom edge, we now check whether the ball hits the paddle or misses it:

```javascript
if (y + dy < ballRadius) {
  // Ball hits top wall -- bounce
  dy = -dy;
} else if (y + dy > canvas.height - ballRadius) {
  // Ball reaches bottom edge
  if (x > paddleX && x < paddleX + paddleWidth) {
    // Ball hits paddle -- bounce
    dy = -dy;
  } else {
    // Ball missed the paddle -- game over
    alert("GAME OVER");
    document.location.reload();
    clearInterval(interval);
  }
}
```

**How paddle collision works:**
- `x > paddleX` -- the ball is past the paddle's left edge.
- `x < paddleX + paddleWidth` -- the ball is before the paddle's right edge.
- If both are true, the ball is above the paddle, so it bounces.
- If the ball reaches the bottom without hitting the paddle, the game ends.

### Complete Code for Step 5

```javascript
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");
const ballRadius = 10;

let x = canvas.width / 2;
let y = canvas.height - 30;
let dx = 2;
let dy = -2;

const paddleHeight = 10;
const paddleWidth = 75;
let paddleX = (canvas.width - paddleWidth) / 2;

let rightPressed = false;
let leftPressed = false;
let interval = 0;

document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);

function keyDownHandler(e) {
  if (e.key === "Right" || e.key === "ArrowRight") {
    rightPressed = true;
  } else if (e.key === "Left" || e.key === "ArrowLeft") {
    leftPressed = true;
  }
}

function keyUpHandler(e) {
  if (e.key === "Right" || e.key === "ArrowRight") {
    rightPressed = false;
  } else if (e.key === "Left" || e.key === "ArrowLeft") {
    leftPressed = false;
  }
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#0095DD";
  ctx.fill();
  ctx.closePath();
}

function drawPaddle() {
  ctx.beginPath();
  ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
  ctx.fillStyle = "#0095DD";
  ctx.fill();
  ctx.closePath();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBall();
  drawPaddle();

  // Left and right wall collision
  if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) {
    dx = -dx;
  }

  // Top wall collision
  if (y + dy < ballRadius) {
    dy = -dy;
  } else if (y + dy > canvas.height - ballRadius) {
    // Bottom edge: paddle collision or game over
    if (x > paddleX && x < paddleX + paddleWidth) {
      dy = -dy;
    } else {
      alert("GAME OVER");
      document.location.reload();
      clearInterval(interval);
    }
  }

  // Paddle movement
  if (rightPressed) {
    paddleX = Math.min(paddleX + 7, canvas.width - paddleWidth);
  } else if (leftPressed) {
    paddleX = Math.max(paddleX - 7, 0);
  }

  x += dx;
  y += dy;
}

interval = setInterval(draw, 10);
```

---

## Step 6: Build the Brick Field

Now we create the grid of bricks that the ball will destroy. The bricks are stored in a 2D array and drawn in rows and columns.

### Brick Configuration Variables

Define constants that control the layout of the brick field:

```javascript
const brickRowCount = 3;
const brickColumnCount = 5;
const brickWidth = 75;
const brickHeight = 20;
const brickPadding = 10;
const brickOffsetTop = 30;
const brickOffsetLeft = 30;
```

- `brickRowCount` / `brickColumnCount` -- how many rows and columns of bricks.
- `brickWidth` / `brickHeight` -- dimensions of each individual brick.
- `brickPadding` -- space between bricks.
- `brickOffsetTop` / `brickOffsetLeft` -- distance from the top and left canvas edges to the first brick.

### Creating the Bricks 2D Array

Use nested loops to create a 2D array. Each brick stores its `x` and `y` position (initially `0`, calculated during drawing):

```javascript
const bricks = [];
for (let c = 0; c < brickColumnCount; c++) {
  bricks[c] = [];
  for (let r = 0; r < brickRowCount; r++) {
    bricks[c][r] = { x: 0, y: 0 };
  }
}
```

### The drawBricks() Function

Loop through every brick, calculate its position, store it, and draw it:

```javascript
function drawBricks() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
      const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
      bricks[c][r].x = brickX;
      bricks[c][r].y = brickY;
      ctx.beginPath();
      ctx.rect(brickX, brickY, brickWidth, brickHeight);
      ctx.fillStyle = "#0095DD";
      ctx.fill();
      ctx.closePath();
    }
  }
}
```

**Position calculation formula:**
- `brickX = column * (brickWidth + brickPadding) + brickOffsetLeft`
- `brickY = row * (brickHeight + brickPadding) + brickOffsetTop`

This creates an evenly-spaced grid with consistent padding and margins.

### Calling drawBricks() in the Game Loop

Add the call at the beginning of your `draw()` function, after clearing the canvas:

```javascript
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBricks();
  drawBall();
  drawPaddle();
  // ... rest of draw function
}
```

### Complete Code for Step 6

```javascript
const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");
const ballRadius = 10;

let x = canvas.width / 2;
let y = canvas.height - 30;
let dx = 2;
let dy = -2;

const paddleHeight = 10;
const paddleWidth = 75;
let paddleX = (canvas.width - paddleWidth) / 2;

let rightPressed = false;
let leftPressed = false;
let interval = 0;

const brickRowCount = 3;
const brickColumnCount = 5;
const brickWidth = 75;
const brickHeight = 20;
const brickPadding = 10;
const brickOffsetTop = 30;
const brickOffsetLeft = 30;

const bricks = [];
for (let c = 0; c < brickColumnCount; c++) {
  bricks[c] = [];
  for (let r = 0; r < brickRowCount; r++) {
    bricks[c][r] = { x: 0, y: 0 };
  }
}

document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);

function keyDownHandler(e) {
  if (e.key === "Right" || e.key === "ArrowRight") {
    rightPressed = true;
  } else if (e.key === "Left" || e.key === "ArrowLeft") {
    leftPressed = true;
  }
}

function keyUpHandler(e) {
  if (e.key === "Right" || e.key === "ArrowRight") {
    rightPressed = false;
  } else if (e.key === "Left" || e.key === "ArrowLeft") {
    leftPressed = false;
  }
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#0095DD";
  ctx.fill();
  ctx.closePath();
}

function drawPaddle() {
  ctx.beginPath();
  ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
  ctx.fillStyle = "#0095DD";
  ctx.fill();
  ctx.closePath();
}

function drawBricks() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
      const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
      bricks[c][r].x = brickX;
      bricks[c][r].y = brickY;
      ctx.beginPath();
      ctx.rect(brickX, brickY, brickWidth, brickHeight);
      ctx.fillStyle = "#0095DD";
      ctx.fill();
      ctx.closePath();
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBricks();
  drawBall();
  drawPaddle();

  if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) {
    dx = -dx;
  }
  if (y + dy < ballRadius) {
    dy = -dy;
  } else if (y + dy > canvas.height - ballRadius) {
    if (x > paddleX && x < paddleX + paddleWidth) {
      dy = -dy;
    } else {
      alert("GAME OVER");
      document.location.reload();
      clearInterval(interval);
    }
  }

  if (rightPressed) {
    paddleX = Math.min(paddleX + 7, canvas.width - paddleWidth);
  } else if (leftPressed) {
    paddleX = Math.max(paddleX - 7, 0);
  }

  x += dx;
  y += dy;
}

interval = setInterval(draw, 10);
```

---

## Step 7: Collision Detection

With bricks on screen, we need to detect when the ball hits one and make it disappear. Each brick gets a `status` property: `1` means visible, `0` means destroyed.

### Adding the Status Property to Bricks

Update the brick initialization to include a `status` flag:

```javascript
const bricks = [];
for (let c = 0; c < brickColumnCount; c++) {
  bricks[c] = [];
  for (let r = 0; r < brickRowCount; r++) {
    bricks[c][r] = { x: 0, y: 0, status: 1 };
  }
}
```

### The collisionDetection() Function

Loop through every brick and check if the ball's center is within the brick's bounding box:

```javascript
function collisionDetection() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      const b = bricks[c][r];
      if (b.status === 1) {
        if (
          x > b.x &&
          x < b.x + brickWidth &&
          y > b.y &&
          y < b.y + brickHeight
        ) {
          dy = -dy;
          b.status = 0;
        }
      }
    }
  }
}
```

**Collision conditions (all four must be true simultaneously):**
- `x > b.x` -- ball center is to the right of the brick's left edge.
- `x < b.x + brickWidth` -- ball center is to the left of the brick's right edge.
- `y > b.y` -- ball center is below the brick's top edge.
- `y < b.y + brickHeight` -- ball center is above the brick's bottom edge.

When a collision is detected:
- `dy = -dy` reverses the ball's vertical direction (bounce).
- `b.status = 0` marks the brick as destroyed.

### Updating drawBricks() to Respect Status

Only draw bricks that are still active (`status === 1`):

```javascript
function drawBricks() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      if (bricks[c][r].status === 1) {
        const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
        const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
        bricks[c][r].x = brickX;
        bricks[c][r].y = brickY;
        ctx.beginPath();
        ctx.rect(brickX, brickY, brickWidth, brickHeight);
        ctx.fillStyle = "#0095DD";
        ctx.fill();
        ctx.closePath();
      }
    }
  }
}
```

### Calling collisionDetection() in the Game Loop

Add the call in your `draw()` function, after drawing all elements:

```javascript
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBricks();
  drawBall();
  drawPaddle();
  collisionDetection();
  // ... rest of draw function
}
```

---

## Step 8: Track the Score and Win

We add a score counter that increments each time a brick is destroyed, and a win condition that triggers when all bricks are gone.

### Initializing the Score

```javascript
let score = 0;
```

### The drawScore() Function

Display the current score on the canvas using text rendering:

```javascript
function drawScore() {
  ctx.font = "16px Arial";
  ctx.fillStyle = "#0095DD";
  ctx.fillText(`Score: ${score}`, 8, 20);
}
```

- `ctx.font` sets the font size and family (like CSS).
- `ctx.fillText(text, x, y)` renders text at the given coordinates.
- Position `(8, 20)` places the score in the top-left corner.

### Incrementing the Score

In the `collisionDetection()` function, increment the score when a brick is hit:

```javascript
dy = -dy;
b.status = 0;
score++;
```

### Adding the Win Condition

After incrementing the score, check if the player has destroyed all bricks:

```javascript
score++;
if (score === brickRowCount * brickColumnCount) {
  alert("YOU WIN, CONGRATULATIONS!");
  document.location.reload();
  clearInterval(interval);
}
```

The total number of bricks is `brickRowCount * brickColumnCount`. When the score reaches that number, every brick has been destroyed.

### Complete collisionDetection() with Score and Win

```javascript
function collisionDetection() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      const b = bricks[c][r];
      if (b.status === 1) {
        if (
          x > b.x &&
          x < b.x + brickWidth &&
          y > b.y &&
          y < b.y + brickHeight
        ) {
          dy = -dy;
          b.status = 0;
          score++;
          if (score === brickRowCount * brickColumnCount) {
            alert("YOU WIN, CONGRATULATIONS!");
            document.location.reload();
            clearInterval(interval);
          }
        }
      }
    }
  }
}
```

### Calling drawScore() in the Game Loop

Add the call in your `draw()` function:

```javascript
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBricks();
  drawBall();
  drawPaddle();
  drawScore();
  collisionDetection();
  // ... rest of draw function
}
```

### Canvas Text Methods Reference

| Method/Property | Purpose |
|-----------------|---------|
| `ctx.font` | Set font size and family |
| `ctx.fillStyle` | Set text color |
| `ctx.fillText(text, x, y)` | Draw filled text at coordinates |

---

## Step 9: Mouse Controls

In addition to keyboard controls, we add mouse support so the player can move the paddle by moving the mouse.

### Adding the mousemove Event Listener

Register the handler alongside the existing keyboard listeners:

```javascript
document.addEventListener("mousemove", mouseMoveHandler);
```

### The mouseMoveHandler Function

Calculate the mouse's horizontal position relative to the canvas and update the paddle position:

```javascript
function mouseMoveHandler(e) {
  const relativeX = e.clientX - canvas.offsetLeft;
  if (relativeX > 0 && relativeX < canvas.width) {
    paddleX = relativeX - paddleWidth / 2;
  }
}
```

**How it works:**
- `e.clientX` -- the mouse's horizontal position in the browser viewport.
- `canvas.offsetLeft` -- the distance from the canvas's left edge to the viewport's left edge.
- `relativeX` -- the mouse position relative to the canvas (not the viewport).
- The boundary check (`relativeX > 0 && relativeX < canvas.width`) ensures the paddle only moves when the mouse is over the canvas.
- `paddleX = relativeX - paddleWidth / 2` centers the paddle under the mouse cursor by subtracting half the paddle width.

### Complete Event Listener Setup (Keyboard + Mouse)

```javascript
document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);
document.addEventListener("mousemove", mouseMoveHandler);
```

Both control methods work simultaneously. The player can use arrow keys or mouse -- or switch between them at any time.

---

## Step 10: Finishing Up

The final step adds a lives system (so the player gets multiple chances) and upgrades the game loop from `setInterval` to `requestAnimationFrame` for smoother rendering.

### Adding the Lives Variable

```javascript
let lives = 3;
```

### The drawLives() Function

Display the remaining lives in the top-right corner:

```javascript
function drawLives() {
  ctx.font = "16px Arial";
  ctx.fillStyle = "#0095DD";
  ctx.fillText(`Lives: ${lives}`, canvas.width - 65, 20);
}
```

### Implementing the Lives System

Replace the immediate game-over logic with a lives-based system. When the ball misses the paddle:

```javascript
if (y + dy < ballRadius) {
  dy = -dy;
} else if (y + dy > canvas.height - ballRadius) {
  if (x > paddleX && x < paddleX + paddleWidth) {
    dy = -dy;
  } else {
    lives--;
    if (!lives) {
      alert("GAME OVER");
      document.location.reload();
    } else {
      // Reset ball and paddle positions
      x = canvas.width / 2;
      y = canvas.height - 30;
      dx = 2;
      dy = -2;
      paddleX = (canvas.width - paddleWidth) / 2;
    }
  }
}
```

**What happens when a life is lost:**
- `lives--` decrements the lives counter.
- If `lives` reaches `0`, the game ends with an alert and page reload.
- Otherwise, the ball resets to center-bottom, velocity resets, and the paddle resets to center.

### Upgrading to requestAnimationFrame

Replace `setInterval` with `requestAnimationFrame` for a smoother, browser-optimized game loop:

**Old approach (remove):**
```javascript
interval = setInterval(draw, 10);
```

**New approach:**
Add `requestAnimationFrame(draw)` at the end of the `draw()` function:

```javascript
function draw() {
  // ... all drawing and logic ...
  requestAnimationFrame(draw);
}

// Start the game by calling draw() once:
draw();
```

`requestAnimationFrame` lets the browser schedule rendering at the optimal frame rate (typically 60fps), which is more efficient than a fixed 10ms interval.

### Calling drawLives() in the Game Loop

```javascript
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBricks();
  drawBall();
  drawPaddle();
  drawScore();
  drawLives();
  collisionDetection();
  // ... rest of logic ...
  requestAnimationFrame(draw);
}
```

---

## Complete Final Game Code

Below is the entire game in a single, self-contained HTML file. This is the final product of all 10 steps combined.

```html
<!doctype html>
<html lang="en-US">
  <head>
    <meta charset="utf-8" />
    <title>2D Breakout Game</title>
    <style>
      * {
        padding: 0;
        margin: 0;
      }
      canvas {
        background: #eeeeee;
        display: block;
        margin: 0 auto;
      }
    </style>
  </head>
  <body>
    <canvas id="myCanvas" width="480" height="320"></canvas>

    <script>
      const canvas = document.getElementById("myCanvas");
      const ctx = canvas.getContext("2d");

      // --- Ball ---
      const ballRadius = 10;
      let x = canvas.width / 2;
      let y = canvas.height - 30;
      let dx = 2;
      let dy = -2;

      // --- Paddle ---
      const paddleHeight = 10;
      const paddleWidth = 75;
      let paddleX = (canvas.width - paddleWidth) / 2;

      // --- Controls ---
      let rightPressed = false;
      let leftPressed = false;

      // --- Bricks ---
      const brickRowCount = 3;
      const brickColumnCount = 5;
      const brickWidth = 75;
      const brickHeight = 20;
      const brickPadding = 10;
      const brickOffsetTop = 30;
      const brickOffsetLeft = 30;

      const bricks = [];
      for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
          bricks[c][r] = { x: 0, y: 0, status: 1 };
        }
      }

      // --- Score and Lives ---
      let score = 0;
      let lives = 3;

      // =====================
      // Event Listeners
      // =====================
      document.addEventListener("keydown", keyDownHandler);
      document.addEventListener("keyup", keyUpHandler);
      document.addEventListener("mousemove", mouseMoveHandler);

      function keyDownHandler(e) {
        if (e.key === "Right" || e.key === "ArrowRight") {
          rightPressed = true;
        } else if (e.key === "Left" || e.key === "ArrowLeft") {
          leftPressed = true;
        }
      }

      function keyUpHandler(e) {
        if (e.key === "Right" || e.key === "ArrowRight") {
          rightPressed = false;
        } else if (e.key === "Left" || e.key === "ArrowLeft") {
          leftPressed = false;
        }
      }

      function mouseMoveHandler(e) {
        const relativeX = e.clientX - canvas.offsetLeft;
        if (relativeX > 0 && relativeX < canvas.width) {
          paddleX = relativeX - paddleWidth / 2;
        }
      }

      // =====================
      // Collision Detection
      // =====================
      function collisionDetection() {
        for (let c = 0; c < brickColumnCount; c++) {
          for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
              if (
                x > b.x &&
                x < b.x + brickWidth &&
                y > b.y &&
                y < b.y + brickHeight
              ) {
                dy = -dy;
                b.status = 0;
                score++;
                if (score === brickRowCount * brickColumnCount) {
                  alert("YOU WIN, CONGRATULATIONS!");
                  document.location.reload();
                }
              }
            }
          }
        }
      }

      // =====================
      // Drawing Functions
      // =====================
      function drawBall() {
        ctx.beginPath();
        ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#0095DD";
        ctx.fill();
        ctx.closePath();
      }

      function drawPaddle() {
        ctx.beginPath();
        ctx.rect(
          paddleX,
          canvas.height - paddleHeight,
          paddleWidth,
          paddleHeight
        );
        ctx.fillStyle = "#0095DD";
        ctx.fill();
        ctx.closePath();
      }

      function drawBricks() {
        for (let c = 0; c < brickColumnCount; c++) {
          for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1) {
              const brickX =
                c * (brickWidth + brickPadding) + brickOffsetLeft;
              const brickY =
                r * (brickHeight + brickPadding) + brickOffsetTop;
              bricks[c][r].x = brickX;
              bricks[c][r].y = brickY;
              ctx.beginPath();
              ctx.rect(brickX, brickY, brickWidth, brickHeight);
              ctx.fillStyle = "#0095DD";
              ctx.fill();
              ctx.closePath();
            }
          }
        }
      }

      function drawScore() {
        ctx.font = "16px Arial";
        ctx.fillStyle = "#0095DD";
        ctx.fillText(`Score: ${score}`, 8, 20);
      }

      function drawLives() {
        ctx.font = "16px Arial";
        ctx.fillStyle = "#0095DD";
        ctx.fillText(`Lives: ${lives}`, canvas.width - 65, 20);
      }

      // =====================
      // Main Game Loop
      // =====================
      function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBricks();
        drawBall();
        drawPaddle();
        drawScore();
        drawLives();
        collisionDetection();

        // Left and right wall collision
        if (
          x + dx > canvas.width - ballRadius ||
          x + dx < ballRadius
        ) {
          dx = -dx;
        }

        // Top wall collision
        if (y + dy < ballRadius) {
          dy = -dy;
        } else if (y + dy > canvas.height - ballRadius) {
          // Bottom edge: paddle collision or lose a life
          if (x > paddleX && x < paddleX + paddleWidth) {
            dy = -dy;
          } else {
            lives--;
            if (!lives) {
              alert("GAME OVER");
              document.location.reload();
            } else {
              x = canvas.width / 2;
              y = canvas.height - 30;
              dx = 2;
              dy = -2;
              paddleX = (canvas.width - paddleWidth) / 2;
            }
          }
        }

        // Paddle movement (keyboard)
        if (rightPressed) {
          paddleX = Math.min(
            paddleX + 7,
            canvas.width - paddleWidth
          );
        } else if (leftPressed) {
          paddleX = Math.max(paddleX - 7, 0);
        }

        x += dx;
        y += dy;
        requestAnimationFrame(draw);
      }

      draw();
    </script>
  </body>
</html>
```

---

## Quick Reference: All Game Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `canvas` | const | Reference to the HTML canvas element |
| `ctx` | const | 2D rendering context |
| `ballRadius` | const | Radius of the ball (10) |
| `x`, `y` | let | Current ball position |
| `dx`, `dy` | let | Ball velocity (pixels per frame) |
| `paddleHeight` | const | Height of the paddle (10) |
| `paddleWidth` | const | Width of the paddle (75) |
| `paddleX` | let | Current horizontal position of the paddle |
| `rightPressed` | let | Whether the right arrow key is held down |
| `leftPressed` | let | Whether the left arrow key is held down |
| `brickRowCount` | const | Number of brick rows (3) |
| `brickColumnCount` | const | Number of brick columns (5) |
| `brickWidth` | const | Width of each brick (75) |
| `brickHeight` | const | Height of each brick (20) |
| `brickPadding` | const | Space between bricks (10) |
| `brickOffsetTop` | const | Distance from top of canvas to first brick row (30) |
| `brickOffsetLeft` | const | Distance from left of canvas to first brick column (30) |
| `bricks` | const | 2D array holding all brick objects |
| `score` | let | Current player score |
| `lives` | let | Remaining lives (starts at 3) |

## Quick Reference: All Functions

| Function | Purpose |
|----------|---------|
| `keyDownHandler(e)` | Sets `rightPressed` or `leftPressed` to `true` on key press |
| `keyUpHandler(e)` | Sets `rightPressed` or `leftPressed` to `false` on key release |
| `mouseMoveHandler(e)` | Moves paddle to follow mouse horizontal position |
| `collisionDetection()` | Checks ball against all active bricks; destroys hit bricks, increments score, checks win |
| `drawBall()` | Renders the ball at current `(x, y)` position |
| `drawPaddle()` | Renders the paddle at current `paddleX` position |
| `drawBricks()` | Renders all bricks with `status === 1` |
| `drawScore()` | Renders the score text in the top-left corner |
| `drawLives()` | Renders the lives text in the top-right corner |
| `draw()` | Main game loop: clears canvas, draws everything, handles collisions, updates positions |
