# Post-Deployment Steps

Execute critical post-deployment configuration after infrastructure provisioning completes.

> ⚠️ **Run AFTER `azd up` or `azd provision` completes successfully**

## When to Apply

Post-deployment steps are required when your deployment includes:

| Scenario | Required Actions |
|----------|-----------------|
| **ASP.NET Core + Azure SQL + Managed Identity** | Grant managed identity SQL access, apply EF migrations |
| **App Service + Azure SQL + Entra auth** | Grant App Service identity database permissions |
| **Container Apps + SQL Database** | Configure managed identity access, run migrations |

## ASP.NET Core + EF Core + Azure SQL

Complete workflow for apps using Entity Framework with Azure SQL Database.

### Prerequisites

- `azd up` or `azd provision` completed successfully
- App Service or Container App has system-assigned managed identity enabled
- Azure SQL Server configured with Entra ID admin
- EF Core project with migrations

### Step 1: Grant Managed Identity SQL Access

Grant the App Service or Container App's managed identity permissions on the SQL database.

See [SQL Managed Identity Access](sql-managed-identity.md) for detailed SQL scripts and examples.

**Quick Template:**

```bash
# Get the app identity name from azd
eval $(azd env get-values)
APP_NAME=$SERVICE_API_NAME  # or SERVICE_WEB_NAME

# Connect as Entra admin and grant permissions
# See sql-managed-identity.md for connection patterns
```

### Step 2: Apply EF Core Migrations

Apply Entity Framework migrations to create database schema.

See [EF Core Migrations](ef-migrations.md) for deployment patterns and troubleshooting.

**Quick Options:**

| Method | Command | Use When |
|--------|---------|----------|
| **azd hook** | Add `postprovision` hook in `azure.yaml` | Automated deployments |
| **Manual** | `dotnet ef database update` | One-time or troubleshooting |
| **SQL Script** | `dotnet ef migrations script --idempotent` | Pre-generated scripts |

### Step 3: Verify Deployment

```bash
# Get app endpoint
ENDPOINT=$(azd env get-values | grep SERVICE_.*_URI | cut -d'=' -f2)

# Health check
curl -f "$ENDPOINT/health" || echo "Health check failed"

# Test database connectivity
curl -f "$ENDPOINT/api/test-db" || echo "Database connection failed"
```

**Expected Result:**
- HTTP 200 from health endpoint
- No SQL authentication errors in logs
- Application starts successfully

## Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `Login failed for user '<token-identified principal>'` | Managed identity not granted SQL access | Follow [sql-managed-identity.md](sql-managed-identity.md) |
| `Cannot open database` | Firewall rules block access | Check SQL firewall, ensure "Allow Azure services" enabled |
| `Invalid object name` | Migrations not applied | Run EF migrations per [ef-migrations.md](ef-migrations.md) |
| `No such table` | Schema missing | Apply migrations or check connection string database name |

## Best Practices

1. **Automate with azd hooks** — Add `postprovision` hook to `azure.yaml` for repeatable deployments
2. **Use idempotent scripts** — Generate SQL with `dotnet ef migrations script --idempotent`
3. **Verify incrementally** — Test SQL access, then migrations, then endpoint
4. **Log everything** — Enable verbose logging during initial setup for troubleshooting

## References

- [SQL Managed Identity Access](sql-managed-identity.md)
- [EF Core Migrations](ef-migrations.md)
- [Verification Steps](verify.md)
