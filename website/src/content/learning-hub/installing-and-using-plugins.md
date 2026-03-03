---
title: 'Installing and Using Plugins'
description: 'Learn how to find, install, and manage plugins that extend GitHub Copilot CLI with reusable agents, skills, hooks, and integrations.'
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: '2026-02-26'
estimatedReadingTime: '8 minutes'
tags:
  - plugins
  - copilot-cli
  - fundamentals
relatedArticles:
  - ./building-custom-agents.md
  - ./creating-effective-skills.md
  - ./automating-with-hooks.md
prerequisites:
  - GitHub Copilot CLI installed
  - Basic understanding of agents, skills, and hooks
---

Plugins are installable packages that extend GitHub Copilot CLI with reusable agents, skills, hooks, and servers, all bundled into a single unit you can install with one command. Instead of manually copying agent files and configuring MCP servers across every project, plugins let you install a curated set of capabilities and share them with your team.

This article explains what plugins contain, how to find and install them, and how to manage your plugin library.

## What's Inside a Plugin?

A plugin bundles one or more of the following components:

| Component | What It Does | File Location |
|-----------|-------------|---------------|
| **Custom Agents** | Specialized AI assistants with tailored expertise | `agents/*.agent.md` |
| **Skills** | Discrete callable capabilities with bundled resources | `skills/*/SKILL.md` |
| **Hooks** | Event handlers that intercept agent behavior | `hooks.json` or `hooks/` |
| **MCP Servers** | Model Context Protocol integrations for external tools | `.mcp.json` or `.github/mcp.json` |
| **LSP Servers** | Language Server Protocol integrations | `lsp.json` or `.github/lsp.json` |

A plugin might include all of these or just one — for example, a plugin could provide a single specialized agent, or an entire development toolkit with multiple agents, skills, hooks, and MCP server configurations working together.

### Example: What a Plugin Looks Like

Here's the structure of a typical plugin:

```
my-plugin/
├── .github/
│   └── plugin/
│       └── plugin.json        # Plugin manifest (name, description, version)
├── agents/
│   ├── api-architect.agent.md
│   └── test-specialist.agent.md
├── skills/
│   └── database-migrations/
│       ├── SKILL.md
│       └── scripts/migrate.sh
├── hooks.json
└── README.md
```

The `plugin.json` manifest declares what the plugin contains:

```json
{
  "name": "my-plugin",
  "description": "API development toolkit with specialized agents and migration skills",
  "version": "1.0.0",
  "agents": [
    "./agents/api-architect.md",
    "./agents/test-specialist.md"
  ],
  "skills": [
    "./skills/database-migrations/"
  ]
}
```

## Why Use Plugins?

You might wonder: why not just copy agent files into your project manually? Plugins provide several advantages:

| Feature | Manual Configuration | Plugin |
|---------|---------------------|--------|
| **Scope** | Single repository | Any project |
| **Sharing** | Manual copy/paste | `copilot plugin install` command |
| **Versioning** | Git history | Marketplace versions |
| **Discovery** | Searching repositories | Marketplace browsing |
| **Updates** | Manual tracking | `copilot plugin update` |

Plugins are especially valuable when you want to:

- **Standardize across a team** — Everyone installs the same plugin for consistent tooling
- **Share domain expertise** — Package a Rails expert, Kubernetes specialist, or security reviewer as an installable unit
- **Encapsulate complex setups** — Bundle MCP server configurations that would otherwise require manual setup
- **Reuse across projects** — Install the same capabilities in every project without duplicating files

## Finding Plugins

Plugins are collected in **marketplaces** — registries you can browse and install from. Copilot CLI comes with two marketplaces registered by default:

- **`copilot-plugins`** — Official GitHub Copilot plugins
- **`awesome-copilot`** — Community-contributed plugins from this repository

### Browsing a Marketplace

List your registered marketplaces:

```bash
copilot plugin marketplace list
```

Browse plugins in a specific marketplace:

```bash
copilot plugin marketplace browse awesome-copilot
```

Or from within an interactive Copilot session:

```
/plugin marketplace browse awesome-copilot
```

> **Tip**: You can also browse plugins on this site's [Plugins Directory](../../plugins/) to see descriptions, included agents, and skills before installing.

### Adding More Marketplaces

Register additional marketplaces from GitHub repositories:

```bash
copilot plugin marketplace add anthropics/claude-code
```

