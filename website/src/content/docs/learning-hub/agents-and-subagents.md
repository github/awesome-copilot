---
title: 'Agents and Subagents'
description: 'Learn how delegated subagents differ from primary agents, when to use them, and how to launch them in VS Code and Copilot CLI.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-05-07
estimatedReadingTime: '9 minutes'
tags:
  - agents
  - subagents
  - orchestration
  - fundamentals
relatedArticles:
  - ./building-custom-agents.md
  - ./what-are-agents-skills-instructions.md
  - ./github-copilot-terminology-glossary.md
prerequisites:
  - Basic understanding of GitHub Copilot agents
---

We're [familiar with agents](../what-are-agents-skills-instructions/), but there is another aspect to agentic workflows that we need to consider, and that is the role of subagents. An **agent** is the primary assistant you choose for a session or workflow while a **subagent** is a temporary worker that the main agent launches for a narrower task, usually to keep context clean, parallelize work, or apply a more specialized set of instructions.

This distinction matters more as you move from simple chat prompts to orchestrated agentic workflows.

## Start with the mental model

Think of the main agent as a project lead and subagents as focused contributors:

| Topic | Agent | Subagent |
|------|------|------|
| How it starts | Selected by the user or configured for the workflow | Launched by another agent or orchestrator |
| Lifetime | Persists across the main conversation or session | Temporary; exists only for the delegated task |
| Context | Carries the broader conversation and goals | Gets a narrower prompt and its own isolated context |
| Scope | Coordinates the whole task | Performs one focused piece of work |
| Output | Talks directly with the user | Reports back to the main agent, which synthesizes the result |

In practice, the main agent keeps the big picture while subagents absorb the noisy intermediate work: research, code inspection, specialized review passes, or independent implementation tracks.

## What changes when work moves to a subagent

Subagents are useful because they are not just "the same agent in another tab." They usually change the shape of the work in a few important ways:

- **Context isolation**: the subagent gets only the task-relevant prompt, which reduces distraction from earlier conversation history.
- **Focused instructions**: the subagent can use a tighter role, such as planner, implementer, reviewer, or researcher.
- **Parallelism**: multiple subagents can work at the same time when tasks do not conflict.
- **Controlled synthesis**: the parent agent decides what gets brought back into the main conversation.
- **Alternative model selection**: the subagent can use a different AI model to perform a task, so while our main agent might be using a generalist model, a subagent could be configured to use a more specialized one for code review or research.

That isolation is one of the main reasons subagents can outperform a single monolithic agent on larger tasks.

## When to use subagents

Subagents work especially well when you need to:

- research before implementation
- compare multiple approaches without polluting the main thread
- run parallel review perspectives, such as correctness, security, and architecture
- split large work into independent tracks with explicit dependencies
- keep an orchestrator agent focused on coordination rather than direct execution
- compare multiple approaches across different models

If all of the work happens in one small file and does not need decomposition, a subagent may be unnecessary. The benefit appears when delegation reduces context pressure or lets multiple tracks run independently.

## Launch subagents in VS Code

In VS Code, subagents are typically **agent-initiated**. You usually describe the larger task, and the main agent decides when to delegate a focused subtask. To make that possible, the agent needs access to the subagent tool.

### 1. Enable the agent tool

Use the `agent` tool in frontmatter so the main agent can launch other agents:

```yaml
---
name: Feature Builder
tools: ['agent', 'read', 'search', 'edit']
agents: ['Planner', 'Implementer', 'Reviewer']
---
```

The `agents` property acts as an allowlist for which worker agents this coordinator can call.

### 2. Define worker agents with clear boundaries

Worker agents are often hidden from the picker and reserved for delegation:

```yaml
---
name: Planner
user-invocable: false
tools: ['read', 'search']
---
```

You can also use `disable-model-invocation: true` to prevent an agent from being used as a subagent unless another coordinator explicitly allows it.

### 3. Prompt for isolated or parallel work

You do not always need to say "run a subagent," but prompts that describe isolated research or parallel tracks make delegation easier. For example:

```text
Analyze this feature in parallel:
1. Research existing code patterns
2. Propose an implementation plan
3. Review likely security risks
Then summarize the findings into one recommendation.
```

### 4. Know the nesting rule

By default, subagents do not keep spawning additional subagents. In VS Code, recursive delegation is controlled by the `chat.subagents.allowInvocationsFromSubagents` setting, which is off by default.

## Launch subagents in Copilot CLI

In GitHub Copilot CLI, the clearest end-user entry point is **`/fleet`**. Fleet acts as an orchestrator that decomposes a larger objective, launches multiple background subagents, respects dependencies, and then synthesizes the final result.

```text
/fleet Update the auth docs, refactor the auth service, and add related tests.
```

For non-interactive execution:

```bash
copilot -p "/fleet Update the auth docs, refactor the auth service, and add related tests." --no-ask-user
```

