# BackRooms Canvas

A GitHub Copilot canvas that opens an endless first-person backrooms in the side panel. Yellow-wallpapered halls under humming fluorescent panels, drop-tile ceilings, and worn office carpet, filmed through the shake and grain of a 1990-era handheld camcorder. Somewhere past the fog, something else walks the same halls.

It is a canvas port of the [BackViews VSCode extension](https://github.com/isocialPractice/vscode-backviews). The world is powered by [cmd-backedges](https://github.com/isocialPractice/cmd-backedges), a procedural infinite maze engine, so every wall, room, and prop is a pure function of the seed: the same seed always rebuilds the same rooms, forever, in every direction.

While an agent works in the session, the halls start writing back. Its status and streaming responses are scrawled onto the walls in a messy ink script, and a camcorder-style token counter runs under the HUD battery.

## Files

- `extension.mjs` — canvas declaration, loopback game server, static asset handling, and agent actions.
- `game/` — the prebuilt game bundle (`webview.js`) and the `index.html` host shim served inside the canvas.
- `materials/` — photo textures (`wallpaper.jpg`, `ceiling.jpg`, `carpet.jpg`) tiled over the procedural atlas.
- `assets/` — app icon and `preview.png` for the extensions gallery.
- `package.json` — declares the Copilot SDK dependency and ESM entry point.
- `copilot-extension.json` — Copilot extension name/version metadata.

## Prerequisites

- **Node.js 20.19 or newer**, because the Copilot SDK requires `node ^20.19.0 || >=22.12.0`.
- A WebGL-capable canvas surface (the renderer is raw WebGL).
- The GitHub Copilot app canvas / UI-extensions experiment enabled.

## Install

Drop this folder at `~/.copilot/extensions/backrooms-canvas/` for user scope, or in a repository at `.github/extensions/backrooms-canvas/` for project scope. Then install dependencies from inside the copied folder:

```sh
# User scope
cd ~/.copilot/extensions/backrooms-canvas

# Or project scope, from the repository root
cd .github/extensions/backrooms-canvas

npm install
```

Reload extensions in the GitHub Copilot app, then open the `backrooms-canvas` canvas. Click the view to capture the mouse and start walking.

The canvas accepts optional open inputs:

| Input | Type | Description |
| --- | --- | --- |
| `seed` | number | Maze seed. The same seed always rebuilds the same halls. `0` rolls a random seed. |
| `materialPreset` | string | Wall material set: `classic`, `office`, `pool`, `concrete`, or `panel`. |
| `monsterEnabled` | boolean | Whether something else walks the halls. |

## Controls

| Input | Action |
| --- | --- |
| `W` / `S` or `Up` / `Down` | Walk forward / back |
| `A` / `D` | Strafe left / right |
| `Left` / `Right` or `Q` / `E` | Turn |
| `Shift` | Hurry |
| Mouse (after clicking the view) | Look around |
| `M` or `Esc` | Open the in-game menu |

The in-game menu has Resume, Relocate, Settings, and Help, plus live stats. Settings changed there persist in the canvas via `localStorage`, so your choices survive a reload.

## Agent actions

The agent drives the game and feeds the ghost-writer through three actions. They are the canvas equivalent of the original extension's `backviews_reportJob` tool and chat-session mirror.

- `report_job { status, tokens?, done? }` — report the current job step. The status text is scrawled on the walls and the token count drives the HUD counter. Call it when work starts, again on each new step, and once more with `done: true` when finished.
- `ghost_write { text, tokens?, done? }` — ghost-write a block of text onto the wall ahead, character by character as it grows, like a streaming response. Send the growing text on each call, then once with `done: true` to settle it in place.
- `relocate` — drop the wanderer into a fresh random seed, wiping any writing already on the walls.

To have the agent narrate itself automatically, reference these actions from a `.github/copilot-instructions.md` so it calls `report_job` on each step of a chat request.

## How the port works

The game itself is unchanged: `game/webview.js` is the same self-contained bundle the VSCode extension ships (WebGL renderer, maze engine, camcorder overlay, and wall-writing subsystem in one esbuild IIFE). The bundle was written to talk to a VSCode webview host through `acquireVsCodeApi()` and `window.postMessage`.

`game/index.html` shims that host:

- `acquireVsCodeApi()` is backed by `localStorage` for state (seed and player position) and settings persistence.
- The canvas server (`extension.mjs`) runs a loopback HTTP server that serves the bundle and streams agent activity over Server-Sent Events at `/events`. The shim translates those events into the exact `jobStatus`, `chatSession`, and `relocate` messages the bundle already listens for.
- Agent actions broadcast onto that SSE stream, so `report_job` writes on the walls and `ghost_write` streams text just as the VSCode chat mirror did.

This mirrors the [`arcade-canvas`](../arcade-canvas) architecture: a static frontend served from a loopback server, with the agent driving it through canvas actions.

## Credits

- Maze generation: [cmd-backedges](https://github.com/isocialPractice/cmd-backedges) by John Haugabook.
- Original extension: [vscode-backviews](https://github.com/isocialPractice/vscode-backviews).

## License

MIT
