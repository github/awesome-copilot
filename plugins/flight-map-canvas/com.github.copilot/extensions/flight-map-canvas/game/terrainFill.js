/************************************************************************************
 * TerrainFill - Fills unloaded terrain gaps using sampled colors                   *
 * from the rendered viewport.                                                      *
 *                                                                                  *
 * Algorithm:                                                                       *
 *   1. Render scene (without fill) to a low-res offscreen target                   *
 *   2. Sample 10x10px patches from each of the 4 viewport borders (40 samples)     *
 *   3. Sample 10x10px patches from the middle area (5 samples)                     *
 *   4. Sample 5x5px patches from padding perimeter in flight direction (4 samples) *
 *   5. Filter out placeholder/sky/water colors                                     *
 *   6. Generate a fill texture by blending sampled colors with value noise         *
 *   7. Apply the texture to a large fill plane between tiles and water             *
 ***********************************************************************************/
function TerrainFill(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // Low-res render target for viewport sampling
    this.sampleW = 256;
    this.sampleH = 256;
    this.sampleTarget = new THREE.WebGLRenderTarget(this.sampleW, this.sampleH);
    this.sampleBuffer = new Uint8Array(this.sampleW * this.sampleH * 4);

    // Fill texture canvas
    this.texW = 256;
    this.texH = 256;
    this.fillCanvas = document.createElement('canvas');
    this.fillCanvas.width = this.texW;
    this.fillCanvas.height = this.texH;
    this.fillCtx = this.fillCanvas.getContext('2d');

    // Initialize with placeholder color
    this.fillCtx.fillStyle = '#2a3a2a';
    this.fillCtx.fillRect(0, 0, this.texW, this.texH);

    // Three.js canvas texture for the fill plane
    this.fillTexture = new THREE.CanvasTexture(this.fillCanvas);
    this.fillTexture.wrapS = THREE.RepeatWrapping;
    this.fillTexture.wrapT = THREE.RepeatWrapping;
    this.fillTexture.repeat.set(50, 50);

    // Fill plane mesh sitting between tile meshes (y=0) and water (y=-2)
    var geo = new THREE.PlaneGeometry(30000, 30000);
    var mat = new THREE.MeshBasicMaterial({ map: this.fillTexture });
    this.fillMesh = new THREE.Mesh(geo, mat);
    this.fillMesh.rotation.x = -Math.PI / 2;
    this.fillMesh.position.y = -0.5;
    scene.add(this.fillMesh);

    // Collected sample colors (array of {r,g,b} objects)
    this.sampleColors = [];

    // Timing
    this.frameCount = 0;
    this.sampleInterval = 45; // Sample every N frames

    // Time-based filler pattern update interval (seconds)
    this.updateIntervalSec = 10;
    this.lastUpdateTime = 0;

    // Configurable patch counts and sizes (overridden by RenderConfig)
    this.perimeterPatchCount = 10;
    this.perimeterPatchSize = 10;
    this.centerPatchCount = 5;
    this.centerPatchSize = 10;
    this.paddingPatchCount = 4;
    this.paddingPatchSize = 5;

    // Cloud overlay effect applied to the fill area
    this.cloudOverlay = {
        enabled: true,
        opacity: 0.35,
        speed: 0.0004,
        coverage: 0.5,
        scale: 0.008,
        time: 0
    };

    // Cloud canvas and texture (rendered on top of fill plane)
    this.cloudCanvas = document.createElement('canvas');
    this.cloudCanvas.width = this.texW;
    this.cloudCanvas.height = this.texH;
    this.cloudCtx = this.cloudCanvas.getContext('2d');

    this.cloudTexture = new THREE.CanvasTexture(this.cloudCanvas);
    this.cloudTexture.wrapS = THREE.RepeatWrapping;
    this.cloudTexture.wrapT = THREE.RepeatWrapping;
    this.cloudTexture.repeat.set(50, 50);

    var cloudGeo = new THREE.PlaneGeometry(30000, 30000);
    var cloudMat = new THREE.MeshBasicMaterial({
        map: this.cloudTexture,
        transparent: true,
        depthWrite: false,
        opacity: 1.0
    });
    this.cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    this.cloudMesh.rotation.x = -Math.PI / 2;
    this.cloudMesh.position.y = -0.3;
    scene.add(this.cloudMesh);

    // Pre-compute noise permutation table
    this.perm = new Array(512);
    var p = new Array(256);
    for (var i = 0; i < 256; i++) p[i] = i;
    for (var i = 255; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = p[i]; p[i] = p[j]; p[j] = tmp;
    }
    for (var i = 0; i < 512; i++) this.perm[i] = p[i & 255];

    // Second permutation for cloud noise (different seed)
    this.cloudPerm = new Array(512);
    var cp = new Array(256);
    for (var i = 0; i < 256; i++) cp[i] = i;
    for (var i = 255; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = cp[i]; cp[i] = cp[j]; cp[j] = tmp;
    }
    for (var i = 0; i < 512; i++) this.cloudPerm[i] = cp[i & 255];

    // Pre-compute noise map (noise values won't change, only color mapping does)
    this.noiseMap = new Float32Array(this.texW * this.texH);
    for (var y = 0; y < this.texH; y++) {
        for (var x = 0; x < this.texW; x++) {
            var n1 = this._noise2d(x * 0.012, y * 0.012);
            var n2 = this._noise2d(x * 0.035 + 97.3, y * 0.035 + 97.3) * 0.5;
            var n3 = this._noise2d(x * 0.08 + 231.7, y * 0.08 + 231.7) * 0.25;
            this.noiseMap[y * this.texW + x] = (n1 + n2 + n3) / 1.75;
        }
    }
}

