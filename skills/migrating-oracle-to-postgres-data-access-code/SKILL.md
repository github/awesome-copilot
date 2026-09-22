---
name: migrating-oracle-to-postgres-data-access-code
description: 'Migrates .NET/C# data access code from Oracle to PostgreSQL (Npgsql). Replaces Oracle NuGet packages, rewrites OracleConnection/OracleCommand/OracleDataReader usage, fixes DbType mappings, updates stored procedure invocation patterns, and adapts connection string configuration. Use when migrating the application code layer of a .NET project during an Oracle-to-PostgreSQL database migration.'
---

# Migrating .NET Data Access Code from Oracle to PostgreSQL

Migrate the C# data access layer of a single `.Postgres`-copy project from Oracle (Oracle.ManagedDataAccess) to PostgreSQL (Npgsql). Work item by item through `Reports/{ProjectName}/MigrationChecklist.md`.

## Prerequisites

- The `.Postgres` project copy exists (created in Phase 5 setup).
- `Reports/{ProjectName}/MigrationChecklist.md` exists and is the source of truth for what to change.
- `Reports/{ProjectName}/OracleRiskAnalysis.md` exists for cross-referencing behavioral differences.

## Workflow

```
Progress:
- [ ] Step 1: Replace NuGet packages
- [ ] Step 2: Update connection string configuration
- [ ] Step 3: Rewrite ADO.NET type references
- [ ] Step 4: Fix DbType mappings
- [ ] Step 5: Migrate stored procedure invocation
- [ ] Step 6: Address Oracle-specific SQL and syntax
- [ ] Step 7: Build and verify
```

**Step 1: Replace NuGet packages**

In the `.csproj` of the `.Postgres` project:

- Remove: `Oracle.ManagedDataAccess.Core`, `Oracle.EntityFrameworkCore` (and any other `Oracle.*` packages)
- Add: `Npgsql` (for ADO.NET) and/or `Npgsql.EntityFrameworkCore.PostgreSQL` (for EF Core)
- Keep version pinning consistent with the target .NET version; do not introduce newer package versions than what the solution already uses for similar packages.
- If `System.Data` abstractions (`IDbConnection`, `IDbCommand`) are used project-wide, the surface-level code may need fewer changes — identify them first.

**Step 2: Update connection string configuration**

- Locate the Oracle connection string in `appsettings.json`, `appsettings.{env}.json`, `web.config`, `app.config`, or environment variable configuration.
- Replace with a Npgsql-compatible connection string: `Host=localhost;Port=5432;Database=mydb;Username=myuser;Password=mypassword`
- Do not hardcode credentials — use the same configuration mechanism already in use (e.g., environment variables, secrets manager, `IConfiguration`).
- Update any named connection string keys only if they were Oracle-specific (e.g., `OracleConnection`). Prefer keeping the same key name to minimize application config changes.

**Step 3: Rewrite ADO.NET type references**

Replace Oracle-specific ADO.NET types with Npgsql equivalents:

| Oracle type | Npgsql replacement |
|---|---|
| `OracleConnection` | `NpgsqlConnection` |
| `OracleCommand` | `NpgsqlCommand` |
| `OracleDataReader` | `NpgsqlDataReader` |
| `OracleDataAdapter` | `NpgsqlDataAdapter` |
| `OracleParameter` | `NpgsqlParameter` |
| `OracleTransaction` | `NpgsqlTransaction` |
| `OracleException` | `NpgsqlException` |
| `OracleDbType` | `NpgsqlDbType` (from `NpgsqlTypes` namespace) |

Update `using` directives accordingly (`using Oracle.ManagedDataAccess.Client` → `using Npgsql`).

If the codebase uses `IDbConnection`/`IDbCommand` abstractions registered via DI, update only the DI registration and connection string — the consuming code may not need changes.

**Step 4: Fix DbType and NpgsqlDbType mappings**

Oracle parameter types do not map 1:1 to Npgsql. Review every `OracleParameter` (now `NpgsqlParameter`) that sets an explicit type:

| Oracle type | Notes |
|---|---|
| `OracleDbType.Varchar2` | Use `NpgsqlDbType.Varchar` or omit (Npgsql infers from value) |
| `OracleDbType.Clob` | Use `NpgsqlDbType.Text` |
| `OracleDbType.Number` | Use `NpgsqlDbType.Numeric` or `NpgsqlDbType.Integer` depending on precision |
| `OracleDbType.Date` | Use `NpgsqlDbType.Date` (date only) or `NpgsqlDbType.Timestamp` (if time component used) |
| `OracleDbType.TimeStamp` | Use `NpgsqlDbType.Timestamp` |
| `OracleDbType.RefCursor` | Use `NpgsqlDbType.Refcursor` — see Step 5 |
| `OracleDbType.Char` | Use `NpgsqlDbType.Char` |

