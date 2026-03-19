# Dependabot YAML Options Reference

Complete reference for all configuration options in `.github/dependabot.yml`.

## File Structure

```yaml
version: 2                    # Required, always 2

registries:                   # Optional: private registry access
  REGISTRY_NAME:
    type: "..."
    url: "..."

multi-ecosystem-groups:       # Optional: cross-ecosystem grouping
  GROUP_NAME:
    schedule:
      interval: "..."

updates:                      # Required: list of ecosystem configurations
  - package-ecosystem: "..."  # Required
    directory: "/"            # Required (or directories)
    schedule:                 # Required
      interval: "..."
```

## Required Keys

### `version`

Always `2`. Must be at the top level.

### `package-ecosystem`

Defines which package manager to monitor. One entry per ecosystem (can have multiple entries for the same ecosystem with different directories).

| Package Manager | YAML Value | Manifest Files |
|---|---|---|
| Bazel | `bazel` | `MODULE.bazel`, `WORKSPACE` |
| Bun | `bun` | `bun.lockb` |
| Bundler (Ruby) | `bundler` | `Gemfile`, `Gemfile.lock` |
| Cargo (Rust) | `cargo` | `Cargo.toml`, `Cargo.lock` |
| Composer (PHP) | `composer` | `composer.json`, `composer.lock` |
| Conda | `conda` | `environment.yml` |
| Dev Containers | `devcontainers` | `devcontainer.json` |
| Docker | `docker` | `Dockerfile` |
| Docker Compose | `docker-compose` | `docker-compose.yml` |
| .NET SDK | `dotnet-sdk` | `global.json` |
| Elm | `elm` | `elm.json` |
| Git Submodules | `gitsubmodule` | `.gitmodules` |
| GitHub Actions | `github-actions` | `.github/workflows/*.yml` |
| Go Modules | `gomod` | `go.mod`, `go.sum` |
| Gradle | `gradle` | `build.gradle`, `build.gradle.kts` |
| Helm | `helm` | `Chart.yaml` |
| Hex (Elixir) | `mix` | `mix.exs`, `mix.lock` |
| Julia | `julia` | `Project.toml`, `Manifest.toml` |
| Maven | `maven` | `pom.xml` |
| npm/pnpm/yarn | `npm` | `package.json`, lockfiles |
| NuGet | `nuget` | `*.csproj`, `packages.config` |
| OpenTofu | `opentofu` | `*.tf` |
| pip/pipenv/poetry/uv | `pip` | `requirements.txt`, `Pipfile`, `pyproject.toml` |
| Pre-commit | `pre-commit` | `.pre-commit-config.yaml` |
| Pub (Dart/Flutter) | `pub` | `pubspec.yaml` |
| Rust Toolchain | `rust-toolchain` | `rust-toolchain.toml` |
| Swift | `swift` | `Package.swift` |
| Terraform | `terraform` | `*.tf` |
| uv | `uv` | `uv.lock`, `pyproject.toml` |
| vcpkg | `vcpkg` | `vcpkg.json` |

### `directory` / `directories`

Location of package manifests relative to repo root.

- `directory` — single path (no glob support)
- `directories` — list of paths (supports `*` and `**` globs)

```yaml
# Single directory
directory: "/"

# Multiple directories with globs
directories:
  - "/"
  - "/apps/*"
  - "/packages/*"
```

For GitHub Actions, use `/` — Dependabot automatically searches `.github/workflows/`.

### `schedule`

How often to check for updates.

| Parameter | Values | Notes |
|---|---|---|
| `interval` | `daily`, `weekly`, `monthly`, `quarterly`, `semiannually`, `yearly`, `cron` | Required |
| `day` | `monday`–`sunday` | Weekly only |
| `time` | `HH:MM` | UTC by default |
| `timezone` | IANA timezone string | e.g., `America/New_York` |
| `cronjob` | Cron expression | Required when interval is `cron` |

```yaml
schedule:
  interval: "weekly"
  day: "tuesday"
  time: "09:00"
  timezone: "Europe/London"
```

## Grouping Options

### `groups`

Group dependencies into fewer PRs.

| Parameter | Purpose | Values |
|---|---|---|
| `IDENTIFIER` | Group name (used in branch/PR title) | Letters, pipes, underscores, hyphens |
| `applies-to` | Update type | `version-updates` (default), `security-updates` |
| `dependency-type` | Filter by type | `development`, `production` |
| `patterns` | Include matching names | List of strings with `*` wildcard |
| `exclude-patterns` | Exclude matching names | List of strings with `*` wildcard |
| `update-types` | SemVer filter | `major`, `minor`, `patch` |
| `group-by` | Cross-directory grouping | `dependency-name` |

```yaml
groups:
  dev-deps:
    dependency-type: "development"
    update-types: ["minor", "patch"]
  angular:
    patterns: ["@angular*"]
    exclude-patterns: ["@angular/cdk"]
  monorepo:
    group-by: dependency-name
```

### `multi-ecosystem-groups` (top-level)

Group updates across different ecosystems into one PR.

```yaml
multi-ecosystem-groups:
  GROUP_NAME:
    schedule:
      interval: "weekly"
    labels: ["infrastructure"]
    assignees: ["@platform-team"]
```

Assign ecosystems with `multi-ecosystem-group: "GROUP_NAME"` in each `updates` entry. The `patterns` key is required in each ecosystem entry when using this feature.

