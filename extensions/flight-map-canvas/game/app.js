/*****************************************************************
 * Flight Map - Main Application                                 *
 *                                                               *
 * Three.js scene with satellite imagery terrain tiles,          *
 * flight simulator controls, dynamic tile loading, and HUD.     *
 ****************************************************************/

/* ============================================================
   Configuration
   ============================================================ */

var TILE_ZOOM = 15;
var TILE_SIZE = 100;        // Three.js world units per tile
var LOAD_RADIUS = 6;        // Tiles to load around camera
var UNLOAD_RADIUS = 9;      // Tiles to unload beyond this distance
var START_ALTITUDE = 200;   // Starting camera height
var FOG_DENSITY = 0.00018;  // Exponential fog density
var RADIUS_FEATHER = 3;     // Tiles to feather at load radius edge
var MAX_TILES = 600;        // Maximum loaded tiles (memory cap)

/* ============================================================
   State
   ============================================================ */

var scene, camera, renderer, clock;
var controls; // FlightControls instance
var terrainFill; // TerrainFill instance

var textureLoader;
var loadedTiles = {};
var centerTileX = 0;
var centerTileY = 0;
var originLat = 0;
var originLng = 0;
var currentMetersPerTile = 1000;
var currentCapitalName = '';

// Sentinel value of the destination menu entry that opens the keyboard
// input dialog, and the capital the menu falls back to afterwards
var INPUT_DESTINATION_VALUE = '__input__';
var lastCapitalValue = '';

// Group the menu collects typed and geocoded destinations under, so they
// read as somewhere the user went rather than a capital that ships
var ENTERED_GROUP_LABEL = 'Entered';

var tilesLoaded = 0;
var tilesRequested = 0;
var initialLoadDone = false;
var tileUpdateCounter = 0;
var isPaused = false;

/* ============================================================
   Tile Math Utilities
   ============================================================ */

function latLngToTile(lat, lng, zoom) {
    var n = Math.pow(2, zoom);
    var x = Math.floor((lng + 180) / 360 * n);
    var latRad = lat * Math.PI / 180;
    var y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
    return { x: x, y: y };
}

function tileToLatLng(x, y, zoom) {
    var n = Math.pow(2, zoom);
    var lng = x / n * 360 - 180;
    var latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
    var lat = latRad * 180 / Math.PI;
    return { lat: lat, lng: lng };
}

function metersPerTile(lat, zoom) {
    return 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, zoom) * 256;
}

/**
 * Wraps a tile column into the [0, 2^zoom - 1] range the providers serve.
 *
 * Tile coordinates are kept unwrapped everywhere else: they double as the
 * world grid, and a flight that crosses the antimeridian has to keep
 * counting past the edge of the map for its tiles to stay put relative to
 * each other. Only the URL needs the column the provider recognizes.
 */
function wrapTileX(x, zoom) {
    var n = Math.pow(2, zoom);
    return ((x % n) + n) % n;
}

/** Wraps a longitude into [-180, 180) after a crossing carried it past. */
function wrapLongitude(lng) {
    return ((lng + 180) % 360 + 360) % 360 - 180;
}

/**
 * Formats a position for the coordinate readout. The two spaces between
 * the latitude and the longitude are what separates them on screen;
 * #hud-coords sets white-space: pre so they survive to the render.
 */
function formatCoords(lat, lng) {
    return Math.abs(lat).toFixed(4) + '°' + (lat >= 0 ? 'N' : 'S') + '  ' +
           Math.abs(lng).toFixed(4) + '°' + (lng >= 0 ? 'E' : 'W');
}

function positionToLatLng(worldX, worldZ) {
    var metersPerUnit = currentMetersPerTile / TILE_SIZE;
    var dMetersX = worldX * metersPerUnit;
    var dMetersZ = worldZ * metersPerUnit;
    var dLng = dMetersX / (111320 * Math.cos(originLat * Math.PI / 180));
    var dLat = -dMetersZ / 110574;
    return {
        lat: originLat + dLat,
        lng: wrapLongitude(originLng + dLng)
    };
}

/* ============================================================
   Tile URL Providers
   ============================================================ */

