---
name: dependabot
description: >-
  Comprehensive guide for configuring and managing GitHub Dependabot. Use this skill when
  users ask about creating or optimizing dependabot.yml files, managing Dependabot pull requests,
  configuring dependency update strategies, setting up grouped updates, monorepo patterns,
  multi-ecosystem groups, security update configuration, auto-triage rules, or any GitHub
  Advanced Security (GHAS) supply chain security topic related to Dependabot.
---

# Dependabot Configuration & Management

## Overview

Dependabot is GitHub's built-in dependency management tool with three core capabilities:

1. **Dependabot Alerts** — Notify when dependencies have known vulnerabilities (CVEs)
2. **Dependabot Security Updates** — Auto-create PRs to fix vulnerable dependencies
3. **Dependabot Version Updates** — Auto-create PRs to keep dependencies current

All configuration lives in a **single file**: `.github/dependabot.yml` on the default branch. GitHub does **not** support multiple `dependabot.yml` files per repository.

## Configuration Workflow

Follow this process when creating or optimizing a `dependabot.yml`:

### Step 1: Detect All Ecosystems

Scan the repository for dependency manifests. Look for:

| Ecosystem | YAML Value | Manifest Files |
|---|---|---|
| npm/pnpm/yarn | `npm` | `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock` |
| pip/pipenv/poetry/uv | `pip` | `requirements.txt`, `Pipfile`, `pyproject.toml`, `setup.py` |
| Docker | `docker` | `Dockerfile` |
| Docker Compose | `docker-compose` | `docker-compose.yml` |
| GitHub Actions | `github-actions` | `.github/workflows/*.yml` |
| Go modules | `gomod` | `go.mod` |
| Bundler (Ruby) | `bundler` | `Gemfile` |
| Cargo (Rust) | `cargo` | `Cargo.toml` |
| Composer (PHP) | `composer` | `composer.json` |
| NuGet (.NET) | `nuget` | `*.csproj`, `packages.config` |
| .NET SDK | `dotnet-sdk` | `global.json` |
| Maven (Java) | `maven` | `pom.xml` |
| Gradle (Java) | `gradle` | `build.gradle` |
| Terraform | `terraform` | `*.tf` |
| OpenTofu | `opentofu` | `*.tf` |
| Helm | `helm` | `Chart.yaml` |
| Hex (Elixir) | `mix` | `mix.exs` |
| Swift | `swift` | `Package.swift` |
| Pub (Dart) | `pub` | `pubspec.yaml` |
| Bun | `bun` | `bun.lockb` |
| Dev Containers | `devcontainers` | `devcontainer.json` |
| Git Submodules | `gitsubmodule` | `.gitmodules` |
| Pre-commit | `pre-commit` | `.pre-commit-config.yaml` |

Note: pnpm and yarn both use the `npm` ecosystem value.

### Step 2: Map Directory Locations

For each ecosystem, identify where manifests live. Use `directories` (plural) with glob patterns for monorepos:

```yaml
directories:
  - "/"           # root
  - "/apps/*"     # all app subdirs
  - "/packages/*" # all package subdirs
  - "/lib-*"      # dirs starting with lib-
  - "**/*"        # recursive (all subdirs)
```

Important: `directory` (singular) does NOT support globs. Use `directories` (plural) for wildcards.

### Step 3: Configure Each Ecosystem Entry

Every entry needs at minimum:

```yaml
- package-ecosystem: "npm"
  directory: "/"
  schedule:
    interval: "weekly"
```

### Step 4: Optimize with Grouping, Labels, and Scheduling

See sections below for each optimization technique.

## Monorepo Strategies

### Glob Patterns for Workspace Coverage

For monorepos with many packages, use glob patterns to avoid listing each directory:

```yaml
- package-ecosystem: "npm"
  directories:
    - "/"
    - "/apps/*"
    - "/packages/*"
    - "/services/*"
  schedule:
    interval: "weekly"
```

### Cross-Directory Grouping

