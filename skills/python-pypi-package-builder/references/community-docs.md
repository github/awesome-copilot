# Community Docs, PR Checklist, Anti-patterns, and Release Checklist

## Table of Contents
1. [README.md required sections](#1-readmemd-required-sections)
2. [Docstrings — Google style](#2-docstrings--google-style)
3. [CONTRIBUTING.md template](#3-contributingmd)
4. [SECURITY.md template](#4-securitymd)
5. [GitHub Issue Templates](#5-github-issue-templates)
6. [PR Checklist](#6-pr-checklist)
7. [Anti-patterns to avoid](#7-anti-patterns-to-avoid)
8. [Master Release Checklist](#8-master-release-checklist)

---

## 1. `README.md` Required Sections

A good README is the single most important file for adoption. Users decide in 30 seconds whether
to use your library based on the README.

```markdown
# your-package

> One-line description — what it does and why it's useful.

[![PyPI version](https://badge.fury.io/py/your-package.svg)](https://pypi.org/project/your-package/)
[![Python Versions](https://img.shields.io/pypi/pyversions/your-package)](https://pypi.org/project/your-package/)
[![CI](https://github.com/you/your-package/actions/workflows/ci.yml/badge.svg)](https://github.com/you/your-package/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/you/your-package/branch/master/graph/badge.svg)](https://codecov.io/gh/you/your-package)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Installation

pip install your-package

# With Redis backend:
pip install "your-package[redis]"

## Quick Start

(A copy-paste working example — no setup required to run it)

from your_package import YourClient

client = YourClient(api_key="sk-...")
result = client.process({"input": "value"})
print(result)

## Features

- Feature 1
- Feature 2

## Configuration

| Parameter | Type | Default | Description |
|---|---|---|—--|
| api_key | str | required | Authentication credential |
| timeout | int | 30 | Request timeout in seconds |
| retries | int | 3 | Number of retry attempts |

## Backends

Brief comparison — in-memory vs Redis — and when to use each.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md)

## License

MIT — see [LICENSE](./LICENSE)
```

---

## 2. Docstrings — Google Style

Use Google-style docstrings for every public class, method, and function. IDEs display these
as tooltips, mkdocs/sphinx can auto-generate documentation from them, and they convey intent
clearly to contributors.

```python
class YourClient:
    """
    Main client for <purpose>.

    Args:
        api_key: Authentication credential.
        timeout: Request timeout in seconds. Defaults to 30.
        retries: Number of retry attempts. Defaults to 3.

    Raises:
        ValueError: If api_key is empty or timeout is non-positive.

    Example:
        >>> from your_package import YourClient
        >>> client = YourClient(api_key="sk-...")
        >>> result = client.process({"input": "value"})
    """
```

---

## 3. `CONTRIBUTING.md`

```markdown
# Contributing to your-package

## Development Setup

git clone https://github.com/you/your-package
cd your-package
pip install -e ".[dev]"
pre-commit install

## Running Tests

pytest

## Running Linting

ruff check .
black . --check
mypy your_package/

## Submitting a PR

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make changes with tests
4. Ensure CI passes: `pre-commit run --all-files && pytest`
5. Update `CHANGELOG.md` under `[Unreleased]`
6. Open a PR — use the PR template

## Commit Message Format (Conventional Commits)

- `feat: add Redis backend`
- `fix: correct retry behavior on timeout`
- `docs: update README quick start`
- `chore: bump ruff to 0.5`
- `test: add edge cases for memory backend`

## Reporting Bugs

Use the GitHub issue template. Include Python version, package version,
and a minimal reproducible example.
```

---

## 4. `SECURITY.md`

```markdown
# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.x.x   | Yes       |
| < 1.0   | No        |

## Reporting a Vulnerability

Do NOT open a public GitHub issue for security vulnerabilities.

Report via: GitHub private security reporting (preferred)
or email: security@yourdomain.com

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We aim to acknowledge within 48 hours and resolve within 14 days.
```

---

## 5. GitHub Issue Templates

### `.github/ISSUE_TEMPLATE/bug_report.md`

```markdown
---
name: Bug Report
about: Report a reproducible bug
labels: bug
---

**Python version:**
**Package version:**

**Describe the bug:**

**Minimal reproducible example:**
```python
# paste code here
```

**Expected behavior:**

**Actual behavior:**
```

### `.github/ISSUE_TEMPLATE/feature_request.md`

```markdown
---
name: Feature Request
about: Suggest a new feature or enhancement
labels: enhancement
---

**Problem this would solve:**

**Proposed solution:**

**Alternatives considered:**
```

---

## 6. PR Checklist

All items must be checked before requesting review. CI must be fully green.

### Code Quality Gates
```
[ ] ruff check . — zero errors
[ ] black . --check — zero formatting issues
[ ] isort . --check-only — imports sorted correctly
[ ] mypy your_package/ — zero type errors
[ ] pytest — all tests pass
[ ] Coverage >= 80% (enforced by fail_under in pyproject.toml)
[ ] All GitHub Actions workflows green
```

### Structure
```
[ ] pyproject.toml: name, dynamic/version, description, requires-python, license, authors,
    keywords (10+), classifiers, dependencies, all [project.urls] filled in
[ ] dynamic = ["version"] if using setuptools_scm
[ ] [tool.setuptools_scm] with local_scheme = "no-local-version"
[ ] setup.py shim present (if using setuptools_scm)
[ ] py.typed marker file exists in the package directory (empty file)
[ ] py.typed listed in [tool.setuptools.package-data]
[ ] "Typing :: Typed" classifier in pyproject.toml
[ ] __init__.py has __all__ listing all public symbols
[ ] __version__ via importlib.metadata (not hardcoded string)
```

### Testing
```
[ ] conftest.py has shared fixtures for client and backend
[ ] Core happy path tested
[ ] Error conditions and edge cases tested
[ ] Each backend tested independently in isolation
[ ] Redis backend tested in separate CI job with redis service (if applicable)
[ ] asyncio_mode = "auto" in pyproject.toml (for async tests)
[ ] fetch-depth: 0 in all CI checkout steps
```

### Optional Backend (if applicable)
```
[ ] BaseBackend abstract class defines the interface
[ ] MemoryBackend works with zero extra deps
[ ] RedisBackend raises ImportError with clear pip install hint if redis not installed
[ ] Both backends unit-tested independently
[ ] redis extra declared in [project.optional-dependencies]
[ ] README shows both install paths (base and [redis])
```

### Changelog & Docs
```
[ ] CHANGELOG.md updated under [Unreleased]
[ ] README has: description, install, quick start, config table, badges, license
[ ] All public symbols have Google-style docstrings
[ ] CONTRIBUTING.md: dev setup, test/lint commands, PR instructions
[ ] SECURITY.md: supported versions, reporting process
[ ] .github/ISSUE_TEMPLATE/bug_report.md
[ ] .github/ISSUE_TEMPLATE/feature_request.md
```

### CI/CD
```
[ ] ci.yml: lint + mypy + test matrix (all supported Python versions)
[ ] ci.yml: separate job for Redis backend with redis service
[ ] publish.yml: triggered on v*.*.* tags, uses Trusted Publishing (OIDC)
[ ] fetch-depth: 0 in all workflow checkout steps
[ ] pypi environment created in GitHub repo Settings → Environments
[ ] No API tokens in repository secrets
```

---

## 7. Anti-patterns to Avoid

| Anti-pattern | Why it's bad | Correct approach |
|---|---|---|
| `__version__ = "1.0.0"` hardcoded with setuptools_scm | Goes stale after first git tag | Use `importlib.metadata.version()` |
| Missing `fetch-depth: 0` in CI checkout | setuptools_scm can't find tags → version = `0.0.0+dev` | Add `fetch-depth: 0` to **every** checkout step |
| `local_scheme` not set | `+g<hash>` suffix breaks PyPI uploads (local versions rejected) | `local_scheme = "no-local-version"` |
| Missing `py.typed` file | IDEs and mypy don't see package as typed | Create empty `py.typed` in package root |
| `py.typed` not in `package-data` | File missing from installed wheel — useless | Add to `[tool.setuptools.package-data]` |
| Importing optional dep at module top | `ImportError` on `import your_package` for all users | Lazy import inside the function/class that needs it |
| Duplicating metadata in `setup.py` | Conflicts with `pyproject.toml`; drifts | Keep `setup.py` as 3-line shim only |
| No `fail_under` in coverage config | Coverage regressions go unnoticed | Set `fail_under = 80` |
| No mypy in CI | Type errors silently accumulate | Add mypy step to `ci.yml` |
| API tokens in GitHub Secrets for PyPI | Security risk, rotation burden | Use Trusted Publishing (OIDC) |
| Committing directly to `main`/`master` | Bypasses CI checks | Enforce via `no-commit-to-branch` pre-commit hook |
| Missing `[Unreleased]` section in CHANGELOG | Changes pile up and get forgotten at release time | Keep `[Unreleased]` updated every PR |
| Pinning exact dep versions in a library | Breaks dependency resolution for users | Use `>=` lower bounds only; avoid `==` |
| No `__all__` in `__init__.py` | Users can accidentally import internal helpers | Declare `__all__` with every public symbol |
| `from your_package import *` in tests | Tests pass even when imports are broken | Always use explicit imports |
| No `SECURITY.md` | No path for responsible vulnerability disclosure | Add file with response timeline |
| `Any` everywhere in type hints | Defeats mypy entirely | Use `object` for truly arbitrary values |
| `Union` return types | Forces every caller to write `isinstance()` checks | Return concrete types; use overloads |
| `setup.cfg` + `pyproject.toml` both active | Conflicts and confusing for contributors | Migrate everything to `pyproject.toml` |
| Releasing on untagged commits | Version number is meaningless | Always tag before release |
| Not testing on all supported Python versions | Breakage discovered by users, not you | Matrix test in CI |
| `license = {text = "MIT"}` (old form) | Deprecated; PEP 639 uses SPDX strings | `license = "MIT"` |
| No issue templates | Bug reports are inconsistent | Add `bug_report.md` + `feature_request.md` |

---

## 8. Master Release Checklist

Run through every item before pushing a release tag. CI must be fully green.

### Code Quality
```
[ ] ruff check . — zero errors
[ ] ruff format . --check — zero formatting issues
[ ] mypy src/your_package/ — zero type errors
[ ] pytest — all tests pass
[ ] Coverage >= 80% (fail_under enforced in pyproject.toml)
[ ] All GitHub Actions CI jobs green (lint + test matrix)
```

### Project Structure
```
[ ] pyproject.toml — name, description, requires-python, license (SPDX string), authors,
    keywords (10+), classifiers (Python versions + Typing :: Typed), urls (all 5 fields)
[ ] dynamic = ["version"] set (if using setuptools_scm or hatch-vcs)
[ ] [tool.setuptools_scm] with local_scheme = "no-local-version"
[ ] setup.py shim present (if using setuptools_scm)
[ ] py.typed marker file exists (empty file in package root)
[ ] py.typed listed in [tool.setuptools.package-data]
[ ] "Typing :: Typed" classifier in pyproject.toml
[ ] __init__.py has __all__ listing all public symbols
[ ] __version__ reads from importlib.metadata (not hardcoded)
```

### Testing
```
[ ] conftest.py has shared fixtures for client and backend
[ ] Core happy path tested
[ ] Error conditions and edge cases tested
[ ] Each backend tested independently in isolation
[ ] asyncio_mode = "auto" in pyproject.toml (for async tests)
[ ] fetch-depth: 0 in all CI checkout steps
```

### CHANGELOG and Docs
```
[ ] CHANGELOG.md: [Unreleased] entries moved to [x.y.z] - YYYY-MM-DD
[ ] README has: description, install commands, quick start, config table, badges
[ ] All public symbols have Google-style docstrings
[ ] CONTRIBUTING.md: dev setup, test/lint commands, PR instructions
[ ] SECURITY.md: supported versions, reporting process with timeline
```

### Versioning
```
[ ] All CI checks pass on the commit you plan to tag
[ ] CHANGELOG.md updated and committed
[ ] Git tag follows format v1.2.3 (semver, v prefix)
[ ] No stale local_scheme suffixes will appear in the built wheel name
```

### CI/CD
```
[ ] ci.yml: lint + mypy + test matrix (all supported Python versions)
[ ] publish.yml: triggered on v*.*.* tags, uses Trusted Publishing (OIDC)
[ ] pypi environment created in GitHub repo Settings → Environments
[ ] No API tokens stored in repository secrets
```

### The Release Command Sequence
```bash
# 1. Run full local validation
ruff check . ; ruff format . --check ; mypy src/your_package/ ; pytest

# 2. Update CHANGELOG.md — move [Unreleased] to [x.y.z]
# 3. Commit the changelog
git add CHANGELOG.md
git commit -m "chore: prepare release vX.Y.Z"

# 4. Tag and push — this triggers publish.yml automatically
git tag vX.Y.Z
git push origin main --tags

# 5. Monitor: https://github.com/<you>/<pkg>/actions
# 6. Verify: https://pypi.org/project/your-package/
```
