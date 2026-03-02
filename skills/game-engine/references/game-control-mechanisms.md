# Game Control Mechanisms

This reference covers the primary control mechanisms available for web-based games, including mobile touch, desktop keyboard and mouse, gamepad controllers, and unconventional input methods.

## Mobile Touch Controls

Mobile touch controls are essential for web-based games targeting mobile devices. A mobile-first approach ensures games are accessible on the most widely used platform for HTML5 games.

### Key Events and APIs

The core touch events available in the browser are:

| Event | Description |
|-------|-------------|
| `touchstart` | Fired when the user places a finger on the screen |
| `touchmove` | Fired when the user moves a finger while touching the screen |
| `touchend` | Fired when the user lifts a finger from the screen |
| `touchcancel` | Fired when a touch is cancelled or interrupted (e.g., finger moves off-screen) |

**Registering touch event listeners:**

```javascript
const canvas = document.querySelector("canvas");
canvas.addEventListener("touchstart", handleStart);
canvas.addEventListener("touchmove", handleMove);
canvas.addEventListener("touchend", handleEnd);
canvas.addEventListener("touchcancel", handleCancel);
```

**Touch event properties:**

- `e.touches[0]` -- Access the first touch point (zero-indexed for multitouch).
- `e.touches[0].pageX` / `e.touches[0].pageY` -- Touch coordinates relative to the page.
- Always subtract canvas offset to get position relative to the canvas element.

### Code Examples

**Pure JavaScript touch handler:**

```javascript
document.addEventListener("touchstart", touchHandler);
document.addEventListener("touchmove", touchHandler);

function touchHandler(e) {
  if (e.touches) {
    playerX = e.touches[0].pageX - canvas.offsetLeft - playerWidth / 2;
    playerY = e.touches[0].pageY - canvas.offsetTop - playerHeight / 2;
    e.preventDefault();
  }
}
```

**Phaser framework pointer system:**

Phaser manages touch input through "pointers" representing individual fingers:

```javascript
// Access pointers
this.game.input.activePointer;       // Most recently active pointer
this.game.input.pointer1;            // First pointer
this.game.input.pointer2;            // Second pointer

// Add more pointers (up to 10 total)
this.game.input.addPointer();

// Global input events
this.game.input.onDown.add(itemTouched, this);
this.game.input.onUp.add(itemReleased, this);
this.game.input.onTap.add(itemTapped, this);
this.game.input.onHold.add(itemHeld, this);
```

**Draggable sprite for ship movement:**

```javascript
const player = this.game.add.sprite(30, 30, "ship");
player.inputEnabled = true;
player.input.enableDrag();
player.events.onDragStart.add(onDragStart, this);
player.events.onDragStop.add(onDragStop, this);

function onDragStart(sprite, pointer) {
  console.log(`Dragging at: ${pointer.x}, ${pointer.y}`);
}
```

**Invisible touch area for shooting (right half of screen):**

```javascript
this.buttonShoot = this.add.button(
  this.world.width * 0.5, 0,
  "button-alpha",    // transparent image
  null,
  this
);
this.buttonShoot.onInputDown.add(this.goShootPressed, this);
this.buttonShoot.onInputUp.add(this.goShootReleased, this);
```

**Virtual gamepad plugin:**

```javascript
this.gamepad = this.game.plugins.add(Phaser.Plugin.VirtualGamepad);
this.joystick = this.gamepad.addJoystick(100, 420, 1.2, "gamepad");
this.button = this.gamepad.addButton(400, 420, 1.0, "gamepad");
```

### Best Practices

- Always call `preventDefault()` on touch events to avoid unwanted scrolling and default browser behavior.
- Use invisible button areas rather than visible buttons to avoid covering gameplay.
- Leverage natural touch gestures like dragging, which are more intuitive than on-screen buttons.
- Subtract canvas offset and account for object dimensions when calculating positions.
- Make touchable areas large enough for comfortable interaction.
- Plan for multitouch support. Phaser supports up to 10 simultaneous pointers.
- Use a framework like Phaser for automatic desktop and mobile compatibility.
- Consider virtual gamepad/joystick plugins for advanced touch control UI.

