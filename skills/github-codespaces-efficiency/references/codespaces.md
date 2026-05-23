# Codespaces and Devcontainer Efficiency

Load this reference only when the task involves `.devcontainer/`, Codespaces sizing, prebuilds, or workspace cost.

If the repo is onboarding Codespaces for the first time, define a minimal baseline first, then optimize.

## Audit Order

Inspect in this order:

1. Check whether `.devcontainer/` exists.
2. If it does not exist, gather baseline requirements first: language/toolchain, required CLIs, expected startup target, machine-size constraints, and whether prebuilds are needed.
3. Review `.devcontainer/devcontainer.json`.
4. Ensure `.devcontainer/devcontainer-lock.json` exists; if missing, recommend adding it because many repos predate lock-file support.
5. Review related Dockerfiles, features, and setup scripts.
6. Review docs that recommend machine sizes, prebuilds, or startup expectations.

For new setups (step 2), start minimal and avoid optional tools until usage data justifies them.

## Common Waste Sources

- Oversized base images
- Unnecessary packages or extensions
- Slow post-create bootstrap steps
- Prebuilds enabled for too many branches
- Missing guidance on machine sizing or idle timeout discipline

## Preferred Fix Order

1. Remove unnecessary packages, features, and extensions
2. Reduce startup commands and post-create installs
3. Recommend the smallest machine size that preserves throughput
4. Narrow prebuild scope to sustained-usage branches (default branch, active release branches, and any branch with more than five Codespaces per week)
5. Add or tighten idle-timeout and cleanup guidance

## Safe-Change Rules

- Do not optimize startup by removing tools the team actually needs every day.
- Distinguish repo changes from org or user settings.
- Prefer documentation when the effective control lives outside the repo.
- Avoid turning the devcontainer into a production-like image unless the team explicitly needs that.

## Reporting Focus

When reporting Codespaces improvements, separate:

- Faster startup
- Lower steady-state workspace cost
- Lower prebuild spend
- Guidance-only recommendations that still need org or user action
