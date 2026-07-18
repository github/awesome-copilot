// ── HUD Logic ──
// Extracted from index.html to reduce inline script bloat.
// Handles: media session cleanup, Tauri bridge, mute/settings/help UI,
// hotkey picker, transparency slider, drag handle, and canvas refocus.

// ── Media session cleanup ──
// Prevent the app from taking over macOS media/volume controls.
// Clear the media session so the OS doesn't treat game audio as "Now Playing".
if ('mediaSession' in navigator) {
  navigator.mediaSession.metadata = null;
  navigator.mediaSession.playbackState = 'none';
  // Remove all media session action handlers
  ['play','pause','stop','seekbackward','seekforward','previoustrack','nexttrack'].forEach(function(a) {
    try { navigator.mediaSession.setActionHandler(a, null); } catch(e) {}
  });
}

// ── Tauri compatibility bridge ──
// ── Tauri compatibility bridge ──
// Creates window.agentArcade matching the Electron preload API so game
// scenes work identically on both runtimes.
(function() {
  var ti = window.__TAURI_INTERNALS__;
  if (!ti) return; // Not running in Tauri

  var resumeCallbacks = [];
  window.agentArcade = {
    setClickThrough: function(enabled) {
      ti.invoke('set_click_through', { enabled: !!enabled });
    },
    setPaused: function(paused) {
      ti.invoke('set_paused', { paused: !!paused });
    },
    onResumeRequest: function(cb) {
      resumeCallbacks = [cb];
    },
    quitApp: function() {
      ti.invoke('quit_app');
    },
    hideApp: function() {
      ti.invoke('hide_app');
    }
  };

  // Restores overlay/canvas state after a resume and sets the definitive click-through
  // value based on which interactive overlays are currently visible. Called inside a
  // 300ms setTimeout to let the Tauri window finish resizing before touching the DOM.
  // Both resume paths (Ctrl+Escape via Rust and Resume-button via HUD) use this so the
  // click-through logic lives in exactly one place.
  // Note: settingsOv / helpOv / updateBanner are var-hoisted from line ~119 in this IIFE
  // and are fully assigned before any resume event can fire.
  function restoreAfterResume() {
    var go = document.getElementById('gameover-overlay');
    if (go) go.setAttribute('style',
      'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999;' +
      'display:flex;align-items:center;justify-content:center;' +
      'background:rgba(0,0,0,0.75);pointer-events:auto;');
    var wb = document.getElementById('wave-banner');
    if (wb) wb.style.display = '';
    var c = document.querySelector('canvas');
    if (c) c.focus();
    // Determine whether any interactive overlay needs click-through OFF.
    var hasOverlay = !!go ||
      !!(settingsOv && settingsOv.classList.contains('show')) ||
      !!(helpOv && helpOv.classList.contains('show')) ||
      !!(updateBanner && updateBanner.classList.contains('show'));
    ti.invoke('set_click_through', { enabled: !hasOverlay });
  }

  // Shared logic for both resume paths: notify game, clear paused CSS, then restore
  // overlays + click-through after the window resize settles.
  function onResume() {
    // Skip scene resume callbacks if a game switch is in progress
    if (!window.__agentArcadeSkipResume) {
      resumeCallbacks.forEach(function(cb) { try { cb(); } catch(e) {} });
    }
    window.__agentArcadeSkipResume = false;
    var hud = document.getElementById('hud');
    if (hud) hud.classList.remove('paused');
    document.body.classList.remove('paused');
    setTimeout(restoreAfterResume, 300);
  }

  // Called from Rust via win.eval() when the global Ctrl+Escape shortcut fires.
  window.__agentArcadeResumeFromRust = onResume;

  // Called from Rust when the Resume HUD button triggers set_paused(false).
  window.__agentArcadeOnResume = onResume;

  // Called from Rust when game should enter paused state
  // Uses __agentArcadePauseScene (scene-only, no Rust callback) to avoid feedback loops.
  window.__agentArcadeOnPause = function() {
    if (window.__agentArcadePauseScene) {
      try { window.__agentArcadePauseScene(true); } catch(e) {}
    }
    var hud = document.getElementById('hud');
    if (hud) hud.classList.add('paused');
    document.body.classList.add('paused');
    var go = document.getElementById('gameover-overlay');
    if (go) go.style.display = 'none';
    var wb = document.getElementById('wave-banner');
    if (wb) wb.style.display = 'none';
    var ho = document.getElementById('help-overlay');
    if (ho) ho.classList.remove('show');
    var ro = document.getElementById('ready-overlay');
    if (ro) ro.remove();
  };

  // Hybrid cursor tracking: event-based when over HUD, IPC polling otherwise.
  // When click-through is OFF (cursor over HUD), mousemove events fire normally
  // so we detect exit via events. When click-through is ON, events don't fire
  // so we poll at 250ms to detect HUD entry.
  var isOverHud = false;
  var pollTimer = null;
  var hudEl = document.getElementById('hud');
  var helpOv = document.getElementById('help-overlay');
  var settingsOv = document.getElementById('settings-overlay');
  var updateBanner = document.getElementById('update-banner');

  function isOverHudArea(x, y) {
    if (!hudEl) return false;
    var rect = hudEl.getBoundingClientRect();
    var over = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    if (helpOv && helpOv.classList.contains('show')) over = true;
    if (settingsOv && settingsOv.classList.contains('show')) over = true;
    if (updateBanner && updateBanner.classList.contains('show')) {
      var br = updateBanner.getBoundingClientRect();
      if (x >= br.left && x <= br.right && y >= br.top && y <= br.bottom) over = true;
    }
    return over;
  }

  function onCursorOverHud() {
    if (isOverHud) return;
    isOverHud = true;
    ti.invoke('set_click_through', { enabled: false });
    if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
    document.addEventListener('mousemove', onDocMouseMove);
  }

  function onCursorLeftHud() {
    if (!isOverHud) return;
    isOverHud = false;
    // When paused, Rust manages click-through (always OFF so HUD bar is clickable).
    // Only enable click-through in running state to avoid race conditions.
    if (!document.body.classList.contains('paused')) {
      ti.invoke('set_click_through', { enabled: true });
    }
    document.removeEventListener('mousemove', onDocMouseMove);
    schedulePoll();
  }

  function onDocMouseMove(e) {
    if (!isOverHudArea(e.clientX, e.clientY)) onCursorLeftHud();
  }

  function pollCursorPosition() {
    var so = settingsOv && settingsOv.classList.contains('show');
    if (document.hidden || (document.body.classList.contains('paused') && !so)) {
      schedulePoll();
      return;
    }
    ti.invoke('get_cursor_in_window').then(function(pos) {
      if (pos && isOverHudArea(pos[0], pos[1])) {
        onCursorOverHud();
      } else {
        schedulePoll();
      }
    }).catch(function() { schedulePoll(); });
  }

  function schedulePoll() {
    if (pollTimer) clearTimeout(pollTimer);
    pollTimer = setTimeout(pollCursorPosition, 250);
  }

  schedulePoll();

  // Reclaim OS keyboard focus the instant the window loses it during active
  // gameplay. Click-through lets clicks pass to apps below, which causes macOS
  // to hand keyboard focus to that app. The blur event fires immediately when
  // that happens — we invoke request_focus to take it back without touching
  // click-through state. Does nothing when paused or hidden so the user can
  // freely switch apps after pressing Escape.
  window.addEventListener('blur', function() {
    if (!document.body.classList.contains('paused') && !document.hidden) {
      ti.invoke('request_focus');
    }
  });
})();

