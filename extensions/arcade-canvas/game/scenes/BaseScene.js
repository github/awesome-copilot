// BaseScene — shared contract for all Agent Arcade mini-games.
// Provides score bridge to the HTML HUD, pause/resume hooks, and
// a consistent lifecycle so the game bootstrap can swap scenes.
export let W = window.innerWidth;
export let H = window.innerHeight;
/** Call before creating the Phaser game to ensure dimensions are current. */
export function refreshDimensions() {
    W = window.innerWidth;
    H = window.innerHeight;
}
export class BaseScene extends Phaser.Scene {
    score = 0;
    highScore = 0;
    lives = 3;
    level = 0;
    scoreAnimTimer;
    gameOverKeyListener;
    /** Full-screen dark backdrop controlled by the transparency slider. */
    _backdrop = null;
    /** Ready-screen state */
    _readyOverlay = null;
    _readyKeyListener;
    _readyOnStart;
    _wasOnReadyScreen = false;
    /** Timer for game-over delayed callback (cancel on shutdown to prevent leaks). */
    _gameOverDelayTimer = null;
    /** Tracked particle emitters for cleanup on shutdown. */
    activeEmitters = [];
    constructor(key) {
        super(key);
    }
    /** Safe localStorage helpers */
    storageGet(key) {
        try {
            return localStorage.getItem(key);
        }
        catch {
            return null;
        }
    }
    storageSet(key, value) {
        try {
            localStorage.setItem(key, value);
        }
        catch { /* quota exceeded or disabled */ }
    }
    storageRemove(key) {
        try {
            localStorage.removeItem(key);
        }
        catch { /* ignore */ }
    }
    /** Safely destroy a Phaser game object and return null for assignment. */
    destroyObj(obj) {
        if (obj) {
            try {
                obj.destroy();
            }
            catch { }
        }
        return null;
    }
    /** Spawn a particle explosion, track the emitter, and auto-cleanup. */
    spawnParticleExplosion(x, y, color, count, lifespan = 400) {
        try {
            const emitter = this.add.particles(x, y, 'spark', {
                speed: { min: 60, max: 180 },
                angle: { min: 0, max: 360 },
                scale: { start: 1.2, end: 0 },
                lifespan,
                quantity: count,
                tint: color,
                emitting: false,
            });
            emitter.setDepth(20);
            emitter.explode(count);
            this.activeEmitters.push(emitter);
            this.time.delayedCall(lifespan + 100, () => {
                const idx = this.activeEmitters.indexOf(emitter);
                if (idx >= 0)
                    this.activeEmitters.splice(idx, 1);
                emitter.destroy();
            });
        }
        catch {
            // Particle system unavailable, skip
        }
    }
    /** Load high score for this scene from localStorage. */
    loadHighScore() {
        // Clean up old agentBreak keys (from before rename)
        this.storageRemove(`agentBreak_board_${this.scene.key}`);
        this.storageRemove(`agentBreak_hi_${this.scene.key}`);
        const stored = this.storageGet(`agentArcade_hi_${this.scene.key}`);
        this.highScore = stored ? parseInt(stored, 10) || 0 : 0;
        this.gameOverShown = false;
        this.syncHighScoreToHUD();
    }
    /**
     * Common create() setup. Call at the start of every scene's create().
     * Registers pause bridge, shutdown listener, and resets shared state.
     */
    initBase() {
        this.setupPauseBridge();
        this.events.once('shutdown', () => this.shutdown());
        this.createBackdrop();
    }
    /** Create a full-screen dark backdrop whose alpha is controlled by the settings slider. */
    createBackdrop() {
        const g = this.add.graphics().setDepth(-100);
        g.fillStyle(0x000000, 1);
        g.fillRect(0, 0, W, H);
        g.setScrollFactor(0);
        // Read saved transparency (1–100 → alpha 0.01–1.0)
        let alpha = 1;
        try {
            const saved = localStorage.getItem('agentArcade_bgTransparency');
            if (saved !== null)
                alpha = Math.max(0.01, Math.min(1, parseInt(saved, 10) / 100));
        }
        catch { /* ignore */ }
        g.setAlpha(alpha);
        this._backdrop = g;
    }
    /** Called by the HUD slider to update the backdrop opacity in real time. */
    setBackdropAlpha(percent) {
        if (this._backdrop) {
            this._backdrop.setAlpha(Math.max(0.01, Math.min(1, percent / 100)));
        }
    }
    /** Save high score if current score exceeds it. */
    checkHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.storageSet(`agentArcade_hi_${this.scene.key}`, String(this.highScore));
            this.syncHighScoreToHUD();
        }
    }
    /** Push current score into the HTML HUD element. */
    syncScoreToHUD() {
        const el = document.getElementById('score-value');
        if (el)
            el.textContent = String(this.score);
    }
    /** Push high score into the HTML HUD element. */
    syncHighScoreToHUD() {
        const el = document.getElementById('hi-value');
        if (el)
            el.textContent = String(this.highScore);
    }
    /** Push lives count into the HTML HUD element. */
    syncLivesToHUD() {
        const el = document.getElementById('lives-value');
        if (el)
            el.textContent = String(this.lives);
    }
    /** Push level/wave number into the HTML HUD element. */
    syncLevelToHUD(value) {
        const el = document.getElementById('level-value');
        if (el)
            el.textContent = String(value ?? this.level);
    }
    /** Animated score bump (count-up + pop class). */
    addScore(points, worldX, worldY) {
        const prev = this.score;
        this.score += points;
        // Floating "+N" text at world position
        if (worldX !== undefined && worldY !== undefined) {
            const txt = this.add.text(worldX, worldY, `+${points}`, {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '14px',
                color: '#ffff00',
                stroke: '#000',
                strokeThickness: 3,
            });
            txt.setOrigin(0.5, 0.5).setDepth(900);
            this.tweens.add({
                targets: txt,
                y: worldY - 50,
                alpha: 0,
                duration: 800,
                onComplete: () => txt.destroy(),
            });
        }
        // Count-up animation in HUD
        const el = document.getElementById('score-value');
        if (!el)
            return;
        if (this.scoreAnimTimer)
            clearInterval(this.scoreAnimTimer);
        const start = prev;
        const end = this.score;
        const duration = 450;
        const startTime = performance.now();
        this.scoreAnimTimer = window.setInterval(() => {
            const t = Math.min(1, (performance.now() - startTime) / duration);
            const ease = 1 - Math.pow(1 - t, 3);
            el.textContent = String(Math.round(start + (end - start) * ease));
            if (t >= 1) {
                clearInterval(this.scoreAnimTimer);
                this.scoreAnimTimer = undefined;
                el.classList.remove('pop');
                void el.offsetWidth;
                el.classList.add('pop');
            }
        }, 16);
        this.checkHighScore();
    }
    /** Get top 10 scores for this game from localStorage. */
    getLeaderboard() {
        const stored = this.storageGet(`agentArcade_board_${this.scene.key}`);
        if (!stored)
            return [];
        try {
            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed))
                return [];
            return parsed.filter((n) => typeof n === 'number');
        }
        catch {
            return [];
        }
    }
    /** Add a score to the leaderboard, keep top 10, return rank (1-based, 0 = not in top 10). */
    addToLeaderboard(score) {
        if (score <= 0)
            return 0;
        const board = this.getLeaderboard();
        board.push(score);
        board.sort((a, b) => b - a);
        const trimmed = board.slice(0, 10);
        this.storageSet(`agentArcade_board_${this.scene.key}`, JSON.stringify(trimmed));
        this.checkHighScore();
        const rank = trimmed.indexOf(score) + 1;
        return rank <= 10 ? rank : 0;
    }
    gameOverShown = false;
    /** Show game over overlay with leaderboard. Call restartFn when dismissed. */
    showGameOver(finalScore, restartFn) {
        if (this.gameOverShown)
            return;
        this.gameOverShown = true;
        const rank = this.addToLeaderboard(finalScore);
        let board = this.getLeaderboard();
        // Reconcile: if stored high score isn't on the board, add it
        if (this.highScore > 0 && (board.length === 0 || this.highScore > board[0])) {
            board.push(this.highScore);
            board.sort((a, b) => b - a);
            board = board.slice(0, 10);
            this.storageSet(`agentArcade_board_${this.scene.key}`, JSON.stringify(board));
        }
        const overlay = document.createElement('div');
        overlay.id = 'gameover-overlay';
        overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.75); pointer-events: auto;
      animation: fadeIn 0.4s ease-out;
    `;
        const modal = document.createElement('div');
        modal.style.cssText = `
      background: linear-gradient(145deg, #0d1b2a 0%, #1b2838 50%, #0d1b2a 100%);
      border: 2px solid rgba(255,215,0,0.4);
      border-radius: 20px; padding: 36px 48px;
      text-align: center; min-width: 460px; max-width: 540px;
      box-shadow: 0 0 60px rgba(255,215,0,0.15), 0 0 100px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05);
      font-family: 'Press Start 2P', 'SF Mono', monospace;
      animation: scaleIn 0.3s ease-out;
    `;
        // Title
        const title = document.createElement('h2');
        title.textContent = 'GAME OVER';
        title.style.cssText = `
      color: #ff4444; font-size: 28px; margin: 0 0 20px;
      text-shadow: 0 0 20px rgba(255,68,68,0.6), 0 0 40px rgba(255,0,0,0.3);
      letter-spacing: 4px;
    `;
        modal.appendChild(title);
        // Divider
        const div1 = document.createElement('div');
        div1.style.cssText = 'height: 1px; background: linear-gradient(90deg, transparent, rgba(255,215,0,0.3), transparent); margin: 0 0 20px;';
        modal.appendChild(div1);
        // Score
        const scoreLine = document.createElement('p');
        scoreLine.innerHTML = `YOUR SCORE<br><span style="font-size:28px; color:#ffeb3b; text-shadow: 0 0 12px rgba(255,235,59,0.5);">${finalScore.toLocaleString()}</span>`;
        scoreLine.style.cssText = 'color: #8899aa; font-size: 10px; margin: 0 0 12px; letter-spacing: 2px; line-height: 2.2;';
        modal.appendChild(scoreLine);
        // Rank badge
        if (rank === 1) {
            const badge = document.createElement('div');
            badge.innerHTML = '🏆 NEW HIGH SCORE!';
            badge.style.cssText = `
        color: #ffd700; font-size: 13px; margin: 8px 0 16px;
        padding: 8px 16px; border-radius: 8px;
        background: rgba(255,215,0,0.1); border: 1px solid rgba(255,215,0,0.3);
        display: inline-block;
        text-shadow: 0 0 8px rgba(255,215,0,0.4);
      `;
            modal.appendChild(badge);
        }
        else if (rank > 0) {
            const badge = document.createElement('div');
            badge.textContent = `#${rank} ON LEADERBOARD`;
            badge.style.cssText = `
        color: #4fc3f7; font-size: 11px; margin: 8px 0 16px;
        padding: 6px 14px; border-radius: 8px;
        background: rgba(79,195,247,0.1); border: 1px solid rgba(79,195,247,0.2);
        display: inline-block;
      `;
            modal.appendChild(badge);
        }
        else {
            const spacer = document.createElement('div');
            spacer.style.cssText = 'height: 12px;';
            modal.appendChild(spacer);
        }
        // Divider
        const div2 = document.createElement('div');
        div2.style.cssText = 'height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent); margin: 12px 0 16px;';
        modal.appendChild(div2);
        // Leaderboard header
        const boardTitle = document.createElement('p');
        boardTitle.textContent = '─── TOP 10 ───';
        boardTitle.style.cssText = 'color: #667; font-size: 9px; margin: 0 0 10px; letter-spacing: 3px;';
        modal.appendChild(boardTitle);
        // Score list
        const table = document.createElement('div');
        table.style.cssText = 'margin: 0 auto; display: inline-block; width: 100%;';
        board.forEach((s, i) => {
            const isMe = (i === rank - 1);
            const row = document.createElement('div');
            row.style.cssText = `
        display: flex; justify-content: space-between; align-items: center;
        font-size: 16px; padding: 8px 16px; margin: 3px 0;
        border-radius: 8px;
        background: ${isMe ? 'rgba(255,235,59,0.12)' : (i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent')};
        ${isMe ? 'border: 1px solid rgba(255,235,59,0.25);' : ''}
      `;
            const rankEl = document.createElement('span');
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            rankEl.textContent = medal;
            rankEl.style.cssText = `
        color: ${isMe ? '#ffeb3b' : '#778'};
        min-width: 42px; text-align: left;
        font-size: ${i < 3 ? '20px' : '16px'};
      `;
            const scoreEl = document.createElement('span');
            scoreEl.textContent = s.toLocaleString();
            scoreEl.style.cssText = `
        color: ${isMe ? '#ffeb3b' : '#bcc'};
        font-size: ${i < 3 ? '20px' : '16px'};
        font-weight: ${i < 3 ? '900' : '700'};
        ${isMe ? 'text-shadow: 0 0 10px rgba(255,235,59,0.5);' : ''}
      `;
            if (isMe) {
                const youTag = document.createElement('span');
                youTag.textContent = '◄';
                youTag.style.cssText = 'color: #ffeb3b; font-size: 10px; margin-left: 6px;';
                scoreEl.appendChild(youTag);
            }
            row.appendChild(rankEl);
            row.appendChild(scoreEl);
            table.appendChild(row);
        });
        // Fill empty slots
        for (let i = board.length; i < 10; i++) {
            const row = document.createElement('div');
            row.style.cssText = `
        display: flex; justify-content: space-between;
        font-size: 16px; padding: 8px 16px; margin: 3px 0;
        color: #334;
      `;
            row.innerHTML = `<span>${i + 1}.</span><span>---</span>`;
            table.appendChild(row);
        }
        modal.appendChild(table);
        // Restart button — matches .help-close style from settings/help dialogs
        const restartBtn = document.createElement('button');
        restartBtn.textContent = 'RESTART';
        restartBtn.style.cssText = `
      display: block; margin: 22px auto 0; width: 100%; padding: 9px;
      background: linear-gradient(180deg, #ffd54a 0%, #c9a020 100%);
      border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 8px;
      color: #1a1a1a; font-weight: 700; letter-spacing: 1px; font-size: 13px;
      cursor: pointer; transition: filter 120ms;
    `;
        restartBtn.addEventListener('mouseenter', () => { restartBtn.style.filter = 'brightness(1.15)'; });
        restartBtn.addEventListener('mouseleave', () => { restartBtn.style.filter = ''; });
        modal.appendChild(restartBtn);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        // Disable click-through so the overlay is interactive
        const ti = window.__TAURI_INTERNALS__;
        if (ti)
            ti.invoke('set_click_through', { enabled: false });
        const dismiss = () => {
            this.gameOverShown = false;
            document.removeEventListener('keydown', onKey);
            overlay.remove();
            // Re-enable click-through
            if (ti)
                ti.invoke('set_click_through', { enabled: true });
            restartFn();
        };
        const onKey = (ev) => {
            if (ev.code === 'Space' || ev.code === 'Enter') {
                ev.preventDefault();
                dismiss();
            }
        };
        this.gameOverKeyListener = onKey;
        // Brief delay before accepting input (prevent accidental dismiss).
        // Guard against the scene being stopped during the delay.
        this._gameOverDelayTimer = this.time.delayedCall(500, () => {
            if (!this.scene.isActive())
                return;
            document.addEventListener('keydown', onKey);
            restartBtn.addEventListener('click', dismiss);
        });
    }
    // ── Ready screen ───────────────────────────────────────────────────────────
    /**
     * Freeze the scene and show the "Press any key to start" screen.
     * Call as the LAST statement in every scene's create() so all game objects
     * exist but nothing moves until the player is ready.
     * @param onStart Optional callback invoked the moment the player presses a
     *   key and the scene resumes — use this to defer first-wave setup so it
     *   doesn't render on top of the ready screen.
     */
    startWithReadyScreen(onStart) {
        this._readyOnStart = onStart;
        this.scene.pause();
        this.sound.stopAll(); // stop any sounds that fired during create()
        this._showPressAnyKey();
    }
    _showPressAnyKey() {
        this._cleanupReadyScreen();
        if (!document.getElementById('ready-screen-style')) {
            const style = document.createElement('style');
            style.id = 'ready-screen-style';
            style.textContent = `
        @keyframes readyBlink { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes readyGlow { 0%,100%{text-shadow:0 0 10px rgba(0,200,255,0.6),0 0 30px rgba(0,200,255,0.3)} 50%{text-shadow:0 0 20px rgba(0,200,255,0.9),0 0 50px rgba(0,200,255,0.5),0 0 80px rgba(0,100,255,0.2)} }
        @keyframes titleShimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes titleFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes neonPulse { 0%,100%{filter:drop-shadow(0 0 15px rgba(0,255,136,0.8)) drop-shadow(0 0 40px rgba(0,255,136,0.4)) drop-shadow(0 0 80px rgba(0,255,136,0.2))} 50%{filter:drop-shadow(0 0 25px rgba(0,255,136,1)) drop-shadow(0 0 60px rgba(0,255,136,0.6)) drop-shadow(0 0 120px rgba(0,255,136,0.3))} }
        @keyframes dividerPulse { 0%,100%{opacity:0.6;width:280px} 50%{opacity:1;width:360px} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes starTwinkle { 0%,100%{opacity:0.2} 50%{opacity:1} }
      `;
            document.head.appendChild(style);
        }
        const overlay = document.createElement('div');
        overlay.id = 'ready-overlay';
        overlay.style.cssText = `
      position:fixed;inset:0;z-index:8000;pointer-events:none;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      background:radial-gradient(ellipse at 50% 40%,rgba(0,15,60,0.80) 0%,rgba(0,5,20,0.92) 60%,rgba(0,0,0,0.95) 100%);
    `;
        // Decorative star particles
        for (let i = 0; i < 40; i++) {
            const star = document.createElement('div');
            const size = Math.random() < 0.3 ? 3 : 2;
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const delay = Math.random() * 3;
            const dur = 1.5 + Math.random() * 2;
            star.style.cssText = `
        position:absolute;left:${x}%;top:${y}%;width:${size}px;height:${size}px;
        background:#fff;border-radius:50%;
        animation:starTwinkle ${dur}s ease-in-out ${delay}s infinite;
        opacity:0.3;
      `;
            overlay.appendChild(star);
        }
        // Main content wrapper — styled panel matching the game-over dialog
        const content = document.createElement('div');
        content.style.cssText = `
      display:flex;flex-direction:column;align-items:center;
      animation:fadeSlideUp 0.6s ease-out both;
      position:relative;z-index:1;
      background:linear-gradient(145deg,#0d1b2a 0%,#1b2838 50%,#0d1b2a 100%);
      border:2px solid rgba(0,200,255,0.25);
      border-radius:20px;padding:42px 56px;
      box-shadow:0 0 60px rgba(0,200,255,0.1),0 0 100px rgba(0,0,0,0.8),inset 0 1px 0 rgba(255,255,255,0.05);
      max-width:700px;
    `;
        const title = document.createElement('div');
        title.textContent = this.displayName.toUpperCase();
        title.style.cssText = `
      font-family:'Press Start 2P',monospace;font-size:48px;letter-spacing:6px;
      -webkit-text-stroke:2px rgba(0,255,136,0.3);
      background:linear-gradient(90deg,#00ff88,#ffffff,#00ff88,#ffffff,#00ff88);
      background-size:200% auto;
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;
      background-clip:text;
      animation:titleShimmer 8s linear infinite,titleFloat 4s ease-in-out infinite,neonPulse 3s ease-in-out infinite;
      margin-bottom:22px;
    `;
        const divider = document.createElement('div');
        divider.style.cssText = `
      width:320px;height:2px;margin-bottom:20px;
      background:linear-gradient(90deg,transparent 0%,#00c8ff 20%,#ff6b35 50%,#00c8ff 80%,transparent 100%);
      border-radius:1px;box-shadow:0 0 12px rgba(0,200,255,0.4);
      animation:dividerPulse 3s ease-in-out infinite;
    `;
        const prompt = document.createElement('div');
        prompt.textContent = 'PRESS ANY KEY TO START';
        prompt.style.cssText = `
      font-family:'Press Start 2P',monospace;font-size:16px;letter-spacing:4px;
      color:#fff;
      animation:readyBlink 1.4s ease-in-out infinite,readyGlow 2s ease-in-out infinite;
      text-shadow:0 0 15px rgba(0,200,255,0.8);
    `;
        content.appendChild(title);
        const desc = this.getDescription();
        if (desc) {
            const descEl = document.createElement('div');
            descEl.textContent = desc;
            descEl.style.cssText = `
        font-family:'Press Start 2P',monospace;font-size:14px;letter-spacing:1px;
        color:#d0e8ff;max-width:700px;text-align:center;line-height:2;
        margin-bottom:18px;
        text-shadow:0 0 10px rgba(150,210,255,0.4);
      `;
            content.appendChild(descEl);
        }
        content.appendChild(divider);
        // Show control hints if the scene provides them
        const controls = this.getControls();
        if (controls.length > 0) {
            const controlsDiv = document.createElement('div');
            controlsDiv.style.cssText = `
        margin-top:24px;padding:18px 28px;
        background:linear-gradient(135deg,rgba(0,20,60,0.6) 0%,rgba(0,10,40,0.7) 100%);
        border:1px solid rgba(0,200,255,0.2);
        border-radius:12px;display:inline-block;
        box-shadow:0 4px 20px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.05);
        backdrop-filter:blur(4px);
      `;
            const controlsTitle = document.createElement('div');
            controlsTitle.textContent = 'CONTROLS';
            controlsTitle.style.cssText = `
        font-family:'Press Start 2P',monospace;font-size:13px;letter-spacing:5px;
        color:rgba(200,230,255,0.9);margin-bottom:16px;text-align:center;
        text-shadow:0 0 8px rgba(150,200,255,0.4);
      `;
            controlsDiv.appendChild(controlsTitle);
            for (const { key, action } of controls) {
                const row = document.createElement('div');
                row.style.cssText = `
          display:flex;justify-content:space-between;align-items:center;
          margin:8px 0;gap:28px;
        `;
                const keyEl = document.createElement('span');
                keyEl.textContent = key;
                keyEl.style.cssText = `
          font-family:'Press Start 2P',monospace;font-size:15px;
          color:#ffd54a;background:rgba(255,213,74,0.08);
          padding:7px 16px;border-radius:6px;border:1px solid rgba(255,213,74,0.25);
          min-width:90px;text-align:center;
          box-shadow:0 2px 6px rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.05);
          text-shadow:0 0 6px rgba(255,213,74,0.3);
        `;
                const actionEl = document.createElement('span');
                actionEl.textContent = action;
                actionEl.style.cssText = `
          font-family:'Press Start 2P',monospace;font-size:14px;
          color:#d0dde8;text-align:left;
        `;
                row.appendChild(keyEl);
                row.appendChild(actionEl);
                controlsDiv.appendChild(row);
            }
            content.appendChild(controlsDiv);
        }
        prompt.style.cssText += 'margin-top:32px;';
        content.appendChild(prompt);
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        this._readyOverlay = overlay;
        const onKey = (e) => {
            if (['Meta', 'Alt', 'Control', 'Shift'].includes(e.key))
                return;
            document.removeEventListener('keydown', onKey);
            this._readyKeyListener = undefined;
            this._cleanupReadyScreen();
            if (e.key === 'Escape') {
                // Let the normal pause system take over; re-show ready screen on resume
                this._wasOnReadyScreen = true;
                return;
            }
            e.preventDefault();
            this.scene.resume();
            this._fireReadyOnStart();
        };
        this._readyKeyListener = onKey;
        document.addEventListener('keydown', onKey);
    }
    _cleanupReadyScreen() {
        if (this._readyOverlay) {
            this._readyOverlay.remove();
            this._readyOverlay = null;
        }
        if (this._readyKeyListener) {
            document.removeEventListener('keydown', this._readyKeyListener);
            this._readyKeyListener = undefined;
        }
    }
    _fireReadyOnStart() {
        if (this._readyOnStart) {
            const fn = this._readyOnStart;
            this._readyOnStart = undefined;
            fn();
        }
    }
    /** Called by the pause system. Override if the scene needs custom cleanup. */
    pauseGame() {
        this.scene.pause();
        this.sound.pauseAll();
    }
    /** Called by the resume system. Override if needed. */
    resumeGame() {
        if (this._wasOnReadyScreen) {
            // Re-show the ready screen instead of resuming gameplay
            this._wasOnReadyScreen = false;
            this._showPressAnyKey();
            return;
        }
        this.scene.resume();
        this.sound.resumeAll();
        this._fireReadyOnStart();
    }
    /**
     * Wire up the pause/resume bridge between the HUD and the Phaser scene.
     * Call from create() — replaces the per-scene boilerplate that was duplicated
     * in every scene previously.
     */
    setupPauseBridge() {
        // __agentArcadePauseScene: pauses/resumes the Phaser scene ONLY (no Rust call).
        // Used by Rust-originated pause/resume to avoid feedback loops.
        window.__agentArcadePauseScene = (shouldPause) => {
            if (shouldPause)
                this.pauseGame();
            else
                this.resumeGame();
        };
        // __agentArcadePause: called from in-page UI (HUD buttons, game-switcher).
        // Pauses scene AND notifies Rust to shrink/expand window.
        window.__agentArcadePause = (shouldPause) => {
            const ab = window.agentArcade;
            if (shouldPause)
                this.pauseGame();
            else
                this.resumeGame();
            if (ab && ab.setClickThrough)
                ab.setClickThrough(shouldPause);
            if (ab && ab.setPaused)
                ab.setPaused(shouldPause);
        };
        const ab = window.agentArcade;
        if (ab && ab.onResumeRequest) {
            ab.onResumeRequest(() => {
                const hud = document.getElementById('hud');
                if (hud)
                    hud.classList.remove('paused');
                this.resumeGame();
            });
        }
    }
    /**
     * Show a "WAVE N" banner overlay — shared by space game scenes.
     * Auto-animates in/out and removes itself after ~2.2 seconds.
     */
    showWaveBanner(waveNum) {
        const existing = document.getElementById('wave-banner');
        if (existing)
            existing.remove();
        const banner = document.createElement('div');
        banner.id = 'wave-banner';
        banner.style.cssText = `
      position: fixed; top: 45%; left: 50%; transform: translate(-50%, -50%);
      padding: 12px 36px;
      background: linear-gradient(180deg, #1a1f3a 0%, #0a0e22 100%);
      border: 2px solid #ffd54a;
      border-radius: 12px;
      box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.08) inset,
        0 6px 24px rgba(0, 0, 0, 0.7),
        0 0 22px rgba(255, 213, 74, 0.45);
      font-family: -apple-system, system-ui, 'Helvetica Neue', sans-serif;
      font-size: 22px; font-weight: 700; letter-spacing: 2px;
      color: #ffd54a;
      text-shadow: 0 0 8px rgba(255, 213, 74, 0.6);
      z-index: 50; pointer-events: none; user-select: none;
      animation: waveBannerIn 0.3s ease-out;
    `;
        banner.textContent = `WAVE ${waveNum}`;
        document.body.appendChild(banner);
        if (!document.getElementById('wave-banner-style')) {
            const style = document.createElement('style');
            style.id = 'wave-banner-style';
            style.textContent = `
        @keyframes waveBannerIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.85); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
        @keyframes waveBannerOut { from { opacity: 1; } to { opacity: 0; } }
      `;
            document.head.appendChild(style);
        }
        setTimeout(() => {
            banner.style.animation = 'waveBannerOut 0.6s ease-in forwards';
            setTimeout(() => banner.remove(), 700);
        }, 1500);
    }
    /** Create the shared 'spark' texture used for particle effects. */
    ensureSparkTexture() {
        if (this.textures.exists('spark'))
            return;
        const g = this.add.graphics();
        g.fillStyle(0xffffff);
        g.fillCircle(4, 4, 4);
        g.generateTexture('spark', 8, 8);
        g.destroy();
    }
    /**
     * Create a parallax starfield. Returns the Star array for use with updateStarfield().
     * Each scene provides its own layer config (count, speed, size, alpha per layer).
     */
    createStarfield(layers) {
        const stars = [];
        for (const l of layers) {
            for (let i = 0; i < l.count; i++) {
                const gfx = this.add.graphics();
                const x = Math.random() * W;
                const y = Math.random() * H;
                gfx.fillStyle(0xffffff, l.alpha);
                gfx.fillCircle(0, 0, l.size);
                gfx.setPosition(x, y).setDepth(-9);
                stars.push({ x, y, speed: l.speed, size: l.size, alpha: l.alpha, gfx });
            }
        }
        return stars;
    }
    /** Update parallax starfield positions (call from update). */
    updateStarfield(stars, dt) {
        for (const s of stars) {
            s.y += s.speed * (dt / 1000);
            if (s.y > H)
                s.y -= H;
            s.gfx.setPosition(s.x, s.y);
        }
    }
    /** Clean up timers and listeners on scene shutdown. */
    shutdown() {
        if (this.scoreAnimTimer) {
            clearInterval(this.scoreAnimTimer);
            this.scoreAnimTimer = undefined;
        }
        if (this.gameOverKeyListener) {
            document.removeEventListener('keydown', this.gameOverKeyListener);
            this.gameOverKeyListener = undefined;
        }
        if (this._gameOverDelayTimer) {
            this._gameOverDelayTimer.remove();
            this._gameOverDelayTimer = null;
        }
        this._cleanupReadyScreen();
        this._readyOnStart = undefined;
        this._wasOnReadyScreen = false;
        this.time.removeAllEvents();
        this.activeEmitters.forEach(e => this.destroyObj(e));
        this.activeEmitters = [];
        const overlay = document.getElementById('gameover-overlay');
        if (overlay)
            overlay.remove();
    }
    /** Return a one-line description for the ready screen. Override in each scene. */
    getDescription() {
        return '';
    }
    /** Return control hints for the ready screen. Override in each scene. */
    getControls() {
        return [];
    }
}
//# sourceMappingURL=BaseScene.js.map