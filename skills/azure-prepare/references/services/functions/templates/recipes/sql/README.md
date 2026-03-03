# Azure SQL Recipe

Adds Azure SQL Database trigger and output bindings to an Azure Functions base template.

## Overview

This recipe creates functions that respond to row changes in Azure SQL Database tables and write data back using output bindings.

## Integration Type

| Aspect | Value |
|--------|-------|
| **Trigger** | `SqlTrigger` (change tracking) |
| **Output** | `SqlOutput` (insert/upsert) |
| **Auth** | Entra ID (Managed Identity) |
| **IaC** | ✅ Full template available |

## AZD Templates (Recommended)

Use these templates directly instead of composing from HTTP base:

| Language | Template |
|----------|----------|
| Python | `azd init -t functions-quickstart-python-azd-sql` |
| TypeScript | `azd init -t functions-quickstart-typescript-azd-sql` |
| C# (.NET) | `azd init -t functions-quickstart-dotnet-azd-sql` |

## Composition Steps (Alternative)

If composing from HTTP base template:

| # | Step | Details |
|---|------|---------|
| 1 | **Add IaC** | Add SQL Server, Database, firewall rules from `bicep/` |
| 2 | **Add extension** | Add SQL binding extension package |
| 3 | **Enable change tracking** | Run SQL script to enable on table |
| 4 | **Replace source code** | Add trigger + output from `source/{lang}.md` |
| 5 | **Configure app settings** | Add `AZURE_SQL_CONNECTION_STRING_KEY` |

## Extension Packages

| Language | Package |
|----------|---------|
| Python | `azure-functions` (built-in) |
| TypeScript/JavaScript | `@azure/functions` (built-in) |
| C# (.NET) | `Microsoft.Azure.Functions.Worker.Extensions.Sql` |

## Required App Settings

```bicep
AZURE_SQL_CONNECTION_STRING_KEY: 'Server=${sqlServer.properties.fullyQualifiedDomainName};Database=${database.name};Authentication=Active Directory Managed Identity;User Id=${uamiClientId}'
```

> **Note:** SQL uses connection string format with `Authentication=Active Directory Managed Identity`

## Files

| Path | Description |
|------|-------------|
| [bicep/sql.bicep](bicep/sql.bicep) | Bicep module for SQL Server + Database |
| [terraform/sql.tf](terraform/sql.tf) | Terraform module for SQL Server + Database |
| [source/python.md](source/python.md) | Python SQL trigger + output |
| [source/typescript.md](source/typescript.md) | TypeScript SQL trigger + output |
| [source/javascript.md](source/javascript.md) | JavaScript SQL trigger + output |
| [source/dotnet.md](source/dotnet.md) | C# (.NET) SQL trigger + output |
| [source/java.md](source/java.md) | Java SQL trigger + output |
| [source/powershell.md](source/powershell.md) | PowerShell SQL trigger + output |
| [eval/summary.md](eval/summary.md) | Evaluation summary |
| [eval/python.md](eval/python.md) | Python evaluation results |

## SQL Change Tracking

The SQL trigger requires change tracking enabled on the table:

```sql
-- Enable change tracking on database
ALTER DATABASE [YourDatabase] SET CHANGE_TRACKING = ON;

-- Enable on specific table
ALTER TABLE [dbo].[ToDo] ENABLE CHANGE_TRACKING;
```

## Common Issues

### Trigger Not Firing

**Cause:** Change tracking not enabled on table.

**Solution:** Run the SQL scripts above to enable change tracking.

### Connection String Format Error

**Cause:** Using service endpoint format instead of connection string.

**Solution:** SQL bindings require full connection string with `Authentication=Active Directory Managed Identity`.

### Firewall Blocked

**Cause:** Function App IP not allowed through SQL firewall.

**Solution:** Add Function App outbound IPs to SQL firewall rules or use VNet integration with private endpoint.
