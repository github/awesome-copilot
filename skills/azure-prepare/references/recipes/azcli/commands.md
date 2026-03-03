# Azure CLI Commands

Common az commands for deployment workflows.

## Resource Group

```bash
# Create
az group create --name <rg-name> --location <location>

# Delete
az group delete --name <rg-name> --yes --no-wait
```

## Container Registry

```bash
# Create
az acr create --name <acr-name> --resource-group <rg-name> --sku Basic

# Login
az acr login --name <acr-name>

# Build and push
az acr build --registry <acr-name> --image <image:tag> .
```

## Container Apps

```bash
# Create environment
az containerapp env create \
  --name <env-name> \
  --resource-group <rg-name> \
  --location <location>

# Deploy app
az containerapp create \
  --name <app-name> \
  --resource-group <rg-name> \
  --environment <env-name> \
  --image <acr-name>.azurecr.io/<image:tag> \
  --target-port 8080 \
  --ingress external
```

## App Service

```bash
# Create plan
az appservice plan create \
  --name <plan-name> \
  --resource-group <rg-name> \
  --sku B1 --is-linux

# Create web app
az webapp create \
  --name <app-name> \
  --resource-group <rg-name> \
  --plan <plan-name> \
  --runtime "NODE:22-lts"
```

## Functions

```bash
# Create function app
az functionapp create \
  --name <func-name> \
  --resource-group <rg-name> \
  --storage-account <storage-name> \
  --consumption-plan-location <location> \
  --runtime node \
  --functions-version 4
```

## Key Vault

```bash
# Create
az keyvault create \
  --name <kv-name> \
  --resource-group <rg-name> \
  --location <location>

# Set secret
az keyvault secret set \
  --vault-name <kv-name> \
  --name <secret-name> \
  --value <secret-value>
```
