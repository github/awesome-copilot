# Gem Team Multi-Agent Orchestration Plugin

A modular multi-agent team for complex project execution with DAG-based planning, parallel execution, TDD verification, and automated testing.

## Installation

```bash
# Using Copilot CLI
copilot plugin install gem-team@awesome-copilot
```

## What's Included

### Agents

| Agent | Description |
|-------|-------------|
| `gem-orchestrator` | Coordinates multi-agent workflows, delegates tasks, synthesizes results via runSubagent |
| `gem-researcher` | Research specialist: gathers codebase context, identifies relevant files/patterns, returns structured findings |
| `gem-planner` | Creates DAG-based plans with pre-mortem analysis and task decomposition from research findings |
| `gem-implementer` | Executes TDD code changes, ensures verification, maintains quality |
| `gem-chrome-tester` | Automates browser testing, UI/UX validation via Chrome DevTools |
| `gem-devops` | Manages containers, CI/CD pipelines, and infrastructure deployment |
| `gem-reviewer` | Security gatekeeper for critical tasks—OWASP, secrets, compliance |
| `gem-documentation-writer` | Generates technical docs, diagrams, maintains code-documentation parity |

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

## License

MIT