> **Prompt mode and repo hooks (v1.0.40+)**: When using `copilot -p "..."` (prompt mode), repository hooks are disabled by default for security. If your `/fleet` workflow relies on hooks (e.g., auto-formatting or lint checks after edits), opt in by setting `GITHUB_COPILOT_PROMPT_MODE_REPO_HOOKS=true` before running. See [Automating with Hooks](../automating-with-hooks/) for details.

The important behavior is different from a single chat turn:

- the orchestrator plans work items first
- independent tasks can run in parallel
- each subagent gets its own context window
- subagents share the same filesystem, so overlapping writes should be avoided

That makes `/fleet` a practical way to launch subagents even if you are not authoring custom agent files yourself.

### Rubber-duck agent (experimental)

Available in `/experimental` (v1.0.42+), the **rubber-duck agent** applies a novel multi-model pattern: when you're working in a GPT-powered session, the rubber-duck agent internally routes certain requests through Claude to provide a second perspective. The idea is similar to rubber-duck debugging — talking through a problem with a different "listener" often surfaces assumptions or blind spots you didn't notice.

To try it, enable experimental features and then select the rubber-duck agent from the agent picker:

```
/experimental           # toggle experimental features
/agent                  # open the agent picker and select rubber-duck
```

Because it runs as a sub-agent layer rather than replacing your primary model, you keep your current session model and context while the rubber-duck analysis runs in the background.

> **Note**: This is an experimental feature and may change. Provide feedback via `/feedback` if you find it useful.

## Orchestration patterns that work well

### Coordinator and worker

One agent owns the workflow and delegates to narrower specialists such as planner, implementer, and reviewer. This keeps the coordinator lightweight and makes the worker prompts more precise.

### Multi-perspective review

Run parallel subagents for different lenses - correctness, security, code quality, architecture - and combine the results after they finish.

### Research, then act

Use one subagent to gather facts and another to implement with those facts. This pattern is especially helpful when you want the main thread to stay free of exploratory noise.

The built-in **`/research`** command uses this orchestrator/subagent model automatically (v1.0.40+): it spawns an orchestrator that breaks the topic into research threads, runs them in parallel as subagents, and synthesizes the findings into a structured report. This means you get deeper and more reliable results than a single-turn query provides — without having to set up the multi-agent pattern yourself.

## Repository examples you can inspect

This repository already includes a few useful examples of delegation-related syntax:

- [`agents/context7.agent.md`](https://github.com/github/awesome-copilot/blob/main/agents/context7.agent.md) is a concrete example of VS Code-style `handoffs`. It defines a handoff button that can pass work to another agent after research is complete.
- [`agents/rug-orchestrator.agent.md`](https://github.com/github/awesome-copilot/blob/main/agents/rug-orchestrator.agent.md) is a strong coordinator example. It enables the `agent` tool and restricts delegation with `agents: ['SWE', 'QA']`.
- [`agents/gem-orchestrator.agent.md`](https://github.com/github/awesome-copilot/blob/main/agents/gem-orchestrator.agent.md) shows invocation control with `user-invocable` and `disable-model-invocation`, which is useful when deciding whether an orchestrator should be directly selectable, delegatable, or both.
- [`agents/custom-agent-foundry.agent.md`](https://github.com/github/awesome-copilot/blob/main/agents/custom-agent-foundry.agent.md) documents the VS Code `handoffs` shape in its guidance section, which is helpful if you want a template before creating your own coordinator workflow.

## Important platform nuance: handoffs are not universal

VS Code documentation describes both subagents and the `handoffs` frontmatter property. [GitHub's custom agent configuration reference](https://docs.github.com/en/copilot/customizing-copilot/github-copilot-agents/configuration-reference-for-github-copilot-agents), however, notes that `handoffs` and `argument-hint` are currently ignored for Copilot cloud agent on GitHub.com.

That means you should think about delegation features in product-specific terms:

- **VS Code**: supports subagent concepts, allowlists, and handoff-oriented agent composition
- **Copilot CLI**: exposes practical orchestration through commands like `/fleet`
- **GitHub.com coding agent / cloud agent**: supports custom agents, but some VS Code-specific frontmatter is intentionally ignored

If you share agent files across surfaces, document those differences so users know which behaviors are portable and which are editor-specific.

## Common questions

**Do users always invoke subagents directly?**

No. Most of the time the main agent launches them when it decides the task benefits from context isolation or parallelism.

**Can a subagent use a different model or tool set?**

Yes, when the delegated worker is a custom agent with its own frontmatter.

**Are subagents always parallel?**

No. They can run sequentially when one step depends on another, or in parallel when work items are independent.

## Next steps

- Read [Building Custom Agents](../building-custom-agents/) to design coordinator and worker agents.
- Revisit [What are Agents, Skills, and Instructions](../what-are-agents-skills-instructions/) for the broader customization model.
- Keep the [GitHub Copilot Terminology Glossary](../github-copilot-terminology-glossary/) nearby when comparing terminology across products.

---
