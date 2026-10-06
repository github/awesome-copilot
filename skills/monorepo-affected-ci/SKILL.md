---
name: monorepo-affected-ci
description: Build, test and deploy only the monorepo projects a change affects in GitHub Actions, including dependents of shared libraries. Use for selective CI, dynamic matrices, fixing on.paths filters, or required checks stuck on skipped workflows.
---

# Monorepo Affected CI

Makes a GitHub Actions setup for a monorepo (services, apps, libraries and Docker images in one repo) run only what a change affects, without the silent gaps that hand-written path filters create.

## When to Use This Skill

- The user wants CI or CD to run only for changed projects, or a dynamic `strategy.matrix`.
- The repo has one workflow per service with `on.<event>.paths` filters, and changes to shared code don't trigger the right workflows.
- A required status check stays "Expected — waiting for status" because its workflow was skipped by a path filter.

## Pitfalls to Check First

1. **Shared dependencies are missing from `paths`.** A workflow that watches `services/api/**` doesn't run when `libs/shared/**` changes, even though `api` imports it. Path filters must include the whole dependency closure from the manifests (workspace `dependencies`, `go.mod` `replace`, Cargo path deps, Maven or Gradle project deps, .NET `ProjectReference`), and they drift as dependencies change.
2. **A bare directory matches nothing.** `paths: [packages/core]` doesn't match files inside it; use `packages/core/**`.
3. **Workflow self-references go stale.** A workflow should list its own file, and copied workflows often point at the wrong file name.
4. **Skipped workflows block merging.** A workflow skipped by `paths` never reports its check, so a required check on it blocks the PR forever. Fix: drop `paths` from that workflow and add one always-running **gate job** that `needs:` the selective jobs, with `if: always()`. It succeeds when they succeeded or were skipped. Require only the gate.
5. **An empty matrix fails.** Guard a `fromJSON(...)` matrix job with `if: needs.plan.outputs.<list> != '[]'`.
6. **The diff base depends on the event.**
   - `pull_request`: `base.sha...head.sha`
   - `push`: `github.event.before`, which is all zeros for a new branch, so build everything then
   - `merge_group`: the queue's base
   - Shallow clones need enough history to fetch the base.

## Pattern: Plan Job + Matrix + Gate

```yaml
jobs:
  plan:
    runs-on: ubuntu-latest
    outputs:
      build: ${{ steps.affected.outputs.build }}   # e.g. ["api","web"]
    steps:
      - uses: actions/checkout@v5
      - id: affected
        run: echo "build=$(./scripts/affected.sh)" >> "$GITHUB_OUTPUT"  # changed projects + their dependents, as JSON

  build:
    needs: plan
    if: needs.plan.outputs.build != '[]'
    strategy:
      fail-fast: false
      matrix:
        project: ${{ fromJSON(needs.plan.outputs.build) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - run: make -C ${{ matrix.project }} test

  ci-ok:          # the only required check
    needs: [plan, build]
    if: always()
    runs-on: ubuntu-latest
    steps:
      - run: '[[ "${{ needs.build.result }}" =~ ^(success|skipped)$ ]]'
```

## How to Compute "Affected"

1. List projects from their manifests (`package.json` workspaces, `go.mod`, `Cargo.toml`, `pyproject.toml`, `pom.xml`, `build.gradle(.kts)`, `*.csproj`, `Dockerfile`, Helm `Chart.yaml`).
2. Build the dependency graph from the manifests' local references.
3. Map each changed file to its innermost project.
4. Add every project that depends on a changed one, transitively.
5. Changes to root files (lockfiles, CI config) usually mean everything.

## Automating It

[dynamic-monorepo](https://github.com/Continuous-Actions/dynamic-monorepo) (MIT) implements steps 1–5 with zero config and outputs JSON lists for `strategy.matrix` (`uses: Continuous-Actions/dynamic-monorepo@v1`). To check existing `paths` filters for pitfalls 1–3 without changing CI, run:

```
npx github:Continuous-Actions/dynamic-monorepo audit
```

Nx and Turborepo users can use their tools' own affected commands instead.

## Limitations

- **Hidden dependencies:** dependencies that aren't declared in manifests (code generation, runtime service calls) aren't detected; add them as explicit edges.
- **Root changes:** a change to a root file usually has to rebuild everything.
