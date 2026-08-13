# Repo Actions Hub

A GitHub Copilot canvas for browsing repository GitHub Actions workflows, reviewing recent runs, opening rich workflow/run details in a modal, and triggering manual `workflow_dispatch` runs.

## Files

- `extension.mjs` - canvas server, GitHub Actions data loading, modal details UI, and workflow run actions.
- `assets/preview.png` - gallery preview image for the extension catalog.
- `copilot-extension.json` - Copilot extension name/version metadata.
- `package.json` - extension metadata for cataloging and packaging.
- `.github/plugin/plugin.json` - plugin metadata used by the extension marketplace and website.

## Install

Ask Copilot to install the committed extension URL:

```text
Install this extension: https://github.com/github/awesome-copilot/tree/main/extensions/repo-actions-hub
```

You can also copy the folder into one of these locations:

- `~/.copilot/extensions/repo-actions-hub/` - user scope
- `.github/extensions/repo-actions-hub/` - project scope

Reload extensions in the app, then open the `repo-actions-hub` canvas.

## Agent actions

- `get_state` - return the current workflow and recent-run state for the active repository.
- `refresh` - reload workflows and recent runs from GitHub Actions.
- `get_workflow_details { workflowId }` - inspect a workflow, its dispatch support, inputs, YAML, and recent runs.
- `run_workflow { workflowId, ref?, inputs? }` - trigger a `workflow_dispatch` run for a workflow.
