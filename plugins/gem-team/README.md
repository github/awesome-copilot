# Gem Team

<p align="center">
  <img src="https://img.shields.io/badge/APM-mubaidr/gem--team-blue?style=flat-square" alt="APM package: mubaidr/gem-team">
  <img src="https://img.shields.io/github/v/release/mubaidr/gem-team?style=flat-square&color=important" alt="Latest release">
  <img src="https://img.shields.io/badge/license-Apache%202.0-green?style=flat-square" alt="Apache-2.0 license">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="Pull requests welcome">
</p>

Turn AI coding into an orchestrated loop: plan, build, review, debug.

> Spec-driven multi-agent orchestration for software development, verification, debugging, and reusable project knowledge.

**TL;DR:** Gem Team installs a coordinated set of specialist AI agents for planning, implementation, review, debugging, testing, documentation, design, DevOps, and skill extraction. It is designed for structured software delivery: clarify the goal, discover existing patterns, plan the work, execute in controlled waves, verify results, and persist useful learnings.

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

## Contents

- [Why Gem Team?](#why-gem-team)
- [Comparison](#comparison)
- [Core Concepts](#core-concepts)
- [Workflow](#workflow)
- [The Agent Team](#the-agent-team)
- [Installation](#installation)
- [Compatible Tools](#compatible-tools)
- [Configuration](#configuration)
- [Operational Notes](#operational-notes)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

## Why Gem Team?

### Better delivery flow

- **Spec-driven execution** — turns goals into scoped plans, tasks, checks, and evidence.
- **Wave-based execution** — runs independent work in parallel while serializing true dependencies.
- **Verification loops** — uses reviewers, testers, critics, and debuggers before final output.
- **Resumable plans** — plan IDs, task artifacts, and context files make long tasks easier to pause, inspect, and continue.

### Better code quality

- **Specialist agents** — planning, implementation, debugging, review, testing, documentation, design, and DevOps are handled by focused roles.
- **Pattern reuse** — researchers inspect the codebase first so agents follow existing architecture instead of inventing new patterns.
- **Contract-first mindset** — encourages requirements, API contracts, tests, and acceptance criteria before implementation.
- **Security-aware reviews** — reviewer and DevOps roles check for common security, secrets, PII, and deployment risks.

### Better context management

- **Context envelope** — stores the active project summary, constraints, architecture notes, task registry, prior decisions, and reusable findings.
- **File-based knowledge** — important outputs are written to durable files instead of being trapped in a single chat turn.
- **Skill extraction** — high-confidence repeated workflows can become reusable `SKILL.md` playbooks.
- **Memory discipline** — durable learnings are persisted only when useful and sufficiently reliable.

### Better cost control

- **Model routing** — routine agents can use a fast cost-efficient model while planner, debugger, critic, and reviewer roles can use stronger reasoning models.
- **Reduced redundant reading** — the context envelope and research digest prevent repeated source reads.
- **Concise agent outputs** — agents are instructed to return actionable artifacts rather than verbose commentary.

## Comparison

gem-team is not trying to replace Copilot, Cursor, Claude Code, Cline, or Roo Code.

It focuses on the missing workflow layer:

- planning
- subagent delegation first policy for parallel work
- context envelope for avoiding repeated source reads
- reviewer/debugger loops
- specialist agents
- repeatable execution artifacts

Use gem-team when you want AI coding to follow an engineering process instead of a single chat prompt.

Vibe with confident, structured delivery and durable knowledge instead of ad-hoc one-off outputs.

## Core Concepts

### System-IQ multiplier

Gem Team wraps your chosen model with a disciplined delivery system: task classification, planning, delegation, verification, debugging, and learning. The goal is to improve the reliability of agentic software work without depending on a single long prompt.

### Knowledge layers

| Layer              | Location                         | Purpose                                                                    |
| :----------------- | :------------------------------- | :------------------------------------------------------------------------- |
| **PRD**            | `docs/PRD.yaml`                  | Product requirements and approved decisions.                               |
| **AGENTS.md**      | `AGENTS.md`                      | Stable project conventions, rules, and agent instructions.                 |
| **Plan artifacts** | `docs/plan/{plan_id}/`           | Per-task plans, context envelopes, task registries, evidence, and results. |
| **Memory**         | Memory tool / configured backend | Durable facts, decisions, gotchas, patterns, and failure modes.            |
| **Skills**         | `docs/skills/`                   | Reusable procedures extracted from successful repeated workflows.          |
| **Derived docs**   | `docs/knowledge/`                | Reference notes, external docs, summaries, and research outputs.           |

## Workflow

### Architecture Flow

### Execution Model

Gem Team adapts workflow depth to task complexity:

- **TRIVIAL:** direct execution with a tiny checklist.
- **LOW:** lightweight in-memory planning and execution.
- **MEDIUM/HIGH:** durable planning, context envelope, validation, wave execution, and integration review.

The system batches independent work, serializes only true dependencies, and persists high-confidence learnings for future runs.

```text
User Input
    ↓
Phase 0: Init & Clarify
    • Read provided context
    • Load config and relevant memory
    • Detect intent and plan state
    • Classify complexity
    • Ask only for blocking clarification
    ↓
Phase 1: Route
    • Continue existing plan
    • Revise existing plan
    • Start new task
    ↓
Phase 2: Plan
    • TRIVIAL → tiny checklist
    • LOW → lightweight in-memory plan
    • MEDIUM/HIGH → durable planner-generated plan
    • Validate higher-risk plans before execution
    ↓
Phase 3: Execute
    • Prepare context based on complexity
    • Run unblocked work in waves
    • Delegate tasks to suitable agents
    • Respect dependencies and conflicts
    • Review/integrate higher-risk waves
    ↓
Learn & Persist
    • Save reusable decisions, patterns, gotchas, and skills
    • Update memory, docs, PRD, AGENTS.md, or skills as appropriate
    ↓
Loop / Replan
    • Continue next wave
    • Replan if scope changes
    • Escalate if blocked
    ↓
Phase 4: Output
    • Present final status using configured output format
```

## The Agent Team

### Recommended model routing

Use a fast cost-efficient model as the default and reserve stronger reasoning models for tasks that need deeper analysis.

| Role                                    | Example model                   | Recommended use                                                                                |
| :-------------------------------------- | :------------------------------ | :--------------------------------------------------------------------------------------------- |
| **Default agents**                      | `mimoi-2.5/deepseek-v4-flash`   | Routine implementation, documentation, research summaries, and simple checks.                  |
| **Planner, Debugger, Critic, Reviewer** | `mimoi-2.5-pro/deepseek-v4-pro` | Planning, root-cause analysis, compliance checks, critical review, and high-risk verification. |

Replace these with equivalent models from your own provider if needed.

### Core agents

| Agent            | Description                                                                              |
| :--------------- | :--------------------------------------------------------------------------------------- |
| **ORCHESTRATOR** | Coordinates the workflow, delegates work, tracks plans, and enforces verification gates. |
| **RESEARCHER**   | Explores the codebase, dependencies, architecture, existing patterns, and relevant docs. |
| **PLANNER**      | Creates DAG-based execution plans, task waves, risk notes, and acceptance criteria.      |
| **IMPLEMENTER**  | Implements features, fixes, refactors, and tests according to the approved plan.         |

### Quality and review

| Agent               | Description                                                                                 |
| :------------------ | :------------------------------------------------------------------------------------------ |
| **REVIEWER**        | Reviews implementation quality, security, maintainability, contracts, and test coverage.    |
| **CRITIC**          | Challenges assumptions, finds edge cases, and flags over-engineering or missed constraints. |
| **DEBUGGER**        | Performs root-cause analysis, regression tracing, and targeted fix planning.                |
| **BROWSER TESTER**  | Runs browser/E2E checks, validates UI behavior, and captures visual evidence.               |
| **CODE SIMPLIFIER** | Removes dead code, reduces complexity, and improves maintainability.                        |

### Specialized agents

| Agent                  | Description                                                                                   |
| :--------------------- | :-------------------------------------------------------------------------------------------- |
| **DEVOPS**             | Handles deployment, CI/CD, infrastructure, containers, health checks, and rollback planning.  |
| **DOCUMENTATION**      | Writes technical docs, READMEs, API docs, diagrams, and plan artifacts.                       |
| **DESIGNER**           | Produces UI/UX guidance, layouts, interaction notes, visual polish, and accessibility checks. |
| **IMPLEMENTER-MOBILE** | Implements native mobile work for React Native, Expo, Flutter, iOS, or Android.               |
| **DESIGNER-MOBILE**    | Reviews mobile UX using platform conventions, safe areas, and accessibility requirements.     |
| **MOBILE TESTER**      | Runs mobile E2E and device testing workflows such as Detox, Maestro, iOS, or Android checks.  |
| **SKILL CREATOR**      | Extracts reusable `SKILL.md` files from repeated high-confidence workflows.                   |

## Installation

### 1. Install APM

```bash
# macOS / Linux
curl -sSL https://aka.ms/apm-unix | sh

# Windows PowerShell
irm https://aka.ms/apm-windows | iex

# Verify
apm --version
```

### 2. Install Gem Team

Project-scoped install, recommended for teams:

```bash
apm install mubaidr/gem-team --target copilot,claude,cursor,opencode,codex,gemini,windsurf
```

Global user-scoped install, useful for personal use:

```bash
apm install -g mubaidr/gem-team
```

Pin a release for reproducible installs:

```bash
apm install mubaidr/gem-team#v1.20.0 --target copilot
```

### 3. Verify the install

```bash
apm list
apm view mubaidr/gem-team
apm audit
```

Tool-specific checks:

```bash
copilot plugin list   # GitHub Copilot CLI, if used
/plugin list          # Claude Code, inside Claude Code
```

### Useful APM flags

```bash
# Preview without writing files
apm install mubaidr/gem-team --target copilot --dry-run

# Install only selected targets
apm install mubaidr/gem-team --target claude,cursor

# Install all supported harness targets
apm install mubaidr/gem-team --target all

# Exclude one target from auto-detection
apm install mubaidr/gem-team --exclude codex

# Reinstall from the existing apm.yml manifest
apm install
```

## Compatible Tools

APM writes different files depending on the selected target and the primitives included in the package.

| APM target | Tool / harness                       | Typical output                                                                                          |
| :--------- | :----------------------------------- | :------------------------------------------------------------------------------------------------------ |
| `copilot`  | VS Code Copilot / GitHub Copilot CLI | `.github/agents/`, `.github/instructions/`, `.github/prompts/`, and VS Code MCP config when applicable. |
| `claude`   | Claude Code                          | `.claude/agents/`, `.claude/rules/`, commands, skills, hooks, and MCP config when applicable.           |
| `cursor`   | Cursor                               | `.cursor/agents/`, `.cursor/rules/`, skills, commands, hooks, and MCP config when applicable.           |
| `opencode` | OpenCode                             | `.opencode/agents/`, commands, skills, MCP, and compiled instructions.                                  |
| `codex`    | Codex CLI                            | `.codex/agents/`, `AGENTS.md`, and Codex config when applicable.                                        |
| `gemini`   | Gemini CLI                           | `GEMINI.md`, skills/instructions where supported, and Gemini config when applicable.                    |
| `windsurf` | Windsurf / Cascade                   | `.windsurf/rules/`, skills, commands, hooks, and MCP config where supported.                            |

> Some harnesses do not support every primitive. For example, not every tool has native agents, hooks, or project-scoped MCP. APM compiles or skips unsupported primitives according to the target.

## Marketplace Installation

APM is the recommended installation path. Direct marketplace installs are optional and require this repository to publish the correct marketplace metadata for the target tool.

### GitHub Copilot CLI

```bash
copilot plugin marketplace add mubaidr/gem-team
copilot plugin marketplace browse gem-team
copilot plugin install gem-team@gem-team
```

GitHub Copilot CLI also includes default marketplaces such as `awesome-copilot`; if Gem Team is published there, install it with:

```bash
copilot plugin install gem-team@awesome-copilot
```

### Claude Code

```bash
/plugin marketplace add mubaidr/gem-team
/plugin
/plugin install gem-team@gem-team
/reload-plugins
```

## Local Development

Clone the repository and install it into a test project:

```bash
git clone https://github.com/mubaidr/gem-team.git
cd gem-team
apm install . --target claude,cursor --dry-run
```

Then run a real install from the local path:

```bash
apm install /absolute/path/to/gem-team --target claude,cursor
```

For package authoring and release validation:

```bash
apm audit
apm compile --target copilot,claude,cursor --validate
apm pack
```

## Configuration

Gem Team can be configured with `.gem-team.yaml` in your project root.

```yaml
orchestrator:
  max_concurrent_agents: 2
  default_complexity_threshold: auto # auto | TRIVIAL | LOW | MEDIUM | HIGH

planning:
  enable_critic_for: [HIGH]

quality:
  visual_regression_enabled: true
  visual_diff_threshold: 0.95
  a11y_audit_level: basic # none | basic | full

devops:
  approval_required_for: [production]
  auto_rollback_on_failure: false

testing:
  screenshot_on_failure: true
```

### Settings reference

#### Orchestrator

| Setting                                     | Type   | Default | Description                                                              |
| :------------------------------------------ | :----- | :------ | :----------------------------------------------------------------------- |
| `orchestrator.max_concurrent_agents`        | number | `2`     | Maximum parallel agent executions.                                       |
| `orchestrator.default_complexity_threshold` | enum   | `auto`  | Force complexity routing: `auto`, `TRIVIAL`, `LOW`, `MEDIUM`, or `HIGH`. |

#### Planning

| Setting                      | Type   | Default  | Description                                       |
| :--------------------------- | :----- | :------- | :------------------------------------------------ |
| `planning.enable_critic_for` | enum[] | `[HIGH]` | Complexity levels that require critic validation. |

#### Quality

| Setting                             | Type    | Default | Description                                            |
| :---------------------------------- | :------ | :------ | :----------------------------------------------------- |
| `quality.visual_regression_enabled` | boolean | `true`  | Enable screenshot comparison checks.                   |
| `quality.visual_diff_threshold`     | number  | `0.95`  | Visual comparison threshold from `0.0` to `1.0`.       |
| `quality.a11y_audit_level`          | enum    | `basic` | Accessibility audit depth: `none`, `basic`, or `full`. |

#### DevOps

| Setting                           | Type    | Default        | Description                                  |
| :-------------------------------- | :------ | :------------- | :------------------------------------------- |
| `devops.approval_required_for`    | enum[]  | `[production]` | Environments that require explicit approval. |
| `devops.auto_rollback_on_failure` | boolean | `false`        | Attempt rollback after deployment failure.   |

#### Testing

| Setting                         | Type    | Default | Description                                     |
| :------------------------------ | :------ | :------ | :---------------------------------------------- |
| `testing.screenshot_on_failure` | boolean | `true`  | Capture screenshots when browser/UI tests fail. |

A fully commented default file is available at [`.gem-team.yaml`](.gem-team.yaml).

## Operational Notes

- Prefer project-scoped installs for teams so `apm.yml` and `apm.lock.yaml` make the setup reproducible.
- Keep `apm_modules/` out of git; it is an install cache.
- Pin releases with `#vX.Y.Z` for stable CI and team onboarding.
- Run `apm audit` before release and in CI.
- Review generated files before committing large updates.
- Treat DevOps, production deployment, data migration, and destructive operations as approval-gated tasks.
- Keep project rules in `AGENTS.md`; keep task-specific context in `docs/plan/{plan_id}/`.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

Recommended contribution flow:

1. Open or pick an issue.
2. Create a focused branch.
3. Keep changes small and reviewable.
4. Add or update tests/docs where relevant.
5. Run validation before opening the PR.

## License

Gem Team is licensed under the [Apache License 2.0](./LICENSE).

## Support

If you encounter a bug or have a feature request, please [open an issue](https://github.com/mubaidr/gem-team/issues).