// Esri World Imagery (reliable CORS, high quality satellite)
function getEsriTileUrl(x, y, z) {
    return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/' + z + '/' + y + '/' + x;
}

// Google Maps satellite tiles (may have CORS restrictions)
function getGoogleTileUrl(x, y, z) {
    var server = ['mt0', 'mt1', 'mt2', 'mt3'][Math.abs(x + y) % 4];
    return 'https://' + server + '.google.com/vt/lyrs=s&x=' + x + '&y=' + y + '&z=' + z;
}

// Active tile provider - defaults to Google, falls back to Esri
var tileProvider = 'google';

function getTileUrl(x, y, z) {
    if (tileProvider === 'google') {
        return getGoogleTileUrl(x, y, z);
    }
    return getEsriTileUrl(x, y, z);
}

/* ============================================================
   Tile Provider Detection
   ============================================================ */

function detectTileProvider(callback) {
    var testImg = new Image();
    testImg.crossOrigin = 'anonymous';
    var done = false;

    testImg.onload = function () {
        if (done) return;
        done = true;
        // Test if we can actually read pixel data (CORS check)
        try {
            var canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(testImg, 0, 0, 1, 1);
            ctx.getImageData(0, 0, 1, 1); // Throws if CORS tainted
            tileProvider = 'google';
        } catch (e) {
            tileProvider = 'esri';
        }
        callback();
    };

    testImg.onerror = function () {
        if (done) return;
        done = true;
        tileProvider = 'esri';
        callback();
    };

    setTimeout(function () {
        if (done) return;
        done = true;
        tileProvider = 'esri';
        callback();
    }, 4000);

    testImg.src = getGoogleTileUrl(0, 0, 1);
}

/* ============================================================
   Scene Setup
   ============================================================ */

function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.FogExp2(0x87CEEB, FOG_DENSITY);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 50000);
    camera.position.set(0, START_ALTITUDE, 150);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Lighting
    var hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x8B6914, 0.4);
    scene.add(hemiLight);

    var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(200, 400, 100);
    scene.add(dirLight);

    var ambLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambLight);

    // Water plane (visible below terrain tiles)
    var waterGeo = new THREE.PlaneGeometry(80000, 80000);
    var waterMat = new THREE.MeshBasicMaterial({ color: 0x1a4a7a });
    var waterPlane = new THREE.Mesh(waterGeo, waterMat);
    waterPlane.rotation.x = -Math.PI / 2;
    waterPlane.position.y = -2;
    scene.add(waterPlane);

    // Texture loader
    textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = 'anonymous';

    // Clock
    clock = new THREE.Clock();

    // Flight controls
    controls = new FlightControls(camera, renderer.domElement);

    // Terrain fill (samples viewport colors to fill unloaded tile gaps)
    terrainFill = new TerrainFill(renderer, scene, camera);

    // Panel resizes are handled by initLayout, which reapplies the
    // render resolution against the new panel shape
}

/* ============================================================
   Terrain Tile System
   ============================================================ */

function loadTile(tileX, tileY) {
    var key = tileX + ',' + tileY;
    if (loadedTiles[key]) return;

    var worldX = (tileX - centerTileX) * TILE_SIZE;
    var worldZ = (tileY - centerTileY) * TILE_SIZE;

    var geometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
    var material = new THREE.MeshBasicMaterial({ color: 0x2a3a2a, transparent: true });
    var mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(worldX, 0, worldZ);
    scene.add(mesh);

    loadedTiles[key] = { mesh: mesh, tileX: tileX, tileY: tileY, loaded: false };
    tilesRequested++;

    // The mesh keeps its unwrapped world column; the request uses the
    // column the provider serves, so a flight can cross the antimeridian
    // without every tile after it 404ing
    var urlX = wrapTileX(tileX, TILE_ZOOM);
    var url = getTileUrl(urlX, tileY, TILE_ZOOM);

    textureLoader.load(url, function (texture) {
        if (!loadedTiles[key]) return; // Already unloaded
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        mesh.material.map = texture;
        mesh.material.color.set(0xffffff);
        mesh.material.needsUpdate = true;
        loadedTiles[key].loaded = true;
        tilesLoaded++;
        updateLoadingProgress();
    }, undefined, function () {
        // Primary failed, try fallback provider
        var fallbackUrl = (tileProvider === 'google')
            ? getEsriTileUrl(urlX, tileY, TILE_ZOOM)
            : getGoogleTileUrl(urlX, tileY, TILE_ZOOM);

        textureLoader.load(fallbackUrl, function (texture) {
            if (!loadedTiles[key]) return;
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            mesh.material.map = texture;
            mesh.material.color.set(0xffffff);
            mesh.material.needsUpdate = true;
            loadedTiles[key].loaded = true;
            tilesLoaded++;
            updateLoadingProgress();
        }, undefined, function () {
            if (!loadedTiles[key]) return;
            loadedTiles[key].loaded = true;
            tilesLoaded++;
            updateLoadingProgress();
        });
    });
}

