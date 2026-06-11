# 2D Platform Game Template

A complete step-by-step guide for building a 2D platformer game using Phaser (v2.x / Phaser CE) with Arcade Physics. This template walks through every stage of development: setting up the project, creating platforms from JSON level data, adding a hero with physics-based movement and jumping, collectible coins, walking enemies, death and stomp mechanics, a scoreboard, sprite animations, win conditions with a door/key system, and multi-level progression.

**What you will build:** A classic side-scrolling platformer where a hero navigates platforms, collects coins, avoids or stomps on spider enemies, finds a key to unlock a door, and progresses through multiple levels -- with score tracking, animations, and physics.

**Prerequisites:** Basic to intermediate JavaScript knowledge, familiarity with HTML, and a local web server for development (e.g., browser-sync, live-server, or Python's SimpleHTTPServer).

**Source:** Based on the [Mozilla HTML5 Games Workshop - Platformer](https://mozdevs.github.io/html5-games-workshop/en/guides/platformer/start-here/). Project starter files available at the workshop repository.

---

## Start Here

This tutorial builds a 2D platformer using the **Phaser** framework. Phaser handles rendering, physics, input, audio, and asset loading so you can focus on game logic.

### What You Will Build

The finished game features:

- A hero character the player controls with the keyboard
- Platforms the hero can walk and jump on
- Collectible coins that increase the score
- Walking spider enemies that kill the hero on contact (but can be stomped from above)
- A key and door system: the hero must pick up a key to unlock the door and complete the level
- Multiple levels loaded from JSON data files
- A scoreboard showing collected coins
- Sprite animations for the hero (idle, running, jumping, falling)

### Project Structure

```
project/
  index.html
  js/
    phaser.min.js        (Phaser 2.6.2 or Phaser CE)
    main.js              (all game code goes here)
  audio/
    sfx/
      jump.wav
      coin.wav
      stomp.wav
      key.wav
      door.wav
  images/
    background.png
    ground.png
    grass:8x1.png        (platform tile images in various sizes)
    grass:6x1.png
    grass:4x1.png
    grass:2x1.png
    grass:1x1.png
    hero.png             (hero spritesheet: 36x42 per frame)
    hero_stopped.png     (single frame for initial steps)
    coin_animated.png    (coin spritesheet)
    spider.png           (spider spritesheet)
    invisible_wall.png   (invisible boundary for enemy AI)
    key.png              (key spritesheet)
    door.png             (door spritesheet)
    key_icon.png         (HUD icon for key)
    font:numbers.png     (bitmap font for score)
  data/
    level00.json
    level01.json
```

### Level Data Format

Each level is defined in a JSON file. The JSON structure describes positions of every entity:

```json
{
    "hero": { "x": 21, "y": 525 },
    "door": { "x": 169, "y": 546 },
    "key": { "x": 750, "y": 524 },
    "platforms": [
        { "image": "ground", "x": 0, "y": 546 },
        { "image": "grass:8x1", "x": 208, "y": 420 },
        { "image": "grass:4x1", "x": 420, "y": 336 },
        { "image": "grass:2x1", "x": 680, "y": 252 }
    ],
    "coins": [
        { "x": 147, "y": 525 },
        { "x": 189, "y": 525 },
        { "x": 399, "y": 399 },
        { "x": 441, "y": 336 }
    ],
    "spiders": [
        { "x": 121, "y": 399 }
    ],
    "decoration": {
        "grass": [
            { "x": 84, "y": 504, "frame": 0 },
            { "x": 420, "y": 504, "frame": 1 }
        ]
    }
}
```

Each entity type (hero, door, key, platforms, coins, spiders) has `x` and `y` coordinates. Platforms also specify which `image` asset to use for that platform tile.

---

## Initialise Phaser

The first step is setting up the HTML file and creating the Phaser game instance.

### HTML Entry Point

Create an `index.html` file that loads Phaser and your game script:

```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Platformer Game</title>
    <style>
        html, body {
            margin: 0;
            padding: 0;
            background: #000;
        }
    </style>
    <script src="js/phaser.min.js"></script>
    <script src="js/main.js"></script>
</head>
<body>
    <div id="game"></div>
</body>
</html>
```

- The `<div id="game">` is the container where Phaser will insert the game canvas.
- Phaser is loaded first, then your game script.

### Creating the Game Instance

In `js/main.js`, create the Phaser game object and register a game state:

```javascript
// Create a Phaser game instance
// Parameters: width, height, renderer, DOM element ID
window.onload = function () {
    let game = new Phaser.Game(960, 600, Phaser.AUTO, 'game');

    // Add and start the play state
    game.state.add('play', PlayState);
    game.state.start('play');
};
```

- `960, 600` sets the game canvas dimensions in pixels.
- `Phaser.AUTO` lets Phaser choose between WebGL and Canvas rendering automatically.
- `'game'` is the ID of the DOM element that will contain the canvas.

### The PlayState Object

Define the game state as an object with lifecycle methods:

```javascript
PlayState = {};

PlayState.init = function () {
    // Called first when the state starts
};

PlayState.preload = function () {
    // Load all assets here
};

PlayState.create = function () {
    // Create game entities and set up the world
};

PlayState.update = function () {
    // Called every frame (~60 times per second)
    // Handle game logic, input, collisions here
};
```

- `init` -- runs first; used for configuration and receiving parameters.
- `preload` -- used to load all assets (images, audio, JSON) before the game starts.
- `create` -- called once after assets are loaded; used to create sprites, groups, and game objects.
- `update` -- called every frame at ~60fps; used for input handling, physics checks, and game logic.

At this point you should see an empty black canvas rendered on the page.

---

## The Game Loop

Phaser uses a game loop architecture. Every frame, Phaser calls `update()`, which is where you handle input, move sprites, and check collisions. Before the loop starts, `preload()` loads assets and `create()` sets up the initial game state.

### Loading and Displaying the Background

Start by loading and displaying a background image to verify the game loop is working:

```javascript
PlayState.preload = function () {
    this.game.load.image('background', 'images/background.png');
};

PlayState.create = function () {
    // Add the background image at position (0, 0)
    this.game.add.image(0, 0, 'background');
};
```

- `this.game.load.image(key, path)` loads an image and assigns it a key for later reference.
- `this.game.add.image(x, y, key)` creates a static image at the given position.

You should now see the background image rendered in the game canvas.

### Understanding the Frame Cycle

```
preload() -> [assets loaded] -> create() -> update() -> update() -> update() -> ...
```

Each call to `update()` represents one frame. The game targets 60 frames per second. All movement, input reading, and collision detection happen inside `update()`.

---

## Creating Platforms

Platforms are the surfaces the hero walks and jumps on. They are loaded from the level JSON data and created as physics-enabled sprites arranged in a group.

### Loading Platform Assets

Load the level JSON data and all platform tile images in `preload`:

```javascript
PlayState.preload = function () {
    this.game.load.image('background', 'images/background.png');

    // Load level data
    this.game.load.json('level:1', 'data/level01.json');

    // Load platform images
    this.game.load.image('ground', 'images/ground.png');
    this.game.load.image('grass:8x1', 'images/grass_8x1.png');
    this.game.load.image('grass:6x1', 'images/grass_6x1.png');
    this.game.load.image('grass:4x1', 'images/grass_4x1.png');
    this.game.load.image('grass:2x1', 'images/grass_2x1.png');
    this.game.load.image('grass:1x1', 'images/grass_1x1.png');
};
```

### Spawning Platforms from Level Data

Create a method to load the level and spawn each platform as a sprite inside a physics group:

```javascript
PlayState.create = function () {
    // Add the background
    this.game.add.image(0, 0, 'background');

    // Load level data and spawn entities
    this._loadLevel(this.game.cache.getJSON('level:1'));
};

PlayState._loadLevel = function (data) {
    // Create a group for platforms
    this.platforms = this.game.add.group();

    // Spawn each platform from the level data
    data.platforms.forEach(this._spawnPlatform, this);
};

PlayState._spawnPlatform = function (platform) {
    // Add a sprite at the platform's position using the specified image
    let sprite = this.platforms.create(platform.x, platform.y, platform.image);

    // Enable physics on this platform
    this.game.physics.enable(sprite);

    // Make platform immovable so it doesn't get pushed by the hero
    sprite.body.allowGravity = false;
    sprite.body.immovable = true;
};
```

- `this.game.add.group()` creates a Phaser group -- a container for related sprites that enables batch operations and collision detection.
- `this.platforms.create(x, y, key)` creates a sprite inside the group.
- `sprite.body.immovable = true` prevents the platform from being pushed by other physics bodies.
- `sprite.body.allowGravity = false` prevents platforms from falling due to gravity.

You should now see the ground and grass platform tiles rendered on the screen.

---

## The Main Character Sprite

Now add the hero character that the player will control.

### Loading the Hero Image

Add the hero image to `preload`. Initially we use a single static image; we will switch to a spritesheet later for animations:

```javascript
// In PlayState.preload:
this.game.load.image('hero', 'images/hero_stopped.png');
```

### Spawning the Hero

Add the hero to `_loadLevel` and create a spawn method:

```javascript
PlayState._loadLevel = function (data) {
    this.platforms = this.game.add.group();
    data.platforms.forEach(this._spawnPlatform, this);

    // Spawn the hero at the position defined in level data
    this._spawnCharacters({ hero: data.hero });
};

PlayState._spawnCharacters = function (data) {
    // Create the hero sprite
    this.hero = this.game.add.sprite(data.hero.x, data.hero.y, 'hero');

    // Set the anchor to the bottom-center for easier positioning
    this.hero.anchor.set(0.5, 1);
};
```

- `anchor.set(0.5, 1)` sets the sprite's origin point to the horizontal center and vertical bottom. This makes it easier to position the hero on top of platforms, since the `y` position refers to the hero's feet rather than the top-left corner.

---

## Keyboard Controls

Capture keyboard input so the player can move the hero left, right, and jump.

### Setting Up Input Keys

In `init`, configure the keyboard controls:

```javascript
PlayState.init = function () {
    // Force integer rendering for pixel-art crispness
    this.game.renderer.renderSession.roundPixels = true;

    // Capture arrow keys
    this.keys = this.game.input.keyboard.addKeys({
        left: Phaser.KeyCode.LEFT,
        right: Phaser.KeyCode.RIGHT,
        up: Phaser.KeyCode.UP
    });
};
```

- `addKeys()` captures the specified keys and returns an object with key state references.
- `Phaser.KeyCode.LEFT`, `RIGHT`, `UP` correspond to the arrow keys.
- `renderSession.roundPixels = true` prevents pixel-art sprites from appearing blurry due to sub-pixel rendering.

### Reading Input in Update

Handle the key states in `update`. For now, just log the direction; the next step adds physics-based movement:

```javascript
PlayState.update = function () {
    this._handleInput();
};

PlayState._handleInput = function () {
    if (this.keys.left.isDown) {
        // Move hero left
    } else if (this.keys.right.isDown) {
        // Move hero right
    } else {
        // Stop (no key held)
    }
};
```

- `this.keys.left.isDown` returns `true` while the left arrow key is held down.
- The `else` clause handles the case where neither left nor right is pressed (the hero should stop).

---

## Moving Sprites with Physics

Enable Arcade Physics so the hero can move with velocity and interact with platforms through collisions.

### Enabling the Physics Engine

Enable Arcade Physics in `init`:

```javascript
PlayState.init = function () {
    this.game.renderer.renderSession.roundPixels = true;

    this.keys = this.game.input.keyboard.addKeys({
        left: Phaser.KeyCode.LEFT,
        right: Phaser.KeyCode.RIGHT,
        up: Phaser.KeyCode.UP
    });

    // Enable Arcade Physics
    this.game.physics.startSystem(Phaser.Physics.ARCADE);
};
```

### Adding a Physics Body to the Hero

Enable physics on the hero sprite in `_spawnCharacters`:

```javascript
PlayState._spawnCharacters = function (data) {
    this.hero = this.game.add.sprite(data.hero.x, data.hero.y, 'hero');
    this.hero.anchor.set(0.5, 1);

    // Enable physics body on the hero
    this.game.physics.enable(this.hero);
};
```

### Moving with Velocity

Now update `_handleInput` to set the hero's velocity based on key presses:

```javascript
const SPEED = 200; // pixels per second

PlayState._handleInput = function () {
    if (this.keys.left.isDown) {
        this.hero.body.velocity.x = -SPEED;
    } else if (this.keys.right.isDown) {
        this.hero.body.velocity.x = SPEED;
    } else {
        this.hero.body.velocity.x = 0;
    }
};
```

- `body.velocity.x` sets the horizontal speed in pixels per second.
- A negative value moves the sprite left; positive moves it right.
- Setting velocity to `0` when no keys are pressed makes the hero stop immediately.

The hero can now move left and right, but will fall through platforms and off the screen because there is no gravity or collision handling yet.

---

## Gravity

Add gravity so the hero falls downward and collides with platforms.

### Setting Global Gravity

Enable gravity for the entire physics world in `init`:

```javascript
PlayState.init = function () {
    this.game.renderer.renderSession.roundPixels = true;

    this.keys = this.game.input.keyboard.addKeys({
        left: Phaser.KeyCode.LEFT,
        right: Phaser.KeyCode.RIGHT,
        up: Phaser.KeyCode.UP
    });

    this.game.physics.startSystem(Phaser.Physics.ARCADE);

    // Set global gravity
    this.game.physics.arcade.gravity.y = 1200;
};
```

- `gravity.y = 1200` applies a downward acceleration of 1200 pixels per second squared to all physics-enabled sprites (unless they opt out with `allowGravity = false`).

### Collision Detection Between Hero and Platforms

Add collision detection in `update` so the hero lands on platforms instead of falling through:

```javascript
PlayState.update = function () {
    this._handleCollisions();
    this._handleInput();
};

PlayState._handleCollisions = function () {
    // Make the hero collide with the platform group
    this.game.physics.arcade.collide(this.hero, this.platforms);
};
```

- `arcade.collide(spriteA, groupB)` checks for physics collisions between the hero and every sprite in the platforms group. When the hero lands on a platform, the physics engine prevents it from passing through and resolves the overlap.
- It is important to call `_handleCollisions()` before `_handleInput()` so collision data (like whether the hero is touching the ground) is up to date when we process input.

The hero now falls due to gravity and lands on the platforms. You can walk left and right on the platforms.

---

## Jumps

Allow the hero to jump when the up arrow key is pressed -- but only when standing on a platform (no mid-air jumps).

### Implementing the Jump Mechanic

Add a jump constant and update `_handleInput`:

```javascript
const SPEED = 200;
const JUMP_SPEED = 600;

PlayState._handleInput = function () {
    if (this.keys.left.isDown) {
        this.hero.body.velocity.x = -SPEED;
    } else if (this.keys.right.isDown) {
        this.hero.body.velocity.x = SPEED;
    } else {
        this.hero.body.velocity.x = 0;
    }

    // Handle jumping
    if (this.keys.up.isDown) {
        this._jump();
    }
};

PlayState._jump = function () {
    let canJump = this.hero.body.touching.down;

    if (canJump) {
        this.hero.body.velocity.y = -JUMP_SPEED;
    }

    return canJump;
};
```

- `this.hero.body.touching.down` is `true` when the hero's physics body is touching another body on its underside -- meaning the hero is standing on something.
- Setting `velocity.y` to a negative value launches the hero upward (the y-axis points downward in screen coordinates).
- The `canJump` check prevents the hero from jumping while already in the air, enforcing single-jump behavior.
- The method returns whether the jump was performed, which is useful later for playing sound effects.

### Adding a Jump Sound Effect

Load a jump sound and play it on successful jumps:

```javascript
// In PlayState.preload:
this.game.load.audio('sfx:jump', 'audio/sfx/jump.wav');

// In PlayState.create:
this.sfx = {
    jump: this.game.add.audio('sfx:jump')
};

// In PlayState._jump, after setting velocity:
PlayState._jump = function () {
    let canJump = this.hero.body.touching.down;

    if (canJump) {
        this.hero.body.velocity.y = -JUMP_SPEED;
        this.sfx.jump.play();
    }

    return canJump;
};
```

---

## Pickable Coins

Add collectible coins that the player can pick up to increase their score.

### Loading Coin Assets

Load the coin spritesheet and coin sound effect in `preload`:

```javascript
// In PlayState.preload:
this.game.load.spritesheet('coin', 'images/coin_animated.png', 22, 22);
this.game.load.audio('sfx:coin', 'audio/sfx/coin.wav');
```

- `load.spritesheet(key, path, frameWidth, frameHeight)` loads a spritesheet and slices it into individual frames of 22x22 pixels for animation.

### Spawning Coins from Level Data

Update `_loadLevel` to create a coins group and spawn each coin:

```javascript
PlayState._loadLevel = function (data) {
    this.platforms = this.game.add.group();
    this.coins = this.game.add.group();

    data.platforms.forEach(this._spawnPlatform, this);
    data.coins.forEach(this._spawnCoin, this);

    this._spawnCharacters({ hero: data.hero });
};

PlayState._spawnCoin = function (coin) {
    let sprite = this.coins.create(coin.x, coin.y, 'coin');
    sprite.anchor.set(0.5, 0.5);

    // Add a tween animation to make the coin bob up and down
    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;

    // Coin bobbing animation with a tween
    sprite.animations.add('rotate', [0, 1, 2, 1], 6, true); // 6fps, looping
    sprite.animations.play('rotate');
};
```

- Each coin is created inside the `coins` group for easy collision detection.
- `allowGravity = false` prevents coins from falling.
- The `animations.add` creates a frame animation using the spritesheet frames 0, 1, 2, 1 at 6fps, looping continuously.

### Collecting Coins

Add the coin sound to the sfx object and detect overlap between the hero and coins:

```javascript
// In PlayState.create, add to the sfx object:
this.sfx = {
    jump: this.game.add.audio('sfx:jump'),
    coin: this.game.add.audio('sfx:coin')
};

// In PlayState._handleCollisions:
PlayState._handleCollisions = function () {
    this.game.physics.arcade.collide(this.hero, this.platforms);

    // Detect overlap between hero and coins (no physical collision, just overlap)
    this.game.physics.arcade.overlap(
        this.hero, this.coins, this._onHeroVsCoin, null, this
    );
};

PlayState._onHeroVsCoin = function (hero, coin) {
    this.sfx.coin.play();
    coin.kill();  // Remove the coin from the game
    this.coinPickupCount++;
};
```

- `arcade.overlap()` checks if two sprites/groups overlap without resolving collisions physically. When an overlap is detected, it calls the callback function (`_onHeroVsCoin`).
- `coin.kill()` removes the coin sprite from the game world.
- `this.coinPickupCount` tracks the number of coins collected (initialize it in `_loadLevel`).

### Initializing the Coin Counter

```javascript
PlayState._loadLevel = function (data) {
    this.platforms = this.game.add.group();
    this.coins = this.game.add.group();

    data.platforms.forEach(this._spawnPlatform, this);
    data.coins.forEach(this._spawnCoin, this);

    this._spawnCharacters({ hero: data.hero });

    // Initialize coin counter
    this.coinPickupCount = 0;
};
```

---

## Walking Enemies

Add spider enemies that walk back and forth on platforms. The hero can stomp on them from above but dies if touching them from the side.

### Loading Enemy Assets

```javascript
// In PlayState.preload:
this.game.load.spritesheet('spider', 'images/spider.png', 42, 32);
this.game.load.image('invisible-wall', 'images/invisible_wall.png');
this.game.load.audio('sfx:stomp', 'audio/sfx/stomp.wav');
```

- The spider spritsheet has frames for a crawling animation.
- Invisible walls are placed at platform edges to keep spiders from walking off -- they are not rendered visually but have physics bodies.

### Spawning Enemies

Update `_loadLevel` and add a spawn method for spiders:

```javascript
PlayState._loadLevel = function (data) {
    this.platforms = this.game.add.group();
    this.coins = this.game.add.group();
    this.spiders = this.game.add.group();
    this.enemyWalls = this.game.add.group();

    data.platforms.forEach(this._spawnPlatform, this);
    data.coins.forEach(this._spawnCoin, this);
    data.spiders.forEach(this._spawnSpider, this);

    this._spawnCharacters({ hero: data.hero });

    // Make enemy walls invisible
    this.enemyWalls.visible = false;

    this.coinPickupCount = 0;
};
```

### Creating Invisible Walls on Platforms

Modify `_spawnPlatform` to add invisible walls at both edges of each platform:

```javascript
PlayState._spawnPlatform = function (platform) {
    let sprite = this.platforms.create(platform.x, platform.y, platform.image);
    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;
    sprite.body.immovable = true;

    // Spawn invisible walls at the left and right edges of this platform
    this._spawnEnemyWall(platform.x, platform.y, 'left');
    this._spawnEnemyWall(platform.x + sprite.width, platform.y, 'right');
};

PlayState._spawnEnemyWall = function (x, y, side) {
    let sprite = this.enemyWalls.create(x, y, 'invisible-wall');

    // Anchor to the bottom of the wall and adjust position based on side
    sprite.anchor.set(side === 'left' ? 1 : 0, 1);

    this.game.physics.enable(sprite);
    sprite.body.immovable = true;
    sprite.body.allowGravity = false;
};
```

- Each platform gets two invisible walls, one at each edge.
- The walls act as barriers that prevent spiders from walking off the edge.
- The anchor is set so the wall aligns to the correct side of the platform.

### Spawning and Animating Spiders

```javascript
PlayState._spawnSpider = function (spider) {
    let sprite = this.spiders.create(spider.x, spider.y, 'spider');
    sprite.anchor.set(0.5, 1);

    // Add the crawl animation
    sprite.animations.add('crawl', [0, 1, 2], 8, true);
    sprite.animations.add('die', [0, 4, 0, 4, 0, 4, 3, 3, 3, 3, 3, 3], 12);
    sprite.animations.play('crawl');

    // Enable physics
    this.game.physics.enable(sprite);

    // Set initial movement speed
    sprite.body.velocity.x = Spider.SPEED;
};

// Spider speed constant
const Spider = { SPEED: 100 };
```

- Spiders have two animations: `crawl` (looping) and `die` (played once on death).
- `velocity.x = 100` starts the spider moving to the right at 100 pixels per second.

### Making Spiders Bounce Off Walls

Add collision handling so spiders reverse direction when hitting invisible walls or platform edges:

```javascript
// In PlayState._handleCollisions:
PlayState._handleCollisions = function () {
    this.game.physics.arcade.collide(this.hero, this.platforms);
    this.game.physics.arcade.collide(this.spiders, this.platforms);
    this.game.physics.arcade.collide(this.spiders, this.enemyWalls);

    this.game.physics.arcade.overlap(
        this.hero, this.coins, this._onHeroVsCoin, null, this
    );
    this.game.physics.arcade.overlap(
        this.hero, this.spiders, this._onHeroVsEnemy, null, this
    );
};
```

To make spiders reverse direction when colliding with walls, check their velocity each frame and flip them:

```javascript
// In PlayState.update, after collision handling, update spider directions:
PlayState.update = function () {
    this._handleCollisions();
    this._handleInput();

    // Update spider facing direction based on velocity
    this.spiders.forEach(function (spider) {
        if (spider.body.touching.right || spider.body.blocked.right) {
            spider.body.velocity.x = -Spider.SPEED; // Turn left
        } else if (spider.body.touching.left || spider.body.blocked.left) {
            spider.body.velocity.x = Spider.SPEED; // Turn right
        }
    }, this);
};
```

- When a spider touches a wall on its right side, it reverses to move left, and vice versa.
- `body.touching` is set by Phaser after collision resolution.

---

## Death

Implement hero death when touching enemies and the stomp mechanic for killing enemies.

### Hero vs Enemy: Stomp or Die

When the hero overlaps with a spider, check if the hero is falling (stomping) or not:

```javascript
PlayState._onHeroVsEnemy = function (hero, enemy) {
    if (hero.body.velocity.y > 0) {
        // Hero is falling -> stomp the enemy
        enemy.body.velocity.x = 0; // Stop enemy movement
        enemy.body.enable = false; // Disable enemy physics

        // Play die animation then remove the enemy
        enemy.animations.play('die');
        enemy.events.onAnimationComplete.addOnce(function () {
            enemy.kill();
        });

        // Bounce the hero up after stomping
        hero.body.velocity.y = -JUMP_SPEED / 2;

        this.sfx.stomp.play();
    } else {
        // Hero touched enemy from side or below -> die
        this._killHero();
    }
};

PlayState._killHero = function () {
    this.hero.kill();
    // Restart the level after a short delay
    this.game.time.events.add(500, function () {
        this.game.state.restart(true, false, { level: this.level });
    }, this);
};
```

- If `hero.body.velocity.y > 0`, the hero is moving downward (falling), indicating a stomp.
- On stomp: the enemy stops, plays its death animation, and is removed. The hero bounces up.
- If the hero is not falling, the hero dies. `this.hero.kill()` removes the hero from the game.
- After 500ms, the entire state is restarted, effectively reloading the level.

### Add Stomp Sound

```javascript
// In PlayState.create, add to sfx:
this.sfx = {
    jump: this.game.add.audio('sfx:jump'),
    coin: this.game.add.audio('sfx:coin'),
    stomp: this.game.add.audio('sfx:stomp')
};
```

### Adding a Death Animation for the Hero

Make the hero flash and fall off the screen when dying:

```javascript
PlayState._killHero = function () {
    this.hero.alive = false;

    // Play a "dying" visual: the hero jumps up and falls off screen
    this.hero.body.velocity.y = -JUMP_SPEED / 2;
    this.hero.body.velocity.x = 0;
    this.hero.body.allowGravity = true;

    // Disable collisions so the hero falls through platforms
    this.hero.body.collideWorldBounds = false;

    // Restart after a delay
    this.game.time.events.add(1000, function () {
        this.game.state.restart(true, false, { level: this.level });
    }, this);
};
```

### Guarding Input When Dead

Prevent input from controlling the hero after death:

```javascript
PlayState._handleInput = function () {
    if (!this.hero.alive) { return; }

    if (this.keys.left.isDown) {
        this.hero.body.velocity.x = -SPEED;
    } else if (this.keys.right.isDown) {
        this.hero.body.velocity.x = SPEED;
    } else {
        this.hero.body.velocity.x = 0;
    }

    if (this.keys.up.isDown) {
        this._jump();
    }
};
```

- `this.hero.alive` is set to `false` in `_killHero`, so input is ignored after death and the hero falls off screen naturally.

---

## Scoreboard

Display the number of collected coins on screen using a bitmap font.

### Loading the Bitmap Font

```javascript
// In PlayState.preload:
this.game.load.image('font:numbers', 'images/numbers.png');
this.game.load.image('icon:coin', 'images/coin_icon.png');
```

### Creating the HUD

Create a fixed HUD (heads-up display) that shows the coin icon and count:

```javascript
PlayState._createHud = function () {
    let coinIcon = this.game.make.image(0, 0, 'icon:coin');

    // Create a dynamic text label for the coin count
    this.hud = this.game.add.group();

    // Use a retroFont or a regular text object for the score
    let scoreStyle = {
        font: '30px monospace',
        fill: '#fff'
    };
    this.coinFont = this.game.add.text(
        coinIcon.width + 7, 0, 'x0', scoreStyle
    );

    this.hud.add(coinIcon);
    this.hud.add(this.coinFont);

    this.hud.position.set(10, 10);
    this.hud.fixedToCamera = true;
};
```

Alternatively, using Phaser's `RetroFont` for pixel-art number rendering:

```javascript
PlayState._createHud = function () {
    // Bitmap-based number rendering using RetroFont
    this.coinFont = this.game.add.retroFont(
        'font:numbers', 20, 26,
        '0123456789X ', 6
    );

    let coinIcon = this.game.make.image(0, 0, 'icon:coin');

    let coinScoreImg = this.game.make.image(
        coinIcon.x + coinIcon.width + 7, 0, this.coinFont
    );

    this.hud = this.game.add.group();
    this.hud.add(coinIcon);
    this.hud.add(coinScoreImg);
    this.hud.position.set(10, 10);
    this.hud.fixedToCamera = true;
};
```

- `retroFont` creates a bitmap font from a spritesheet containing character glyphs.
- Parameters: image key, character width, character height, character set string, number of characters per row.

### Calling createHud in create

```javascript
PlayState.create = function () {
    this.game.add.image(0, 0, 'background');

    this._loadLevel(this.game.cache.getJSON('level:1'));

    // Create the HUD
    this._createHud();
};
```

### Updating the Score Display

Update the score text whenever a coin is collected:

```javascript
PlayState._onHeroVsCoin = function (hero, coin) {
    this.sfx.coin.play();
    coin.kill();
    this.coinPickupCount++;

    // Update the HUD
    this.coinFont.text = 'x' + this.coinPickupCount;
};
```

---

## Animations for the Main Character

Replace the static hero image with a spritesheet and add animations for different states: idle (stopped), running, jumping, and falling.

### Loading the Hero Spritesheet

Replace the single image load with a spritesheet in `preload`:

```javascript
// Replace: this.game.load.image('hero', 'images/hero_stopped.png');
// With:
this.game.load.spritesheet('hero', 'images/hero.png', 36, 42);
```

- The hero spritesheet is 36 pixels wide and 42 pixels tall per frame.
- Frames include idle, walk cycle, jump, and fall poses.

### Defining Animations

In `_spawnCharacters`, add animation definitions after creating the hero sprite:

```javascript
PlayState._spawnCharacters = function (data) {
    this.hero = this.game.add.sprite(data.hero.x, data.hero.y, 'hero');
    this.hero.anchor.set(0.5, 1);
    this.game.physics.enable(this.hero);

    // Define animations
    this.hero.animations.add('stop', [0]);               // Single frame: idle
    this.hero.animations.add('run', [1, 2], 8, true);    // 2 frames at 8fps, looping
    this.hero.animations.add('jump', [3]);                // Single frame: jumping up
    this.hero.animations.add('fall', [4]);                // Single frame: falling down
};
```

- `animations.add(name, frames, fps, loop)` registers an animation with the given name.
- Single-frame animations like `stop`, `jump`, and `fall` effectively set a static pose.
- The `run` animation alternates between frames 1 and 2 at 8fps.

### Playing the Correct Animation

Add a method to determine and play the right animation based on the hero's current state:

```javascript
PlayState._getAnimationName = function () {
    let name = 'stop'; // Default: standing still

    if (!this.hero.alive) {
        name = 'stop'; // Use idle frame when dead
    } else if (this.hero.body.velocity.y < 0) {
        name = 'jump'; // Moving upward
    } else if (this.hero.body.velocity.y > 0 && !this.hero.body.touching.down) {
        name = 'fall'; // Moving downward and not on ground
    } else if (this.hero.body.velocity.x !== 0 && this.hero.body.touching.down) {
        name = 'run';  // Moving horizontally on the ground
    }

    return name;
};
```

### Flipping the Sprite Based on Direction

Update the hero's facing direction and play the animation in `update`:

```javascript
PlayState.update = function () {
    this._handleCollisions();
    this._handleInput();

    // Flip sprite based on movement direction
    if (this.hero.body.velocity.x < 0) {
        this.hero.scale.x = -1; // Face left
    } else if (this.hero.body.velocity.x > 0) {
        this.hero.scale.x = 1;  // Face right
    }

    // Play the appropriate animation
    this.hero.animations.play(this._getAnimationName());

    // Update spider directions
    this.spiders.forEach(function (spider) {
        if (spider.body.touching.right || spider.body.blocked.right) {
            spider.body.velocity.x = -Spider.SPEED;
        } else if (spider.body.touching.left || spider.body.blocked.left) {
            spider.body.velocity.x = Spider.SPEED;
        }
    }, this);
};
```

- `this.hero.scale.x = -1` flips the sprite horizontally to face left. Setting it to `1` faces right. Because the anchor is at `(0.5, 1)`, the flip looks natural.
- `animations.play()` only restarts the animation if the name changes, so calling it every frame is safe and efficient.

---

## Win Condition

Add a door and key mechanic: the hero must collect a key, then reach the door to complete the level.

### Loading Door and Key Assets

```javascript
// In PlayState.preload:
this.game.load.spritesheet('door', 'images/door.png', 42, 66);
this.game.load.spritesheet('key', 'images/key.png', 20, 22);  // Key bobbing animation
this.game.load.image('icon:key', 'images/key_icon.png');

this.game.load.audio('sfx:key', 'audio/sfx/key.wav');
this.game.load.audio('sfx:door', 'audio/sfx/door.wav');
```

### Spawning the Door and Key

Update `_loadLevel` and `_spawnCharacters`:

```javascript
PlayState._loadLevel = function (data) {
    this.platforms = this.game.add.group();
    this.coins = this.game.add.group();
    this.spiders = this.game.add.group();
    this.enemyWalls = this.game.add.group();
    this.bgDecoration = this.game.add.group();

    // Must spawn decorations first (background layer)
    // Spawn door before hero so it renders behind the hero
    data.platforms.forEach(this._spawnPlatform, this);
    data.coins.forEach(this._spawnCoin, this);
    data.spiders.forEach(this._spawnSpider, this);

    this._spawnDoor(data.door.x, data.door.y);
    this._spawnKey(data.key.x, data.key.y);
    this._spawnCharacters({ hero: data.hero });

    this.enemyWalls.visible = false;

    this.coinPickupCount = 0;
    this.hasKey = false;
};

PlayState._spawnDoor = function (x, y) {
    this.door = this.bgDecoration.create(x, y, 'door');
    this.door.anchor.setTo(0.5, 1);

    this.game.physics.enable(this.door);
    this.door.body.allowGravity = false;
};

PlayState._spawnKey = function (x, y) {
    this.key = this.bgDecoration.create(x, y, 'key');
    this.key.anchor.set(0.5, 0.5);

    this.game.physics.enable(this.key);
    this.key.body.allowGravity = false;

    // Add a bobbing up-and-down tween to the key
    this.key.y -= 3;
    this.game.add.tween(this.key)
        .to({ y: this.key.y + 6 }, 800, Phaser.Easing.Sinusoidal.InOut)
        .yoyo(true)
        .loop()
        .start();
};
```

- The door is placed in a background decoration group so it renders behind the hero.
- The key has a sinusoidal bobbing tween that moves it 6 pixels up and down over 800ms, looping forever.

### Collecting the Key and Opening the Door

Add key and door sound effects to the sfx object:

```javascript
// In PlayState.create sfx:
this.sfx = {
    jump: this.game.add.audio('sfx:jump'),
    coin: this.game.add.audio('sfx:coin'),
    stomp: this.game.add.audio('sfx:stomp'),
    key: this.game.add.audio('sfx:key'),
    door: this.game.add.audio('sfx:door')
};
```

Add overlap detection for the key and door in `_handleCollisions`:

```javascript
PlayState._handleCollisions = function () {
    this.game.physics.arcade.collide(this.hero, this.platforms);
    this.game.physics.arcade.collide(this.spiders, this.platforms);
    this.game.physics.arcade.collide(this.spiders, this.enemyWalls);

    this.game.physics.arcade.overlap(
        this.hero, this.coins, this._onHeroVsCoin, null, this
    );
    this.game.physics.arcade.overlap(
        this.hero, this.spiders, this._onHeroVsEnemy, null, this
    );
    this.game.physics.arcade.overlap(
        this.hero, this.key, this._onHeroVsKey, null, this
    );
    this.game.physics.arcade.overlap(
        this.hero, this.door, this._onHeroVsDoor,
        // Only trigger if the hero has the key
        function (hero, door) {
            return this.hasKey && hero.body.touching.down;
        }, this
    );
};
```

- The door overlap has a **process callback** (the fourth argument) that only triggers the overlap callback when `this.hasKey` is true and the hero is standing on something. This prevents the hero from entering the door while falling or without the key.

### Key and Door Callbacks

```javascript
PlayState._onHeroVsKey = function (hero, key) {
    this.sfx.key.play();
    key.kill();
    this.hasKey = true;
};

PlayState._onHeroVsDoor = function (hero, door) {
    this.sfx.door.play();

    // Freeze the hero and play the door opening animation
    hero.body.velocity.x = 0;
    hero.body.velocity.y = 0;
    hero.body.enable = false;

    // Play door open animation (transition from closed to open frame)
    door.frame = 1; // Switch to "open" frame

    // Advance to the next level after a short delay
    this.game.time.events.add(500, this._goToNextLevel, this);
};

PlayState._goToNextLevel = function () {
    this.camera.fade('#000');
    this.camera.onFadeComplete.addOnce(function () {
        this.game.state.restart(true, false, {
            level: this.level + 1
        });
    }, this);
};
```

- When the hero touches the key, the key is removed and `hasKey` is set to `true`.
- When the hero reaches the door (with the key), the hero freezes, the door opens, and after a delay the game transitions to the next level.
- `camera.fade()` creates a fade-to-black transition for a polished level switch.

### Showing the Key Icon in the HUD

Update `_createHud` to show whether the hero has collected the key:

```javascript
PlayState._createHud = function () {
    this.keyIcon = this.game.make.image(0, 19, 'icon:key');
    this.keyIcon.anchor.set(0, 0.5);

    // ... existing coin HUD code ...

    this.hud.add(this.keyIcon);
    this.hud.add(coinIcon);
    this.hud.add(coinScoreImg);
    this.hud.position.set(10, 10);
    this.hud.fixedToCamera = true;
};
```

Update the key icon appearance each frame in `update`:

```javascript
// In PlayState.update, add:
this.keyIcon.frame = this.hasKey ? 1 : 0;
```

- Frame 0 shows a grayed-out key icon; frame 1 shows the collected key icon.

---

## Switching Levels

Support multiple levels by loading different JSON files based on a level index.

### Passing Level Number Through init

Modify `init` to accept a level parameter:

```javascript
PlayState.init = function (data) {
    this.game.renderer.renderSession.roundPixels = true;

    this.keys = this.game.input.keyboard.addKeys({
        left: Phaser.KeyCode.LEFT,
        right: Phaser.KeyCode.RIGHT,
        up: Phaser.KeyCode.UP
    });

    this.game.physics.startSystem(Phaser.Physics.ARCADE);
    this.game.physics.arcade.gravity.y = 1200;

    // Store the current level number (default to 0)
    this.level = (data.level || 0) % LEVEL_COUNT;
};

const LEVEL_COUNT = 2; // Total number of levels
```

- `data` is an object passed from `game.state.start()` or `game.state.restart()`.
- The modulo operation (`% LEVEL_COUNT`) wraps around to level 0 after the last level, creating an infinite loop of levels.

### Loading Level Data Dynamically

Update `preload` to load the correct level based on `this.level`:

```javascript
PlayState.preload = function () {
    this.game.load.image('background', 'images/background.png');

    // Load the current level's JSON data
    this.game.load.json('level:0', 'data/level00.json');
    this.game.load.json('level:1', 'data/level01.json');

    // ... load all other assets ...
};
```

Update `create` to use the correct level data:

```javascript
PlayState.create = function () {
    this.sfx = {
        jump: this.game.add.audio('sfx:jump'),
        coin: this.game.add.audio('sfx:coin'),
        stomp: this.game.add.audio('sfx:stomp'),
        key: this.game.add.audio('sfx:key'),
        door: this.game.add.audio('sfx:door')
    };

    this.game.add.image(0, 0, 'background');

    // Load level data based on current level number
    this._loadLevel(this.game.cache.getJSON('level:' + this.level));

    this._createHud();
};
```

### Starting the Game at Level 0

Update the initial state start to pass level 0:

```javascript
window.onload = function () {
    let game = new Phaser.Game(960, 600, Phaser.AUTO, 'game');
    game.state.add('play', PlayState);
    game.state.start('play', true, false, { level: 0 });
};
```

- The third and fourth `start` arguments control world/cache clearing. `true, false` keeps the cache between restarts (so assets do not need to be reloaded) but clears the world.
- `{ level: 0 }` is passed to `init` as the `data` parameter.

### Level Transition Flow

The complete level flow is:

1. Hero collects key -> `hasKey = true`
2. Hero reaches door -> `_onHeroVsDoor` fires
3. Camera fades to black -> `_goToNextLevel` fires
4. State restarts with `{ level: this.level + 1 }`
5. `init` receives the new level number
6. The correct level JSON is loaded and the game continues

---

## Moving Forward

Congratulations -- you have built a complete 2D platformer. Here are ideas for extending the game further:

### Suggested Improvements

- **Mobile / touch controls:** Add on-screen buttons or swipe gestures using `game.input.onDown` for touch-enabled devices.
- **More levels:** Create additional JSON level files with new platform layouts, coin placements, and enemy configurations.
- **Menu screen:** Add a `MenuState` with a title screen and start button before entering `PlayState`.
- **Game over screen:** Instead of instantly restarting, show a "Game Over" screen with the score.
- **Lives system:** Give the hero multiple lives instead of instant restart.
- **Power-ups:** Add items like speed boosts, double jump, or invincibility.
- **Moving platforms:** Create platforms that travel along a path using tweens.
- **Different enemy types:** Add flying enemies, enemies that shoot projectiles, or enemies with different movement patterns.
- **Parallax scrolling:** Add multiple background layers that scroll at different speeds for depth.
- **Camera scrolling:** For levels wider than the screen, use `game.camera.follow(this.hero)` to scroll with the hero.
- **Sound and music:** Add background music and additional sound effects for a more polished experience.
- **Particle effects:** Use Phaser's particle emitter for coin collection sparkles, enemy death effects, or dust when landing.

### Full Game Source Reference

Below is the complete `main.js` file combining all steps for reference. This represents the final state of the game with all features:

```javascript
// =============================================================================
// Constants
// =============================================================================

const SPEED = 200;
const JUMP_SPEED = 600;
const LEVEL_COUNT = 2;
const Spider = { SPEED: 100 };

// =============================================================================
// Game State: PlayState
// =============================================================================

PlayState = {};

// -----------------------------------------------------------------------------
// init
// -----------------------------------------------------------------------------

PlayState.init = function (data) {
    this.game.renderer.renderSession.roundPixels = true;

    this.keys = this.game.input.keyboard.addKeys({
        left: Phaser.KeyCode.LEFT,
        right: Phaser.KeyCode.RIGHT,
        up: Phaser.KeyCode.UP
    });

    this.game.physics.startSystem(Phaser.Physics.ARCADE);
    this.game.physics.arcade.gravity.y = 1200;

    this.level = (data.level || 0) % LEVEL_COUNT;
};

// -----------------------------------------------------------------------------
// preload
// -----------------------------------------------------------------------------

PlayState.preload = function () {
    // Background
    this.game.load.image('background', 'images/background.png');

    // Level data
    this.game.load.json('level:0', 'data/level00.json');
    this.game.load.json('level:1', 'data/level01.json');

    // Platform tiles
    this.game.load.image('ground', 'images/ground.png');
    this.game.load.image('grass:8x1', 'images/grass_8x1.png');
    this.game.load.image('grass:6x1', 'images/grass_6x1.png');
    this.game.load.image('grass:4x1', 'images/grass_4x1.png');
    this.game.load.image('grass:2x1', 'images/grass_2x1.png');
    this.game.load.image('grass:1x1', 'images/grass_1x1.png');

    // Characters
    this.game.load.spritesheet('hero', 'images/hero.png', 36, 42);
    this.game.load.spritesheet('spider', 'images/spider.png', 42, 32);
    this.game.load.image('invisible-wall', 'images/invisible_wall.png');

    // Collectibles
    this.game.load.spritesheet('coin', 'images/coin_animated.png', 22, 22);
    this.game.load.spritesheet('key', 'images/key.png', 20, 22);
    this.game.load.spritesheet('door', 'images/door.png', 42, 66);

    // HUD
    this.game.load.image('icon:coin', 'images/coin_icon.png');
    this.game.load.image('icon:key', 'images/key_icon.png');
    this.game.load.image('font:numbers', 'images/numbers.png');

    // Audio
    this.game.load.audio('sfx:jump', 'audio/sfx/jump.wav');
    this.game.load.audio('sfx:coin', 'audio/sfx/coin.wav');
    this.game.load.audio('sfx:stomp', 'audio/sfx/stomp.wav');
    this.game.load.audio('sfx:key', 'audio/sfx/key.wav');
    this.game.load.audio('sfx:door', 'audio/sfx/door.wav');
};

// -----------------------------------------------------------------------------
// create
// -----------------------------------------------------------------------------

PlayState.create = function () {
    // Sound effects
    this.sfx = {
        jump: this.game.add.audio('sfx:jump'),
        coin: this.game.add.audio('sfx:coin'),
        stomp: this.game.add.audio('sfx:stomp'),
        key: this.game.add.audio('sfx:key'),
        door: this.game.add.audio('sfx:door')
    };

    // Background
    this.game.add.image(0, 0, 'background');

    // Load level
    this._loadLevel(this.game.cache.getJSON('level:' + this.level));

    // HUD
    this._createHud();
};

// -----------------------------------------------------------------------------
// update
// -----------------------------------------------------------------------------

PlayState.update = function () {
    this._handleCollisions();
    this._handleInput();

    // Update hero sprite direction and animation
    if (this.hero.body.velocity.x < 0) {
        this.hero.scale.x = -1;
    } else if (this.hero.body.velocity.x > 0) {
        this.hero.scale.x = 1;
    }
    this.hero.animations.play(this._getAnimationName());

    // Update spider directions when hitting walls
    this.spiders.forEach(function (spider) {
        if (spider.body.touching.right || spider.body.blocked.right) {
            spider.body.velocity.x = -Spider.SPEED;
        } else if (spider.body.touching.left || spider.body.blocked.left) {
            spider.body.velocity.x = Spider.SPEED;
        }
    }, this);

    // Update key icon in HUD
    this.keyIcon.frame = this.hasKey ? 1 : 0;
};

// -----------------------------------------------------------------------------
// Level Loading
// -----------------------------------------------------------------------------

PlayState._loadLevel = function (data) {
    // Create groups (order matters for rendering layers)
    this.bgDecoration = this.game.add.group();
    this.platforms = this.game.add.group();
    this.coins = this.game.add.group();
    this.spiders = this.game.add.group();
    this.enemyWalls = this.game.add.group();

    // Spawn entities from level data
    data.platforms.forEach(this._spawnPlatform, this);
    data.coins.forEach(this._spawnCoin, this);
    data.spiders.forEach(this._spawnSpider, this);

    this._spawnDoor(data.door.x, data.door.y);
    this._spawnKey(data.key.x, data.key.y);
    this._spawnCharacters({ hero: data.hero });

    // Hide invisible walls
    this.enemyWalls.visible = false;

    // Initialize game state
    this.coinPickupCount = 0;
    this.hasKey = false;
};

// -----------------------------------------------------------------------------
// Spawn Methods
// -----------------------------------------------------------------------------

PlayState._spawnPlatform = function (platform) {
    let sprite = this.platforms.create(platform.x, platform.y, platform.image);
    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;
    sprite.body.immovable = true;

    // Add invisible walls at both edges for enemy AI
    this._spawnEnemyWall(platform.x, platform.y, 'left');
    this._spawnEnemyWall(platform.x + sprite.width, platform.y, 'right');
};

PlayState._spawnEnemyWall = function (x, y, side) {
    let sprite = this.enemyWalls.create(x, y, 'invisible-wall');
    sprite.anchor.set(side === 'left' ? 1 : 0, 1);
    this.game.physics.enable(sprite);
    sprite.body.immovable = true;
    sprite.body.allowGravity = false;
};

PlayState._spawnCharacters = function (data) {
    this.hero = this.game.add.sprite(data.hero.x, data.hero.y, 'hero');
    this.hero.anchor.set(0.5, 1);
    this.game.physics.enable(this.hero);
    this.hero.body.collideWorldBounds = true;

    // Hero animations
    this.hero.animations.add('stop', [0]);
    this.hero.animations.add('run', [1, 2], 8, true);
    this.hero.animations.add('jump', [3]);
    this.hero.animations.add('fall', [4]);
};

PlayState._spawnCoin = function (coin) {
    let sprite = this.coins.create(coin.x, coin.y, 'coin');
    sprite.anchor.set(0.5, 0.5);
    this.game.physics.enable(sprite);
    sprite.body.allowGravity = false;

    sprite.animations.add('rotate', [0, 1, 2, 1], 6, true);
    sprite.animations.play('rotate');
};

PlayState._spawnSpider = function (spider) {
    let sprite = this.spiders.create(spider.x, spider.y, 'spider');
    sprite.anchor.set(0.5, 1);
    this.game.physics.enable(sprite);

    sprite.animations.add('crawl', [0, 1, 2], 8, true);
    sprite.animations.add('die', [0, 4, 0, 4, 0, 4, 3, 3, 3, 3, 3, 3], 12);
    sprite.animations.play('crawl');

    sprite.body.velocity.x = Spider.SPEED;
};

PlayState._spawnDoor = function (x, y) {
    this.door = this.bgDecoration.create(x, y, 'door');
    this.door.anchor.setTo(0.5, 1);
    this.game.physics.enable(this.door);
    this.door.body.allowGravity = false;
};

PlayState._spawnKey = function (x, y) {
    this.key = this.bgDecoration.create(x, y, 'key');
    this.key.anchor.set(0.5, 0.5);
    this.game.physics.enable(this.key);
    this.key.body.allowGravity = false;

    // Bobbing tween
    this.key.y -= 3;
    this.game.add.tween(this.key)
        .to({ y: this.key.y + 6 }, 800, Phaser.Easing.Sinusoidal.InOut)
        .yoyo(true)
        .loop()
        .start();
};

// -----------------------------------------------------------------------------
// Input
// -----------------------------------------------------------------------------

PlayState._handleInput = function () {
    if (!this.hero.alive) { return; }

    if (this.keys.left.isDown) {
        this.hero.body.velocity.x = -SPEED;
    } else if (this.keys.right.isDown) {
        this.hero.body.velocity.x = SPEED;
    } else {
        this.hero.body.velocity.x = 0;
    }

    if (this.keys.up.isDown) {
        this._jump();
    }
};

PlayState._jump = function () {
    let canJump = this.hero.body.touching.down;
    if (canJump) {
        this.hero.body.velocity.y = -JUMP_SPEED;
        this.sfx.jump.play();
    }
    return canJump;
};

// -----------------------------------------------------------------------------
// Collisions
// -----------------------------------------------------------------------------

PlayState._handleCollisions = function () {
    // Physical collisions
    this.game.physics.arcade.collide(this.hero, this.platforms);
    this.game.physics.arcade.collide(this.spiders, this.platforms);
    this.game.physics.arcade.collide(this.spiders, this.enemyWalls);

    // Overlap detection (no physical push)
    this.game.physics.arcade.overlap(
        this.hero, this.coins, this._onHeroVsCoin, null, this
    );
    this.game.physics.arcade.overlap(
        this.hero, this.spiders, this._onHeroVsEnemy, null, this
    );
    this.game.physics.arcade.overlap(
        this.hero, this.key, this._onHeroVsKey, null, this
    );
    this.game.physics.arcade.overlap(
        this.hero, this.door, this._onHeroVsDoor,
        function (hero, door) {
            return this.hasKey && hero.body.touching.down;
        }, this
    );
};

// -----------------------------------------------------------------------------
// Collision Callbacks
// -----------------------------------------------------------------------------

PlayState._onHeroVsCoin = function (hero, coin) {
    this.sfx.coin.play();
    coin.kill();
    this.coinPickupCount++;
    this.coinFont.text = 'x' + this.coinPickupCount;
};

PlayState._onHeroVsEnemy = function (hero, enemy) {
    if (hero.body.velocity.y > 0) {
        // Stomp: hero is falling onto the enemy
        enemy.body.velocity.x = 0;
        enemy.body.enable = false;
        enemy.animations.play('die');
        enemy.events.onAnimationComplete.addOnce(function () {
            enemy.kill();
        });
        hero.body.velocity.y = -JUMP_SPEED / 2;
        this.sfx.stomp.play();
    } else {
        // Hero dies
        this._killHero();
    }
};

PlayState._onHeroVsKey = function (hero, key) {
    this.sfx.key.play();
    key.kill();
    this.hasKey = true;
};

PlayState._onHeroVsDoor = function (hero, door) {
    this.sfx.door.play();
    hero.body.velocity.x = 0;
    hero.body.velocity.y = 0;
    hero.body.enable = false;

    door.frame = 1; // Open door

    this.game.time.events.add(500, this._goToNextLevel, this);
};

// -----------------------------------------------------------------------------
// Death and Level Transitions
// -----------------------------------------------------------------------------

PlayState._killHero = function () {
    this.hero.alive = false;
    this.hero.body.velocity.y = -JUMP_SPEED / 2;
    this.hero.body.velocity.x = 0;
    this.hero.body.allowGravity = true;
    this.hero.body.collideWorldBounds = false;

    this.game.time.events.add(1000, function () {
        this.game.state.restart(true, false, { level: this.level });
    }, this);
};

PlayState._goToNextLevel = function () {
    this.camera.fade('#000');
    this.camera.onFadeComplete.addOnce(function () {
        this.game.state.restart(true, false, {
            level: this.level + 1
        });
    }, this);
};

// -----------------------------------------------------------------------------
// Animations
// -----------------------------------------------------------------------------

PlayState._getAnimationName = function () {
    let name = 'stop';

    if (!this.hero.alive) {
        name = 'stop';
    } else if (this.hero.body.velocity.y < 0) {
        name = 'jump';
    } else if (this.hero.body.velocity.y > 0 && !this.hero.body.touching.down) {
        name = 'fall';
    } else if (this.hero.body.velocity.x !== 0 && this.hero.body.touching.down) {
        name = 'run';
    }

    return name;
};

// -----------------------------------------------------------------------------
// HUD
// -----------------------------------------------------------------------------

PlayState._createHud = function () {
    this.keyIcon = this.game.make.image(0, 19, 'icon:key');
    this.keyIcon.anchor.set(0, 0.5);

    let coinIcon = this.game.make.image(
        this.keyIcon.width + 7, 0, 'icon:coin'
    );

    let scoreStyle = { font: '24px monospace', fill: '#fff' };
    this.coinFont = this.game.add.text(
        coinIcon.x + coinIcon.width + 7, 0, 'x0', scoreStyle
    );

    this.hud = this.game.add.group();
    this.hud.add(this.keyIcon);
    this.hud.add(coinIcon);
    this.hud.add(this.coinFont);
    this.hud.position.set(10, 10);
    this.hud.fixedToCamera = true;
};

// =============================================================================
// Entry Point
// =============================================================================

window.onload = function () {
    let game = new Phaser.Game(960, 600, Phaser.AUTO, 'game');
    game.state.add('play', PlayState);
    game.state.start('play', true, false, { level: 0 });
};
```

### Key Concepts Summary

| Concept | Phaser API | Purpose |
|---------|-----------|---------|
| Game instance | `new Phaser.Game(w, h, renderer, container)` | Creates the game canvas and engine |
| Game states | `game.state.add()` / `game.state.start()` | Organizes code into init/preload/create/update lifecycle |
| Loading images | `game.load.image(key, path)` | Loads a static image asset |
| Loading spritesheets | `game.load.spritesheet(key, path, fw, fh)` | Loads an animated spritesheet |
| Loading JSON | `game.load.json(key, path)` | Loads JSON data (level definitions) |
| Loading audio | `game.load.audio(key, path)` | Loads a sound effect |
| Sprite groups | `game.add.group()` | Container for related sprites; enables batch collision detection |
| Physics bodies | `game.physics.enable(sprite)` | Adds an Arcade Physics body to a sprite |
| Gravity | `game.physics.arcade.gravity.y` | Global downward acceleration |
| Collision | `arcade.collide(a, b)` | Physical collision resolution (sprites push each other) |
| Overlap | `arcade.overlap(a, b, callback)` | Detection without physical push (for pickups) |
| Velocity | `sprite.body.velocity.x/y` | Movement speed in pixels per second |
| Immovable | `sprite.body.immovable = true` | Prevents sprite from being pushed by collisions |
| Animations | `sprite.animations.add(name, frames, fps, loop)` | Defines a frame animation |
| Tweens | `game.add.tween(target).to(props, duration, easing)` | Smooth property animation |
| Keyboard input | `game.input.keyboard.addKeys({...})` | Captures specific keyboard keys |
| Camera | `this.camera.fade()` | Screen transition effects |
| Anchor | `sprite.anchor.set(x, y)` | Sets the origin point for positioning and rotation |
| Sprite flipping | `sprite.scale.x = -1` | Horizontally mirrors the sprite |
