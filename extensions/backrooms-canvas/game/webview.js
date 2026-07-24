"use strict";
(() => {
  // src/shared/settings.ts
  var IDLE_JOB = { working: false, status: "", tokens: 0 };
  var DEFAULT_SETTINGS = {
    seed: 0,
    moveSpeed: 2.2,
    renderDistance: 14,
    cameraShake: true,
    filmGrain: true,
    vhsHud: true,
    furniture: true,
    wallpaperShifts: false,
    mouseLook: true,
    invertTurn: false,
    invertStrafe: false,
    invertForward: false,
    materialPreset: "classic",
    materialHueShift: 0,
    materialBrightness: 1,
    monsterEnabled: true,
    monsterSpeed: 2.6,
    monsterSpawnMin: 1,
    monsterSpawnMax: 5,
    monsterForm: "random",
    copilotGhostWriter: true
  };

  // src/webview/film.ts
  var GRAIN_TILE = 160;
  var GRAIN_VARIANTS = 5;
  var GRAIN_FPS = 18;
  var JOB_LINGER_MS = 6e3;
  var FilmOverlay = class {
    constructor(canvas) {
      this.canvas = canvas;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("2D overlay context unavailable");
      }
      this.ctx = ctx;
      for (let v = 0; v < GRAIN_VARIANTS; v++) {
        this.grainTiles.push(makeGrainTile(v));
      }
    }
    grainEnabled = true;
    hudEnabled = true;
    tokenCounterEnabled = true;
    ctx;
    grainTiles = [];
    lastGrainAt = 0;
    grainIndex = 0;
    tearY = -1;
    tearUntil = 0;
    burstUntil = 0;
    startedAt = Date.now();
    job = { ...IDLE_JOB };
    jobLingerUntil = 0;
    shownTokens = 0;
    lastHudAt = 0;
    /** Cuts the picture to heavy static for a moment (the catch effect). */
    burst(now, durationMs = 1300) {
      this.burstUntil = now + durationMs;
    }
    /**
     * Feeds the HUD the latest Copilot job snapshot. The token count drives the
     * HUD counter, which rolls toward the target value and lingers after the
     * job finishes.
     */
    setJob(job) {
      this.job = job;
    }
    render(now) {
      const canvas = this.canvas;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) {
        return;
      }
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = this.ctx;
      ctx.clearRect(0, 0, w, h);
      if (this.burstUntil > now) {
        ctx.globalAlpha = 0.94;
        for (let y = 0; y < h; y += GRAIN_TILE) {
          for (let x = 0; x < w; x += GRAIN_TILE) {
            ctx.drawImage(this.grainTiles[Math.floor(Math.random() * GRAIN_VARIANTS)], x, y);
          }
        }
        ctx.globalAlpha = 1;
        ctx.font = 'bold 28px "Courier New", monospace';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(20, 20, 20, 0.85)";
        ctx.fillRect(w / 2 - 130, h / 2 - 28, 260, 56);
        ctx.fillStyle = "#f0f2f3";
        ctx.fillText("SIGNAL LOST", w / 2, h / 2);
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        return;
      }
      if (!this.grainEnabled && !this.hudEnabled) {
        return;
      }
      if (this.grainEnabled) {
        if (now - this.lastGrainAt > 1e3 / GRAIN_FPS) {
          this.lastGrainAt = now;
          this.grainIndex = Math.floor(Math.random() * GRAIN_VARIANTS);
          if (this.tearUntil < now && Math.random() < 0.03) {
            this.tearY = Math.random() * h;
            this.tearUntil = now + 90 + Math.random() * 160;
          }
        }
        const tile = this.grainTiles[this.grainIndex];
        ctx.globalAlpha = 0.11;
        const ox = Math.floor(Math.random() * GRAIN_TILE);
        const oy = Math.floor(Math.random() * GRAIN_TILE);
        for (let y = -oy; y < h; y += GRAIN_TILE) {
          for (let x = -ox; x < w; x += GRAIN_TILE) {
            ctx.drawImage(tile, x, y);
          }
        }
        ctx.globalAlpha = 1;
        const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.72);
        grad.addColorStop(0, "rgba(0, 0, 0, 0)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0.42)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        const bandY = now / 34 % (h + 160) - 160;
        const band = ctx.createLinearGradient(0, bandY, 0, bandY + 160);
        band.addColorStop(0, "rgba(255, 255, 255, 0)");
        band.addColorStop(0.5, "rgba(255, 255, 255, 0.025)");
        band.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = band;
        ctx.fillRect(0, bandY, w, 160);
        if (this.tearUntil > now && this.tearY >= 0) {
          ctx.fillStyle = "rgba(220, 220, 210, 0.10)";
          ctx.fillRect(0, this.tearY, w, 3);
          ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
          ctx.fillRect(0, this.tearY + 3, w, 2);
        }
      }
      if (this.hudEnabled) {
        this.renderHud(now, w, h);
      }
    }
    renderHud(now, w, h) {
      const ctx = this.ctx;
      const pad = Math.round(Math.min(w, h) * 0.045) + 8;
      ctx.font = '16px "Courier New", monospace';
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(235, 235, 225, 0.9)";
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 3;
      if (Math.floor(now / 700) % 2 === 0) {
        ctx.fillStyle = "rgba(255, 70, 60, 0.95)";
        ctx.beginPath();
        ctx.arc(pad + 7, pad + 8, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(235, 235, 225, 0.9)";
      ctx.fillText("REC", pad + 22, pad);
      const elapsed = Math.floor((Date.now() - this.startedAt) / 1e3);
      const counter = `${String(Math.floor(elapsed / 3600)).padStart(1, "0")}:${String(
        Math.floor(elapsed / 60 % 60)
      ).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
      ctx.textAlign = "right";
      ctx.fillText(`SP ${counter}`, w - pad, pad);
      ctx.strokeStyle = "rgba(235, 235, 225, 0.9)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(w - pad - 34, pad + 24, 30, 12);
      ctx.fillRect(w - pad - 3, pad + 27, 3, 6);
      ctx.fillRect(w - pad - 32, pad + 26, 8, 8);
      ctx.fillRect(w - pad - 22, pad + 26, 8, 8);
      this.renderTokenCounter(now, w, pad);
      ctx.textAlign = "left";
      const stamp = /* @__PURE__ */ new Date();
      const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      const hr = stamp.getHours() % 12 === 0 ? 12 : stamp.getHours() % 12;
      const ampm = stamp.getHours() < 12 ? "AM" : "PM";
      const text = `${months[stamp.getMonth()]} ${String(stamp.getDate()).padStart(2, "0")} 1990  ${ampm} ${hr}:${String(
        stamp.getMinutes()
      ).padStart(2, "0")}`;
      ctx.fillStyle = "rgba(240, 214, 130, 0.92)";
      ctx.fillText(text, pad, h - pad - 18);
      ctx.shadowBlur = 0;
      ctx.textAlign = "left";
    }
    /**
     * Dynamic token counter for the current Copilot job, tucked under the
     * battery icon like one more line of a 1990s Sony camcorder's on-screen
     * display: blocky monospace digits that roll toward the live count, with a
     * blinking access mark while the job is running.
     */
    renderTokenCounter(now, w, pad) {
      if (!this.tokenCounterEnabled) {
        return;
      }
      if (this.job.working) {
        this.jobLingerUntil = now + JOB_LINGER_MS;
      } else if (now > this.jobLingerUntil) {
        this.shownTokens = 0;
        return;
      }
      const dt = Math.min(0.2, (now - this.lastHudAt) / 1e3 || 0.016);
      this.lastHudAt = now;
      const target = this.job.tokens;
      const gap = target - this.shownTokens;
      this.shownTokens = Math.abs(gap) < 1 ? target : this.shownTokens + gap * Math.min(1, dt * 4);
      const ctx = this.ctx;
      const digits = String(Math.min(999999, Math.round(this.shownTokens))).padStart(6, "0");
      ctx.font = '16px "Courier New", monospace';
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(235, 235, 225, 0.9)";
      ctx.fillText(`TKN ${digits}`, w - pad, pad + 44);
      if (this.job.working && Math.floor(now / 450) % 2 === 0) {
        ctx.fillRect(w - pad - 108, pad + 46, 8, 11);
      }
      ctx.textAlign = "left";
    }
  };
  function makeGrainTile(seed) {
    const tile = document.createElement("canvas");
    tile.width = tile.height = GRAIN_TILE;
    const ctx = tile.getContext("2d");
    const image = ctx.createImageData(GRAIN_TILE, GRAIN_TILE);
    let state = 2654435769 ^ seed * 2246822507;
    const next = () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      state >>>= 0;
      return state / 4294967295;
    };
    for (let i = 0; i < image.data.length; i += 4) {
      const v = Math.floor(next() * 255);
      image.data[i] = v;
      image.data[i + 1] = v;
      image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    return tile;
  }

  // ../cmd-backedges/src/rng.ts
  function mulberry32(seed) {
    let state = seed >>> 0;
    return {
      next() {
        state = state + 1831565813 | 0;
        let t = state;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      }
    };
  }
  var defaultRngFactory = mulberry32;
  function mix32(value) {
    let h = value | 0;
    h ^= h >>> 16;
    h = Math.imul(h, 2246822507);
    h ^= h >>> 13;
    h = Math.imul(h, 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  }
  function hashCombine(hash, value) {
    let h = (hash ^ mix32(value | 0)) >>> 0;
    h = Math.imul(h, 2654435761) >>> 0;
    h = (h << 13 | h >>> 19) >>> 0;
    return h >>> 0;
  }
  function hashCoords(seed, x, y, salt = 0) {
    let h = mix32(seed | 0);
    h = hashCombine(h, x);
    h = hashCombine(h, y);
    h = hashCombine(h, salt);
    return h >>> 0;
  }
  function unitFromHash(hash) {
    return (hash >>> 0) / 4294967296;
  }

  // ../cmd-backedges/src/config.ts
  var DEFAULT_CONTROLS = {
    moveNorth: ["w", "ArrowUp"],
    moveSouth: ["s", "ArrowDown"],
    moveEast: ["d", "ArrowRight"],
    moveWest: ["a", "ArrowLeft"],
    exit: ["Ctrl+C"]
  };
  var DEFAULT_CONFIG = {
    seed: 1,
    cellSize: 1,
    width: { min: 0.6, max: 1 },
    height: { min: 0.6, max: 1 },
    depth: { min: 2.5, max: 4 },
    passageDensity: 0.34,
    minConnections: 2,
    roomFrequency: 0.09,
    hallFrequency: 11e-4,
    hallSize: { min: 2, max: 4 },
    propFrequency: 0.082,
    atriumFrequency: 14e-5,
    rng: defaultRngFactory,
    controls: DEFAULT_CONTROLS,
    cacheLimit: 4096
  };
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
  function normalizeRange(range, fallback) {
    if (!range) {
      return { ...fallback };
    }
    const min = Number.isFinite(range.min) ? range.min : fallback.min;
    const max = Number.isFinite(range.max) ? range.max : fallback.max;
    return min <= max ? { min, max } : { min: max, max: min };
  }
  function normalizeIntRange(range, fallback, lowerBound) {
    const base = normalizeRange(range, fallback);
    const min = Math.max(lowerBound, Math.trunc(base.min));
    const max = Math.max(min, Math.trunc(base.max));
    return { min, max };
  }
  function resolveConfig(partial = {}) {
    const seed = Number.isFinite(partial.seed) ? Math.trunc(partial.seed) : DEFAULT_CONFIG.seed;
    const cellSize = Number.isFinite(partial.cellSize) && partial.cellSize > 0 ? partial.cellSize : DEFAULT_CONFIG.cellSize;
    return Object.freeze({
      seed,
      cellSize,
      width: normalizeRange(partial.width, DEFAULT_CONFIG.width),
      height: normalizeRange(partial.height, DEFAULT_CONFIG.height),
      depth: normalizeRange(partial.depth, DEFAULT_CONFIG.depth),
      passageDensity: Number.isFinite(partial.passageDensity) ? clamp(partial.passageDensity, 0, 1) : DEFAULT_CONFIG.passageDensity,
      minConnections: Number.isFinite(partial.minConnections) ? Math.trunc(clamp(partial.minConnections, 0, 4)) : DEFAULT_CONFIG.minConnections,
      roomFrequency: Number.isFinite(partial.roomFrequency) ? clamp(partial.roomFrequency, 0, 1) : DEFAULT_CONFIG.roomFrequency,
      hallFrequency: Number.isFinite(partial.hallFrequency) ? clamp(partial.hallFrequency, 0, 1) : DEFAULT_CONFIG.hallFrequency,
      hallSize: normalizeIntRange(partial.hallSize, DEFAULT_CONFIG.hallSize, 1),
      propFrequency: Number.isFinite(partial.propFrequency) ? clamp(partial.propFrequency, 0, 1) : DEFAULT_CONFIG.propFrequency,
      atriumFrequency: Number.isFinite(partial.atriumFrequency) ? clamp(partial.atriumFrequency, 0, 1) : DEFAULT_CONFIG.atriumFrequency,
      rng: typeof partial.rng === "function" ? partial.rng : DEFAULT_CONFIG.rng,
      controls: { ...DEFAULT_CONTROLS, ...partial.controls ?? {} },
      cacheLimit: Number.isFinite(partial.cacheLimit) && partial.cacheLimit >= 0 ? Math.trunc(partial.cacheLimit) : DEFAULT_CONFIG.cacheLimit
    });
  }

  // ../cmd-backedges/src/types.ts
  var DIRECTIONS = ["north", "east", "south", "west"];
  var SURFACE_TYPES = [
    "drywall",
    "wallpaper",
    "paneling",
    "concrete",
    "tile",
    "carpet"
  ];
  var FEATURE_KINDS = ["column", "furniture"];
  function opposite(direction) {
    switch (direction) {
      case "north":
        return "south";
      case "south":
        return "north";
      case "east":
        return "west";
      case "west":
        return "east";
    }
  }
  function step(direction) {
    switch (direction) {
      case "north":
        return { dx: 0, dy: -1 };
      case "south":
        return { dx: 0, dy: 1 };
      case "east":
        return { dx: 1, dy: 0 };
      case "west":
        return { dx: -1, dy: 0 };
    }
  }

  // ../cmd-backedges/src/generator.ts
  var SALT = {
    /** Openness of the vertical edge east of a cell. */
    edgeVertical: 1,
    /** Openness of the horizontal edge south of a cell. */
    edgeHorizontal: 2,
    /** Coarse room/corridor value-noise lattice. */
    roomNoise: 3,
    width: 16,
    height: 17,
    depth: 18,
    /** Whether a cell anchors a rectangular hall. */
    hallAnchor: 48,
    /** Hall width in cells. */
    hallWidth: 49,
    /** Hall height in cells. */
    hallHeight: 50,
    /** Whether a cell anchors a fully open atrium. */
    atriumAnchor: 80,
    /** Atrium base width draw. */
    atriumWidth: 81,
    /** Atrium base height draw. */
    atriumHeight: 82,
    /** Atrium width variance draw. */
    atriumVarWidth: 83,
    /** Atrium height variance draw. */
    atriumVarHeight: 84,
    /** Whether an open cell holds an interior prop. */
    prop: 64,
    /** Which kind of prop a cell holds. */
    propKind: 65,
    /** Prop position within its cell. */
    propPositionX: 66,
    propPositionY: 67,
    /** Prop footprint size. */
    propSize: 68,
    /** Stable per-prop cosmetic seed. */
    propVariant: 69,
    /** Seed channel for cosmetic edge metadata. */
    material: 32
  };
  var ROOM_LATTICE = 3;
  var ATRIUM_SIZE_FACTOR = 1.05;
  var ATRIUM_SIZE_VARIANCE = 0.1;
  function smoothstep(t) {
    return t * t * (3 - 2 * t);
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function edgeKey(cx, cy, direction) {
    switch (direction) {
      case "east":
        return { ex: cx, ey: cy, salt: SALT.edgeVertical };
      case "west":
        return { ex: cx - 1, ey: cy, salt: SALT.edgeVertical };
      case "south":
        return { ex: cx, ey: cy, salt: SALT.edgeHorizontal };
      case "north":
        return { ex: cx, ey: cy - 1, salt: SALT.edgeHorizontal };
    }
  }
  var MazeGenerator = class _MazeGenerator {
    /**
     * @param config - Partial configuration; omitted fields take their defaults.
     */
    constructor(config = {}) {
      this.cache = /* @__PURE__ */ new Map();
      this.hits = 0;
      this.misses = 0;
      this.evictions = 0;
      this.config = resolveConfig(config);
    }
    /** String key for the cache and lookups. */
    static key(cx, cy) {
      return `${cx},${cy}`;
    }
    /**
     * Returns the cell at the given integer coordinates, computing it on first
     * access and serving it from the LRU cache thereafter. Repeated calls return
     * structurally identical cells regardless of cache state.
     */
    getCell(cx, cy) {
      const key = _MazeGenerator.key(cx, cy);
      const cached = this.cache.get(key);
      if (cached) {
        this.hits++;
        this.cache.delete(key);
        this.cache.set(key, cached);
        return cached;
      }
      this.misses++;
      const cell = this.computeCell(cx, cy);
      this.cache.set(key, cell);
      this.evictIfNeeded();
      return cell;
    }
    /** Returns every cell whose coordinates fall in the inclusive rectangle. */
    getRegion(minCx, minCy, maxCx, maxCy) {
      const cells = [];
      for (let cy = minCy; cy <= maxCy; cy++) {
        for (let cx = minCx; cx <= maxCx; cx++) {
          cells.push(this.getCell(cx, cy));
        }
      }
      return cells;
    }
    /**
     * Whether the player may cross from `(cx, cy)` in `direction`.
     *
     * This is the authoritative movement test and is symmetric: crossing an edge
     * from either side yields the same answer. An edge is open when any of the
     * following holds, all of which both adjacent cells compute identically:
     *
     * - both cells belong to the same atrium (its fully open interior);
     * - both cells belong to the same rectangular hall (its open interior);
     * - both cells are rooms (interior of a merged blob-shaped open area);
     * - the edge is open by base density; or
     * - either cell braids the edge open to reach {@link MazeConfig.minConnections}.
     */
    isPassable(cx, cy, direction) {
      const { dx, dy } = step(direction);
      const nx = cx + dx;
      const ny = cy + dy;
      const atrium = this.atriumIdOf(cx, cy);
      if (atrium !== null && atrium === this.atriumIdOf(nx, ny)) {
        return true;
      }
      if (atrium === null && this.atriumIdOf(nx, ny) === null) {
        const hall = this.hallIdOf(cx, cy);
        if (hall !== null && hall === this.hallIdOf(nx, ny)) {
          return true;
        }
        if (this.isRoom(cx, cy) && this.isRoom(nx, ny)) {
          return true;
        }
      }
      if (this.baseOpen(cx, cy, direction)) {
        return true;
      }
      if (this.forcedDirections(cx, cy).includes(direction)) {
        return true;
      }
      return this.forcedDirections(nx, ny).includes(opposite(direction));
    }
    /** Whether a cell belongs to a blob-shaped room. */
    isRoom(cx, cy) {
      return this.classify(cx, cy) === "room";
    }
    /** Whether a cell belongs to a prop-bearing rectangular hall. */
    isHall(cx, cy) {
      return this.classify(cx, cy) === "hall";
    }
    /** Whether a cell belongs to a fully open atrium. */
    isAtrium(cx, cy) {
      return this.classify(cx, cy) === "atrium";
    }
    /** Empties the cache without affecting determinism of future cells. */
    clearCache() {
      this.cache.clear();
    }
    /** Returns a snapshot of cache behavior. */
    stats() {
      return {
        size: this.cache.size,
        limit: this.config.cacheLimit,
        hits: this.hits,
        misses: this.misses,
        evictions: this.evictions
      };
    }
    // --- Structural generation (seed-only, no pluggable RNG) -----------------
    /** Raw openness of the shared edge before braiding is applied. */
    baseOpen(cx, cy, direction) {
      const { ex, ey, salt } = edgeKey(cx, cy, direction);
      return unitFromHash(hashCoords(this.config.seed, ex, ey, salt)) < this.config.passageDensity;
    }
    /** Raw hash of a cell's edge in a direction, used to order braid choices. */
    edgeHash(cx, cy, direction) {
      const { ex, ey, salt } = edgeKey(cx, cy, direction);
      return hashCoords(this.config.seed, ex, ey, salt);
    }
    /**
     * Directions a cell forcibly opens to reach {@link MazeConfig.minConnections}
     * passages. The lowest-hash sealed edges are chosen first. Depends only on the
     * cell's own four edges, so both sides of any edge agree on the result, which
     * keeps passability symmetric.
     */
    forcedDirections(cx, cy) {
      const min = this.config.minConnections;
      if (min <= 0) {
        return [];
      }
      let openCount = 0;
      const sealed = [];
      for (const direction of DIRECTIONS) {
        if (this.baseOpen(cx, cy, direction)) {
          openCount++;
        } else {
          sealed.push({ direction, hash: this.edgeHash(cx, cy, direction) });
        }
      }
      const need = min - openCount;
      if (need <= 0) {
        return [];
      }
      sealed.sort((a, b) => a.hash - b.hash);
      return sealed.slice(0, need).map((entry) => entry.direction);
    }
    /** Coarse, smoothed value-noise field driving room clustering. */
    roomNoise(cx, cy) {
      const gx = Math.floor(cx / ROOM_LATTICE);
      const gy = Math.floor(cy / ROOM_LATTICE);
      const fx = smoothstep(cx / ROOM_LATTICE - gx);
      const fy = smoothstep(cy / ROOM_LATTICE - gy);
      const corner = (ix, iy) => unitFromHash(hashCoords(this.config.seed, ix, iy, SALT.roomNoise));
      const top = lerp(corner(gx, gy), corner(gx + 1, gy), fx);
      const bottom = lerp(corner(gx, gy + 1), corner(gx + 1, gy + 1), fx);
      return lerp(top, bottom, fy);
    }
    /**
     * Width and height (in cells) of the hall anchored at `(ax, ay)`, or `null`
     * when the anchor does not spawn one. Pure function of the anchor coordinates.
     */
    hallSpawn(ax, ay) {
      if (this.config.hallFrequency <= 0) {
        return null;
      }
      if (unitFromHash(hashCoords(this.config.seed, ax, ay, SALT.hallAnchor)) >= this.config.hallFrequency) {
        return null;
      }
      const { min, max } = this.config.hallSize;
      const span = max - min + 1;
      const pick = (salt) => min + Math.min(span - 1, Math.floor(unitFromHash(hashCoords(this.config.seed, ax, ay, salt)) * span));
      return { w: pick(SALT.hallWidth), h: pick(SALT.hallHeight) };
    }
    /**
     * Canonical identifier of the hall covering a cell, or `null` when the cell is
     * not in a hall. Only anchors within {@link MazeConfig.hallSize}`.max` of the
     * cell can possibly cover it, so the scan is bounded and stateless. When
     * rectangles overlap, the lowest-hash anchor wins, so both sides of any edge
     * agree on hall membership.
     */
    hallIdOf(cx, cy) {
      const maxSide = this.config.hallSize.max;
      let best = null;
      for (let ay = cy - (maxSide - 1); ay <= cy; ay++) {
        for (let ax = cx - (maxSide - 1); ax <= cx; ax++) {
          const spawn = this.hallSpawn(ax, ay);
          if (!spawn) {
            continue;
          }
          if (cx >= ax && cx < ax + spawn.w && cy >= ay && cy < ay + spawn.h) {
            const hash = hashCoords(this.config.seed, ax, ay, SALT.hallAnchor);
            if (best === null || hash < best.hash) {
              best = { ax, ay, hash };
            }
          }
        }
      }
      return best ? `${best.ax},${best.ay}` : null;
    }
    /** Largest possible atrium side length in cells, bounding the anchor scan. */
    atriumMaxSide() {
      return Math.max(2, Math.round(this.config.hallSize.max * ATRIUM_SIZE_FACTOR * (1 + ATRIUM_SIZE_VARIANCE)));
    }
    /**
     * Width and height (in cells) of the atrium anchored at `(ax, ay)`, or `null`
     * when the anchor does not spawn one. Each side is drawn like a hall side and
     * then scaled up by {@link ATRIUM_SIZE_FACTOR} with a per-side
     * {@link ATRIUM_SIZE_VARIANCE}, so atriums run a little larger than halls.
     */
    atriumSpawn(ax, ay) {
      if (this.config.atriumFrequency <= 0) {
        return null;
      }
      if (unitFromHash(hashCoords(this.config.seed, ax, ay, SALT.atriumAnchor)) >= this.config.atriumFrequency) {
        return null;
      }
      const { min, max } = this.config.hallSize;
      const span = max - min + 1;
      const side = (sizeSalt, varianceSalt) => {
        const baseCells = min + Math.min(span - 1, Math.floor(unitFromHash(hashCoords(this.config.seed, ax, ay, sizeSalt)) * span));
        const variance = (unitFromHash(hashCoords(this.config.seed, ax, ay, varianceSalt)) * 2 - 1) * ATRIUM_SIZE_VARIANCE;
        return Math.max(2, Math.round(baseCells * ATRIUM_SIZE_FACTOR * (1 + variance)));
      };
      return {
        w: side(SALT.atriumWidth, SALT.atriumVarWidth),
        h: side(SALT.atriumHeight, SALT.atriumVarHeight)
      };
    }
    /**
     * Canonical identifier of the atrium covering a cell, or `null`. Mirrors
     * {@link hallIdOf}: bounded, stateless, and lowest-hash-anchor canonical so
     * both sides of any edge agree on membership.
     */
    atriumIdOf(cx, cy) {
      const maxSide = this.atriumMaxSide();
      let best = null;
      for (let ay = cy - (maxSide - 1); ay <= cy; ay++) {
        for (let ax = cx - (maxSide - 1); ax <= cx; ax++) {
          const spawn = this.atriumSpawn(ax, ay);
          if (!spawn) {
            continue;
          }
          if (cx >= ax && cx < ax + spawn.w && cy >= ay && cy < ay + spawn.h) {
            const hash = hashCoords(this.config.seed, ax, ay, SALT.atriumAnchor);
            if (best === null || hash < best.hash) {
              best = { ax, ay, hash };
            }
          }
        }
      }
      return best ? `${best.ax},${best.ay}` : null;
    }
    /** Resolves the open-character classification of a cell. */
    classify(cx, cy) {
      if (this.atriumIdOf(cx, cy) !== null) {
        return "atrium";
      }
      if (this.hallIdOf(cx, cy) !== null) {
        return "hall";
      }
      if (this.roomNoise(cx, cy) < this.config.roomFrequency) {
        return "room";
      }
      return "corridor";
    }
    /** Footprint and extrusion dimensions for a cell. */
    dimensions(cx, cy, kind) {
      const { width, height, depth } = this.config;
      const draw = (salt) => unitFromHash(hashCoords(this.config.seed, cx, cy, salt));
      if (kind === "atrium") {
        return { width: width.max, height: height.max, depth: depth.max };
      }
      if (kind === "hall") {
        return {
          width: width.max,
          height: height.max,
          depth: lerp((depth.min + depth.max) / 2, depth.max, draw(SALT.depth))
        };
      }
      if (kind === "room") {
        return {
          width: lerp(width.min, width.max, draw(SALT.width)),
          height: lerp(height.min, height.max, draw(SALT.height)),
          depth: lerp(depth.min, depth.max, draw(SALT.depth))
        };
      }
      return {
        width: width.max,
        height: height.max,
        depth: lerp(depth.min, depth.max, draw(SALT.depth))
      };
    }
    /**
     * A deterministic interior prop for an open cell, or `null`. Props occur only
     * in rooms and halls and are gated by {@link MazeConfig.propFrequency}.
     */
    feature(cx, cy, kind) {
      if (kind === "corridor" || kind === "atrium" || this.config.propFrequency <= 0) {
        return null;
      }
      if (unitFromHash(hashCoords(this.config.seed, cx, cy, SALT.prop)) >= this.config.propFrequency) {
        return null;
      }
      const size = this.config.cellSize;
      const draw = (salt) => unitFromHash(hashCoords(this.config.seed, cx, cy, salt));
      const featureKind = FEATURE_KINDS[Math.min(FEATURE_KINDS.length - 1, Math.floor(draw(SALT.propKind) * FEATURE_KINDS.length))] ?? FEATURE_KINDS[0];
      const fx = 0.3 + 0.4 * draw(SALT.propPositionX);
      const fy = 0.3 + 0.4 * draw(SALT.propPositionY);
      return {
        kind: featureKind,
        position: { x: cx * size + fx * size, y: cy * size + fy * size },
        size: lerp(0.08, 0.22, draw(SALT.propSize)) * size,
        variantSeed: hashCoords(this.config.seed, cx, cy, SALT.propVariant)
      };
    }
    /** Builds the full cell from its structural inputs. */
    computeCell(cx, cy) {
      const kind = this.classify(cx, cy);
      const size = this.config.cellSize;
      const x0 = cx * size;
      const y0 = cy * size;
      const x1 = x0 + size;
      const y1 = y0 + size;
      const corners = {
        north: { start: { x: x0, y: y0 }, end: { x: x1, y: y0 } },
        south: { start: { x: x0, y: y1 }, end: { x: x1, y: y1 } },
        west: { start: { x: x0, y: y0 }, end: { x: x0, y: y1 } },
        east: { start: { x: x1, y: y0 }, end: { x: x1, y: y1 } }
      };
      const edges = {};
      for (const direction of DIRECTIONS) {
        const solid = !this.isPassable(cx, cy, direction);
        edges[direction] = {
          direction,
          solid,
          start: corners[direction].start,
          end: corners[direction].end,
          metadata: this.edgeMetadata(cx, cy, direction, kind)
        };
      }
      return {
        cx,
        cy,
        kind,
        bounds: { min: { x: x0, y: y0 }, max: { x: x1, y: y1 } },
        dimensions: this.dimensions(cx, cy, kind),
        edges,
        feature: this.feature(cx, cy, kind)
      };
    }
    // --- Cosmetic metadata (pluggable RNG) -----------------------------------
    /**
     * Builds per-edge extrusion metadata. The material seed is a structural hash
     * (stable across RNG swaps), but every cosmetic value is drawn from the
     * configured RNG factory, so changing the factory changes only this output.
     */
    edgeMetadata(cx, cy, direction, classification) {
      const { ex, ey, salt } = edgeKey(cx, cy, direction);
      const materialSeed = hashCoords(this.config.seed, ex, ey, salt + SALT.material);
      const rng = this.config.rng(materialSeed);
      const { depth } = this.config;
      const heightBase = lerp(depth.min, depth.max, rng.next());
      const heightVariance = lerp(0, (depth.max - depth.min) * 0.5, rng.next());
      const thickness = lerp(0.05, 0.2, rng.next());
      const surfaceType = SURFACE_TYPES[Math.min(SURFACE_TYPES.length - 1, Math.floor(rng.next() * SURFACE_TYPES.length))] ?? SURFACE_TYPES[0];
      return {
        heightBase,
        heightVariance,
        thickness,
        surfaceType,
        materialSeed,
        classification
      };
    }
    /** Evicts least-recently-used cells when the cache exceeds its limit. */
    evictIfNeeded() {
      const limit = this.config.cacheLimit;
      if (limit <= 0) {
        return;
      }
      while (this.cache.size > limit) {
        const oldest = this.cache.keys().next().value;
        if (oldest === void 0) {
          break;
        }
        this.cache.delete(oldest);
        this.evictions++;
      }
    }
  };

  // ../cmd-backedges/src/events.ts
  var EventEmitter = class {
    constructor() {
      this.listeners = /* @__PURE__ */ new Map();
    }
    /**
     * Registers a listener for an event.
     *
     * @returns A function that unregisters the listener.
     */
    on(event, listener) {
      let set = this.listeners.get(event);
      if (!set) {
        set = /* @__PURE__ */ new Set();
        this.listeners.set(event, set);
      }
      set.add(listener);
      return () => this.off(event, listener);
    }
    /** Unregisters a previously registered listener. */
    off(event, listener) {
      this.listeners.get(event)?.delete(listener);
    }
    /** Emits an event to all current listeners. */
    emit(event, payload) {
      const set = this.listeners.get(event);
      if (!set) {
        return;
      }
      for (const listener of [...set]) {
        listener(payload);
      }
    }
    /** Removes all listeners, or all listeners for a single event. */
    clear(event) {
      if (event === void 0) {
        this.listeners.clear();
      } else {
        this.listeners.delete(event);
      }
    }
  };

  // ../cmd-backedges/src/player.ts
  var MazeSession = class {
    /**
     * @param generator - The maze to traverse.
     * @param start - Optional starting cell (defaults to the origin).
     */
    constructor(generator, start = {}) {
      this.emitter = new EventEmitter();
      this.visited = /* @__PURE__ */ new Set();
      this.generator = generator;
      this.state = {
        cx: start.cx ?? 0,
        cy: start.cy ?? 0,
        facing: "south"
      };
      this.markVisited(this.state.cx, this.state.cy);
    }
    /** Returns a copy of the current player state. */
    get player() {
      return { ...this.state };
    }
    /** The cell the player currently occupies. */
    get currentCell() {
      return this.generator.getCell(this.state.cx, this.state.cy);
    }
    /**
     * Attempts to move the player one cell in a direction.
     *
     * Always updates {@link PlayerState.facing}. On success the player advances
     * and a `move` event (plus an `enterCell` event for first visits) fires; on
     * failure a `blocked` event fires and the position is unchanged.
     *
     * @returns `true` if the player moved, `false` if blocked by a wall.
     */
    move(direction) {
      this.state.facing = direction;
      const { cx, cy } = this.state;
      if (!this.generator.isPassable(cx, cy, direction)) {
        this.emitter.emit("blocked", { at: { cx, cy }, direction });
        return false;
      }
      const { dx, dy } = step(direction);
      const to = { cx: cx + dx, cy: cy + dy };
      this.state.cx = to.cx;
      this.state.cy = to.cy;
      const cell = this.generator.getCell(to.cx, to.cy);
      this.emitter.emit("move", { from: { cx, cy }, to, direction, cell });
      if (this.markVisited(to.cx, to.cy)) {
        this.emitter.emit("enterCell", cell);
      }
      return true;
    }
    /** Teleports the player to an arbitrary cell, bypassing wall checks. */
    warpTo(cx, cy) {
      this.state.cx = cx;
      this.state.cy = cy;
      const cell = this.generator.getCell(cx, cy);
      if (this.markVisited(cx, cy)) {
        this.emitter.emit("enterCell", cell);
      }
    }
    /** Registers a listener for a session event; returns an unsubscribe fn. */
    on(event, listener) {
      return this.emitter.on(event, listener);
    }
    /** Records a visit; returns `true` only on the first visit to the cell. */
    markVisited(cx, cy) {
      const key = `${cx},${cy}`;
      if (this.visited.has(key)) {
        return false;
      }
      this.visited.add(key);
      return true;
    }
  };

  // src/webview/textures.ts
  var ATLAS_GRID = 4;
  var TILE_PX = 256;
  var TILE = {
    wallpaperA: 0,
    wallpaperB: 1,
    ceiling: 2,
    lightPanel: 3,
    carpet: 4,
    concrete: 5,
    paneling: 6,
    drywall: 7,
    ceramic: 8,
    fabric: 9,
    metal: 10,
    wood: 11,
    cardboard: 12
  };
  function applyMaterialImages(canvas, images) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const blit = (tile, image, after) => {
      const x = tile % ATLAS_GRID * TILE_PX;
      const y = Math.floor(tile / ATLAS_GRID) * TILE_PX;
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.rect(0, 0, TILE_PX, TILE_PX);
      ctx.clip();
      ctx.drawImage(image, 0, 0, TILE_PX, TILE_PX);
      after?.(ctx);
      ctx.restore();
    };
    if (images.wallpaper) {
      blit(TILE.wallpaperA, images.wallpaper);
      blit(TILE.wallpaperB, images.wallpaper, (c) => {
        c.fillStyle = "rgba(96, 78, 30, 0.28)";
        c.fillRect(0, 0, TILE_PX, TILE_PX);
      });
    }
    if (images.ceiling) {
      blit(TILE.ceiling, images.ceiling, (c) => {
        c.strokeStyle = "rgba(140, 134, 116, 0.85)";
        c.lineWidth = 3;
        for (let p = 0; p <= TILE_PX; p += TILE_PX / 2) {
          c.beginPath();
          c.moveTo(p, 0);
          c.lineTo(p, TILE_PX);
          c.moveTo(0, p);
          c.lineTo(TILE_PX, p);
          c.stroke();
        }
      });
    }
    if (images.carpet) {
      blit(TILE.carpet, images.carpet);
    }
  }
  function buildAtlas() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = ATLAS_GRID * TILE_PX;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("2D canvas context unavailable; cannot build texture atlas");
    }
    const painters = {
      [TILE.wallpaperA]: paintWallpaperA,
      [TILE.wallpaperB]: paintWallpaperB,
      [TILE.ceiling]: paintCeiling,
      [TILE.lightPanel]: paintLightPanel,
      [TILE.carpet]: paintCarpet,
      [TILE.concrete]: paintConcrete,
      [TILE.paneling]: paintPaneling,
      [TILE.drywall]: paintDrywall,
      [TILE.ceramic]: paintCeramic,
      [TILE.fabric]: paintFabric,
      [TILE.metal]: paintMetal,
      [TILE.wood]: paintWood,
      [TILE.cardboard]: paintCardboard
    };
    for (const [index, paint] of Object.entries(painters)) {
      const i = Number(index);
      const x = i % ATLAS_GRID * TILE_PX;
      const y = Math.floor(i / ATLAS_GRID) * TILE_PX;
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.rect(0, 0, TILE_PX, TILE_PX);
      ctx.clip();
      paint(ctx);
      ctx.restore();
    }
    return canvas;
  }
  function grain(ctx, seed, amount) {
    const image = ctx.getImageData(0, 0, TILE_PX, TILE_PX);
    const rng = mulberry32(seed);
    const data = image.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (rng.next() * 2 - 1) * amount;
      data[i] = clampByte(data[i] + n);
      data[i + 1] = clampByte(data[i + 1] + n);
      data[i + 2] = clampByte(data[i + 2] + n);
    }
    const off = document.createElement("canvas");
    off.width = off.height = TILE_PX;
    off.getContext("2d").putImageData(image, 0, 0);
    ctx.drawImage(off, 0, 0);
  }
  function clampByte(v) {
    return v < 0 ? 0 : v > 255 ? 255 : v;
  }
  function stains(ctx, seed, color, count) {
    const rng = mulberry32(seed);
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const cx = rng.next() * TILE_PX;
      const cy = rng.next() * TILE_PX;
      const r = 12 + rng.next() * 46;
      ctx.globalAlpha = 0.04 + rng.next() * 0.07;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * (0.5 + rng.next() * 0.8), rng.next() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function paintWallpaperA(ctx) {
    ctx.fillStyle = "#c9b765";
    ctx.fillRect(0, 0, TILE_PX, TILE_PX);
    ctx.fillStyle = "#b7a352";
    for (let x = 0; x < TILE_PX; x += 32) {
      ctx.fillRect(x, 0, 14, TILE_PX);
    }
    ctx.fillStyle = "#a3914a";
    for (let x = 0; x < TILE_PX; x += 32) {
      ctx.fillRect(x + 13, 0, 2, TILE_PX);
    }
    stains(ctx, 11, "#6f5f2c", 9);
    grain(ctx, 12, 7);
  }
  function paintWallpaperB(ctx) {
    ctx.fillStyle = "#c4b268";
    ctx.fillRect(0, 0, TILE_PX, TILE_PX);
    ctx.fillStyle = "#ab984f";
    for (let y = 0; y < TILE_PX; y += 32) {
      for (let x = 0; x < TILE_PX; x += 32) {
        const ox = Math.floor(y / 32) % 2 * 16;
        diamond(ctx, x + ox + 16, y + 16, 7);
      }
    }
    stains(ctx, 21, "#6f5f2c", 7);
    grain(ctx, 22, 6);
  }
  function diamond(ctx, cx, cy, r) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.fill();
  }
  function paintCeiling(ctx) {
    ctx.fillStyle = "#d8d3c2";
    ctx.fillRect(0, 0, TILE_PX, TILE_PX);
    const rng = mulberry32(31);
    ctx.fillStyle = "#b9b4a1";
    for (let i = 0; i < 2600; i++) {
      ctx.fillRect(rng.next() * TILE_PX, rng.next() * TILE_PX, 1.5, 1.5);
    }
    ctx.strokeStyle = "#a09a87";
    ctx.lineWidth = 3;
    for (let p = 0; p <= TILE_PX; p += 128) {
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, TILE_PX);
      ctx.moveTo(0, p);
      ctx.lineTo(TILE_PX, p);
      ctx.stroke();
    }
    stains(ctx, 32, "#7c7452", 5);
    grain(ctx, 33, 5);
  }
  function paintLightPanel(ctx) {
    const g = ctx.createRadialGradient(128, 128, 20, 128, 128, 190);
    g.addColorStop(0, "#fefadd");
    g.addColorStop(0.7, "#f8eeb4");
    g.addColorStop(1, "#e4d78d");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, TILE_PX, TILE_PX);
    ctx.strokeStyle = "rgba(190, 176, 110, 0.35)";
    ctx.lineWidth = 2;
    for (let p = 0; p <= TILE_PX; p += 32) {
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, TILE_PX);
      ctx.moveTo(0, p);
      ctx.lineTo(TILE_PX, p);
      ctx.stroke();
    }
    grain(ctx, 41, 3);
  }
  function paintCarpet(ctx) {
    ctx.fillStyle = "#c2b47a";
    ctx.fillRect(0, 0, TILE_PX, TILE_PX);
    const rng = mulberry32(51);
    for (let i = 0; i < 5200; i++) {
      const x = rng.next() * TILE_PX;
      const y = rng.next() * TILE_PX;
      const shade = 150 + Math.floor(rng.next() * 60);
      ctx.strokeStyle = `rgb(${shade}, ${shade - 14}, ${Math.floor(shade * 0.62)})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rng.next() * 4 - 2), y + (rng.next() * 4 - 2));
      ctx.stroke();
    }
    stains(ctx, 52, "#5d5228", 8);
    grain(ctx, 53, 6);
  }
  function paintConcrete(ctx) {
    ctx.fillStyle = "#9a958a";
    ctx.fillRect(0, 0, TILE_PX, TILE_PX);
    const rng = mulberry32(61);
    ctx.strokeStyle = "rgba(70, 66, 58, 0.5)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      let x = rng.next() * TILE_PX;
      let y = rng.next() * TILE_PX;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 6; s++) {
        x += rng.next() * 40 - 20;
        y += rng.next() * 40 - 10;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    stains(ctx, 62, "#4c483e", 6);
    grain(ctx, 63, 10);
  }
  function paintPaneling(ctx) {
    ctx.fillStyle = "#a8905e";
    ctx.fillRect(0, 0, TILE_PX, TILE_PX);
    const rng = mulberry32(71);
    for (let x = 0; x < TILE_PX; x += 42) {
      ctx.fillStyle = "#7d6741";
      ctx.fillRect(x, 0, 3, TILE_PX);
      for (let i = 0; i < 22; i++) {
        ctx.strokeStyle = `rgba(110, 88, 52, ${0.15 + rng.next() * 0.2})`;
        const gx = x + 5 + rng.next() * 34;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.bezierCurveTo(gx + 4, 80, gx - 4, 170, gx + 2, TILE_PX);
        ctx.stroke();
      }
    }
    grain(ctx, 72, 6);
  }
  function paintDrywall(ctx) {
    ctx.fillStyle = "#cfc7ad";
    ctx.fillRect(0, 0, TILE_PX, TILE_PX);
    stains(ctx, 81, "#8d8465", 6);
    grain(ctx, 82, 6);
  }
  function paintCeramic(ctx) {
    ctx.fillStyle = "#b8b2a0";
    ctx.fillRect(0, 0, TILE_PX, TILE_PX);
    ctx.fillStyle = "#d7d2c2";
    for (let y = 0; y < TILE_PX; y += 64) {
      for (let x = 0; x < TILE_PX; x += 64) {
        ctx.fillRect(x + 3, y + 3, 58, 58);
      }
    }
    stains(ctx, 91, "#6d6752", 5);
    grain(ctx, 92, 5);
  }
  function paintFabric(ctx) {
    ctx.fillStyle = "#7a6f52";
    ctx.fillRect(0, 0, TILE_PX, TILE_PX);
    grain(ctx, 101, 12);
  }
  function paintMetal(ctx) {
    ctx.fillStyle = "#8e9296";
    ctx.fillRect(0, 0, TILE_PX, TILE_PX);
    const rng = mulberry32(111);
    for (let x = 0; x < TILE_PX; x += 2) {
      ctx.fillStyle = `rgba(255, 255, 255, ${rng.next() * 0.06})`;
      ctx.fillRect(x, 0, 1, TILE_PX);
    }
    grain(ctx, 112, 5);
  }
  function paintWood(ctx) {
    ctx.fillStyle = "#8b6b43";
    ctx.fillRect(0, 0, TILE_PX, TILE_PX);
    const rng = mulberry32(121);
    for (let i = 0; i < 30; i++) {
      ctx.strokeStyle = `rgba(70, 50, 26, ${0.15 + rng.next() * 0.25})`;
      const gy = rng.next() * TILE_PX;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(80, gy + 6, 170, gy - 6, TILE_PX, gy + 3);
      ctx.stroke();
    }
    grain(ctx, 122, 6);
  }
  function paintCardboard(ctx) {
    ctx.fillStyle = "#b59a6b";
    ctx.fillRect(0, 0, TILE_PX, TILE_PX);
    ctx.fillStyle = "rgba(214, 205, 175, 0.8)";
    ctx.fillRect(0, 108, TILE_PX, 40);
    ctx.strokeStyle = "rgba(90, 72, 44, 0.6)";
    ctx.lineWidth = 2;
    ctx.strokeRect(6, 6, TILE_PX - 12, TILE_PX - 12);
    grain(ctx, 131, 8);
  }

  // src/webview/renderer.ts
  var FLOATS_PER_VERTEX = 10;
  var EMISSIVE_SHADE = 2;
  var VERTEX_SRC = `
attribute vec3 aPosition;
attribute vec2 aUv;
attribute float aTile;
attribute vec3 aTint;
attribute float aShade;

uniform mat4 uViewProj;
uniform vec3 uCamPos;

varying vec2 vUv;
varying float vTile;
varying vec3 vTint;
varying float vShade;
varying float vDist;

void main() {
  vUv = aUv;
  vTile = aTile;
  vTint = aTint;
  vShade = aShade;
  vDist = distance(aPosition, uCamPos);
  gl_Position = uViewProj * vec4(aPosition, 1.0);
}
`;
  var FRAGMENT_SRC = `
precision mediump float;

uniform sampler2D uAtlas;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uFlicker;

varying vec2 vUv;
varying float vTile;
varying vec3 vTint;
varying float vShade;
varying float vDist;

const float GRID = ${ATLAS_GRID.toFixed(1)};

void main() {
  float tile = floor(vTile + 0.5);
  vec2 cell = vec2(mod(tile, GRID), floor(tile / GRID));
  // Half-texel inset keeps repeated tiles from bleeding across atlas seams.
  vec2 local = fract(vUv) * (1.0 - 2.0 / 256.0) + 1.0 / 256.0;
  vec4 tex = texture2D(uAtlas, (cell + local) / GRID);

  if (vShade >= ${EMISSIVE_SHADE.toFixed(1)} - 0.25) {
    // Emissive light panel: flicker, no fog fade.
    vec3 lit = tex.rgb * vTint * uFlicker * (vShade - 1.0);
    float glowFog = 1.0 - exp(-vDist * vDist * uFogDensity * 0.35);
    gl_FragColor = vec4(mix(lit, uFogColor, glowFog), 1.0);
    return;
  }

  vec3 color = tex.rgb * vTint * vShade * uFlicker;
  float fog = 1.0 - exp(-vDist * vDist * uFogDensity);
  gl_FragColor = vec4(mix(color, uFogColor, fog), 1.0);
}
`;
  var FLOATS_PER_DECAL_VERTEX = 6;
  var DECAL_VERTEX_SRC = `
attribute vec3 aPosition;
attribute vec2 aUv;
attribute float aShade;

uniform mat4 uViewProj;
uniform vec3 uCamPos;

varying vec2 vUv;
varying float vShade;
varying float vDist;

void main() {
  vUv = aUv;
  vShade = aShade;
  vDist = distance(aPosition, uCamPos);
  gl_Position = uViewProj * vec4(aPosition, 1.0);
}
`;
  var DECAL_FRAGMENT_SRC = `
precision mediump float;

uniform sampler2D uTexture;
uniform float uFogDensity;
uniform float uFlicker;

varying vec2 vUv;
varying float vShade;
varying float vDist;

void main() {
  vec4 tex = texture2D(uTexture, vUv);
  float fog = 1.0 - exp(-vDist * vDist * uFogDensity);
  // Ink dims with the wall lighting and dissolves into the fog.
  gl_FragColor = vec4(tex.rgb * vShade * uFlicker, tex.a * (1.0 - fog));
}
`;
  var Renderer = class {
    gl;
    program;
    uniforms;
    attribs;
    canvas;
    fogColor = [0.055, 0.048, 0.02];
    fogDensity = 0.012;
    // One rewritable mesh for animated geometry (the monster), rebuilt per frame.
    dynVbo = null;
    dynIbo = null;
    dynCount = 0;
    atlasCanvas;
    atlasTexture;
    // Wall-writing decals: separate program, texture, and mesh, rebuilt only
    // when a new line is scrawled.
    decalProgram;
    decalUniforms;
    decalAttribs;
    decalTexture = null;
    decalVbo = null;
    decalIbo = null;
    decalCount = 0;
    constructor(canvas) {
      this.canvas = canvas;
      const gl = canvas.getContext("webgl", { antialias: true, alpha: false });
      if (!gl) {
        throw new Error("WebGL is not available in this webview");
      }
      this.gl = gl;
      this.program = buildProgram(gl, VERTEX_SRC, FRAGMENT_SRC);
      this.attribs = {
        aPosition: gl.getAttribLocation(this.program, "aPosition"),
        aUv: gl.getAttribLocation(this.program, "aUv"),
        aTile: gl.getAttribLocation(this.program, "aTile"),
        aTint: gl.getAttribLocation(this.program, "aTint"),
        aShade: gl.getAttribLocation(this.program, "aShade")
      };
      this.uniforms = {};
      for (const name of ["uViewProj", "uCamPos", "uAtlas", "uFogColor", "uFogDensity", "uFlicker"]) {
        this.uniforms[name] = gl.getUniformLocation(this.program, name);
      }
      this.decalProgram = buildProgram(gl, DECAL_VERTEX_SRC, DECAL_FRAGMENT_SRC);
      this.decalAttribs = {
        aPosition: gl.getAttribLocation(this.decalProgram, "aPosition"),
        aUv: gl.getAttribLocation(this.decalProgram, "aUv"),
        aShade: gl.getAttribLocation(this.decalProgram, "aShade")
      };
      this.decalUniforms = {};
      for (const name of ["uViewProj", "uCamPos", "uTexture", "uFogDensity", "uFlicker"]) {
        this.decalUniforms[name] = gl.getUniformLocation(this.decalProgram, name);
      }
      this.atlasCanvas = buildAtlas();
      this.atlasTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.atlasCanvas);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
    }
    /** Patches photo materials over the procedural atlas and re-uploads it. */
    applyMaterialImages(images) {
      applyMaterialImages(this.atlasCanvas, images);
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.atlasCanvas);
    }
    uploadChunk(vertices, indices) {
      const gl = this.gl;
      const vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
      const ibo = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
      return { vbo, ibo, indexCount: indices.length };
    }
    disposeChunk(mesh) {
      this.gl.deleteBuffer(mesh.vbo);
      this.gl.deleteBuffer(mesh.ibo);
    }
    /** Replaces the dynamic mesh drawn after the chunks this frame. */
    setDynamicMesh(vertices, indices) {
      const gl = this.gl;
      this.dynVbo ??= gl.createBuffer();
      this.dynIbo ??= gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.dynVbo);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.dynIbo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.DYNAMIC_DRAW);
      this.dynCount = indices.length;
    }
    clearDynamicMesh() {
      this.dynCount = 0;
    }
    /**
     * Uploads (or re-uploads) the wall-writing texture from a canvas.
     * Uses texture unit 1 to avoid disturbing the wall atlas on unit 0.
     */
    setDecalTexture(source) {
      const gl = this.gl;
      this.decalTexture ??= gl.createTexture();
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.decalTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.activeTexture(gl.TEXTURE0);
    }
    /**
     * Replaces the decal mesh (vertex layout: position(3), uv(2), shade(1)).
     * The decal pass draws wall writings as alpha-blended quads over the walls.
     */
    setDecalMesh(vertices, indices) {
      const gl = this.gl;
      this.decalVbo ??= gl.createBuffer();
      this.decalIbo ??= gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.decalVbo);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.decalIbo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.DYNAMIC_DRAW);
      this.decalCount = indices.length;
    }
    clearDecalMesh() {
      this.decalCount = 0;
    }
    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(this.canvas.clientWidth * dpr);
      const h = Math.floor(this.canvas.clientHeight * dpr);
      if (w > 0 && h > 0 && (this.canvas.width !== w || this.canvas.height !== h)) {
        this.canvas.width = w;
        this.canvas.height = h;
      }
    }
    draw(chunks, camera, flicker) {
      const gl = this.gl;
      this.resize();
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.clearColor(this.fogColor[0], this.fogColor[1], this.fogColor[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(this.program);
      const aspect = this.canvas.width / Math.max(1, this.canvas.height);
      const viewProj = mat4Multiply(
        mat4Perspective(camera.fovY, aspect, 0.02, 80),
        mat4View(camera)
      );
      gl.uniformMatrix4fv(this.uniforms.uViewProj, false, viewProj);
      gl.uniform3f(this.uniforms.uCamPos, camera.x, camera.y, camera.z);
      gl.uniform3f(this.uniforms.uFogColor, this.fogColor[0], this.fogColor[1], this.fogColor[2]);
      gl.uniform1f(this.uniforms.uFogDensity, this.fogDensity);
      gl.uniform1f(this.uniforms.uFlicker, flicker);
      gl.uniform1i(this.uniforms.uAtlas, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.atlasTexture);
      for (const mesh of chunks) {
        this.drawMesh(mesh.vbo, mesh.ibo, mesh.indexCount);
      }
      if (this.dynCount > 0 && this.dynVbo && this.dynIbo) {
        this.drawMesh(this.dynVbo, this.dynIbo, this.dynCount);
      }
      this.drawDecals(viewProj, camera, flicker);
    }
    /** Alpha-blended wall-writing pass, drawn over the opaque geometry. */
    drawDecals(viewProj, camera, flicker) {
      if (this.decalCount === 0 || !this.decalVbo || !this.decalIbo || !this.decalTexture) {
        return;
      }
      const gl = this.gl;
      gl.useProgram(this.decalProgram);
      gl.uniformMatrix4fv(this.decalUniforms.uViewProj, false, viewProj);
      gl.uniform3f(this.decalUniforms.uCamPos, camera.x, camera.y, camera.z);
      gl.uniform1f(this.decalUniforms.uFogDensity, this.fogDensity);
      gl.uniform1f(this.decalUniforms.uFlicker, flicker);
      gl.uniform1i(this.decalUniforms.uTexture, 1);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.decalTexture);
      gl.activeTexture(gl.TEXTURE0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      for (const a of Object.values(this.attribs)) {
        gl.disableVertexAttribArray(a);
      }
      const stride = FLOATS_PER_DECAL_VERTEX * 4;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.decalVbo);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.decalIbo);
      gl.vertexAttribPointer(this.decalAttribs.aPosition, 3, gl.FLOAT, false, stride, 0);
      gl.vertexAttribPointer(this.decalAttribs.aUv, 2, gl.FLOAT, false, stride, 12);
      gl.vertexAttribPointer(this.decalAttribs.aShade, 1, gl.FLOAT, false, stride, 20);
      for (const a of Object.values(this.decalAttribs)) {
        gl.enableVertexAttribArray(a);
      }
      gl.drawElements(gl.TRIANGLES, this.decalCount, gl.UNSIGNED_SHORT, 0);
      for (const a of Object.values(this.decalAttribs)) {
        gl.disableVertexAttribArray(a);
      }
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }
    drawMesh(vbo, ibo, indexCount) {
      const gl = this.gl;
      const stride = FLOATS_PER_VERTEX * 4;
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.vertexAttribPointer(this.attribs.aPosition, 3, gl.FLOAT, false, stride, 0);
      gl.vertexAttribPointer(this.attribs.aUv, 2, gl.FLOAT, false, stride, 12);
      gl.vertexAttribPointer(this.attribs.aTile, 1, gl.FLOAT, false, stride, 20);
      gl.vertexAttribPointer(this.attribs.aTint, 3, gl.FLOAT, false, stride, 24);
      gl.vertexAttribPointer(this.attribs.aShade, 1, gl.FLOAT, false, stride, 36);
      for (const a of Object.values(this.attribs)) {
        gl.enableVertexAttribArray(a);
      }
      gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
    }
  };
  function buildProgram(gl, vsSrc, fsSrc) {
    const compile = (type, src) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(`Shader compile failed: ${gl.getShaderInfoLog(shader) ?? "unknown"}`);
      }
      return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Program link failed: ${gl.getProgramInfoLog(program) ?? "unknown"}`);
    }
    return program;
  }
  function mat4Perspective(fovY, aspect, near, far) {
    const f = 1 / Math.tan(fovY / 2);
    const nf = 1 / (near - far);
    const out = new Float32Array(16);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[14] = 2 * far * near * nf;
    return out;
  }
  function mat4View(camera) {
    const rot = mat4Multiply(
      mat4RotateZ(-camera.roll),
      mat4Multiply(mat4RotateX(-camera.pitch), mat4RotateY(-camera.yaw))
    );
    const trans = mat4Identity();
    trans[12] = -camera.x;
    trans[13] = -camera.y;
    trans[14] = -camera.z;
    return mat4Multiply(rot, trans);
  }
  function mat4Identity() {
    const out = new Float32Array(16);
    out[0] = out[5] = out[10] = out[15] = 1;
    return out;
  }
  function mat4RotateX(rad) {
    const out = mat4Identity();
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    out[5] = c;
    out[6] = s;
    out[9] = -s;
    out[10] = c;
    return out;
  }
  function mat4RotateY(rad) {
    const out = mat4Identity();
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    out[0] = c;
    out[2] = -s;
    out[8] = s;
    out[10] = c;
    return out;
  }
  function mat4RotateZ(rad) {
    const out = mat4Identity();
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    out[0] = c;
    out[1] = s;
    out[4] = -s;
    out[5] = c;
    return out;
  }
  function mat4Multiply(a, b) {
    const out = new Float32Array(16);
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += a[k * 4 + row] * b[col * 4 + k];
        }
        out[col * 4 + row] = sum;
      }
    }
    return out;
  }

  // src/webview/world.ts
  var DEPTH_RANGE = { min: 1.1, max: 1.6 };
  var PLAYER_RADIUS = 0.24;
  var WALL_HALF_DEPTH = 0.06;
  var DOOR_TOP_FRACTION = 0.84;
  var CHUNK_SIZE = 4;
  var LIGHT_LATTICE = 3;
  var ZONE_LATTICE = 12;
  var SALT2 = {
    lightState: 7001,
    zoneAnchor: 7101,
    zoneCenterX: 7102,
    zoneCenterY: 7103,
    zoneRadius: 7104,
    zonePhase1: 7105,
    zonePhase2: 7106,
    zonePalette: 7107,
    zoneVariant: 7108
  };
  var WALL_TILE_BY_SURFACE = {
    drywall: TILE.drywall,
    wallpaper: TILE.wallpaperA,
    paneling: TILE.paneling,
    concrete: TILE.concrete,
    tile: TILE.ceramic,
    carpet: TILE.carpet
  };
  var MATERIAL_PRESETS = {
    classic: { tile: null, tint: [1, 1, 1] },
    office: { tile: TILE.drywall, tint: [1, 1, 1] },
    pool: { tile: TILE.ceramic, tint: [0.88, 1, 1.06] },
    concrete: { tile: TILE.concrete, tint: [1, 1, 1] },
    panel: { tile: TILE.paneling, tint: [1, 1, 1] }
  };
  var ZONE_PALETTES = [
    [1.1, 0.6, 0.52],
    // faded rose
    [0.58, 0.95, 0.38],
    // mossy green
    [0.5, 0.72, 1.1],
    // dusty blue
    [0.72, 0.5, 0.26],
    // deep sepia
    [1.35, 1.32, 1.12]
    // bleached bone
  ];
  var WHITE = [1, 1, 1];
  var World = class {
    generator;
    session;
    seed;
    furnitureEnabled = true;
    // Off by default, matching DEFAULT_SETTINGS.wallpaperShifts.
    wallpaperShiftsEnabled = false;
    /**
     * When a photo wallpaper is loaded, the classic preset papers every wall
     * with it instead of the generator's mixed surface types; per-edge wear and
     * wallpaper zones still provide the variation.
     */
    uniformWallpaper = false;
    wallOverrideTile = null;
    wallBaseTint = [1, 1, 1];
    cellsVisited = 1;
    zoneCache = /* @__PURE__ */ new Map();
    chunks = /* @__PURE__ */ new Map();
    constructor(seed) {
      this.seed = seed;
      this.generator = new MazeGenerator({
        seed,
        depth: DEPTH_RANGE,
        propFrequency: 0.14
      });
      this.session = new MazeSession(this.generator);
      this.session.on("enterCell", () => {
        this.cellsVisited++;
      });
    }
    /**
     * Applies a wall material preset plus its adjustable elements (hue rotation
     * in degrees and a brightness multiplier). Call invalidateChunks afterwards
     * so existing meshes pick the change up.
     *
     * The preset determines the base tile and tint for all walls. Hue rotation
     * lets players shift the wallpaper color, and brightness scales the overall
     * material lightness without destroying the wear variation.
     */
    setMaterial(preset, hueShiftDeg, brightness) {
      const base = MATERIAL_PRESETS[preset] ?? MATERIAL_PRESETS.classic;
      this.wallOverrideTile = base.tile;
      this.wallBaseTint = hueRotate(base.tint, hueShiftDeg).map(
        (v) => Math.max(0, v * brightness)
      );
    }
    /** Public light sample for decorations drawn outside the chunk mesher. */
    lightAt(x, y) {
      return this.lightLevelAt(x, y);
    }
    stats() {
      return {
        seed: this.seed,
        cellsVisited: this.cellsVisited,
        cacheSize: this.generator.stats().size
      };
    }
    /**
     * Keeps the discrete MazeSession in step with the continuous player
     * position, so its move/enterCell events stay meaningful.
     *
     * When the player crosses a cell boundary, this tries to move the session
     * in the matching direction. If that fails (shouldn't happen - walls block
     * both), it warps the session to match reality.
     */
    syncSession(px, py) {
      const cx = Math.floor(px);
      const cy = Math.floor(py);
      const at = this.session.player;
      if (at.cx === cx && at.cy === cy) {
        return;
      }
      const dx = cx - at.cx;
      const dy = cy - at.cy;
      if (Math.abs(dx) + Math.abs(dy) === 1) {
        const direction = dx === 1 ? "east" : dx === -1 ? "west" : dy === 1 ? "south" : "north";
        if (!this.session.move(direction)) {
          this.session.warpTo(cx, cy);
        }
      } else {
        this.session.warpTo(cx, cy);
      }
    }
    // --- Movement ------------------------------------------------------------
    /**
     * Moves the player from (px, py) toward (px+dx, py+dy) in plane coordinates,
     * resolving collisions per axis so the player slides along walls.
     *
     * This implements a sweep-and-clamp collision resolver: each axis is tested
     * independently. If the desired position is blocked, the coordinate is
     * clamped to the nearest wall surface (within the motion delta to avoid
     * teleport-like jumps). This creates smooth wall-sliding behavior common in
     * first-person games.
     */
    moveResolved(px, py, dx, dy) {
      let x = px;
      let y = py;
      const withinStep = (from, to, v) => v >= Math.min(from, to) - 1e-9 && v <= Math.max(from, to) + 1e-9;
      const tryAxis = (nx, ny, axis) => {
        if (this.canOccupy(nx, ny)) {
          x = nx;
          y = ny;
          return;
        }
        if (axis === "x") {
          const cx = Math.floor(x);
          const clamped = nx > x ? cx + 1 - PLAYER_RADIUS - 1e-4 : cx + PLAYER_RADIUS + 1e-4;
          if (withinStep(x, nx, clamped) && this.canOccupy(clamped, ny)) {
            x = clamped;
            y = ny;
          }
        } else {
          const cy = Math.floor(y);
          const clamped = ny > y ? cy + 1 - PLAYER_RADIUS - 1e-4 : cy + PLAYER_RADIUS + 1e-4;
          if (withinStep(y, ny, clamped) && this.canOccupy(nx, clamped)) {
            x = nx;
            y = clamped;
          }
        }
      };
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / PLAYER_RADIUS));
      for (let i = 0; i < steps; i++) {
        tryAxis(x + dx / steps, y, "x");
        tryAxis(x, y + dy / steps, "y");
      }
      return { x, y };
    }
    /**
     * Whether a player disc at (x, y) fits: each corner of its bounding square
     * must be reachable from the center cell through open edges only.
     *
     * This implements circle-vs-grid collision by checking the four corners of
     * the circle's bounding box. Each corner cell must be connected to the
     * player's center cell via a valid path of open edges (either directly if
     * they're adjacent, or through an intermediate cell at a diagonal).
     */
    canOccupy(x, y) {
      const cx = Math.floor(x);
      const cy = Math.floor(y);
      for (const ox of [-PLAYER_RADIUS, PLAYER_RADIUS]) {
        for (const oy of [-PLAYER_RADIUS, PLAYER_RADIUS]) {
          const ccx = Math.floor(x + ox);
          const ccy = Math.floor(y + oy);
          if (ccx === cx && ccy === cy) {
            continue;
          }
          const dirX = ccx > cx ? "east" : ccx < cx ? "west" : null;
          const dirY = ccy > cy ? "south" : ccy < cy ? "north" : null;
          if (dirX && !dirY) {
            if (!this.generator.isPassable(cx, cy, dirX)) {
              return false;
            }
          } else if (dirY && !dirX) {
            if (!this.generator.isPassable(cx, cy, dirY)) {
              return false;
            }
          } else if (dirX && dirY) {
            const viaX = this.generator.isPassable(cx, cy, dirX) && this.generator.isPassable(ccx, cy, dirY);
            const viaY = this.generator.isPassable(cx, cy, dirY) && this.generator.isPassable(cx, ccy, dirX);
            if (!viaX && !viaY) {
              return false;
            }
          }
        }
      }
      return true;
    }
    // --- Lights ----------------------------------------------------------------
    /**
     * Determines light state for a cell: on, dead, or flickering.
     * Lights live on a 3-cell lattice (offset to [1,1] within the pattern).
     * Returns null for cells that have no light fixture.
     *
     * Dead lights (12% chance) never illuminate. Flickering lights (8% chance)
     * pulse erratically. The rest stay on with the global flicker hum.
     */
    lightState(cx, cy) {
      const mod = (n, m) => (n % m + m) % m;
      if (mod(cx, LIGHT_LATTICE) !== 1 || mod(cy, LIGHT_LATTICE) !== 1) {
        return null;
      }
      const u = unitFromHash(hashCoords(this.seed, cx, cy, SALT2.lightState));
      if (u < 0.12) {
        return "dead";
      }
      if (u < 0.2) {
        return "flicker";
      }
      return "on";
    }
    /** Summed light contribution at a plane point, in [0, 1]. */
    lightLevelAt(x, y) {
      const reach = 3.2;
      let level = 0;
      const minGx = Math.floor((x - reach) / LIGHT_LATTICE);
      const maxGx = Math.floor((x + reach) / LIGHT_LATTICE);
      const minGy = Math.floor((y - reach) / LIGHT_LATTICE);
      const maxGy = Math.floor((y + reach) / LIGHT_LATTICE);
      for (let gy = minGy; gy <= maxGy; gy++) {
        for (let gx = minGx; gx <= maxGx; gx++) {
          const lcx = gx * LIGHT_LATTICE + 1;
          const lcy = gy * LIGHT_LATTICE + 1;
          const state = this.lightState(lcx, lcy);
          if (state !== "on" && state !== "flicker") {
            continue;
          }
          const dx = x - (lcx + 0.5);
          const dy = y - (lcy + 0.5);
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < reach) {
            const fall = 1 - d / reach;
            level += fall * fall * (state === "flicker" ? 0.55 : 1);
          }
        }
      }
      return Math.min(1, level);
    }
    // --- Wallpaper zones -------------------------------------------------------
    /**
     * Random enclosed shapes: anchors on a coarse lattice each spawn a wobbled
     * closed radial blob (radius modulated by two sine harmonics with hashed
     * phases). A cell inside a blob adopts that zone's palette; the innermost
     * blob wins where blobs overlap.
     */
    zoneAt(cx, cy) {
      if (!this.wallpaperShiftsEnabled) {
        return null;
      }
      const key = `${cx},${cy}`;
      const cached = this.zoneCache.get(key);
      if (cached !== void 0) {
        return cached;
      }
      if (this.zoneCache.size > 2e4) {
        this.zoneCache.clear();
      }
      const gx0 = Math.floor(cx / ZONE_LATTICE);
      const gy0 = Math.floor(cy / ZONE_LATTICE);
      let best = null;
      for (let gy = gy0 - 1; gy <= gy0 + 1; gy++) {
        for (let gx = gx0 - 1; gx <= gx0 + 1; gx++) {
          const draw = (salt) => unitFromHash(hashCoords(this.seed, gx, gy, salt));
          if (draw(SALT2.zoneAnchor) >= 0.45) {
            continue;
          }
          const centerX = (gx + draw(SALT2.zoneCenterX)) * ZONE_LATTICE;
          const centerY = (gy + draw(SALT2.zoneCenterY)) * ZONE_LATTICE;
          const base = 3 + draw(SALT2.zoneRadius) * 5;
          const dx = cx + 0.5 - centerX;
          const dy = cy + 0.5 - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const theta = Math.atan2(dy, dx);
          const p1 = draw(SALT2.zonePhase1) * Math.PI * 2;
          const p2 = draw(SALT2.zonePhase2) * Math.PI * 2;
          const radius = base * (1 + 0.3 * Math.sin(3 * theta + p1) + 0.18 * Math.sin(5 * theta + p2));
          if (dist >= radius) {
            continue;
          }
          const depth = dist / radius;
          if (!best || depth < best.depth) {
            const palette = ZONE_PALETTES[Math.floor(draw(SALT2.zonePalette) * ZONE_PALETTES.length)] ?? WHITE;
            best = {
              depth,
              zone: { tint: [...palette], variant: draw(SALT2.zoneVariant) < 0.5 }
            };
          }
        }
      }
      const zone = best?.zone ?? null;
      this.zoneCache.set(key, zone);
      return zone;
    }
    // --- Chunk streaming -------------------------------------------------------
    /**
     * Ensures every chunk within the render distance is meshed and uploaded,
     * dropping chunks that fell out of range. Returns the drawable set.
     */
    updateChunks(px, py, renderDistance, renderer) {
      const range = renderDistance + CHUNK_SIZE;
      const minCx = Math.floor((px - range) / CHUNK_SIZE);
      const maxCx = Math.floor((px + range) / CHUNK_SIZE);
      const minCy = Math.floor((py - range) / CHUNK_SIZE);
      const maxCy = Math.floor((py + range) / CHUNK_SIZE);
      const wanted = /* @__PURE__ */ new Set();
      for (let gy = minCy; gy <= maxCy; gy++) {
        for (let gx = minCx; gx <= maxCx; gx++) {
          const centerX = (gx + 0.5) * CHUNK_SIZE;
          const centerY = (gy + 0.5) * CHUNK_SIZE;
          const dist = Math.hypot(centerX - px, centerY - py);
          if (dist > renderDistance + CHUNK_SIZE) {
            continue;
          }
          const key = `${gx},${gy}`;
          wanted.add(key);
          if (!this.chunks.has(key)) {
            this.chunks.set(key, this.buildChunk(gx, gy, renderer));
          }
        }
      }
      for (const [key, mesh] of this.chunks) {
        if (!wanted.has(key)) {
          renderer.disposeChunk(mesh);
          this.chunks.delete(key);
        }
      }
      return this.chunks.values();
    }
    /** Drops all uploaded chunks (e.g. when toggling furniture or zones). */
    invalidateChunks(renderer) {
      for (const mesh of this.chunks.values()) {
        renderer.disposeChunk(mesh);
      }
      this.chunks.clear();
      this.zoneCache.clear();
    }
    buildChunk(gx, gy, renderer) {
      const builder = new MeshBuilder();
      for (let cy = gy * CHUNK_SIZE; cy < (gy + 1) * CHUNK_SIZE; cy++) {
        for (let cx = gx * CHUNK_SIZE; cx < (gx + 1) * CHUNK_SIZE; cx++) {
          this.emitCell(builder, this.generator.getCell(cx, cy));
        }
      }
      return renderer.uploadChunk(builder.vertices(), builder.indices());
    }
    emitCell(b, cell) {
      const { cx, cy } = cell;
      const x0 = cell.bounds.min.x;
      const y0 = cell.bounds.min.y;
      const x1 = cell.bounds.max.x;
      const y1 = cell.bounds.max.y;
      const h = cell.dimensions.depth;
      const zone = this.zoneAt(cx, cy);
      const shadeAt = (x, y, base, span) => base + span * this.lightLevelAt(x, y);
      const floorTint = zone ? [mix(1, zone.tint[0], 0.25), mix(1, zone.tint[1], 0.25), mix(1, zone.tint[2], 0.25)] : WHITE;
      b.quad(
        [x0, 0, y0],
        [x0, 0, y1],
        [x1, 0, y1],
        [x1, 0, y0],
        [x0, y0],
        [x0, y1],
        [x1, y1],
        [x1, y0],
        TILE.carpet,
        floorTint,
        [
          shadeAt(x0, y0, 0.5, 0.55),
          shadeAt(x0, y1, 0.5, 0.55),
          shadeAt(x1, y1, 0.5, 0.55),
          shadeAt(x1, y0, 0.5, 0.55)
        ]
      );
      b.quad(
        [x0, h, y0],
        [x1, h, y0],
        [x1, h, y1],
        [x0, h, y1],
        [x0 * 2, y0 * 2],
        [x1 * 2, y0 * 2],
        [x1 * 2, y1 * 2],
        [x0 * 2, y1 * 2],
        TILE.ceiling,
        WHITE,
        [
          shadeAt(x0, y0, 0.38, 0.4),
          shadeAt(x1, y0, 0.38, 0.4),
          shadeAt(x1, y1, 0.38, 0.4),
          shadeAt(x0, y1, 0.38, 0.4)
        ]
      );
      const light = this.lightState(cx, cy);
      if (light) {
        const inset = 0.24;
        const drop = 0.02;
        const lx0 = x0 + inset;
        const lx1 = x1 - inset;
        const ly0 = y0 + inset;
        const ly1 = y1 - inset;
        const py = h - drop;
        const shade = light === "dead" ? 0.32 : light === "flicker" ? EMISSIVE_SHADE + 0.35 : EMISSIVE_SHADE + 0.6;
        b.quad(
          [lx0, py, ly0],
          [lx1, py, ly0],
          [lx1, py, ly1],
          [lx0, py, ly1],
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          TILE.lightPanel,
          WHITE,
          [shade, shade, shade, shade]
        );
      }
      for (const direction of DIRECTIONS) {
        if (cell.edges[direction].solid) {
          this.emitWallSlab(b, cell, direction, zone);
        } else {
          this.emitDoorHeader(b, cell, direction, zone);
        }
      }
      if (cell.feature && this.furnitureEnabled) {
        this.emitFeature(b, cell, cell.feature);
      }
    }
    /** Resolves the tile, tint, and wear factor for one wall edge. */
    wallMaterial(edge, zone) {
      let tile;
      if (this.wallOverrideTile !== null) {
        tile = this.wallOverrideTile;
      } else if (this.uniformWallpaper) {
        tile = TILE.wallpaperA;
      } else {
        tile = WALL_TILE_BY_SURFACE[edge.metadata.surfaceType];
      }
      let tint = this.wallBaseTint;
      if (zone && (this.wallOverrideTile !== null || tile === TILE.wallpaperA)) {
        tint = [tint[0] * zone.tint[0], tint[1] * zone.tint[1], tint[2] * zone.tint[2]];
        if (zone.variant && tile === TILE.wallpaperA) {
          tile = TILE.wallpaperB;
        }
      }
      const wear = 0.92 + unitFromHash(edge.metadata.materialSeed) * 0.12;
      return { tile, tint, wear };
    }
    /**
     * A solid edge as a slab: the inward face is inset by WALL_HALF_DEPTH (the
     * neighbor emits the matching opposite face), and any end where the wall
     * line stops at an open passage gets a jamb cap sealing the slab depth.
     */
    emitWallSlab(b, cell, direction, zone) {
      const h = cell.dimensions.depth;
      this.emitWallFace(b, cell, direction, 0, h, zone);
      const edge = cell.edges[direction];
      const inward = step(opposite(direction));
      const mat = this.wallMaterial(edge, zone);
      for (const end of [edge.start, edge.end]) {
        const other = end === edge.start ? edge.end : edge.start;
        const ox = Math.sign(end.x - other.x);
        const oy = Math.sign(end.y - other.y);
        if (this.generator.isPassable(cell.cx + ox, cell.cy + oy, direction)) {
          this.emitJamb(b, end, { ox, oy }, inward, 0, h, mat);
        }
      }
    }
    /**
     * A vertical cap strip sealing this cell's half of a wall slab at a wall
     * end, facing out of the wall along `out`.
     */
    emitJamb(b, at, out, inward, yBottom, yTop, mat) {
      let ax = at.x;
      let az = at.y;
      let bx = at.x + inward.dx * WALL_HALF_DEPTH;
      let bz = at.y + inward.dy * WALL_HALF_DEPTH;
      if (-(bz - az) * out.ox + (bx - ax) * out.oy < 0) {
        [ax, bx] = [bx, ax];
        [az, bz] = [bz, az];
      }
      const shade = (0.42 + 0.5 * this.lightLevelAt(at.x + out.ox * 0.2, at.y + out.oy * 0.2)) * mat.wear * 0.82;
      const u0 = ax + az;
      const u1 = bx + bz;
      b.quad(
        [ax, yBottom, az],
        [bx, yBottom, bz],
        [bx, yTop, bz],
        [ax, yTop, az],
        [u0, yBottom / 1.6],
        [u1, yBottom / 1.6],
        [u1, yTop / 1.6],
        [u0, yTop / 1.6],
        mat.tile,
        mat.tint,
        [shade, shade, shade * 0.92, shade * 0.92]
      );
    }
    /**
     * Header over an open edge. An opening whose wall line is solid on both
     * flanks reads as a doorway punched through a wall, so it gets a lintel:
     * face down to DOOR_TOP_FRACTION of the lower ceiling, a soffit underside,
     * and end caps. Interior edges of merged open areas (room/hall/atrium
     * pairs) only get a soffit band where the neighbor's ceiling steps down.
     */
    emitDoorHeader(b, cell, direction, zone) {
      const h = cell.dimensions.depth;
      const { dx, dy } = step(direction);
      const ncx = cell.cx + dx;
      const ncy = cell.cy + dy;
      const nh = this.generator.getCell(ncx, ncy).dimensions.depth;
      const gen = this.generator;
      const interior = gen.isRoom(cell.cx, cell.cy) && gen.isRoom(ncx, ncy) || gen.isHall(cell.cx, cell.cy) && gen.isHall(ncx, ncy) || gen.isAtrium(cell.cx, cell.cy) && gen.isAtrium(ncx, ncy);
      let bottom = null;
      if (!interior) {
        const edge2 = cell.edges[direction];
        const flanks = [edge2.start, edge2.end].map((end) => {
          const other = end === edge2.start ? edge2.end : edge2.start;
          const ox = Math.sign(end.x - other.x);
          const oy = Math.sign(end.y - other.y);
          return !gen.isPassable(cell.cx + ox, cell.cy + oy, direction);
        });
        if (flanks[0] && flanks[1]) {
          bottom = Math.min(h, nh) * DOOR_TOP_FRACTION;
        }
      }
      if (bottom === null && nh < h - 0.01) {
        bottom = nh;
      }
      if (bottom === null || bottom >= h - 5e-3) {
        return;
      }
      this.emitWallFace(b, cell, direction, bottom, h, zone);
      const edge = cell.edges[direction];
      const inward = step(opposite(direction));
      const mat = this.wallMaterial(edge, zone);
      const T = WALL_HALF_DEPTH;
      let sx = edge.start.x;
      let sz = edge.start.y;
      let ex = edge.end.x;
      let ez = edge.end.y;
      if ((ez - sz) * inward.dx - (ex - sx) * inward.dy > 0) {
        [sx, ex] = [ex, sx];
        [sz, ez] = [ez, sz];
      }
      const soffitShade = (0.36 + 0.4 * this.lightLevelAt((sx + ex) / 2, (sz + ez) / 2)) * mat.wear;
      b.quad(
        [sx, bottom, sz],
        [ex, bottom, ez],
        [ex + inward.dx * T, bottom, ez + inward.dy * T],
        [sx + inward.dx * T, bottom, sz + inward.dy * T],
        [sx + sz, 0],
        [ex + ez, 0],
        [ex + ez, T / 1.6],
        [sx + sz, T / 1.6],
        mat.tile,
        mat.tint,
        [soffitShade, soffitShade, soffitShade, soffitShade]
      );
      for (const end of [edge.start, edge.end]) {
        const other = end === edge.start ? edge.end : edge.start;
        const ox = Math.sign(end.x - other.x);
        const oy = Math.sign(end.y - other.y);
        this.emitJamb(b, end, { ox, oy }, inward, bottom, h, mat);
      }
    }
    /**
     * The inward-facing wall face for an edge, inset WALL_HALF_DEPTH into the
     * cell so the slab has visible extrusion depth at openings.
     */
    emitWallFace(b, cell, direction, yBottom, yTop, zone) {
      const edge = cell.edges[direction];
      const inward = step(opposite(direction));
      const T = WALL_HALF_DEPTH;
      let sx = edge.start.x + inward.dx * T;
      let sz = edge.start.y + inward.dy * T;
      let ex = edge.end.x + inward.dx * T;
      let ez = edge.end.y + inward.dy * T;
      const normalX = -(ez - sz);
      const normalZ = ex - sx;
      if (normalX * inward.dx + normalZ * inward.dy < 0) {
        [sx, ex] = [ex, sx];
        [sz, ez] = [ez, sz];
      }
      const { tile, tint, wear } = this.wallMaterial(edge, zone);
      const u0 = sx + sz;
      const u1 = ex + ez;
      const v0 = yBottom / 1.6;
      const v1 = yTop / 1.6;
      const sample = (x, z) => (0.42 + 0.5 * this.lightLevelAt(x, z)) * wear;
      const sS = sample(sx + inward.dx * 0.2, sz + inward.dy * 0.2);
      const sE = sample(ex + inward.dx * 0.2, ez + inward.dy * 0.2);
      b.quad(
        [sx, yBottom, sz],
        [ex, yBottom, ez],
        [ex, yTop, ez],
        [sx, yTop, sz],
        [u0, v0],
        [u1, v0],
        [u1, v1],
        [u0, v1],
        tile,
        tint,
        [sS, sE, sE * 0.92, sS * 0.92]
      );
    }
    emitFeature(b, cell, feature) {
      const fx = feature.position.x;
      const fz = feature.position.y;
      const h = cell.dimensions.depth;
      const light = 0.4 + 0.5 * this.lightLevelAt(fx, fz);
      if (feature.kind === "column") {
        const r = Math.max(0.09, feature.size);
        emitBox(b, fx - r, fx + r, 0, h, fz - r, fz + r, TILE.drywall, WHITE, light);
        return;
      }
      const rng = mulberry32(feature.variantSeed);
      const scale = clamp2(feature.size / 0.15, 0.75, 1.35);
      const archetype = Math.floor(rng.next() * 4);
      const s = (v) => v * scale;
      switch (archetype) {
        case 0: {
          emitBox(b, fx - s(0.14), fx + s(0.14), 0, s(0.52), fz - s(0.12), fz + s(0.12), TILE.metal, WHITE, light);
          break;
        }
        case 1: {
          const w = s(0.32);
          const d = s(0.2);
          const top = s(0.3);
          emitBox(b, fx - w, fx - w + s(0.04), 0, top, fz - d, fz + d, TILE.wood, WHITE, light * 0.9);
          emitBox(b, fx + w - s(0.04), fx + w, 0, top, fz - d, fz + d, TILE.wood, WHITE, light * 0.9);
          emitBox(b, fx - w, fx + w, top, top + s(0.04), fz - d, fz + d, TILE.wood, WHITE, light);
          break;
        }
        case 2: {
          const w = s(0.36);
          const d = s(0.17);
          emitBox(b, fx - w, fx + w, 0, s(0.18), fz - d, fz + d, TILE.fabric, WHITE, light);
          emitBox(b, fx - w, fx + w, s(0.18), s(0.4), fz + d - s(0.07), fz + d, TILE.fabric, WHITE, light * 0.95);
          break;
        }
        default: {
          const r = s(0.17);
          emitBox(b, fx - r, fx + r, 0, s(0.26), fz - r, fz + r, TILE.cardboard, WHITE, light);
          const r2 = s(0.12);
          const ox = (rng.next() - 0.5) * s(0.08);
          const oz = (rng.next() - 0.5) * s(0.08);
          emitBox(b, fx - r2 + ox, fx + r2 + ox, s(0.26), s(0.46), fz - r2 + oz, fz + r2 + oz, TILE.cardboard, WHITE, light * 1.05);
          break;
        }
      }
    }
  };
  function emitBox(b, x0, x1, y0, y1, z0, z1, tile, tint, shade) {
    const sides = shade * 0.85;
    const uw = (x1 - x0) * 2;
    const ud = (z1 - z0) * 2;
    const vh = (y1 - y0) * 2;
    b.quad(
      [x0, y0, z1],
      [x1, y0, z1],
      [x1, y1, z1],
      [x0, y1, z1],
      [0, 0],
      [uw, 0],
      [uw, vh],
      [0, vh],
      tile,
      tint,
      [sides, sides, sides, sides]
    );
    b.quad(
      [x1, y0, z0],
      [x0, y0, z0],
      [x0, y1, z0],
      [x1, y1, z0],
      [0, 0],
      [uw, 0],
      [uw, vh],
      [0, vh],
      tile,
      tint,
      [sides, sides, sides, sides]
    );
    b.quad(
      [x1, y0, z1],
      [x1, y0, z0],
      [x1, y1, z0],
      [x1, y1, z1],
      [0, 0],
      [ud, 0],
      [ud, vh],
      [0, vh],
      tile,
      tint,
      [sides, sides, sides, sides]
    );
    b.quad(
      [x0, y0, z0],
      [x0, y0, z1],
      [x0, y1, z1],
      [x0, y1, z0],
      [0, 0],
      [ud, 0],
      [ud, vh],
      [0, vh],
      tile,
      tint,
      [sides, sides, sides, sides]
    );
    b.quad(
      [x0, y1, z0],
      [x0, y1, z1],
      [x1, y1, z1],
      [x1, y1, z0],
      [0, 0],
      [0, ud],
      [uw, ud],
      [uw, 0],
      tile,
      tint,
      [shade, shade, shade, shade]
    );
  }
  function mix(a, b, t) {
    return a + (b - a) * t;
  }
  function hueRotate(rgb, degrees) {
    const rad = degrees * Math.PI / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    const [r, g, b] = rgb;
    return [
      (0.213 + c * 0.787 - s * 0.213) * r + (0.715 - c * 0.715 - s * 0.715) * g + (0.072 - c * 0.072 + s * 0.928) * b,
      (0.213 - c * 0.213 + s * 0.143) * r + (0.715 + c * 0.285 + s * 0.14) * g + (0.072 - c * 0.072 - s * 0.283) * b,
      (0.213 - c * 0.213 - s * 0.787) * r + (0.715 - c * 0.715 + s * 0.715) * g + (0.072 + c * 0.928 + s * 0.072) * b
    ];
  }
  function clamp2(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }
  var MeshBuilder = class {
    verts = [];
    idx = [];
    count = 0;
    quad(p0, p1, p2, p3, t0, t1, t2, t3, tile, tint, shades) {
      const points = [p0, p1, p2, p3];
      const uvs = [t0, t1, t2, t3];
      for (let i = 0; i < 4; i++) {
        const p = points[i];
        const t = uvs[i];
        this.verts.push(p[0], p[1], p[2], t[0], t[1], tile, tint[0], tint[1], tint[2], shades[i]);
      }
      const base = this.count;
      this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      this.count += 4;
    }
    vertices() {
      return new Float32Array(this.verts);
    }
    indices() {
      if (this.count > 65535) {
        throw new Error(`Chunk exceeds 16-bit index range: ${this.count} vertices`);
      }
      return new Uint16Array(this.idx);
    }
  };

  // src/webview/graffiti.ts
  var ATLAS_SIZE = 1024;
  var SLOT_W = 512;
  var SLOT_H = 256;
  var SLOT_COLS = 2;
  var STATIC_SLOTS = 7;
  var LIVE_SLOT = 7;
  var MAX_WRITE_DISTANCE = 6;
  var RESTAMP_DISTANCE = 4;
  var STAMP_COOLDOWN_MS = 2500;
  var HISTORY_COOLDOWN_MS = 1200;
  var REVEAL_CPS = 22;
  var LIVE_REDRAW_MS = 90;
  var GHOST_TAIL = 3;
  var SEGMENT_CAP = 120;
  var MIN_COMMIT_CHARS = 12;
  var WALL_SWITCH_MS = 700;
  var WRITE_Y0 = 0.55;
  var WRITE_Y1 = 1.05;
  var INK_FONT = 'Chiller, Creepster, "Segoe Script", "Comic Sans MS", cursive';
  var RAY_OFFSETS = [0, 0.5, -0.5, 1, -1, 1.6, -1.6, 2.4, -2.4, Math.PI];
  var WallWriting = class {
    enabled = true;
    job = { ...IDLE_JOB };
    session = null;
    stamps = [];
    nextSlot = 0;
    lastWrittenStatus = "";
    lastStampX = Number.NaN;
    lastStampY = Number.NaN;
    lastStampAt = 0;
    stampedHistory = /* @__PURE__ */ new Set();
    lastHistoryStampAt = 0;
    // Live ghost writing state. The response is written in segments: the
    // segment being revealed lives on LIVE_SLOT on the wall the player faces;
    // finished segments are committed onto static slots and the text flows on.
    live = null;
    liveHit = null;
    liveText = "";
    liveShown = 0;
    liveConsumed = 0;
    lastLiveTick = 0;
    lastLiveDraw = 0;
    lastLiveKey = "";
    lastWallSwitchAt = 0;
    atlas;
    ctx;
    constructor() {
      this.atlas = document.createElement("canvas");
      this.atlas.width = this.atlas.height = ATLAS_SIZE;
      const ctx = this.atlas.getContext("2d");
      if (!ctx) {
        throw new Error("2D context unavailable for wall writing");
      }
      this.ctx = ctx;
    }
    setJob(job) {
      this.job = job;
    }
    setSession(session) {
      this.session = session;
    }
    /** Clears every writing, e.g. on relocate or when the setting turns off. */
    reset(renderer) {
      this.job = { ...IDLE_JOB };
      this.session = null;
      this.stamps = [];
      this.nextSlot = 0;
      this.lastWrittenStatus = "";
      this.lastStampX = Number.NaN;
      this.lastStampY = Number.NaN;
      this.stampedHistory.clear();
      this.live = null;
      this.liveHit = null;
      this.liveText = "";
      this.liveShown = 0;
      this.liveConsumed = 0;
      this.lastLiveKey = "";
      renderer.clearDecalMesh();
    }
    /** Called once per frame; adds or advances writings as needed. */
    update(now, world, px, py, yaw, renderer) {
      if (!this.enabled) {
        return;
      }
      let changed = this.updateJobStamp(now, world, px, py, yaw);
      changed = this.updateHistoryStamps(now, world, px, py, yaw) || changed;
      changed = this.updateLive(now, world, px, py, yaw) || changed;
      if (changed) {
        renderer.setDecalTexture(this.atlas);
        this.uploadMesh(renderer);
      }
    }
    // --- Job-status stamps (tool / command / status file route) ---------------
    updateJobStamp(now, world, px, py, yaw) {
      if (!this.job.working || this.job.status.length === 0) {
        return false;
      }
      if (now - this.lastStampAt < STAMP_COOLDOWN_MS) {
        return false;
      }
      const statusChanged = this.job.status !== this.lastWrittenStatus;
      const moved = Number.isNaN(this.lastStampX) || Math.hypot(px - this.lastStampX, py - this.lastStampY) >= RESTAMP_DISTANCE;
      if (!statusChanged && !moved) {
        return false;
      }
      const hit = findWallAhead(world, px, py, yaw);
      if (!hit) {
        return false;
      }
      const edgeKey2 = `${hit.cx},${hit.cy},${hit.direction}`;
      const existing = this.stamps.findIndex((s) => s.edgeKey === edgeKey2);
      if (existing !== -1 && !statusChanged || this.live?.edgeKey === edgeKey2) {
        return false;
      }
      const slot = existing !== -1 ? this.stamps[existing].slot : this.claimStaticSlot();
      if (existing !== -1) {
        this.stamps.splice(existing, 1);
      }
      if (!this.stampStatic(world, hit, slot, edgeKey2, this.job.status)) {
        return false;
      }
      this.lastWrittenStatus = this.job.status;
      this.lastStampX = px;
      this.lastStampY = py;
      this.lastStampAt = now;
      return true;
    }
    // --- Session history stamps ------------------------------------------------
    updateHistoryStamps(now, world, px, py, yaw) {
      if (!this.session || now - this.lastHistoryStampAt < HISTORY_COOLDOWN_MS) {
        return false;
      }
      if (this.stampedHistory.size > 200) {
        this.stampedHistory.clear();
      }
      for (const exchange of this.session.history) {
        const text = exchange.response || exchange.prompt;
        if (!text) {
          continue;
        }
        const key = hashText(exchange.prompt + "\0" + exchange.response);
        if (this.stampedHistory.has(key)) {
          continue;
        }
        const hit = this.findFreeWall(world, px, py, yaw);
        if (!hit) {
          return false;
        }
        const edgeKey2 = `${hit.cx},${hit.cy},${hit.direction}`;
        const slot = this.claimStaticSlot();
        if (this.stampStatic(world, hit, slot, edgeKey2, text)) {
          this.stampedHistory.add(key);
          this.lastHistoryStampAt = now;
          return true;
        }
      }
      return false;
    }
    // --- Live ghost writing ------------------------------------------------------
    updateLive(now, world, px, py, yaw) {
      const target = this.session?.current ?? "";
      if (target.length === 0) {
        return false;
      }
      let changed = false;
      if (!target.startsWith(this.liveText)) {
        changed = this.commitLive(world, Number.MAX_SAFE_INTEGER) || changed;
        this.live = null;
        this.liveHit = null;
        this.liveShown = 0;
        this.liveConsumed = 0;
        this.lastLiveKey = "";
      }
      this.liveText = target;
      let segment = target.slice(this.liveConsumed);
      if (segment.length === 0 && !this.live) {
        return changed;
      }
      const faced = findWallAhead(world, px, py, yaw);
      const facedKey = faced ? `${faced.cx},${faced.cy},${faced.direction}` : null;
      if (this.live && faced && facedKey !== this.live.edgeKey && this.isFreeWall(facedKey) && now - this.lastWallSwitchAt > WALL_SWITCH_MS) {
        const shownInSegment2 = Math.max(0, Math.floor(this.liveShown) - this.liveConsumed);
        if (shownInSegment2 >= MIN_COMMIT_CHARS) {
          changed = this.commitLive(world, shownInSegment2) || changed;
        }
        changed = this.startLive(world, faced) || changed;
        this.lastWallSwitchAt = now;
        segment = target.slice(this.liveConsumed);
      }
      if (!this.live) {
        const hit = faced && this.isFreeWall(facedKey) ? faced : this.findFreeWall(world, px, py, yaw);
        if (!hit || !this.startLive(world, hit)) {
          return changed;
        }
        changed = true;
        this.lastWallSwitchAt = now;
      }
      const dt = Math.min(0.2, (now - this.lastLiveTick) / 1e3 || 0);
      this.lastLiveTick = now;
      this.liveShown = Math.min(target.length, this.liveShown + dt * REVEAL_CPS);
      const shownInSegment = Math.min(segment.length, Math.max(0, Math.floor(this.liveShown) - this.liveConsumed));
      if (shownInSegment >= SEGMENT_CAP) {
        changed = this.commitLive(world, shownInSegment) || changed;
        return changed;
      }
      const done = this.session ? !this.session.working : true;
      if (done && this.liveConsumed + shownInSegment >= target.length && this.live) {
        changed = this.commitLive(world, segment.length) || changed;
        return changed;
      }
      const key = `${shownInSegment}|${segment.length}|${this.live.edgeKey}`;
      if (key === this.lastLiveKey || now - this.lastLiveDraw < LIVE_REDRAW_MS) {
        return changed;
      }
      this.lastLiveKey = key;
      this.lastLiveDraw = now;
      const stillRevealing = this.liveConsumed + shownInSegment < target.length;
      this.drawSlot(
        LIVE_SLOT,
        segment.slice(0, shownInSegment),
        stillRevealing ? GHOST_TAIL : 0,
        `${this.live.edgeKey}#${this.liveConsumed}`
      );
      return true;
    }
    /** Places (or moves) the live quad onto the given wall, cleared. */
    startLive(world, hit) {
      const vertices = buildWallQuad(world, hit, LIVE_SLOT);
      if (!vertices) {
        return false;
      }
      this.live = { edgeKey: `${hit.cx},${hit.cy},${hit.direction}`, slot: LIVE_SLOT, vertices };
      this.liveHit = hit;
      this.lastLiveKey = "";
      this.drawSlot(LIVE_SLOT, "", 0);
      return true;
    }
    /**
     * Freezes up to `maxChars` of the live segment onto a static slot on the
     * wall it was written on (cut at a word boundary), advances the consumed
     * counter, and frees the live quad. Returns whether anything was drawn.
     */
    commitLive(world, maxChars) {
      const hit = this.liveHit;
      const live = this.live;
      this.live = null;
      this.liveHit = null;
      this.lastLiveKey = "";
      if (!hit || !live) {
        return false;
      }
      const segment = this.liveText.slice(this.liveConsumed);
      let cut = Math.min(segment.length, maxChars);
      if (cut < segment.length) {
        const space = segment.lastIndexOf(" ", cut);
        if (space > cut * 0.4) {
          cut = space + 1;
        }
      }
      const committed = segment.slice(0, cut).trim();
      this.liveConsumed += cut;
      this.liveShown = Math.max(this.liveShown, this.liveConsumed);
      if (committed.length === 0) {
        return false;
      }
      const slot = this.claimStaticSlot();
      const vertices = buildWallQuad(world, hit, slot);
      if (!vertices) {
        return false;
      }
      this.drawSlot(slot, committed, 0);
      this.stamps.push({ edgeKey: live.edgeKey, slot, vertices });
      return true;
    }
    isFreeWall(edgeKey2) {
      return this.live?.edgeKey !== edgeKey2 && !this.stamps.some((s) => s.edgeKey === edgeKey2);
    }
    // --- Shared helpers ----------------------------------------------------------
    /** Next rotating static slot, evicting whatever writing used it before. */
    claimStaticSlot() {
      const slot = this.nextSlot % STATIC_SLOTS;
      this.nextSlot++;
      this.stamps = this.stamps.filter((s) => s.slot !== slot);
      return slot;
    }
    stampStatic(world, hit, slot, edgeKey2, text) {
      const vertices = buildWallQuad(world, hit, slot);
      if (!vertices) {
        return false;
      }
      this.drawSlot(slot, text, 0);
      this.stamps.push({ edgeKey: edgeKey2, slot, vertices });
      return true;
    }
    /** First unclaimed wall found by fanning rays around the player's gaze. */
    findFreeWall(world, px, py, yaw) {
      for (const offset of RAY_OFFSETS) {
        const hit = findWallAhead(world, px, py, yaw + offset);
        if (hit && this.isFreeWall(`${hit.cx},${hit.cy},${hit.direction}`)) {
          return hit;
        }
      }
      return null;
    }
    uploadMesh(renderer) {
      const vertices = [];
      const indices = [];
      const all = this.live ? [...this.stamps, this.live] : this.stamps;
      for (const stamp of all) {
        const base = vertices.length / 6;
        vertices.push(...stamp.vertices);
        indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
      renderer.setDecalMesh(new Float32Array(vertices), new Uint16Array(indices));
    }
    /**
     * Draws one writing into an atlas slot with the marker treatment: glyphs
     * jittered like handwriting, outline copies extruded ~3px toward the wall,
     * black fill under a very subtle drop shadow, splatter, and finally a
     * low-opacity gradient overlay (angle and stops seeded per text) that
     * shifts across the strokes like uneven marker ink.
     *
     * `ghostTail` renders the last N characters progressively fainter, for the
     * live response materializing onto the wall.
     */
    drawSlot(slot, text, ghostTail, seedText) {
      const ctx = this.ctx;
      const ox = slot % SLOT_COLS * SLOT_W;
      const oy = Math.floor(slot / SLOT_COLS) * SLOT_H;
      ctx.save();
      ctx.clearRect(ox, oy, SLOT_W, SLOT_H);
      if (text.trim().length === 0) {
        ctx.restore();
        return;
      }
      ctx.beginPath();
      ctx.rect(ox, oy, SLOT_W, SLOT_H);
      ctx.clip();
      const rng = mulberry(hashCode(seedText ?? text) || 1);
      let size = 80;
      let lines = [text.trim()];
      for (; size > 26; size -= 4) {
        ctx.font = `bold ${size}px ${INK_FONT}`;
        lines = wrapToLines(ctx, text, SLOT_W - 70);
        if (lines.length * size * 1.12 <= SLOT_H - 36) {
          break;
        }
      }
      const maxLines = Math.max(1, Math.floor((SLOT_H - 36) / (size * 1.12)));
      if (lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        lines[maxLines - 1] += "\u2026";
      }
      const ink = (alpha) => `rgba(16, 14, 13, ${alpha.toFixed(3)})`;
      const extrude = (alpha) => `rgba(34, 30, 27, ${alpha.toFixed(3)})`;
      ctx.textBaseline = "alphabetic";
      const lineGap = size * 1.12;
      const blockH = lineGap * (lines.length - 1);
      const baseY = oy + SLOT_H / 2 - blockH / 2 + size * 0.34;
      const totalChars = lines.reduce((n, line) => n + line.length, 0);
      let drawnChars = 0;
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        ctx.font = `bold ${size}px ${INK_FONT}`;
        const lineW = ctx.measureText(line).width;
        let x = ox + (SLOT_W - lineW) / 2 + (rng() - 0.5) * 16;
        const y = baseY + li * lineGap + (rng() - 0.5) * 8;
        for (const char of line) {
          const w = ctx.measureText(char).width;
          const fromEnd = totalChars - drawnChars;
          const ghost = ghostTail > 0 && fromEnd <= ghostTail ? fromEnd / (ghostTail + 1) : 0;
          const alpha = (0.82 + rng() * 0.14) * (1 - ghost * 0.75);
          ctx.save();
          ctx.translate(x + w / 2, y + (rng() - 0.5) * size * 0.09);
          ctx.rotate((rng() - 0.5) * 0.14);
          ctx.shadowColor = "transparent";
          for (const depth of [3, 2, 1]) {
            ctx.fillStyle = extrude(0.2 * (1 - ghost));
            ctx.fillText(char, -w / 2 + depth, depth * 0.8);
          }
          ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
          ctx.shadowBlur = 2;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1.5;
          ctx.fillStyle = ink(alpha);
          ctx.fillText(char, -w / 2, 0);
          ctx.restore();
          x += w * (0.94 + rng() * 0.06);
          drawnChars++;
          if (rng() < 0.07 && ghost === 0) {
            const dripLen = 16 + rng() * 56;
            const dripX = x - w / 2 + (rng() - 0.5) * 6;
            const grad2 = ctx.createLinearGradient(0, y, 0, y + dripLen);
            grad2.addColorStop(0, ink(0.55));
            grad2.addColorStop(1, ink(0));
            ctx.fillStyle = grad2;
            ctx.fillRect(dripX, y - 2, 1.4 + rng() * 1.6, dripLen);
          }
        }
      }
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      const splats = 5 + Math.floor(rng() * 6);
      for (let i = 0; i < splats; i++) {
        const sx = ox + 30 + rng() * (SLOT_W - 60);
        const sy = oy + 30 + rng() * (SLOT_H - 60);
        ctx.fillStyle = ink(0.2 + rng() * 0.4);
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8 + rng() * rng() * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-atop";
      const theta = rng() * Math.PI * 2;
      const r = Math.max(SLOT_W, SLOT_H) / 2;
      const cxm = ox + SLOT_W / 2;
      const cym = oy + SLOT_H / 2;
      const grad = ctx.createLinearGradient(
        cxm - Math.cos(theta) * r,
        cym - Math.sin(theta) * r,
        cxm + Math.cos(theta) * r,
        cym + Math.sin(theta) * r
      );
      let pos = 0;
      let bright = rng() < 0.5;
      while (pos < 1) {
        const alpha = 0.04 + rng() * 0.08;
        grad.addColorStop(pos, bright ? `rgba(255, 255, 255, ${alpha.toFixed(3)})` : `rgba(30, 30, 30, ${alpha.toFixed(3)})`);
        pos += 0.12 + rng() * 0.2;
        bright = !bright;
      }
      ctx.fillStyle = grad;
      ctx.fillRect(ox, oy, SLOT_W, SLOT_H);
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();
    }
  };
  function wrapToLines(ctx, text, maxWidth) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      return [""];
    }
    const lines = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
    return lines;
  }
  function hashCode(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }
  function hashText(text) {
    return hashCode(text).toString(36);
  }
  function mulberry(seed) {
    let state = seed >>> 0;
    return () => {
      state = state + 1831565813 >>> 0;
      let t = state;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function findWallAhead(world, px, py, yaw) {
    const fx = -Math.sin(yaw);
    const fy = -Math.cos(yaw);
    let cx = Math.floor(px);
    let cy = Math.floor(py);
    const stepX = fx > 0 ? 1 : -1;
    const stepY = fy > 0 ? 1 : -1;
    const tDeltaX = fx !== 0 ? 1 / Math.abs(fx) : Infinity;
    const tDeltaY = fy !== 0 ? 1 / Math.abs(fy) : Infinity;
    let tMaxX = fx !== 0 ? (fx > 0 ? cx + 1 - px : px - cx) / Math.abs(fx) : Infinity;
    let tMaxY = fy !== 0 ? (fy > 0 ? cy + 1 - py : py - cy) / Math.abs(fy) : Infinity;
    for (let i = 0; i < MAX_WRITE_DISTANCE * 2; i++) {
      let direction;
      let t;
      if (tMaxX < tMaxY) {
        direction = stepX > 0 ? "east" : "west";
        t = tMaxX;
        tMaxX += tDeltaX;
      } else {
        direction = stepY > 0 ? "south" : "north";
        t = tMaxY;
        tMaxY += tDeltaY;
      }
      if (t > MAX_WRITE_DISTANCE) {
        return null;
      }
      if (!world.generator.isPassable(cx, cy, direction)) {
        return { cx, cy, direction, hitX: px + fx * t, hitY: py + fy * t };
      }
      const d = step(direction);
      cx += d.dx;
      cy += d.dy;
    }
    return null;
  }
  function buildWallQuad(world, hit, slot) {
    const cell = world.generator.getCell(hit.cx, hit.cy);
    const edge = cell.edges[hit.direction];
    const inward = step(opposite(hit.direction));
    const off = WALL_HALF_DEPTH + 8e-3;
    let ax = edge.start.x + inward.dx * off;
    let az = edge.start.y + inward.dy * off;
    let bx = edge.end.x + inward.dx * off;
    let bz = edge.end.y + inward.dy * off;
    if (-(bz - az) * inward.dx + (bx - ax) * inward.dy < 0) {
      [ax, bx] = [bx, ax];
      [az, bz] = [bz, az];
    }
    const len = Math.hypot(bx - ax, bz - az);
    const width = Math.min(1.5, len - 0.24);
    if (width < 0.6) {
      return null;
    }
    const ux = (bx - ax) / len;
    const uz = (bz - az) / len;
    const hitU = (hit.hitX - ax) * ux + (hit.hitY - az) * uz;
    const center2 = Math.min(len - 0.12 - width / 2, Math.max(0.12 + width / 2, hitU));
    const x0 = ax + ux * (center2 - width / 2);
    const z0 = az + uz * (center2 - width / 2);
    const x1 = ax + ux * (center2 + width / 2);
    const z1 = az + uz * (center2 + width / 2);
    const shade = 0.42 + 0.5 * world.lightAt((x0 + x1) / 2 + inward.dx * 0.2, (z0 + z1) / 2 + inward.dy * 0.2);
    const u0 = slot % SLOT_COLS * SLOT_W / ATLAS_SIZE;
    const v0 = Math.floor(slot / SLOT_COLS) * SLOT_H / ATLAS_SIZE;
    const u1 = u0 + SLOT_W / ATLAS_SIZE;
    const v1 = v0 + SLOT_H / ATLAS_SIZE;
    return [
      x0,
      WRITE_Y0,
      z0,
      u0,
      v1,
      shade,
      x1,
      WRITE_Y0,
      z1,
      u1,
      v1,
      shade,
      x1,
      WRITE_Y1,
      z1,
      u1,
      v0,
      shade,
      x0,
      WRITE_Y1,
      z0,
      u0,
      v0,
      shade
    ];
  }

  // src/webview/input.ts
  var Input = class {
    constructor(surface) {
      this.surface = surface;
      window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          this.onMenuToggle?.();
          return;
        }
        const target = e.target;
        if (target instanceof HTMLElement && (target.matches("input, select, textarea, button") || target.isContentEditable)) {
          return;
        }
        if (e.key.toLowerCase() === "m") {
          this.onMenuToggle?.();
          return;
        }
        this.held.add(normalize(e.key));
        if (isGameKey(e.key)) {
          e.preventDefault();
        }
      });
      window.addEventListener("keyup", (e) => this.held.delete(normalize(e.key)));
      window.addEventListener("blur", () => this.held.clear());
      surface.addEventListener("click", () => {
        if (this.mouseLookEnabled && document.pointerLockElement !== surface) {
          surface.requestPointerLock();
        }
      });
      document.addEventListener("mousemove", (e) => {
        if (document.pointerLockElement === this.surface) {
          this.lookDx += e.movementX;
          this.lookDy += e.movementY;
        }
      });
    }
    held = /* @__PURE__ */ new Set();
    lookDx = 0;
    mouseLookEnabled = true;
    onMenuToggle = null;
    lookDy = 0;
    releasePointer() {
      if (document.pointerLockElement === this.surface) {
        document.exitPointerLock();
      }
    }
    /** Accumulated mouse-look delta since the last call, in pixels. */
    consumeLook() {
      const out = { dx: this.lookDx, dy: this.lookDy };
      this.lookDx = 0;
      this.lookDy = 0;
      return out;
    }
    state() {
      const has = (...keys) => keys.some((k) => this.held.has(k));
      return {
        forward: (has("w", "arrowup") ? 1 : 0) - (has("s", "arrowdown") ? 1 : 0),
        strafe: (has("d") ? 1 : 0) - (has("a") ? 1 : 0),
        turn: (has("arrowright", "e") ? 1 : 0) - (has("arrowleft", "q") ? 1 : 0),
        running: has("shift")
      };
    }
  };
  function normalize(key) {
    return key.toLowerCase();
  }
  function isGameKey(key) {
    return ["w", "a", "s", "d", "q", "e", "shift"].includes(key.toLowerCase()) || key.startsWith("Arrow");
  }

  // src/webview/monster.ts
  var BODY_FORMS = ["spider", "humanoid", "cloud"];
  var CATCH_DISTANCE = 0.45;
  var REPATH_MS = 600;
  var PATH_NODE_CAP = 900;
  var DARK = [1, 1, 1];
  var BODY_SHADE = 0.16;
  var EYE_TINT = [1, 0.16, 0.1];
  var Monster = class {
    constructor(world, config, now) {
      this.world = world;
      this.config = config;
      this.arm(now);
    }
    form = "spider";
    x = 0;
    y = 0;
    config;
    stalking = false;
    spawnAt = 0;
    path = [];
    lastPathAt = 0;
    phase = 0;
    heading = 0;
    get isStalking() {
      return this.stalking;
    }
    /** Applies new tuning live; the spawn window only affects future arms. */
    configure(config) {
      const formChanged = config.form !== this.config.form;
      this.config = config;
      if (formChanged && config.form !== "random") {
        this.form = config.form;
      }
    }
    /** Returns to dormant and schedules the next appearance. */
    arm(now) {
      this.stalking = false;
      this.path = [];
      const min = Math.min(this.config.spawnMinMs, this.config.spawnMaxMs);
      const max = Math.max(this.config.spawnMinMs, this.config.spawnMaxMs);
      this.spawnAt = now + min + Math.random() * (max - min);
    }
    update(now, dt, px, py) {
      if (!this.stalking) {
        if (now >= this.spawnAt) {
          this.spawn(px, py);
          return "spawned";
        }
        return null;
      }
      const distToPlayer = Math.hypot(px - this.x, py - this.y);
      if (distToPlayer < CATCH_DISTANCE) {
        this.arm(now);
        return "caught";
      }
      if (now - this.lastPathAt > REPATH_MS) {
        this.lastPathAt = now;
        this.path = this.findPath(Math.floor(this.x), Math.floor(this.y), Math.floor(px), Math.floor(py));
      }
      let target = this.path[0] ? center(this.path[0]) : this.greedyStep(px, py);
      if (this.path.length <= 1 && distToPlayer < 1.4) {
        target = { x: px, y: py };
      }
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);
      const travel = this.config.speed * dt;
      if (dist > 1e-4) {
        const t = Math.min(1, travel / dist);
        this.x += dx * t;
        this.y += dy * t;
        this.heading = Math.atan2(dy, dx);
        this.phase += travel * 4.4;
      }
      if (this.path[0] && Math.hypot(center(this.path[0]).x - this.x, center(this.path[0]).y - this.y) < 0.08) {
        this.path.shift();
      }
      return null;
    }
    spawn(px, py) {
      if (this.config.form === "random") {
        this.form = BODY_FORMS[Math.floor(Math.random() * BODY_FORMS.length)];
      } else {
        this.form = this.config.form;
      }
      const angle = Math.random() * Math.PI * 2;
      const dist = 9 + Math.random() * 5;
      this.x = Math.floor(px + Math.cos(angle) * dist) + 0.5;
      this.y = Math.floor(py + Math.sin(angle) * dist) + 0.5;
      this.path = [];
      this.lastPathAt = 0;
      this.stalking = true;
    }
    /** Breadth-first search through open edges, capped for the infinite grid. */
    findPath(fromCx, fromCy, toCx, toCy) {
      if (fromCx === toCx && fromCy === toCy) {
        return [];
      }
      const key = (cx, cy) => `${cx},${cy}`;
      const parents = /* @__PURE__ */ new Map();
      parents.set(key(fromCx, fromCy), null);
      const queue = [{ cx: fromCx, cy: fromCy }];
      let found = false;
      while (queue.length > 0 && parents.size < PATH_NODE_CAP) {
        const node = queue.shift();
        if (node.cx === toCx && node.cy === toCy) {
          found = true;
          break;
        }
        for (const direction of DIRECTIONS) {
          if (!this.world.generator.isPassable(node.cx, node.cy, direction)) {
            continue;
          }
          const { dx, dy } = step(direction);
          const next = { cx: node.cx + dx, cy: node.cy + dy };
          const nextKey = key(next.cx, next.cy);
          if (!parents.has(nextKey)) {
            parents.set(nextKey, key(node.cx, node.cy));
            queue.push(next);
          }
        }
      }
      if (!found) {
        return [];
      }
      const path = [];
      let cursor = key(toCx, toCy);
      while (cursor && cursor !== key(fromCx, fromCy)) {
        const [cx, cy] = cursor.split(",").map(Number);
        path.unshift({ cx, cy });
        cursor = parents.get(cursor) ?? null;
      }
      return path;
    }
    /** No path known: shuffle toward the player through any open edge. */
    greedyStep(px, py) {
      const cx = Math.floor(this.x);
      const cy = Math.floor(this.y);
      let best = { x: this.x, y: this.y };
      let bestDist = Number.POSITIVE_INFINITY;
      for (const direction of DIRECTIONS) {
        if (!this.world.generator.isPassable(cx, cy, direction)) {
          continue;
        }
        const { dx, dy } = step(direction);
        const candidate = center({ cx: cx + dx, cy: cy + dy });
        const dist = Math.hypot(px - candidate.x, py - candidate.y);
        if (dist < bestDist) {
          bestDist = dist;
          best = candidate;
        }
      }
      return best;
    }
    /** Emits this frame's world-space geometry. */
    buildMesh(now, px, py) {
      const b = new MeshBuilder();
      switch (this.form) {
        case "spider":
          this.buildSpider(b);
          break;
        case "humanoid":
          this.buildHumanoid(b);
          break;
        case "cloud":
          this.buildCloud(b, now);
          break;
      }
      this.buildEyes(b, px, py);
      return { vertices: b.vertices(), indices: b.indices() };
    }
    buildSpider(b) {
      const { x, y } = this;
      emitBox(b, x - 0.19, x + 0.19, 0.2, 0.42, y - 0.23, y + 0.23, TILE.fabric, DARK, BODY_SHADE);
      emitBox(b, x - 0.09, x + 0.09, 0.26, 0.4, y - 0.34, y - 0.2, TILE.fabric, DARK, BODY_SHADE * 1.2);
      for (let i = 0; i < 8; i++) {
        const side = i < 4 ? -1 : 1;
        const spread = (i % 4 - 1.5) * 0.5 + this.heading;
        const lift = Math.max(0, Math.sin(this.phase + i * (Math.PI / 2))) * 0.1;
        const hip = [x + side * 0.17, 0.34, y + Math.sin(spread) * 0.15];
        const foot = [
          x + side * (0.5 + 0.1 * Math.sin(i * 2.1)),
          lift,
          y + Math.sin(spread) * 0.42 + Math.cos(spread) * side * 0.12
        ];
        this.limb(b, hip, foot, 0.045);
      }
    }
    buildHumanoid(b) {
      const { x, y } = this;
      const sway = Math.sin(this.phase * 0.5) * 0.03;
      emitBox(b, x - 0.11 + sway, x + 0.11 + sway, 0.52, 1.06, y - 0.07, y + 0.07, TILE.fabric, DARK, BODY_SHADE);
      emitBox(b, x - 0.06 + sway, x + 0.06 + sway, 1.06, 1.2, y - 0.06, y + 0.06, TILE.fabric, DARK, BODY_SHADE * 1.15);
      const strideX = Math.cos(this.heading) * 0.16;
      const strideY = Math.sin(this.heading) * 0.16;
      const gait = Math.sin(this.phase);
      this.limb(b, [x - 0.06, 0.55, y], [x - 0.06 + strideX * gait, 0, y + strideY * gait], 0.05);
      this.limb(b, [x + 0.06, 0.55, y], [x + 0.06 - strideX * gait, 0, y - strideY * gait], 0.05);
      this.limb(b, [x - 0.13 + sway, 1, y], [x - 0.13 + sway - strideX * gait * 0.5, 0.5, y - strideY * gait * 0.5], 0.04);
      this.limb(b, [x + 0.13 + sway, 1, y], [x + 0.13 + sway + strideX * gait * 0.5, 0.5, y + strideY * gait * 0.5], 0.04);
    }
    buildCloud(b, now) {
      const { x, y } = this;
      const t = now / 1e3;
      for (let i = 0; i < 10; i++) {
        const jx = Math.sin(t * 1.3 + i * 2.4) * 0.14;
        const jy = Math.sin(t * 1.7 + i * 1.9) * 0.1;
        const jz = Math.cos(t * 1.1 + i * 3.2) * 0.14;
        const size = 0.12 + i * 37 % 10 * 0.02;
        const cx = x + Math.sin(i * 2.4) * 0.2 + jx;
        const cy = 0.45 + Math.sin(i * 1.6) * 0.3 + jy;
        const cz = y + Math.cos(i * 2.9) * 0.2 + jz;
        emitBox(b, cx - size, cx + size, cy - size, cy + size, cz - size, cz + size, TILE.concrete, DARK, BODY_SHADE * (0.8 + i % 3 * 0.2));
      }
    }
    /** Two small emissive eyes billboarded toward the player. */
    buildEyes(b, px, py) {
      const eyeHeight = this.form === "spider" ? 0.36 : this.form === "humanoid" ? 1.13 : 0.7;
      const toPlayerX = px - this.x;
      const toPlayerY = py - this.y;
      const len = Math.hypot(toPlayerX, toPlayerY) || 1;
      const fx = toPlayerX / len;
      const fy = toPlayerY / len;
      const rx = -fy;
      const ry = fx;
      const ex = this.x + fx * 0.2;
      const ey = this.y + fy * 0.2;
      const r = 0.03;
      for (const side of [-1, 1]) {
        const cx = ex + rx * side * 0.06;
        const cy = ey + ry * side * 0.06;
        b.quad(
          [cx - rx * r, eyeHeight - r, cy - ry * r],
          [cx + rx * r, eyeHeight - r, cy + ry * r],
          [cx + rx * r, eyeHeight + r, cy + ry * r],
          [cx - rx * r, eyeHeight + r, cy - ry * r],
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          TILE.lightPanel,
          EYE_TINT,
          [EMISSIVE_SHADE + 0.8, EMISSIVE_SHADE + 0.8, EMISSIVE_SHADE + 0.8, EMISSIVE_SHADE + 0.8]
        );
      }
    }
    /** A thin double-sided crossed-quad limb between two points. */
    limb(b, from, to, width) {
      const shades = [BODY_SHADE, BODY_SHADE, BODY_SHADE, BODY_SHADE];
      const uv = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1]
      ];
      const planes = [
        [width, 0, 0],
        [0, 0, width]
      ];
      for (const offset of planes) {
        const a0 = [from[0] - offset[0], from[1] - offset[1], from[2] - offset[2]];
        const a1 = [from[0] + offset[0], from[1] + offset[1], from[2] + offset[2]];
        const b1 = [to[0] + offset[0], to[1] + offset[1], to[2] + offset[2]];
        const b0 = [to[0] - offset[0], to[1] - offset[1], to[2] - offset[2]];
        b.quad(a0, a1, b1, b0, uv[0], uv[1], uv[2], uv[3], TILE.fabric, DARK, shades);
        b.quad(b0, b1, a1, a0, uv[0], uv[1], uv[2], uv[3], TILE.fabric, DARK, shades);
      }
    }
  };
  function center(cell) {
    return { x: cell.cx + 0.5, y: cell.cy + 0.5 };
  }

  // src/webview/menu.ts
  var STYLE = `
.bv-menu {
  position: absolute; inset: 0; display: none; z-index: 30;
  align-items: center; justify-content: center;
  background: rgba(16, 17, 19, 0.72);
  font-family: "Segoe UI", system-ui, sans-serif;
  color: #f0f2f3;
}
.bv-menu.open { display: flex; }
.bv-card {
  background: linear-gradient(#22252a, #1c1f23);
  border: 1px solid #3a3f46; border-radius: 10px;
  min-width: 300px; max-width: 380px; max-height: 82%; overflow-y: auto;
  padding: 22px 26px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
}
.bv-card h1 { margin: 0 0 2px; font-size: 20px; letter-spacing: 3px; font-weight: 600; }
.bv-card .bv-sub { margin: 0 0 18px; font-size: 12px; color: #9aa3ad; }
.bv-menu button {
  display: block; width: 100%; margin: 8px 0; padding: 10px 14px;
  background: #2b3036; color: #f0f2f3; border: 1px solid #454c55;
  border-radius: 6px; font-size: 14px; cursor: pointer; text-align: left;
}
.bv-menu button:hover { background: #343a42; }
.bv-menu button.bv-accent { background: #6b4b12; border-color: #93691c; }
.bv-menu button.bv-accent:hover { background: #7d5915; }
.bv-row { display: flex; align-items: center; justify-content: space-between; margin: 10px 0; font-size: 13px; gap: 12px; }
.bv-row label { flex: 1; color: #cfd6dc; }
.bv-row input[type="checkbox"] { width: 16px; height: 16px; accent-color: #93691c; }
.bv-row input[type="range"] { width: 130px; accent-color: #93691c; }
.bv-row input[type="number"] {
  width: 110px; background: #15171a; color: #f0f2f3;
  border: 1px solid #454c55; border-radius: 4px; padding: 5px 7px; font-size: 13px;
}
.bv-row .bv-val { width: 34px; text-align: right; color: #9aa3ad; font-variant-numeric: tabular-nums; }
.bv-row select {
  background: #15171a; color: #f0f2f3; border: 1px solid #454c55;
  border-radius: 4px; padding: 5px 7px; font-size: 13px; min-width: 150px;
}
.bv-h {
  margin: 16px 0 4px; font-size: 11px; letter-spacing: 2px;
  color: #8a93a0; text-transform: uppercase;
}
.bv-h:first-of-type { margin-top: 8px; }
.bv-stats { margin-top: 14px; padding-top: 12px; border-top: 1px solid #33383f; font-size: 12px; color: #9aa3ad; line-height: 1.7; }
.bv-help { font-size: 13px; color: #cfd6dc; line-height: 1.9; }
.bv-help kbd {
  background: #15171a; border: 1px solid #454c55; border-radius: 4px;
  padding: 1px 6px; font-family: inherit; font-size: 12px;
}
.bv-back { margin-top: 16px !important; }
`;
  var Menu = class {
    constructor(parent, callbacks) {
      this.callbacks = callbacks;
      const style = document.createElement("style");
      style.textContent = STYLE;
      document.head.appendChild(style);
      this.root = document.createElement("div");
      this.root.className = "bv-menu";
      parent.appendChild(this.root);
      this.views = {
        main: this.buildMain(),
        settings: this.buildSettings(),
        help: this.buildHelp()
      };
      for (const view of Object.values(this.views)) {
        this.root.appendChild(view);
      }
      this.show("main");
    }
    root;
    views;
    statsEl = null;
    settings = null;
    openFlag = false;
    lastFocused = null;
    get isOpen() {
      return this.openFlag;
    }
    open() {
      this.openFlag = true;
      this.lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      this.root.classList.add("open");
      this.show("main");
    }
    close() {
      this.openFlag = false;
      this.root.classList.remove("open");
      if (this.lastFocused?.isConnected) {
        this.lastFocused.focus();
      }
      this.lastFocused = null;
    }
    syncSettings(settings) {
      this.settings = settings;
      for (const input of this.root.querySelectorAll("[data-key]")) {
        const key = input.dataset.key;
        const value = settings[key];
        if (input.type === "checkbox") {
          input.checked = Boolean(value);
        } else {
          input.value = String(value);
          const label = input.parentElement?.querySelector(".bv-val");
          if (label) {
            label.textContent = String(value);
          }
        }
      }
    }
    syncStats(stats) {
      if (this.statsEl) {
        this.statsEl.innerHTML = `seed <b>${stats.seed}</b><br>cells visited <b>${stats.cellsVisited}</b><br>cells cached <b>${stats.cacheSize}</b>`;
      }
    }
    show(name) {
      for (const [key, view] of Object.entries(this.views)) {
        view.style.display = key === name ? "block" : "none";
      }
      // Only the visible card is a live dialog; hand it focus so assistive
      // tech announces the context change instead of staying on the game.
      if (this.openFlag) {
        const view = this.views[name];
        const target = view.querySelector("button, input, select") ?? view;
        target.focus();
      }
    }
    card() {
      const card = document.createElement("div");
      card.className = "bv-card";
      card.setAttribute("role", "dialog");
      card.setAttribute("aria-modal", "true");
      card.setAttribute("aria-label", "BackRooms pause menu");
      card.tabIndex = -1;
      card.innerHTML = '<h1>BACKROOMS</h1><p class="bv-sub">noclipped into a Copilot canvas</p>';
      return card;
    }
    button(label, onClick, accent = false) {
      const button = document.createElement("button");
      button.textContent = label;
      if (accent) {
        button.className = "bv-accent";
      }
      button.addEventListener("click", onClick);
      return button;
    }
    buildMain() {
      const card = this.card();
      card.appendChild(this.button("Resume", () => this.callbacks.onResume()));
      card.appendChild(this.button("Relocate (new seed)", () => this.callbacks.onRelocate(), true));
      card.appendChild(this.button("Settings", () => this.show("settings")));
      card.appendChild(this.button("Help", () => this.show("help")));
      this.statsEl = document.createElement("div");
      this.statsEl.className = "bv-stats";
      card.appendChild(this.statsEl);
      return card;
    }
    toggleRow(label, key) {
      const row = document.createElement("div");
      row.className = "bv-row";
const input = document.createElement("input");
      input.type = "checkbox";
      input.dataset.key = key;
      input.setAttribute("aria-label", label);
      input.addEventListener("change", () => this.callbacks.onSettingChange(key, input.checked));
      const text = document.createElement("label");
      text.textContent = label;
      row.append(text, input);
      return row;
    }
    sliderRow(label, key, min, max, stepSize) {
      const row = document.createElement("div");
      row.className = "bv-row";
      const text = document.createElement("label");
      text.textContent = label;
      const value = document.createElement("span");
      value.className = "bv-val";
const input = document.createElement("input");
      input.type = "range";
      input.min = String(min);
      input.max = String(max);
      input.step = String(stepSize);
      input.dataset.key = key;
      input.setAttribute("aria-label", label);
      input.addEventListener("input", () => {
        value.textContent = input.value;
        this.callbacks.onSettingChange(key, Number(input.value));
      });
      row.append(text, input, value);
      return row;
    }
    heading(text) {
      const h = document.createElement("div");
      h.className = "bv-h";
      h.textContent = text;
      return h;
    }
    selectRow(label, key, options) {
      const row = document.createElement("div");
      row.className = "bv-row";
      const text = document.createElement("label");
      text.textContent = label;
const select = document.createElement("select");
      select.dataset.key = key;
      select.setAttribute("aria-label", label);
      for (const option of options) {
        const el = document.createElement("option");
        el.value = option.value;
        el.textContent = option.label;
        select.appendChild(el);
      }
      select.addEventListener("change", () => this.callbacks.onSettingChange(key, select.value));
      row.append(text, select);
      return row;
    }
    buildSettings() {
      const card = this.card();
      card.appendChild(this.heading("Camera"));
      card.appendChild(this.toggleRow("Camera shake", "cameraShake"));
      card.appendChild(this.toggleRow("Film grain", "filmGrain"));
      card.appendChild(this.toggleRow("Camcorder HUD", "vhsHud"));
      card.appendChild(this.heading("Controls"));
      card.appendChild(this.toggleRow("Mouse look", "mouseLook"));
      card.appendChild(this.toggleRow("Invert turn", "invertTurn"));
      card.appendChild(this.toggleRow("Invert strafe", "invertStrafe"));
      card.appendChild(this.toggleRow("Invert forward/back", "invertForward"));
      card.appendChild(this.sliderRow("Walk speed", "moveSpeed", 0.5, 6, 0.1));
      card.appendChild(this.heading("Materials"));
      card.appendChild(
        this.selectRow("Wall material", "materialPreset", [
          { value: "classic", label: "Classic wallpaper mix" },
          { value: "office", label: "Plain drywall" },
          { value: "pool", label: "Ceramic tile" },
          { value: "concrete", label: "Bare concrete" },
          { value: "panel", label: "Wood paneling" }
        ])
      );
      card.appendChild(this.sliderRow("Hue shift", "materialHueShift", -180, 180, 5));
      card.appendChild(this.sliderRow("Brightness", "materialBrightness", 0.6, 1.4, 0.05));
      card.appendChild(this.heading("Monster"));
      card.appendChild(this.toggleRow("Monster", "monsterEnabled"));
      card.appendChild(
        this.selectRow("Form", "monsterForm", [
          { value: "spider", label: "Spider-like" },
          { value: "humanoid", label: "Human-like" },
          { value: "cloud", label: "Cloud-like" },
          { value: "random", label: "Random each spawn" }
        ])
      );
      card.appendChild(this.sliderRow("Speed", "monsterSpeed", 0.5, 5, 0.1));
      card.appendChild(this.sliderRow("Spawn after (min)", "monsterSpawnMin", 0.1, 10, 0.1));
      card.appendChild(this.sliderRow("Spawn before (min)", "monsterSpawnMax", 0.5, 15, 0.5));
      card.appendChild(this.heading("World"));
      card.appendChild(this.toggleRow("Furniture", "furniture"));
      card.appendChild(this.toggleRow("Wallpaper shifts", "wallpaperShifts"));
      card.appendChild(this.sliderRow("Render distance", "renderDistance", 6, 28, 1));
      card.appendChild(this.heading("Copilot"));
      card.appendChild(this.toggleRow("Ghost-writer on the walls", "copilotGhostWriter"));
      const seedRow = document.createElement("div");
      seedRow.className = "bv-row";
      const seedLabel = document.createElement("label");
      seedLabel.textContent = "Seed (0 = random)";
const seedInput = document.createElement("input");
      seedInput.type = "number";
      seedInput.dataset.key = "seed";
      seedInput.setAttribute("aria-label", "Seed (0 = random)");
      seedInput.addEventListener("change", () => {
        const seed = Math.trunc(Number(seedInput.value)) || 0;
        this.callbacks.onSettingChange("seed", seed);
        this.callbacks.onReseed(seed);
      });
      seedRow.append(seedLabel, seedInput);
      card.appendChild(seedRow);
      const back = this.button("Back", () => this.show("main"));
      back.classList.add("bv-back");
      card.appendChild(back);
      return card;
    }
    buildHelp() {
      const card = this.card();
      const help = document.createElement("div");
      help.className = "bv-help";
      help.innerHTML = "<kbd>W</kbd>/<kbd>S</kbd> or <kbd>&uarr;</kbd>/<kbd>&darr;</kbd> walk<br><kbd>A</kbd>/<kbd>D</kbd> strafe<br><kbd>&larr;</kbd>/<kbd>&rarr;</kbd> or <kbd>Q</kbd>/<kbd>E</kbd> turn<br><kbd>Shift</kbd> hurry<br>click the view for mouse look<br><kbd>M</kbd> or <kbd>Esc</kbd> open this menu<br><br>The maze is infinite and deterministic: the same seed always rebuilds the same rooms.";
      card.appendChild(help);
      const back = this.button("Back", () => this.show("main"));
      back.classList.add("bv-back");
      card.appendChild(back);
      return card;
    }
  };

  // src/webview/main.ts
  var EYE_HEIGHT = 0.78;
  var vscode = acquireVsCodeApi();
  var Game = class {
    settings = { ...DEFAULT_SETTINGS };
    renderer;
    film;
    graffiti = new WallWriting();
    input;
    menu;
    toast;
    world;
    monster = null;
    uniformWallpaper = false;
    // Player, in plane coordinates.
    px = 0.5;
    py = 0.5;
    yaw = 0;
    pitch = 0;
    bobPhase = 0;
    lastFrame = 0;
    lastPersist = 0;
    flickerDipUntil = 0;
    toastTimer;
    constructor(root) {
      const glCanvas = document.createElement("canvas");
      const filmCanvas = document.createElement("canvas");
      for (const [canvas, z] of [[glCanvas, "1"], [filmCanvas, "2"]]) {
        canvas.style.cssText = `position:absolute;inset:0;width:100%;height:100%;z-index:${z};`;
      }
      filmCanvas.style.pointerEvents = "none";
      root.append(glCanvas, filmCanvas);
      this.renderer = new Renderer(glCanvas);
      this.film = new FilmOverlay(filmCanvas);
      this.input = new Input(glCanvas);
      this.input.onMenuToggle = () => this.toggleMenu();
      this.menu = new Menu(root, {
        onResume: () => this.toggleMenu(),
        onRelocate: () => this.relocate(),
        onSettingChange: (key, value) => this.changeSetting(key, value),
        // A nonzero seed already rebuilds through applySettings; 0 means "roll one now".
        onReseed: (seed2) => {
          if (seed2 === 0) {
            this.rebuildWorld(randomSeed());
          }
        }
      });
      this.toast = document.createElement("div");
      this.toast.setAttribute("role", "status");
      this.toast.style.cssText = 'position:absolute;left:50%;bottom:9%;transform:translateX(-50%);z-index:20;background:rgba(22,24,27,0.85);color:#f0f2f3;border:1px solid #454c55;border-radius:6px;padding:8px 16px;font:13px "Segoe UI",system-ui,sans-serif;opacity:0;transition:opacity .4s;pointer-events:none;';
      root.appendChild(this.toast);
      const restored = vscode.getState();
      const seed = restored?.seed ?? (this.settings.seed !== 0 ? this.settings.seed : randomSeed());
      this.world = new World(seed);
      if (restored) {
        this.px = restored.px;
        this.py = restored.py;
        this.yaw = restored.yaw;
        this.world.session.warpTo(Math.floor(this.px), Math.floor(this.py));
      }
      window.addEventListener("message", (event) => {
        if (event.source !== window || !event.data || typeof event.data !== "object") {
          return;
        }
        const message = event.data;
        if (message.type === "config") {
          this.applySettings(message.settings);
        } else if (message.type === "relocate") {
          this.relocate(message.seed);
        } else if (message.type === "jobStatus") {
          this.film.setJob(message.job);
          this.graffiti.setJob(message.job);
        } else if (message.type === "chatSession") {
          this.film.setJob({
            working: message.session.working,
            status: "",
            tokens: message.session.tokens
          });
          this.graffiti.setSession(message.session);
        }
      });
      vscode.postMessage({ type: "ready" });
      this.showToast(`seed ${seed} - walk with WASD or arrows, M for menu`);
      this.syncMonster();
      void this.loadMaterialImages();
      requestAnimationFrame((t) => this.frame(t));
    }
    /**
     * Loads the photo materials shipped under materials/ and patches them over
     * the procedural atlas. Any file that is missing or fails to decode leaves
     * its procedural tile in place.
     */
    async loadMaterialImages() {
      const uris = window.__BACKROOMS_MATERIALS__ ?? {};
      const load = (uri) => new Promise((resolve) => {
        if (!uri) {
          resolve(void 0);
          return;
        }
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => resolve(void 0);
        image.src = uri;
      });
      const [wallpaper, ceiling, carpet] = await Promise.all([
        load(uris.wallpaper),
        load(uris.ceiling),
        load(uris.carpet)
      ]);
      if (!wallpaper && !ceiling && !carpet) {
        return;
      }
      this.renderer.applyMaterialImages({ wallpaper, ceiling, carpet });
      if (wallpaper) {
        this.world.uniformWallpaper = true;
        this.uniformWallpaper = true;
        this.world.invalidateChunks(this.renderer);
      }
    }
    toggleMenu() {
      if (this.menu.isOpen) {
        this.menu.close();
      } else {
        this.input.releasePointer();
        this.menu.syncSettings(this.settings);
        this.menu.syncStats(this.world.stats());
        this.menu.open();
      }
    }
    // The host may pick the seed (so its action response stays accurate);
    // anything invalid or absent rolls a fresh one here.
    relocate(seed) {
      const next = typeof seed === "number" && Number.isFinite(seed) && seed > 0 ? Math.floor(seed) : randomSeed();
      this.rebuildWorld(next);
      // Adopt the new seed as the effective setting; otherwise the config
      // replayed on a reload still carries the old seed and immediately
      // rebuilds away from the relocated world.
      this.changeSetting("seed", next);
      this.menu.close();
      this.showToast(`relocated to seed ${next}`);
    }
    rebuildWorld(seed) {
      this.world.invalidateChunks(this.renderer);
      this.graffiti.reset(this.renderer);
      this.world = new World(seed);
      this.world.furnitureEnabled = this.settings.furniture;
      this.world.wallpaperShiftsEnabled = this.settings.wallpaperShifts;
      this.world.setMaterial(
        this.settings.materialPreset,
        this.settings.materialHueShift,
        this.settings.materialBrightness
      );
      this.world.uniformWallpaper = this.uniformWallpaper;
      this.px = 0.5;
      this.py = 0.5;
      this.syncMonster(true);
      this.persist();
      this.menu.syncStats(this.world.stats());
    }
    monsterConfig() {
      return {
        speed: this.settings.monsterSpeed,
        spawnMinMs: this.settings.monsterSpawnMin * 6e4,
        spawnMaxMs: this.settings.monsterSpawnMax * 6e4,
        form: this.settings.monsterForm
      };
    }
    /** Creates, retunes, or removes the monster to match current settings. */
    syncMonster(rearm = false) {
      if (!this.settings.monsterEnabled) {
        this.monster = null;
        this.renderer.clearDynamicMesh();
        return;
      }
      if (!this.monster || rearm) {
        this.monster = new Monster(this.world, this.monsterConfig(), performance.now());
      } else {
        this.monster.configure(this.monsterConfig());
      }
    }
    changeSetting(key, value) {
      this.applySettings({ ...this.settings, [key]: value });
      vscode.postMessage({ type: "updateSetting", key, value });
    }
    applySettings(settings) {
      const previous = this.settings;
      this.settings = settings;
      this.film.grainEnabled = settings.filmGrain;
      this.film.hudEnabled = settings.vhsHud;
      this.film.tokenCounterEnabled = settings.copilotGhostWriter;
      if (this.graffiti.enabled && !settings.copilotGhostWriter) {
        this.graffiti.reset(this.renderer);
      }
      this.graffiti.enabled = settings.copilotGhostWriter;
      this.input.mouseLookEnabled = settings.mouseLook;
      this.renderer.fogDensity = 2.6 / (settings.renderDistance * settings.renderDistance);
      if (previous.furniture !== settings.furniture || previous.wallpaperShifts !== settings.wallpaperShifts || previous.materialPreset !== settings.materialPreset || previous.materialHueShift !== settings.materialHueShift || previous.materialBrightness !== settings.materialBrightness) {
        this.world.furnitureEnabled = settings.furniture;
        this.world.wallpaperShiftsEnabled = settings.wallpaperShifts;
        this.world.setMaterial(settings.materialPreset, settings.materialHueShift, settings.materialBrightness);
        this.world.invalidateChunks(this.renderer);
      }
      this.syncMonster(previous.monsterEnabled !== settings.monsterEnabled);
      if (settings.seed !== previous.seed && settings.seed !== 0 && settings.seed !== this.world.seed) {
        this.rebuildWorld(settings.seed);
      }
      this.menu.syncSettings(settings);
    }
    showToast(text) {
      this.toast.textContent = text;
      this.toast.style.opacity = "1";
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        this.toast.style.opacity = "0";
      }, 4200);
    }
    persist() {
      vscode.setState({ seed: this.world.seed, px: this.px, py: this.py, yaw: this.yaw });
    }
    frame(now) {
      const dt = Math.min(0.05, (now - this.lastFrame) / 1e3 || 0.016);
      this.lastFrame = now;
      const t = now / 1e3;
      let speed = 0;
      if (!this.menu.isOpen) {
        speed = this.step(dt);
        if (this.monster) {
          const event = this.monster.update(now, dt, this.px, this.py);
          if (event === "spawned") {
            this.showToast("the air changes. something else is in the halls.");
          } else if (event === "caught") {
            this.film.burst(now);
            this.px = 0.5;
            this.py = 0.5;
            this.world.session.warpTo(0, 0);
            this.persist();
            this.showToast("tape resumes somewhere familiar. it is still out there.");
          }
        }
      }
      if (this.monster?.isStalking) {
        const mesh = this.monster.buildMesh(now, this.px, this.py);
        this.renderer.setDynamicMesh(mesh.vertices, mesh.indices);
      } else {
        this.renderer.clearDynamicMesh();
      }
      let shakeYaw = 0;
      let shakePitch = 0;
      let shakeRoll = 0;
      let shakeUp = 0;
      if (this.settings.cameraShake) {
        const drift = 1 + speed * 1.6;
        shakeYaw = (Math.sin(t * 0.9) * 6e-3 + Math.sin(t * 2.3 + 1.7) * 3e-3) * drift;
        shakePitch = (Math.sin(t * 1.3 + 0.6) * 4e-3 + Math.sin(t * 3.1) * 2e-3) * drift;
        shakeRoll = Math.sin(t * 0.7 + 2.1) * 4e-3 * drift + Math.sin(this.bobPhase) * 6e-3 * speed;
        shakeUp = Math.sin(this.bobPhase * 2) * 0.014 * speed;
      }
      if (Math.random() < 15e-4 && this.flickerDipUntil < now) {
        this.flickerDipUntil = now + 60 + Math.random() * 120;
      }
      let flicker = 1 + Math.sin(t * 11) * 0.012 + Math.sin(t * 47) * 8e-3;
      if (this.flickerDipUntil > now) {
        flicker *= 0.82;
      }
      const camera = {
        x: this.px,
        y: EYE_HEIGHT + shakeUp,
        z: this.py,
        yaw: this.yaw + shakeYaw,
        pitch: this.pitch + shakePitch,
        roll: shakeRoll,
        fovY: 72 * Math.PI / 180
      };
      this.graffiti.update(now, this.world, this.px, this.py, this.yaw, this.renderer);
      const chunks = this.world.updateChunks(this.px, this.py, this.settings.renderDistance, this.renderer);
      this.renderer.draw(chunks, camera, flicker);
      this.film.render(now);
      if (now - this.lastPersist > 1500) {
        this.lastPersist = now;
        this.persist();
      }
      requestAnimationFrame((next) => this.frame(next));
    }
    /** Applies input to the player; returns normalized speed for bob effects. */
    step(dt) {
      const input = this.input.state();
      const look = this.input.consumeLook();
      const turnSign = this.settings.invertTurn ? -1 : 1;
      this.yaw -= (look.dx * 26e-4 + input.turn * 1.9 * dt) * turnSign;
      this.pitch = clamp3(this.pitch - look.dy * 22e-4, -1.25, 1.25);
      const rate = this.settings.moveSpeed * (input.running ? 1.7 : 1);
      const forward = input.forward * (this.settings.invertForward ? -1 : 1);
      const strafe = input.strafe * (this.settings.invertStrafe ? -1 : 1);
      const fx = -Math.sin(this.yaw);
      const fy = -Math.cos(this.yaw);
      const rx = Math.cos(this.yaw);
      const ry = -Math.sin(this.yaw);
      const dx = (fx * forward + rx * strafe) * rate * dt;
      const dy = (fy * forward + ry * strafe) * rate * dt;
      if (dx === 0 && dy === 0) {
        return 0;
      }
      const moved = this.world.moveResolved(this.px, this.py, dx, dy);
      const actual = Math.hypot(moved.x - this.px, moved.y - this.py);
      this.px = moved.x;
      this.py = moved.y;
      this.world.syncSession(this.px, this.py);
      this.bobPhase += actual * 5.6;
      return Math.min(1, actual / (rate * dt + 1e-6));
    }
  };
  function randomSeed() {
    return Math.floor(Math.random() * 999999) + 1;
  }
  function clamp3(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }
  var app = document.getElementById("app");
  if (app) {
    new Game(app);
  }
})();