function unloadTile(key) {
    var tile = loadedTiles[key];
    if (!tile) return;

    scene.remove(tile.mesh);
    tile.mesh.geometry.dispose();
    if (tile.mesh.material.map) tile.mesh.material.map.dispose();
    tile.mesh.material.dispose();

    delete loadedTiles[key];

    // A tile evicted before its texture arrived still counts as resolved,
    // otherwise the loading progress can stall below its completion threshold
    if (!tile.loaded) {
        tilesLoaded++;
        updateLoadingProgress();
    }
}

function clearAllTiles() {
    var keys = Object.keys(loadedTiles);
    for (var i = 0; i < keys.length; i++) {
        unloadTile(keys[i]);
    }
    loadedTiles = {};
    tilesLoaded = 0;
    tilesRequested = 0;
    initialLoadDone = false;
}

/**
 * How far the loader may actually reach, as a squared tile distance.
 *
 * loadRadius asks for a terrain disk of a given width and maxTiles caps
 * how many tiles may exist at once. A disk of radius r holds about
 * pi * r^2 tiles, so a radius asking for more than the cap allows is a
 * radius the cap takes straight back: the reach is whichever is smaller.
 *
 * loadRadius keeps its other job either way. updateTileFeather() scales
 * the opacity ramp against it, so a loadRadius wider than this reach
 * stretches the fade across the terrain that does fit rather than
 * widening the terrain itself.
 */
function tileReachSq() {
    return Math.min(LOAD_RADIUS * LOAD_RADIUS, MAX_TILES / Math.PI);
}

function updateTiles() {
    if (!currentCapitalName) return;

    var camTileX = centerTileX + Math.round(controls.position.x / TILE_SIZE);
    var camTileY = centerTileY + Math.round(controls.position.z / TILE_SIZE);

    var reachSq = tileReachSq();
    var reach = Math.ceil(Math.sqrt(reachSq));

    // Everything in play this pass, gathered before anything is requested:
    // the tiles the camera wants, plus the tiles already around it that it
    // has not left behind yet. Ranking one pool by distance is what lets
    // the cap be spent on the nearest tiles whether they are loaded yet or
    // not, so no tile is requested only for the same pass to evict it.
    var pool = [];
    var wanted = {};

    for (var dx = -reach; dx <= reach; dx++) {
        for (var dy = -reach; dy <= reach; dy++) {
            var distSq = dx * dx + dy * dy;
            if (distSq > reachSq) continue;
            var tx = camTileX + dx;
            var ty = camTileY + dy;
            var key = tx + ',' + ty;
            wanted[key] = true;
            pool.push({ key: key, tileX: tx, tileY: ty, distSq: distSq });
        }
    }

    var loadedKeys = Object.keys(loadedTiles);
    for (var i = 0; i < loadedKeys.length; i++) {
        if (wanted[loadedKeys[i]]) continue;
        var tile = loadedTiles[loadedKeys[i]];
        var ddx = tile.tileX - camTileX;
        var ddy = tile.tileY - camTileY;
        var loadedDistSq = ddx * ddx + ddy * ddy;

        // Out of range for good; the unload radius has the last word on
        // what is too far behind to be worth ranking at all
        if (loadedDistSq > UNLOAD_RADIUS * UNLOAD_RADIUS) {
            unloadTile(loadedKeys[i]);
            continue;
        }

        pool.push({
            key: loadedKeys[i],
            tileX: tile.tileX,
            tileY: tile.tileY,
            distSq: loadedDistSq
        });
    }

    pool.sort(function (a, b) { return a.distSq - b.distSq; });

    // Spend the cap nearest first: request what is missing while there is
    // room, and evict whatever the room ran out on
    for (var i = 0; i < pool.length; i++) {
        var entry = pool[i];
        if (i < MAX_TILES) {
            if (!loadedTiles[entry.key]) {
                loadTile(entry.tileX, entry.tileY);
            }
        } else if (loadedTiles[entry.key]) {
            unloadTile(entry.key);
        }
    }

    // Apply feather opacity to tiles near the load radius edge
    updateTileFeather(camTileX, camTileY);
}

