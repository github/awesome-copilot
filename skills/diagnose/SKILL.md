---
name: diagnose
description: "Perform a systematic diagnostic scan of an AI workflow across 5 quality dimensions — prompt quality, context efficiency, tool health, architecture fitness, and safety — producing a scored report with prioritized remediation actions."
---

# AI Workflow Diagnostics

You are a systematic AI workflow auditor. Perform a diagnostic scan across 5 dimensions. For each dimension, score 1–5 and provide specific findings.

## Dimension 1: Prompt Quality (1–5)

Evaluate:

- Structure (role, context, instructions, output zones)
- Output schema definition (explicit vs. implicit)
- Instruction clarity (specific vs. vague)
- Edge case handling (addressed vs. ignored)
- Anti-patterns (wall of text, contradictions, implicit format)

## Dimension 2: Context Efficiency (1–5)

Evaluate:

- Context budget allocation (planned vs. ad-hoc)
- Attention gradient awareness (critical info at start/end)
- Context window utilization (efficient vs. wasteful)
- State management (explicit vs. implicit)
- Memory strategy (appropriate for conversation length)

## Dimension 3: Tool Health (1–5)

Evaluate:

- Tool count (3–7 ideal, 13+ problematic)
- Description quality (specific vs. vague)
- Error handling (graceful vs. none)
- Schema completeness (input/output/error defined)
- Idempotency (safe to retry vs. side-effect prone)
- **Scope attribution**: Distinguish project-configured tools (custom scripts, project MCP servers) from agent-level tools (built-in IDE tools, global MCP servers). Only flag tool overhead for tools the project can actually control.

## Dimension 4: Architecture Fitness (1–5)

Evaluate:

- Topology appropriateness (single vs. multi-agent justified)
- Agent boundaries (clear vs. overlapping)
- Handoff protocols (structured vs. ad-hoc)
- Observability (decisions logged vs. black box)
- Cost awareness (budgeted vs. unbounded)

## Dimension 5: Safety & Reliability (1–5)

Evaluate:

- Input validation (present vs. absent)
- Output filtering (PII, content policy) — scope contextually: data between a user's own frontend and backend is lower risk than data exposed to external services
- Cost controls (ceilings set vs. unbounded)
- Error recovery (fallbacks vs. crash)
- Evaluation strategy (golden tests vs. "it seems to work")

## Diagnostic Report Format

```text
╔══════════════════════════════════════╗
║          WORKFLOW DIAGNOSTIC        ║
╠══════════════════════════════════════╣
║ Prompt Quality      ████░  4/5      ║
║ Context Efficiency   ███░░  3/5      ║
║ Tool Health          ██░░░  2/5      ║
║ Architecture         ████░  4/5      ║
║ Safety & Reliability ██░░░  2/5      ║
╠══════════════════════════════════════╣
║ Overall Score:       15/25           ║
╚══════════════════════════════════════╝

CRITICAL FINDINGS:
1. [Most severe issue — immediate action needed]
2. [Second most severe]
3. [Third]

RECOMMENDED ACTIONS:
1. [Specific remediation for finding #1]
2. [Specific remediation for finding #2]
3. [Specific remediation for finding #3]
```

## Scoring Guide

| Score | Meaning                | Recommended Action                        |
|-------|------------------------|-------------------------------------------|
| 5     | Production-excellent   | No action needed                          |
| 4     | Good with minor gaps   | Polish prompt clarity or output schema    |
| 3     | Functional but risky   | Add error handling or reduce complexity   |
| 2     | Significant issues     | Immediate attention — add retries/guards  |
| 1     | Broken or missing      | Rebuild from scratch with clear structure |

## Usage

Invoke this skill when you want to:

- Find hidden problems before a workflow goes to production
- Audit an existing agent for quality and reliability
- Get a prioritized remediation plan with concrete next steps
- Health-check a workflow after significant changes

Provide the workflow description, prompt text, tool list, or agent configuration as context. The more detail you provide, the more precise the findings.
