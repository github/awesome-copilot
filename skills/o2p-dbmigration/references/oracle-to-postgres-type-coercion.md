# Oracle to PostgreSQL Type Coercion Issues

## Overview
This document describes a common migration issue encountered when porting SQL code from Oracle to PostgreSQL. The issue stems from fundamental differences in how these databases handle implicit type conversions in comparison operators.

## The Problem

### Symptom
When migrating SQL queries from Oracle to PostgreSQL, you may encounter the following error:

```
Npgsql.PostgresException: 42883: operator does not exist: character varying <> integer
POSITION: [line_number]
```

### Root Cause
PostgreSQL has **strict type enforcement** and does not perform implicit type coercion in comparison operators. Oracle, by contrast, automatically converts operands to compatible types during comparison operations.

#### Example Mismatch

**Oracle SQL (works fine):**
```sql
AND physical_address.pcountry_cd <> 124
```
- `pcountry_cd` is a `VARCHAR2`
- `124` is an integer literal
- Oracle silently converts `124` to a string for comparison

**PostgreSQL (fails):**
```sql
AND physical_address.pcountry_cd <> 124
```
```
42883: operator does not exist: character varying <> integer
```
- `pcountry_cd` is a `character varying`
- `124` is an integer literal
- PostgreSQL rejects the comparison because the types don't match

## The Solution

### Approach 1: Use String Literals (Recommended)
Convert integer literals to string literals:

```sql
AND physical_address.pcountry_cd <> '124'
```

**Pros:**
- Semantically correct (country codes are typically stored as strings)
- Most efficient
- Clearest intent

**Cons:**
- None

### Approach 2: Explicit Type Casting
Explicitly cast the integer to a string type:

```sql
AND physical_address.pcountry_cd <> CAST(124 AS VARCHAR)
```

**Pros:**
- Makes the conversion explicit and visible
- Useful if the value is a parameter or complex expression

**Cons:**
- Slightly less efficient
- More verbose

## Common Comparison Operators Affected

All comparison operators can trigger this issue:
- `<>` (not equal)
- `=` (equal)
- `<` (less than)
- `>` (greater than)
- `<=` (less than or equal)
- `>=` (greater than or equal)

## Detection Strategy

When migrating from Oracle to PostgreSQL:

1. **Search for numeric literals in WHERE clauses** comparing against string/varchar columns
2. **Look for patterns like:**
   - `column_name <> 123` (where column is VARCHAR/CHAR)
   - `column_name = 456` (where column is VARCHAR/CHAR)
   - `column_name IN (1, 2, 3)` (where column is VARCHAR/CHAR)

3. **Code review checklist:**
   - Are all comparison values correctly typed?
   - Do string columns always use string literals?
   - Are numeric columns always compared against numeric values?

## Real-World Example

**Original Oracle Query:**
```sql
SELECT ac040.stakeholder_id,
       ac006.organization_etxt
  FROM ac040_stakeholder ac040
  INNER JOIN ac006_organization ac006 ON ac040.stakeholder_id = ac006.organization_id
 WHERE physical_address.pcountry_cd <> 124
   AND LOWER(ac006.organization_etxt) LIKE '%' || @orgtxt || '%'
 ORDER BY UPPER(ac006.organization_etxt)
```

**Fixed PostgreSQL Query:**
```sql
SELECT ac040.stakeholder_id,
       ac006.organization_etxt
  FROM ac040_stakeholder ac040
  INNER JOIN ac006_organization ac006 ON ac040.stakeholder_id = ac006.organization_id
 WHERE physical_address.pcountry_cd <> '124'
   AND LOWER(ac006.organization_etxt) LIKE '%' || @orgtxt || '%'
 ORDER BY UPPER(ac006.organization_etxt)
```

**Change:** `124` → `'124'`

## Prevention Best Practices

1. **Use Type-Consistent Literals:**
   - For string columns: Always use string literals (`'value'`)
   - For numeric columns: Always use numeric literals (`123`)
   - For dates: Always use date literals (`DATE '2024-01-01'`)

2. **Leverage Database Tools:**
   - Use your IDE's SQL linter to catch type mismatches
   - Run PostgreSQL syntax validation during code review

3. **Test Early:**
   - Execute migration queries against PostgreSQL before deployment
   - Include integration tests that exercise all comparison operators

4. **Documentation:**
   - Document any type coercions in comments
   - Mark migrated code with revision history

## References

- [PostgreSQL Type Casting Documentation](https://www.postgresql.org/docs/current/sql-syntax.html)
- [Oracle Type Conversion Documentation](https://docs.oracle.com/database/121/SQLRF/sql_elements003.htm)
- [Npgsql Exception: Operator Does Not Exist](https://www.npgsql.org/doc/api/NpgsqlException.html)

## Related Issues

This issue is part of broader Oracle → PostgreSQL migration challenges:
- Implicit function conversions (e.g., `TO_CHAR`, `TO_DATE`)
- String concatenation operator differences (`||` works in both, but behavior differs)
- Numeric precision and rounding differences
- NULL handling in comparisons

---

**Last Updated:** 2024
**Affected Versions:** PostgreSQL 9.6+, Npgsql 4.0+
