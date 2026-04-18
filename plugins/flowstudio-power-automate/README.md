# FlowStudio Power Automate Plugin

Give your AI agent the same visibility you have in the Power Automate portal. The Graph API only returns top-level run status — agents can't see action inputs, loop iterations, nested failures, or who owns a flow. Flow Studio MCP exposes all of it.

This plugin includes five skills covering the full lifecycle: connect, debug, build, monitor, and govern Power Automate cloud flows.

Requires a [FlowStudio MCP](https://mcp.flowstudio.app) subscription.

## What Agents Can't See Today

| What you see in the portal | What agents see via Graph API |
|---|---|
| Action inputs and outputs | Run passed or failed (no detail) |
| Loop iteration data | Nothing |
| Child flow failures | Top-level error code only |
| Flow health and failure rates | Nothing |
| Who built a flow, what connectors it uses | Nothing |

Flow Studio MCP fills these gaps.

## Installation

```bash
copilot plugin install flowstudio-power-automate@awesome-copilot
```

## What's Included

### Skills

| Skill | Description |
|-------|-------------|
| `flowstudio-power-automate-mcp` | Core connection setup, tool discovery, and operations — list flows, read definitions, check runs, resubmit, cancel. |
| `flowstudio-power-automate-debug` | Step-by-step diagnostic workflow — action-level inputs and outputs, not just error codes. Identifies root cause across nested child flows and loop iterations. |
| `flowstudio-power-automate-build` | Build and deploy flow definitions from scratch — scaffold triggers, wire connections, deploy, and test via resubmit. |
| `flowstudio-power-automate-monitoring` | Flow health from the cached store — failure rates, run history with remediation hints, maker inventory, Power Apps, environment and connection counts. |
| `flowstudio-power-automate-governance` | Governance workflows — classify flows by business impact, detect orphaned resources, audit connectors, manage notification rules, compute archive scores. |

The first three skills call the live Power Automate API. The monitoring and governance skills read from a cached daily snapshot with aggregated stats and governance metadata.

## Prerequisites

- A [FlowStudio MCP](https://mcp.flowstudio.app) subscription
- MCP endpoint: `https://mcp.flowstudio.app/mcp`
- API key (passed as `x-api-key` header — not Bearer)

## Getting Started

1. Install the plugin
2. Get your API key at [mcp.flowstudio.app](https://mcp.flowstudio.app)
3. Configure the MCP connection in VS Code (`.vscode/mcp.json`):
   ```json
   {
     "servers": {
       "flowstudio": {
         "type": "http",
         "url": "https://mcp.flowstudio.app/mcp",
         "headers": { "x-api-key": "<YOUR_TOKEN>" }
       }
     }
   }
   ```
4. Ask Copilot to list your flows, debug a failure, build a new flow, check flow health, or run a governance review

## Source

This plugin is part of [Awesome Copilot](https://github.com/github/awesome-copilot), a community-driven collection of GitHub Copilot extensions.

Skills source: [ninihen1/power-automate-mcp-skills](https://github.com/ninihen1/power-automate-mcp-skills)

## License

MIT