/**
 * Called each frame after main render. Periodically samples the viewport
 * and regenerates the fill texture.
 */
TerrainFill.prototype.update = function (flightHeading) {
    // Keep fill plane centered on camera
    this.fillMesh.position.x = this.camera.position.x;
    this.fillMesh.position.z = this.camera.position.z;

    // Keep cloud mesh centered on camera
    this.cloudMesh.position.x = this.camera.position.x;
    this.cloudMesh.position.z = this.camera.position.z;

    this.frameCount++;
    if (this.frameCount % this.sampleInterval !== 0) return;

    // Collect viewport samples every sampleInterval frames
    this._collectSamples(flightHeading);

    // Regenerate fill texture on a time-based interval (seconds)
    var now = performance.now() / 1000;
    if (this.sampleColors.length > 20 && (now - this.lastUpdateTime) >= this.updateIntervalSec) {
        this._generateFillTexture();
        this.lastUpdateTime = now;
    }

    // Update cloud effect
    this._updateCloud();
};

/**
 * Samples colors from the rendered viewport at border, middle,
 * and padding perimeter positions.
 */
TerrainFill.prototype._collectSamples = function (flightHeading) {
     // Hide generated overlays so we only sample actual terrain + sky
     var cloudWasVisible = this.cloudMesh.visible;
     this.fillMesh.visible = false;
     this.cloudMesh.visible = false;

    // Render scene to low-res offscreen target
    this.renderer.setRenderTarget(this.sampleTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);

    this.fillMesh.visible = true;
    this.cloudMesh.visible = cloudWasVisible;

    // Read pixels from the render target
    this.renderer.readRenderTargetPixels(
        this.sampleTarget, 0, 0,
        this.sampleW, this.sampleH,
        this.sampleBuffer
    );

    var w = this.sampleW;
    var h = this.sampleH;
    var buf = this.sampleBuffer;
    var self = this;
    this.sampleColors = [];

    // Helper: extract valid (non-placeholder/sky/water) colors from a patch
    function extractPatch(px, py, size) {
        var result = [];
        for (var dy = 0; dy < size; dy++) {
            for (var dx = 0; dx < size; dx++) {
                var sx = Math.max(0, Math.min(px + dx, w - 1));
                var sy = Math.max(0, Math.min(py + dy, h - 1));
                var idx = (sy * w + sx) * 4;
                var r = buf[idx], g = buf[idx + 1], b = buf[idx + 2];
                if (!self._isSkipColor(r, g, b)) {
                    result.push({ r: r, g: g, b: b });
                }
            }
        }
        return result;
    }

    var borderDepth = Math.max(Math.floor(h * 0.08), 8);
    var patchSize = this.perimeterPatchSize;
    var smallPatch = this.paddingPatchSize;
    var perimCount = this.perimeterPatchCount;
    var centerCount = this.centerPatchCount;
    var centerSize = this.centerPatchSize;
    var padCount = this.paddingPatchCount;

    // ---- Border samples: perimCount per border ----

    // Top border
    for (var i = 0; i < perimCount; i++) {
        var x = Math.floor(Math.random() * (w - patchSize));
        var y = Math.floor(Math.random() * borderDepth);
        this.sampleColors = this.sampleColors.concat(extractPatch(x, y, patchSize));
    }
    // Bottom border
    for (var i = 0; i < perimCount; i++) {
        var x = Math.floor(Math.random() * (w - patchSize));
        var y = h - borderDepth + Math.floor(Math.random() * Math.max(1, borderDepth - patchSize));
        this.sampleColors = this.sampleColors.concat(extractPatch(x, y, patchSize));
    }
    // Left border
    for (var i = 0; i < perimCount; i++) {
        var x = Math.floor(Math.random() * borderDepth);
        var y = Math.floor(Math.random() * (h - patchSize));
        this.sampleColors = this.sampleColors.concat(extractPatch(x, y, patchSize));
    }
    // Right border
    for (var i = 0; i < perimCount; i++) {
        var x = w - borderDepth + Math.floor(Math.random() * Math.max(1, borderDepth - patchSize));
        var y = Math.floor(Math.random() * (h - patchSize));
        this.sampleColors = this.sampleColors.concat(extractPatch(x, y, patchSize));
    }

    // ---- Middle area: centerCount samples ----
    var midRange = Math.min(w, h) / 4;
    for (var i = 0; i < centerCount; i++) {
        var x = Math.floor(w / 2 - midRange / 2 + Math.random() * midRange);
        var y = Math.floor(h / 2 - midRange / 2 + Math.random() * midRange);
        this.sampleColors = this.sampleColors.concat(extractPatch(x, y, centerSize));
    }

    // ---- Padding perimeter: padCount samples toward flight direction ----
    var headRad = ((flightHeading || 0)) * Math.PI / 180;
    var dirX = Math.sin(headRad);
    var dirY = -Math.cos(headRad);
    for (var i = 0; i < padCount; i++) {
        var dist = 0.25 + Math.random() * 0.35;
        var spread = (Math.random() - 0.5) * 0.4;
        var sx = Math.floor(w / 2 + (dirX * dist + dirY * spread) * w * 0.45);
        var sy = Math.floor(h / 2 + (dirY * dist - dirX * spread) * h * 0.45);
        sx = Math.max(0, Math.min(sx, w - smallPatch));
        sy = Math.max(0, Math.min(sy, h - smallPatch));
        this.sampleColors = this.sampleColors.concat(extractPatch(sx, sy, smallPatch));
    }
};

