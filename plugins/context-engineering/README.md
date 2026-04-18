# Context Engineering Plugin

Tools and techniques for maximizing GitHub Copilot effectiveness through better context management. Includes guidelines for structuring code, an agent for planning multi-file changes, and prompts for context-aware development.

## Installation

```bash
# Using Copilot CLI
copilot plugin install context-engineering@awesome-copilot
```

## What's Included

### Commands (Slash Commands)

| Command | Description |
|---------|-------------|
| `/context-engineering:context-map` | Generate a map of all files relevant to a task before making changes |
| `/context-engineering:what-context-needed` | Ask Copilot what files it needs to see before answering a question |
| `/context-engineering:refactor-plan` | Plan a multi-file refactor with proper sequencing and rollback steps |

### Agents

| Agent | Description |
|-------|-------------|
| `context-architect` | An agent that helps plan and execute multi-file changes by identifying relevant context and dependencies |

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

## License

MIT
