// GalaxyBlaster — Galaga-style space shooter.
// Direct port of WesleyEdwards/galaga mechanics: manual position math,
// De Casteljau bezier smoothing, hop+figure-eight attack patterns.
// Phaser sprites used ONLY for rendering (setPosition, setRotation, destroy).
import { BaseScene, W, H } from './BaseScene.js';
function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
        a.y < b.y + b.h && a.y + a.h > b.y;
}
function computeDistance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
/* ------------------------------------------------------------------ */
/*  De Casteljau bezier — exact port from PathFollower.ts              */
/* ------------------------------------------------------------------ */
function getBezierPoint(t, points) {
    if (points.length === 1)
        return { x: points[0].x, y: points[0].y };
    const next = [];
    for (let i = 0; i < points.length - 1; i++) {
        next.push({
            x: (1 - t) * points[i].x + t * points[i + 1].x,
            y: (1 - t) * points[i].y + t * points[i + 1].y,
        });
    }
    return getBezierPoint(t, next);
}
function generatePointsOnBezierCurve(points, numOfPoints) {
    const bezierPoints = [];
    for (let i = 0; i <= numOfPoints; i++) {
        const t = i / numOfPoints;
        bezierPoints.push(getBezierPoint(t, points));
    }
    return bezierPoints;
}
const ENEMY_INFO = {
    bug: { tex: 'space', frame: 'enemyRed1.png', hp: 1, formPts: 50, divePts: 100 },
    drone: { tex: 'space', frame: 'enemyBlack4.png', hp: 1, formPts: 60, divePts: 120 },
    moth: { tex: 'space', frame: 'enemyBlue3.png', hp: 2, formPts: 80, divePts: 160 },
    scout: { tex: 'space', frame: 'enemyRed5.png', hp: 2, formPts: 90, divePts: 180 },
    heavy: { tex: 'space', frame: 'enemyBlue5.png', hp: 3, formPts: 120, divePts: 300 },
    boss: { tex: 'space', frame: 'enemyGreen2.png', hp: 4, formPts: 150, divePts: 400 },
    commander: { tex: 'space', frame: 'enemyGreen2.png', hp: 2, formPts: 250, divePts: 500 },
};
function waveDef(n) {
    const cycle = ((n - 1) % 5) + 1;
    const tier = Math.floor((n - 1) / 5);
    const extra = tier;
    const cmds = n >= 2 ? Math.min(1 + Math.floor(n / 4), 2) : 0;
    if (cycle === 1)
        return { bugs: 8 + extra, drones: 0, moths: 0, scouts: 0, heavies: 0, bosses: 0, commanders: cmds };
    if (cycle === 2)
        return { bugs: 4 + extra, drones: 4, moths: 0, scouts: 0, heavies: 0, bosses: 0, commanders: cmds };
    if (cycle === 3)
        return { bugs: 4, drones: 2, moths: 4 + extra, scouts: 0, heavies: 0, bosses: 0, commanders: cmds };
    if (cycle === 4)
        return { bugs: 3, drones: 2, moths: 2, scouts: 2 + extra, heavies: 2, bosses: 0, commanders: cmds };
    return { bugs: 3, drones: 2, moths: 2, scouts: 2, heavies: 1 + extra, bosses: 2, commanders: cmds };
}
/* ------------------------------------------------------------------ */
/*  Constants — ref uses 500×500 design grid                           */
/*  Recalculated in create() to pick up correct W/H after Tauri resize */
/* ------------------------------------------------------------------ */
let CONV_X = W / 500;
let CONV_Y = H / 500;
let SCALE = Math.min(CONV_X, CONV_Y);
let OPPONENT_SIZE = Math.min(32 * SCALE, W / 35);
let ENTRY_SPEED = 0.4 * SCALE; // px/ms
let ATTACK_SPEED = 0.3 * SCALE; // px/ms
const ENTRANCE_INTERVAL = 100; // ms between spawns in a trail
let SHIP_SPEED = 0.25 * 1000 * SCALE;
let BULLET_SPEED = 0.45 * 1000 * SCALE;
const MAX_BULLETS = 3;
let ENEMY_BULLET_SPEED = 0.3 * 1000 * SCALE;
const BASE_MAX_DIVERS = 4;
const MAX_ENEMY_BULLETS = 3; // authentic Galaga: max 3 enemy bullets on screen
/* Formation: 5 rows × 10 cols, centered, in design coords scaled to screen */
const FORM_COLS = 10;
const FORM_ROWS = 5;
let COL_SPACING = OPPONENT_SIZE + 10 * CONV_X;
function formationSlot(row, col) {
    const totalW = (FORM_COLS - 1) * COL_SPACING;
    const startX = (W - totalW) / 2;
    return {
        x: startX + col * COL_SPACING,
        y: (row + 1) * OPPONENT_SIZE,
    };
}
/* Build full grid: row 0 = bosses, 1-2 = moths, 3-4 = bugs */
function buildFormationGrid() {
    const slots = [];
    for (let r = 0; r < FORM_ROWS; r++) {
        for (let c = 0; c < FORM_COLS; c++) {
            slots.push(formationSlot(r, c));
        }
    }
    return slots;
}
/* ------------------------------------------------------------------ */
/*  Entry path generation (ref waveOneInfo.ts style)                   */
/* ------------------------------------------------------------------ */
/** Bee-style entry: top-center, swoop through bottom-left, spiral up */
function beeEntryControlPoints(targetX, targetY, mirror) {
    const s = mirror ? -1 : 1;
    const cx = CONV_X;
    const cy = CONV_Y;
    return [
        { x: 300 * cx, y: -32 * cy },
        { x: (300 + s * 30) * cx, y: 50 * cy },
        { x: (300 + s * 80) * cx, y: 130 * cy },
        { x: (250 + s * 150) * cx, y: 220 * cy },
        { x: (250 + s * 180) * cx, y: 290 * cy },
        { x: (250 + s * 140) * cx, y: 340 * cy },
        { x: (250 + s * 80) * cx, y: 330 * cy },
        { x: (250 + s * 20) * cx, y: 300 * cy },
        { x: (250 - s * 30) * cx, y: 260 * cy },
        { x: (250 - s * 50) * cx, y: 210 * cy },
        { x: (250 - s * 30) * cx, y: 170 * cy },
        { x: targetX, y: targetY },
    ];
}
/** Moth-style entry: top-center other side, swoop through bottom-right, spiral up */
function mothEntryControlPoints(targetX, targetY, mirror) {
    const s = mirror ? -1 : 1;
    const cx = CONV_X;
    const cy = CONV_Y;
    return [
        { x: 200 * cx, y: -32 * cy },
        { x: (200 - s * 30) * cx, y: 50 * cy },
        { x: (200 - s * 80) * cx, y: 130 * cy },
        { x: (250 - s * 150) * cx, y: 220 * cy },
        { x: (250 - s * 180) * cx, y: 290 * cy },
        { x: (250 - s * 140) * cx, y: 340 * cy },
        { x: (250 - s * 80) * cx, y: 330 * cy },
        { x: (250 - s * 20) * cx, y: 300 * cy },
        { x: (250 + s * 30) * cx, y: 260 * cy },
        { x: (250 + s * 50) * cx, y: 210 * cy },
        { x: (250 + s * 30) * cx, y: 170 * cy },
        { x: targetX, y: targetY },
    ];
}
/** Boss entry: center spiral down */
function bossEntryControlPoints(targetX, targetY, mirror) {
    const s = mirror ? -1 : 1;
    const cx = CONV_X;
    const cy = CONV_Y;
    return [
        { x: 250 * cx, y: -32 * cy },
        { x: (250 + s * 60) * cx, y: 40 * cy },
        { x: (250 + s * 120) * cx, y: 120 * cy },
        { x: (250 + s * 100) * cx, y: 200 * cy },
        { x: (250 + s * 40) * cx, y: 280 * cy },
        { x: (250 - s * 30) * cx, y: 330 * cy },
        { x: (250 - s * 80) * cx, y: 310 * cy },
        { x: (250 - s * 60) * cx, y: 260 * cy },
        { x: (250 - s * 20) * cx, y: 200 * cy },
        { x: (250 + s * 10) * cx, y: 150 * cy },
        { x: targetX, y: targetY },
    ];
}
/** Side-sweep entry for variety */
function sideEntryControlPoints(targetX, targetY, fromRight) {
    const cx = CONV_X;
    const cy = CONV_Y;
    const sx = fromRight ? 530 * cx : -30 * cx;
    const mid = 250 * cx;
    return [
        { x: sx, y: 200 * cy },
        { x: fromRight ? 420 * cx : 80 * cx, y: 150 * cy },
        { x: fromRight ? 350 * cx : 150 * cx, y: 100 * cy },
        { x: mid, y: 80 * cy },
        { x: fromRight ? 150 * cx : 350 * cx, y: 120 * cy },
        { x: fromRight ? 100 * cx : 400 * cx, y: 200 * cy },
        { x: fromRight ? 80 * cx : 420 * cx, y: 280 * cy },
        { x: fromRight ? 120 * cx : 380 * cx, y: 330 * cy },
        { x: fromRight ? 200 * cx : 300 * cx, y: 310 * cy },
        { x: mid, y: 260 * cy },
        { x: targetX, y: targetY },
    ];
}
/** Bottom-loop entry for variety */
function bottomLoopControlPoints(targetX, targetY, fromRight) {
    const cx = CONV_X;
    const cy = CONV_Y;
    const sx = fromRight ? 530 * cx : -30 * cx;
    return [
        { x: sx, y: 250 * cy },
        { x: fromRight ? 400 * cx : 100 * cx, y: 300 * cy },
        { x: fromRight ? 350 * cx : 150 * cx, y: 340 * cy },
        { x: 250 * cx, y: 340 * cy },
        { x: fromRight ? 150 * cx : 350 * cx, y: 320 * cy },
        { x: fromRight ? 100 * cx : 400 * cx, y: 280 * cy },
        { x: fromRight ? 80 * cx : 420 * cx, y: 230 * cy },
        { x: fromRight ? 120 * cx : 380 * cx, y: 170 * cy },
        { x: 250 * cx, y: 130 * cy },
        { x: targetX, y: targetY },
    ];
}
/* ------------------------------------------------------------------ */
/*  Attack path — exact port from AttackPatterns.ts                    */
/* ------------------------------------------------------------------ */
function hop(currPos, path) {
    const cx = CONV_X;
    const cy = CONV_Y;
    // 8 points: move up then arc right (in design coords scaled)
    path.push({ x: currPos.x, y: currPos.y });
    path.push({ x: currPos.x + 5 * cx, y: currPos.y - 10 * cy });
    path.push({ x: currPos.x + 10 * cx, y: currPos.y - 25 * cy });
    path.push({ x: currPos.x + 15 * cx, y: currPos.y - 40 * cy });
    path.push({ x: currPos.x + 25 * cx, y: currPos.y - 50 * cy });
    path.push({ x: currPos.x + 35 * cx, y: currPos.y - 45 * cy });
    path.push({ x: currPos.x + 40 * cx, y: currPos.y - 30 * cy });
    path.push({ x: currPos.x + 35 * cx, y: currPos.y - 15 * cy });
}
function leftAttackPattern(path) {
    const cx = CONV_X;
    const cy = CONV_Y;
    const last = path[path.length - 1];
    const bx = last.x;
    const by = last.y;
    // Wide figure-eight pattern (~30 points) — convX/convY scaled
    path.push({ x: bx + 20 * cx, y: by + 10 * cy });
    path.push({ x: bx + 40 * cx, y: by + 30 * cy });
    path.push({ x: bx + 60 * cx, y: by + 60 * cy });
    path.push({ x: bx + 80 * cx, y: by + 100 * cy });
    path.push({ x: bx + 90 * cx, y: by + 140 * cy });
    path.push({ x: bx + 85 * cx, y: by + 180 * cy });
    path.push({ x: bx + 70 * cx, y: by + 210 * cy });
    path.push({ x: bx + 45 * cx, y: by + 230 * cy });
    path.push({ x: bx + 15 * cx, y: by + 235 * cy });
    path.push({ x: bx - 15 * cx, y: by + 225 * cy });
    path.push({ x: bx - 40 * cx, y: by + 200 * cy });
    path.push({ x: bx - 55 * cx, y: by + 170 * cy });
    path.push({ x: bx - 60 * cx, y: by + 135 * cy });
    path.push({ x: bx - 55 * cx, y: by + 100 * cy });
    path.push({ x: bx - 40 * cx, y: by + 70 * cy });
    path.push({ x: bx - 20 * cx, y: by + 50 * cy });
    path.push({ x: bx, y: by + 40 * cy });
    path.push({ x: bx + 20 * cx, y: by + 50 * cy });
    path.push({ x: bx + 45 * cx, y: by + 70 * cy });
    path.push({ x: bx + 65 * cx, y: by + 100 * cy });
    path.push({ x: bx + 75 * cx, y: by + 135 * cy });
    path.push({ x: bx + 70 * cx, y: by + 170 * cy });
    path.push({ x: bx + 55 * cx, y: by + 200 * cy });
    path.push({ x: bx + 30 * cx, y: by + 220 * cy });
    path.push({ x: bx, y: by + 230 * cy });
    path.push({ x: bx - 30 * cx, y: by + 220 * cy });
    path.push({ x: bx - 55 * cx, y: by + 195 * cy });
    path.push({ x: bx - 70 * cx, y: by + 160 * cy });
    path.push({ x: bx - 75 * cx, y: by + 120 * cy });
    path.push({ x: bx - 65 * cx, y: by + 80 * cy });
    path.push({ x: bx - 40 * cx, y: by + 50 * cy });
    path.push({ x: bx - 10 * cx, y: by + 30 * cy });
}
function rightAttackPattern(path) {
    const cx = CONV_X;
    const cy = CONV_Y;
    const last = path[path.length - 1];
    const bx = last.x;
    const by = last.y;
    // Mirror of left pattern
    path.push({ x: bx - 20 * cx, y: by + 10 * cy });
    path.push({ x: bx - 40 * cx, y: by + 30 * cy });
    path.push({ x: bx - 60 * cx, y: by + 60 * cy });
    path.push({ x: bx - 80 * cx, y: by + 100 * cy });
    path.push({ x: bx - 90 * cx, y: by + 140 * cy });
    path.push({ x: bx - 85 * cx, y: by + 180 * cy });
    path.push({ x: bx - 70 * cx, y: by + 210 * cy });
    path.push({ x: bx - 45 * cx, y: by + 230 * cy });
    path.push({ x: bx - 15 * cx, y: by + 235 * cy });
    path.push({ x: bx + 15 * cx, y: by + 225 * cy });
    path.push({ x: bx + 40 * cx, y: by + 200 * cy });
    path.push({ x: bx + 55 * cx, y: by + 170 * cy });
    path.push({ x: bx + 60 * cx, y: by + 135 * cy });
    path.push({ x: bx + 55 * cx, y: by + 100 * cy });
    path.push({ x: bx + 40 * cx, y: by + 70 * cy });
    path.push({ x: bx + 20 * cx, y: by + 50 * cy });
    path.push({ x: bx, y: by + 40 * cy });
    path.push({ x: bx - 20 * cx, y: by + 50 * cy });
    path.push({ x: bx - 45 * cx, y: by + 70 * cy });
    path.push({ x: bx - 65 * cx, y: by + 100 * cy });
    path.push({ x: bx - 75 * cx, y: by + 135 * cy });
    path.push({ x: bx - 70 * cx, y: by + 170 * cy });
    path.push({ x: bx - 55 * cx, y: by + 200 * cy });
    path.push({ x: bx - 30 * cx, y: by + 220 * cy });
    path.push({ x: bx, y: by + 230 * cy });
    path.push({ x: bx + 30 * cx, y: by + 220 * cy });
    path.push({ x: bx + 55 * cx, y: by + 195 * cy });
    path.push({ x: bx + 70 * cx, y: by + 160 * cy });
    path.push({ x: bx + 75 * cx, y: by + 120 * cy });
    path.push({ x: bx + 65 * cx, y: by + 80 * cy });
    path.push({ x: bx + 40 * cx, y: by + 50 * cy });
    path.push({ x: bx + 10 * cx, y: by + 30 * cy });
}
function getAttackPath(currPos) {
    const path = [];
    hop(currPos, path);
    if (currPos.x < W / 2) {
        leftAttackPattern(path);
    }
    else {
        rightAttackPattern(path);
    }
    path.push({ x: currPos.x, y: currPos.y }); // return to formation
    // Scale the dive deeper so enemies reach the player's zone.
    // Find how deep the pattern goes vs how deep it SHOULD go (near the ship).
    const targetY = H - OPPONENT_SIZE * 4; // just above the player ship
    let maxY = -Infinity;
    for (const p of path) {
        if (p.y > maxY)
            maxY = p.y;
    }
    if (maxY > currPos.y && maxY < targetY) {
        const yScale = (targetY - currPos.y) / (maxY - currPos.y);
        for (const p of path) {
            if (p !== path[path.length - 1]) { // don't scale the return-to-formation point
                p.y = currPos.y + (p.y - currPos.y) * yScale;
            }
        }
    }
    return generatePointsOnBezierCurve(path, 75);
}
/* ================================================================== */
/*  SCENE                                                              */
/* ================================================================== */
export class GalaxyBlasterScene extends BaseScene {
    /* player */
    ship;
    shipX = W / 2;
    shipVx = 0;
    shipY = H - OPPONENT_SIZE * 3;
    bullets = [];
    invincible = 0;
    /* shield */
    shieldActive = false;
    shieldSprite;
    shieldPickups = [];
    /* dual-shot power-up */
    dualShot = false;
    dualShotTimer = 0;
    dualShotPickups = [];
    dualShotGlow;
    normalShipWidth = 0;
    normalShipHeight = 0;
    /* enemies */
    enemies = [];
    enemyBullets = [];
    formation = [];
    enemyOffset = -50 * CONV_X;
    driftDirection = 1;
    driftTimer = 0;
    allStationary = false;
    breatheTimer = 0;
    breathePhase = 'breathe-in';
    attackTimer = 0;
    offsetLerping = false;
    /* wave / spawn */
    wave = 0;
    waveDelay = 0;
    spawnQueue = [];
    spawnTimer = 0;
    waveTextSprite = null;
    /* starfield */
    stars = [];
    /* input */
    cursors;
    spaceKey;
    spaceWasDown = false;
    /* meteors */
    meteors = [];
    meteorTimer = 0;
    /* game over */
    gameOver = false;
    constructor() { super('galaxy-blaster'); }
    get displayName() { return 'Galaxy Blaster'; }
    getDescription() {
        return 'Battle alien formations in deep space. Clear each wave to advance!';
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
        this.load.atlasXML('space', '../assets/galaxy-blaster/space_sheet-2.png', '../assets/galaxy-blaster/space_sheet-2.xml');
        this.load.image('space_bg', '../assets/galaxy-blaster/space_bg.png');
        this.load.audio('sfx_laser', '../assets/galaxy-blaster/sounds/sfx_laser1.ogg');
        this.load.audio('sfx_zap', '../assets/galaxy-blaster/sounds/sfx_explosion.ogg');
        this.load.audio('sfx_lose', '../assets/galaxy-blaster/sounds/sfx_lose.ogg');
        this.load.audio('sfx_shieldUp', '../assets/galaxy-blaster/sounds/sfx_shieldUp.ogg');
        this.load.audio('sfx_shieldDown', '../assets/galaxy-blaster/sounds/sfx_shieldDown.ogg');
        this.load.audio('sfx_twoTone', '../assets/galaxy-blaster/sounds/sfx_twoTone.ogg');
    }
    create() {
        this.initBase();
        // Recalculate screen-dependent constants now that W/H are correct
        CONV_X = W / 500;
        CONV_Y = H / 500;
        SCALE = Math.min(CONV_X, CONV_Y);
        OPPONENT_SIZE = Math.min(32 * SCALE, W / 35);
        ENTRY_SPEED = 0.4 * SCALE;
        ATTACK_SPEED = 0.3 * SCALE;
        SHIP_SPEED = 0.25 * 1000 * SCALE;
        BULLET_SPEED = 0.45 * 1000 * SCALE;
        ENEMY_BULLET_SPEED = 0.3 * 1000 * SCALE;
        COL_SPACING = OPPONENT_SIZE + 10 * CONV_X;
        this.score = 0;
        this.lives = 3;
        this.wave = 0;
        this.waveDelay = 0;
        this.enemies = [];
        this.bullets = [];
        this.enemyBullets = [];
        this.spawnQueue = [];
        this.activeEmitters = [];
        this.enemyOffset = -50 * CONV_X;
        this.driftDirection = 1;
        this.driftTimer = 0;
        this.allStationary = false;
        this.breatheTimer = 0;
        this.breathePhase = 'breathe-in';
        this.attackTimer = 0;
        this.offsetLerping = false;
        this.invincible = 0;
        this.gameOver = false;
        this.shipX = W / 2;
        this.shipVx = 0;
        this.shieldActive = false;
        if (this.shieldSprite && this.shieldSprite.active) {
            this.shieldSprite.destroy();
            this.shieldSprite = undefined;
        }
        this.shieldPickups.forEach(p => { if (p.sprite && p.sprite.active)
            p.sprite.destroy(); });
        this.shieldPickups = [];
        this.meteors.forEach(m => { if (m.sprite && m.sprite.active)
            m.sprite.destroy(); });
        this.meteors = [];
        this.meteorTimer = 0;
        this.ensureSparkTexture();
        this.createGalaxyStarfield();
        this.formation = buildFormationGrid();
        this.ship = this.add.sprite(this.shipX, this.shipY, 'space', 'playerShip1_blue.png').setDepth(10);
        this.ship.setDisplaySize(OPPONENT_SIZE * 1.2, OPPONENT_SIZE * 0.9);
        this.normalShipWidth = OPPONENT_SIZE * 1.2;
        this.normalShipHeight = OPPONENT_SIZE * 0.9;
        this.dualShot = false;
        this.dualShotTimer = 0;
        this.dualShotPickups = [];
        this.dualShotGlow = undefined;
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey('SPACE');
        this.spaceWasDown = false;
        this.syncLivesToHUD();
        this.syncLevelToHUD(this.wave);
        this.syncScoreToHUD();
        this.loadHighScore();
        this.startWithReadyScreen(() => this.startWave());
    }
    update(_t, dtMs) {
        if (this.gameOver)
            return;
        const dt = Math.min(dtMs, 33);
        this.updateGalaxyStarfield(dt);
        this.updateShip(dt);
        this.updateBullets(dt);
        this.updateEnemies(dt);
        this.updateEnemyBullets(dt);
        this.checkCollisions();
        this.updateShieldPickups(dt);
        this.updateDualShotPickups(dt);
        this.updateDualShot(dt);
        this.updateMeteors(dt);
        this.updateWave(dt);
    }
    /* ================================================================
       STARFIELD
       ================================================================ */
    createGalaxyStarfield() {
        const bgTile = 256;
        const cols = Math.ceil(W / bgTile) + 1;
        const rows = Math.ceil(H / bgTile) + 1;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                this.add.image(c * bgTile + bgTile / 2, r * bgTile + bgTile / 2, 'space_bg')
                    .setAlpha(0.25)
                    .setDepth(-10);
            }
        }
        this.stars = this.createStarfield([
            { count: 30, speed: 20, size: 1, alpha: 0.3 },
            { count: 20, speed: 40, size: 1.5, alpha: 0.4 },
            { count: 15, speed: 70, size: 2, alpha: 0.5 },
        ]);
    }
    updateGalaxyStarfield(dt) {
        this.updateStarfield(this.stars, dt);
    }
    /* ================================================================
       WAVE SYSTEM
       ================================================================ */
    startWave() {
        this.wave++;
        this.syncLevelToHUD(this.wave);
        const def = waveDef(this.wave);
        this.spawnQueue = [];
        const usedSlots = new Set(this.enemies.map(e => {
            // Find slot index from resting pos
            for (let i = 0; i < this.formation.length; i++) {
                if (this.formation[i].x === e.restingPosX && this.formation[i].y === e.restingPosY)
                    return i;
            }
            return -1;
        }));
        // Determine which entry path style based on wave for variety
        const waveStyle = (this.wave - 1) % 5;
        // Helper: find next free slot in given rows
        const findSlot = (preferredRows) => {
            for (const row of preferredRows) {
                for (let c = 0; c < FORM_COLS; c++) {
                    const idx = row * FORM_COLS + c;
                    if (!usedSlots.has(idx)) {
                        usedSlots.add(idx);
                        return idx;
                    }
                }
            }
            // Fallback: any free slot
            for (let i = 0; i < this.formation.length; i++) {
                if (!usedSlots.has(i)) {
                    usedSlots.add(i);
                    return i;
                }
            }
            return -1;
        };
        // Build trails: bosses → moths → bugs, each group with its own entry curve
        const addTrail = (kind, count, rows, pathFn, mirror) => {
            for (let i = 0; i < count; i++) {
                const slotIdx = findSlot(rows);
                if (slotIdx === -1)
                    continue;
                const target = this.formation[slotIdx];
                const controlPts = pathFn(target.x, target.y, mirror);
                const entryPath = generatePointsOnBezierCurve(controlPts, 25);
                this.spawnQueue.push({ kind, entryPath, slotIdx });
            }
        };
        // Pick entry curve variants based on wave style
        if (def.bosses > 0) {
            addTrail('boss', def.bosses, [0], bossEntryControlPoints, waveStyle % 2 === 1);
        }
        if (def.heavies > 0) {
            addTrail('heavy', def.heavies, [0, 1], sideEntryControlPoints, waveStyle % 2 === 0);
        }
        if (def.moths > 0) {
            const mothPath = waveStyle >= 3 ? sideEntryControlPoints : mothEntryControlPoints;
            addTrail('moth', def.moths, [1, 2], mothPath, waveStyle % 2 === 0);
        }
        if (def.scouts > 0) {
            addTrail('scout', def.scouts, [2, 3], bottomLoopControlPoints, waveStyle % 2 === 1);
        }
        if (def.drones > 0) {
            addTrail('drone', def.drones, [3, 4], beeEntryControlPoints, waveStyle % 2 === 0);
        }
        if (def.bugs > 0) {
            const bugPath = waveStyle >= 4 ? bottomLoopControlPoints : beeEntryControlPoints;
            addTrail('bug', def.bugs, [3, 4], bugPath, waveStyle % 2 === 1);
        }
        if (def.commanders > 0) {
            addTrail('commander', def.commanders, [1, 2], sideEntryControlPoints, waveStyle % 2 === 0);
        }
        this.spawnTimer = 0;
        this.attackTimer = 0;
        this.enemyOffset = -50 * CONV_X;
        this.driftDirection = 1;
        this.driftTimer = 0;
        this.allStationary = false;
        this.offsetLerping = false;
        // Clean up old wave text sprite if any
        if (this.waveTextSprite) {
            this.tweens.killTweensOf(this.waveTextSprite);
            this.waveTextSprite.destroy();
            this.waveTextSprite = null;
        }
        this.showWaveBanner(this.wave);
    }
    updateWave(dt) {
        // Spawn queued enemies with entrance interval timing
        if (this.spawnQueue.length > 0) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                const next = this.spawnQueue.shift();
                this.spawnEnemy(next.kind, next.entryPath, next.slotIdx);
                this.spawnTimer = ENTRANCE_INTERVAL;
            }
        }
        // Next wave when all enemies gone and spawn queue empty
        if (this.enemies.length === 0 && this.spawnQueue.length === 0) {
            this.waveDelay -= dt;
            if (this.waveDelay <= 0) {
                this.waveDelay = 1500;
                this.sound.play('sfx_twoTone', { volume: 0.3 });
                this.startWave();
            }
        }
        else {
            this.waveDelay = 1500;
        }
    }
    /* ================================================================
       ENEMY SPAWN — manual path following, NO PathFollower
       ================================================================ */
    spawnEnemy(kind, entryPath, slotIdx) {
        const info = ENEMY_INFO[kind];
        const startPos = entryPath[0];
        const target = this.formation[slotIdx];
        const sprite = this.add.sprite(startPos.x, startPos.y, info.tex, info.frame).setDepth(5);
        sprite.setDisplaySize(OPPONENT_SIZE, OPPONENT_SIZE * 0.85);
        if (kind === 'commander')
            sprite.setTint(0xffd700);
        const e = {
            sprite,
            kind,
            hp: info.hp,
            pos: { x: startPos.x, y: startPos.y },
            restingPosX: target.x,
            restingPosY: target.y,
            state: 'entrance',
            secondaryState: 'breathe-in',
            activePath: entryPath,
            pathIndex: 0,
            speed: ENTRY_SPEED,
            breathTimer: 0,
            breathingOffsetX: 0,
            breathingOffsetY: 0,
            attackPath: [],
            shotsFired: 0,
            shotTimer: 0,
        };
        this.enemies.push(e);
    }
    /* ================================================================
       followPath — exact port from Opponent.ts
       ================================================================ */
    followPath(e, dt, onCompletion) {
        if (e.pathIndex >= e.activePath.length - 1)
            return;
        let distTraveled = e.speed * dt;
        // Consume distance through multiple waypoints if needed (handles lag spikes)
        let distRemaining = computeDistance(e.pos, e.activePath[e.pathIndex + 1]);
        while (distTraveled > distRemaining && e.pathIndex < e.activePath.length - 1) {
            distTraveled -= distRemaining;
            e.pos.x = e.activePath[e.pathIndex + 1].x;
            e.pos.y = e.activePath[e.pathIndex + 1].y;
            e.pathIndex++;
            if (e.pathIndex < e.activePath.length - 1) {
                distRemaining = computeDistance(e.pos, e.activePath[e.pathIndex + 1]);
            }
        }
        if (e.pathIndex < e.activePath.length - 1) {
            let dirX = e.activePath[e.pathIndex + 1].x - e.pos.x;
            let dirY = e.activePath[e.pathIndex + 1].y - e.pos.y;
            const dirMag = Math.sqrt(dirX * dirX + dirY * dirY);
            if (dirMag > 0.001) {
                dirX /= dirMag;
                dirY /= dirMag;
                e.pos.x += distTraveled * dirX;
                e.pos.y += distTraveled * dirY;
            }
        }
        else {
            onCompletion();
        }
    }
    /* ================================================================
       UPDATE ENEMIES — exact port of state machine
       ================================================================ */
    updateEnemies(dt) {
        const dtScale = dt / 16.67; // frame-rate independence (ref ~60fps)
        // Determine whether all enemies have finished entering
        const hasEntering = this.enemies.some(e => e.state === 'entrance');
        const wasAllStationary = this.allStationary;
        this.allStationary = !hasEntering && this.spawnQueue.length === 0 && this.enemies.length > 0;
        if (!this.allStationary) {
            // Phase 1: Drifting (before breathing starts)
            this.driftTimer += dt;
            if (this.driftTimer >= 2000) {
                this.driftTimer -= 2000;
                this.driftDirection *= -1;
            }
            this.enemyOffset += this.driftDirection * 0.05 * CONV_X * dt;
        }
        else {
            // Phase 2: Lerp enemyOffset to 0, then start breathing
            if (!wasAllStationary) {
                this.offsetLerping = true;
            }
            if (this.offsetLerping) {
                const lerpRate = 0.05 * CONV_X * dt;
                if (Math.abs(this.enemyOffset) <= lerpRate) {
                    this.enemyOffset = 0;
                    this.offsetLerping = false;
                    this.breathePhase = 'breathe-in';
                    this.breatheTimer = 0;
                    for (const e of this.enemies) {
                        if (e.state === 'stationary') {
                            e.state = 'breathe-in';
                            e.breathingOffsetX = 0;
                            e.breathingOffsetY = 0;
                        }
                    }
                }
                else {
                    this.enemyOffset -= Math.sign(this.enemyOffset) * lerpRate;
                }
            }
            else {
                this.breatheTimer += dt;
                if (this.breatheTimer >= 2000) {
                    this.breatheTimer -= 2000;
                    this.breathePhase = this.breathePhase === 'breathe-in' ? 'breathe-out' : 'breathe-in';
                    for (const e of this.enemies) {
                        if (e.state === 'breathe-in' || e.state === 'breathe-out') {
                            e.state = this.breathePhase;
                        }
                        if (e.state === 'attack') {
                            e.secondaryState = this.breathePhase;
                        }
                    }
                }
            }
        }
        // Attack coordination: scale max divers with wave (4 base, +1 per 2 waves, cap at 8)
        const maxDivers = Math.min(BASE_MAX_DIVERS + Math.floor((this.wave - 1) / 2), 8);
        this.attackTimer += dt;
        if (this.attackTimer >= 600) {
            this.attackTimer -= 600;
            const attackers = this.enemies.filter(e => e.state === 'attack').length;
            if (attackers < maxDivers) {
                this.triggerDive();
            }
        }
        // Update each enemy
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (e.state === 'entrance') {
                this.followPath(e, dt, () => {
                    e.pos.x = e.restingPosX + this.enemyOffset;
                    e.pos.y = e.restingPosY;
                    e.state = 'stationary';
                });
            }
            else if (e.state === 'stationary') {
                e.pos.x = e.restingPosX + this.enemyOffset;
                e.pos.y = e.restingPosY;
            }
            else if (e.state === 'breathe-in' || e.state === 'breathe-out') {
                const dir = e.state === 'breathe-in' ? 1 : -1;
                e.breathingOffsetX += dir * ((e.restingPosX - W / 2) / (W / 2)) * 0.3 * dtScale;
                e.breathingOffsetY += dir * (e.restingPosY / (H / 2)) * 0.4 * dtScale;
                const maxOff = OPPONENT_SIZE * 1.5;
                e.breathingOffsetX = Math.max(-maxOff, Math.min(maxOff, e.breathingOffsetX));
                e.breathingOffsetY = Math.max(-maxOff, Math.min(maxOff, e.breathingOffsetY));
                e.pos.x = e.restingPosX + e.breathingOffsetX;
                e.pos.y = e.restingPosY + e.breathingOffsetY;
            }
            else if (e.state === 'attack') {
                // Continue breathing independently via secondaryState
                if (e.secondaryState === 'breathe-in' || e.secondaryState === 'breathe-out') {
                    const dir = e.secondaryState === 'breathe-in' ? 1 : -1;
                    e.breathingOffsetX += dir * ((e.restingPosX - W / 2) / (W / 2)) * 0.3 * dtScale;
                    e.breathingOffsetY += dir * (e.restingPosY / (H / 2)) * 0.4 * dtScale;
                }
                // activePath is set to attackPath when dive starts
                this.followPath(e, dt, () => {
                    // Attack complete — return to formation / breathing state
                    e.pos.x = e.restingPosX + e.breathingOffsetX;
                    e.pos.y = e.restingPosY + e.breathingOffsetY;
                    e.state = (e.secondaryState === 'breathe-in' || e.secondaryState === 'breathe-out')
                        ? e.secondaryState
                        : (this.allStationary ? this.breathePhase : 'stationary');
                    e.activePath = [];
                    e.pathIndex = 0;
                    e.shotsFired = 0;
                    e.shotTimer = 0;
                });
                // Shooting during attack: fire on start, then every ~1200ms during dive
                if (e.state === 'attack') {
                    e.shotTimer += dt;
                    if (e.shotsFired >= 1 && e.shotTimer >= 400 + (e.shotsFired - 1) * 1200) {
                        this.fireEnemyBullet(e.pos.x, e.pos.y);
                        e.shotsFired++;
                    }
                }
            }
            // Rendering: position sprite from manual pos
            e.sprite.setPosition(e.pos.x + OPPONENT_SIZE / 2, e.pos.y + OPPONENT_SIZE / 2);
            // Rotation from path direction
            if ((e.state === 'entrance' || e.state === 'attack') && e.pathIndex < e.activePath.length - 1) {
                const next = e.activePath[e.pathIndex + 1];
                e.sprite.setRotation(Math.atan2(next.y - e.pos.y, next.x - e.pos.x) + Math.PI / 2);
            }
            else {
                e.sprite.setRotation(0);
            }
        }
    }
    /* ================================================================
       ATTACK DIVE
       ================================================================ */
    triggerDive() {
        const candidates = this.enemies.filter(e => e.state === 'stationary' || e.state === 'breathe-in' || e.state === 'breathe-out');
        if (candidates.length === 0)
            return;
        const e = candidates[Math.floor(Math.random() * candidates.length)];
        if (e.state === 'entrance')
            return; // guard against race condition
        // Remember breathing state as secondary so it continues independently
        if (e.state === 'breathe-in' || e.state === 'breathe-out') {
            e.secondaryState = e.state;
        }
        else {
            e.secondaryState = this.breathePhase;
        }
        e.state = 'attack';
        const atkPath = getAttackPath({ x: e.pos.x, y: e.pos.y });
        e.attackPath = atkPath;
        e.activePath = atkPath;
        e.pathIndex = 0;
        e.speed = ATTACK_SPEED;
        // Fire 1 bullet immediately on attack start
        this.fireEnemyBullet(e.pos.x, e.pos.y);
        e.shotsFired = 1;
        e.shotTimer = 0;
    }
    fireEnemyBullet(x, y) {
        // Cap on-screen enemy bullets (authentic Galaga: max 3)
        if (this.enemyBullets.length >= MAX_ENEMY_BULLETS)
            return;
        // Don't fire if enemy is below or at the player's level
        if (y >= this.shipY)
            return;
        // Galaga-authentic: bullets go nearly straight down with discrete
        // 3-direction aiming (straight, slight-left, slight-right).
        const dx = this.shipX - x;
        const horizontalBias = 0.18;
        let vx = 0;
        if (dx < -OPPONENT_SIZE)
            vx = -ENEMY_BULLET_SPEED * horizontalBias;
        else if (dx > OPPONENT_SIZE)
            vx = ENEMY_BULLET_SPEED * horizontalBias;
        const vy = ENEMY_BULLET_SPEED;
        const sprite = this.add.sprite(x, y + 8, 'space', 'laserRed01.png').setDepth(5);
        sprite.setDisplaySize(OPPONENT_SIZE * 0.15, OPPONENT_SIZE * 0.5);
        this.enemyBullets.push({ sprite, vx, vy });
    }
    /* ================================================================
       SHIP
       ================================================================ */
    updateShip(dt) {
        if (this.invincible > 0) {
            this.invincible -= dt;
            this.ship.setAlpha(Math.sin(this.invincible * 0.02) > 0 ? 1 : 0.3);
            if (this.invincible <= 0)
                this.ship.setAlpha(1);
        }
        const left = this.cursors.left.isDown;
        const right = this.cursors.right.isDown;
        const accel = SHIP_SPEED * 4; // accelerate to full speed quickly
        const friction = 0.88; // smooth deceleration when no key held
        if (left)
            this.shipVx -= accel * (dt / 1000);
        if (right)
            this.shipVx += accel * (dt / 1000);
        if (!left && !right)
            this.shipVx *= friction;
        // Clamp velocity
        this.shipVx = Math.max(-SHIP_SPEED, Math.min(SHIP_SPEED, this.shipVx));
        if (Math.abs(this.shipVx) < 1)
            this.shipVx = 0;
        this.shipX += this.shipVx * (dt / 1000);
        this.shipX = Math.max(10, Math.min(W - 10, this.shipX));
        this.ship.setPosition(this.shipX, this.shipY);
        if (this.shieldSprite && this.shieldActive) {
            this.shieldSprite.setPosition(this.shipX, this.shipY);
            this.shieldSprite.setAlpha(0.4 + Math.sin(this.time.now / 200) * 0.2);
        }
        // fire (edge-detect)
        const spaceDown = this.spaceKey.isDown;
        if (spaceDown && !this.spaceWasDown && this.bullets.length < MAX_BULLETS) {
            if (this.dualShot) {
                // Dual shot — fire two parallel bullets
                const offset = this.normalShipWidth * 0.3;
                const s1 = this.add.sprite(this.shipX - offset, this.shipY - 12, 'space', 'laserBlue01.png').setDepth(5);
                s1.setDisplaySize(OPPONENT_SIZE * 0.15, OPPONENT_SIZE * 0.55);
                const s2 = this.add.sprite(this.shipX + offset, this.shipY - 12, 'space', 'laserBlue01.png').setDepth(5);
                s2.setDisplaySize(OPPONENT_SIZE * 0.15, OPPONENT_SIZE * 0.55);
                this.bullets.push({ sprite: s1, vx: 0, vy: -BULLET_SPEED });
                this.bullets.push({ sprite: s2, vx: 0, vy: -BULLET_SPEED });
            }
            else {
                const s = this.add.sprite(this.shipX, this.shipY - 12, 'space', 'laserBlue01.png').setDepth(5);
                s.setDisplaySize(OPPONENT_SIZE * 0.15, OPPONENT_SIZE * 0.55);
                this.bullets.push({ sprite: s, vx: 0, vy: -BULLET_SPEED });
            }
            this.sound.play('sfx_laser', { volume: 0.3 });
        }
        this.spaceWasDown = spaceDown;
    }
    /* ================================================================
       BULLETS
       ================================================================ */
    updateBullets(dt) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.sprite.x += b.vx * (dt / 1000);
            b.sprite.y += b.vy * (dt / 1000);
            if (b.sprite.y < -10) {
                b.sprite.destroy();
                this.bullets.splice(i, 1);
            }
        }
    }
    updateEnemyBullets(dt) {
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const b = this.enemyBullets[i];
            b.sprite.x += b.vx * (dt / 1000);
            b.sprite.y += b.vy * (dt / 1000);
            if (b.sprite.y > H + 10 || b.sprite.y < -10 || b.sprite.x < -10 || b.sprite.x > W + 10) {
                b.sprite.destroy();
                this.enemyBullets.splice(i, 1);
            }
        }
    }
    /* ================================================================
       COLLISIONS
       ================================================================ */
    checkCollisions() {
        const halfSize = OPPONENT_SIZE / 2;
        const halfH = OPPONENT_SIZE * 0.85 / 2;
        // Player bullets vs enemies
        for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
            const b = this.bullets[bi];
            const bRect = { x: b.sprite.x - 3, y: b.sprite.y - OPPONENT_SIZE * 0.25, w: 6, h: OPPONENT_SIZE * 0.5 };
            for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
                const e = this.enemies[ei];
                const eRect = {
                    x: e.sprite.x - halfSize,
                    y: e.sprite.y - halfH,
                    w: OPPONENT_SIZE,
                    h: OPPONENT_SIZE * 0.85,
                };
                if (overlap(bRect, eRect)) {
                    b.sprite.destroy();
                    this.bullets.splice(bi, 1);
                    e.hp--;
                    if (e.hp <= 0) {
                        const info = ENEMY_INFO[e.kind];
                        const inFormation = e.state === 'stationary' || e.state === 'breathe-in' || e.state === 'breathe-out';
                        const pts = inFormation ? info.formPts : info.divePts;
                        this.spawnExplosion(e.sprite.x, e.sprite.y, e.kind);
                        this.addScore(pts, e.sprite.x, e.sprite.y - 10);
                        this.sound.play('sfx_zap', { volume: 0.3 });
                        const ex = e.sprite.x;
                        const ey = e.sprite.y;
                        e.sprite.destroy();
                        this.enemies.splice(ei, 1);
                        // Shield pickup chance (not from commanders)
                        if (e.kind !== 'commander' && Math.random() < 0.08) {
                            const pu = this.add.sprite(ex, ey, 'space', 'powerupBlue_shield.png').setDepth(5);
                            pu.setDisplaySize(OPPONENT_SIZE * 0.6, OPPONENT_SIZE * 0.6);
                            this.shieldPickups.push({ sprite: pu, vy: 180 * SCALE });
                        }
                        // Commanders always drop dual-shot pickup
                        if (e.kind === 'commander') {
                            this.spawnDualShotPickup(ex, ey);
                        }
                    }
                    else {
                        e.sprite.setTint(0xffffff);
                        this.time.delayedCall(80, () => { if (e.sprite && e.sprite.active)
                            e.sprite.clearTint(); });
                    }
                    break;
                }
            }
        }
        // Player bullets vs meteors
        for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
            const b = this.bullets[bi];
            const bRect = { x: b.sprite.x - 3, y: b.sprite.y - OPPONENT_SIZE * 0.25, w: 6, h: OPPONENT_SIZE * 0.5 };
            for (let mi = this.meteors.length - 1; mi >= 0; mi--) {
                const m = this.meteors[mi];
                const mSize = m.sprite.displayWidth * 0.4;
                const mRect = { x: m.sprite.x - mSize, y: m.sprite.y - mSize, w: mSize * 2, h: mSize * 2 };
                if (overlap(bRect, mRect)) {
                    b.sprite.destroy();
                    this.bullets.splice(bi, 1);
                    m.hp--;
                    if (m.hp <= 0) {
                        const pts = m.sprite.displayWidth > OPPONENT_SIZE ? 150 : 75;
                        this.spawnExplosion(m.sprite.x, m.sprite.y, 'bug');
                        this.addScore(pts, m.sprite.x, m.sprite.y - 10);
                        this.sound.play('sfx_zap', { volume: 0.2 });
                        m.sprite.destroy();
                        this.meteors.splice(mi, 1);
                    }
                    else {
                        m.sprite.setTint(0xffffff);
                        this.time.delayedCall(80, () => { if (m.sprite && m.sprite.active)
                            m.sprite.clearTint(); });
                    }
                    break;
                }
            }
        }
        // Enemy bullets vs player
        if (this.invincible <= 0) {
            const pRect = { x: this.shipX - OPPONENT_SIZE * 0.5, y: this.shipY - OPPONENT_SIZE * 0.4, w: OPPONENT_SIZE, h: OPPONENT_SIZE * 0.8 };
            for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
                const b = this.enemyBullets[i];
                const bRect = { x: b.sprite.x - 3, y: b.sprite.y - 3, w: 6, h: 6 };
                if (overlap(pRect, bRect)) {
                    b.sprite.destroy();
                    this.enemyBullets.splice(i, 1);
                    this.hitPlayer();
                    break;
                }
            }
        }
        // Enemies vs player (dive collision)
        if (this.invincible <= 0) {
            const pRect = { x: this.shipX - OPPONENT_SIZE * 0.5, y: this.shipY - OPPONENT_SIZE * 0.4, w: OPPONENT_SIZE, h: OPPONENT_SIZE * 0.8 };
            for (let ei = this.enemies.length - 1; ei >= 0; ei--) {
                const e = this.enemies[ei];
                if (e.state === 'entrance')
                    continue;
                const eRect = {
                    x: e.sprite.x - halfSize,
                    y: e.sprite.y - halfH,
                    w: OPPONENT_SIZE,
                    h: OPPONENT_SIZE * 0.85,
                };
                if (overlap(pRect, eRect)) {
                    this.spawnExplosion(e.sprite.x, e.sprite.y, e.kind);
                    e.sprite.destroy();
                    this.enemies.splice(ei, 1);
                    this.hitPlayer();
                    break;
                }
            }
        }
    }
    /* ================================================================
       PLAYER HIT / GAME OVER
       ================================================================ */
    hitPlayer() {
        if (this.shieldActive) {
            this.shieldActive = false;
            this.sound.play('sfx_shieldDown', { volume: 0.4 });
            if (this.shieldSprite) {
                this.shieldSprite.destroy();
                this.shieldSprite = undefined;
            }
            this.invincible = 500;
            return;
        }
        // Cancel dual-shot on hit
        if (this.dualShot)
            this.deactivateDualShot();
        this.lives--;
        this.syncLivesToHUD();
        this.spawnExplosion(this.shipX, this.shipY, 'player');
        this.sound.play('sfx_lose', { volume: 0.4 });
        if (this.lives <= 0) {
            this.ship.setVisible(false);
            this.gameOver = true;
            this.showGameOver(this.score, () => {
                this.scene.restart();
            });
        }
        else {
            this.invincible = 2000;
        }
    }
    /* ================================================================
       SHIELD PICKUPS
       ================================================================ */
    updateShieldPickups(dt) {
        for (let i = this.shieldPickups.length - 1; i >= 0; i--) {
            const pu = this.shieldPickups[i];
            pu.sprite.y += pu.vy * (dt / 1000);
            if (pu.sprite.y > H) {
                pu.sprite.destroy();
                this.shieldPickups.splice(i, 1);
                continue;
            }
            const dx = Math.abs(pu.sprite.x - this.shipX);
            const dy = Math.abs(pu.sprite.y - this.shipY);
            if (dx < OPPONENT_SIZE * 0.8 && dy < OPPONENT_SIZE * 0.8) {
                pu.sprite.destroy();
                this.shieldPickups.splice(i, 1);
                this.activateShield();
            }
        }
    }
    activateShield() {
        if (this.shieldActive)
            return;
        this.shieldActive = true;
        this.sound.play('sfx_shieldUp', { volume: 0.4 });
        this.shieldSprite = this.add.sprite(this.shipX, this.shipY, 'space', 'shield1.png').setDepth(11);
        this.shieldSprite.setDisplaySize(OPPONENT_SIZE * 1.6, OPPONENT_SIZE * 1.4);
        this.shieldSprite.setAlpha(0.6);
    }
    /* ================================================================
       DUAL-SHOT POWER-UP
       ================================================================ */
    spawnDualShotPickup(x, y) {
        const pu = this.add.sprite(x, y, 'space', 'powerupYellow_bolt.png').setDepth(5);
        pu.setDisplaySize(OPPONENT_SIZE * 0.6, OPPONENT_SIZE * 0.6);
        pu.setTint(0xffd700);
        // Pulsing glow
        this.tweens.add({
            targets: pu, alpha: { from: 1, to: 0.5 },
            duration: 400, yoyo: true, repeat: -1,
        });
        this.dualShotPickups.push({ sprite: pu, vy: 160 * SCALE });
    }
    updateDualShotPickups(dt) {
        for (let i = this.dualShotPickups.length - 1; i >= 0; i--) {
            const pu = this.dualShotPickups[i];
            pu.sprite.y += pu.vy * (dt / 1000);
            if (pu.sprite.y > H) {
                pu.sprite.destroy();
                this.dualShotPickups.splice(i, 1);
                continue;
            }
            const dx = Math.abs(pu.sprite.x - this.shipX);
            const dy = Math.abs(pu.sprite.y - this.shipY);
            if (dx < OPPONENT_SIZE * 0.8 && dy < OPPONENT_SIZE * 0.8) {
                pu.sprite.destroy();
                this.dualShotPickups.splice(i, 1);
                this.activateDualShot();
            }
        }
    }
    activateDualShot() {
        this.dualShot = true;
        this.dualShotTimer = 15000; // 15 seconds
        this.sound.play('sfx_shieldUp', { volume: 0.4 });
        // Widen ship
        this.ship.setDisplaySize(this.normalShipWidth * 1.5, this.normalShipHeight);
        // Add glow effect
        if (this.dualShotGlow)
            this.dualShotGlow.destroy();
        this.dualShotGlow = this.add.sprite(this.shipX, this.shipY, 'space', 'playerShip1_blue.png').setDepth(9);
        this.dualShotGlow.setDisplaySize(this.normalShipWidth * 1.8, this.normalShipHeight * 1.3);
        this.dualShotGlow.setTint(0xffd700);
        this.dualShotGlow.setAlpha(0.25);
    }
    updateDualShot(dt) {
        if (!this.dualShot)
            return;
        this.dualShotTimer -= dt;
        // Update glow position
        if (this.dualShotGlow) {
            this.dualShotGlow.setPosition(this.shipX, this.shipY);
            this.dualShotGlow.setAlpha(0.15 + Math.sin(this.time.now / 200) * 0.1);
        }
        // Flash warning when about to expire
        if (this.dualShotTimer < 3000 && this.dualShotTimer > 0) {
            this.ship.setAlpha(Math.sin(this.dualShotTimer * 0.01) > 0 ? 1 : 0.6);
        }
        if (this.dualShotTimer <= 0) {
            this.deactivateDualShot();
        }
    }
    deactivateDualShot() {
        this.dualShot = false;
        this.dualShotTimer = 0;
        this.ship.setDisplaySize(this.normalShipWidth, this.normalShipHeight);
        this.ship.setAlpha(1);
        if (this.dualShotGlow) {
            this.dualShotGlow.destroy();
            this.dualShotGlow = undefined;
        }
    }
    /* ================================================================
       METEORS
       ================================================================ */
    static METEOR_FRAMES = [
        'meteorBrown_big1.png', 'meteorBrown_big2.png', 'meteorBrown_big3.png', 'meteorBrown_big4.png',
        'meteorGrey_big1.png', 'meteorGrey_big2.png', 'meteorGrey_big3.png', 'meteorGrey_big4.png',
        'meteorBrown_med1.png', 'meteorBrown_med3.png',
        'meteorGrey_med1.png', 'meteorGrey_med2.png',
    ];
    updateMeteors(dt) {
        // Spawn timer — one every 3-6 seconds
        this.meteorTimer -= dt;
        if (this.meteorTimer <= 0) {
            this.meteorTimer = 3000 + Math.random() * 3000;
            this.spawnMeteor();
        }
        // Move meteors
        const dtS = dt / 1000;
        for (let i = this.meteors.length - 1; i >= 0; i--) {
            const m = this.meteors[i];
            m.sprite.y += m.vy * dtS;
            m.sprite.x += m.vx * dtS;
            m.sprite.rotation += m.rotSpeed * dtS;
            if (m.sprite.y > H + 80 || m.sprite.x < -80 || m.sprite.x > W + 80) {
                m.sprite.destroy();
                this.meteors.splice(i, 1);
            }
        }
        // Collision with player
        if (this.invincible <= 0) {
            const pRect = { x: this.shipX - OPPONENT_SIZE * 0.5, y: this.shipY - OPPONENT_SIZE * 0.4, w: OPPONENT_SIZE, h: OPPONENT_SIZE * 0.8 };
            for (let i = this.meteors.length - 1; i >= 0; i--) {
                const m = this.meteors[i];
                const mSize = m.sprite.displayWidth * 0.4;
                const mRect = { x: m.sprite.x - mSize, y: m.sprite.y - mSize, w: mSize * 2, h: mSize * 2 };
                if (overlap(pRect, mRect)) {
                    this.spawnExplosion(m.sprite.x, m.sprite.y, 'bug');
                    m.sprite.destroy();
                    this.meteors.splice(i, 1);
                    this.hitPlayer();
                    break;
                }
            }
        }
    }
    spawnMeteor() {
        const frame = GalaxyBlasterScene.METEOR_FRAMES[Math.floor(Math.random() * GalaxyBlasterScene.METEOR_FRAMES.length)];
        const isBig = frame.includes('big');
        const size = isBig ? OPPONENT_SIZE * (1.2 + Math.random() * 0.8) : OPPONENT_SIZE * (0.6 + Math.random() * 0.4);
        const x = Math.random() * W;
        const sprite = this.add.sprite(x, -size, 'space', frame).setDepth(3);
        sprite.setDisplaySize(size, size);
        sprite.setAlpha(0.85);
        const vy = 60 + Math.random() * 80;
        const vx = (Math.random() - 0.5) * 40;
        const rotSpeed = (Math.random() - 0.5) * 2;
        const hp = isBig ? 2 : 1;
        this.meteors.push({ sprite, vy, vx, rotSpeed, hp });
    }
    /* ================================================================
       EXPLOSIONS — Phaser Particle Emitter
       ================================================================ */
    spawnExplosion(x, y, kind) {
        const tintMap = {
            bug: 0xffff00,
            drone: 0x888888,
            moth: 0x4444ff,
            scout: 0xff0000,
            heavy: 0x0066ff,
            boss: 0x00ff00,
            player: 0xffffff,
        };
        const tint = tintMap[kind] || tintMap.player;
        const count = kind === 'player' ? 40 : 25;
        this.spawnParticleExplosion(x, y, tint, count);
    }
    shutdown() {
        super.shutdown();
        // Destroy player ship
        this.destroyObj(this.ship);
        // Destroy bullet sprites
        for (const b of this.bullets)
            this.destroyObj(b.sprite);
        this.bullets = [];
        // Destroy enemy sprites
        for (const e of this.enemies)
            this.destroyObj(e.sprite);
        this.enemies = [];
        // Destroy enemy bullet sprites
        for (const b of this.enemyBullets)
            this.destroyObj(b.sprite);
        this.enemyBullets = [];
        // Destroy shield and pickups
        this.destroyObj(this.shieldSprite);
        this.shieldSprite = undefined;
        for (const p of this.shieldPickups)
            this.destroyObj(p);
        this.shieldPickups = [];
        // Destroy dual-shot pickups and glow
        for (const p of this.dualShotPickups)
            this.destroyObj(p.sprite);
        this.dualShotPickups = [];
        this.destroyObj(this.dualShotGlow);
        this.dualShotGlow = undefined;
        // Destroy meteors
        for (const m of this.meteors)
            this.destroyObj(m.sprite);
        this.meteors = [];
        // Destroy wave text
        this.destroyObj(this.waveTextSprite);
        this.waveTextSprite = null;
    }
}
//# sourceMappingURL=GalaxyBlaster.js.map