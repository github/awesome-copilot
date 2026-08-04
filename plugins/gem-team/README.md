# Gem Team

**Turn AI coding into an engineering process.**

> Agent definitions that enforce good software engineering: optimizing cost, time, and quality.

<p align="center">
  <a href="https://mubaidr.github.io/gem-team/"><b>Visit Homepage</b></a>
</p>

<br/>

<p align="center">
  <img src="https://img.shields.io/badge/APM-mubaidr/gem--team-blue?style=flat-square" alt="APM package: mubaidr/gem-team">
  <img src="https://img.shields.io/github/v/release/mubaidr/gem-team?style=flat-square&color=important" alt="Latest release">
  <img src="https://img.shields.io/badge/license-Apache%202.0-green?style=flat-square" alt="Apache-2.0 license">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="Pull requests welcome">
</p>

## The Problem

Current AI coding is often one-off and ad-hoc. You get code, but you don't get a repeatable process. This leads to inconsistent quality, wasted tokens, and a lack of long-term learning.

## The Solution

Gem Team wraps your AI with a disciplined engineering delivery system. It enforces good software engineering practices automatically, so you get better results with less effort.

## Why Gem Team?

- **Quality by Default**: TDD, code reviews, and security audits happen automatically. No more "vibe coding" that breaks in production.
- **Smart & Efficient**: Optimized for fewer tokens and lower costs. Progressive context management prevents bloat and keeps your AI focused.
- **Works With Your Tools**: Seamless integration with Copilot, Claude, Cursor, Codex, Gemini, and Windsurf. Use your preferred environment.
- **Learns & Improves**: Remembers what works and extracts reusable skills. Your AI gets smarter and more efficient over time.

**TL;DR:** Gem Team turns AI coding into a structured, repeatable engineering process with built-in quality, efficiency, and learning.

## Quick Start

Install [APM](https://microsoft.github.io/apm/) first:

```bash
# macOS / Linux
curl -sSL https://aka.ms/apm-unix | sh

# Windows PowerShell
irm https://aka.ms/apm-windows | iex

# Verify
apm --version
```

Install Gem Team into your current project:

```bash
apm install mubaidr/gem-team --target copilot,claude,cursor,opencode,codex,gemini,windsurf
```

Or install for one target only:

```bash
apm install mubaidr/gem-team --target copilot
```

After the first install, commit the generated APM files that belong to your repo, especially `apm.yml`, `apm.lock.yaml`, and the generated harness directories such as `.github/`, `.claude/`, `.cursor/`, `.opencode/`, `.codex/`, `.gemini/`, or `.windsurf/`. Do **not** commit `apm_modules/`.

> APM can auto-detect targets from existing harness directories, but explicit `--target` is recommended for predictable installs and fresh repositories.

## The Process

Gem Team uses a structured workflow to turn AI coding into a reliable engineering process:

1. **Plan**: Analyze the task, break it down, and create a structured plan with verification gates.
2. **Build**: Implement features using TDD, following best practices and design patterns.
3. **Review**: Automated code reviews, security audits, and accessibility checks at every step.
4. **Learn**: Extract reusable skills and patterns from successful tasks to improve future performance.

## Features

- **Automated Quality Gates**: TDD, code reviews, and security/accessibility audits happen automatically.
- **Effortless Context**: Progressive context management prevents bloat and keeps your AI focused.
- **Smart Routing**: Tasks are automatically routed to the right agents based on complexity.
- **Reusable Knowledge**: High-confidence patterns and skills are extracted and reused for future tasks.
- **Cost Efficiency**: Model routing and output hygiene ensure you only use the tokens you need.

## How it Works

Gem Team installs a set of specialized agents that work together under the guidance of an Orchestrator. This team follows a disciplined workflow that includes planning, implementation, verification, and learning.

- **Specialist Agents**: Dedicated agents for planning, research, implementation, review, and more.
- **Orchestration**: An Orchestrator coordinates the team, ensuring tasks are completed in the right order and verified at every step.
- **Context Management**: A shared context envelope ensures every agent has the information it needs without redundant reads or wasted tokens.

### Agent Roles

| Role             | Description                                                             |
| :--------------- | :---------------------------------------------------------------------- |
| **Orchestrator** | Coordinates the workflow and ensures all tasks are completed correctly. |
| **Planner**      | Breaks down complex tasks into manageable steps.                        |
| **Implementer**  | Writes the code using TDD and best practices.                           |
| **Reviewer**     | Verifies code quality, security, and compliance with requirements.      |
| **Debugger**     | Diagnoses and fixes bugs with root-cause analysis.                      |
| **Researcher**   | Explores the codebase and finds the best patterns to use.               |

## Compatible Tools

Gem Team works with your favorite AI coding tools:

| Tool         | Harness             | Description                          |
| :----------- | :------------------ | :----------------------------------- |
| **Copilot**  | `.github/agents/`   | VS Code Copilot / GitHub Copilot CLI |
| **Claude**   | `.claude/agents/`   | Claude Code                          |
| **Cursor**   | `.cursor/agents/`   | Cursor                               |
| **OpenCode** | `.opencode/agents/` | OpenCode                             |
| **Codex**    | `.codex/agents/`    | Codex CLI                            |
| **Gemini**   | `GEMINI.md`         | Gemini CLI                           |
| **Windsurf** | `.windsurf/rules/`  | Windsurf / Cascade                   |

## Configuration

Gem Team is designed to work out of the box with smart defaults. You can customize behavior by editing the `AGENTS.md` file or specific agent definitions in the `.apm/agents/` directory.

## Learn More

- [Documentation](https://mubaidr.github.io/gem-team/)
- [Contributing](https://mubaidr.github.io/gem-team/5.resources/2.contributing.html)
- [License](LICENSE)

## Support

If you have questions or need help, please open an issue on [GitHub](https://github.com/mubaidr/gem-team/issues).
