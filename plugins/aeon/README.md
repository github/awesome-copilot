# Aeon

Set up and run an Aeon autonomous agent instance from your coding agent.

## Install

```
copilot plugin install aeon@awesome-copilot
```

## What Aeon Does

Aeon is an autonomous agent framework that runs your own skills on a schedule in GitHub Actions. A skill is a Markdown file with a prompt; `aeon.yml` decides which skills run and when.

This plugin ships the Aeon operator console skill. It is the console you drive the instance from, covering:

- **Start from scratch** - fork or mirror the framework repo, authenticate a model, wire one channel, and get a first run to your phone.
- **Enable and schedule skills** - turn skills on or off and set cron times in your own timezone.
- **Edit a skill** - change what an existing skill does, or retarget it through its `var`.
- **Debug a run** - work through why a skill did not fire (disabled, unquoted schedule, disabled Actions, wrong repo).
- **Strategy and voice** - set the `STRATEGY.md` north star and the `soul/` voice that ride in every run.
- **Chat to skill** - turn what you just did in a coding-agent chat into a scheduled skill.
- **Mine history** - surface the repeated manual work in your past coding-agent chats that is worth automating.

## Components

| Type | Name | Description |
|------|------|-------------|
| Skill | [Aeon](../../skills/aeon/) | Operator console for an Aeon agent instance: enable, schedule, and edit skills, wire secrets and channels, debug runs, and mine past coding-agent chats into scheduled skills |

## Requirements

The skill drives an Aeon instance through the `gh` CLI and the repo's `./aeon` command, so it expects the GitHub CLI installed and authenticated. Everything else (model keys, channels) is wired interactively during setup.

## Learn More

- Framework and full skill catalog: [github.com/aeonfun/aeon](https://github.com/aeonfun/aeon)
- Homepage: [aeon.fun](https://aeon.fun)

Native install in Claude Code or Codex is `/plugin marketplace add aeonfun/aeon` then `/plugin install aeon@aeon`.

## License

MIT
