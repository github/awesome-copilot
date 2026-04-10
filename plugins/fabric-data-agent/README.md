# Fabric Data Agent Plugin

Create, test, and tune Microsoft Fabric Data Agents from VS Code using natural language.

## What It Does

This plugin provides an agent and three skills for managing Fabric Data Agents through GitHub Copilot:

- **Fabric Data Agent Manager** (agent) — Full lifecycle: create → configure → publish → query → tune
- **#fabric-data-agent-create** (skill) — Guided end-to-end agent setup with SQL validation
- **#fabric-data-agent-test** (skill) — CSV-based accuracy testing with tolerance matching
- **#fabric-data-agent-tune** (skill) — Diagnose and fix failing queries

## Prerequisites

- Azure CLI (`az login`) for Fabric API authentication
- Fabric workspace access (Contributor role)

## Setup — Connect the MCP Server

This plugin requires the **Fabric Data Agent MCP server** to provide the tools Copilot uses. Set it up in 3 steps:

### 1. Clone the repo

```bash
git clone https://github.com/harigouthami/fabric-copilot-plugins.git
cd fabric-copilot-plugins/fabric-data-agent-mcp
```

### 2. Run setup

```powershell
.\setup.ps1
```

This installs `uv` (if needed), verifies your Azure CLI login, and configures `.vscode/mcp.json` automatically.

### 3. Reload VS Code

`Ctrl+Shift+P` → **"Reload Window"** — the MCP server tools will appear in Copilot Chat.

## Example Usage

```
You: Create a data agent called ADOWIA in A3PInsights workspace
Copilot: ✅ Created. Which lakehouse to connect?

You: External
Copilot: ✅ Connected. Found 4 schemas, 64 tables. Which tables?

You: The tca_adowia* tables from TCA schema
Copilot: ✅ 7 tables selected and verified.

You: [pastes Git repo URL with semantic model]
Copilot: [generates instructions from TMDL files, validates SQL, adds few-shots]
         ✅ Published. Testing: "total time saved" → 7,496.5 hours
```

## Key Features

- **SQL validation**: Every few-shot query is tested against the database before adding
- **Knowledge from Git**: Fetches TMDL files from ADO repos to auto-generate instructions
- **Accuracy testing**: CSV-based test runner with configurable tolerance
- **Tune loop**: Reproduce → Diagnose → Fix → Publish → Re-test in one conversation
