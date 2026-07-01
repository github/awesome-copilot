# Aident Skill

[![Skills.sh](https://img.shields.io/badge/skills.sh-aident--skill-blue)](https://skills.sh/aident-ai/aident-skill)
[![npm](https://img.shields.io/npm/v/%40aident-ai%2Fcli?label=%40aident-ai%2Fcli)](https://www.npmjs.com/package/@aident-ai/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Aident AI helps agents move beyond chat and coding to get real work done across your tools and apps.

**Aident Loadout** connects work apps and Aident-managed platform tools to AI agents. It lets agents discover 1,000+ tools like Gmail, Slack, Linear, Google Sheets, Notion, HubSpot, Firecrawl, Exa, and Fal; use connected accounts through secure Aident Vault from any supported agent; use Aident-managed capabilities without separate provider keys; execute 27,000+ real-world actions; and review every action call in audit history. This single `aident-skill` teaches agents when and how to use Aident Loadout.

## First-Time Setup

Ask your agent:

```text
Follow https://aident.ai/SETUP.md
```

The setup guide will install or refresh `aident-skill`, set up the Aident CLI, guide login, and verify Aident Loadout access.

To refresh an existing agent setup later, ask the agent:

```text
Update https://aident.ai/SETUP.md
```

## Manual Skill Install

If you only need to install the static skill package manually:

```bash
npx skills add aident-ai/aident-skill
```

After this command, the agent should continue with `https://aident.ai/SETUP.md` to complete Aident Loadout setup.

This repository contains the static post-setup Aident Loadout skill knowledge. After setup is complete, agents use this skill to operate Aident Loadout through the CLI, user-managed MCP, or advanced OpenAPI surfaces.

## How It Works

The root [SKILL.md](./SKILL.md) is intentionally small. It teaches the agent when to use Aident Loadout, then points to focused references:

| Need                                                                     | Reference                                                        |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| External tools, SaaS apps, integrations, Vault, execution, audit history | [references/loadout.md](./references/loadout.md)                 |
| MCP client setup                                                         | [references/mcp.md](./references/mcp.md)                         |
| Raw HTTPS/OpenAPI fallback                                               | [references/api.md](./references/api.md)                         |
| Authentication and troubleshooting                                       | [references/troubleshooting.md](./references/troubleshooting.md) |

### CLI

The CLI is the recommended operating path when an agent can run shell commands:

```bash
aident login
aident capabilities search --query "send email" --json
aident capabilities execute --name gmail_tools.gmail_send_email --input '{"to":"team@example.com","subject":"Hi","body":"..."}' --json
aident vault status --integrationId gmail_tools --json
aident audit recent --limit 20 --json
```

### MCP

MCP is available when the user configures it:

- Aident Loadout integrations: `https://loadout.aident.ai/mcp`

See [references/mcp.md](./references/mcp.md) for client-specific setup.

## Authentication

CLI auth uses `aident login`. MCP clients initiate OAuth on first use. Tokens are managed by the CLI or MCP client, not by the skill text.

## Links

- Aident: https://aident.ai
- Aident Loadout: https://loadout.aident.ai
- CLI on npm: https://www.npmjs.com/package/@aident-ai/cli
- Docs: https://docs.aident.ai
- Discord: https://discord.gg/hxtEYHuW26

## License

MIT