/**
 * Checks whether a pixel color should be skipped during sampling
 * (placeholder tiles, sky, water, or black).
 */
TerrainFill.prototype._isSkipColor = function (r, g, b) {
    // Placeholder dark green: #2a3a2a (42, 58, 42)
    if (Math.abs(r - 42) < 20 && Math.abs(g - 58) < 20 && Math.abs(b - 42) < 20) return true;
    // Sky blue: #87CEEB (135, 206, 235)
    if (Math.abs(r - 135) < 35 && Math.abs(g - 206) < 35 && Math.abs(b - 235) < 35) return true;
    // Water blue: #1a4a7a (26, 74, 122)
    if (Math.abs(r - 26) < 25 && Math.abs(g - 74) < 25 && Math.abs(b - 122) < 25) return true;
    // Near-black
    if (r < 8 && g < 8 && b < 8) return true;
    // Fill plane color itself (dark placeholder)
    if (r < 50 && g < 65 && b < 50 && Math.abs(r - b) < 10) return true;
    return false;
};

/**
 * Generates the fill texture by mapping sampled colors through
 * a pre-computed noise map. Produces a natural-looking blend of
 * terrain colors that fills gaps between loaded tiles.
 */
TerrainFill.prototype._generateFillTexture = function () {
    var colors = this.sampleColors;
    if (colors.length < 10) return;

    var ctx = this.fillCtx;
    var w = this.texW;
    var h = this.texH;
    var imgData = ctx.createImageData(w, h);
    var data = imgData.data;
    var numColors = colors.length;

    for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
            // Look up pre-computed noise value (0-1)
            var noise = this.noiseMap[y * w + x];

            // Map noise to color index range and blend between neighbors
            var fidx = noise * (numColors - 1);
            var idx1 = Math.floor(fidx);
            var idx2 = Math.min(idx1 + 1, numColors - 1);
            var blend = fidx - idx1;

            var c1 = colors[idx1];
            var c2 = colors[idx2];

            var px = (y * w + x) * 4;
            data[px]     = Math.round(c1.r + (c2.r - c1.r) * blend);
            data[px + 1] = Math.round(c1.g + (c2.g - c1.g) * blend);
            data[px + 2] = Math.round(c1.b + (c2.b - c1.b) * blend);
            data[px + 3] = 255;
        }
    }

    ctx.putImageData(imgData, 0, 0);
    this.fillTexture.needsUpdate = true;
};

