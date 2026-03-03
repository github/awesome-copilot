# Azure Functions Deployment

Deployment workflows for Azure Functions using AZD.

## Prerequisites

- Azure Functions project prepared with azd template
- `azure.yaml` exists and validated
- `.azure/plan.md` status = `Validated`
- Azure Functions Core Tools (optional, for local debugging or when using `func` commands outside azd workflows)

## AZD Deployment

### Full Deployment (Infrastructure + Code)

```bash
# Deploy everything
azd up --no-prompt
```

### Infrastructure Only

```bash
# Provision infrastructure without deploying code
azd provision --no-prompt
```

### Application Only

```bash
# Deploy code to existing infrastructure
azd deploy --no-prompt
```

### Preview Changes

```bash
# Preview changes before deployment
azd provision --preview
```

## Environment Configuration

### Set AZD Environment Variables

These are for azd provisioning, not application runtime:

```bash
azd env set AZURE_LOCATION eastus2
azd env set VNET_ENABLED false
```

> ⚠️ **Important**: `azd env set` sets variables for the azd provisioning process, NOT application environment variables.

## Verify Deployment

### Check Function App Status

```bash
# Show deployment details
azd show
```

## Testing HTTP Endpoints

> ⚠️ **Never use `curl -I` (HEAD) to test Azure Functions endpoints.**
>
> Azure Functions `[HttpTrigger]` with `"get"` does **not** automatically handle HEAD requests. HEAD returns 404 from the routing layer even when GET works correctly, causing false-negative results and misdirected debugging.

### ✅ DO — Use GET with output suppression

```bash
# Check status code only (GET, don't follow redirects)
curl -s -o /dev/null -w "%{http_code}" "https://<func-name>.azurewebsites.net/api/<route>"

# Get status code and redirect URL
curl -s -o /dev/null -w "Status: %{http_code}\nRedirect: %{redirect_url}" "https://<func-name>.azurewebsites.net/api/<route>"

# Verbose output showing response headers (GET)
curl -sS -D - -o /dev/null "https://<func-name>.azurewebsites.net/api/<route>"
```

### ❌ DON'T — Use HEAD requests

```bash
# DO NOT use this — returns 404 even when the function works
curl -I "https://<func-name>.azurewebsites.net/api/<route>"
```

## Monitoring

Monitor your Functions deployment through Azure Portal or use azd to view deployment status.

### Common Issues

1. **Deployment timeout**: Use `azd up` with appropriate timeout settings
2. **Missing dependencies**: Ensure package.json/requirements.txt is correct and committed
3. **Function not appearing**: Check azure.yaml service configuration
4. **Cold start issues**: Consider Premium plan configuration in Bicep templates

## CI/CD Integration

For automated deployments with azd, see [cicd/README.md](../cicd/README.md) for GitHub Actions and Azure DevOps integration.

## Data Loss Warning

> ⚠️ **CRITICAL: `azd down` Data Loss Warning**
>
> `azd down` **permanently deletes ALL resources** in the environment, including:
> - **Function Apps** with all configuration and deployment slots
> - **Storage accounts** with all blobs and files
> - **Key Vault** with all secrets (use `--purge` to bypass soft-delete)
> - **Databases** with all data (Cosmos DB, SQL, etc.)
>
> **Best practices:**
> - Always use `azd provision --preview` before `azd up`
> - Use separate environments for dev/staging/production
> - Back up important data before running `azd down`

## Next Steps

After deployment:
1. Verify functions are running
2. Test endpoints
3. Monitor Application Insights
4. Set up alerts and monitoring
