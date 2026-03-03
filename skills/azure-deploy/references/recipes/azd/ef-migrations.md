# EF Core Migrations Deployment

Apply Entity Framework Core migrations to Azure SQL Database after deployment.

## Detection

EF Core projects contain `Migrations/` folder or `Microsoft.EntityFrameworkCore` package reference in `.csproj`.

```bash
find . -type d -name "Migrations" 2>/dev/null
find . -name "*.csproj" -exec grep -l "Microsoft.EntityFrameworkCore" {} \;
```

## Deployment Methods

### Method 1: azd Hook (Recommended)

Automate via `postprovision` hook in `azure.yaml`:

```yaml
hooks:
  postprovision:
    shell: sh
    run: ./scripts/apply-migrations.sh
```

**scripts/apply-migrations.sh:**

```bash
#!/bin/bash
set -e
eval $(azd env get-values)
CONNECTION_STRING="Server=tcp:${SQL_SERVER}.database.windows.net,1433;Database=${SQL_DATABASE};Authentication=Active Directory Default;Encrypt=True;"
cd src/api  # Adjust path
dotnet ef database update --connection "$CONNECTION_STRING"
```

> 💡 Make executable: `chmod +x scripts/*.sh`. For PowerShell: Use `azd env get-values | ForEach-Object` pattern.

### Method 2: SQL Script (Production)

Generate idempotent script for review before applying:

```bash
dotnet ef migrations script --idempotent --output migrations.sql
az sql db query --server "$SQL_SERVER" --database "$SQL_DATABASE" \
  --auth-mode ActiveDirectoryDefault --queries "$(cat migrations.sql)"
```

### Method 3: Application Startup (Dev Only)

⚠️ **Development only** — production should use explicit migration steps.

```csharp
// Program.cs
if (app.Environment.IsDevelopment()) {
    using var scope = app.Services.CreateScope();
    scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Database.Migrate();
}
```

## Combined Hook: SQL Access + Migrations

Combine both steps — see [sql-managed-identity.md](sql-managed-identity.md) for SQL grant commands.

```bash
#!/bin/bash
set -e
eval $(azd env get-values)

# Grant SQL access
az sql db query --server "$SQL_SERVER" --database "$SQL_DATABASE" \
  --auth-mode ActiveDirectoryDefault --queries "
    IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = '$SERVICE_API_NAME')
      CREATE USER [$SERVICE_API_NAME] FROM EXTERNAL PROVIDER;
    
    IF NOT EXISTS (
      SELECT 1 FROM sys.database_role_members drm
      JOIN sys.database_principals r ON drm.role_principal_id = r.principal_id
      JOIN sys.database_principals m ON drm.member_principal_id = m.principal_id
      WHERE r.name = 'db_datareader' AND m.name = '$SERVICE_API_NAME'
    )
      ALTER ROLE db_datareader ADD MEMBER [$SERVICE_API_NAME];
    
    IF NOT EXISTS (
      SELECT 1 FROM sys.database_role_members drm
      JOIN sys.database_principals r ON drm.role_principal_id = r.principal_id
      JOIN sys.database_principals m ON drm.member_principal_id = m.principal_id
      WHERE r.name = 'db_datawriter' AND m.name = '$SERVICE_API_NAME'
    )
      ALTER ROLE db_datawriter ADD MEMBER [$SERVICE_API_NAME];
    
    IF NOT EXISTS (
      SELECT 1 FROM sys.database_role_members drm
      JOIN sys.database_principals r ON drm.role_principal_id = r.principal_id
      JOIN sys.database_principals m ON drm.member_principal_id = m.principal_id
      WHERE r.name = 'db_ddladmin' AND m.name = '$SERVICE_API_NAME'
    )
      ALTER ROLE db_ddladmin ADD MEMBER [$SERVICE_API_NAME];
  "

# Apply migrations
cd src/api
CONNECTION_STRING="Server=tcp:${SQL_SERVER}.database.windows.net,1433;Database=${SQL_DATABASE};Authentication=Active Directory Default;Encrypt=True;"
dotnet ef database update --connection "$CONNECTION_STRING"
```

## Prerequisites

Install EF Core tools:

```bash
dotnet tool install --global dotnet-ef
dotnet ef --version  # Verify installation
```

## Connection String

```
Server=tcp:{server}.database.windows.net,1433;Database={database};Authentication=Active Directory Default;Encrypt=True;
```

## Troubleshooting

| Error | Solution |
|-------|----------|
| Cannot open database | Check firewall rules: `az sql server firewall-rule list` |
| Login failed | Grant SQL access per [sql-managed-identity.md](sql-managed-identity.md) |
| Unable to create DbContext | Add `IDesignTimeDbContextFactory` implementation |
| Hook fails but deployment continues | Remove `|| true` to make migrations block deployment |

**DbContext Factory Example:**

```csharp
public class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext> {
    public ApplicationDbContext CreateDbContext(string[] args) {
        var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
        var connectionString = Environment.GetEnvironmentVariable("CONNECTION_STRING") 
            ?? args.FirstOrDefault() ?? "Server=(localdb)\\mssqllocaldb;Database=MyDb;Trusted_Connection=True;";
        optionsBuilder.UseSqlServer(connectionString);
        return new ApplicationDbContext(optionsBuilder.Options);
    }
}
```

## Best Practices

- Use `--idempotent` flag for production scripts
- Version control Migrations/ folder
- Test locally before deploying
- Backup production databases before applying
- Keep migrations small and focused

## References

- [SQL Managed Identity Access](sql-managed-identity.md)
- [Post-Deployment Guide](post-deployment.md)
- [EF Core Migrations](https://learn.microsoft.com/ef/core/managing-schemas/migrations/)