/**
 * 2D value noise using the pre-computed permutation table.
 */
TerrainFill.prototype._noise2d = function (x, y) {
    var xi = Math.floor(x) & 255;
    var yi = Math.floor(y) & 255;
    var xf = x - Math.floor(x);
    var yf = y - Math.floor(y);

    // Smoothstep fade curves
    var u = xf * xf * (3 - 2 * xf);
    var v = yf * yf * (3 - 2 * yf);

    // Hash four corners
    var aa = this.perm[this.perm[xi] + yi] / 255;
    var ab = this.perm[this.perm[xi] + yi + 1] / 255;
    var ba = this.perm[this.perm[xi + 1] + yi] / 255;
    var bb = this.perm[this.perm[xi + 1] + yi + 1] / 255;

    // Bilinear interpolation
    var x1 = aa * (1 - u) + ba * u;
    var x2 = ab * (1 - u) + bb * u;
    return x1 * (1 - v) + x2 * v;
};

/**
 * Generates animated cloud overlay texture using time-offset noise.
 * The cloud effect applies a semi-transparent white layer over the
 * fill area, simulating drifting cloud cover.
 */
TerrainFill.prototype._updateCloud = function () {
    if (!this.cloudOverlay.enabled) {
        this.cloudMesh.visible = false;
        return;
    }
    this.cloudMesh.visible = true;
    this.cloudOverlay.time += this.cloudOverlay.speed * this.sampleInterval;

    var ctx = this.cloudCtx;
    var w = this.texW;
    var h = this.texH;
    var imgData = ctx.createImageData(w, h);
    var data = imgData.data;
    var t = this.cloudOverlay.time;
    var scale = this.cloudOverlay.scale;
    var coverage = this.cloudOverlay.coverage;
    var opacity = this.cloudOverlay.opacity;

    for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
            // Multi-octave noise with time offset for drift
            var n1 = this._cloudNoise2d(x * scale + t, y * scale + t * 0.7);
            var n2 = this._cloudNoise2d(x * scale * 2.3 + 50 + t * 1.3, y * scale * 2.3 + 50 + t * 0.9) * 0.5;
            var n3 = this._cloudNoise2d(x * scale * 5.1 + 120 - t * 0.5, y * scale * 5.1 + 120 + t * 0.3) * 0.25;
            var noise = (n1 + n2 + n3) / 1.75;

            // Apply coverage threshold: lower coverage = fewer clouds
            var cloudDensity = Math.max(0, noise - (1 - coverage)) / coverage;
            cloudDensity = Math.min(1, cloudDensity);

            // Smooth edges
            cloudDensity = cloudDensity * cloudDensity * (3 - 2 * cloudDensity);

            var alpha = Math.round(cloudDensity * opacity * 255);
            var px = (y * w + x) * 4;
            data[px] = 255;     // White clouds
            data[px + 1] = 255;
            data[px + 2] = 255;
            data[px + 3] = alpha;
        }
    }

    ctx.putImageData(imgData, 0, 0);
    this.cloudTexture.needsUpdate = true;
};

/**
 * 2D value noise using the cloud-specific permutation table.
 */
TerrainFill.prototype._cloudNoise2d = function (x, y) {
    var xi = Math.floor(x) & 255;
    var yi = Math.floor(y) & 255;
    var xf = x - Math.floor(x);
    var yf = y - Math.floor(y);

    var u = xf * xf * (3 - 2 * xf);
    var v = yf * yf * (3 - 2 * yf);

    var aa = this.cloudPerm[this.cloudPerm[xi] + yi] / 255;
    var ab = this.cloudPerm[this.cloudPerm[xi] + yi + 1] / 255;
    var ba = this.cloudPerm[this.cloudPerm[xi + 1] + yi] / 255;
    var bb = this.cloudPerm[this.cloudPerm[xi + 1] + yi + 1] / 255;

    var x1 = aa * (1 - u) + ba * u;
    var x2 = ab * (1 - u) + bb * u;
    return x1 * (1 - v) + x2 * v;
};

/**
 * Reset fill state when switching capitals.
 */
TerrainFill.prototype.reset = function () {
    this.sampleColors = [];
    this.frameCount = 0;
    this.fillCtx.fillStyle = '#2a3a2a';
    this.fillCtx.fillRect(0, 0, this.texW, this.texH);
    this.fillTexture.needsUpdate = true;
    this.cloudOverlay.time = 0;
    this.cloudCtx.clearRect(0, 0, this.texW, this.texH);
    this.cloudTexture.needsUpdate = true;
};
