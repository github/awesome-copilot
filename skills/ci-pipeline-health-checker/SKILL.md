---
name: ci-pipeline-health-checker
description: "Analyzes GitHub Actions and GitLab CI files for jobs without timeouts, missing cache, excessive permissions, and pipeline anti-patterns."
---

# CI Pipeline Health Checker

This skill provides comprehensive static analysis for CI/CD configuration files, specifically targeting performance bottlenecks, security risks, and reliability issues in GitHub Actions and GitLab CI/CD workflows.

## When to Use This Skill

Use this skill when you need to:
- Audit existing CI/CD pipelines for infrastructure and security anti-patterns.
- Optimize build execution times by identifying missing or misconfigured caching layers.
- Prevent infinite execution loops or hung runners by enforcing proper timeout limits.
- Enforce the principle of least privilege across pipeline tokens and permissions.

## Prerequisites

- Access to repository configuration files (e.g., `.github/workflows/*.yml` or `.gitlab-ci.yml`).
- A YAML parser tool or the `read` and `edit` capabilities enabled for the agent.

## Core Capabilities

### 1. Timeout Enforcement Analysis
Scans workflows to ensure every job or step has an explicit timeout defined, preventing runner hang-ups and billing spikes.

### 2. Cache Optimization Auditing
Identifies steps that download dependencies (e.g., `npm install`, `pip install`) without utilizing native runner caching strategies.

### 3. Permissions Hardening
Evaluates `permissions` blocks to flag broad or write-access tokens that could lead to repository compromises.

## Usage Examples

### Example 1: Auditing a GitHub Actions Workflow
```yaml
# Input: A workflow missing key safety attributes
name: Build and Test
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install && npm test # Flagged: Missing timeout and cache!
```

### Example 2: Remedated Secure Workflow
```yaml
# Output: The optimized and hardened version
name: Build and Test
on: [push]
permissions:
  contents: read # Enforced: Least privilege
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10 # Enforced: Timeout limit
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm' # Enforced: Dependency cache
      - run: npm ci && npm test
```

## Guidelines

1. **Prioritize Fail-Safe Defaults** - Always append a `timeout-minutes` to jobs if not globally defined.
2. **Minimize Token Scopes** - Default top-level repository permissions to `contents: read` unless explicit write access is required.
3. **Use Deterministic Commands** - Prefer `npm ci` over `npm install` in automated runners to ensure reproducible builds.

## Common Patterns

### Pattern: Missing Timeouts
```yaml
# Anti-pattern
job_name:
  runs-on: ubuntu-latest
  steps:
    - run: ./long-running-script.sh

# Best Practice
job_name:
  runs-on: ubuntu-latest
  timeout-minutes: 15
  steps:
    - run: ./long-running-script.sh
```

### Pattern: Uncached Package Managers
```yaml
# Anti-pattern
- run: pip install -r requirements.txt

# Best Practice
- uses: actions/setup-python@v5
  with:
    python-version: '3.10'
    cache: 'pip'
- run: pip install -r requirements.txt
```

## Limitations

- **Static Analysis Only** - Cannot detect dynamic pipeline errors that happen exclusively during runtime or environment provisioning.
- **Syntax Variations** - Highly customized or dynamic matrix pipelines might require manual context verification.
- **Third-Party Actions** - Cannot audit the internal code of third-party actions, only their input parameters and configuration blocks.
