---
name: ai-team-orchestration
description: 'Bootstrap and run a lightweight multi-agent development team. Use when starting or adopting a project, planning work, coordinating implementation and optional QA, brainstorming with distinct perspectives, or preserving context across sessions.'
---

# AI Team Orchestration

Use three stable agents:

| Agent | Purpose |
|---|---|
| `@ai-team-producer` | Clarify scope, plan proportionately, coordinate, and merge |
| `@ai-team-dev` | Implement, test, self-review, and prepare the pull request |
| `@ai-team-qa` | Independently test behavior when dedicated QA is useful |

Nova, Sage, and Milo are perspectives inside the Dev agent, not mandatory project layers.

## Default Workflow

**Plan -> Implement -> Test -> optional review or QA -> Merge -> update project state**

Keep the workflow proportional:

- Skip formal planning for small, obvious changes.
- Use a short plan for multi-step or cross-cutting work.
- Add independent review or QA when risk, uncertainty, or repository policy justifies it.
- Let branch protection, required checks, permissions, and merge queues enforce repository merge policy.

## Start or Adopt a Project

1. Read existing repository instructions and documentation.
2. Discover the actual stack, architecture, commands, deployment model, and risks.
3. Create or update `PROJECT_BRIEF.md` only when durable cross-session context is useful. Start from the [project brief template](./references/project-brief-template.md) and omit irrelevant sections.
4. For substantial work, create a concise plan from the [sprint plan template](./references/sprint-plan-template.md).
5. Use a separate branch or clone when parallel sessions could conflict, following the repository's own Git policy.

## Execute

### Producer

- Define the outcome, constraints, acceptance criteria, and explicit exclusions.
- Choose review and QA based on risk rather than ceremony.
- Keep durable project state concise and current.

### Dev

- Follow repository conventions and implement the smallest complete solution.
- Run relevant checks and inspect the final diff.
- Open or update the pull request with summary, verification, and limitations.

### QA

- Use only when dedicated behavioral verification adds value.
- Test the requested change and important regressions.
- Report reproducible findings and verify fixes.

## Brainstorms

Use the [brainstorm format](./references/brainstorm-format.md) for product or architecture decisions that benefit from competing perspectives. For ordinary implementation choices, let Dev decide using repository conventions.

## Context Recovery

Before ending a long or interrupted session:

1. Update the active plan or progress note if one exists.
2. Record material decisions, blockers, and the next action in repository context.
3. Use a cold-start prompt such as:

```text
Read the repository instructions, then read whichever sources exist for this
work: the active issue or request, PROJECT_BRIEF.md, and the active plan or
progress note.
Continue from the recorded next action.
```

## Tool and Model Inheritance

The bundled agents intentionally omit `tools` and `model` frontmatter:

- available built-in, MCP, and extension tools remain usable;
- developers keep control of model selection;
- role boundaries are defined by instructions and normal trust, permission, authentication, and approval controls.

If the environment exposes too many tools, deselect irrelevant tools or MCP servers, or use VS Code virtual-tool management. Do not add a machine-specific plugin allowlist.

## Principles

- Prefer working software and clear handoffs over process artifacts.
- Follow repository policy instead of embedding universal Git commands.
- Preserve unknown work and ask before destructive or privileged actions.
- Keep bugs and important decisions in durable project systems, not only chat.
- See [anti-patterns](./references/anti-patterns.md) for concise lessons.
