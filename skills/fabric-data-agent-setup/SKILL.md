---
display_name: Setup Prerequisites
description: Check and install prerequisites for the Fabric Data Agent plugin — Azure CLI login and uv/uvx. Run automatically when any other skill is first invoked. Triggers: "setup prerequisites", "check setup", "install prerequisites".
---

# Setup Prerequisites

This skill ensures all prerequisites are installed and configured before using the Fabric Data Agent plugin. It runs **once per session** — before any other skill executes.

## When to Run

Run this check automatically when any fabric-data-agent skill or agent is first invoked in a session. Skip if already checked in this session.

## Session State

Track whether setup has been checked this session using a marker file:

```
~/.config/fabric-data-agent/last-setup-check.json
```

Contents:
```json
{
  "lastCheck": "2026-04-21",
  "azCliInstalled": true,
  "azLoggedIn": true,
  "uvxInstalled": true
}
```

Before running:
- If the file exists and `lastCheck` matches today's UTC date, **skip all checks** and proceed silently.
- Otherwise, run the full check.

On Windows, the path is `$env:USERPROFILE\.config\fabric-data-agent\last-setup-check.json`.

## Setup Procedure

Run all steps in a terminal. Report results as a checklist at the end.

### Step 1: Check Azure CLI

Run in terminal:
```powershell
az --version 2>$null | Select-Object -First 1
```

- **If `az` is found**: proceed to Step 2.
- **If `az` is NOT found**: Tell the user:
  ```
  ❌ Azure CLI is not installed.

  Install it with:
    winget install Microsoft.AzureCLI

  After installation, restart VS Code for the PATH changes to take effect.
  ```
  Run `winget install Microsoft.AzureCLI` in the terminal. After it completes, tell the user:
  ```
  ✅ Azure CLI installed. Please restart VS Code, then re-run your command.
  ```
  **Stop here** — do not continue to other checks. The user must restart VS Code first.

### Step 2: Check Azure CLI Login

Run in terminal:
```powershell
az account show --query "{name:name, user:user.name, tenantId:tenantId}" -o json 2>$null
```

- **If it returns account info**: Show `✅ Logged in as <user.name> (tenant: <tenantId>)` and proceed.
- **If it fails or returns error**: Tell the user:
  ```
  ⚠️ Not logged in to Azure CLI.
  ```
  Then run:
  ```powershell
  az login
  ```
  This will open a browser for authentication. Wait for it to complete, then verify with `az account show` again.

### Step 3: Check uv / uvx

Run in terminal:
```powershell
uvx --version 2>$null
```

- **If `uvx` is found**: Show `✅ uvx <version> installed` and proceed.
- **If `uvx` is NOT found**: Tell the user:
  ```
  ❌ uv/uvx is not installed. Installing now...
  ```
  Run the install command:
  ```powershell
  powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
  ```
  After installation, verify:
  ```powershell
  uvx --version
  ```
  - If still not found, the PATH hasn't updated. Tell the user:
    ```
    ✅ uv installed. Please restart VS Code for PATH changes to take effect, then re-run your command.
    ```
    **Stop here.**
  - If found: Show `✅ uvx <version> installed` and proceed.

### Step 4: Verify MCP Server Connectivity

Run in terminal:
```powershell
uvx --from "git+https://github.com/harigouthami/fabric-copilot-plugins.git#subdirectory=fabric-data-agent-mcp" fabric-data-agent-mcp --help 2>$null
```

- **If it works**: Show `✅ MCP server package is accessible`
- **If it fails**: Show `⚠️ Could not reach MCP server package. Check your network connection and try again.`
  This is non-blocking — proceed anyway as the MCP server will be started by VS Code.

### Step 5: Display Summary and Save Marker

Display a summary checklist:
```
╔══════════════════════════════════════════════════════════════╗
║  🔧 Fabric Data Agent — Prerequisites Check                ║
╠══════════════════════════════════════════════════════════════╣
║  ✅ Azure CLI        installed (v2.x.x)                    ║
║  ✅ Azure Login      harn@microsoft.com                     ║
║  ✅ uv/uvx           installed (v0.x.x)                    ║
║  ✅ MCP Server       accessible                            ║
╚══════════════════════════════════════════════════════════════╝

Ready to use! Try: "Create a data agent called MyAgent in my workspace"
```

Then save the marker file:
```powershell
$dir = "$env:USERPROFILE\.config\fabric-data-agent"
if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
@{ lastCheck = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd"); azCliInstalled = $true; azLoggedIn = $true; uvxInstalled = $true } | ConvertTo-Json | Set-Content "$dir\last-setup-check.json"
```

If any required tool was installed and requires a restart, show:
```
⚠️ Please restart VS Code for PATH changes to take effect, then re-run your command.
```

## Must

- Check prerequisites only once per day (based on UTC date)
- Install missing tools automatically (Azure CLI via winget, uv via install script)
- Always tell the user to restart VS Code after any new tool installation
- Be non-blocking — if MCP connectivity check fails, still proceed
- Save the marker file after checks complete

## Prefer

- Show a concise checklist summary rather than verbose output
- Run silently (skip entirely) on subsequent invocations the same day
- Use `winget` for Azure CLI on Windows

## Avoid

- Blocking the user if only the MCP connectivity check fails
- Running checks on every single skill invocation (once per day is enough)
- Installing tools without informing the user what's being installed