## Desktop with Mouse and Keyboard

Desktop keyboard and mouse controls provide precise input for web games and are the default control scheme for desktop browsers.

### Key Events and APIs

**Keyboard events:**

```javascript
document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);
```

- `event.code` returns readable key identifiers such as `"ArrowLeft"`, `"ArrowRight"`, `"ArrowUp"`, `"ArrowDown"`.
- Use `requestAnimationFrame()` for continuous frame updates.

**Phaser keyboard API:**

```javascript
this.cursors = this.input.keyboard.createCursorKeys();  // Arrow key objects
this.keyLeft = this.input.keyboard.addKey(Phaser.KeyCode.A);  // Custom key binding
// Check key state with .isDown property
// Listen for press events with .onDown.add()
```

**Phaser mouse API:**

```javascript
this.game.input.mousePointer;                    // Mouse position and state
this.game.input.mousePointer.isDown;             // Is any mouse button pressed
this.game.input.mousePointer.x;                  // Mouse X coordinate
this.game.input.mousePointer.y;                  // Mouse Y coordinate
this.game.input.mousePointer.leftButton.isDown;  // Left mouse button
this.game.input.mousePointer.rightButton.isDown; // Right mouse button
this.game.input.activePointer;                   // Platform-independent (mouse + touch)
```

### Code Examples

**Pure JavaScript keyboard state tracking:**

```javascript
let rightPressed = false;
let leftPressed = false;
let upPressed = false;
let downPressed = false;

function keyDownHandler(event) {
  if (event.code === "ArrowRight") rightPressed = true;
  else if (event.code === "ArrowLeft") leftPressed = true;
  if (event.code === "ArrowDown") downPressed = true;
  else if (event.code === "ArrowUp") upPressed = true;
}

function keyUpHandler(event) {
  if (event.code === "ArrowRight") rightPressed = false;
  else if (event.code === "ArrowLeft") leftPressed = false;
  if (event.code === "ArrowDown") downPressed = false;
  else if (event.code === "ArrowUp") upPressed = false;
}
```

**Game loop with input handling:**

```javascript
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (rightPressed) playerX += 5;
  else if (leftPressed) playerX -= 5;
  if (downPressed) playerY += 5;
  else if (upPressed) playerY -= 5;

  ctx.drawImage(img, playerX, playerY);
  requestAnimationFrame(draw);
}
```

**Dual control support (Arrow keys + WASD) in Phaser:**

```javascript
this.cursors = this.input.keyboard.createCursorKeys();
this.keyLeft = this.input.keyboard.addKey(Phaser.KeyCode.A);
this.keyRight = this.input.keyboard.addKey(Phaser.KeyCode.D);
this.keyUp = this.input.keyboard.addKey(Phaser.KeyCode.W);
this.keyDown = this.input.keyboard.addKey(Phaser.KeyCode.S);

// In update:
if (this.cursors.left.isDown || this.keyLeft.isDown) {
  // move left
} else if (this.cursors.right.isDown || this.keyRight.isDown) {
  // move right
}
if (this.cursors.up.isDown || this.keyUp.isDown) {
  // move up
} else if (this.cursors.down.isDown || this.keyDown.isDown) {
  // move down
}
```

**Multiple fire buttons:**

```javascript
this.keyFire1 = this.input.keyboard.addKey(Phaser.KeyCode.X);
this.keyFire2 = this.input.keyboard.addKey(Phaser.KeyCode.SPACEBAR);

if (this.keyFire1.isDown || this.keyFire2.isDown) {
  // fire the weapon
}
```

**Device-specific instructions:**

```javascript
if (this.game.device.desktop) {
  moveText = "Arrow keys or WASD to move";
  shootText = "X or Space to shoot";
} else {
  moveText = "Tap and hold to move";
  shootText = "Tap to shoot";
}
```

