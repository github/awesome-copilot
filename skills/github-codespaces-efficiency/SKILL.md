---
name: github-codespaces-efficiency
description: 'Audit and improve GitHub Codespaces efficiency. Use this skill when a user wants faster Codespaces startup, lower Codespaces spend, slim devcontainers, right-size machines, tune idle timeout, or scope prebuilds to high-value branches.'
---

# GitHub Codespaces Efficiency

Use this skill as a lean entrypoint for GitHub Codespaces efficiency work. Keep the hot path small: inspect the repo, identify the waste source, then load only the reference material needed for the current task.

## Use This Skill When

- The user wants faster Codespaces startup or lower Codespaces spend.
- The repo has a `.devcontainer/` or explicit Codespaces configuration questions.
- The user asks for devcontainer optimization, machine sizing, prebuild strategy, or idle-timeout guidance.

## Load Only What You Need

Start with the repo configuration, then load references selectively:

- Read [`references/codespaces.md`](./references/codespaces.md) for devcontainer, machine-sizing, prebuild, idle-timeout guidance, and reporting.

If the task is GitHub Actions-related, use the `github-actions-efficiency` skill instead.

## Core Workflow

### 1. Measure first

Inspect the current configuration before proposing changes:

- Whether devcontainers or Codespaces defaults are oversized
- Machine type selection and whether it matches actual development needs
- Prebuild configuration and which branches have prebuilds enabled
- Idle timeout settings and usage patterns
- Extension and port forwarding overhead

Start with a compact repo audit like this:

```bash
find .devcontainer -maxdepth 2 -type f
gh codespace list
gh api /repos/{owner}/{repo}/codespaces/new?machine=machine-name
```

### 2. Rank fixes by payoff

Prefer this order unless repo context says otherwise:

1. Trim oversized devcontainer or Codespaces defaults
2. Right-size machine types based on actual usage patterns
3. Configure prebuilds for high-value branches only
4. Tune idle timeout to match development habits
5. Remove unnecessary extensions or port forwards
6. Optimize devcontainer image size and layer caching

### 3. Keep changes conservative

- Do not remove required development tools or extensions that are essential for the workflow.
- Do not assume smaller machines always mean better productivity; balance cost with developer experience.
- Treat prebuild configuration as a trade-off between storage cost and startup time.
- Prefer incremental changes over complete devcontainer rewrites.
- Separate repo-editable changes from GitHub/org settings recommendations.

### 4. Verify in GitHub when possible

Configuration changes should be tested when possible.

- Validate machine sizing by monitoring actual resource usage.
- Use a test Codespace to verify devcontainer changes work as expected.
- Treat unexpected behavior as a real bug even when the configuration looks correct.

## Required Output Shape

When using this skill, keep the response compact and structured around these four sections:

1. `Waste sources`: the top cost or latency drivers you found
2. `Proposed fixes`: the small set of highest-confidence changes
3. `Validation`: what was proven live, what was only checked locally, and any remaining risk
4. `Impact`: expected savings separately from measured savings

For measured impact, separate:

- Codespace startup time
- Monthly spend reduction
- Resource utilization improvement

## References

- [`references/codespaces.md`](./references/codespaces.md)
- [`references/review-rubric.md`](./references/review-rubric.md) — load when reviewing completed efficiency work
