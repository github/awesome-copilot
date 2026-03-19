---
title: "Context and Conversations"
description: "Learn how richer context, multi-turn conversations, and saved sessions help Copilot CLI give more precise and useful answers."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-03-18
estimatedReadingTime: "14 minutes"
tags:
  - copilot-cli
  - beginners
  - course
  - context
prerequisites:
  - Complete 01 · Setup and First Steps with a working Copilot CLI setup.
relatedArticles:
  - ./index.md
  - ./00-quick-start.md
  - ./03-development-workflows.md
---

> **What if Copilot CLI could understand your codebase, remember your progress, and follow your train of thought instead of treating every prompt like a cold start?**

This chapter is where Copilot CLI stops feeling like a one-shot chatbot and starts feeling like a context-aware teammate. The core idea is simple: better context leads to better help. When you point Copilot CLI at the right files, ask follow-up questions, and resume the right session, the answers become much more specific and much more practical.

> **Hands-on note:** The best experience comes from using the companion repo: [`github/copilot-cli-for-beginners`](https://github.com/github/copilot-cli-for-beginners). The prompts below are written so you can try them in that sample repo, but you can also swap in your own files.

## Learning objectives

By the end of this chapter, you should be able to:

- use `@` references to point Copilot CLI at files, folders, and images
- build stronger multi-turn conversations instead of restarting from scratch
- use `--continue`, `--resume`, `/rename`, and `/context` to manage ongoing work
- recognize when to broaden context and when to narrow it
- practice a full context-aware review workflow in the companion repo

<img src="/images/learning-hub/copilot-cli-for-beginners/02/colleague-context-analogy.png" alt="Illustration comparing vague requests with context-rich requests when working with a colleague" width="800" />

## Why context changes everything

Imagine asking a teammate for help:

- **Without context:** “The book app is broken.”
- **With context:** “Please check `books.py`, especially the title search logic. It looks case-sensitive.”

Copilot CLI works the same way. It is powerful, but it is not a mind reader. Your job is to give it useful evidence:

- the file or directory you care about
- the symptom you are seeing
- the goal you want to reach
- the follow-up question that narrows the answer

That is why context is the difference between a generic answer and a genuinely useful one.

## Essential: basic context

<img src="/images/learning-hub/copilot-cli-for-beginners/02/essential-basic-context.png" alt="Abstract visualization of files and prompts flowing into a shared context for Copilot CLI" width="800" />

The first beginner skill is simply telling Copilot CLI what to inspect.

### The `@` syntax

The `@` symbol references files and directories in your prompt.

| Pattern         | Use it for                       | Example                                   |
| --------------- | -------------------------------- | ----------------------------------------- |
| `@file`         | one file                         | `@README.md`                              |
| `@file1 @file2` | comparing or connecting files    | `@package.json @website/package.json`     |
| `@folder/`      | reviewing a directory            | `@website/src/content/docs/learning-hub/` |
| `@image.png`    | reviewing a screenshot or mockup | `@images/mockup.png`                      |

### Try it now

```bash
copilot
```

```text
> Explain what @package.json does
> Summarize @README.md in one paragraph
> Compare @package.json and @website/package.json
```

If you do not have a project handy, make a tiny file and point Copilot at it:

```bash
echo "def greet(name): return 'Hello ' + name" > test.py
copilot
```

```text
> What does @test.py do?
```

### Reference a single file

Start with one clear target:

```text
> Explain what @samples/book-app-project/utils.py does
```

<details>
<summary>🎬 See it in action!</summary>

![File Context Demo](/images/learning-hub/copilot-cli-for-beginners/02/file-context-demo.gif)

_Demo output varies. Your model, tools, and responses will differ from what is shown here._

</details>

### Reference multiple files

When the answer depends on how files work together, give Copilot CLI both files up front:

```text
> Compare @samples/book-app-project/book_app.py and @samples/book-app-project/books.py for consistency
```

### Reference an entire directory

Broad directory context is useful when you want the big picture:

```text
> Review all files in @samples/book-app-project/ for error handling issues
```

## Cross-file understanding is where context becomes a superpower

<img src="/images/learning-hub/copilot-cli-for-beginners/02/cross-file-intelligence.png" alt="Visualization showing how cross-file analysis reveals issues that single-file reviews miss" width="800" />

A single-file review can catch local issues. A cross-file review can catch architectural problems, duplicate logic, and mismatched behavior between modules.

### Demo: understand how files work together

```text
> @samples/book-app-project/book_app.py @samples/book-app-project/books.py
> How do these files work together? Trace the data flow and point out any code smells.
```

A strong answer often surfaces things like:

- duplicate logic spread across modules
- inconsistent error handling between UI and business logic
- hidden dependencies that make refactoring harder

<details>
<summary>🎬 See it in action!</summary>

![Multi-File Demo](/images/learning-hub/copilot-cli-for-beginners/02/multi-file-demo.gif)

_Demo output varies. Your model, tools, and responses will differ from what is shown here._

</details>

### Demo: understand a codebase quickly

```text
> @samples/book-app-project/
> In one paragraph, what does this app do and what are its biggest quality issues?
```

This is a great onboarding move when you inherit a codebase, join a team, or come back to a project after a break.

## Build a conversation instead of restarting

One of the biggest beginner upgrades is learning to stay in the same conversation long enough for the context to pay off.

A productive session often looks like this:

1. ask a focused first question
2. inspect the answer
3. follow up to narrow or deepen the result
4. clear only when the topic actually changes

For example:

```text
> Explain @website/package.json for a beginner
> Which script should I run to build the site?
> What does that command do at a high level?
> What might break if that build fails?
```

Each follow-up builds on earlier answers, so you spend less time re-explaining the situation.

<details>
<summary>🎬 See a multi-turn conversation in action!</summary>

![Multi-Turn Demo](/images/learning-hub/copilot-cli-for-beginners/02/multi-turn-demo.gif)

_Demo output varies. Your model, tools, and responses will differ from what is shown here._

</details>

### A simple multi-turn pattern

When you are not sure how to start, use this pattern:

1. **Explain** — “What does this file do?”
2. **Inspect** — “Where are the risky parts?”
3. **Improve** — “What would you change first?”
4. **Verify** — “How would we test that safely?”

That pattern works for code review, onboarding, debugging, and planning.

## Sessions persist, which means your work can persist too

The source course puts a lot of emphasis on saved sessions because they are one of the easiest real productivity wins.

```bash
copilot --continue
```

Use `--continue` to reopen the most recent session.

```bash
copilot --resume
```

Use `--resume` to choose from earlier sessions.

Inside a session, these commands are especially helpful:

- `/rename` to give a session a memorable name
- `/context` to inspect context usage
- `/clear` to start a fresh topic

<img src="/images/learning-hub/copilot-cli-for-beginners/02/session-persistence-timeline.png" alt="Timeline showing a Copilot CLI session being resumed across multiple days" width="800" />

### Example: pick up a task later

```text
# Day 1
> /rename learning-hub-review
> @website/src/content/docs/learning-hub/copilot-cli-for-beginners.md
> Review this page and list any sections that still feel too placeholder-heavy
> /exit

# Later
$ copilot --continue
> What were the biggest issues we found last time?
```

That works because Copilot CLI stores session history and lets you come back to it instead of starting over.

## When to clear, compact, or narrow context

More context is not always better. The goal is **useful** context, not maximum context.

Use `/clear` when:

- you switch to a new feature or repo area
- earlier answers keep biasing the current task
- you want a clean restart with smaller scope

Use narrower prompts when:

- a folder review is too broad
- you only care about one file or function
- you want a shorter, more precise answer

<details>
<summary>Going a little deeper</summary>

<img src="/images/learning-hub/copilot-cli-for-beginners/02/optional-going-deeper.png" alt="Stylized cave image representing optional deeper exploration of context features" width="800" />

Once the basics feel comfortable, these next-level patterns are worth exploring:

- wildcard references such as `@**/*.md`
- image references for UI review
- `/compact` when a long conversation starts filling the context window
- `/session` and `/usage` when you want more session detail

You do not need all of these on day one. The beginner win is knowing when to add context and when to trim it back.

</details>

## Practice

## ▶️ Try it yourself

### Full project review

From the companion repo root, try a review that uses directory context:

```text
> @samples/book-app-project/ Give me a code quality review of this project
```

Copilot CLI will often identify issues such as:

- duplicate display functions
- missing input validation
- inconsistent error handling

### Session workflow

Try a short workflow that spans multiple turns and a resumed session:

```text
> /rename book-app-review
> @samples/book-app-project/books.py Let's add input validation for empty titles
> Implement that fix
> Now consolidate duplicate display functions in @samples/book-app-project/
> /exit
```

Later:

```bash
copilot --continue
```

```text
> Generate tests for the changes we made
```

### Three small challenges

1. **Cross-file challenge:**
   ```text
   > @samples/book-app-project/book_app.py @samples/book-app-project/books.py
   > What's the relationship between these files? Are there any code smells?
   ```
2. **Session challenge:** start a session, rename it with `/rename my-first-session`, do a little work, exit with `/exit`, then run `copilot --continue`.
3. **Context challenge:** run `/context` mid-session. If your context feels crowded later, try `/compact` and compare the result.

**Self-check:** You understand this chapter when you can explain why `@folder/` is sometimes helpful, but `@specific-file.py` is often more efficient.

## 📝 Assignment

### Main challenge: trace the data flow

The examples above focused on reviews and summaries. Now use the same context skills for a more realistic analysis task.

1. Start an interactive session with `copilot`
2. Ask Copilot CLI to trace data flow across two files:
   ```text
   > @samples/book-app-project/books.py @samples/book-app-project/book_app.py
   > Trace how a book goes from user input to being saved in data.json. Which functions are involved at each step?
   ```
3. Bring in the data file for extra context:
   ```text
   > @samples/book-app-project/data.json
   > What happens if this JSON file is missing or corrupted? Which functions would fail or need better error handling?
   ```
4. Ask for a cross-file improvement:
   ```text
   > @samples/book-app-project/books.py @samples/book-app-project/utils.py
   > Suggest a consistent error-handling strategy that works across both files.
   ```
5. Rename the session with `/rename data-flow-analysis`
6. Exit and reopen the work later with `copilot --continue`
7. Ask Copilot CLI what issues or follow-up tasks still remain

**Success criteria:** you should end with a clear explanation of the app's data flow, at least one cross-file improvement idea, and a named session you can resume later.

<details>
<summary>💡 Hints</summary>

**Helpful prompt sequence:**

```text
> @samples/book-app-project/books.py @samples/book-app-project/book_app.py Trace the data flow through this app
> @samples/book-app-project/data.json What happens if this file is missing or corrupted?
> @samples/book-app-project/books.py @samples/book-app-project/utils.py Suggest a consistent error-handling strategy
> /rename data-flow-analysis
```

**If the answer feels vague:**

- narrow the request to one file or one function
- ask a follow-up like “show me exactly where that happens”
- use `/clear` if the conversation drifts to a different topic
</details>

## Key takeaways

1. `@` references are the fastest way to make Copilot CLI more useful.
2. Multi-turn follow-ups are usually better than starting over.
3. `--continue`, `--resume`, and `/rename` turn sessions into reusable work.
4. Good context is specific, relevant, and intentionally scoped.
