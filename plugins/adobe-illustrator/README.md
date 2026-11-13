# Adobe Illustrator Plugin

Adobe Illustrator scripting, extension and plug-in development, MCP and command-line automation, and Creative Cloud asset management, led by an expert technical artist agent for Adobe Creative Cloud.

## Installation

```bash
copilot plugin install adobe-illustrator@awesome-copilot
```

## What's Included

### Agent

| Agent | What it does |
| --- | --- |
| `Adobe Creative Cloud` | An expert technical artist that picks the right Creative Cloud app or combination of apps, knows Creative Cloud storage (cloud documents, Projects, Libraries, Stock, local files), moves work off discontinued apps, explains how each app is extended, and leads the two skills below. |

### Skills

| Skill | What it does |
| --- | --- |
| `adobe-illustrator-scripting` | Writes, debugs, and optimizes Illustrator ExtendScript: documents, layers, paths, text, color, artboards, exports, and running scripts from outside Illustrator. |
| `adobe-illustrator-integrations` | Builds and documents what sits around a script: CEP extension panels, C++ SDK plug-ins, the coming UXP plugins, Illustrator MCP servers, command-line and OS automation, computer-use sessions, and install and usage docs for published tools. |

## Use Cases

- Write or fix an Illustrator script, from a one-line batch rename to a data-driven artwork generator
- Write step-by-step instructions for a complex Illustrator graphic, or the docs for an asset, plugin, extension, or script someone will publish
- Build or extend an MCP server that lets an AI tool drive Illustrator
- Work in Illustrator through a computer-use tool when a feature has no scripting route
- Build or fix an Illustrator CEP extension panel
- Build or fix an Illustrator C++ plug-in
- Automate Illustrator from a batch, PowerShell, bash, or AppleScript script that runs ExtendScript
- Organize Illustrator and Creative Cloud files in a project or workspace

## Example Prompts

```text
Write an Illustrator script that exports every artboard in the open document to PNG at 2x
into an exports folder next to the document, named acme-icons-<artboard name>.png.
```

```text
Build a CEP panel for Illustrator 2026 that lets a designer pick a brand color from the
Acme Corp library and apply it to every selected path, with install steps for Windows and macOS.
```

```text
Design an MCP server for Illustrator with tools to list layers, run a named script from an
allowlisted folder, and export an artboard preview, and explain how to register it in VS Code.
```

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot).

## License

MIT
