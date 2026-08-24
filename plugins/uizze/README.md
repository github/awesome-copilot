# UIZZE Plugin

Stop generic UI from shipping. UIZZE helps GitHub Copilot build product-specific interfaces and finish the states that make them usable.

## Installation

```bash
copilot plugin install uizze@awesome-copilot
```

## What's Included

| Skill | Description |
|---|---|
| `anti-ui-slop` | Uses the product brief and existing design system, loads one focused playbook, optionally finds relevant interface evidence, and checks the rendered result before completion. |

## How It Works

1. Inspect the target product, task, components, and existing design system.
2. Load one focused playbook for the kind of interface work being done.
3. Use UIZZE evidence only when a concrete visual question would benefit from it.
4. Render once when possible and fix observable breakage before completion.

The skill works from repository evidence alone. UIZZE references are optional, and an empty search result is a normal no-op.

## Requirements and Scope

- No account, credential, token, or external server is required.
- No MCP server is bundled with this plugin.
- The skill is MIT licensed and useful on its own.

The optional, separate authenticated UIZZE MCP exposes exactly `find_ui_references` and `find_ui_materials`. It is not required by this plugin.

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot). The canonical UIZZE packages are maintained at [uizze/uizze](https://github.com/uizze/uizze).

## License

MIT
