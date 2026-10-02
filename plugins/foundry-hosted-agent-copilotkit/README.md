# Foundry Hosted Agent + CopilotKit Plugin

Build and evolve agentic web apps where a CopilotKit React frontend talks over the AG-UI protocol to a Microsoft Agent Framework agent running as a Microsoft Foundry hosted agent.

## What It Includes

### Skills

| Skill | Description |
| --- | --- |
| `/foundry-hosted-agent-copilotkit` | Choose the wiring, use Foundry-native primitives (conversations, durable approvals, background runs, Toolbox, memory, session files), add tools and human-in-the-loop approvals, deploy with `azd`, and debug the AG-UI event stream. |

### MCP Servers

| Server | Description |
| --- | --- |
| `microsoft-learn` | Microsoft Learn MCP server (`https://learn.microsoft.com/api/mcp`) for current Agent Framework and Foundry documentation and code samples. |
| `foundry` | Foundry MCP server (`https://mcp.ai.azure.com`) for inspecting Foundry projects, model deployments, and agents. Signs in with your Microsoft Entra ID account. |

## Requirements

- An Azure subscription with a Microsoft Foundry project (hosted agents are a paid preview service).
- Azure Developer CLI (`azd`) with the `azure.ai.agents` extension, and Azure CLI.
- Node.js and Python for the frontend, CopilotKit runtime, and AG-UI gateway.