/**
 * Applies smooth opacity falloff to tiles near the load radius edge,
 * creating a feathered border effect. Tiles within the feather zone
 * transition from full opacity to transparent using smoothstep.
 */
function updateTileFeather(camTileX, camTileY) {
    if (RADIUS_FEATHER <= 0) {
        // No feather: ensure all tiles are fully opaque
        var keys = Object.keys(loadedTiles);
        for (var i = 0; i < keys.length; i++) {
            var tile = loadedTiles[keys[i]];
            if (tile.mesh.material.opacity !== 1) {
                tile.mesh.material.opacity = 1;
                tile.mesh.material.needsUpdate = true;
            }
        }
        return;
    }

    // Clamp so a feather wider than the load radius still yields a valid zone
    var featherStart = Math.max(0, LOAD_RADIUS - RADIUS_FEATHER);
    var featherWidth = LOAD_RADIUS - featherStart;
    var keys = Object.keys(loadedTiles);
    for (var i = 0; i < keys.length; i++) {
        var tile = loadedTiles[keys[i]];
        var ddx = tile.tileX - camTileX;
        var ddy = tile.tileY - camTileY;
        var dist = Math.sqrt(ddx * ddx + ddy * ddy);

        var opacity;
        if (dist <= featherStart) {
            opacity = 1;
        } else if (dist >= LOAD_RADIUS) {
            opacity = 0;
        } else {
            // Smoothstep falloff from 1 to 0 across the feather zone
            var t = (dist - featherStart) / featherWidth;
            opacity = 1 - t * t * (3 - 2 * t);
        }

        if (tile.mesh.material.opacity !== opacity) {
            tile.mesh.material.opacity = opacity;
            tile.mesh.material.needsUpdate = true;
        }
    }
}

/* ============================================================
   Capital Loading
   ============================================================ */

function loadCapital(capitalData) {
    clearAllTiles();

    originLat = capitalData.lat;
    originLng = capitalData.lng;

    // Typed destinations arrive with the label the geocoder built for
    // them; capitals are named from their two known fields
    currentCapitalName = capitalData.label ||
        (capitalData.capital + ', ' + capitalData.country);
    currentMetersPerTile = metersPerTile(originLat, TILE_ZOOM);

    var tile = latLngToTile(originLat, originLng, TILE_ZOOM);
    centerTileX = tile.x;
    centerTileY = tile.y;

    // Show loading
    document.getElementById('loading-overlay').classList.remove('hidden');
    document.getElementById('welcome').classList.add('hidden');
    document.getElementById('fly-prompt').classList.add('hidden');

    // Reset terrain fill for new location
    if (terrainFill) terrainFill.reset();

    // Reset geocoder so the location label refreshes for the new area
    Geocoder.reset();

    // Load initial tiles
    updateTiles();

    // Position camera above the capital
    controls.resetTo(
        new THREE.Vector3(0, START_ALTITUDE, 150),
        new THREE.Vector3(0, 0, 0)
    );

    // Update HUD capital name
    document.getElementById('hud-capital').textContent = currentCapitalName;
}

/* ============================================================
   Host-Driven Updates

   A host (the VS Code extension, or the Copilot canvas server)
   can steer the flight and report what it is working on. Both
   arrive as HostBridge commands, so a page with no host simply
   never receives them.
   ============================================================ */

