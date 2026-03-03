# AZD Verification

Verify deployment success and application health.

## Step 1: Verify Resources

```bash
azd show
```

Expected output:
```
Showing deployed resources:
  Resource Group: rg-myapp-dev
  Services:
    api - Endpoint: https://api-xxxx.azurecontainerapps.io
```

## Step 2: Health Check

```bash
# Get endpoint
ENDPOINT=$(azd env get-values | grep -E "SERVICE_.*_URI|.*_ENDPOINT" | head -1 | cut -d'=' -f2)

# Test endpoint
curl -f "$ENDPOINT/health" || curl -f "$ENDPOINT"
```

Expected: HTTP 200 response.

## Step 3: Post-Deployment Verification (if applicable)

For deployments with Azure SQL Database and managed identity:

### Verify SQL Access

```bash
# Load environment variables
eval $(azd env get-values)

# Check managed identity user exists in database
az sql db query \
  --server "$SQL_SERVER" \
  --database "$SQL_DATABASE" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --auth-mode ActiveDirectoryDefault \
  --queries "SELECT name, type_desc FROM sys.database_principals WHERE type = 'E'"
```

**Expected:** Should list the App Service or Container App managed identity.

### Verify Database Schema

For EF Core applications:

```bash
# Check tables exist
az sql db query \
  --server "$SQL_SERVER" \
  --database "$SQL_DATABASE" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --auth-mode ActiveDirectoryDefault \
  --queries "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'"
```

**Expected:** Should list application tables (not just `__EFMigrationsHistory`).

### Check Application Logs

```bash
# For App Service
az webapp log tail --name <app-name> --resource-group <resource-group>

# For Container Apps
az containerapp logs show --name <app-name> --resource-group <resource-group> --follow
```

**Look for:**
- ✅ No SQL authentication errors
- ✅ Successful database connection
- ✅ Application started successfully

## Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| HTTP 500 on startup | SQL authentication failure | See [sql-managed-identity.md](sql-managed-identity.md) |
| "Invalid object name" errors | Migrations not applied | See [ef-migrations.md](ef-migrations.md) |
| Endpoint not accessible | Service still starting | Wait 1-2 minutes, retry |
| Health check fails | Application error | Check logs with `az webapp log tail` |

## References

- [Post-Deployment Steps](post-deployment.md)
- [SQL Managed Identity Access](sql-managed-identity.md)
- [EF Core Migrations](ef-migrations.md)
