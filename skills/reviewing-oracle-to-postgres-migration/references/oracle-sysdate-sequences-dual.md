# Oracle to PostgreSQL: Date Functions, Sequences, and DUAL

## Problem

Oracle relies on several built-in constructs — `SYSDATE`, `SYSTIMESTAMP`, sequence `NEXTVAL` syntax, and the `DUAL` dummy table — that do not exist in PostgreSQL. Each requires a direct substitution.

## SYSDATE and SYSTIMESTAMP

**Oracle:**
- `SYSDATE` — returns the current date and time (no time zone) as an Oracle `DATE` type
- `SYSTIMESTAMP` — returns the current timestamp with time zone

**PostgreSQL:**
- Use `NOW()` or `CURRENT_TIMESTAMP` for timestamp with time zone
- Use `CURRENT_DATE` for date only
- Use `LOCALTIMESTAMP` for timestamp without time zone (closer to Oracle's `SYSDATE` semantics)

```sql
-- Oracle
SELECT SYSDATE FROM DUAL;
INSERT INTO t (created_at) VALUES (SYSDATE);

-- PostgreSQL
SELECT NOW();
INSERT INTO t (created_at) VALUES (NOW());
-- or, if the column is DATE-only:
INSERT INTO t (created_at) VALUES (CURRENT_DATE);
```

> **Warning:** Oracle `DATE` stores date *and* time; PostgreSQL `DATE` stores date only. If Oracle columns typed as `DATE` carry a time component, the PostgreSQL target column should be `TIMESTAMP`, not `DATE`.

## Sequence NEXTVAL Syntax

**Oracle:**
```sql
SELECT my_sequence.NEXTVAL FROM DUAL;
INSERT INTO t (id) VALUES (my_sequence.NEXTVAL);
```

**PostgreSQL:**
```sql
SELECT nextval('my_sequence');
INSERT INTO t (id) VALUES (nextval('my_sequence'));
```

Key differences:
- PostgreSQL `nextval()` is a function call with the sequence name as a quoted string argument
- Oracle uses dot notation: `sequence_name.NEXTVAL`
- Oracle also has `CURRVAL` → PostgreSQL `currval('sequence_name')`
- If the column uses a `DEFAULT nextval(...)` constraint (set during Phase 4 DDL migration), application code can omit the sequence call entirely and omit the column from the `INSERT`

## DUAL Table

Oracle requires a `FROM DUAL` clause in `SELECT` statements that evaluate expressions without a real table. PostgreSQL does not have `DUAL` — expressions can be selected without a `FROM` clause.

```sql
-- Oracle
SELECT 1 + 1 FROM DUAL;
SELECT SYSDATE FROM DUAL;
SELECT my_sequence.NEXTVAL FROM DUAL;

-- PostgreSQL
SELECT 1 + 1;
SELECT NOW();
SELECT nextval('my_sequence');
```

> **orafce extension:** If `orafce` is installed, it provides a `DUAL` view that makes Oracle-style `FROM DUAL` queries work without changes. This is a useful transitional aid but should not be relied on permanently.

## Migration Actions

### 1. Stored Procedures

- Replace all `SYSDATE` / `SYSTIMESTAMP` references with `NOW()` or `CURRENT_TIMESTAMP` (verify column type — use `LOCALTIMESTAMP` if the target is `TIMESTAMP WITHOUT TIME ZONE`)
- Replace `sequence_name.NEXTVAL` with `nextval('sequence_name')`
- Replace `sequence_name.CURRVAL` with `currval('sequence_name')`
- Remove `FROM DUAL` from all expression-only `SELECT` statements

### 2. Application Code (inline SQL strings)

Search C# string literals for `SYSDATE`, `SYSTIMESTAMP`, `.NEXTVAL`, `.CURRVAL`, and `FROM DUAL`. Apply the same substitutions.

### 3. Tests

- Verify datetime assertions use timezone-safe comparisons (see `oracle-to-postgres-timestamp-timezone.md` for Npgsql-specific behavior)
- Verify sequence-dependent IDs are correctly populated in assertions
