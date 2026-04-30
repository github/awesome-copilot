# pyproject.toml, Backends, Versioning, and Typed Package

## Table of Contents
1. [Complete pyproject.toml — setuptools + setuptools_scm](#1-complete-pyprojecttoml)
2. [hatchling (modern, zero-config)](#2-hatchling-modern-zero-config)
3. [flit (minimal, version from `__version__`)](#3-flit-minimal-version-from-__version__)
4. [poetry (integrated dep manager)](#4-poetry-integrated-dep-manager)
5. [Versioning Strategy — PEP 440, semver, dep specifiers](#5-versioning-strategy)
6. [setuptools_scm — dynamic version from git tags](#6-dynamic-versioning-with-setuptools_scm)
7. [setup.py shim for legacy editable installs](#7-setuppy-shim)
8. [PEP 561 typed package (py.typed)](#8-typed-package-pep-561)

---

## 1. Complete pyproject.toml

### setuptools + setuptools_scm (recommended for git-tag versioning)

```toml
[build-system]
requires = ["setuptools>=68", "wheel", "setuptools_scm"]
build-backend = "setuptools.build_meta"

[project]
name = "your-package"
dynamic = ["version"]           # Version comes from git tags via setuptools_scm
description = "<your description> — <key feature 1>, <key feature 2>"
readme = "README.md"
requires-python = ">=3.10"
license = "MIT"                # PEP 639 SPDX expression (string, not {text = "MIT"})
license-files = ["LICENSE"]
authors = [
    {name = "Your Name", email = "you@example.com"},
]
maintainers = [
    {name = "Your Name", email = "you@example.com"},
]
keywords = [
    "python",
    # Add 10-15 specific keywords that describe your library — they affect PyPI discoverability
]
classifiers = [
    "Development Status :: 3 - Alpha",          # Change to 5 at stable release
    "Intended Audience :: Developers",
    "License :: OSI Approved :: MIT License",
    "Operating System :: OS Independent",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.10",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
    "Programming Language :: Python :: 3.13",
    "Topic :: Software Development :: Libraries :: Python Modules",
    "Typing :: Typed",          # Add this when shipping py.typed
]
dependencies = [
    # List your runtime dependencies here. Keep them minimal.
    # Example: "httpx>=0.24", "pydantic>=2.0"
    # Leave empty if your library has no required runtime deps.
]

[project.optional-dependencies]
redis = [
    "redis>=4.2",               # Optional heavy backend
]
dev = [
    "pytest>=7.0",
    "pytest-asyncio>=0.21",
    "httpx>=0.24",
    "pytest-cov>=4.0",
    "ruff>=0.4",
    "black>=24.0",
    "isort>=5.13",
    "mypy>=1.0",
    "pre-commit>=3.0",
    "build",
    "twine",
]

[project.urls]
Homepage      = "https://github.com/yourusername/your-package"
Documentation = "https://github.com/yourusername/your-package#readme"
Repository    = "https://github.com/yourusername/your-package"
"Bug Tracker" = "https://github.com/yourusername/your-package/issues"
Changelog     = "https://github.com/yourusername/your-package/blob/master/CHANGELOG.md"

# --- Setuptools configuration ---
[tool.setuptools.packages.find]
include = ["your_package*"]   # flat layout
# For src/ layout, use:
# where = ["src"]

[tool.setuptools.package-data]
your_package = ["py.typed"]  # Ship the py.typed marker in the wheel

# --- setuptools_scm: version from git tags ---
[tool.setuptools_scm]
version_scheme = "post-release"
local_scheme   = "no-local-version"  # Prevents +local suffix breaking PyPI uploads

# --- Ruff (linting) ---
[tool.ruff]
target-version = "py310"
line-length    = 100

[tool.ruff.lint]
select = ["E", "F", "W", "I", "N", "UP", "B", "SIM", "C4", "PTH", "RUF"]
ignore = ["E501"]   # Line length enforced by formatter

[tool.ruff.lint.per-file-ignores]
"tests/*"   = ["S101", "ANN"]    # Allow assert and missing annotations in tests
"scripts/*" = ["T201"]           # Allow print in scripts

[tool.ruff.format]
quote-style = "double"

# --- Black (formatting) ---
[tool.black]
line-length    = 100
target-version = ["py310", "py311", "py312", "py313"]

# --- isort (import sorting) ---
[tool.isort]
profile     = "black"
line_length = 100

# --- mypy (static type checking) ---
[tool.mypy]
python_version         = "3.10"
warn_return_any        = true
warn_unused_configs    = true
warn_unused_ignores    = true
disallow_untyped_defs  = true
disallow_any_generics  = true
ignore_missing_imports = true
strict                 = false     # Set true for maximum strictness

[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false     # Relaxed in tests

# --- pytest ---
[tool.pytest.ini_options]
asyncio_mode  = "auto"
testpaths     = ["tests"]
pythonpath    = ["."]          # For flat layout; remove for src/
python_files  = "test_*.py"
python_classes = "Test*"
python_functions = "test_*"
addopts       = "-v --tb=short --cov=your_package --cov-report=term-missing"

# --- Coverage ---
[tool.coverage.run]
source = ["your_package"]
omit   = ["tests/*"]

[tool.coverage.report]
fail_under   = 80
show_missing = true
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise NotImplementedError",
    "if TYPE_CHECKING:",
    "@abstractmethod",
]
```

---

## 2. hatchling (Modern, Zero-Config)

Best for new pure-Python projects that don't need C extensions. No `setup.py` needed. Use
`hatch-vcs` for git-tag versioning, or omit it for manual version bumps.

```toml
[build-system]
requires = ["hatchling", "hatch-vcs"]     # hatch-vcs for git-tag versioning
build-backend = "hatchling.build"

[project]
name = "your-package"
dynamic = ["version"]            # Remove and add version = "1.0.0" for manual versioning
description = "One-line description"
readme = "README.md"
requires-python = ">=3.10"
license = "MIT"
license-files = ["LICENSE"]
authors = [{name = "Your Name", email = "you@example.com"}]
keywords = ["python"]
classifiers = [
    "Development Status :: 3 - Alpha",
    "Intended Audience :: Developers",
    "License :: OSI Approved :: MIT License",
    "Operating System :: OS Independent",
    "Programming Language :: Python :: 3",
    "Typing :: Typed",
]
dependencies = []

[project.optional-dependencies]
dev = ["pytest>=8.0", "pytest-cov>=5.0", "ruff>=0.6", "mypy>=1.10"]

[project.urls]
Homepage  = "https://github.com/yourusername/your-package"
Changelog = "https://github.com/yourusername/your-package/blob/master/CHANGELOG.md"

# --- Hatchling build config ---
[tool.hatch.build.targets.wheel]
packages = ["src/your_package"]    # src/ layout
# packages = ["your_package"]      # ← flat layout

[tool.hatch.version]
source = "vcs"                     # git-tag versioning via hatch-vcs

[tool.hatch.version.raw-options]
local_scheme = "no-local-version"

# ruff, mypy, pytest, coverage sections — same as setuptools template above
```

---

## 3. flit (Minimal, Version from `__version__`)

Best for very simple, single-module packages. Zero config. Version is read directly from
`your_package/__init__.py`. Always requires a **static string** for `__version__`.

```toml
[build-system]
requires = ["flit_core>=3.9"]
build-backend = "flit_core.buildapi"

[project]
name = "your-package"
dynamic = ["version", "description"]  # Read from __init__.py __version__ and docstring
readme = "README.md"
requires-python = ">=3.10"
license = "MIT"
authors = [{name = "Your Name", email = "you@example.com"}]
classifiers = [
    "License :: OSI Approved :: MIT License",
    "Programming Language :: Python :: 3",
    "Typing :: Typed",
]
dependencies = []

[project.urls]
Homepage = "https://github.com/yourusername/your-package"

# flit reads __version__ from your_package/__init__.py automatically.
# Ensure __init__.py has: __version__ = "1.0.0"  (static string — flit does NOT support
# importlib.metadata for dynamic version discovery)
```

---

## 4. poetry (Integrated Dependency + Build Manager)

Best for teams that want a single tool to manage deps, build, and publish. Poetry v2+
supports the standard `[project]` table.

```toml
[build-system]
requires = ["poetry-core>=2.0"]
build-backend = "poetry.core.masonry.api"

[project]
name = "your-package"
version = "1.0.0"
description = "One-line description"
readme = "README.md"
requires-python = ">=3.10"
license = "MIT"
authors = [{name = "Your Name", email = "you@example.com"}]
classifiers = [
    "Programming Language :: Python :: 3",
    "Typing :: Typed",
]
dependencies = []   # poetry v2+ uses standard [project] table

[project.optional-dependencies]
dev = ["pytest>=8.0", "ruff>=0.6", "mypy>=1.10"]

# Optional: use [tool.poetry] only for poetry-specific features
[tool.poetry.group.dev.dependencies]
# Poetry-specific group syntax (alternative to [project.optional-dependencies])
pytest = ">=8.0"
```

---

## 5. Versioning Strategy

### PEP 440 — The Standard

```
Canonical form:  N[.N]+[{a|b|rc}N][.postN][.devN]

Examples:
  1.0.0          Stable release
  1.0.0a1        Alpha (pre-release)
  1.0.0b2        Beta
  1.0.0rc1       Release candidate
  1.0.0.post1    Post-release (e.g., packaging fix only — no code change)
  1.0.0.dev1     Development snapshot (NOT for PyPI)
```

### Semantic Versioning (SemVer) — use this for every library

```
MAJOR.MINOR.PATCH

MAJOR: Breaking API change (remove/rename public function/class/arg)
MINOR: New feature, fully backward-compatible
PATCH: Bug fix, no API change
```

| Change | What bumps | Example |
|---|---|---|
| Remove / rename a public function | MAJOR | `1.2.3 → 2.0.0` |
| Add new public function | MINOR | `1.2.3 → 1.3.0` |
| Bug fix, no API change | PATCH | `1.2.3 → 1.2.4` |
| New pre-release | suffix | `2.0.0a1`, `2.0.0rc1` |

### Version in code — read from package metadata

```python
# your_package/__init__.py
from importlib.metadata import version, PackageNotFoundError

try:
    __version__ = version("your-package")
except PackageNotFoundError:
    __version__ = "0.0.0-dev"    # Fallback for uninstalled dev checkouts
```

Never hardcode `__version__ = "1.0.0"` when using setuptools_scm — it goes stale after the
first git tag. Use `importlib.metadata` always.

### Version specifier best practices for dependencies

```toml
# In [project] dependencies — for a LIBRARY:
"httpx>=0.24"            # Minimum version — PREFERRED for libraries
"httpx>=0.24,<1.0"       # Upper bound only when a known breaking change exists

# ONLY for applications (never for libraries):
"httpx==0.27.0"          # Pin exactly — breaks dep resolution in libraries

# NEVER do this in a library:
# "httpx~=0.24.0"        # Compatible release operator — too tight
# "httpx==0.27.*"        # Wildcard pin — fragile
```

---

## 6. Dynamic Versioning with `setuptools_scm`

`setuptools_scm` reads your git tags and sets the package version automatically — no more manually
editing version strings before each release.

### How it works

```
git tag v1.0.0        →  package version = 1.0.0
git tag v1.1.0        →  package version = 1.1.0
(commits after tag)   →  version = 1.1.0.post1+g<hash>  (stripped for PyPI)
```

`local_scheme = "no-local-version"` strips the `+g<hash>` suffix so PyPI uploads never fail with
a "local version label not allowed" error.

### Access version at runtime

```python
# your_package/__init__.py
from importlib.metadata import version, PackageNotFoundError

try:
    __version__ = version("your-package")
except PackageNotFoundError:
    __version__ = "0.0.0-dev"  # Fallback for uninstalled dev checkouts
```

Never hardcode `__version__ = "1.0.0"` when using setuptools_scm — it will go stale after the
first tag.

### Full release flow (this is it — nothing else needed)

```bash
git tag v1.2.0
git push origin master --tags
# GitHub Actions publish.yml triggers automatically
```

---

## 7. `setup.py` Shim

Some older tools and IDEs still expect a `setup.py`. Keep it as a three-line shim — all real
configuration stays in `pyproject.toml`.

```python
# setup.py — thin shim only. All config lives in pyproject.toml.
from setuptools import setup

setup()
```

Never duplicate `name`, `version`, `dependencies`, or any other metadata from `pyproject.toml`
into `setup.py`. If you copy anything there it will eventually drift and cause confusing conflicts.

---

## 8. Typed Package (PEP 561)

A properly declared typed package means mypy, pyright, and IDEs automatically pick up your type
hints without any extra configuration from your users.

### Step 1: Create the marker file

```bash
# The file must exist; its content doesn't matter — its presence is the signal.
touch your_package/py.typed
```

### Step 2: Include it in the wheel

Already in the template above:

```toml
[tool.setuptools.package-data]
your_package = ["py.typed"]
```

### Step 3: Add the PyPI classifier

```toml
classifiers = [
    ...
    "Typing :: Typed",
]
```

### Step 4: Type-annotate all public functions

```python
# Good — fully typed
def process(
    self,
    data: dict[str, object],
    *,
    timeout: int = 30,
) -> dict[str, object]:
    ...

# Bad — mypy will flag this, and IDEs give no completions to users
def process(self, data, timeout=30):
    ...
```

### Step 5: Verify py.typed ships in the wheel

```bash
python -m build
unzip -l dist/your_package-*.whl | grep py.typed
# Must show: your_package/py.typed
```

If it's missing, check your `[tool.setuptools.package-data]` config.
