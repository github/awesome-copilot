---
description: 'Production-safe T-SQL and SQL Server administration conventions: transactional write templates, dry-run defaults, confirmation gates for destructive operations, read-only DMV diagnostics, and least-privilege scheduling.'
applyTo: '**/*.sql, **/*.ps1'
---

# SQL Server Production-Safe T-SQL

Apply these rules when writing or reviewing T-SQL, SQL Server Agent jobs, or PowerShell that runs against SQL Server. They complement general SQL style guidance by focusing on what keeps a script safe to run against production-adjacent systems.

## Tooling preferences

- Prefer set-based T-SQL, stored procedures, and DMVs over row-by-row or client-side logic.
- Schedule recurring work with SQL Server Agent jobs (T-SQL, CmdExec, or PowerShell job steps).
- For cross-server work, use linked servers (`OPENQUERY`, `EXEC ... AT`) and test them with `sp_testlinkedserver` before use.
- For PowerShell, use the `SqlServer` module (`Invoke-Sqlcmd`). Treat dbatools as optional, never required.

## Script header

Start every script with a comment block that states:

- Purpose (one line)
- `COMPAT:` the minimum SQL Server version (for example `SQL Server 2016 SP1+` for `CREATE OR ALTER`) and whether it works on Azure SQL Managed Instance
- `Perms:` the permissions required (for example `VIEW SERVER STATE`, or `VIEW SERVER PERFORMANCE STATE` on SQL Server 2022+)
- Whether the script is read-only or writes data

If you are not sure a syntax or DMV column exists in the target version, say so instead of guessing.

## Required shape for any write (DML or DDL)

- Begin with `SET NOCOUNT ON; SET XACT_ABORT ON;`.
- Wrap work in `BEGIN TRY ... BEGIN TRANSACTION ... COMMIT ... END TRY BEGIN CATCH ... END CATCH`.
- In the `CATCH` block, roll back only if a transaction is open, then `THROW;` so the original error number and line reach the caller and Agent job history. Do not swallow errors.
- In procedures that may be called inside an outer transaction, only begin and commit a transaction when `@@TRANCOUNT = 0` on entry.
- Default to a dry run: a `@DryRun bit = 1` parameter in T-SQL, or `SupportsShouldProcess` / `-WhatIf` in PowerShell. The dry run prints or returns what would change (for example a row count) and changes nothing.
- Make scripts idempotent: `CREATE OR ALTER`, `IF OBJECT_ID(...) IS NULL`, `IF NOT EXISTS`. Never silently overwrite an existing Agent job, linked server, alert, login, or user; detect it and stop or require an explicit flag.
- Every `UPDATE` and `DELETE` has a selective `WHERE` clause. Batch large changes with a `TOP (N)` loop and short transactions.
- When moving rows (archive then delete), capture affected keys with `OUTPUT ... INTO` and delete only the rows proven to be copied.
- Validate parameters at the top of procedures and return a documented non-zero return code on invalid input.

### Procedure template

```sql
CREATE OR ALTER PROCEDURE dbo.usp_ArchiveOrders
    @OlderThanDays int,
    @DryRun        bit = 1,
    @RowsAffected  int = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @OlderThanDays IS NULL OR @OlderThanDays < 1
    BEGIN
        RAISERROR(N'@OlderThanDays must be >= 1.', 16, 1);
        RETURN 1;
    END;

    DECLARE @Cutoff datetime2(0) = DATEADD(DAY, -@OlderThanDays, SYSDATETIME());

    IF @DryRun = 1
    BEGIN
        SELECT @RowsAffected = COUNT(*) FROM dbo.Orders WHERE Status = 'Closed' AND CreatedAt < @Cutoff;
        PRINT CONCAT(N'DRY RUN: would archive ', @RowsAffected, N' rows.');
        RETURN 0;
    END;

    DECLARE @StartedTran bit = 0;
    BEGIN TRY
        IF @@TRANCOUNT = 0 BEGIN BEGIN TRANSACTION; SET @StartedTran = 1; END;

        DECLARE @moved TABLE (OrderId int PRIMARY KEY);

        INSERT dbo.OrdersArchive (OrderId, Status, CreatedAt)
        OUTPUT inserted.OrderId INTO @moved
        SELECT o.OrderId, o.Status, o.CreatedAt
        FROM dbo.Orders o WITH (UPDLOCK, HOLDLOCK)
        WHERE o.Status = 'Closed' AND o.CreatedAt < @Cutoff;

        DELETE o FROM dbo.Orders o JOIN @moved m ON m.OrderId = o.OrderId;
        SET @RowsAffected = @@ROWCOUNT;

        IF @StartedTran = 1 COMMIT TRANSACTION;
        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @StartedTran = 1 AND @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
```

## Ask before generating destructive or risky operations

Stop and ask for explicit confirmation, stating the data-loss or availability impact, before producing any of:

- `DROP`, `TRUNCATE`, `ALTER TABLE ... DROP COLUMN`, or column type narrowing
- `UPDATE` or `DELETE` without a selective predicate
- `KILL`, or `DBCC` repair options
- Enabling `xp_cmdshell`, Ole Automation, or CLR
- Server-level configuration changes (for example `max server memory`)
- Disabling constraints or triggers

Before any data-loss operation, state what should be backed up, where, and how to restore it. Include rollback steps for every change.

## Diagnostics are read-only

- Diagnostic queries against DMVs (blocking chains, wait statistics, expensive queries, orphaned users, linked server checks) must not change state. Label them `READ-ONLY` in the header.
- For blocking, identify head blockers (sessions that block others but are not blocked themselves) and show the chain with `sys.dm_exec_sessions`, `sys.dm_exec_requests`, and `sys.dm_exec_sql_text`. Do not issue `KILL`; if the user decides to, tell them to record the session id and reason, and that `KILL` rolls back the open transaction.
- For wait statistics, capture two snapshots of `sys.dm_os_wait_stats` and report the delta, excluding benign idle waits, rather than reporting cumulative values since startup.
- For orphaned users, list database users whose SID has no matching server login, and remap with `ALTER USER ... WITH LOGIN = ...` (dry run first) rather than dropping them.

## Security and least privilege

- Grant `EXECUTE` on procedures or schemas to roles; do not grant `db_owner` to application logins.
- Use dynamic SQL only through `sp_executesql` with parameters, and wrap identifiers with `QUOTENAME`.
- Run Agent job steps that need OS access under a proxy account instead of enabling `xp_cmdshell`. If checking `xp_cmdshell`, report its state; do not enable it without confirmation.
- Never put passwords in `.sql` or `.ps1` files. Use Windows or Microsoft Entra ID authentication, `Get-Credential`, or a secret store.
- Define failure notification or logging for every scheduled Agent job.

## Review checklist before applying generated T-SQL to production

- Header states purpose, minimum version, and required permissions.
- Target server and database are the intended ones.
- The dry run was executed and its output matches intent.
- Every `UPDATE`/`DELETE` has a selective `WHERE`, and large changes are batched.
- Dynamic SQL is parameterized and identifiers are quoted.
- No `SELECT *` in procedures that form an interface contract.
- No `DROP`/`TRUNCATE`/`KILL`/configuration change unless explicitly requested and backed up.
- Rollback steps are written down.
- Existing objects are not silently overwritten.
- No secrets in the script or in source control.

## Reference

Adapted from the MIT-licensed [sqlrig-free](https://github.com/scottkcoffey-a11y/sqlrig-free) scripts and guardrails, which include runnable versions of the diagnostics and templates described above.
