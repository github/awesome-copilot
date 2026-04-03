---
title: '07 · Putting It All Together'
description: 'Mirror the source capstone chapter that combines the GitHub Copilot CLI workflow end to end.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-03-20
---

![Chapter 07: Putting It All Together](/images/learning-hub/copilot-cli-for-beginners/07/chapter-header.png)

> **Everything you learned combines here. Go from idea to merged PR in a single session.**

In this chapter, you'll bring together everything you've learned into complete workflows. You'll build features using multi-agent collaboration, set up pre-commit hooks that catch security issues before they're committed, integrate Copilot into CI/CD pipelines, and go from feature idea to merged PR in a single terminal session. This is where GitHub Copilot CLI becomes a genuine force multiplier.

> 💡 **Note**: This chapter shows how to combine everything you've learned. **You don't need agents, skills, or MCP to be productive (although they can be very helpful).** The core workflow — describe, plan, implement, test, review, ship — works with just the built-in features from Chapters 00-03.

## 🎯 Learning Objectives

By the end of this chapter, you'll be able to:

- Combine agents, skills, and MCP (Model Context Protocol) in unified workflows
- Build complete features using multi-tool approaches
- Set up basic automation with hooks
- Apply best practices for professional development

> ⏱️ **Estimated Time**: ~75 minutes (15 min reading + 60 min hands-on)

---

## 🧩 Real-World Analogy: The Orchestra

<img src="/images/learning-hub/copilot-cli-for-beginners/07/orchestra-analogy.png" alt="Orchestra Analogy - Unified Workflow" width="800"/>

A symphony orchestra has many sections:
- **Strings** provide the foundation (like your core workflows)
- **Brass** adds power (like agents with specialized expertise)
- **Woodwinds** add color (like skills that extend capabilities)
- **Percussion** keeps rhythm (like MCP connecting to external systems)

Individually, each section sounds limited. Together, conducted well, they create something magnificent.

**That's what this chapter teaches!**<br>
*Like a conductor with an orchestra, you orchestrate agents, skills, and MCP into unified workflows*

Let's start by walking through a scenario that modifies code, generates tests, reviews it, and creates a PR - all in one session.

---

## Idea to Merged PR in One Session

Instead of switching between your editor, terminal, test runner, and GitHub UI and losing context each time, you can combine all your tools in one terminal session. We'll break down this pattern in the [Integration Pattern](#the-integration-pattern-for-power-users) section below.

```bash
# Start Copilot in interactive mode
copilot

> I need to add a "list unread" command to the book app that shows only
> books where read is False. What files need to change?

# Copilot creates high-level plan...

# SWITCH TO PYTHON-REVIEWER AGENT
> /agent
# Select "python-reviewer"

> @samples/book-app-project/books.py Design a get_unread_books method.
> What is the best approach?

# Python-reviewer agent produces:
# - Method signature and return type
# - Filter implementation using list comprehension
# - Edge case handling for empty collections

# SWITCH TO PYTEST-HELPER AGENT
> /agent
# Select "pytest-helper"

> @samples/book-app-project/tests/test_books.py Design test cases for
> filtering unread books.

# Pytest-helper agent produces:
# - Test cases for empty collections
# - Test cases with mixed read/unread books
# - Test cases with all books read

# IMPLEMENT
> Add a get_unread_books method to BookCollection in books.py
> Add a "list unread" command option in book_app.py
> Update the help text in the show_help function

# TEST
> Generate comprehensive tests for the new feature

# Multiple tests are generated similar to the following:
# - Happy path (3 tests) — filters correctly, excludes read, includes unread
# - Edge cases (4 tests) — empty collection, all read, none read, single book
# - Parametrized (5 cases) — varying read/unread ratios via @pytest.mark.parametrize
# - Integration (4 tests) — interplay with mark_as_read, remove_book, add_book, and data integrity

# Review the changes
> /review

# If review passes, use /pr to operate on the pull request for the current branch
> /pr [view|create|fix|auto]

# Or ask naturally if you want Copilot to draft it from the terminal
> Create a pull request titled "Feature: Add list unread books command"
```

**Traditional approach**: Switching between editor, terminal, test runner, docs, and GitHub UI. Each switch causes context loss and friction.

**The key insight**: You directed specialists like an architect. They handled the details. You handled the vision.

