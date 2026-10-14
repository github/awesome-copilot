// Agent Arcade — game bootstrap and scene registry.
// Each mini-game is a Phaser Scene extending BaseScene.
import { W, H, refreshDimensions } from './scenes/BaseScene.js';
import { NinjaRunnerScene } from './scenes/NinjaRunner.js';
import { GalaxyBlasterScene } from './scenes/GalaxyBlaster.js';
import { CosmicRocksScene } from './scenes/CosmicRocks.js';
import { AlienOnslaughtScene } from './scenes/AlienOnslaught.js';
import { PlanetGuardianScene } from './scenes/PlanetGuardian.js';
import { SurfaceDefenseScene } from './scenes/SurfaceDefense.js';
import { runtimeLayout } from './layout.js';
// Registry of available games
// pointerGame: the game aims with the mouse, so click-through must stay off
// while it is active (see __agentArcadeSetPointerGameActive in hud.js).
const GAMES = [
    { key: 'cosmic-rocks', scene: CosmicRocksScene, label: '☄️ Cosmic Rocks' },
    { key: 'alien-onslaught', scene: AlienOnslaughtScene, label: '👾 Alien Onslaught' },
    { key: 'galaxy-blaster', scene: GalaxyBlasterScene, label: '🚀 Galaxy Blaster' },
    { key: 'ninja-runner', scene: NinjaRunnerScene, label: '🥷 Ninja Runner' },
    { key: 'defender', scene: PlanetGuardianScene, label: '🛡️ Planet Guardian' },
    { key: 'surface-defense', scene: SurfaceDefenseScene, label: '🎯 Surface Defense', pointerGame: true },
];
const isPointerGame = (key) => !!GAMES.find(g => g.key === key)?.pointerGame;
let currentGameKey;
try {
    // Migrate localStorage from old "galaxy-shooter" name
    const lastGame = localStorage.getItem('agentArcade_lastGame');
    if (lastGame === 'galaxy-shooter')
        localStorage.setItem('agentArcade_lastGame', 'galaxy-blaster');
    const oldHi = localStorage.getItem('agentArcade_hi_galaxy-shooter');
    if (oldHi) {
        localStorage.setItem('agentArcade_hi_galaxy-blaster', oldHi);
        localStorage.removeItem('agentArcade_hi_galaxy-shooter');
    }
    currentGameKey = localStorage.getItem('agentArcade_lastGame') || 'ninja-runner';
}
catch {
    currentGameKey = 'ninja-runner';
}
// Validate stored key exists in registry
if (!GAMES.find(g => g.key === currentGameKey))
    currentGameKey = 'ninja-runner';
// Create the Phaser game once the window is full-screen.
// Tauri's Rust backend resizes the window after setup — we listen for the
// `resize` event so we create the game at the correct dimensions.
let game = null;
function initGame() {
    refreshDimensions();
    const selectedGame = GAMES.find(g => g.key === currentGameKey);
    const sceneOrder = [selectedGame, ...GAMES.filter(g => g !== selectedGame)];
    game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: 'game',
        width: W,
        height: H,
        transparent: true,
        backgroundColor: 'rgba(0,0,0,0)',
        scene: sceneOrder.map(g => g.scene),
        physics: {
            default: 'arcade',
            arcade: { gravity: { y: 1800 }, debug: false },
        },
        render: { pixelArt: true, antialias: false, transparent: true },
        fps: { target: 60 },
    });
    // Expose game instance for Playwright testing (no production impact)
    window.__phaserGame = game;
    guardMissingAudio(game);
    setupGameSwitcher();
    if (isPointerGame(currentGameKey)) {
        window.__agentArcadeSetPointerGameActive?.(true);
    }
}
/**
 * Audio that fails to decode (missing codecs — e.g. WebKitGTK without the
 * GStreamer plugin packages) never reaches the cache, and Phaser then throws
 * "Audio key not found in cache" from sound.play()/add(). An exception inside
 * the frame callback stops requestAnimationFrame for good and freezes the
 * game, so hand back a silent sound for missing keys instead.
 */
