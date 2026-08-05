---
name: gitmoji
description: 'Generates commit messages following the gitmoji convention (https://gitmoji.dev) — picks the right emoji for the intent of the change and writes a well-formed message. Use when asked to "write a gitmoji commit", "add an emoji to my commit message", "which gitmoji should I use", "gitmoji this change", or when a project uses gitmoji-style commit messages. Works from a git diff, staged changes, or a plain description of the change. Generates the message only — does not run git commands.'
license: MIT
---

# Gitmoji

Generates commit messages that follow the [gitmoji](https://gitmoji.dev/) convention: every commit starts with an emoji that identifies the intent of the change at a glance. Given a diff, a list of staged files, or a plain description of a change, this skill picks the single most appropriate gitmoji and writes a concise, well-formed commit message around it.

This skill **only generates the message** — it never runs `git commit` or any other git command. The output is a copyable message for the user to use.

## When to Use This Skill

- User says "write a gitmoji commit", "gitmoji this change", or "add an emoji to my commit message"
- User asks "which gitmoji should I use for this?"
- User pastes a git diff or describes a change in a project that uses gitmoji-style commit history
- User wants an expressive, scannable commit history using emojis

**When not to use:** if the project follows plain [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, ...) without emojis, use the `conventional-commit` or `commit-message-storyteller` skill instead. If unsure which convention the project uses, ask the user to provide recent commit history (for example, the output of `git log --oneline -10`).

## Message Format

The gitmoji specification:

```
<intention> [scope?][:?] <message>
```

- **intention** — exactly one gitmoji expressing the goal of the commit
- **scope** *(optional)* — the section of the codebase affected, in parentheses
- **message** — a brief imperative explanation of the change

Examples:

```
✨ add multi-tenant support to the billing service
🐛 (auth) prevent token refresh loop on expired sessions
♻️ (api): extract pagination logic into shared helper
```

### Emoji Style: Unicode vs Shortcode

Gitmoji supports two equivalent notations:

| Style | Example | When to prefer |
|-------|---------|----------------|
| Unicode | `✨ add dark mode` | Default — renders everywhere, shorter subject line |
| Shortcode | `:sparkles: add dark mode` | Platforms that render shortcodes (GitHub, GitLab) or teams that grep commit logs by code |

**Match the repository's existing history.** If recent commits use `:sparkles:`-style shortcodes, generate shortcodes; otherwise default to unicode emojis.

## How It Works

### Step 1: Understand the Change

Work from whatever the user provides:

1. **A git diff** — read it and identify what changed and why
2. **A list of staged/modified files** — infer intent from file names and paths
3. **A plain description** — use it directly

If the intent is genuinely ambiguous (e.g. "updated auth.js" could be a fix, a feature, or a refactor), ask one short clarifying question rather than guessing.

### Step 2: Identify the Dominant Intent

Determine the primary purpose of the change. Common intents and their gitmojis:

| Emoji | Shortcode | Intent |
|-------|-----------|--------|
| ✨ | `:sparkles:` | Introduce new features |
| 🐛 | `:bug:` | Fix a bug |
| 🚑️ | `:ambulance:` | Critical hotfix |
| 📝 | `:memo:` | Add or update documentation |
| ♻️ | `:recycle:` | Refactor code (no behavior change) |
| ✅ | `:white_check_mark:` | Add, update, or pass tests |
| ⚡️ | `:zap:` | Improve performance |
| 🎨 | `:art:` | Improve structure / format of the code |
| 🔥 | `:fire:` | Remove code or files |
| 🔒️ | `:lock:` | Fix security or privacy issues |
| ⬆️ | `:arrow_up:` | Upgrade dependencies |
| 🔧 | `:wrench:` | Add or update configuration files |
| 💄 | `:lipstick:` | Add or update the UI and style files |
| 💥 | `:boom:` | Introduce breaking changes |
| 🚨 | `:rotating_light:` | Fix compiler / linter warnings |
| 🌐 | `:globe_with_meridians:` | Internationalization and localization |

This is only the most common subset — **always consult [`references/gitmoji-reference.md`](references/gitmoji-reference.md) for the full official list of 75 gitmojis** before settling on one; a more specific emoji often exists (e.g. 🩹 for a trivial fix, ✏️ for a typo, 🚚 for a file move).

### Step 3: Pick Exactly One Emoji

Rules for ambiguous cases:

- **Specific beats generic** — a typo fix is ✏️, not 🐛; moving files is 🚚, not ♻️; a trivial non-critical fix is 🩹, not 🐛
- **Tests:** ✅ for adding/updating passing tests; 🧪 only for intentionally failing tests (e.g. TDD red step)
- **Fix vs hotfix:** 🚑️ only for urgent production fixes; everyday bug fixes are 🐛
- **Security fix:** 🔒️ wins over 🐛 when the bug is a security issue
- **Formatting-only changes:** 🎨 for code structure/formatting; 💄 only for UI/style files (CSS, themes)
- **One emoji per commit** — never stack emojis; if two intents feel equally dominant, see mixed changes below

### Step 4: Write the Message

- Imperative mood: "add", "fix", "remove" — not "added" or "fixes"
- Keep the subject line under 72 characters including the emoji
- Lowercase start, no trailing period
- Add a scope in parentheses when the project's history uses scopes
- Add a body (separated by a blank line) only when the *why* is not obvious from the subject

### Step 5: Output

Produce the commit message in a copyable code block, followed by one line explaining why that gitmoji was chosen. Do **not** execute `git commit`.

**Example output:**

```
🐛 (auth) prevent token refresh loop on expired sessions

Expired sessions triggered a refresh that failed validation and
re-triggered itself, crashing the app. A recursion guard now aborts
the cycle and returns a clean 401.
```

> **Why 🐛:** the change corrects incorrect runtime behavior — a bug fix, not urgent enough for 🚑️.

## Edge Cases

| Situation | How to Handle |
|-----------|---------------|
| Mixed changes (e.g. feature + refactor in one diff) | Pick the emoji for the *dominant* intent, and suggest splitting into separate commits if the concerns are unrelated |
| Breaking change | Use 💥 as the intention and describe the break in the body |
| Revert | ⏪️ with a subject referencing the reverted commit |
| Merge commit | 🔀 `merge branch '<name>' into <target>` |
| Initial commit | 🎉 `begin project` |
| Work in progress | 🚧 with a clear note of what remains |
| No matching emoji feels right | Re-scan the [full reference](references/gitmoji-reference.md); if still nothing fits, fall back to the closest generic intent (✨, 🐛, or ♻️) |

## Quick Reference

```bash
# Get your staged diff to paste into Copilot
git diff --staged

# Check which emoji style the repo already uses
git log --oneline -10
```

See [`references/gitmoji-reference.md`](references/gitmoji-reference.md) for the complete official gitmoji list.