Use `group-by: dependency-name` to create a single PR when the same dependency updates across multiple directories:

```yaml
groups:
  monorepo-deps:
    group-by: dependency-name
```

This creates one PR per dependency across all specified directories, reducing CI costs and review burden.

Limitations:
- All directories must use the same package ecosystem
- Applies to version updates only
- Incompatible version constraints create separate PRs

### Standalone Packages Outside Workspaces

If a directory has its own lockfile and is NOT part of the workspace (e.g., scripts in `.github/`), create a separate ecosystem entry for it.

## Dependency Grouping

Reduce PR noise by grouping related dependencies into single PRs.

### By Dependency Type

```yaml
groups:
  dev-dependencies:
    dependency-type: "development"
    update-types: ["minor", "patch"]
  production-dependencies:
    dependency-type: "production"
    update-types: ["minor", "patch"]
```

### By Name Pattern

```yaml
groups:
  angular:
    patterns: ["@angular*"]
    update-types: ["minor", "patch"]
  testing:
    patterns: ["jest*", "@testing-library*", "ts-jest"]
```

### For Security Updates

```yaml
groups:
  security-patches:
    applies-to: security-updates
    patterns: ["*"]
    update-types: ["patch", "minor"]
```

Key behaviors:
- Dependencies matching multiple groups go to the **first** match
- `applies-to` defaults to `version-updates` when absent
- Ungrouped dependencies get individual PRs

## Multi-Ecosystem Groups

Combine updates across different package ecosystems into a single PR:

```yaml
version: 2

multi-ecosystem-groups:
  infrastructure:
    schedule:
      interval: "weekly"
    labels: ["infrastructure", "dependencies"]

updates:
  - package-ecosystem: "docker"
    directory: "/"
    patterns: ["nginx", "redis"]
    multi-ecosystem-group: "infrastructure"

  - package-ecosystem: "terraform"
    directory: "/"
    patterns: ["aws*"]
    multi-ecosystem-group: "infrastructure"
```

The `patterns` key is required when using `multi-ecosystem-group`.

## PR Customization

### Labels

```yaml
labels:
  - "dependencies"
  - "npm"
```

Set `labels: []` to disable all labels including defaults. SemVer labels (`major`, `minor`, `patch`) are always applied if present in the repo.

### Commit Messages

```yaml
commit-message:
  prefix: "deps"
  prefix-development: "deps-dev"
  include: "scope"  # adds deps/deps-dev scope after prefix
```

### Assignees and Milestones

```yaml
assignees: ["security-team-lead"]
milestone: 4  # numeric ID from milestone URL
```

### Branch Name Separator

```yaml
pull-request-branch-name:
  separator: "-"  # default is /
```

### Target Branch

```yaml
target-branch: "develop"  # PRs target this instead of default branch
```

Note: When `target-branch` is set, security updates still target the default branch; all ecosystem config only applies to version updates.

## Schedule Optimization

### Intervals

Supported: `daily`, `weekly`, `monthly`, `quarterly`, `semiannually`, `yearly`, `cron`

```yaml
schedule:
  interval: "weekly"
  day: "monday"         # for weekly only
  time: "09:00"         # HH:MM format
  timezone: "America/New_York"
```

### Cron Expressions

```yaml
schedule:
  interval: "cron"
  cronjob: "0 9 * * 1"  # Every Monday at 9 AM
```

### Cooldown Periods

Delay updates for newly released versions to avoid early-adopter issues:

```yaml
cooldown:
  default-days: 5
  semver-major-days: 30
  semver-minor-days: 7
  semver-patch-days: 3
  include: ["*"]
  exclude: ["critical-lib"]
```

Cooldown applies to version updates only, not security updates.

## Security Updates Configuration

### Enable via Repository Settings

Settings → Advanced Security → Enable Dependabot alerts, security updates, and grouped security updates.

### Group Security Updates in YAML

```yaml
groups:
  security-patches:
    applies-to: security-updates
    patterns: ["*"]
    update-types: ["patch", "minor"]
```

