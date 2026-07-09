# Gem Team

<p align="center">
  <img src="https://img.shields.io/badge/APM-mubaidr/gem--team-blue?style=flat-square" alt="APM package: mubaidr/gem-team">
  <img src="https://img.shields.io/github/v/release/mubaidr/gem-team?style=flat-square&color=important" alt="Latest release">
  <img src="https://img.shields.io/badge/license-Apache%202.0-green?style=flat-square" alt="Apache-2.0 license">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="Pull requests welcome">
</p>

Turn AI coding into an orchestrated loop: plan, build, review, debug, learn - with smarter tool calling and leaner context.

> Spec-driven multi-agent orchestration for software development, verification, debugging, reusable knowledge, and context-bloat-free execution.

**TL;DR:** Gem Team installs 16 specialist agents that turn AI coding into an engineering process. Plan, implement, review with structured waves, dependency resolution, integration gates, and progressive context management - all while avoiding context bloat, saving tokens via output hygiene and discovery depth scaling, and improving tool-calling precision through model routing and targeted context snapshots. Works with Copilot, Claude Code, Cursor, OpenCode, Codex, Gemini CLI, and Windsurf.

## Why Gem Team?

Gem Team wraps your AI with a disciplined engineering delivery system: plan, build, review, debug, learn. The [Features](#features) section below covers every capability in detail. Here's the gist:

- **Better delivery flow**: spec-driven execution, wave-based parallelism, verification gates, resumable plans.
- **Better code quality**: 16 specialist agents, TDD by default, diagnose-then-fix, security and accessibility audits.
- **Better context management**: progressive context envelope, three-tier memory, skill extraction, PRD management - context bloat avoidance built in.
- **Better cost control**: model routing, output hygiene, context pruning, discovery depth scaling - fewer tokens, same results.
- **Better tool calling**: targeted context snapshots per agent, output hygiene rules - precision without prompt waste.

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
- [Features](#features)
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

## Features

### Intelligent Workflow Engine

- **Phase-based predictable pipeline**: Init → Route → Plan → Execute → Output.
- **Complexity-adaptive routing**: TRIVIAL tasks get one-shot delegation. LOW gets in-memory planning. MEDIUM/HIGH get durable plans, validation gates, and DAG-based wave execution.
- **Integration gates**: Reviewer checks wave output before proceeding. MEDIUM gates on risk; HIGH gates every wave.
- **Resumable plans**: Plan IDs, file-based artifacts, and context envelopes make long tasks pause, inspect, and continue cleanly.

### Specialist Agent Team

- **16 focused agents**: Planner, Researcher, Implementer, Implementer-Mobile, Reviewer, Critic, Debugger, Browser Tester, Mobile Tester, Devops, Documentation Writer, Designer, Designer-Mobile, Code Simplifier, Skill Creator: plus the Orchestrator who coordinates them all.
- **TDD by default**: Implementers follow Red-Green-Refactor with 6-category test coverage (happy path, invariants, boundaries, error paths, input variation, state transitions). Bug-fix mode requires debugger diagnosis before touching code.
- **Diagnose-then-fix**: Debugger diagnoses → Implementer fixes → Reviewer re-verifies. Enforced at planner, orchestrator, implementer, and reviewer levels.

### Context & Knowledge Management

- **Context envelope**: Progressive cache shared across all agents. Tech stack, conventions, constraints, architecture snapshot, research digest, prior decisions: enriched after each wave.
- **Three-tier memory**: Repo (workspace-scoped), session (conversation-scoped), global (user-scoped). Confidence-gated persistence (≥0.85).
- **Stable cache**: High-confidence facts (≥0.90, stable, ≥3 uses) promoted to durable cache. Auto-eviction after 90 days unused.
- **Reuse notes**: Trusted file paths and patterns that agents skip re-verifying.
- **Skill extraction**: High-confidence workflows become reusable `SKILL.md` playbooks via gem-skill-creator.
- **PRD management**: Structured product requirements with EARS syntax, acceptance criteria, decisions, and change history.

### Quality & Verification

- **Plan validation**: Reviewer checks plan correctness, temporal paradoxes, wave ordering, and contract integrity.
- **Critic review**: Challenges assumptions, finds edge cases, flags over-engineering: for HIGH complexity and architecture-impacting changes.
- **Per-wave integration checks**: Reviewer verifies contracts, conflicts, and integration points after each wave.
- **Security audits**: OWASP scanning, secrets/PII detection, mobile 8-vector scan (keychain, cert pinning, deep links, biometric auth, network security).
- **Accessibility audits**: WCAG 2.1 AA contrast checks, ARIA labels, focus indicators, touch targets, reduced-motion support.
- **Visual regression**: Screenshot comparison with configurable thresholds.
- **Configurable audit depth**: `none`, `basic`, or `full` a11y scanning.

### 🔧 Testing

- **E2E browser testing**: Flow-based scenarios with setup, assertions, visual evidence, console/network capture.
- **Mobile E2E testing**: iOS + Android with Detox, Maestro, Appium. Gesture testing, lifecycle testing, push notifications, device farm support.
- **Performance testing**: Cold start TTI, memory profiling, frame rate analysis, bundle size tracking.
- **Platform-specific testing**: Safe areas, keyboard behaviors, system permissions, dark mode, haptics, back button, battery optimization.

### Design

- **UI/UX design system creation**: Palettes, typography scales, spacing, shadows, design movements (brutalism, glassmorphism, minimalism, neo-brutalism, claymorphism, retro-futurism, maximalism).
- **Mobile platform design**: iOS HIG, Android Material 3, safe areas, dynamic island, touch targets (44pt/48dp), platform-select pattern.
- **Accessibility-first**: Contrast 4.5:1, touch targets, reduced-motion, semantic HTML/ARIA.
- **Design output**: 9-section `DESIGN.md` with tokens, component specs, responsive behavior, agent prompt guide.

### DevOps & Deployment

- **Infrastructure provisioning**: Docker, Kubernetes, cloud (AWS/GCP/Azure).
- **CI/CD pipeline management**: PR → staging → smoke → production flows.
- **Approval gates**: Configurable per-environment approval requirements.
- **Health checks**: Endpoint verification, resource monitoring, rollback strategies (rolling, blue-green, canary).
- **Mobile deployment**: EAS Build/Update, Fastlane, TestFlight, Google Play phased rollouts.
- **Idempotent operations**: All ops designed to be safe to re-run.

### Cost Control

- **Model routing**: Cheap models for routine work (implementer, docs). Strong models for planning, debugging, review, critique.
- **Output hygiene**: Agents limited to native tool flags, pipe truncation, maxResults on searches.
- **Context reuse**: Envelope filtered per-agent (only relevant sections).
- **Budget controls**: Researcher has `max_searches`, `max_files_to_read`, `max_depth` per task.

### Learning & Reuse

- **Persist high-confidence learnings**: Facts, patterns, gotchas, failure modes, decisions ≥0.95 confidence automatically persisted.
- **Batch delegation**: Product decisions → PRD. Technical decisions → AGENTS.md/architecture docs. Patterns → memory/envelope. Workflows → skills.
- **Git checkpointing**: Optional wave-level commits on integration gate pass for clean audit trail and rollback diagnosis.

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
    • Analyze requirements for inconsistencies (MEDIUM/HIGH)
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

| Agent            | Description                                                                                                                                     |
| :--------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- |
| **ORCHESTRATOR** | Coordinates the workflow, delegates work, tracks plans, and enforces verification gates. Runs Phase 0–4 pipeline. Never executes work directly. |
| **RESEARCHER**   | Explores codebase patterns, dependencies, architecture, and docs. Supports 5 modes (scan, deep, audit, trace, question) with budget controls.   |
| **PLANNER**      | Creates DAG-based execution plans with task decomposition, wave scheduling, dependency mapping, risk analysis, and acceptance criteria.         |
| **IMPLEMENTER**  | Implements features, fixes, and refactors using TDD (Red-Green-Refactor). Bug-fix mode requires debugger diagnosis. Surgical edits only.        |

### Quality and review

| Agent               | Description                                                                                                                                                                                                                                                |
| :------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REVIEWER**        | Reviews implementation quality, security, maintainability, contracts, and test coverage. Plan validation (lightweight/full). Wave integration checks. OWASP + secrets + mobile 8-vector security scan. Accessibility audit (none/basic/full).              |
| **CRITIC**          | Reviews PRD requirements for inconsistencies & ambiguities. Challenges assumptions, finds edge cases, flags over-engineering or missed constraints. Evaluates decomposition, dependencies, complexity, coupling, and future-proofing. Offers alternatives. |
| **DEBUGGER**        | Root-cause analysis, stack trace diagnosis, regression bisection, error reproduction. Asks for clarification when input insufficient. Prove-It pattern (reproduction test first). Never implements fixes.                                                  |
| **BROWSER TESTER**  | E2E browser checks, UI flow validation, visual regression (screenshot comparison), console/network capture, a11y audit. Configurable thresholds.                                                                                                           |
| **CODE SIMPLIFIER** | Removes dead code, reduces cyclomatic complexity, consolidates duplicates, improves naming. Preserves behavior: runs tests after each change. Chesterton's Fence principle.                                                                                |

### Specialized agents

| Agent                  | Description                                                                                                                                                                                                            |
| :--------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DEVOPS**             | Infrastructure deployment, CI/CD pipelines, container management (Docker/K8s). Approval gates for prod. Health checks, rollback (rolling/blue-green/canary). Mobile deployment (EAS, Fastlane, TestFlight/Play Store). |
| **DOCUMENTATION**      | Technical docs, READMEs, API docs, diagrams, walkthroughs. PRD authoring and maintenance. Context envelope updates. AGENTS.md management. Coverage matrices.                                                           |
| **DESIGNER**           | UI/UX layouts, themes, color schemes, design systems. Create/validate modes. Design movements (brutalism, glassmorphism, minimalism, etc.). 9-section `DESIGN.md` output. WCAG 2.1 AA.                                 |
| **IMPLEMENTER-MOBILE** | Mobile TDD for React Native, Expo, Flutter. Platform-specific code with Platform.select. SafeAreaView, FlatList, Reanimated. Bug-fix mode.                                                                             |
| **DESIGNER-MOBILE**    | Mobile UI/UX for iOS (HIG) and Android (Material 3). Safe areas, touch targets (44pt/48dp), dynamic island, platform-specific specs.                                                                                   |
| **MOBILE TESTER**      | Mobile E2E with Detox, Maestro, Appium. iOS + Android. Gesture, lifecycle, push notification, device farm testing. Performance (cold start, memory, frame rate).                                                       |
| **SKILL CREATOR**      | Extracts reusable `SKILL.md` files from high-confidence (≥0.95, ≥2 uses) patterns. Creates scripts, references, and cross-linked assets.                                                                               |

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
  git_commit_on_gate_pass: true

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
| `orchestrator.git_commit_on_gate_pass`      | bool   | `true`  | Git commit wave output when integration gate passes.                     |

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
