<p align="center">
  <svg width="120" height="120" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Gem Team Logo">
    <g fill="none" fill-rule="evenodd">
      <path fill="#BDDDF4" d="M13 3H7l-7 9h10z"/>
      <path fill="#5DADEC" d="M36 12l-7-9h-6l3 9z"/>
      <path fill="#4289C1" d="M26 12h10L18 33z"/>
      <path fill="#8CCAF7" d="M10 12H0l18 21zm3-9l-3 9h16l-3-9z"/>
      <path fill="#5DADEC" d="M18 33l-8-21h16z"/>
    </g>
  </svg>
</p>

# Gem Team

<p align="center">
  <img src="https://img.shields.io/badge/APM-mubaidr/gem--team-blue?style=flat-square" alt="APM">
  <img src="https://img.shields.io/github/v/release/mubaidr/gem-team?style=flat-square&color=important" alt="Version">
  <img src="https://img.shields.io/badge/License-Apache%202.0-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome">
  <img src="https://img.shields.io/badge/Maintained%3F-yes-green?style=flat-square" alt="Maintained">
</p>

Self-Learning Multi-agent orchestration framework for spec-driven development and automated verification.

> **TLDR:** Gem Team is a multi-agent framework that orchestrates LLM agents for software development tasks. It emphasizes spec-driven workflows with persistent learnings, built-in verification loops, knowledge-driven execution, and token efficiency.

> **Recommended Models:** Use a cost-efficient fast model as the default, and a stronger reasoning model for planner/debugger/critical review agents, e.g. `default=deepseek-v4-flash`, `planner,debugger,critic/reviewer=deepseek-v4-pro`. This gives you **80-90%** cost savings without sacrificing quality on complex tasks.

> **Crafted from years of personal experience** — This framework is shaped by real-world usage patterns, battle-tested and refined through countless hours of hands-on development workflows.

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

- **2x Faster** — Parallel execution with wave-based execution
- **Pattern Reuse** — Codebase pattern discovery prevents reinventing wheels
- **Context Efficiency** — Concise outputs, file-based context, and caching reduce LLM token usage by 80-90% compared to naive single-pass prompting

### Quality & Security

- **Higher Quality** — Specialized framework agents + TDD + verification gates + contract-first
- **Built-in Security** — OWASP scanning, secrets/PII detection on critical tasks
- **Resilient** — Pre-mortem analysis, failure handling, auto-replanning
- **Accessibility-First** — WCAG compliance validated at spec and runtime layers
- **Safe DevOps** — Idempotent operations, health checks, mandatory approval gates
- **Constructive Critique** — gem-critic challenges assumptions, finds edge cases

### Intelligence

- **Source Verified** — Every factual claim cites its source; no guesswork
- **Knowledge-Driven** — Prioritized sources (PRD → codebase → AGENTS.md → Context7 → docs)
- **Established Patterns** — Prefers established library/framework conventions over custom implementations
- **Continuous Learning** — Memory tool persists patterns, gotchas, user preferences across sessions/ repo etc
- **Skills & Guidelines** — Built-in special skill & guidelines (design-guidelines, debugger etc)
- **Auto-Skills** — Agents extract reusable SKILL.md files from successful tasks

### Process

- **Plan-Driven** — Multi-step refinement defines "what" before "how"
- **Contract-First** — Contract tests written before implementation
- **Verified-Plan** — Complex tasks: Plan → Verification → Critic
- **Traceable** — Self-documenting IDs link requirements → tasks → tests → evidence
- **Intent vs. Compliance** — Shifts the burden from writing "perfect prompts" to enforcing strict, YAML-based approval gates
- **Diagnose-then-Fix** — gem-debugger diagnoses → gem-implementer fixes → re-verifies
- **Resumable** — Execution can be paused and resumed without losing context
- **Scriptable** — Use scripts for deterministic, repeatable, or bulk work (data processing, mechanical transforms, migrations/codemods, generated outputs, audits/reports, validation checks, reproduction helpers)

### Token Efficiency

Optimized for reduced LLM token consumption without quality loss:

- **Concise Output** — No preamble, no meta commentary, no verbose explanations
- **File-Based** — Researcher/Planner save to YAML files (for reusable context)
- **Context Caching & Memory Management** — Self-validating cache prevents redundant work across sessions and agents

### Design

- **Design Agents** — Dedicated agents for web and mobile UI/UX with anti-"AI slop" guidelines for distinctive aesthetics
- **Mobile Agents** — Native mobile implementation (React Native, Flutter) + iOS/Android testing

---

## 🧠 Core Concepts

### The "System-IQ" Multiplier

Raw reasoning isn't enough in single-pass chat. Gem-Team wraps your preferred LLM in a rigid framework with verification-first loops, fundamentally boosting its effective capability on SWE tasks.

### Knowledge Layers

| Type             | Storage           | 1-liner                                                                                                  |
| :--------------- | :---------------- | :------------------------------------------------------------------------------------------------------- |
| **PRD**          | `docs/PRD.yaml`   | Product requirements spec — drives agent planning, implementation, and verification                      |
| **AGENTS.md**    | `AGENTS.md`       | Static conventions, rules, and agent definitions (requires approval)                                     |
| **Memory**       | memory tool       | Facts, preferences, research, diagnoses, decisions, patterns — self-validated and reused across sessions |
| **Skills**       | `docs/skills/`    | Reusable procedures with code examples, extracted from high-confidence patterns                          |
| **Derived Docs** | `docs/knowledge/` | Online documentation, LLM-generated text, and reference materials                                        |

---