## Filtering Options

### `allow`

Explicitly define which dependencies to maintain.

| Parameter | Purpose |
|---|---|
| `dependency-name` | Match by name (supports `*` wildcard) |
| `dependency-type` | `direct`, `indirect`, `all`, `production`, `development` |

```yaml
allow:
  - dependency-type: "production"
  - dependency-name: "express"
```

### `ignore`

Exclude dependencies or versions from updates.

| Parameter | Purpose |
|---|---|
| `dependency-name` | Match by name (supports `*` wildcard) |
| `versions` | Specific versions or ranges (e.g., `["5.x"]`, `[">=2.0.0"]`) |
| `update-types` | SemVer levels: `version-update:semver-major`, `version-update:semver-minor`, `version-update:semver-patch` |

```yaml
ignore:
  - dependency-name: "lodash"
  - dependency-name: "@types/node"
    update-types: ["version-update:semver-patch"]
  - dependency-name: "express"
    versions: ["5.x"]
```

Rule: if a dependency matches both `allow` and `ignore`, it is **ignored**.

### `exclude-paths`

Ignore specific directories or files during manifest scanning.

```yaml
exclude-paths:
  - "vendor/**"
  - "test/fixtures/**"
  - "*.lock"
```

Supports glob patterns: `*` (single segment), `**` (recursive), specific file paths.

## PR Customization Options

### `labels`

```yaml
labels:
  - "dependencies"
  - "npm"
```

Set `labels: []` to disable all labels. SemVer labels are always applied if they exist in the repo.

### `assignees`

```yaml
assignees:
  - "user1"
  - "user2"
```

Assignees must have write access (or read access for org repos).

### `milestone`

```yaml
milestone: 4  # numeric ID from milestone URL
```

### `commit-message`

```yaml
commit-message:
  prefix: "deps"              # up to 50 chars; colon auto-added if ends with letter/number
  prefix-development: "deps-dev"  # separate prefix for dev dependencies
  include: "scope"            # adds deps/deps-dev after prefix
```

### `pull-request-branch-name`

```yaml
pull-request-branch-name:
  separator: "-"  # options: "-", "_", "/"
```

### `target-branch`

```yaml
target-branch: "develop"
```

When set, version update config only applies to version updates. Security updates always target the default branch.

## Scheduling & Rate Limiting

### `cooldown`

Delay version updates for newly released versions:

| Parameter | Purpose |
|---|---|
| `default-days` | Default cooldown (1–90 days) |
| `semver-major-days` | Cooldown for major updates |
| `semver-minor-days` | Cooldown for minor updates |
| `semver-patch-days` | Cooldown for patch updates |
| `include` | Dependencies to apply cooldown (up to 150, supports `*`) |
| `exclude` | Dependencies exempt from cooldown (up to 150, takes precedence) |

```yaml
cooldown:
  default-days: 5
  semver-major-days: 30
  semver-minor-days: 7
  semver-patch-days: 3
  include: ["*"]
  exclude: ["critical-security-lib"]
```

### `open-pull-requests-limit`

```yaml
open-pull-requests-limit: 10  # default: 5 for version updates
```

Set to `0` to disable version updates entirely. Security updates have a separate internal limit of 10.

## Advanced Options

### `versioning-strategy`

Supported by: `bundler`, `cargo`, `composer`, `mix`, `npm`, `pip`, `pub`, `uv`.

| Value | Behavior |
|---|---|
| `auto` | Default: increase for apps, widen for libraries |
| `increase` | Always increase minimum version |
| `increase-if-necessary` | Only change if current range excludes new version |
| `lockfile-only` | Only update lockfiles |
| `widen` | Widen range to include old and new versions |

### `rebase-strategy`

```yaml
rebase-strategy: "disabled"
```

Default behavior: Dependabot auto-rebases PRs on conflicts. Rebasing stops 30 days after PR opens.

Allow Dependabot to force push over extra commits by including `[dependabot skip]` in commit messages.

### `vendor`

Supported by: `bundler`, `gomod`.

```yaml
vendor: true  # maintain vendored dependencies
```

Go modules auto-detect vendored dependencies.

### `insecure-external-code-execution`

Supported by: `bundler`, `mix`, `pip`.

```yaml
insecure-external-code-execution: "allow"
```

Allows Dependabot to execute code in manifests during updates. Required for some ecosystems that run code during resolution.

## Private Registries

### Top-Level Registry Definition

```yaml
registries:
  npm-private:
    type: npm-registry
    url: https://npm.example.com
    token: ${{secrets.NPM_TOKEN}}

  maven-central:
    type: maven-repository
    url: https://repo.maven.apache.org/maven2
    username: ""
    password: ""

  docker-ghcr:
    type: docker-registry
    url: https://ghcr.io
    username: ${{secrets.GHCR_USER}}
    password: ${{secrets.GHCR_TOKEN}}

  python-private:
    type: python-index
    url: https://pypi.example.com/simple
    token: ${{secrets.PYPI_TOKEN}}
```

### Associating Registries with Ecosystems

```yaml
updates:
  - package-ecosystem: "npm"
    directory: "/"
    registries:
      - npm-private
    schedule:
      interval: "weekly"
```

Use `registries: "*"` to allow access to all defined registries.
