// CosmicRocks — Asteroids-style space shooter.
// Ship rotates and thrusts through space, destroying asteroids that split
// into smaller fragments. Vector-style graphics drawn with Phaser Graphics.
import { BaseScene, W, H } from './BaseScene.js';
/* ------------------------------------------------------------------ */
/*  Constants — SCALE/SHIP_SIZE recalculated in create()               */
/* ------------------------------------------------------------------ */
let SCALE = Math.min(W / 1920, H / 1080);
let SHIP_SIZE = 20 * Math.max(SCALE, 0.6);
const ROTATE_SPEED = 4; // rad/s
const THRUST = 400; // px/s²
const FRICTION = 0.98;
const BULLET_SPEED = 600;
const BULLET_LIFE = 3000; // ms
const MAX_BULLETS = 4;
const INITIAL_ASTEROIDS = 5;
const INVINCIBLE_TIME = 2000; // ms
const RESPAWN_DELAY = 800; // ms before respawn
const ASTEROID_SIZES = [
    { radius: [40, 60], speed: [40, 80], score: 20 }, // large  (size index 0)
    { radius: [25, 40], speed: [60, 120], score: 50 }, // medium (size index 1)
    { radius: [12, 20], speed: [80, 160], score: 100 }, // small  (size index 2)
];
const BULLET_COLORS = [0x00ff88, 0xff8800, 0x00ccff];
/* ------------------------------------------------------------------ */
/*  Scene                                                              */
/* ------------------------------------------------------------------ */
export class CosmicRocksScene extends BaseScene {
    /* ship state */
    shipGfx;
    shipX = 0;
    shipY = 0;
    shipVx = 0;
    shipVy = 0;
    shipAngle = -Math.PI / 2; // pointing up
    thrustGfx;
    /* game objects */
    asteroids = [];
    bullets = [];
    stars = [];
    /* UFO */
    ufo = null;
    ufoBullets = [];
    ufoTimer = 0;
    /* game state */
    wave = 0;
    invincibleTimer = 0;
    respawnTimer = 0;
    shipAlive = true;
    gameOver = false;
    waveDelay = 0;
    /* input */
    cursors;
    spaceKey;
    spaceWasDown = false;
    constructor() { super('cosmic-rocks'); }
    get displayName() { return 'Cosmic Rocks'; }
    getDescription() {
        return 'Survive the asteroid field. Shoot rocks to break them apart!';
    }
    getControls() {
        return [
            { key: '← →', action: 'Rotate' },
            { key: '↑', action: 'Thrust' },
            { key: 'SPACE', action: 'Fire' },
        ];
    }
    /* ================================================================
       LIFECYCLE
       ================================================================ */
    preload() {
        this.load.audio('sfx_laser', '../assets/cosmic-rocks/sounds/sfx_laser1.ogg');
        this.load.audio('sfx_zap', '../assets/cosmic-rocks/sounds/sfx_explosion.ogg');
        this.load.audio('sfx_lose', '../assets/cosmic-rocks/sounds/sfx_lose.ogg');
        this.load.audio('sfx_twoTone', '../assets/cosmic-rocks/sounds/sfx_twoTone.ogg');
    }
    create() {
        this.initBase();
        // Recalculate screen-dependent constants
        SCALE = Math.min(W / 1920, H / 1080);
        SHIP_SIZE = 20 * Math.max(SCALE, 0.6);
        this.score = 0;
        this.lives = 3;
        this.wave = 0;
        this.shipX = W / 2;
        this.shipY = H / 2;
        this.shipVx = 0;
        this.shipVy = 0;
        this.shipAngle = -Math.PI / 2;
        this.invincibleTimer = 0;
        this.respawnTimer = 0;
        this.shipAlive = true;
        this.gameOver = false;
        this.waveDelay = 0;
        this.asteroids = [];
        this.bullets = [];
        this.stars = [];
        this.activeEmitters = [];
        this.ufo = null;
        this.ufoBullets = [];
        this.ufoTimer = 15000 + Math.random() * 10000;
        this.ensureSparkTexture();
        this.stars = this.createStarfield([
            { count: 40, speed: 15, size: 1, alpha: 0.25 },
            { count: 25, speed: 30, size: 1.5, alpha: 0.35 },
            { count: 15, speed: 55, size: 2, alpha: 0.45 },
        ]);
        this.createShip();
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey('SPACE');
        this.spaceWasDown = false;
        this.syncLivesToHUD();
        this.syncScoreToHUD();
        this.loadHighScore();
        this.startWithReadyScreen(() => this.startWave());
    }
    update(_t, dtMs) {
        if (this.gameOver || !this.cursors)
            return;
        const dt = Math.min(dtMs, 33);
        const dtSec = dt / 1000;
        this.updateStarfield(this.stars, dt);
        if (this.respawnTimer > 0) {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0)
                this.respawnShip();
        }
        if (this.shipAlive) {
            this.updateShipInput(dtSec);
            this.updateShipPhysics(dtSec);
            this.drawShip();
        }
        this.updateBullets(dtSec);
        this.updateAsteroids(dtSec);
        this.updateUfo(dt, dtSec);
        this.checkCollisions();
        this.checkUfoCollisions();
        if (this.waveDelay > 0) {
            this.waveDelay -= dt;
            if (this.waveDelay <= 0 && this.asteroids.length === 0)
                this.startWave();
        }
        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= dt;
            if (this.shipGfx) {
                this.shipGfx.setAlpha(Math.sin(performance.now() / 80) > 0 ? 1 : 0.2);
            }
        }
        else if (this.shipGfx) {
            this.shipGfx.setAlpha(1);
        }
    }
    /* ================================================================
       SHIP
       ================================================================ */
    createShip() {
        this.shipGfx = this.add.graphics().setDepth(10);
        this.thrustGfx = this.add.graphics().setDepth(9);
        this.drawShip();
    }
    updateShipInput(dtSec) {
        if (!this.cursors)
            return;
        if (this.cursors.left.isDown)
            this.shipAngle -= ROTATE_SPEED * dtSec;
        if (this.cursors.right.isDown)
            this.shipAngle += ROTATE_SPEED * dtSec;
        if (this.cursors.up.isDown) {
            this.shipVx += Math.cos(this.shipAngle) * THRUST * dtSec;
            this.shipVy += Math.sin(this.shipAngle) * THRUST * dtSec;
        }
        // Fire
        const spaceDown = this.spaceKey.isDown;
        if (spaceDown && !this.spaceWasDown && this.bullets.length < MAX_BULLETS) {
            this.fireBullet();
        }
        this.spaceWasDown = spaceDown;
    }
    updateShipPhysics(dtSec) {
        // Friction (time-based)
        const friction = Math.pow(FRICTION, dtSec / (1 / 60));
        this.shipVx *= friction;
        this.shipVy *= friction;
        this.shipX += this.shipVx * dtSec;
        this.shipY += this.shipVy * dtSec;
        // Screen wrap
        if (this.shipX < -SHIP_SIZE)
            this.shipX = W + SHIP_SIZE;
        else if (this.shipX > W + SHIP_SIZE)
            this.shipX = -SHIP_SIZE;
        if (this.shipY < -SHIP_SIZE)
            this.shipY = H + SHIP_SIZE;
        else if (this.shipY > H + SHIP_SIZE)
            this.shipY = -SHIP_SIZE;
    }
    drawShip() {
        const g = this.shipGfx;
        g.clear();
        g.setPosition(this.shipX, this.shipY);
        const cos = Math.cos(this.shipAngle);
        const sin = Math.sin(this.shipAngle);
        const s = SHIP_SIZE;
        // Triangle ship
        const nose = { x: cos * s, y: sin * s };
        const leftWing = { x: Math.cos(this.shipAngle + 2.4) * s * 0.85, y: Math.sin(this.shipAngle + 2.4) * s * 0.85 };
        const rightWing = { x: Math.cos(this.shipAngle - 2.4) * s * 0.85, y: Math.sin(this.shipAngle - 2.4) * s * 0.85 };
        // Dark shadow backdrop for visibility on light backgrounds
        g.lineStyle(6, 0x000000, 0.5);
        g.beginPath();
        g.moveTo(nose.x, nose.y);
        g.lineTo(leftWing.x, leftWing.y);
        g.lineTo(rightWing.x, rightWing.y);
        g.closePath();
        g.strokePath();
        // Outer glow (soft cyan)
        g.lineStyle(4, 0x00ffff, 0.2);
        g.beginPath();
        g.moveTo(nose.x, nose.y);
        g.lineTo(leftWing.x, leftWing.y);
        g.lineTo(rightWing.x, rightWing.y);
        g.closePath();
        g.strokePath();
        // Solid ship outline (bright cyan)
        g.lineStyle(2.5, 0x00ffff, 1);
        g.beginPath();
        g.moveTo(nose.x, nose.y);
        g.lineTo(leftWing.x, leftWing.y);
        g.lineTo(rightWing.x, rightWing.y);
        g.closePath();
        g.strokePath();
        // Thrust flame
        const tg = this.thrustGfx;
        tg.clear();
        if (this.cursors && this.cursors.up.isDown) {
            tg.setPosition(this.shipX, this.shipY);
            const tailLen = s * (0.6 + Math.random() * 0.4);
            const tailX = -cos * tailLen;
            const tailY = -sin * tailLen;
            const spread = 0.4;
            const tl = { x: Math.cos(this.shipAngle + Math.PI - spread) * s * 0.35, y: Math.sin(this.shipAngle + Math.PI - spread) * s * 0.35 };
            const tr = { x: Math.cos(this.shipAngle + Math.PI + spread) * s * 0.35, y: Math.sin(this.shipAngle + Math.PI + spread) * s * 0.35 };
            // Dark shadow for thrust
            tg.lineStyle(5, 0x000000, 0.3);
            tg.beginPath();
            tg.moveTo(tl.x, tl.y);
            tg.lineTo(tailX, tailY);
            tg.lineTo(tr.x, tr.y);
            tg.strokePath();
            tg.lineStyle(3, 0xff8800, 0.25);
            tg.beginPath();
            tg.moveTo(tl.x, tl.y);
            tg.lineTo(tailX, tailY);
            tg.lineTo(tr.x, tr.y);
            tg.strokePath();
            tg.lineStyle(2.5, 0xff8800, 0.9);
            tg.beginPath();
            tg.moveTo(tl.x, tl.y);
            tg.lineTo(tailX, tailY);
            tg.lineTo(tr.x, tr.y);
            tg.strokePath();
        }
    }
    respawnShip() {
        this.shipX = W / 2;
        this.shipY = H / 2;
        this.shipVx = 0;
        this.shipVy = 0;
        this.shipAngle = -Math.PI / 2;
        this.shipAlive = true;
        this.invincibleTimer = INVINCIBLE_TIME;
        if (this.shipGfx)
            this.shipGfx.setVisible(true);
        if (this.thrustGfx)
            this.thrustGfx.setVisible(true);
    }
    /* ================================================================
       BULLETS
       ================================================================ */
    fireBullet() {
        this.sound.play('sfx_laser', { volume: 0.3 });
        const color = BULLET_COLORS[Math.floor(Math.random() * BULLET_COLORS.length)];
        const gfx = this.add.graphics().setDepth(8);
        // Dark backdrop
        gfx.fillStyle(0x000000, 0.5);
        gfx.fillCircle(0, 0, 10);
        // Glow
        gfx.fillStyle(color, 0.3);
        gfx.fillCircle(0, 0, 8);
        // Solid center
        gfx.fillStyle(color, 1);
        gfx.fillCircle(0, 0, 4);
        const bx = this.shipX + Math.cos(this.shipAngle) * SHIP_SIZE;
        const by = this.shipY + Math.sin(this.shipAngle) * SHIP_SIZE;
        gfx.setPosition(bx, by);
        this.bullets.push({
            gfx,
            x: bx, y: by,
            vx: Math.cos(this.shipAngle) * BULLET_SPEED,
            vy: Math.sin(this.shipAngle) * BULLET_SPEED,
            life: BULLET_LIFE,
            color,
        });
    }
    updateBullets(dtSec) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx * dtSec;
            b.y += b.vy * dtSec;
            b.life -= dtSec * 1000;
            b.gfx.setPosition(b.x, b.y);
            // Destroy bullet when it leaves the screen or expires
            if (b.life <= 0 || b.x < 0 || b.x > W || b.y < 0 || b.y > H) {
                b.gfx.destroy();
                this.bullets.splice(i, 1);
            }
        }
    }
    /* ================================================================
       ASTEROIDS
       ================================================================ */
    generateAsteroidVertices(radius) {
        const verts = [];
        const sides = 12;
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2;
            const r = radius * (0.7 + Math.random() * 0.3);
            verts.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
        }
        return verts;
    }
    spawnAsteroid(sizeIdx, x, y, aimAtShip = false) {
        const info = ASTEROID_SIZES[sizeIdx];
        const radius = info.radius[0] + Math.random() * (info.radius[1] - info.radius[0]);
        const scaledRadius = radius * Math.max(SCALE, 0.5);
        // Position: at edges if not specified
        let ax, ay;
        if (x !== undefined && y !== undefined) {
            ax = x;
            ay = y;
        }
        else {
            const edge = Math.floor(Math.random() * 4);
            if (edge === 0) {
                ax = Math.random() * W;
                ay = -scaledRadius;
            }
            else if (edge === 1) {
                ax = Math.random() * W;
                ay = H + scaledRadius;
            }
            else if (edge === 2) {
                ax = -scaledRadius;
                ay = Math.random() * H;
            }
            else {
                ax = W + scaledRadius;
                ay = Math.random() * H;
            }
            // Make sure not too close to player
            const dx = ax - this.shipX;
            const dy = ay - this.shipY;
            if (Math.sqrt(dx * dx + dy * dy) < 150) {
                ax = (ax + W / 2) % W;
                ay = (ay + H / 2) % H;
            }
        }
        const speed = info.speed[0] + Math.random() * (info.speed[1] - info.speed[0]);
        const speedBoost = Math.random() < 0.4 ? 1.5 : 1.0; // 40% chance of fast asteroid
        // Aim toward the ship if requested, otherwise random direction
        let angle;
        let finalSpeed = speed * speedBoost;
        if (aimAtShip) {
            angle = Math.atan2(this.shipY - ay, this.shipX - ax);
            // Add slight random spread (±15°) so it's not a perfect snipe
            angle += (Math.random() - 0.5) * (Math.PI / 6);
            // Ensure it arrives in ~3-4s regardless of base speed
            const dist = Math.sqrt((this.shipX - ax) ** 2 + (this.shipY - ay) ** 2);
            const minSpeed = dist / (3 + Math.random());
            finalSpeed = Math.max(finalSpeed, minSpeed);
        }
        else {
            angle = Math.random() * Math.PI * 2;
        }
        const vertices = this.generateAsteroidVertices(scaledRadius);
        const gfx = this.add.graphics().setDepth(5);
        this.drawAsteroid(gfx, vertices);
        this.asteroids.push({
            gfx,
            x: ax, y: ay,
            vx: Math.cos(angle) * finalSpeed,
            vy: Math.sin(angle) * finalSpeed,
            radius: scaledRadius,
            sizeIdx,
            rotation: 0,
            rotSpeed: (Math.random() - 0.5) * 2,
            vertices,
        });
    }
    drawAsteroid(gfx, vertices) {
        gfx.clear();
        // Dark shadow backdrop for visibility on light backgrounds
        gfx.lineStyle(5, 0x000000, 0.5);
        gfx.beginPath();
        gfx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
            gfx.lineTo(vertices[i].x, vertices[i].y);
        }
        gfx.closePath();
        gfx.strokePath();
        // Outer glow (soft green)
        gfx.lineStyle(3, 0x44ff44, 0.25);
        gfx.beginPath();
        gfx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
            gfx.lineTo(vertices[i].x, vertices[i].y);
        }
        gfx.closePath();
        gfx.strokePath();
        // Solid outline (bright green-white)
        gfx.lineStyle(2.5, 0x88ff88, 1);
        gfx.beginPath();
        gfx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
            gfx.lineTo(vertices[i].x, vertices[i].y);
        }
        gfx.closePath();
        gfx.strokePath();
    }
    updateAsteroids(dtSec) {
        for (const a of this.asteroids) {
            a.x += a.vx * dtSec;
            a.y += a.vy * dtSec;
            a.rotation += a.rotSpeed * dtSec;
            // Screen wrap
            if (a.x < -a.radius)
                a.x = W + a.radius;
            else if (a.x > W + a.radius)
                a.x = -a.radius;
            if (a.y < -a.radius)
                a.y = H + a.radius;
            else if (a.y > H + a.radius)
                a.y = -a.radius;
            a.gfx.setPosition(a.x, a.y);
            a.gfx.setRotation(a.rotation);
        }
    }
    destroyAsteroid(idx) {
        const a = this.asteroids[idx];
        const info = ASTEROID_SIZES[a.sizeIdx];
        this.addScore(info.score, a.x, a.y - 10);
        this.spawnExplosion(a.x, a.y);
        this.sound.play('sfx_zap', { volume: 0.3 });
        // Spawn children
        if (a.sizeIdx < 2) {
            const childSize = a.sizeIdx + 1;
            for (let i = 0; i < 3; i++) {
                this.spawnAsteroid(childSize, a.x, a.y);
            }
        }
        a.gfx.destroy();
        this.asteroids.splice(idx, 1);
        // Check if wave cleared
        if (this.asteroids.length === 0 && this.waveDelay <= 0) {
            this.waveDelay = 2000;
        }
    }
    /* ================================================================
       COLLISIONS (manual rect/circle overlap — same pattern as Galaxy)
       ================================================================ */
    checkCollisions() {
        // Bullets vs asteroids
        for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
            const b = this.bullets[bi];
            for (let ai = this.asteroids.length - 1; ai >= 0; ai--) {
                const a = this.asteroids[ai];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                if (dx * dx + dy * dy < a.radius * a.radius) {
                    b.gfx.destroy();
                    this.bullets.splice(bi, 1);
                    this.destroyAsteroid(ai);
                    break;
                }
            }
        }
        // Ship vs asteroids
        if (this.shipAlive && this.invincibleTimer <= 0) {
            for (let ai = this.asteroids.length - 1; ai >= 0; ai--) {
                const a = this.asteroids[ai];
                const dx = this.shipX - a.x;
                const dy = this.shipY - a.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < a.radius + SHIP_SIZE * 0.6) {
                    this.hitShip();
                    break;
                }
            }
        }
    }
    /* ================================================================
       SHIP DEATH / LIVES
       ================================================================ */
    hitShip() {
        this.lives--;
        this.syncLivesToHUD();
        this.spawnExplosion(this.shipX, this.shipY);
        this.sound.play('sfx_zap', { volume: 0.5 });
        this.sound.play('sfx_lose', { volume: 0.4 });
        if (this.lives <= 0) {
            this.shipAlive = false;
            if (this.shipGfx)
                this.shipGfx.setVisible(false);
            if (this.thrustGfx)
                this.thrustGfx.setVisible(false);
            this.gameOver = true;
            this.time.delayedCall(1000, () => {
                this.showGameOver(this.score, () => this.scene.restart());
            });
        }
        else {
            this.shipAlive = false;
            if (this.shipGfx)
                this.shipGfx.setVisible(false);
            if (this.thrustGfx)
                this.thrustGfx.setVisible(false);
            this.respawnTimer = RESPAWN_DELAY;
        }
    }
    /* ================================================================
       PARTICLES
       ================================================================ */
    spawnExplosion(x, y) {
        this.spawnParticleExplosion(x, y, 0xffffff, 8);
    }
    /* ================================================================
       UFO ENEMY
       ================================================================ */
    spawnUfo() {
        const fromRight = Math.random() < 0.5;
        const x = fromRight ? W + 30 : -30;
        const y = H * (0.15 + Math.random() * 0.3);
        const vx = (fromRight ? -1 : 1) * (120 + Math.random() * 80);
        const gfx = this.add.graphics().setDepth(12);
        this.drawUfo(gfx);
        gfx.setPosition(x, y);
        this.ufo = { gfx, x, y, vx, shootTimer: 1500 + Math.random() * 1000, active: true };
    }
    drawUfo(gfx) {
        gfx.clear();
        const s = SHIP_SIZE * 1.2;
        // Dark shadow backdrop
        gfx.lineStyle(5, 0x000000, 0.5);
        gfx.strokeEllipse(0, 0, s * 2, s * 0.7);
        gfx.strokeEllipse(0, -s * 0.2, s, s * 0.5);
        // Outer glow (soft magenta)
        gfx.lineStyle(3, 0xff44ff, 0.25);
        gfx.strokeEllipse(0, 0, s * 2, s * 0.7);
        gfx.strokeEllipse(0, -s * 0.2, s, s * 0.5);
        // Solid
        gfx.lineStyle(2.5, 0xff88ff, 1);
        gfx.strokeEllipse(0, 0, s * 2, s * 0.7);
        gfx.strokeEllipse(0, -s * 0.2, s, s * 0.5);
    }
    updateUfo(dt, dtSec) {
        // Spawn timer
        if (!this.ufo) {
            this.ufoTimer -= dt;
            if (this.ufoTimer <= 0) {
                this.spawnUfo();
                this.ufoTimer = 15000 + Math.random() * 10000;
            }
            // Update UFO bullets even when no UFO
            this.updateUfoBullets(dtSec);
            return;
        }
        const u = this.ufo;
        u.x += u.vx * dtSec;
        u.gfx.setPosition(u.x, u.y);
        // Off-screen — remove
        if ((u.vx > 0 && u.x > W + 60) || (u.vx < 0 && u.x < -60)) {
            u.gfx.destroy();
            this.ufo = null;
            return;
        }
        // Shoot at player
        u.shootTimer -= dt;
        if (u.shootTimer <= 0 && this.shipAlive) {
            u.shootTimer = 1200 + Math.random() * 800;
            const angle = Math.atan2(this.shipY - u.y, this.shipX - u.x);
            const speed = 250;
            const bGfx = this.add.graphics().setDepth(8);
            bGfx.fillStyle(0x000000, 0.5);
            bGfx.fillCircle(0, 0, 9);
            bGfx.fillStyle(0xff44ff, 0.3);
            bGfx.fillCircle(0, 0, 7);
            bGfx.fillStyle(0xff88ff, 1);
            bGfx.fillCircle(0, 0, 3);
            bGfx.setPosition(u.x, u.y);
            this.ufoBullets.push({
                gfx: bGfx, x: u.x, y: u.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 3000,
            });
        }
        this.updateUfoBullets(dtSec);
    }
    updateUfoBullets(dtSec) {
        for (let i = this.ufoBullets.length - 1; i >= 0; i--) {
            const b = this.ufoBullets[i];
            b.x += b.vx * dtSec;
            b.y += b.vy * dtSec;
            b.life -= dtSec * 1000;
            b.gfx.setPosition(b.x, b.y);
            if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) {
                b.gfx.destroy();
                this.ufoBullets.splice(i, 1);
            }
        }
    }
    checkUfoCollisions() {
        if (!this.ufo)
            return;
        const u = this.ufo;
        // Player bullets vs UFO
        for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
            const b = this.bullets[bi];
            const dx = b.x - u.x;
            const dy = b.y - u.y;
            if (dx * dx + dy * dy < (SHIP_SIZE * 1.5) ** 2) {
                b.gfx.destroy();
                this.bullets.splice(bi, 1);
                this.addScore(500, u.x, u.y - 10);
                this.spawnExplosion(u.x, u.y);
                this.sound.play('sfx_zap', { volume: 0.4 });
                u.gfx.destroy();
                this.ufo = null;
                return;
            }
        }
        // UFO bullets vs player
        if (this.shipAlive && this.invincibleTimer <= 0) {
            for (let i = this.ufoBullets.length - 1; i >= 0; i--) {
                const b = this.ufoBullets[i];
                const dx = b.x - this.shipX;
                const dy = b.y - this.shipY;
                if (dx * dx + dy * dy < (SHIP_SIZE * 0.8) ** 2) {
                    b.gfx.destroy();
                    this.ufoBullets.splice(i, 1);
                    this.hitShip();
                    return;
                }
            }
        }
        // UFO body vs player
        if (this.shipAlive && this.invincibleTimer <= 0) {
            const dx = this.shipX - u.x;
            const dy = this.shipY - u.y;
            if (dx * dx + dy * dy < (SHIP_SIZE * 1.8) ** 2) {
                this.spawnExplosion(u.x, u.y);
                u.gfx.destroy();
                this.ufo = null;
                this.hitShip();
            }
        }
    }
    /* ================================================================
       WAVE SYSTEM
       ================================================================ */
    startWave() {
        this.wave++;
        this.syncLevelToHUD(this.wave);
        this.sound.play('sfx_twoTone', { volume: 0.3 });
        const count = INITIAL_ASTEROIDS + (this.wave - 1) * 2;
        // Aim the first 2 asteroids at the ship so the player must act quickly
        for (let i = 0; i < count; i++) {
            this.spawnAsteroid(0, undefined, undefined, i < 2);
        }
        this.showWaveBanner(this.wave);
    }
    /* ================================================================
       CLEANUP
       ================================================================ */
    shutdown() {
        super.shutdown();
        if (this.ufo) {
            this.ufo.gfx.destroy();
            this.ufo = null;
        }
        this.ufoBullets.forEach(b => b.gfx.destroy());
        this.ufoBullets = [];
        const banner = document.getElementById('wave-banner');
        if (banner)
            banner.remove();
    }
}
//# sourceMappingURL=CosmicRocks.js.map