/**
 * Finds the menu entry for a destination, by position rather than by
 * name: the same place reached from the capitals list, from the input
 * dialog, or from a host command should resolve to one entry. Returns
 * the option's value, or '' when the menu has no entry for it.
 */
function findDestinationOption(select, destination) {
    for (var i = 0; i < select.options.length; i++) {
        var value = select.options[i].value;
        if (!value || value === INPUT_DESTINATION_VALUE) continue;

        var option;
        try {
            option = JSON.parse(value);
        } catch (e) {
            continue; // Not a destination entry
        }

        if (option.lat === destination.lat && option.lng === destination.lng) {
            return value;
        }
    }

    return '';
}

/**
 * Adds a typed or geocoded destination to the menu so it can be flown
 * back to without retyping it.
 *
 * The entry carries the whole destination as its value, in the shape the
 * capitals use, so re-selecting it goes through the same change handler
 * and lands in the same place. Entries collect under their own group,
 * which is created the first time one is needed.
 */
function rememberDestination(select, destination) {
    var group = null;
    for (var i = 0; i < select.children.length; i++) {
        if (select.children[i].label === ENTERED_GROUP_LABEL) {
            group = select.children[i];
            break;
        }
    }

    if (!group) {
        group = document.createElement('optgroup');
        group.label = ENTERED_GROUP_LABEL;
        // Above the capitals, next to the entry that creates these
        select.insertBefore(group, select.querySelector('optgroup'));
    }

    // Geocoded places arrive with the label the HUD shows, so the menu
    // names them the same way. A bare waypoint has only its own name.
    var text = destination.label;
    if (!text) {
        text = destination.country
            ? destination.capital + ' - ' + destination.country
            : destination.capital;
    }

    var option = document.createElement('option');
    option.value = JSON.stringify(destination);
    option.textContent = text;
    group.appendChild(option);

    return option.value;
}

/**
 * Flies to a destination and names it in the menu. Accepts the same
 * shape loadCapital takes, so a place from the capitals list, the input
 * dialog, or a host command works unchanged.
 */
function flyToDestination(destination) {
    if (!destination ||
        typeof destination.lat !== 'number' ||
        typeof destination.lng !== 'number') return;

    loadCapital(destination);

    // Keep the menu honest about where the camera actually is, rather
    // than leaving it on the capital that was left behind
    var select = document.getElementById('capital-select');
    if (!select) return;

    var value = findDestinationOption(select, destination) ||
                rememberDestination(select, destination);

    lastCapitalValue = value;
    select.value = value;
}

/**
 * Shows what the host's agent is working on. job is
 * { working, status, tokens }; a job that is not working leaves the last
 * status on screen with the activity indicator stilled.
 */
function showAgentStatus(job) {
    var panel = document.getElementById('agent-status');
    if (!panel || !job) return;

    var status = typeof job.status === 'string' ? job.status : '';
    if (!status && !job.working) {
        panel.classList.add('hidden');
        return;
    }

    document.getElementById('agent-status-text').textContent = status;
    document.getElementById('agent-status-tokens').textContent =
        (typeof job.tokens === 'number' && job.tokens > 0)
            ? job.tokens.toLocaleString() + ' tok'
            : '';

    panel.classList.toggle('idle', !job.working);
    panel.classList.remove('hidden');
}

/* ============================================================
   Loading Progress
   ============================================================ */

function updateLoadingProgress() {
    var pct = Math.min(100, Math.round((tilesLoaded / Math.max(1, tilesRequested)) * 100));

    document.getElementById('loading-bar').style.width = pct + '%';
    document.getElementById('loading-progress').textContent = pct + '%';

    if (!initialLoadDone && pct >= 40) {
        initialLoadDone = true;
        document.getElementById('loading-overlay').classList.add('hidden');
        document.getElementById('fly-prompt').classList.remove('hidden');
        document.getElementById('hud').classList.remove('hidden');
        document.getElementById('hud-location').classList.remove('hidden');
        document.getElementById('controls-list').classList.remove('hidden');

        // The readout joining the top bar can change its height
        updateTopBarLayout();
    }
}

