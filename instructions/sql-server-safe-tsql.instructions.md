---
description: 'SQL Server-specific write-safety rules for T-SQL: XACT_ABORT with THROW, @@TRANCOUNT-aware transactions, fail-closed dry runs, batched OUTPUT...INTO archiving, autocommit-only admin statements, and read-only DMV diagnostics.'
applyTo: '**/*.sql, **/*.ps1'
---

# SQL Server Production-Safe T-SQL

Apply these rules when writing or reviewing T-SQL, SQL Server Agent jobs, or PowerShell that runs against SQL Server. They complement general SQL style guidance by focusing on what keeps a script safe to run against production-adjacent systems.

## Script header

Start every script with a comment block that states:

- Purpose (one line)
- `COMPAT:` the minimum SQL Server version (for example `SQL Server 2016 SP1+` for `CREATE OR ALTER`) and whether it works on Azure SQL Managed Instance
- `Perms:` the permissions required (for example `VIEW SERVER STATE`, or `VIEW SERVER PERFORMANCE STATE` on SQL Server 2022+)
- Whether the script is read-only or writes data

If you are not sure a syntax or DMV column exists in the target version, say so instead of guessing.

## Required shape for any write (DML or DDL)

- Begin with `SET NOCOUNT ON; SET XACT_ABORT ON;`.
- Wrap transaction-compatible work in `BEGIN TRY ... BEGIN TRANSACTION ... COMMIT ... END TRY BEGIN CATCH ... END CATCH`.
- Some administration statements cannot run inside a user transaction (for example `CREATE DATABASE`, `ALTER DATABASE`, `DROP DATABASE`, `BACKUP`, `RESTORE`, and `RECONFIGURE`). For these, use an autocommit path instead of the transaction wrapper: keep the same dry-run default and confirmation gate, run each statement on its own inside `TRY ... CATCH` with `THROW;`, check state before and after, and write the operation-specific recovery step (for example the backup to restore from, or the previous configuration value to set back).
- In the `CATCH` block, roll back only if a transaction is open, then `THROW;` so the original error number and line reach the caller and Agent job history. Do not swallow errors.
- In single-transaction procedures that may be called inside an outer transaction, check `@@TRANCOUNT` on entry, before any read, and only begin and commit a transaction when it is `0`. If it is `0` and `IMPLICIT_TRANSACTIONS` is ON (`@@OPTIONS & 2`), reject the call before `BEGIN TRANSACTION`, because `BEGIN TRANSACTION` then opens a second level and the single `COMMIT` leaves the write uncommitted with its locks held (for example `IF @@TRANCOUNT = 0 AND (@@OPTIONS & 2) = 2 THROW 50000, N'Run with IMPLICIT_TRANSACTIONS OFF; this procedure owns its transaction.', 1;`). Procedures that commit in batches must refuse to run inside a caller-owned transaction or with `IMPLICIT_TRANSACTIONS ON` (`@@OPTIONS & 2`), because either one keeps every batch's locks and log until an outer commit and lets a later rollback undo earlier batches.
- Default to a dry run that fails closed. In T-SQL, use a `@DryRun bit = 1` parameter and treat anything other than an explicit `0`, including `NULL`, as a dry run (`IF @DryRun IS NULL OR @DryRun <> 0`). The parameter default only covers omitted arguments, so never test `IF @DryRun = 1` alone. The dry run prints or returns what would change (for example a row count) and changes nothing.
- In PowerShell, `SupportsShouldProcess` and `-WhatIf` alone do not make dry run the default. Require an explicit `-Apply` switch that is off by default, and wrap every mutation in `if ($Apply -and $PSCmdlet.ShouldProcess($target, $action)) { ... }`. Without `-Apply`, report what would change and exit.
- Make scripts idempotent: `CREATE OR ALTER`, `IF OBJECT_ID(...) IS NULL`, `IF NOT EXISTS`. Never silently overwrite an existing Agent job, linked server, alert, login, or user; detect it and stop or require an explicit flag.
- Every `UPDATE` and `DELETE` has a selective `WHERE` clause. Batch large changes with a `TOP (N)` loop, one short transaction per batch, and an accumulated row count.
- When moving rows (archive then delete), capture each batch's keys into a freshly cleared key set with `OUTPUT ... INTO`, and delete only the rows proven to be copied in that batch.
- Validate parameters at the top of procedures and return a documented non-zero return code on invalid input.

