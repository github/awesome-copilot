# Superpowers Dev Workflow Plugin

A structured development workflow pack for GitHub Copilot focused on predictable implementation quality:

- Plan before coding
- Execute against an approved plan
- Verify before completion
- Review by severity

## Installation

```bash
copilot plugin install superpowers-dev-workflow@awesome-copilot
```

## Included Assets

- Agent:
  - `superpowers-code-reviewer`
- Skills:
  - `superpowers-planning-gate`
  - `superpowers-execution-gate`
  - `superpowers-verification-gate`

## Companion Instructions

Use these with the plugin for dual-scope rollout:

- Repo guardrails: `instructions/superpowers-repo-workflow.instructions.md`
- User baseline: `instructions/superpowers-user-workflow.instructions.md`

## Status

Initial implementation slice (v0.1.0). This version focuses on process gates and portability across Copilot models.
