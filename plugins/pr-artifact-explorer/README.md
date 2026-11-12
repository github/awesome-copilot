# Pr Artifact Explorer Plugin

Navigate pull requests and securely explore GitHub Actions artifacts, including test results, static sites, terminal recordings, and source files.

## Installation

``bash
copilot plugin install pr-artifact-explorer@awesome-copilot
``

## What's new in 1.0.1

- **Standalone account discovery.** On Windows, recover a missing `APPDATA` from the current user's Windows Roaming folder when safe, including redirected folders. On macOS and Linux, recover a missing `HOME` when an absolute OS home is available. Explicit GitHub CLI configuration and existing home configuration are preserved.
- **Account isolation and recovery.** GitHub Enterprise credentials are excluded from GitHub.com account probes. The accounts view reports discovery problems and can rescan after sign-in.
- **Scope.** Standalone canvases may not receive conversation credentials. If you are signed in only to the Copilot app and have no saved GitHub CLI account, run `gh auth login --hostname github.com` or open the canvas from a session. User-scoped extension copies must be updated separately from installed plugins.

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot).

## License

MIT