// ── HUD controls ──
(function () {
  var hud = document.getElementById('hud');

  function isPaused() { return hud.classList.contains('paused'); }
  function setPaused(p) {
    hud.classList.toggle('paused', p);
    document.body.classList.toggle('paused', p);
    if (window.__agentArcadePause) {
      try { window.__agentArcadePause(p); } catch (e) {}
    } else if (window.agentArcade && window.agentArcade.setClickThrough) {
      window.agentArcade.setClickThrough(p);
      if (window.agentArcade.setPaused) window.agentArcade.setPaused(p);
    }
  }

  // Help button — show controls overlay
  var helpBtn = document.getElementById('help-btn');
  var helpOverlay = document.getElementById('help-overlay');
  var helpClose = document.getElementById('help-close');

  var wasGamePausedBeforeHelp = false;

  function showHelp() {
    wasGamePausedBeforeHelp = isPaused();
    if (!wasGamePausedBeforeHelp) {
      var game = window.__phaserGame;
      if (game && game.scene) {
        game.scene.getScenes(true).forEach(function(s) {
          if (s.scene && s.scene.pause) s.scene.pause();
          if (s.sound && s.sound.pauseAll) s.sound.pauseAll();
        });
      }
    }
    helpOverlay.classList.add('show');
  }
  function hideHelp() {
    helpOverlay.classList.remove('show');
    if (!wasGamePausedBeforeHelp) {
      var game = window.__phaserGame;
      if (game && game.scene) {
        game.scene.getScenes(false).forEach(function(s) {
          if (s.scene && s.scene.resume) s.scene.resume();
          if (s.sound && s.sound.resumeAll) s.sound.resumeAll();
        });
      }
    }
  }
  helpBtn.addEventListener('click', showHelp);
  helpClose.addEventListener('click', hideHelp);
  helpOverlay.addEventListener('click', function (e) {
    if (e.target === helpOverlay) hideHelp();
  });

  // Close button — quit the app
  var closeBtn = document.getElementById('close-btn');
  closeBtn.addEventListener('click', function () {
    if (window.agentArcade && window.agentArcade.quitApp) {
      window.agentArcade.quitApp();
    }
  });

  // Minimize button — hide the app (show again via Ctrl+Alt+M or tray)
  var minimizeBtn = document.getElementById('minimize-btn');
  minimizeBtn.addEventListener('click', function () {
    if (window.agentArcade && window.agentArcade.hideApp) {
      window.agentArcade.hideApp();
    }
  });

  // Resume button — unpause the game (shown only when paused)
  var resumeBtn = document.getElementById('resume-btn');
  resumeBtn.addEventListener('click', function () {
    if (window.agentArcade && window.agentArcade.setPaused) {
      window.agentArcade.setPaused(false);
    }
  });

  // Mute button — toggle all game audio
  // NOTE: Phaser's game.sound.mute setter uses setValueAtTime(val, 0) which
  // silently fails once AudioContext.currentTime > 0. We bypass it by directly
  // setting masterMuteNode.gain.value and tracking state ourselves.
  var muteBtn = document.getElementById('mute-btn');
  var audioToggle = document.getElementById('audio-toggle');
  var isMuted = false;

  function setMuted(muted) {
    var game = window.__phaserGame;
    if (!game || !game.sound) return;
    isMuted = !!muted;
    // Directly set gain value — bypasses Phaser's broken setValueAtTime(val,0)
    if (game.sound.masterMuteNode && game.sound.masterMuteNode.gain) {
      game.sound.masterMuteNode.gain.value = isMuted ? 0 : 1;
    }
    muteBtn.textContent = isMuted ? '🔇' : '🔊';
    muteBtn.classList.toggle('muted', isMuted);
    if (audioToggle) audioToggle.checked = !isMuted;
    try { localStorage.setItem('agentArcade_muted', isMuted ? '1' : '0'); } catch(e) {}
  }

  function toggleMute() {
    setMuted(!isMuted);
  }

  muteBtn.addEventListener('click', toggleMute);
  // Restore mute state from localStorage
  setTimeout(function() {
    try {
      if (localStorage.getItem('agentArcade_muted') === '1') {
        setMuted(true);
      }
    } catch(e) {}
  }, 500);
  // M key shortcut
  document.addEventListener('keydown', function(e) {
    if (e.code === 'KeyM' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      // Don't toggle if typing in an input or game is paused
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      toggleMute();
    }
  });

  // Settings button — show settings overlay
  var settingsBtn = document.getElementById('settings-btn');
  var settingsOverlay = document.getElementById('settings-overlay');
  var settingsClose = document.getElementById('settings-close');
  var settingsVersion = document.getElementById('settings-version');
  var bgSlider = document.getElementById('bg-transparency');
  var bgValue = document.getElementById('bg-transparency-value');

  // Populate version from Rust
  if (settingsVersion) {
    var tauriApi = window.__TAURI_INTERNALS__;
    if (tauriApi) {
      tauriApi.invoke('get_app_version').then(function(v) {
        settingsVersion.textContent = 'Version ' + v;
      }).catch(function() {});
    }
  }

  // Default background transparency = 25 (subtle dark tint, desktop shows through)
  var DEFAULT_BG_TRANSPARENCY = 25;
  var currentBgTransparency = DEFAULT_BG_TRANSPARENCY;

  // Restore saved settings
  try {
    // One-time migration: reset old 100% default to new 25% default
    if (!localStorage.getItem('agentArcade_bgDefault_v2')) {
      localStorage.removeItem('agentArcade_bgTransparency');
      localStorage.setItem('agentArcade_bgDefault_v2', '1');
    }
    var savedBg = localStorage.getItem('agentArcade_bgTransparency');
    if (savedBg !== null) {
      currentBgTransparency = parseInt(savedBg, 10) || DEFAULT_BG_TRANSPARENCY;
    } else {
      // New user — persist the default so it's always in localStorage
      localStorage.setItem('agentArcade_bgTransparency', String(DEFAULT_BG_TRANSPARENCY));
    }
  } catch(e) {}

  function applyBgTransparency(val) {
    currentBgTransparency = val;
    bgSlider.value = val;
    bgValue.textContent = val + '%';
    // Update ALL Phaser scenes' backdrop alpha (including paused/sleeping)
    var game = window.__phaserGame;
    if (game) {
      var allScenes = game.scene.scenes;
      for (var i = 0; i < allScenes.length; i++) {
        if (typeof allScenes[i].setBackdropAlpha === 'function') {
          allScenes[i].setBackdropAlpha(val);
        }
      }
    }
    try { localStorage.setItem('agentArcade_bgTransparency', String(val)); } catch(e) {}
  }

  bgSlider.addEventListener('input', function() {
    applyBgTransparency(parseInt(bgSlider.value, 10));
  });

  // Apply saved transparency once game canvas is ready (retry until scene exists)
  (function retryApply(attempts) {
    var game = window.__phaserGame;
    var hasScene = game && game.scene && game.scene.scenes.length > 0 &&
      typeof game.scene.scenes[0].setBackdropAlpha === 'function';
    if (hasScene || attempts <= 0) {
      applyBgTransparency(currentBgTransparency);
    } else {
      setTimeout(function() { retryApply(attempts - 1); }, 300);
    }
  })(10);

  // Audio toggle syncs with mute state
  function syncAudioToggle() {
    audioToggle.checked = !isMuted;
  }

  audioToggle.addEventListener('change', function() {
    setMuted(!audioToggle.checked);
  });

  // ── Hotkey picker ─────────────────────────────────────────
  var hotkeyDisplay = document.getElementById('hotkey-display');
  var hotkeyRecordBtn = document.getElementById('hotkey-record-btn');
  var hotkeyResetBtn = document.getElementById('hotkey-reset-btn');
  var hotkeyStatus = document.getElementById('hotkey-status');
  var DEFAULT_HOTKEY = 'Ctrl+Alt+M';
  var currentHotkey = DEFAULT_HOTKEY;
  try {
    var saved = localStorage.getItem('agentArcade_hotkey');
    if (saved) currentHotkey = saved;
  } catch(e) {}
  hotkeyDisplay.value = currentHotkey;

  // ── Pause hotkey picker ────────────────────────────────────
  var pauseDisplay = document.getElementById('pause-hotkey-display');
  var pauseRecordBtn = document.getElementById('pause-hotkey-record-btn');
  var pauseResetBtn = document.getElementById('pause-hotkey-reset-btn');
  var pauseStatus = document.getElementById('pause-hotkey-status');
  var DEFAULT_PAUSE_KEY = 'Escape';
  var currentPauseKey = DEFAULT_PAUSE_KEY;
  try {
    var savedPause = localStorage.getItem('agentArcade_pauseKey');
    if (savedPause) currentPauseKey = savedPause;
  } catch(e) {}
  pauseDisplay.value = currentPauseKey;

  // ── Unpause hotkey picker ──────────────────────────────────
  var unpauseDisplay = document.getElementById('unpause-hotkey-display');
  var unpauseRecordBtn = document.getElementById('unpause-hotkey-record-btn');
  var unpauseResetBtn = document.getElementById('unpause-hotkey-reset-btn');
  var unpauseStatus = document.getElementById('unpause-hotkey-status');
  var DEFAULT_UNPAUSE_KEY = 'Ctrl+Escape';
  var currentUnpauseKey = DEFAULT_UNPAUSE_KEY;
  try {
    var savedUnpause = localStorage.getItem('agentArcade_unpauseKey');
    if (savedUnpause) currentUnpauseKey = savedUnpause;
  } catch(e) {}
  unpauseDisplay.value = currentUnpauseKey;

  // Shared recording state: 'none', 'toggle', 'pause', or 'unpause'
  var recordingTarget = 'none';

  function getRecordingUI(target) {
    if (target === 'toggle') return { display: hotkeyDisplay, btn: hotkeyRecordBtn, status: hotkeyStatus };
    if (target === 'pause') return { display: pauseDisplay, btn: pauseRecordBtn, status: pauseStatus };
    return { display: unpauseDisplay, btn: unpauseRecordBtn, status: unpauseStatus };
  }

  function getCurrentValue(target) {
    if (target === 'toggle') return currentHotkey;
    if (target === 'pause') return currentPauseKey;
    return currentUnpauseKey;
  }

  function startRecording(target) {
    // Cancel any other active recording
    if (recordingTarget !== 'none' && recordingTarget !== target) stopRecording(recordingTarget);
    recordingTarget = target;
    var ui = getRecordingUI(target);
    ui.display.value = target === 'toggle' ? 'Press keys...' : 'Press key...';
    ui.display.style.borderColor = '#f0c020';
    ui.btn.textContent = 'Cancel';
    ui.status.textContent = '';
  }

  function stopRecording(target) {
    recordingTarget = 'none';
    var ui = getRecordingUI(target);
    ui.display.value = getCurrentValue(target);
    ui.display.style.borderColor = '#555';
    ui.btn.textContent = 'Change';
  }

  hotkeyRecordBtn.addEventListener('click', function() {
    if (recordingTarget === 'toggle') stopRecording('toggle');
    else startRecording('toggle');
  });
  hotkeyDisplay.addEventListener('click', function() {
    if (recordingTarget !== 'toggle') startRecording('toggle');
  });
  pauseRecordBtn.addEventListener('click', function() {
    if (recordingTarget === 'pause') stopRecording('pause');
    else startRecording('pause');
  });
  pauseDisplay.addEventListener('click', function() {
    if (recordingTarget !== 'pause') startRecording('pause');
  });
  unpauseRecordBtn.addEventListener('click', function() {
    if (recordingTarget === 'unpause') stopRecording('unpause');
    else startRecording('unpause');
  });
  unpauseDisplay.addEventListener('click', function() {
    if (recordingTarget !== 'unpause') startRecording('unpause');
  });

  // Map KeyboardEvent to combo string (requireModifier=true for toggle, false for pause)
  function keyEventToCombo(e, requireModifier) {
    var parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Super');

    var key = e.key;
    if (['Control', 'Alt', 'Shift', 'Meta'].indexOf(key) >= 0) return null;

    // Normalize the key name
    if (key.length === 1) {
      parts.push(key.toUpperCase());
    } else if (key.match(/^F\d+$/)) {
      parts.push(key);
    } else if (key === 'Escape') {
      parts.push('Escape');
    } else if (key === ' ') {
      parts.push('Space');
    } else if (key === 'Tab') {
      parts.push('Tab');
    } else if (key === 'Enter') {
      parts.push('Enter');
    } else if (key === 'Backspace') {
      parts.push('Backspace');
    } else {
      return null;
    }

    if (requireModifier && parts.length < 2) return null;
    return parts.join('+');
  }

  // Save a hotkey via Tauri invoke and update UI
  function saveHotkey(type, combo, displayEl, statusEl, storageKey, tauriCmd, currentRef) {
    displayEl.value = combo;
    displayEl.style.borderColor = '#555';
    var ui = getRecordingUI(type);
    ui.btn.textContent = 'Change';
    statusEl.textContent = 'Saving...';
    statusEl.style.color = '#888';
    recordingTarget = 'none';

    var ti = window.__TAURI_INTERNALS__;
    if (ti) {
      ti.invoke(tauriCmd, { combo: combo }).then(function() {
        currentRef.value = combo;
        displayEl.value = combo;
        statusEl.textContent = '✓ Saved';
        statusEl.style.color = '#4f4';
        try { localStorage.setItem(storageKey, combo); } catch(ex) {}
        setTimeout(function() { statusEl.textContent = ''; }, 2000);
      }).catch(function() {
        displayEl.value = currentRef.value;
        statusEl.textContent = 'Taken!';
        statusEl.style.color = '#f44';
        setTimeout(function() { statusEl.textContent = ''; }, 3000);
      });
    } else {
      currentRef.value = combo;
      try { localStorage.setItem(storageKey, combo); } catch(ex) {}
      statusEl.textContent = '✓ Saved';
      statusEl.style.color = '#4f4';
      setTimeout(function() { statusEl.textContent = ''; }, 2000);
    }
  }

  // Mutable refs so saveHotkey can update the outer variables
  var toggleRef = { value: currentHotkey };
  var pauseRef = { value: currentPauseKey };
  var unpauseRef = { value: currentUnpauseKey };

  // Keep help dialog hotkeys in sync with current settings
  function syncHelpHotkeys() {
    var toggleEl = document.getElementById('help-toggle-keys');
    var pauseEl = document.getElementById('help-pause-keys');
    var unpauseEl = document.getElementById('help-unpause-keys');
    if (toggleEl) { toggleEl.textContent = ''; toggleEl.appendChild(comboToKbds(currentHotkey)); }
    if (pauseEl) { pauseEl.textContent = ''; pauseEl.appendChild(comboToKbds(currentPauseKey)); }
    if (unpauseEl) { unpauseEl.textContent = ''; unpauseEl.appendChild(comboToKbds(currentUnpauseKey)); }
  }
  // Convert a combo string like "Ctrl+Alt+M" into <kbd> elements
  function comboToKbds(combo) {
    var map = { Ctrl: '⌃', Alt: '⌥', Shift: '⇧', Super: '⌘', Escape: 'Esc' };
    var frag = document.createDocumentFragment();
    combo.split('+').forEach(function(part) {
      var kbd = document.createElement('kbd');
      kbd.textContent = map[part] || part;
      frag.appendChild(kbd);
    });
    return frag;
  }
  syncHelpHotkeys();

  document.addEventListener('keydown', function(e) {
    if (recordingTarget === 'none') return;
    e.preventDefault();
    e.stopPropagation();

    // Toggle requires modifier; pause and unpause allow any combo
    var requireMod = recordingTarget === 'toggle';
    var combo = keyEventToCombo(e, requireMod);

    if (!combo) {
      var ui = getRecordingUI(recordingTarget);
      ui.display.value = requireMod ? 'Need modifier + key' : 'Press a valid key';
      return;
    }

    if (recordingTarget === 'toggle') {
      saveHotkey('toggle', combo, hotkeyDisplay, hotkeyStatus, 'agentArcade_hotkey', 'set_toggle_shortcut', toggleRef);
      currentHotkey = combo;
    } else if (recordingTarget === 'pause') {
      saveHotkey('pause', combo, pauseDisplay, pauseStatus, 'agentArcade_pauseKey', 'set_pause_shortcut', pauseRef);
      currentPauseKey = combo;
    } else if (recordingTarget === 'unpause') {
      saveHotkey('unpause', combo, unpauseDisplay, unpauseStatus, 'agentArcade_unpauseKey', 'set_unpause_shortcut', unpauseRef);
      currentUnpauseKey = combo;
    }
    syncHelpHotkeys();
  }, true);

  // Reset buttons
  hotkeyResetBtn.addEventListener('click', function() {
    if (recordingTarget === 'toggle') stopRecording('toggle');
    saveHotkey('toggle', DEFAULT_HOTKEY, hotkeyDisplay, hotkeyStatus, 'agentArcade_hotkey', 'set_toggle_shortcut', toggleRef);
    currentHotkey = DEFAULT_HOTKEY;
    syncHelpHotkeys();
  });
  pauseResetBtn.addEventListener('click', function() {
    if (recordingTarget === 'pause') stopRecording('pause');
    saveHotkey('pause', DEFAULT_PAUSE_KEY, pauseDisplay, pauseStatus, 'agentArcade_pauseKey', 'set_pause_shortcut', pauseRef);
    currentPauseKey = DEFAULT_PAUSE_KEY;
    syncHelpHotkeys();
  });
  unpauseResetBtn.addEventListener('click', function() {
    if (recordingTarget === 'unpause') stopRecording('unpause');
    saveHotkey('unpause', DEFAULT_UNPAUSE_KEY, unpauseDisplay, unpauseStatus, 'agentArcade_unpauseKey', 'set_unpause_shortcut', unpauseRef);
    currentUnpauseKey = DEFAULT_UNPAUSE_KEY;
    syncHelpHotkeys();
  });

  // On startup, apply saved hotkeys to Rust
  setTimeout(function() {
    var ti = window.__TAURI_INTERNALS__;
    if (ti) {
      if (currentHotkey !== DEFAULT_HOTKEY) {
        ti.invoke('set_toggle_shortcut', { combo: currentHotkey }).catch(function() {
          hotkeyStatus.textContent = 'Hotkey unavailable';
          hotkeyStatus.style.color = '#f44';
        });
      }
      if (currentPauseKey !== DEFAULT_PAUSE_KEY) {
        ti.invoke('set_pause_shortcut', { combo: currentPauseKey }).catch(function() {
          pauseStatus.textContent = 'Pause key unavailable';
          pauseStatus.style.color = '#f44';
        });
      }
      if (currentUnpauseKey !== DEFAULT_UNPAUSE_KEY) {
        ti.invoke('set_unpause_shortcut', { combo: currentUnpauseKey }).catch(function() {
          unpauseStatus.textContent = 'Resume key unavailable';
          unpauseStatus.style.color = '#f44';
        });
      }
    }
  }, 800);

  // ── Clear scores ────────────────────────────────────────────
  var clearScoresBtn = document.getElementById('clear-scores-btn');
  var clearScoresGame = document.getElementById('clear-scores-game');
  var clearScoresStatus = document.getElementById('clear-scores-status');
  clearScoresBtn.addEventListener('click', function() {
    var gameKey = clearScoresGame.value;
    try {
      localStorage.removeItem('agentArcade_hi_' + gameKey);
      localStorage.removeItem('agentArcade_board_' + gameKey);
    } catch(e) {}
    clearScoresStatus.textContent = '✓ Cleared';
    clearScoresStatus.style.color = '#4f4';
    setTimeout(function() { clearScoresStatus.textContent = ''; }, 2000);

    // Reset HUD and scene high score for the cleared game
    var game = window.__phaserGame;
    if (game) {
      var scene = game.scene.getScene(gameKey);
      if (scene && typeof scene.highScore !== 'undefined') {
        scene.highScore = 0;
      }
    }
    // If cleared game is the current game, update HUD immediately
    var sel = document.getElementById('game-select');
    var currentKey = sel ? sel.value : '';
    if (gameKey === currentKey) {
      var hiEl = document.getElementById('hi-value');
      if (hiEl) hiEl.textContent = '0';
    }
  });

  function expandWindowForOverlay(callback) {
    var ti = window.__TAURI_INTERNALS__;
    if (!ti) { if (callback) callback(); return; }
    ti.invoke('plugin:window|primary_monitor', { label: 'main' }).then(function(mon) {
      if (!mon) { if (callback) callback(); return; }
      var size = mon.size;
      var pos = mon.position;
      var scale = mon.scaleFactor || 1;
      var bottomTrim = Math.round(5 * scale);
      ti.invoke('plugin:window|set_position', { label: 'main', value: { Physical: { x: pos.x, y: pos.y } } });
      ti.invoke('plugin:window|set_size', { label: 'main', value: { Physical: { width: size.width, height: size.height - bottomTrim } } });
      ti.invoke('set_click_through', { enabled: false });
      setTimeout(function() { if (callback) callback(); }, 100);
    }).catch(function() { if (callback) callback(); });
  }

  function shrinkWindowForPause() {
    // Re-trigger paused state so Rust shrinks the window.
    // setPaused(true) already sets click-through OFF (HUD stays clickable).
    var ab = window.agentArcade;
    if (ab && ab.setPaused) ab.setPaused(true);
  }

  var wasGamePausedBeforeSettings = false;

  function showSettings() {
    syncAudioToggle();
    bgSlider.value = currentBgTransparency;
    bgValue.textContent = currentBgTransparency + '%';
    // Pause the Phaser scene if running (but don't trigger full Tauri pause)
    wasGamePausedBeforeSettings = isPaused();
    if (!wasGamePausedBeforeSettings) {
      var game = window.__phaserGame;
      if (game && game.scene) {
        game.scene.getScenes(true).forEach(function(s) {
          if (s.scene && s.scene.pause) s.scene.pause();
          if (s.sound && s.sound.pauseAll) s.sound.pauseAll();
        });
      }
    }
    if (wasGamePausedBeforeSettings) {
      // Window is shrunk — expand it first, then show overlay
      expandWindowForOverlay(function() {
        settingsOverlay.classList.add('show');
      });
    } else {
      settingsOverlay.classList.add('show');
    }
  }
  function hideSettings() {
    settingsOverlay.classList.remove('show');
    // Re-apply transparency to ensure it sticks after resume
    applyBgTransparency(currentBgTransparency);
    if (wasGamePausedBeforeSettings) {
      // Shrink the window back to the paused HUD bar
      shrinkWindowForPause();
    } else {
      // Resume the Phaser scene if it wasn't paused before we opened settings
      var game = window.__phaserGame;
      if (game && game.scene) {
        game.scene.getScenes(false).forEach(function(s) {
          if (s.scene && s.scene.resume) s.scene.resume();
          if (s.sound && s.sound.resumeAll) s.sound.resumeAll();
        });
      }
    }
  }
  settingsBtn.addEventListener('click', showSettings);
  settingsClose.addEventListener('click', hideSettings);
  settingsOverlay.addEventListener('click', function(e) {
    if (e.target === settingsOverlay) hideSettings();
  });
  // Escape closes settings
  document.addEventListener('keydown', function(e) {
    if (e.code === 'Escape' && settingsOverlay.classList.contains('show')) {
      e.stopPropagation();
      hideSettings();
    }
  });

  // Drag handle moves the paused HUD window
  var dragHandle = document.getElementById('drag-handle');
  dragHandle.addEventListener('mousedown', function (e) {
    if (!isPaused()) return;
    if (e.buttons !== 1) return;
    var ti = window.__TAURI_INTERNALS__;
    if (ti) {
      ti.invoke('plugin:window|start_dragging', { label: 'main' });
    }
  });

  // Escape is handled by Rust's global shortcut so it works
  // even when another app has focus. No in-page handler needed.

  // Auto-refocus the Phaser canvas when the window regains focus
  // or the user clicks anywhere outside an interactive HUD element.
  function refocusCanvas() {
    var c = document.querySelector('#game canvas');
    if (c && !document.body.classList.contains('paused')) c.focus();
  }
  window.addEventListener('focus', refocusCanvas);
  document.addEventListener('pointerdown', function(e) {
    // Don't steal focus from HUD controls (buttons, selects, sliders, inputs)
    if (e.target && e.target.closest && e.target.closest('#hud, #settings-overlay, #help-overlay')) return;
    refocusCanvas();
  });
})();

