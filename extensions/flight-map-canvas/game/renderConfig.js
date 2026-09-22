/***************************************************************************
 * RenderConfig - Loads, applies, and exports map rendering configuration. *
 *                                                                         *
 * Inside the VS Code panel the extension host reads renderMap.json and    *
 * injects it before the page scripts run. As a standalone page the        *
 * config is fetched from renderMap.json in the project root. Either way   *
 * the values are merged over the defaults and applied to the live         *
 * simulation.                                                             *
 *                                                                         *
 * Export hands the current configuration to the extension host, which     *
 * writes it through a save dialog. In the browser it falls back to a      *
 * plain file download.                                                    *
 **************************************************************************/
var RenderConfig = (function () {

    var defaults = {
        map: {
            width: 1920,
            height: 1080,
            tileZoom: 15,
            tileSize: 100,
            loadRadius: 6,
            unloadRadius: 9,
            startAltitude: 200,
            fogDensity: 0.00018,
            radiusFeather: 3,
            maxTiles: 600
        },
        filler: {
            sampleInterval: 45,
            updateIntervalSec: 10,
            perimeter: { patchCount: 10, patchSize: 10 },
            center: { patchCount: 5, patchSize: 10 },
            padding: { patchCount: 4, patchSize: 5 }
        },
        cloud: {
            enabled: true,
            opacity: 0.35,
            speed: 0.0004,
            coverage: 0.5,
            scale: 0.008
        }
    };

    var config = JSON.parse(JSON.stringify(defaults));
    var listeners = [];

    /**
     * Deep merge source into target, preserving existing keys.
     */
    function merge(target, source) {
        for (var key in source) {
            if (!source.hasOwnProperty(key)) continue;
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key]) target[key] = {};
                merge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
        return target;
    }

    function freshDefaults() {
        return JSON.parse(JSON.stringify(defaults));
    }

    /**
     * Load configuration, merged over defaults. Prefers the config the
     * extension host injected; otherwise reads renderMap.json from the
     * project root relative to this page.
     */
    function load(callback) {
        var injected = HostBridge.getInjectedConfig();
        if (injected) {
            config = merge(freshDefaults(), injected);
            if (callback) callback(config);
            return;
        }

        var xhr = new XMLHttpRequest();
        xhr.open('GET', '../renderMap.json', true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    config = merge(freshDefaults(), data);
                } catch (e) {
                    console.warn('RenderConfig: invalid JSON, using defaults');
                    config = freshDefaults();
                }
            } else {
                console.warn('RenderConfig: could not load renderMap.json, using defaults');
                config = freshDefaults();
            }
            if (callback) callback(config);
        };
        xhr.send();
    }

    /**
     * Get the full config object.
     */
    function get() {
        return config;
    }

    /**
     * Set a config value by dot-notation path (e.g. "cloud.opacity").
     */
    function set(path, value) {
        var keys = path.split('.');
        var obj = config;
        for (var i = 0; i < keys.length - 1; i++) {
            if (!obj[keys[i]]) obj[keys[i]] = {};
            obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;
        apply();
        notify(path, value);
    }

    /**
     * Subscribe to config changes.
     */
    function onChange(fn) {
        listeners.push(fn);
    }

    function notify(path, value) {
        for (var i = 0; i < listeners.length; i++) {
            listeners[i](path, value, config);
        }
    }

    /**
     * Apply current config values to the live simulation globals.
     */
    function apply() {
        // Map globals
        TILE_ZOOM = config.map.tileZoom;
        TILE_SIZE = config.map.tileSize;
        LOAD_RADIUS = config.map.loadRadius;
        UNLOAD_RADIUS = Math.max(config.map.unloadRadius, LOAD_RADIUS + 3);
        START_ALTITUDE = config.map.startAltitude;
        FOG_DENSITY = config.map.fogDensity;
        RADIUS_FEATHER = config.map.radiusFeather;
        MAX_TILES = config.map.maxTiles;

        // Apply fog density to scene
        if (typeof scene !== 'undefined' && scene && scene.fog) {
            scene.fog.density = config.map.fogDensity;
        }

        // Apply render resolution. CSS stretches the canvas buffer over
        // the panel, so a buffer shaped differently from the panel would
        // render distorted. Keep the configured width x height as the
        // pixel budget and reshape it to the panel's aspect ratio, so
        // resizing the panel changes how much is in frame rather than
        // how the frame is squashed.
        if (typeof renderer !== 'undefined' && renderer &&
            typeof camera !== 'undefined' && camera &&
            config.map.width > 0 && config.map.height > 0) {

            var aspect = (window.innerWidth > 0 && window.innerHeight > 0)
                ? window.innerWidth / window.innerHeight
                : config.map.width / config.map.height;

            var pixelBudget = config.map.width * config.map.height;
            var height = Math.max(1, Math.round(Math.sqrt(pixelBudget / aspect)));
            var width = Math.max(1, Math.round(height * aspect));

            renderer.setSize(width, height, false);
            camera.aspect = aspect;
            camera.updateProjectionMatrix();
        }

        // Apply filler settings to TerrainFill instance
        if (typeof terrainFill !== 'undefined' && terrainFill) {
            terrainFill.sampleInterval = config.filler.sampleInterval;
            terrainFill.updateIntervalSec = config.filler.updateIntervalSec;
            terrainFill.perimeterPatchCount = config.filler.perimeter.patchCount;
            terrainFill.perimeterPatchSize = config.filler.perimeter.patchSize;
            terrainFill.centerPatchCount = config.filler.center.patchCount;
            terrainFill.centerPatchSize = config.filler.center.patchSize;
            terrainFill.paddingPatchCount = config.filler.padding.patchCount;
            terrainFill.paddingPatchSize = config.filler.padding.patchSize;
        }

        // Apply cloud settings
        if (typeof terrainFill !== 'undefined' && terrainFill && terrainFill.cloudOverlay) {
            terrainFill.cloudOverlay.enabled = config.cloud.enabled;
            terrainFill.cloudOverlay.opacity = config.cloud.opacity;
            terrainFill.cloudOverlay.speed = config.cloud.speed;
            terrainFill.cloudOverlay.coverage = config.cloud.coverage;
            terrainFill.cloudOverlay.scale = config.cloud.scale;
        }
    }

    /**
     * Export the current configuration as renderMap.json. The extension
     * host owns the file write so the save lands in the workspace; a
     * standalone page falls back to a browser download.
     */
    function exportJSON() {
        var json = JSON.stringify(config, null, 4);

        if (HostBridge.isHosted()) {
            HostBridge.post({ command: 'exportConfig', json: json });
            return;
        }

        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'renderMap.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Populate slider/input elements from the current config and bind change events.
     */
    function bindSliders() {
        var sliders = document.querySelectorAll('[data-config]');
        for (var i = 0; i < sliders.length; i++) {
            (function (el) {
                var path = el.getAttribute('data-config');
                var keys = path.split('.');
                var val = config;
                for (var k = 0; k < keys.length; k++) {
                    val = val[keys[k]];
                }
                el.value = val;
                var display = document.getElementById(el.id + '-val');
                if (display) display.textContent = val;

                el.addEventListener('input', function () {
                    var v = parseFloat(el.value);
                    set(path, v);
                    if (display) display.textContent = v;
                });
            })(sliders[i]);
        }

        // Cloud enabled checkbox
        var cloudToggle = document.getElementById('cfg-cloud-enabled');
        if (cloudToggle) {
            cloudToggle.checked = config.cloud.enabled;
            cloudToggle.addEventListener('change', function () {
                set('cloud.enabled', cloudToggle.checked);
            });
        }
    }

    return {
        load: load,
        get: get,
        set: set,
        apply: apply,
        exportJSON: exportJSON,
        bindSliders: bindSliders,
        onChange: onChange
    };
})();
