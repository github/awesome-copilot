# CodeQL Workflow Configuration Reference

Detailed reference for configuring CodeQL analysis via GitHub Actions workflows. This supplements the procedural guidance in SKILL.md.

## Trigger Configuration

### Push Trigger

Scan on every push to specified branches:

```yaml
on:
  push:
    branches: [main, protected]
```

- Code scanning is triggered on every push to the listed branches
- The workflow must exist on the target branch for scanning to activate
- Results appear in the repository Security tab
- When push results map to an open PR, alerts also appear as PR annotations

### Pull Request Trigger

Scan merge commits of pull requests:

```yaml
on:
  pull_request:
    branches: [main]
```

- Scans the PR's merge commit (not the head commit) for more accurate results
- For private fork PRs, enable "Run workflows from fork pull requests" in repository settings
- Results appear as PR check annotations

### Schedule Trigger

Periodic scans on the default branch:

```yaml
on:
  schedule:
    - cron: '20 14 * * 1'  # Monday 14:20 UTC
```

- Only triggers if the workflow file exists on the default branch
- Catches newly discovered vulnerabilities even without active development

### Merge Group Trigger

Required when using merge queues:

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  merge_group:
```

### Path Filtering

Control when the workflow runs based on changed files:

```yaml
on:
  pull_request:
    paths-ignore:
      - '**/*.md'
      - '**/*.txt'
      - 'docs/**'
```

Or use `paths` to only trigger on specific directories:

```yaml
on:
  pull_request:
    paths:
      - 'src/**'
      - 'apps/**'
```

> **Important:** `paths-ignore` and `paths` control whether the workflow runs. When the workflow does run, it analyzes ALL changed files in the PR (including those matched by `paths-ignore`), unless files are excluded via the CodeQL configuration file's `paths-ignore`.

### Workflow Dispatch (Manual Trigger)

```yaml
on:
  workflow_dispatch:
    inputs:
      language:
        description: 'Language to analyze'
        required: true
        default: 'javascript-typescript'
```

## Runner and OS Configuration

### GitHub-Hosted Runners

```yaml
jobs:
  analyze:
    runs-on: ubuntu-latest    # Also: windows-latest, macos-latest
```

- `ubuntu-latest` — most common, recommended for most languages
- `macos-latest` — required for Swift analysis
- `windows-latest` — required for some C/C++ and C# projects using MSBuild

### Self-Hosted Runners

```yaml
jobs:
  analyze:
    runs-on: [self-hosted, ubuntu-latest]
```

Requirements for self-hosted runners:
- Git must be in the PATH
- SSD with ≥14 GB disk space recommended
- See hardware requirements table in SKILL.md

### Timeout Configuration

Prevent hung workflows:

```yaml
jobs:
  analyze:
    timeout-minutes: 120
```

## Language and Build Mode Matrix

### Standard Matrix Pattern

```yaml
strategy:
  fail-fast: false
  matrix:
    include:
      - language: javascript-typescript
        build-mode: none
      - language: python
        build-mode: none
      - language: java-kotlin
        build-mode: none
      - language: c-cpp
        build-mode: autobuild
```

### Multi-Language Repository with Mixed Build Modes

```yaml
strategy:
  fail-fast: false
  matrix:
    include:
      - language: c-cpp
        build-mode: manual
      - language: csharp
        build-mode: autobuild
      - language: java-kotlin
        build-mode: none
```

### Build Mode Summary

| Language | `none` | `autobuild` | `manual` | Default Setup Mode |
|---|:---:|:---:|:---:|---|
| C/C++ | ✅ | ✅ | ✅ | `none` |
| C# | ✅ | ✅ | ✅ | `none` |
| Go | ❌ | ✅ | ✅ | `autobuild` |
| Java | ✅ | ✅ | ✅ | `none` |
| Kotlin | ❌ | ✅ | ✅ | `autobuild` |
| Python | ✅ | ❌ | ❌ | `none` |
| Ruby | ✅ | ❌ | ❌ | `none` |
| Rust | ✅ | ✅ | ✅ | `none` |
| Swift | ❌ | ✅ | ✅ | `autobuild` |
| JavaScript/TypeScript | ✅ | ❌ | ❌ | `none` |
| GitHub Actions | ✅ | ❌ | ❌ | `none` |

## CodeQL Database Location

Override the default database location:

```yaml
- uses: github/codeql-action/init@v4
  with:
    db-location: '${{ github.runner_temp }}/my_location'
