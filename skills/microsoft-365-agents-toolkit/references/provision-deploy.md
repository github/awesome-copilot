# Provision and Deploy

Provision Azure resources and deploy your agent to the cloud.

## Prerequisites

```bash
atk auth login azure    # Azure login
az account show         # Verify correct subscription
```

Set in `env/.env.dev`:
```
AZURE_SUBSCRIPTION_ID=<your-subscription-id>
```

## Cloud Deploy Workflow

```bash
# Step 1: Provision Azure + M365 resources
atk provision --env dev --resource-group <rg> --region <region> -i false

# Step 2: Deploy code to Azure
atk deploy --env dev -i false
```

Both commands can take several minutes — wait for completion (timeout 120000ms+).

## Local Provisioning (for Teams testing)

```bash
atk provision --env local -i false
atk deploy --env local -i false
```

### Post-Provisioning: Verify TENANT_ID

```bash
grep TENANT_ID .localConfigs
# If missing, copy from env/.env.local and add to .localConfigs
```

## Common Errors

| Error | Fix |
|---|---|
| `AADSTS7000229` | Add `generateServicePrincipal: true` to `aadApp/create` in YAML, re-provision |
| ARM deploy failed | Check Azure subscription, resource group name, region availability |
| 401 from Bot Connector | Verify `TENANT_ID` in `.localConfigs` |

## Package & Publish to Teams App Store

```bash
atk package --env dev -i false       # Creates appPackage.zip
atk validate --env dev -i false      # Validate before publishing
atk publish --env dev -i false       # Publish to org app catalog
```
