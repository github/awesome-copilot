---
title: "Development Workflows"
description: "Apply Copilot CLI to real development loops such as code review, refactoring, debugging, testing, and git without losing beginner-safe habits."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-03-18
estimatedReadingTime: "15 minutes"
tags:
  - copilot-cli
  - beginners
  - course
  - workflows
prerequisites:
  - Complete 02 · Context and Conversations.
relatedArticles:
  - ./index.md
  - ./02-context-and-conversations.md
  - ./04-agents-and-custom-instructions.md
---

> **What if Copilot CLI could help you review code, debug bugs, generate tests, and package changes for git without leaving your normal terminal workflow?**

This is where Copilot CLI starts to feel like a practical daily tool instead of a demo. The goal is not to let AI replace your engineering judgment. The goal is to use Copilot CLI to speed up workflows you already understand, then verify the result like you would any other code change.

> **Hands-on note:** The examples below work best with the companion repo: [`github/copilot-cli-for-beginners`](https://github.com/github/copilot-cli-for-beginners). You can adapt the prompts to your own repo too, but the sample files make the exercises easier to follow.

## Learning objectives

By the end of this chapter, you should be able to:

- use Copilot CLI for code review, refactoring, debugging, test generation, and git tasks
- choose prompts that fit the workflow instead of using the same vague request every time
- follow a safe loop of inspect, ask, apply, verify, and summarize
- practice a complete bug-fix workflow from review to commit message
- use repo-aware next steps so Copilot suggestions stay grounded in real files and commands

## A beginner-safe workflow loop

For most development tasks, this five-step loop keeps you productive without getting careless:

1. **Inspect** — read the file, the diff, the failing output, or the current behavior
2. **Ask** — review, explain, plan, or generate with Copilot CLI
3. **Apply carefully** — start with a narrow scope instead of a sweeping rewrite
4. **Verify** — rerun tests, inspect the diff, or manually confirm behavior
5. **Summarize** — use the result in a commit, note, checklist, or follow-up task

If you remember only one step from this chapter, remember **verify**.

<img src="/images/learning-hub/copilot-cli-for-beginners/03/carpenter-workflow-steps.png" alt="Carpenter workflow analogy showing structured steps for different tasks" width="800" />

## Think in workflows, not just prompts

Developers do not solve every problem the same way. Reviewing code, fixing a bug, and writing tests are different jobs, so your Copilot prompts should match the job.

<img src="/images/learning-hub/copilot-cli-for-beginners/03/five-workflows-swimlane.png" alt="Five beginner-friendly Copilot CLI workflows shown as swimlanes" width="800" />

| I want to...                        | Jump to                                                    |
| ----------------------------------- | ---------------------------------------------------------- |
| review changes before committing    | [Workflow 1: Code review](#workflow-1-code-review)         |
| clean up messy code safely          | [Workflow 2: Refactoring](#workflow-2-refactoring)         |
| track down a bug with real symptoms | [Workflow 3: Debugging](#workflow-3-debugging)             |
| generate broader test coverage      | [Workflow 4: Test generation](#workflow-4-test-generation) |
| improve commit and PR hygiene       | [Workflow 5: Git integration](#workflow-5-git-integration) |
| practice an end-to-end flow         | [Putting it all together](#putting-it-all-together)        |

<a id="workflow-1-code-review"></a>

<details>
<summary><strong>Workflow 1: Code review</strong> — review files, inspect diffs, and use <code>/review</code></summary>

<img src="/images/learning-hub/copilot-cli-for-beginners/03/code-review-swimlane-single.png" alt="Workflow diagram for code review with Copilot CLI" width="800" />

### Start with a file review

```text
> Review @samples/book-app-project/book_app.py for code quality issues
```

That simple pattern already works well because the prompt includes:

- a concrete file
- a clear task
- a bounded scope

### Focus the review when it matters

Generic reviews are okay. Focused reviews are usually better.

```text
> Review @samples/book-app-project/utils.py for input validation issues. Check for missing validation, error handling gaps, and edge cases.
```

### Review a whole project when you want themes

```text
> @samples/book-app-project/ Review this entire project and create a markdown checklist of issues found, categorized by severity.
```

### Understand staged vs. unstaged changes

Before using `/review`, it helps to know what git is showing you:

| Change type          | What it means                  | How to inspect it   |
| -------------------- | ------------------------------ | ------------------- |
| **Staged changes**   | files added to the next commit | `git diff --staged` |
| **Unstaged changes** | edited files not yet staged    | `git diff`          |

### Use the built-in review flow

```text
> /review
```

That built-in flow is especially useful when you already have local edits and want a high-signal pass before you commit.

<details>
<summary>🎬 See it in action!</summary>

![Code Review Demo](/images/learning-hub/copilot-cli-for-beginners/03/code-review-demo.gif)

_Demo output varies. Your model, tools, and responses will differ from what is shown here._

</details>

</details>

<a id="workflow-2-refactoring"></a>

<details>
<summary><strong>Workflow 2: Refactoring</strong> — improve structure without changing the goal</summary>

<img src="/images/learning-hub/copilot-cli-for-beginners/03/refactoring-swimlane-single.png" alt="Workflow diagram for refactoring with Copilot CLI" width="800" />

### Start with one narrow improvement

```text
> @samples/book-app-project/book_app.py The command handling uses if/elif chains. Refactor it to use a dictionary dispatch pattern.
```

That is a strong beginner refactoring prompt because it tells Copilot CLI:

- which file to inspect
- what pattern is there now
- what pattern you want instead

### Other safe starter refactors

```text
> @samples/book-app-project/utils.py Add type hints to all functions
> @samples/book-app-project/book_app.py Extract the book display logic into utils.py for better separation of concerns
```

### Ask for a plan before a bigger refactor

```text
> /plan Refactor the book app into smaller helper functions with clearer responsibilities and safer error handling
```

Low-risk changes such as naming, helper extraction, type hints, and docstrings are great first refactoring targets.

</details>

<a id="workflow-3-debugging"></a>

<details>
<summary><strong>Workflow 3: Debugging</strong> — describe the symptom, not just the file</summary>

<img src="/images/learning-hub/copilot-cli-for-beginners/03/debugging-swimlane-single.png" alt="Workflow diagram for debugging with Copilot CLI" width="800" />

### Start with what you expected and what happened

A useful debugging prompt usually includes:

- what you expected
- what actually happened
- the relevant file or files
- any error text or failing behavior you saw

```text
> @samples/book-app-buggy/books_buggy.py Users report that searching for "The Hobbit" returns no results even though it exists. Debug why.
```

### A few debugging prompt patterns

```text
> @samples/book-app-buggy/book_app_buggy.py When I remove a book that doesn't exist, the app says it was removed. Help me find why.
> @samples/book-app-buggy/books_buggy.py When I mark one book as read, all books get marked. What's the bug?
> @samples/book-app-project/book_app.py I'm getting AttributeError: 'NoneType' object has no attribute 'title'. Explain why and how to fix it.
```

### Why this works better than “find bugs”

“Find bugs” is broad and speculative.

“Users report X when Y happens” gives Copilot CLI a symptom to trace through the code, which usually produces a much sharper answer.

<details>
<summary>🎬 See it in action!</summary>

![Fix Bug Demo](/images/learning-hub/copilot-cli-for-beginners/03/fix-bug-demo.gif)

_Demo output varies. Your model, tools, and responses will differ from what is shown here._

</details>

</details>

<a id="workflow-4-test-generation"></a>

<details>
<summary><strong>Workflow 4: Test generation</strong> — ask for edge cases, not just happy paths</summary>

<img src="/images/learning-hub/copilot-cli-for-beginners/03/test-gen-swimlane-single.png" alt="Workflow diagram for test generation with Copilot CLI" width="800" />

### Ask what should be tested

A strong beginner move is to ask for test ideas before asking for test code.

```text
> @samples/book-app-project/books.py What behaviors and edge cases should we test first?
```

### Then ask for draft tests

```text
> @samples/book-app-project/books.py Generate comprehensive pytest tests. Include tests for:
> - Adding books
> - Removing books
> - Finding by title
> - Finding by author
> - Marking as read
> - Edge cases with empty data
```

### Finally run the real tests yourself

```text
> How do I run the tests? Show me the pytest command.
```

That sequence keeps Copilot CLI helpful while leaving verification in your hands.

<details>
<summary>🎬 See it in action!</summary>

![Test Generation Demo](/images/learning-hub/copilot-cli-for-beginners/03/test-gen-demo.gif)

_Demo output varies. Your model, tools, and responses will differ from what is shown here._

</details>

</details>

<a id="workflow-5-git-integration"></a>

<details>
<summary><strong>Workflow 5: Git integration</strong> — explain diffs, draft commit messages, and summarize changes</summary>

<img src="/images/learning-hub/copilot-cli-for-beginners/03/git-integration-swimlane-single.png" alt="Workflow diagram for git integration with Copilot CLI" width="800" />

### Generate a commit message from staged changes

```bash
copilot -p "Generate a conventional commit message for: $(git diff --staged)"
```

That one-shot command is a good example of programmatic mode helping with real workflow output.

### Other practical git prompts

```bash
copilot -p "Explain what changed in this diff: $(git diff --staged)"
copilot -p "Write a short PR summary for these staged edits: $(git diff --staged)"
```

### Keep the guardrails on

Always read the generated commit message, PR summary, or checklist before you use it. Copilot CLI can help you package your work, but you still own the accuracy.

<details>
<summary>🎬 See it in action!</summary>

![Git Integration Demo](/images/learning-hub/copilot-cli-for-beginners/03/git-integration-demo.gif)

_Demo output varies. Your model, tools, and responses will differ from what is shown here._

</details>

</details>

## Quick tip: research before you plan or code

If you are unsure about an API, library, or implementation pattern, ask Copilot CLI to investigate first:

```text
> /research What should I check before changing an Astro content collection?
```

That often leads to better plans and fewer rework cycles.

<a id="putting-it-all-together"></a>

## Putting it all together

Here is a realistic beginner-friendly bug-fix workflow you can try end to end:

```text
> Users report: "Finding books by author name doesn't work for partial names"
> @samples/book-app-project/books.py Analyze and identify the likely cause

> Based on that analysis, show me the find_by_author function and explain the bug

> Fix the function so partial author name matches work case-insensitively

> Generate pytest tests specifically for:
> - full author name match
> - partial author name match
> - case-insensitive matching
> - author name not found
```

When you are ready to summarize the change:

```bash
copilot -p "Generate a conventional commit message for: $(git diff --staged)"
```

That loop combines debugging, implementation, testing, and git support in one workflow.

## Practice

## ▶️ Try it yourself

After reading the workflows above, try these small variations:

1. **Bug detective challenge:** ask Copilot CLI to debug `mark_as_read` in `samples/book-app-buggy/books_buggy.py`. Did it explain why all books are marked as read instead of one?
2. **Test challenge:** generate tests for `add_book()` in the book app and count how many edge cases Copilot CLI includes that you would not have written immediately.
3. **Commit message challenge:** make a tiny local change, stage it, then run:
   ```bash
   copilot -p "Generate a conventional commit message for: $(git diff --staged)"
   ```
   Is the result clearer than what you would have written quickly?

**Self-check:** You understand this chapter when you can explain why “debug this bug” is weaker than “users report X when Y happens.”

## 📝 Assignment

### Main challenge: refactor, test, and ship

The earlier examples touched multiple workflows. Now combine them in one realistic exercise.

1. **Review** `remove_book()` in `books.py` for edge cases and potential issues:
   ```text
   > @samples/book-app-project/books.py Review the remove_book() function. What happens if the title partially matches another book like "Dune" vs "Dune Messiah"?
   ```
2. **Refactor** the function so it handles case-insensitive matching and gives clearer feedback when a book is not found
3. **Test** the improved function with prompts that cover:
   - removing a book that exists
   - case-insensitive title matching
   - a missing book returning appropriate feedback
   - removing from an empty collection
4. **Review again** after staging your changes:
   ```text
   > /review
   ```
5. **Generate a commit message**:
   ```bash
   copilot -p "Generate a conventional commit message for: $(git diff --staged)"
   ```

**Success criteria:** you should end with a reviewed change, generated tests or test cases, and a commit summary that clearly describes the work.

<details>
<summary>💡 Hints</summary>

**Sample prompt sequence:**

```text
> @samples/book-app-project/books.py Review the remove_book() function. What edge cases are not handled?
> Improve remove_book() to use case-insensitive matching and return a clear message when the book is not found
> Generate pytest tests for the improved remove_book() function, including existing book removal, case-insensitive matching, missing book behavior, and empty collection behavior
> /review
```

**If you get stuck:**

- narrow the request to one function
- ask Copilot CLI to explain the current behavior before changing it
- verify the diff and test command yourself before you trust the final result
</details>

## Key takeaways

1. Copilot CLI is most helpful when your prompt matches the workflow you are actually doing.
2. Describe debugging symptoms, not just file names.
3. Ask for edge cases when generating tests.
4. Use Copilot CLI to speed up review and git packaging, but always verify the output yourself.