### Best Practices

- Support multiple input methods: provide both arrow keys and WASD for movement, and multiple fire buttons (e.g., X and Space).
- Use `activePointer` instead of `mousePointer` to support both mouse and touch input seamlessly.
- Detect device type and display appropriate control instructions to the player.
- Use `requestAnimationFrame()` for smooth animation and check key states in the game loop rather than reacting to individual key presses.
- Allow keyboard shortcuts to skip non-gameplay screens (e.g., Enter to start, any key to skip intro).
- Use Phaser or a similar framework for cross-browser compatibility, as they handle edge cases and browser differences automatically.

## Desktop with Gamepad

The Gamepad API enables web games to detect and respond to gamepad and controller input, bringing console-like experiences to the browser.

### Key Events and APIs

**Core events:**

```javascript
window.addEventListener("gamepadconnected", gamepadHandler);
window.addEventListener("gamepaddisconnected", gamepadHandler);
```

**Gamepad object properties:**

- `controller.id` -- Device identifier string.
- `controller.buttons[]` -- Array of button objects, each with a `.pressed` boolean property.
- `controller.axes[]` -- Array of analog stick values ranging from -1 to 1.

**Standard button/axes mapping (Xbox 360 layout):**

| Input | Index | Type |
|-------|-------|------|
| A Button | 0 | Button |
| B Button | 1 | Button |
| X Button | 2 | Button |
| Y Button | 3 | Button |
| D-Pad Up | 12 | Button |
| D-Pad Down | 13 | Button |
| D-Pad Left | 14 | Button |
| D-Pad Right | 15 | Button |
| Left Stick X | axes[0] | Axis |
| Left Stick Y | axes[1] | Axis |
| Right Stick X | axes[2] | Axis |
| Right Stick Y | axes[3] | Axis |

### Code Examples

**Pure JavaScript connection handler:**

```javascript
let controller = {};
let buttonsPressed = [];

function gamepadHandler(e) {
  controller = e.gamepad;
  console.log(`Gamepad: ${controller.id}`);
}

window.addEventListener("gamepadconnected", gamepadHandler);
```

**Polling button states each frame:**

```javascript
function gamepadUpdateHandler() {
  buttonsPressed = [];
  if (controller.buttons) {
    for (const [i, button] of controller.buttons.entries()) {
      if (button.pressed) {
        buttonsPressed.push(i);
      }
    }
  }
}

function gamepadButtonPressedHandler(button) {
  return buttonsPressed.includes(button);
}
```

**Game loop integration:**

```javascript
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  gamepadUpdateHandler();

  if (gamepadButtonPressedHandler(12)) playerY -= 5;  // D-Pad Up
  else if (gamepadButtonPressedHandler(13)) playerY += 5;  // D-Pad Down
  if (gamepadButtonPressedHandler(14)) playerX -= 5;  // D-Pad Left
  else if (gamepadButtonPressedHandler(15)) playerX += 5;  // D-Pad Right
  if (gamepadButtonPressedHandler(0)) alert("BOOM!");  // A Button

  ctx.drawImage(img, playerX, playerY);
  requestAnimationFrame(draw);
}
```

**Reusable GamepadAPI library with hold vs press detection:**

