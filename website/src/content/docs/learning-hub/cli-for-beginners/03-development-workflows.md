---
title: '03 · Development Workflows'
description: 'Mirror the source development workflow chapter covering review, debugging, testing, and git support.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-03-20
---

![Chapter 03: Development Workflows](/images/learning-hub/copilot-cli-for-beginners/03/chapter-header.png)

> **What if the AI could find bugs you didn't even know to ask about?**

In this chapter, GitHub Copilot CLI becomes your daily driver. You'll use it inside the workflows you already rely on every day: testing, refactoring, debugging, and Git.

## 🎯 Learning Objectives

By the end of this chapter, you'll be able to:

- Run comprehensive code reviews with Copilot CLI
- Refactor legacy code safely
- Debug issues with AI assistance
- Generate tests automatically
- Integrate Copilot CLI with your git workflow

> ⏱️ **Estimated Time**: ~60 minutes (15 min reading + 45 min hands-on)

---

## 🧩 Real-World Analogy: A Carpenter's Workflow

A carpenter doesn't just know how to use tools, they have *workflows* for different jobs:

<img src="/images/learning-hub/copilot-cli-for-beginners/03/carpenter-workflow-steps.png" alt="Craftsman workshop showing three workflow lanes: Building Furniture (Measure, Cut, Assemble, Finish), Fixing Damage (Assess, Remove, Repair, Match), and Quality Check (Inspect, Test Joints, Check Alignment)" width="800"/>

Similarly, developers have workflows for different tasks. GitHub Copilot CLI enhances each of these workflows, making you more efficient and effective in your daily coding tasks.

---

# The Five Workflows

<img src="/images/learning-hub/copilot-cli-for-beginners/03/five-workflows.png" alt="Five glowing neon icons representing code review, testing, debugging, refactoring, and git integration workflows" width="800"/>

Each workflow below is self-contained. Pick the ones that match your current needs, or work through them all.

---

## Choose Your Own Adventure

This chapter covers five workflows that developers typically use. **However, you don't need to read them all at once!** Each workflow is self-contained in a collapsible section below. Pick the ones that match what you need and that fits best with your current project. You can always come back and explore the others later.

<img src="/images/learning-hub/copilot-cli-for-beginners/03/five-workflows-swimlane.png" alt="Five Development Workflows: Code Review, Refactoring, Debugging, Test Generation, and Git Integration shown as horizontal swimlanes" width="800"/>

