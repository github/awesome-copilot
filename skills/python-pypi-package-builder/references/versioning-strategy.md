# Versioning Strategy — PEP 440, SemVer, and Decision Engine

## Table of Contents
1. [PEP 440 — The Standard](#1-pep-440--the-standard)
2. [Semantic Versioning (SemVer)](#2-semantic-versioning-semver)
3. [Pre-release Identifiers](#3-pre-release-identifiers)
4. [Versioning Decision Engine](#4-versioning-decision-engine)
5. [Dynamic Versioning — setuptools_scm (Recommended)](#5-dynamic-versioning--setuptools_scm-recommended)
6. [Hatchling with hatch-vcs Plugin](#6-hatchling-with-hatch-vcs-plugin)
7. [Static Versioning — flit](#7-static-versioning--flit)
8. [Static Versioning — hatchling manual](#8-static-versioning--hatchling-manual)
9. [DO NOT Hardcode Version (except flit)](#9-do-not-hardcode-version-except-flit)
10. [Dependency Version Specifiers](#10-dependency-version-specifiers)
11. [PyPA Release Commands](#11-pypa-release-commands)

---

## 1. PEP 440 — The Standard

All Python package versions must comply with [PEP 440](https://peps.python.org/pep-0440/).
Non-compliant versions (e.g., `1.0-beta`, `2023.1.1.dev`) will be rejected by PyPI.

```
Canonical form:  N[.N]+[{a|b|rc}N][.postN][.devN]

1.0.0            Stable release
1.0.0a1          Alpha pre-release
1.0.0b2          Beta pre-release
1.0.0rc1         Release candidate
1.0.0.post1      Post-release (packaging fix; same codebase)
1.0.0.dev1       Development snapshot — DO NOT upload to PyPI
2.0.0            Major release (breaking changes)
```

### Epoch prefix (rare)

```
1!1.0.0          Epoch 1; used when you need to skip ahead of an old scheme
```

Use epochs only as a last resort to fix a broken version sequence.

---

## 2. Semantic Versioning (SemVer)

SemVer maps cleanly onto PEP 440. Always use `MAJOR.MINOR.PATCH`:

```
MAJOR  Increment when you make incompatible API changes (rename, remove, break)
MINOR  Increment when you add functionality backward-compatibly (new features)
PATCH  Increment when you make backward-compatible bug fixes

Examples:
  1.0.0 → 1.0.1   Bug fix, no API change
  1.0.0 → 1.1.0   New method added; existing API intact
  1.0.0 → 2.0.0   Public method renamed or removed
```

### What counts as a breaking change?

| Change | Breaking? |
|---|---|
| Rename a public function | YES — `MAJOR` |
| Remove a parameter | YES — `MAJOR` |
| Add a required parameter | YES — `MAJOR` |
| Add an optional parameter with a default | NO — `MINOR` |
| Add a new function/class | NO — `MINOR` |
| Fix a bug | NO — `PATCH` |
| Update a dependency lower bound | NO (usually) — `PATCH` |
| Update a dependency upper bound (breaking) | YES — `MAJOR` |

---

## 3. Pre-release Identifiers

Use pre-release versions to get user feedback before a stable release.
Pre-releases are **not** installed by default by pip (`pip install pkg` skips them).
Users must opt-in: `pip install "pkg==2.0.0a1"` or `pip install --pre pkg`.

```
1.0.0a1    Alpha-1: very early; expect bugs; API may change
1.0.0b1    Beta-1:  feature-complete; API stabilising; seek broader feedback
1.0.0rc1   Release candidate: code-frozen; final testing before stable
1.0.0      Stable: ready for production
```

### Increment rule

```
Start:       1.0.0a1
More alphas: 1.0.0a2, 1.0.0a3
Move to beta: 1.0.0b1  (reset counter)
Move to RC:  1.0.0rc1
Stable:      1.0.0
```

---

## 4. Versioning Decision Engine

Use this decision tree to pick the right versioning strategy before writing any code.

```
Is the project using git and tagging releases with version tags?
├── YES → setuptools + setuptools_scm  (DEFAULT — best for most projects)
│         Git tag v1.0.0 becomes the installed version automatically.
│         Zero manual version bumping.
│
└── NO — Is the project a simple, single-module library with infrequent releases?
          ├── YES → flit
          │         Set __version__ = "1.0.0" in __init__.py.
          │         Update manually before each release.
          │
          └── NO — Does the team want an integrated build + dep management tool?
                    ├── YES → poetry
                    │         Manage version in [tool.poetry] version field.
                    │
                    └── NO → hatchling (modern, fast, pure-Python)
                              Use hatch-vcs plugin for dynamic versioning
                              or set version manually in [project].

Does the package have C/Cython/Fortran extensions?
└── YES (always) → setuptools (only backend with native extension support)
```

### Summary Table

| Backend | Version source | Best for |
|---|---|---|
| `setuptools` + `setuptools_scm` | Git tags — fully automatic | DEFAULT for new projects |
| `hatchling` + `hatch-vcs` | Git tags — automatic via plugin | hatchling users |
| `flit` | `__version__` in `__init__.py` | Very simple, minimal config |
| `poetry` | `[tool.poetry] version` field | Integrated dep + build management |
| `hatchling` manual | `[project] version` field | One-off static versioning |

---

## 5. Dynamic Versioning — setuptools_scm (Recommended)

`setuptools_scm` reads the current git tag and computes the version at build time.
No separate `__version__` update step — just tag and push.

### `pyproject.toml` configuration

```toml
[build-system]
requires      = ["setuptools>=70", "setuptools_scm>=8"]
build-backend = "setuptools.backends.legacy:build"

[project]
name    = "your-package"
dynamic = ["version"]

[tool.setuptools_scm]
version_scheme = "post-release"
local_scheme   = "no-local-version"   # Prevents +g<hash> from breaking PyPI
```

### `__init__.py` — correct version access

```python
# your_package/__init__.py
from importlib.metadata import version, PackageNotFoundError

try:
    __version__ = version("your-package")
except PackageNotFoundError:
    # Package is not installed (running from a source checkout without pip install -e .)
    __version__ = "0.0.0.dev0"

__all__ = ["__version__"]
```

### How the version is computed

```
git tag v1.0.0            →  installed_version = "1.0.0"
3 commits after v1.0.0    →  installed_version = "1.0.0.post3+g<hash>"  (dev only)
git tag v1.1.0            →  installed_version = "1.1.0"
```

With `local_scheme = "no-local-version"`, the `+g<hash>` suffix is stripped for PyPI
uploads while still being visible locally.

### Critical CI requirement

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0    # REQUIRED — without this, git has no tag history
                      # setuptools_scm falls back to 0.0.0+d<date> silently
```

**Every** CI job that installs or builds the package must have `fetch-depth: 0`.

### Debugging version issues

```bash
# Check what version setuptools_scm would produce right now:
python -m setuptools_scm

# If you see 0.0.0+d... it means:
# 1. No tags reachable from HEAD, OR
# 2. fetch-depth: 0 was not set in CI
```

---

## 6. Hatchling with hatch-vcs Plugin

An alternative to setuptools_scm for teams already using hatchling.

```toml
[build-system]
requires      = ["hatchling", "hatch-vcs"]
build-backend = "hatchling.build"

[project]
name    = "your-package"
dynamic = ["version"]

[tool.hatch.version]
source = "vcs"

[tool.hatch.build.hooks.vcs]
version-file = "src/your_package/_version.py"
```

Access the version the same way as setuptools_scm:

```python
from importlib.metadata import version, PackageNotFoundError
try:
    __version__ = version("your-package")
except PackageNotFoundError:
    __version__ = "0.0.0.dev0"
```

---

## 7. Static Versioning — flit

Use flit only for simple, single-module packages where manual version bumping is acceptable.

### `pyproject.toml`

```toml
[build-system]
requires      = ["flit_core>=3.9"]
build-backend = "flit_core.buildapi"

[project]
name    = "your-package"
dynamic = ["version", "description"]
```

### `__init__.py`

```python
"""your-package — a focused, single-purpose utility."""
__version__ = "1.2.0"   # flit reads this; update manually before each release
```

**flit exception:** this is the ONLY case where hardcoding `__version__` is correct.
flit discovers the version by importing `__init__.py` and reading `__version__`.

### Release flow for flit

```bash
# 1. Bump __version__ in __init__.py
# 2. Update CHANGELOG.md
# 3. Commit
git add src/your_package/__init__.py CHANGELOG.md
git commit -m "chore: release v1.2.0"
# 4. Tag (flit can also publish directly)
git tag v1.2.0
git push origin v1.2.0
# 5. Build and publish
flit publish
# OR
python -m build && twine upload dist/*
```

---

## 8. Static Versioning — hatchling manual

```toml
[build-system]
requires      = ["hatchling"]
build-backend = "hatchling.build"

[project]
name    = "your-package"
version = "1.0.0"   # Manual; update before each release
```

Update `version` in `pyproject.toml` before every release. No `__version__` required
(access via `importlib.metadata.version()` as usual).

---

## 9. DO NOT Hardcode Version (except flit)

Hardcoding `__version__` in `__init__.py` when **not** using flit creates a dual source of
truth that diverges over time.

```python
# BAD — when using setuptools_scm, hatchling, or poetry:
__version__ = "1.0.0"    # gets stale; diverges from the installed package version

# GOOD — works for all backends except flit:
from importlib.metadata import version, PackageNotFoundError
try:
    __version__ = version("your-package")
except PackageNotFoundError:
    __version__ = "0.0.0.dev0"
```

---

## 10. Dependency Version Specifiers

Pick the right specifier style to avoid poisoning your users' environments.

```toml
# [project] dependencies — library best practices:

"httpx>=0.24"            # Minimum only — PREFERRED; lets users upgrade freely
"httpx>=0.24,<2.0"       # Upper bound only when a known breaking change exists in next major
"requests>=2.28,<3.0"    # Acceptable for well-known major-version breaks

# Application / CLI (pinning is fine):
"httpx==0.27.2"          # Lock exact version for reproducible deploys

# NEVER in a library:
# "httpx~=0.24.0"        # Too tight; blocks minor upgrades
# "httpx==0.27.*"        # Not valid PEP 440
# "httpx"                # No constraint; fragile against future breakage
```

---

## 11. PyPA Release Commands

The canonical sequence from code to user install.

```bash
# Step 1: Tag the release (triggers CI publish.yml automatically if configured)
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3

# Step 2 (manual fallback only): Build locally
python -m build
# Produces:
#   dist/your_package-1.2.3.tar.gz   (sdist)
#   dist/your_package-1.2.3-py3-none-any.whl  (wheel)

# Step 3: Validate
twine check dist/*

# Step 4: Test on TestPyPI first (first release or major change)
twine upload --repository testpypi dist/*
pip install --index-url https://test.pypi.org/simple/ --extra-index-url https://pypi.org/simple/ your-package==1.2.3

# Step 5: Publish to production PyPI
twine upload dist/*
# OR via GitHub Actions (recommended):
# push the tag → publish.yml runs → pypa/gh-action-pypi-publish handles upload via OIDC

# Step 6: Verify
pip install your-package==1.2.3
python -c "import your_package; print(your_package.__version__)"
```