/* ============================================================
   HUD Updates
   ============================================================ */

function updateHUD() {
    if (!controls || !controls.isEnabled) return;

    var heading = controls.getHeading();
    var pitch = controls.getPitch();
    var speed = controls.getSpeed();
    var altitude = controls.getAltitude();

    // Convert speed from world units/frame to approximate km/h
    var metersPerUnit = currentMetersPerTile / TILE_SIZE;
    var speedKmh = Math.round(speed * 60 * metersPerUnit * 3.6);
    var altMeters = Math.round(altitude * metersPerUnit);

    // Heading cardinal direction
    var cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
    var cardinalIdx = Math.round(heading / 45);
    var cardinal = cardinals[cardinalIdx];

    document.getElementById('hud-heading-value').textContent =
        cardinal + ' ' + Math.round(heading) + '°';

    document.getElementById('hud-speed-value').textContent = speedKmh;
    document.getElementById('hud-altitude-value').textContent = altMeters;
    document.getElementById('hud-pitch-value').textContent =
        (pitch >= 0 ? '+' : '') + Math.round(pitch) + '°';

    // Update coordinates
    var coords = positionToLatLng(controls.position.x, controls.position.z);
    document.getElementById('hud-coords').textContent =
        formatCoords(coords.lat, coords.lng);

    // Update the location label as the camera moves (throttled internally)
    Geocoder.update(coords.lat, coords.lng, function (label) {
        document.getElementById('hud-capital').textContent = label;
    });
}

/* ============================================================
   Responsive Layout
   ============================================================ */

// Mirrors the flex-basis of #hud-location in styles.css
var LOCATION_MIN_WIDTH = 240;

// Mirrors the gap and padding of #top-bar in styles.css
var TOP_BAR_GAP = 12;

var layoutFrame = null;

/**
 * Measures the top bar and publishes what the rest of the layout needs.
 *
 * The location readout shares a row with the capital selector, so the
 * bar mirrors the selector's width as right padding to keep the readout
 * centered on the panel instead of on the space beside the menu. Three
 * arrangements, chosen by measured width:
 *
 *   1. Selector, readout, and a mirror of the selector all fit: the
 *      readout is centered on the panel.
 *   2. Only the selector and readout fit: the mirror is dropped and the
 *      readout centers in the space beside the menu.
 *   3. Neither fits: the readout takes its own row underneath.
 *
 * The arrangement is decided from measured widths rather than from an
 * observed wrap, so the padding it toggles cannot feed back into the
 * decision that produced it.
 */
function updateTopBarLayout() {
    var topBar = document.getElementById('top-bar');
    var selector = document.getElementById('selector-panel');
    if (!topBar || !selector) return;

    var root = document.documentElement;
    var available = window.innerWidth;
    var selectorWidth = Math.ceil(selector.getBoundingClientRect().width);

    var mirrorFits = (2 * selectorWidth) + LOCATION_MIN_WIDTH + (3 * TOP_BAR_GAP) <= available;
    var rowFits = selectorWidth + LOCATION_MIN_WIDTH + (3 * TOP_BAR_GAP) <= available;

    topBar.classList.toggle('stacked', !rowFits);
    root.style.setProperty('--selector-width', (mirrorFits ? selectorWidth : 0) + 'px');

    // Read back after the writes above so the heading readout and the
    // config panel clear the bar at whatever height it settled on
    root.style.setProperty(
        '--top-bar-height',
        Math.ceil(topBar.getBoundingClientRect().height) + 'px'
    );
}

/**
 * Coalesces panel resizes into one pass per frame. Dragging the editor
 * layout fires a burst of resize events, and each one would otherwise
 * reallocate the WebGL drawing buffer.
 */
function scheduleViewportLayout() {
    if (layoutFrame !== null) return;
    layoutFrame = requestAnimationFrame(function () {
        layoutFrame = null;
        updateTopBarLayout();
        RenderConfig.apply();
    });
}

/**
 * Binds the layout to every source of a size change: the panel being
 * resized, the editor layout shifting around it, and the selector panel
 * reflowing its own contents.
 */