```javascript
const GamepadAPI = {
  active: false,
  controller: {},

  connect(event) {
    GamepadAPI.controller = event.gamepad;
    GamepadAPI.active = true;
  },

  disconnect(event) {
    delete GamepadAPI.controller;
    GamepadAPI.active = false;
  },

  update() {
    GamepadAPI.buttons.cache = [...GamepadAPI.buttons.status];
    GamepadAPI.buttons.status = [];

    const c = GamepadAPI.controller || {};
    const pressed = [];

    if (c.buttons) {
      for (let b = 0; b < c.buttons.length; b++) {
        if (c.buttons[b].pressed) {
          pressed.push(GamepadAPI.buttons.layout[b]);
        }
      }
    }

    const axes = [];
    if (c.axes) {
      for (const ax of c.axes) {
        axes.push(ax.toFixed(2));
      }
    }

    GamepadAPI.axes.status = axes;
    GamepadAPI.buttons.status = pressed;
    return pressed;
  },

  buttons: {
    layout: ["A", "B", "X", "Y", "LB", "RB", "LT", "RT",
             "Back", "Start", "LS", "RS",
             "DPad-Up", "DPad-Down", "DPad-Left", "DPad-Right"],
    cache: [],
    status: [],
    pressed(button, hold) {
      let newPress = false;
      if (GamepadAPI.buttons.status.includes(button)) {
        newPress = true;
      }
      if (!hold && GamepadAPI.buttons.cache.includes(button)) {
        newPress = false;
      }
      return newPress;
    }
  },

  axes: {
    status: []
  }
};

window.addEventListener("gamepadconnected", GamepadAPI.connect);
window.addEventListener("gamepaddisconnected", GamepadAPI.disconnect);
```

**Analog stick movement with deadzone threshold:**

```javascript
if (GamepadAPI.axes.status) {
  if (GamepadAPI.axes.status[0] > 0.5) playerX += 5;       // Right
  else if (GamepadAPI.axes.status[0] < -0.5) playerX -= 5; // Left
  if (GamepadAPI.axes.status[1] > 0.5) playerY += 5;       // Down
  else if (GamepadAPI.axes.status[1] < -0.5) playerY -= 5; // Up
}
```

**Context-aware control display:**

```javascript
if (this.game.device.desktop) {
  if (GamepadAPI.active) {
    moveText = "DPad or left Stick to move";
    shootText = "A to shoot, Y for controls";
  } else {
    moveText = "Arrow keys or WASD to move";
    shootText = "X or Space to shoot";
  }
} else {
  moveText = "Tap and hold to move";
  shootText = "Tap to shoot";
}
```

### Best Practices

- Always check `GamepadAPI.active` before processing gamepad input.
- Differentiate between "hold" (continuous) and "press" (single new press) by caching previous frame button states.
- Apply a deadzone threshold (e.g., 0.5) for analog stick values to avoid unintentional drift input.
- Create a button mapping system because different devices may have different button layouts.
- Poll gamepad state every frame by calling the update function inside `requestAnimationFrame`.
- Display an on-screen indicator when a gamepad is connected, along with appropriate control instructions.
- Browser support is approximately 63% globally; always provide fallback keyboard/mouse controls.

## Other Control Mechanisms

Unconventional control mechanisms can provide unique gameplay experiences and leverage emerging hardware beyond traditional input devices.

### TV Remote Controls

**Description:** Smart TV remotes emit standard keyboard events, allowing web games to run on TV screens without modification.

**Key Events and APIs:**

- Remote directional buttons map to standard arrow key codes.
- Custom remote buttons have manufacturer-specific key codes.

**Code Example:**

```javascript
// Standard arrow key controls work automatically with TV remotes
this.cursors = this.input.keyboard.createCursorKeys();
if (this.cursors.right.isDown) {
  // move player right
}

// Discover manufacturer-specific remote key codes
window.addEventListener("keydown", (event) => {
  console.log(event.keyCode);
});

// Handle custom remote buttons (codes vary by manufacturer)
window.addEventListener("keydown", (event) => {
  switch (event.keyCode) {
    case 8:   // Pause (Panasonic example)
      break;
    case 588: // Custom action
      break;
  }
});
```

**Best Practices:**

- Log key codes to the console during development to discover remote button mappings.
- Reuse existing keyboard control implementations since remotes emit keyboard events.
- Refer to manufacturer documentation or cheat sheets for key code mappings.

### Leap Motion (Hand Gesture Recognition)

**Description:** Detects hand position, rotation, and grip strength for gesture-based control without physical contact using the Leap Motion sensor.

**Key Events and APIs:**

