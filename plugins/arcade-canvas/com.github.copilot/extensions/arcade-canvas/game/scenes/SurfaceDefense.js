// Surface Defense — a procedural missile-defense arcade game.
// Defend six cities with three interceptor batteries through escalating waves.
import { BaseScene, W, H } from './BaseScene.js';
import { getWavAudioPath } from '../layout.js';
const PALETTES = [
    { sky: 0x02010d, terrain: 0x6051a6, ridge: 0x2f2861, city: 0x52f7ff, enemy: 0xff4b8b },
    { sky: 0x06121d, terrain: 0x1f8a70, ridge: 0x12504d, city: 0xffd166, enemy: 0xff6b35 },
    { sky: 0x12081c, terrain: 0xa44a88, ridge: 0x5e2758, city: 0x7df9ff, enemy: 0xffd166 },
    { sky: 0x07180d, terrain: 0x6b8e23, ridge: 0x304d16, city: 0xff9f1c, enemy: 0xff4d6d },
];
const BATTERY_AMMO = 10;
const BONUS_CITY_SCORE = 10000;
const MAX_ACTIVE_INTERCEPTORS = 3;
// Killer satellite pixel art traced from the original Missile Command (1980)
// arcade flier sprite: rounded red body, twin blue panels, four antenna legs
// with orange tips. '.' pixels are transparent.
const SATELLITE_SPRITE = [
    '..O...........O..',
    '...R.........R...',
    '....R..rrR..R....',
    '.....rrrrrrR.....',
    '.....rrrrrrR.....',
    '....RDBrRDBrR....',
    '....RDBrRDBrR....',
    '....RDBrRDBrR....',
    '.....rrrrrrR.....',
    '.....rrrrrrR.....',
    '....R..rrR..R....',
    '...R.........R...',
    '..O...........O..',
];
// Bomber jet traced from the original arcade flier sprite: swept tail fin,
// long fuselage with the nose pointing right, delta wing sweeping down-left.
const BOMBER_SPRITE = [
    '......rR...........',
    '...R...rR..........',
    '...rR..rrR.........',
    '...rrrrrrrrrrR.....',
    '..rrrrrrrrrrrrrR...',
    '.....rrrrrrrrrrrrR.',
    '......rrrrR........',
    '......rrrR.........',
    '.....rrrR..........',
    '.....rrR...........',
    '....rrR............',
];
const SPRITE_COLORS = {
    R: 0xff2020, // bright red
    r: 0xb00000, // dark red
    D: 0x0000c8, // dark blue
    B: 0x2020ff, // bright blue
    O: 0xffa500, // orange antenna tips
};
export class SurfaceDefenseScene extends BaseScene {
    stars = [];
    terrainGfx;
    defenseGfx;
    missileGfx;
    effectsGfx;
    cursorGfx;
    statusText;
    defensesDirty = true;
    displayedAmmo = -1;
    displayedMultiplier = -1;
    cities = [];
    batteries = [];
    enemyMissiles = [];
    interceptors = [];
    explosions = [];
    aircraft = [];
    cursors;
    fireKeys = [];
    fireWasDown = [false, false, false, false];
    cursorX = 0;
    cursorY = 0;
    pointerActive = false;
    groundY = 0;
    scale = 1;
    wave = 0;
    enemyReserve = 0;
    smartReserve = 0;
    splitReserve = 0;
    spawnTimer = 0;
    aircraftSpawnTimer = 0;
    aircraftSpawnedThisWave = false;
    waveEndTimer = 0;
    fireCooldown = 0;
    nextBonusCityScore = BONUS_CITY_SCORE;
    bonusCityReserve = 0;
    gameOverFlag = false;
    waveActive = false;
    palette = PALETTES[0];
    terrainPoints = [];
    pointerMoveHandler;
    pointerDownHandler;
    contextMenuHandler;
    canvasBounds;
    canvasResizeHandler;
    constructor() {
        super('surface-defense');
    }
    get displayName() {
        return 'Surface Defense';
    }
    getDescription() {
        return 'Protect six cities with chain-reaction interceptor bursts!';
    }
    getControls() {
        return [
            { key: 'MOUSE / ARROWS', action: 'Move Targeting Cursor' },
            { key: 'CLICK / SPACE', action: 'Fire Nearest Battery' },
            { key: 'A / S / D', action: 'Fire Left / Center / Right' },
        ];
    }
    preload() {
        // All effects are original WAVs synthesized by
        // scripts/generate-surface-defense-audio.mjs — no third-party audio.
        this.load.audio('sd_launch', getWavAudioPath('surface-defense/sounds/launch'));
        this.load.audio('sd_airburst', getWavAudioPath('surface-defense/sounds/airburst'));
        this.load.audio('sd_wave', getWavAudioPath('surface-defense/sounds/wave-start'));
        this.load.audio('sd_noAmmo', getWavAudioPath('surface-defense/sounds/no-ammo'));
        this.load.audio('sd_gameOver', getWavAudioPath('surface-defense/sounds/game-over'));
        this.load.audio('sd_impact', getWavAudioPath('surface-defense/sounds/ground-impact'));
        this.load.audio('sd_bonus', getWavAudioPath('surface-defense/sounds/bonus-city'));
        this.load.audio('sd_aircraft', getWavAudioPath('surface-defense/sounds/aircraft-alert'));
    }
    create() {
        this.initBase();
        this.scale = Math.max(0.58, Math.min(W / 1920, H / 1080));
        // The arcade original keeps its flat ground line at ~95% of screen height
        // with low battery hills; 0.93 matches that while leaving room for the
        // status text inside the terrain band.
        this.groundY = H * 0.93;
        this.score = 0;
        this.lives = 6;
        this.level = 0;
        this.wave = 0;
        this.enemyReserve = 0;
        this.smartReserve = 0;
        this.splitReserve = 0;
        this.spawnTimer = 0;
        this.waveEndTimer = 0;
        this.fireCooldown = 0;
        this.nextBonusCityScore = BONUS_CITY_SCORE;
        this.bonusCityReserve = 0;
        this.gameOverFlag = false;
        this.waveActive = false;
        this.enemyMissiles = [];
        this.interceptors = [];
        this.explosions = [];
        this.aircraft = [];
        this.aircraftSpawnTimer = 0;
        this.aircraftSpawnedThisWave = false;
        this.stars = [];
        this.defensesDirty = true;
        this.displayedAmmo = -1;
        this.displayedMultiplier = -1;
        this.terrainGfx = this.add.graphics().setDepth(-5);
        this.defenseGfx = this.add.graphics().setDepth(5);
        this.missileGfx = this.add.graphics().setDepth(10);
        this.effectsGfx = this.add.graphics().setDepth(20);
        this.cursorGfx = this.add.graphics().setDepth(30);
        this.statusText = this.add.text(W / 2, H * 0.945, '', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: `${Math.max(11, Math.round(15 * this.scale))}px`,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center',
        }).setOrigin(0.5, 0);
        this.createTerrain();
        this.drawTerrain();
        this.createDefenses();
        this.stars = this.createStarfield([
            { count: 45, speed: 2, size: Math.max(1, this.scale), alpha: 0.22 },
            { count: 25, speed: 5, size: Math.max(1.5, 1.5 * this.scale), alpha: 0.32 },
        ]);
        this.cursorX = W / 2;
        this.cursorY = H * 0.4;
        this.cursors = this.input.keyboard.createCursorKeys();
        this.fireKeys = [
            this.input.keyboard.addKey('A'),
            this.input.keyboard.addKey('S'),
            this.input.keyboard.addKey('D'),
            this.input.keyboard.addKey('SPACE'),
        ];
        this.setupPointerInput();
        this.syncScoreToHUD();
        this.syncLivesToHUD();
        this.syncLevelToHUD();
        this.loadHighScore();
        this.drawScene();
        this.startWithReadyScreen(() => this.startWave());
    }
    update(_time, deltaMs) {
        if (this.gameOverFlag)
            return;
        const dt = Math.min(deltaMs, 33);
        const dtSec = dt / 1000;
        this.updateStarfield(this.stars, dt);
        this.updateInput(dtSec);
        if (this.fireCooldown > 0)
            this.fireCooldown -= dt;
        if (!this.waveActive) {
            this.drawScene();
            return;
        }
        this.updateSpawning(dt);
        this.updateEnemyMissiles(dtSec);
        this.updateInterceptors(dtSec);
        this.updateExplosions(dt);
        this.updateAircraft(dt, dtSec);
        this.checkBlastCollisions();
        this.checkWaveComplete(dt);
        this.drawScene();
    }
    createTerrain() {
        // Hill heights scaled to the arcade original, where the battery mounds
        // rise only ~6% of screen height above the flat ground line.
        this.terrainPoints = [
            { x: 0, y: this.groundY - H * 0.008 },
            { x: W * 0.06, y: this.groundY - H * 0.03 },
            { x: W * 0.13, y: this.groundY - H * 0.013 },
            { x: W * 0.22, y: this.groundY - H * 0.038 },
            { x: W * 0.31, y: this.groundY - H * 0.018 },
            { x: W * 0.41, y: this.groundY - H * 0.043 },
            { x: W * 0.5, y: this.groundY - H * 0.02 },
            { x: W * 0.59, y: this.groundY - H * 0.04 },
            { x: W * 0.69, y: this.groundY - H * 0.015 },
            { x: W * 0.78, y: this.groundY - H * 0.035 },
            { x: W * 0.88, y: this.groundY - H * 0.013 },
            { x: W, y: this.groundY - H * 0.028 },
        ];
    }
    createDefenses() {
        const cityXs = [0.24, 0.32, 0.4, 0.6, 0.68, 0.76];
        this.cities = cityXs.map(x => ({ x: W * x, alive: true }));
        const batteryY = this.groundY - H * 0.012;
        this.batteries = [
            { x: W * 0.105, y: batteryY, ammo: BATTERY_AMMO, alive: true, color: 0x4deeea },
            { x: W * 0.5, y: batteryY, ammo: BATTERY_AMMO, alive: true, color: 0xffd166 },
            { x: W * 0.895, y: batteryY, ammo: BATTERY_AMMO, alive: true, color: 0xff6b9d },
        ];
    }
    setupPointerInput() {
        this.canvasResizeHandler = () => {
            this.canvasBounds = undefined;
        };
        window.addEventListener('resize', this.canvasResizeHandler);
        this.game.scale.on('resize', this.canvasResizeHandler);
        this.pointerMoveHandler = (event) => {
            const cachedBounds = this.canvasBounds;
            const bounds = cachedBounds ?? this.game.canvas.getBoundingClientRect();
            if (bounds.width <= 0 || bounds.height <= 0)
                return;
            if (!cachedBounds)
                this.canvasBounds = bounds;
            const canvasX = (event.clientX - bounds.left) * (W / bounds.width);
            const canvasY = (event.clientY - bounds.top) * (H / bounds.height);
            this.pointerActive = true;
            this.cursorX = Phaser.Math.Clamp(canvasX, W * 0.02, W * 0.98);
            this.cursorY = Phaser.Math.Clamp(canvasY, H * 0.08, this.groundY - H * 0.045);
        };
        this.pointerDownHandler = (pointer) => {
            if (!this.waveActive || this.gameOverFlag)
                return;
            this.cursorX = Phaser.Math.Clamp(pointer.worldX, W * 0.02, W * 0.98);
            this.cursorY = Phaser.Math.Clamp(pointer.worldY, H * 0.08, this.groundY - H * 0.045);
            const requested = pointer.button === 1 ? 1 : pointer.button === 2 ? 2 : this.findNearestBattery();
            this.fireInterceptor(requested);
        };
        document.addEventListener('mousemove', this.pointerMoveHandler);
        this.input.on('pointerdown', this.pointerDownHandler);
        this.contextMenuHandler = (event) => event.preventDefault();
        this.game.canvas.addEventListener('contextmenu', this.contextMenuHandler);
    }
    updateInput(dtSec) {
        const speed = Math.max(440, W * 0.32);
        let moved = false;
        if (this.cursors.left.isDown) {
            this.cursorX -= speed * dtSec;
            moved = true;
        }
        if (this.cursors.right.isDown) {
            this.cursorX += speed * dtSec;
            moved = true;
        }
        if (this.cursors.up.isDown) {
            this.cursorY -= speed * dtSec;
            moved = true;
        }
        if (this.cursors.down.isDown) {
            this.cursorY += speed * dtSec;
            moved = true;
        }
        if (moved)
            this.pointerActive = false;
        this.cursorX = Phaser.Math.Clamp(this.cursorX, W * 0.02, W * 0.98);
        this.cursorY = Phaser.Math.Clamp(this.cursorY, H * 0.08, this.groundY - H * 0.045);
        for (let i = 0; i < this.fireKeys.length; i++) {
            const down = this.fireKeys[i].isDown;
            if (down && !this.fireWasDown[i] && this.waveActive) {
                this.fireInterceptor(i === 3 ? this.findNearestBattery() : i);
            }
            this.fireWasDown[i] = down;
        }
    }
    findNearestBattery() {
        let best = -1;
        let bestDistance = Infinity;
        for (let i = 0; i < this.batteries.length; i++) {
            const battery = this.batteries[i];
            if (!battery.alive || battery.ammo <= 0)
                continue;
            const distance = Math.abs(battery.x - this.cursorX);
            if (distance < bestDistance) {
                best = i;
                bestDistance = distance;
            }
        }
        return best;
    }
    fireInterceptor(batteryIndex) {
        if (this.fireCooldown > 0 || this.interceptors.length >= MAX_ACTIVE_INTERCEPTORS)
            return;
        const battery = this.batteries[batteryIndex];
        if (!battery || !battery.alive || battery.ammo <= 0) {
            this.playSound('sd_noAmmo', 0.22);
            return;
        }
        battery.ammo--;
        this.defensesDirty = true;
        this.fireCooldown = 120;
        const startX = battery.x;
        const startY = battery.y - H * 0.018;
        this.interceptors.push({
            x: startX,
            y: startY,
            startX,
            startY,
            targetX: this.cursorX,
            targetY: this.cursorY,
            speed: Math.max(650, H * 0.92),
            color: battery.color,
            trail: [{ x: startX, y: startY }],
        });
        this.playSound('sd_launch', 0.25);
    }
    startWave() {
        if (this.gameOverFlag)
            return;
        this.wave++;
        this.level = this.wave;
        this.palette = PALETTES[(this.wave - 1) % PALETTES.length];
        this.enemyReserve = Math.min(30, 7 + this.wave * 2);
        this.smartReserve = this.wave >= 5 ? Math.min(5, Math.floor(this.wave / 3)) : 0;
        this.splitReserve = this.wave >= 3 ? Math.min(6, Math.floor(this.wave / 2)) : 0;
        this.spawnTimer = 700;
        this.aircraftSpawnTimer = this.wave >= 2 ? 1800 + Math.random() * 1400 : 0;
        this.aircraftSpawnedThisWave = false;
        this.waveEndTimer = 0;
        this.waveActive = true;
        this.enemyMissiles = [];
        this.interceptors = [];
        this.explosions = [];
        this.aircraft = [];
        for (const battery of this.batteries) {
            battery.alive = true;
            battery.ammo = BATTERY_AMMO;
        }
        this.defensesDirty = true;
        this.syncLevelToHUD();
        this.showWaveBanner(this.wave);
        this.playSound('sd_wave', 0.32);
        this.drawTerrain();
    }
    updateSpawning(dt) {
        if (this.wave >= 2 && !this.aircraftSpawnedThisWave) {
            this.aircraftSpawnTimer -= dt;
            if (this.aircraftSpawnTimer <= 0) {
                const kind = this.wave >= 3 && this.wave % 2 === 1 ? 'satellite' : 'bomber';
                this.spawnAircraft(kind);
                this.aircraftSpawnedThisWave = true;
            }
        }
        if (this.enemyReserve <= 0)
            return;
        this.spawnTimer -= dt;
        const maxActive = Math.min(10, 4 + Math.floor(this.wave / 2));
        if (this.spawnTimer > 0 || this.enemyMissiles.length >= maxActive)
            return;
        const smart = this.smartReserve > 0 && Math.random() < 0.28;
        const split = !smart && this.splitReserve > 0 && Math.random() < 0.3;
        if (smart)
            this.smartReserve--;
        if (split)
            this.splitReserve--;
        this.spawnEnemyMissile(undefined, undefined, smart, split);
        this.enemyReserve--;
        this.spawnTimer = Math.max(230, 980 - this.wave * 45) * (0.65 + Math.random() * 0.7);
    }
    spawnEnemyMissile(startX = W * (0.04 + Math.random() * 0.92), startY = H * 0.055, smart = false, split = false, forcedTarget) {
        const target = forcedTarget ?? this.pickTarget();
        const targetX = target.kind === 'city'
            ? this.cities[target.index].x
            : this.batteries[target.index].x;
        const targetY = target.kind === 'city'
            ? this.groundY - H * 0.018
            : this.batteries[target.index].y;
        this.enemyMissiles.push({
            x: startX,
            y: startY,
            startX,
            startY,
            targetX,
            targetY,
            speed: Math.min(H * 0.35, H * (0.105 + this.wave * 0.009)) * (smart ? 1.25 : 1),
            targetKind: target.kind,
            targetIndex: target.index,
            smart,
            split,
            splitDone: false,
            color: smart ? 0xffffff : this.palette.enemy,
            trail: [{ x: startX, y: startY }],
        });
    }
    pickTarget() {
        const targets = [];
        this.cities.forEach((city, index) => {
            if (city.alive)
                targets.push({ kind: 'city', index });
        });
        this.batteries.forEach((battery, index) => {
            if (battery.alive)
                targets.push({ kind: 'battery', index });
        });
        if (targets.length === 0)
            return { kind: 'city', index: 0 };
        return targets[Math.floor(Math.random() * targets.length)];
    }
    updateEnemyMissiles(dtSec) {
        for (let i = this.enemyMissiles.length - 1; i >= 0; i--) {
            const missile = this.enemyMissiles[i];
            let dx = missile.targetX - missile.x;
            let dy = missile.targetY - missile.y;
            const distance = Math.hypot(dx, dy);
            if (distance <= missile.speed * dtSec + 3) {
                this.enemyMissiles.splice(i, 1);
                this.handleImpact(missile);
                continue;
            }
            dx /= distance;
            dy /= distance;
            if (missile.smart) {
                for (const explosion of this.explosions) {
                    if (!explosion.friendly)
                        continue;
                    const ex = missile.x - explosion.x;
                    const ey = missile.y - explosion.y;
                    const ed = Math.hypot(ex, ey);
                    if (ed < explosion.radius + H * 0.055 && ed > 0) {
                        dx += (ex / ed) * 1.35;
                        dy += (ey / ed) * 0.45;
                    }
                }
                const adjustedLength = Math.hypot(dx, dy);
                dx /= adjustedLength;
                dy /= adjustedLength;
            }
            missile.x += dx * missile.speed * dtSec;
            missile.y += dy * missile.speed * dtSec;
            this.appendTrailPoint(missile.trail ??= [{ x: missile.startX, y: missile.startY }], missile.x, missile.y);
            if (missile.split && !missile.splitDone && missile.y > H * 0.33 && Math.random() < 0.025) {
                missile.splitDone = true;
                const extraTarget = this.pickTarget();
                this.spawnEnemyMissile(missile.x, missile.y, false, false, extraTarget);
            }
        }
    }
    updateInterceptors(dtSec) {
        for (let i = this.interceptors.length - 1; i >= 0; i--) {
            const interceptor = this.interceptors[i];
            const dx = interceptor.targetX - interceptor.x;
            const dy = interceptor.targetY - interceptor.y;
            const distance = Math.hypot(dx, dy);
            if (distance <= interceptor.speed * dtSec + 3) {
                this.interceptors.splice(i, 1);
                this.createExplosion(interceptor.targetX, interceptor.targetY, true, interceptor.color);
                continue;
            }
            interceptor.x += (dx / distance) * interceptor.speed * dtSec;
            interceptor.y += (dy / distance) * interceptor.speed * dtSec;
            this.appendTrailPoint(interceptor.trail ??= [{ x: interceptor.startX, y: interceptor.startY }], interceptor.x, interceptor.y);
        }
    }
    appendTrailPoint(trail, x, y) {
        const last = trail[trail.length - 1];
        const spacing = Math.max(3, 5 * this.scale);
        if (!last || Math.hypot(x - last.x, y - last.y) >= spacing) {
            trail.push({ x, y });
        }
    }
    createExplosion(x, y, friendly, color) {
        this.explosions.push({
            x,
            y,
            radius: 2,
            maxRadius: friendly ? H * 0.072 : H * 0.045,
            age: 0,
            duration: friendly ? 1550 : 900,
            friendly,
            color,
        });
        this.playSound(friendly ? 'sd_airburst' : 'sd_impact', friendly ? 0.28 : 0.4);
    }
    updateExplosions(dt) {
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            explosion.age += dt;
            if (explosion.age >= explosion.duration) {
                this.explosions.splice(i, 1);
                continue;
            }
            const progress = explosion.age / explosion.duration;
            const pulse = progress < 0.48
                ? progress / 0.48
                : 1 - ((progress - 0.48) / 0.52);
            explosion.radius = explosion.maxRadius * Math.sin(pulse * Math.PI / 2);
        }
    }
    checkBlastCollisions() {
        for (const explosion of this.explosions) {
            if (!explosion.friendly || explosion.radius < 4)
                continue;
            for (let i = this.enemyMissiles.length - 1; i >= 0; i--) {
                const missile = this.enemyMissiles[i];
                if (Math.hypot(missile.x - explosion.x, missile.y - explosion.y) > explosion.radius)
                    continue;
                this.enemyMissiles.splice(i, 1);
                const points = (missile.smart ? 125 : 25) * this.getScoreMultiplier();
                this.addScore(points, missile.x, missile.y);
                this.checkBonusCity();
                this.createExplosion(missile.x, missile.y, true, missile.color);
            }
            for (const craft of this.aircraft) {
                if (!craft.active ||
                    Math.hypot(craft.x - explosion.x, craft.y - explosion.y) > explosion.radius + W * 0.018) {
                    continue;
                }
                craft.active = false;
                // Both fliers scored 100 in the arcade original.
                const points = 100;
                this.addScore(points * this.getScoreMultiplier(), craft.x, craft.y);
                this.createExplosion(craft.x, craft.y, true, craft.kind === 'satellite' ? 0xff2020 : 0xffd166);
                this.checkBonusCity();
            }
        }
    }
    handleImpact(missile) {
        this.defensesDirty = true;
        if (missile.targetKind === 'city') {
            const city = this.cities[missile.targetIndex];
            if (city.alive)
                city.alive = false;
        }
        else {
            const battery = this.batteries[missile.targetIndex];
            if (battery.alive) {
                battery.alive = false;
                battery.ammo = 0;
            }
        }
        this.createExplosion(missile.targetX, missile.targetY, false, 0xff5533);
        // A banked bonus city keeps the game alive, as in the arcade original.
        this.syncLives();
        if (this.lives <= 0)
            this.endGame();
    }
    spawnAircraft(kind) {
        const direction = Math.random() < 0.5 ? 1 : -1;
        this.aircraft.push({
            kind,
            x: direction > 0 ? -W * 0.05 : W * 1.05,
            y: H * (kind === 'satellite' ? 0.12 + Math.random() * 0.08 : 0.2 + Math.random() * 0.09),
            vx: direction * Math.max(kind === 'satellite' ? 75 : 105, W * (kind === 'satellite' ? 0.055 : 0.078)),
            dropTimer: kind === 'satellite' ? 700 + Math.random() * 600 : 950 + Math.random() * 850,
            active: true,
            wobble: Math.random() * Math.PI * 2,
        });
        this.playSound('sd_aircraft', 0.25);
    }
    updateAircraft(dt, dtSec) {
        for (const craft of this.aircraft) {
            if (!craft.active)
                continue;
            craft.x += craft.vx * dtSec;
            craft.wobble += dtSec * (craft.kind === 'satellite' ? 3.2 : 1.8);
            craft.dropTimer -= dt;
            if (craft.dropTimer <= 0) {
                const smart = craft.kind === 'satellite' && this.wave >= 4;
                this.spawnEnemyMissile(craft.x, craft.y + H * 0.018, smart, false);
                craft.dropTimer = craft.kind === 'satellite'
                    ? 900 + Math.random() * 800
                    : 1150 + Math.random() * 1250;
            }
            if (craft.x < -W * 0.1 || craft.x > W * 1.1) {
                craft.active = false;
            }
        }
    }
    checkWaveComplete(dt) {
        const aircraftActive = this.aircraft.some(craft => craft.active);
        if (this.enemyReserve > 0 || this.enemyMissiles.length > 0 || aircraftActive) {
            this.waveEndTimer = 0;
            return;
        }
        this.waveEndTimer += dt;
        if (this.waveEndTimer < 900)
            return;
        this.waveActive = false;
        this.awardWaveBonus();
    }
    awardWaveBonus() {
        const ammo = this.batteries.reduce((sum, battery) => sum + battery.ammo, 0);
        const cities = this.cities.filter(city => city.alive).length;
        const bonus = ammo * 5 + cities * 100;
        if (bonus > 0)
            this.addScore(bonus, W / 2, H * 0.55);
        this.checkBonusCity();
        this.restoreCitiesFromReserve();
        this.time.delayedCall(1800, () => {
            if (!this.gameOverFlag)
                this.startWave();
        });
    }
    // The arcade banks a bonus city for every 10,000 points (default DIP
    // setting) rather than granting it immediately; destroyed cities are
    // rebuilt from the bank between waves, and any surplus stays banked.
    checkBonusCity() {
        while (this.score >= this.nextBonusCityScore) {
            this.bonusCityReserve++;
            this.nextBonusCityScore += BONUS_CITY_SCORE;
            this.playSound('sd_bonus', 0.42);
            this.showBonusCityText();
            this.syncLives();
        }
    }
    restoreCitiesFromReserve() {
        for (const city of this.cities) {
            if (this.bonusCityReserve <= 0)
                break;
            if (!city.alive) {
                city.alive = true;
                this.defensesDirty = true;
                this.bonusCityReserve--;
            }
        }
        this.syncLives();
    }
    // Lives = standing cities plus banked bonus cities, matching how the
    // arcade tracks the player's total city count in one counter.
    syncLives() {
        this.lives = this.cities.filter(city => city.alive).length + this.bonusCityReserve;
        this.syncLivesToHUD();
    }
    showBonusCityText() {
        const txt = this.add.text(W / 2, H * 0.32, 'BONUS CITY', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: `${Math.max(14, Math.round(20 * this.scale))}px`,
            color: '#ffd54a',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5, 0.5).setDepth(900);
        this.tweens.add({
            targets: txt,
            y: H * 0.27,
            alpha: 0,
            duration: 1600,
            onComplete: () => txt.destroy(),
        });
    }
    getScoreMultiplier() {
        return Math.min(6, Math.floor((Math.max(1, this.wave) - 1) / 2) + 1);
    }
    endGame() {
        if (this.gameOverFlag)
            return;
        this.gameOverFlag = true;
        this.waveActive = false;
        this.checkHighScore();
        this.playSound('sd_gameOver', 0.4);
        this.time.delayedCall(800, () => {
            this.showGameOver(this.score, () => this.scene.restart());
        });
    }
    // Terrain is static within a wave; it's drawn at create() and startWave()
    // rather than every frame.
    drawScene() {
        if (this.defensesDirty) {
            this.drawDefenses();
            this.defensesDirty = false;
        }
        this.drawMissiles();
        this.drawEffects();
        this.drawCursor();
        const totalAmmo = this.batteries.reduce((sum, battery) => sum + battery.ammo, 0);
        const multiplier = this.getScoreMultiplier();
        if (totalAmmo !== this.displayedAmmo || multiplier !== this.displayedMultiplier) {
            this.statusText.setText(`INTERCEPTORS ${String(totalAmmo).padStart(2, '0')}   ×${multiplier}`);
            this.displayedAmmo = totalAmmo;
            this.displayedMultiplier = multiplier;
        }
    }
    drawTerrain() {
        const g = this.terrainGfx;
        g.clear();
        g.fillStyle(this.palette.ridge, 0.65);
        g.beginPath();
        g.moveTo(0, H);
        for (const point of this.terrainPoints)
            g.lineTo(point.x, point.y);
        g.lineTo(W, H);
        g.closePath();
        g.fillPath();
        g.fillStyle(this.palette.terrain, 0.9);
        g.beginPath();
        g.moveTo(0, H);
        for (const point of this.terrainPoints) {
            g.lineTo(point.x, point.y + H * 0.018);
        }
        g.lineTo(W, H);
        g.closePath();
        g.fillPath();
        g.lineStyle(Math.max(2, 3 * this.scale), this.palette.city, 0.45);
        g.beginPath();
        for (let i = 0; i < this.terrainPoints.length; i++) {
            const point = this.terrainPoints[i];
            if (i === 0)
                g.moveTo(point.x, point.y + H * 0.018);
            else
                g.lineTo(point.x, point.y + H * 0.018);
        }
        g.strokePath();
    }
    drawDefenses() {
        const g = this.defenseGfx;
        g.clear();
        this.cities.forEach((city, index) => {
            if (!city.alive) {
                this.drawCityRuins(g, city.x, this.groundY - H * 0.01, index);
                return;
            }
            this.drawCity(g, city.x, this.groundY - H * 0.014, index);
        });
        this.batteries.forEach((battery, index) => {
            this.drawBattery(g, battery, index);
        });
    }
    drawCity(g, x, y, variant) {
        const cityWidth = W * 0.052;
        const baseY = y + H * 0.004;
        const buildingCount = 5;
        const gap = Math.max(2, 3 * this.scale);
        const buildingWidth = (cityWidth - gap * (buildingCount - 1)) / buildingCount;
        const heightPatterns = [
            [0.52, 0.9, 0.68, 1, 0.58],
            [0.72, 0.5, 1, 0.62, 0.84],
            [0.58, 0.82, 0.55, 0.92, 0.7],
        ];
        const heights = heightPatterns[variant % heightPatterns.length];
        const maxHeight = H * 0.052;
        const left = x - cityWidth / 2;
        for (let i = 0; i < buildingCount; i++) {
            const bx = left + i * (buildingWidth + gap);
            const height = maxHeight * heights[i];
            const top = baseY - height;
            g.fillStyle(0x10152d, 0.96);
            g.fillRect(bx, top, buildingWidth, height);
            g.lineStyle(Math.max(1, 1.8 * this.scale), this.palette.city, 0.95);
            g.strokeRect(bx, top, buildingWidth, height);
            if ((i + variant) % 3 === 0) {
                g.fillStyle(this.palette.city, 0.9);
                g.fillTriangle(bx, top, bx + buildingWidth / 2, top - H * 0.009, bx + buildingWidth, top);
            }
            else if ((i + variant) % 3 === 1) {
                g.lineStyle(Math.max(1, 1.4 * this.scale), this.palette.city, 0.8);
                g.lineBetween(bx + buildingWidth / 2, top, bx + buildingWidth / 2, top - H * 0.009);
            }
            const windowSize = Math.max(2, 3 * this.scale);
            const windowGapX = Math.max(windowSize + 2, buildingWidth * 0.32);
            const windowGapY = Math.max(windowSize + 3, H * 0.011);
            for (let wx = bx + windowGapX * 0.55; wx < bx + buildingWidth - windowSize; wx += windowGapX) {
                for (let wy = top + windowGapY * 0.65; wy < baseY - windowSize; wy += windowGapY) {
                    const lit = (Math.floor(wx + wy) + variant + i) % 3 !== 0;
                    g.fillStyle(lit ? 0xffe66d : 0x283552, lit ? 0.95 : 0.75);
                    g.fillRect(wx, wy, windowSize, windowSize);
                }
            }
        }
        g.fillStyle(this.palette.city, 0.95);
        g.fillRect(left - gap, baseY, cityWidth + gap * 2, Math.max(3, H * 0.005));
    }
    drawCityRuins(g, x, y, variant) {
        const width = W * 0.05;
        const left = x - width / 2;
        const rubble = [0.18, 0.34, 0.24, 0.42, 0.2, 0.3, 0.16];
        const step = width / rubble.length;
        g.fillStyle(0x251f2d, 0.95);
        g.beginPath();
        g.moveTo(left, y);
        for (let i = 0; i < rubble.length; i++) {
            const height = H * 0.035 * rubble[(i + variant) % rubble.length];
            g.lineTo(left + i * step, y - height);
            g.lineTo(left + (i + 0.55) * step, y - height * 0.35);
        }
        g.lineTo(left + width, y);
        g.closePath();
        g.fillPath();
        g.fillStyle(0xff6b35, 0.7);
        g.fillCircle(x - width * 0.16, y - H * 0.008, Math.max(2, 3 * this.scale));
        g.fillCircle(x + width * 0.12, y - H * 0.006, Math.max(2, 2.5 * this.scale));
    }
    drawBattery(g, battery, index) {
        const width = W * 0.055;
        const height = H * 0.052;
        const color = battery.alive ? battery.color : 0x3b3542;
        g.fillStyle(color, battery.alive ? 0.88 : 0.65);
        g.beginPath();
        g.moveTo(battery.x - width / 2, battery.y);
        g.lineTo(battery.x - width * 0.22, battery.y - height * 0.78);
        g.lineTo(battery.x - width * 0.08, battery.y - height);
        g.lineTo(battery.x + width * 0.08, battery.y - height);
        g.lineTo(battery.x + width * 0.22, battery.y - height * 0.78);
        g.lineTo(battery.x + width / 2, battery.y);
        g.closePath();
        g.fillPath();
        if (battery.alive) {
            g.lineStyle(Math.max(2, 3 * this.scale), 0xffffff, 0.8);
            g.lineBetween(battery.x, battery.y - height * 0.55, battery.x, battery.y - height * 1.2);
            g.strokeCircle(battery.x, battery.y - height * 1.24, Math.max(3, 4 * this.scale));
        }
        const pipSize = Math.max(3, W * 0.0027);
        for (let i = 0; i < BATTERY_AMMO; i++) {
            g.fillStyle(i < battery.ammo ? color : 0x282330, i < battery.ammo ? 1 : 0.7);
            const col = i % 5;
            const row = Math.floor(i / 5);
            g.fillTriangle(battery.x - pipSize * 6 + col * pipSize * 3, battery.y + H * 0.012 + row * pipSize * 2.2, battery.x - pipSize * 5 + col * pipSize * 3, battery.y + H * 0.012 + row * pipSize * 2.2 - pipSize * 1.8, battery.x - pipSize * 4 + col * pipSize * 3, battery.y + H * 0.012 + row * pipSize * 2.2);
        }
        g.fillStyle(0xffffff, 0.65);
        g.fillCircle(battery.x + (index - 1) * 0.01, battery.y, 1);
    }
    drawMissiles() {
        const g = this.missileGfx;
        g.clear();
        for (const missile of this.enemyMissiles) {
            this.drawRetroTrail(g, missile.trail ?? [{ x: missile.startX, y: missile.startY }], missile.x, missile.y, missile.color, missile.smart ? 0.95 : 0.78);
            g.fillStyle(missile.color, 1);
            if (missile.smart) {
                const r = Math.max(4, 6 * this.scale);
                g.fillTriangle(missile.x, missile.y - r, missile.x + r, missile.y, missile.x, missile.y + r);
                g.fillTriangle(missile.x, missile.y - r, missile.x - r, missile.y, missile.x, missile.y + r);
            }
            else {
                g.fillCircle(missile.x, missile.y, Math.max(2.5, 3.5 * this.scale));
            }
        }
        for (const interceptor of this.interceptors) {
            this.drawRetroTrail(g, interceptor.trail ?? [{ x: interceptor.startX, y: interceptor.startY }], interceptor.x, interceptor.y, interceptor.color, 0.9);
            g.fillStyle(0xffffff, 1);
            g.fillCircle(interceptor.x, interceptor.y, Math.max(2, 3 * this.scale));
        }
        for (const craft of this.aircraft) {
            if (craft.active)
                this.drawAircraft(g, craft);
        }
    }
    drawRetroTrail(g, trail, endX, endY, color, alpha) {
        const points = trail.length > 0 ? trail : [{ x: endX, y: endY }];
        const grid = Math.max(2, Math.round(3 * this.scale));
        const pixel = grid + 1;
        g.fillStyle(color, alpha);
        for (let i = 1; i <= points.length; i++) {
            const from = points[i - 1];
            const to = i < points.length ? points[i] : { x: endX, y: endY };
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / grid));
            for (let step = 0; step <= steps; step++) {
                const px = Math.round((from.x + dx * (step / steps)) / grid) * grid;
                const py = Math.round((from.y + dy * (step / steps)) / grid) * grid;
                g.fillRect(px - pixel / 2, py - pixel / 2, pixel, pixel);
            }
        }
    }
    drawAircraft(g, craft) {
        const x = craft.x;
        const y = craft.y + Math.sin(craft.wobble) * H * 0.004;
        const dir = Math.sign(craft.vx);
        const sprite = craft.kind === 'bomber' ? BOMBER_SPRITE : SATELLITE_SPRITE;
        const px = Math.max(2, Math.round(H * 0.0045));
        const cols = sprite[0].length;
        const rows = sprite.length;
        const originX = x - (cols * px) / 2;
        const originY = y - (rows * px) / 2;
        // The arcade sprites shimmer as they redraw; swap the two reds a few times a second.
        const swap = Math.floor(craft.wobble) % 2 === 0;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const ch = sprite[row][col];
                if (ch === '.')
                    continue;
                let color = SPRITE_COLORS[ch];
                if (swap && ch === 'R')
                    color = SPRITE_COLORS.r;
                else if (swap && ch === 'r')
                    color = SPRITE_COLORS.R;
                // The bomber sprite points right; mirror it when flying left.
                const drawCol = dir < 0 ? cols - 1 - col : col;
                g.fillStyle(color, 0.95);
                g.fillRect(originX + drawCol * px, originY + row * px, px, px);
            }
        }
    }
    drawEffects() {
        const g = this.effectsGfx;
        g.clear();
        for (const explosion of this.explosions) {
            const progress = explosion.age / explosion.duration;
            const alpha = Math.max(0.18, 1 - progress * 0.75);
            g.fillStyle(explosion.color, alpha * 0.28);
            g.fillCircle(explosion.x, explosion.y, explosion.radius);
            g.lineStyle(Math.max(2, 4 * this.scale), 0xffffff, alpha);
            g.strokeCircle(explosion.x, explosion.y, explosion.radius);
            if (explosion.radius > 8) {
                g.lineStyle(Math.max(1, 2 * this.scale), explosion.color, alpha);
                g.strokeCircle(explosion.x, explosion.y, explosion.radius * 0.78);
            }
        }
    }
    drawCursor() {
        const g = this.cursorGfx;
        g.clear();
        const radius = Math.max(12, 18 * this.scale);
        const color = this.pointerActive ? 0xffffff : 0x7df9ff;
        g.lineStyle(Math.max(1.5, 2.4 * this.scale), color, 0.95);
        g.strokeCircle(this.cursorX, this.cursorY, radius);
        g.lineBetween(this.cursorX - radius * 1.45, this.cursorY, this.cursorX - radius * 0.5, this.cursorY);
        g.lineBetween(this.cursorX + radius * 0.5, this.cursorY, this.cursorX + radius * 1.45, this.cursorY);
        g.lineBetween(this.cursorX, this.cursorY - radius * 1.45, this.cursorX, this.cursorY - radius * 0.5);
        g.lineBetween(this.cursorX, this.cursorY + radius * 0.5, this.cursorX, this.cursorY + radius * 1.45);
        const nearest = this.findNearestBattery();
        if (nearest >= 0) {
            g.lineStyle(Math.max(1, 1.4 * this.scale), this.batteries[nearest].color, 0.22);
            g.lineBetween(this.batteries[nearest].x, this.batteries[nearest].y - H * 0.05, this.cursorX, this.cursorY);
        }
    }
    playSound(key, volume) {
        try {
            this.sound.play(key, { volume });
        }
        catch {
            // Audio can be unavailable in headless environments.
        }
    }
    shutdown() {
        if (this.pointerMoveHandler)
            document.removeEventListener('mousemove', this.pointerMoveHandler);
        if (this.pointerDownHandler)
            this.input.off('pointerdown', this.pointerDownHandler);
        if (this.contextMenuHandler)
            this.game.canvas.removeEventListener('contextmenu', this.contextMenuHandler);
        if (this.canvasResizeHandler) {
            window.removeEventListener('resize', this.canvasResizeHandler);
            this.game.scale.off('resize', this.canvasResizeHandler);
        }
        this.pointerMoveHandler = undefined;
        this.pointerDownHandler = undefined;
        this.contextMenuHandler = undefined;
        this.canvasResizeHandler = undefined;
        this.canvasBounds = undefined;
        super.shutdown();
    }
}
//# sourceMappingURL=SurfaceDefense.js.map