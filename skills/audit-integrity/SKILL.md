---
name: audit-integrity
description: "Enforce output quality, evidence verification, and quality gates across security audits. Use this skill when you perform SAST, SCA, threat modeling, or security code reviews. Use this skill to verify code locations and taint traces for all findings. Use this skill to prevent the suppression of valid security findings. Use this skill to evaluate reports against quality thresholds (score ≥ 8/10) before delivery."
license: MIT
metadata:
  version: "1.1"
---

# Audit Integrity Skill

Enforce output quality, intellectual honesty, and continuous improvement across security audits and code reviews.

## When to Use

- Perform security analyses, threat models, code reviews, or quality audits.
- Validate that every finding has verified code evidence and taint flow.
- Prevent the suppression or rationalization of security findings.
- Evaluate draft reports against the quality gate threshold (score ≥ 8/10).
- Record lessons learned and security memories after you complete a scan.

## Components

This skill provides 7 modular capabilities in the `references/` directory. Load each file when you reach its execution phase:

| Component                    | Reference File                                                                           | Purpose                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Clarification Protocol       | [references/clarification-protocol.md](references/clarification-protocol.md)             | Ask a maximum of 2 targeted questions when scope is not clear     |
| Anti-Rationalization Guard   | [references/anti-rationalization-guard.md](references/anti-rationalization-guard.md)     | Prohibited rationalizations and mandatory responses for findings  |
| Self-Critique Loop           | [references/self-critique-loop.md](references/self-critique-loop.md)                     | Mandatory second pass to verify evidence and coverage             |
| Retry Protocol               | [references/retry-protocol.md](references/retry-protocol.md)                             | Tool failure and empty search handling: retry once, then document |
| Non-Negotiable Behaviors     | [references/non-negotiable-behaviors.md](references/non-negotiable-behaviors.md)         | Mandatory rules: do not fabricate, cite evidence, report gaps     |
| Self-Reflection Quality Gate | [references/self-reflection-quality-gate.md](references/self-reflection-quality-gate.md) | Scoring rubric (1–10 scale) with a minimum threshold of 8         |
| Self-Learning System         | [references/self-learning-system.md](references/self-learning-system.md)                 | Templates and rules for lessons and security memories             |

## Execution Flow

Load reference files as you reach each phase:

1. **Before analysis**: If scope or policy is not clear, read [references/clarification-protocol.md](references/clarification-protocol.md). Ask a maximum of 2 targeted questions.
2. **During analysis**: Follow [references/non-negotiable-behaviors.md](references/non-negotiable-behaviors.md). At each triage decision, consult [references/anti-rationalization-guard.md](references/anti-rationalization-guard.md).
3. **On tool or search failure**: Follow [references/retry-protocol.md](references/retry-protocol.md). Do not assume code is secure without verification.
4. **After initial analysis**: Complete a second pass with the checklist in [references/self-critique-loop.md](references/self-critique-loop.md). Verify taint traces and manifest coverage.
5. **Before delivery**: Score the draft report using [references/self-reflection-quality-gate.md](references/self-reflection-quality-gate.md). All categories must score ≥ 8.
6. **Final delivery**: Record lessons and memories using [references/self-learning-system.md](references/self-learning-system.md).
