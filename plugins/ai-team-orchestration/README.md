# AI Team Orchestration

Run a lightweight, role-separated AI development team with flexible tools, developer-selected models, proportionate planning, and optional QA.

## What's Included

### Agents

| Agent | Mention | Role |
|---|---|---|
| **Producer** (Remy) | `@ai-team-producer` | Scope, planning, coordination, triage, and merge |
| **Dev Team** (Nova, Sage, Milo) | `@ai-team-dev` | Stack-adaptive implementation, tests, self-review, and pull requests |
| **QA** (Ivy) | `@ai-team-qa` | Optional independent behavioral testing and fix verification |

The agents intentionally omit `tools` and `model` frontmatter. They inherit the developer's enabled built-in, MCP, and extension tools and use the developer-selected model. Role boundaries remain in the instructions and normal permission and approval controls.

### Skill

`/ai-team-orchestration` provides:

- a concise project brief template;
- a proportional work-plan template;
- brainstorm guidance with distinct perspectives;
- practical anti-patterns for multi-agent work.

## Default Workflow

```text
Plan -> Implement -> Test -> optional review or QA -> Merge -> update project state
```

Use the lightest process that fits the work. Small changes can proceed directly; substantial or risky changes benefit from a short plan, independent review, or dedicated QA.

## Quick Start

### Plan

```text
@ai-team-producer Help me define the next useful outcome for this project.
Use /ai-team-orchestration and keep planning proportional to the work.
```

### Implement

```text
@ai-team-dev Read the repository instructions and active plan or issue.
Implement the requested outcome, run relevant checks, self-review the diff,
and prepare the pull request. Do not merge.
```

### Optional QA

```text
@ai-team-qa Test the pull request against its acceptance criteria.
Focus on important behavior and regressions. Report Ready, Ready with minor
follow-ups, or Blocked with reproducible findings.
```

## Principles

- Producer coordinates but never implements application code.
- Dev implements and verifies but never merges or claims independent approval.
- QA is optional and independently verifies behavior without fixing application source.
- Repository contribution policy and platform protections define Git and merge behavior.
- Important context and bugs live in durable project files or issue trackers, not only chat.

## Origin

The plugin grew from [Arcade After Dark](https://github.com/denis-a-evdokimov/guess-and-get), a multi-agent project built with distinct planning, implementation, design, and QA perspectives.
