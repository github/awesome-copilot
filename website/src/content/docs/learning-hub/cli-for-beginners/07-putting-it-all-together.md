---
title: "Putting It All Together"
description: "Combine prompts, planning, agents, skills, MCP, and light automation into a beginner-friendly workflow you can practice end to end."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-03-18
estimatedReadingTime: "15 minutes"
tags:
  - copilot-cli
  - beginners
  - course
  - wrap-up
prerequisites:
  - Complete 06 · MCP Servers.
relatedArticles:
  - ./index.md
  - ./04-agents-and-custom-instructions.md
  - ./05-skills.md
  - ./06-mcp-servers.md
  - ./automating-with-hooks.md
---

> **Everything you learned combines here. Go from idea to tested change with less context switching and more intentional teamwork between you and Copilot CLI.**

This final chapter is about orchestration, not complexity. You do **not** need every advanced feature on every task. The real lesson is learning how to combine the right level of help at the right time: plain prompting first, then planning, then specialists, then live context, then review.

> **Hands-on note:** you can read this chapter entirely inside the Learning Hub, but the longer assignment is easiest in the companion repo [`github/copilot-cli-for-beginners`](https://github.com/github/copilot-cli-for-beginners). If you stay in `awesome-copilot`, the try-it-yourself section includes a repo-local variation too.

## Learning objectives

By the end of this chapter, you should be able to:

- describe a practical end-to-end Copilot CLI workflow from idea to review
- decide when plain prompting is enough and when agents, skills, or MCP add value
- use a repeatable pattern for feature work, bug fixing, and onboarding
- recognize where light automation, such as hooks or scripted prompts, can reduce repetition
- complete a small capstone-style assignment with planning, implementation, review, and summary

## Real-world analogy: the orchestra

<img src="/images/learning-hub/copilot-cli-for-beginners/07/orchestra-analogy.png" alt="Orchestra analogy showing different sections working together like prompts, agents, skills, and MCP" width="800" />

An orchestra works because different sections contribute different strengths:

- **core prompting** is the steady foundation
- **agents** bring specialist judgment
- **skills** add repeatable task playbooks
- **MCP** connects the performance to live systems and current information

Individually, each part is useful. Conducted well, they become a full workflow.

## The workflow to remember

When Copilot CLI feels most effective, the session usually follows this arc:

1. **Gather context** — inspect code, docs, history, issues, or requirements
2. **Plan the work** — decide what should change before editing
3. **Execute** — use plain prompts, agents, skills, or MCP-backed tools as needed
4. **Verify** — test, review, compare outputs, and tighten the work
5. **Share** — summarize the change, prepare the commit or PR, and capture follow-up tasks

That pattern matters more than memorizing every command.

## Idea to implementation in one session

The source chapter shows a bigger “idea to merged PR” workflow. For a beginner-friendly Learning Hub version, focus on the shape first:

```bash
copilot
```

```text
> I need to add a "list unread" command to the book app. What files need to change?
> /plan Add a "list unread" command with tests and help text updates
> @samples/book-app-project/books.py Design a get_unread_books method
> @samples/book-app-project/tests/test_books.py Design test cases for unread books
> Implement the feature
> /review
> Summarize the final changes and suggest a pull request title
```

Notice how the session moves:

- start with the problem, not the implementation details
- slow down with `/plan` before editing
- pull in focused file context with `@`
- review before sharing the result

That is already a strong professional workflow, even before you add custom agents or automation.

<img src="/images/learning-hub/copilot-cli-for-beginners/07/combined-workflows.png" alt="Illustration of multiple Copilot CLI workflows combining into one bigger process" width="800" />

## The integration pattern

<img src="/images/learning-hub/copilot-cli-for-beginners/07/integration-pattern.png" alt="Four-phase integration pattern showing gather context, analyze and plan, execute, and complete" width="800" />

Use this simple mental model when deciding what to add to a workflow:

| Phase                | What you are trying to do                        | What helps most                                                  |
| -------------------- | ------------------------------------------------ | ---------------------------------------------------------------- |
| **Gather context**   | Understand the task, codebase, or external state | `@` references, GitHub MCP, filesystem MCP, docs lookup          |
| **Analyze and plan** | Decide on the safest or clearest approach        | `/plan`, `/research`, specialist agents                          |
| **Execute**          | Make the change or produce the draft             | plain prompting first, then skills or agents if the task repeats |
| **Complete**         | Check quality and prepare the handoff            | `/review`, tests, PR summaries, hooks, commit-message generation |

> **Rule of thumb:** add more power only when it reduces friction. If normal prompting is enough, keep it simple.

## Three practical workflows to copy

### Workflow 1: bug investigation and fix

```text
> Get the details of issue #1
> /research Best practices for Python case-insensitive string matching
> @samples/book-app-project/books.py Show me the find_by_author method
> Analyze why partial name matching might fail
> Implement the fix and add tests
> /review
```

This combines live issue context, focused code context, research, implementation, and review.

### Workflow 2: onboarding to a new codebase

```text
> @samples/book-app-project/ Explain the architecture of this codebase
> @samples/book-app-project/book_app.py Walk me through the add-book flow
> List open issues labeled "good first issue"
> Suggest the simplest one to start with and outline a plan
```

This is one of the best beginner uses of Copilot CLI because it turns a confusing repo into a guided tour.

### Workflow 3: light automation for repeated checks

Once a pattern becomes repetitive, move some of it out of your head and into tooling.

Examples:

- use `/review` before a commit or PR
- keep stable repo rules in `AGENTS.md` or instruction files
- turn repeatable checklists into skills
- add hooks for guardrails you always want

If you want a deeper hooks walkthrough, continue with [Automating with Hooks](../automating-with-hooks/).

<details>
<summary>Optional: a tiny pre-commit review example</summary>

The source course shows a manual git hook that calls Copilot in programmatic mode for staged files. The exact script is less important than the idea: **automate checks you repeat often**.

If you later explore hooks, be mindful of runtime and permissions. Start small, such as a lightweight review on critical files only.

</details>

## Use the full stack only when it helps

A common beginner mistake is trying to use prompts, agents, skills, MCP, hooks, and long custom instructions all at once.

A better progression is:

1. start with a clear prompt
2. add `/plan` when the change has multiple parts
3. add an agent when a specialist viewpoint would genuinely help
4. add a skill when the same task shape keeps repeating
5. add MCP when live context would save manual work
6. add hooks or scripts when the workflow becomes routine

That keeps the workflow understandable instead of overwhelming.

## Practice

## ▶️ Try it yourself

### Exercise 1: run the simple end-to-end pattern

In any repo, try this sequence:

```bash
copilot
```

```text
> Explain the goal of the files I am about to change
> /plan Describe the safest implementation approach
> Draft the change
> /review
> Summarize what changed and what I should verify manually
```

### Exercise 2: use this repository as your practice ground

In `awesome-copilot`, pick one learning-hub page or skill folder and ask Copilot to:

```text
> Explain the purpose of website/src/content/docs/learning-hub/
> /plan Improve one learning-hub page for clarity and scannability
> Compare the draft against repo guidance in AGENTS.md
> Summarize the files that would likely change
```

This gives you a safe workflow rehearsal even if you are not changing product code.

### Exercise 3: compare tool choices

Choose one task and ask yourself:

- is a plain prompt enough?
- would `/plan` reduce risk?
- would an agent or skill help because the task repeats?
- would MCP save me from gathering context manually?

That reflection is the real capstone skill.

## 📝 Assignment

### Main challenge: end-to-end feature practice

The source chapter uses a book app feature as the capstone. Try the same pattern on this task in the companion repo:

**Build a search-by-year-range feature.**

1. Gather context with `@samples/book-app-project/books.py`
2. Run `/plan Add a search by year command that lets users find books published between two years`
3. Implement `find_by_year_range(start_year, end_year)` in `BookCollection`
4. Add or update the CLI handler in `book_app.py`
5. Generate or refine tests in `samples/book-app-project/tests/test_books.py`
6. Run `/review`
7. Update the companion repo README if the command changes user-facing behavior
8. Ask Copilot to draft a commit message or PR title

**Success criteria:** you complete the full path from idea → context → plan → implementation → tests → review → summary using one focused Copilot CLI workflow.

### Optional alternative: course-content workflow in this repo

If you prefer to stay in `awesome-copilot`, do a content-focused version instead:

1. choose one learning-hub page
2. ask Copilot to explain the current structure
3. run `/plan` for a clearer beginner-friendly revision
4. compare the result against repo guidance in `AGENTS.md`
5. review the final draft and summarize the expected file changes

That mirrors the same workflow, just on documentation instead of application code.

<details>
<summary>💡 Hints</summary>

**Prompt sequence for the companion repo:**

```text
> @samples/book-app-project/books.py Explain the current search-related methods
> /plan Add a search by year command that validates the range and updates tests
> Implement the feature
> @samples/book-app-project/tests/test_books.py Add tests for invalid years, reversed ranges, and no matches
> /review
> Summarize the final changes and generate a commit message
```

**Things to watch for:**

- range validation (`2000` to `1990` should not be treated as normal input)
- empty results should be explained clearly to the user
- tests should cover both happy paths and edge cases
- if the CLI changes, the README or help text often needs updating too
</details>

<details>
<summary>🔧 Common mistakes and troubleshooting</summary>

### Common mistakes

| Mistake                                   | What happens                                  | Fix                                                              |
| ----------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| Jumping straight to implementation        | You miss design or testing steps              | Use `/plan` first for multi-part work                            |
| Pulling in every advanced feature at once | The workflow becomes noisy and hard to follow | Add agents, skills, and MCP only when they solve a real problem  |
| Keeping unrelated tasks in one session    | Context gets muddy                            | Start a fresh session or use `/clear` when the topic changes     |
| Skipping review before sharing            | Bugs or clarity issues slip through           | Use `/review` and summarize what still needs manual verification |

### Troubleshooting

- **"The answer feels too generic"** → add file context with `@` or bring in MCP-backed context.
- **"The plan is vague"** → ask for missing parts explicitly, such as tests, docs, or edge cases.
- **"The session is getting messy"** → use `/clear`, rename the session, or start a fresh one.
</details>

## Key takeaways

1. **The core workflow still matters most:** describe, plan, implement, verify, share.
2. **Agents, skills, and MCP are helpers, not requirements for every task.**
3. **The best sessions stay focused on one change or one investigation.**
4. **Review and summary are part of the workflow, not an afterthought.**
5. **When a pattern repeats, that is your cue to automate or package it.**
