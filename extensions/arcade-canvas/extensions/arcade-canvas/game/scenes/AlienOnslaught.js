// AlienOnslaught — Space Invaders-style arcade shooter.
// Rows of aliens march across the screen, descending as they reach the
// edges.  The player defends from the bottom with destructible shields.
// All graphics are procedural (Phaser Graphics) — no external sprite sheets.
import { BaseScene, W, H } from './BaseScene.js';
/* ------------------------------------------------------------------ */
/*  Constants — recalculated in create() for responsive sizing         */
/* ------------------------------------------------------------------ */
let SCALE = Math.min(W / 1920, H / 1080);
// Grid layout
const ALIEN_COLS = 11;
const ALIEN_ROWS = 5;
// Alien types per row (top → bottom): squid, crab, crab, octopus, octopus
const ALIEN_TYPES = [
    { name: 'squid', points: 30, color: 0xff4444 }, // row 0 (top)
    { name: 'crab', points: 20, color: 0x44ff44 }, // rows 1-2
    { name: 'octopus', points: 10, color: 0x44aaff }, // rows 3-4
];
// Timing / speeds
const BASE_MARCH_INTERVAL = 700; // ms between march steps at full grid
const MIN_MARCH_INTERVAL = 60; // fastest march with few aliens left
const MARCH_DROP = 0; // calculated in create()
const PLAYER_SPEED = 350; // px/s
const PLAYER_BULLET_SPEED = 500; // px/s
const ALIEN_BULLET_SPEED = 250; // px/s
const ALIEN_FIRE_INTERVAL = 1200; // ms between alien shots (base)
const MYSTERY_INTERVAL_MIN = 15000;
const MYSTERY_INTERVAL_MAX = 30000;
const MYSTERY_SPEED = 150; // px/s
const INVINCIBLE_TIME = 2000; // ms
// Shield config
const SHIELD_COUNT = 4;
const SHIELD_BLOCK_COLS = 22;
const SHIELD_BLOCK_ROWS = 16;
/* ------------------------------------------------------------------ */
/*  Scene                                                              */
/* ------------------------------------------------------------------ */
export class AlienOnslaughtScene extends BaseScene {
    /* player */
    playerGfx;
    playerX = 0;
    playerY = 0;
    playerAlive = true;
    /* aliens */
    aliens = [];
    alienCellW = 0;
    alienCellH = 0;
    alienGridX = 0; // grid origin
    alienGridY = 0;
    marchDir = 1; // 1 = right, -1 = left
    marchTimer = 0;
    marchInterval = BASE_MARCH_INTERVAL;
    marchStepX = 0;
    marchDrop = 0;
    /* bullets */
    playerBullets = [];
    alienBullets = [];
    alienFireTimer = 0;
    /* mystery ship */
    mystery = null;
    mysteryTimer = 0;
    /* shields */
    shields = []; // [shieldIdx][blockIdx]
    /* starfield */
    stars = [];
    /* game state */
    wave = 0;
    invincibleTimer = 0;
    respawnTimer = 0;
    gameOverFlag = false;
    waveDelay = 0;
    /* input */
    cursors;
    spaceKey;
    spaceWasDown = false;
    /* sizing (calculated in create) */
    alienW = 0;
    alienH = 0;
    playerW = 0;
    playerH = 0;
    bulletW = 0;
    bulletH = 0;
    constructor() { super('alien-onslaught'); }
    get displayName() { return 'Alien Onslaught'; }
    getDescription() {
        return 'Blast waves of descending aliens before they reach the bottom!';
    }
    getControls() {
        return [
            { key: '← →', action: 'Move Left / Right' },
            { key: 'SPACE', action: 'Fire' },
        ];
    }
    /* ================================================================
       LIFECYCLE
       ================================================================ */
    preload() {
        // Reuse existing sound effects
        this.load.audio('ao_laser', '../assets/galaxy-blaster/sounds/sfx_laser1.ogg');
        this.load.audio('ao_explosion', '../assets/galaxy-blaster/sounds/sfx_explosion.ogg');
        this.load.audio('ao_lose', '../assets/cosmic-rocks/sounds/sfx_lose.ogg');
        this.load.audio('ao_twoTone', '../assets/cosmic-rocks/sounds/sfx_twoTone.ogg');
        this.load.audio('ao_shieldHit', '../assets/galaxy-blaster/sounds/sfx_zap.ogg');
        this.load.audio('ao_mystery', '../assets/galaxy-blaster/sounds/sfx_twoTone.ogg');
    }
    create() {
        this.initBase();
        // Responsive sizing — scale the grid to fill ~70% of screen width
        SCALE = Math.min(W / 1920, H / 1080);
        const s = Math.max(SCALE, 0.5);
        // Size the grid relative to screen, not a fixed pixel size
        this.alienCellW = Math.round(W * 0.055); // ~85% of original — tighter grid
        this.alienCellH = Math.round(this.alienCellW * 0.8);
        this.alienW = Math.round(this.alienCellW * 0.6);
        this.alienH = Math.round(this.alienCellH * 0.55);
        this.playerW = Math.round(this.alienCellW * 0.85);
        this.playerH = Math.round(this.playerW * 0.55);
        this.bulletW = Math.round(4 * s);
        this.bulletH = Math.round(12 * s);
        this.marchStepX = Math.round(this.alienCellW * 0.25); // bigger steps → hit edges sooner
        this.marchDrop = Math.round(this.alienCellH * 0.6); // bigger drops → descend faster
        // Reset state
        this.score = 0;
        this.lives = 3;
        this.wave = 0;
        this.playerAlive = true;
        this.gameOverFlag = false;
        this.invincibleTimer = INVINCIBLE_TIME;
        this.respawnTimer = 0;
        this.waveDelay = 0;
        this.marchDir = 1;
        this.marchTimer = 0;
        this.marchInterval = BASE_MARCH_INTERVAL;
        this.playerBullets = [];
        this.alienBullets = [];
        this.aliens = [];
        this.shields = [];
        this.mystery = null;
        this.mysteryTimer = MYSTERY_INTERVAL_MIN + Math.random() * (MYSTERY_INTERVAL_MAX - MYSTERY_INTERVAL_MIN);
        this.stars = [];
        this.ensureSparkTexture();
        // Starfield
        this.stars = this.createStarfield([
            { count: 40, speed: 10, size: 1, alpha: 0.2 },
            { count: 25, speed: 20, size: 1.5, alpha: 0.3 },
            { count: 10, speed: 40, size: 2, alpha: 0.4 },
        ]);
        // Player position — bottom of screen with padding
        this.playerX = W / 2;
        this.playerY = H * 0.92;
        this.playerGfx = this.add.graphics().setDepth(10);
        this.drawPlayer();
        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey('SPACE');
        this.spaceWasDown = false;
        // HUD
        this.syncLivesToHUD();
        this.syncScoreToHUD();
        this.loadHighScore();
        this.startWithReadyScreen(() => this.startWave());
    }
    update(_t, dtMs) {
        if (this.gameOverFlag || !this.cursors)
            return;
        const dt = Math.min(dtMs, 33);
        const dtSec = dt / 1000;
        this.updateStarfield(this.stars, dt);
        // Respawn delay
        if (this.respawnTimer > 0) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0)
                this.respawnPlayer();
        }
        // Player input
        if (this.playerAlive) {
            this.updatePlayerInput(dtSec);
        }
        // Invincibility flicker
        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= dt;
            if (this.playerGfx) {
                this.playerGfx.setAlpha(Math.sin(performance.now() / 80) > 0 ? 1 : 0.2);
            }
        }
        else if (this.playerGfx) {
            this.playerGfx.setAlpha(1);
        }
        // Alien march
        this.marchTimer += dt;
        if (this.marchTimer >= this.marchInterval) {
            this.marchTimer = 0;
            this.marchAliens();
        }
        // Alien shooting
        this.alienFireTimer += dt;
        const fireInterval = Math.max(400, ALIEN_FIRE_INTERVAL - this.wave * 80);
        if (this.alienFireTimer >= fireInterval) {
            this.alienFireTimer = 0;
            this.alienShoot();
        }
        // Update bullets
        this.updatePlayerBullets(dtSec);
        this.updateAlienBullets(dtSec);
        // Mystery ship
        this.updateMystery(dt, dtSec);
        // Collisions
        this.checkCollisions();
        // Wave clear
        if (this.waveDelay > 0) {
            this.waveDelay -= dt;
            if (this.waveDelay <= 0)
                this.startWave();
        }
        else if (this.aliens.filter(a => a.alive).length === 0 && this.waveDelay <= 0) {
            this.waveDelay = 1500;
        }
    }
    /* ================================================================
       PLAYER
       ================================================================ */
    drawPlayer() {
        const g = this.playerGfx;
        g.clear();
        g.setPosition(this.playerX, this.playerY);
        const hw = this.playerW / 2;
        const hh = this.playerH / 2;
        const turretW = hw * 0.2;
        const turretH = hh * 0.6;
        // Shadow
        g.fillStyle(0x000000, 0.5);
        g.fillRect(-hw - 1, -hh - 1, this.playerW + 2, this.playerH + 2);
        g.fillRect(-turretW - 1, -hh - turretH - 1, turretW * 2 + 2, turretH + 2);
        // Body (bright green)
        g.fillStyle(0x00ff66, 1);
        g.fillRect(-hw, -hh, this.playerW, this.playerH);
        // Turret
        g.fillStyle(0x00ff66, 1);
        g.fillRect(-turretW, -hh - turretH, turretW * 2, turretH);
        // Cockpit highlight
        g.fillStyle(0xaaffcc, 0.6);
        g.fillRect(-hw * 0.3, -hh * 0.5, hw * 0.6, hh * 0.6);
    }
    updatePlayerInput(dtSec) {
        if (!this.cursors)
            return;
        if (this.cursors.left.isDown) {
            this.playerX -= PLAYER_SPEED * dtSec;
        }
        if (this.cursors.right.isDown) {
            this.playerX += PLAYER_SPEED * dtSec;
        }
        // Clamp to screen
        const hw = this.playerW / 2;
        this.playerX = Math.max(hw, Math.min(W - hw, this.playerX));
        this.drawPlayer();
        // Fire
        const spaceDown = this.spaceKey.isDown;
        if (spaceDown && !this.spaceWasDown && this.playerBullets.length < 2) {
            this.firePlayerBullet();
        }
        this.spaceWasDown = spaceDown;
    }
    respawnPlayer() {
        this.playerX = W / 2;
        this.playerAlive = true;
        this.invincibleTimer = INVINCIBLE_TIME;
        if (this.playerGfx) {
            this.playerGfx.setVisible(true);
        }
        this.drawPlayer();
    }
    /* ================================================================
       PLAYER BULLETS
       ================================================================ */
    firePlayerBullet() {
        this.sound.play('ao_laser', { volume: 0.3 });
        const gfx = this.add.graphics().setDepth(8);
        const bx = this.playerX;
        const by = this.playerY - this.playerH / 2;
        // Glow
        gfx.fillStyle(0x00ffff, 0.3);
        gfx.fillRect(-this.bulletW, -this.bulletH, this.bulletW * 2, this.bulletH * 2);
        // Solid
        gfx.fillStyle(0x00ffff, 1);
        gfx.fillRect(-this.bulletW / 2, -this.bulletH / 2, this.bulletW, this.bulletH);
        gfx.setPosition(bx, by);
        this.playerBullets.push({ gfx, x: bx, y: by });
    }
    updatePlayerBullets(dtSec) {
        for (let i = this.playerBullets.length - 1; i >= 0; i--) {
            const b = this.playerBullets[i];
            b.y -= PLAYER_BULLET_SPEED * dtSec;
            b.gfx.setPosition(b.x, b.y);
            if (b.y < -this.bulletH) {
                b.gfx.destroy();
                this.playerBullets.splice(i, 1);
            }
        }
    }
    /* ================================================================
       ALIENS
       ================================================================ */
    startWave() {
        this.wave++;
        this.level = this.wave;
        this.syncLevelToHUD();
        this.showWaveBanner(this.wave);
        // Clear leftover bullets
        for (const b of this.playerBullets)
            b.gfx.destroy();
        this.playerBullets = [];
        for (const b of this.alienBullets)
            b.gfx.destroy();
        this.alienBullets = [];
        // Reset march
        this.marchDir = 1;
        this.marchTimer = 0;
        this.alienFireTimer = 0;
        // Calculate grid start position (centered)
        const gridW = ALIEN_COLS * this.alienCellW;
        this.alienGridX = (W - gridW) / 2;
        this.alienGridY = Math.max(H * 0.20, 120);
        // Create aliens
        for (const a of this.aliens)
            a.gfx.destroy();
        this.aliens = [];
        for (let row = 0; row < ALIEN_ROWS; row++) {
            const typeIdx = row === 0 ? 0 : row <= 2 ? 1 : 2;
            for (let col = 0; col < ALIEN_COLS; col++) {
                const x = this.alienGridX + col * this.alienCellW + this.alienCellW / 2;
                const y = this.alienGridY + row * this.alienCellH + this.alienCellH / 2;
                const gfx = this.add.graphics().setDepth(5);
                const alien = { gfx, row, col, type: typeIdx, alive: true, x, y, frame: 0 };
                this.drawAlien(alien);
                this.aliens.push(alien);
            }
        }
        this.updateMarchInterval();
        // Recreate shields on first wave only
        if (this.wave === 1) {
            this.createShields();
        }
    }
    drawAlien(alien) {
        const g = alien.gfx;
        g.clear();
        g.setPosition(alien.x, alien.y);
        const type = ALIEN_TYPES[alien.type];
        const hw = this.alienW / 2;
        const hh = this.alienH / 2;
        const px = Math.max(2, Math.round(this.alienW / 10)); // pixel unit size
        // Draw pixel-art alien based on type
        g.fillStyle(type.color, 1);
        if (type.name === 'squid') {
            // Squid alien — narrow top, wider middle
            g.fillRect(-px, -hh, px * 2, px); // top antenna
            g.fillRect(-px * 2, -hh + px, px * 4, px); // head top
            g.fillRect(-px * 3, -hh + px * 2, px * 6, px * 2); // head body
            g.fillRect(-px * 4, -hh + px * 4, px * 8, px); // wider
            g.fillRect(-px * 3, -hh + px * 5, px * 6, px); // middle
            if (alien.frame === 0) {
                // legs out
                g.fillRect(-px * 4, -hh + px * 6, px * 2, px);
                g.fillRect(px * 2, -hh + px * 6, px * 2, px);
            }
            else {
                // legs in
                g.fillRect(-px * 2, -hh + px * 6, px * 2, px);
                g.fillRect(0, -hh + px * 6, px * 2, px);
            }
        }
        else if (type.name === 'crab') {
            // Crab alien — classic shape with claws
            g.fillRect(-px, -hh, px * 2, px); // antenna
            g.fillRect(-px * 3, -hh + px, px * 6, px); // top
            g.fillRect(-px * 4, -hh + px * 2, px * 8, px * 2); // body
            g.fillRect(-px * 5, -hh + px * 4, px * 10, px); // wide row
            g.fillRect(-px * 4, -hh + px * 5, px * 8, px); // narrower
            // Eyes (dark cutouts)
            g.fillStyle(0x000000, 1);
            g.fillRect(-px * 2, -hh + px * 2, px, px);
            g.fillRect(px, -hh + px * 2, px, px);
            g.fillStyle(type.color, 1);
            if (alien.frame === 0) {
                g.fillRect(-px * 5, -hh + px * 5, px, px * 2);
                g.fillRect(px * 4, -hh + px * 5, px, px * 2);
            }
            else {
                g.fillRect(-px * 3, -hh + px * 6, px * 2, px);
                g.fillRect(px, -hh + px * 6, px * 2, px);
            }
        }
        else {
            // Octopus alien — round with tentacles
            g.fillRect(-px * 2, -hh, px * 4, px); // top
            g.fillRect(-px * 4, -hh + px, px * 8, px * 2); // upper body
            g.fillRect(-px * 5, -hh + px * 3, px * 10, px * 2); // body
            g.fillRect(-px * 4, -hh + px * 5, px * 8, px); // lower
            // Eyes
            g.fillStyle(0x000000, 1);
            g.fillRect(-px * 3, -hh + px * 2, px * 2, px);
            g.fillRect(px, -hh + px * 2, px * 2, px);
            g.fillStyle(type.color, 1);
            if (alien.frame === 0) {
                // tentacles down/out
                g.fillRect(-px * 5, -hh + px * 6, px * 2, px);
                g.fillRect(-px * 2, -hh + px * 6, px, px);
                g.fillRect(px, -hh + px * 6, px, px);
                g.fillRect(px * 3, -hh + px * 6, px * 2, px);
            }
            else {
                // tentacles up/in
                g.fillRect(-px * 4, -hh + px * 6, px * 2, px);
                g.fillRect(-px, -hh + px * 6, px * 2, px);
                g.fillRect(px * 2, -hh + px * 6, px * 2, px);
            }
        }
    }
    marchAliens() {
        const alive = this.aliens.filter(a => a.alive);
        if (alive.length === 0)
            return;
        // Check if any alien hit the edge
        let hitEdge = false;
        const margin = this.alienCellW * 0.3;
        for (const a of alive) {
            if (this.marchDir === 1 && a.x + this.alienW / 2 + this.marchStepX > W - margin) {
                hitEdge = true;
                break;
            }
            if (this.marchDir === -1 && a.x - this.alienW / 2 - this.marchStepX < margin) {
                hitEdge = true;
                break;
            }
        }
        if (hitEdge) {
            // Drop down and reverse
            this.marchDir *= -1;
            for (const a of alive) {
                a.y += this.marchDrop;
                a.frame = 1 - a.frame;
                this.drawAlien(a);
                // Check if aliens reached player row — instant game over (classic rules)
                if (a.y + this.alienH / 2 >= this.playerY - this.playerH / 2) {
                    this.triggerGameOver();
                    return;
                }
            }
        }
        else {
            // March sideways
            for (const a of alive) {
                a.x += this.marchStepX * this.marchDir;
                a.frame = 1 - a.frame;
                this.drawAlien(a);
            }
        }
        // Play march sound (alternate tone)
        this.sound.play('ao_twoTone', { volume: 0.15 });
    }
    updateMarchInterval() {
        const aliveCount = this.aliens.filter(a => a.alive).length;
        const total = ALIEN_COLS * ALIEN_ROWS;
        if (total === 0)
            return;
        // Exponential speed-up as aliens are destroyed
        const ratio = aliveCount / total;
        this.marchInterval = MIN_MARCH_INTERVAL + (BASE_MARCH_INTERVAL - MIN_MARCH_INTERVAL) * ratio;
        // Wave speed bonus
        this.marchInterval = Math.max(MIN_MARCH_INTERVAL, this.marchInterval - this.wave * 20);
    }
    /* ================================================================
       ALIEN SHOOTING
       ================================================================ */
    alienShoot() {
        const alive = this.aliens.filter(a => a.alive);
        if (alive.length === 0)
            return;
        // Find bottommost alien in each column, then pick one at random
        const bottomAliens = [];
        for (let col = 0; col < ALIEN_COLS; col++) {
            const colAliens = alive.filter(a => a.col === col);
            if (colAliens.length > 0) {
                colAliens.sort((a, b) => b.row - a.row);
                bottomAliens.push(colAliens[0]);
            }
        }
        if (bottomAliens.length === 0)
            return;
        const shooter = bottomAliens[Math.floor(Math.random() * bottomAliens.length)];
        const gfx = this.add.graphics().setDepth(7);
        // Alien bullet — different color (yellow/red)
        gfx.fillStyle(0xffaa00, 0.4);
        gfx.fillRect(-this.bulletW, -this.bulletH / 2, this.bulletW * 2, this.bulletH);
        gfx.fillStyle(0xff4444, 1);
        gfx.fillRect(-this.bulletW / 2, -this.bulletH / 2, this.bulletW, this.bulletH);
        gfx.setPosition(shooter.x, shooter.y + this.alienH / 2);
        this.alienBullets.push({ gfx, x: shooter.x, y: shooter.y + this.alienH / 2 });
    }
    updateAlienBullets(dtSec) {
        for (let i = this.alienBullets.length - 1; i >= 0; i--) {
            const b = this.alienBullets[i];
            b.y += ALIEN_BULLET_SPEED * dtSec;
            b.gfx.setPosition(b.x, b.y);
            if (b.y > H + this.bulletH) {
                b.gfx.destroy();
                this.alienBullets.splice(i, 1);
            }
        }
    }
    /* ================================================================
       MYSTERY SHIP
       ================================================================ */
    spawnMystery() {
        const dir = Math.random() < 0.5 ? 1 : -1;
        const x = dir === 1 ? -40 : W + 40;
        // Position just above the alien grid, below the HUD
        const y = this.alienGridY - this.alienCellH * 1.2;
        const gfx = this.add.graphics().setDepth(12);
        this.mystery = { gfx, x, y, direction: dir, active: true };
        this.drawMystery();
        this.sound.play('ao_mystery', { volume: 0.2 });
    }
    drawMystery() {
        if (!this.mystery)
            return;
        const g = this.mystery.gfx;
        g.clear();
        g.setPosition(this.mystery.x, this.mystery.y);
        const s = Math.max(SCALE, 0.5);
        const w = 30 * s;
        const h = 12 * s;
        // Saucer shape
        g.fillStyle(0x000000, 0.5);
        g.fillEllipse(0, 0, w * 2 + 2, h + 2);
        g.fillStyle(0xff00ff, 0.8);
        g.fillEllipse(0, 0, w * 2, h);
        // Dome
        g.fillStyle(0xff66ff, 1);
        g.fillEllipse(0, -h * 0.4, w, h * 0.7);
        // Lights
        g.fillStyle(0xffff00, 1);
        g.fillCircle(-w * 0.5, 0, 2 * s);
        g.fillCircle(0, 0, 2 * s);
        g.fillCircle(w * 0.5, 0, 2 * s);
    }
    updateMystery(dt, dtSec) {
        if (this.mystery && this.mystery.active) {
            this.mystery.x += MYSTERY_SPEED * this.mystery.direction * dtSec;
            this.drawMystery();
            // Off screen?
            if ((this.mystery.direction === 1 && this.mystery.x > W + 60) ||
                (this.mystery.direction === -1 && this.mystery.x < -60)) {
                this.mystery.gfx.destroy();
                this.mystery = null;
            }
        }
        else {
            this.mysteryTimer -= dt;
            if (this.mysteryTimer <= 0) {
                this.mysteryTimer = MYSTERY_INTERVAL_MIN + Math.random() * (MYSTERY_INTERVAL_MAX - MYSTERY_INTERVAL_MIN);
                this.spawnMystery();
            }
        }
    }
    /* ================================================================
       SHIELDS
       ================================================================ */
    createShields() {
        // Clear existing
        for (const shield of this.shields) {
            for (const block of shield) {
                if (block.gfx)
                    block.gfx.destroy();
            }
        }
        this.shields = [];
        const s = Math.max(SCALE, 0.5);
        // Original shields were ~6% of screen height tall; derive block size from that
        const targetShieldH = H * 0.055;
        const blockH = Math.max(2, Math.round(targetShieldH / SHIELD_BLOCK_ROWS));
        const blockW = blockH;
        const shieldW = SHIELD_BLOCK_COLS * blockW;
        const shieldH = SHIELD_BLOCK_ROWS * blockH;
        const totalShieldsW = SHIELD_COUNT * shieldW;
        const gap = (W - totalShieldsW) / (SHIELD_COUNT + 1);
        const shieldY = this.playerY - this.playerH - shieldH - 20;
        // Classic shield shape mask (inverted U)
        const shieldMask = this.generateShieldMask();
        for (let si = 0; si < SHIELD_COUNT; si++) {
            const shieldX = gap + si * (shieldW + gap);
            const blocks = [];
            for (let r = 0; r < SHIELD_BLOCK_ROWS; r++) {
                for (let c = 0; c < SHIELD_BLOCK_COLS; c++) {
                    if (!shieldMask[r][c])
                        continue;
                    const bx = shieldX + c * blockW;
                    const by = shieldY + r * blockH;
                    const gfx = this.add.graphics().setDepth(6);
                    gfx.fillStyle(0x00ff66, 1);
                    gfx.fillRect(0, 0, blockW, blockH);
                    gfx.setPosition(bx, by);
                    blocks.push({ gfx, x: bx, y: by, w: blockW, h: blockH, alive: true });
                }
            }
            this.shields.push(blocks);
        }
    }
    generateShieldMask() {
        const mask = [];
        for (let r = 0; r < SHIELD_BLOCK_ROWS; r++) {
            mask[r] = [];
            for (let c = 0; c < SHIELD_BLOCK_COLS; c++) {
                // Round top
                if (r < 4) {
                    const center = SHIELD_BLOCK_COLS / 2;
                    const dist = Math.abs(c - center + 0.5);
                    const maxDist = (SHIELD_BLOCK_COLS / 2) * (1 - r * 0.05);
                    mask[r][c] = dist < maxDist;
                }
                // Middle — solid
                else if (r < SHIELD_BLOCK_ROWS - 5) {
                    mask[r][c] = true;
                }
                // Bottom — cut out arch
                else {
                    const center = SHIELD_BLOCK_COLS / 2;
                    const dist = Math.abs(c - center + 0.5);
                    const archRow = r - (SHIELD_BLOCK_ROWS - 5);
                    const archWidth = 3 + archRow * 0.8;
                    mask[r][c] = dist > archWidth;
                }
            }
        }
        return mask;
    }
    /* ================================================================
       COLLISIONS
       ================================================================ */
    checkCollisions() {
        // Player bullets vs aliens
        for (let bi = this.playerBullets.length - 1; bi >= 0; bi--) {
            const b = this.playerBullets[bi];
            let hit = false;
            for (const a of this.aliens) {
                if (!a.alive)
                    continue;
                if (this.rectOverlap(b.x - this.bulletW / 2, b.y - this.bulletH / 2, this.bulletW, this.bulletH, a.x - this.alienW / 2, a.y - this.alienH / 2, this.alienW, this.alienH)) {
                    a.alive = false;
                    a.gfx.setVisible(false);
                    this.addScore(ALIEN_TYPES[a.type].points, a.x, a.y);
                    this.spawnExplosion(a.x, a.y, ALIEN_TYPES[a.type].color);
                    this.sound.play('ao_explosion', { volume: 0.25 });
                    this.updateMarchInterval();
                    hit = true;
                    break;
                }
            }
            // Player bullets vs mystery
            if (!hit && this.mystery && this.mystery.active) {
                const mw = 30 * Math.max(SCALE, 0.5);
                const mh = 12 * Math.max(SCALE, 0.5);
                if (this.rectOverlap(b.x - this.bulletW / 2, b.y - this.bulletH / 2, this.bulletW, this.bulletH, this.mystery.x - mw, this.mystery.y - mh / 2, mw * 2, mh)) {
                    const mysteryPoints = [50, 100, 150, 300][Math.floor(Math.random() * 4)];
                    this.addScore(mysteryPoints, this.mystery.x, this.mystery.y);
                    this.spawnExplosion(this.mystery.x, this.mystery.y, 0xff00ff);
                    this.sound.play('ao_explosion', { volume: 0.3 });
                    this.mystery.gfx.destroy();
                    this.mystery = null;
                    hit = true;
                }
            }
            // Player bullets vs shields
            if (!hit) {
                for (const shield of this.shields) {
                    for (const block of shield) {
                        if (!block.alive)
                            continue;
                        if (this.rectOverlap(b.x - this.bulletW / 2, b.y - this.bulletH / 2, this.bulletW, this.bulletH, block.x, block.y, block.w, block.h)) {
                            block.alive = false;
                            block.gfx.destroy();
                            hit = true;
                            break;
                        }
                    }
                    if (hit)
                        break;
                }
            }
            if (hit) {
                b.gfx.destroy();
                this.playerBullets.splice(bi, 1);
            }
        }
        // Alien bullets vs player
        if (this.playerAlive && this.invincibleTimer <= 0) {
            for (let bi = this.alienBullets.length - 1; bi >= 0; bi--) {
                const b = this.alienBullets[bi];
                if (this.rectOverlap(b.x - this.bulletW / 2, b.y - this.bulletH / 2, this.bulletW, this.bulletH, this.playerX - this.playerW / 2, this.playerY - this.playerH / 2, this.playerW, this.playerH)) {
                    b.gfx.destroy();
                    this.alienBullets.splice(bi, 1);
                    this.playerHit();
                    break;
                }
            }
        }
        // Alien bullets vs shields
        for (let bi = this.alienBullets.length - 1; bi >= 0; bi--) {
            const b = this.alienBullets[bi];
            let hit = false;
            for (const shield of this.shields) {
                for (const block of shield) {
                    if (!block.alive)
                        continue;
                    if (this.rectOverlap(b.x - this.bulletW / 2, b.y - this.bulletH / 2, this.bulletW, this.bulletH, block.x, block.y, block.w, block.h)) {
                        block.alive = false;
                        block.gfx.destroy();
                        hit = true;
                        break;
                    }
                }
                if (hit)
                    break;
            }
            if (hit) {
                b.gfx.destroy();
                this.alienBullets.splice(bi, 1);
            }
        }
        // Aliens vs shields (aliens marching into shields)
        for (const a of this.aliens) {
            if (!a.alive)
                continue;
            for (const shield of this.shields) {
                for (const block of shield) {
                    if (!block.alive)
                        continue;
                    if (this.rectOverlap(a.x - this.alienW / 2, a.y - this.alienH / 2, this.alienW, this.alienH, block.x, block.y, block.w, block.h)) {
                        block.alive = false;
                        block.gfx.destroy();
                    }
                }
            }
        }
    }
    rectOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    }
    playerHit() {
        if (this.gameOverFlag)
            return;
        this.lives--;
        this.syncLivesToHUD();
        this.sound.play('ao_lose', { volume: 0.4 });
        this.spawnExplosion(this.playerX, this.playerY, 0x00ff66);
        if (this.lives <= 0) {
            this.triggerGameOver();
        }
        else {
            this.playerAlive = false;
            this.playerGfx.setVisible(false);
            this.respawnTimer = 1200;
        }
    }
    triggerGameOver() {
        this.gameOverFlag = true;
        this.playerAlive = false;
        this.playerGfx.setVisible(false);
        // Clear all bullets
        for (const b of this.playerBullets)
            b.gfx.destroy();
        this.playerBullets = [];
        for (const b of this.alienBullets)
            b.gfx.destroy();
        this.alienBullets = [];
        this.showGameOver(this.score, () => {
            this.gameOverFlag = false;
            this.scene.restart();
        });
    }
    /* ================================================================
       EFFECTS
       ================================================================ */
    spawnExplosion(x, y, color) {
        this.spawnParticleExplosion(x, y, color, 10);
    }
    /* ================================================================
       SHUTDOWN
       ================================================================ */
    shutdown() {
        super.shutdown();
        // Clean up transient DOM
        const banner = document.getElementById('wave-banner');
        if (banner)
            banner.remove();
        // Clean up graphics
        for (const a of this.aliens)
            a.gfx?.destroy();
        for (const b of this.playerBullets)
            b.gfx?.destroy();
        for (const b of this.alienBullets)
            b.gfx?.destroy();
        if (this.mystery)
            this.mystery.gfx?.destroy();
        for (const shield of this.shields) {
            for (const block of shield)
                block.gfx?.destroy();
        }
    }
}
//# sourceMappingURL=AlienOnslaught.js.map