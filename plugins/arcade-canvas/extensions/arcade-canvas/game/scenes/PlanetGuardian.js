// Defender — Classic 1981 Williams side-scrolling shooter.
// Protect humanoids from alien landers across a scrolling terrain world.
import { BaseScene, W, H } from './BaseScene.js';
/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
let SCALE = Math.min(W / 1920, H / 1080);
let PX = Math.max(3, Math.round(4 * SCALE));
const WORLD_W_SCREENS = 6;
let WORLD_W = W * WORLD_W_SCREENS;
const PLAYER_THRUST = 1400;
const PLAYER_MAX_VX = 900;
const PLAYER_VY_SPEED = 500;
const PLAYER_FRICTION = 0.985; // high inertia — ship coasts like original
const BULLET_SPEED = 1200;
const MAX_BULLETS = 8;
const INVINCIBLE_TIME = 2000;
const RESPAWN_DELAY = 800;
const EXTRA_LIFE_SCORE = 10000;
const TERRAIN_SAMPLE = 20; // pixels between terrain height samples
const TERRAIN_MIN_Y = 0.65; // fraction of H for highest peak
const TERRAIN_MAX_Y = 0.88; // fraction of H for lowest valley
const RADAR_H = 50; // taller for visibility
const RADAR_Y = 105; // well below HUD bar (~91px tall)
const ENEMY_BULLET_SPEED = 400;
const RESPAWN_SAFE_RADIUS = 300;
const RESPAWN_SAFE_RADIUS_BAITER = 600;
const RESPAWN_PUSH_OFFSET = 150;
/* ------------------------------------------------------------------ */
/*  Pixel Art Data — dimensions matched to original ROM sprite list    */
/*  Reference: https://www.seanriddle.com/defendersprites.txt          */
/* ------------------------------------------------------------------ */
// Ship: ROM = 16×6 px (8 bytes × 6 rows)
// From MAME screenshots: sleek profile facing right
// - Tapers at top and bottom (rows 0,5 are narrow)
// - Widest at center rows (1-4)
// - Magenta engine block at rear left
// - White body, cyan nose tip at right
// - Green exhaust pixels at bottom-left
const SHIP_PIXELS = [
    // Row 0 — top taper (narrow, no engine visible)
    [6, 0, 0xffffff], [7, 0, 0xffffff], [8, 0, 0xffffff], [9, 0, 0xffffff],
    [10, 0, 0xffffff], [11, 0, 0xffffff], [12, 0, 0xffffff], [13, 0, 0xffffff],
    // Row 1 — wider, engine appears
    [2, 1, 0xff00ff], [3, 1, 0xff44ff],
    [4, 1, 0xffffff], [5, 1, 0xffffff], [6, 1, 0xffffff], [7, 1, 0xffffff],
    [8, 1, 0xffffff], [9, 1, 0xffffff], [10, 1, 0xffffff], [11, 1, 0xffffff],
    [12, 1, 0xffffff], [13, 1, 0xffffff], [14, 1, 0xffffff],
    // Row 2 — full width (widest), engine + body + nose tip
    [0, 2, 0xff00ff], [1, 2, 0xff00ff], [2, 2, 0xff00ff], [3, 2, 0xff44ff],
    [4, 2, 0xffffff], [5, 2, 0xffffff], [6, 2, 0xffffff], [7, 2, 0xffffff],
    [8, 2, 0xffffff], [9, 2, 0xffffff], [10, 2, 0xffffff], [11, 2, 0xffffff],
    [12, 2, 0xffffff], [13, 2, 0xffffff], [14, 2, 0xffffff], [15, 2, 0x00ccff],
    // Row 3 — full width (widest), engine + body + nose tip
    [0, 3, 0xff00ff], [1, 3, 0xff00ff], [2, 3, 0xff00ff], [3, 3, 0xff44ff],
    [4, 3, 0xffffff], [5, 3, 0xffffff], [6, 3, 0xffffff], [7, 3, 0xffffff],
    [8, 3, 0xffffff], [9, 3, 0xffffff], [10, 3, 0xffffff], [11, 3, 0xffffff],
    [12, 3, 0xffffff], [13, 3, 0xffffff], [14, 3, 0xffffff], [15, 3, 0x00ccff],
    // Row 4 — wider, engine appears
    [2, 4, 0xff00ff], [3, 4, 0xff44ff],
    [4, 4, 0xffffff], [5, 4, 0xffffff], [6, 4, 0xffffff], [7, 4, 0xffffff],
    [8, 4, 0xffffff], [9, 4, 0xffffff], [10, 4, 0xffffff], [11, 4, 0xffffff],
    [12, 4, 0xffffff], [13, 4, 0xffffff], [14, 4, 0xffffff],
    // Row 5 — bottom taper + green exhaust trail
    [4, 5, 0xffffff], [5, 5, 0xffffff], [6, 5, 0xffffff], [7, 5, 0xffffff],
    [8, 5, 0xffffff], [9, 5, 0xffffff], [10, 5, 0xffffff], [11, 5, 0xffffff],
    [0, 5, 0x00ff00], [1, 5, 0x00ff00],
];
// Lander: ROM = 10×8 px (5 bytes × 8 rows)
// H-shaped: diamond body with grabber legs below
const LANDER_PIXELS = [
    // Row 0 — top center
    [4, 0, 0x00ff00], [5, 0, 0x00ff00],
    // Row 1 — upper diamond
    [3, 1, 0x00ff00], [4, 1, 0xffff00], [5, 1, 0xffff00], [6, 1, 0x00ff00],
    // Row 2 — widest body
    [2, 2, 0x00ff00], [3, 2, 0x00ff00], [4, 2, 0x00ff00], [5, 2, 0x00ff00], [6, 2, 0x00ff00], [7, 2, 0x00ff00],
    // Row 3 — full width with side detail
    [1, 3, 0x00ff00], [2, 3, 0x00ff00], [3, 3, 0xffff00], [4, 3, 0x00ff00], [5, 3, 0x00ff00], [6, 3, 0xffff00], [7, 3, 0x00ff00], [8, 3, 0x00ff00],
    // Row 4 — lower body
    [2, 4, 0x00ff00], [3, 4, 0x00ff00], [4, 4, 0x00ff00], [5, 4, 0x00ff00], [6, 4, 0x00ff00], [7, 4, 0x00ff00],
    // Row 5 — narrowing
    [3, 5, 0x00ff00], [4, 5, 0x00ff00], [5, 5, 0x00ff00], [6, 5, 0x00ff00],
    // Row 6 — legs
    [1, 6, 0xffff00], [2, 6, 0xffff00], [7, 6, 0xffff00], [8, 6, 0xffff00],
    // Row 7 — leg tips
    [0, 7, 0xffff00], [1, 7, 0xffff00], [8, 7, 0xffff00], [9, 7, 0xffff00],
];
// Mutant: ROM = 10×8 px (5 bytes × 8 rows)
// Composite of lander + humanoid overlay, blobby organic look
const MUTANT_PIXELS = [
    // Row 0
    [3, 0, 0xff00ff], [4, 0, 0xff00ff], [5, 0, 0xff00ff], [6, 0, 0xff00ff],
    // Row 1
    [2, 1, 0xff00ff], [3, 1, 0xcc00cc], [4, 1, 0xcc00cc], [5, 1, 0xcc00cc], [6, 1, 0xcc00cc], [7, 1, 0xff00ff],
    // Row 2 — yellow-green eyes
    [1, 2, 0xff00ff], [2, 2, 0xff00ff], [3, 2, 0xaaff00], [4, 2, 0xff00ff], [5, 2, 0xff00ff], [6, 2, 0xaaff00], [7, 2, 0xff00ff], [8, 2, 0xff00ff],
    // Row 3 — widest
    [0, 3, 0xff00ff], [1, 3, 0xff00ff], [2, 3, 0xff00ff], [3, 3, 0xff00ff], [4, 3, 0xff00ff], [5, 3, 0xff00ff], [6, 3, 0xff00ff], [7, 3, 0xff00ff], [8, 3, 0xff00ff], [9, 3, 0xff00ff],
    // Row 4 — widest
    [0, 4, 0xff00ff], [1, 4, 0xff00ff], [2, 4, 0xff00ff], [3, 4, 0xff00ff], [4, 4, 0xff00ff], [5, 4, 0xff00ff], [6, 4, 0xff00ff], [7, 4, 0xff00ff], [8, 4, 0xff00ff], [9, 4, 0xff00ff],
    // Row 5
    [1, 5, 0xcc00cc], [2, 5, 0xff00ff], [3, 5, 0xff00ff], [4, 5, 0xff00ff], [5, 5, 0xff00ff], [6, 5, 0xff00ff], [7, 5, 0xff00ff], [8, 5, 0xcc00cc],
    // Row 6
    [2, 6, 0xcc00cc], [3, 6, 0xff00ff], [4, 6, 0xff00ff], [5, 6, 0xff00ff], [6, 6, 0xff00ff], [7, 6, 0xcc00cc],
    // Row 7
    [3, 7, 0xcc00cc], [4, 7, 0xcc00cc], [5, 7, 0xcc00cc], [6, 7, 0xcc00cc],
];
// Humanoid: ROM = 4×8 px (2 bytes × 8 rows)
// Multi-colored: green upper body, magenta/pink lower half
const HUMANOID_PIXELS = [
    // Row 0 — head (green)
    [1, 0, 0x00ff00], [2, 0, 0x00ff00],
    // Row 1 — neck (green)
    [1, 1, 0x00ff00], [2, 1, 0x00ff00],
    // Row 2 — arms + torso (green)
    [0, 2, 0x00ff00], [1, 2, 0x00ff00], [2, 2, 0x00ff00], [3, 2, 0x00ff00],
    // Row 3 — torso (green)
    [1, 3, 0x00ff00], [2, 3, 0x00ff00],
    // Row 4 — waist (magenta transition)
    [1, 4, 0xff00ff], [2, 4, 0xff00ff],
    // Row 5 — hips (magenta)
    [1, 5, 0xff00ff], [2, 5, 0xff00ff],
    // Row 6 — legs (magenta)
    [0, 6, 0xff00ff], [3, 6, 0xff00ff],
    // Row 7 — feet (magenta)
    [0, 7, 0xff00ff], [3, 7, 0xff00ff],
];
// Bomber: ROM = 8×8 px (4 bytes × 8 rows)
// Compact square block with segmented look, NOT a wide rectangle
const BOMBER_PIXELS = [
    // Row 0 — top edge
    [1, 0, 0xffff00], [2, 0, 0xffff00], [3, 0, 0xffff00], [4, 0, 0xffff00], [5, 0, 0xffff00], [6, 0, 0xffff00],
    // Row 1 — top stripe with detail
    [0, 1, 0xffff00], [1, 1, 0xff4400], [2, 1, 0xffff00], [3, 1, 0xff4400], [4, 1, 0xffff00], [5, 1, 0xff4400], [6, 1, 0xffff00], [7, 1, 0xffff00],
    // Row 2 — solid
    [0, 2, 0xffff00], [1, 2, 0xffff00], [2, 2, 0xffff00], [3, 2, 0xffff00], [4, 2, 0xffff00], [5, 2, 0xffff00], [6, 2, 0xffff00], [7, 2, 0xffff00],
    // Row 3 — center detail
    [0, 3, 0xffff00], [1, 3, 0xffff00], [2, 3, 0xff4400], [3, 3, 0xffff00], [4, 3, 0xffff00], [5, 3, 0xff4400], [6, 3, 0xffff00], [7, 3, 0xffff00],
    // Row 4 — center detail
    [0, 4, 0xffff00], [1, 4, 0xffff00], [2, 4, 0xff4400], [3, 4, 0xffff00], [4, 4, 0xffff00], [5, 4, 0xff4400], [6, 4, 0xffff00], [7, 4, 0xffff00],
    // Row 5 — solid
    [0, 5, 0xffff00], [1, 5, 0xffff00], [2, 5, 0xffff00], [3, 5, 0xffff00], [4, 5, 0xffff00], [5, 5, 0xffff00], [6, 5, 0xffff00], [7, 5, 0xffff00],
    // Row 6 — bottom stripe
    [0, 6, 0xffff00], [1, 6, 0xff4400], [2, 6, 0xffff00], [3, 6, 0xff4400], [4, 6, 0xffff00], [5, 6, 0xff4400], [6, 6, 0xffff00], [7, 6, 0xffff00],
    // Row 7 — bottom edge
    [1, 7, 0xffff00], [2, 7, 0xffff00], [3, 7, 0xffff00], [4, 7, 0xffff00], [5, 7, 0xffff00], [6, 7, 0xffff00],
];
// Baiter: ROM = 12×4 px (6 bytes × 4 rows)
// Thin horseshoe/C shape — narrow and aggressive
const BAITER_PIXELS = [
    // Row 0 — top bar
    [0, 0, 0x00ff44], [1, 0, 0x00ff44], [2, 0, 0x00ff44], [3, 0, 0x00ff44], [4, 0, 0x00ff44], [5, 0, 0x00ff44], [6, 0, 0x00ff44], [7, 0, 0x00ff44], [8, 0, 0x00ff44], [9, 0, 0x00ff44], [10, 0, 0x00ff44], [11, 0, 0x00ff44],
    // Row 1 — gap in middle
    [0, 1, 0x00ff44], [1, 1, 0x00ff44], [10, 1, 0x00ff44], [11, 1, 0x00ff44],
    // Row 2 — gap in middle
    [0, 2, 0x00ff44], [1, 2, 0x00ff44], [10, 2, 0x00ff44], [11, 2, 0x00ff44],
    // Row 3 — bottom bar
    [0, 3, 0x00ff44], [1, 3, 0x00ff44], [2, 3, 0x00ff44], [3, 3, 0x00ff44], [4, 3, 0x00ff44], [5, 3, 0x00ff44], [6, 3, 0x00ff44], [7, 3, 0x00ff44], [8, 3, 0x00ff44], [9, 3, 0x00ff44], [10, 3, 0x00ff44], [11, 3, 0x00ff44],
];
// Pod: ROM = 8×8 px (4 bytes × 8 rows)
// Compact oval/circle shape, not a large egg
const POD_PIXELS = [
    // Row 0
    [2, 0, 0xcc00cc], [3, 0, 0xcc00cc], [4, 0, 0xcc00cc], [5, 0, 0xcc00cc],
    // Row 1
    [1, 1, 0xcc00cc], [2, 1, 0xff00ff], [3, 1, 0xff00ff], [4, 1, 0xff00ff], [5, 1, 0xff00ff], [6, 1, 0xcc00cc],
    // Row 2
    [0, 2, 0xcc00cc], [1, 2, 0xff00ff], [2, 2, 0xff00ff], [3, 2, 0xff44ff], [4, 2, 0xff44ff], [5, 2, 0xff00ff], [6, 2, 0xff00ff], [7, 2, 0xcc00cc],
    // Row 3
    [0, 3, 0xcc00cc], [1, 3, 0xff00ff], [2, 3, 0xff44ff], [3, 3, 0xff00ff], [4, 3, 0xff00ff], [5, 3, 0xff44ff], [6, 3, 0xff00ff], [7, 3, 0xcc00cc],
    // Row 4
    [0, 4, 0xcc00cc], [1, 4, 0xff00ff], [2, 4, 0xff44ff], [3, 4, 0xff00ff], [4, 4, 0xff00ff], [5, 4, 0xff44ff], [6, 4, 0xff00ff], [7, 4, 0xcc00cc],
    // Row 5
    [0, 5, 0xcc00cc], [1, 5, 0xff00ff], [2, 5, 0xff00ff], [3, 5, 0xff44ff], [4, 5, 0xff44ff], [5, 5, 0xff00ff], [6, 5, 0xff00ff], [7, 5, 0xcc00cc],
    // Row 6
    [1, 6, 0xcc00cc], [2, 6, 0xff00ff], [3, 6, 0xff00ff], [4, 6, 0xff00ff], [5, 6, 0xff00ff], [6, 6, 0xcc00cc],
    // Row 7
    [2, 7, 0xcc00cc], [3, 7, 0xcc00cc], [4, 7, 0xcc00cc], [5, 7, 0xcc00cc],
];
// Swarmer: ROM = 6×4 px (3 bytes × 4 rows)
// Wider than tall cross/star shape
const SWARMER_PIXELS = [
    // Row 0
    [2, 0, 0xffff00], [3, 0, 0xffff00],
    // Row 1 — full width
    [0, 1, 0xffff00], [1, 1, 0xffff00], [2, 1, 0xffff00], [3, 1, 0xffff00], [4, 1, 0xffff00], [5, 1, 0xffff00],
    // Row 2 — full width
    [0, 2, 0xffff00], [1, 2, 0xffff00], [2, 2, 0xffff00], [3, 2, 0xffff00], [4, 2, 0xffff00], [5, 2, 0xffff00],
    // Row 3
    [2, 3, 0xffff00], [3, 3, 0xffff00],
];
/* ------------------------------------------------------------------ */
/*  Scene                                                              */
/* ------------------------------------------------------------------ */
export class PlanetGuardianScene extends BaseScene {
    /* Player state */
    playerX = 0;
    playerY = 0;
    playerVx = 0;
    playerVy = 0;
    facingRight = true;
    shipAlive = true;
    invincibleTimer = 0;
    respawnTimer = 0;
    smartBombs = 3;
    carriedHumanoid = -1; // index of humanoid being carried, -1 = none
    nextExtraLife = EXTRA_LIFE_SCORE;
    /* Game objects */
    enemies = [];
    humanoids = [];
    bullets = [];
    mines = [];
    stars = [];
    /* Terrain */
    terrainHeights = [];
    planetDestroyed = false;
    /* Camera / scroll */
    cameraX = 0;
    spriteScale = 1; // calculated in create()
    /* Game state */
    wave = 0;
    gameOver = false;
    waveTimer = 0; // time elapsed in current wave (for baiter spawning)
    waveDelay = 0;
    baiterSpawned = false;
    /* Graphics objects */
    gameGfx; // main game graphics
    radarGfx; // radar minimap
    terrainGfx; // terrain graphics
    hudExtraGfx; // smart bomb display
    shipSprite; // player ship sprite
    /* Input */
    cursors;
    fireKey;
    bombKey;
    fireWasDown = false;
    bombWasDown = false;
    fireCooldown = 0; // rapid-fire rate limiter
    thrustSoundPlaying = false;
    constructor() { super('defender'); }
    get displayName() { return 'Planet Guardian'; }
    getDescription() {
        return 'Defend humanoids from alien landers. Rescue the falling and destroy all enemies!';
    }
    getControls() {
        return [
            { key: '← →', action: 'Thrust / Reverse' },
            { key: '↑ ↓', action: 'Move Up / Down' },
            { key: 'SPACE', action: 'Fire Laser (hold)' },
            { key: 'Z', action: 'Smart Bomb' },
        ];
    }
    /* ================================================================
       LIFECYCLE
       ================================================================ */
    preload() {
        // Load sprite PNGs (generated pixel art, CC0-compatible original designs)
        this.load.image('def-ship-r', '../assets/defender/ship.png');
        this.load.image('def-ship-l', '../assets/defender/ship_left.png');
        this.load.image('def-lander', '../assets/defender/lander.png');
        this.load.image('def-mutant', '../assets/defender/mutant.png');
        this.load.image('def-humanoid', '../assets/defender/humanoid.png');
        this.load.image('def-bomber', '../assets/defender/bomber.png');
        this.load.image('def-pod', '../assets/defender/pod.png');
        this.load.image('def-swarmer', '../assets/defender/swarmer.png');
        this.load.image('def-baiter', '../assets/defender/baiter.png');
        // Sounds from OpenDefender
        this.load.audio('snd_laser', '../assets/defender/sounds/sound_laser.ogg');
        this.load.audio('snd_enemydead', '../assets/defender/sounds/sound_enemydead.ogg');
        this.load.audio('snd_explode', '../assets/defender/sounds/sound_explode.ogg');
        this.load.audio('snd_playerdead', '../assets/defender/sounds/sound_playerdead.ogg');
        this.load.audio('snd_bonus', '../assets/defender/sounds/sound_bonus.ogg');
        this.load.audio('snd_humanoiddead', '../assets/defender/sounds/sound_humanoiddead.ogg');
        this.load.audio('snd_start', '../assets/defender/sounds/sound_start.ogg');
        this.load.audio('snd_thrust', '../assets/defender/sounds/sound_thurst.ogg');
        this.load.audio('snd_warning', '../assets/defender/sounds/sound_warning.ogg');
        this.load.audio('snd_baiterwarning', '../assets/defender/sounds/sound_baiterwarning.ogg');
        this.load.audio('snd_player1up', '../assets/defender/sounds/sound_player1up.ogg');
        this.load.audio('snd_enemyshoot', '../assets/defender/sounds/sound_enemyshoot.ogg');
        this.load.audio('snd_enemyshoot2', '../assets/defender/sounds/sound_enemyshoot2.ogg');
    }
    create() {
        this.initBase();
        // Switch Planet Guardian textures to linear filtering for smoother scaling
        const defKeys = ['def-ship-r', 'def-ship-l', 'def-lander', 'def-mutant',
            'def-humanoid', 'def-bomber', 'def-pod', 'def-swarmer', 'def-baiter'];
        for (const k of defKeys) {
            const tex = this.textures.get(k);
            if (tex && tex.source[0]?.glTexture) {
                tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
            }
        }
        // Recalculate screen-dependent constants
        SCALE = Math.min(W / 1920, H / 1080);
        PX = Math.max(3, Math.round(4 * SCALE));
        WORLD_W = W * WORLD_W_SCREENS;
        // Reset state
        this.score = 0;
        this.lives = 3;
        this.wave = 0;
        this.gameOver = false;
        this.planetDestroyed = false;
        this.smartBombs = 3;
        this.carriedHumanoid = -1;
        this.nextExtraLife = EXTRA_LIFE_SCORE;
        this.playerX = WORLD_W / 2;
        this.playerY = H * 0.4;
        this.playerVx = 0;
        this.playerVy = 0;
        this.facingRight = true;
        this.shipAlive = true;
        this.invincibleTimer = 0;
        this.respawnTimer = 0;
        this.enemies = [];
        this.humanoids = [];
        this.bullets = [];
        this.mines = [];
        this.stars = [];
        this.activeEmitters = [];
        this.waveTimer = 0;
        this.waveDelay = 0;
        this.baiterSpawned = false;
        this.ensureSparkTexture();
        // Starfield
        this.stars = this.createStarfield([
            { count: 50, speed: 0, size: 1, alpha: 0.25 },
            { count: 30, speed: 0, size: 1.5, alpha: 0.35 },
            { count: 15, speed: 0, size: 2, alpha: 0.45 },
        ]);
        // Generate terrain
        this.generateTerrain();
        // Sprite scale — ensure sprites are visible across all monitor sizes
        // At 1080p (SCALE=1.0): scale ~0.8 → ship 94px, enemies 55-64px
        // At 720p (SCALE=0.67): scale ~0.6 → ship 71px, enemies 40-50px
        // Floor of 0.55 ensures minimum ~46px ship, ~28px swarmer on small monitors
        this.spriteScale = Math.max(0.35, 0.55 * SCALE);
        // Graphics layers
        this.terrainGfx = this.add.graphics().setDepth(5);
        this.gameGfx = this.add.graphics().setDepth(10);
        this.radarGfx = this.add.graphics().setDepth(800);
        this.hudExtraGfx = this.add.graphics().setDepth(801);
        // Player ship sprite (scale to match screen)
        this.shipSprite = this.add.image(0, 0, 'def-ship-r').setDepth(10).setOrigin(0.5, 0.5).setScale(this.spriteScale);
        // Input — set up references but don't capture yet (ready screen needs keydown)
        this.cursors = this.input.keyboard.createCursorKeys();
        this.fireKey = this.input.keyboard.addKey('SPACE');
        this.bombKey = this.input.keyboard.addKey('Z');
        this.fireWasDown = false;
        this.bombWasDown = false;
        this.fireCooldown = 0;
        this.thrustSoundPlaying = false;
        this.syncLivesToHUD();
        this.syncScoreToHUD();
        this.loadHighScore();
        this.startWithReadyScreen(() => {
            // Capture keys only after ready screen dismisses
            this.input.keyboard.addCapture('UP,DOWN,LEFT,RIGHT,SPACE,Z');
            this.startWave();
        });
    }
    update(_t, dtMs) {
        if (this.gameOver || !this.cursors)
            return;
        const dt = Math.min(dtMs, 33);
        const dtSec = dt / 1000;
        // Respawn timer
        if (this.respawnTimer > 0) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0)
                this.respawnPlayer();
        }
        // Fire cooldown
        if (this.fireCooldown > 0)
            this.fireCooldown -= dt;
        // Player input & physics
        if (this.shipAlive) {
            this.updatePlayerInput(dtSec);
            this.updatePlayerPhysics(dtSec);
        }
        // Update camera to follow player
        this.updateCamera(dtSec);
        // Update entities
        this.updateEnemies(dtSec);
        this.updateHumanoids(dtSec);
        this.updateBulletsPhysics(dtSec);
        this.updateMines(dt);
        this.checkCollisions();
        // Wave management
        this.waveTimer += dt;
        if (!this.baiterSpawned && this.wave >= 2 && this.waveTimer > 30000) {
            this.spawnBaiter();
            this.baiterSpawned = true;
        }
        if (this.waveDelay > 0) {
            this.waveDelay -= dt;
            if (this.waveDelay <= 0)
                this.startWave();
        }
        else if (this.enemies.filter(e => e.alive).length === 0 && this.mines.length === 0 && this.waveDelay <= 0 && this.wave > 0) {
            // Wave complete
            this.onWaveComplete();
        }
        // Invincibility blink
        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= dt;
        }
        // Clean up expired emitters (handled by delayed destroy in spawnExplosion)
        // Render everything
        this.renderGame();
    }
    /* ================================================================
       TERRAIN
       ================================================================ */
    generateTerrain() {
        const numSamples = Math.ceil(WORLD_W / TERRAIN_SAMPLE) + 1;
        this.terrainHeights = [];
        // Generate raw heights
        for (let i = 0; i < numSamples; i++) {
            const t = i / numSamples;
            const base = H * (TERRAIN_MIN_Y + (TERRAIN_MAX_Y - TERRAIN_MIN_Y) * 0.5);
            const variation = H * (TERRAIN_MAX_Y - TERRAIN_MIN_Y) * 0.5;
            const h = base +
                Math.sin(t * Math.PI * 12) * variation * 0.4 +
                Math.sin(t * Math.PI * 25 + 1.3) * variation * 0.3 +
                Math.sin(t * Math.PI * 50 + 2.7) * variation * 0.2 +
                (Math.random() - 0.5) * variation * 0.3;
            this.terrainHeights.push(h);
        }
        // Smooth
        for (let pass = 0; pass < 3; pass++) {
            const smoothed = [...this.terrainHeights];
            for (let i = 1; i < smoothed.length - 1; i++) {
                smoothed[i] = (this.terrainHeights[i - 1] + this.terrainHeights[i] + this.terrainHeights[i + 1]) / 3;
            }
            // Wrap edges
            smoothed[0] = (this.terrainHeights[this.terrainHeights.length - 1] + this.terrainHeights[0] + this.terrainHeights[1]) / 3;
            smoothed[smoothed.length - 1] = (this.terrainHeights[this.terrainHeights.length - 2] + this.terrainHeights[this.terrainHeights.length - 1] + this.terrainHeights[0]) / 3;
            this.terrainHeights = smoothed;
        }
    }
    getTerrainY(worldX) {
        // Wrap x into world range
        let wx = this.wrapWorldX(worldX);
        const idx = wx / TERRAIN_SAMPLE;
        const i0 = Math.floor(idx) % this.terrainHeights.length;
        const i1 = (i0 + 1) % this.terrainHeights.length;
        const frac = idx - Math.floor(idx);
        return this.terrainHeights[i0] * (1 - frac) + this.terrainHeights[i1] * frac;
    }
    wrapWorldX(x) {
        return ((x % WORLD_W) + WORLD_W) % WORLD_W;
    }
    /* ================================================================
       PLAYER
       ================================================================ */
    updatePlayerInput(dtSec) {
        // Original Defender controls:
        // - UP/DOWN = vertical movement (joystick)
        // - LEFT = reverse (flip ship facing)
        // - RIGHT = thrust (forward in facing direction)
        // Adapted for keyboard: LEFT/RIGHT still control direction,
        // but pressing opposite to facing FIRST reverses, THEN thrusts
        // with a brief acceleration delay to simulate reverse→thrust feel.
        const leftDown = this.cursors.left.isDown;
        const rightDown = this.cursors.right.isDown;
        if (rightDown && !leftDown) {
            if (!this.facingRight) {
                // Reversing: flip first, apply reduced thrust
                this.facingRight = true;
                this.playerVx += PLAYER_THRUST * dtSec * 0.3;
            }
            else {
                // Thrusting forward
                this.playerVx += PLAYER_THRUST * dtSec;
            }
        }
        else if (leftDown && !rightDown) {
            if (this.facingRight) {
                // Reversing: flip first, apply reduced thrust
                this.facingRight = false;
                this.playerVx -= PLAYER_THRUST * dtSec * 0.3;
            }
            else {
                // Thrusting forward
                this.playerVx -= PLAYER_THRUST * dtSec;
            }
        }
        // Vertical movement (direct, like original joystick)
        if (this.cursors.up.isDown) {
            this.playerVy = -PLAYER_VY_SPEED;
        }
        else if (this.cursors.down.isDown) {
            this.playerVy = PLAYER_VY_SPEED;
        }
        else {
            this.playerVy *= 0.9;
        }
        // Fire — RAPID-FIRE when held down (original Defender behavior)
        if (this.fireKey.isDown) {
            this.fireBullet();
        }
        // Smart bomb — single press
        const bombDown = this.bombKey.isDown;
        if (bombDown && !this.bombWasDown) {
            this.useSmartBomb();
        }
        this.bombWasDown = bombDown;
        // Thrust sound
        const isThrusting = this.cursors.left.isDown || this.cursors.right.isDown;
        if (isThrusting && !this.thrustSoundPlaying) {
            try {
                this.sound.play('snd_thrust', { volume: 0.15, loop: true });
            }
            catch { }
            this.thrustSoundPlaying = true;
        }
        else if (!isThrusting && this.thrustSoundPlaying) {
            try {
                this.sound.stopByKey('snd_thrust');
            }
            catch { }
            this.thrustSoundPlaying = false;
        }
    }
    updatePlayerPhysics(dtSec) {
        // Friction on horizontal
        this.playerVx *= Math.pow(PLAYER_FRICTION, dtSec * 60);
        // Clamp
        if (this.playerVx > PLAYER_MAX_VX)
            this.playerVx = PLAYER_MAX_VX;
        if (this.playerVx < -PLAYER_MAX_VX)
            this.playerVx = -PLAYER_MAX_VX;
        this.playerX += this.playerVx * dtSec;
        this.playerY += this.playerVy * dtSec;
        // World wrap X
        this.playerX = this.wrapWorldX(this.playerX);
        // Clamp Y — only prevent going off-screen, NOT above terrain
        // In original Defender, ship can fly below the mountain line
        const topLimit = RADAR_Y + RADAR_H + 10;
        if (this.playerY < topLimit)
            this.playerY = topLimit;
        if (this.playerY > H - 10)
            this.playerY = H - 10;
        // Carry humanoid
        if (this.carriedHumanoid >= 0) {
            const h = this.humanoids[this.carriedHumanoid];
            if (h && h.state === 'rescued') {
                h.x = this.playerX;
                h.y = this.playerY + 10 * PX / 3;
                // Check if touching terrain to return humanoid
                if (!this.planetDestroyed) {
                    const tY = this.getTerrainY(h.x);
                    if (h.y >= tY - 5) {
                        h.y = tY - 3;
                        h.state = 'walking';
                        h.vx = (Math.random() > 0.5 ? 1 : -1) * 15;
                        this.carriedHumanoid = -1;
                        this.addScore(500, this.worldToScreenX(h.x), h.y);
                    }
                }
            }
        }
    }
    respawnPlayer() {
        this.shipAlive = true;
        this.invincibleTimer = INVINCIBLE_TIME;
        this.smartBombs = 3;
        this.carriedHumanoid = -1;
        this.playerVx = 0;
        this.playerVy = 0;
        this.playerY = H * 0.4;
        // Safety: push nearby enemies away from spawn point
        // Baiters get pushed much further since they home aggressively
        for (const e of this.enemies) {
            if (!e.alive)
                continue;
            const safeRadius = e.type === 'baiter' ? RESPAWN_SAFE_RADIUS_BAITER : RESPAWN_SAFE_RADIUS;
            const d = this.worldDist(e.x, e.y, this.playerX, this.playerY);
            if (d < safeRadius) {
                const angle = Math.atan2(e.y - this.playerY, e.x - this.playerX) || Math.random() * Math.PI * 2;
                e.x = this.playerX + Math.cos(angle) * (safeRadius + RESPAWN_PUSH_OFFSET);
                e.y = this.playerY + Math.sin(angle) * (safeRadius * 0.4);
                e.x = this.wrapWorldX(e.x);
                // Kill velocity so they don't rush back immediately
                e.vx *= 0.1;
                e.vy *= 0.1;
                // Reset baiter to dormant phase so player has time to orient
                if (e.type === 'baiter') {
                    e.zigPhase = 0;
                }
            }
        }
    }
    killPlayer() {
        if (!this.shipAlive || this.invincibleTimer > 0)
            return;
        this.shipAlive = false;
        if (this.shipSprite)
            this.shipSprite.setVisible(false);
        try {
            this.sound.play('snd_playerdead', { volume: 0.5 });
        }
        catch { }
        // Stop thrust sound
        try {
            this.sound.stopByKey('snd_thrust');
        }
        catch { }
        this.thrustSoundPlaying = false;
        // Drop carried humanoid
        if (this.carriedHumanoid >= 0) {
            const h = this.humanoids[this.carriedHumanoid];
            if (h) {
                h.state = 'falling';
                h.vy = 0;
            }
            this.carriedHumanoid = -1;
        }
        // Explosion
        this.spawnExplosion(this.playerX, this.playerY, 0xff00ff, 16);
        this.lives--;
        this.syncLivesToHUD();
        if (this.lives <= 0) {
            this.gameOver = true;
            this.checkHighScore();
            // Release keyboard captures so game-over overlay can receive key events
            try {
                this.input.keyboard.removeCapture('SPACE,Z,UP,DOWN,LEFT,RIGHT');
            }
            catch { }
            this.time.delayedCall(1000, () => {
                this.showGameOver(this.score, () => this.scene.restart());
            });
        }
        else {
            this.respawnTimer = RESPAWN_DELAY;
        }
    }
    /* ================================================================
       CAMERA
       ================================================================ */
    updateCamera(dtSec) {
        // Camera tries to keep player slightly off-center in the direction of movement
        let targetCamX = this.playerX - W * 0.35;
        if (!this.facingRight) {
            targetCamX = this.playerX - W * 0.65;
        }
        // Lerp
        const lerpSpeed = 5;
        let diff = targetCamX - this.cameraX;
        // Handle wrapping
        if (diff > WORLD_W / 2)
            diff -= WORLD_W;
        if (diff < -WORLD_W / 2)
            diff += WORLD_W;
        this.cameraX += diff * lerpSpeed * dtSec;
        this.cameraX = this.wrapWorldX(this.cameraX);
    }
    worldToScreenX(worldX) {
        let sx = worldX - this.cameraX;
        if (sx > WORLD_W / 2)
            sx -= WORLD_W;
        if (sx < -WORLD_W / 2)
            sx += WORLD_W;
        return sx;
    }
    isOnScreen(worldX, margin = 100) {
        const sx = this.worldToScreenX(worldX);
        return sx > -margin && sx < W + margin;
    }
    /* ================================================================
       BULLETS
       ================================================================ */
    fireBullet() {
        if (this.fireCooldown > 0)
            return;
        const playerBullets = this.bullets.filter(b => !b.isEnemy);
        if (playerBullets.length >= MAX_BULLETS)
            return;
        this.fireCooldown = 80; // ms between shots (rapid fire ~12/sec)
        const dir = this.facingRight ? 1 : -1;
        // Spawn bullet at the nose of the ship (half the rendered ship width ahead)
        const shipHalfW = 118 * this.spriteScale / 2;
        const bx = this.playerX + dir * (shipHalfW + 5);
        try {
            this.sound.play('snd_laser', { volume: 0.3 });
        }
        catch { }
        this.bullets.push({
            x: bx, y: this.playerY,
            vx: BULLET_SPEED * dir + this.playerVx * 0.5,
            vy: 0,
            life: 1500,
            isEnemy: false,
        });
    }
    fireEnemyBullet(ex, ey) {
        if (!this.shipAlive)
            return;
        let adjDx = this.playerX - ex;
        if (adjDx > WORLD_W / 2)
            adjDx -= WORLD_W;
        if (adjDx < -WORLD_W / 2)
            adjDx += WORLD_W;
        const dy = this.playerY - ey;
        const dist = Math.sqrt(adjDx * adjDx + dy * dy) || 1;
        // Predictive lead: compensate for player velocity
        const leadTime = dist / ENEMY_BULLET_SPEED;
        const predictX = adjDx + this.playerVx * leadTime * 0.5;
        const predictY = dy + this.playerVy * leadTime * 0.5;
        // Add slight random spread (±10°)
        const spread = (Math.random() - 0.5) * 0.35;
        const angle = Math.atan2(predictY, predictX) + spread;
        try {
            this.sound.play('snd_enemyshoot', { volume: 0.2 });
        }
        catch { }
        this.bullets.push({
            x: ex, y: ey,
            vx: Math.cos(angle) * ENEMY_BULLET_SPEED,
            vy: Math.sin(angle) * ENEMY_BULLET_SPEED,
            life: 3000,
            isEnemy: true,
        });
    }
    updateBulletsPhysics(dtSec) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx * dtSec;
            b.y += b.vy * dtSec;
            b.life -= dtSec * 1000;
            // World wrap
            b.x = this.wrapWorldX(b.x);
            if (b.life <= 0 || b.y < 0 || b.y > H) {
                this.bullets.splice(i, 1);
            }
        }
    }
    /* ================================================================
       SMART BOMB
       ================================================================ */
    useSmartBomb() {
        if (this.smartBombs <= 0)
            return;
        this.smartBombs--;
        try {
            this.sound.play('snd_explode', { volume: 0.5 });
        }
        catch { }
        // Destroy all on-screen enemies
        for (const e of this.enemies) {
            if (!e.alive)
                continue;
            if (this.isOnScreen(e.x)) {
                this.destroyEnemy(e);
            }
        }
        // Destroy on-screen mines
        for (let i = this.mines.length - 1; i >= 0; i--) {
            if (this.isOnScreen(this.mines[i].x)) {
                this.mines.splice(i, 1);
            }
        }
        // Screen flash
        const flash = this.add.graphics().setDepth(900);
        flash.fillStyle(0xffffff, 0.7);
        flash.fillRect(0, 0, W, H);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 400,
            onComplete: () => flash.destroy(),
        });
    }
    /* ================================================================
       ENEMIES
       ================================================================ */
    createEnemy(type, x, y) {
        const textureKey = 'def-' + type;
        const sprite = this.add.image(0, 0, textureKey).setDepth(10).setOrigin(0.5, 0.5).setScale(this.spriteScale);
        return {
            type, x, y,
            vx: 0, vy: 0,
            alive: true,
            shootTimer: 2000 + Math.random() * 3000,
            targetHumanoid: -1,
            hasHumanoid: false,
            zigTimer: 0,
            mineTimer: 3000 + Math.random() * 1000,
            zigPhase: Math.random() * Math.PI * 2,
            sprite,
        };
    }
    spawnLanders(count) {
        for (let i = 0; i < count; i++) {
            const x = Math.random() * WORLD_W;
            const y = 50 + Math.random() * 80;
            const e = this.createEnemy('lander', x, y);
            e.vy = 30 + Math.random() * 20;
            e.vx = (Math.random() - 0.5) * 60;
            this.enemies.push(e);
        }
    }
    spawnBombers(count) {
        for (let i = 0; i < count; i++) {
            const x = Math.random() * WORLD_W;
            const y = 100 + Math.random() * (H * 0.3);
            const e = this.createEnemy('bomber', x, y);
            e.vx = (Math.random() > 0.5 ? 1 : -1) * (40 + Math.random() * 30);
            e.vy = (Math.random() - 0.5) * 10;
            this.enemies.push(e);
        }
    }
    spawnPods(count) {
        for (let i = 0; i < count; i++) {
            const x = Math.random() * WORLD_W;
            const y = 80 + Math.random() * (H * 0.3);
            const e = this.createEnemy('pod', x, y);
            e.vx = (Math.random() - 0.5) * 40;
            e.vy = (Math.random() - 0.5) * 20;
            this.enemies.push(e);
        }
    }
    spawnSwarmers(x, y, count) {
        for (let i = 0; i < count; i++) {
            const e = this.createEnemy('swarmer', x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30);
            e.vx = (Math.random() - 0.5) * 200;
            e.vy = (Math.random() - 0.5) * 200;
            this.enemies.push(e);
        }
    }
    spawnBaiter() {
        // Spawn off-screen
        const x = (this.playerX + W * (Math.random() > 0.5 ? 1 : -1)) % WORLD_W;
        const y = 80 + Math.random() * (H * 0.3);
        const e = this.createEnemy('baiter', x, y);
        e.zigPhase = 0; // Start in dormant phase
        e.shootTimer = 1500; // Don't shoot during dormant phase
        try {
            this.sound.play('snd_baiterwarning', { volume: 0.4 });
        }
        catch { }
        this.enemies.push(e);
    }
    updateEnemies(dtSec) {
        const speedMult = 1 + (Math.min(this.wave, 15) - 1) * 0.12; // OpenDefender-style: 1.0 at wave 1, ~2.7 at wave 15
        for (const e of this.enemies) {
            if (!e.alive)
                continue;
            switch (e.type) {
                case 'lander':
                    this.updateLander(e, dtSec, speedMult);
                    break;
                case 'mutant':
                    this.updateMutant(e, dtSec, speedMult);
                    break;
                case 'bomber':
                    this.updateBomber(e, dtSec, speedMult);
                    break;
                case 'pod':
                    this.updatePod(e, dtSec, speedMult);
                    break;
                case 'swarmer':
                    this.updateSwarmer(e, dtSec, speedMult);
                    break;
                case 'baiter':
                    this.updateBaiter(e, dtSec, speedMult);
                    break;
            }
            // World wrap
            e.x = this.wrapWorldX(e.x);
            // Clamp Y — keep enemies in playable area (not below terrain line)
            if (e.y < RADAR_Y + RADAR_H + 10)
                e.y = RADAR_Y + RADAR_H + 10;
            const maxEnemyY = this.planetDestroyed ? H - 40 : H * 0.75;
            if (e.y > maxEnemyY)
                e.y = maxEnemyY;
            // Shooting (lander, mutant, baiter, bomber)
            if (e.type !== 'pod' && e.type !== 'swarmer') {
                e.shootTimer -= dtSec * 1000;
                if (e.shootTimer <= 0 && this.isOnScreen(e.x, 200)) {
                    this.fireEnemyBullet(e.x, e.y);
                    const dif = Math.min(this.wave, 15);
                    let baseInterval;
                    if (e.type === 'lander') {
                        baseInterval = e.hasHumanoid ? Math.max(500, 1500 - dif * 80) : Math.max(800, 2500 - dif * 100);
                    }
                    else if (e.type === 'mutant') {
                        baseInterval = Math.max(400, 1200 - dif * 60);
                    }
                    else if (e.type === 'baiter') {
                        baseInterval = Math.max(300, 1500 - dif * 80);
                    }
                    else {
                        baseInterval = Math.max(600, 2000 - dif * 80);
                    }
                    e.shootTimer = baseInterval + Math.random() * 500;
                }
            }
        }
    }
    updateLander(e, dtSec, speedMult) {
        if (!e.hasHumanoid) {
            // Find a target humanoid if none
            if (e.targetHumanoid < 0 || this.humanoids[e.targetHumanoid]?.state !== 'walking') {
                e.targetHumanoid = -1;
                const walkingIdxs = this.humanoids.map((h, i) => h.state === 'walking' ? i : -1).filter(i => i >= 0);
                if (walkingIdxs.length > 0) {
                    e.targetHumanoid = walkingIdxs[Math.floor(Math.random() * walkingIdxs.length)];
                }
            }
            // Descend toward target humanoid
            if (e.targetHumanoid >= 0) {
                const h = this.humanoids[e.targetHumanoid];
                if (!h || h.state === 'dead') {
                    e.targetHumanoid = -1;
                }
                else {
                    let dx = this.wrapDx(h.x - e.x);
                    e.vx += (dx > 0 ? 1 : -1) * 200 * dtSec * speedMult;
                    // Only descend if ABOVE the humanoid, otherwise hover at humanoid height
                    const dy = h.y - e.y;
                    if (dy > 30) {
                        e.vy = 120 * speedMult; // descend toward humanoid
                    }
                    else if (dy < -20) {
                        e.vy = -60 * speedMult; // rise back up if too low
                    }
                    else {
                        e.vy *= 0.9; // hover near humanoid height
                    }
                    // Zig-zag
                    e.zigTimer += dtSec;
                    e.vx += Math.sin(e.zigTimer * 3) * 120 * dtSec;
                    // Check grab — generous radius
                    if (Math.abs(dx) < 25 && Math.abs(dy) < 25 && h.state === 'walking') {
                        e.hasHumanoid = true;
                        h.state = 'grabbed';
                        h.vx = 0;
                        h.vy = 0;
                        try {
                            this.sound.play('snd_warning', { volume: 0.3 });
                        }
                        catch { }
                    }
                }
            }
            else {
                // No humanoid to target — patrol at mid-height
                e.zigTimer += dtSec;
                e.vx += Math.sin(e.zigTimer * 2) * 100 * dtSec;
                // Maintain patrol altitude around 30% of screen height
                const patrolY = H * 0.3;
                if (e.y < patrolY - 50)
                    e.vy = 40 * speedMult;
                else if (e.y > patrolY + 50)
                    e.vy = -40 * speedMult;
                else
                    e.vy += (Math.random() - 0.5) * 80 * dtSec;
            }
        }
        else {
            // Ascend with humanoid — fast!
            e.vy = -180 * speedMult;
            e.vx *= 0.98;
            // Move humanoid with lander
            const hIdx = e.targetHumanoid;
            if (hIdx >= 0 && this.humanoids[hIdx]) {
                this.humanoids[hIdx].x = e.x;
                this.humanoids[hIdx].y = e.y + 12 * PX / 3;
            }
            // If reached top → mutate
            if (e.y <= 40) {
                // Humanoid dies
                if (hIdx >= 0 && this.humanoids[hIdx]) {
                    this.humanoids[hIdx].state = 'dead';
                    this.humanoids[hIdx].sprite = this.destroyObj(this.humanoids[hIdx].sprite);
                    try {
                        this.sound.play('snd_humanoiddead', { volume: 0.3 });
                    }
                    catch { }
                }
                // Lander becomes mutant — swap sprite texture
                e.type = 'mutant';
                if (e.sprite)
                    e.sprite.setTexture('def-mutant');
                try {
                    this.sound.play('snd_explode', { volume: 0.4 });
                }
                catch { }
                e.hasHumanoid = false;
                e.targetHumanoid = -1;
                this.checkPlanetDestroyed();
            }
        }
        // Apply velocity with clamping
        e.vx = Math.max(-280 * speedMult, Math.min(280 * speedMult, e.vx));
        e.x += e.vx * dtSec;
        e.y += e.vy * dtSec;
    }
    updateMutant(e, dtSec, speedMult) {
        // Home toward player
        const dx = this.wrapDx(this.playerX - e.x);
        const dy = this.playerY - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 300 * speedMult;
        e.vx += (dx / dist) * speed * dtSec * 3;
        e.vy += (dy / dist) * speed * dtSec * 3;
        // Random jitter
        e.vx += (Math.random() - 0.5) * 400 * dtSec;
        e.vy += (Math.random() - 0.5) * 400 * dtSec;
        // Clamp speed
        const maxV = speed * 1.5;
        const curSpeed = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
        if (curSpeed > maxV) {
            e.vx = (e.vx / curSpeed) * maxV;
            e.vy = (e.vy / curSpeed) * maxV;
        }
        e.x += e.vx * dtSec;
        e.y += e.vy * dtSec;
    }
    updateBomber(e, dtSec, speedMult) {
        // Slow horizontal drift
        e.x += e.vx * dtSec * speedMult;
        e.y += Math.sin(e.zigPhase) * 15 * dtSec;
        e.zigPhase += dtSec;
        // Drop mines
        e.mineTimer -= dtSec * 1000;
        if (e.mineTimer <= 0) {
            this.mines.push({
                x: e.x,
                y: e.y + 10,
                life: 15000,
                blinkTimer: 0,
            });
            e.mineTimer = 3000 + Math.random() * 1000;
        }
    }
    updatePod(e, dtSec, speedMult) {
        // Slow drift
        e.x += e.vx * dtSec * speedMult;
        e.y += e.vy * dtSec * speedMult;
        // Gentle bounce at vertical boundaries
        if (e.y < 60 || e.y > H * 0.6)
            e.vy = -e.vy;
    }
    updateSwarmer(e, dtSec, speedMult) {
        // Fast zig-zag toward player
        const dx = this.wrapDx(this.playerX - e.x);
        const dy = this.playerY - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 400 * speedMult;
        e.vx += (dx / dist) * speed * dtSec * 2;
        e.vy += (dy / dist) * speed * dtSec * 2;
        // Erratic zig-zag
        e.zigPhase += dtSec * 10;
        e.vx += Math.sin(e.zigPhase) * 300 * dtSec;
        e.vy += Math.cos(e.zigPhase * 1.3) * 200 * dtSec;
        // Clamp
        const maxV = speed * 1.8;
        const curSpeed = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
        if (curSpeed > maxV) {
            e.vx = (e.vx / curSpeed) * maxV;
            e.vy = (e.vy / curSpeed) * maxV;
        }
        e.x += e.vx * dtSec;
        e.y += e.vy * dtSec;
        // Smart direction change when far from player (OpenDefender: 200px)
        let sdx = this.playerX - e.x;
        if (sdx > WORLD_W / 2)
            sdx -= WORLD_W;
        if (sdx < -WORLD_W / 2)
            sdx += WORLD_W;
        if (Math.abs(sdx) > 300) {
            e.vx += (sdx > 0 ? 1 : -1) * 500 * dtSec;
        }
    }
    updateBaiter(e, dtSec, speedMult) {
        e.zigPhase += dtSec;
        // Phase 1: Brief dormant hover (first 1.5 seconds)
        if (e.zigPhase < 1.5) {
            e.vx *= 0.95;
            e.vy *= 0.95;
            e.x += e.vx * dtSec;
            e.y += e.vy * dtSec;
            return;
        }
        const dx = this.wrapDx(this.playerX - e.x);
        const dy = this.playerY - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 280 * speedMult;
        // Orbit behavior: if close to player, strafe around instead of sitting on top
        const minDist = 150;
        if (dist < minDist) {
            // Too close — veer away perpendicular + strafe
            const perpX = -dy / dist;
            const perpY = dx / dist;
            e.vx += perpX * speed * dtSec * 3;
            e.vy += perpY * speed * dtSec * 3;
            // Push away slightly
            e.vx -= (dx / dist) * speed * dtSec * 1.5;
            e.vy -= (dy / dist) * speed * dtSec * 1.5;
        }
        else {
            // Approach but not too aggressively
            e.vx += (dx / dist) * speed * dtSec * 1.5;
            e.vy += (dy / dist) * speed * dtSec * 1.5;
        }
        // Strafing oscillation
        e.vx += Math.sin(e.zigPhase * 4) * 180 * dtSec;
        e.vy += Math.cos(e.zigPhase * 3) * 120 * dtSec;
        // Clamp to max speed
        const maxV = speed * 0.7;
        const curSpeed = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
        if (curSpeed > maxV) {
            e.vx = (e.vx / curSpeed) * maxV;
            e.vy = (e.vy / curSpeed) * maxV;
        }
        e.x += e.vx * dtSec;
        e.y += e.vy * dtSec;
    }
    destroyEnemy(e) {
        if (!e.alive)
            return;
        e.alive = false;
        e.sprite = this.destroyObj(e.sprite);
        try {
            this.sound.play('snd_enemydead', { volume: 0.4 });
        }
        catch { }
        const colorMap = {
            lander: 0x00ff00, mutant: 0xff00ff, bomber: 0xffff00,
            pod: 0xcc00cc, swarmer: 0xffff00, baiter: 0x00ff44,
        };
        const scoreMap = {
            lander: 150, mutant: 150, bomber: 250,
            pod: 1000, swarmer: 150, baiter: 200,
        };
        const sx = this.worldToScreenX(e.x);
        this.addScore(scoreMap[e.type], sx, e.y);
        this.spawnExplosion(e.x, e.y, colorMap[e.type], 10);
        this.checkExtraLife();
        // Release humanoid if lander was carrying one
        if (e.type === 'lander' && e.hasHumanoid && e.targetHumanoid >= 0) {
            const h = this.humanoids[e.targetHumanoid];
            if (h && h.state === 'grabbed') {
                h.state = 'falling';
                h.vy = 0;
            }
        }
        // Pod splits into swarmers
        if (e.type === 'pod') {
            const count = 3 + Math.floor(Math.random() * 3);
            this.spawnSwarmers(e.x, e.y, count);
        }
    }
    /* ================================================================
       HUMANOIDS
       ================================================================ */
    spawnHumanoids(count) {
        // Destroy existing humanoid sprites before respawning
        for (const h of this.humanoids) {
            h.sprite = this.destroyObj(h.sprite);
        }
        this.humanoids = [];
        for (let i = 0; i < count; i++) {
            const x = Math.random() * WORLD_W;
            const tY = this.getTerrainY(x);
            const sprite = this.add.image(0, 0, 'def-humanoid').setDepth(10).setOrigin(0.5, 0.5).setScale(this.spriteScale);
            this.humanoids.push({
                x,
                y: tY - 3,
                vx: (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 10),
                vy: 0,
                state: 'walking',
                walkDir: Math.random() > 0.5 ? 1 : -1,
                sprite,
            });
        }
    }
    updateHumanoids(dtSec) {
        for (let i = 0; i < this.humanoids.length; i++) {
            const h = this.humanoids[i];
            switch (h.state) {
                case 'walking':
                    if (this.planetDestroyed) {
                        // Planet destroyed — humanoids fall
                        h.state = 'falling';
                        h.vy = 0;
                        break;
                    }
                    h.x += h.vx * dtSec;
                    h.x = this.wrapWorldX(h.x);
                    const tY = this.getTerrainY(h.x);
                    h.y = tY - 3;
                    // Randomly change direction
                    if (Math.random() < 0.005)
                        h.vx = -h.vx;
                    break;
                case 'grabbed':
                    // Moved by lander in updateLander
                    break;
                case 'falling':
                    // Gentle gravity matching OpenDefender (fallspeed=0.01, terminal=8px/frame)
                    // Scaled for our coordinate system: slow accel, capped terminal velocity
                    h.vy += 60 * dtSec; // gentle gravity (~10× slower than before)
                    if (h.vy > 120)
                        h.vy = 120; // terminal velocity cap — keeps it catchable
                    h.y += h.vy * dtSec;
                    if (!this.planetDestroyed) {
                        const groundY = this.getTerrainY(h.x);
                        if (h.y >= groundY - 3) {
                            if (h.vy > 100) {
                                // Splat — only if falling fast (dropped from very high without catching)
                                h.state = 'dead';
                                h.sprite = this.destroyObj(h.sprite);
                                this.spawnExplosion(h.x, h.y, 0xffffff, 6);
                                try {
                                    this.sound.play('snd_humanoiddead', { volume: 0.3 });
                                }
                                catch { }
                                this.checkPlanetDestroyed();
                            }
                            else {
                                // Soft landing
                                h.y = groundY - 3;
                                h.vy = 0;
                                h.state = 'walking';
                                h.vx = (Math.random() > 0.5 ? 1 : -1) * 15;
                            }
                        }
                    }
                    else {
                        // No terrain — fall to death
                        if (h.y > H + 50) {
                            h.state = 'dead';
                            h.sprite = this.destroyObj(h.sprite);
                            try {
                                this.sound.play('snd_humanoiddead', { volume: 0.3 });
                            }
                            catch { }
                        }
                    }
                    break;
                case 'rescued':
                    // Moved by player in updatePlayerPhysics
                    break;
                case 'dead':
                    break;
            }
        }
    }
    checkPlanetDestroyed() {
        if (this.planetDestroyed)
            return;
        const alive = this.humanoids.filter(h => h.state !== 'dead').length;
        if (alive === 0) {
            this.planetDestroyed = true;
            // All remaining landers become mutants
            for (const e of this.enemies) {
                if (e.alive && e.type === 'lander') {
                    e.type = 'mutant';
                    if (e.sprite)
                        e.sprite.setTexture('def-mutant');
                    e.hasHumanoid = false;
                    e.targetHumanoid = -1;
                }
            }
        }
    }
    /* ================================================================
       MINES
       ================================================================ */
    updateMines(dt) {
        for (let i = this.mines.length - 1; i >= 0; i--) {
            const m = this.mines[i];
            m.life -= dt;
            m.blinkTimer += dt;
            if (m.life <= 0) {
                this.mines.splice(i, 1);
            }
        }
    }
    /* ================================================================
       COLLISIONS
       ================================================================ */
    worldDist(x1, y1, x2, y2) {
        const dx = this.wrapDx(x1 - x2);
        const dy = y1 - y2;
        return Math.sqrt(dx * dx + dy * dy);
    }
    /** Wrap a delta-X value for the toroidal world. */
    wrapDx(dx) {
        if (dx > WORLD_W / 2)
            dx -= WORLD_W;
        if (dx < -WORLD_W / 2)
            dx += WORLD_W;
        return dx;
    }
    checkCollisions() {
        // Use half the ship's rendered height so the hitbox matches the visible sprite
        const playerRadius = 53 * this.spriteScale / 2;
        // Player bullets vs enemies
        for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
            const b = this.bullets[bi];
            if (b.isEnemy)
                continue;
            for (const e of this.enemies) {
                if (!e.alive)
                    continue;
                const hitR = e.type === 'swarmer' ? 12 * PX / 3 : 18 * PX / 3;
                if (this.worldDist(b.x, b.y, e.x, e.y) < hitR) {
                    this.destroyEnemy(e);
                    this.bullets.splice(bi, 1);
                    break;
                }
            }
        }
        // Player bullets vs mines
        for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
            const b = this.bullets[bi];
            if (b.isEnemy)
                continue;
            for (let mi = this.mines.length - 1; mi >= 0; mi--) {
                const m = this.mines[mi];
                if (this.worldDist(b.x, b.y, m.x, m.y) < 10 * PX / 3) {
                    this.mines.splice(mi, 1);
                    this.bullets.splice(bi, 1);
                    this.addScore(25, this.worldToScreenX(m.x), m.y);
                    break;
                }
            }
        }
        // Player bullets vs humanoids (friendly fire)
        for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
            const b = this.bullets[bi];
            if (b.isEnemy)
                continue;
            for (const h of this.humanoids) {
                if (h.state !== 'walking')
                    continue;
                const hitR = 14 * PX / 3;
                if (this.worldDist(b.x, b.y, h.x, h.y) < hitR) {
                    if (this.carriedHumanoid >= 0 && this.humanoids[this.carriedHumanoid] === h) {
                        this.carriedHumanoid = -1;
                    }
                    h.state = 'dead';
                    try {
                        this.sound.play('snd_humanoiddead', { volume: 0.3 });
                    }
                    catch { }
                    this.spawnExplosion(h.x, h.y, 0x00ffff, 8);
                    this.bullets.splice(bi, 1);
                    this.checkPlanetDestroyed();
                    break;
                }
            }
        }
        if (!this.shipAlive)
            return;
        // Enemy bullets vs player
        for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
            const b = this.bullets[bi];
            if (!b.isEnemy)
                continue;
            if (this.worldDist(b.x, b.y, this.playerX, this.playerY) < playerRadius) {
                this.bullets.splice(bi, 1);
                this.killPlayer();
                return;
            }
        }
        // Enemies body vs player
        if (this.invincibleTimer <= 0) {
            for (const e of this.enemies) {
                if (!e.alive)
                    continue;
                const hitR = e.type === 'swarmer' ? 10 * PX / 3 : 18 * PX / 3;
                if (this.worldDist(e.x, e.y, this.playerX, this.playerY) < hitR) {
                    this.killPlayer();
                    return;
                }
            }
        }
        // Mines vs player
        if (this.invincibleTimer <= 0) {
            for (let mi = this.mines.length - 1; mi >= 0; mi--) {
                const m = this.mines[mi];
                if (this.worldDist(m.x, m.y, this.playerX, this.playerY) < 10 * PX / 3) {
                    this.mines.splice(mi, 1);
                    this.killPlayer();
                    return;
                }
            }
        }
        // Falling humanoids — catch by player
        for (let i = 0; i < this.humanoids.length; i++) {
            const h = this.humanoids[i];
            if (h.state !== 'falling')
                continue;
            if (this.carriedHumanoid >= 0)
                continue; // already carrying one
            if (this.worldDist(h.x, h.y, this.playerX, this.playerY) < 40 * PX / 3) {
                h.state = 'rescued';
                h.vy = 0;
                this.carriedHumanoid = i;
                this.addScore(250, this.worldToScreenX(h.x), h.y);
                try {
                    this.sound.play('snd_bonus', { volume: 0.4 });
                }
                catch { }
            }
        }
    }
    /* ================================================================
       WAVES
       ================================================================ */
    startWave() {
        this.wave++;
        this.waveTimer = 0;
        this.baiterSpawned = false;
        this.syncLevelToHUD(this.wave);
        this.showWaveBanner(this.wave);
        try {
            this.sound.play('snd_start', { volume: 0.3 });
        }
        catch { }
        // Clear old dead enemies — destroy their sprites
        for (const e of this.enemies) {
            if (!e.alive) {
                e.sprite = this.destroyObj(e.sprite);
            }
        }
        this.enemies = this.enemies.filter(e => e.alive);
        this.bullets = [];
        this.mines = [];
        // Humanoids persist across waves — only spawn on wave 1 or if planet was destroyed
        if (this.wave === 1) {
            this.spawnHumanoids(10);
        }
        // Don't respawn humanoids on subsequent waves — they carry over!
        // Spawn enemies
        const landerCount = 5 + (this.wave - 1) * 2;
        this.spawnLanders(landerCount);
        if (this.wave >= 3) {
            this.spawnBombers(Math.min(this.wave - 2, 4));
        }
        if (this.wave >= 4) {
            this.spawnPods(Math.min(this.wave - 3, 3));
        }
    }
    onWaveComplete() {
        // Bonus for surviving humanoids
        if (!this.planetDestroyed) {
            const alive = this.humanoids.filter(h => h.state !== 'dead').length;
            if (alive > 0) {
                const bonus = 500 * alive;
                this.addScore(bonus, W / 2, H / 2);
            }
        }
        this.waveDelay = 2000;
    }
    /* ================================================================
       EXTRA LIFE
       ================================================================ */
    checkExtraLife() {
        if (this.score >= this.nextExtraLife) {
            this.lives++;
            this.syncLivesToHUD();
            this.nextExtraLife += EXTRA_LIFE_SCORE;
            try {
                this.sound.play('snd_player1up', { volume: 0.5 });
            }
            catch { }
            // Flash notification
            const txt = this.add.text(W / 2, H * 0.3, 'EXTRA LIFE!', {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '18px',
                color: '#00ff00',
                stroke: '#000',
                strokeThickness: 3,
            }).setOrigin(0.5, 0.5).setDepth(950);
            this.tweens.add({
                targets: txt,
                y: H * 0.25,
                alpha: 0,
                duration: 1500,
                onComplete: () => txt.destroy(),
            });
        }
    }
    /* ================================================================
       EXPLOSIONS
       ================================================================ */
    spawnExplosion(worldX, worldY, color, count) {
        const sx = this.worldToScreenX(worldX);
        if (sx < -200 || sx > W + 200)
            return; // off-screen, skip
        this.spawnParticleExplosion(sx, worldY, color, count);
    }
    /* ================================================================
       RENDERING
       ================================================================ */
    renderGame() {
        const g = this.gameGfx;
        g.clear();
        // Draw terrain
        this.renderTerrain();
        // Draw humanoids
        this.renderHumanoids(g);
        // Draw enemies
        this.renderEnemies(g);
        // Draw mines
        this.renderMines(g);
        // Draw bullets
        this.renderBullets(g);
        // Draw player
        if (this.shipAlive) {
            const blink = this.invincibleTimer > 0 && Math.sin(performance.now() / 80) < 0;
            this.shipSprite.setAlpha(blink ? 0.2 : 1);
            this.renderPlayer(g);
        }
        else {
            this.shipSprite.setVisible(false);
        }
        // Draw radar
        this.renderRadar();
        // Draw smart bomb HUD
        this.renderSmartBombHUD();
    }
    renderTerrain() {
        const tg = this.terrainGfx;
        tg.clear();
        if (this.planetDestroyed)
            return;
        // Draw terrain that's visible on screen
        const startWorldX = this.cameraX - 20;
        const endWorldX = this.cameraX + W + 20;
        // Mountain line — orange/brown to match original arcade
        tg.lineStyle(2, 0xcc8800, 1);
        tg.beginPath();
        let firstPoint = true;
        for (let wx = startWorldX; wx <= endWorldX; wx += TERRAIN_SAMPLE / 2) {
            const wrappedX = this.wrapWorldX(wx);
            const sy = this.getTerrainY(wrappedX);
            const sx = wx - this.cameraX;
            if (firstPoint) {
                tg.moveTo(sx, sy);
                firstPoint = false;
            }
            else {
                tg.lineTo(sx, sy);
            }
        }
        tg.strokePath();
        // Subtle fill below terrain — dark brown
        tg.fillStyle(0x331800, 0.3);
        tg.beginPath();
        firstPoint = true;
        for (let wx = startWorldX; wx <= endWorldX; wx += TERRAIN_SAMPLE / 2) {
            const wrappedX = this.wrapWorldX(wx);
            const sy = this.getTerrainY(wrappedX);
            const sx = wx - this.cameraX;
            if (firstPoint) {
                tg.moveTo(sx, sy);
                firstPoint = false;
            }
            else {
                tg.lineTo(sx, sy);
            }
        }
        // Close polygon at bottom
        tg.lineTo(endWorldX - this.cameraX, H);
        tg.lineTo(startWorldX - this.cameraX, H);
        tg.closePath();
        tg.fillPath();
    }
    renderPlayer(g) {
        const sx = this.worldToScreenX(this.playerX);
        this.shipSprite.setPosition(sx, this.playerY);
        this.shipSprite.setTexture(this.facingRight ? 'def-ship-r' : 'def-ship-l');
        this.shipSprite.setVisible(true);
        // Engine exhaust — fires from the REAR of the ship (opposite of facing direction)
        if (this.cursors.left.isDown || this.cursors.right.isDown) {
            const shipHalfW = 118 * this.spriteScale / 2;
            const shipHalfH = 53 * this.spriteScale / 2;
            // Exhaust shoots out behind the ship
            const exhaustDir = this.facingRight ? -1 : 1;
            const exhaustX = sx + exhaustDir * shipHalfW;
            // Main exhaust flame — large, flickering
            const flameLen = 15 + Math.random() * 25; // variable length
            const flameW = flameLen * SCALE;
            const flameH = (6 + Math.random() * 4) * SCALE;
            const fx = exhaustDir > 0 ? exhaustX : exhaustX - flameW;
            // Outer glow (orange)
            g.fillStyle(0xff6600, 0.3 + Math.random() * 0.2);
            g.fillRect(fx - 2 * SCALE, this.playerY - flameH * 0.7, flameW + 4 * SCALE, flameH * 1.4);
            // Core flame (magenta/pink — matches ship engine)
            g.fillStyle(0xff00ff, 0.5 + Math.random() * 0.4);
            g.fillRect(fx, this.playerY - flameH * 0.4, flameW * 0.8, flameH * 0.8);
            // Hot center (white/yellow)
            g.fillStyle(0xffff88, 0.4 + Math.random() * 0.4);
            const coreW = flameW * 0.4;
            const coreX = exhaustDir > 0 ? exhaustX : exhaustX - coreW;
            g.fillRect(coreX, this.playerY - flameH * 0.2, coreW, flameH * 0.4);
            // Random sparks/particles
            for (let i = 0; i < 3; i++) {
                const sparkX = exhaustX + exhaustDir * (Math.random() * flameW * 1.2);
                const sparkY = this.playerY + (Math.random() - 0.5) * flameH * 1.5;
                const sparkSize = (1 + Math.random() * 2) * SCALE;
                g.fillStyle(Math.random() > 0.5 ? 0xff4400 : 0xff00ff, 0.3 + Math.random() * 0.5);
                g.fillRect(sparkX, sparkY, sparkSize, sparkSize);
            }
        }
    }
    renderEnemies(g) {
        for (const e of this.enemies) {
            if (!e.alive) {
                if (e.sprite)
                    e.sprite.setVisible(false);
                continue;
            }
            const sx = this.worldToScreenX(e.x);
            if (sx < -60 || sx > W + 60) {
                if (e.sprite)
                    e.sprite.setVisible(false);
                continue;
            }
            if (e.sprite) {
                e.sprite.setPosition(sx, e.y);
                e.sprite.setVisible(true);
                // Mutant pulse effect
                if (e.type === 'mutant') {
                    e.sprite.setAlpha(0.7 + Math.sin(performance.now() / 200) * 0.3);
                }
            }
        }
    }
    renderHumanoids(g) {
        for (const h of this.humanoids) {
            if (h.state === 'dead') {
                if (h.sprite)
                    h.sprite.setVisible(false);
                continue;
            }
            const sx = this.worldToScreenX(h.x);
            if (sx < -30 || sx > W + 30) {
                if (h.sprite)
                    h.sprite.setVisible(false);
                continue;
            }
            if (h.sprite) {
                h.sprite.setPosition(sx, h.y);
                h.sprite.setVisible(true);
                // Color tint based on state
                if (h.state === 'rescued')
                    h.sprite.setTint(0x00ff00);
                else if (h.state === 'falling')
                    h.sprite.setTint(0xff8800);
                else if (h.state === 'grabbed')
                    h.sprite.setTint(0xff4444);
                else
                    h.sprite.clearTint();
            }
        }
    }
    renderBullets(g) {
        const bs = Math.max(3, Math.round(4 * SCALE)); // bullet size scales with screen
        for (const b of this.bullets) {
            const sx = this.worldToScreenX(b.x);
            if (sx < -200 || sx > W + 200)
                continue;
            if (b.isEnemy) {
                g.fillStyle(0xff0000);
                g.fillRect(sx - bs, b.y - bs, bs * 2, bs * 2);
            }
            else {
                // Long dashed laser beam — scales with screen
                const dir = b.vx > 0 ? 1 : -1;
                const beamLen = Math.round(120 * SCALE);
                const segLen = Math.round(14 * SCALE);
                const gapLen = Math.round(6 * SCALE);
                const thick = Math.max(3, Math.round(4 * SCALE));
                for (let i = 0; i < beamLen; i += segLen + gapLen) {
                    const segX = sx + (dir > 0 ? -i - segLen : i);
                    g.fillStyle(0xff4400, 1);
                    g.fillRect(segX, b.y - Math.floor(thick / 2), segLen, thick);
                }
                // Bright tip
                const tipS = Math.max(4, Math.round(5 * SCALE));
                g.fillStyle(0xffff00, 1);
                g.fillRect(sx - tipS, b.y - Math.floor(tipS / 2), tipS * 2, tipS);
            }
        }
    }
    renderMines(g) {
        for (const m of this.mines) {
            const sx = this.worldToScreenX(m.x);
            if (sx < -20 || sx > W + 20)
                continue;
            // Blink effect
            const visible = Math.sin(m.blinkTimer * 0.008) > -0.3;
            if (visible) {
                g.fillStyle(0xff0000);
                const ms = PX * 1.5;
                g.fillRect(sx - ms, m.y - ms, ms * 2, ms * 2);
            }
        }
    }
    renderRadar() {
        const rg = this.radarGfx;
        rg.clear();
        // Background
        rg.fillStyle(0x000000, 0.5);
        rg.fillRect(0, RADAR_Y, W, RADAR_H);
        // Blue border lines (left and right edges, like original)
        rg.lineStyle(2, 0x0044ff, 0.9);
        rg.beginPath();
        rg.moveTo(W * 0.3, RADAR_Y);
        rg.lineTo(W * 0.3, RADAR_Y + RADAR_H);
        rg.strokePath();
        rg.beginPath();
        rg.moveTo(W * 0.7, RADAR_Y);
        rg.lineTo(W * 0.7, RADAR_Y + RADAR_H);
        rg.strokePath();
        // Top and bottom border
        rg.lineStyle(1, 0x0044ff, 0.6);
        rg.strokeRect(0, RADAR_Y, W, RADAR_H);
        const scaleX = W / WORLD_W;
        const scaleY = RADAR_H / H;
        // Terrain on radar — orange to match main terrain
        if (!this.planetDestroyed) {
            rg.lineStyle(1, 0xcc8800, 0.6);
            rg.beginPath();
            let first = true;
            for (let i = 0; i < this.terrainHeights.length; i += 4) {
                const wx = i * TERRAIN_SAMPLE;
                const rx = wx * scaleX;
                const ry = RADAR_Y + this.terrainHeights[i] * scaleY;
                if (first) {
                    rg.moveTo(rx, ry);
                    first = false;
                }
                else
                    rg.lineTo(rx, ry);
            }
            rg.strokePath();
        }
        // Blips
        const blipSize = 3;
        // Humanoids (cyan)
        rg.fillStyle(0x00ffff);
        for (const h of this.humanoids) {
            if (h.state === 'dead')
                continue;
            rg.fillRect(h.x * scaleX, RADAR_Y + h.y * scaleY, blipSize, blipSize);
        }
        // Enemies
        for (const e of this.enemies) {
            if (!e.alive)
                continue;
            const color = e.type === 'mutant' ? 0xff00ff :
                e.type === 'bomber' ? 0xffff00 :
                    e.type === 'baiter' ? 0x00ff44 :
                        e.type === 'swarmer' ? 0xffff00 :
                            e.type === 'pod' ? 0xcc00cc :
                                0x00ff00;
            rg.fillStyle(color);
            rg.fillRect(e.x * scaleX, RADAR_Y + e.y * scaleY, blipSize, blipSize);
        }
        // Player (white crosshair, like original — larger for visibility)
        const px = this.playerX * scaleX;
        const py = RADAR_Y + this.playerY * scaleY;
        rg.fillStyle(0xffffff);
        rg.fillRect(px - 1, py - 4, 3, 9); // vertical bar
        rg.fillRect(px - 4, py - 1, 9, 3); // horizontal bar
    }
    renderSmartBombHUD() {
        const hg = this.hudExtraGfx;
        hg.clear();
        // Draw smart bomb count below radar
        const bombY = RADAR_Y + RADAR_H + 4;
        for (let i = 0; i < this.smartBombs; i++) {
            hg.fillStyle(0xff4400);
            hg.fillRect(8 + i * 14, bombY, 10, 8);
            hg.lineStyle(1, 0xff8800);
            hg.strokeRect(8 + i * 14, bombY, 10, 8);
        }
    }
    /* ================================================================
       CLEANUP
       ================================================================ */
    shutdown() {
        super.shutdown();
        // Stop looping sounds
        try {
            this.sound.stopByKey('snd_thrust');
        }
        catch { }
        this.thrustSoundPlaying = false;
        // Destroy enemy sprites
        for (const e of this.enemies) {
            e.sprite = this.destroyObj(e.sprite);
        }
        // Destroy humanoid sprites
        for (const h of this.humanoids) {
            h.sprite = this.destroyObj(h.sprite);
        }
        // Destroy player sprite
        this.shipSprite = this.destroyObj(this.shipSprite);
        // Destroy graphics objects
        this.destroyObj(this.gameGfx);
        this.destroyObj(this.radarGfx);
        this.destroyObj(this.terrainGfx);
        this.destroyObj(this.hudExtraGfx);
    }
}
//# sourceMappingURL=PlanetGuardian.js.map