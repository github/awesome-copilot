# 2D Maze Game Template

A mobile-optimized 2D maze game where players guide a ball through a labyrinth of obstacles to reach a target hole. The game uses the **Device Orientation API** for tilt-based motion controls on mobile devices and keyboard arrow keys on desktop. Built with the **Phaser** framework (v2.x with Arcade Physics), it features multi-level progression, collision detection, audio feedback, vibration haptics, and a timer system.

**Source reference:** [MDN - HTML5 Gamedev Phaser Device Orientation](https://developer.mozilla.org/en-US/docs/Games/Tutorials/HTML5_Gamedev_Phaser_Device_Orientation)
**Live demo:** [Cyber Orb](https://orb.enclavegames.com/)
**Source code:** [GitHub - EnclaveGames/Cyber-Orb](https://github.com/EnclaveGames/Cyber-Orb)

---

## Game Concept

The player controls a ball (the "orb") by tilting their mobile device or pressing arrow keys. The ball rolls through a maze of horizontal and vertical wall segments. The objective on each level is to navigate the ball to a hole at the top of the screen while avoiding walls. Collisions with walls trigger a bounce, a sound effect, and optional vibration. A timer tracks how long the player takes per level and across the entire game.

---

## Project Structure

```
project/
  index.html
  src/
    phaser-arcade-physics.2.2.2.min.js
    Boot.js
    Preloader.js
    MainMenu.js
    Howto.js
    Game.js
  img/
    ball.png
    hole.png
    element-horizontal.png
    element-vertical.png
    button-start.png
    loading-bg.png
    loading-bar.png
  audio/
    bounce.ogg
    bounce.mp3
    bounce.m4a
```

---

## Phaser Setup and Initialization

### HTML Entry Point

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Cyber Orb</title>
  <style>
    body { margin: 0; background: #333; }
  </style>
  <script src="src/phaser-arcade-physics.2.2.2.min.js"></script>
  <script src="src/Boot.js"></script>
  <script src="src/Preloader.js"></script>
  <script src="src/MainMenu.js"></script>
  <script src="src/Howto.js"></script>
  <script src="src/Game.js"></script>
</head>
<body>
  <script>
    (() => {
      const game = new Phaser.Game(320, 480, Phaser.CANVAS, "game");
      game.state.add("Boot", Ball.Boot);
      game.state.add("Preloader", Ball.Preloader);
      game.state.add("MainMenu", Ball.MainMenu);
      game.state.add("Howto", Ball.Howto);
      game.state.add("Game", Ball.Game);
      game.state.start("Boot");
    })();
  </script>
</body>
</html>
```

- Canvas size: `320 x 480`
- Renderer: `Phaser.CANVAS` (alternatives: `Phaser.WEBGL`, `Phaser.AUTO`)

---

## Game State Architecture

The game follows a linear state flow:

```
Boot --> Preloader --> MainMenu --> Howto --> Game
```

### Boot State

Loads minimal assets for the loading screen and configures scaling.

```javascript
const Ball = {
  _WIDTH: 320,
  _HEIGHT: 480,
};

Ball.Boot = function (game) {};
Ball.Boot.prototype = {
  preload() {
    this.load.image("preloaderBg", "img/loading-bg.png");
    this.load.image("preloaderBar", "img/loading-bar.png");
  },
  create() {
    this.game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    this.game.scale.pageAlignHorizontally = true;
    this.game.scale.pageAlignVertically = true;
    this.game.state.start("Preloader");
  },
};
```

### Preloader State

Displays a visual loading bar while loading all game assets. Audio is loaded in multiple formats for cross-browser compatibility.

```javascript
Ball.Preloader = function (game) {};
Ball.Preloader.prototype = {
  preload() {
    this.preloadBg = this.add.sprite(
      (Ball._WIDTH - 297) * 0.5,
      (Ball._HEIGHT - 145) * 0.5,
      "preloaderBg"
    );
    this.preloadBar = this.add.sprite(
      (Ball._WIDTH - 158) * 0.5,
      (Ball._HEIGHT - 50) * 0.5,
      "preloaderBar"
    );
    this.load.setPreloadSprite(this.preloadBar);

    this.load.image("ball", "img/ball.png");
    this.load.image("hole", "img/hole.png");
    this.load.image("element-w", "img/element-horizontal.png");
    this.load.image("element-h", "img/element-vertical.png");
    this.load.spritesheet("button-start", "img/button-start.png", 146, 51);
    this.load.audio("audio-bounce", [
      "audio/bounce.ogg",
      "audio/bounce.mp3",
      "audio/bounce.m4a",
    ]);
  },
  create() {
    this.game.state.start("MainMenu");
  },
};
```

### MainMenu State

Displays the title screen with a start button.

```javascript
Ball.MainMenu = function (game) {};
Ball.MainMenu.prototype = {
  create() {
    this.add.sprite(0, 0, "screen-mainmenu");
    this.gameTitle = this.add.sprite(Ball._WIDTH * 0.5, 40, "title");
    this.gameTitle.anchor.set(0.5, 0);

    this.startButton = this.add.button(
      Ball._WIDTH * 0.5, 200, "button-start",
      this.startGame, this,
      2, 0, 1  // hover, out, down frames
    );
    this.startButton.anchor.set(0.5, 0);
    this.startButton.input.useHandCursor = true;
  },
  startGame() {
    this.game.state.start("Howto");
  },
};
```

### Howto State

A single-click instruction screen before gameplay begins.

```javascript
Ball.Howto = function (game) {};
Ball.Howto.prototype = {
  create() {
    this.buttonContinue = this.add.button(
      0, 0, "screen-howtoplay",
      this.startGame, this
    );
  },
  startGame() {
    this.game.state.start("Game");
  },
};
```

---

## Device Orientation API Usage

The Device Orientation API provides real-time data about the physical tilt of a device. Two axes are used:

| Property | Axis | Range | Effect |
|----------|------|-------|--------|
| `event.gamma` | Left/right tilt | -90 to 90 degrees | Horizontal ball velocity |
| `event.beta` | Front/back tilt | -180 to 180 degrees | Vertical ball velocity |

### Registering the Listener

```javascript
// In the Game state's create() method
window.addEventListener("deviceorientation", this.handleOrientation);
```

### Handling Orientation Events

```javascript
handleOrientation(e) {
  const x = e.gamma; // left-right tilt
  const y = e.beta;  // front-back tilt
  Ball._player.body.velocity.x += x;
  Ball._player.body.velocity.y += y;
}
```

### Tilt Behavior

- Tilt device left: negative gamma, ball rolls left
- Tilt device right: positive gamma, ball rolls right
- Tilt device forward: positive beta, ball rolls down
- Tilt device backward: negative beta, ball rolls up

The tilt angle directly maps to velocity increments -- the steeper the tilt, the greater the force applied to the ball each frame.

---

## Core Game Mechanics

### Game State Structure

```javascript
Ball.Game = function (game) {};
Ball.Game.prototype = {
  create() {},
  initLevels() {},
  showLevel(level) {},
  updateCounter() {},
  managePause() {},
  manageAudio() {},
  update() {},
  wallCollision() {},
  handleOrientation(e) {},
  finishLevel() {},
};
```

### Ball Creation and Physics

```javascript
// In create()
this.ball = this.add.sprite(this.ballStartPos.x, this.ballStartPos.y, "ball");
this.ball.anchor.set(0.5);
this.physics.enable(this.ball, Phaser.Physics.ARCADE);
this.ball.body.setSize(18, 18);
this.ball.body.bounce.set(0.3, 0.3);
```

- Anchor at center `(0.5, 0.5)` for rotation around midpoint
- Physics body: 18x18 pixels
- Bounce coefficient: 0.3 (retains 30% velocity after wall collision)

### Keyboard Controls (Desktop Fallback)

```javascript
// In create()
this.keys = this.game.input.keyboard.createCursorKeys();

// In update()
if (this.keys.left.isDown) {
  this.ball.body.velocity.x -= this.movementForce;
} else if (this.keys.right.isDown) {
  this.ball.body.velocity.x += this.movementForce;
}
if (this.keys.up.isDown) {
  this.ball.body.velocity.y -= this.movementForce;
} else if (this.keys.down.isDown) {
  this.ball.body.velocity.y += this.movementForce;
}
```

### Hole (Goal) Setup

```javascript
this.hole = this.add.sprite(Ball._WIDTH * 0.5, 90, "hole");
this.physics.enable(this.hole, Phaser.Physics.ARCADE);
this.hole.anchor.set(0.5);
this.hole.body.setSize(2, 2);
```

The hole has a tiny 2x2 collision body for precise overlap detection.

---

## Level System

### Level Data Format

Each level is an array of wall segment objects with position and type:

```javascript
this.levelData = [
  [{ x: 96, y: 224, t: "w" }],                           // Level 1
  [
    { x: 72, y: 320, t: "w" },
    { x: 200, y: 320, t: "h" },
    { x: 72, y: 150, t: "w" },
  ],                                                       // Level 2
  // ... more levels
];
```

- `x, y`: Position in pixels
- `t`: Type -- `"w"` for horizontal wall, `"h"` for vertical wall

### Building Levels

```javascript
initLevels() {
  for (let i = 0; i < this.maxLevels; i++) {
    const newLevel = this.add.group();
    newLevel.enableBody = true;
    newLevel.physicsBodyType = Phaser.Physics.ARCADE;

    for (const item of this.levelData[i]) {
      newLevel.create(item.x, item.y, `element-${item.t}`);
    }

    newLevel.setAll("body.immovable", true);
    newLevel.visible = false;
    this.levels.push(newLevel);
  }
}
```

### Showing a Level

```javascript
showLevel(level) {
  const lvl = level || this.level;
  if (this.levels[lvl - 2]) {
    this.levels[lvl - 2].visible = false;
  }
  this.levels[lvl - 1].visible = true;
}
```

---

## Collision Detection

### Wall Collisions (Bounce)

```javascript
// In update()
this.physics.arcade.collide(
  this.ball, this.borderGroup,
  this.wallCollision, null, this
);
this.physics.arcade.collide(
  this.ball, this.levels[this.level - 1],
  this.wallCollision, null, this
);
```

`collide` causes the ball to bounce off walls and triggers the callback.

### Hole Overlap (Pass-Through Detection)

```javascript
this.physics.arcade.overlap(
  this.ball, this.hole,
  this.finishLevel, null, this
);
```

`overlap` detects intersection without physical collision response.

### Wall Collision Callback

```javascript
wallCollision() {
  if (this.audioStatus) {
    this.bounceSound.play();
  }
  if ("vibrate" in window.navigator) {
    window.navigator.vibrate(100);
  }
}
```

---

## Audio System

```javascript
// In create()
this.bounceSound = this.game.add.audio("audio-bounce");

// Toggle
manageAudio() {
  this.audioStatus = !this.audioStatus;
}
```

---

## Vibration API

```javascript
if ("vibrate" in window.navigator) {
  window.navigator.vibrate(100); // 100ms vibration pulse
}
```

Feature-detect before calling. Provides tactile feedback on supported mobile devices.

---

## Timer System

```javascript
// In create()
this.timer = 0;
this.totalTimer = 0;
this.timerText = this.game.add.text(15, 15, "Time: 0", this.fontBig);
this.totalTimeText = this.game.add.text(120, 30, "Total time: 0", this.fontSmall);
this.time.events.loop(Phaser.Timer.SECOND, this.updateCounter, this);

// Counter callback
updateCounter() {
  this.timer++;
  this.timerText.setText(`Time: ${this.timer}`);
  this.totalTimeText.setText(`Total time: ${this.totalTimer + this.timer}`);
}
```

---

## Level Completion

```javascript
finishLevel() {
  if (this.level >= this.maxLevels) {
    this.totalTimer += this.timer;
    alert(`Congratulations, game completed!\nTotal time: ${this.totalTimer}s`);
    this.game.state.start("MainMenu");
  } else {
    alert(`Level ${this.level} completed!`);
    this.totalTimer += this.timer;
    this.timer = 0;
    this.level++;
    this.timerText.setText(`Time: ${this.timer}`);
    this.totalTimeText.setText(`Total time: ${this.totalTimer}`);
    this.levelText.setText(`Level: ${this.level} / ${this.maxLevels}`);
    this.ball.body.x = this.ballStartPos.x;
    this.ball.body.y = this.ballStartPos.y;
    this.ball.body.velocity.x = 0;
    this.ball.body.velocity.y = 0;
    this.showLevel();
  }
}
```

---

## Complete Update Loop

```javascript
update() {
  // Keyboard input
  if (this.keys.left.isDown) {
    this.ball.body.velocity.x -= this.movementForce;
  } else if (this.keys.right.isDown) {
    this.ball.body.velocity.x += this.movementForce;
  }
  if (this.keys.up.isDown) {
    this.ball.body.velocity.y -= this.movementForce;
  } else if (this.keys.down.isDown) {
    this.ball.body.velocity.y += this.movementForce;
  }

  // Wall collisions
  this.physics.arcade.collide(
    this.ball, this.borderGroup, this.wallCollision, null, this
  );
  this.physics.arcade.collide(
    this.ball, this.levels[this.level - 1], this.wallCollision, null, this
  );

  // Hole overlap
  this.physics.arcade.overlap(
    this.ball, this.hole, this.finishLevel, null, this
  );
}
```

---

## Phaser API Quick Reference

| Function | Purpose |
|----------|---------|
| `this.add.sprite(x, y, key)` | Create a game object |
| `this.add.group()` | Create a container for objects |
| `this.add.button(x, y, key, cb, ctx, over, out, down)` | Create interactive button |
| `this.add.text(x, y, text, style)` | Create text display |
| `this.physics.enable(obj, system)` | Enable physics on object |
| `this.physics.arcade.collide(a, b, cb)` | Detect collision with bounce |
| `this.physics.arcade.overlap(a, b, cb)` | Detect overlap without bounce |
| `this.load.image(key, path)` | Load image asset |
| `this.load.spritesheet(key, path, w, h)` | Load sprite animation sheet |
| `this.load.audio(key, paths[])` | Load audio with format fallbacks |
| `this.game.add.audio(key)` | Instantiate audio object |
| `this.time.events.loop(interval, cb, ctx)` | Create repeating timer |
