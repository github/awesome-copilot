# Juvina Memory Plugin

Persistent, team-shared memory for Copilot agents — encode decisions and recall project knowledge across repositories, sessions, and time via the Juvina memory engine's MCP tools.

## Installation

```bash
# Using Copilot CLI
copilot plugin install juvina-memory@awesome-copilot
```

## What's Included

### Skills

| Skill | Description |
|-------|-------------|
| `juvina-memory` | Encode team decisions and recall project knowledge from a persistent Juvina memory environment via the `juvina_recall` and `juvina_encode` MCP tools |

## Requirements

This plugin requires a running Juvina memory engine exposing the `juvina_recall` and
`juvina_encode` MCP tools. The engine installs via the free Juvina Light VS Code
extension ([juvina.ai](https://juvina.ai)) and runs locally: memory is stored locally on
the machine running the engine, and model calls go to your own endpoint on your own key.

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

## License

MIT
