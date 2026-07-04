---
name: database-migration-reviewer
description: 'Review database schema migrations for destructive operations, locking risks, and rollback safety before they reach production. Use when the user asks to review a migration file, mentions ALTER TABLE safety, zero-downtime schema changes, or migrations from tools like Flyway, Liquibase, Alembic, Prisma, EF Core, or Rails.'
license: MIT
---

# Database Migration Reviewer

Review schema migration files and classify each operation by risk, so destructive or table-locking changes are caught before deployment.

## When to Use This Skill

Use this skill when you need to:
- Review a new migration file before merging
- Audit a migrations folder for unsafe patterns
- Plan a zero-downtime schema change (expand/contract)
- Write or verify a rollback (down) migration

## Review Workflow

1. **Identify the engine and tool** (PostgreSQL/MySQL/SQL Server; Flyway, Liquibase, Alembic, Prisma, EF Core, Rails, raw SQL).
2. **Classify every statement** using the risk table below.
3. **Check rollback**: does a down migration exist, and can the up migration's data loss actually be reversed?
4. **Check lock impact**: estimate table size sensitivity; long locks on hot tables are release blockers.
5. **Report** findings ordered by severity, each with a concrete safer rewrite.

## Risk Classification

| Severity | Operations |
|---|---|
| 🔴 Blocker | `DROP TABLE`/`DROP COLUMN` without prior deprecation, `TRUNCATE`, type changes that rewrite the table, renaming columns/tables still used by running code |
| 🟠 High | Adding `NOT NULL` without default on a populated table, `CREATE INDEX` without `CONCURRENTLY` (PostgreSQL) on large tables, adding a foreign key with immediate validation, `UPDATE`/`DELETE` without `WHERE` |
| 🟡 Medium | Wide `ALTER TABLE` on hot tables during peak hours, missing down migration, mixing DDL and data backfill in one transaction |
| 🟢 Safe | `CREATE TABLE`, adding a nullable column, adding a column with a non-volatile default (PostgreSQL 11+), `CREATE INDEX CONCURRENTLY` |

## Safer Rewrites

### Adding a NOT NULL column (PostgreSQL)

```sql
-- Instead of: ALTER TABLE orders ADD COLUMN status text NOT NULL;
ALTER TABLE orders ADD COLUMN status text;                 -- 1. nullable, instant
UPDATE orders SET status = 'pending' WHERE status IS NULL; -- 2. backfill in batches
ALTER TABLE orders ALTER COLUMN status SET NOT NULL;       -- 3. brief validation lock
```

### Renaming a column with zero downtime (expand/contract)

1. Add the new column; deploy code writing to **both** columns.
2. Backfill old rows in batches.
3. Deploy code reading from the new column only.
4. Drop the old column in a later release.

### Index creation on a large table (PostgreSQL)

```sql
-- Instead of: CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX CONCURRENTLY idx_orders_user ON orders(user_id);
-- Note: cannot run inside a transaction block; configure the migration tool accordingly.
```

## Output Format

For each finding report: **severity**, **file/statement**, **why it is risky**, and a **safer rewrite**. End with a verdict: `APPROVE`, `APPROVE WITH CHANGES`, or `BLOCK`.

## Guidelines

1. **Assume production-sized tables** - a migration that is instant in dev can lock a 100M-row table for minutes.
2. **One concern per migration** - flag migrations mixing unrelated schema changes; they complicate rollback.
3. **Down migrations must restore data shape, not data** - be explicit when dropped data is unrecoverable.
4. **Respect the tool's transaction model** - e.g. MySQL DDL is not transactional; a mid-migration failure leaves partial state.

## Limitations

- Cannot know actual table sizes or traffic; ask the user when severity depends on it.
- NoSQL schema-on-read migrations (Mongo, Dynamo) need application-level review instead.
