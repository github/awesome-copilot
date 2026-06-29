---
title: 'Working with Canvas Extensions'
description: 'Create and iterate on GitHub Copilot app canvases using /create-canvas, then shape them into reusable project or personal extensions.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-06-17
estimatedReadingTime: '8 minutes'
tags:
  - copilot-app
  - canvases
  - canvas-extensions
relatedArticles:
  - ./github-copilot-app.md
  - ./agents-and-subagents.md
  - ./using-copilot-coding-agent.md
prerequisites:
  - Access to the GitHub Copilot app
  - Basic familiarity with GitHub Copilot agent sessions
---

Canvas extensions give you shared, interactive work surfaces inside the GitHub Copilot app. Instead of keeping all progress in chat, you can move work into a visible artifact (such as a board, document, checklist, or browser-oriented surface) that both people and agents can update.

This guide explains what canvases can do, how to create one with `/create-canvas`, and how to use patterns from this repository as reference implementations.

## What canvases can do

A canvas is a bidirectional surface:

- You can interact through UI controls (buttons, forms, filters, cards, etc.)
- The agent can call canvas capabilities to update that same state
- You can iterate quickly by asking the agent to add or revise capabilities

This makes canvases especially useful for workflows where visibility and steering matter, for example:

- Triage boards
- Planning documents
- Live browser-assisted workflows
- Release coordination surfaces

## Create a canvas with `/create-canvas`

In the GitHub Copilot app, create canvases from an active session using the `/create-canvas` skill.

1. Open or start an agent session.
2. In the prompt box, run `/create-canvas` and describe:
   - the workflow you want
   - what people should do in the UI
   - what the agent should do via callable capabilities
3. Let the agent generate the extension and open it in the right panel.
4. Continue iterating by asking for capability or UI changes.

### Prompt patterns that work well

Use explicit capability language in your prompt:

```text
/create-canvas Create an issue triage canvas with list filtering, label editing, and quick-priority actions. Add capabilities for get_issues, update_priority, and apply_label.
```

```text
/create-canvas Create a release checklist canvas that tracks milestones and owners. Add capabilities for add_item, assign_owner, mark_done, and export_summary.
```

```text
/create-canvas Create a markdown planning canvas that combines my open PRs and issues, and lets me launch and track agent sessions from the canvas.
```

## Choose scope: project or personal

When creating a canvas extension, choose where it should live:

- **Project scope**: `.github/extensions` (shared with the repository team)
- **User scope**: `~/.copilot/extensions` (personal to your machine)

Use project scope when the workflow is team-relevant, and user scope for personal experiments or private workflows.

## Typical extension structure

Canvas extensions can vary, but most include:

- `package.json` for metadata and dependencies
- `extension.mjs` (or another entry module) for canvas behavior and capabilities
- Optional UI files (`index.html`, assets) for richer panel controls
- Optional persisted artifacts/state files

## Best practices

### 1. Choose storage scope intentionally

Default canvas state is often session-scoped. If you only need state for the current session, keep it in session storage paths such as:

- `<copilot_home>/session-state/<sessionId>/files/<whatever>`

If you want data to persist across multiple sessions for the same extension, use extension-scoped storage such as:

- `<copilot_home>/extensions/<extensionId>/<whatever>`

This split keeps ephemeral workflow data separate from longer-lived user data.

### 2. Use `joinSession` handlers as your canvas-agent contract

Treat `joinSession` + `createCanvas` as the contract between UI interactions and agent-callable actions:

- Define clear canvas actions and schemas in `createCanvas(...)`
- Keep action names verb-oriented and predictable (`get_*`, `apply_*`, `sync_*`)
- Return structured state from handlers so both the UI and agent remain in sync

Reference implementations:

- SDK docs/source: [`joinSession`](https://github.com/github/copilot-sdk/blob/main/nodejs/docs/extensions.md), [`createCanvas`](https://github.com/github/copilot-sdk/blob/main/nodejs/src/canvas.ts)
- Repo example: [`extensions/backlog-swipe-triage/extension.mjs`](https://github.com/github/awesome-copilot/blob/main/extensions/backlog-swipe-triage/extension.mjs)
- Persistent user-scoped path example: [`extensions/chromium-control-canvas/extension.mjs`](https://github.com/github/awesome-copilot/blob/main/extensions/chromium-control-canvas/extension.mjs)

## Examples from this repository

Use these extension folders as concrete references:

- [`Backlog Swipe Triage`](../../extensions/#backlog-swipe-triage): swipe-based issue triage surface for fast backlog decisions.
- [`Release Notes Showcase`](../../extensions/#release-notes-showcase): release notes authoring and review canvas pattern.
- [`Chromium Control Canvas`](../../extensions/#chromium-control-canvas): advanced canvas that coordinates panel controls with a real headful Chromium window.
- [`Agent Arcade`](../../extensions/#agent-arcade-canvas): retro arcade canvas with agent-callable controls for choosing or restarting mini-games while agents work.

These examples show different complexity levels, from focused workflow boards to richer UI + automation integrations.

## Iterating after first creation

Treat the first `/create-canvas` result as version one. Then refine in-place:

- Add or rename capabilities as your workflow evolves
- Simplify controls that are rarely used
- Add guardrails around sensitive actions
- Keep capability names clear and action-oriented

The fastest loop is: **use the canvas**, note friction, and ask the agent for a targeted update.

## Next steps

- Review the [GitHub Copilot app overview](../github-copilot-app/) for broader session and workflow concepts.
- Browse the [Canvas Extensions page](../../extensions/) for discoverable extensions.
- Fork one of the example extension folders above and adapt it to your own workflow.

---
