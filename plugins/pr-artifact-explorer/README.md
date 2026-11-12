# Pr Artifact Explorer Plugin

Navigate pull requests and securely explore GitHub Actions artifacts, including test results, static sites, terminal recordings, and source files.

## Installation

``bash
copilot plugin install pr-artifact-explorer@awesome-copilot
``

## What's new in 1.0.1

- **Standalone account discovery on Windows.** Opening the canvas from the Copilot app's Canvases sidebar no longer fails with "No usable GitHub account was detected" when GitHub CLI accounts are saved. The standalone runtime can omit `APPDATA`, so the GitHub CLI subprocess now falls back to the current user's `AppData\Roaming`. Existing `APPDATA`, `GH_CONFIG_DIR`, and `XDG_CONFIG_HOME` values are preserved. If Roaming AppData is redirected away from the default location, set `GH_CONFIG_DIR`.
- **Scope.** Standalone canvases receive no conversation credentials. If you are signed in only to the Copilot app and have no saved GitHub CLI account, run `gh auth login` or open the canvas from a session.

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot).

## License

MIT
