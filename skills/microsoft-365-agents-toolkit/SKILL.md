---
name: microsoft-365-agents-toolkit
description: "Build Microsoft 365 agents and Teams apps using the ATK CLI. USE THIS SKILL for any task involving: creating Teams bots, tabs, or message extensions; building Declarative Agents or Custom Engine Agents for M365 Copilot; provisioning Azure resources; deploying to the cloud; local testing with Agents Playground; migrating Slack bots to Teams; or working with m365agents.yml / teamsapp.yml config files. Trigger phrases include 'build a Teams bot', 'create a Declarative Agent', 'add to M365 Copilot', 'deploy my Teams app', 'test locally with Agents Playground', 'provision Azure', 'migrate from Slack', 'atk new', 'atk provision', 'atk deploy'."
license: MIT
compatibility: "Requires Node.js 22+, @microsoft/m365agentstoolkit-cli@beta (version > 1.1.5-beta). Install: npm i -g @microsoft/m365agentstoolkit-cli@beta"
metadata:
  version: "1.0"
  author: "Microsoft Corporation"
  repository: "https://github.com/OfficeDev/microsoft-365-agents-toolkit"
  full-skill: "packages/vscode-extension/skills/microsoft-365-agents-toolkit/"
  sub-skills:
    - "create-project: scaffold new project from template"
    - "test-playground: local testing with Agents Playground"
    - "test-teams: run on Teams via devtunnel"
    - "provision-deploy: Azure provision + cloud deploy"
    - "troubleshoot: fix 401s, port conflicts, YAML errors"
    - "slack-to-teams: migrate Slack bots to Teams"
argument-hint: "Optional: specify the sub-task (e.g. 'create project', 'deploy', 'troubleshoot 401', 'migrate Slack')"
---

# Microsoft 365 Agents Toolkit Skill

Build Microsoft 365 agents and Teams apps using the ATK CLI (`atk`).

## AI Behavior Guidelines

1. **Testing Strategy:** Recommend Agents Playground first (faster, no M365 tenant needed). Use Teams workflow only if user explicitly requests it.

2. **Environment Variables:** NEVER hardcode secrets or make up placeholder values. Always ask users for real values.

3. **Error Handling:** Read error messages carefully. Common pitfalls:
   - **`AADSTS7000229`** → `aadApp/create` missing `generateServicePrincipal: true` in YAML — add it and re-provision
   - **Missing `TENANT_ID`** in `.localConfigs` → 401 from Bot Connector — check `.localConfigs` file
   - **401 persists after auth fix** → devtunnel URL may be blacklisted — create a fresh tunnel
   - See [troubleshoot reference](references/troubleshoot.md) for full diagnostic steps

4. **Long-Running Commands — WAIT for completion:**
   - `atk new`, `atk provision`, `atk deploy` can take several minutes
   - Always wait for completion before running the next step (timeout 120000ms+)

5. **Local Service Startup — Hangs terminal (expected):**
   - `npm run dev`, `npm start`, `python app.py`, `devtunnel host` will hang — the process keeps running indefinitely
   - ALWAYS run as a background process (`isBackground=true`)
   - Verify startup by checking output for "listening on port" or tunnel URL
   - Use a **NEW terminal** to launch Agents Playground or open Teams sideloading URL

6. **Telemetry Tagging:** Before running any `atk` CLI commands:
   ```bash
   export ATK_CLI_SKILL=true
   ```

## ATK CLI Setup

```bash
atk --version  # Must be > 1.1.5-beta
```

If ATK is not found or version is too old:
```bash
npm i -g @microsoft/m365agentstoolkit-cli@beta
```

## CLI Global Options

| Option | Meaning |
| --- | --- |
| `-i false` | Non-interactive mode (always use in automation) |
| `-f <folder>` | Project folder (parent folder when scaffolding) |
| `-h` | Command help |

## Workflow Selection

Match user intent to the smallest valid workflow:

| User Intent | Workflow |
|---|---|
| Build new app from scratch | [create-project](references/create-project.md) → [test-playground](references/test-playground.md) |
| Test existing project locally | [test-playground](references/test-playground.md) (recommended) |
| Run on Teams | [test-teams](references/test-teams.md) |
| Deploy to Azure | [provision-deploy](references/provision-deploy.md) |
| Fix broken bot | [troubleshoot](references/troubleshoot.md) |
| Migrate Slack bot to Teams | [slack-to-teams](references/slack-to-teams.md) |

> **MANDATORY:** Before executing any workflow, read the corresponding reference document.

## Project Context Resolution

If `m365agentstoolkit*.yml` exists in the current folder, treat it as an ATK project and parse configuration.

Common variables needed:
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_DEPLOYMENT_NAME`

Resolve variables from `m365agentstoolkit*.yml`. If required values are missing, ask the user for only the missing ones.

## Full Skill Reference

The full skill with 100+ expert files, sub-skill documentation, and Slack-to-Teams migration experts is available at:
[`OfficeDev/microsoft-365-agents-toolkit`](https://github.com/OfficeDev/microsoft-365-agents-toolkit/tree/dev/packages/vscode-extension/skills/microsoft-365-agents-toolkit)

Install the full skill:
```bash
gh skill install OfficeDev/microsoft-365-agents-toolkit microsoft-365-agents-toolkit
```