function initLayout() {
    updateTopBarLayout();

    window.addEventListener('resize', scheduleViewportLayout);

    if (typeof ResizeObserver === 'undefined') return;

    // Panel resizes that do not raise a window resize event, such as the
    // file explorer being collapsed beside a docked panel
    new ResizeObserver(scheduleViewportLayout).observe(document.body);

    // The selector panel reflows when the panel gets too narrow for its
    // dropdown and buttons, which changes the width the bar mirrors
    new ResizeObserver(updateTopBarLayout).observe(
        document.getElementById('selector-panel')
    );
}

/* ============================================================
   UI Setup
   ============================================================ */

/**
 * Rewrites the look-control wording for the mode the controls settled
 * on, so the on-screen help never promises pointer lock the host
 * refused to grant.
 */
function applyLookMode(mode) {
    var lookText = (mode === 'drag') ? 'Drag: Look' : 'Mouse: Look';
    var lookHint = (mode === 'drag') ? 'Drag' : 'Mouse';

    var helpLine = document.getElementById('controls-help-look');
    if (helpLine) helpLine.textContent = lookText;

    var listLine = document.getElementById('controls-list-look');
    if (listLine) listLine.textContent = lookHint;

    var promptHint = document.getElementById('fly-prompt-hint');
    if (promptHint) {
        promptHint.textContent = (mode === 'drag')
            ? 'Hold the left mouse button to look around'
            : 'Press Escape to release the cursor';
    }
}

function setupUI() {
    var select = document.getElementById('capital-select');

    // Populate dropdown
    for (var i = 0; i < CAPITALS_BY_REGION.length; i++) {
        var region = CAPITALS_BY_REGION[i];
        var optgroup = document.createElement('optgroup');
        optgroup.label = region.region;

        for (var j = 0; j < region.capitals.length; j++) {
            var cap = region.capitals[j];
            var option = document.createElement('option');
            option.value = JSON.stringify(cap);
            option.textContent = cap.capital + ' - ' + cap.country;
            optgroup.appendChild(option);
        }

        select.appendChild(optgroup);
    }

    // Keyboard entry for anywhere the capitals list does not cover.
    // Results go through flyToDestination so an entered place joins the
    // menu, the same way one sent by a host does.
    DestinationInput.init({
        onSelect: function (destination) {
            flyToDestination(destination);
        },
        onOpen: function () {
            // Stop flying behind the dialog and give up the cursor
            if (controls) controls.release();
        },
        onClose: function () {
            select.focus();
        }
    });

    // Selection handler
    select.addEventListener('change', function (e) {
        var value = e.target.value;
        if (!value) return;

        // The action entry is not a destination: reset the menu to the
        // capital still loaded so re-picking it opens the dialog again
        if (value === INPUT_DESTINATION_VALUE) {
            e.target.value = lastCapitalValue;
            DestinationInput.open();
            return;
        }

        lastCapitalValue = value;
        loadCapital(JSON.parse(value));
    });

    // Pause toggle (P key): freezes flight, tile updates, HUD, and clouds
    document.addEventListener('keydown', function (e) {
        if (e.code !== 'KeyP') return;
        // A "p" typed into a destination field is not a pause request
        if (FlightControls.isTextEntryTarget(e.target)) return;
        togglePause();
    });

    // Flight controls lock/unlock
    document.addEventListener('flightcontrols', function (e) {
        applyLookMode(e.detail.mode);

        if (e.detail.locked) {
            document.getElementById('fly-prompt').classList.add('hidden');
            document.getElementById('controls-help').classList.remove('hidden');

            // Fade out controls help after 5 seconds
            setTimeout(function () {
                document.getElementById('controls-help').classList.add('fade-out');
            }, 5000);
        } else {
            document.getElementById('controls-help').classList.add('hidden');
            document.getElementById('controls-help').classList.remove('fade-out');
            if (initialLoadDone) {
                document.getElementById('fly-prompt').classList.remove('hidden');
            }
        }
    });
}

/* ============================================================
   Animation Loop
   ============================================================ */

