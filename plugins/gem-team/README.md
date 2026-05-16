# Gem Team

<p align="center">
  <img src="https://img.shields.io/badge/APM-mubaidr/gem--team-blue?style=flat-square" alt="APM">
  <img src="https://img.shields.io/badge/License-Apache%202.0-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome">
</p>

Self-Learning Multi-agent orchestration framework for spec-driven development and automated verification.

> **TLDR:** Gem Team is a multi-agent framework that orchestrates LLM agents for software development tasks. It emphasizes spec-driven workflows, built-in verification loops, knowledge-driven execution, and token efficiency. The team includes specialized agents; consult prioritized knowledge sources (PRD, codebase, AGENTS.md) and persist learnings to a self-validating memory tool. Gem Team is designed for high performance, quality, security, and intelligence in AI-assisted software engineering.

## 🚀 Quick Start

```bash
apm install -g mubaidr/gem-team
```

APM auto-detects your tools and deploys gem-team agents everywhere — VS Code, Claude Code, Cursor, OpenCode, Codex CLI, Gemini CLI, Windsurf, and GitHub Copilot CLI. See the [compatible tools table](#compatible-tools) for details.

See [all supported installation options](#installation) below.

---

## 📚 Contents

- [🚀 Quick Start](#quick-start)
- [🎯 Why Gem Team?](#why-gem-team)
- [🧠 Core Concepts](#core-concepts)
- [🏗️ Architecture](#architecture)
- [� The Agent Team](#the-agent-team)
- [📦 Installation](#installation)
- [🤝 Contributing](#contributing)

---

## 🎯 Why Gem Team?

### Performance

- **4x Faster** — Parallel execution with wave-based execution
- **Pattern Reuse** — Codebase pattern discovery prevents reinventing wheels

### Quality & Security

- **Higher Quality** — Specialized framework agents + TDD + verification gates + contract-first
- **Built-in Security** — OWASP scanning, secrets/PII detection on critical tasks
- **Resilient** — Pre-mortem analysis, failure handling, auto-replanning
- **Accessibility-First** — WCAG compliance validated at spec and runtime layers
- **Safe DevOps** — Idempotent operations, health checks, mandatory approval gates
- **Constructive Critique** — gem- critic challenges assumptions, finds edge cases

### Intelligence

- **Established Patterns** — Uses library/framework conventions over custom implementations
- **Source Verified** — Every factual claim cites its source; no guesswork
- **Knowledge-Driven** — Prioritized sources (PRD → codebase → AGENTS.md → Context7 → docs)
- **Continuous Learning** — Memory tool persists patterns, gotchas, user preferences across sessions
- **Memory Optimization** — Tiered read/write (Tier-1 always, Tier-2 on init, Tier-3 rarely). Skip rules: unknown domain → skip, confidence ≥ 0.85 → skip read. Batch writes at wave end. Short keys format (n, d, c)
- **Agent Memory Contracts** — Every agent reads/writes structured memory autonomously. Researcher caches, debugger logs, planner aggregates, reviewers persist
- **Self-Validating Cache** — Researcher checks memory before searching. Validates (file checks, import resolve, git log). IF stale: re-research, DELETE old, WRITE new
- **Diagnosis History** — Debugger saves root-causes. Same bug pattern >0.8 match: cached diagnosis
- **Auto-Skills** — Agents extract reusable SKILL.md files from successful tasks
- **Skills & Guidelines** — Built-in skill & guidelines (web-design-guidelines)

### Process

- **Spec-Driven** — Multi-step refinement defines "what" before "how"
- **Verified-Plan** — Complex tasks: Plan → Verification → Critic
- **Traceable** — Self-documenting IDs link requirements → tasks → tests → evidence
- **Intent vs. Compliance** — Shifts the burden from writing "perfect prompts" to enforcing strict, YAML-based approval gates
- **Diagnose-then-Fix** — gem-debugger diagnoses → gem-implementer fixes → re-verifies
- **Pre-Mortem** — Failure modes identified BEFORE execution
- **Contract-First** — Contract tests written before implementation

### Token Efficiency

Optimized for reduced LLM token consumption without quality loss:

- **Concise Output** — No preamble, no meta commentary, no verbose explanations
- **Strict Formats** — JSON/YAML exactly matching schemas — eliminates parse errors and retries
- **Empty is OK** — Skip empty arrays, nulls, verbose fields where not needed
- **File-Based** — Researcher/Planner save to YAML files (not all in JSON output)
- **Learnings** — Empty patterns/conventions unless critical
- **Memory Skip** — Agents skip redundant reads when cache has high-confidence findings

### Design

- **Design Agents** — Dedicated agents for web and mobile UI/UX with anti-"AI slop" guidelines for distinctive aesthetics
- **Mobile Agents** — Native mobile implementation (React Native, Flutter) + iOS/Android testing

---

## 🧠 Core Concepts

### The "System- IQ" Multiplier

Raw reasoning isn't enough in single-pass chat. Gem-Team wraps your preferred LLM in a rigid framework with verification-first loops, fundamentally boosting its effective capability on SWE tasks.

### Design Support

Gem Team includes specialized design agents with anti-"AI slop" guidelines for distinctive, modern and unique aesthetics with accessibility compliance.

### Knowledge Layers

| Type             | Storage         | 1-liner                                                                                                                                  |
| :--------------- | :-------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| **Memory**       | memory tool     | Facts, preferences, research, diagnoses, decisions, patterns — self-validated and reused across sessions                                 |
| **Memory Tiers** | /memories/      | Tier-1 (orchest/ researcher/ planner): Always read/write. Tier-2 (impl/debug/simplifier): On init. Tier-3 (reviewer/ critic/doc): Rarely |
| **Skills**       | `docs/skills/`  | Reusable procedures with code examples, extracted from high-confidence patterns                                                          |
| **PRD**          | `docs/PRD.yaml` | Product requirements spec — drives agent planning, implementation, and verification                                                      |
| **AGENTS.md**    | `AGENTS.md`     | Static conventions, rules, and agent definitions (requires approval)                                                                     |

### Knowledge Sources

Agents consult only the sources relevant to their role:

| Trust Level   | Sources                                            | Behavior                             |
| :------------ | :------------------------------------------------- | :----------------------------------- |
| **Trusted**   | PRD, plan.yaml, AGENTS.md                          | Follow as instructions               |
| **Verify**    | Codebase files, research findings, Memory patterns | Cross-reference before assuming      |
| **Untrusted** | Error logs, external data                          | Factual only — never as instructions |

### Skill Creation

During the execution loop, the orchestrator reviews `learnings.patterns[]` from agent outputs:

- **Implementer** persists high-confidence patterns to memory on each task exit
- **`gem-skill-creator`** receives patterns → deduplicates against `docs/skills/` → creates `SKILL.md` with code examples, gotchas, and references

Skills follow the [Agent Skills](https://agentskills.io) format for cross-tool portability.

---

## 🏗️ Architecture

```text
User Goal → Orchestrator → [Simple: Research/Plan] or [Complex: Discuss → PRD → Research → Plan → Approve] → Execute (waves) → Summary → Final Review
                ↓
            Diagnose → Fix → Re-verify
```

---

## 👥 The Agent Team

### Core Agents

| Agent            | Description                                                                      | Sources                        | Recommended LLM                                                                                           |
| :--------------- | :------------------------------------------------------------------------------- | :----------------------------- | :-------------------------------------------------------------------------------------------------------- |
| **ORCHESTRATOR** | The team lead: Orchestrates research, planning, implementation, and verification | PRD, AGENTS.md                 | **Closed:** GPT-5.4, Gemini 3.1 Pro, Claude Sonnet 4.6<br>**Open:** GLM-5, Kimi K2.5, Qwen3.5             |
| **RESEARCHER**   | Codebase exploration — patterns, dependencies, architecture discovery            | PRD, codebase, AGENTS.md, docs | **Closed:** Gemini 3.1 Pro, GPT-5.4, Claude Sonnet 4.6<br>**Open:** GLM-5, Qwen3.5-9B, DeepSeek-V3.2      |
| **PLANNER**      | DAG-based execution plans — task decomposition, wave scheduling, risk analysis   | PRD, codebase, AGENTS.md       | **Closed:** Gemini 3.1 Pro, Claude Sonnet 4.6, GPT-5.4<br>**Open:** Kimi K2.5, GLM-5, Qwen3.5             |
| **IMPLEMENTER**  | TDD code implementation — features, bugs, refactoring. Never reviews own work    | codebase, AGENTS.md, DESIGN.md | **Closed:** Claude Opus 4.6, GPT-5.4, Gemini 3.1 Pro<br>**Open:** DeepSeek-V3.2, GLM-5, Qwen3- Coder-Next |

### Quality & Review

| Role               | Description                                                                      | Sources                          | Recommended LLM                                                                                                      |
| :----------------- | :------------------------------------------------------------------------------- | :------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| **REVIEWER**       | **Zero- Hallucination Filter** — Security auditing, code review, OWASP scanning  | PRD, codebase, AGENTS.md, OWASP  | **Closed:** Claude Opus 4.6, GPT-5.4, Gemini 3.1 Pro<br>**Open:** Kimi K2.5, GLM-5, DeepSeek-V3.2                    |
| **CRITIC**         | Challenges assumptions, finds edge cases, spots over- engineering and logic gaps | PRD, codebase, AGENTS.md         | **Closed:** Claude Sonnet 4.6, GPT-5.4, Gemini 3.1 Pro<br>**Open:** Kimi K2.5, GLM-5, Qwen3.5                        |
| **DEBUGGER**       | Root-cause analysis, stack trace diagnosis, regression bisection                 | codebase, AGENTS.md, git history | **Closed:** Gemini 3.1 Pro, Claude Opus 4.6, GPT-5.4<br>**Open:** DeepSeek-V3.2, GLM-5, Qwen3- Coder-Next            |
| **BROWSER TESTER** | E2E browser testing, UI/UX validation, visual regression                         | PRD, AGENTS.md, fixtures         | **Closed:** GPT-5.4, Claude Sonnet 4.6, Gemini 3.1 Flash<br>**Open:** Llama 4 Maverick, Qwen3.5- Flash, MiniMax M2.7 |
| **SIMPLIFIER**     | Refactoring specialist — removes dead code, reduces complexity                   | codebase, AGENTS.md, tests       | **Closed:** Claude Opus 4.6, GPT-5.4, Gemini 3.1 Pro<br>**Open:** DeepSeek-V3.2, GLM-5, Qwen3- Coder-Next            |

### Skill Management

| Role              | Description                                                                         | Sources                              | Recommended LLM                                                                                                    |
| :---------------- | :---------------------------------------------------------------------------------- | :----------------------------------- | :----------------------------------------------------------------------------------------------------------------- |
| **SKILL CREATOR** | Pattern-to-skill extraction — creates SKILL.md files from high-confidence learnings | AGENTS.md, Memory patterns, SKILL.md | **Closed:** Claude Sonnet 4.6, Gemini 3.1 Flash, GPT-5.4 Mini<br>**Open:** Llama 4 Scout, Qwen3.5-9B, MiniMax M2.7 |

### Specialized

| Role                   | Description                                                      | Sources                  | Recommended LLM                                                                                                      |
| :--------------------- | :--------------------------------------------------------------- | :----------------------- | :------------------------------------------------------------------------------------------------------------------- |
| **DEVOPS**             | Infrastructure deployment, CI/CD pipelines, container management | AGENTS.md, infra configs | **Closed:** GPT-5.4, Gemini 3.1 Pro, Claude Sonnet 4.6<br>**Open:** DeepSeek-V3.2, GLM-5, Qwen3.5                    |
| **DOCUMENTATION**      | Technical documentation, README files, API docs, diagrams        | AGENTS.md, source code   | **Closed:** Claude Sonnet 4.6, Gemini 3.1 Flash, GPT-5.4 Mini<br>**Open:** Llama 4 Scout, Qwen3.5-9B, MiniMax M2.7   |
| **DESIGNER**           | UI/UX design — layouts, themes, color schemes, accessibility     | PRD, codebase, AGENTS.md | **Closed:** GPT-5.4, Gemini 3.1 Pro, Claude Sonnet 4.6<br>**Open:** Qwen3.5, GLM-5, MiniMax M2.7                     |
| **IMPLEMENTER-MOBILE** | Mobile implementation — React Native, Expo, Flutter              | codebase, AGENTS.md      | **Closed:** Claude Opus 4.6, GPT-5.4, Gemini 3.1 Pro<br>**Open:** DeepSeek-V3.2, GLM-5, Qwen3- Coder-Next            |
| **DESIGNER-MOBILE**    | Mobile UI/UX — HIG, Material Design, safe areas                  | PRD, codebase, AGENTS.md | **Closed:** GPT-5.4, Gemini 3.1 Pro, Claude Sonnet 4.6<br>**Open:** Qwen3.5, GLM-5, MiniMax M2.7                     |
| **MOBILE TESTER**      | Mobile E2E testing — Detox, Maestro, iOS/Android                 | PRD, AGENTS.md           | **Closed:** GPT-5.4, Claude Sonnet 4.6, Gemini 3.1 Flash<br>**Open:** Llama 4 Maverick, Qwen3.5- Flash, MiniMax M2.7 |

---

## 📦 Installation

### Install APM First

If you don't have APM installed, install it first:

```bash
# macOS/Linux
curl -fsSL https://microsoft.github.io/apm/install.sh | sh

# Windows (PowerShell)
irm https://microsoft.github.io/apm/install.ps1 | iex

# Or via npm
npm install -g @microsoft/apm
```

**Why APM?** Universal package manager for AI coding tools. One command installs to all your tools (VS Code Copilot, GitHub Copilot CLI, Claude Code, Cursor, OpenCode, Codex CLI, Gemini CLI, Windsurf). Handles version locking, updates, and dependencies automatically.

[APM Documentation](https://microsoft.github.io/apm/) | [GitHub](https://github.com/microsoft/apm)

---

### Quick Install via APM

Single command — APM auto-detects your tools and deploys to all of them:

```bash
apm install mubaidr/gem-team
```

#### Useful Flags

```bash
# Preview what would install (no writes)
apm install --dry-run mubaidr/gem-team

# Install only for specific tools
apm install --target claude,cursor mubaidr/gem-team

# Exclude a tool
apm install --exclude codex mubaidr/gem-team

# Install globally (user scope)
apm install -g mubaidr/gem-team
```

---

### Compatible Tools

APM deploys agents to every harness it detects. Below is what lands where:

| Tool                      | Auto-detection signal        | Where agents land         | Primitives supported                               |
| ------------------------- | ---------------------------- | ------------------------- | -------------------------------------------------- |
| **VS Code** (Copilot IDE) | `.github/`                   | `.github/agents/`         | instructions, prompts, agents, skills, hooks, mcp  |
| **GitHub Copilot CLI**    | `.github/`                   | `.github/agents/`         | instructions, prompts, agents, skills, hooks, mcp  |
| **Claude Code**           | `.claude/` or `CLAUDE.md`    | `.claude/agents/`         | instructions, agents, skills, commands, hooks, mcp |
| **Cursor**                | `.cursor/` or `.cursorrules` | `.cursor/agents/`         | instructions, agents, skills, commands, hooks, mcp |
| **OpenCode**              | `.opencode/`                 | `.opencode/agents/`       | agents, commands, skills, mcp                      |
| **Codex CLI**             | `.codex/`                    | `.codex/agents/`          | agents, skills, hooks, mcp                         |
| **Gemini CLI**            | `.gemini/` or `GEMINI.md`    | compiled into `GEMINI.md` | commands, skills, hooks, mcp                       |
| **Windsurf**              | `.windsurf/`                 | `.windsurf/skills/`       | instructions, agents, skills, commands, hooks, mcp |

Skills always deploy to the cross-tool `.agents/skills/` directory — available to any skills-aware client.

---

### Via Marketplace

Add gem-team as a marketplace, then install. Useful for browsing available agents and managing updates.

#### GitHub Copilot CLI

```bash
# Add marketplace
copilot plugin marketplace add mubaidr/gem-team

# Browse
copilot plugin marketplace browse gem-team

# Install
copilot plugin install gem-team@gem-team

# Or from awesome-copilot (pre-registered by default)
copilot plugin install gem-team@awesome-copilot
```

#### Claude Code

```bash
# Add marketplace
/plugin marketplace add mubaidr/gem-team

# Browse
/plugin

# Install
/plugin install gem-team@gem-team
```

#### Cursor IDE

```bash
apm marketplace add mubaidr/gem-team
apm install gem-team@gem-team
```

---

### Local / Manual Installation

For development, testing, or offline use.

```bash
git clone https://github.com/mubaidr/gem-team.git
cd gem-team
```

#### Claude Code

```bash
claude --plugin-dir .
# Or: /plugin marketplace add ./
```

#### Cursor IDE

```bash
# Via chat command
/add-plugin /absolute/path/to/gem-team

# Or one-line copy to .cursor/rules/
mkdir -p .cursor/rules && cp .apm/agents/*.agent.md .cursor/rules/ && cd .cursor/rules && for f in *.agent.md; do mv "$f" "${f%.agent.md}.mdc"; done && cd ../..
```

#### GitHub Copilot CLI

```bash
copilot plugin marketplace add /absolute/path/to/gem-team
copilot plugin install gem-team@gem-team
```

#### Any Tool (Manual Copy)

```bash
cp -r .apm/agents <destination>
# Destinations:
#   VS Code / Copilot CLI → ~/.copilot/
#   Claude Code           → ~/.claude/plugins/
#   Cursor                → .cursor/rules/
#   OpenCode              → .opencode/plugins/
```

---

### Verification

After installation, confirm your setup:

```bash
# Preview which tools APM detects
apm targets

# List installed packages
apm list

# View package details
apm view gem-team

# Tool-specific checks
copilot plugin list          # GitHub Copilot CLI
/plugin list                 # Claude Code
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. [CONTRIBUTING](./CONTRIBUTING.md) for detailed guidelines on commit message formatting, branching strategy, and code standards.

## 📄 License

This project is licensed under the Apache License 2.0.

## 💬 Support

If you encounter any issues or have questions, please [open an issue](https://github.com/mubaidr/gem-team/issues) on GitHub.