- `Leap.loop()` -- Frame-based hand tracking callback.
- `hand.roll()` -- Horizontal rotation in radians.
- `hand.pitch()` -- Vertical rotation in radians.
- `hand.grabStrength` -- Grip strength as a float from 0 (open hand) to 1 (closed fist).

**Code Example:**

```html
<script src="https://js.leapmotion.com/leap-0.6.4.min.js"></script>
```

```javascript
const toDegrees = 1 / (Math.PI / 180);
let horizontalDegree = 0;
let verticalDegree = 0;
const degreeThreshold = 30;
let grabStrength = 0;

Leap.loop({
  hand(hand) {
    horizontalDegree = Math.round(hand.roll() * toDegrees);
    verticalDegree = Math.round(hand.pitch() * toDegrees);
    grabStrength = hand.grabStrength;
  },
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (horizontalDegree > degreeThreshold) playerX -= 5;
  else if (horizontalDegree < -degreeThreshold) playerX += 5;

  if (verticalDegree > degreeThreshold) playerY += 5;
  else if (verticalDegree < -degreeThreshold) playerY -= 5;

  if (grabStrength === 1) fireWeapon();

  ctx.drawImage(img, playerX, playerY);
  requestAnimationFrame(draw);
}
```

**Best Practices:**

- Use a degree threshold (e.g., 30 degrees) to filter out minor hand movements and noise.
- Output diagnostic data during development to calibrate sensitivity.
- Limit to simple actions like steering and shooting rather than complex multi-input schemes.
- Requires Leap Motion drivers to be installed.

### Doppler Effect (Microphone-Based Gesture Detection)

**Description:** Detects hand movement direction and magnitude by analyzing frequency shifts in sound waves picked up by the device microphone. An emitted tone bounces off the user's hand, and the frequency difference indicates movement direction.

**Key Events and APIs:**

- Uses a Doppler effect detection library.
- `bandwidth.left` and `bandwidth.right` provide frequency analysis values.

**Code Example:**

```javascript
doppler.init((bandwidth) => {
  const diff = bandwidth.left - bandwidth.right;
  // Positive diff = movement in one direction
  // Negative diff = movement in the other direction
});
```

**Best Practices:**

- Best suited for simple one-axis controls such as scrolling or up/down movement.
- Less precise than Leap Motion or gamepad input.
- Provides directional information through left/right frequency difference comparison.

### Makey Makey (Physical Object Controllers)

**Description:** Connects conductive objects (bananas, clay, drawn circuits, water, etc.) to a board that emulates keyboard and mouse input, enabling creative physical interfaces for games.

**Key Events and APIs (via Cylon.js for custom hardware):**

- `makey-button` driver for custom setups with Arduino or Raspberry Pi.
- `"push"` event listener for button activation.
- The Makey Makey board itself works over USB and emits standard keyboard events without requiring custom code.

**Code Example (custom setup with Cylon.js):**

```javascript
const Cylon = require("cylon");

Cylon.robot({
  connections: {
    arduino: { adaptor: "firmata", port: "/dev/ttyACM0" },
  },
  devices: {
    makey: { driver: "makey-button", pin: 2 },
  },
  work(my) {
    my.makey.on("push", () => {
      console.log("Button pushed!");
      // Trigger game action
    });
  },
}).start();
```

**Best Practices:**

- The Makey Makey board connects via USB and emits standard keyboard events, so existing keyboard controls work out of the box.
- Use a 10 MOhm resistor for GPIO connections on custom setups.
- Enables creative physical gaming experiences that are particularly good for exhibitions and installations.

### General Recommendations for Unconventional Controls

- Implement multiple control mechanisms to reach the broadest possible audience.
- Build on a keyboard and gamepad foundation since most unconventional controllers emulate or complement standard input.
- Use threshold values to filter noise and accidental inputs from imprecise hardware.
- Provide visual diagnostics during development with console output and on-screen values.
- Match control complexity to the game's needs. Not all mechanisms suit all games.
- Test hardware setup thoroughly before implementing game logic on top of it.