function togglePause() {
    isPaused = !isPaused;
    var indicator = document.getElementById('pause-indicator');
    if (isPaused) {
        indicator.classList.remove('hidden');
    } else {
        indicator.classList.add('hidden');
        // Discard input and time accumulated while paused so the
        // camera does not jump on resume
        if (controls) {
            controls.mouseMovementX = 0;
            controls.mouseMovementY = 0;
        }
        if (clock) clock.getDelta();
    }
}

function animate() {
    requestAnimationFrame(animate);

    // Common pause state: keep rendering the frozen scene only
    if (isPaused) {
        renderer.render(scene, camera);
        return;
    }

    var delta = clock.getDelta();

    // Update flight controls
    controls.update(delta);

    // Periodically update tiles
    tileUpdateCounter++;
    if (tileUpdateCounter >= 30) {
        tileUpdateCounter = 0;
        updateTiles();
    }

    // Update HUD
    updateHUD();

    // Render
    renderer.render(scene, camera);

    // Update terrain fill after main render (samples viewport, generates fill for next frame)
    if (terrainFill && initialLoadDone) {
        terrainFill.update(controls ? controls.getHeading() : 0);
    }
}

/* ============================================================
   Tile Zoom Reload
   ============================================================ */

/**
 * Recalculates tile coordinates and reloads all tiles at the current
 * zoom level. Preserves the camera's geographic position so the view
 * stays in place while tiles reload in the background.
 */
function reloadTilesAtCurrentZoom() {
    if (!currentCapitalName) return;

    // Determine camera's current geographic position before clearing
    var camGeo = positionToLatLng(controls.position.x, controls.position.z);

    clearAllTiles();

    // Re-center on the camera's current geographic location at new zoom
    originLat = camGeo.lat;
    originLng = camGeo.lng;
    currentMetersPerTile = metersPerTile(originLat, TILE_ZOOM);

    var tile = latLngToTile(originLat, originLng, TILE_ZOOM);
    centerTileX = tile.x;
    centerTileY = tile.y;

    // Camera is now at geographic center, so world position resets to origin
    controls.position.x = 0;
    controls.position.z = 0;
    camera.position.x = 0;
    camera.position.z = 0;

    if (terrainFill) terrainFill.reset();
    updateTiles();

    // Update HUD with the new center coordinates
    document.getElementById('hud-coords').textContent =
        formatCoords(camGeo.lat, camGeo.lng);
}

/* ============================================================
   Initialize
   ============================================================ */

function init() {
    detectTileProvider(function () {
        RenderConfig.load(function (cfg) {
            initScene();
            RenderConfig.apply();
            setupUI();
            RenderConfig.bindSliders();
            initLayout();

            // React to config changes that require special handling.
            // Debounce the zoom reload so dragging the slider does not
            // trigger a full tile clear + refetch on every input tick.
            var zoomReloadTimer = null;
            RenderConfig.onChange(function (path) {
                if (path === 'map.tileZoom') {
                    clearTimeout(zoomReloadTimer);
                    zoomReloadTimer = setTimeout(reloadTilesAtCurrentZoom, 400);
                }
            });

            // Export JSON button
            var exportBtn = document.getElementById('btn-export-json');
            if (exportBtn) {
                exportBtn.addEventListener('click', function () {
                    RenderConfig.exportJSON();
                });
            }

            // Config panel toggle
            var toggleBtn = document.getElementById('btn-toggle-config');
            var configPanel = document.getElementById('config-panel');
            if (toggleBtn && configPanel) {
                toggleBtn.addEventListener('click', function () {
                    configPanel.classList.toggle('hidden');
                });
            }

            // Commands issued from the extension host
            HostBridge.on('exportConfig', function () {
                RenderConfig.exportJSON();
            });
            HostBridge.on('toggleConfigPanel', function () {
                if (configPanel) configPanel.classList.toggle('hidden');
            });
            HostBridge.on('flyTo', function (message) {
                flyToDestination(message.destination);
            });
            HostBridge.on('jobStatus', function (message) {
                showAgentStatus(message.job);
            });

            HostBridge.post({ command: 'ready' });

            animate();
        });
    });
}

document.addEventListener('DOMContentLoaded', init);
