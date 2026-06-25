---
name: github-actions-runtime-upgrade-conventions
description: 'Upgrade GitHub Actions to supported runtimes by selecting safe action versions, preserving workflow behavior, and validating post-upgrade execution.'
---

# GitHub Actions Runtime Upgrade Conventions

Use this skill when editing GitHub Actions workflows to address deprecation warnings about action runtimes (for example Node.js runtime migrations).

## Use This Skill When

- Workflow logs report an action is running on a deprecated runtime.
- You are upgrading action versions in `.github/workflows/*.yml` or `.github/workflows/*.yaml`.
- You need to keep existing workflow behavior while modernizing action dependencies.

## Upgrade Rules

- Prefer upgrading to the latest stable **major** version of each action that is compatible with the workflow.
- Prefer immutable pins: resolve the target release to a full commit SHA and use that SHA in `uses:`.
- Do not pin to mutable tags or branches (for example `@v4` or `@main`) in final recommendations.
- Upgrade one action at a time per commit (or one tightly related group) so failures are easy to isolate.
- Keep existing workflow behavior unchanged while upgrading runtime/dependency actions.

## Actions We Track in This Repo

Prioritize runtime review for these groups when warnings appear:

- Any first-party action under `actions/*`
- Especially setup actions under `actions/setup-*` (for example `setup-node`, `setup-python`, `setup-dotnet`)
- Any other action explicitly named by the runtime deprecation warning in workflow logs

## Pinning Pattern

```yaml
steps:
  - uses: actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608 # v4.3.1
  - uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8 # v4.0.4
```

When recommending upgrades, identify the latest compatible release first, then use the corresponding commit SHA with an optional version comment.

## Verification Checklist

After changing action versions:

1. Ensure all edited workflows still parse and keep the same triggers/permissions unless intentionally changed.
2. Run the affected workflows (or equivalent local build/test commands) and confirm the upgraded steps complete successfully.
3. Confirm release/signing/artifact steps still produce expected outputs where applicable.
4. Check workflow run logs for any new deprecation warnings or runtime migration notes.

## PR Notes

Include in the PR summary:

- Which actions were upgraded (from -> to).
- Whether any action could not move to a new major and why.
- Which workflows were re-run to validate the change.

## How This Complements Dependabot

Dependabot can automate many updates, but this skill still helps when:

- Dependabot is not enabled for workflows in a repository.
- Runtime warnings appear before an automated update is available.
- A workflow needs behavior-preserving validation after the action bump.