For parameters where Oracle inferred the type from the value, Npgsql also infers — explicit type setting is often unnecessary and can be removed.

**Step 5: Migrate stored procedure invocation**

Oracle and PostgreSQL stored procedure invocation differ significantly:

- **Command type**: Retain `CommandType.StoredProcedure` for function calls. For procedures that use `OUT` parameters, PostgreSQL requires `CommandType.Text` with `CALL proc_name(...)` syntax in some versions of Npgsql — verify against the target Npgsql version.
- **RefCursor handling**: Oracle returns ref cursors as output parameters; PostgreSQL returns them differently:
  - For `RETURNS TABLE` / `RETURNS SETOF`, use `ExecuteReader()` directly — no cursor parameter needed.
  - For `RETURNS refcursor`, call within a transaction, read the cursor name from the output parameter, then issue `FETCH ALL IN "<cursor_name>"`.
  - Remove any Oracle-specific cursor-wrapping code (e.g., `OracleRefCursor`).
- **OUT parameters**: PostgreSQL stored procedures use `INOUT` or function return values. Verify parameter direction matches the migrated procedure signature.
- **Sequence `NEXTVAL`**: Replace `SELECT {SEQUENCE}.NEXTVAL FROM DUAL` with `SELECT nextval('{sequence_name}')`.
- **Named parameters**: Npgsql uses `@param_name`; Oracle used `:param_name`. Update all parameter name prefixes.

**Step 6: Address Oracle-specific SQL and C# patterns**

Review inline SQL strings and query builders for Oracle-specific constructs and replace:

| Oracle construct | PostgreSQL replacement |
|---|---|
| `ROWNUM <= n` | `LIMIT n` |
| `ROWNUM = 1` | `LIMIT 1` |
| `NVL(x, y)` | `COALESCE(x, y)` |
| `DECODE(expr, v1, r1, ...)` | `CASE WHEN expr = v1 THEN r1 ... END` |
| `SYSDATE` / `SYSTIMESTAMP` | `NOW()` or `CURRENT_TIMESTAMP` |
| `TO_CHAR(date, fmt)` | `TO_CHAR(date, fmt)` (mostly compatible; verify format strings) |
| `TO_DATE(str, fmt)` | `TO_DATE(str, fmt)` (verify format strings) |
| `TO_NUMBER(str)` | `CAST(str AS NUMERIC)` or `str::NUMERIC` |
| `||` string concat | `||` (compatible) |
| `DUAL` table | Remove `FROM DUAL`; PostgreSQL evaluates `SELECT expr` without a table |
| `CONNECT BY` hierarchy | Rewrite using recursive CTEs (`WITH RECURSIVE`) |
| `MERGE INTO` | Rewrite as `INSERT ... ON CONFLICT DO UPDATE` |
| Empty string `''` as NULL | Oracle treats `''` as NULL; PostgreSQL does not — check comparisons and `IS NULL` guards |
| `VARCHAR2` | `VARCHAR` or `TEXT` |

**Step 7: Build and verify**

After addressing all checklist items:

1. Run `dotnet build` on the `.Postgres` project. Fix any remaining compilation errors.
2. Verify no Oracle-specific namespaces remain: search for `Oracle.ManagedDataAccess`, `OracleConnection`, `OracleCommand`, `:param` patterns.
3. Mark completed items in `Reports/{ProjectName}/MigrationChecklist.md`.

## EF Core projects

If the project uses `Oracle.EntityFrameworkCore`:

- Replace the provider registration in `DbContext` configuration: `.UseOracle(...)` → `.UseNpgsql(...)`
- Replace `OracleDbContextOptionsBuilder` references.
- Review `OnModelCreating` for Oracle-specific configurations (e.g., `HasColumnType("NUMBER")` → `HasColumnType("numeric")`).
- Sequence configuration: `modelBuilder.HasSequence<int>("seq_name").StartsAt(1).IncrementsBy(1)` syntax is compatible; verify column defaults referencing sequences.
- Do not run EF Core migrations — schema is managed externally via DDL scripts (Phase 4).

## Key Constraints

- Work only within the `.Postgres` copy — never modify the original Oracle-targeting project.
- Keep to existing .NET and C# versions; do not introduce newer language or runtime features.
- Preserve comments and application logic; change only what is necessary for PostgreSQL compatibility.
- Oracle is the source of truth — behavioral differences must be documented as bug reports, not silently altered.
