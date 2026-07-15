---
name: conventional-branch
description: 'Create Git branches following the Conventional Branch specification (feature/, bugfix/, hotfix/, release/, chore/). Use when creating a new branch, naming a branch, or checking whether a branch name complies with the spec.'
---

# Conventional Branch

Create Git branches that follow the [Conventional Branch](https://conventional-branch.github.io) specification — a simple, consistent convention for naming Git branches.

## Branch Name Format

```
<type>/<description>
```

### Branch Types

| Type | Alias | Purpose |
|------|-------|---------|
| `feature/` | `feat/` | New features or enhancements |
| `bugfix/` | `fix/` | Bug fixes |
| `hotfix/` | — | Urgent production fixes |
| `release/` | — | Release preparation (dots allowed in version: `release/v1.2.0`) |
| `chore/` | — | Non-code tasks (deps, docs, config) |

### Trunk Branches

`main`, `master`, and `develop` are trunk branches — they do not use a prefix. Never create new branches with the same names as trunk branches; branch off them instead.

## Naming Rules

- **Lowercase only** — no uppercase letters anywhere
- **Alphanumerics, hyphens, and dots** — `a-z`, `0-9`, `-`, `.`
- **Dots allowed only** in `release/` version descriptions (e.g., `release/v1.2.0`)
- **No underscores, spaces, or special characters**
- **No consecutive hyphens** (`--`), **dots** (`..`), or **hyphen-dot adjacency** (`-.` or `.-`)
- **No leading or trailing hyphens or dots** in the description

## Valid Examples

```
main
master
develop
feature/add-login-page
feat/add-login-page
bugfix/fix-header-bug
fix/header-bug
hotfix/security-patch
release/v1.2.0
chore/update-dependencies
feature/issue-123-new-login
```

## Invalid Examples

| Branch | Problem |
|--------|---------|
| `Feature/Add-Login` | Uppercase letters |
| `feature/new--login` | Consecutive hyphens |
| `feature/-new-login` | Leading hyphen |
| `feature/new-login-` | Trailing hyphen |
| `release/v1.-2.0` | Hyphen adjacent to dot |
| `fix/header bug` | Space |
| `fix/header_bug` | Underscore |
| `unknown/some-task` | Unknown prefix type |

## Description Guidelines

- Use **kebab-case** with 2-5 words
- Be descriptive but concise (~50 chars total)
- Good: `add-oauth-login`, `fix-header-overflow`, `update-ci-config`
- Bad: `fix-bug`, `new-feature`

## Workflow

**Follow these steps:**

**Step 1 — Determine Branch Type**

Ask the user (if not already clear):

- **Branch type** — default to `feature` when uncertain
- **Brief description** — what the branch is for

If the user mentions a ticket or issue number, include it in the description (e.g., `feature/issue-123-add-oauth`).

**Step 2 — Validate the Name**

Check the assembled name against the **Naming Rules** above. If any rule fails, fix it:

- Lowercase everything
- Replace underscores and spaces with hyphens
- Collapse consecutive hyphens
- Strip leading/trailing hyphens

**Step 3 — Detect the Base Branch**

Different repos use different trunk branches. Detect which one this repo uses:

```bash
# Prefer the remote's default branch
git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||'
```

If that returns nothing, check which trunk branch exists locally (priority order: `develop`, `main`, `master`):

```bash
for b in develop main master; do
  git show-ref --verify --quiet "refs/heads/$b" && echo "$b" && break
done
```

**Step 4 — Create and Checkout**

```bash
git checkout <base>
git pull origin <base>
git checkout -b <type>/<description>
```

**Step 5 — Confirm**

Tell the user:
- The branch name that was created
- That they are now on the new branch
- Remind them: `git push -u origin <branch-name>` when ready

## Relationship with Conventional Commits

Conventional Branch complements [Conventional Commits](https://www.conventionalcommits.org):

| Conventional Branch | Typical Conventional Commit |
|---------------------|----------------------------|
| `feature/add-login` | `feat: add login page` |
| `bugfix/fix-header` | `fix: header overflow on mobile` |
| `chore/update-deps` | `chore: bump lodash to 5.0` |
| `release/v1.2.0` | `chore: release v1.2.0` |

Align the branch type with commit types where possible (e.g., `feature/*` branches with `feat:` commits).
