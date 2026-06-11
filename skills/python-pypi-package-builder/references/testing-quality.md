# Testing and Code Quality

## Table of Contents
1. [conftest.py](#1-conftestpy)
2. [Unit tests](#2-unit-tests)
3. [Backend unit tests](#3-backend-unit-tests)
4. [Running tests](#4-running-tests)
5. [Code quality tools](#5-code-quality-tools)
6. [Pre-commit hooks](#6-pre-commit-hooks)

---

## 1. `conftest.py`

Use `conftest.py` to define shared fixtures. Keep fixtures focused — one fixture per concern.
For async tests, use `pytest-asyncio` with `asyncio_mode = "auto"` in `pyproject.toml`.

```python
# tests/conftest.py
import pytest
from your_package.core import YourClient
from your_package.backends.memory import MemoryBackend


@pytest.fixture
def memory_backend() -> MemoryBackend:
    return MemoryBackend()


@pytest.fixture
def client(memory_backend: MemoryBackend) -> YourClient:
    return YourClient(
        api_key="test-key",
        backend=memory_backend,
    )
```

---

## 2. Unit Tests

Test both the happy path and the edge cases (e.g. invalid inputs, error conditions).

```python
# tests/test_core.py
import pytest
from your_package import YourClient
from your_package.exceptions import YourPackageError


def test_client_creates_with_valid_key():
    client = YourClient(api_key="sk-test")
    assert client is not None


def test_client_raises_on_empty_key():
    with pytest.raises(ValueError, match="api_key"):
        YourClient(api_key="")


def test_client_raises_on_invalid_timeout():
    with pytest.raises(ValueError, match="timeout"):
        YourClient(api_key="sk-test", timeout=-1)


@pytest.mark.asyncio
async def test_process_returns_expected_result(client: YourClient):
    result = await client.process({"input": "value"})
    assert "output" in result


@pytest.mark.asyncio
async def test_process_raises_on_invalid_input(client: YourClient):
    with pytest.raises(YourPackageError):
        await client.process({})  # empty input should fail
```

---

## 3. Backend Unit Tests

Test each backend independently, in isolation from the rest of the library. This makes failures
easier to diagnose and ensures your abstract interface is actually implemented correctly.

```python
# tests/test_backends.py
import pytest
from your_package.backends.memory import MemoryBackend


@pytest.mark.asyncio
async def test_set_and_get():
    backend = MemoryBackend()
    await backend.set("key1", "value1")
    result = await backend.get("key1")
    assert result == "value1"


@pytest.mark.asyncio
async def test_get_missing_key_returns_none():
    backend = MemoryBackend()
    result = await backend.get("nonexistent")
    assert result is None


@pytest.mark.asyncio
async def test_delete_removes_key():
    backend = MemoryBackend()
    await backend.set("key1", "value1")
    await backend.delete("key1")
    result = await backend.get("key1")
    assert result is None


@pytest.mark.asyncio
async def test_ttl_expires_entry():
    import asyncio
    backend = MemoryBackend()
    await backend.set("key1", "value1", ttl=1)
    await asyncio.sleep(1.1)
    result = await backend.get("key1")
    assert result is None


@pytest.mark.asyncio
async def test_different_keys_are_independent():
    backend = MemoryBackend()
    await backend.set("key1", "a")
    await backend.set("key2", "b")
    assert await backend.get("key1") == "a"
    assert await backend.get("key2") == "b"
    await backend.delete("key1")
    assert await backend.get("key2") == "b"
```

---

## 4. Running Tests

```bash
pip install -e ".[dev]"
pytest                           # All tests
pytest --cov --cov-report=html   # With HTML coverage report (opens in browser)
pytest -k "test_middleware"      # Filter by name
pytest -x                        # Stop on first failure
pytest -v                        # Verbose output
```

Coverage config in `pyproject.toml` enforces a minimum threshold (`fail_under = 80`). CI will
fail if you drop below it, which catches coverage regressions automatically.

---

## 5. Code Quality Tools

### Ruff (linting — replaces flake8, pylint, many others)

```bash
pip install ruff
ruff check .           # Check for issues
ruff check . --fix     # Auto-fix safe issues
```

Ruff is extremely fast and replaces most of the Python linting ecosystem. Configure it in
`pyproject.toml` — see `references/pyproject-toml.md` for the full config.

### Black (formatting)

```bash
pip install black
black .                # Format all files
black . --check        # CI mode — reports issues without modifying files
```

### isort (import sorting)

```bash
pip install isort
isort .                # Sort imports
isort . --check-only   # CI mode
```

Always set `profile = "black"` in `[tool.isort]` — otherwise black and isort conflict.

### mypy (static type checking)

```bash
pip install mypy
mypy your_package/   # Type-check your package source only
```

Common fixes:

- `ignore_missing_imports = true` — ignore untyped third-party deps
- `from __future__ import annotations` — enables PEP 563 deferred evaluation (Python 3.9 compat)
- `pip install types-redis` — type stubs for the redis library

### Run all at once

```bash
ruff check . && black . --check && isort . --check-only && mypy your_package/
```

---

## 6. Pre-commit Hooks

Pre-commit runs all quality tools automatically before each commit, so issues never reach CI.
Install once per clone with `pre-commit install`.

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.4.4
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/psf/black
    rev: 24.4.2
    hooks:
      - id: black

  - repo: https://github.com/pycqa/isort
    rev: 5.13.2
    hooks:
      - id: isort

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.10.0
    hooks:
      - id: mypy
        additional_dependencies: [types-redis]  # Add stubs for typed dependencies

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.6.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-toml
      - id: check-merge-conflict
      - id: debug-statements
      - id: no-commit-to-branch
        args: [--branch, master, --branch, main]
```

```bash
pip install pre-commit
pre-commit install           # Install once per clone
pre-commit run --all-files   # Run all hooks manually (useful before the first install)
```

The `no-commit-to-branch` hook prevents accidentally committing directly to `main`/`master`,
which would bypass CI checks. Always work on a feature branch.
