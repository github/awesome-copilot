---
title: "Agents and Custom Instructions"
description: "Use built-in and custom agents, decide what belongs in always-on instructions, and practice a repeatable Copilot CLI setup."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-03-18
estimatedReadingTime: "12 minutes"
tags:
  - copilot-cli
  - beginners
  - course
  - agents
  - instructions
prerequisites:
  - Complete 03 · Development Workflows.
relatedArticles:
  - ./index.md
  - ./03-development-workflows.md
  - ./05-skills.md
---

> **Use the right specialist, keep project rules loaded automatically, and make Copilot CLI feel more consistent from one session to the next.**

Chapter 03 showed you what Copilot CLI can _do_. This chapter shows you how to shape _how_ it helps. Agents let you bring in a specialist for a task. Custom instructions give Copilot background rules it should remember every time it works in a repository.

> **Hands-on note:** The practice tasks in this chapter assume you are using the companion repo: [`github/copilot-cli-for-beginners`](https://github.com/github/copilot-cli-for-beginners). If you are only reading in the Learning Hub, focus on the concepts and use this repository's `agents/`, `instructions/`, and `AGENTS.md` files as examples.

## Learning objectives

By the end of this chapter, you should be able to:

- use beginner-friendly built-in agents like `/plan`, `/review`, and `/init`
- explain when to reach for a custom agent instead of a generic prompt
- place agent files where Copilot CLI can find them and invoke them in interactive or programmatic mode
- decide what belongs in an agent versus an always-on instruction file such as `AGENTS.md`
- practice a small setup that combines a specialist agent with reusable project guidance

## Real-world analogy: hiring specialists

When you need help with your house, you do not call one generic helper for everything. You call a plumber for pipes, an electrician for wiring, and a roofer for the roof. Copilot CLI works the same way: a specialist agent gives you stronger defaults for a specific job.

<img src="/images/learning-hub/copilot-cli-for-beginners/04/hiring-specialists-analogy.png" alt="Hiring specialists analogy showing how different agent types help with different tasks" width="800" />

## _New to Agents?_ Start Here!

If this is your first serious pass through agents, keep the first steps simple:

1. **Try a built-in agent immediately:**
   ```bash
   copilot
   > /plan Add input validation for book year in the book app
   ```
2. **Read one real agent file:** in this repository, open `agents/plan.agent.md`, `agents/mentor.agent.md`, or `agents/se-security-reviewer.agent.md` and notice the frontmatter plus markdown instructions.
3. **Compare with always-on guidance:** read `AGENTS.md` and then skim `instructions/agent-skills.instructions.md` or `instructions/markdown.instructions.md` so you can see the difference between a specialist and repo-wide rules.

That is the core mental model for this chapter: **agents are specialists you choose, while custom instructions are the project rules Copilot keeps in the background.**

## Agents vs. custom instructions

| Tool                    | Best for                                                                     | How it activates                                              |
| ----------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **Built-in agent**      | Planning, reviewing, initialization, and other built-in workflows            | You invoke commands such as `/plan`, `/review`, or `/init`    |
| **Custom agent**        | A specialist persona like Python reviewer, docs helper, or security reviewer | You choose it with `/agent` or `copilot --agent <name>`       |
| **Custom instructions** | Coding standards, architecture notes, testing rules, and team expectations   | Copilot reads them automatically when it loads the repository |

A good rule of thumb:

- use an **agent** when you want a specialist _right now_
- use **instructions** when you want guidance to apply _all the time_
- use **both together** when you want a specialist working inside your project's rules

## Built-in agents you can use today

You have already met some built-in agents in earlier chapters. Here they are again with a bit more context.

| Agent           | How to invoke it          | What it is good at                                                            |
| --------------- | ------------------------- | ----------------------------------------------------------------------------- |
| **Plan**        | `/plan` or mode switching | Proposes a step-by-step implementation path before edits happen               |
| **Code review** | `/review`                 | Reviews current changes and calls out correctness or risk issues              |
| **Init**        | `/init`                   | Scaffolds starting instructions and repo guidance                             |
| **Explore**     | Automatic                 | Investigates the codebase when Copilot needs to understand files or structure |
| **Task**        | Automatic                 | Runs commands such as tests, builds, or validations and reports back cleanly  |

```bash
copilot

> /plan Add validation for the book year input
> /review
> /init
```

<img src="/images/learning-hub/copilot-cli-for-beginners/04/using-agents.png" alt="Illustration of different specialized agents working together" width="800" />

A beginner-friendly takeaway: you do **not** need custom agents on day one. Built-ins already cover planning, review, and setup. Custom agents become valuable when you want the same specialized behavior again and again.

## Adding agents to Copilot CLI

Custom agents are markdown files ending in `.agent.md`. In your own project, put them in one of these places:

| Location             | Scope            | Best for                                      |
| -------------------- | ---------------- | --------------------------------------------- |
| `.github/agents/`    | Project-specific | Team-shared agents that belong in the repo    |
| `~/.copilot/agents/` | Personal         | Agents you want available across all projects |

> **Repo note:** This repository stores community examples in the top-level `agents/` directory because it is a catalog of reusable resources. In a normal working repo, prefer `.github/agents/`.

A minimal agent can stay very small:

```markdown
---
name: reviewer
description: "Code reviewer focused on bugs and security issues"
---

# Code Reviewer

Review changes for correctness, risky edge cases, and security problems.
Prefer concrete fixes over general advice.
```

The `description` helps Copilot understand when the agent is relevant. The body is where you define the checklist, tone, and priorities the specialist should bring to the work.

<details>
<summary>What makes a useful custom agent?</summary>

A strong beginner-friendly custom agent usually has three ingredients:

1. **One clear job** — review Python, explain architecture, write tests, or draft docs
2. **A repeatable checklist** — what it should always inspect or optimize
3. **A clear style** — concise, cautious, security-focused, teaching-oriented, and so on

If an agent tries to do everything, it stops feeling special. The best custom agents are narrow enough that you instantly know when to use them.

</details>

## Two ways to use custom agents

### Interactive mode

Inside an interactive session, list available agents and switch to one for the rest of the conversation:

```bash
copilot
> /agent
```

This is the easiest way to experiment because you can compare the same conversation with and without a specialist.

### Programmatic mode

If you already know which specialist you want, start with it directly:

```bash
copilot --agent python-reviewer
> Review @samples/book-app-project/books.py
```

That is useful when you want a one-purpose session or a repeatable shell command.

<details>
<summary>🎬 See it in action!</summary>

![Python Reviewer Demo](/images/learning-hub/copilot-cli-for-beginners/04/python-reviewer-demo.gif)

_Demo output varies. Your model, tools, and responses will differ from what is shown here._

</details>

## Specialist vs. generic: feel the difference

This is the practical reason to care about custom agents.

Without a specialist, you might say:

```text
> Add a function to search books by year range in the book app
```

That often gets you a working answer, but it may skip type hints, input validation, tests, naming conventions, or error handling.

Now try the same task after selecting a Python-focused reviewer or implementation agent. A stronger specialist answer is more likely to include:

- type hints and clearer function signatures
- docstrings or usage notes
- input validation and edge-case handling
- naming and formatting that match the language's conventions
- suggestions for tests, not just the implementation

The lesson is not that generic Copilot is bad. The lesson is that a specialist agent gives you better defaults, so you spend less time remembering every instruction yourself.

## Keep project guidance always-on

<img src="/images/learning-hub/copilot-cli-for-beginners/04/creating-custom-agents.png" alt="Illustration of a custom agent being assembled from reusable parts" width="800" />

Agents help on demand. Custom instructions help all the time.

The three most useful beginner formats are:

| File                                     | Use it when...                                                |
| ---------------------------------------- | ------------------------------------------------------------- |
| `AGENTS.md`                              | You want one human-readable guide for the whole project       |
| `.github/copilot-instructions.md`        | You want one Copilot-specific instruction file                |
| `.github/instructions/*.instructions.md` | You want smaller rules for a topic, language, or file pattern |

A quick setup path is:

```bash
copilot
> /init
```

Then refine what it generates. In this repository, compare the root `AGENTS.md` with files in `instructions/` to see how broad guidance and focused rules can complement each other.

If you want to see the difference instructions make, temporarily disable them:

```bash
copilot --no-custom-instructions
```

That is useful for debugging or for checking whether an answer improved because of your repo guidance.

### Where should the files live?

<img src="/images/learning-hub/copilot-cli-for-beginners/04/agent-file-placement-decision-tree.png" alt="Decision tree showing where to place agent files for experimenting, team use, or personal global use" width="800" />

A simple decision guide:

- experimenting for one project? start in `.github/agents/`
- want the whole team to share it? keep it in the repo and commit it
- want it everywhere? move or copy it to `~/.copilot/agents/`

For instructions, start with `AGENTS.md` if you want the lowest-friction, most readable option.

## Practice

## ▶️ Try it yourself

### Built-in warm-up

In the companion repo, start a session and run:

```text
> /plan Add validation for empty titles in the book app
> /review
```

Notice the difference between a planning response and a review response. One maps the work. The other critiques it.

### Compare generic vs. specialist

1. Ask a normal prompt first: `Add a search-by-year feature to the book app`
2. Then select a specialist agent with `/agent`
3. Ask the exact same prompt again
4. Compare the answers for structure, safety checks, and testing suggestions

### Inspect repo guidance

In this repository, ask Copilot questions such as:

```text
> Summarize the key rules in @AGENTS.md
> Compare @instructions/agent-skills.instructions.md with @AGENTS.md
```

That exercise helps you see what belongs in always-on instructions versus a specialist agent.

## 📝 Assignment

### Main challenge: create a reusable reviewer setup

Use a scratch repo or the companion repo and build a small setup that combines one custom agent with one instruction file.

1. Create a custom agent such as `security-reviewer.agent.md` or `python-reviewer.agent.md`
2. Give it a narrow purpose and a short checklist
3. Add project-wide guidance in `AGENTS.md` or `.github/copilot-instructions.md`
4. Start Copilot CLI and use `/agent` to select your specialist
5. Review one file in the book app or a repo you know well
6. Repeat the task once with `copilot --no-custom-instructions` so you can compare the result
7. Write down what improved because of the agent, what improved because of the instructions, and what still needed a manual prompt

**Success criteria:** you should finish with one specialist agent, one always-on guidance file, and a clear explanation of which responsibilities belong in each.

<details>
<summary>💡 Hints</summary>

- Put _task-specific behavior_ in the agent: for example, “focus on Python typing and defensive programming.”
- Put _repo-wide expectations_ in instructions: naming rules, testing commands, or security requirements.
- If your agent needs too many jobs, split it into two simpler agents instead.
</details>

### Bonus challenge: decide what goes where

Take this checklist and split it into the right home:

- “Always run the repo test command before finishing”
- “When reviewing Python, look for bare `except` blocks”
- “Prefer concise explanations for beginner contributors”
- “Document breaking changes in the changelog”

Which items belong in an agent, which belong in instructions, and which might belong in both?

## Key takeaways

1. **Built-in agents** give you practical wins immediately: planning, reviewing, and initialization.
2. **Custom agents** are specialists you deliberately choose for a task.
3. **Custom instructions** are the repo's background rules and should hold stable expectations.
4. The best setup often combines both: a specialist agent working inside clear project guidance.
