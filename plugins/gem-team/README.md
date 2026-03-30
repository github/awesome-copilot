# Gem Team

> A modular, high-performance multi-agent orchestration framework for complex project execution, feature implementation, and automated verification.

[![Copilot Plugin](https://img.shields.io/badge/Plugin-Awesome%20Copilot-0078D4?style=flat-square&logo=microsoft)](https://awesome-copilot.github.com/plugins/#file=plugins%2Fgem-team)
![Version](https://img.shields.io/badge/Version-1.4.0-6366f1?style=flat-square)

## Installation

```bash
# Using Copilot CLI
copilot plugin install gem-team@awesome-copilot
```

> **[Install Gem Team Now →](https://aka.ms/awesome-copilot/install/agent?url=vscode%3Achat-agent%2Finstall%3Furl%3Dhttps%253A%252F%252Fraw.githubusercontent.com%252Fgithub%252Fawesome-copilot%252Fmain%252F.%252Fagents)**

---

## Features

- **TDD (Red-Green-Refactor)** — Tests first → fail → minimal code → refactor → verify
- **Security-First Review** — OWASP scanning, secrets/PII detection
- **Pre-Mortem Analysis** — Failure modes identified BEFORE execution
- **Intent Capture** — Discuss phase locks user intent before planning
- **Approval Gates** — Security + deployment approval for sensitive ops
- **Multi-Browser Testing** — Chrome MCP, Playwright, Agent Browser support
- **Sequential Thinking** — Chain-of-thought for complex analysis
- **Codebase Pattern Discovery** — Avoids reinventing the wheel

---

## The Agent Team

| Agent | Role | Description |
| :--- | :--- | :--- |
| `gem-orchestrator` | **ORCHESTRATOR** | Team Lead — Coordinates multi-agent workflows, delegates tasks, synthesizes results. Detects phase, routes to agents, manages Discuss Phase, PRD creation, and multi-plan selection. |
| `gem-researcher` | **RESEARCHER** | Research specialist — Gathers codebase context, identifies relevant files/patterns, returns structured findings. Uses complexity-based proportional effort (1-3 passes). |
| `gem-planner` | **PLANNER** | Creates DAG-based plans with pre-mortem analysis and task decomposition. Calculates plan metrics for multi-plan selection. |
| `gem-implementer` | **IMPLEMENTER** | Executes TDD code changes, ensures verification, maintains quality. Includes online research tools (Context7, tavily_search). |
| `gem-browser-tester` | **BROWSER TESTER** | Automates E2E scenarios with Chrome DevTools MCP, Playwright, Agent Browser. UI/UX validation with visual verification techniques. |
| `gem-devops` | **DEVOPS** | Manages containers, CI/CD pipelines, and infrastructure deployment. Handles approval gates with user confirmation. |
| `gem-reviewer` | **REVIEWER** | Security gatekeeper — OWASP scanning, secrets detection, compliance. PRD compliance verification and wave integration checks. |
| `gem-documentation-writer` | **DOCUMENTATION WRITER** | Generates technical docs, diagrams, maintains code-documentation parity. |

---

## Core Workflow

The Orchestrator follows a 4-Phase workflow:

1. **Discuss Phase** — Requirements clarification, intent capture
2. **Research** — Complexity-aware codebase exploration
3. **Planning** — DAG-based plans with pre-mortem analysis
4. **Execution** — Wave-based parallel agent execution with verification gates

---

## Knowledge Sources

All agents consult these sources in priority order:

- `docs/PRD.yaml` — Product requirements
- Codebase patterns — Semantic search
- `AGENTS.md` — Team conventions
- Context7 — Library documentation
- Official docs & online search

---

## Why Gem Team?

- **10x Faster** — Parallel execution eliminates bottlenecks
- **Higher Quality** — Specialized agents + TDD + verification gates
- **Built-in Security** — OWASP scanning on critical tasks
- **Full Visibility** — Real-time status, clear approval gates
- **Resilient** — Pre-mortem analysis, failure handling, auto-replanning

---

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.
