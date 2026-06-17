# Release Governance — Branching, Protection, OIDC, and Access Control

## Table of Contents
1. [Branch Strategy](#1-branch-strategy)
2. [Branch Protection Rules](#2-branch-protection-rules)
3. [Tag-Based Release Model](#3-tag-based-release-model)
4. [Role-Based Access Control](#4-role-based-access-control)
5. [Secure Publishing with OIDC (Trusted Publishing)](#5-secure-publishing-with-oidc-trusted-publishing)
6. [Validate Tag Author in CI](#6-validate-tag-author-in-ci)
7. [Prevent Invalid Release Tags](#7-prevent-invalid-release-tags)
8. [Full `publish.yml` with Governance Gates](#8-full-publishyml-with-governance-gates)

---

## 1. Branch Strategy

Use a clear branch hierarchy to separate development work from releasable code.

```
main          ← stable; only receives PRs from develop or hotfix/*
develop       ← integration branch; all feature PRs merge here first
feature/*     ← new capabilities (e.g., feature/add-redis-backend)
fix/*         ← bug fixes (e.g., fix/memory-leak-on-close)
hotfix/*      ← urgent production fixes; PR directly to main + cherry-pick to develop
release/*     ← (optional) release preparation (e.g., release/v2.0.0)
```

### Rules

| Rule | Why |
|---|---|
| No direct push to `main` | Prevent accidental breakage of the stable branch |
| All changes via PR | Enforces review + CI before merge |
| At least one approval required | Second pair of eyes on all changes |
| CI must pass | Never merge broken code |
| Only tags trigger releases | No ad-hoc publish from branch pushes |

---

## 2. Branch Protection Rules

Configure these in **GitHub → Settings → Branches → Add rule** for `main` and `develop`.

### For `main`

```yaml
# Equivalent GitHub branch protection config (for documentation)
branch: main
rules:
  - require_pull_request_reviews:
      required_approving_review_count: 1
      dismiss_stale_reviews: true
  - require_status_checks_to_pass:
      contexts:
        - "Lint, Format & Type Check"
        - "Test (Python 3.11)"   # at minimum; add all matrix versions
      strict: true               # branch must be up-to-date before merge
  - restrict_pushes:
      allowed_actors: []         # nobody — only PR merges
  - require_linear_history: true # prevents merge commits on main
```

### For `develop`

```yaml
branch: develop
rules:
  - require_pull_request_reviews:
      required_approving_review_count: 1
  - require_status_checks_to_pass:
      contexts: ["CI"]
      strict: false   # less strict for the integration branch
```

### Via GitHub CLI

```bash
# Protect main (requires gh CLI and admin rights)
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Lint, Format & Type Check", "Test (Python 3.11)"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true
  },
  "restrictions": null
}
EOF
```

---

## 3. Tag-Based Release Model

**Only annotated tags on `main` trigger a release.** Branch pushes and PR merges never publish.

### Tag Naming Convention

```
vMAJOR.MINOR.PATCH           # Stable:         v1.2.3
vMAJOR.MINOR.PATCHaN         # Alpha:           v2.0.0a1
vMAJOR.MINOR.PATCHbN         # Beta:            v2.0.0b1
vMAJOR.MINOR.PATCHrcN        # Release Candidate: v2.0.0rc1
```

### Release Workflow

```bash
# 1. Merge develop → main via PR (reviewed, CI green)

# 2. Update CHANGELOG.md on main
#    Move [Unreleased] entries to [vX.Y.Z] - YYYY-MM-DD

# 3. Commit the changelog
git checkout main
git pull origin main
git add CHANGELOG.md
git commit -m "chore: release v1.2.3"

# 4. Create and push an annotated tag
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3          # ← ONLY the tag; not --tags (avoids pushing all tags)

# 5. Confirm: GitHub Actions publish.yml triggers automatically
#    Monitor: Actions tab → publish workflow
#    Verify:  https://pypi.org/project/your-package/
```

### Why annotated tags?

Annotated tags (`git tag -a`) carry a tagger identity, date, and message — lightweight tags do
not. `setuptools_scm` works with both, but annotated tags are safer for release governance because
they record *who* created the tag.

---

## 4. Role-Based Access Control

| Role | What they can do |
|---|---|
| **Maintainer** | Create release tags, approve PRs, manage branch protection |
| **Contributor** | Open PRs to `develop`; cannot push to `main` or create release tags |
| **CI (GitHub Actions)** | Publish to PyPI via OIDC; cannot push code or create tags |

### Implement via GitHub Teams

```bash
# Create a Maintainers team and restrict tag creation to that team
gh api repos/{owner}/{repo}/tags/protection \
  --method POST \
  --field pattern="v*"
# Then set allowed actors to the Maintainers team only
```

---

## 5. Secure Publishing with OIDC (Trusted Publishing)

**Never store a PyPI API token as a GitHub secret.** Use Trusted Publishing (OIDC) instead.
The PyPI project authorises a specific GitHub repository + workflow + environment — no long-lived
secret is exchanged.

### One-time PyPI Setup

1. Go to https://pypi.org/manage/project/your-package/settings/publishing/
2. Click **Add a new publisher**
3. Fill in:
   - **Owner:** your-github-username
   - **Repository:** your-repo-name
   - **Workflow name:** `publish.yml`
   - **Environment name:** `release` (must match the `environment:` key in the workflow)
4. Save. No token required.

### GitHub Environment Setup

1. Go to **GitHub → Settings → Environments → New environment** → name it `release`
2. Add a protection rule: **Required reviewers** (optional but recommended for extra safety)
3. Add a deployment branch rule: **Only tags matching `v*`**

### Minimal `publish.yml` using OIDC

```yaml
# .github/workflows/publish.yml
name: Publish to PyPI

on:
  push:
    tags:
      - "v[0-9]+.[0-9]+.[0-9]+*"   # Matches v1.0.0, v2.0.0a1, v1.2.3rc1

jobs:
  publish:
    name: Build and publish
    runs-on: ubuntu-latest
    environment: release       # Must match the PyPI Trusted Publisher environment name
    permissions:
      id-token: write          # Required for OIDC — grants a short-lived token to PyPI
      contents: read

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0       # REQUIRED for setuptools_scm

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install build
        run: pip install build

      - name: Build distributions
        run: python -m build

      - name: Validate distributions
        run: pip install twine ; twine check dist/*

      - name: Publish to PyPI
        uses: pypa/gh-action-pypi-publish@release/v1
        # No `password:` or `user:` needed — OIDC handles authentication
```

---

## 6. Validate Tag Author in CI

Restrict who can trigger a release by checking `GITHUB_ACTOR` against an allowlist.
Add this as the **first step** in your publish job to fail fast.

```yaml
- name: Validate tag author
  run: |
    ALLOWED_USERS=("your-github-username" "co-maintainer-username")
    if [[ ! " ${ALLOWED_USERS[*]} " =~ " ${GITHUB_ACTOR} " ]]; then
      echo "::error::Release blocked: ${GITHUB_ACTOR} is not an authorised releaser."
      exit 1
    fi
    echo "Release authorised for ${GITHUB_ACTOR}."
```

### Notes

- `GITHUB_ACTOR` is the GitHub username of the person who pushed the tag.
- Store the allowlist in a separate file (e.g., `.github/MAINTAINERS`) for maintainability.
- For teams: replace the username check with a GitHub API call to verify team membership.

---

## 7. Prevent Invalid Release Tags

Reject workflow runs triggered by tags that do not follow your versioning convention.
This stops accidental publishes from tags like `test`, `backup-old`, or `v1`.

```yaml
- name: Validate release tag format
  run: |
    # Accepts: v1.0.0  v1.0.0a1  v1.0.0b2  v1.0.0rc1  v1.0.0.post1
    if [[ ! "${GITHUB_REF}" =~ ^refs/tags/v[0-9]+\.[0-9]+\.[0-9]+(a|b|rc|\.post)[0-9]*$ ]] && \
       [[ ! "${GITHUB_REF}" =~ ^refs/tags/v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      echo "::error::Tag '${GITHUB_REF}' does not match the required format v<MAJOR>.<MINOR>.<PATCH>[pre]."
      exit 1
    fi
    echo "Tag format valid: ${GITHUB_REF}"
```

### Regex explained

| Pattern | Matches |
|---|---|
| `v[0-9]+\.[0-9]+\.[0-9]+` | `v1.0.0`, `v12.3.4` |
| `(a\|b\|rc)[0-9]*` | `v1.0.0a1`, `v2.0.0rc2` |
| `\.post[0-9]*` | `v1.0.0.post1` |

---

## 8. Full `publish.yml` with Governance Gates

Complete workflow combining tag validation, author check, TestPyPI gate, and production publish.

```yaml
# .github/workflows/publish.yml
name: Publish to PyPI

on:
  push:
    tags:
      - "v[0-9]+.[0-9]+.[0-9]+*"

jobs:
  publish:
    name: Build, validate, and publish
    runs-on: ubuntu-latest
    environment: release
    permissions:
      id-token: write
      contents: read

    steps:
      - name: Validate release tag format
        run: |
          if [[ ! "${GITHUB_REF}" =~ ^refs/tags/v[0-9]+\.[0-9]+\.[0-9]+(a[0-9]*|b[0-9]*|rc[0-9]*|\.post[0-9]*)?$ ]]; then
            echo "::error::Invalid tag format: ${GITHUB_REF}"
            exit 1
          fi

      - name: Validate tag author
        run: |
          ALLOWED_USERS=("your-github-username")
          if [[ ! " ${ALLOWED_USERS[*]} " =~ " ${GITHUB_ACTOR} " ]]; then
            echo "::error::${GITHUB_ACTOR} is not authorised to release."
            exit 1
          fi

      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install build tooling
        run: pip install build twine

      - name: Build
        run: python -m build

      - name: Validate distributions
        run: twine check dist/*

      - name: Publish to TestPyPI
        uses: pypa/gh-action-pypi-publish@release/v1
        with:
          repository-url: https://test.pypi.org/legacy/
        continue-on-error: true   # Non-fatal; remove if you always want this to pass

      - name: Publish to PyPI
        uses: pypa/gh-action-pypi-publish@release/v1
```

### Security checklist

- [ ] PyPI Trusted Publishing configured (no API token stored in GitHub)
- [ ] GitHub `release` environment has branch protection: tags matching `v*` only
- [ ] Tag format validation step is the first step in the job
- [ ] Allowed-users list is maintained and reviewed regularly
- [ ] No secrets printed in logs (check all `echo` and `run` steps)
- [ ] `permissions:` is scoped to `id-token: write` only — no `write-all`
