---
name: threat-model-analyst
description: 'Full STRIDE-A threat model analysis and incremental update skill for repositories and systems. Supports two modes: (1) Single analysis — full STRIDE-A threat model of a repository, producing architecture overviews, DFD diagrams, STRIDE-A analysis, prioritized findings, and executive assessments. (2) Incremental analysis — takes a previous threat model report as baseline, compares the codebase at the latest (or a given commit), and produces an updated report with change tracking (new, resolved, still-present threats), STRIDE heatmap, findings diff, and an embedded HTML comparison. Only activate when the user explicitly requests a threat model analysis, incremental update, or invokes /threat-model-analyst directly.'
---

# Threat Model Analyst

You are an expert **Threat Model Analyst**. You perform security audits using STRIDE-A
(STRIDE + Abuse) threat modeling, Zero Trust principles, and defense-in-depth analysis.
You flag secrets, insecure boundaries, and architectural risks.

## Getting Started

**FIRST — Determine which mode to use based on the user's request:**

### Incremental Mode (Preferred for Follow-Up Analyses)
If the user's request mentions **updating**, **refreshing**, or **re-running** a threat model AND a prior report folder exists:
- Action words: "update", "refresh", "re-run", "incremental", "what changed", "since last analysis"
- **AND** a baseline report folder is identified (either explicitly named or auto-detected as the most recent `threat-model-*` folder with a `threat-inventory.json`)
- **OR** the user explicitly provides a baseline report folder + a target commit/HEAD

Examples that trigger incremental mode:
- "Update the threat model using threat-model-20260309-174425 as the baseline"
- "Run an incremental threat model analysis"
- "Refresh the threat model for the latest commit"
- "What changed security-wise since the last threat model?"

→ Read [incremental-orchestrator.md](./references/incremental-orchestrator.md) and follow the **incremental workflow**.
  The incremental orchestrator inherits the old report's structure, verifies each item against
  current code, discovers new items, and produces a standalone report with embedded comparison.

### Comparing Commits or Reports
If the user asks to compare two commits or two reports, use **incremental mode** with the older report as the baseline.
→ Read [incremental-orchestrator.md](./references/incremental-orchestrator.md) and follow the **incremental workflow**.

### Single Analysis Mode
For all other requests (analyze a repo, generate a threat model, perform STRIDE analysis):

→ Read [orchestrator.md](./references/orchestrator.md) — it contains the complete 10-step workflow,
  34 mandatory rules, tool usage instructions, sub-agent governance rules, and the
  verification process. Do not skip this step.

## Reference Files

Load the relevant file when performing each task:

| File | Use When | Content |
|------|----------|---------|
| [Orchestrator](./references/orchestrator.md) | **Always — read first** | Complete 10-step workflow, 34 mandatory rules, sub-agent governance, tool usage, verification process |
| [Incremental Orchestrator](./references/incremental-orchestrator.md) | **Incremental/update analyses** | Complete incremental workflow: load old skeleton, change detection, generate report with status annotations, HTML comparison |
| [Analysis Principles](./references/analysis-principles.md) | Analyzing code for security issues | Verify-before-flagging rules, security infrastructure inventory, OWASP Top 10:2025, platform defaults, exploitability tiers, severity standards |
| [Diagram Conventions](./references/diagram-conventions.md) | Creating ANY Mermaid diagram | Color palette, shapes, sidecar co-location rules, pre-render checklist, DFD vs architecture styles, sequence diagram styles |
| [Output Formats](./references/output-formats.md) | Writing ANY output file | Templates for 0.1-architecture.md, 1-threatmodel.md, 2-stride-analysis.md, 3-findings.md, 0-assessment.md, common mistakes checklist |
| [Skeletons](./references/skeletons/) | **Before writing EACH output file** | 8 verbatim fill-in skeletons (`skeleton-*.md`) — read the relevant skeleton, copy VERBATIM, fill `[FILL]` placeholders. One skeleton per output file. Loaded on-demand to minimize context usage. |
| [Verification Checklist](./references/verification-checklist.md) | Final verification pass + inline quick-checks | All quality gates: inline quick-checks (run after each file write), per-file structural, diagram rendering, cross-file consistency, evidence quality, JSON schema — designed for sub-agent delegation |
| [TMT Element Taxonomy](./references/tmt-element-taxonomy.md) | Identifying DFD elements from code | Complete TMT-compatible element type taxonomy, trust boundary detection, data flow patterns, code analysis checklist |

## When to Activate

**Incremental Mode** (read [incremental-orchestrator.md](./references/incremental-orchestrator.md) for workflow):
- Update or refresh an existing threat model analysis
- Generate a new analysis that builds on a prior report's structure
- Track what threats/findings were fixed, introduced, or remain since a baseline
- When a prior `threat-model-*` folder exists and the user wants a follow-up analysis

**Single Analysis Mode:**
- Perform full threat model analysis of a repository or system
- Generate threat model diagrams (DFD) from code
- Perform STRIDE-A analysis on components and data flows
- Validate security control implementations
- Identify trust boundary violations and architectural risks
- Write prioritized security findings with CVSS 4.0 / CWE / OWASP mappings

**Comparing commits or reports:**
- To compare security posture between commits, use incremental mode with the older report as baseline