### Disable Version Updates (Security Only)

```yaml
open-pull-requests-limit: 0  # disables version update PRs
```

### Auto-Triage Rules

GitHub presets auto-dismiss low-impact alerts for development dependencies. Custom rules can filter by severity, package name, CWE, and more. Configure in repository Settings → Advanced Security.

## PR Comment Commands

Interact with Dependabot PRs using `@dependabot` comments.

> **Note:** As of January 2026, merge/close/reopen commands have been deprecated.
> Use GitHub's native UI, CLI (`gh pr merge`), or auto-merge instead.

| Command | Effect |
|---|---|
| `@dependabot rebase` | Rebase the PR |
| `@dependabot recreate` | Recreate the PR from scratch |
| `@dependabot ignore this dependency` | Close and never update this dependency |
| `@dependabot ignore this major version` | Ignore this major version |
| `@dependabot ignore this minor version` | Ignore this minor version |
| `@dependabot ignore this patch version` | Ignore this patch version |

For grouped PRs, additional commands:
- `@dependabot ignore DEPENDENCY_NAME` — ignore specific dependency in group
- `@dependabot unignore DEPENDENCY_NAME` — clear ignores, reopen with updates
- `@dependabot unignore *` — clear all ignores for all dependencies in group
- `@dependabot show DEPENDENCY_NAME ignore conditions` — display current ignores

For the complete command reference, see `references/pr-commands.md`.

## Ignore and Allow Rules

### Ignore Specific Dependencies

```yaml
ignore:
  - dependency-name: "lodash"
  - dependency-name: "@types/node"
    update-types: ["version-update:semver-patch"]
  - dependency-name: "express"
    versions: ["5.x"]
```

### Allow Only Specific Types

```yaml
allow:
  - dependency-type: "production"
  - dependency-name: "express"
```

Rule: If a dependency matches both `allow` and `ignore`, it is **ignored**.

### Exclude Paths

```yaml
exclude-paths:
  - "vendor/**"
  - "test/fixtures/**"
```

## Advanced Options

### Versioning Strategy

Controls how Dependabot edits version constraints:

| Value | Behavior |
|---|---|
| `auto` | Default — increase for apps, widen for libraries |
| `increase` | Always increase minimum version |
| `increase-if-necessary` | Only change if current range excludes new version |
| `lockfile-only` | Only update lockfiles, ignore manifests |
| `widen` | Widen range to include both old and new versions |

### Rebase Strategy

```yaml
rebase-strategy: "disabled"  # stop auto-rebasing
```

Allow rebase over extra commits by including `[dependabot skip]` in commit messages.

### Open PR Limit

```yaml
open-pull-requests-limit: 10  # default is 5 for version, 10 for security
```

Set to `0` to disable version updates entirely.

### Private Registries

```yaml
registries:
  npm-private:
    type: npm-registry
    url: https://npm.example.com
    token: ${{secrets.NPM_TOKEN}}

updates:
  - package-ecosystem: "npm"
    directory: "/"
    registries:
      - npm-private
```

## FAQ

**Can I have multiple `dependabot.yml` files?**
No. GitHub supports exactly one file at `.github/dependabot.yml`. Use multiple `updates` entries within that file for different ecosystems and directories.

**Does Dependabot support pnpm?**
Yes. Use `package-ecosystem: "npm"` — Dependabot detects `pnpm-lock.yaml` automatically.

**How do I reduce PR noise in a monorepo?**
Use `groups` to batch updates, `directories` with globs for coverage, and `group-by: dependency-name` for cross-directory grouping. Consider `monthly` or `quarterly` intervals for low-priority ecosystems.

**How do I handle dependencies outside the workspace?**
Create a separate ecosystem entry with its own `directory` pointing to that location.

## Resources

- `references/dependabot-yml-reference.md` — Complete YAML options reference
- `references/pr-commands.md` — Full PR comment commands reference
- `references/example-configs.md` — Real-world configuration examples
