# Gem Team Multi-Agent Orchestration Plugin

A modular multi-agent team for complex project execution with Discuss Phase for requirements clarification, PRD creation, DAG-based planning, complexity-aware research, multi-plan selection for critical tasks, wave-based parallel execution, PRD compliance verification, and automated testing.

## Installation

```bash
# Using Copilot CLI
copilot plugin install gem-team@awesome-copilot
```

## What's Included

### Agents

| Agent | Description |
|-------|-------------|
| `gem-orchestrator` | Team Lead - Coordinates multi-agent workflows with energetic announcements, delegates tasks, synthesizes results via runSubagent. Detects phase, routes to agents, manages Discuss Phase, PRD creation, and multi-plan selection. |
| `gem-researcher` | Research specialist - gathers codebase context, identifies relevant files/patterns, returns structured findings. Uses complexity-based proportional effort (1-3 passes). |
| `gem-planner` | Creates DAG-based plans with pre-mortem analysis and task decomposition from research findings. Calculates plan metrics for multi-plan selection. |
| `gem-implementer` | Executes TDD code changes, ensures verification, maintains quality. Includes online research tools (Context7, tavily_search). |
| `gem-browser-tester` | Automates E2E scenarios with Chrome DevTools MCP, Playwright, Agent Browser. UI/UX validation using browser automation tools and visual verification techniques. |
| `gem-devops` | Manages containers, CI/CD pipelines, and infrastructure deployment. Handles approval gates with user confirmation. |
| `gem-reviewer` | Security gatekeeper for critical tasks—OWASP, secrets, compliance. Includes PRD compliance verification and wave integration checks. |
| `gem-documentation-writer` | Generates technical docs, diagrams, maintains code-documentation parity. |

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

## License

MIT