Agents build these knowledge layers over time while working with you, capturing patterns, decisions, and learnings that improve future execution.

## 🏗️ Architecture

```text
User Goal
    ↓
Orchestrator
    ↓
Phase 0: Init & Clarify
    • Generate/load plan_id
    • Read memory, detect effort (LOW/MEDIUM/HIGH)
    • Route to appropriate path
    ↓
Phase 1: Route
    • Routing matrix based on effort, task type, and context
    ↓
Phase 2: Planning
    • Delegate to planner
    • Validation: MEDIUM (reviewer) / HIGH (reviewer+critic)
    • Loop on failure (max 3x)
    • Present for approval if HIGH
    ↓
Phase 3: Execution Loop
    Pre-Wave: Check memory for failure_modes/gotchas → add guards
    ↓
    ┌─ Wave Execution ──────────────┐
    │ • Delegate tasks (≤4 concurrent)│
    └─────────────┬─────────────────┘
                  ↓
    ┌─ Integration Check ──────────┐
    │ • Reviewer(wave)             │
    │ • UI: Designer(validate)     │
    │ • If fail: Debugger → retry  │
    └─────────────┬─────────────────┘
                  ↓
    ┌─ Phase 4: Persist Learnings ─┐
    │ • Collect & merge learnings  │
    │ • Memory (deduped)           │
    │ • Context Envelope update    │
    │ • Conventions → AGENTS.md    │
    │ • Decisions → PRD            │
    │ • Skills extraction          │
    └─────────────┬─────────────────┘
                  ↓
          Next wave? → No → Phase 5
                  │Yes
                  └─────────────────┘
    ↓
Phase 5: Output
    • Present final status
```

---

## 👥 The Agent Team

### Core Agents

| Agent            | Description                                                                      | Sources                        |
| :--------------- | :------------------------------------------------------------------------------- | :----------------------------- |
| **ORCHESTRATOR** | The team lead: Orchestrates research, planning, implementation, and verification | PRD, AGENTS.md                 |
| **RESEARCHER**   | Codebase exploration — patterns, dependencies, architecture discovery            | PRD, codebase, AGENTS.md, docs |
| **PLANNER**      | DAG-based execution plans — task decomposition, wave scheduling, risk analysis   | PRD, codebase, AGENTS.md       |
| **IMPLEMENTER**  | TDD code implementation — features, bugs, refactoring. Never reviews own work    | codebase, AGENTS.md, DESIGN.md |

### Quality & Review

| Role               | Description                                                                      | Sources                          |
| :----------------- | :------------------------------------------------------------------------------- | :------------------------------- |
| **REVIEWER**       | **Zero- Hallucination Filter** — Security auditing, code review, OWASP scanning  | PRD, codebase, AGENTS.md, OWASP  |
| **CRITIC**         | Challenges assumptions, finds edge cases, spots over- engineering and logic gaps | PRD, codebase, AGENTS.md         |
| **DEBUGGER**       | Root-cause analysis, stack trace diagnosis, regression bisection                 | codebase, AGENTS.md, git history |
| **BROWSER TESTER** | E2E browser testing, UI/UX validation, visual regression                         | PRD, AGENTS.md, fixtures         |
| **SIMPLIFIER**     | Refactoring specialist — removes dead code, reduces complexity                   | codebase, AGENTS.md, tests       |

### Skill Management

| Role              | Description                                                                         | Sources                              |
| :---------------- | :---------------------------------------------------------------------------------- | :----------------------------------- |
| **SKILL CREATOR** | Pattern-to-skill extraction — creates SKILL.md files from high-confidence learnings | AGENTS.md, Memory patterns, SKILL.md |

### Specialized

| Role                   | Description                                                      | Sources                  |
| :--------------------- | :--------------------------------------------------------------- | :----------------------- |
| **DEVOPS**             | Infrastructure deployment, CI/CD pipelines, container management | AGENTS.md, infra configs |
| **DOCUMENTATION**      | Technical documentation, README files, API docs, diagrams        | AGENTS.md, source code   |
| **DESIGNER**           | UI/UX design — layouts, themes, color schemes, accessibility     | PRD, codebase, AGENTS.md |
| **IMPLEMENTER-MOBILE** | Mobile implementation — React Native, Expo, Flutter              | codebase, AGENTS.md      |
| **DESIGNER-MOBILE**    | Mobile UI/UX — HIG, Material Design, safe areas                  | PRD, codebase, AGENTS.md |
| **MOBILE TESTER**      | Mobile E2E testing — Detox, Maestro, iOS/Android                 | PRD, AGENTS.md           |

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

| Tool                      | Auto-detection signal        | Where agents land   | Primitives supported                               |
| ------------------------- | ---------------------------- | ------------------- | -------------------------------------------------- |
| **VS Code** (Copilot IDE) | `.github/`                   | `.github/agents/`   | instructions, prompts, agents, skills, hooks, mcp  |
| **GitHub Copilot CLI**    | `.github/`                   | `.github/agents/`   | instructions, prompts, agents, skills, hooks, mcp  |
| **Cursor**                | `.cursor/` or `.cursorrules` | `.cursor/agents/`   | instructions, agents, skills, commands, hooks, mcp |
| **OpenCode**              | `.opencode/`                 | `.opencode/agents/` | agents, commands, skills, mcp                      |
| **Codex CLI**             | `.codex/`                    | `.codex/agents/`    | agents, skills, hooks, mcp                         |
| **Windsurf**              | `.windsurf/`                 | `.windsurf/skills/` | instructions, agents, skills, commands, hooks, mcp |

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
