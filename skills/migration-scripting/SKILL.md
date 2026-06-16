---
name: 'migration-scripting'
description: 'Skill to produce DDL/DML scripts with rollback, validations and deployment plan by environment'
---

# Generation of Secure Migration Scripts

## Purpose
Produce schema or data change scripts that include explicit rollback, pre/post validations and secure deployment plan.

## Entries
- Description of the desired change
- Schema/tables affected
- Target environments (dev/staging/prod)

## Departures
- Rollout script with transaction and validation
- Rollback script
- Pre-migration and post-migration checklist
- Time estimate and maintenance window
- Go/no-go criteria

## Standard Script Structure

```sql
-- ============================================================
-- MIGRATION: [change description]
-- Author: [name]  Date: [date]
-- Environment: [dev/staging/prod]
-- Estimate: [X minutes]
-- ============================================================

-- PRE-CHECK: validate state before applying
-- [validation queries]

BEGIN TRANSACTION;
BEGIN TRY

    -- MAIN CHANGE
    -- [DDL/DML here]

    -- POST-CHECK: validate that change was applied correctly
    -- [verification queries]

    COMMIT TRANSACTION;
    PRINT 'Migration applied successfully.';

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT 'Error: ' + ERROR_MESSAGE();
    THROW;
END CATCH;

-- ============================================================
-- ROLLBACK (run only if rollback is needed)
-- ============================================================
-- BEGIN TRANSACTION;
-- [rollback DDL/DML]
-- COMMIT TRANSACTION;
```

## Pre-Migration Checklist
- [ ] Recent verified backup
- [ ] Script tested in lower environment
- [ ] Communicated maintenance window
- [ ] Rollback ready and tested
- [ ] Revised dependency impact

## Post-Migration Checklist
- [ ] Data validations completed
- [ ] Verified performance
- [ ] Tested dependencies
- [ ] Updated documentation

## Quality Checklist
- [ ] All migration within a transaction with rollback
- [ ] Pre-checks and post-checks included
- [ ] Large data volumes processed in batches
- [ ] Idempotent script when possible
