# Tooling — Ruff-Only Setup and Code Quality

## Table of Contents
1. [Use Only Ruff (Replaces black, isort, flake8)](#1-use-only-ruff-replaces-black-isort-flake8)
2. [Ruff Configuration in pyproject.toml](#2-ruff-configuration-in-pyprojecttoml)
3. [mypy Configuration](#3-mypy-configuration)
4. [pre-commit Configuration](#4-pre-commit-configuration)
5. [pytest and Coverage Configuration](#5-pytest-and-coverage-configuration)
6. [Dev Dependencies in pyproject.toml](#6-dev-dependencies-in-pyprojecttoml)
7. [CI Lint Job — Ruff Only](#7-ci-lint-job--ruff-only)
8. [Migration Guide — Removing black and isort](#8-migration-guide--removing-black-and-isort)

---

## 1. Use Only Ruff (Replaces black, isort, flake8)

**Decision:** Use `ruff` as the single linting and formatting tool. Remove `black` and `isort`.

| Old (avoid) | New (use) | What it does |
|---|---|---|
| `black` | `ruff format` | Code formatting |
| `isort` | `ruff check --select I` | Import sorting |
| `flake8` | `ruff check` | Style and error linting |
| `pyupgrade` | `ruff check --select UP` | Upgrade syntax to modern Python |
| `bandit` | `ruff check --select S` | Security linting |
| All of the above | `ruff` | One tool, one config section |

**Why ruff?**
- 10–100× faster than the tools it replaces (written in Rust).
- Single config section in `pyproject.toml` — no `.flake8`, `.isort.cfg`, `pyproject.toml[tool.black]` sprawl.
- Actively maintained by Astral; follows the same rules as the tools it replaces.
- `ruff format` is black-compatible — existing black-formatted code passes without changes.

---

## 2. Ruff Configuration in pyproject.toml

```toml
[tool.ruff]
target-version = "py310"        # Minimum supported Python version
line-length    = 88             # black-compatible default
src            = ["src", "tests"]

[tool.ruff.lint]
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # pyflakes
    "I",   # isort
    "B",   # flake8-bugbear (opinionated but very useful)
    "C4",  # flake8-comprehensions
    "UP",  # pyupgrade (modernise syntax)
    "SIM", # flake8-simplify
    "TCH", # flake8-type-checking (move imports to TYPE_CHECKING block)
    "ANN", # flake8-annotations (enforce type hints — remove if too strict)
    "S",   # flake8-bandit (security)
    "N",   # pep8-naming
]
ignore = [
    "ANN101",  # Missing type annotation for `self`
    "ANN102",  # Missing type annotation for `cls`
    "S101",    # Use of `assert` — necessary in tests
    "S603",    # subprocess without shell=True — often intentional
    "B008",    # Do not perform function calls in default arguments (false positives in FastAPI/Typer)
]

[tool.ruff.lint.isort]
known-first-party = ["your_package"]

[tool.ruff.lint.per-file-ignores]
"tests/**" = ["S101", "ANN", "D"]   # Allow assert and skip annotations/docstrings in tests

[tool.ruff.format]
quote-style              = "double"   # black-compatible
indent-style             = "space"
skip-magic-trailing-comma = false
line-ending              = "auto"
```

### Useful ruff commands

```bash
# Check for lint issues (no changes)
ruff check .

# Auto-fix fixable issues
ruff check --fix .

# Format code (replaces black)
ruff format .

# Check formatting without changing files (CI mode)
ruff format --check .

# Run both lint and format check in one command (for CI)
ruff check . && ruff format --check .
```

---

## 3. mypy Configuration

```toml
[tool.mypy]
python_version          = "3.10"
strict                  = true
warn_return_any         = true
warn_unused_ignores     = true
warn_redundant_casts    = true
disallow_untyped_defs   = true
disallow_incomplete_defs = true
check_untyped_defs      = true
no_implicit_optional    = true
show_error_codes        = true

# Ignore missing stubs for third-party packages that don't ship types
[[tool.mypy.overrides]]
module = ["redis.*", "pydantic_settings.*"]
ignore_missing_imports = true
```

### Running mypy — handle both src and flat layouts

```bash
# src layout:
mypy src/your_package/

# flat layout:
mypy your_package/
```

In CI, detect layout dynamically:

```yaml
- name: Run mypy
  run: |
    if [ -d "src" ]; then
        mypy src/
    else
        mypy your_package/
    fi
```

---

## 4. pre-commit Configuration

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.4.4    # Pin to a specific release; update periodically with `pre-commit autoupdate`
    hooks:
      - id: ruff
        args: [--fix]       # Auto-fix what can be fixed
      - id: ruff-format     # Format (replaces black hook)

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.10.0
    hooks:
      - id: mypy
        additional_dependencies:
          - types-requests
          - types-redis
          # Add stubs for any typed dependency used in your package

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-toml
      - id: check-yaml
      - id: check-merge-conflict
      - id: check-added-large-files
        args: ["--maxkb=500"]
```

### ❌ Remove these hooks (replaced by ruff)

```yaml
# DELETE or never add:
- repo: https://github.com/psf/black           # replaced by ruff-format
- repo: https://github.com/PyCQA/isort          # replaced by ruff lint I rules
- repo: https://github.com/PyCQA/flake8         # replaced by ruff check
- repo: https://github.com/PyCQA/autoflake      # replaced by ruff check F401
```

### Setup

```bash
pip install pre-commit
pre-commit install     # Installs git hook — runs on every commit
pre-commit run --all-files  # Run manually on all files
pre-commit autoupdate  # Update all hooks to latest pinned versions
```

---

## 5. pytest and Coverage Configuration

```toml
[tool.pytest.ini_options]
testpaths    = ["tests"]
addopts      = "-ra -q --strict-markers --cov=your_package --cov-report=term-missing"
asyncio_mode = "auto"    # Enables async tests without @pytest.mark.asyncio decorator

[tool.coverage.run]
source   = ["your_package"]
branch   = true
omit     = ["**/__main__.py", "**/cli.py"]  # omit entry points from coverage

[tool.coverage.report]
show_missing   = true
skip_covered   = false
fail_under     = 85        # Fail CI if coverage drops below 85%
exclude_lines  = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
    "@abstractmethod",
]
```

### asyncio_mode = "auto" — remove @pytest.mark.asyncio

With `asyncio_mode = "auto"` set in `pyproject.toml`, **do not** add `@pytest.mark.asyncio`
to test functions. The decorator is redundant and will raise a warning in modern pytest-asyncio.

```python
# WRONG — the decorator is deprecated when asyncio_mode = "auto":
@pytest.mark.asyncio
async def test_async_operation():
    result = await my_async_func()
    assert result == expected

# CORRECT — just use async def:
async def test_async_operation():
    result = await my_async_func()
    assert result == expected
```

---

## 6. Dev Dependencies in pyproject.toml

Declare all dev/test tools in an `[extras]` group named `dev`.

```toml
[project.optional-dependencies]
dev = [
    "pytest>=8",
    "pytest-asyncio>=0.23",
    "pytest-cov>=5",
    "ruff>=0.4",
    "mypy>=1.10",
    "pre-commit>=3.7",
    "httpx>=0.27",       # If testing HTTP transport
    "respx>=0.21",       # If mocking httpx in tests
]
redis = [
    "redis>=5",
]
docs = [
    "mkdocs-material>=9",
    "mkdocstrings[python]>=0.25",
]
```

Install dev dependencies:

```bash
pip install -e ".[dev]"
pip install -e ".[dev,redis]"   # Include optional extras
```

---

## 7. CI Lint Job — Ruff Only

Replace the separate `black`, `isort`, and `flake8` steps with a single `ruff` step.

```yaml
# .github/workflows/ci.yml  — lint job
lint:
  name: Lint & Type Check
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - uses: actions/setup-python@v5
      with:
        python-version: "3.11"

    - name: Install dev dependencies
      run: pip install -e ".[dev]"

    # Single step: ruff replaces black + isort + flake8
    - name: ruff lint
      run: ruff check .

    - name: ruff format check
      run: ruff format --check .

    - name: mypy
      run: |
        if [ -d "src" ]; then
            mypy src/
        else
            mypy $(basename $(ls -d */))/ 2>/dev/null || mypy .
        fi
```

---

## 8. Migration Guide — Removing black and isort

If you are converting an existing project that used `black` and `isort`:

```bash
# 1. Remove black and isort from dev dependencies
pip uninstall black isort

# 2. Remove black and isort config sections from pyproject.toml
# [tool.black]  ← delete this section
# [tool.isort]  ← delete this section

# 3. Add ruff to dev dependencies (see Section 2 for config)

# 4. Run ruff format to confirm existing code is already compatible
ruff format --check .
# ruff format is black-compatible; output should be identical

# 5. Update .pre-commit-config.yaml (see Section 4)
# Remove black and isort hooks; add ruff and ruff-format hooks

# 6. Update CI (see Section 7)
# Remove black, isort, flake8 steps; add ruff check + ruff format --check

# 7. Reinstall pre-commit hooks
pre-commit uninstall
pre-commit install
pre-commit run --all-files   # Verify clean
```