Or from a local path:

```bash
copilot plugin marketplace add /path/to/local-marketplace
```

## Installing Plugins

### From a Registered Marketplace

The most common way to install a plugin — reference it by name and marketplace:

```bash
copilot plugin install database-data-management@awesome-copilot
```

Or from an interactive session:

```
/plugin install database-data-management@awesome-copilot
```

## Managing Plugins

Once installed, plugins are managed with a few simple commands:

```bash
# List all installed plugins
copilot plugin list

# Update a plugin to the latest version
copilot plugin update my-plugin

# Remove a plugin
copilot plugin uninstall my-plugin
```

### Where Plugins Are Stored

- **Marketplace plugins**: `~/.copilot/installed-plugins/MARKETPLACE/PLUGIN-NAME/`
- **Direct installs**: `~/.copilot/installed-plugins/_direct/PLUGIN-NAME/`

## How Plugins Work at Runtime

When you install a plugin, its components become available to Copilot CLI automatically:

- **Agents** appear in your agent selection (use with `/agent` or the agents dropdown)
- **Skills** are loaded automatically when relevant to your current task
- **Hooks** run at the configured lifecycle events during agent sessions
- **MCP servers** extend the tools available to agents

You don't need to do any additional configuration after installing — the plugin's components integrate seamlessly into your workflow.

## Plugins from This Repository

This repository (`awesome-copilot`) serves as both a collection of individual resources _and_ a plugin marketplace. You can use it in two ways:

### Install Individual Plugins

Browse the [Plugins Directory](../../plugins/) and install specific plugins:

```bash
copilot plugin install context-engineering@awesome-copilot
copilot plugin install azure-cloud-development@awesome-copilot
copilot plugin install frontend-web-dev@awesome-copilot
```

Each plugin bundles related agents and skills around a specific theme or technology.

### Use Individual Resources Without Plugins

If you only need a single agent or skill (rather than a full plugin), you can still copy individual files from this repo directly into your project:

- Copy an `.agent.md` file into `.github/agents/`
- Copy a skill folder into `.github/skills/`
- Copy a hook configuration into `.github/hooks/`

See [Using the Copilot Coding Agent](../using-copilot-coding-agent/) for details on this approach.

## Best Practices

- **Start with a marketplace plugin** before building your own — there may already be one that fits your needs
- **Keep plugins focused** — a plugin for "Rails development" is better than a plugin for "everything"
- **Check for updates regularly** — run `copilot plugin update` to get the latest improvements
- **Review what you install** — plugins run code on your machine, so inspect unfamiliar plugins before installing
- **Use plugins for team standards** — publish an internal plugin to ensure every team member has the same agents, skills, and hooks
- **Remove unused plugins** — declutter with `copilot plugin uninstall` to keep your environment clean

## Common Questions

**Q: Do plugins work with the coding agent on GitHub.com?**

A: Plugins are specific to GitHub Copilot CLI and the VS Code extension (currently Insiders). For the coding agent on GitHub.com, add agents, skills, and hooks directly to your repository (via a plugin if you prefer!). See [Using the Copilot Coding Agent](../using-copilot-coding-agent/) for details.

**Q: Can I use plugins and repository-level configuration together?**

A: Yes. Plugin components are merged with your repository's local agents, skills, and hooks. Local configuration takes precedence if there are conflicts.

**Q: How do I create my own plugin?**

A: Create a directory with a `plugin.json` manifest and your agents/skills/hooks. See the [GitHub docs on creating plugins](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-creating) for a step-by-step guide.

**Q: Can I share plugins within my organization?**

A: Yes. You can create a private plugin marketplace in an internal GitHub repository, then have team members register it with `copilot plugin marketplace add org/internal-plugins`.

**Q: What happens if I uninstall a plugin?**

A: The plugin's agents, skills, and hooks are removed from Copilot. Any work already done with those tools is unaffected — only future sessions lose access.

## Next Steps

- **Browse Plugins**: Explore the [Plugins Directory](../../plugins/) for installable plugin packages
- **Create Skills**: [Creating Effective Skills](../creating-effective-skills/) — Build skills that can be included in plugins
- **Build Agents**: [Building Custom Agents](../building-custom-agents/) — Create agents to package in plugins
- **Add Hooks**: [Automating with Hooks](../automating-with-hooks/) — Configure hooks for plugin automation

---
