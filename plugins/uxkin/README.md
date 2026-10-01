# UXKIN Plugin

Better UI from GitHub Copilot. The `no-ui-slop` skill makes Copilot work from your product's own design system, design every state, and check the rendered result before calling UI work done.

## Installation

```bash
copilot plugin install uxkin@awesome-copilot
```

In VS Code, search `@agentPlugins uxkin` in the Extensions view, or run **Chat: Plugins** from the Command Palette.

## Try It

Open a project with a list page that has no designed empty state, and give Copilot its file path:

```text
Use no-ui-slop to design the first-use state of the projects page in [file path].
It's for a team admin who just signed up. Done means they understand what a
project is and can create one from this screen. Reuse our components and
tokens. Also cover loading and a failed request with a retry. Check the result
at 390px and 1440px and by keyboard, and tell me what you checked.
```

Adapt the prompt to your product. The skill keeps your design system and does not invent features, data or backend behavior.

## What's Included

| Skill | Description |
|---|---|
| `no-ui-slop` | Five steps for any UI task: understand the product and the existing system, find a reference for a specific decision, work from one consistent set of materials, build every state, and review the rendered result. |

## Requirements and Scope

- No account, token or external server is required. The skill works from your repository alone.
- No MCP server is bundled with this plugin.
- Optional: if you connect the separate UXKIN MCP server, the skill can use `find_ui_references` (real app screens, journeys and websites) and `find_ui_materials` (colors, fonts, components and DESIGN.md from real web design systems). The MCP server needs a free UXKIN account; the full library is part of a paid plan. See [uxkin.com/docs](https://uxkin.com/docs).

## Learn More

- [GitHub Copilot UI design guide](https://uxkin.com/github-copilot-ui-design)
- [Free UI design prompt builder](https://uxkin.com/tools/ui-design-prompt-builder)
- [Coding agent UI checklist](https://uxkin.com/coding-agent-ui-checklist)

## License

MIT
