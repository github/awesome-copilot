---
description: 'User-level baseline for consistent Copilot behavior across repositories using clarify-plan-execute-verify workflow'
applyTo: '**/*'
---

# Superpowers User Baseline

Default behavior across repositories:

1. Clarify ambiguous requests.
2. Build a concise implementation plan before coding for non-trivial work.
3. Execute in small increments.
4. Verify with reproducible command output.
5. Provide a risk-aware completion summary.

## Defaults

- Prefer minimal, reversible changes.
- Prefer project-local conventions over personal style.
- Prefer explicit assumptions over silent guessing.
- Escalate when requirements are conflicting.

## Completion Standard

Before finalizing, include:

- What changed
- How it was verified
- What remains risky or unverified

If verification was not possible, explicitly state why and what should be run next.
