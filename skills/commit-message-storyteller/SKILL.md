---
name: commit-message-storyteller
description: 'Analyzes git diffs or staged changes and generates narrative commit messages that explain WHY a change was made, not just what changed — following Conventional Commits format. Use when asked to "write a commit message", "generate a commit", "describe my changes", "what should I commit this as", "commit this", "summarize my diff", or "help me commit". Works with git diff output, staged files, or plain descriptions of changes.'
---

# Commit Message Storyteller

Transforms raw git diffs and change descriptions into clear, story-driven commit messages that follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. Instead of "update file.js", you get messages that communicate intent, context, and impact.

## When to Use This Skill

- User says "write a commit message", "help me commit", or "generate a commit"
- User pastes a git diff or describes code changes
- User says "what should I commit this as?" or "summarize my diff"
- User wants better commit history for their team or open-source project
- User is preparing a pull request and wants meaningful commit messages

## Prerequisites

Have at least one of the following ready:
- Output from `git diff` or `git diff --staged`
- A description of what you changed and why
- A list of modified files

## How It Works

### Step 1: Gather the Change Context

Ask the user (or infer from the diff) for:

1. **What changed** — files, functions, logic affected
2. **Why it changed** — bug fix, new feature, refactor, performance, etc.
3. **Who/what triggered it** — issue number, user request, tech debt, etc.

If the user provides a raw `git diff`, extract this context automatically from the diff.

### Step 2: Identify the Commit Type

Map the change to a Conventional Commits type using this guide:

| Type | Use When |
|------|----------|
| `feat` | A new feature or capability is added |
| `fix` | A bug or incorrect behavior is corrected |
| `refactor` | Code restructured without changing behavior |
| `perf` | A change that improves performance |
| `docs` | Documentation only changes |
| `style` | Formatting, whitespace, missing semicolons (no logic change) |
| `test` | Adding or updating tests |
| `chore` | Build process, dependency updates, config changes |
| `ci` | CI/CD pipeline changes |
| `revert` | Reverting a previous commit |

See `references/conventional-commits-guide.md` for detailed examples.

### Step 3: Write the Commit Message

Follow this structure:

```
<type>(<optional scope>): <short imperative summary>

<body — the story: why this change was made, what problem it solves>

<footer — issue refs, breaking change notices>
```

#### Rules for Each Part

**Subject line (first line):**
- Use imperative mood: "add", "fix", "remove" — not "added" or "fixes"
- Max 72 characters
- No period at the end
- Lowercase after the colon

**Body (the story):**
- Explain the *why*, not the *what* (the diff already shows the what)
- Describe the problem that existed before this change
- Mention any alternatives considered if relevant
- Keep lines under 100 characters
- Separate from subject with a blank line

**Footer:**
- Reference issues: `Closes #123`, `Fixes #456`, `Refs #789`
- Mark breaking changes: `BREAKING CHANGE: <description>`

### Step 4: Generate Output

Produce the commit message in a copyable code block, followed by a one-line plain-English explanation of the story you told.

**Example output:**

```
fix(auth): prevent token refresh loop on expired sessions

When a user's session expired mid-request, the auth middleware was
triggering a token refresh, which itself failed validation and triggered
another refresh — causing an infinite retry loop that crashed the app.

This adds a recursion guard flag that aborts the refresh cycle if a
refresh is already in progress, returning a clean 401 instead.

Closes #312
```

> **Story told:** A silent infinite loop on session expiry was crashing the app; this stops the cycle early and returns a clean error.

---

## Multiple Commits from One Diff

If the diff contains **logically separate changes**, split them into multiple commit messages and tell the user. Use this heuristic:

- Different files with unrelated purposes → likely separate commits
- Same file but distinct concerns (e.g., bug fix + refactor) → suggest splitting
- Everything tightly coupled → one commit is fine

---

## Edge Cases

| Situation | How to Handle |
|-----------|---------------|
| User provides no context beyond a diff | Infer type and scope from file names and changed symbols |
| Changes span many files with no clear theme | Ask: "Is this one logical change, or multiple?" |
| Breaking change detected | Add `BREAKING CHANGE:` footer automatically |
| User says "keep it short" | Omit body, just write a strong subject line |
| No issue number available | Omit the footer entirely |

---

## Quick Reference

```bash
# Get your staged diff to paste into Copilot
git diff --staged

# Or get the last uncommitted working tree changes
git diff
```

See `references/conventional-commits-guide.md` for type examples and scope guidelines.
