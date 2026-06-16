---
description: 'Use when editing GitHub Actions workflow files to address action runtime deprecations and validate upgrades.'
applyTo: '.github/workflows/*.yml, .github/workflows/*.yaml'
---

# GitHub Actions Runtime Upgrade Conventions

When a workflow warning reports that an action is running on a deprecated Node.js runtime, treat it as a required maintenance update.

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
