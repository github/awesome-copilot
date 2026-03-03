# Deployment Scripts

Script templates for AZCLI deployments.

## Bash Script

```bash
#!/bin/bash
set -euo pipefail

# Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-myapp}"
LOCATION="${LOCATION:-eastus2}"
ENVIRONMENT="${ENVIRONMENT:-dev}"

echo "Deploying to $ENVIRONMENT environment..."

# Create resource group
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --tags environment="$ENVIRONMENT"

# Deploy infrastructure
az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --template-file ./infra/main.bicep \
  --parameters ./infra/main.parameters.json \
  --parameters environmentName="$ENVIRONMENT"

# Get outputs
ACR_NAME=$(az deployment group show \
  --resource-group "$RESOURCE_GROUP" \
  --name main \
  --query properties.outputs.acrName.value -o tsv)

# Build and push containers
az acr login --name "$ACR_NAME"
az acr build --registry "$ACR_NAME" --image api:latest ./src/api

echo "Deployment complete!"
```

## PowerShell Script

```powershell
#Requires -Version 7.0
$ErrorActionPreference = "Stop"

# Configuration
$ResourceGroup = $env:RESOURCE_GROUP ?? "rg-myapp"
$Location = $env:LOCATION ?? "eastus2"
$Environment = $env:ENVIRONMENT ?? "dev"

Write-Host "Deploying to $Environment environment..."

# Create resource group
az group create `
  --name $ResourceGroup `
  --location $Location `
  --tags environment=$Environment

# Deploy infrastructure
az deployment group create `
  --resource-group $ResourceGroup `
  --template-file ./infra/main.bicep `
  --parameters ./infra/main.parameters.json `
  --parameters environmentName=$Environment

# Get outputs
$AcrName = az deployment group show `
  --resource-group $ResourceGroup `
  --name main `
  --query properties.outputs.acrName.value -o tsv

# Build and push containers
az acr login --name $AcrName
az acr build --registry $AcrName --image api:latest ./src/api

Write-Host "Deployment complete!"
```

## Script Best Practices

| Practice | Description |
|----------|-------------|
| Fail fast | `set -euo pipefail` (bash) or `$ErrorActionPreference = "Stop"` (pwsh) |
| Use variables | Environment-based configuration |
| Idempotent | Safe to run multiple times |
| Output logging | Clear progress messages |
| Error handling | Capture and report failures |
