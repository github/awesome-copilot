# Flight Map Canvas

A GitHub Copilot canvas that generates a view where Google Maps can be explored using 3D controls, as if a flight simulator. No 3D plane model as the focus is the aerial landscape. Fly around in 1st person for several minutes, starting from a capital city while Copilot works.

It is a canvas port of the [Flight Map VSCode extension](https://github.com/isocialPractice/vscode-flight-map). Satellite imagery tiles stream in around the camera as it moves, unloaded gaps are filled with color sampled from the viewport, and drifting procedural clouds sit over the fill. The HUD reads heading, speed, altitude, pitch, and live coordinates, with the city, region, and country under the camera looked up as it flies.

While an agent works in the session, it can send the flight somewhere new and report what it is doing on a status strip under the HUD.

## Files

- `extension.mjs` — canvas declaration, loopback game server, the host shim it injects into the page, destination resolution, and agent actions.
- `game/` — the simulator itself, byte for byte the VSCode extension's `media/` folder. `index.html` is its `flightMap.html`; the rest is the Three.js scene, tile loader, flight controls, terrain fill, HUD, and configuration panel.
- `game/vendor/three.min.js` — vendored Three.js r128, so the only remote requests are the ones the simulation makes for imagery and place names.
- `renderMap.json` — the render configuration the canvas starts on.
- `assets/` — app icon and `preview.png` for the extensions gallery.
- `package.json` — declares the Copilot SDK dependency and ESM entry point.
- `copilot-extension.json` — Copilot extension name/version metadata.

## Prerequisites

- **Node.js 20.19 or newer**, because the Copilot SDK requires `node ^20.19.0 || >=22.12.0`.
- A WebGL-capable canvas surface; the scene is rendered through Three.js.
- Network access. Satellite tiles, the location label, and destination lookups are all fetched at runtime.
- The GitHub Copilot app canvas / UI-extensions experiment enabled.

## Install

Drop this folder at `~/.copilot/extensions/flight-map-canvas/` for user scope, or in a repository at `.github/extensions/flight-map-canvas/` for project scope. Then install dependencies from inside the copied folder:

```sh
# User scope
cd ~/.copilot/extensions/flight-map-canvas

# Or project scope, from the repository root
cd .github/extensions/flight-map-canvas

npm install
```

Reload extensions in the GitHub Copilot app, then open the `flight-map-canvas` canvas. Pick a destination from the menu, click the view to start flying, and use the controls below.

The canvas accepts optional open inputs, resolved the same way `fly_to` resolves them:

| Input | Type | Description |
| --- | --- | --- |
| `capital` | string | A world capital by city or country name. Matched against the capitals the canvas ships with. |
| `city` | string | City name for anywhere that is not a shipped capital. Geocoded on the way in. |
| `state` | string | State, region, province, or district that narrows the city. |
| `country` | string | Country that narrows the city. |
| `lat` / `lng` | number | Raw coordinates, which skip the geocoder entirely. Latitude runs -85.0511 to 85.0511, the limit of the Web Mercator tile imagery; longitude runs -180 to 180. Give both or neither. |

Opened with no input, the canvas starts on its own welcome screen and waits for a destination.

## Controls

| Input | Action |
| --- | --- |
| `W` / `S` or `Up` / `Down` | Throttle |
| Mouse (after clicking the view) | Pitch and yaw |
| `A` / `D` or `Left` / `Right` | Roll |
| `Q` / `E` | Rudder yaw |
| `R` / `F` | Climb / descend |
| `Space` | Auto-level |
| `Shift` | Boost |
| `P` | Pause / resume |
| `Esc` | Release the view |

Mouse look prefers pointer lock. If the canvas host refuses it, the controls fall back to drag look: hold the left mouse button and move to steer. The on-screen help says which mode is active.

The **Destination** menu lists the world capitals grouped by continent and opens with **Input Destination**, which takes a typed state/region and city plus a country from a menu, then lists what matched so one can be selected. **Config** opens live rendering sliders, and **Export JSON** downloads the current configuration as `renderMap.json`.

## Agent actions

- `fly_to { capital?, city?, state?, country?, lat?, lng? }` — send the flight to a destination. A capital is matched against the shipped list, a city is geocoded, and a lat/lng pair is flown to directly. Called with no input it picks a random world capital, which is the way to say "take me somewhere else".
- `report_job { status, tokens?, done? }` — report the current job step. The status shows on a strip under the HUD and the token count runs beside it. Call it when work starts, again on each new step, and once more with `done: true` when finished.

To have the agent narrate itself automatically, reference these actions from a `.github/copilot-instructions.md` so it calls `report_job` on each step of a chat request.

## How the port works

The simulator under `game/` is unchanged from the VSCode extension. That page was already written to run in two places, and it reaches whatever is hosting it through one seam: an `acquireVsCodeApi()` object for messaging, and a `<!--{{HOST_HEAD}}-->` placeholder in its `<head>` that the host fills with a content security policy and its render configuration.

`extension.mjs` fills that seam for the canvas:

- A loopback HTTP server serves the page and its assets, replacing the placeholder with a policy, the render configuration read from `renderMap.json`, and a shim that defines `acquireVsCodeApi()`.
- Agent activity is streamed to the page over Server-Sent Events at `/events`. The shim translates those events into the exact `flyTo` and `jobStatus` commands the page already registers handlers for.
- The page's export button has no save dialog to reach here, so the shim falls back to the browser download the standalone page uses.
- Destinations are resolved server-side before broadcasting, against the page's own `capitals.js` for shipped capitals and OpenStreetMap Nominatim for everything else.

This mirrors the [`backrooms-canvas`](../backrooms-canvas) and [`arcade-canvas`](../arcade-canvas) architecture: a static frontend served from a loopback server, with the agent driving it through canvas actions.

## Development

The port is a copy, not a fork. Everything under `game/` comes from the VSCode extension's `media/` folder, so edits belong there.

In that repository the two are held together by symlinks, which means there is only ever one copy to edit and the port cannot go stale. Submission needs real files, though, because a link pointing at a sibling repository resolves to nothing anywhere else, so the stage command resolves every link on the way out:

```sh
# In the vscode-flight-map repository
npm run canvas:link                     # create or repair the symlinks
npm run canvas:check                    # verify them; non-zero when stale
npm run canvas:stage -- <destination>   # real-file copy for submission
```

`media/flightMap.html` is linked as `game/index.html`; nothing else is renamed and no file is rewritten. To run the simulator outside a canvas while working on it, open `media/flightMap.html` in a browser.

## Credits

- Source extension and canvas port: [vscode-flight-map](https://github.com/isocialPractice/vscode-flight-map) by John Haugabook.
- Satellite imagery: Google Maps tiles, with Esri World Imagery as the fallback provider. The imagery is served by, and remains the property of, those providers; this canvas only displays it, subject to their respective terms of service.
- Place names and destination lookups: [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/). Data © OpenStreetMap contributors, available under the [Open Database License](https://www.openstreetmap.org/copyright).
- 3D rendering: [Three.js](https://threejs.org/) r128.

## License

MIT