```

- Default: `${{ github.runner_temp }}/codeql_databases`
- Path must be writable and either not exist or be an empty directory
- On self-hosted runners, ensure cleanup between runs

## Query Suites and Packs

### Built-In Query Suites

```yaml
- uses: github/codeql-action/init@v4
  with:
    queries: security-extended
```

Options:
- (default) — standard security queries
- `security-extended` — additional security queries with slightly higher false-positive rate
- `security-and-quality` — security plus code quality queries

### Custom Query Packs

```yaml
- uses: github/codeql-action/init@v4
  with:
    packs: |
      codeql/javascript-queries:AlertSuppression.ql
      codeql/javascript-queries:~1.0.0
      my-org/my-custom-pack@1.2.3
```

### Model Packs

Extend CodeQL coverage for custom libraries/frameworks:

```yaml
- uses: github/codeql-action/init@v4
  with:
    packs: my-org/my-model-pack
```

## Analysis Category

Distinguish between multiple analyses for the same commit:

```yaml
- uses: github/codeql-action/analyze@v4
  with:
    category: "/language:${{ matrix.language }}"
```

### Monorepo Category Patterns

```yaml
# Per language (default auto-generated pattern)
category: "/language:${{ matrix.language }}"

# Per component
category: "/language:${{ matrix.language }}/component:frontend"

# Per app in monorepo
category: "/language:javascript-typescript/app:blog"
```

The `category` value appears as `<run>.automationDetails.id` in the SARIF output.

## CodeQL Configuration File

Create `.github/codeql/codeql-config.yml` for advanced path and query configuration:

```yaml
name: "CodeQL Configuration"

# Directories to scan
paths:
  - apps/
  - services/
  - packages/

# Directories to exclude
paths-ignore:
  - node_modules/
  - '**/test/**'
  - '**/fixtures/**'
  - '**/*.test.ts'

# Additional queries
queries:
  - uses: security-extended
  - uses: security-and-quality

# Custom query packs
packs:
  javascript-typescript:
    - codeql/javascript-queries
  python:
    - codeql/python-queries
```

Reference in the workflow:

```yaml
- uses: github/codeql-action/init@v4
  with:
    config-file: .github/codeql/codeql-config.yml
```

## Dependency Caching

Enable caching to speed up dependency resolution:

```yaml
- uses: github/codeql-action/init@v4
  with:
    dependency-caching: true
```

Values:
- `false` / `none` / `off` — disabled (default for advanced setup)
- `restore` — only restore existing caches
- `store` — only store new caches
- `true` / `full` / `on` — restore and store caches

> Default setup on GitHub-hosted runners has caching enabled automatically.

## Alert Severity and Merge Protection

Use repository rulesets to block PRs based on code scanning alerts:

- A required tool finds an alert matching the defined severity threshold
- A required tool's analysis is still in progress
- A required tool is not configured for the repository

Configure via repository Settings → Rules → Rulesets → Code scanning.

## Concurrency Control

Prevent duplicate workflow runs:

```yaml
concurrency:
  group: codeql-${{ github.ref }}
  cancel-in-progress: true
```

## Complete Workflow Example

```yaml
name: "CodeQL Analysis"

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '30 6 * * 1'

permissions:
  security-events: write
  contents: read
  actions: read

concurrency:
  group: codeql-${{ github.ref }}
  cancel-in-progress: true

jobs:
  analyze:
    name: Analyze (${{ matrix.language }})
    runs-on: ${{ matrix.language == 'swift' && 'macos-latest' || 'ubuntu-latest' }}
    timeout-minutes: 120
    strategy:
      fail-fast: false
      matrix:
        include:
          - language: javascript-typescript
            build-mode: none
          - language: python
            build-mode: none

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v4
        with:
          languages: ${{ matrix.language }}
          build-mode: ${{ matrix.build-mode }}
          queries: security-extended
          dependency-caching: true

      - if: matrix.build-mode == 'manual'
        name: Manual Build
        run: |
          echo 'Replace with actual build commands'
          exit 1

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v4
        with:
          category: "/language:${{ matrix.language }}"
```
