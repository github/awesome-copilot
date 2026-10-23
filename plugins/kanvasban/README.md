# Kanvasban Plugin

A local Copilot canvas for humans and agents to manage projects, features, and
user stories. Unlike issue-specific boards, Kanvasban keeps a personal,
multi-project backlog on your machine without requiring a GitHub repository or
external project-management service.

## Installation

```bash
copilot plugin install kanvasban@awesome-copilot
```

Requires a Copilot host that supports SDK canvas extensions. The host supplies
the SDK; do not install it separately. Discover the `kanvasban` canvas, open it,
and use `listProjects` to find project IDs before creating items.

## Features

- Projects containing features and linked or standalone user stories.
- Shared manual card order and Backlog, Ready, In progress, Done, and Cancel
  workflow columns.
- Live updates between browser views and agent actions using the same store.
- Comments, change history, archiving, filters, and optional feature grouping.

## Local data and first run

No board data ships with the plugin. First use creates a **Hello world** project,
one feature, and one linked user story when the store is missing.

Data lives at `extension-data/kanvasban/backlog.json` under a nonempty
`COPILOT_HOME`, otherwise `~/.copilot`. All workspaces using that home share the
same personal board; this is not cloud synchronization. Existing stores are
preserved, and invalid or unreadable data produces an explicit error.

The optional Ko-fi support button uses an inline icon, so the canvas makes no
requests to Ko-fi and needs no external service. No Ko-fi widget script is loaded.

## Documentation and source

See the [canvas documentation](../../extensions/kanvasban/README.md) for UI,
agent actions, storage, and test commands, and the
[agent workflow](../../extensions/kanvasban/AGENTS.md) for coordination rules.

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot).

## License

MIT
