# Signals Dashboard Plugin

Real-time Workshop dashboard with agent signals, honesty calibration, cost-aware
desk profiles (`repo` / `connected`), and fail-closed Local Delegation.

## Installation

```bash
copilot plugin install signals-dashboard@awesome-copilot
```

## Features

- Live desk signals, score bars, patterns, and escalations
- Cost-aware **open** (repo) and **connected** desk launch profiles
- **Local Delegation** toggle: when available, the frontier desk may use the
  installed `local-agent-delegation` skill for bounded read/evidence work
- Fail-closed availability (skill + qualified route receipt); no silent savings credit

## Source

Canonical implementation: [jennyf19/the-workshop](https://github.com/jennyf19/the-workshop).  
Local worker runtime: [jennyf19/sealed-delegation](https://github.com/jennyf19/sealed-delegation).

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot).

## License

MIT
