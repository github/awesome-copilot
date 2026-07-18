# Agent Arcade Canvas

A GitHub Copilot canvas that opens a retro arcade in the side panel. It serves the built Agent Arcade Phaser frontend and lets either the user or the agent switch between five mini-games.

## Games

- **Alien Onslaught** — Space Invaders-style arcade action with marching aliens, shields, and mystery ships.
- **Cosmic Rocks** — Asteroids-style vector shooter with thrust physics and splitting asteroids.
- **Galaxy Blaster** — Galaga-style space shooter with formation enemies, attack patterns, and dual-shot power-up.
- **Ninja Runner** — Classic platformer with double jumps, power-ups, warp pipes, and enemies.
- **Planet Guardian** — Defender-style side-scrolling shooter with humanoid rescues and six enemy types.

## Files

- `extension.mjs` — canvas declaration, loopback game server, static asset handling, and agent actions.
- `game/` — compiled Phaser game frontend served inside the canvas.
- `assets/` — game sprites, sounds, app icon, and `preview.png` for the extensions gallery.
- `package.json` — declares the Copilot SDK dependency and ESM entry point.
- `copilot-extension.json` — Copilot extension name/version metadata.
- `canvas.json` — Awesome Copilot gallery metadata.

## Prerequisites

- **Node.js 20.19 or newer** because the Copilot SDK requires `node ^20.19.0 || >=22.12.0`.
- The GitHub Copilot app canvas / UI-extensions experiment enabled.

## Install

Drop this folder at `~/.copilot/extensions/arcade-canvas/` for user scope, or in a repository at `.github/extensions/arcade-canvas/` for project scope. Then install dependencies from inside the copied folder:

```sh
# User scope
cd ~/.copilot/extensions/arcade-canvas

# Or project scope, from the repository root
cd .github/extensions/arcade-canvas

npm install
```

Reload extensions in the GitHub Copilot app, then open the `arcade-canvas` canvas. The canvas accepts an optional `defaultGame` input with one of these keys: `cosmic-rocks`, `alien-onslaught`, `galaxy-blaster`, `ninja-runner`, or `defender`.

## Agent actions

- `list_games` — list available mini-games and the currently selected game.
- `select_game { gameKey }` — switch the open arcade canvas to a specific mini-game.
- `restart_game` — reload the open arcade canvas to restart the current game.

## Development

In the Agent Arcade repository, rebuild the committed canvas bundle after frontend or asset changes:

```sh
npm run build:canvas
```

That command builds the frontend, copies `dist/game` into `game/`, copies `dist/assets` into `assets/`, writes `assets/preview.png` for the Awesome Copilot gallery, and bundles `assets/canvas-background.webp` for the canvas-only space backdrop.

## Credits

- Sprite assets: [Simple Platformer 16](https://juhosprite.itch.io/simple-platformer-16) by JuhoSprite.
- Space shooter assets: [Space Shooter Redux](https://opengameart.org/content/space-shooter-redux) by Kenney.nl.
- Galaga-style game mechanics: [WesleyEdwards/galaga](https://github.com/WesleyEdwards/galaga) by Wesley Edwards.
- Asteroids-style game mechanics: [phaser3-typescript](https://github.com/digitsensitive/phaser3-typescript) by digitsensitive.
- Defender-style game mechanics and sound effects: [OpenDefender](https://github.com/mkinney/Opendefender) by mkinney.
- Retro game sound effects: ["Retro game sound effects"](https://opengameart.org/content/retro-game-sound-effects) by Vircon32 (Carra), published at OpenGameArt under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Thanks to [John Papa](https://github.com/johnpapa) for his Alien Onslaught game PR.
- Thanks to [Shayne Boyer](https://github.com/spboyer) for the initial PR to get Agent Arcade running in the GitHub App canvas.