> 💡 **Going further**: For large multi-step plans like this, try `/fleet` to let Copilot run independent subtasks in parallel. See the [official docs](https://docs.github.com/copilot/concepts/agents/copilot-cli/fleet) for details.

---

# Additional Workflows

<img src="/images/learning-hub/copilot-cli-for-beginners/07/combined-workflows.png" alt="People assembling a colorful giant jigsaw puzzle with gears, representing how agents, skills, and MCP combine into unified workflows" width="800"/>

For power users who completed Chapters 04-06, these workflows show how agents, skills, and MCP multiply your effectiveness.

## The Integration Pattern

Here's the mental model for combining everything:

<img src="/images/learning-hub/copilot-cli-for-beginners/07/integration-pattern.png" alt="The Integration Pattern - A 4-phase workflow: Gather Context (MCP), Analyze and Plan (Agents), Execute (Skills + Manual), Complete (MCP)" width="800"/>

---

## Workflow 1: Bug Investigation and Fix

Real-world bug fixing with full tool integration:

```bash
copilot

# PHASE 1: Understand the bug from GitHub (MCP provides this)
> Get the details of issue #1

# Learn: "find_by_author doesn't work with partial names"

# PHASE 2: Research best practice (deep research with web + GitHub sources)
> /research Best practices for Python case-insensitive string matching

# PHASE 3: Find related code
> @samples/book-app-project/books.py Show me the find_by_author method

# PHASE 4: Get expert analysis
> /agent
# Select "python-reviewer"

> Analyze this method for issues with partial name matching

# Agent identifies: Method uses exact equality instead of substring matching

# PHASE 5: Fix with agent guidance
> Implement the fix using lowercase comparison and 'in' operator

# PHASE 6: Generate tests
> /agent
# Select "pytest-helper"

> Generate pytest tests for find_by_author with partial matches
> Include test cases: partial name, case variations, no matches

# PHASE 7: Commit and PR
> Generate a commit message for this fix

> Create a pull request linking to issue #1
```

---

## Workflow 2: Code Review Automation (Optional)

> 💡 **This section is optional.** Pre-commit hooks are useful for teams but not required to be productive. Skip this if you're just getting started.
>
> ⚠️ **Performance note**: This hook calls `copilot -p` for each staged file, which takes several seconds per file. For large commits, consider limiting to critical files or running reviews manually with `/review` instead.

A **git hook** is a script that Git runs automatically at certain points, For example, right before a commit. You can use this to run automated checks on your code. Here's how to set up an automated Copilot review on your commits:

```bash
# Create a pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

# Get staged files (Python files only)
STAGED=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.py$')

if [ -n "$STAGED" ]; then
  echo "Running Copilot review on staged files..."

  for file in $STAGED; do
    echo "Reviewing $file..."

    # Use timeout to prevent hanging (60 seconds per file)
    # --allow-all auto-approves file reads/writes so the hook can run unattended.
    # Only use this in automated scripts. In interactive sessions, let Copilot ask for permission.
    REVIEW=$(timeout 60 copilot --allow-all -p "Quick security review of @$file - critical issues only" 2>/dev/null)

    # Check if timeout occurred
    if [ $? -eq 124 ]; then
      echo "Warning: Review timed out for $file (skipping)"
      continue
    fi

    if echo "$REVIEW" | grep -qi "CRITICAL"; then
      echo "Critical issues found in $file:"
      echo "$REVIEW"
      exit 1
    fi
  done

  echo "Review passed"
fi
EOF

chmod +x .git/hooks/pre-commit
```

> ⚠️ **macOS users**: The `timeout` command is not included by default on macOS. Install it with `brew install coreutils` or replace `timeout 60` with a simple invocation without a timeout guard.

> 📚 **Official Documentation**: [Use hooks](https://docs.github.com/copilot/how-tos/copilot-cli/use-hooks) and [Hooks configuration reference](https://docs.github.com/copilot/reference/hooks-configuration) for the complete hooks API.
>
> 💡 **Built-in alternative**: Copilot CLI also has a built-in hooks system (`copilot hooks`) that can run automatically on events like pre-commit. The manual git hook above gives you full control, while the built-in system is simpler to configure. See the docs above to decide which approach fits your workflow.

Now every commit gets a quick security review:

```bash
git add samples/book-app-project/books.py
git commit -m "Update book collection methods"

# Output:
# Running Copilot review on staged files...
# Reviewing samples/book-app-project/books.py...
# Critical issues found in samples/book-app-project/books.py:
# - Line 15: File path injection vulnerability in load_from_file
#
# Fix the issue and try again.
```

---

## Workflow 3: Onboarding to a New Codebase

When joining a new project, combine context, agents, and MCP to ramp up fast:

```bash
# Start Copilot in interactive mode
copilot

# PHASE 1: Get the big picture with context
> @samples/book-app-project/ Explain the high-level architecture of this codebase

# PHASE 2: Understand a specific flow
> @samples/book-app-project/book_app.py Walk me through what happens
> when a user runs "python book_app.py add"

# PHASE 3: Get expert analysis with an agent
> /agent
# Select "python-reviewer"

> @samples/book-app-project/books.py Are there any design issues,
> missing error handling, or improvements you would recommend?

# PHASE 4: Find something to work on (MCP provides GitHub access)
> List open issues labeled "good first issue"

# PHASE 5: Start contributing
> Pick the simplest open issue and outline a plan to fix it
```

This workflow combines `@` context, agents, and MCP into a single onboarding session, exactly the integration pattern from earlier in this chapter.

---

# Best Practices & Automation

Patterns and habits that make your workflows more effective.

---

## Best Practices

### 1. Start with Context Before Analysis

Always gather context before asking for analysis:

```bash
# Good
> Get the details of issue #42
> /agent
# Select python-reviewer
> Analyze this issue

# Less effective
> /agent
# Select python-reviewer
> Fix login bug
# Agent doesn't have issue context
```

### 2. Know the Difference: Agents, Skills, and Custom Instructions

Each tool has a sweet spot:

```bash
# Agents: Specialized personas you explicitly activate
> /agent
# Select python-reviewer
> Review this authentication code for security issues

# Skills: Modular capabilities that auto-activate when your prompt
# matches the skill's description (you must create them first — see Ch 05)
> Generate comprehensive tests for this code
# If you have a testing skill configured, it activates automatically

# Custom instructions (.github/copilot-instructions.md): Always-on
# guidance that applies to every session without switching or triggering
```

> 💡 **Key point**: Agents and skills can both analyze AND generate code. The real difference is **how they activate** — agents are explicit (`/agent`), skills are automatic (prompt-matched), and custom instructions are always on.

### 3. Keep Sessions Focused

Use `/rename` to label your session (makes it easy to find in history) and `/exit` to end it cleanly:

```bash
# Good: One feature per session
> /rename list-unread-feature
# Work on list unread
> /exit

copilot
> /rename export-csv-feature
# Work on CSV export
> /exit

# Less effective: Everything in one long session
```

### 4. Make Workflows Reusable with Copilot

Instead of just documenting workflows in a wiki, encode them directly in your repo where Copilot can use them:

- **Custom instructions** (`.github/copilot-instructions.md`): Always-on guidance for coding standards, architecture rules, and build/test/deploy steps. Every session follows them automatically.
- **Prompt files** (`.github/prompts/`): Reusable, parameterized prompts your team can share — like templates for code reviews, component generation, or PR descriptions.
- **Custom agents** (`.github/agents/`): Encode specialized personas (e.g., a security reviewer or a docs writer) that anyone on the team can activate with `/agent`.
- **Custom skills** (`.github/skills/`): Package step-by-step workflow instructions that auto-activate when relevant.

> 💡 **The payoff**: New team members get your workflows for free — they're built into the repo, not locked in someone's head.

---

## Bonus: Production Patterns

These patterns are optional but valuable for professional environments.

### PR Description Generator

```bash
# Generate comprehensive PR descriptions
BRANCH=$(git branch --show-current)
COMMITS=$(git log main..$BRANCH --oneline)

copilot -p "Generate a PR description for:
Branch: $BRANCH
Commits:
$COMMITS

Include: Summary, Changes Made, Testing Done, Screenshots Needed"
```

### CI/CD Integration

For teams with existing CI/CD pipelines, you can automate Copilot reviews on every pull request using GitHub Actions. This includes posting review comments automatically and filtering for critical issues.

> 📖 **Learn more**: See [CI/CD Integration](https://github.com/github/copilot-cli-for-beginners/blob/main/appendices/ci-cd-integration.md) for complete GitHub Actions workflows, configuration options, and troubleshooting tips.

---

# Practice

<img src="/images/learning-hub/copilot-cli-for-beginners/07/practice.png" alt="Warm desk setup with monitor showing code, lamp, coffee cup, and headphones ready for hands-on practice" width="800"/>

Put the complete workflow into practice.

---

## ▶️ Try It Yourself

After completing the demos, try these variations:

1. **End-to-End Challenge**: Pick a small feature (e.g., "list unread books" or "export to CSV"). Use the full workflow:
   - Plan with `/plan`
   - Design with agents (python-reviewer, pytest-helper)
   - Implement
   - Generate tests
   - Create PR

2. **Automation Challenge**: Set up the pre-commit hook from the Code Review Automation workflow. Make a commit with an intentional file path vulnerability. Does it get blocked?

3. **Your Production Workflow**: Design your own workflow for a common task you do. Write it down as a checklist. What parts could be automated with skills, agents, or hooks?

**Self-Check**: You've completed the course when you can explain to a colleague how agents, skills, and MCP work together - and when to use each.

---

## 📝 Assignment

### Main Challenge: End-to-End Feature

The hands-on examples walked through building a "list unread books" feature. Now practice the full workflow on a different feature: **search books by year range**:

1. Start Copilot and gather context: `@samples/book-app-project/books.py`
2. Plan with `/plan Add a "search by year" command that lets users find books published between two years`
3. Implement a `find_by_year_range(start_year, end_year)` method in `BookCollection`
4. Add a `handle_search_year()` function in `book_app.py` that prompts the user for start and end years
5. Generate tests: `@samples/book-app-project/books.py @samples/book-app-project/tests/test_books.py Generate tests for find_by_year_range() including edge cases like invalid years, reversed range, and no results.`
6. Review with `/review`
7. Update the README: `@samples/book-app-project/README.md Add documentation for the new "search by year" command.`
8. Generate a commit message

Document your workflow as you go.

**Success criteria**: You've completed the feature from idea to commit using Copilot CLI, including planning, implementation, tests, documentation, and review.

> 💡 **Bonus**: If you have agents set up from Chapter 04, try creating and using custom agents. For example, an error-handler agent for implementation review and a doc-writer agent for the README update.

<details>
<summary>💡 Hints (click to expand)</summary>

**Follow the pattern from the ["Idea to Merged PR"](#idea-to-merged-pr-in-one-session) example** at the top of this chapter. The key steps are:

1. Gather context with `@samples/book-app-project/books.py`
2. Plan with `/plan Add a "search by year" command`
3. Implement the method and command handler
4. Generate tests with edge cases (invalid input, empty results, reversed range)
5. Review with `/review`
6. Update README with `@samples/book-app-project/README.md`
7. Generate commit message with `-p`

**Edge cases to think about:**
- What if the user enters "2000" and "1990" (reversed range)?
- What if no books match the range?
- What if the user enters non-numeric input?

**The key is practicing the full workflow** from idea → context → plan → implement → test → document → commit.

</details>

---

<details>
<summary>🔧 <strong>Common Mistakes</strong> (click to expand)</summary>

| Mistake | What Happens | Fix |
|---------|--------------|-----|
| Jumping straight to implementation | Miss design issues that are costly to fix later | Use `/plan` first to think through the approach |
| Using one tool when multiple would help | Slower, less thorough results | Combine: Agent for analysis → Skill for execution → MCP for integration |
| Not reviewing before committing | Security issues or bugs slip through | Always run `/review` or use a [pre-commit hook](#workflow-2-code-review-automation-optional) |
| Forgetting to share workflows with team | Each person reinvents the wheel | Document patterns in shared agents, skills, and instructions |

</details>

---

# Summary

## 🔑 Key Takeaways

1. **Integration > Isolation**: Combine tools for maximum impact
2. **Context first**: Always gather required context before analysis
3. **Agents analyze, Skills execute**: Use the right tool for the job
4. **Automate repetition**: Hooks and scripts multiply your effectiveness
5. **Document workflows**: Shareable patterns benefit the whole team

> 📋 **Quick Reference**: See the [GitHub Copilot CLI command reference](https://docs.github.com/en/copilot/reference/cli-command-reference) for a complete list of commands and shortcuts.

---

## 🎓 Course Complete!

Congratulations! You've learned:

| Chapter | What You Learned |
|---------|-------------------|
| 00 | Copilot CLI installation and Quick Start |
| 01 | Three modes of interaction |
| 02 | Context management with @ syntax |
| 03 | Development workflows |
| 04 | Specialized agents |
| 05 | Extensible skills |
| 06 | External connections with MCP |
| 07 | Unified production workflows |

You're now equipped to use GitHub Copilot CLI as a genuine force multiplier in your development workflow.

## ➡️ What's Next

Your learning doesn't stop here:

1. **Practice daily**: Use Copilot CLI for real work
2. **Build custom tools**: Create agents and skills for your specific needs
3. **Share knowledge**: Help your team adopt these workflows
4. **Stay updated**: Follow GitHub Copilot updates for new features

### Resources

- [GitHub Copilot CLI Documentation](https://docs.github.com/copilot/concepts/agents/about-copilot-cli)
- [MCP Server Registry](https://github.com/modelcontextprotocol/servers)
- [Community Skills](https://github.com/topics/copilot-skill)

---

**Great job! Now go build something amazing.**
