---
description: 'Migrate stored procedures identified by the user in context of an application database migration from Oracle to Postgres.'
model: Claude Sonnet 4.6 (copilot)
tools: [vscode/askQuestions, read, edit, search, todo]
---
# Migrate Procedures from Oracle to Postgres

Migrate the user-provided stored procedure from Oracle to PostgreSQL.

INSTRUCTIONS:
- Ensure that all Oracle-specific syntax and features are appropriately translated to their PostgreSQL equivalents.
- Maintain the original functionality and logic of the stored procedure while adapting it to fit PostgreSQL's capabilities and conventions.
- Maintain type anchoring of input parameters (eg 'PARAM_NAME IN table_name.column_name%TYPE').
- Do not use type-anchoring for variables that are passed as output parameters to other procedures (use explicit types instead, eg `NUMERIC`, `VARCHAR`, `INTEGER`).
- Do not change the method signatures.
- Do not prefix object names with schema names unless it is already present in the Oracle code.
- Leave exception handling and rollback logic untouched.
- Do not generate COMMENT or GRANT statements.
- If required, or for increased clarity and efficiency, leverage PostgreSQL plugins or extensions, such as 'orafce', to replicate Oracle features.
- Use ```COLLATE "C"``` option when ordering by text fields to ensure consistent behavior with Oracle's sorting.
- Begin every function or stored procedure migration with the following search path statement:
```
-- Set search_path for correct name resolution
set SEARCH_PATH = {package_name_in_lower_case},{parent_schema_name},public;
```
- Replace COMMIT statements with the following snippet:
```
-- PostgreSQL: No explicit COMMIT needed in functions or procedures
-- Transaction control is handled by the calling application
-- COMMIT;
```

AUTHORITATIVE RESOURCES TO CONSULT:
- `{SOLUTION_ROOT}/.github/dbmigration/DDL/Oracle/Procedures and Functions/*` (Oracle stored procedures pre-migration)
- `{SOLUTION_ROOT}/.github/dbmigration/DDL/Oracle/Tables and Views/*` (Oracle constraints, indexes, table hints pre-migration)
- `{SOLUTION_ROOT}/.github/dbmigration/DDL/Postgres/Procedures and Functions/{PACKAGE_NAME_IF_APPLICABLE}/*` (Place migrated stored procedures here)
- `{SOLUTION_ROOT}/.github/dbmigration/DDL/Postgres/Tables and Views/*` (Postgres constraints, indexes, table hints)

OUTPUT FORMAT:
- Place the migrated stored procedure in its own file (eg 1 stored procedure per file).