| I want to... | Jump to |
|---|---|
| Review code before merging | [Workflow 1: Code Review](#workflow-1-code-review) |
| Clean up messy or legacy code | [Workflow 2: Refactoring](#workflow-2-refactoring) |
| Track down and fix a bug | [Workflow 3: Debugging](#workflow-3-debugging) |
| Generate tests for my code | [Workflow 4: Test Generation](#workflow-4-test-generation) |
| Write better commits and PRs | [Workflow 5: Git Integration](#workflow-5-git-integration) |
| Research before coding | [Quick Tip: Research Before You Plan or Code](#quick-tip-research-before-you-plan-or-code) |
| See a full bug-fix workflow end to end | [Putting It All Together](#putting-it-all-together-bug-fix-workflow) |

**Select a workflow below to expand it** and see how GitHub Copilot CLI can enhance your development process in that area. 

---

<a id="workflow-1-code-review"></a>
<details>
<summary><strong>Workflow 1: Code Review</strong> - Review files, use the /review agent, create severity checklists</summary>

<img src="/images/learning-hub/copilot-cli-for-beginners/03/code-review-swimlane-single.png" alt="Code review workflow: review, identify issues, prioritize, generate checklist." width="800"/>

### Basic Review

This example uses the `@` symbol to reference a file, giving Copilot CLI direct access to its contents for review.

```bash
copilot

> Review @samples/book-app-project/book_app.py for code quality
```

---

<details>
<summary>🎬 See it in action!</summary>

![Code Review Demo](/images/learning-hub/copilot-cli-for-beginners/03/code-review-demo.gif)

*Demo output varies. Your model, tools, and responses will differ from what's shown here.*

</details>

---

### Input Validation Review

Ask Copilot CLI to focus its review on a specific concern (here, input validation) by listing the categories you care about in the prompt.

```text
copilot

> Review @samples/book-app-project/utils.py for input validation issues. Check for: missing validation, error handling gaps, and edge cases
```


### Cross-File Project Review

Reference an entire directory with `@` to let Copilot CLI scan every file in the project at once.

```bash
copilot

> @samples/book-app-project/ Review this entire project. Create a markdown checklist of issues found, categorized by severity
```

### Interactive Code Review

Use a multi-turn conversation to drill deeper. Start with a broad review, then ask follow-up questions without restarting.

```bash
copilot

> @samples/book-app-project/book_app.py Review this file for:
> - Input validation
> - Error handling
> - Code style and best practices

# Copilot CLI provides detailed review

> The user input handling - are there any edge cases I'm missing?

# Copilot CLI shows potential issues with empty strings, special characters

> Create a checklist of all issues found, prioritized by severity

# Copilot CLI generates prioritized action items
```

### Review Checklist Template

Ask Copilot CLI to structure its output in a specific format (here, a severity-categorized markdown checklist you can paste into an issue).

```bash
copilot

> Review @samples/book-app-project/ and create a markdown checklist of issues found, categorized by:
> - Critical (data loss risks, crashes)
> - High (bugs, incorrect behavior)
> - Medium (performance, maintainability)
> - Low (style, minor improvements)
```

### Understanding Git Changes (Important for /review)

Before using the `/review` command, you need to understand two types of changes in git:

| Change Type | What It Means | How to See |
|-------------|---------------|------------|
| **Staged changes** | Files you've marked for the next commit with `git add` | `git diff --staged` |
| **Unstaged changes** | Files you've modified but haven't added yet | `git diff` |

```bash
# Quick reference
git status           # Shows both staged and unstaged
git add file.py      # Stage a file for commit
git diff             # Shows unstaged changes
git diff --staged    # Shows staged changes
```

### Using the /review Command

The `/review` command invokes the built-in **code-review agent**, which is optimized for analyzing staged and unstaged changes with high signal-to-noise output. Use a slash command to trigger a specialized built-in agent instead of writing a free-form prompt.

```bash
copilot

> /review
# Invokes the code-review agent on staged/unstaged changes
# Provides focused, actionable feedback

> /review Check for security issues in authentication
# Run review with specific focus area
```

> 💡 **Tip**: The code-review agent works best when you have pending changes. Stage your files with `git add` for more focused reviews.

</details>

---

<a id="workflow-2-refactoring"></a>
<details>
<summary><strong>Workflow 2: Refactoring</strong> - Restructure code, separate concerns, improve error handling</summary>

<img src="/images/learning-hub/copilot-cli-for-beginners/03/refactoring-swimlane-single.png" alt="Refactoring workflow: assess code, plan changes, implement, verify behavior." width="800"/>

### Simple Refactoring

> **Try this first:** `@samples/book-app-project/book_app.py The command handling uses if/elif chains. Refactor it to use a dictionary dispatch pattern.`

Start with straightforward improvements. Try these on the book app. Each prompt uses an `@` file reference paired with a specific refactoring instruction so Copilot CLI knows exactly what to change.

```bash
copilot

> @samples/book-app-project/book_app.py The command handling uses if/elif chains. Refactor it to use a dictionary dispatch pattern.

> @samples/book-app-project/utils.py Add type hints to all functions

> @samples/book-app-project/book_app.py Extract the book display logic into utils.py for better separation of concerns
```

> 💡 **New to refactoring?** Start with simple requests like adding type hints or improving variable names before tackling complex transformations.

---

<details>
<summary>🎬 See it in action!</summary>

![Refactor Demo](/images/learning-hub/copilot-cli-for-beginners/03/refactor-demo.gif)

*Demo output varies. Your model, tools, and responses will differ from what's shown here.*

</details>

---

### Separate Concerns

Reference multiple files with `@` in a single prompt so Copilot CLI can move code between them as part of the refactor.

```bash
copilot

> @samples/book-app-project/utils.py @samples/book-app-project/book_app.py
> The utils.py file has print statements mixed with logic. Refactor to separate display functions from data processing.
```

### Improve Error Handling

Provide two related files and describe the cross-cutting concern so Copilot CLI can suggest a consistent fix across both.

```bash
copilot

> @samples/book-app-project/utils.py @samples/book-app-project/books.py
> These files have inconsistent error handling. Suggest a unified approach using custom exceptions.
```

### Add Documentation

Use a detailed bullet list to specify exactly what each docstring should contain.

```bash
copilot

> @samples/book-app-project/books.py Add comprehensive docstrings to all methods:
> - Include parameter types and descriptions
> - Document return values
> - Note any exceptions raised
> - Add usage examples
```

### Safe Refactoring with Tests

Chain two related requests in a multi-turn conversation. First generate tests, then refactor with those tests as a safety net.

```bash
copilot

> @samples/book-app-project/books.py Before refactoring, generate tests for current behavior

# Get tests first

> Now refactor the BookCollection class to use a context manager for file operations

# Refactor with confidence - tests verify behavior is preserved
```

</details>

---

<a id="workflow-3-debugging"></a>
<details>
<summary><strong>Workflow 3: Debugging</strong> - Track down bugs, security audits, trace issues across files</summary>

<img src="/images/learning-hub/copilot-cli-for-beginners/03/debugging-swimlane-single.png" alt="Debugging workflow: understand error, locate root cause, fix, test." width="800"/>

### Simple Debugging

> **Try this first:** `@samples/book-app-buggy/books_buggy.py Users report that searching for "The Hobbit" returns no results even though it's in the data. Debug why.`

Start by describing what's wrong. Here are common debugging patterns you can try with the buggy book app. Each prompt pairs an `@` file reference with a clear symptom description so Copilot CLI can locate and diagnose the bug.

```bash
copilot

# Pattern: "Expected X but got Y"
> @samples/book-app-buggy/books_buggy.py Users report that searching for "The Hobbit" returns no results even though it's in the data. Debug why.

# Pattern: "Unexpected behavior"
> @samples/book-app-buggy/book_app_buggy.py When I remove a book that doesn't exist, the app says it was removed. Help me find why.

# Pattern: "Wrong results"
> @samples/book-app-buggy/books_buggy.py When I mark one book as read, ALL books get marked. What's the bug?
```

> 💡 **Debugging tip**: Describe the *symptom* (what you see) and the *expectation* (what should happen). Copilot CLI figures out the rest.

---

<details>
<summary>🎬 See it in action!</summary>

![Fix Bug Demo](/images/learning-hub/copilot-cli-for-beginners/03/fix-bug-demo.gif)

*Demo output varies. Your model, tools, and responses will differ from what's shown here.*

</details>

---

### The "Bug Detective" - AI Finds RELATED Bugs

This is where context-aware debugging shines. Try this scenario with the buggy book app. Provide the whole file via `@` and describe only the user-reported symptom. Copilot CLI will trace the root cause and may spot additional bugs nearby.

```bash
copilot

> @samples/book-app-buggy/books_buggy.py
>
> Users report: "Finding books by author name doesn't work for partial names"
> Debug why this happens
```

**What Copilot CLI does**:
```
Root Cause: Line 80 uses exact match (==) instead of partial match (in).

Line 80: return [b for b in self.books if b.author == author]

The find_by_author function requires an exact match. Searching for "Tolkien"
won't find books by "J.R.R. Tolkien".

Fix: Change to case-insensitive partial match:
return [b for b in self.books if author.lower() in b.author.lower()]
```

**Why this matters**: Copilot CLI reads the whole file, understands the context of your bug report, and gives you a specific fix with a clear explanation.

> 💡 **Bonus**: Because Copilot CLI analyzes the entire file, it often discovers *other* issues you didn't ask about. For example, while fixing the author search, Copilot CLI might also notice the case-sensitivity bug in `find_book_by_title`!

### Real-World Security Sidebar

While debugging your own code is important, understanding security vulnerabilities in production applications is critical. Try this example: Point Copilot CLI at an unfamiliar file and ask it to audit for security issues.

```bash
copilot

> @samples/buggy-code/python/user_service.py Find all security vulnerabilities in this Python user service
```

This file demonstrates real-world security patterns you'll encounter in production apps.

> 💡 **Common security terms you'll encounter:**
> - **SQL Injection**: When user input is put directly into a database query, allowing attackers to run malicious commands
> - **Parameterized queries**: The safe alternative - placeholders (`?`) separate user data from SQL commands
> - **Race condition**: When two operations happen at the same time and interfere with each other
> - **XSS (Cross-Site Scripting)**: When attackers inject malicious scripts into web pages

---

### Understanding an Error

Paste a stack trace directly into your prompt along with an `@` file reference so Copilot CLI can map the error to the source code.

```bash
copilot

> I'm getting this error:
> AttributeError: 'NoneType' object has no attribute 'title'
>     at show_books (book_app.py:19)
>
> @samples/book-app-project/book_app.py Explain why and how to fix it
```

### Debugging with Test Case

Describe the exact input and observed output to give Copilot CLI a concrete, reproducible test case to reason about.

```bash
copilot

> @samples/book-app-buggy/books_buggy.py The remove_book function has a bug. When I try to remove "Dune",
> it also removes "Dune Messiah". Debug this: explain the root cause and provide a fix.
```

### Trace an Issue Through Code

Reference multiple files and ask Copilot CLI to follow the data flow across them to locate where the issue originates.

```bash
copilot

> Users report that the book list numbering starts at 0 instead of 1.
> @samples/book-app-buggy/book_app_buggy.py @samples/book-app-buggy/books_buggy.py
> Trace through the list display flow and identify where the issue occurs
```

### Understanding Data Issues

Include a data file alongside the code that reads it so Copilot CLI understands the full picture when suggesting error-handling improvements.

```bash
copilot

> @samples/book-app-project/data.json @samples/book-app-project/books.py
> Sometimes the JSON file gets corrupted and the app crashes. How should we handle this gracefully?
```

</details>

---

<a id="workflow-4-test-generation"></a>
<details>
<summary><strong>Workflow 4: Test Generation</strong> - Generate comprehensive tests and edge cases automatically</summary>

<img src="/images/learning-hub/copilot-cli-for-beginners/03/test-gen-swimlane-single.png" alt="Test Generation workflow: analyze function, generate tests, include edge cases, run." width="800"/>

> **Try this first:** `@samples/book-app-project/books.py Generate pytest tests for all functions including edge cases`

### The "Test Explosion" - 2 Tests vs 15+ Tests

Manually writing tests, developers typically create 2-3 basic tests:
- Test valid input
- Test invalid input
- Test an edge case

Watch what happens when you ask Copilot CLI to generate comprehensive tests! This prompt uses a structured bullet list with an `@` file reference to guide Copilot CLI toward thorough test coverage:

```bash
copilot

> @samples/book-app-project/books.py Generate comprehensive pytest tests. Include tests for:
> - Adding books
> - Removing books
> - Finding by title
> - Finding by author
> - Marking as read
> - Edge cases with empty data
```

---

<details>
<summary>🎬 See it in action!</summary>

![Test Generation Demo](/images/learning-hub/copilot-cli-for-beginners/03/test-gen-demo.gif)

*Demo output varies. Your model, tools, and responses will differ from what's shown here.*

</details>

---

**What you get**: 15+ comprehensive tests including:

```python
class TestBookCollection:
    # Happy path
    def test_add_book_creates_new_book(self):
        ...
    def test_list_books_returns_all_books(self):
        ...

    # Find operations
    def test_find_book_by_title_case_insensitive(self):
        ...
    def test_find_book_by_title_returns_none_when_not_found(self):
        ...
    def test_find_by_author_partial_match(self):
        ...
    def test_find_by_author_case_insensitive(self):
        ...

    # Edge cases
    def test_add_book_with_empty_title(self):
        ...
    def test_remove_nonexistent_book(self):
        ...
    def test_mark_as_read_nonexistent_book(self):
        ...

    # Data persistence
    def test_save_books_persists_to_json(self):
        ...
    def test_load_books_handles_missing_file(self):
        ...
    def test_load_books_handles_corrupted_json(self):
        ...

    # Special characters
    def test_add_book_with_unicode_characters(self):
        ...
    def test_find_by_author_with_special_characters(self):
        ...
```

**Result**: In 30 seconds, you get edge case tests that would take an hour to think through and write.

---

### Unit Tests

Target a single function and enumerate the input categories you want tested so Copilot CLI generates focused, thorough unit tests.

```bash
copilot

> @samples/book-app-project/utils.py Generate comprehensive pytest tests for get_book_details covering:
> - Valid input
> - Empty strings
> - Invalid year formats
> - Very long titles
> - Special characters in author names
```

### Running Tests

Ask Copilot CLI a plain-English question about your toolchain. It can generate the right shell command for you.

```bash
copilot

> How do I run the tests? Show me the pytest command.

# Copilot CLI responds:
# cd samples/book-app-project && python -m pytest tests/
# Or for verbose output: python -m pytest tests/ -v
# To see print statements: python -m pytest tests/ -s
```

### Test for Specific Scenarios

List advanced or tricky scenarios you want covered so Copilot CLI goes beyond the happy path.

```bash
copilot

> @samples/book-app-project/books.py Generate tests for these scenarios:
> - Adding duplicate books (same title and author)
> - Removing a book by partial title match
> - Finding books when collection is empty
> - File permission errors during save
> - Concurrent access to the book collection
```

### Add Tests to Existing File

Ask for *additional* tests for a single function so Copilot CLI generates new cases that complement what you already have.

```bash
copilot

> @samples/book-app-project/books.py
> Generate additional tests for the find_by_author function with edge cases:
> - Author name with hyphens (e.g., "Jean-Paul Sartre")
> - Author with multiple first names
> - Empty string as author
> - Author name with accented characters
```

</details>

---

<a id="workflow-5-git-integration"></a>
<details>
<summary><strong>Workflow 5: Git Integration</strong> - Commit messages, PR descriptions, /pr, /delegate, and /diff</summary>

<img src="/images/learning-hub/copilot-cli-for-beginners/03/git-integration-swimlane-single.png" alt="Git Integration workflow: stage changes, generate message, commit, create PR." width="800"/>

> 💡 **This workflow assumes basic git familiarity** (staging, committing, branches). If git is new to you, try the other four workflows first.

### Generate Commit Messages

> **Try this first:** `copilot -p "Generate a conventional commit message for: $(git diff --staged)"` — stage some changes, then run this to see Copilot CLI write your commit message.

This example uses the `-p` inline prompt flag with shell command substitution to pipe `git diff` output directly into Copilot CLI for a one-shot commit message. The `$(...)` syntax runs the command inside the parentheses and inserts its output into the outer command.

```bash

# See what changed
git diff --staged

# Generate commit message using [Conventional Commit](https://github.com/github/copilot-cli-for-beginners/blob/main/GLOSSARY.md#conventional-commit) format
# (structured messages like "feat(books): add search" or "fix(data): handle empty input")
copilot -p "Generate a conventional commit message for: $(git diff --staged)"

# Output: "feat(books): add partial author name search
#
# - Update find_by_author to support partial matches
# - Add case-insensitive comparison
# - Improve user experience when searching authors"
```

---

<details>
<summary>🎬 See it in action!</summary>

![Git Integration Demo](/images/learning-hub/copilot-cli-for-beginners/03/git-integration-demo.gif)

*Demo output varies. Your model, tools, and responses will differ from what's shown here.*

</details>

---

### Explain Changes

Pipe the output of `git show` into a `-p` prompt to get a plain-English summary of the last commit.

```bash
# What did this commit change?
copilot -p "Explain what this commit does: $(git show HEAD --stat)"
```

### PR Description

Combine `git log` output with a structured prompt template to auto-generate a complete pull request description.

```bash
# Generate PR description from branch changes
copilot -p "Generate a pull request description for these changes:
$(git log main..HEAD --oneline)

Include:
- Summary of changes
- Why these changes were made
- Testing done
- Breaking changes? (yes/no)"
```

### Using /pr in Interactive Mode for the Current Branch

If you're working with a branch in Copilot CLI's interactive mode, you can use the `/pr` command to work with pull requests. Use `/pr` to view a PR, create a new PR, fix an existing PR, or let Copilot CLI auto-decide based on the branch state.

```bash
copilot

> /pr [view|create|fix|auto]
```

### Review Before Push

Use `git diff main..HEAD` inside a `-p` prompt for a quick pre-push sanity check across all branch changes.

```bash
# Last check before pushing
copilot -p "Review these changes for issues before I push:
$(git diff main..HEAD)"
```

### Using /delegate for Background Tasks

The `/delegate` command hands off work to the Copilot coding agent on GitHub. Use the `/delegate` slash command (or the `&` shortcut) to offload a well-defined task to a background agent.

```bash
copilot

> /delegate Add input validation to the login form

# Or use the & prefix shortcut:
> & Fix the typo in the README header

# Copilot CLI:
# 1. Commits your changes to a new branch
# 2. Opens a draft pull request
# 3. Works in the background on GitHub
# 4. Requests your review when done
```

This is great for well-defined tasks you want completed while you focus on other work.

### Using /diff to Review Session Changes

The `/diff` command shows all changes made during your current session. Use this slash command to see a visual diff of everything Copilot CLI has modified before you commit.

```bash
copilot

# After making some changes...
> /diff

# Shows a visual diff of all files modified in this session
# Great for reviewing before committing
```

</details>

---

## Quick Tip: Research Before You Plan or Code

When you need to investigate a library, understand best practices, or explore an unfamiliar topic, use `/research` to run a deep research investigation before writing any code:

```bash
copilot

> /research What are the best Python libraries for validating user input in CLI apps?
```

Copilot searches GitHub repositories and web sources, then returns a summary with references. This is useful when you're about to start a new feature and want to make informed decisions first. You can share the results using `/share`.

> 💡 **Tip**: `/research` works well *before* `/plan`. Research the approach, then plan the implementation.

---

## Putting It All Together: Bug Fix Workflow

Here's a complete workflow for fixing a reported bug:

```bash

# 1. Understand the bug report
copilot

> Users report: 'Finding books by author name doesn't work for partial names'
> @samples/book-app-project/books.py Analyze and identify the likely cause

# 2. Debug the issue (continuing in same session)
> Based on the analysis, show me the find_by_author function and explain the issue

> Fix the find_by_author function to handle partial name matches

# 3. Generate tests for the fix
> @samples/book-app-project/books.py Generate pytest tests specifically for:
> - Full author name match
> - Partial author name match
> - Case-insensitive matching
> - Author name not found

# 4. Generate commit message
copilot -p "Generate commit message for: $(git diff --staged)"

# Output: "fix(books): support partial author name search"
```

### Bug Fix Workflow Summary

| Step | Action | Copilot Command |
|------|--------|-----------------|
| 1 | Understand the bug | `> [describe bug] @relevant-file.py Analyze the likely cause` |
| 2 | Get detailed analysis | `> Show me the function and explain the issue` |
| 3 | Implement the fix | `> Fix the [specific issue]` |
| 4 | Generate tests | `> Generate tests for [specific scenarios]` |
| 5 | Commit | `copilot -p "Generate commit message for: $(git diff --staged)"` |

---

# Practice

<img src="/images/learning-hub/copilot-cli-for-beginners/03/practice.png" alt="Warm desk setup with monitor showing code, lamp, coffee cup, and headphones ready for hands-on practice" width="800"/>

Now it's your turn to apply these workflows.

---

## ▶️ Try It Yourself

After completing the demos, try these variations:

1. **Bug Detective Challenge**: Ask Copilot CLI to debug the `mark_as_read` function in `samples/book-app-buggy/books_buggy.py`. Did it explain why the function marks ALL books as read instead of just one?

2. **Test Challenge**: Generate tests for the `add_book` function in the book app. Count how many edge cases Copilot CLI includes that you wouldn't have thought of.

3. **Commit Message Challenge**: Make any small change to a book app file, stage it (`git add .`), then run:
   ```bash
   copilot -p "Generate a conventional commit message for: $(git diff --staged)"
   ```
   Is the message better than what you would have written quickly?

**Self-Check**: You understand development workflows when you can explain why "debug this bug" is more powerful than "find bugs" (context matters!).

---

## 📝 Assignment

### Main Challenge: Refactor, Test, and Ship

The hands-on examples focused on `find_book_by_title` and code reviews. Now practice the same workflow skills on different functions in `book-app-project`:

1. **Review**: Ask Copilot CLI to review `remove_book()` in `books.py` for edge cases and potential issues:
   `@samples/book-app-project/books.py Review the remove_book() function. What happens if the title partially matches another book (e.g., "Dune" vs "Dune Messiah")? Are there any edge cases not handled?`
2. **Refactor**: Ask Copilot CLI to improve `remove_book()` to handle edge cases like case-insensitive matching and returning useful feedback when a book isn't found
3. **Test**: Generate pytest tests specifically for the improved `remove_book()` function, covering:
   - Removing a book that exists
   - Case-insensitive title matching
   - A book that doesn't exist returns appropriate feedback
   - Removing from an empty collection
4. **Review**: Stage your changes and run `/review` to check for any remaining issues
5. **Commit**: Generate a conventional commit message:
   `copilot -p "Generate a conventional commit message for: $(git diff --staged)"`

<details>
<summary>💡 Hints (click to expand)</summary>

**Sample prompts for each step:**

```bash
copilot

# Step 1: Review
> @samples/book-app-project/books.py Review the remove_book() function. What edge cases are not handled?

# Step 2: Refactor
> Improve remove_book() to use case-insensitive matching and return a clear message when the book isn't found. Show me the before and after code.

# Step 3: Test
> Generate pytest tests for the improved remove_book() function, including:
> - Removing a book that exists
> - Case-insensitive matching ("dune" should remove "Dune")
> - Book not found returns appropriate response
> - Removing from an empty collection

# Step 4: Review
> /review

# Step 5: Commit
> Generate a conventional commit message for this refactor
```

**Tip:** After improving `remove_book()`, try asking Copilot CLI: "Are there any other functions in this file that could benefit from the same improvements?". It may suggest similar changes to `find_book_by_title()` or `find_by_author()`.

</details>

### Bonus Challenge: Create an application with the Copilot CLI

> 💡 **Note**: This GitHub Skills exercise uses **Node.js** rather than Python. The GitHub Copilot CLI techniques you'll practice - creating issues, generating code, and collaborating from the terminal - apply to any language.

The exercise shows developers how to use GitHub Copilot CLI to create issues, generate code, and collaborate from the terminal while building a Node.js calculator app. You'll install the CLI, use templates and agents, and practice iterative, command-line driven development.

##### <img src="/images/learning-hub/copilot-cli-for-beginners/03/github-skills-logo.png" width="28" align="center" /> [Start the "Create applications with the Copilot CLI" Skills Exercise](https://github.com/skills/create-applications-with-the-copilot-cli)

---

<details>
<summary>🔧 <strong>Common Mistakes & Troubleshooting</strong> (click to expand)</summary>

### Common Mistakes

| Mistake | What Happens | Fix |
|---------|--------------|-----|
| Using vague prompts like "Review this code" | Generic feedback that misses specific issues | Be specific: "Review for SQL injection, XSS, and auth issues" |
| Not using `/review` for code reviews | Missing the optimized code-review agent | Use `/review` which is tuned for high signal-to-noise output |
| Asking to "find bugs" without context | Copilot CLI doesn't know what bug you're experiencing | Describe the symptom: "Users report X happens when Y" |
| Generating tests without specifying framework | Tests may use wrong syntax or assertion library | Specify: "Generate tests using Jest" or "using pytest" |

### Troubleshooting

**Review seems incomplete** - Be more specific about what to look for:

```bash
copilot

# Instead of:
> Review @samples/book-app-project/book_app.py

# Try:
> Review @samples/book-app-project/book_app.py for input validation, error handling, and edge cases
```

**Tests don't match my framework** - Specify the framework:

```bash
copilot

> @samples/book-app-project/books.py Generate tests using pytest (not unittest)
```

**Refactoring changes behavior** - Ask Copilot CLI to preserve behavior:

```bash
copilot

> @samples/book-app-project/book_app.py Refactor command handling to use dictionary dispatch. IMPORTANT: Maintain identical external behavior - no breaking changes
```

</details>

---

# Summary

## 🔑 Key Takeaways

<img src="/images/learning-hub/copilot-cli-for-beginners/03/specialized-workflows.png" alt="Specialized Workflows for Every Task: Code Review, Refactoring, Debugging, Testing, and Git Integration" width="800"/>

1. **Code review** becomes comprehensive with specific prompts
2. **Refactoring** is safer when you generate tests first
3. **Debugging** benefits from showing Copilot CLI the error AND the code
4. **Test generation** should include edge cases and error scenarios
5. **Git integration** automates commit messages and PR descriptions

> 📋 **Quick Reference**: See the [GitHub Copilot CLI command reference](https://docs.github.com/en/copilot/reference/cli-command-reference) for a complete list of commands and shortcuts.

---

## ✅ Checkpoint: You've Mastered the Essentials

**Congratulations!** You now have all the core skills to be productive with GitHub Copilot CLI:

| Skill | Chapter | You Can Now... |
|-------|---------|----------------|
| Basic Commands | Ch 01 | Use interactive mode, plan mode, programmatic mode (-p), and slash commands |
| Context | Ch 02 | Reference files with `@`, manage sessions, understand context windows |
| Workflows | Ch 03 | Review code, refactor, debug, generate tests, integrate with git |

Chapters 04-06 cover additional features that add even more power and are worthwhile to learn.

---

## 🛠️ Building Your Personal Workflow

There's no single "right" way to use GitHub Copilot CLI. Here are a few tips as you develop your own patterns:

> 📚 **Official Documentation**: [Copilot CLI best practices](https://docs.github.com/copilot/how-tos/copilot-cli/cli-best-practices) for recommended workflows and tips from GitHub.

- **Start with `/plan`** for anything non-trivial. Refine the plan before execution - a good plan leads to better results.
- **Save prompts that work well.** When Copilot CLI makes a mistake, note what went wrong. Over time, this becomes your personal playbook.
- **Experiment freely.** Some developers prefer long, detailed prompts. Others prefer short prompts with follow-ups. Try different approaches and notice what feels natural.

> 💡 **Coming up**: In Chapters 04 and 05, you'll learn how to codify your best practices into custom instructions and skills that Copilot CLI loads automatically.

---

## ➡️ What's Next

The remaining chapters cover additional features that extend Copilot CLI's capabilities:

| Chapter | What It Covers | When You'll Want It |
|---------|----------------|---------------------|
| Ch 04: Agents | Create specialized AI personas | When you want domain experts (frontend, security) |
| Ch 05: Skills | Auto-load instructions for tasks | When you repeat the same prompts often |
| Ch 06: MCP | Connect external services | When you need live data from GitHub, databases |

**Recommendation**: Try the core workflows for a week, then return to Chapters 04-06 when you have specific needs.

---

## Continue to Additional Topics

In **[Chapter 04: Agents and Custom Instructions](../04-agents-and-custom-instructions/)**, you'll learn:

- Using built-in agents (`/plan`, `/review`)
- Creating specialized agents (frontend expert, security auditor) with `.agent.md` files
- Multi-agent collaboration patterns
- Custom instruction files for project standards

---
