# Agent Session Board Plugin

Supervise several Copilot sessions working one GitHub repository: a decision queue, progress by label track, merge-gate status for every PR, hourly and daily merge flow, warnings, and an optional merge-lock lane.

## Requirements

- GitHub Copilot app with canvas support
- [GitHub CLI](https://cli.github.com/) (`gh`) signed in with access to the repository you supervise

## Installation

```bash
copilot plugin install agent-session-board@awesome-copilot
```

## Usage

Open the canvas for a repository, or with sample data:

```text
open_canvas agent-session-board { "repo": "owner/name" }
open_canvas agent-session-board { "demo": true }
```

See the [extension README](../../extensions/agent-session-board/README.md) for configuration and actions.

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot).

## License

MIT
