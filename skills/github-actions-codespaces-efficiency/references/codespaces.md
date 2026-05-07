# Codespaces and Devcontainer Efficiency

Load this reference only when the task involves `.devcontainer/`, Codespaces sizing, prebuilds, or workspace cost.

## Audit Order

Inspect:

1. `.devcontainer/devcontainer.json`
2. Related Dockerfiles, features, and setup scripts
3. Any docs that recommend machine sizes, prebuilds, or startup expectations

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
4. Narrow prebuild scope to default and high-traffic branches
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
