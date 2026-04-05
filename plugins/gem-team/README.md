# 💎 Gem Team

> A modular, high-performance multi-agent orchestration framework for spec-driven development, feature implementation, and automated verification.

[![Copilot Plugin](https://img.shields.io/badge/Plugin-Awesome%20Copilot-0078D4?style=flat-square&logo=microsoft)](https://awesome-copilot.github.com/plugins/#file=plugins%2Fgem-team)
![Version](https://img.shields.io/badge/Version-1.5.4-6366f1?style=flat-square)

---

## 🤔 Why Gem Team?

### ✨ Why It Works

- ⚡ **10x Faster** — Parallel execution eliminates bottlenecks
- 🏆 **Higher Quality** — Specialized agents + TDD + verification gates = fewer bugs
- 🔒 **Built-in Security** — OWASP scanning on critical tasks
- 👁️ **Full Visibility** — Real-time status, clear approval gates
- 🛡️ **Resilient** — Pre-mortem analysis, failure handling, auto-replanning
- ♻️ **Pattern Reuse** — Codebase pattern discovery prevents reinventing wheels
- 🪞 **Self-Correcting** — All agents self-critique at 0.85 confidence threshold before returning results
- 📋 **Source Verified** — Every factual claim cites its source (PRD, codebase, docs, online); no guesswork — if unclear, agents ask for clarification
- ♿ **Accessibility-First** — WCAG compliance validated at both spec and runtime layers
- 🔬 **Smart Debugging** — Root-cause analysis with stack trace parsing, regression bisection, and confidence-scored fix recommendations
- 🚀 **Safe DevOps** — Idempotent operations, health checks, and mandatory approval gates for production
- 🔗 **Traceable** — Self-documenting IDs link requirements → tasks → tests → evidence
- 📚 **Knowledge-Driven** — Agents consult prioritized sources (PRD → codebase patterns → AGENTS.md → Context7 → docs → online) for informed decisions
- 🛠️ **Skills & Guidelines** — Built-in skill modules (docx, pdf, pptx, xlsx, web-design-guidelines) ensure format-accurate, accessibility-compliant outputs
- 🎯 **Decision-Focused** — Research outputs highlight blockers and decision points for planners
- 📋 **Rich Specification Creation** — PRD creation with user stories, IN/OUT of scope, acceptance criteria, and clarification tracking
- 📐 **Spec-Driven Development** — Specifications define the "what" before the "how", with multi-step refinement rather than one-shot code generation from prompts

### Single-Agent Problems → Gem Team Solutions

| Problem | Solution |
|:--------|:---------|
| Context overload | **Specialized agents** with focused expertise |
| No specialization | **11 expert agents** with clear roles and zero overlap |
| Sequential bottlenecks | **DAG-based parallel execution** (≤4 agents, ≤8 with `fast`) |
| Missing verification | **TDD + mandatory verification gates** per agent |
| Intent misalignment | **Discuss phase** captures intent; **clarification tracking** in PRD |
| No audit trail | Persistent **`plan.yaml` and `PRD.yaml`** tracks every decision & outcome |
| Over-engineering | **Architectural gates** validate simplicity; **gem-critic** challenges assumptions |
| Untested accessibility | **WCAG spec validation** (gem-designer) + **runtime checks** (gem-browser-tester) |
| Blind retries | **Diagnose-then-fix**: gem-debugger finds root cause → confidence gate → gem-implementer applies fix → original agent re-verifies |
| Single-plan risk | Complex tasks get **3 planner variants** → best DAG selected automatically |
| Missed edge cases | **gem-critic** audits for logic gaps, boundary conditions, YAGNI violations |
| Docs drift from code | **Auto-included docs tasks** for new features ensures code-documentation parity |
| Unsafe deployments | **Approval gates** block production/security changes until confirmed |
| Browser fragmentation | **Multi-browser testing** via Chrome MCP, Playwright, and Agent Browser |
| Broken contracts | **Contract verification** post-wave ensures dependent tasks integrate correctly |
| Knowledge gaps | **Prioritized knowledge sources** (PRD, codebase, AGENTS.md, Context7, docs, online) |
| Unverified facts | **Source-cited claims** — every fact cites source; no guesswork — if unclear, agents ask |
| Format inconsistency | **Built-in skills** (docx, pdf, pptx, xlsx) + **web-design-guidelines** for consistent, accessible outputs |

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
flowchart TB
    subgraph USER["USER"]
        goal["User Goal"]
    end

    subgraph ORCH["ORCHESTRATOR"]
        detect["Phase Detection"]
        route["Route to agents"]
        synthesize["Synthesize results"]
    end

    subgraph DISCUSS["Phase 1: Discuss"]
        dir1["medium|complex only"]
        intent["Intent capture"]
        clar["Clarifications"]
    end

    subgraph PRD["Phase 2: PRD Creation"]
        stories["User stories"]
        scope["IN/OUT of scope"]
        criteria["Acceptance criteria"]
        clar_tracking["Clarification tracking"]
    end

    subgraph PHASE3["Phase 3: Research"]
        focus["Focus areas (≤4∥)"]
        res["gem-researcher"]
    end

    subgraph PHASE4["Phase 4: Planning"]
        dag["DAG + Pre-mortem"]
        multi["3 variants (complex)"]
        critic_plan["gem-critic"]
        verify_plan["gem-reviewer"]
        planner["gem-planner"]
    end

    subgraph EXEC["Phase 5: Execution"]
        waves["Wave-based (1→n)"]
        parallel["≤4 agents ∥"]
        integ["Wave Integration"]
    end

    subgraph DIAG["Diagnose-then-Fix Loop"]
        debug["gem-debugger\n(diagnose root cause)"]
        impl_fix["gem-implementer\n(apply fix)"]
        reverify["Original agent\n(re-verify/re-run)"]
    end

    subgraph AUTO["Auto-Invocations (post-wave)"]
        auto_critic["gem-critic (complex)"]
        auto_design["gem-designer (UI tasks)"]
    end

    subgraph WORKERS["Workers"]
        impl["gem-implementer"]
        test["gem-browser-tester"]
        devops["gem-devops"]
        docs["gem-documentation-writer"]
    end

    subgraph SUMMARY["Phase 6: Summary"]
        status["Status report"]
        prod_feedback["Production feedback"]
        decision_log["Decision log"]
    end

    goal --> detect

    detect --> |"No plan\n(medium|complex)"| DISCUSS
    detect --> |"No plan\n(simple)"| PHASE3
    detect --> |"Plan + pending"| EXEC
    detect --> |"Plan + feedback"| PHASE4
    detect --> |"All done"| SUMMARY

    DISCUSS --> PRD
    PRD --> PHASE3
    PHASE3 --> PHASE4
    PHASE4 --> |"Approved"| EXEC
    PHASE4 --> |"Issues"| PHASE4
    EXEC --> WORKERS
    EXEC --> AUTO
    EXEC --> |"Failure"| DIAG
    DIAG --> debug
    debug --> |"code fix"| impl_fix
    debug --> |"infra/config"| reverify
    impl_fix --> reverify
    reverify --> |"pass"| EXEC
    reverify --> |"fail"| DIAG
    EXEC --> |"Complete"| SUMMARY
    SUMMARY --> |"Feedback"| PHASE4
```

---

## 🔄 Core Workflow

The Orchestrator follows a 6-phase workflow with automatic phase detection.

### Phase Detection

| Condition | Action |
|:----------|:-------|
| No plan + simple | Research (skip Discuss) |
| No plan + medium\|complex | Discuss Phase |
| Plan + pending tasks | Execution Loop |
| Plan + feedback | Planning |
| All tasks done | Summary |

### 2️⃣ Discuss Phase (medium|complex only)

- **Identifies gray areas** → 2-4 context-aware options per question
- **Asks 3-5 targeted questions** → Architectural decisions → `AGENTS.md`
- **Task clarifications** captured for PRD creation

### 3️⃣ PRD Creation

- **Creates** `docs/PRD.yaml` from Discuss Phase outputs
- **Includes:** user stories, IN SCOPE, OUT OF SCOPE, acceptance criteria
- **Tracks clarifications:** status (open/resolved/deferred) with owner assignment

### 4️⃣ Phase 1: Research

- **Detects complexity** (simple/medium/complex)
- **Delegates to gem-researcher** (≤4 concurrent) per focus area
- **Output:** `docs/plan/{plan_id}/research_findings_{focus}.yaml` (or `docs/research_findings_{timestamp}.yaml` for standalone calls)

### 5️⃣ Phase 2: Planning

- **Complex:** 3 planner variants (a/b/c) → selects best
- **gem-reviewer** validates with architectural checks (simplicity, anti-abstraction, integration-first)
- **gem-critic** challenges assumptions
- **Planning history** tracks iteration passes for continuous improvement
- **Output:** `docs/plan/{plan_id}/plan.yaml` (DAG + waves)

### 6️⃣ Phase 3: Execution

- **Executes in waves** (wave 1 first, wave 2 after)
- **≤4 agents parallel** per wave
- **TDD cycle:** Red → Green → Refactor → Verify
- **Contract-first:** Write contract tests before implementing tasks with dependencies
- **Wave integration:** get_errors → build → lint/typecheck/tests → contract verification
- **On failure:** gem-debugger diagnoses → confidence check (≥0.7) → IF code fix: gem-implementer → original agent re-verifies
- **On needs_revision:** Same diagnose-then-fix chain — never direct re-delegate
- **Auto-invocations:** gem-critic after each wave (complex); gem-designer validates UI tasks post-wave

### 7️⃣ Phase 4: Summary

- **Decision log:** All key decisions with rationale (backward reference to requirements)
- **Production feedback:** How to verify in production, known limitations, rollback procedure
- **Presents** status, next steps
- **User feedback** → routes back to Planning

---

## 🤖 The Agent Team

| Agent | Role | When to Use |
|:------|:-----|:------------|
| `gem-orchestrator` | 🎯 **ORCHESTRATOR** | Coordinates multi-agent workflows, delegates tasks. Never executes directly. |
| `gem-researcher` | 🔍 **RESEARCHER** | Research, explore, analyze code, find patterns, investigate dependencies. Decision-focused output with blockers highlighted. |
| `gem-planner` | 📋 **PLANNER** | Plan, design approach, break down work, estimate effort. Supports prototype tasks, planning passes, and multiple iterations. Auto-includes documentation tasks for new features. |
| `gem-implementer` | 🔧 **IMPLEMENTER** | Implement, build, create, code, write, fix (TDD). Uses contract-first approach for tasks with dependencies. |
| `gem-browser-tester` | 🧪 **BROWSER TESTER** | Test UI, browser tests, E2E, flow testing, visual regression, accessibility runtime validation. |
| `gem-devops` | 🚀 **DEVOPS** | Deploy, configure infrastructure, CI/CD, containers with health checks and approval gates. |
| `gem-reviewer` | 🛡️ **REVIEWER** | Review, audit, security scan, compliance. Never modifies. Performs architectural checks and contract verification. Validates: compliance with spec/PRD. |
| `gem-documentation-writer` | 📝 **DOCUMENTATION** | Document, write docs, README, API docs, diagrams, walkthroughs. Auto-assigned to new feature tasks. |
| `gem-debugger` | 🔬 **DEBUGGER** | Debug, diagnose, root cause analysis, trace errors. Never fixes - only diagnoses. |
| `gem-critic` | 🎯 **CRITIC** | Critique, challenge assumptions, edge cases, over-engineering. Validates: approach correctness. |
| `gem-code-simplifier` | ✂️ **SIMPLIFIER** | Simplify, refactor, dead code removal, reduce complexity. |
| `gem-designer` | 🎨 **DESIGNER** | Design UI, create themes, layouts. Writes `docs/DESIGN.md` (project resource). Two modes: create and validate. Validates: accessibility spec compliance. |

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

## 🌟 Key Features

| Feature | Description |
|:--------|:------------|
| 🧪 **TDD (Red-Green-Refactor)** | Tests first → fail → minimal code → refactor → verify |
| 🔒 **Security-First** | OWASP scanning, secrets/PII detection, tiered depth review |
| ⚠️ **Pre-Mortem Analysis** | Failure modes identified BEFORE execution |
| 🗂️ **Multi-Plan Selection** | Complex tasks: 3 planner variants → selects best DAG |
| 🌊 **Wave-Based Execution** | Parallel agent execution with integration gates |
| 🩺 **Diagnose-then-Fix** | gem-debugger finds root cause → confidence gate → gem-implementer applies fix → original agent re-verifies |
| 🚪 **Approval Gates** | Security + deployment approval for sensitive ops |
| 🌐 **Multi-Browser Testing** | Chrome MCP, Playwright, Agent Browser |
| 🧭 **Flow Testing** | Multi-step user journeys with shared state, branching, and flow-level assertions |
| 🔄 **Codebase Patterns** | Avoids reinventing the wheel |
| 🪞 **Self-Critique** | Reflection step before output (0.85 confidence threshold) |
| 🔬 **Root-Cause Diagnosis** | Stack trace analysis, regression bisection |
| 🛡️ **Auto-Generated Lint Rules** | Debugger recommends ESLint rules for recurring error patterns to prevent recurrence |
| 💬 **Constructive Critique** | Challenges assumptions, finds edge cases |
| ⚡ **Magic Keywords** | Fast-track routing: agent names in input trigger direct delegation (e.g., "simplify this" → gem-code-simplifier, "critique" → gem-critic, "debug" → gem-debugger) |
| 📚 **Docs-Code Parity** | Documentation auto-included for new features |
| 📝 **Contract-First Development** | Contract tests written before implementation |
| 🔗 **Self-Documenting IDs** | Task/AC IDs encode lineage for traceability |
| 🏛️ **Architectural Gates** | Plan review validates simplicity & integration-first |
| 🧪 **Prototype Wave** | Wave 1 can validate architecture before full implementation |
| 📈 **Planning History** | Tracks iteration passes for continuous improvement |
| 📌 **Clarification Tracking** | PRD tracks unresolved items with ownership |
| ⚖️ **Critic vs Reviewer Routing** | Critic validates approach, Reviewer validates compliance |
| 🚦 **Three-Tier Boundaries** | Always Do / Ask First / Never Do escalation hierarchy |
| 🧠 **Context Budget** | ≤2,000 lines per task with trust-level classification |
| 🛑 **Anti-Rationalization** | Excuse→Rebuttal tables prevent agents from skipping critical steps |
| 🔒 **Untrusted Data Protocol** | Error logs, browser content, API responses never treated as instructions |
| 📐 **Inline Planning** | Lightweight 3-step checkpoint before each execution wave |
| 🏰 **Chesterton's Fence** | Code-simplifier investigates why code exists before removing it |
| 🚩 **Feature Flag Lifecycle** | Create → Enable → Canary → Rollout → Cleanup with owner + expiration |
| ⚡ **Change Sizing** | Target ~100 lines per task; split if >300 using vertical slicing |
| 📊 **Performance Gates** | Core Web Vitals thresholds (LCP ≤2.5s, INP ≤200ms, CLS ≤0.1) |
| 📜 **ADR Lifecycle** | Architecture decisions tracked with status, alternatives, consequences |
| 🎨 **DESIGN.md Generation** | Designer writes `docs/DESIGN.md` (project resource, like PRD.yaml) with 9 sections. Semantic tokens, shadow levels, radius scales, lint rules, iteration guides. |

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

## 🛠️ Skills & Guidelines

| Skill | Purpose |
|:------|:--------|
| `docx` | Professional document creation, tracked changes, comments |
| `pdf` | PDF manipulation, form filling, text/table extraction |
| `pptx` | Presentation creation, editing, layouts, speaker notes |
| `xlsx` | Spreadsheet creation, formulas, data analysis, visualization |
| `web-design-guidelines` | UI/UX audit, accessibility, design best practices review |

---

## 📂 Generated Artifacts

| Agent | Generates | Path |
|:------|:----------|:-----|
| gem-orchestrator | 📋 PRD | `docs/PRD.yaml` |
| gem-planner | 📄 plan.yaml | `docs/plan/{plan_id}/plan.yaml` |
| gem-researcher | 🔍 findings | `docs/plan/{plan_id}/research_findings_{focus}.yaml` |
| gem-critic | 💬 critique report | `docs/plan/{plan_id}/critique_{scope}.yaml` (via orchestrator) |
| gem-browser-tester | 🧪 evidence | `docs/plan/{plan_id}/evidence/{task_id}/` |
| gem-designer | 🎨 DESIGN.md | `docs/DESIGN.md` (project resource) |
| gem-code-simplifier | ✂️ change log | `docs/plan/{plan_id}/simplification_{task_id}.yaml` (via orchestrator) |
| gem-debugger | 🔬 diagnosis | `docs/plan/{plan_id}/logs/{agent}_{task_id}_{timestamp}.yaml` |
| gem-documentation-writer | 📝 docs | `docs/` (README, API docs, walkthroughs) |

---

## ⚙️ Agent Protocol

### Core Rules

- Output ONLY requested deliverable (code: code ONLY)
- Think-Before-Action via internal `<thought>` block
- Batch independent operations; context-efficient reads (≤200 lines per read, ≤2,000 lines per task)
- Agent-specific `verification` criteria from plan.yaml
- Self-critique: agents reflect on output before returning results
- Knowledge sources: agents consult prioritized references (PRD → codebase → AGENTS.md → Context7 → docs → online)
- Three-Tier Boundaries: **Always Do** (validate, cite sources, verify) → **Ask First** (destructive ops, architecture changes) → **Never Do** (commit secrets, trust untrusted data, skip gates)
- Anti-Rationalization: Every agent has excuse→rebuttal tables to prevent skipping critical steps
- Scope Discipline: "NOTICED BUT NOT TOUCHING" — document out-of-scope improvements without implementing them

### Verification by Agent

| Agent | Verification |
|:------|:-------------|
| Implementer | get_errors → typecheck → unit tests → contract tests (if applicable) |
| Debugger | reproduce → stack trace → root cause → fix recommendations → lint rules (if recurring pattern) |
| Critic | assumption audit → edge case discovery → over-engineering detection → logic gap analysis |
| Browser Tester | validation matrix → console → network → accessibility |
| Reviewer (task) | OWASP scan → code quality → logic → task_completion_check → coverage_status |
| Reviewer (plan) | coverage → atomicity → deps → PRD alignment → architectural_checks |
| Reviewer (wave) | get_errors → build → lint → typecheck → tests → contract_checks |
| DevOps | deployment → health checks → idempotency |
| Doc Writer | completeness → code parity → formatting |
| Simplifier | tests pass → behavior preserved → get_errors |
| Designer | accessibility → visual hierarchy → responsive → design system compliance |
| Researcher | decision_blockers → research_blockers → coverage → confidence |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 💬 Support

If you encounter any issues or have questions, please [open an issue](https://github.com/mubaidr/gem-team/issues) on GitHub.