// ── Update notification ──
// Called from Rust when a newer version is available.
window.__agentArcadeUpdateAvailable = function(version) {
  var banner = document.getElementById('update-banner');
  var versionEl = document.getElementById('update-version');
  var dismissBtn = document.getElementById('update-dismiss');
  var linkEl = banner ? banner.querySelector('.update-link') : null;
  var iconEl = banner ? banner.querySelector('.update-icon') : null;
  if (!banner || !versionEl) return;

  versionEl.textContent = 'v' + version;
  var autoHideTimer = null;

  // Click the banner to open the releases page
  banner.onclick = function(e) {
    if (e.target === dismissBtn) return;
    var url = 'https://github.com/DanWahlin/agent-arcade/releases/latest';
    var ti = window.__TAURI_INTERNALS__;
    if (ti) {
      ti.invoke('plugin:opener|open_url', { url: url }).catch(function() {
        window.open(url, '_blank');
      });
    } else {
      window.open(url, '_blank');
    }
  };

  // Dismiss button hides the banner
  dismissBtn.onclick = function(e) {
    e.stopPropagation();
    banner.classList.remove('show');
    if (autoHideTimer) clearTimeout(autoHideTimer);
  };

  // Fade in after a short delay
  setTimeout(function() { banner.classList.add('show'); }, 500);

  // Auto-hide after 30 seconds
  autoHideTimer = setTimeout(function() { banner.classList.remove('show'); }, 30000);
};

// Called from Rust to update banner status during download/install.
window.__agentArcadeUpdateStatus = function(status) {
  var banner = document.getElementById('update-banner');
  var linkEl = banner ? banner.querySelector('.update-link') : null;
  var iconEl = banner ? banner.querySelector('.update-icon') : null;
  if (status === 'downloading') {
    if (linkEl) linkEl.textContent = 'Downloading…';
    if (iconEl) iconEl.textContent = '📦';
  } else if (status === 'restarting') {
    if (linkEl) linkEl.textContent = 'Installing… Restarting!';
    if (iconEl) iconEl.textContent = '✨';
  }
};
