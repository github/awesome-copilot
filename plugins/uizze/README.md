# UIZZE Plugin

Stop generic UI from shipping. UIZZE helps GitHub Copilot build product-specific interfaces and finish the states that make them usable.

## Installation

```bash
copilot plugin install uizze@awesome-copilot
```

## Try It on a Real Screen

Open a project with a billing settings screen and give Copilot its file path:

```text
Use anti-ui-slop to improve the billing settings screen in [file path].
Reuse this project's components and design tokens. Make the current plan,
usage limits, invoices, and upgrade or cancel actions easy to find.
Cover loading, empty, payment-failed, and permission-denied states where
they apply. Inspect the rendered result if the environment supports it,
then fix observable layout and interaction problems.
```

Adapt the prompt to the features your product actually has. The skill should
preserve your product's design system and finish the requested screen's states.
It should not invent billing behavior, data, or backend integrations.

For other tasks, see the [data table, permissions, iOS, and UI review examples](https://github.com/uizze/uizze/blob/main/examples/agent-workflows.md).

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
- The free workflow is useful on its own. See the license scope below for the bundled playbooks.

The optional, separate authenticated UIZZE MCP exposes exactly `find_ui_references` and `find_ui_materials`. It is not required by this plugin.

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot). The canonical UIZZE packages are maintained at [uizze/uizze](https://github.com/uizze/uizze).

## License

The plugin entry point is MIT licensed. The bundled design playbooks carry
[Apache-2.0](https://github.com/github/awesome-copilot/blob/main/skills/anti-ui-slop/LICENSE)
terms and [third-party notices](https://github.com/github/awesome-copilot/blob/main/skills/anti-ui-slop/NOTICE).
See the upstream [license map](https://github.com/uizze/uizze/blob/main/LICENSING.md)
for the package scope.
