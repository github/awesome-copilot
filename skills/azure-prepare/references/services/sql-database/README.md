# Azure SQL Database

Managed relational database with ACID compliance and full SQL Server compatibility.

## When to Use

- Relational data with ACID requirements
- Complex queries and joins
- Existing SQL Server workloads
- Reporting and analytics
- Strong schema enforcement

## Authentication

**Default:** Entra-only authentication (recommended)
- Required for subscriptions with Entra-only policies
- More secure than SQL authentication
- Eliminates password management

## Required Supporting Resources

| Resource | Purpose |
|----------|---------|
| Key Vault | Store connection strings |
| Private Endpoint | Secure access (optional) |

## SKU Selection

| Tier | Use Case | Features |
|------|----------|----------|
| **Basic** | Dev/test, light workloads | 5 DTUs, 2GB |
| **Standard** | Production workloads | 10-3000 DTUs |
| **Premium** | High-performance | In-memory OLTP |
| **Serverless** | Variable workloads | Auto-pause, auto-scale |
| **Hyperscale** | Large databases | 100TB+, instant backup |

## Environment Variables

| Variable | Value | When to Set |
|----------|-------|-------------|
| `AZURE_PRINCIPAL_ID` | Current user's object ID | After `azd init`, before `azd provision` |
| `AZURE_PRINCIPAL_NAME` | Current user's display name | After `azd init`, before `azd provision` |
| `SQL_SERVER` | `{server}.database.windows.net` | Runtime (from Bicep outputs) |
| `SQL_DATABASE` | Database name | Runtime (from Bicep outputs) |
| `SQL_CONNECTION_STRING` | Full connection string (Key Vault) | Runtime (from Bicep outputs) |

**Set principal variables:**
```bash
PRINCIPAL_INFO=$(az ad signed-in-user show --query "{id:id, name:displayName}" -o json)
azd env set AZURE_PRINCIPAL_ID $(echo $PRINCIPAL_INFO | jq -r '.id')
azd env set AZURE_PRINCIPAL_NAME $(echo $PRINCIPAL_INFO | jq -r '.name')
```

## References

- [Bicep Patterns](bicep.md)
- [Entra ID Auth](auth.md)
- [SDK Patterns](sdk.md)
