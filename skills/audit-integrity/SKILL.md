---
name: 'audit-integrity'
description: 'Shared audit integrity framework for all AppSec agents — enforces output quality, intellectual honesty, and continuous improvement through anti-rationalization guards, self-critique loops, retry protocols, non-negotiable behaviors, self-reflection quality gates (1-10 scoring, ≥8 threshold), and a self-learning system with lesson/memory governance for security analysis agents.'
compatibility: 'Cross-platform. Works with any language or framework analyzed by AppSec agents.'
metadata:
  version: '1.0'
---

# Audit Integrity Skill

Enforces output quality, intellectual honesty, and continuous improvement across all AppSec agents.

## When to Use

- Every security analysis, code review, threat model, or quality scan agent run
- Applied automatically as a post-analysis quality gate
- Applicable to any agent performing SAST, SCA, threat modeling, or code quality analysis

## Components

This skill provides 7 reusable capabilities. Agents apply all 7 unless their scope excludes a specific component.

| Component | Reference File | Purpose |
|-----------|---------------|---------|
| Clarification Protocol | [clarification-protocol.md](references/clarification-protocol.md) | Ask ≤2 targeted questions before analysis when scope is ambiguous |
| Anti-Rationalization Guard | [anti-rationalization-guard.md](references/anti-rationalization-guard.md) | Table of prohibited rationalizations with mandatory responses |
| Self-Critique Loop | [self-critique-loop.md](references/self-critique-loop.md) | Mandatory second-pass review after initial analysis |
| Retry Protocol | [retry-protocol.md](references/retry-protocol.md) | Tool failure handling — retry once, then document |
| Non-Negotiable Behaviors | [non-negotiable-behaviors.md](references/non-negotiable-behaviors.md) | Hard rules: never fabricate, always cite evidence, report gaps |
| Self-Reflection Quality Gate | [self-reflection-quality-gate.md](references/self-reflection-quality-gate.md) | 1–10 scoring rubric with ≥8 threshold per category |
| Self-Learning System | [self-learning-system.md](references/self-learning-system.md) | Lesson/Memory templates and governance rules |

## Execution Flow

1. **Before analysis**: Apply Clarification Protocol if scope is ambiguous
2. **During analysis**: Apply Anti-Rationalization Guard at every decision point
3. **After initial pass**: Execute Self-Critique Loop (mandatory second pass)
4. **On tool failure**: Apply Retry Protocol
5. **Before delivery**: Run Self-Reflection Quality Gate (all categories must score ≥8)
6. **After delivery**: Create Lessons/Memories for novel findings, false positives, or methodology gaps (see Self-Learning System)

## Agent-Specific Adaptation

Each agent customizes the **Self-Critique Loop** checklist and **Self-Reflection Quality Gate** categories to match its domain. The reference files provide the base templates; agents extend them with domain-specific items.

### Example extensions per agent type
- **SAST/SCA agents**: Add taint trace completeness and manifest coverage checks
- **SonarQube-style agents**: Add rating sanity check (A–E consistency with findings)
- **Threat modeling agents**: Add STRIDE category completeness per trust boundary
- **Code review agents**: Add trust boundary audit with data flow tracing
