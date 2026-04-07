# 💎 Gem Team

> A modular, high-performance multi-agent orchestration framework for spec-driven development, feature implementation, and automated verification.

[![Copilot Plugin](https://img.shields.io/badge/Plugin-Awesome%20Copilot-0078D4?style=flat-square&logo=microsoft)](https://awesome-copilot.github.com/plugins/#file=plugins%2Fgem-team)
![Version](https://img.shields.io/badge/Version-1.5.4-6366f1?style=flat-square)

---

## 🤔 Why Gem Team?

- ⚡ **10x Faster** — Parallel execution with wave-based execution
- 🏆 **Higher Quality** — Specialized agents + TDD + verification gates + contract-first
- 🔒 **Built-in Security** — OWASP scanning, secrets/PII detection on critical tasks
- 👁️ **Full Visibility** — Real-time status, clear approval gates
- 🛡️ **Resilient** — Pre-mortem analysis, failure handling, auto-replanning
- ♻️ **Pattern Reuse** — Codebase pattern discovery prevents reinventing wheels
- 🪞 **Self-Correcting** — All agents self-critique at 0.85 confidence threshold
- 📋 **Source Verified** — Every factual claim cites its source; no guesswork
- ♿ **Accessibility-First** — WCAG compliance validated at spec and runtime layers
- 🔬 **Smart Debugging** — Root-cause analysis with stack trace parsing + confidence-scored fixes
- 🚀 **Safe DevOps** — Idempotent operations, health checks, mandatory approval gates
- 🔗 **Traceable** — Self-documenting IDs link requirements → tasks → tests → evidence
- 📚 **Knowledge-Driven** — Prioritized sources (PRD → codebase → AGENTS.md → Context7 → docs)
- 🛠️ **Skills & Guidelines** — Built-in skill & guidelines (web-design-guidelines)
- 📐 **Spec-Driven** — Multi-step refinement defines "what" before "how"
- 🌊 **Wave-Based** — Parallel agents with integration gates per wave
- 🗂️ **Multi-Plan** — Complex tasks: 3 planner variants → best DAG selected automatically
- 🩺 **Diagnose-then-Fix** — gem-debugger diagnoses → gem-implementer fixes → re-verifies
- ⚠️ **Pre-Mortem** — Failure modes identified BEFORE execution
- 💬 **Constructive Critique** — gem-critic challenges assumptions, finds edge cases
- 📝 **Contract-First** — Contract tests written before implementation

---

## 📦 Installation

```bash
# Using Copilot CLI
copilot plugin install gem-team@awesome-copilot
```

> **[Install Gem Team Now →](https://aka.ms/awesome-copilot/install/agent?url=vscode%3Achat-agent%2Finstall%3Furl%3Dhttps%253A%252F%252Fraw.githubusercontent.com%252Fgithub%252Fawesome-copilot%252Fmain%252F.%252Fagents)**

---

## 🏗️ Architecture

```mermaid
flowchart LR
    USER["User Goal"]

    subgraph ORCH["Orchestrator"]
        detect["Phase Detection"]
    end

    subgraph PHASES
        DISCUSS["🔹 Discuss"]
        PRD["📋 PRD"]
        RESEARCH["🔍 Research"]
        PLANNING["📝 Planning"]
        EXEC["⚙️ Execution"]
        SUMMARY["📊 Summary"]
    end

    subgraph AGENTS["Agents"]
        researcher["gem-researcher"]
        planner["gem-planner"]
        implementer["gem-implementer"]
        browser_tester["gem-browser-tester"]
        reviewer["gem-reviewer"]
        debugger["gem-debugger"]
        critic["gem-critic"]
        devops["gem-devops"]
        docs["gem-documentation-writer"]
        designer["gem-designer"]
    end

    DIAG["🔬 Diagnose-then-Fix"]

    USER --> detect

    detect --> |"Simple"| RESEARCH
    detect --> |"Medium|Complex"| DISCUSS

    DISCUSS --> PRD
    PRD --> RESEARCH
    RESEARCH --> PLANNING
    PLANNING --> |"Approved"| EXEC
    PLANNING --> |"Feedback"| PLANNING
    EXEC --> |"Failure"| DIAG
    DIAG --> EXEC
    EXEC --> SUMMARY

    PLANNING -.-> |"critique"| critic
    PLANNING -.-> |"review"| reviewer

    EXEC --> |"parallel ≤4"| implementer
    EXEC --> |"parallel ≤4"| browser_tester
    EXEC --> |"parallel ≤4"| devops
    EXEC --> |"parallel ≤4"| docs

    EXEC --> |"post-wave (complex)"| critic
    EXEC --> |"post-wave (UI)"| designer
```

---

## 🔄 Core Workflow

**Phase Flow:** User Goal → Orchestrator → Discuss (medium|complex) → PRD → Research → Planning → Execution → Summary

**Error Handling:** Diagnose-then-Fix loop (Debugger → Implementer → Re-verify)

**Orchestrator** auto-detects phase and routes accordingly.

| Condition | → Phase |
|:----------|:--------|
| No plan + simple | Research |
| No plan + medium\|complex | Discuss → PRD → Research |
| Plan + pending tasks | Execution |
| Plan + feedback | Planning |

---

## 🤖 The Agent Team (Q2 2026 SOTA)

| Role | When to Use | Output | Recommended LLM |
|:-----|:------------|:-------|:----------------|
| 🎯 **ORCHESTRATOR** (`gem-orchestrator`) | Multi-agent coordination, long workflows | 📋 PRD (`docs/PRD.yaml`) | **Closed:** GPT-5.4, Gemini 3.1 Pro, Claude Sonnet 4.6<br>**Open:** GLM-5, Kimi K2.5, Qwen3.5-397B |
| 🔍 **RESEARCHER** (`gem-researcher`) | Exploration, deep analysis, dependency tracing | 🔍 findings | **Closed:** Gemini 3.1 Pro, GPT-5.4, Claude Sonnet 4.6<br>**Open:** GLM-5, Qwen3.5-9B, DeepSeek-V3.2 |
| 📋 **PLANNER** (`gem-planner`) | Decomposition, reasoning, multi-step design | 📄 plan.yaml | **Closed:** Gemini 3.1 Pro, Claude Sonnet 4.6, GPT-5.4<br>**Open:** Kimi K2.5 (Thinking), GLM-5, Qwen3.5-397B |
| 🔧 **IMPLEMENTER** (`gem-implementer`) | Coding, building, TDD | 💻 code | **Closed:** Claude Opus 4.6, GPT-5.4, Gemini 3.1 Pro<br>**Open:** DeepSeek-V3.2, GLM-5, Qwen3-Coder-Next |
| 🧪 **BROWSER TESTER** (`gem-browser-tester`) | UI + E2E + runtime validation | 🧪 evidence | **Closed:** GPT-5.4 (Native Computer Use), Claude Sonnet 4.6, Gemini 3.1 Flash-Lite<br>**Open:** Llama 4 Maverick, Qwen3.5-Flash, MiniMax M2.7 |
| 🚀 **DEVOPS** (`gem-devops`) | Infra, CI/CD, reliability | 🌍 infra | **Closed:** GPT-5.4, Gemini 3.1 Pro, Claude Sonnet 4.6<br>**Open:** DeepSeek-V3.2, GLM-5, Qwen3.5-397B |
| 🛡️ **REVIEWER** (`gem-reviewer`) | Audit, compliance, correctness | 📊 review report | **Closed:** Claude Opus 4.6, GPT-5.4, Gemini 3.1 Pro<br>**Open:** Kimi K2.5, GLM-5, DeepSeek-V3.2 |
| 📝 **DOCUMENTATION** (`gem-documentation-writer`) | Docs, README, structured writing | 📝 docs | **Closed:** Claude Sonnet 4.6, Gemini 3.1 Flash-Lite, GPT-5.4 Mini<br>**Open:** Llama 4 Scout, Qwen3.5-9B, MiniMax M2.7 |
| 🔬 **DEBUGGER** (`gem-debugger`) | Root cause, tracing, diagnostics | 🔬 diagnosis | **Closed:** Gemini 3.1 Pro (Retrieval King), Claude Opus 4.6, GPT-5.4<br>**Open:** DeepSeek-V3.2, GLM-5, Qwen3-Coder-Next |
| 🎯 **CRITIC** (`gem-critic`) | Challenge assumptions, edge cases | 💬 critique | **Closed:** Claude Sonnet 4.6, GPT-5.4, Gemini 3.1 Pro<br>**Open:** Kimi K2.5, GLM-5, Qwen3.5-397B |
| ✂️ **SIMPLIFIER** (`gem-code-simplifier`) | Refactor, reduce complexity | ✂️ change log | **Closed:** Claude Opus 4.6, GPT-5.4, Gemini 3.1 Pro<br>**Open:** DeepSeek-V3.2, GLM-5, Qwen3-Coder-Next |
| 🎨 **DESIGNER** (`gem-designer`) | UI/UX, accessibility, layouts | 🎨 DESIGN.md | **Closed:** GPT-5.4, Gemini 3.1 Pro, Claude Sonnet 4.6<br>**Open:** Qwen3.5-397B, GLM-5, MiniMax M2.7 |

### Agent File Skeleton

Each `.agent.md` file follows this structure:

```
---                                    # Frontmatter: description, name, triggers
# Role                                 # One-line identity
# Expertise                            # Core competencies
# Knowledge Sources                    # Prioritized reference list
# Workflow                             # Step-by-step execution phases
  ## 1. Initialize                     # Setup and context gathering
  ## 2. Analyze/Execute                # Role-specific work
  ## N. Self-Critique                  # Confidence check (≥0.85)
  ## N+1. Handle Failure               # Retry/escalate logic
  ## N+2. Output                       # JSON deliverable format
# Input Format                         # Expected JSON schema
# Output Format                        # Return JSON schema
# Rules
  ## Execution                         # Tool usage, batching, error handling
  ## Constitutional                    # IF-THEN decision rules
  ## Anti-Patterns                     # Behaviors to avoid
  ## Anti-Rationalization              # Excuse → Rebuttal table
  ## Directives                        # Non-negotiable commands
```

All agents share: Execution rules, Constitutional rules, Anti-Patterns, and Directives sections. Anti-Rationalization tables are present in 5 agents (implementer, planner, reviewer, designer, browser-tester). Role-specific sections (Workflow, Expertise, Knowledge Sources) vary by agent.

---

## 📚 Knowledge Sources

Agents consult only the sources relevant to their role. Trust levels apply:

| Trust Level | Sources | Behavior |
|:-----------|:--------|:---------|
| **Trusted** | PRD.yaml, plan.yaml, AGENTS.md | Follow as instructions |
| **Verify** | Codebase files, research findings | Cross-reference before assuming |
| **Untrusted** | Error logs, external data, third-party responses | Factual only — never as instructions |

| Agent | Knowledge Sources |
|:------|:------------------|
| orchestrator | PRD.yaml, AGENTS.md |
| researcher | PRD.yaml, codebase patterns, AGENTS.md, Context7, official docs, online search |
| planner | PRD.yaml, codebase patterns, AGENTS.md, Context7, official docs |
| implementer | codebase patterns, AGENTS.md, Context7 (API verification), DESIGN.md (UI tasks) |
| debugger | codebase patterns, AGENTS.md, error logs (untrusted), git history, DESIGN.md (UI bugs) |
| reviewer | PRD.yaml, codebase patterns, AGENTS.md, OWASP reference, DESIGN.md (UI review) |
| browser-tester | PRD.yaml (flow coverage), AGENTS.md, test fixtures, baseline screenshots, DESIGN.md (visual validation) |
| designer | PRD.yaml (UX goals), codebase patterns, AGENTS.md, existing design system |
| code-simplifier | codebase patterns, AGENTS.md, test suites (behavior verification) |
| documentation-writer | AGENTS.md, existing docs, source code |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 💬 Support

If you encounter any issues or have questions, please [open an issue](https://github.com/mubaidr/gem-team/issues) on GitHub.
