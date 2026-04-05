# CI/CD, Publishing, and Changelog

## Table of Contents
1. [Changelog format](#1-changelog-format)
2. [ci.yml — lint, type-check, test matrix](#2-ciyml)
3. [publish.yml — triggered on version tags](#3-publishyml)
4. [PyPI Trusted Publishing (no API tokens)](#4-pypi-trusted-publishing)
5. [Manual publish fallback](#5-manual-publish-fallback)
6. [Release checklist](#6-release-checklist)
7. [Verify py.typed ships in the wheel](#7-verify-pytyped-ships-in-the-wheel)
8. [Semver change-type guide](#8-semver-change-type-guide)

---

## 1. Changelog Format

Keep a `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/) conventions.
Every PR should update the `[Unreleased]` section. Before releasing, move those entries to a
new version section with the date.

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- (in-progress features go here)

---

## [1.0.0] - 2026-04-02

### Added
- Initial stable release
- `YourMiddleware` with gradual, strict, and combined modes
- In-memory backend (no extra deps)
- Optional Redis backend (`pip install pkg[redis]`)
- Per-route override via `Depends(RouteThrottle(...))`
- `py.typed` marker — PEP 561 typed package
- GitHub Actions CI: lint, mypy, test matrix, Trusted Publishing

### Changed
### Fixed
### Removed

---

## [0.1.0] - 2026-03-01

### Added
- Initial project scaffold

[Unreleased]: https://github.com/you/your-package/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/you/your-package/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/you/your-package/releases/tag/v0.1.0
```

### Semver — what bumps what

| Change type | Bump | Example |
|---|---|---|
| Breaking API change | MAJOR | `1.0.0 → 2.0.0` |
| New feature, backward-compatible | MINOR | `1.0.0 → 1.1.0` |
| Bug fix | PATCH | `1.0.0 → 1.0.1` |

---

## 2. `ci.yml`

Runs on every push and pull request. Tests across all supported Python versions.

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  lint:
    name: Lint, Format & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - name: Install dev dependencies
        run: pip install -e ".[dev]"
      - name: ruff lint
        run: ruff check .
      - name: ruff format check
        run: ruff format --check .
      - name: mypy
        run: |
          if [ -d "src" ]; then
              mypy src/
          else
              mypy {mod}/
          fi

  test:
    name: Test (Python ${{ matrix.python-version }})
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.10", "3.11", "3.12", "3.13"]

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0    # REQUIRED for setuptools_scm to read git tags

      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}

      - name: Install dependencies
        run: pip install -e ".[dev]"

      - name: Run tests with coverage
        run: pytest --cov --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          fail_ci_if_error: false

  test-redis:
    name: Test Redis backend
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install with Redis extra
        run: pip install -e ".[dev,redis]"

      - name: Run Redis tests
        run: pytest tests/test_redis_backend.py -v
```

> **Always add `fetch-depth: 0`** to every checkout step when using `setuptools_scm`.
> Without full git history, `setuptools_scm` can't find tags and the build fails with a version
> detection error.

---

## 3. `publish.yml`

Triggered automatically when you push a tag matching `v*.*.*`. Uses Trusted Publishing (OIDC) —
no API tokens in repository secrets.

```yaml
# .github/workflows/publish.yml
name: Publish to PyPI

on:
  push:
    tags:
      - "v*.*.*"

jobs:
  build:
    name: Build distribution
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0      # Critical for setuptools_scm

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install build tools
        run: pip install build twine

      - name: Build package
        run: python -m build

      - name: Check distribution
        run: twine check dist/*

      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  publish:
    name: Publish to PyPI
    needs: build
    runs-on: ubuntu-latest
    environment: pypi
    permissions:
      id-token: write     # Required for Trusted Publishing (OIDC)

    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/

      - name: Publish to PyPI
        uses: pypa/gh-action-pypi-publish@release/v1
```

---

## 4. PyPI Trusted Publishing

Trusted Publishing uses OpenID Connect (OIDC) so PyPI can verify that a publish came from your
specific GitHub Actions workflow — no long-lived API tokens required, no rotation burden.

### One-time setup

1. Create an account at https://pypi.org
2. Go to **Account → Publishing → Add a new pending publisher**
3. Fill in:
   - GitHub owner (your username or org)
   - Repository name
   - Workflow filename: `publish.yml`
   - Environment name: `pypi`
4. Create the `pypi` environment in GitHub:
   **repo → Settings → Environments → New environment → name it `pypi`**

That's it. The next time you push a `v*.*.*` tag, the workflow authenticates automatically.

---

## 5. Manual Publish Fallback

If CI isn't set up yet or you need to publish from your machine:

```bash
pip install build twine

# Build wheel + sdist
python -m build

# Validate before uploading
twine check dist/*

# Upload to PyPI
twine upload dist/*

# OR test on TestPyPI first (recommended for first release)
twine upload --repository testpypi dist/*
pip install --index-url https://test.pypi.org/simple/ your-package
python -c "import your_package; print(your_package.__version__)"
```

---

## 6. Release Checklist

```
[ ] All tests pass on main/master
[ ] CHANGELOG.md updated — move [Unreleased] items to new version section with date
[ ] Update diff comparison links at bottom of CHANGELOG
[ ] git tag vX.Y.Z
[ ] git push origin master --tags
[ ] Monitor GitHub Actions publish.yml run
[ ] Verify on PyPI: pip install your-package==X.Y.Z
[ ] Test the installed version:
    python -c "import your_package; print(your_package.__version__)"
```

---

## 7. Verify py.typed Ships in the Wheel

After every build, confirm the typed marker is included:

```bash
python -m build
unzip -l dist/your_package-*.whl | grep py.typed
# Must print: your_package/py.typed
# If missing, check [tool.setuptools.package-data] in pyproject.toml
```

If it's missing from the wheel, users won't get type information even though your code is
fully typed. This is a silent failure — always verify before releasing.

---

## 8. Semver Change-Type Guide

| Change | Version bump | Example |
|---|---|---|
| Breaking API change (remove/rename public symbol) | MAJOR | `1.2.3 → 2.0.0` |
| New feature, fully backward-compatible | MINOR | `1.2.3 → 1.3.0` |
| Bug fix, no API change | PATCH | `1.2.3 → 1.2.4` |
| Pre-release | suffix | `2.0.0a1 → 2.0.0rc1 → 2.0.0` |
| Packaging-only fix (no code change) | post-release | `1.2.3 → 1.2.3.post1` |
