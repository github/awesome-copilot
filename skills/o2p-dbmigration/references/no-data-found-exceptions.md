# PostgreSQL Exception Handling: SELECT INTO No Data Found

## Overview

A common issue when migrating from Oracle to PostgreSQL involves `SELECT INTO` statements that expect to raise an exception when no rows are found. This pattern difference can cause integration tests to fail and application logic to behave incorrectly if not properly handled.

---

## Problem Description

### Scenario
A stored procedure performs a lookup operation using `SELECT INTO` to retrieve a required value:

```sql
SELECT column_name
INTO variable_name
FROM table1, table2 
WHERE table1.id = table2.id AND table1.id = parameter_value;
```

### Oracle Behavior
When a `SELECT INTO` statement in Oracle does **not find any rows**, it automatically raises:
```
ORA-01403: no data found
```

This exception is caught by the procedure's exception handler and re-raised to the calling application.

### PostgreSQL Behavior (Pre-Fix)
When a `SELECT INTO` statement in PostgreSQL does **not find any rows**, it:
- Sets the `FOUND` variable to `false`
- **Silently continues** execution without raising an exception
- Leaves the target variable uninitialized

This fundamental difference can cause tests to fail silently and logic errors in production code.

---

## Root Cause Analysis

The PostgreSQL version was missing explicit error handling for the `NOT FOUND` condition after the `SELECT INTO` statement.

**Original Code (Problematic):**
```plpgsql
SELECT column_name
INTO variable_name
FROM table1, table2 
WHERE table1.id = table2.id AND table1.id = parameter_value;

IF variable_name = 'X' THEN
 result_variable := 1;
ELSE
 result_variable := 2;
END IF;
```

**Problem:** No check for `NOT FOUND` condition. When an invalid parameter is passed, the SELECT returns no rows, `FOUND` becomes `false`, and execution continues with an uninitialized variable.

---

## Key Differences: Oracle vs PostgreSQL


Add explicit `NOT FOUND` error handling to match Oracle behavior.

**Fixed Code:**
```plpgsql
SELECT column_name
INTO variable_name
FROM table1, table2 
WHERE table1.id = table2.id AND table1.id = parameter_value;

-- Explicitly raise exception if no data found (matching Oracle behavior)
IF NOT FOUND THEN
    RAISE EXCEPTION 'no data found';
END IF;

IF variable_name = 'X' THEN
 result_variable := 1;
ELSE
 result_variableconditional logic
 ```

---

## Migration Notes for Similar Issues

When fixing this issue, verify:

1. **Success path tests** - Confirm valid parameters still work correctly
2. **Exception tests** - Verify exceptions are raised with invalid parameters
3. **Transaction rollback** - Ensure proper cleanup on errors
4. **Data integrity** - Confirm all fields are populated correctly in success cases
