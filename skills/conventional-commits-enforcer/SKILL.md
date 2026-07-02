---
name: conventional-commits-enforcer
description: 'Validates commit messages against the Conventional Commits specification, rewrites non-compliant messages, and generates a CHANGELOG.md grouped by type from commit history. Use when the user asks to "check my commit messages", "fix this commit message", "enforce conventional commits", "lint my commit history", "generate a changelog", "update the changelog", or mentions "conventional commits" together with validation, correction, or release notes.'
---

# Conventional Commits Enforcer

Validate, correct, and standardize commit messages against the [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) specification, and generate a structured `CHANGELOG.md` from the repository's commit history.

This skill is complementary to (and distinct from) message-generation skills: it does not just draft new messages — it **audits existing history or a proposed message**, flags/fixes violations, and turns validated commits into a **release-ready changelog**.

## When to use this skill

- The user has one or more commit messages and wants to know if they follow Conventional Commits.
- The user wants a non-compliant message rewritten into the correct format without losing intent.
- The user wants to lint an entire branch or range of commits (e.g., before opening a PR or cutting a release).
- The user wants a `CHANGELOG.md` (or an update to an existing one) generated from commit history.
- The user mentions semantic versioning and wants to know what version bump a set of commits implies.

## Specification reference

```
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

**Allowed types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Core rules to enforce:**
1. `type` MUST be one of the allowed types (lowercase).
2. `scope` is optional, MUST be a noun in parentheses, e.g. `(parser)`.
3. `description` MUST immediately follow the colon and a space, MUST be present, and MUST use the imperative mood ("add", not "added" or "adds").
4. `description` MUST NOT end with a period and SHOULD stay under ~72 characters on the summary line.
5. A `!` immediately before the `:` OR a `BREAKING CHANGE:` footer indicates a breaking change. A commit with either MUST be treated as breaking regardless of type.
6. `body`, if present, is separated from the description by one blank line, in free text.
7. `footer`(s) follow a `token: value` or `token #value` format (e.g. `Refs: #123`, `Reviewed-by: Jane Doe`), each starting after a blank line.
8. Reverts SHOULD use `revert:` and reference the reverted commit's SHA in the body.

## Workflow

### 1. Validate

Given one or more commit messages (pasted by the user, or read via `git log`), check each against the rules above. For each message, report:
- Compliant, or
- Non-compliant, with the **specific rule violated** (not just "invalid format").

When reading history directly, prefer:
```bash
git log --pretty=format:"%H|||%s|||%b" -n <N>
```
so subject and body can be parsed independently.

### 2. Correct

For each non-compliant message:
1. Infer the most likely `type` from the diff/description if not stated (e.g., changes only under `test/` → `test`; only comment/formatting changes → `style`; dependency bump → `build` or `chore`).
2. Convert the description to imperative mood and strip trailing punctuation.
3. Preserve the original intent and any issue references — move them to a proper footer if they were inline (e.g., `fixes bug in login (#42)` → `fix(auth): resolve session token bug` + footer `Refs: #42`).
4. If the change is breaking (removed/renamed public API, changed default behavior), add `!` after type/scope and a `BREAKING CHANGE:` footer explaining the impact.
5. Present the corrected message and a one-line diff-style explanation of what changed and why.

Never silently rewrite git history — always output the corrected message for the user to apply manually (`git commit --amend -m "..."` or interactive rebase), unless the user explicitly asks you to run the commands.

### 3. Generate the changelog

To build `CHANGELOG.md` from a commit range:

1. Collect commits in range (default: since the last tag to `HEAD`):
   ```bash
   git log $(git describe --tags --abbrev=0)..HEAD --pretty=format:"%H|||%s|||%b"
   ```
   If there is no previous tag, use the full history.
2. Parse each subject line into `type`, optional `scope`, `breaking`, and `description`.
3. Group commits under these sections, in this order, skipping empty sections:
   - `BREAKING CHANGES` (any commit with `!` or a `BREAKING CHANGE:` footer)
   - `Features` (`feat`)
   - `Bug Fixes` (`fix`)
   - `Performance` (`perf`)
   - `Documentation` (`docs`)
   - `Refactoring` (`refactor`)
   - `Chores / Build / CI` (`build`, `ci`, `chore`)
   - Commits that don't parse as Conventional Commits go under `Other Changes`, listed as-is.
4. Within each section, list entries as `- <description> (<scope>) ([short-sha](link-if-available))`.
5. Suggest the next semantic version:
   - Any `BREAKING CHANGES` → **major** bump.
   - Else any `feat` → **minor** bump.
   - Else any `fix`/`perf` → **patch** bump.
   - Else no version-relevant changes (docs/chore/style/test/build/ci only) → no bump needed, note this explicitly.
6. Prepend the new section (with today's date and the suggested version) to the top of `CHANGELOG.md` if the file exists, following the [Keep a Changelog](https://keepachangelog.com/) header style; otherwise create the file.

### Example

Input commits:
```
feat(auth): add OAuth login support
fix(parser): handle empty input without crashing
docs: update README installation steps
feat!: drop support for Node 16

BREAKING CHANGE: minimum supported Node.js version is now 18
```

Output changelog section:
```markdown
## [2.0.0] - 2026-07-02

### BREAKING CHANGES
- drop support for Node 16

### Features
- add OAuth login support (auth)

### Bug Fixes
- handle empty input without crashing (parser)

### Documentation
- update README installation steps
```
Suggested bump: **major** (2.0.0), due to the breaking change.

## Edge cases

- **Merge commits**: skip by default (`git log --no-merges`) unless the user asks to include them.
- **Squashed/legacy history with no convention**: don't force-fit every message into a type; place unparseable entries under `Other Changes` rather than guessing incorrectly.
- **Multiple scopes in one commit**: recommend splitting into separate commits; if that isn't possible, keep the most relevant scope and mention the others in the body.
- **Revert commits**: format as `revert: <original description>` and keep the original SHA in the body per spec.
