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
- If no newer major exists, pin to the latest supported release/tag in the current major and document why.
- Upgrade one action at a time per commit (or one tightly related group) so failures are easy to isolate.
- Keep existing workflow behavior unchanged while upgrading runtime/dependency actions.

## Actions We Track in This Repo

Prioritize runtime review for these actions when warnings appear:

- `actions/checkout`
- `actions/setup-dotnet`
- `actions/upload-artifact`
- `azure/login`
- `softprops/action-gh-release`

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