### Procedure template

```sql
CREATE OR ALTER PROCEDURE dbo.usp_ArchiveOrders
    @OlderThanDays int,
    @BatchSize     int = 1000,
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

    IF @BatchSize IS NULL OR @BatchSize NOT BETWEEN 1 AND 50000
    BEGIN
        RAISERROR(N'@BatchSize must be between 1 and 50000.', 16, 1);
        RETURN 2;
    END;

    -- Batches commit independently, so a caller-owned transaction or
    -- IMPLICIT_TRANSACTIONS ON is not allowed.
    IF @@TRANCOUNT > 0 OR (@@OPTIONS & 2) = 2
    BEGIN
        RAISERROR(N'Run outside a caller transaction with IMPLICIT_TRANSACTIONS OFF; this procedure commits per batch.', 16, 1);
        RETURN 3;
    END;

    DECLARE @Cutoff datetime2(0) = DATEADD(DAY, -@OlderThanDays, SYSDATETIME());
    SET @RowsAffected = 0;

    -- Fail closed: anything other than an explicit 0, including NULL, is a dry run.
    IF @DryRun IS NULL OR @DryRun <> 0
    BEGIN
        SELECT @RowsAffected = COUNT(*) FROM dbo.Orders WHERE Status = 'Closed' AND CreatedAt < @Cutoff;
        PRINT CONCAT(N'DRY RUN: would archive ', @RowsAffected, N' rows in batches of ', @BatchSize, N'.');
        RETURN 0;
    END;

    DECLARE @moved TABLE (OrderId int PRIMARY KEY);
    DECLARE @BatchRows int = 1;

    BEGIN TRY
        WHILE @BatchRows > 0
        BEGIN
            DELETE FROM @moved;  -- fresh key set for every batch

            BEGIN TRANSACTION;

            INSERT dbo.OrdersArchive (OrderId, Status, CreatedAt)
            OUTPUT inserted.OrderId INTO @moved (OrderId)
            SELECT TOP (@BatchSize) o.OrderId, o.Status, o.CreatedAt
            FROM dbo.Orders o WITH (UPDLOCK)
            WHERE o.Status = 'Closed' AND o.CreatedAt < @Cutoff
            ORDER BY o.OrderId;

            DELETE o FROM dbo.Orders o JOIN @moved m ON m.OrderId = o.OrderId;
            SET @BatchRows = @@ROWCOUNT;

            COMMIT TRANSACTION;
            SET @RowsAffected += @BatchRows;
        END;
        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;  -- rolls back only the failing batch
        THROW;
    END CATCH;
END;
```

The default `@BatchSize` is 1000; tune larger values, because a batch that takes thousands of locks can escalate to a table lock that blocks other sessions.

On failure, earlier batches stay committed and the error is rethrown. Because the error is rethrown, SQL Server does not copy `@RowsAffected` back to the caller, so treat it as reliable only on successful completion; to see partial progress, count the archive table or log each batch before rethrowing. A rerun picks up the remaining qualifying rows.

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
- For orphaned users, restrict detection to instance-authenticated SQL users (`type = 'S'` and `authentication_type = 1` in `sys.database_principals`) whose SID has no matching row in `sys.server_principals`. Exclude system principals (`dbo`, `guest`, `INFORMATION_SCHEMA`, `sys`). Users created `WITHOUT LOGIN`, contained database users, and Windows users intentionally have no matching SQL login and are not orphans.
- Keep orphaned-user detection read-only. Any repair is a separate, dry-run-first script that requires a confirmed user-to-login mapping, uses `ALTER USER ... WITH LOGIN = ...`, never creates logins, and never drops users.
