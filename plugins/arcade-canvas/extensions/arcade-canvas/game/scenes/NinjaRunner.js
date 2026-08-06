// NinjaRunner — side-scrolling platformer with free JuhoSprite assets.
// Extracted from the original monolithic game.ts and refactored to
// extend BaseScene for the multi-game architecture.
import { BaseScene, W, H } from './BaseScene.js';
const BLOCK = 48; // logical world tile size
const PLAYER_W = 48; // player draw size
const PLAYER_H = 48; // player draw size
const SPAWN_X = 600;
// Computed dynamically so it uses the correct H after refreshDimensions()
function getGroundY() { return H - BLOCK; }
let GROUND_Y = H - BLOCK; // will be updated in create()
export class NinjaRunnerScene extends BaseScene {
    // Input
    cursors;
    keys;
    // Player state
    player;
    isBig = false;
    facingRight = true;
    invincible = 1500; // ms
    shrinkTimer = 0;
    stompGrace = 0;
    dead = false;
    deadTimer = 0;
    lastSafeX = SPAWN_X;
    fireCooldown = 0;
    // Jump tracking — manual edge detection is more reliable on macOS than
    // Phaser's JustDown when multiple keys are held simultaneously.
    jumpKeyWasDown = false;
    coyoteTime = 0; // ms left where we can still jump after leaving ground
    jumpBuffer = 0; // ms left where a queued jump press will fire on landing
    canDoubleJump = false;
    hasDoubleJumped = false;
    // Animation: cycle the run frame based on distance traveled, not wall time,
    // so step rhythm matches actual movement speed.
    runDistance = 0;
    // Generation
    genX = 0;
    // Groups
    groundGroup;
    brickGroup;
    qblockGroup;
    pipeGroup;
    coinGroup;
    mushroomGroup;
    heartGroup;
    fireballGroup;
    enemyGroup;
    gaps = [];
    bridgeGroup;
    bounceGroup;
    flagGroup;
    currentLevel = 1;
    currentBiome = 0;
    distanceSinceFlag = 0;
    piranhaGroup;
    fireGroup;
    crocGroup;
    fishGroup;
    warping = false;
    parachuteMode = false;
    parachuteSprite;
    parachuteFlyingEnemies = [];
    parachuteTimer = 0;
    windSound;
    glowSprite;
    constructor() { super('ninja-runner'); }
    get displayName() { return 'Ninja Runner'; }
    getDescription() {
        return 'Run, jump, and dash through endless obstacles. How far can you go?';
    }
    getControls() {
        return [
            { key: '← →', action: 'Move Left / Right' },
            { key: 'SPACE', action: 'Jump' },
            { key: 'SHIFT', action: 'Run' },
            { key: 'F', action: 'Fireball' },
            { key: 'Z', action: 'Stomp Attack' },
        ];
    }
    sfx(key, volume = 0.3) {
        try {
            this.sound.play(key, { volume });
        }
        catch { /* ignore audio errors */ }
    }
    preload() {
        // Player spritesheet: 7 frames of 16×16
        this.load.spritesheet('player', '../assets/ninja-runner/player_strip.png', { frameWidth: 16, frameHeight: 16 });
        // Enemy spritesheet: 5 frames of 16×16
        this.load.spritesheet('enemy', '../assets/ninja-runner/enemy_strip.png', { frameWidth: 16, frameHeight: 16 });
        // Coin animation: 4 frames of 16×16
        this.load.spritesheet('coin_anim', '../assets/ninja-runner/coin_sheet.png', { frameWidth: 16, frameHeight: 16 });
        // Heart pickup
        this.load.spritesheet('heart_anim', '../assets/ninja-runner/heart_sheet.png', { frameWidth: 16, frameHeight: 16 });
        // Tile textures
        this.load.image('grass_block', '../assets/ninja-runner/grass_block.png');
        this.load.image('dirt_block', '../assets/ninja-runner/dirt_block.png');
        this.load.image('brown_block', '../assets/ninja-runner/brown_block.png');
        this.load.image('qblock_img', '../assets/ninja-runner/qblock_new.png');
        this.load.image('platform_tile', '../assets/ninja-runner/platform.png');
        this.load.image('spikes_tile', '../assets/ninja-runner/spikes.png');
        this.load.image('flag_tile', '../assets/ninja-runner/flag.png');
        this.load.image('bridge_tile', '../assets/ninja-runner/bridge.png');
        this.load.image('impact', '../assets/ninja-runner/impact_sheet.png');
        this.load.image('clouds', '../assets/ninja-runner/clouds.png');
        this.load.image('hill_0', '../assets/ninja-runner/hill_0.png');
        this.load.image('hill_1', '../assets/ninja-runner/hill_1.png');
        this.load.image('big_bush', '../assets/ninja-runner/big_bush.png');
        this.load.image('small_bush', '../assets/ninja-runner/small_bush.png');
        this.load.image('background', '../assets/ninja-runner/background.png');
        this.load.spritesheet('enemy_tall', '../assets/ninja-runner/enemy_tall_strip.png', { frameWidth: 16, frameHeight: 32 });
        this.load.spritesheet('enemy_short', '../assets/ninja-runner/enemy_short_strip.png', { frameWidth: 16, frameHeight: 16 });
        // Sound effects
        this.load.audio('nr_jump', '../assets/ninja-runner/sounds/SoundJump1.m4a');
        this.load.audio('nr_coin', '../assets/ninja-runner/sounds/SoundCoin.m4a');
        this.load.audio('nr_stomp', '../assets/ninja-runner/sounds/SoundEnemyDeath.m4a');
        this.load.audio('nr_powerup', '../assets/ninja-runner/sounds/SoundBonus.m4a');
        this.load.audio('nr_hit', '../assets/ninja-runner/sounds/SoundPlayerHit.m4a');
        this.load.audio('nr_die', '../assets/ninja-runner/sounds/SoundDeath.m4a');
        this.load.audio('nr_flag', '../assets/ninja-runner/sounds/SoundReachGoal.m4a');
        this.load.audio('nr_bounce', '../assets/ninja-runner/sounds/SoundBounce.m4a');
        this.load.audio('nr_startlevel', '../assets/ninja-runner/sounds/SoundStartLevel.m4a');
        this.load.audio('nr_gameover', '../assets/ninja-runner/sounds/SoundGameOver.m4a');
        this.load.audio('nr_land', '../assets/ninja-runner/sounds/SoundLand1.m4a');
        this.load.audio('nr_flap', '../assets/ninja-runner/sounds/SoundFlapLight.m4a');
        this.load.audio('nr_warp', '../assets/ninja-runner/sounds/SoundOpenDoor.m4a');
        this.load.audio('nr_fireball', '../assets/ninja-runner/sounds/SoundShootRegular.m4a');
        this.load.audio('nr_explosion', '../assets/ninja-runner/sounds/SoundExplosionSmall.m4a');
        this.load.audio('nr_extralife', '../assets/ninja-runner/sounds/SoundSpecialSkill.m4a');
        this.load.audio('nr_wind', '../assets/ninja-runner/sounds/SoundWind.m4a');
    }
    create() {
        this.initBase();
        // Recompute GROUND_Y from the actual game height (H may have been
        // refreshed after module load by refreshDimensions in game.ts)
        GROUND_Y = H - BLOCK;
        this.makeBlockTextures();
        this.physics.world.setBounds(0, 0, 1_000_000, H);
        this.groundGroup = this.physics.add.staticGroup();
        this.brickGroup = this.physics.add.staticGroup();
        this.qblockGroup = this.physics.add.staticGroup();
        this.pipeGroup = this.physics.add.staticGroup();
        this.coinGroup = this.physics.add.group({ allowGravity: false });
        this.mushroomGroup = this.physics.add.group();
        this.heartGroup = this.physics.add.group({ allowGravity: false });
        this.fireballGroup = this.physics.add.group();
        this.enemyGroup = this.physics.add.group();
        this.piranhaGroup = this.physics.add.group({ allowGravity: false });
        this.bridgeGroup = this.physics.add.staticGroup();
        this.bounceGroup = this.physics.add.staticGroup();
        this.flagGroup = this.physics.add.staticGroup();
        this.fireGroup = this.physics.add.group({ allowGravity: false });
        this.crocGroup = this.physics.add.group({ allowGravity: false });
        this.fishGroup = this.physics.add.group({ allowGravity: false });
        // Initial ground
        this.extendGround(0, W * 2);
        // Player — spritesheet frame 0 = idle
        this.player = this.physics.add.sprite(SPAWN_X, GROUND_Y - 200, 'player', 0);
        this.player.setOrigin(0.5, 1);
        this.player.setDisplaySize(PLAYER_W, PLAYER_H);
        // Physics body fills the full cell so player's head hits blocks above.
        this.player.body.setSize(12, 16);
        this.player.body.setOffset(2, 0);
        this.player.setMaxVelocity(700, 900);
        this.player.body.setGravityY(1800);
        this.player.setDepth(10);
        // Player animations
        this.anims.create({
            key: 'player_walk',
            frames: this.anims.generateFrameNumbers('player', { frames: [1, 2, 3] }),
            frameRate: 10,
            repeat: -1,
        });
        this.anims.create({
            key: 'player_idle',
            frames: [{ key: 'player', frame: 0 }],
            frameRate: 1,
        });
        // Coin spin animation
        this.anims.create({
            key: 'coin_spin',
            frames: this.anims.generateFrameNumbers('coin_anim', { start: 0, end: 3 }),
            frameRate: 8,
            repeat: -1,
        });
        // Heart pulse animation
        this.anims.create({
            key: 'heart_pulse',
            frames: this.anims.generateFrameNumbers('heart_anim', { start: 0, end: 3 }),
            frameRate: 4,
            repeat: -1,
        });
        // Enemy walk
        this.anims.create({
            key: 'enemy_walk',
            frames: this.anims.generateFrameNumbers('enemy', { frames: [0, 1, 2, 3] }),
            frameRate: 6,
            repeat: -1,
        });
        this.anims.create({
            key: 'enemy_tall_walk',
            frames: this.anims.generateFrameNumbers('enemy_tall', { frames: [0, 1, 2, 3] }),
            frameRate: 6,
            repeat: -1,
        });
        this.anims.create({
            key: 'enemy_short_walk',
            frames: this.anims.generateFrameNumbers('enemy_short', { frames: [0, 1, 2, 3] }),
            frameRate: 8,
            repeat: -1,
        });
        // Camera
        this.cameras.main.setBounds(0, 0, 1_000_000, H);
        this.cameras.main.startFollow(this.player, true, 0.15, 0.05, -W * 0.2, 0);
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
        // Colliders
        this.physics.add.collider(this.player, this.groundGroup);
        this.physics.add.collider(this.player, this.brickGroup, this.onPlayerHitBrick, undefined, this);
        this.physics.add.collider(this.player, this.qblockGroup, this.onPlayerHitQBlock, undefined, this);
        this.physics.add.collider(this.player, this.pipeGroup);
        this.physics.add.collider(this.enemyGroup, this.groundGroup);
        this.physics.add.collider(this.enemyGroup, this.brickGroup);
        this.physics.add.collider(this.enemyGroup, this.qblockGroup);
        this.physics.add.collider(this.enemyGroup, this.pipeGroup);
        this.physics.add.overlap(this.enemyGroup, this.enemyGroup, this.onEnemyVsEnemy, undefined, this);
        this.physics.add.collider(this.mushroomGroup, this.groundGroup);
        this.physics.add.collider(this.mushroomGroup, this.brickGroup);
        this.physics.add.collider(this.mushroomGroup, this.qblockGroup);
        this.physics.add.collider(this.mushroomGroup, this.pipeGroup);
        this.physics.add.collider(this.fireballGroup, this.groundGroup, this.onFireballHitSolid, undefined, this);
        this.physics.add.collider(this.fireballGroup, this.brickGroup, this.onFireballHitSolid, undefined, this);
        this.physics.add.collider(this.fireballGroup, this.qblockGroup, this.onFireballHitSolid, undefined, this);
        this.physics.add.collider(this.fireballGroup, this.pipeGroup, this.onFireballHitSolid, undefined, this);
        this.physics.add.overlap(this.player, this.coinGroup, this.onPlayerCoin, undefined, this);
        this.physics.add.overlap(this.player, this.mushroomGroup, this.onPlayerMushroom, undefined, this);
        this.physics.add.overlap(this.player, this.heartGroup, this.onPlayerHeart, undefined, this);
        this.physics.add.overlap(this.player, this.enemyGroup, this.onPlayerEnemy, undefined, this);
        this.physics.add.overlap(this.fireballGroup, this.enemyGroup, this.onFireballEnemy, undefined, this);
        this.physics.add.overlap(this.player, this.piranhaGroup, this.onPlayerPiranha, undefined, this);
        this.physics.add.overlap(this.player, this.fireGroup, this.onPlayerFire, undefined, this);
        this.physics.add.overlap(this.player, this.crocGroup, this.onPlayerCroc, undefined, this);
        this.physics.add.overlap(this.player, this.fishGroup, this.onPlayerFish, undefined, this);
        this.physics.add.collider(this.player, this.bridgeGroup, this.onPlayerBridge, undefined, this);
        this.physics.add.collider(this.enemyGroup, this.bridgeGroup);
        this.physics.add.overlap(this.player, this.flagGroup, this.onPlayerFlag, undefined, this);
        this.physics.add.collider(this.player, this.bounceGroup, this.onPlayerBounce, undefined, this);
        this.physics.add.collider(this.enemyGroup, this.bounceGroup);
        // Input
        this.input.keyboard.addCapture('UP,DOWN,LEFT,RIGHT,SPACE,SHIFT,F,Z');
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = {
            space: this.input.keyboard.addKey('SPACE'),
            shift: this.input.keyboard.addKey('SHIFT'),
            f: this.input.keyboard.addKey('F'),
            z: this.input.keyboard.addKey('Z'),
        };
        this.addDecorations();
        this.generateLevel(SPAWN_X + 400, W + 600);
        this.syncLivesToHUD();
        this.loadHighScore();
        this.distanceSinceFlag = 0;
        this.currentLevel = 1;
        this.syncLevelToHUD(this.currentLevel);
        this.sfx('nr_startlevel', 0.25);
        this.startWithReadyScreen();
    }
    // ---------- Brick / block textures generated at runtime via Graphics ----------
    makeBlockTextures() {
        const g = this.add.graphics();
        // Used Q-block (brown/empty) — 16×16 to match source tile size
        g.clear();
        g.fillStyle(0xa56a26);
        g.fillRect(0, 0, 16, 16);
        g.fillStyle(0x6e4715);
        g.fillRect(0, 0, 16, 1);
        g.fillRect(0, 15, 16, 1);
        g.fillRect(0, 0, 1, 16);
        g.fillRect(15, 0, 1, 16);
        g.generateTexture('qblock_used', 16, 16);
        // Pipe body (2 blocks wide)
        g.clear();
        g.fillStyle(0x20a010);
        g.fillRect(0, 0, BLOCK * 2, BLOCK);
        g.fillStyle(0x00680c);
        g.lineStyle(2, 0x00680c);
        g.strokeRect(0, 0, BLOCK * 2, BLOCK);
        g.fillStyle(0x80e080);
        g.fillRect(BLOCK / 3 + 4, 0, 4, BLOCK);
        g.generateTexture('pipe_body', BLOCK * 2, BLOCK);
        // Mushroom
        g.clear();
        g.fillStyle(0xd02020);
        g.fillRect(2, 2, 28, 16);
        g.fillStyle(0xffffff);
        g.fillRect(8, 6, 6, 6);
        g.fillRect(18, 6, 6, 6);
        g.fillStyle(0xf0d8a0);
        g.fillRect(6, 18, 20, 12);
        g.fillStyle(0x000000);
        g.fillRect(11, 22, 3, 4);
        g.fillRect(18, 22, 3, 4);
        g.generateTexture('mushroom', 32, 32);
        // Fireball
        g.clear();
        g.fillStyle(0xff8000);
        g.fillCircle(8, 8, 7);
        g.fillStyle(0xffe080);
        g.fillCircle(6, 6, 3);
        g.generateTexture('fireball', 16, 16);
        // Fire eruption — organic flame shape with layered colors
        g.clear();
        // Outer flame (dark red)
        g.fillStyle(0xcc2200);
        g.fillEllipse(8, 24, 14, 16);
        g.fillEllipse(8, 14, 10, 14);
        g.fillEllipse(8, 6, 6, 10);
        // Middle flame (orange)
        g.fillStyle(0xff6600);
        g.fillEllipse(8, 26, 10, 12);
        g.fillEllipse(8, 16, 8, 12);
        g.fillEllipse(8, 8, 4, 8);
        // Inner flame (yellow core)
        g.fillStyle(0xffcc00);
        g.fillEllipse(8, 28, 6, 8);
        g.fillEllipse(8, 20, 4, 8);
        // Hot white tip
        g.fillStyle(0xffffaa);
        g.fillEllipse(8, 28, 3, 5);
        g.generateTexture('fire_column', 16, 32);
        // Piranha plant frame 0 (mouth closed)
        g.clear();
        g.fillStyle(0x22aa22);
        g.fillRect(11, 16, 10, 16);
        g.fillStyle(0xdd2020);
        g.fillEllipse(16, 10, 24, 16);
        g.fillStyle(0xffffff);
        g.fillCircle(10, 8, 2);
        g.fillCircle(16, 6, 2);
        g.fillCircle(22, 8, 2);
        g.generateTexture('piranha_0', 32, 32);
        // Piranha plant frame 1 (mouth open)
        g.clear();
        g.fillStyle(0x22aa22);
        g.fillRect(11, 18, 10, 14);
        g.fillStyle(0xdd2020);
        g.fillEllipse(16, 10, 26, 18);
        g.fillStyle(0xffffff);
        g.fillCircle(10, 7, 2);
        g.fillCircle(16, 5, 2);
        g.fillCircle(22, 7, 2);
        g.fillStyle(0x000000);
        g.fillRect(8, 12, 16, 3);
        g.generateTexture('piranha_1', 32, 32);
        // Power-up glow effect
        g.clear();
        g.fillStyle(0xffdd00, 0.3);
        g.fillCircle(20, 20, 20);
        g.fillStyle(0xffff88, 0.2);
        g.fillCircle(20, 20, 14);
        g.generateTexture('glow', 40, 40);
        // Individual cloud puffs (3 sizes for variety)
        g.clear();
        g.fillStyle(0xffffff);
        g.fillCircle(10, 10, 8);
        g.fillCircle(20, 8, 10);
        g.fillCircle(32, 10, 9);
        g.fillCircle(16, 14, 7);
        g.fillCircle(26, 14, 8);
        g.generateTexture('cloud_sm', 42, 22);
        g.clear();
        g.fillStyle(0xffffff);
        g.fillCircle(14, 14, 12);
        g.fillCircle(30, 10, 14);
        g.fillCircle(48, 14, 11);
        g.fillCircle(22, 18, 10);
        g.fillCircle(38, 18, 12);
        g.generateTexture('cloud_md', 60, 28);
        g.clear();
        g.fillStyle(0xffffff);
        g.fillCircle(16, 16, 14);
        g.fillCircle(36, 12, 16);
        g.fillCircle(58, 14, 13);
        g.fillCircle(24, 22, 12);
        g.fillCircle(46, 20, 14);
        g.fillCircle(70, 16, 10);
        g.generateTexture('cloud_lg', 82, 32);
        // Green bat enemy — flies in a wave pattern
        g.clear();
        g.fillStyle(0x22aa44);
        g.fillEllipse(8, 9, 8, 8);
        g.fillStyle(0x44dd66);
        g.fillTriangle(1, 6, 6, 8, 3, 12); // left wing
        g.fillTriangle(15, 6, 10, 8, 13, 12); // right wing
        g.fillStyle(0xff0000);
        g.fillCircle(6, 8, 1);
        g.fillCircle(10, 8, 1);
        g.generateTexture('bat_0', 16, 16);
        g.clear();
        g.fillStyle(0x22aa44);
        g.fillEllipse(8, 9, 8, 8);
        g.fillStyle(0x44dd66);
        g.fillTriangle(1, 10, 6, 8, 3, 4); // wings up
        g.fillTriangle(15, 10, 10, 8, 13, 4);
        g.fillStyle(0xff0000);
        g.fillCircle(6, 8, 1);
        g.fillCircle(10, 8, 1);
        g.generateTexture('bat_1', 16, 16);
        // Warp pipe (lighter green with down arrow)
        g.clear();
        g.fillStyle(0x30c030);
        g.fillRect(0, 0, BLOCK * 2, BLOCK);
        g.fillStyle(0x10a010);
        g.lineStyle(2, 0x10a010);
        g.strokeRect(0, 0, BLOCK * 2, BLOCK);
        g.fillStyle(0xa0ffa0);
        g.fillRect(BLOCK / 3 + 4, 0, 4, BLOCK);
        g.fillStyle(0xffffff);
        g.fillTriangle(BLOCK, 4, BLOCK - 6, BLOCK / 2 - 4, BLOCK + 6, BLOCK / 2 - 4);
        g.generateTexture('pipe_warp', BLOCK * 2, BLOCK);
        // Golden pipe (parachute trigger)
        g.clear();
        g.fillStyle(0xdaa520);
        g.fillRect(0, 0, BLOCK * 2, BLOCK);
        g.fillStyle(0xb8860b);
        g.lineStyle(2, 0xb8860b);
        g.strokeRect(0, 0, BLOCK * 2, BLOCK);
        g.fillStyle(0xffd700);
        g.fillRect(BLOCK / 3 + 4, 0, 4, BLOCK);
        g.fillStyle(0xffffff);
        g.fillTriangle(BLOCK, BLOCK / 2 - 2, BLOCK - 5, BLOCK / 2 + 6, BLOCK + 5, BLOCK / 2 + 6);
        g.generateTexture('pipe_gold', BLOCK * 2, BLOCK);
        // Parachute canopy — half-dome with red/white panels, scalloped rim, strings
        g.clear();
        const cw = 64, ch = 80;
        const domeBottom = 36; // y where the canopy ends
        // Draw dome as upper half only — fill a tall ellipse then cover the bottom half
        g.fillStyle(0xff2020);
        g.fillEllipse(cw / 2, domeBottom, cw - 4, 56); // tall ellipse centered at rim
        // Cover lower half so only the dome (upper half) remains
        g.fillStyle(0x000000, 0.0);
        // We can't erase, so draw the dome differently:
        // Use a filled arc approach — draw overlapping circles for dome shape
        g.clear();
        // Red canopy dome — build with filled upper-half ellipse
        // Panel 1 (red) — left
        g.fillStyle(0xff2020);
        g.fillRoundedRect(2, 4, 14, domeBottom - 4, { tl: 10, tr: 4, bl: 0, br: 0 });
        // Panel 2 (white)
        g.fillStyle(0xffffff);
        g.fillRoundedRect(16, 2, 10, domeBottom - 2, { tl: 6, tr: 6, bl: 0, br: 0 });
        // Panel 3 (red) — center
        g.fillStyle(0xff2020);
        g.fillRoundedRect(26, 1, 12, domeBottom - 1, { tl: 8, tr: 8, bl: 0, br: 0 });
        // Panel 4 (white)
        g.fillStyle(0xffffff);
        g.fillRoundedRect(38, 2, 10, domeBottom - 2, { tl: 6, tr: 6, bl: 0, br: 0 });
        // Panel 5 (red) — right
        g.fillStyle(0xff2020);
        g.fillRoundedRect(48, 4, 14, domeBottom - 4, { tl: 4, tr: 10, bl: 0, br: 0 });
        // Top cap to round off the top
        g.fillStyle(0xff2020);
        g.fillEllipse(cw / 2, 6, 36, 12);
        // Scalloped bottom edge — small arcs to suggest billowy fabric
        g.fillStyle(0xff2020);
        for (let sx = 5; sx < cw - 4; sx += 12) {
            g.fillEllipse(sx + 6, domeBottom, 13, 6);
        }
        // Dark rim outline along bottom edge
        g.lineStyle(2, 0x880000);
        g.lineBetween(2, domeBottom, cw - 2, domeBottom);
        // Panel divider lines
        g.lineStyle(1, 0xaa0000);
        g.lineBetween(16, 6, 16, domeBottom);
        g.lineBetween(26, 4, 26, domeBottom);
        g.lineBetween(38, 4, 38, domeBottom);
        g.lineBetween(48, 6, 48, domeBottom);
        // Outer rim outline
        g.lineStyle(2, 0x880000);
        g.strokeRoundedRect(2, 2, cw - 4, domeBottom, { tl: 14, tr: 14, bl: 0, br: 0 });
        // Strings — fan out from canopy rim to a gather point near player
        g.lineStyle(1, 0x654321);
        const gatherY = ch - 2;
        const gatherX = cw / 2;
        g.lineBetween(4, domeBottom + 2, gatherX - 4, gatherY);
        g.lineBetween(16, domeBottom + 2, gatherX - 2, gatherY);
        g.lineBetween(cw / 2, domeBottom + 2, gatherX, gatherY);
        g.lineBetween(48, domeBottom + 2, gatherX + 2, gatherY);
        g.lineBetween(cw - 4, domeBottom + 2, gatherX + 4, gatherY);
        g.generateTexture('parachute', cw, ch);
        // Coin frame 0 (circle)
        g.clear();
        g.fillStyle(0xffd24a);
        g.fillCircle(12, 12, 9);
        g.fillStyle(0xb88a1f);
        g.fillRect(11, 3, 2, 18);
        g.generateTexture('coin0', 24, 24);
        // Coin frame 1 (thin)
        g.clear();
        g.fillStyle(0xffd24a);
        g.fillRect(9, 3, 6, 18);
        g.fillStyle(0xb88a1f);
        g.fillRect(11, 3, 2, 18);
        g.generateTexture('coin1', 24, 24);
        // Water tile — blue gradient with a subtle wave highlight
        g.clear();
        g.fillStyle(0x1a5276);
        g.fillRect(0, 0, BLOCK, BLOCK);
        g.fillStyle(0x2471a3);
        g.fillRect(0, 0, BLOCK, BLOCK * 0.3);
        g.fillStyle(0x85c1e9, 0.5);
        g.fillRect(4, 2, BLOCK * 0.3, 3);
        g.fillStyle(0x85c1e9, 0.4);
        g.fillRect(BLOCK * 0.55, 6, BLOCK * 0.25, 2);
        g.generateTexture('water', BLOCK, BLOCK);
        // Crocodile — Side view with tail, head poking above water
        // Both textures share the same back/body y-positions so swapping doesn't
        // make the croc rise out of the water.
        const crW = 64, crH = 22;
        const backY = 6; // top of back ridge — same in both states
        // Mouth closed (safe to stomp)
        g.clear();
        // Tail — tapers to the left
        g.fillStyle(0x3d5c1e);
        g.fillTriangle(0, backY + 4, 14, backY + 2, 14, backY + 8);
        g.fillStyle(0x2d4a14);
        g.fillTriangle(0, backY + 4, 8, backY + 3, 8, backY + 6); // darker tip
        // Tail ridges
        g.lineStyle(1, 0x2d4a14);
        g.lineBetween(4, backY + 3, 4, backY + 6);
        g.lineBetween(8, backY + 2, 8, backY + 7);
        // Body/back — long green shape
        g.fillStyle(0x3d5c1e);
        g.fillRoundedRect(12, backY, crW - 12, 12, { tl: 3, tr: 2, bl: 3, br: 2 });
        // Snout — extends forward (right side)
        g.fillStyle(0x4a6e23);
        g.fillRoundedRect(crW - 18, backY + 2, 18, 8, { tl: 0, tr: 3, bl: 0, br: 3 });
        // Darker dorsal ridge with bumps
        g.fillStyle(0x2d4a14);
        g.fillRect(14, backY, crW - 32, 3);
        for (let bx = 16; bx < crW - 20; bx += 6) {
            g.fillRect(bx, backY + 1, 3, 2);
        }
        // Nostril
        g.fillStyle(0x1a2e0a);
        g.fillCircle(crW - 4, backY + 5, 1);
        // Eye — yellow with black pupil
        g.fillStyle(0xffdd00);
        g.fillCircle(crW - 20, backY + 4, 3);
        g.fillStyle(0x111111);
        g.fillCircle(crW - 19, backY + 4, 1.5);
        // Jaw line
        g.lineStyle(1, 0x2d4a14);
        g.lineBetween(crW - 18, backY + 8, crW - 2, backY + 8);
        // Teeth hints along closed jaw
        g.fillStyle(0xeeeeee);
        for (let tx = crW - 16; tx < crW - 2; tx += 4) {
            g.fillTriangle(tx, backY + 8, tx + 2, backY + 8, tx + 1, backY + 10);
        }
        g.generateTexture('croc_closed', crW, crH);
        // Mouth open (danger!) — back stays at same y, only jaws move
        g.clear();
        // Tail — same as closed
        g.fillStyle(0x3d5c1e);
        g.fillTriangle(0, backY + 4, 14, backY + 2, 14, backY + 8);
        g.fillStyle(0x2d4a14);
        g.fillTriangle(0, backY + 4, 8, backY + 3, 8, backY + 6);
        g.lineStyle(1, 0x2d4a14);
        g.lineBetween(4, backY + 3, 4, backY + 6);
        g.lineBetween(8, backY + 2, 8, backY + 7);
        // Body/back — same position as closed
        g.fillStyle(0x3d5c1e);
        g.fillRoundedRect(12, backY, crW - 30, 10, { tl: 3, tr: 2, bl: 3, br: 2 });
        // Dorsal ridge — same
        g.fillStyle(0x2d4a14);
        g.fillRect(14, backY, crW - 32, 3);
        for (let bx = 16; bx < crW - 20; bx += 6) {
            g.fillRect(bx, backY + 1, 3, 2);
        }
        // Upper jaw — tilted up from back line
        g.fillStyle(0x4a6e23);
        g.fillRoundedRect(crW - 18, backY - 2, 18, 6, { tl: 0, tr: 3, bl: 0, br: 0 });
        // Lower jaw — drops down into water
        g.fillStyle(0x4a6e23);
        g.fillRoundedRect(crW - 18, backY + 10, 18, 6, { tl: 0, tr: 0, bl: 0, br: 3 });
        // Red mouth interior
        g.fillStyle(0xcc2222);
        g.fillRect(crW - 16, backY + 4, 14, 6);
        // Upper teeth
        g.fillStyle(0xffffff);
        for (let tx = crW - 16; tx < crW - 2; tx += 4) {
            g.fillTriangle(tx, backY + 4, tx + 2, backY + 4, tx + 1, backY + 6);
        }
        // Lower teeth
        for (let tx = crW - 16; tx < crW - 2; tx += 4) {
            g.fillTriangle(tx, backY + 10, tx + 2, backY + 10, tx + 1, backY + 8);
        }
        // Nostril
        g.fillStyle(0x1a2e0a);
        g.fillCircle(crW - 4, backY - 1, 1);
        // Eye — yellow with black pupil (same as closed)
        g.fillStyle(0xffdd00);
        g.fillCircle(crW - 20, backY + 1, 3);
        g.fillStyle(0x111111);
        g.fillCircle(crW - 19, backY + 1, 1.5);
        g.generateTexture('croc_open', crW, crH);
        // Fish — small side-view fish for bridge gaps
        const fW = 20, fH = 14;
        g.clear();
        // Body — orange/gold oval
        g.fillStyle(0xff8800);
        g.fillRoundedRect(2, 3, fW - 6, fH - 6, 4);
        // Belly highlight
        g.fillStyle(0xffbb44);
        g.fillRoundedRect(4, 6, fW - 10, 4, 2);
        // Tail fin
        g.fillStyle(0xff6600);
        g.fillTriangle(0, 3, 0, fH - 3, 5, fH / 2);
        // Dorsal fin
        g.fillStyle(0xff6600);
        g.fillTriangle(8, 3, 14, 3, 11, 0);
        // Eye
        g.fillStyle(0xffffff);
        g.fillCircle(fW - 7, 6, 2);
        g.fillStyle(0x111111);
        g.fillCircle(fW - 6, 6, 1);
        // Mouth
        g.lineStyle(1, 0xcc4400);
        g.lineBetween(fW - 3, 7, fW - 1, 7);
        g.generateTexture('fish', fW, fH);
        // Bounce pad (spring block)
        g.clear();
        g.fillStyle(0xff6600);
        g.fillRect(0, 0, BLOCK, BLOCK);
        g.fillStyle(0xff9933);
        g.fillRect(4, 4, BLOCK - 8, BLOCK / 3);
        g.fillStyle(0xcc4400);
        g.fillRect(0, 0, BLOCK, 2);
        g.fillRect(0, BLOCK - 2, BLOCK, 2);
        g.fillRect(0, 0, 2, BLOCK);
        g.fillRect(BLOCK - 2, 0, 2, BLOCK);
        g.fillStyle(0xffcc00);
        g.fillRect(BLOCK / 4, BLOCK / 3, BLOCK / 2, 4);
        g.fillRect(BLOCK / 4, BLOCK / 3 + 8, BLOCK / 2, 4);
        g.generateTexture('bounce_pad', BLOCK, BLOCK);
        g.destroy();
    }
    addDecorations() {
        // Semi-transparent tiled background — mountains peeking through
        // The image is 320×180, tile it across a wide area with slow parallax
        for (let i = 0; i < 30; i++) {
            this.add.image(i * W * 0.5, H / 2, 'background')
                .setDisplaySize(W * 0.5, H)
                .setAlpha(0.18)
                .setScrollFactor(0.05)
                .setDepth(-5);
        }
        // Hills behind the ground — very subtle
        for (let i = 0; i < 20; i++) {
            const hx = i * 500 + Math.random() * 300;
            const isSmall = Math.random() < 0.5;
            const tex = isSmall ? 'hill_0' : 'hill_1';
            const hh = isSmall ? 64 : 96;
            this.add.image(hx, GROUND_Y - hh / 2 + 10, tex)
                .setDisplaySize(isSmall ? 64 : 64, hh)
                .setAlpha(0.12)
                .setScrollFactor(0.3)
                .setDepth(-2);
        }
        // Bushes at ground level — decorative
        for (let i = 0; i < 25; i++) {
            const bx = i * 400 + Math.random() * 200;
            const isBig = Math.random() < 0.4;
            const tex = isBig ? 'big_bush' : 'small_bush';
            this.add.image(bx, GROUND_Y - 8, tex)
                .setDisplaySize(isBig ? 96 : 64, 32)
                .setAlpha(0.2)
                .setScrollFactor(0.5)
                .setDepth(-1);
        }
    }
    extendGround(fromX, toX) {
        for (let x = Math.floor(fromX / BLOCK) * BLOCK; x < toX; x += BLOCK) {
            if (this.isInGap(x + BLOCK / 2))
                continue;
            // skip if already there
            const exists = this.groundGroup.getChildren().some((g) => Math.abs(g.x - (x + BLOCK / 2)) < 1);
            if (exists)
                continue;
            const g = this.groundGroup.create(x + BLOCK / 2, GROUND_Y + BLOCK / 2, 'grass_block');
            g.setDisplaySize(BLOCK, BLOCK);
            g.refreshBody();
            const BIOME_TINTS = [0xffffff, 0xdec487, 0xb39ddb, 0xb3e5fc];
            g.setTint(BIOME_TINTS[this.currentBiome % 4]);
        }
    }
    isInGap(wx) {
        for (const gap of this.gaps) {
            if (wx >= gap.start && wx < gap.end)
                return true;
        }
        return false;
    }
    /** Returns true if wx is near any solid obstacle (pipe, brick, qblock, bounce pad). */
    isNearObstacle(wx) {
        const check = (group) => {
            const children = group.getChildren();
            for (const p of children) {
                if (!p.active)
                    continue;
                if (Math.abs(wx - p.x) < BLOCK * 1.2)
                    return true;
            }
            return false;
        };
        return check(this.pipeGroup) || check(this.brickGroup) || check(this.qblockGroup) || check(this.bounceGroup) || check(this.fireGroup);
    }
    /** Fill a gap with decorative water tiles. */
    fillWater(gapX, gapW) {
        const startY = GROUND_Y + BLOCK * 0.1;
        const rows = Math.ceil((H - startY) / BLOCK) + 1;
        // Place water tiles at the exact same grid positions where ground blocks were removed
        for (let gx = Math.floor(gapX / BLOCK) * BLOCK; gx < gapX + gapW; gx += BLOCK) {
            const cx = gx + BLOCK / 2;
            // Only place if this position is inside the gap
            if (!this.isInGap(cx))
                continue;
            for (let row = 0; row < rows; row++) {
                const w = this.add.image(cx, startY + row * BLOCK + BLOCK / 2, 'water');
                w.setDisplaySize(BLOCK, BLOCK);
                w.setDepth(-1);
            }
        }
    }
    generateLevel(lo, hi) {
        let x = Math.max(lo, this.genX);
        let lastPattern = -1;
        while (x < hi) {
            // Varied spacing: mix short (2-3), medium (4-6), and occasional long (7-10) gaps
            const spacingRoll = Math.random();
            const spacing = spacingRoll < 0.3 ? (2 + Math.floor(Math.random() * 2))
                : spacingRoll < 0.75 ? (4 + Math.floor(Math.random() * 3))
                    : (7 + Math.floor(Math.random() * 4));
            x += spacing * BLOCK;
            // Pick a pattern using shuffle-style selection (avoid repeating last pattern)
            let pattern;
            do {
                pattern = Math.floor(Math.random() * 20);
            } while (pattern === lastPattern);
            lastPattern = pattern;
            if (pattern === 0) {
                // Coin arch — 5-6 coins in a parabolic arc
                const arcLen = 5 + Math.floor(Math.random() * 2);
                for (let i = 0; i < arcLen; i++) {
                    const t = i / (arcLen - 1);
                    const arcY = GROUND_Y - BLOCK * 1.5 - Math.sin(t * Math.PI) * BLOCK * 2;
                    const c = this.coinGroup.create(x + i * BLOCK + BLOCK / 2, arcY, 'coin0');
                    c.setDisplaySize(BLOCK * 0.5, BLOCK * 0.65);
                    c.body.setAllowGravity(false);
                    c.body.setSize(12, 18);
                }
                x += arcLen * BLOCK;
            }
            else if (pattern === 1) {
                // Block row with ?-block
                const n = 3 + Math.floor(Math.random() * 2);
                const y = GROUND_Y - BLOCK * 2;
                const qi = Math.floor(Math.random() * n);
                for (let i = 0; i < n; i++) {
                    const bx = x + i * BLOCK;
                    if (i === qi) {
                        const q = this.qblockGroup.create(bx + BLOCK / 2, y + BLOCK / 2, 'qblock_img');
                        q.setData('hit', false);
                        q.setData('reward', 'coin');
                        q.setDisplaySize(BLOCK, BLOCK);
                        q.refreshBody();
                    }
                    else {
                        const b = this.brickGroup.create(bx + BLOCK / 2, y + BLOCK / 2, 'brown_block');
                        b.setDisplaySize(BLOCK, BLOCK);
                        b.refreshBody();
                    }
                }
                // Coins above block row
                for (let i = 0; i < n; i++) {
                    if (Math.random() < 0.4) {
                        const c = this.coinGroup.create(x + i * BLOCK + BLOCK / 2, y - BLOCK / 2, 'coin0');
                        c.setDisplaySize(BLOCK * 0.5, BLOCK * 0.65);
                        c.body.setAllowGravity(false);
                        c.body.setSize(12, 18);
                    }
                }
                x += n * BLOCK;
                // Enemy patrolling on top of the block row (~60% chance, ground types only)
                if (Math.random() < 0.6) {
                    const enemyX = x - Math.floor(n / 2) * BLOCK;
                    const e = this.spawnEnemyAt('goomba', enemyX, y - BLOCK, true);
                    if (e) {
                        e.setVelocityX(0);
                        e.setData('patrolAwait', true);
                        e.setData('patrolLeft', enemyX - BLOCK * (n / 2 - 0.5));
                        e.setData('patrolRight', enemyX + BLOCK * (n / 2 - 0.5));
                    }
                }
            }
            else if (pattern === 2) {
                // Bounce pad — spring block that launches the player
                const pad = this.bounceGroup.create(x + BLOCK / 2, GROUND_Y - BLOCK / 2, 'bounce_pad');
                pad.setDisplaySize(BLOCK, BLOCK);
                pad.refreshBody();
                // Coins high above the pad as reward
                for (let i = 0; i < 3; i++) {
                    const c = this.coinGroup.create(x + BLOCK / 2, GROUND_Y - BLOCK * (4 + i), 'coin0');
                    c.setDisplaySize(BLOCK * 0.5, BLOCK * 0.65);
                    c.body.setAllowGravity(false);
                    c.body.setSize(12, 18);
                }
                x += BLOCK * 2;
            }
            else if (pattern === 3) {
                // Pipe — 1-2 blocks tall (jumpable)
                const pipeBlocks = 1 + Math.floor(Math.random() * 2);
                const ph = pipeBlocks * BLOCK;
                const pw = 2 * BLOCK;
                const py = GROUND_Y - ph;
                const isGold = Math.random() < 0.25;
                const isWarp = !isGold && Math.random() < 0.4;
                let topSeg = null;
                for (let yy = py; yy < GROUND_Y; yy += BLOCK) {
                    const isTop = yy === py;
                    const tex = isTop && isGold ? 'pipe_gold' : isTop && isWarp ? 'pipe_warp' : 'pipe_body';
                    const seg = this.pipeGroup.create(x + pw / 2, yy + BLOCK / 2, tex);
                    seg.setDisplaySize(BLOCK * 2, BLOCK);
                    seg.refreshBody();
                    if (isTop)
                        topSeg = seg;
                }
                if (topSeg) {
                    if (isWarp)
                        topSeg.setData('warp', true);
                    if (isGold)
                        topSeg.setData('gold', true);
                }
                // Piranha plant on regular pipes (~60% chance)
                if (!isWarp && !isGold && Math.random() < 0.6) {
                    const p = this.piranhaGroup.create(x + pw / 2, py - 8, 'piranha_0');
                    p.setOrigin(0.5, 1);
                    p.setDisplaySize(BLOCK * 0.8, BLOCK);
                    p.body.setAllowGravity(false);
                    p.setData('pipeX', x + pw / 2);
                    p.setData('pipeTopY', py);
                    p.setData('timer', Math.random() * 4000);
                    p.setData('exposed', false);
                    p.setVisible(false);
                }
                x += pw;
            }
            else if (pattern === 4) {
                // Enemy — single (combined enemy types, random pick)
                const types = ['goomba', 'goomba', 'koopa', 'rkoopa'];
                this.spawnEnemy(types[Math.floor(Math.random() * types.length)], x);
                x += BLOCK * 2;
            }
            else if (pattern === 5) {
                // Enemy pair — two different enemies spawned close together
                const types = ['goomba', 'koopa', 'rkoopa'];
                const t1 = types[Math.floor(Math.random() * types.length)];
                let t2 = types[Math.floor(Math.random() * types.length)];
                while (t2 === t1)
                    t2 = types[Math.floor(Math.random() * types.length)];
                this.spawnEnemy(t1, x);
                this.spawnEnemy(t2, x + BLOCK * 2);
                x += BLOCK * 4;
            }
            else if (pattern === 6) {
                // Combined ?-block — mushroom or coin reward
                const reward = Math.random() < 0.35 ? 'mushroom' : 'coin';
                const q = this.qblockGroup.create(x + BLOCK / 2, GROUND_Y - BLOCK * 2 + BLOCK / 2, 'qblock_img');
                q.setData('hit', false);
                q.setData('reward', reward);
                q.setDisplaySize(BLOCK, BLOCK);
                q.refreshBody();
                x += BLOCK;
            }
            else if (pattern === 7) {
                // Ascending staircase with enemy on top (max 3 steps for reachability)
                const h = 2 + Math.floor(Math.random() * 2);
                for (let step = 0; step < h; step++) {
                    const b = this.brickGroup.create(x + step * BLOCK + BLOCK / 2, GROUND_Y - (step + 1) * BLOCK + BLOCK / 2, 'brown_block');
                    b.setDisplaySize(BLOCK, BLOCK);
                    b.refreshBody();
                }
                // 50% chance enemy on the top step
                if (Math.random() < 0.5) {
                    const topX = x + (h - 1) * BLOCK + BLOCK / 2;
                    const topY = GROUND_Y - h * BLOCK - BLOCK;
                    this.spawnEnemyAt('goomba', topX, topY);
                }
                x += h * BLOCK;
            }
            else if (pattern === 8) {
                // Water gap
                const gapW = (3 + Math.floor(Math.random() * 2)) * BLOCK;
                this.gaps.push({ start: x, end: x + gapW });
                this.groundGroup.getChildren().forEach((g) => {
                    if (g.x >= x && g.x < x + gapW)
                        g.destroy();
                });
                this.fillWater(x, gapW);
                // 50% chance: fire eruption hazard in the gap
                if (Math.random() < 0.5) {
                    const fireX = x + gapW / 2;
                    const f = this.fireGroup.create(fireX, GROUND_Y + BLOCK * 2, 'fire_column');
                    f.setDisplaySize(BLOCK * 0.8, BLOCK * 2);
                    f.setOrigin(0.5, 1);
                    f.body.setAllowGravity(false);
                    f.setData('baseY', GROUND_Y + BLOCK * 2);
                    f.setData('gapX', fireX);
                    f.setData('active', false);
                    f.setVisible(false);
                    f.body.enable = false;
                }
                x += gapW;
            }
            else if (pattern === 9) {
                // Collapsing bridge over gap
                const bridgeLen = 4 + Math.floor(Math.random() * 4);
                const gapW = bridgeLen * BLOCK;
                this.gaps.push({ start: x, end: x + gapW });
                this.groundGroup.getChildren().forEach((g) => {
                    if (g.x >= x && g.x < x + gapW)
                        g.destroy();
                });
                this.fillWater(x, gapW);
                // Decide which tiles are unstable: first & last always stable,
                // never two consecutive unstable, max ~40% unstable
                const unstableMap = new Array(bridgeLen).fill(false);
                const maxUnstable = Math.floor(bridgeLen * 0.4);
                let unstableCount = 0;
                for (let i = 1; i < bridgeLen - 1; i++) {
                    if (unstableCount >= maxUnstable)
                        break;
                    if (unstableMap[i - 1])
                        continue; // previous was unstable, skip
                    if (Math.random() < 0.35) {
                        unstableMap[i] = true;
                        unstableCount++;
                    }
                }
                for (let i = 0; i < bridgeLen; i++) {
                    const bx = x + i * BLOCK + BLOCK / 2;
                    const bt = this.bridgeGroup.create(bx, GROUND_Y + BLOCK / 2, 'bridge_tile');
                    bt.setDisplaySize(BLOCK, BLOCK);
                    bt.refreshBody();
                    bt.setData('unstable', unstableMap[i]);
                    bt.setData('collapsing', false);
                    // Spawn a fish under each unstable tile
                    if (unstableMap[i]) {
                        const fish = this.fishGroup.create(bx, GROUND_Y + BLOCK * 2, 'fish');
                        fish.setOrigin(0.5, 0.5);
                        fish.body.setAllowGravity(false);
                        fish.setVisible(false);
                        fish.body.enable = false;
                        fish.setData('homeX', bx);
                        fish.setData('jumped', false);
                    }
                }
                x += gapW;
            }
            else if (pattern === 10) {
                // Multi-tier platform — 2 levels with room to run
                const lowerY = GROUND_Y - BLOCK * 2;
                for (let i = 0; i < 4; i++) {
                    if (i === 1) {
                        const q = this.qblockGroup.create(x + i * BLOCK + BLOCK / 2, lowerY + BLOCK / 2, 'qblock_img');
                        q.setData('hit', false);
                        q.setData('reward', 'coin');
                        q.setDisplaySize(BLOCK, BLOCK);
                        q.refreshBody();
                    }
                    else {
                        const b = this.brickGroup.create(x + i * BLOCK + BLOCK / 2, lowerY + BLOCK / 2, 'brown_block');
                        b.setDisplaySize(BLOCK, BLOCK);
                        b.refreshBody();
                    }
                }
                const upperY = GROUND_Y - BLOCK * 5.5;
                for (let i = 1; i <= 2; i++) {
                    const b = this.brickGroup.create(x + i * BLOCK + BLOCK / 2, upperY + BLOCK / 2, 'brown_block');
                    b.setDisplaySize(BLOCK, BLOCK);
                    b.refreshBody();
                }
                const c = this.coinGroup.create(x + 1.5 * BLOCK + BLOCK / 2, upperY - BLOCK / 2, 'coin0');
                c.setDisplaySize(BLOCK * 0.5, BLOCK * 0.65);
                c.body.setAllowGravity(false);
                c.body.setSize(12, 18);
                x += 4 * BLOCK;
            }
            else if (pattern === 11) {
                // Mixed brick/qblock cluster with enemy
                const clusterLen = 5;
                const clusterY = GROUND_Y - BLOCK * 2;
                const qPositions = new Set();
                const qCount = 1 + Math.floor(Math.random() * 2);
                while (qPositions.size < qCount) {
                    qPositions.add(Math.floor(Math.random() * clusterLen));
                }
                for (let i = 0; i < clusterLen; i++) {
                    if (qPositions.has(i)) {
                        const q = this.qblockGroup.create(x + i * BLOCK + BLOCK / 2, clusterY + BLOCK / 2, 'qblock_img');
                        q.setData('hit', false);
                        q.setData('reward', 'coin');
                        q.setDisplaySize(BLOCK, BLOCK);
                        q.refreshBody();
                    }
                    else {
                        const b = this.brickGroup.create(x + i * BLOCK + BLOCK / 2, clusterY + BLOCK / 2, 'brown_block');
                        b.setDisplaySize(BLOCK, BLOCK);
                        b.refreshBody();
                    }
                }
                x += clusterLen * BLOCK;
                // Enemy on top of the cluster
                if (Math.random() < 0.5) {
                    this.spawnEnemyAt('goomba', x - 2 * BLOCK, clusterY - BLOCK);
                }
            }
            else if (pattern === 12) {
                // Elevated bridge with enemy
                const bridgeLen = 4 + Math.floor(Math.random() * 3);
                const bridgeY = GROUND_Y - BLOCK * 2;
                for (let i = 0; i < bridgeLen; i++) {
                    const b = this.brickGroup.create(x + i * BLOCK + BLOCK / 2, bridgeY + BLOCK / 2, 'brown_block');
                    b.setDisplaySize(BLOCK, BLOCK);
                    b.refreshBody();
                }
                // Coins along the bridge
                for (let i = 0; i < bridgeLen; i += 2) {
                    const c = this.coinGroup.create(x + i * BLOCK + BLOCK / 2, bridgeY - BLOCK / 2, 'coin0');
                    c.setDisplaySize(BLOCK * 0.5, BLOCK * 0.65);
                    c.body.setAllowGravity(false);
                    c.body.setSize(12, 18);
                }
                this.spawnEnemyAt('goomba', x + BLOCK, bridgeY - BLOCK);
                x += bridgeLen * BLOCK;
            }
            else if (pattern === 13) {
                // Descending staircase
                const h = 2 + Math.floor(Math.random() * 2);
                for (let step = 0; step < h; step++) {
                    const b = this.brickGroup.create(x + step * BLOCK + BLOCK / 2, GROUND_Y - (h - step) * BLOCK + BLOCK / 2, 'brown_block');
                    b.setDisplaySize(BLOCK, BLOCK);
                    b.refreshBody();
                }
                // Enemy on top
                if (Math.random() < 0.4) {
                    this.spawnEnemyAt('goomba', x + BLOCK / 2, GROUND_Y - h * BLOCK - BLOCK);
                }
                x += h * BLOCK;
            }
            else if (pattern === 14) {
                // Floating coins — zigzag pattern
                const zigLen = 4 + Math.floor(Math.random() * 2);
                for (let i = 0; i < zigLen; i++) {
                    const zigY = GROUND_Y - BLOCK * 2 - (i % 2 === 0 ? 0 : BLOCK);
                    const c = this.coinGroup.create(x + i * BLOCK + BLOCK / 2, zigY, 'coin0');
                    c.setDisplaySize(BLOCK * 0.5, BLOCK * 0.65);
                    c.body.setAllowGravity(false);
                    c.body.setSize(12, 18);
                }
                x += zigLen * BLOCK;
            }
            else if (pattern === 15) {
                // Spike gauntlet — spike, platform, spike, platform pattern
                const pairs = 2 + Math.floor(Math.random() * 2); // 2-3 spike-platform pairs
                const spacing = BLOCK * 1.6;
                for (let i = 0; i < pairs * 2 + 1; i++) {
                    const sx = x + i * spacing;
                    if (i % 2 === 0) {
                        // Spike
                        const spike = this.add.image(sx + BLOCK / 2, GROUND_Y - BLOCK * 0.3, 'spikes_tile');
                        spike.setDisplaySize(BLOCK, BLOCK * 0.6);
                        spike.setDepth(2);
                        const hitZone = this.fireGroup.create(sx + BLOCK / 2, GROUND_Y - BLOCK * 0.2, 'spikes_tile');
                        hitZone.setDisplaySize(BLOCK * 0.9, BLOCK * 0.4);
                        hitZone.setAlpha(0);
                        hitZone.body.setAllowGravity(false);
                        hitZone.body.enable = true;
                        // Warm glow behind spikes (Ellipse Shape — WebGL batched)
                        const spikeGlow = this.add.ellipse(sx + BLOCK / 2, GROUND_Y - BLOCK * 0.4, BLOCK * 1.8, BLOCK * 1.6, 0xff4400, 1.0);
                        spikeGlow.setDepth(1);
                        spikeGlow.setAlpha(0.2);
                        spikeGlow.setBlendMode(Phaser.BlendModes.ADD);
                        hitZone.setData('manualGlow', spikeGlow);
                        hitZone.setData('hasGlow', true);
                        // Sparks that shoot UP high above the spikes
                        const sparks = this.add.particles(sx + BLOCK / 2, GROUND_Y - BLOCK * 0.6, 'coin0', {
                            speed: { min: 40, max: 100 },
                            angle: { min: 250, max: 290 },
                            scale: { start: 0.2, end: 0 },
                            alpha: { start: 0.9, end: 0 },
                            lifespan: { min: 500, max: 1200 },
                            frequency: 120,
                            quantity: 2,
                            tint: [0xff2200, 0xff4400, 0xff6600, 0xffaa00, 0xffff00],
                            blendMode: 'ADD',
                            gravityY: 30,
                        });
                        sparks.setDepth(3);
                        hitZone.setData('sparks', sparks);
                    }
                    else {
                        // Small raised platform to land on between spikes
                        const plat = this.groundGroup.create(sx + BLOCK / 2, GROUND_Y - BLOCK * 0.5 + BLOCK / 2, 'grass_block');
                        plat.setDisplaySize(BLOCK, BLOCK);
                        plat.refreshBody();
                    }
                }
                x += (pairs * 2 + 1) * spacing;
            }
            else if (pattern === 16) {
                // Staircase up — 3 tiers ascending, enough clearance to run on each
                for (let tier = 0; tier < 3; tier++) {
                    const tierY = GROUND_Y - BLOCK * (2 + tier * 3);
                    const tierX = x + tier * BLOCK * 2.5;
                    const width = 4 - tier; // wider at bottom
                    for (let i = 0; i < width; i++) {
                        // Top tier, first block → ?-block with reward
                        if (tier === 2 && i === 0) {
                            const q = this.qblockGroup.create(tierX + i * BLOCK + BLOCK / 2, tierY + BLOCK / 2, 'qblock_img');
                            q.setData('hit', false);
                            q.setData('reward', Math.random() < 0.4 ? 'mushroom' : 'coin');
                            q.setDisplaySize(BLOCK, BLOCK);
                            q.refreshBody();
                        }
                        else {
                            const b = this.brickGroup.create(tierX + i * BLOCK + BLOCK / 2, tierY + BLOCK / 2, 'brown_block');
                            b.setDisplaySize(BLOCK, BLOCK);
                            b.refreshBody();
                        }
                    }
                    // Coin on each tier
                    const c = this.coinGroup.create(tierX + BLOCK / 2, tierY - BLOCK / 2, 'coin0');
                    c.setDisplaySize(BLOCK * 0.5, BLOCK * 0.65);
                    c.body.setAllowGravity(false);
                    c.body.setSize(12, 18);
                }
                x += 8 * BLOCK;
            }
            else if (pattern === 17) {
                // Tower — 3-high column with platforms branching off, room to run
                const towerX = x + BLOCK * 3;
                for (let level = 0; level < 3; level++) {
                    const ly = GROUND_Y - BLOCK * (2 + level * 3);
                    // Central column block
                    const b = this.brickGroup.create(towerX + BLOCK / 2, ly + BLOCK / 2, 'brown_block');
                    b.setDisplaySize(BLOCK, BLOCK);
                    b.refreshBody();
                    // Side platform (alternating left/right)
                    const side = level % 2 === 0 ? -1 : 1;
                    for (let s = 1; s <= 2; s++) {
                        const sb = this.brickGroup.create(towerX + side * s * BLOCK + BLOCK / 2, ly + BLOCK / 2, 'brown_block');
                        sb.setDisplaySize(BLOCK, BLOCK);
                        sb.refreshBody();
                    }
                    // Coin on the platform
                    const c = this.coinGroup.create(towerX + side * BLOCK + BLOCK / 2, ly - BLOCK / 2, 'coin0');
                    c.setDisplaySize(BLOCK * 0.5, BLOCK * 0.65);
                    c.body.setAllowGravity(false);
                    c.body.setSize(12, 18);
                }
                x += 8 * BLOCK;
            }
            else if (pattern === 18) {
                // Pyramid — wide base narrowing up, 3 levels with running room
                const baseW = 5;
                for (let level = 0; level < 3; level++) {
                    const ly = GROUND_Y - BLOCK * (2 + level * 3);
                    const lw = baseW - level * 2;
                    const lx = x + level * BLOCK;
                    for (let i = 0; i < lw; i++) {
                        const isQ = level === 2 && i === Math.floor(lw / 2);
                        if (isQ) {
                            const q = this.qblockGroup.create(lx + i * BLOCK + BLOCK / 2, ly + BLOCK / 2, 'qblock_img');
                            q.setData('hit', false);
                            q.setData('reward', Math.random() < 0.3 ? 'mushroom' : 'coin');
                            q.setDisplaySize(BLOCK, BLOCK);
                            q.refreshBody();
                        }
                        else {
                            const b = this.brickGroup.create(lx + i * BLOCK + BLOCK / 2, ly + BLOCK / 2, 'brown_block');
                            b.setDisplaySize(BLOCK, BLOCK);
                            b.refreshBody();
                        }
                    }
                }
                // Enemy patrolling the base
                if (Math.random() < 0.5) {
                    this.spawnEnemyAt('goomba', x + BLOCK, GROUND_Y - BLOCK);
                }
                x += (baseW + 1) * BLOCK;
            }
            else if (pattern === 19) {
                // Small croc pond — narrow water gap with 1-2 crocodiles
                const gapW = (2 + Math.floor(Math.random() * 2)) * BLOCK; // 2-3 blocks wide
                this.gaps.push({ start: x, end: x + gapW });
                this.groundGroup.getChildren().forEach((g) => {
                    if (g.x >= x && g.x < x + gapW)
                        g.destroy();
                });
                this.fillWater(x, gapW);
                const numCrocs = gapW >= BLOCK * 3 ? 2 : 1;
                const spacing = gapW / (numCrocs + 1);
                for (let ci = 0; ci < numCrocs; ci++) {
                    const cx = x + spacing * (ci + 1);
                    const cy = GROUND_Y + 8; // Sit on water surface
                    const croc = this.crocGroup.create(cx, cy, 'croc_closed');
                    croc.setOrigin(0.5, 1);
                    croc.body.setAllowGravity(false);
                    croc.body.setSize(58, 16);
                    croc.setData('mouthOpen', false);
                    croc.setData('timer', this.time.now + 2000 + Math.random() * 2000);
                    croc.setData('gapStart', x);
                    croc.setData('gapEnd', x + gapW);
                    croc.setData('swimDir', Math.random() < 0.5 ? 1 : -1);
                    croc.setVelocityX(croc.getData('swimDir') * 30);
                }
                x += gapW;
            }
        }
        this.genX = Math.max(this.genX, x);
        this.extendGround(0, this.genX + W);
        // Scatter decorative bushes in the new section
        for (let bx = lo; bx < hi; bx += BLOCK * 6 + Math.floor(Math.random() * BLOCK * 4)) {
            if (this.isInGap(bx))
                continue;
            const isBig = Math.random() < 0.3;
            const tex = isBig ? 'big_bush' : 'small_bush';
            const bush = this.add.image(bx, GROUND_Y, tex);
            bush.setDisplaySize(isBig ? BLOCK * 1.5 : BLOCK, BLOCK * 0.5);
            bush.setOrigin(0.5, 1);
            bush.setDepth(1);
            bush.setAlpha(0.8);
        }
        // Scatter ground-level coin trails between obstacles (skip coins near pipes)
        for (let cx = lo; cx < hi; cx += BLOCK * 8 + Math.floor(Math.random() * BLOCK * 6)) {
            if (this.isInGap(cx))
                continue;
            if (Math.random() < 0.4)
                continue; // skip some
            const trailLen = 2 + Math.floor(Math.random() * 3);
            for (let i = 0; i < trailLen; i++) {
                const coinX = cx + i * BLOCK;
                if (this.isInGap(coinX))
                    break;
                if (this.isNearObstacle(coinX))
                    break;
                const c = this.coinGroup.create(coinX + BLOCK / 2, GROUND_Y - BLOCK * 0.7, 'coin0');
                c.setDisplaySize(BLOCK * 0.5, BLOCK * 0.65);
                c.body.setAllowGravity(false);
                c.body.setSize(12, 18);
            }
        }
        // Rare heart pickup — extra life, hard to reach (2% chance per section)
        if (Math.random() < 0.02) {
            // Place high above a random non-gap spot — needs bounce pad or double-jump
            const hx = lo + Math.floor(Math.random() * (hi - lo - BLOCK * 4)) + BLOCK * 2;
            if (!this.isInGap(hx)) {
                const hy = GROUND_Y - BLOCK * (3 + Math.random() * 1.5); // high but reachable with a good jump
                const h = this.heartGroup.create(hx, hy, 'heart_anim', 0);
                h.setDisplaySize(BLOCK * 0.7, BLOCK * 0.7);
                h.body.setAllowGravity(false);
                h.anims.play('heart_pulse', true);
                // Subtle float animation
                this.tweens.add({
                    targets: h,
                    y: hy - BLOCK * 0.3,
                    duration: 1200,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                });
            }
        }
        // Flag checkpoint every ~2500px
        this.distanceSinceFlag += (hi - lo);
        if (this.distanceSinceFlag > 2500) {
            this.distanceSinceFlag = 0;
            const flagX = this.genX - BLOCK * 2;
            if (!this.isInGap(flagX)) {
                for (let i = 0; i < 3; i++) {
                    const pole = this.add.image(flagX, GROUND_Y - i * BLOCK - BLOCK / 2, 'brown_block');
                    pole.setDisplaySize(BLOCK * 0.3, BLOCK);
                    pole.setDepth(1);
                }
                const flag = this.flagGroup.create(flagX, GROUND_Y - BLOCK * 3 + BLOCK / 2, 'flag_tile');
                flag.setDisplaySize(BLOCK, BLOCK * 1.5);
                flag.setOrigin(0.5, 1);
                flag.refreshBody();
            }
        }
    }
    spawnEnemy(kind, x) {
        this.spawnEnemyAt(kind, x + BLOCK / 2, GROUND_Y);
    }
    spawnEnemyAt(kind, x, y, groundOnly = false) {
        let roll = Math.random();
        // When spawning on blocks, re-roll if we get a bat (bats fly away)
        if (groundOnly && roll >= 0.80)
            roll = Math.random() * 0.80;
        let tex;
        let animKey;
        let enemyType;
        let speed;
        let displayH = BLOCK;
        if (roll < 0.30) {
            tex = 'enemy';
            animKey = 'enemy_walk';
            enemyType = 'monster';
            speed = -100;
        }
        else if (roll < 0.55) {
            tex = 'enemy_short';
            animKey = 'enemy_short_walk';
            enemyType = 'bulldog';
            speed = -140;
        }
        else if (roll < 0.80) {
            tex = 'enemy_tall';
            animKey = 'enemy_tall_walk';
            enemyType = 'snake';
            speed = -80;
            displayH = BLOCK * 1.5;
        }
        else {
            tex = 'bat_0';
            animKey = '';
            enemyType = 'bat';
            speed = -120;
        }
        const isBat = enemyType === 'bat';
        const e = this.enemyGroup.create(x, y, tex, 0);
        e.setOrigin(0.5, 1);
        e.setDisplaySize(BLOCK, displayH);
        e.body.setGravityY(isBat ? 0 : 1800);
        e.body.setAllowGravity(!isBat);
        e.setVelocityX(speed);
        e.setBounceX(1);
        e.setCollideWorldBounds(false);
        e.setData('kind', kind);
        e.setData('enemyType', enemyType);
        e.setData('state', 'walk');
        e.setData('timer', 0);
        e.setData('baseY', y);
        if (animKey) {
            e.anims.play(animKey, true);
        }
        // Tighten hitbox for tall enemies (snake) — default body is too wide
        if (enemyType === 'snake') {
            e.body.setSize(10, 28);
            e.body.setOffset(3, 4);
        }
        return e;
    }
    update(_t, dtMs) {
        if (this.dead) {
            this.deadTimer -= dtMs;
            this.player.setVelocityX(0);
            if (this.deadTimer <= 0 && !this.gameOverShown)
                this.respawn();
            return;
        }
        if (this.warping)
            return;
        if (this.parachuteMode) {
            this.updateParachute(dtMs);
            return;
        }
        if (this.invincible > 0)
            this.invincible -= dtMs;
        if (this.shrinkTimer > 0)
            this.shrinkTimer -= dtMs;
        if (this.stompGrace > 0)
            this.stompGrace -= dtMs;
        if (this.fireCooldown > 0)
            this.fireCooldown -= dtMs;
        this.updatePlayerMovement(dtMs);
        if (this.player.y > H + 50) {
            this.die();
            return;
        }
        const edge = this.cameras.main.scrollX + W + 600;
        if (edge > this.genX)
            this.generateLevel(this.genX, edge);
        this.updatePlayerAnimation();
        const camLeft = this.cameras.main.scrollX;
        this.updateCoins(camLeft);
        this.updateBridges(camLeft);
        this.updateFireEruptions(camLeft);
        this.updatePiranhas(dtMs, camLeft);
        this.enemyGroup.getChildren().forEach(e => this.updateEnemy(e, camLeft));
        this.updateCrocs(camLeft);
        this.cleanupOffscreen(camLeft);
    }
    updateParachute(dtMs) {
        // Stop camera from following — terrain stays fixed
        this.cameras.main.stopFollow();
        if (this.parachuteSprite) {
            this.parachuteSprite.x = this.player.x;
            const playerH = PLAYER_H;
            this.parachuteSprite.y = this.player.y - playerH + 8;
        }
        // Full directional control with arrow keys
        const camX = this.cameras.main.scrollX;
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-200);
        }
        else if (this.cursors.right.isDown) {
            this.player.setVelocityX(200);
        }
        else {
            this.player.setVelocityX(Math.sin(this.time.now / 1200) * 40);
        }
        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-180);
        }
        else if (this.cursors.down.isDown) {
            this.player.setVelocityY(300);
        }
        // Keep Player within visible screen
        if (this.player.x < camX + 30)
            this.player.x = camX + 30;
        if (this.player.x > camX + W - 30)
            this.player.x = camX + W - 30;
        if (this.player.y < 40)
            this.player.y = 40;
        this.parachuteTimer += dtMs;
        if (this.parachuteTimer > 1500 && this.parachuteFlyingEnemies.length < 15) {
            this.parachuteTimer = 0;
            const fromLeft = Math.random() < 0.5;
            const camX = this.cameras.main.scrollX;
            const ex = fromLeft ? camX - 20 : camX + W + 20;
            const ey = this.player.y + (Math.random() - 0.3) * 200;
            const fe = this.enemyGroup.create(ex, ey, 'enemy', 0);
            fe.setOrigin(0.5, 0.5);
            fe.setDisplaySize(BLOCK, BLOCK);
            fe.body.setAllowGravity(false);
            fe.setVelocityX(fromLeft ? 150 : -150);
            fe.setData('kind', 'goomba');
            fe.setData('state', 'flying');
            fe.setData('timer', 0);
            this.parachuteFlyingEnemies.push(fe);
        }
        const pCamLeft = this.cameras.main.scrollX;
        this.parachuteFlyingEnemies = this.parachuteFlyingEnemies.filter(e => {
            if (!e.active)
                return false;
            if (e.x < pCamLeft - 100 || e.x > pCamLeft + W + 100) {
                e.destroy();
                return false;
            }
            return true;
        });
        const pOnGround = this.player.body.blocked.down;
        const falling = this.player.body.velocity.y >= 0;
        if (pOnGround && falling && !this.cursors.up.isDown) {
            this.endParachute();
        }
        // Die if player drifts into water/gap below ground level
        if (this.player.y > GROUND_Y + BLOCK) {
            this.endParachute();
            this.die();
            return;
        }
        this.player.anims.stop();
        this.player.setFrame(4); // jump frame while parachuting
        if (this.cursors.left.isDown)
            this.player.flipX = true;
        else if (this.cursors.right.isDown)
            this.player.flipX = false;
        this.player.setDisplaySize(PLAYER_W, PLAYER_H);
        // Check enemy collisions during parachute
        this.enemyGroup.getChildren().forEach((e) => {
            if (!e.active || e.getData('state') === 'dead')
                return;
            const dx = Math.abs(this.player.x - e.x);
            const dy = this.player.y - e.y;
            if (dx < BLOCK * 0.8 && Math.abs(dy) < BLOCK * 0.8) {
                if (dy < 0) {
                    // Player is above enemy — stomp kill
                    e.setVelocityY(-300);
                    e.flipY = true;
                    e.setData('state', 'dead');
                    this.time.delayedCall(600, () => { if (e.active)
                        e.destroy(); });
                    this.addScore(300, e.x, e.y - 10);
                }
                else if (this.invincible <= 0) {
                    // Enemy hit player from side/below — lose a life
                    this.endParachute();
                    this.die();
                }
            }
        });
        this.syncScoreToHUD();
        return;
    }
    updatePlayerMovement(dtMs) {
        const running = this.keys.shift.isDown;
        // Powered up = faster speed + higher acceleration
        const speedMult = this.isBig ? 1.5 : 1;
        const maxSpeed = (running ? 320 : 200) * speedMult;
        const accel = (running ? 1100 : 800) * speedMult;
        if (this.cursors.left.isDown) {
            this.player.setAccelerationX(-accel);
            this.facingRight = false;
            if (this.player.body.velocity.x > 0)
                this.player.setVelocityX(this.player.body.velocity.x * 0.7);
        }
        else if (this.cursors.right.isDown) {
            this.player.setAccelerationX(accel);
            this.facingRight = true;
            if (this.player.body.velocity.x < 0)
                this.player.setVelocityX(this.player.body.velocity.x * 0.7);
        }
        else {
            this.player.setAccelerationX(0);
            const v = this.player.body.velocity.x;
            if (Math.abs(v) < 12)
                this.player.setVelocityX(0);
            else
                this.player.setVelocityX(v * 0.9);
        }
        if (this.player.body.velocity.x > maxSpeed)
            this.player.setVelocityX(maxSpeed);
        if (this.player.body.velocity.x < -maxSpeed)
            this.player.setVelocityX(-maxSpeed);
        const onGround = this.player.body.blocked.down || this.player.body.touching.down;
        const touchingWall = this.player.body.blocked.left || this.player.body.blocked.right;
        if (onGround) {
            this.coyoteTime = 120; // generous coyote time, especially helps near walls
            this.hasDoubleJumped = false;
            this.canDoubleJump = false;
        }
        else {
            this.coyoteTime = Math.max(0, this.coyoteTime - dtMs);
            if (!this.canDoubleJump && this.coyoteTime <= 0)
                this.canDoubleJump = true;
        }
        this.jumpBuffer = Math.max(0, this.jumpBuffer - dtMs);
        const jumpKeyDown = this.keys.space.isDown || this.cursors.up.isDown;
        const jumpJustPressed = jumpKeyDown && !this.jumpKeyWasDown;
        this.jumpKeyWasDown = jumpKeyDown;
        if (jumpJustPressed)
            this.jumpBuffer = 150;
        // Allow jump when on ground OR when pressed against a wall and recently on ground
        const canJump = this.coyoteTime > 0 || (touchingWall && this.coyoteTime > -50);
        if (this.jumpBuffer > 0 && canJump) {
            // Normal jump — higher when powered up
            this.player.setVelocityY(this.isBig ? -950 : -820);
            this.jumpBuffer = 0;
            this.coyoteTime = 0;
            this.sfx('nr_jump', 0.2);
        }
        else if (jumpJustPressed && !onGround && this.canDoubleJump && !this.hasDoubleJumped) {
            // Double jump — also boosted when powered
            this.player.setVelocityY(this.isBig ? -800 : -700);
            this.hasDoubleJumped = true;
            this.sfx('nr_jump', 0.15);
        }
        // Variable jump height: low gravity while ascending and key held.
        if (jumpKeyDown && this.player.body.velocity.y < 0) {
            this.player.body.setGravityY(900);
        }
        else {
            this.player.body.setGravityY(1800);
        }
        if (this.isBig && this.fireCooldown <= 0 &&
            (Phaser.Input.Keyboard.JustDown(this.keys.f) || Phaser.Input.Keyboard.JustDown(this.keys.z))) {
            this.throwFireball();
            this.fireCooldown = 200;
        }
        const camLeft = this.cameras.main.scrollX;
        if (this.player.x < camLeft) {
            this.player.x = camLeft;
            this.player.setVelocityX(0);
        }
        if (onGround && !this.isInGap(this.player.x)) {
            this.lastSafeX = this.player.x;
        }
        // Warp / golden pipe check — Player must be standing ON TOP of the pipe
        if (onGround && this.cursors.down.isDown && !this.warping) {
            const pipes = this.pipeGroup.getChildren();
            for (const p of pipes) {
                if (!p.getData('warp') && !p.getData('gold'))
                    continue;
                const pdx = Math.abs(this.player.x - p.x);
                // Player's feet (y with origin 0.5,1) should be at the pipe top edge
                const pipeTop = p.y - BLOCK / 2;
                const feetDelta = Math.abs(this.player.y - pipeTop);
                // Also accept Player standing at ground level next to a short pipe
                if (pdx < BLOCK * 1.5 && feetDelta < BLOCK) {
                    if (p.getData('gold') && !this.parachuteMode) {
                        this.startParachute(p);
                    }
                    else if (p.getData('warp')) {
                        this.startWarp(p);
                    }
                    break;
                }
            }
        }
    }
    updatePlayerAnimation() {
        const onGround = this.player.body.blocked.down || this.player.body.touching.down;
        const vx = this.player.body.velocity.x;
        const speed = Math.abs(vx);
        // Player-intent direction this frame (from input). Used to detect skid.
        const left = this.cursors.left.isDown;
        const right = this.cursors.right.isDown;
        const intent = right ? 1 : left ? -1 : 0;
        const moveDir = vx > 5 ? 1 : vx < -5 ? -1 : 0;
        // Animation: use Phaser's anims system with the spritesheet.
        const sheetKey = 'player';
        const walkAnim = 'player_walk';
        // Scale — always same size, glow indicates power-up
        this.player.setDisplaySize(PLAYER_W, PLAYER_H);
        // Pulse the built-in glow FX when powered up
        if (this.player.getData('hasGlow')) {
            const glowFx = this.player.getData('glowFx');
            if (glowFx) {
                glowFx.outerStrength = this.isBig ? 2 + Math.sin(this.time.now / 200) * 1.5 : 0;
            }
        }
        // Ensure correct texture
        if (this.player.texture.key !== sheetKey) {
            this.player.setTexture(sheetKey, 0);
        }
        if (!onGround) {
            this.player.anims.stop();
            this.player.setFrame(4); // jump
        }
        else if (intent !== 0 && moveDir !== 0 && intent !== moveDir && speed > 60) {
            this.player.anims.stop();
            this.player.setFrame(0); // no skid frame in new set, use idle
        }
        else if (speed > 20) {
            this.player.anims.play(walkAnim, true);
            const animFps = Math.max(6, Math.min(20, speed / 20));
            this.player.anims.msPerFrame = 1000 / animFps;
        }
        else {
            this.player.anims.stop();
            this.player.setFrame(0); // idle
        }
        // Face the input direction while skidding (so skid sprite looks "back"
        // toward old motion); otherwise face current motion / last facing.
        if (intent !== 0)
            this.facingRight = intent > 0;
        else if (moveDir !== 0)
            this.facingRight = moveDir > 0;
        this.player.flipX = !this.facingRight;
        const blink = (this.invincible > 0 || this.shrinkTimer > 0) && Math.floor(this.time.now / 80) % 2 === 0;
        this.player.setVisible(!blink);
        // Track player glow (mushroom powerup) — centered on player body, not feet
        const playerGlow = this.player.getData('glowFx');
        if (playerGlow) {
            if (this.isBig && this.player.visible) {
                playerGlow.setPosition(this.player.x, this.player.y - PLAYER_H / 2);
                playerGlow.setAlpha(0.15 + Math.sin(this.time.now / 100) * 0.1);
                playerGlow.setVisible(true);
            }
            else if (!this.isBig) {
                playerGlow.destroy();
                this.player.setData('glowFx', null);
                this.player.setData('hasGlow', false);
            }
            else {
                playerGlow.setVisible(false);
            }
        }
    }
    updateCoins(camLeft) {
        this.coinGroup.getChildren().forEach(c => {
            const i = Math.floor(this.time.now / 120) % 2;
            c.setTexture(i === 0 ? 'coin0' : 'coin1');
            if (c.x < camLeft - 100)
                c.destroy();
        });
    }
    updateBridges(camLeft) {
        // Bridge collapse — unstable tiles start falling when player approaches
        this.bridgeGroup.getChildren().forEach((bt) => {
            if (!bt.active || !bt.getData('unstable') || bt.getData('collapsing'))
                return;
            const dx = bt.x - this.player.x;
            // Trigger when player is within 6 blocks ahead or 2 blocks behind
            if (dx < BLOCK * 6 && dx > -BLOCK * 2) {
                bt.setData('collapsing', true);
                const tileX = bt.x;
                // ~1 second shake warning before falling
                this.tweens.add({
                    targets: bt,
                    x: bt.x + 3,
                    duration: 60,
                    yoyo: true,
                    repeat: 8,
                    onComplete: () => {
                        bt.body.enable = false;
                        this.tweens.add({
                            targets: bt,
                            y: bt.y + 300,
                            alpha: 0,
                            duration: 500,
                            onComplete: () => bt.destroy(),
                        });
                        // Launch fish from the gap where tile fell
                        this.fishGroup.getChildren().forEach((fish) => {
                            if (!fish.active || fish.getData('jumped'))
                                return;
                            if (Math.abs(fish.getData('homeX') - tileX) < BLOCK) {
                                fish.setData('jumped', true);
                                fish.setVisible(true);
                                fish.body.enable = true;
                                fish.setPosition(tileX, GROUND_Y + BLOCK);
                                // Arc jump: up just above bridge level, then back down
                                this.tweens.add({
                                    targets: fish,
                                    y: GROUND_Y - BLOCK * 0.8,
                                    duration: 400,
                                    ease: 'Sine.easeOut',
                                    onComplete: () => {
                                        this.tweens.add({
                                            targets: fish,
                                            y: GROUND_Y + BLOCK * 2,
                                            duration: 400,
                                            ease: 'Sine.easeIn',
                                            onComplete: () => {
                                                fish.body.enable = false;
                                                fish.setVisible(false);
                                                // Reset for possible re-jump after a delay
                                                this.time.delayedCall(1500 + Math.random() * 2000, () => {
                                                    if (fish.active) {
                                                        fish.setData('jumped', false);
                                                    }
                                                });
                                            },
                                        });
                                    },
                                });
                            }
                        });
                    },
                });
            }
        });
    }
    updateFireEruptions(camLeft) {
        // Fire eruptions — shoot up from gaps when player approaches
        // Warning glow/smoke appears first; fire ONLY erupts after warning has been
        // visible for a minimum duration so the player always gets fair notice.
        const WARN_MIN_MS = 800; // warning must show for at least this long before fire
        this.fireGroup.getChildren().forEach((f) => {
            if (!f.active)
                return;
            const dx = Math.abs(this.player.x - f.getData('gapX'));
            const baseY = f.getData('baseY');
            const isActive = f.getData('active');
            const isWarning = f.getData('warning');
            // Warning phase — show smoke/glow when player is within 10 blocks
            if (dx < BLOCK * 10 && !isActive && !isWarning) {
                f.setData('warning', true);
                f.setData('warnStart', this.time.now);
                // Rising smoke/ember particles
                const warnEmbers = this.add.particles(f.getData('gapX'), GROUND_Y, 'coin0', {
                    speed: { min: 20, max: 60 },
                    angle: { min: 255, max: 285 },
                    scale: { start: 0.2, end: 0 },
                    alpha: { start: 0.5, end: 0 },
                    lifespan: { min: 400, max: 800 },
                    frequency: 40,
                    quantity: 2,
                    tint: [0xff4400, 0xff6600, 0x888888, 0x666666],
                    blendMode: 'ADD',
                });
                warnEmbers.setDepth(f.depth + 1);
                f.setData('warnEmbers', warnEmbers);
                // Pulsing orange glow at gap base
                const warnGlow = this.add.ellipse(f.getData('gapX'), GROUND_Y + BLOCK * 0.5, BLOCK * 2, BLOCK * 1.5, 0xff4400, 1.0);
                warnGlow.setAlpha(0);
                warnGlow.setBlendMode(Phaser.BlendModes.ADD);
                warnGlow.setDepth(f.depth - 1);
                f.setData('warnGlow', warnGlow);
                this.tweens.add({
                    targets: warnGlow,
                    alpha: { from: 0, to: 0.35 },
                    duration: 350,
                    ease: 'Sine.easeInOut',
                    yoyo: true,
                    repeat: -1,
                });
            }
            // Fire only erupts after warning has been visible long enough
            const warnStart = f.getData('warnStart') || 0;
            const warnElapsed = this.time.now - warnStart;
            if (dx < BLOCK * 4 && !isActive && isWarning && warnElapsed >= WARN_MIN_MS) {
                // Erupt!
                f.setData('active', true);
                // Clean up warning effects
                const we = f.getData('warnEmbers');
                if (we) {
                    we.stop();
                    this.time.delayedCall(800, () => { if (we)
                        we.destroy(); });
                }
                const wg = f.getData('warnGlow');
                if (wg) {
                    this.tweens.killTweensOf(wg);
                    wg.destroy();
                }
                f.setData('warnEmbers', null);
                f.setData('warnGlow', null);
                f.setData('warning', false);
                f.setVisible(true);
                f.body.enable = true;
                f.y = baseY;
                this.tweens.add({
                    targets: f,
                    y: GROUND_Y - BLOCK * 2,
                    duration: 300,
                    ease: 'Quad.easeOut',
                    onComplete: () => {
                        // Hold briefly then retract
                        this.time.delayedCall(800, () => {
                            if (!f.active)
                                return;
                            this.tweens.add({
                                targets: f,
                                y: baseY,
                                duration: 400,
                                onComplete: () => {
                                    f.setVisible(false);
                                    f.body.enable = false;
                                    // Reset after cooldown
                                    this.time.delayedCall(2000, () => {
                                        if (f.active)
                                            f.setData('active', false);
                                    });
                                },
                            });
                        });
                    },
                });
            }
            // Flicker effect while visible + full fire FX
            const fireVisible = f.visible && f.alpha > 0;
            if (fireVisible) {
                f.setAlpha(0.8 + Math.sin(this.time.now / 50) * 0.2);
                if (!f.getData('hasGlow')) {
                    // Tall glow column from fire down to bottom of scene — additive blend
                    const glowH = H - f.y + BLOCK * 2;
                    const columnGlow = this.add.ellipse(f.x, f.y + glowH / 2, BLOCK * 1.4, glowH, 0xff4400, 1.0);
                    columnGlow.setDepth(f.depth - 1);
                    columnGlow.setAlpha(0.15);
                    columnGlow.setBlendMode(Phaser.BlendModes.ADD);
                    f.setData('hasGlow', true);
                    f.setData('manualGlow', columnGlow);
                    // Rising ember particles
                    const embers = this.add.particles(f.x, f.y, 'coin0', {
                        speed: { min: 15, max: 50 },
                        angle: { min: 250, max: 290 },
                        scale: { start: 0.15, end: 0 },
                        alpha: { start: 0.7, end: 0 },
                        lifespan: { min: 300, max: 600 },
                        frequency: 60,
                        quantity: 1,
                        tint: [0xff2200, 0xff6600, 0xffaa00, 0xffff00],
                        blendMode: 'ADD',
                    });
                    embers.setDepth(f.depth + 1);
                    f.setData('embers', embers);
                }
            }
            // Animate fire glow + embers — resize/reposition column as fire moves
            const mg = f.getData('manualGlow');
            const em = f.getData('embers');
            if (mg) {
                if (fireVisible) {
                    const glowH = H - f.y + BLOCK * 2;
                    mg.setPosition(f.x, f.y + glowH / 2);
                    mg.setSize(BLOCK * 1.4, glowH);
                    mg.setAlpha(0.12 + Math.sin(this.time.now / 60) * 0.08);
                }
                else {
                    mg.setAlpha(0);
                }
            }
            if (em) {
                em.setPosition(f.x, f.y);
                if (fireVisible) {
                    em.start();
                }
                else {
                    em.stop();
                }
            }
            if (f.x < camLeft - 200) {
                const gl = f.getData('manualGlow');
                if (gl)
                    gl.destroy();
                const sp = f.getData('sparks');
                if (sp)
                    sp.destroy();
                const emb = f.getData('embers');
                if (emb)
                    emb.destroy();
                const we = f.getData('warnEmbers');
                if (we)
                    we.destroy();
                const wg = f.getData('warnGlow');
                if (wg) {
                    this.tweens.killTweensOf(wg);
                    wg.destroy();
                }
                f.destroy();
            }
        });
    }
    updatePiranhas(dtMs, camLeft) {
        // Piranha plant animation
        this.piranhaGroup.getChildren().forEach((p) => {
            if (!p.active)
                return;
            let timer = p.getData('timer') + dtMs;
            const pipeTopY = p.getData('pipeTopY');
            const cycle = 4000;
            const phase = (timer % cycle) / cycle;
            // Only suppress if the player is directly on top of the pipe
            const pipeX = p.getData('pipeX');
            const dx = Math.abs(this.player.x - pipeX);
            const onPipe = dx < BLOCK * 0.8 && this.player.y < pipeTopY && this.player.body.velocity.y >= 0;
            if (onPipe) {
                p.setVisible(false);
                p.body.enable = false;
                p.setData('timer', timer);
                return;
            }
            if (phase < 0.25) {
                const t = phase / 0.25;
                p.y = pipeTopY + BLOCK * (1 - t);
                p.setVisible(true);
                p.body.enable = true;
            }
            else if (phase < 0.5) {
                p.y = pipeTopY;
                p.setVisible(true);
                p.body.enable = true;
                p.setTexture(Math.floor(timer / 200) % 2 === 0 ? 'piranha_0' : 'piranha_1');
            }
            else if (phase < 0.75) {
                const t = (phase - 0.5) / 0.25;
                p.y = pipeTopY + BLOCK * t;
                p.setVisible(true);
                p.body.enable = true;
            }
            else {
                p.setVisible(false);
                p.body.enable = false;
            }
            p.setData('timer', timer);
            if (p.x < camLeft - 200)
                p.destroy();
        });
    }
    updateCrocs(camLeft) {
        // Croc update — swim back and forth, cycle mouth open/closed
        const now = this.time.now;
        this.crocGroup.getChildren().forEach((croc) => {
            if (croc.x < camLeft - 200) {
                croc.destroy();
                return;
            }
            // Mouth state cycling
            const timer = croc.getData('timer');
            if (now >= timer) {
                const wasOpen = croc.getData('mouthOpen');
                croc.setData('mouthOpen', !wasOpen);
                croc.setTexture(wasOpen ? 'croc_closed' : 'croc_open');
                // Closed longer than open (2-3s closed, 1-1.5s open)
                croc.setData('timer', now + (wasOpen ? 2000 + Math.random() * 1000 : 1000 + Math.random() * 500));
            }
            // Swim within gap bounds
            const gapStart = croc.getData('gapStart');
            const gapEnd = croc.getData('gapEnd');
            const margin = 24;
            if (croc.x <= gapStart + margin) {
                croc.setData('swimDir', 1);
                croc.setVelocityX(30);
            }
            else if (croc.x >= gapEnd - margin) {
                croc.setData('swimDir', -1);
                croc.setVelocityX(-30);
            }
        });
    }
    cleanupOffscreen(camLeft) {
        this.mushroomGroup.getChildren().forEach(m => {
            if (m.x < camLeft - 100 || m.y > H + 100)
                m.destroy();
        });
        this.fireballGroup.getChildren().forEach(fb => {
            if (fb.x < camLeft - 100 || fb.x > camLeft + W + 200 || fb.y > H + 50)
                fb.destroy();
        });
        // Fish cleanup — destroy when scrolled offscreen
        this.fishGroup.getChildren().forEach((fish) => {
            if (fish.x < camLeft - 200)
                fish.destroy();
        });
    }
    updateEnemy(e, camLeft) {
        if (!e.active)
            return;
        const state = e.getData('state');
        const kind = e.getData('kind');
        const enemyType = e.getData('enemyType') || 'monster';
        if (e.x < camLeft - BLOCK * 3) {
            e.destroy();
            return;
        }
        if (e.y > H + 50) {
            e.destroy();
            return;
        }
        if (!e.body)
            return;
        // Block-row patrol: idle until player approaches, then bounce within bounds
        if (e.getData('patrolAwait')) {
            if (Math.abs(this.player.x - e.x) < W) {
                e.setData('patrolAwait', false);
                e.setVelocityX(-80);
            }
            else {
                e.setVelocityX(0);
                return;
            }
        }
        const pLeft = e.getData('patrolLeft');
        if (pLeft !== undefined && pLeft !== null) {
            const pRight = e.getData('patrolRight');
            if (e.x <= pLeft) {
                e.setVelocityX(80);
            }
            else if (e.x >= pRight) {
                e.setVelocityX(-80);
            }
        }
        if (state === 'walk' || state === 'flying') {
            // Animate based on enemy type
            if (enemyType === 'bat') {
                const frame = Math.floor(this.time.now / 150) % 2;
                e.setTexture(frame === 0 ? 'bat_0' : 'bat_1');
                e.setDisplaySize(BLOCK, BLOCK);
                const baseY = e.getData('baseY') || GROUND_Y - BLOCK * 2;
                e.y = baseY + Math.sin(this.time.now / 400 + e.x * 0.01) * 40;
            }
            // monster, bulldog, snake all use anims — no manual texture swap needed
            if (kind === 'rkoopa' && (e.body.blocked.down || e.body.touching.down)) {
                const ahead = e.x + (e.body.velocity.x > 0 ? BLOCK : -BLOCK);
                if (this.isInGap(ahead)) {
                    e.setVelocityX(-e.body.velocity.x);
                }
            }
            e.flipX = e.body.velocity.x > 0;
        }
        else if (state === 'shell_still') {
            let timer = e.getData('timer') - 1;
            e.setData('timer', timer);
            if (timer <= 0) {
                e.setData('state', 'walk');
                e.setVelocityX(-90);
            }
        }
    }
    onPlayerHitBrick(_player, brick) {
        if (!this.player.body.touching.up)
            return;
        if (Math.abs(brick.x - this.player.x) > BLOCK * 0.55)
            return;
        this.collectCoinsAbove(brick.x, brick.y);
        this.knockEnemiesAbove(brick.x, brick.y);
        if (this.isBig) {
            brick.destroy();
            this.addScore(50, brick.x, brick.y - 20);
        }
        else {
            // Small player: bump animation only (no destruction)
            if (!brick.getData('bumping')) {
                brick.setData('bumping', true);
                const origY = brick.y;
                this.tweens.add({
                    targets: brick, y: origY - 6, yoyo: true, duration: 80,
                    onComplete: () => { brick.y = origY; brick.setData('bumping', false); }
                });
            }
        }
    }
    onPlayerHitQBlock(_player, q) {
        if (q.getData('hit'))
            return;
        if (!this.player.body.touching.up)
            return;
        if (Math.abs(q.x - this.player.x) > BLOCK * 0.55)
            return;
        this.collectCoinsAbove(q.x, q.y);
        this.knockEnemiesAbove(q.x, q.y);
        q.setData('hit', true);
        q.setTexture('qblock_used');
        q.setDisplaySize(BLOCK, BLOCK);
        this.tweens.add({ targets: q, y: q.y - 6, yoyo: true, duration: 100 });
        const reward = q.getData('reward');
        if (reward === 'mushroom' && !this.isBig) {
            const m = this.mushroomGroup.create(q.x, q.y - BLOCK, 'mushroom');
            m.body.setSize(28, 28);
            m.setVelocityX(120);
            m.setBounceX(1);
            m.body.setMaxVelocity(200, 600);
        }
        else {
            this.popCoin(q.x, q.y);
            // Height bonus — higher ?-blocks reward more points for the effort
            const heightAboveGround = GROUND_Y - q.y;
            const heightBonus = heightAboveGround > BLOCK * 4 ? 300 : heightAboveGround > BLOCK * 2 ? 100 : 0;
            this.addScore(200 + heightBonus, q.x, q.y - 20);
        }
    }
    popCoin(x, y) {
        const c = this.add.image(x, y, 'coin0').setDepth(50);
        c.setDisplaySize(BLOCK * 0.7, BLOCK * 0.9);
        this.tweens.add({
            targets: c,
            y: y - BLOCK * 2.2,
            duration: 350,
            ease: 'Sine.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: c, y: y - BLOCK * 1.6, alpha: 0,
                    duration: 200, onComplete: () => c.destroy(),
                });
            },
        });
    }
    onPlayerCoin(_player, c) {
        c.destroy();
        this.addScore(100, c.x, c.y);
        this.sfx('nr_coin', 0.2);
    }
    /** Collect any coins sitting directly above a block (within 1 block). */
    collectCoinsAbove(blockX, blockY) {
        this.coinGroup.getChildren().forEach((c) => {
            if (!c.active)
                return;
            const dx = Math.abs(c.x - blockX);
            const dy = blockY - c.y; // coin should be above (positive = above)
            if (dx < BLOCK * 0.7 && dy > 0 && dy < BLOCK * 1.5) {
                // Pop the coin upward then destroy
                this.tweens.add({
                    targets: c,
                    y: c.y - BLOCK,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => c.destroy(),
                });
                this.addScore(100, c.x, c.y);
                this.sfx('nr_coin', 0.2);
            }
        });
    }
    /** Knock out any enemy standing on top of a block that was hit from below. */
    knockEnemiesAbove(blockX, blockY) {
        this.enemyGroup.getChildren().forEach((e) => {
            if (!e.active)
                return;
            const dx = Math.abs(e.x - blockX);
            const dy = blockY - e.y; // enemy should be above (positive = above)
            if (dx < BLOCK * 1.0 && dy > 0 && dy < BLOCK * 2) {
                this.addScore(200, e.x, e.y - 10);
                this.sfx('nr_stomp', 0.25);
                // Launch enemy upward then destroy
                e.setVelocityY(-400);
                e.setVelocityX((Math.random() - 0.5) * 200);
                e.flipY = true;
                e.body.setAllowGravity(true);
                e.setData('state', 'dead');
                this.time.delayedCall(800, () => { if (e.active)
                    e.destroy(); });
            }
        });
    }
    onPlayerMushroom(_player, m) {
        m.destroy();
        if (!this.isBig) {
            this.isBig = true;
            this.addScore(1000, this.player.x, this.player.y - 20);
            this.sfx('nr_powerup');
            // Growth flash — briefly golden then normal
            this.player.setTint(0xffdd00);
            this.time.delayedCall(300, () => {
                if (this.isBig)
                    this.player.clearTint();
            });
            // Add visible glow effect around the player (Ellipse — preFX doesn't render in WebKit)
            if (!this.player.getData('hasGlow')) {
                const glow = this.add.ellipse(this.player.x, this.player.y - PLAYER_H / 2, PLAYER_W * 1.4, PLAYER_H * 1.4, 0xffdd00, 1.0);
                glow.setDepth(this.player.depth - 1);
                glow.setAlpha(0.2);
                glow.setBlendMode(Phaser.BlendModes.ADD);
                this.player.setData('hasGlow', true);
                this.player.setData('glowFx', glow);
            }
        }
    }
    onPlayerHeart(_player, h) {
        h.destroy();
        this.lives++;
        this.syncLivesToHUD();
        this.addScore(2000, h.x, h.y - 10);
        this.sfx('nr_extralife');
        // Green flash to indicate extra life
        this.cameras.main.flash(300, 100, 255, 100, false);
    }
    onPlayerEnemy(_player, e) {
        if (this.invincible > 0 || this.stompGrace > 0 || this.shrinkTimer > 0)
            return;
        const state = e.getData('state');
        const kind = e.getData('kind');
        const playerBottom = this.player.y;
        const enemyTop = e.y - e.displayHeight;
        const stomping = this.player.body.velocity.y > 50 &&
            playerBottom < enemyTop + e.displayHeight * 0.5;
        if (stomping) {
            this.player.setVelocityY(-450);
            this.stompGrace = 417;
            this.sfx('nr_stomp', 0.25);
            if (kind === 'goomba') {
                this.killGoomba(e);
            }
            else if (state === 'walk') {
                this.becomeShell(e);
                this.addScore(200, e.x, e.y - 20);
            }
            else if (state === 'shell_still') {
                const dir = this.player.x < e.x ? 1 : -1;
                e.setData('state', 'shell');
                e.setVelocityX(dir * 400);
                this.addScore(100, e.x, e.y - 20);
            }
            else if (state === 'shell') {
                e.setData('state', 'shell_still');
                e.setData('timer', 300);
                e.setVelocityX(0);
                this.addScore(100, e.x, e.y - 20);
            }
        }
        else if (state === 'shell_still') {
            const dir = this.player.x < e.x ? 1 : -1;
            e.setData('state', 'shell');
            e.setVelocityX(dir * 400);
            this.stompGrace = 250;
            this.addScore(100, e.x, e.y - 20);
        }
        else {
            this.takeHit();
        }
    }
    // Replace the enemy with a shell sprite using the dead frame.
    becomeShell(e) {
        const kind = e.getData('kind');
        const x = e.x;
        e.destroy();
        const shell = this.enemyGroup.create(x, GROUND_Y, 'enemy', 4);
        shell.setOrigin(0.5, 1);
        shell.setDisplaySize(BLOCK, BLOCK * 0.7);
        shell.body.setGravityY(1800);
        shell.body.setAllowGravity(true);
        shell.setVelocityX(0);
        shell.setBounceX(1);
        shell.setCollideWorldBounds(false);
        shell.setData('kind', kind);
        shell.setData('state', 'shell_still');
        shell.setData('timer', 300);
    }
    // Goomba "death": disable the body so nothing collides with it again, fade
    // and shrink it visually, then destroy. No state-machine, no body resizing
    // hacks — this avoids the floating/misaligned-body bugs.
    killGoomba(e) {
        e.setData('state', 'dying');
        e.disableBody(false, false);
        e.anims.stop();
        if (e.getData('enemyType') === 'snake') {
            e.setFrame(4);
            e.setDisplaySize(BLOCK, BLOCK * 0.5); // squished
        }
        else {
            e.setFrame(4); // dead frame in all strips
        }
        this.addScore(200, e.x, e.y - 20);
        this.tweens.add({
            targets: e,
            scaleY: 0.3,
            alpha: 0,
            duration: 250,
            onComplete: () => e.destroy(),
        });
    }
    onEnemyVsEnemy(a, b) {
        const aState = a.getData('state');
        const bState = b.getData('state');
        if (aState === 'shell' && bState !== 'dying' && bState !== 'shell') {
            this.killByShell(b);
        }
        else if (bState === 'shell' && aState !== 'dying' && aState !== 'shell') {
            this.killByShell(a);
        }
    }
    killByShell(e) {
        if (e.getData('kind') === 'goomba') {
            this.killGoomba(e);
        }
        else {
            // Koopa hit by shell: knock it offscreen with an upward arc.
            e.setData('state', 'dying');
            e.disableBody(false, false);
            this.addScore(100, e.x, e.y - 20);
            this.tweens.add({
                targets: e, y: e.y - 80, alpha: 0, angle: 360,
                duration: 500, onComplete: () => e.destroy(),
            });
        }
    }
    onFireballHitSolid(fb, _solid) {
        if (fb.body.blocked.down) {
            fb.setVelocityY(-350);
        }
        else {
            fb.destroy();
        }
    }
    onFireballEnemy(fb, e) {
        const st = e.getData('state');
        if (st === 'dying')
            return;
        fb.destroy();
        this.killByShell(e);
    }
    throwFireball() {
        const dir = this.facingRight ? 1 : -1;
        const fb = this.fireballGroup.create(this.player.x + dir * 20, this.player.y + 20, 'fireball');
        fb.body.setSize(14, 14);
        fb.setVelocityX(dir * 450);
        fb.setVelocityY(-100);
        fb.setBounceY(0.6);
        this.sfx('nr_fireball', 0.2);
    }
    takeHit() {
        if (this.isBig) {
            this.isBig = false;
            this.player.clearTint();
            this.shrinkTimer = 1000;
            this.sfx('nr_hit');
            // glow handled by preFX
        }
        else {
            this.die();
        }
    }
    die() {
        if (this.dead)
            return;
        this.lives--;
        this.syncLivesToHUD();
        this.dead = true;
        this.deadTimer = 1200;
        this.sfx('nr_die', 0.4);
        this.player.setVelocity(0, -500);
        this.player.body.checkCollision.none = true;
        this.isBig = false;
        this.player.clearTint();
        // glow handled by preFX
        if (this.parachuteMode)
            this.endParachute();
    }
    doRespawn() {
        this.dead = false;
        const deathX = Math.max(this.lastSafeX, this.cameras.main.scrollX + 200);
        // Find a safe spot — search BACKWARD first to respawn before the hazard
        const isSafe = (wx) => {
            if (this.isInGap(wx))
                return false;
            if (this.isNearObstacle(wx))
                return false;
            const fires = this.fireGroup.getChildren();
            for (const f of fires) {
                if (f.active && Math.abs(wx - f.x) < BLOCK * 1.5)
                    return false;
            }
            const enemies = this.enemyGroup.getChildren();
            for (const e of enemies) {
                if (e.active && Math.abs(wx - e.x) < BLOCK * 3)
                    return false;
            }
            return true;
        };
        // Search backward first (up to 15 blocks behind death point)
        let x = deathX;
        const minX = Math.max(this.cameras.main.scrollX + 100, deathX - BLOCK * 15);
        let backX = deathX - BLOCK;
        while (backX >= minX) {
            if (isSafe(backX)) {
                x = backX;
                break;
            }
            backX -= BLOCK;
        }
        // If no safe spot behind, search forward as fallback
        if (x === deathX && !isSafe(x)) {
            let tries = 0;
            while (!isSafe(x) && tries < 50) {
                x += BLOCK;
                tries++;
            }
        }
        this.player.setPosition(x, GROUND_Y - 100);
        this.player.setVelocity(0, 0);
        this.player.body.checkCollision.none = false;
        this.player.clearTint();
        this.invincible = 1500;
        this.shrinkTimer = 0;
        this.stompGrace = 0;
        // glow handled by preFX
    }
    respawn() {
        if (this.lives <= 0) {
            this.sfx('nr_gameover');
            // Keep dead=true so update() doesn't run while overlay is showing
            this.player.setVisible(false);
            this.player.setVelocity(0, 0);
            this.player.body.checkCollision.none = true;
            this.showGameOver(this.score, () => {
                this.sfx('nr_startlevel');
                this.lives = 3;
                this.score = 0;
                this.syncScoreToHUD();
                this.syncLivesToHUD();
                this.player.setVisible(true);
                this.doRespawn();
            });
            return;
        }
        this.doRespawn();
    }
    onPlayerBridge(_player, _tile) {
        // Collision still needed for standing — collapse is handled by proximity in update
    }
    onPlayerBounce(_player, pad) {
        if (!this.player.body.touching.down)
            return;
        this.player.setVelocityY(-1200);
        // Compress animation on the pad
        this.tweens.add({
            targets: pad,
            scaleY: 0.5,
            duration: 100,
            yoyo: true,
            ease: 'Power2',
        });
        this.addScore(50, pad.x, pad.y - 20);
        this.sfx('nr_bounce', 0.3);
    }
    onPlayerFlag(_player, flag) {
        flag.destroy();
        this.currentLevel++;
        this.currentBiome = (this.currentBiome + 1) % 4;
        this.syncLevelToHUD(this.currentLevel);
        this.addScore(5000, flag.x, flag.y - 30);
        this.sfx('nr_flag');
        const cam = this.cameras.main;
        cam.flash(500, 255, 255, 255, false);
        const txt = this.add.text(this.player.x, this.player.y - 80, `LEVEL ${this.currentLevel}!`, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '24px',
            color: '#ffdd00',
            stroke: '#000',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(1000);
        this.tweens.add({
            targets: txt,
            y: txt.y - 60,
            alpha: 0,
            duration: 2000,
            onComplete: () => txt.destroy(),
        });
    }
    onPlayerPiranha(_player, _p) {
        if (this.invincible > 0 || this.shrinkTimer > 0)
            return;
        if (this.isBig) {
            this.isBig = false;
            this.shrinkTimer = 1000;
            this.invincible = 1500;
            // glow handled by preFX
        }
        else {
            this.die();
        }
    }
    onPlayerFire(_player, _f) {
        if (this.invincible > 0 || this.shrinkTimer > 0)
            return;
        if (this.isBig) {
            this.isBig = false;
            this.shrinkTimer = 1000;
            this.invincible = 1500;
            // glow handled by preFX
        }
        else {
            this.die();
        }
    }
    onPlayerCroc(_player, croc) {
        if (this.invincible > 0 || this.shrinkTimer > 0)
            return;
        const pBody = this.player.body;
        const stomping = pBody.velocity.y > 0 && pBody.bottom <= croc.body.top + 10;
        if (stomping && !croc.getData('mouthOpen')) {
            this.addScore(200);
            croc.destroy();
            pBody.setVelocityY(-500);
            this.sfx('nr_stomp');
        }
        else {
            if (this.isBig) {
                this.isBig = false;
                this.shrinkTimer = 1000;
                this.invincible = 1500;
            }
            else {
                this.die();
            }
        }
    }
    onPlayerFish(_player, fish) {
        if (this.invincible > 0 || this.shrinkTimer > 0)
            return;
        if (!fish.visible)
            return;
        if (this.isBig) {
            this.isBig = false;
            this.shrinkTimer = 1000;
            this.invincible = 1500;
        }
        else {
            this.die();
        }
    }
    startWarp(sourcePipe) {
        this.warping = true;
        this.sfx('nr_warp');
        this.player.setVelocity(0, 0);
        this.player.body.setAllowGravity(false);
        // Sparkle particle burst at pipe entrance
        const particles = this.add.particles(this.player.x, this.player.y, 'coin0', {
            speed: { min: 40, max: 120 },
            angle: { min: 200, max: 340 },
            scale: { start: 0.3, end: 0 },
            lifespan: 600,
            quantity: 12,
            emitting: false,
            tint: [0x00ff00, 0x44ff44, 0xffff00, 0xffffff],
        });
        particles.setDepth(15);
        particles.explode(12);
        this.time.delayedCall(800, () => particles.destroy());
        // Fade + shrink player as they enter the pipe
        this.tweens.add({
            targets: this.player,
            y: sourcePipe.y + BLOCK,
            scaleX: 0.3,
            scaleY: 0.3,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                // Reset player scale/alpha for exit
                this.player.setScale(1);
                this.player.setAlpha(1);
                // Ensure terrain is generated far enough ahead for a destination
                const aheadX = sourcePipe.x + BLOCK * 30;
                if (this.genX < aheadX) {
                    this.generateLevel(this.genX, aheadX);
                    this.extendGround(this.genX, aheadX + W);
                }
                // Safety check — is a landing spot free of hazards?
                const isLandingSafe = (wx) => {
                    if (this.isInGap(wx))
                        return false;
                    if (this.isNearObstacle(wx))
                        return false;
                    const fires = this.fireGroup.getChildren();
                    for (const f of fires) {
                        if (f.active && Math.abs(wx - f.x) < BLOCK * 2)
                            return false;
                    }
                    const enemies = this.enemyGroup.getChildren();
                    for (const e of enemies) {
                        if (e.active && Math.abs(wx - e.x) < BLOCK * 3)
                            return false;
                    }
                    return true;
                };
                // Find a warp-eligible pipe well ahead of the source in a safe spot
                const minX = sourcePipe.x + BLOCK * 15;
                const pipes = this.pipeGroup.getChildren()
                    .filter((p) => p.x > minX && !p.getData('warp') && !p.getData('gold'))
                    .sort((a, b) => a.x - b.x);
                // Group pipes by x-position to find distinct pipe columns
                let destPipe = null;
                const visited = new Set();
                for (const p of pipes) {
                    const col = Math.round(p.x / BLOCK);
                    if (visited.has(col))
                        continue;
                    visited.add(col);
                    if (isLandingSafe(p.x)) {
                        destPipe = p;
                        break;
                    }
                }
                if (destPipe) {
                    // Find the topmost segment at this pipe's x position
                    const topSeg = pipes.filter((p) => Math.abs(p.x - destPipe.x) < BLOCK)
                        .sort((a, b) => a.y - b.y)[0];
                    const destTop = topSeg.y - BLOCK / 2;
                    this.player.setPosition(topSeg.x, destTop + BLOCK);
                    this.player.setVisible(false);
                    this.tweens.add({
                        targets: this.player,
                        y: destTop - 10,
                        duration: 400,
                        onStart: () => {
                            this.player.setVisible(true);
                            // Sparkle burst at exit pipe
                            const exitParticles = this.add.particles(this.player.x, this.player.y, 'coin0', {
                                speed: { min: 40, max: 120 },
                                angle: { min: 200, max: 340 },
                                scale: { start: 0.3, end: 0 },
                                lifespan: 600,
                                quantity: 10,
                                emitting: false,
                                tint: [0x00ff00, 0x44ff44, 0xffff00, 0xffffff],
                            });
                            exitParticles.setDepth(15);
                            exitParticles.explode(10);
                            this.time.delayedCall(800, () => exitParticles.destroy());
                        },
                        onComplete: () => {
                            this.player.body.setAllowGravity(true);
                            this.warping = false;
                            this.addScore(200, this.player.x, this.player.y - 20);
                        },
                    });
                }
                else {
                    // No safe pipe found — warp to safe ground ahead
                    let landX = sourcePipe.x + BLOCK * 18;
                    let tries = 0;
                    while (!isLandingSafe(landX) && tries < 30) {
                        landX += BLOCK;
                        tries++;
                    }
                    this.player.setPosition(landX, GROUND_Y - BLOCK);
                    this.player.setVisible(true);
                    this.player.body.setAllowGravity(true);
                    this.warping = false;
                    this.addScore(200, this.player.x, this.player.y - 20);
                }
            },
        });
    }
    startParachute(pipe) {
        this.warping = true;
        this.parachuteMode = true;
        this.sfx('nr_warp');
        this.player.setVelocity(0, 0);
        this.player.body.setAllowGravity(false);
        // Sparkle particle burst at golden pipe entrance
        const particles = this.add.particles(this.player.x, this.player.y, 'coin0', {
            speed: { min: 50, max: 140 },
            angle: { min: 200, max: 340 },
            scale: { start: 0.4, end: 0 },
            lifespan: 700,
            quantity: 16,
            emitting: false,
            tint: [0xffdd00, 0xffaa00, 0xffffff, 0xff8800],
        });
        particles.setDepth(15);
        particles.explode(16);
        this.time.delayedCall(900, () => particles.destroy());
        // Fade + shrink into pipe
        this.tweens.add({
            targets: this.player,
            y: pipe.y + BLOCK,
            scaleX: 0.3,
            scaleY: 0.3,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                // Reset scale and alpha from pipe entry animation
                this.player.setScale(1);
                this.player.setAlpha(1);
                const targetX = this.cameras.main.scrollX + W / 2;
                this.player.setPosition(targetX, 60);
                this.player.setVisible(true);
                this.player.body.setAllowGravity(true);
                this.player.body.setGravityY(42);
                this.player.setMaxVelocity(200, 144);
                this.warping = false;
                this.parachuteSprite = this.add.sprite(this.player.x, this.player.y - 80, 'parachute');
                this.parachuteSprite.setDisplaySize(96, 120);
                this.parachuteSprite.setOrigin(0.5, 1); // bottom-center anchored to player's head
                this.parachuteSprite.setDepth(9);
                for (let i = 0; i < 8; i++) {
                    const cx = targetX + (Math.random() - 0.5) * W * 0.6;
                    const cy = 100 + Math.random() * (GROUND_Y - 200);
                    const c = this.coinGroup.create(cx, cy, 'coin0');
                    c.setDisplaySize(BLOCK * 0.5, BLOCK * 0.65);
                    c.body.setAllowGravity(false);
                    c.body.setSize(12, 18);
                    c.setData('parachuteCoin', true);
                }
                this.parachuteTimer = 0;
                this.parachuteFlyingEnemies = [];
                // Start looping wind sound
                try {
                    this.windSound = this.sound.add('nr_wind', { volume: 0.15, loop: true });
                    this.windSound.play();
                }
                catch { }
            },
        });
    }
    endParachute() {
        this.parachuteMode = false;
        // Stop wind sound
        if (this.windSound) {
            try {
                this.windSound.stop();
            }
            catch { }
            this.windSound = undefined;
        }
        if (this.parachuteSprite) {
            this.parachuteSprite.destroy();
            this.parachuteSprite = undefined;
        }
        this.player.body.setGravityY(1800);
        this.player.setMaxVelocity(700, 900);
        this.player.setAccelerationX(0);
        // Re-enable camera follow after parachute
        this.cameras.main.startFollow(this.player, true, 0.15, 0.05, -W * 0.2, 0);
        this.parachuteFlyingEnemies.forEach(e => { if (e.active)
            e.destroy(); });
        this.parachuteFlyingEnemies = [];
        this.addScore(500, this.player.x, this.player.y - 30);
    }
    shutdown() {
        super.shutdown();
        // Destroy all physics groups and their children
        const groups = [
            this.groundGroup, this.brickGroup, this.qblockGroup, this.pipeGroup,
            this.coinGroup, this.mushroomGroup, this.heartGroup, this.fireballGroup,
            this.enemyGroup, this.bridgeGroup, this.bounceGroup, this.flagGroup,
            this.piranhaGroup, this.fireGroup, this.crocGroup, this.fishGroup,
        ];
        for (const g of groups) {
            if (g && g.clear)
                try {
                    g.clear(true, true);
                }
                catch { }
        }
        // Destroy player and extra sprites
        this.destroyObj(this.player);
        this.destroyObj(this.parachuteSprite);
        this.parachuteSprite = undefined;
        this.destroyObj(this.glowSprite);
        this.glowSprite = undefined;
        // Stop wind sound
        if (this.windSound) {
            try {
                this.windSound.stop();
            }
            catch { }
            this.windSound = undefined;
        }
        // Clean up flying enemies from parachute mode
        this.parachuteFlyingEnemies.forEach(e => { if (e.active)
            e.destroy(); });
        this.parachuteFlyingEnemies = [];
    }
}
//# sourceMappingURL=NinjaRunner.js.map