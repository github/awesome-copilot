---
name: migrating-oracle-to-postgres-stored-procedures
description: 'Migrates Oracle PL/SQL stored procedures to PostgreSQL PL/pgSQL. Translates Oracle-specific syntax, preserves method signatures and type-anchored parameters, leverages orafce where appropriate, and applies COLLATE "C" for Oracle-compatible text sorting. Use when converting Oracle stored procedures or functions to PostgreSQL equivalents during a database migration.'
---

# Migrating Stored Procedures from Oracle to PostgreSQL

Translate Oracle PL/SQL stored procedures and functions to PostgreSQL PL/pgSQL equivalents.

## Workflow

```
Progress:
- [ ] Step 1: Read the Oracle source procedure
- [ ] Step 2: Translate to PostgreSQL PL/pgSQL
- [ ] Step 3: Write the migrated procedure to Postgres output directory
```

**Step 1: Read the Oracle source procedure**

Read the Oracle stored procedure from `.github/oracle-to-postgres-migration/DDL/Oracle/Procedures and Functions/`. Consult the Oracle table/view definitions at `.github/oracle-to-postgres-migration/DDL/Oracle/Tables and Views/` for type resolution.

**Step 2: Translate to PostgreSQL PL/pgSQL**

Apply these translation rules:

- Translate all Oracle-specific syntax to PostgreSQL equivalents.
- Preserve original functionality and control flow logic.
- Keep type-anchored input parameters (e.g., `PARAM_NAME IN table_name.column_name%TYPE`).
- Use explicit types (`NUMERIC`, `VARCHAR`, `INTEGER`) for output parameters passed to other procedures — do not type-anchor these.
- Do not alter method signatures.
- Do not prefix object names with schema names unless already present in the Oracle source.
- Leave exception handling and rollback logic unchanged.
- Do not generate `COMMENT` or `GRANT` statements.
- Use `COLLATE "C"` when ordering by text fields for Oracle-compatible sorting.
- Leverage the `orafce` extension when it improves clarity or fidelity.

Consult the PostgreSQL table/view definitions at `.github/oracle-to-postgres-migration/DDL/Postgres/Tables and Views/` for target schema details.

**Step 3: Write the migrated procedure to Postgres output directory**

Place each migrated procedure in its own file under `.github/oracle-to-postgres-migration/DDL/Postgres/Procedures and Functions/{PACKAGE_NAME_IF_APPLICABLE}/`. One procedure per file.
