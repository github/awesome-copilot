# acreadiness-cockpit

Drive [Microsoft AgentRC](https://github.com/microsoft/agentrc) from Copilot chat. Frames every interaction inside AgentRC's **Measure → Generate → Maintain** loop.

## What's in the plugin

### Custom agent

| Agent | What it does |
|---|---|
| `@ai-readiness-reporter` | Runs `agentrc readiness --json`, interprets every result against the 9-pillar / 5-level model, then renders a self-contained `reports/index.html` from a fixed HTML/CSS template so every user gets an identically styled dashboard. Honours policies (disabled criteria, overrides, pass-rate thresholds) and surfaces extras separately. |

### Skills

| Skill | Step | What it does |
|---|---|---|
| `/acreadiness-assess` | **Measure** | Runs the readiness scan and hands off to `@ai-readiness-reporter` to produce the static HTML dashboard. Accepts `--policy <path-or-pkg>` and `--per-area`. |
| `/acreadiness-generate-instructions` | **Generate** | Wraps `agentrc instructions`. Default output is `.github/copilot-instructions.md` (Copilot-native). Asks `flat` vs `nested`. For monorepos, also emits per-area `.github/instructions/<area>.instructions.md` files with `applyTo` globs. |
| `/acreadiness-policy` | **Maintain** | Pick, scaffold, or apply an AgentRC policy. Knows the schema (`criteria.disable`, `criteria.override`, `extras`, `thresholds`), the impact-weight table, and CI gating with `--fail-level`. |

## What gets produced

`reports/index.html` — a single self-contained HTML file rendered from a fixed template (`skills/acreadiness-assess/report-template.html`) so every user gets an identical look & feel. It contains:

- Maturity badge (L1–L5) and overall score / grade (A–F)
- Pass-rate vs threshold (when a policy sets one)
- Maturity progression table
- **Active policy** summary (disabled/overridden criteria, threshold)
- **Repo Health** breakdown (8 pillars), each with an **AI relevance** badge (High/Medium/Low), *what it measures*, *why it matters for AI*, *current state*, *recommendation*
- **AI Setup** breakdown (AI Tooling pillar)
- **Extras** (informational only — agents-doc, pr-template, pre-commit, architecture-doc)
- **Prioritised Remediation Plan** (🔴 Fix First / 🟡 Fix Next / 🔵 Plan)
- Embedded raw AgentRC JSON for reuse

## Prerequisites

- **Node.js 20+** on PATH (required by AgentRC)
- VS Code with Copilot agent plugins enabled

## Usage

In Copilot chat:

```text
/acreadiness-assess                                 # measure → reports/index.html
/acreadiness-assess --policy ./policies/strict.json
/acreadiness-generate-instructions                  # asks flat or nested
/acreadiness-generate-instructions --strategy flat
/acreadiness-generate-instructions --strategy nested
/acreadiness-generate-instructions --areas          # per-area applyTo files
/acreadiness-policy new my-policy
@ai-readiness-reporter
```

### Flat vs nested instructions

| | **Flat** *(default)* | **Nested** |
|---|---|---|
| Hub file | `.github/copilot-instructions.md` | `.github/copilot-instructions.md` |
| Detail files | — | `.github/instructions/<topic>.instructions.md` (each with `applyTo` glob) |
| Best for | Small / medium repos, single stack | Large or multi-stack repos, monorepos |
| Token cost | Whole file always loads | VS Code only loads topics whose `applyTo` matches |

When the main output is `.github/copilot-instructions.md`, the skill rewrites AgentRC's nested output to VS Code's native `.instructions.md` layout (which Copilot auto-discovers). With `--output AGENTS.md`, nested keeps AgentRC's default `.agents/` layout for agent-agnostic tooling.

### Concepts (cheat sheet)

- **Maturity**: L1 Functional → L2 Documented → L3 Standardized → L4 Optimized → L5 Autonomous
- **Pillars** (Repo Health): Style · Build · Testing · Docs · Dev Environment · Code Quality · Observability · Security
- **Pillars** (AI Setup): AI Tooling
- **Impact weights**: critical 5 · high 4 · medium 3 · low 2 · info 0
- **Grades**: A ≥ 0.9 · B ≥ 0.8 · C ≥ 0.7 · D ≥ 0.6 · F < 0.6

## License

MIT
