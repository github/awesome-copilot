# Token Pac-Man

A GitHub Copilot canvas that visualizes live session AI-credit usage as a Pac-Man board. Pac-Man eats pellets as credits are consumed, ghosts chase him, fruit milestones appear, and the game ends when the configured session credit limit is exceeded.

## Files

- `extension.mjs` - canvas declaration, loopback server, live usage/quota syncing, and agent actions.
- `assets/preview.png` - gallery preview image required by the Awesome Copilot canvas catalog.
- `assets/token-pacman.jpg` - source screenshot included for the gallery.
- `copilot-extension.json` - Copilot extension name/version metadata for gist installs.
- `canvas.json` - Awesome Copilot gallery metadata.
- `package.json` - extension metadata used by the generated website catalog.

## Install

Ask Copilot to install the committed extension URL:

```text
Install this extension: https://github.com/github/awesome-copilot/tree/main/extensions/token-pacman
```

The shared gist version is also available at:

```text
https://gist.github.com/jamesmontemagno/75d701d25f49c94ba332529fb8ec1346
```

## Agent actions

- `sync_usage` - refresh the canvas from the active session's accumulated AI-credit usage and plan entitlement.
- `set_limit { limit }` - set the AI-credit limit that triggers game over and resync the pellet board.
- `reset_run` - clear the visible fruit streak and start a fresh chase without changing the live session credit total.
