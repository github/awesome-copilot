# Open Source Sponsorship Plugin

Tools and resources for Open Source Program Offices (OSPOs) to identify, evaluate, and manage sponsorship of open source dependencies through GitHub Sponsors, Open Collective, and other funding platforms.

## Installation

```bash
# Using Copilot CLI
copilot plugin install ospo-sponsorship@awesome-copilot
```

## What's Included

### Skills

| Skill | Description |
|-------|-------------|
| `SKILL.md` | Find which of a GitHub repository's dependencies are sponsorable via GitHub Sponsors. Uses deps.dev API for dependency resolution across npm, PyPI, Cargo, Go, RubyGems, Maven, and NuGet. Checks npm funding metadata, FUNDING.yml files, and web search. Verifies every link. Shows direct and transitive dependencies with OSSF Scorecard health data. Invoke by providing a GitHub owner/repo (e.g. "find sponsorable dependencies in expressjs/express"). |

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

## License

MIT
