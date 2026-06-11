---
name: foundry-agent-sync
description: "Create and synchronize prompt-based AI agents directly within Azure AI Foundry via REST API, from a local JSON manifest. Unlike scaffolding skills that only generate local code, this skill registers agents in the Foundry service itself — making them immediately available for invocation. Use when the user asks to create agents in Foundry, sync, deploy, register, or push agents to Foundry, update agent instructions, or scaffold the manifest and sync script for a new repository. Triggers: 'create agent in foundry', 'sync foundry agents', 'deploy agents to foundry', 'register agents in foundry', 'push agents', 'create foundry agent manifest', 'scaffold agent sync'."
---

# Foundry Agent Sync

## Overview

Create and synchronize prompt-based AI agents directly within Azure AI Foundry via the Agent Service REST API. This skill registers agents in the Foundry service itself — making them immediately available for invocation, evaluation, and management through the Foundry portal or API. Each agent is created or updated idempotently via a named POST call, using definitions from a local JSON manifest file.

> **Key distinction:** This skill creates agents inside AI Foundry (server-side). It does not scaffold local agent code or container images — for that, use the `microsoft-foundry` skill's `create` sub-skill.

## Prerequisites

The user must have:

1. An Azure AI Foundry project with a deployed model (e.g. `gpt-5-4`)
2. Azure CLI (`az`) authenticated with access to the Foundry project
3. The **Azure AI User** role (or higher) on the Foundry project resource

Collect these values before proceeding:

| Value | How to get it |
|---|---|
| **Foundry project endpoint** | Azure Portal → AI Foundry project → Overview → Endpoint, or `az resource show` |
| **Subscription ID** | `az account show --query id -o tsv` |
| **Model deployment name** | The model name deployed in the Foundry project (e.g. `gpt-5-4`) |

## Manifest Format

The manifest is a JSON array where each entry defines one agent. Look for it at common paths: `infra/foundry-agents.json`, `foundry-agents.json`, or `.foundry/agents.json`. If none exists, scaffold one.

```json
[
  {
    "useCaseId": "alert-triage",
    "description": "Short description of what this agent does.",
    "baseInstruction": "You are an assistant that... <system prompt for the agent>"
  }
]
```

### Field Reference

| Field | Required | Description |
|---|---|---|
| `useCaseId` | Yes | Kebab-case identifier; used to build the agent name (`{prefix}-{useCaseId}`) |
| `description` | Yes | Human-readable description stored as agent metadata |
| `baseInstruction` | Yes | System prompt / base instructions for the agent |

## Sync Script

### PowerShell (interactive / CI)

Create or locate the sync script. The canonical path is `infra/scripts/sync-foundry-agents.ps1` but adapt to the repo layout.

```powershell
param(
  [Parameter(Mandatory)]
  [string]$SubscriptionId,

  [Parameter(Mandatory)]
  [string]$ProjectEndpoint,

  [string]$ManifestPath = (Join-Path $PSScriptRoot '..\foundry-agents.json'),
  [string]$ModelName = 'gpt-5-4',
  [string]$AgentNamePrefix = 'myproject',
  [string]$ApiVersion = '2025-11-15-preview'
)

$ErrorActionPreference = 'Stop'

# Optional: append a common instruction suffix to every agent
$commonSuffix = ''

az account set --subscription $SubscriptionId | Out-Null
$accessToken = az account get-access-token --resource https://ai.azure.com/ --query accessToken -o tsv
if (-not $accessToken) { throw 'Failed to acquire Foundry access token.' }

$definitions = Get-Content -Raw -Path $ManifestPath | ConvertFrom-Json
$headers = @{ Authorization = "Bearer $accessToken" }
$results = @()

foreach ($def in $definitions) {
  $agentName = "$AgentNamePrefix-$($def.useCaseId)"
  $instructions = if ($commonSuffix) { "$($def.baseInstruction)`n`n$commonSuffix" } else { $def.baseInstruction }
  $body = @{
    definition  = @{ kind = 'prompt'; model = $ModelName; instructions = $instructions }
    description = $def.description
    metadata    = @{ useCaseId = $def.useCaseId; managedBy = 'foundry-agent-sync' }
  } | ConvertTo-Json -Depth 8

  $uri = "$($ProjectEndpoint.TrimEnd('/'))/agents/$agentName`?api-version=$ApiVersion"
  $resp = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -ContentType 'application/json' -Body $body
  $version = $resp.version ?? $resp.latest_version ?? $resp.id ?? 'unknown'
  Write-Host "Synced $agentName ($version)"
  $results += [pscustomobject]@{ name = $agentName; version = $version }
}

