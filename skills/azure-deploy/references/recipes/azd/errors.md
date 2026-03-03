# AZD Errors

## Deployment Runtime Errors

These errors occur **during** `azd up` execution:

| Error | Cause | Resolution |
|-------|-------|------------|
| `unknown flag: --location` | `azd up` doesn't accept `--location` | Use `azd env set AZURE_LOCATION <region>` before `azd up` |
| Provision failed | Bicep template errors | Check detailed error in output |
| Deploy failed | Build or Docker errors | Check build logs |
| Package failed | Missing Dockerfile or deps | Verify Dockerfile exists and dependencies |
| Quota exceeded | Subscription limits | Request increase or change region |
| `could not determine container registry endpoint` | Missing `AZURE_CONTAINER_REGISTRY_ENDPOINT` | See [Missing Container Registry Variables](#missing-container-registry-variables) |
| `map has no entry for key "AZURE_CONTAINER_REGISTRY_MANAGED_IDENTITY_ID"` | Missing managed identity env vars | See [Missing Container Registry Variables](#missing-container-registry-variables) |
| `map has no entry for key "MANAGED_IDENTITY_CLIENT_ID"` | Missing managed identity client ID | See [Missing Container Registry Variables](#missing-container-registry-variables) |
| `found '2' resources tagged with 'azd-service-name: <name>'` | Previous deployment left duplicate-tagged resources in same RG | **Preferred**: Create fresh env with `azd env new <new-name>`, set subscription/location, redeploy. **Alternative**: Delete conflicting resources (requires `ask_user`). |

> ℹ️ **Pre-flight validation**: Run `azure-validate` before deployment to catch configuration errors early. See [Pre-Deploy Checklist](../../pre-deploy-checklist.md).

## Missing Container Registry Variables

**Symptom:** Errors during `azd deploy` about missing container registry or managed identity environment variables:

```
ERROR: could not determine container registry endpoint, ensure 'registry' has been set in the docker options or 'AZURE_CONTAINER_REGISTRY_ENDPOINT' environment variable has been set
```

Or:

```
ERROR: failed executing template file: template: manifest template:6:14: executing "manifest template" at <.Env.AZURE_CONTAINER_REGISTRY_MANAGED_IDENTITY_ID>: map has no entry for key "AZURE_CONTAINER_REGISTRY_MANAGED_IDENTITY_ID"
```

Or:

```
ERROR: failed executing template file: template: manifest template:39:26: executing "manifest template" at <.Env.MANAGED_IDENTITY_CLIENT_ID>: map has no entry for key "MANAGED_IDENTITY_CLIENT_ID"
```

**Cause:** This typically occurs with .NET Aspire projects using azd "limited mode" (in-memory infrastructure generation without explicit `infra/` folder). The `azd provision` command creates the Azure Container Registry and Managed Identity resources but doesn't automatically populate the environment variables that `azd deploy` needs to reference them.

> ⚠️ **Prevention is Better:** For .NET Aspire projects, this issue should be addressed PROACTIVELY before deployment by setting up environment variables after `azd init` but before `azd up`. This avoids deployment failures entirely.

**Solution:**

After `azd provision` succeeds, manually set the missing environment variables by querying the provisioned resources:

```bash
# Get the resource group name (typically rg-{environment-name})
azd env get-values

# Set container registry endpoint
azd env set AZURE_CONTAINER_REGISTRY_ENDPOINT $(az acr list --resource-group <resource-group-name> --query "[0].loginServer" -o tsv)

# Set managed identity resource ID
azd env set AZURE_CONTAINER_REGISTRY_MANAGED_IDENTITY_ID $(az identity list --resource-group <resource-group-name> --query "[0].id" -o tsv)

# Set managed identity client ID
azd env set MANAGED_IDENTITY_CLIENT_ID $(az identity list --resource-group <resource-group-name> --query "[0].clientId" -o tsv)
```

**PowerShell:**
```powershell
# Set container registry endpoint
azd env set AZURE_CONTAINER_REGISTRY_ENDPOINT (az acr list --resource-group <resource-group-name> --query "[0].loginServer" -o tsv)

# Set managed identity resource ID
azd env set AZURE_CONTAINER_REGISTRY_MANAGED_IDENTITY_ID (az identity list --resource-group <resource-group-name> --query "[0].id" -o tsv)

# Set managed identity client ID
azd env set MANAGED_IDENTITY_CLIENT_ID (az identity list --resource-group <resource-group-name> --query "[0].clientId" -o tsv)
```

After setting these variables, retry the deployment:
```bash
azd deploy --no-prompt
```

> 💡 **Tip:** This issue is specific to Aspire limited mode. Manually setting these environment variables after `azd provision` is the recommended workaround.

## Retry

After fixing the issue:
```bash
azd up --no-prompt
```

## Cleanup (DESTRUCTIVE)

```bash
azd down --force --purge
```

⚠️ Permanently deletes ALL resources including databases and Key Vaults.
