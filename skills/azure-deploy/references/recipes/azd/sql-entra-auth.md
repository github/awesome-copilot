# SQL Database Entra Authentication

Quick reference for Azure SQL Database Entra authentication in post-deployment scenarios.

## Prerequisites

Azure SQL Server must be configured with Entra-only authentication during provisioning. The signed-in user must be set as Entra admin:

```bicep
properties: {
  administrators: {
    administratorType: 'ActiveDirectory'
    principalType: 'User'
    login: principalName
    sid: principalId
    tenantId: subscription().tenantId
    azureADOnlyAuthentication: true
  }
}
```

## Connection Patterns

### Azure CLI (Recommended for Scripts)

```bash
az sql db query \
  --server "$SQL_SERVER" \
  --database "$SQL_DATABASE" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --auth-mode ActiveDirectoryDefault \
  --queries "SELECT 1"
```

### Connection Strings

**For .NET applications with managed identity:**

```
Server=tcp:{server}.database.windows.net,1433;Database={database};Authentication=Active Directory Default;Encrypt=True;
```

**Required packages:**
- `Microsoft.Data.SqlClient` (v5.1.0+)
- `Azure.Identity` (for local development)

## Database Roles

| Role | Permissions | Use For |
|------|------------|---------|
| `db_datareader` | SELECT | Read operations |
| `db_datawriter` | INSERT, UPDATE, DELETE | Write operations |
| `db_ddladmin` | CREATE, ALTER, DROP schema | EF migrations |
| `db_owner` | Full control | Admin (use sparingly) |

## Grant Managed Identity Access

```sql
-- Create user from managed identity
CREATE USER [app-name] FROM EXTERNAL PROVIDER;

-- Grant standard application permissions
ALTER ROLE db_datareader ADD MEMBER [app-name];
ALTER ROLE db_datawriter ADD MEMBER [app-name];
ALTER ROLE db_ddladmin ADD MEMBER [app-name];
```

> 💡 **Tip:** The managed identity name matches the App Service or Container App name.

## Verify Current Admin

```bash
az sql server ad-admin list \
  --server "$SQL_SERVER" \
  --resource-group "$AZURE_RESOURCE_GROUP"
```

## References

- [SQL Managed Identity Access](sql-managed-identity.md)
- [EF Core Migrations](ef-migrations.md)
- [Post-Deployment Guide](post-deployment.md)