$results | Format-Table -AutoSize
```

### Bash (Bicep deployment script / CI)

For automated deployment via `Microsoft.Resources/deploymentScripts`, use a bash script that:

1. Authenticates with a managed identity: `az login --identity --username "$CLIENT_ID"`
2. Acquires a Foundry token: `az account get-access-token --resource https://ai.azure.com/`
3. Iterates definitions from the `FOUNDRY_AGENT_DEFINITIONS` environment variable (JSON string)
4. POSTs each agent to `{endpoint}/agents/{name}?api-version=2025-11-15-preview`

## Bicep Integration (optional)

To run the sync automatically during infrastructure deployment:

1. **Load the manifest** at compile time:
   ```bicep
   var agentDefinitions = loadJsonContent('foundry-agents.json')
   ```

2. **Create a User-Assigned Managed Identity** with the **Azure AI User** role on the Foundry project.

3. **Create a `Microsoft.Resources/deploymentScripts`** resource (kind `AzureCLI`) that:
   - Uses the managed identity
   - Loads the bash sync script via `loadTextContent`
   - Passes the project endpoint, definitions, and model as environment variables

Gate behind a `deployFoundryAgents` parameter so teams can opt in/out.

## Workflow

### Step 1 — Locate or scaffold the manifest

Search the repo for `foundry-agents.json`. If it doesn't exist, ask the user what agents they need and create the manifest.

### Step 2 — Locate or scaffold the sync script

Search for `sync-foundry-agents.ps1` or `foundry-agent-sync.sh`. If missing, create the PowerShell script using the template above, adapting:
- `$AgentNamePrefix` to match the project name
- `$ModelName` to the user's deployed model
- `$ManifestPath` to the actual manifest location

### Step 3 — Collect parameters

Ask the user for:
- Foundry project endpoint
- Subscription ID
- Model deployment name (default: `gpt-5-4`)
- Agent name prefix (default: repo name in kebab-case)

### Step 4 — Run the sync

Execute the PowerShell script with the collected parameters:

```powershell
.\infra\scripts\sync-foundry-agents.ps1 `
  -SubscriptionId '<sub-id>' `
  -ProjectEndpoint '<endpoint>' `
  -ModelName '<model>' `
  -AgentNamePrefix '<prefix>'
```

### Step 5 — Verify

Confirm synced agents by listing them:

```powershell
$token = az account get-access-token --resource https://ai.azure.com/ --query accessToken -o tsv
$endpoint = '<project-endpoint>'
Invoke-RestMethod -Uri "$endpoint/agents?api-version=2025-11-15-preview" `
  -Headers @{ Authorization = "Bearer $token" }
```

## REST API Reference

| Operation | Method | URL |
|---|---|---|
| Create/update agent | POST | `{projectEndpoint}/agents/{agentName}?api-version=2025-11-15-preview` |
| List agents | GET | `{projectEndpoint}/agents?api-version=2025-11-15-preview` |
| Get agent | GET | `{projectEndpoint}/agents/{agentName}?api-version=2025-11-15-preview` |
| Delete agent | DELETE | `{projectEndpoint}/agents/{agentName}?api-version=2025-11-15-preview` |

### Create/Update Payload

```json
{
  "definition": {
    "kind": "prompt",
    "model": "<deployed-model-name>",
    "instructions": "<system prompt>"
  },
  "description": "<agent description>",
  "metadata": {
    "useCaseId": "<use-case-id>",
    "managedBy": "foundry-agent-sync"
  }
}
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `401 Unauthorized` | Token expired or wrong audience | Re-run `az account get-access-token --resource https://ai.azure.com/` |
| `403 Forbidden` | Missing Azure AI User role | Assign the role on the Foundry project scope |
| `404 Not Found` | Wrong project endpoint | Verify endpoint includes `/api/projects/{projectName}` |
| Model not found | Model not deployed in project | Deploy the model in AI Foundry portal first |
| Empty definitions | Manifest path wrong | Check `-ManifestPath` points to the JSON file |