function guardMissingAudio(game) {
    const sm = game.sound;
    const cache = game.cache?.audio;
    if (!sm || !cache)
        return;
    const origAdd = sm.add.bind(sm);
    sm.add = (key, config) => cache.exists(key) ? origAdd(key, config) : new Phaser.Sound.NoAudioSound(sm, key, config);
    const origPlay = sm.play.bind(sm);
    sm.play = (key, extra) => (cache.exists(key) ? origPlay(key, extra) : false);
}
function setupGameSwitcher() {
    // Expose game switcher for the HUD dropdown
    window.__agentArcadeSwitchGame = (key) => {
        const entry = GAMES.find(g => g.key === key);
        if (!entry || key === currentGameKey)
            return;
        const wasPaused = document.getElementById('hud')?.classList.contains('paused') ?? false;
        // Set skip flag BEFORE anything else so the Rust-triggered onResume
        // won't fire scene resume callbacks on the new scene.
        if (wasPaused)
            window.__agentArcadeSkipResume = true;
        // Stop all audio globally (covers paused sounds too)
        if (game.sound)
            game.sound.stopAll();
        // Remove DOM overlays from the previous scene (game-over, wave banner, ready screen)
        for (const id of ['gameover-overlay', 'wave-banner', 'ready-overlay']) {
            const el = document.getElementById(id);
            if (el)
                el.remove();
        }
        // Stop current scene, start new one
        game.scene.stop(currentGameKey);
        game.scene.start(key);
        currentGameKey = key;
        try {
            localStorage.setItem('agentArcade_lastGame', key);
        }
        catch { /* ignore */ }
        // Tell Rust we're unpaused so the window expands back to full-screen.
        const ab = window.agentArcade;
        if (wasPaused && ab && ab.setPaused)
            ab.setPaused(false);
        // The cursor was over the HUD to trigger this switch, so click-through should
        // stay OFF. Calling setClickThrough(false) also triggers set_focus() in Rust,
        // restoring OS keyboard focus after the native <select> interaction. The
        // cursor-tracking system will re-enable click-through naturally when the
        // cursor leaves the HUD area — calling setClickThrough(true) here would stall
        // the tracker (polling is stopped while isOverHud=true, and enabling
        // click-through kills mousemove events, leaving no way to detect HUD exit).
        if (ab && ab.setClickThrough)
            ab.setClickThrough(false);
        window.__agentArcadeSetPointerGameActive?.(isPointerGame(key));
        const sel = document.getElementById('game-select');
        if (sel) {
            sel.value = key;
            sel.blur();
        }
        game.canvas.focus();
    };
}
// Listen for window resize events from Tauri.
// On first resize that looks full-screen, create the game.
// On later resizes (e.g. monitor change), resize the canvas.
// Pause/resume shrinks/expands the window — we must NOT update game
// dimensions when the window shrinks to HUD-only size, and must NOT
// restart the scene when expanding back from a pause.
let resizeDebounce = null;
window.addEventListener('resize', () => {
    if (resizeDebounce)
        clearTimeout(resizeDebounce);
    resizeDebounce = window.setTimeout(() => {
        const newW = window.innerWidth;
        const newH = window.innerHeight;
        if (!game && newW > runtimeLayout.minimumWidth && newH > runtimeLayout.minimumHeight) {
            // First time: window is now full-screen — create the game
            refreshDimensions();
            initGame();
        }
        else if (game && newH > runtimeLayout.minimumHeight) {
            // Full-screen resize (could be unpause expand or genuine resize).
            // Update dimensions and resize the canvas, but never restart the
            // scene — the resume system handles unpause, and a simple resize
            // is enough for monitor/display changes.
            const previousW = W;
            const previousH = H;
            refreshDimensions();
            if (W !== previousW || H !== previousH) {
                game.scale.resize(W, H);
            }
        }
        // Below the profile's minimum height (pause shrink to HUD), skip entirely —
        // keep W/H at full-screen values so the paused game state stays valid.
    }, 150);
});
// Populate game selector dropdown
function populateGameSelector() {
    const sel = document.getElementById('game-select');
    if (!sel)
        return;
    sel.innerHTML = '';
    GAMES.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.key;
        opt.textContent = g.label;
        if (g.key === currentGameKey)
            opt.selected = true;
        sel.appendChild(opt);
    });
    sel.addEventListener('change', () => {
        window.__agentArcadeSwitchGame(sel.value);
    });
}
// Wait for DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', populateGameSelector);
}
else {
    populateGameSelector();
}
// If the window is already full-screen (e.g. Playwright tests or fast Tauri
// init), create the game immediately since no resize event will fire.
setTimeout(() => {
    if (!game && window.innerWidth > runtimeLayout.minimumWidth && window.innerHeight > runtimeLayout.minimumHeight) {
        refreshDimensions();
        initGame();
    }
}, 200);
//# sourceMappingURL=game.js.map