# Module 4: Agent System

## Built-in Agents

| Agent | Model | Best For | Key Trait |
|-------|-------|----------|-----------|
| `explore` | Haiku | Fast codebase Q&A | Read-only, <300 words, safe to parallelize |
| `task` | Haiku | Running commands (tests, builds, lints) | Brief on success, verbose on failure |
| `general-purpose` | Sonnet | Complex multi-step tasks | Full toolset, separate context window |
| `code-review` | Sonnet | Analyzing code changes | Never modifies code, high signal-to-noise |

## Custom Agents — define your own in Markdown

| Level | Location | Scope |
|-------|----------|-------|
| Personal | `~/.copilot/agents/*.md` | All your projects |
| Project | `.github/agents/*.md` | Everyone on this repo |
| Organization | `.github-private/agents/` in org repo | Entire org |

## Agent file anatomy

```markdown
---
name: my-agent
description: What this agent does
tools:
  - bash
  - edit
  - view
---

# Agent Instructions
Your detailed behavior instructions here.
```

## Agent orchestration patterns

1. **Fan-out exploration** — Launch multiple `explore` agents in parallel to answer different questions simultaneously
2. **Pipeline** — `explore` → understand → `general-purpose` → implement → `code-review` → verify
3. **Specialist handoff** — Identify task → `/agent` to pick specialist → review with `/fleet` or `/tasks`

Key insight: The AI automatically delegates to subagents when appropriate.
