---
name: python-pypi-package-builder
description: 'End-to-end skill for building, testing, linting, versioning, and publishing a production-grade Python library to PyPI. Covers all four build backends (setuptools+setuptools_scm, hatchling, flit, poetry), PEP 440 versioning, semantic versioning, dynamic git-tag versioning, OOP/SOLID design, type hints (PEP 484/526/544/561), Trusted Publishing (OIDC), and the full PyPA packaging flow. Use for: creating Python packages, pip-installable SDKs, CLI tools, framework plugins, pyproject.toml setup, py.typed, setuptools_scm, semver, mypy, pre-commit, GitHub Actions CI/CD, or PyPI publishing.'
---

# Python PyPI Package Builder Skill

A complete, battle-tested guide for building, testing, linting, versioning, typing, and
publishing a production-grade Python library to PyPI — from first commit to community-ready
release.

> **AI Agent Instruction:** Read this entire file before writing a single line of code or
> creating any file. Every decision — layout, backend, versioning strategy, patterns, CI —
> has a decision rule here. Follow the decision trees in order. This skill applies to any
> Python package type (utility, SDK, CLI, plugin, data library). Do not skip sections.

---

## Quick Navigation

| Section in this file | What it covers |
|---|---|
| [1. Skill Trigger](#1-skill-trigger) | When to load this skill |
| [2. Package Type Decision](#2-package-type-decision) | Identify what you are building |
| [3. Folder Structure Decision](#3-folder-structure-decision) | src/ vs flat vs monorepo |
| [4. Build Backend Decision](#4-build-backend-decision) | setuptools / hatchling / flit / poetry |
| [5. PyPA Packaging Flow](#5-pypa-packaging-flow) | The canonical publish pipeline |
| [6. Project Structure Templates](#6-project-structure-templates) | Full layouts for every option |
| [7. Versioning Strategy](#7-versioning-strategy) | PEP 440, semver, dynamic vs static |

| Reference file | What it covers |
|---|---|
| `references/pyproject-toml.md` | All four backend templates, `setuptools_scm`, `py.typed`, tool configs |
| `references/library-patterns.md` | OOP/SOLID, type hints, core class design, factory, protocols, CLI |
| `references/testing-quality.md` | `conftest.py`, unit/backend/async tests, ruff/mypy/pre-commit |
| `references/ci-publishing.md` | `ci.yml`, `publish.yml`, Trusted Publishing, TestPyPI, CHANGELOG, release checklist |
| `references/community-docs.md` | README, docstrings, CONTRIBUTING, SECURITY, anti-patterns, master checklist |
| `references/architecture-patterns.md` | Backend system (plugin/strategy), config layer, transport layer, CLI, backend injection |
| `references/versioning-strategy.md` | PEP 440, SemVer, pre-release, setuptools_scm deep-dive, flit static, decision engine |
| `references/release-governance.md` | Branch strategy, branch protection, OIDC, tag author validation, prevent invalid tags |
| `references/tooling-ruff.md` | Ruff-only setup (replaces black/isort), mypy config, pre-commit, asyncio_mode=auto |

**Scaffold script:** run `python skills/python-pypi-package-builder/scripts/scaffold.py --name your-package-name`
to generate the entire directory layout, stub files, and `pyproject.toml` in one command.

---

## 1. Skill Trigger

Load this skill whenever the user wants to:

- Create, scaffold, or publish a Python package or library to PyPI
- Build a pip-installable SDK, utility, CLI tool, or framework extension
- Set up `pyproject.toml`, linting, mypy, pre-commit, or GitHub Actions for a Python project
- Understand versioning (`setuptools_scm`, PEP 440, semver, static versioning)
- Understand PyPA specs: `py.typed`, `MANIFEST.in`, `RECORD`, classifiers
- Publish to PyPI using Trusted Publishing (OIDC) or API tokens
- Refactor an existing package to follow modern Python packaging standards
- Add type hints, protocols, ABCs, or dataclasses to a Python library
- Apply OOP/SOLID design patterns to a Python package
- Choose between build backends (setuptools, hatchling, flit, poetry)

**Also trigger for phrases like:** "build a Python SDK", "publish my library", "set up PyPI CI",
"create a pip package", "how do I publish to PyPI", "pyproject.toml help", "PEP 561 typed",
"setuptools_scm version", "semver Python", "PEP 440", "git tag release", "Trusted Publishing".

---

## 2. Package Type Decision

Identify what the user is building **before** writing any code. Each type has distinct patterns.

### Decision Table

| Type | Core Pattern | Entry Point | Key Deps | Example Packages |
|---|---|---|---|---|
| **Utility library** | Module of pure functions + helpers | Import API only | Minimal | `arrow`, `humanize`, `boltons`, `more-itertools` |
| **API client / SDK** | Class with methods, auth, retry logic | Import API only | `httpx` or `requests` | `boto3`, `stripe-python`, `openai` |
| **CLI tool** | Command functions + argument parser | `[project.scripts]` or `[project.entry-points]` | `click` or `typer` | `black`, `ruff`, `httpie`, `rich` |
| **Framework plugin** | Plugin class, hook registration | `[project.entry-points."framework.plugin"]` | Framework dep | `pytest-*`, `django-*`, `flask-*` |
| **Data processing library** | Classes + functional pipeline | Import API only | Optional: `numpy`, `pandas` | `pydantic`, `marshmallow`, `cerberus` |
| **Mixed / generic** | Combination of above | Varies | Varies | Many real-world packages |

**Decision Rule:** Ask the user if unclear. A package can combine types (e.g., SDK with a CLI
entry point) — use the primary type for structural decisions and add secondary type patterns on top.

For implementation patterns of each type, see `references/library-patterns.md`.

### Package Naming Rules

- PyPI name: all lowercase, hyphens — `my-python-library`
- Python import name: underscores — `my_python_library`
- Check availability: https://pypi.org/search/ before starting
- Avoid shadowing popular packages (verify `pip install <name>` fails first)

---

## 3. Folder Structure Decision

### Decision Tree

```
Does the package have 5+ internal modules OR multiple contributors OR complex sub-packages?
├── YES → Use src/ layout
│         Reason: prevents accidental import of uninstalled code during development;
│         separates source from project root files; PyPA-recommended for large projects.
│
├── NO → Is it a single-module, focused package (e.g., one file + helpers)?
│         ├── YES → Use flat layout
│         └── NO (medium complexity) → Use flat layout, migrate to src/ if it grows
│
└── Is it multiple related packages under one namespace (e.g., myorg.http, myorg.db)?
          └── YES → Use namespace/monorepo layout
```

### Quick Rule Summary

| Situation | Use |
|---|---|
| New project, unknown future size | `src/` layout (safest default) |
| Single-purpose, 1–4 modules | Flat layout |
| Large library, many contributors | `src/` layout |
| Multiple packages in one repo | Namespace / monorepo |
| Migrating old flat project | Keep flat; migrate to `src/` at next major version |

---

## 4. Build Backend Decision

### Decision Tree

```
Does the user need version derived automatically from git tags?
├── YES → Use setuptools + setuptools_scm
│         (git tag v1.0.0 → that IS your release workflow)
│
└── NO → Does the user want an all-in-one tool (deps + build + publish)?
          ├── YES → Use poetry (v2+ supports standard [project] table)
          │
          └── NO → Is the package pure Python with no C extensions?
                    ├── YES, minimal config preferred → Use flit
                    │   (zero config, auto-discovers version from __version__)
                    │
                    └── YES, modern & fast preferred → Use hatchling
                        (zero-config, plugin system, no setup.py needed)

Does the package have C/Cython/Fortran extensions?
└── YES → MUST use setuptools (only backend with full native extension support)
```

### Backend Comparison

| Backend | Version source | Config | C extensions | Best for |
|---|---|---|---|---|
| `setuptools` + `setuptools_scm` | git tags (automatic) | `pyproject.toml` + optional `setup.py` shim | Yes | Projects with git-tag releases; any complexity |
| `hatchling` | manual or plugin | `pyproject.toml` only | No | New pure-Python projects; fast, modern |
| `flit` | `__version__` in `__init__.py` | `pyproject.toml` only | No | Very simple, single-module packages |
| `poetry` | `pyproject.toml` field | `pyproject.toml` only | No | Teams wanting integrated dep management |

For all four complete `pyproject.toml` templates, see `references/pyproject-toml.md`.

---

## 5. PyPA Packaging Flow

This is the canonical end-to-end flow from source code to user install.
**Every step must be understood before publishing.**

```
1. SOURCE TREE
   Your code in version control (git)
   └── pyproject.toml describes metadata + build system

2. BUILD
   python -m build
   └── Produces two artifacts in dist/:
       ├── *.tar.gz   → source distribution (sdist)
       └── *.whl      → built distribution (wheel) — preferred by pip

3. VALIDATE
   twine check dist/*
   └── Checks metadata, README rendering, and PyPI compatibility

4. TEST PUBLISH (first release only)
   twine upload --repository testpypi dist/*
   └── Verify: pip install --index-url https://test.pypi.org/simple/ your-package

5. PUBLISH
   twine upload dist/*          ← manual fallback
   OR GitHub Actions publish.yml  ← recommended (Trusted Publishing / OIDC)

6. USER INSTALL
   pip install your-package
   pip install "your-package[extra]"
```

### Key PyPA Concepts

| Concept | What it means |
|---|---|
| **sdist** | Source distribution — your source + metadata; used when no wheel is available |
| **wheel (.whl)** | Pre-built binary — pip extracts directly into site-packages; no build step |
| **PEP 517/518** | Standard build system interface via `pyproject.toml [build-system]` table |
| **PEP 621** | Standard `[project]` table in `pyproject.toml`; all modern backends support it |
| **PEP 639** | `license` key as SPDX string (e.g., `"MIT"`, `"Apache-2.0"`) — not `{text = "MIT"}` |
| **PEP 561** | `py.typed` empty marker file — tells mypy/IDEs this package ships type information |

For complete CI workflow and publishing setup, see `references/ci-publishing.md`.

---

## 6. Project Structure Templates

### A. src/ Layout (Recommended default for new projects)

```
your-package/
├── src/
│   └── your_package/
│       ├── __init__.py           # Public API: __all__, __version__
│       ├── py.typed              # PEP 561 marker — EMPTY FILE
│       ├── core.py               # Primary implementation
│       ├── client.py             # (API client type) or remove
│       ├── cli.py                # (CLI type) click/typer commands, or remove
│       ├── config.py             # Settings / configuration dataclass
│       ├── exceptions.py         # Custom exception hierarchy
│       ├── models.py             # Data classes, Pydantic models, TypedDicts
│       ├── utils.py              # Internal helpers (prefix _utils if private)
│       ├── types.py              # Shared type aliases and TypeVars
│       └── backends/             # (Plugin pattern) — remove if not needed
│           ├── __init__.py       # Protocol / ABC interface definition
│           ├── memory.py         # Default zero-dep implementation
│           └── redis.py          # Optional heavy implementation
├── tests/
│   ├── __init__.py
│   ├── conftest.py               # Shared fixtures
│   ├── unit/
│   │   ├── __init__.py
│   │   ├── test_core.py
│   │   ├── test_config.py
│   │   └── test_models.py
│   ├── integration/
│   │   ├── __init__.py
│   │   └── test_backends.py
│   └── e2e/                      # Optional: end-to-end tests
│       └── __init__.py
├── docs/                         # Optional: mkdocs or sphinx
├── scripts/
│   └── scaffold.py
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── publish.yml
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       └── feature_request.md
├── .pre-commit-config.yaml
├── pyproject.toml
├── CHANGELOG.md
├── CONTRIBUTING.md
├── SECURITY.md
├── LICENSE
├── README.md
└── .gitignore
```

### B. Flat Layout (Small / focused packages)

```
your-package/
├── your_package/         # ← at root, not inside src/
│   ├── __init__.py
│   ├── py.typed
│   └── ... (same internal structure)
├── tests/
└── ... (same top-level files)
```

### C. Namespace / Monorepo Layout (Multiple related packages)

```
your-org/
├── packages/
│   ├── your-org-core/
│   │   ├── src/your_org/core/
│   │   └── pyproject.toml
│   ├── your-org-http/
│   │   ├── src/your_org/http/
│   │   └── pyproject.toml
│   └── your-org-cli/
│       ├── src/your_org/cli/
│       └── pyproject.toml
├── .github/workflows/
└── README.md
```

Each sub-package has its own `pyproject.toml`. They share the `your_org` namespace via PEP 420
implicit namespace packages (no `__init__.py` in the namespace root).

### Internal Module Guidelines

| File | Purpose | When to include |
|---|---|---|
| `__init__.py` | Public API surface; re-exports; `__version__` | Always |
| `py.typed` | PEP 561 typed-package marker (empty) | Always |
| `core.py` | Primary class / main logic | Always |
| `config.py` | Settings dataclass or Pydantic model | When configurable |
| `exceptions.py` | Exception hierarchy (`YourBaseError` → specifics) | Always |
| `models.py` | Data models / DTOs / TypedDicts | When data-heavy |
| `utils.py` | Internal helpers (not part of public API) | As needed |
| `types.py` | Shared `TypeVar`, `TypeAlias`, `Protocol` definitions | When complex typing |
| `cli.py` | CLI entry points (click/typer) | CLI type only |
| `backends/` | Plugin/strategy pattern | When swappable implementations |
| `_compat.py` | Python version compatibility shims | When 3.9–3.13 compat needed |

---

## 7. Versioning Strategy

### PEP 440 — The Standard

```
Canonical form:  N[.N]+[{a|b|rc}N][.postN][.devN]

Examples:
  1.0.0          Stable release
  1.0.0a1        Alpha (pre-release)
  1.0.0b2        Beta
  1.0.0rc1       Release candidate
  1.0.0.post1    Post-release (e.g., packaging fix only)
  1.0.0.dev1     Development snapshot (not for PyPI)
```

### Semantic Versioning (recommended)

```
MAJOR.MINOR.PATCH

MAJOR: Breaking API change (remove/rename public function/class/arg)
MINOR: New feature, fully backward-compatible
PATCH: Bug fix, no API change
```

### Dynamic versioning with setuptools_scm (recommended for git-tag workflows)

```bash
# How it works:
git tag v1.0.0          →  installed version = 1.0.0
git tag v1.1.0          →  installed version = 1.1.0
(commits after tag)     →  version = 1.1.0.post1  (suffix stripped for PyPI)

# In code — NEVER hardcode when using setuptools_scm:
from importlib.metadata import version, PackageNotFoundError
try:
    __version__ = version("your-package")
except PackageNotFoundError:
    __version__ = "0.0.0-dev"    # Fallback for uninstalled dev checkouts
```

Required `pyproject.toml` config:
```toml
[tool.setuptools_scm]
version_scheme = "post-release"
local_scheme   = "no-local-version"   # Prevents +g<hash> from breaking PyPI uploads
```

**Critical:** always set `fetch-depth: 0` in every CI checkout step. Without full git history,
`setuptools_scm` cannot find tags and the build version silently falls back to `0.0.0+dev`.

### Static versioning (flit, hatchling manual, poetry)

```python
# your_package/__init__.py
__version__ = "1.0.0"    # Update this before every release
```

### Version specifier best practices for dependencies

```toml
# In [project] dependencies:
"httpx>=0.24"            # Minimum version — PREFERRED for libraries
"httpx>=0.24,<1.0"       # Upper bound only when a known breaking change exists
"httpx==0.27.0"          # Pin exactly ONLY in applications, NOT libraries

# NEVER do this in a library — it breaks dependency resolution for users:
# "httpx~=0.24.0"        # Too tight
# "httpx==0.27.*"        # Fragile
```

### Version bump → release flow

```bash
# 1. Update CHANGELOG.md — move [Unreleased] entries to [x.y.z] - YYYY-MM-DD
# 2. Commit the changelog
git add CHANGELOG.md
git commit -m "chore: prepare release vX.Y.Z"
# 3. Tag and push — this triggers publish.yml automatically
git tag vX.Y.Z
git push origin main --tags
# 4. Monitor GitHub Actions → verify on https://pypi.org/project/your-package/
```

For complete pyproject.toml templates for all four backends, see `references/pyproject-toml.md`.

---

## Where to Go Next

After understanding decisions and structure:

1. **Set up `pyproject.toml`** → `references/pyproject-toml.md`
   All four backend templates (setuptools+scm, hatchling, flit, poetry), full tool configs,
   `py.typed` setup, versioning config.

2. **Write your library code** → `references/library-patterns.md`
   OOP/SOLID principles, type hints (PEP 484/526/544/561), core class design, factory functions,
   `__init__.py`, plugin/backend pattern, CLI entry point.

3. **Add tests and code quality** → `references/testing-quality.md`
   `conftest.py`, unit/backend/async tests, parametrize, ruff/mypy/pre-commit setup.

4. **Set up CI/CD and publish** → `references/ci-publishing.md`
   `ci.yml`, `publish.yml` with Trusted Publishing (OIDC, no API tokens), CHANGELOG format,
   release checklist.

5. **Polish for community/OSS** → `references/community-docs.md`
   README sections, docstring format, CONTRIBUTING, SECURITY, issue templates, anti-patterns
   table, and master release checklist.

6. **Design backends, config, transport, CLI** → `references/architecture-patterns.md`
   Backend system (plugin/strategy pattern), Settings dataclass, HTTP transport layer,
   CLI with click/typer, backend injection rules.

7. **Choose and implement a versioning strategy** → `references/versioning-strategy.md`
   PEP 440 canonical forms, SemVer rules, pre-release identifiers, setuptools_scm deep-dive,
   flit static versioning, decision engine (DEFAULT/BEGINNER/MINIMAL).

8. **Govern releases and secure the publish pipeline** → `references/release-governance.md`
   Branch strategy, branch protection rules, OIDC Trusted Publishing setup, tag author
   validation in CI, tag format enforcement, full governed `publish.yml`.

9. **Simplify tooling with Ruff** → `references/tooling-ruff.md`
   Ruff-only setup replacing black/isort/flake8, mypy config, pre-commit hooks,
   asyncio_mode=auto (remove @pytest.mark.asyncio), migration guide.
